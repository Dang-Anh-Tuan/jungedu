# ADR — Chuyển bước ảnh → văn bản và chấm điểm sang Puter

## Bối cảnh

- OCR Python cục bộ đã gỡ khỏi repo (chất lượng không đủ).
- Backend Express (`apps/server`) trước đây gọi OpenAI API để lành OCR + chấm rubric — **đã thay** bằng Puter.js trong desktop để không duy trì Node server và API key phía máy chủ.

## Quyết định

1. **`runImageToText`** — Puter vision / OpenAI Vision (`apps/desktop/src/services/imageToText/`).
2. **`runAiGrade`** — hai bước Puter chat JSON như pipeline cũ: cleanup OCR (`VITE_PUTER_CLEANUP_MODEL`) + rubric (`VITE_PUTER_GRADING_MODEL`) trong `apps/desktop/src/services/grading/`.

## Hệ quả

| Ưu | Nhược |
|----|--------|
| Một app desktop, không deploy server AI | Ảnh + nội dung bài làm qua Puter — privacy / chi phí user-side |
| Không lộ OpenAI API key qua backend (đã bỏ server) | Phụ thuộc điều khoản & quota Puter |

## Trạng thái

**Đã áp dụng.** `apps/server` đã xóa khỏi repository.
