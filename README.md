# Công nợ vé máy bay — Web (React + Vite + Firebase)

Thay thế file `CONG NO VE MAY BAY.xlsm`. Logic tính toán chuyển nguyên từ sheet **TỔNG** và **Cong no** (ô B2 = chọn tháng).

## Chức năng
| Excel cũ | Web |
|---|---|
| Form NHAP (nhập vé) | **+ Nhập vé** — dán nguyên tin nhắn đặt chỗ vào ô **Thông tin vé**: tự đọc code (6 ký tự sau "Code:"), tên khách, hành trình, ngày/giờ bay, chuyến bay, hãng, tổng tiền (→ giá net), tình trạng giữ chỗ |
| Form NOPQUY | **+ Nộp quỹ** |
| Sheet Cong no + ô B2 | Tab **Công nợ**: chọn tháng → Nợ cũ, Nộp quỹ, Xuất vé, Dư nợ, Chưa thu, Tổng vé, Hoa hồng, bảng chi tiết có cột Dư nợ quỹ chạy lũy kế |
| Form Xuatve / Thuno / Themhanhly / Doigio | Nút **⋯** trên từng dòng: Xuất vé, Thu nợ (đủ / một phần), Thêm hành lý, Đổi ngày/giờ, Sửa, Xóa |
| Form Timve | Ô **Tìm tên khách / code vé** trên đầu trang (gõ không dấu, không cần đúng thứ tự) + tab **Sổ tổng** |
| Sheet Sap bay / Chua xuat / DS Chua thu | Tab **Sắp bay**, **Chưa xuất**, **Khách nợ** |
| Sheet PN + Sheet2 | Tab **Đối soát PN**: chọn file "Sổ chi tiết phải thu – phải trả" (.XLS) của PN → so từng ngày (phát sinh nợ ↔ phí đại lý, thanh toán ↔ nộp quỹ), mở ngày lệch xem từng vé |
| Nợ cũ gõ tay | Ô **Điều chỉnh khi chốt** (tab Công nợ) hoặc nút **Chốt theo số PN**: nhập số dư chốt với đại lý → tạo dòng điều chỉnh (DC) chuyển sang nợ cũ tháng sau |
| Sheet DK ve | **Cài đặt → Hãng bay**: hệ số trẻ em, em bé, phí đại lý/khách |

**Nợ cũ tự tính lũy kế:** Nợ cũ tháng M = Số dư đầu kỳ + Σ(Nộp quỹ − Xuất vé) của các tháng trước M.
Khi nhập file Excel, số dư đầu kỳ được tự đặt để Nợ cũ tháng đang chọn ở ô B2 khớp file (T09‑2026: −29.408.371).

Đã kiểm tra với file thật, tháng T09‑2026 khớp 100% với sheet Cong no:
Dư nợ −28.671.110 · Nợ cũ −29.408.371 · Nộp quỹ 130.300.000 · Xuất vé 129.562.739 · Hoa hồng 11.257.675 · Tổng vé 117 · Chưa thu 39.618.600.

## Chạy thử trên máy (chế độ DEMO, không cần Firebase)
```bash
npm install
npm run dev
```
Mở http://localhost:5173 → **Cài đặt → Chọn file Excel** → chọn file `.xlsm` → **Thay thế toàn bộ**.
Ở chế độ DEMO dữ liệu chỉ lưu trong trình duyệt đó.

## Triển khai thật (tài khoản phongvenhatan@gmail.com)
Đăng nhập **phongvenhatan@gmail.com** cho cả 3 dịch vụ dưới đây — project riêng, không dùng chung hạn mức và người dùng với QLVT.
1. **Firebase** (console.firebase.google.com) → *Add project* (vd. `congno-vemaybay`), không cần Google Analytics.
   - Build → **Firestore Database** → *Create database* → vùng `asia-southeast1` (Singapore) → chế độ production.
   - Firestore → **Rules** → dán toàn bộ nội dung file `firestore.rules` → *Publish*.
   - Build → **Authentication** → *Get started* → bật **Email/Password** → tab Users → *Add user* cho từng người được dùng.
   - Project settings (bánh răng) → *Your apps* → biểu tượng **</>** (Web) → đặt tên → copy 6 giá trị `firebaseConfig`.
2. **GitHub** (đăng ký bằng phongvenhatan@gmail.com) → *New repository* `congno-vemaybay` (Private) → *uploading an existing file* → kéo toàn bộ thư mục đã giải nén (trừ `node_modules`) → *Commit*.
3. **Vercel** (vercel.com → *Continue with GitHub* bằng tài khoản trên) → *Add New Project* → chọn repo → Framework **Vite** →
   *Environment Variables*: thêm 6 biến `VITE_FIREBASE_*` theo `.env.example` → *Deploy*.
4. Mở link Vercel, đăng nhập → **Cài đặt → Chọn file Excel** → **Thay thế toàn bộ** (web ghi dữ liệu mới xong mới xóa dữ liệu cũ).

Hạn mức miễn phí Firestore: 50.000 lượt đọc / 20.000 lượt ghi mỗi ngày — mỗi lần mở web đọc toàn bộ sổ (~1.700 lượt), đủ cho vài chục lượt mở/ngày.

Dữ liệu nằm ở collection `vmb_tickets` (mỗi dòng sổ TỔNG là 1 document) và `vmb_config/settings`.

## Ghi chú nghiệp vụ
- **SUN PQ**: sheet Cong no tính giá bán theo khách (NL × giá + TE × 0,8 + EB × 0,1), còn sheet TỔNG thiếu nhánh SUN PQ nên lấy giá bán làm tổng.
  Web theo cách của sheet Cong no (vì tổng hoa hồng ở ô D8 được tính theo cách này). Có thể đổi trong Cài đặt → Hãng bay.
- Cột "Tiền nợ" của từng dòng được giữ nguyên như file cũ (kể cả các dòng từng sửa tay).
- **Thu nợ một phần** cộng dồn số tiền thu; khi đủ tự chuyển sang R.
- **Đổi giờ** chọn R thì ghi luôn đã thu phí đổi (file cũ không ghi → dòng DG bị tính nợ).
- Ô **Thông tin vé**: số "Tổng" trong tin nhắn được lấy làm **Giá net**; danh xưng MR/MS/MRS → người lớn, MSTR/MISS → trẻ em, INF → em bé.
- **Khách nợ** và ô **Khách chưa trả** cùng một cách tính: mọi vé có Thành tiền lớn hơn số đã thu.
