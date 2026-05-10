import { VI_TRANSCRIBE_PROMPT } from './visionTranscribe'

/** OCR nhiều ảnh trong một request; model trả JSON theo index. */
export function buildVisionBatchInstruction(indexLines: string[]): string {
  return [
    'Bạn nhận NHIỀU ảnh bài làm viết tay (tiếng Việt), mỗi ảnh ngay sau một dòng đánh dấu `IMAGE_INDEX: <số>` (số nguyên bắt đầu từ 0).',
    'Thứ tự ảnh trong request KHÔNG được đổi. Mỗi index tương ứng đúng một ảnh.',
    '',
    'Danh sách ảnh (chỉ để tham chiếu — đọc nội dung từ ảnh thật):',
    ...indexLines,
    '',
    'Quy tắc đọc từng ảnh (giống một ảnh đơn):',
    VI_TRANSCRIBE_PROMPT,
    '',
    'OUTPUT: CHỈ một JSON hợp lệ, dạng:',
    '{"pages":[{"index":0,"text":"..."},{"index":1,"text":"..."}, ... ]}',
    'Mỗi `index` trong JSON phải xuất hiện đúng một lần và khớp toàn bộ các index đã gửi (0 .. n-1).',
    'Trường `text` là bản thuần văn bản OCR của đúng ảnh đó (theo quy tắc trên).',
    'Không thêm khóa ngoài `pages`, `index`, `text`.'
  ].join('\n')
}
