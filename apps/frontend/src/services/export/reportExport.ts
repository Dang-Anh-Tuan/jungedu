import ExcelJS from 'exceljs'
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'

import type { Content, TableCell } from 'pdfmake/interfaces'

import type { Exam, Student, Submission, GradingMistake } from '../../types'

type StudentResultRow = {
  studentName: string
  studentCode: string
  score: number
  comment: string
}

type PdfMakeWithFonts = typeof pdfMake & {
  vfs: Record<string, string>
}

const pdfWithFonts = pdfMake as PdfMakeWithFonts
if (!pdfWithFonts.vfs || Object.keys(pdfWithFonts.vfs).length === 0) {
  pdfWithFonts.vfs = (pdfFonts as { vfs: Record<string, string> }).vfs
}

function safeText(v: string | undefined): string {
  return (v ?? '').trim()
}

function normalizeScore(score: number | undefined): number {
  if (typeof score !== 'number' || Number.isNaN(score)) return 0
  return Math.max(0, Math.min(10, Math.round(score * 10) / 10))
}

function mistakeTypeVi(t: GradingMistake['type']): string {
  const map: Record<GradingMistake['type'], string> = {
    spelling: 'Chính tả',
    repeat: 'Lặp ý',
    grammar: 'Ngữ pháp',
    missing_idea: 'Thiếu ý',
    structure: 'Bố cục',
    suggestion: 'Gợi ý',
    other: 'Khác'
  }
  return map[t]
}

function buildAnnotatedEssayParts(essay: string, mistakes: GradingMistake[]) {
  const parts: Array<
    string | { text: string; color?: string; background?: string; italics?: boolean }
  > = []
  if (!essay.trim()) {
    parts.push('(Không có)')
    return parts
  }
  const sorted = [...mistakes]
    .filter((m) => safeText(m.original).length > 0)
    .sort((a, b) => b.original.length - a.original.length)
  let cursor = 0
  while (cursor < essay.length) {
    let matched: GradingMistake | undefined
    let start = -1
    for (const m of sorted) {
      const idx = essay.indexOf(m.original, cursor)
      if (idx === -1) continue
      if (start === -1 || idx < start) {
        start = idx
        matched = m
      }
    }
    if (!matched || start === -1) {
      parts.push(essay.slice(cursor))
      break
    }
    if (start > cursor) {
      parts.push(essay.slice(cursor, start))
    }
    parts.push({
      text: matched.original,
      color: matched.type === 'spelling' || matched.type === 'grammar' ? '#7F1D1D' : '#713F12',
      background: matched.type === 'spelling' || matched.type === 'grammar' ? '#FECACA' : '#FDE68A'
    })
    if (matched.suggestion) {
      parts.push({
        text: ` (${matched.suggestion})`,
        italics: true,
        color: '#166534',
        background: '#DCFCE7'
      })
    }
    cursor = start + matched.original.length
  }
  return parts
}

export function buildStudentResultRows({
  students,
  submissions
}: {
  students: Student[]
  submissions: Submission[]
}): StudentResultRow[] {
  return students.map((st) => {
    const sub = submissions.find((s) => s.studentId === st.id)
    const score = normalizeScore(sub?.gradingResult?.score)
    const comment = safeText(sub?.gradingResult?.teacherComment)
    return {
      studentName: st.name,
      studentCode: safeText(st.studentCode),
      score,
      comment
    }
  })
}

export async function exportSelectedResultsToExcel(
  rows: StudentResultRow[],
  examTitle: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Bảng điểm')
  sheet.columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Họ và tên', key: 'studentName', width: 28 },
    { header: 'Mã học sinh', key: 'studentCode', width: 16 },
    { header: 'Điểm', key: 'score', width: 10 },
    { header: 'Nhận xét', key: 'comment', width: 60 }
  ]

  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F2937' }
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 22

  rows.forEach((r, idx) => {
    const row = sheet.addRow({
      stt: idx + 1,
      studentName: r.studentName,
      studentCode: r.studentCode,
      score: r.score,
      comment: r.comment
    })
    row.alignment = { vertical: 'top', wrapText: true }
    row.height = 30
    if (idx % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' }
      }
    } else {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEEF2FF' }
      }
    }
  })

  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      }
    })
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeText(examTitle) || 'bang-diem'}_ket-qua.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportSelectedResultsSummaryPdf(rows: StudentResultRow[], examTitle: string): void {
  const body: TableCell[][] = [
    [
      { text: 'STT', style: 'tableHeader' },
      { text: 'Họ và tên', style: 'tableHeader' },
      { text: 'Mã HS', style: 'tableHeader' },
      { text: 'Điểm', style: 'tableHeader' },
      { text: 'Nhận xét', style: 'tableHeader' }
    ],
    ...rows.map((r, idx) => [
      { text: String(idx + 1), style: 'tableCellCenter' },
      { text: r.studentName, style: 'tableCell' },
      { text: r.studentCode || '-', style: 'tableCellCenter' },
      { text: r.score.toFixed(1), style: 'tableCellCenter' },
      { text: r.comment || '-', style: 'tableCell' }
    ])
  ]

  pdfWithFonts
    .createPdf({
      pageSize: 'A4',
      pageMargins: [32, 36, 32, 36],
      content: [
        { text: `Bảng điểm - ${safeText(examTitle) || 'Bài kiểm tra'}`, style: 'title' },
        {
          table: {
            headerRows: 1,
            widths: [28, 110, 56, 44, '*'],
            body
          },
          layout: {
            fillColor: (rowIndex: number) => {
              if (rowIndex === 0) return '#1F2937'
              return rowIndex % 2 === 0 ? '#F8FAFC' : '#EEF2FF'
            },
            hLineColor: () => '#D1D5DB',
            vLineColor: () => '#D1D5DB'
          }
        }
      ] as Content[],
      defaultStyle: { font: 'Roboto', fontSize: 10 },
      styles: {
        title: { fontSize: 15, bold: true, margin: [0, 0, 0, 12] },
        tableHeader: { bold: true, color: '#FFFFFF', alignment: 'center' },
        tableCellCenter: { alignment: 'center' },
        tableCell: {}
      }
    })
    .download(`${safeText(examTitle) || 'bang-diem'}_ket-qua.pdf`)
}

function formatMistake(m: GradingMistake): string {
  const suffix = m.suggestion ? ` -> ${m.suggestion}` : ''
  return `${mistakeTypeVi(m.type)}: ${m.original}${suffix}`
}

export function exportSelectedDetailedReviewPdf({
  exam,
  students,
  submissions
}: {
  exam: Exam
  students: Student[]
  submissions: Submission[]
}): void {
  const detailedContents: Content[] = []
  let count = 0

  for (const student of students) {
    const sub = submissions.find((s) => s.studentId === student.id)
    if (!sub?.gradingResult) continue
    count += 1
    const grading = sub.gradingResult
    const essay = sub.ocrPages.map((p) => p.correctedText).join('\n').trim()
    const strengths = grading.strengths.length > 0 ? grading.strengths : ['(Không có)']
    const mistakes = grading.mistakes.length > 0 ? grading.mistakes.map(formatMistake) : ['(Không có)']
    const annotatedEssayParts = buildAnnotatedEssayParts(essay, grading.mistakes)
    const rubricTableBody: TableCell[][] = [
      [{ text: 'Mục', style: 'smallTableHeader' }, { text: 'Điểm', style: 'smallTableHeader' }],
      ...exam.rubric.map((c) => [c.label, String(grading.rubric[c.id] ?? '—')])
    ]

    detailedContents.push(
      { text: `${exam.title} - Phiếu chấm`, style: 'title' },
      { text: `Học sinh: ${student.name}`, style: 'meta' },
      { text: `Mã HS: ${safeText(student.studentCode) || '-'}`, style: 'meta' },
      { text: `Điểm: ${normalizeScore(grading.score).toFixed(1)}/10`, style: 'meta', margin: [0, 0, 0, 8] },
      {
        table: {
          headerRows: 1,
          widths: ['*', 80],
          body: rubricTableBody
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 10]
      },
      { text: 'Điểm mạnh', style: 'sectionTitle' },
      { ul: strengths, margin: [0, 0, 0, 8] },
      { text: 'Nhận xét giáo viên', style: 'sectionTitle' },
      { text: safeText(grading.teacherComment) || '(Không có)', margin: [0, 0, 0, 8] },
      { text: 'Bài làm đối chiếu', style: 'sectionTitle' },
      {
        text: annotatedEssayParts,
        margin: [0, 0, 0, 8],
        lineHeight: 1.3
      },
      { text: 'Lỗi và gợi ý', style: 'sectionTitle' },
      { ul: mistakes }
    )
    detailedContents.push({ text: '', pageBreak: 'after' })
  }

  if (count === 0) {
    detailedContents.push({ text: 'Không có học sinh nào có kết quả chấm để xuất.' })
  } else {
    detailedContents.pop()
  }

  pdfWithFonts
    .createPdf({
      pageSize: 'A4',
      pageMargins: [32, 32, 32, 32],
      content: detailedContents,
      defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.2 },
      styles: {
        title: { fontSize: 14, bold: true, margin: [0, 0, 0, 6] },
        meta: { margin: [0, 0, 0, 2] },
        sectionTitle: { bold: true, margin: [0, 6, 0, 4] },
        smallTableHeader: { bold: true, color: '#ffffff', fillColor: '#16A34A', alignment: 'center' }
      }
    })
    .download(`${safeText(exam.title) || 'bao-cao'}_chi-tiet.pdf`)
}
