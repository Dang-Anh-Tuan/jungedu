/**
 * Giá trị mẫu khi mở form «Tạo bài kiểm tra» — tách khỏi component để dễ đổi nội dung demo.
 */
export const DEMO_EXAM_DEFAULTS = {
  title: 'Tả cây mít',
  subject: 'Tập làm văn',
  grade: 4,
  requirements:
    'Viết đúng chủ đề, có đủ mở bài/thân bài/kết bài. Hạn chế lỗi chính tả.'
} as const
