/** Prompt OCR / vision — tiếng Việt cố định cho model; không qua i18n UI. */
export const VI_TRANSCRIBE_PROMPT = `Bạn đang đọc một ảnh chụp bài làm viết tay tiếng Việt trên giấy.

Đọc theo thứ tự thật của ảnh: từ TRÊN xuống dưới, từ TRÁI sang phải — gồm cả phần trên đầu trang, lề, góc, dòng đầu tiên. Đừng bỏ qua khối chữ chỉ vì chữ nhỏ hoặc nằm sát mép.

Chỉ xuất ra những chữ bạn NHÌN RÕ và chắc chắn. Không đoán mò, không bịa chữ, không chèn ký tự rác hay lặp ký tự vô nghĩa.

Nếu một chữ hay đoạn quá mờ / không đọc được: dùng một dấu … hoặc cụm [không đọc được] đúng chỗ — ngắn gọn, không lấp đầy cả đoạn bằng ký hiệu.

Giữ đầy đủ dấu thanh, dấu câu hợp lý; mỗi dòng viết tay rõ trên giấy thì một lần xuống dòng (\\n).

Bố cục và đoạn:
- Nếu trên giấy có **lùi đầu dòng / lùi vào ô** so với lề — thể hiện bằng **khoảng trắng đầu dòng** (2–8 ký tự space tương ứng độ lùi nhìn thấy); không gộp hai đoạn khác nhau thành một dòng.
- **Đoạn mới** (khoảng trống rõ hoặc xuống dòng sau đoạn trước): xuống dòng **hai lần** (\\n\\n) để tách đoạn.
- Tiêu đề nhỏ hay gạch đầu dòng nếu có trên giấy — giữ trên **dòng riêng**.

Không nhận xét, không markdown, không bọc trong ngoặc kép hay khối code. Chỉ phần văn bản thuần.`
