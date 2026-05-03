import type { Exam, GradingResult, Student } from '../../types'
import { GradingMistakeSchema, GradingResultSchema } from './schemas'
import { callPuterJson } from './puterJson'
import { PUTER_GRADING_MODEL } from '../config'

export type GradePipelineRequest = {
  /**
   * Toàn bộ bài làm dùng để chấm: là **correctedText** của từng trang OCR đã nối (bản đối chiếu / đã sửa tay).
   * Không qua thêm bước “lành OCR” — tránh lệch khỏi văn bản giáo viên đang xem.
   */
  essayText: string
  exam: Pick<Exam, 'requirements' | 'rubric' | 'title' | 'subject' | 'grade' | 'teacherStyle'>
  student: Pick<Student, 'customRules' | 'tags' | 'notes' | 'name' | 'hocLuc'>
}

/** Chấm rubric JSON qua Puter trực tiếp trên `essayText` (bản đã hiệu đính). */
export async function gradeEssayPipeline(req: GradePipelineRequest): Promise<GradingResult> {
  const body = req.essayText.trim()
  return gradeWithRubric({
    essayBody: body,
    exam: req.exam,
    student: req.student
  })
}

async function gradeWithRubric({
  essayBody,
  exam,
  student
}: {
  essayBody: string
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
        'Trường `essay` trong input là bản bài làm **đã đối chiếu/hiệu đính** (không phải OCR thô). Chấm và trích dẫn lỗi **chỉ** trên đúng chuỗi ký tự đó.\n' +
        'Không bịa lỗi: chỉ nêu những lỗi có cơ sở từ bài làm.\n' +
        'QUAN TRỌNG TUYỆT ĐỐI: Trường `original` trong danh sách lỗi BẮT BUỘC phải COPY Y HỆT 100% từ `essay`. Cấm paraphrase, cấm tóm tắt, cấm trích đoạn không nằm trong essay.'
    },
    {
      role: 'user' as const,
      content:
        JSON.stringify(
          {
            globalRules: [
              'Ưu tiên nhận xét động viên (nếu teacherStyle = encouraging)',
              'Chỉ ra lỗi chính tả/ngữ pháp/lặp từ nếu có dấu hiệu rõ trong essay',
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
            essay: essayBody
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
