# Hệ Thống Hỗ Trợ Định Giá Tài Sản & Trình Tạo Mã QR Code Đa Năng

Ứng dụng web chuyên nghiệp hỗ trợ cán bộ ngân hàng / thẩm định viên khảo sát, định giá tài sản, gắn tọa độ GPS vệ tinh Google Maps, xuất biên bản báo cáo định giá chuẩn A4 và quản lý dữ liệu đám mây.

---

## 🌟 Các Tính Năng Nổi Bật

1. **Trình Tạo Mã QR Code Đa Dạng**:
   - **Đường dẫn URL / Google Maps**: Tự động giải mã link chia sẻ Google Maps di động (`maps.app.goo.gl`), trích xuất tọa độ GPS chính xác đến từng mét và chuẩn hóa địa chỉ hành chính.
   - **VietQR Chuyển Khoản**: Chuẩn thanh toán NAPAS 24/7 của tất cả các ngân hàng Việt Nam (mặc định VietinBank).
   - **Wi-Fi, Danh thiếp VCard, SMS, Email, Số điện thoại, Đoạn văn bản**.

2. **Bản Đồ Vệ Tinh Google Maps HD Tương Tác**:
   - Tích hợp lớp dữ liệu vệ tinh trực tiếp từ Google Maps (`lyrs=y` có tên đường, số nhà, địa điểm).
   - Cho phép phóng to/thu nhỏ (`+` / `-`), giữ chuột để kéo di chuyển bản đồ (pan), và ghim định vị chuẩn xác.
   - Chuyển đổi linh hoạt giữa 3 chế độ: **Vệ Tinh (Có Nhãn)**, **Vệ Tinh Thuần**, và **Bản Đồ Phố**.
   - Hỗ trợ định vị GPS thiết bị và tự động dự phòng qua mạng IP (`/api/my-ip-location`).

3. **Báo Cáo Định Giá Chuẩn In A4 & Xuất PDF**:
   - Xuất báo cáo khảo sát hiện trường chuẩn VietinBank khổ A4 có ảnh chụp vệ tinh Google Maps HD.
   - Cho phép tải tệp PDF hoặc in ấn trực tiếp từ trình duyệt.

4. **Biểu Đồ & Bảng Thống Kê Định Giá (Dashboard)**:
   - Thống kê tổng số tài sản, tổng giá trị định giá, phân bổ theo địa bàn xã/phường/thành phố và phân khúc giá trị.

5. **Đồng Bộ Đám Mây Firebase Firestore & Phân Quyền Người Dùng**:
   - Lưu trữ dữ liệu thời gian thực trên Firestore.
   - Phân quyền rõ ràng: **Admin** (quản lý toàn quyền, duyệt thành viên) và **Member** (quản lý tài sản của mình).
   - Tài khoản mẫu khởi tạo sẵn: `admin` (mật khẩu: `1111`) và `dinhgiaqr` (mật khẩu: `2222`).

6. **Xuất Ứng Dụng Chạy Offline Độc Lập**:
   - Xuất toàn bộ ứng dụng thành 1 file duy nhất `index_offline.html` chạy mượt mà ngay cả khi không có kết nối Internet.

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy Local (Máy Tính Cá Nhân)

### Yêu Cầu Hệ Thống
- **Node.js** phiên bản 18.0.0 trở lên (khuyên dùng Node.js 20 LTS).
- Trình quản lý gói: `npm` (mặc định đi kèm Node.js) hoặc `yarn`, `pnpm`, `bun`.

### Các Bước Thực Hiện

1. **Giải nén mã nguồn**:
   Giải nén file `he-thong-dinh-gia-qr-code.zip` vào một thư mục trên máy của bạn.

2. **Mở cửa sổ dòng lệnh (Terminal / Command Prompt / PowerShell)** tại thư mục vừa giải nén:
   ```bash
   cd he-thong-dinh-gia-qr-code
   ```

3. **Cài đặt các gói phụ thuộc (Dependencies)**:
   ```bash
   npm install
   ```

4. **Khởi chạy ứng dụng ở chế độ phát triển (Development)**:
   ```bash
   npm run dev
   ```
   Sau khi màn hình hiển thị thông báo, mở trình duyệt web và truy cập địa chỉ:
   ```
   http://localhost:3000
   ```

5. **Đóng gói phiên bản triển khai thực tế (Production Build)**:
   ```bash
   npm run build
   npm run start
   ```

---

## 📁 Cấu Trúc Thư Mục Dự Án

```
├── src/
│   ├── components/
│   │   ├── Header.tsx                 # Thanh tiêu đề, chuyển đổi chế độ & thao tác tài khoản
│   │   ├── QRInputForm.tsx            # Form nhập URL, tọa độ GPS, địa chỉ, VietQR...
│   │   ├── QRPreviewCard.tsx          # Thẻ hiển thị mã QR, tùy biến màu sắc, logo & đính kèm ảnh
│   │   ├── InlineSatelliteMap.tsx     # Bản đồ vệ tinh Google tương tác trực tiếp
│   │   ├── SatelliteMapModal.tsx      # Modal phóng to toàn màn hình bản đồ vệ tinh HD
│   │   ├── PrintReportModal.tsx       # Báo cáo thẩm định tài sản A4 & xuất PDF
│   │   ├── ValuationDashboardModal.tsx# Thống kê trực quan biểu đồ định giá
│   │   ├── HistoryModal.tsx           # Lịch sử mã QR đã lưu, tìm kiếm & bộ lọc
│   │   ├── AuthModal.tsx              # Đăng nhập, đăng ký tài khoản
│   │   └── AdminUsersModal.tsx        # Quản lý & phê duyệt thành viên
│   ├── services/
│   │   ├── authService.ts             # Quản lý xác thực & phân quyền người dùng
│   │   └── qrCloudService.ts          # Đồng bộ dữ liệu tài sản với Cloud Firestore
│   ├── utils/
│   │   ├── geoUtils.ts                # Giải mã tọa độ GPS, trích xuất link Maps & ảnh vệ tinh
│   │   ├── qrGenerator.ts             # Thuật toán tạo mã QR chuẩn vector SVG & Canvas
│   │   ├── exportOfflineHtml.ts       # Cơ chế đóng gói toàn bộ app thành file HTML offline
│   │   └── valuationUtils.ts          # Thống kê, tổng hợp số liệu tài sản
│   ├── App.tsx                        # Giao diện chính của ứng dụng
│   └── types.ts                       # Định nghĩa TypeScript cho dữ liệu toàn hệ thống
├── server.ts                          # Máy chủ Express: API phân tích link Maps, gửi mail, tải zip
├── vite.config.ts                     # Cấu hình Vite bundler & Tailwind CSS
├── tsconfig.json                      # Cấu hình TypeScript
└── package.json                       # Danh sách thư viện và tập lệnh lệnh build/run
```

---

## 🔒 Tài Khoản Mặc Định
- **Quản trị viên (Admin)**: Tên đăng nhập `admin` | Mật khẩu `1111`
- **Thẩm định viên (Member)**: Tên đăng nhập `dinhgiaqr` | Mật khẩu `2222`
- Bạn cũng có thể đăng ký tài khoản mới trực tiếp trên giao diện và đăng nhập ngay.
