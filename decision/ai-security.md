# API Key Protection Decision

# 1. Problem

Ứng dụng chạy local desktop.

AI API key cần tồn tại trong máy giáo viên để app có thể gọi OpenAI API.

Nếu lưu trực tiếp:

```text
OPENAI_API_KEY=sk-xxxx
```

thì:

- dễ bị copy
- dễ bị leak
- giáo viên thấy rõ key
- có thể dùng key ngoài app
- dễ bị abuse cost

---

# 2. Goal

Mục tiêu:

- Không lưu raw API key
- Không hardcode API key trong source
- Khó đọc bằng mắt thường
- Dễ setup cho developer
- Không yêu cầu giáo viên thao tác kỹ thuật
- Có thể copy 1 encrypted string vào app
- Có thể rotate key dễ dàng

---

# 3. Final Architecture

## Overview

```text
Raw API Key
    +
Private Secret
    ↓
Encrypt Tool
    ↓
Encrypted Blob
    ↓
Save into hidden config file
    ↓
Desktop App
    ↓
Decrypt locally
    ↓
Use OpenAI API
```

---

# 4. Recommended Encryption Strategy

# Recommended Algorithm

## AES-256-GCM

Lý do:

- mạnh
- nhanh
- dễ implement
- phổ biến
- supported tốt trong Node.js

---

# 5. Key Strategy

# IMPORTANT

Không dùng raw password trực tiếp.

---

## Final Design

### Developer Side

Developer có:

```text
MASTER_SECRET
```

Ví dụ:

```text
TEACHER_APP_SECRET_2026
```

---

### Encryption Flow

```text
API Key
    ↓
PBKDF2 derive key
    ↓
AES-256-GCM encrypt
    ↓
Encrypted blob
```

---

# 6. Encrypted File Design

# IMPORTANT

Không dùng tên dễ đoán.

KHÔNG:

```text
apikey.txt
openai.key
```

---

## Recommended File Name

```text
/app-data/.core
```

hoặc:

```text
/app-data/.runtime
```

hoặc:

```text
/app-data/.cache_index
```

---

## File Content Example

```text
f9as8df98as7df9as8df7as9df87as9df87
```

chỉ chứa encrypted blob.

---

# 7. Encryption Tool Design

# IMPORTANT

Không để giáo viên tự encrypt.

Developer encrypt trước.

---

## CLI Tool

Tạo tool riêng:

```text
encrypt-key.ts
```

---

## Input

```text
API Key
MASTER_SECRET
```

---

## Output

```text
Encrypted blob
```

---

## Example Usage

```bash
node encrypt-key.js
```

---

## Prompt Example

```text
Enter API Key:
Enter Master Secret:
```

---

## Result

```text
Encrypted Result:
8as7df98as7df9as8df97as8df
```

copy blob này vào file `.core`.

---

# 8. Runtime Decryption Design

# App Startup Flow

```text
Open App
    ↓
Load encrypted blob
    ↓
Use MASTER_SECRET
    ↓
Decrypt API key
    ↓
Create OpenAI client
```

---

# 9. Where To Store MASTER_SECRET

# IMPORTANT

Không hardcode plain text trực tiếp.

---

## Recommended Strategy

Split secret thành nhiều phần.

Ví dụ:

```ts
const A = "TEACHER";
const B = "_APP";
const C = "_SECRET";
```

Runtime:

```ts
const SECRET = A + B + C;
```

---

# 10. Security Reality Check

# IMPORTANT

Giải pháp này:

- không chống được reverse engineering hoàn toàn
- không chống được hacker chuyên nghiệp

NHƯNG:

- đủ tốt cho desktop MVP
- tránh lộ key phổ thông
- tránh giáo viên copy key dễ dàng
- tránh nhìn thấy raw key

---

# 11. Recommended Future Upgrade

# Phase 2+

Sau này nếu scale:

```text
Desktop App
    ↓
Own Backend Proxy
    ↓
OpenAI API
```

lúc đó:

- API key không nằm local
- kiểm soát cost tốt hơn
- rate limit tốt hơn
- secure hơn

---

# 12. Recommended Tech Stack

## Encryption

```text
Node.js crypto module
```

---

## Algorithms

```text
AES-256-GCM
PBKDF2
```

---

## Storage

```text
Encrypted local file
```

---

## Desktop Runtime

```text
Tauri + Node runtime
```

---

# 16. Final Engineering Recommendation

# DO

- Encrypt local API key
- Hide config filename
- Separate encrypt tool
- Keep setup simple
- Rotate encrypted blob easily

---

# DON'T

- Hardcode raw key
- Commit raw key to git
- Store plain text settings
- Expose API key in UI logs
