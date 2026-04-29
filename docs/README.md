# Tài liệu JungEdu

| Tài liệu | Nội dung |
|----------|----------|
| [convert-text.md](./convert-text.md) | ADR: ảnh → text qua AI vision (Puter/OpenAI). |
| [spec-image-to-text.md](./spec-image-to-text.md) | Spec env, diagram ảnh → chữ; chấm điểm Puter trong desktop (không backend riêng). |

**Desktop:** `apps/desktop` — OCR/vision (`runImageToText`), chấm điểm (`runAiGrade` → `grading/pipeline.ts` qua Puter).
