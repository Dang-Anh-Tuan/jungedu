import type { Exam, GradingResult, Student } from '../../types'
import {
  CleanupSchema,
  GradingMistakeSchema,
  GradingResultSchema
} from './schemas'
import { callPuterJson } from './puterJson'
import { PUTER_CLEANUP_MODEL, PUTER_GRADING_MODEL } from '../config'

export type GradePipelineRequest = {
  ocrText: string
  exam: Pick<Exam, 'requirements' | 'rubric' | 'title' | 'subject' | 'grade' | 'teacherStyle'>
  student: Pick<Student, 'customRules' | 'tags' | 'notes' | 'name' | 'hocLuc'>
}

/** Hai bước như pipeline Express cũ: lành OCR → chấm rubric JSON (qua Puter). */
export async function gradeEssayPipeline(req: GradePipelineRequest): Promise<GradingResult> {
  const corrected = await cleanupOcrText({
    ocrText: req.ocrText,
    exam: req.exam,
    student: req.student
  })

  const grading = await gradeWithRubric({
    correctedText: corrected.correctedText,
    exam: req.exam,
    student: req.student
  })

  return grading
}

async function cleanupOcrText({
  ocrText,
  exam,
  student
}: {
  ocrText: string
  exam: Pick<Exam, 'requirements'>
  student: Pick<Student, 'name' | 'customRules' | 'notes' | 'hocLuc'>
}): Promise<{ correctedText: string }> {
  const messages = [
    {
      role: 'system' as const,
      content:
        'Bạn là trợ lý sư phạm tiếng Việt. Nhiệm vụ: sửa lỗi OCR nhưng KHÔNG được viết lại/đổi ý của học sinh. Chỉ sửa các sai chính tả/nhận dạng bất hợp lý do OCR (sai dấu, thiếu/nhầm chữ) để khôi phục văn bản tự nhiên nhất.\n' +
        'Quy tắc MUST NOT: không cải thiện nội dung, không thêm ý mới, không đổi văn phong học sinh, không “viết hay hơn”.'
    },
    {
      role: 'user' as const,
      content:
        JSON.stringify(
          {
            sharedRules: [
              'Sửa lỗi chính tả do OCR',
              'Giữ nguyên cấu trúc câu/ý định của học sinh',
              'Chỉ chỉnh khi chắc chắn đó là lỗi OCR'
            ],
            examRequirements: exam.requirements,
            studentContext: {
              name: student.name,
              customRules: student.customRules ?? [],
              notes: student.notes ?? '',
              hocLuc: student.hocLuc ?? ''
            },
            ocrRawText: ocrText
          },
          null,
          2
        ) +
        '\n\nOUTPUT JSON (bắt buộc, KHÔNG thêm key):' +
        '\n{ "correctedText": string }'
    }
  ]

  return await callPuterJson({
    messages,
    schema: CleanupSchema,
    model: PUTER_CLEANUP_MODEL,
    temperature: 0
  })
}

async function gradeWithRubric({
  correctedText,
  exam,
  student
}: {
  correctedText: string
  exam: Pick<Exam, 'title' | 'subject' | 'grade' | 'requirements' | 'rubric' | 'teacherStyle'>
  student: Pick<Student, 'name' | 'tags' | 'notes' | 'customRules' | 'hocLuc'>
}): Promise<GradingResult> {
  const messages = [
    {
      role: 'system' as const,
      content:
        'Bạn là giáo viên Tiếng Việt cấp tiểu học. Chấm bài văn theo rubric. Trả JSON hợp lệ.\n' +
        'Giữ tone theo teacherStyle.\n' +
        'Điểm tổng quy về thang 10 (có thể có số lẻ 0.5).\n' +
        'Không bịa lỗi: chỉ nêu những lỗi có cơ sở từ bài làm.\n' +
        'QUAN TRỌNG TUYỆT ĐỐI: Trường `original` trong danh sách lỗi BẮT BUỘC phải COPY Y HỆT 100% từ bài làm (essay). Cấm được tự ý sửa lỗi chính tả, cấm paraphrase, cấm tóm tắt. Nếu bạn paraphrase, hệ thống sẽ bị lỗi!'
    },
    {
      role: 'user' as const,
      content:
        JSON.stringify(
          {
            globalRules: [
              'Ưu tiên nhận xét động viên (nếu teacherStyle = encouraging)',
              'Chỉ ra lỗi chính tả/ngữ pháp/lặp từ nếu có dấu hiệu rõ',
              'Giữ văn phong học sinh; gợi ý thay đổi theo hướng phù hợp lứa tuổi',
              'Nếu studentContext có hocLuc hoặc notes, dùng làm ngữ cảnh kỳ vọng/nhận xét (vd học sinh giỏi — tiêu chí có thể khắt khe hơn một chút khi phù hợp)'
            ],
            examContext: {
              title: exam.title,
              subject: exam.subject,
              grade: exam.grade,
              requirements: exam.requirements,
              rubric: exam.rubric,
              teacherStyle: exam.teacherStyle
            },
            studentContext: {
              name: student.name,
              tags: student.tags ?? [],
              notes: student.notes ?? '',
              customRules: student.customRules ?? [],
              hocLuc: student.hocLuc ?? ''
            },
            essay: correctedText
          },
          null,
          2
        ) +
        '\n\nOUTPUT JSON (bắt buộc, KHÔNG thêm key):' +
        '\n{' +
        '\n  "score": number,' +
        '\n  "rubric": { "content": number, "grammar": number, "creativity": number, "presentation": number },' +
        '\n  "strengths": string[],' +
        '\n  "mistakes": [' +
        '\n    { "type": "spelling" | "repeat" | "grammar" | "missing_idea" | "structure" | "suggestion" | "other", "original": "chuỗi COPY Y HỆT từ essay", "suggestion": string?, "explanation": string? }' +
        '\n  ],' +
        '\n  "rewriteSuggestion": string,' +
        '\n  "teacherComment": string' +
        '\n}'
    }
  ]

  const result = await callPuterJson({
    messages,
    schema: GradingResultSchema,
    model: PUTER_GRADING_MODEL,
    temperature: 0
  })

  const normalized: GradingResult = {
    ...result,
    rewriteSuggestion: result.rewriteSuggestion ?? '',
    teacherComment: result.teacherComment ?? '',
    mistakes: (result.mistakes ?? []).map((m) => GradingMistakeSchema.parse(m))
  }

  return normalized
}
