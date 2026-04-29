# AI Teacher Assistant - Phase 1 Sequence Diagram

# 1. Global Application Flow

```mermaid
sequenceDiagram
    actor Teacher
    participant Dashboard
    participant ExamScreen
    participant SubmissionScreen
    participant OCRService
    participant ConfirmScreen
    participant AIService
    participant ReviewScreen
    participant ExportService

    Teacher->>Dashboard: Open app
    Dashboard->>ExamScreen: Create/Select exam
    Teacher->>ExamScreen: Setup exam info
    ExamScreen->>SubmissionScreen: Open submission import

    Teacher->>SubmissionScreen: Upload essay images
    SubmissionScreen->>OCRService: Run OCR
    OCRService-->>SubmissionScreen: Return OCR text

    SubmissionScreen->>ConfirmScreen: Open OCR confirm
    Teacher->>ConfirmScreen: Review/edit OCR text

    ConfirmScreen->>AIService: Run AI grading
    AIService-->>ReviewScreen: Return grading result

    Teacher->>ReviewScreen: Edit/approve grading
    ReviewScreen->>ExportService: Export result
    ExportService-->>Teacher: DOCX/PDF file
```

---

# 2. Dashboard Screen Flow

```mermaid
sequenceDiagram
    actor Teacher
    participant Dashboard
    participant ExamModule
    participant ClassModule

    Teacher->>Dashboard: Open application

    alt Create New Exam
        Teacher->>Dashboard: Click Create Exam
        Dashboard->>ExamModule: Open exam setup
    end

    alt Continue Grading
        Teacher->>Dashboard: Click Continue Grading
        Dashboard->>ExamModule: Load recent exam
    end

    alt Import Class
        Teacher->>Dashboard: Click Import Class
        Dashboard->>ClassModule: Open class management
    end
```

---

# 3. Class Management Flow

```mermaid
sequenceDiagram
    actor Teacher
    participant ClassScreen
    participant FileSystem

    Teacher->>ClassScreen: Open class management

    alt Import Excel
        Teacher->>ClassScreen: Select Excel file
        ClassScreen->>FileSystem: Read Excel
        FileSystem-->>ClassScreen: Student data
        ClassScreen-->>Teacher: Preview student list
    end

    Teacher->>ClassScreen: Save class
    ClassScreen->>FileSystem: Save JSON data
```

---

# 4. Student Detail Flow

```mermaid
sequenceDiagram
    actor Teacher
    participant StudentModal
    participant FileSystem

    Teacher->>StudentModal: Open student detail
    StudentModal-->>Teacher: Show profile

    Teacher->>StudentModal: Edit notes/tags
    StudentModal->>FileSystem: Save student profile
    FileSystem-->>StudentModal: Save success
```

---

# 5. Create Exam Flow

```mermaid
sequenceDiagram
    actor Teacher
    participant ExamScreen
    participant FileSystem

    Teacher->>ExamScreen: Open create exam

    Teacher->>ExamScreen: Fill exam information
    Teacher->>ExamScreen: Setup rubric
    Teacher->>ExamScreen: Setup teacher style

    ExamScreen->>FileSystem: Save exam config
    FileSystem-->>ExamScreen: Save success

    ExamScreen-->>Teacher: Navigate to submission import
```

---

# 6. Submission Import Flow

```mermaid
sequenceDiagram
    actor Teacher
    participant SubmissionScreen
    participant FileSystem

    Teacher->>SubmissionScreen: Select student
    Teacher->>SubmissionScreen: Upload images

    SubmissionScreen->>FileSystem: Save image files
    FileSystem-->>SubmissionScreen: Save success

    SubmissionScreen-->>Teacher: Preview uploaded images

    Teacher->>SubmissionScreen: Run OCR
```

---

# 7. OCR Processing Flow

```mermaid
sequenceDiagram
    actor Teacher
    participant SubmissionScreen
    participant OCRQueue
    participant OCRWorker
    participant OpenCV
    participant PaddleOCR

    Teacher->>SubmissionScreen: Start OCR

    SubmissionScreen->>OCRQueue: Add OCR jobs

    loop Each Submission
        OCRQueue->>OCRWorker: Process image
        OCRWorker->>OpenCV: Preprocess image
        OpenCV-->>OCRWorker: Enhanced image

        OCRWorker->>PaddleOCR: Extract text
        PaddleOCR-->>OCRWorker: OCR raw text

        OCRWorker-->>OCRQueue: OCR result
    end

    OCRQueue-->>SubmissionScreen: OCR completed
```

---

# 8. OCR Confirm Screen Flow

```mermaid
sequenceDiagram
    actor Teacher
    participant ConfirmScreen
    participant FileSystem

    ConfirmScreen-->>Teacher: Show image + OCR text

    Teacher->>ConfirmScreen: Review OCR result

    alt OCR Mistake Found
        Teacher->>ConfirmScreen: Edit text
    end

    Teacher->>ConfirmScreen: Save corrected text
    ConfirmScreen->>FileSystem: Save corrected essay

    Teacher->>ConfirmScreen: Run AI grading
```

---

# 9. AI Grading Flow

```mermaid
sequenceDiagram
    actor Teacher
    participant ConfirmScreen
    participant AIService
    participant OpenAI
    participant ReviewScreen

    Teacher->>ConfirmScreen: Start AI grading

    ConfirmScreen->>AIService: Build grading context

    AIService->>OpenAI: Send grading request
    OpenAI-->>AIService: JSON grading result

    AIService-->>ReviewScreen: Render grading result
```

---

# 10. AI Inline Annotation Flow

```mermaid
sequenceDiagram
    actor Teacher
    participant ReviewScreen
    participant AnnotationEngine
    participant EssayEditor

    ReviewScreen->>AnnotationEngine: Load grading result

    AnnotationEngine->>EssayEditor: Render annotations

    EssayEditor-->>Teacher: Show inline corrections

    Note over EssayEditor: Underline spelling mistakes
    Note over EssayEditor: Highlight repeated words
    Note over EssayEditor: Margin comments
    Note over EssayEditor: Red pen style markup
```

---

# 11. Teacher Review Flow

```mermaid
sequenceDiagram
    actor Teacher
    participant ReviewScreen
    participant FileSystem

    ReviewScreen-->>Teacher: Show AI grading result

    Teacher->>ReviewScreen: Edit score
    Teacher->>ReviewScreen: Edit comments
    Teacher->>ReviewScreen: Accept/reject suggestions

    Teacher->>ReviewScreen: Save final grading

    ReviewScreen->>FileSystem: Save grading result
    FileSystem-->>ReviewScreen: Save success
```

---

# 12. Export Result Flow

```mermaid
sequenceDiagram
    actor Teacher
    participant ReviewScreen
    participant ExportService
    participant DOCXGenerator
    participant PDFGenerator

    Teacher->>ReviewScreen: Click export

    alt DOCX Export
        ReviewScreen->>DOCXGenerator: Generate DOCX
        DOCXGenerator-->>ExportService: DOCX file
    end

    alt PDF Export
        ReviewScreen->>PDFGenerator: Generate PDF
        PDFGenerator-->>ExportService: PDF file
    end

    ExportService-->>Teacher: Download exported file
```

---

# 13. Settings Flow

```mermaid
sequenceDiagram
    actor Teacher
    participant SettingsScreen
    participant FileSystem

    Teacher->>SettingsScreen: Open settings

    Teacher->>SettingsScreen: Update API key
    Teacher->>SettingsScreen: Update OCR settings
    Teacher->>SettingsScreen: Update teacher profile

    SettingsScreen->>FileSystem: Save settings
    FileSystem-->>SettingsScreen: Save success
```

---

# 14. Local Storage Flow

```mermaid
sequenceDiagram
    participant ReactApp
    participant LocalStorageLayer
    participant FileSystem

    ReactApp->>LocalStorageLayer: Save exam
    LocalStorageLayer->>FileSystem: Write JSON file

    ReactApp->>LocalStorageLayer: Load submission
    LocalStorageLayer->>FileSystem: Read JSON file

    FileSystem-->>LocalStorageLayer: Return data
    LocalStorageLayer-->>ReactApp: Parsed result
```

---

# 15. Full Essay Grading Lifecycle

```mermaid
sequenceDiagram
    actor Teacher
    participant UI
    participant OCR
    participant AI
    participant Annotation
    participant Export

    Teacher->>UI: Upload essay image

    UI->>OCR: OCR processing
    OCR-->>UI: OCR text

    Teacher->>UI: Confirm OCR

    UI->>AI: Request grading
    AI-->>UI: Grading result

    UI->>Annotation: Generate inline markup
    Annotation-->>UI: Red pen annotations

    Teacher->>UI: Final review

    UI->>Export: Export result
    Export-->>Teacher: Final document
```

---

# 16. Sequence Diagram - Encryption Flow

```mermaid
sequenceDiagram
    actor Developer
    participant EncryptTool
    participant EncryptedFile
    participant DesktopApp
    participant CryptoModule
    participant OpenAI

    Developer->>EncryptTool: Input API key
    Developer->>EncryptTool: Input master secret

    EncryptTool->>CryptoModule: AES encrypt
    CryptoModule-->>EncryptTool: Encrypted blob

    EncryptTool->>EncryptedFile: Save encrypted content

    DesktopApp->>EncryptedFile: Read encrypted blob
    DesktopApp->>CryptoModule: Decrypt using secret

    CryptoModule-->>DesktopApp: Raw API key

    DesktopApp->>OpenAI: Create API client
```

---

# 17. Sequence Diagram - App Startup

```mermaid
sequenceDiagram
    participant DesktopApp
    participant ConfigLoader
    participant CryptoModule
    participant OpenAIClient

    DesktopApp->>ConfigLoader: Load hidden config file

    ConfigLoader-->>DesktopApp: Encrypted blob

    DesktopApp->>CryptoModule: Decrypt blob

    CryptoModule-->>DesktopApp: API key

    DesktopApp->>OpenAIClient: Initialize client

    OpenAIClient-->>DesktopApp: Ready
```

---

# 15. Recommended File Structure

```text
/app
  /src
  /services
  /security
    decrypt.ts
    crypto.ts

/tools
  encrypt-key.ts

/app-data
  .core
```
