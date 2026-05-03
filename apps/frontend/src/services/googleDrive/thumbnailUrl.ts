/** URL xem ảnh Google Drive không cần OAuth (sau khi đã set quyền anyone reader). */
export function googleDriveThumbnailUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w2000`
}
