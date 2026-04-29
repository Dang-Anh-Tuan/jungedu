# AI Teacher Assistant - Phase 1 Features & Screen Flow

# 1. Phase 1 Goal

## MVP Goal

Giúp giáo viên:

```text
Upload bài làm
→ OCR chữ viết tay
→ Confirm text
→ AI gợi ý chấm bài
→ Giáo viên chỉnh sửa
→ Export kết quả
```

Phase 1 KHÔNG tập trung:

- Cloud sync
- Multi user
- SaaS
- Authentication
- AI toán
- Analytics phức tạp

---

# 2. Phase 1 Feature List

# 2.1 Dashboard

## Purpose

Trang chính sau khi mở app.

---

## Features

### Quick Actions

- Create exam
- Continue grading
- Import class
- Open recent exam

---

### Recent Exams

Hiển thị:

- Tên bài kiểm tra
- Số bài đã chấm
- Ngày sửa gần nhất
- Trạng thái

---

### Recent Activities

- OCR completed
- Recently graded
- Export history

---

# 2.2 Class Management

## Purpose

Quản lý lớp học và danh sách học sinh.

---

## Features

### Class CRUD

- Create class
- Edit class
- Delete class

---

### Student CRUD

- Add student
- Edit student
- Delete student

---

### Excel Import

Import:

- Họ tên
- Mã học sinh
- Lớp

---

### Student Notes

Ví dụ:

- Học sinh giỏi
- Ưu tiên động viên
- Chữ viết khó đọc

---

# 2.3 Create Exam

## Purpose

Tạo bài kiểm tra mới.

---

## Features

### Basic Info

- Exam title
- Subject
- Grade

---

### Essay Requirements

Ví dụ:

- Viết đúng chủ đề
- Có mở bài/thân bài/kết bài
- Hạn chế lỗi chính tả

---

### Rubric Setup

```text
Content       /4
Grammar       /2
Creativity    /2
Presentation  /2
```

---

### Teacher Style

- Encouraging
- Neutral
- Strict

---

# 2.4 Submission Import

## Purpose

Import bài làm học sinh.

---

## Features

### Image Upload

- Drag/drop image
- Multi image upload
- Multiple pages

---

### Submission Assignment

- Chọn học sinh
- Gán bài làm

---

### Image Preview

- Rotate
- Delete
- Reorder pages

---

# 2.5 OCR Processing

## Purpose

Convert ảnh → text.

---

## Features

### OCR Queue

- Queue processing
- OCR progress
- Retry OCR

---

### OCR Preprocess

- Auto rotate
- Denoise
- Contrast enhance

---

### OCR Confidence

Hiển thị confidence score.

---

# 2.6 OCR Confirm Editor

## Purpose

Cho giáo viên kiểm tra kết quả OCR.

---

## Features

### Compare Layout

- Image bên trái
- Text bên phải

---

### Text Editing

- Edit OCR text
- Undo/redo
- Keyboard shortcuts

---

### OCR Highlight

Highlight đoạn OCR confidence thấp.

---

# 2.7 AI Grading

## Purpose

AI gợi ý chấm bài.

---

## Features

### Suggested Score

- Điểm tổng
- Điểm theo rubric

---

### Mistake Detection

Ví dụ:

- Lỗi chính tả
- Lặp từ
- Thiếu ý

---

### Rewrite Suggestion

AI gợi ý viết tốt hơn.

---

### Teacher Comment

AI gợi ý nhận xét kiểu giáo viên.

---

### Inline Suggestion In Essay

Hiển thị gợi ý trực tiếp ngay trong bài văn.

Ví dụ:

- Highlight lỗi chính tả
- Highlight câu lặp từ
- Highlight câu thiếu chủ ngữ
- Inline suggestion popup
- Hover để xem nhận xét
- Gợi ý viết hay hơn
- Gợi ý mở rộng ý
- Nhận xét bố cục bài văn
- Gợi ý chuyển ý tự nhiên hơn

---

### Writing Improvement Suggestions

AI có thể gợi ý:

#### Câu viết hay hơn

Ví dụ:

```text
Original:
Cây mít rất đẹp.

Suggestion:
Cây mít đứng sừng sững giữa sân trường với tán lá xanh mướt.
```

---

#### Gợi ý mở rộng ý

Ví dụ:

```text
Con có thể tả thêm:
- mùi hương của quả mít
- bóng mát của cây
- cảm xúc khi ngồi dưới gốc cây
```

---

#### Nhận xét bố cục

Ví dụ:

```text
- Mở bài ngắn gọn, đúng chủ đề
- Thân bài còn thiếu phần tả quả mít
- Kết bài chưa thể hiện cảm xúc rõ
```

---

#### Nhận xét diễn đạt

Ví dụ:

```text
- Một số câu còn lặp từ
- Chuyển ý giữa các đoạn chưa tự nhiên
- Có nhiều câu văn ngắn liên tiếp
```

---

#### Positive Highlight

AI highlight những câu viết hay.

Ví dụ:

```text
"Cây mít như một chiếc ô khổng lồ che mát sân trường"
```

→ đánh dấu:

```text
[Câu văn hay]
```

---

### Suggestion Levels

```text
Level 1:
Chỉ sửa lỗi

Level 2:
Gợi ý viết hay hơn

Level 3:
Phân tích bố cục + diễn đạt
```

---

### Teacher Control

Giáo viên có thể:

- bật/tắt suggestion nâng cao
- chỉ hiện lỗi cơ bản
- chỉ hiện nhận xét bố cục
- chỉ highlight câu hay

---

### Goal

Giúp giáo viên:

- đọc nhanh
- sửa nhanh
- chấm trực quan hơn
- không cần đối chiếu nhiều panel

---

# 2.8 Teacher Review

## Purpose

Giáo viên chỉnh sửa kết quả AI.

---

## Features

### Edit Score

- Sửa điểm
- Sửa rubric

---

### Edit Feedback

- Sửa nhận xét
- Sửa lỗi phát hiện

---

### Approve Result

Đánh dấu hoàn tất.

---

### Save Reusable Comment

Lưu comment dùng lại.

---

# 2.9 Export Result

## Purpose

Xuất kết quả.

---

## Features

### DOCX Export

Xuất file Word.

---

### PDF Export

Xuất PDF.

---

### Export Content

- Student name
- Score
- Teacher comment
- Mistakes
- Corrected essay

---

# 2.10 Settings

## Purpose

Cấu hình app.

---

## Features

### AI Settings

- API key
- AI model

---

### OCR Settings

- OCR quality
- OCR language

---

### Teacher Settings

- Teacher name
- Default grading style

---

# 3. Screen Flow Design

# 3.1 Global User Flow

```text
Dashboard
    ↓
Create Exam
    ↓
Import Submissions
    ↓
Run OCR
    ↓
Confirm OCR
    ↓
Run AI Grading
    ↓
Teacher Review
    ↓
Export Result
```

---

# 3.2 Dashboard Screen Flow

# Screen Purpose

Landing screen.

---

## Layout

### Header

- App logo
- Current teacher
- Settings button

---

### Main Action Buttons

```text
[ Create Exam ]
[ Continue Grading ]
[ Import Class ]
```

---

### Recent Exams List

Each item:

- Exam name
- Progress
- Last modified
- Status

---

## User Flow

```text
Open App
    ↓
Dashboard
    ↓
Select action
```

---

# 3.3 Class Management Screen Flow

# Screen Purpose

Quản lý lớp và học sinh.

---

## Layout

### Left Sidebar

Class list.

---

### Main Panel

Student table.

Columns:

- Name
- Student ID
- Notes
- Tags

---

### Actions

- Add student
- Import Excel
- Edit class

---

## User Flow

```text
Dashboard
    ↓
Class Management
    ↓
Import Excel
    ↓
Review students
    ↓
Save class
```

---

# 3.4 Student Detail Flow

# Screen Type

Modal/Dialog.

---

## Fields

- Name
- Tags
- Notes
- Personalized grading rules

---

## Flow

```text
Select student
    ↓
Open detail modal
    ↓
Edit information
    ↓
Save
```

---

# 3.5 Create Exam Screen Flow

# Screen Purpose

Tạo bài kiểm tra.

---

## Layout

### Section 1 - Basic Info

Fields:

- Exam title
- Subject
- Grade

---

### Section 2 - Requirements

Textarea:

- Essay requirements
- Notes
- Scoring rules

---

### Section 3 - Rubric

```text
Content       [4]
Grammar       [2]
Creativity    [2]
Presentation  [2]
```

---

### Section 4 - Teacher Style

Radio buttons:

- Encouraging
- Neutral
- Strict

---

## User Flow

```text
Dashboard
    ↓
Create Exam
    ↓
Fill exam info
    ↓
Save exam
    ↓
Go to submission import
```

---

# 3.6 Submission Import Screen Flow

# Screen Purpose

Import bài làm học sinh.

---

## Layout

### Left Panel

Student list.

Status:

- No submission
- OCR pending
- Ready
- Graded

---

### Right Panel

Upload area.

Buttons:

- Upload image
- Add page
- Delete page
- Rotate image

---

### Bottom Action

```text
[ Run OCR ]
```

---

## User Flow

```text
Select student
    ↓
Upload images
    ↓
Preview images
    ↓
Save submission
    ↓
Run OCR
```

---

# 3.7 OCR Processing Screen Flow

# Screen Purpose

Hiển thị tiến trình OCR.

---

## Layout

### OCR Queue List

Each item:

- Student name
- OCR progress
- OCR confidence
- Retry button

---

### Progress Section

```text
Processing OCR...
12/40 completed
```

---

## User Flow

```text
Run OCR
    ↓
Queue processing
    ↓
OCR completed
    ↓
Open confirm screen
```

---

# 3.8 OCR Confirm Screen Flow

# Screen Purpose

Kiểm tra OCR trước khi AI chấm.

---

## Layout

```text
┌───────────────┬───────────────┐
│ Image Viewer  │ Text Editor   │
└───────────────┴───────────────┘
```

---

## Left Panel Features

- Zoom image
- Rotate image
- Page navigation

---

## Right Panel Features

- Edit text
- Highlight low confidence OCR
- Undo/redo
- Spell check

---

### Bottom Actions

```text
[ Save OCR ]
[ Run AI Grading ]
```

---

## User Flow

```text
Open OCR confirm
    ↓
Review OCR text
    ↓
Edit mistakes
    ↓
Save corrected text
    ↓
Run AI grading
```

---

# 3.9 AI Grading Screen Flow

# Screen Purpose

Hiển thị kết quả AI chấm chữa trực quan, UI inline giống giáo viên chấm bài trên giấy.

---

## Layout

```text
┌───────────────────────────────────────────────┐
│ Bài văn kết quả: Inline UI Highlight lỗi/sửa  │
├───────────────────────────────────────────────┤
│ Right Suggestion Panel (Tổng hợp/chi tiết)    │
└───────────────────────────────────────────────┘
```

---

## Main Editor (Bài văn hiển thị kết quả cuối cùng)

**YÊU CẦU QUAN TRỌNG:**
Các chỗ bị lỗi, các chỗ gợi ý phải hiển thị LUÔN TRONG bài văn kết quả cuối cùng. Nghĩa là kết quả cuối cùng có bài văn học sinh, nhưng tại những chỗ sai hoặc chỗ AI muốn gợi ý, màn hình phải có tín hiệu UI rõ ràng.
Phải highlight phần chấm chữa lên như một cách chấm thông thường (giống như giáo viên dùng bút màu đỏ chấm thẳng lên giấy).
Mục tiêu là khi đọc kết quả học sinh, người dùng có thể đọc đánh giá và sửa bài ngay trên nội dung hiển thị mà không cần phải đối chiếu hay đi tìm đoạn lỗi ở panel khác, không gây mất thời gian.

Các chi tiết UI Annotation Inline bao gồm:

- Gạch chân đỏ các lỗi chính tả/ngữ pháp và hiển thị text sửa lỗi/nhận xét ngay phía trên hoặc bên cạnh đoạn text (bắt chước nét bút đỏ phê).
- Highlight đoạn chữ câu lặp từ, lủng củng và có inline rewrite suggestion màu đỏ ngay tại đó.
- Vẽ highlight hoặc marker kèm tooltip cho các lỗi phân tích bố cục chưa hợp lý.
- Có thể kết hợp đường kẻ nối từ đoạn text sai, trỏ ra khoảng trống lề (margin) để ghi nhận xét (giống ghi chú lề).
- Highlight các câu viết hay để khen ngợi.

---

## Side Annotation Panel

Panel phụ hỗ trợ (chỉ để xem tổng quan, không nên bắt buộc user phải nhìn liên tục):

- Chấm điểm tổng quan và chi tiết rubric
- Nhận xét diễn đạt chung
- Gợi ý mở rộng ý tổng phân hợp
- Tổng kết các câu văn nổi bật, điểm cần cải thiện

---

## Example UX

```text
Em rất yêu cay mít vì cây cho bóng mát.
               ^
          [cây]
```

Hover:

```text
AI Suggestion:
"cay" → "cây"
```

---

## Right Panel

Sections:

- Suggested score
- Rubric detail
- Mistake summary
- Rewrite suggestion
- Teacher comment

---

## Bottom Actions

```text
[ Accept Suggestion ]
[ Reject Suggestion ]
[ Edit Result ]
[ Approve ]
```

---

## User Flow

```text
Run AI grading
    ↓
Show inline annotations
    ↓
Teacher review directly in essay
    ↓
Accept/reject suggestions
    ↓
Finalize grading
```

---

# 3.10 Teacher Review Screen Flow

# Screen Purpose

Finalize grading.

---

## Editable Fields

- Score
- Rubric score
- Teacher comment
- Mistake list

---

## Extra Actions

- Save reusable comment
- Save grading style

---

### Bottom Actions

```text
[ Save Final Result ]
[ Export ]
```

---

## User Flow

```text
Review AI result
    ↓
Edit if needed
    ↓
Approve grading
    ↓
Save result
```

---

# 3.11 Export Screen Flow

# Screen Purpose

Xuất file kết quả.

---

## Export Options

- DOCX
- PDF
- Export all students
- Export selected students

---

## Preview Area

Hiển thị preview file export.

---

## User Flow

```text
Select export format
    ↓
Preview export
    ↓
Export file
```

---

# 3.12 Settings Screen Flow

# Screen Purpose

Cấu hình app.

---

## Sections

### AI Settings

- API key
- Model selection

---

### OCR Settings

- OCR quality
- OCR language

---

### Teacher Settings

- Teacher name
- Default comment style

---

## User Flow

```text
Open settings
    ↓
Edit settings
    ↓
Save settings
```
