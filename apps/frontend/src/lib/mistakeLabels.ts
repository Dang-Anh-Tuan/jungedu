import i18n from '../i18n/i18n'

const PREFIX = 'pdf.mistakeTypes.' as const

export function mistakeTypeLabelVi(type: string): string {
  const key = `${PREFIX}${type}`
  if (i18n.exists(key)) return i18n.t(key)
  return type.replaceAll('_', ' ')
}
