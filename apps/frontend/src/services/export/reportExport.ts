import ExcelJS from 'exceljs'
import i18n from '../../i18n/i18n'
import { mistakeTypeLabelVi } from '../../lib/mistakeLabels'
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'

import type { Content, TableCell } from 'pdfmake/interfaces'

import { resolveMistakeSpans } from '../../lib/essayMistakeSpans'
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

function buildAnnotatedEssayParts(essay: string, mistakes: GradingMistake[]) {
  const parts: Array<
    string | { text: string; color?: string; background?: string; italics?: boolean }
  > = []
  if (!essay.trim()) {
    parts.push(i18n.t('pdf.none'))
    return parts
  }
  /** Cùng logic fuzzy + indexOf như màn Review — tránh PDF chỉ hiện 1 lỗi khi chuỗi không khớp tuyệt đối. */
  const spans = resolveMistakeSpans(essay, mistakes)
  let cursor = 0
  for (const { start, end, mistake: matched } of spans) {
    if (start > cursor) {
      parts.push(essay.slice(cursor, start))
    }
    parts.push({
      text: essay.slice(start, end),
      color:
        matched.type === 'spelling' || matched.type === 'grammar' || matched.type === 'punctuation'
          ? '#7F1D1D'
          : '#713F12',
      background:
        matched.type === 'spelling' || matched.type === 'grammar' || matched.type === 'punctuation'
          ? '#FECACA'
          : '#FDE68A'
    })
    if (matched.suggestion) {
      parts.push({
        text: ` (${matched.suggestion})`,
        italics: true,
        color: '#166534',
        background: '#DCFCE7'
      })
    }
    cursor = end
  }
  if (cursor < essay.length) {
    parts.push(essay.slice(cursor))
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
  const sheet = workbook.addWorksheet(i18n.t('pdf.sheetName'))
  sheet.columns = [
    { header: i18n.t('pdf.colStt'), key: 'stt', width: 8 },
    { header: i18n.t('pdf.colName'), key: 'studentName', width: 28 },
    { header: i18n.t('pdf.colCode'), key: 'studentCode', width: 16 },
    { header: i18n.t('pdf.colScore'), key: 'score', width: 10 },
    { header: i18n.t('pdf.colComment'), key: 'comment', width: 60 }
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
      { text: i18n.t('pdf.colStt'), style: 'tableHeader' },
      { text: i18n.t('pdf.colName'), style: 'tableHeader' },
      { text: i18n.t('pdf.sheetCode'), style: 'tableHeader' },
      { text: i18n.t('pdf.colScore'), style: 'tableHeader' },
      { text: i18n.t('pdf.colComment'), style: 'tableHeader' }
    ],
    ...rows.map((r, idx) => [
      { text: String(idx + 1), style: 'tableCellCenter' },
      { text: r.studentName, style: 'tableCell' },
      { text: r.studentCode || '-', style: 'tableCellCenter' },
      { text: r.score.toFixed(1), style: 'tableCellCenter' },
      { text: r.comment || '-', style: 'tableCell' }
    ])
  ]

  const title = i18n.t('pdf.summaryTitle', {
    title: safeText(examTitle) || i18n.t('pdf.summaryTitleFallback')
  })

  pdfWithFonts
    .createPdf({
      pageSize: 'A4',
      pageMargins: [32, 36, 32, 36],
      content: [
        { text: title, style: 'title' },
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
  return `${mistakeTypeLabelVi(m.type)}: ${m.original}${suffix}`
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
  const dash = i18n.t('pdf.dash')

  for (const student of students) {
    const sub = submissions.find((s) => s.studentId === student.id)
    if (!sub?.gradingResult) continue
    count += 1
    const grading = sub.gradingResult
    const essay = sub.ocrPages.map((p) => p.correctedText).join('\n').trim()
    const none = i18n.t('pdf.none')
    const strengths = grading.strengths.length > 0 ? grading.strengths : [none]
    const mistakes = grading.mistakes.length > 0 ? grading.mistakes.map(formatMistake) : [none]
    const annotatedEssayParts = buildAnnotatedEssayParts(essay, grading.mistakes)
    const rubricTableBody: TableCell[][] = [
      [
        { text: i18n.t('pdf.rubricCol'), style: 'smallTableHeader' },
        { text: i18n.t('pdf.rubricScore'), style: 'smallTableHeader' }
      ],
      ...exam.rubric.map((c) => [c.label, String(grading.rubric[c.id] ?? dash)])
    ]

    detailedContents.push(
      { text: i18n.t('pdf.sheetTitle', { title: exam.title }), style: 'title' },
      { text: i18n.t('pdf.studentLine', { name: student.name }), style: 'meta' },
      {
        text: i18n.t('pdf.codeLine', { code: safeText(student.studentCode) || '-' }),
        style: 'meta'
      },
      {
        text: i18n.t('pdf.scoreLine', { score: normalizeScore(grading.score).toFixed(1) }),
        style: 'meta',
        margin: [0, 0, 0, 8]
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 80],
          body: rubricTableBody
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 10]
      },
      { text: i18n.t('pdf.strengths'), style: 'sectionTitle' },
      { ul: strengths, margin: [0, 0, 0, 8] },
      { text: i18n.t('pdf.teacherComment'), style: 'sectionTitle' },
      { text: safeText(grading.teacherComment) || none, margin: [0, 0, 0, 8] },
      { text: i18n.t('pdf.essayCompare'), style: 'sectionTitle' },
      {
        text: annotatedEssayParts,
        margin: [0, 0, 0, 8],
        lineHeight: 1.3
      },
      { text: i18n.t('pdf.mistakes'), style: 'sectionTitle' },
      { ul: mistakes }
    )
    detailedContents.push({ text: '', pageBreak: 'after' })
  }

  if (count === 0) {
    detailedContents.push({ text: i18n.t('pdf.emptyExport') })
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
