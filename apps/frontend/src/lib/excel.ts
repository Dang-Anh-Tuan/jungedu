import * as XLSX from 'xlsx'

export type ParsedStudentRow = {
  name: string
  studentCode?: string
  hocLuc?: string
  notes?: string
}

export type ParseStudentRowsResult = {
  rows: ParsedStudentRow[]
  /** Số dòng bị bỏ qua vì thiếu Mã HS hoặc thiếu Họ tên (cả hai đều bắt buộc). */
  skippedMissingCodeOrName: number
}

/** Sheet đầu tiên; nhận diện cột theo dòng tiêu đề (hoặc cột A/B nếu không có tiêu đề). */
export function parseExcelToStudentRows(file: ArrayBuffer): ParseStudentRowsResult {
  let wb: ReturnType<typeof XLSX.read>
  try {
    wb = XLSX.read(file, { type: 'array' })
  } catch {
    throw new Error('INVALID_XLSX')
  }
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return { rows: [], skippedMissingCodeOrName: 0 }
  const sheet = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
    blankrows: false,
    defval: ''
  }) as string[][]
  if (!rows.length) return { rows: [], skippedMissingCodeOrName: 0 }

  const header = (rows[0] ?? []).map((c) => String(c ?? '').trim().toLowerCase())

  let nameCol = -1
  let codeCol = -1
  let hocLucCol = -1
  let notesCol = -1

  for (let i = 0; i < header.length; i++) {
    const h = header[i]
    if (/^stt$|^số\s*tt|^tt$|^no\.?$/.test(h)) {
      continue
    }
    if (/mã\s*học\s*sinh|^mã\s*hs$|^ma\s*hs$/.test(h) || (/^(mã|ma|code)$/.test(h) && !/tên/.test(h))) {
      codeCol = i
      continue
    }
    if (/họ\s*và\s*tên|họ\s*tên|^tên(\s+họ)?$|^name$/i.test(h)) {
      nameCol = i
      continue
    }
    if (/học\s*lực|hoc\s*luc|xếp\s*loại|xeploai|^xl$/.test(h)) {
      hocLucCol = i
      continue
    }
    if (/ghi\s*chú|ghichu|^chú\s*ý|chu\s*y|^note(s)?$|^nhận\s*xét\s*riêng/.test(h)) {
      notesCol = i
      continue
    }
  }

  const headerLooksLikeLabels = header.some((h) =>
    /tên|ten|họ|mã|ma|học\s*lực|ghi\s*chú|note|^stt$|^tt$|số\s*tt/.test(h)
  )
  const startRow = headerLooksLikeLabels ? 1 : 0

  if (nameCol < 0) {
    nameCol = headerLooksLikeLabels ? header.findIndex((h) => /tên|ten|họ\s*tên|^name/.test(h)) : 0
  }
  if (nameCol < 0) nameCol = 0

  const out: ParsedStudentRow[] = []
  let skippedMissingCodeOrName = 0

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r] ?? []
    const name = String(row[nameCol] ?? '').trim()
    const codeRaw = codeCol >= 0 ? String(row[codeCol] ?? '').trim() : ''
    const hocRaw = hocLucCol >= 0 ? String(row[hocLucCol] ?? '').trim() : ''
    const notesRaw = notesCol >= 0 ? String(row[notesCol] ?? '').trim() : ''

    if (!name && !codeRaw) continue
    if (!name || !codeRaw) {
      skippedMissingCodeOrName += 1
      continue
    }

    out.push({
      name,
      studentCode: codeRaw || undefined,
      hocLuc: hocRaw || undefined,
      notes: notesRaw || undefined
    })
  }
  return { rows: out, skippedMissingCodeOrName }
}
