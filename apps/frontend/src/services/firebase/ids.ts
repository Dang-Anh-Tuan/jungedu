/** ID document client-side — khi migrate BE có thể thay bằng id do server trả về. */
export function createDocumentId(prefix: string): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`
}
