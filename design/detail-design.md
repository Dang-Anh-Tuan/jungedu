# AI Teacher Assistant - MVP Architecture & Product Spec

## 1. Product Overview

### Product Goal

Xây dựng một ứng dụng hỗ trợ giáo viên tiểu học:

- Chấm chữa bài tập làm văn
- Giảm thời gian thao tác thủ công
- Tạo nhận xét nhanh
- Hỗ trợ OCR bài viết tay
- Tạo workflow chấm bài thuận tiện

Mục tiêu phase đầu:

> Giảm 70% thời gian chấm văn cho giáo viên tiểu học.

---

# 2. Product Direction

## Product Type

Desktop App (Local-first)

## Reason

- Giáo viên không rành công nghệ
- Không muốn setup môi trường phức tạp
- Không muốn cài DB server
- Cần workflow xử lý file/ảnh tiện lợi
- Dễ backup dữ liệu
- Có thể dùng offline phần OCR

---

# 3. Core Features MVP

## 3.1 Quản lý lớp học

### Features

- Tạo lớp học
- Import danh sách học sinh từ Excel
- CRUD học sinh
- Lưu profile học sinh

### Student Profile

Ví dụ:

- Học sinh giỏi
- Viết văn sáng tạo
- Chữ xấu
- Cần động viên nhẹ nhàng
- Không trừ nặng lỗi dấu

---

## 3.2 Tạo bài kiểm tra

### Features

- Tạo bài kiểm tra mới
- Nhập:
  - tên bài
  - môn học
  - yêu cầu riêng
  - rubric chấm điểm
  - style nhận xét

### Example

```json
{
  "title": "Tả cây mít",
  "grade": 4,
  "subject": "essay",
  "rubric": {
    "content": 4,
    "grammar": 2,
    "creativity": 2,
    "presentation": 2
  },
  "teacherStyle": "encouraging"
}
```

---

## 3.3 Chụp và import bài làm

### Features

- Chụp ảnh bài làm
- Import nhiều ảnh
- Drag drop folder
- Multi-page submission
- Auto rotate
- Crop image
- Denoise image

### Future

- Mobile companion app
- Wireless transfer
- Auto student detect

---

## 3.4 OCR bài viết tay

### OCR Pipeline

```text
Image
→ OpenCV preprocess
→ PaddleOCR
→ Raw text
→ AI semantic cleanup
→ Confirm editor
```

---

## 3.5 Confirm OCR Result

### Layout

```text
[IMAGE LEFT]
[TEXT EDITOR RIGHT]
```

### Features

- So sánh ảnh và text
- Edit text nhanh
- Highlight OCR confidence thấp
- Undo/redo
- Spell check

### Editor

TipTap + Math Extension

---

## 3.6 AI Chấm bài

### Input

- OCR text
- Teacher context
- Rubric
- Student profile
- Shared grading rules

### Output

```json
{
  "score": 8.5,
  "rubric": {
    "content": 3.5,
    "grammar": 1.5,
    "creativity": 1.5,
    "presentation": 2
  },
  "strengths": [],
  "mistakes": [],
  "rewriteSuggestion": "",
  "teacherComment": ""
}
```

---

## 3.7 Teacher Review

### Features

- Giáo viên sửa điểm
- Sửa nhận xét
- Approve final result
- Save reusable feedback

---

## 3.8 Rule Learning System

### NOT Fine-tuning

Không train model.

### Instead

Lưu:

- Teacher preference
- Tone preference
- Scoring adjustment
- Feedback pattern

### Example

```json
{
  "rule": "Không dùng từ tiêu cực",
  "priority": "high"
}
```

---

# 4. Tech Stack

# 4.1 Desktop App

## Framework

Tauri

## Why

- Lightweight
- Memory efficient
- Fast startup
- React compatible
- Native desktop feel

---

# 4.2 Frontend

## Stack

- React
- TypeScript
- Vite
- TailwindCSS
- shadcn/ui
- Zustand
- TanStack Query
- TipTap

---

# 4.3 Backend Layer

## Local Backend

NestJS

### Responsibility

- File management
- OCR orchestration
- AI orchestration
- Rule management
- Local API

---

# 4.4 OCR Service

## Python Service

FastAPI

## Libraries

- PaddleOCR
- OpenCV
- Pillow
- NumPy

---

# 4.5 AI Models

## OCR semantic cleanup

GPT-4o mini

## Essay grading

GPT-4.1 mini

---

# 4.6 Storage

## Phase 1

File-based storage

### Structure

```text
/data
  /classes
  /students
  /exams
  /submissions
  /ocr
  /results
  /settings
```

---

## Metadata Format

JSON

### Example

```json
{
  "id": "student_001",
  "name": "Nguyen Minh Anh",
  "grade": 4
}
```

---

# 5. System Architecture

```text
┌────────────────────┐
│ React + Tauri App  │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Local NestJS API   │
└─────────┬──────────┘
          │
 ┌────────┴────────┐
 ▼                 ▼
OCR Service      AI Service
(Python)         (OpenAI)
```

---

# 6. AI Architecture

# IMPORTANT

Không dùng 1 prompt làm tất cả.

---

## Split Pipeline

### Step 1

OCR extraction

### Step 2

Semantic cleanup

### Step 3

Essay analysis

### Step 4

Rubric scoring

### Step 5

Teacher feedback generation

---

# 7. Prompt Design

## Shared Context

- Lỗi chính tả
- Lỗi lặp từ
- Tone giáo viên
- Quy chuẩn lớp học

---

## Exam Context

- Yêu cầu bài văn
- Rubric
- Điểm cộng/trừ

---

## Student Context

- Học sinh giỏi/yếu
- Style feedback riêng

---

# 8. OCR Detail Spec

## Preprocessing

### OpenCV

- Denoise
- Contrast enhance
- Perspective correction
- Thresholding
- Auto rotate

---

## OCR Engine

PaddleOCR

---

## Semantic Fix Prompt

### Input

OCR raw text

### Output

Corrected Vietnamese text

### Rules

- Không tự ý đổi nghĩa
- Chỉ sửa lỗi OCR hợp lý
- Preserve student wording

---

# 9. AI Cost Control

## Features

- Cost estimation before request
- Confirm expensive operations
- Daily token limit
- Hard monthly budget

---

## Example

```text
40 bài văn
Estimated Cost: $0.12
[Continue]
```

---

# 10. Export Features

## Export Formats

- PDF
- DOCX
- Excel

---

## Content

- Score
- Teacher comments
- Mistake list
- Rewrite suggestion

---

# 11. Folder Structure

## Frontend

```text
/apps/desktop
  /src
    /components
    /pages
    /features
    /hooks
    /stores
    /services
```

---

## Backend

Không còn service HTTP riêng trong repo: **ảnh → chữ**, **lành OCR**, **chấm điểm JSON** đều trong `apps/desktop/src/services/` (Puter.js).

```text
apps/desktop/src/services/
  imageToText/
  grading/
```

---

## Ảnh → văn bản (đã gỡ OCR Python trong repo)

Ứng dụng desktop gọi **Puter.js** (mặc định) hoặc **OpenAI Vision** qua env — không còn service `/apps/ocr-service`.

```text
apps/desktop/src/services/imageToText/
  providers/puterVision.ts
  providers/openaiVision.ts
```

---

# 12. Main UI Screens

## Dashboard

- Recent exams
- Quick grading
- Statistics

---

## Class Management

- Student list
- Import Excel

---

## Exam Setup

- Rubric
- Context
- Requirements

---

## OCR Confirm Screen

- Image compare
- Text editor

---

## Grading Screen

- Score
- AI feedback
- Teacher edit

---

# 13. Development Phases

# Phase 1 - MVP

## Goal

AI hỗ trợ chấm văn cơ bản.

---

## Tasks

### Core

- [ ] Tauri setup
- [ ] React setup
- [ ] Tailwind setup
- [ ] File storage layer

---

### Student Management

- [ ] CRUD class
- [ ] CRUD student
- [ ] Excel import

---

### OCR

- [ ] Image upload
- [ ] Image preprocess
- [ ] PaddleOCR integration
- [ ] OCR result viewer

---

### Editor

- [ ] TipTap integration
- [ ] Compare layout
- [ ] Manual correction

---

### AI

- [ ] OpenAI integration
- [ ] Prompt system
- [ ] JSON schema validation
- [ ] Grading pipeline

---

### Review

- [ ] Teacher review UI
- [ ] Save correction

---

### Export

- [ ] DOCX export
- [ ] PDF export

---

# Phase 2

## Features

- Rule learning
- Reusable feedback
- Batch grading
- Advanced OCR
- Student analytics

---

# Phase 3

## Features

- Math grading
- Lesson planning
- AI-generated assignments
- Voice feedback
- Cloud sync

---

# 14. Scale Direction

## Future Architecture

```text
Desktop App
    ↓
Cloud Sync API
    ↓
Central AI Worker
    ↓
Shared Model/Rules
```

---

# 15. Future SaaS Direction

## Multi-teacher

## Multi-school

## Shared grading profile

## Subscription model

---

# 16. Important Engineering Decisions

# DO

- Local-first
- OCR local
- AI only where valuable
- JSON structured output
- Human review required

---

# DON'T

- Fine-tuning too early
- Full cloud dependency
- Monolithic prompts
- Complex auth phase đầu
- Multi-tenant too early

---

# 17. Suggested Timeline

## Week 1

- Project setup
- Storage layer
- OCR prototype

---

## Week 2

- OCR confirm UI
- Basic grading

---

## Week 3

- Prompt refinement
- Export system

---

## Week 4

- Teacher review workflow
- Internal testing

---

# 18. Biggest Risks

## OCR Accuracy

Especially handwriting.

---

## AI Scoring Consistency

Need rubric-based scoring.

---

## UX Complexity

Workflow speed is critical.

---

# 19. Success Metrics

## KPI

- Time saved per grading session
- OCR accuracy
- Teacher acceptance rate
- Manual edit reduction

---

# 20. Final Recommendation

## MVP Focus

ONLY solve:

> Upload → OCR → AI Suggestion → Teacher Review

before building:

- lesson planner
- analytics
- cloud sync
- parent portal
- multi-subject AI

---

# 21. Detailed Technical Design

# 21.1 Final MVP Architecture

## IMPORTANT

Phase đầu KHÔNG có backend deploy riêng.

Tất cả chạy local trong app desktop.

---

## Final Architecture

```text
┌────────────────────────────┐
│      Tauri Desktop App     │
├────────────────────────────┤
│ React Frontend             │
│ Zustand Store              │
│ TipTap Editor              │
├────────────────────────────┤
│ Local Node Runtime         │
│ File System Access         │
│ OpenAI API Client          │
├────────────────────────────┤
│ Puter.js / OpenAI Vision   │
│ (ảnh → text trong browser) │
└────────────────────────────┘
```

---

# 21.2 Runtime Communication

## React → Puter / OpenAI (ảnh → text)

### Communication Method

HTTPS / SDK Puter trong browser (không qua Python OCR cục bộ).

```text
React/Tauri → Puter.ai.chat(prompt, file) hoặc OpenAI chat/completions + vision
```

---

## Why HTTP Instead of Direct Python Call

### Easier:

- debug
- restart service
- replace OCR engine
- independent testing
- future cloud migration

---

# 21.3 Local App Startup Flow

## App Boot Process

```text
Open App
    ↓
Start local Python OCR worker
    ↓
Load local JSON database
    ↓
Load settings
    ↓
Open dashboard
```

---

# 21.4 App Data Structure

## Root Folder

```text
/app-data
```

---

## Folder Design

```text
/app-data
  /classes
  /students
  /exams
  /submissions
  /ocr-results
  /grading-results
  /templates
  /settings
  /cache
  /exports
```

---

# 21.5 JSON Schema Design

# Student

```json
{
  "id": "student_001",
  "name": "Nguyen Minh Anh",
  "classId": "class_01",
  "grade": 4,
  "tags": ["good_student", "creative"],
  "customRules": ["Ưu tiên động viên"]
}
```

---

# Exam

```json
{
  "id": "exam_001",
  "title": "Tả cây mít",
  "subject": "essay",
  "grade": 4,
  "requirements": ["Viết đúng chủ đề", "Ít lỗi chính tả"],
  "rubric": {
    "content": 4,
    "grammar": 2,
    "creativity": 2,
    "presentation": 2
  }
}
```

---

# Submission

```json
{
  "id": "submission_001",
  "studentId": "student_001",
  "examId": "exam_001",
  "imagePaths": [],
  "ocrText": "",
  "correctedText": "",
  "gradingResultId": "grading_001"
}
```

---

# Grading Result

```json
{
  "id": "grading_001",
  "score": 8.5,
  "rubric": {
    "content": 3.5,
    "grammar": 1.5,
    "creativity": 1.5,
    "presentation": 2
  },
  "mistakes": [],
  "teacherComment": "",
  "teacherEdited": true
}
```

---

# 21.6 OCR Service Design

# OCR Flow

```text
Image Upload
    ↓
OpenCV preprocess
    ↓
PaddleOCR extract
    ↓
Raw text
    ↓
Semantic cleanup
    ↓
Editor confirm
```

---

## OpenCV Preprocess

### Tasks

- grayscale
- threshold
- denoise
- sharpen
- perspective correction
- auto rotate

---

## OCR API Spec

### Endpoint

```text
POST /ocr
```

---

## Request

```json
{
  "imagePath": "..."
}
```

---

## Response

```json
{
  "success": true,
  "text": "Em rất yêu cây mít...",
  "confidence": 0.82
}
```

---

# 21.7 Semantic Cleanup Design

# Goal

Sửa lỗi OCR nhưng không đổi ý học sinh.

---

## Input

```text
Em rat yeu cay mlt vi cay cho bong mat
```

---

## Output

```text
Em rất yêu cây mít vì cây cho bóng mát.
```

---

## Prompt Rules

### MUST

- Preserve student wording
- Preserve writing style
- Only fix OCR-related mistakes

---

### MUST NOT

- Rewrite essay
- Improve wording
- Change meaning

---

# 21.8 AI Grading Design

# Pipeline

```text
Corrected Text
    ↓
Inject contexts
    ↓
Rubric scoring
    ↓
Generate feedback
    ↓
JSON validation
    ↓
Render UI
```

---

# Context Layers

## Global Context

Shared rules.

Ví dụ:

- Không dùng nhận xét tiêu cực
- Ưu tiên động viên
- Phát hiện lỗi chính tả

---

## Exam Context

Specific exam requirements.

---

## Student Context

Personalized grading behavior.

---

# 21.9 Prompt Engineering Design

# IMPORTANT

Không dùng prompt text hardcode trong component.

---

## Prompt Folder

```text
/prompts
  cleanup.prompt.ts
  grading.prompt.ts
  feedback.prompt.ts
```

---

## Prompt Structure

```text
System Prompt
+ Shared Rules
+ Exam Context
+ Student Context
+ Essay Content
```

---

# 21.10 Structured Output Design

# IMPORTANT

AI phải trả JSON.

---

## Validation

Dùng Zod.

---

## Example Schema

```ts
const GradingSchema = z.object({
  score: z.number(),
  teacherComment: z.string(),
  mistakes: z.array(z.any()),
});
```

---

# 21.11 UI Detailed Design

# Dashboard

## Sections

- Recent exams
- Quick create exam
- Recent grading sessions
- Statistics

---

# Exam Setup Screen

## Inputs

- Exam title
- Subject
- Grade
- Requirements
- Rubric
- Teacher tone

---

# Submission Screen

## Left Panel

Student list

---

## Right Panel

- Upload images
- Drag drop
- Camera capture
- OCR status

---

# OCR Confirm Screen

## Layout

```text
┌───────────────┬───────────────┐
│ Image Viewer  │ Text Editor   │
└───────────────┴───────────────┘
```

---

## Features

- Zoom image
- Rotate image
- Highlight OCR confidence
- Keyboard shortcut editing

---

# Grading Result Screen

## Sections

- Suggested score
- Rubric detail
- Mistake list
- Rewrite suggestion
- Teacher final comment

---

# 21.12 TipTap Editor Design

## Features

- Rich text
- Spell check
- Inline highlight
- Math formula support
- Keyboard shortcut
- Undo/redo

---

## Future Features

- AI inline suggestion
- Comment bubble
- Grammar highlight

---

# 21.13 Export System Design

# Export Types

## DOCX

Main export format.

---

## PDF

Printable format.

---

# Export Content

```text
Student Name
Score
Teacher Comment
Mistakes
Corrected Essay
```

---

# 21.14 AI API Layer Design

# AI Service Wrapper

## IMPORTANT

Không gọi OpenAI trực tiếp từ component.

---

## Wrapper Structure

```text
/services/ai
  grading.ts
  cleanup.ts
  feedback.ts
```

---

## Benefits

- Easier retry
- Easier model swap
- Centralized error handling
- Easier logging

---

# 21.15 Settings Design

# General Settings

## Fields

- Teacher name
- School name
- Default grading style

---

# AI Settings

## Fields

- Provider
- API key
- Default model

---

# OCR Settings

## Fields

- OCR language
- OCR quality
- Image preprocess toggle

---

# 21.16 Error Handling Design

# OCR Errors

## Cases

- Cannot detect text
- Blurry image
- Low confidence

---

## UI Handling

```text
Không đọc được bài viết.
Vui lòng chụp rõ hơn.
```

---

# AI Errors

## Cases

- Invalid JSON
- API timeout
- Rate limit

---

## Strategy

- Retry automatically
- Fallback parsing
- Save draft state

---

# 21.17 Performance Design

# IMPORTANT

Không block UI khi OCR/chấm bài.

---

## Strategy

- Worker-based OCR
- Async grading queue
- Streaming UI update

---

# 21.18 Security Design

# IMPORTANT

API key phải encrypt local.

---

## Strategy

- Store encrypted config
- Never expose raw key in UI logs

---

# 21.19 Development Priority

# Priority
