// Standalone Single-File HTML Generator for 100% Offline QR Code Generator
// Styled specifically for VietinBank Chi nhánh Sóc Trăng with enhanced offline features

export function downloadStandaloneOfflineHtml() {
  const standaloneHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VietinBank Sóc Trăng - Trình Tạo Mã QR Code Offline</title>
  <style>
    :root {
      --vtb-blue: #00529c;
      --vtb-blue-dark: #003b72;
      --vtb-red: #e30613;
      --vtb-red-hover: #c40410;
      --vtb-bg: #f0f4f8;
      --vtb-card: #ffffff;
      --vtb-text: #0f172a;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    body { background-color: var(--vtb-bg); color: var(--vtb-text); min-height: 100vh; padding: 20px 16px; display: flex; flex-direction: column; align-items: center; }
    
    /* VietinBank Header Banner */
    header {
      width: 100%;
      max-width: 960px;
      background: linear-gradient(135deg, var(--vtb-blue) 0%, var(--vtb-blue-dark) 100%);
      color: #ffffff;
      border-radius: 16px;
      padding: 20px 24px;
      margin-bottom: 24px;
      box-shadow: 0 4px 16px rgba(0, 82, 156, 0.2);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 4px solid var(--vtb-red);
    }
    header::after {
      content: "";
      position: absolute;
      right: -20px;
      bottom: -40px;
      width: 180px;
      height: 180px;
      background: rgba(227, 6, 19, 0.15);
      border-radius: 50%;
      pointer-events: none;
    }
    .brand-container { display: flex; align-items: center; gap: 16px; z-index: 1; }
    .vtb-logo-badge {
      width: 52px;
      height: 52px;
      background: #ffffff;
      color: var(--vtb-blue);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 13px;
      line-height: 1.1;
      border: 2px solid var(--vtb-red);
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .vtb-logo-badge span { color: var(--vtb-red); font-size: 10px; font-weight: 800; }
    .brand-title { font-size: 19px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #ffffff; }
    .brand-subtitle { font-size: 13px; color: #bae6fd; font-weight: 600; margin-top: 2px; }
    .security-badge {
      z-index: 1;
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255,255,255,0.3);
      padding: 6px 14px;
      border-radius: 30px;
      font-size: 12px;
      font-weight: 600;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .security-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; }

    main { width: 100%; max-width: 960px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    @media (max-width: 820px) { main { grid-template-columns: 1fr; } }

    .card {
      background: var(--vtb-card);
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      padding: 22px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.04);
    }
    .card-title {
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      color: var(--vtb-blue);
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-b: 2px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .form-group { margin-bottom: 16px; }
    label { font-size: 12px; font-weight: 700; color: #334155; display: block; margin-bottom: 6px; }
    input[type="text"], textarea, select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      transition: all 0.2s;
    }
    input:focus, textarea:focus, select:focus {
      border-color: var(--vtb-blue);
      box-shadow: 0 0 0 3px rgba(0,82,156,0.15);
    }
    
    /* VietinBank Color Palette Selector */
    .color-presets { display: flex; gap: 8px; margin-top: 6px; }
    .color-chip {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      border: 2px solid #ffffff;
      box-shadow: 0 0 0 1px #cbd5e1;
      transition: transform 0.2s;
    }
    .color-chip:hover { transform: scale(1.15); }

    /* Action Buttons */
    .btn {
      background: var(--vtb-blue);
      color: #ffffff;
      border: none;
      padding: 12px 18px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      width: 100%;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 2px 6px rgba(0,82,156,0.2);
    }
    .btn:hover { background: var(--vtb-blue-dark); transform: translateY(-1px); }
    .btn-red { background: var(--vtb-red); box-shadow: 0 2px 6px rgba(227,6,19,0.2); }
    .btn-red:hover { background: var(--vtb-red-hover); }
    .btn-outline { background: #ffffff; color: #334155; border: 1px solid #cbd5e1; box-shadow: none; }
    .btn-outline:hover { background: #f8fafc; color: var(--vtb-blue); border-color: var(--vtb-blue); }

    .preview-box {
      background: #f8fafc;
      border: 2px dashed #cbd5e1;
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 290px;
      margin-bottom: 16px;
      position: relative;
    }
    canvas { max-width: 100%; height: auto; border-radius: 8px; background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }

    .vtb-frame-tag {
      margin-top: 10px;
      font-size: 11px;
      font-weight: 800;
      color: var(--vtb-blue);
      letter-spacing: 0.5px;
      text-transform: uppercase;
      background: #e0f2fe;
      padding: 4px 12px;
      border-radius: 20px;
      border: 1px solid #bae6fd;
    }

    .btn-group { display: flex; gap: 8px; width: 100%; }
    .flex-1 { flex: 1; }

    /* Offline History Section inside Offline File */
    .history-section {
      margin-top: 20px;
      padding-top: 12px;
      border-t: 1px solid #e2e8f0;
    }
    .history-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin-bottom: 6px;
      font-size: 12px;
    }
    .history-item-text { font-weight: 600; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; }

    footer {
      margin-top: 28px;
      font-size: 12px;
      color: #64748b;
      text-align: center;
      padding: 12px;
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      width: 100%;
      max-width: 960px;
    }
  </style>
</head>
<body>

  <!-- Header Branding VietinBank -->
  <header>
    <div class="brand-container">
      <div class="vtb-logo-badge">
        VTB <span>ST</span>
      </div>
      <div>
        <div class="brand-title">VietinBank Chi Nhánh Sóc Trăng</div>
        <div class="brand-subtitle">Hệ Thống Tạo Mã QR Code Bảo Mật Offline (Single-File)</div>
      </div>
    </div>
    <div class="security-badge">
      <div class="security-dot"></div>
      Offline 100% - Bảo Mật Nội Bộ
    </div>
  </header>

  <main>
    <!-- Left Configuration Panel -->
    <div class="card">
      <div class="card-title">
        <span>1. Cấu Hình Nội Dung Mã QR</span>
        <span style="font-size: 11px; font-weight: 600; color: var(--vtb-red);">Chi nhánh Sóc Trăng</span>
      </div>

      <!-- Quick Template Selection -->
      <div class="form-group">
        <label>Mẫu QR nhanh (Nội bộ VietinBank Sóc Trăng)</label>
        <select id="templateSelect" onchange="applyTemplate()">
          <option value="custom">-- Tự nhập nội dung tùy chỉnh --</option>
          <option value="vtb_acc">Chuyển khoản Ngân Hàng VietinBank (VietQR ST)</option>
          <option value="vtb_web">Website Chính Thức VietinBank (vietinbank.vn)</option>
          <option value="vtb_wifi">Wi-Fi Khách Hàng VietinBank Sóc Trăng</option>
          <option value="vtb_hotline">Hotline Hỗ Trợ Khách Hàng Sóc Trăng (0299.3821.123)</option>
        </select>
      </div>

      <!-- Type Select -->
      <div class="form-group">
        <label>Loại nội dung</label>
        <select id="typeSelect" onchange="handleTypeChange()">
          <option value="url" selected>Liên kết / Đường Dẫn (URL)</option>
          <option value="bank">Tài Khoản Ngân Hàng (VietQR / VietinBank)</option>
          <option value="text">Văn bản / Thông tin (Text)</option>
          <option value="wifi">Kết nối Wi-Fi Văn Phòng</option>
          <option value="phone">Số Điện Thoại Liên Hệ</option>
        </select>
      </div>

      <!-- URL Input -->
      <div id="urlGroup" class="form-group">
        <label>Đường Dẫn URL / Website</label>
        <input type="text" id="urlInput" value="https://maps.app.goo.gl/ZJoDMB4Cz3BP1zTw8" placeholder="https://maps.app.goo.gl/ZJoDMB4Cz3BP1zTw8" oninput="generateQR()" />
      </div>

      <!-- Text Input -->
      <div id="textGroup" class="form-group" style="display:none;">
        <label>Nội dung văn bản mã hóa</label>
        <textarea id="textInput" rows="3" placeholder="Nhập thông tin mã hóa..." oninput="generateQR()">VietinBank Chi nhánh Sóc Trăng - Nâng giá trị cuộc sống</textarea>
      </div>

      <!-- VietQR Bank Account Input -->
      <div id="bankGroup" class="form-group" style="display:none;">
        <label>Ngân Hàng Thụ Hưởng</label>
        <select id="bankBin" onchange="generateQR()" style="margin-bottom:8px; width:100%; padding:8px 10px; border-radius:8px; border:1px solid #cbd5e1; font-weight:bold; background:#fff;">
          <option value="970415" selected>VietinBank - Ngân hàng TMCP Công Thương Việt Nam (970415)</option>
          <option value="970436">Vietcombank - Ngân hàng TMCP Ngoại Thương Việt Nam (970436)</option>
          <option value="970418">BIDV - Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (970418)</option>
          <option value="970405">Agribank - Ngân hàng Nông nghiệp & Phát triển Nông thôn (970405)</option>
          <option value="970407">Techcombank - Ngân hàng TMCP Kỹ thương Việt Nam (970407)</option>
          <option value="970422">MBBank - Ngân hàng TMCP Quân Đội (970422)</option>
          <option value="970432">VPBank - Ngân hàng TMCP Việt Nam Thịnh Vượng (970432)</option>
          <option value="970416">ACB - Ngân hàng TMCP Á Châu (970416)</option>
          <option value="970423">TPBank - Ngân hàng TMCP Tiên Phong (970423)</option>
          <option value="970403">Sacombank - Ngân hàng TMCP Sài Gòn Thương Tín (970403)</option>
        </select>
        <label>Số Tài Khoản</label>
        <input type="text" id="bankAcc" value="101000123456" placeholder="Nhập số tài khoản" oninput="generateQR()" style="margin-bottom:8px; font-weight:bold; font-family:monospace;" />
        <label>Tên Chủ Tài Khoản (In hoa)</label>
        <input type="text" id="bankName" value="VIETINBANK CHI NHANH SOC TRANG" placeholder="HOANG VAN A" oninput="generateQR()" style="margin-bottom:8px; text-transform:uppercase; font-weight:bold;" />
        <label>Số Tiền Chuyển (Đồng - Tùy chọn)</label>
        <input type="text" id="bankAmount" placeholder="Ví dụ: 100000" oninput="generateQR()" style="margin-bottom:8px;" />
        <label>Nội Dung Chuyển Tiền (Tùy chọn)</label>
        <input type="text" id="bankInfo" value="Chuyen tien thanh toan" placeholder="Ví dụ: Thanh toan tien hang" oninput="generateQR()" />
      </div>

      <!-- Wi-Fi Input -->
      <div id="wifiGroup" class="form-group" style="display:none;">
        <label>Tên Wi-Fi (SSID)</label>
        <input type="text" id="wifiSsid" value="VietinBank_SocTrang_Guest" placeholder="Tên Wi-Fi" oninput="generateQR()" style="margin-bottom:8px;" />
        <label>Mật Khẩu Wi-Fi</label>
        <input type="text" id="wifiPass" value="Vietinbank@2026" placeholder="Mật khẩu" oninput="generateQR()" />
      </div>

      <!-- Phone Input -->
      <div id="phoneGroup" class="form-group" style="display:none;">
        <label>Số Điện Thoại Hotline</label>
        <input type="text" id="phoneInput" value="02993821123" placeholder="02993821123" oninput="generateQR()" />
      </div>

      <!-- Options / Colors & Error Correction -->
      <div class="card-title" style="margin-top: 20px;">
        <span>2. Tùy Chọn Giao Diện & Màu Sắc</span>
      </div>

      <div class="form-group">
        <label>Màu Sắc Mã QR (Chuẩn Thương Hiệu)</label>
        <div style="display:flex; align-items:center; gap:12px;">
          <input type="color" id="darkColor" value="#00529c" style="width:40px; height:40px; border:0; cursor:pointer; border-radius:8px;" onchange="generateQR()" />
          <div class="color-presets">
            <div class="color-chip" style="background:#00529c;" title="Xanh VietinBank" onclick="setPresetColor('#00529c')"></div>
            <div class="color-chip" style="background:#e30613;" title="Đỏ VietinBank" onclick="setPresetColor('#e30613')"></div>
            <div class="color-chip" style="background:#0f172a;" title="Đen Sang Trọng" onclick="setPresetColor('#0f172a')"></div>
            <div class="color-chip" style="background:#0284c7;" title="Xanh Dương Nhẹ" onclick="setPresetColor('#0284c7')"></div>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>Kích Thước Xuất File PNG</label>
        <select id="sizeSelect" onchange="generateQR()">
          <option value="256">Nhẹ (256 x 256 px)</option>
          <option value="500" selected>Tiêu Chuẩn (500 x 500 px)</option>
          <option value="1000">Sắc Nét HD (1000 x 1000 px)</option>
          <option value="2048">Ultra HD (2048 x 2048 px - In ấn)</option>
          <option value="4096">4K Ultra HD (4096 x 4096 px - Khổ lớn)</option>
        </select>
      </div>

      <div class="form-group">
        <label>Dòng Chữ Nhãn Khung (Frame Label)</label>
        <input type="text" id="frameLabel" value="VIETINBANK SÓC TRĂNG" placeholder="Để trống nếu không dùng" oninput="generateQR()" />
      </div>

      <button class="btn" onclick="generateQR()">
        🔄 Cập Nhật Mã QR Code
      </button>
    </div>

    <!-- Right Preview Panel -->
    <div id="previewCard" class="card" style="display:flex; flex-direction:column; justify-content:space-between;">
      <div>
        <div class="card-title">
          <span>Kết Quả Mã QR Code</span>
          <span style="font-size:11px; font-weight:600; color:#059669;">Sẵn sàng xuất file</span>
        </div>

        <div class="preview-box">
          <canvas id="qrCanvas" width="300" height="300"></canvas>
          <div id="vtbFrameTag" class="vtb-frame-tag">VIETINBANK SÓC TRĂNG</div>
        </div>

        <div id="statusMsg" style="font-size:12px; font-weight:700; text-align:center; margin-bottom:14px; min-height:18px;"></div>
      </div>

      <!-- Download Action Buttons -->
      <div>
        <div class="btn-group" style="margin-bottom:10px;">
          <button class="btn btn-red flex-1" onclick="downloadPNG()">
            📥 Tải Ảnh PNG High-Res
          </button>
          <button class="btn btn-outline flex-1" onclick="copyCanvas()">
            📋 Sao Chép Ảnh
          </button>
        </div>
        <button class="btn btn-outline" style="font-size:12px; padding:8px 12px;" onclick="saveToOfflineHistory()">
          💾 Lưu Vào Danh Sách Đã Tạo (Offline)
        </button>

        <!-- Offline History Section -->
        <div class="history-section">
          <label style="margin-bottom:8px;">Lịch Sử Mã QR Đã Lưu (Bộ Nhớ Trình Duyệt):</label>
          <div id="historyList">
            <div style="font-size:11px; color:#94a3b8; font-style:italic; text-align:center;">Chưa có mã nào được lưu offline</div>
          </div>
        </div>
      </div>
    </div>
  </main>

  <footer>
    <strong>Ngân hàng TMCP Công Thương Việt Nam - Chi Nhánh Sóc Trăng</strong><br>
    Địa chỉ: TP. Sóc Trăng, Tỉnh Sóc Trăng &bull; Tệp Offline Độc Lập Chạy 100% Không Cần Mạng Internet.
  </footer>

  <!-- Complete Embedded QRCode Engine (Pure JavaScript - No external requests) -->
  <script>
    ${getEmbeddedQRCodeEngineCode()}
  </script>

  <script>
    let offlineHistory = [];

    function applyTemplate() {
      const tpl = document.getElementById('templateSelect').value;
      if (tpl === 'vtb_acc') {
        document.getElementById('typeSelect').value = 'bank';
        handleTypeChange();
        document.getElementById('bankAcc').value = '101000123456';
        document.getElementById('bankName').value = 'VIETINBANK CHI NHANH SOC TRANG';
        document.getElementById('bankAmount').value = '';
      } else if (tpl === 'vtb_web') {
        document.getElementById('typeSelect').value = 'url';
        handleTypeChange();
        document.getElementById('urlInput').value = 'https://www.vietinbank.vn';
      } else if (tpl === 'vtb_wifi') {
        document.getElementById('typeSelect').value = 'wifi';
        handleTypeChange();
        document.getElementById('wifiSsid').value = 'VietinBank_SocTrang_Guest';
        document.getElementById('wifiPass').value = 'Vietinbank@2026';
      } else if (tpl === 'vtb_hotline') {
        document.getElementById('typeSelect').value = 'phone';
        handleTypeChange();
        document.getElementById('phoneInput').value = '02993821123';
      }
      generateQR();
    }

    function handleTypeChange() {
      const type = document.getElementById('typeSelect').value;
      document.getElementById('urlGroup').style.display = type === 'url' ? 'block' : 'none';
      document.getElementById('textGroup').style.display = type === 'text' ? 'block' : 'none';
      document.getElementById('bankGroup').style.display = type === 'bank' ? 'block' : 'none';
      document.getElementById('wifiGroup').style.display = type === 'wifi' ? 'block' : 'none';
      document.getElementById('phoneGroup').style.display = type === 'phone' ? 'block' : 'none';
      generateQR();
    }

    function setPresetColor(hex) {
      document.getElementById('darkColor').value = hex;
      generateQR();
    }

    function removeVietAccents(str) {
      if (!str) return '';
      return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9\s.-]/g, '')
        .trim();
    }

    function calcCRC16(data) {
      var crc = 0xFFFF;
      for (var i = 0; i < data.length; i++) {
        var c = data.charCodeAt(i);
        crc ^= (c << 8);
        for (var j = 0; j < 8; j++) {
          if ((crc & 0x8000) !== 0) {
            crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
          } else {
            crc = (crc << 1) & 0xFFFF;
          }
        }
      }
      return crc.toString(16).toUpperCase().padStart(4, '0');
    }

    function generateVietQREMVCoOffline(bin, accountNo, accountName, amount, addInfo) {
      var bankBin = (bin || '970415').trim();
      var acc = (accountNo || '').replace(/\s+/g, '').trim();
      var name = removeVietAccents(accountName || '').toUpperCase();
      var amtStr = amount ? String(amount).replace(/[^0-9]/g, '') : '';
      var noteStr = addInfo ? removeVietAccents(addInfo).toUpperCase() : '';

      if (!acc) return '';

      function formatLen(l) {
        return l < 10 ? '0' + l : String(l);
      }

      var sub00 = '0006' + bankBin;
      var sub01 = '01' + formatLen(acc.length) + acc;
      var sub01Content = sub00 + sub01;
      var tag01 = '01' + formatLen(sub01Content.length) + sub01Content;

      var tag38Content = '0010A000000727' + tag01 + '0208QRIBFTTA';
      var tag38 = '38' + formatLen(tag38Content.length) + tag38Content;

      var poi = amtStr && parseInt(amtStr, 10) > 0 ? '010212' : '010211';

      var raw = '000201' + poi + tag38 + '5303704';

      if (amtStr && parseInt(amtStr, 10) > 0) {
        raw += '54' + formatLen(amtStr.length) + amtStr;
      }

      raw += '5802VN';

      if (name) {
        raw += '59' + formatLen(name.length) + name;
      }

      if (noteStr) {
        var sub08 = '08' + formatLen(noteStr.length) + noteStr;
        raw += '62' + formatLen(sub08.length) + sub08;
      }

      raw += '6304';
      var crc = calcCRC16(raw);
      return raw + crc;
    }

    function getFormattedText() {
      const type = document.getElementById('typeSelect').value;
      if (type === 'url') {
        let val = document.getElementById('urlInput').value.trim();
        if (val && !/^https?:\\/\\//i.test(val)) val = 'https://' + val;
        return val;
      }
      if (type === 'text') return document.getElementById('textInput').value;
      if (type === 'bank') {
        const bin = document.getElementById('bankBin') ? document.getElementById('bankBin').value : '970415';
        const acc = document.getElementById('bankAcc').value;
        const name = document.getElementById('bankName').value;
        const amt = document.getElementById('bankAmount').value;
        const info = document.getElementById('bankInfo') ? document.getElementById('bankInfo').value : '';
        return generateVietQREMVCoOffline(bin, acc, name, amt, info);
      }
      if (type === 'wifi') {
        const ssid = document.getElementById('wifiSsid').value;
        const pass = document.getElementById('wifiPass').value || '';
        return ssid ? 'WIFI:S:' + ssid + ';T:WPA;P:' + pass + ';;' : '';
      }
      if (type === 'phone') {
        const phone = document.getElementById('phoneInput').value.trim();
        return phone ? 'tel:' + phone : '';
      }
      return '';
    }

    function generateQR() {
      const canvas = document.getElementById('qrCanvas');
      const statusEl = document.getElementById('statusMsg');
      const frameTagEl = document.getElementById('vtbFrameTag');
      const text = getFormattedText();
      const darkColor = document.getElementById('darkColor').value || '#00529c';
      const renderSize = parseInt(document.getElementById('sizeSelect').value) || 300;
      const labelText = document.getElementById('frameLabel').value.trim();

      if (frameTagEl) {
        if (labelText) {
          frameTagEl.style.display = 'inline-block';
          frameTagEl.textContent = labelText;
        } else {
          frameTagEl.style.display = 'none';
        }
      }

      if (!canvas) return;

      if (!text || text.trim() === '') {
        if (statusEl) {
          statusEl.style.color = '#dc2626';
          statusEl.textContent = '❌ Vui lòng nhập thông tin trước khi tạo mã QR!';
        }
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      const qrEngine = window.QRCode || (typeof QRCode !== 'undefined' ? QRCode : null);
      if (qrEngine && qrEngine.toCanvas) {
        qrEngine.toCanvas(canvas, text, {
          width: renderSize,
          margin: 2,
          color: {
            dark: darkColor,
            light: '#ffffff'
          }
        }, function(error) {
          if (error) {
            console.error('QR Generator Error:', error);
            if (statusEl) {
              statusEl.style.color = '#dc2626';
              statusEl.textContent = '❌ Lỗi khi tạo mã QR: ' + error.message;
            }
          } else {
            if (statusEl) {
              statusEl.style.color = '#059669';
              statusEl.textContent = '✓ Mã QR Code VietinBank đã tạo thành công!';
            }
          }
        });
      }
    }

    function downloadPNG() {
      const text = getFormattedText();
      if (!text || text.trim() === '') {
        return alert('Vui lòng nhập thông tin trước khi tải mã QR!');
      }
      const darkColor = document.getElementById('darkColor').value || '#00529c';
      const renderSize = parseInt(document.getElementById('sizeSelect').value) || 500;

      const offCanvas = document.createElement('canvas');
      offCanvas.width = renderSize;
      offCanvas.height = renderSize;

      const qrEngine = window.QRCode || (typeof QRCode !== 'undefined' ? QRCode : null);
      if (qrEngine && qrEngine.toCanvas) {
        qrEngine.toCanvas(offCanvas, text, {
          width: renderSize,
          margin: 2,
          color: {
            dark: darkColor,
            light: '#ffffff'
          }
        }, function(error) {
          if (!error) {
            const a = document.createElement('a');
            a.download = 'VietinBank-SocTrang-QRCode-' + renderSize + 'x' + renderSize + '.png';
            a.href = offCanvas.toDataURL('image/png');
            a.click();
          } else {
            const canvas = document.getElementById('qrCanvas');
            if (!canvas) return;
            const a = document.createElement('a');
            a.download = 'VietinBank-SocTrang-QRCode.png';
            a.href = canvas.toDataURL('image/png');
            a.click();
          }
        });
      } else {
        const canvas = document.getElementById('qrCanvas');
        if (!canvas) return;
        const a = document.createElement('a');
        a.download = 'VietinBank-SocTrang-QRCode.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
      }
    }

    function copyCanvas() {
      const canvas = document.getElementById('qrCanvas');
      if (!canvas) return;
      canvas.toBlob(function(blob) {
        if (!blob) return alert('Không thể sao chép');
        navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]).then(function() {
          alert('Đã sao chép ảnh mã QR VietinBank vào bộ nhớ tạm!');
        }).catch(function() {
          alert('Vui lòng bấm nút "Tải Ảnh PNG" để lưu tệp.');
        });
      });
    }

    function saveToOfflineHistory() {
      const text = getFormattedText();
      if (!text) return alert('Vui lòng tạo mã QR trước khi lưu');
      const item = {
        id: Date.now(),
        text: text,
        type: document.getElementById('typeSelect').value,
        time: new Date().toLocaleTimeString('vi-VN')
      };
      offlineHistory.unshift(item);
      renderHistory();
      alert('Đã lưu mã QR vào danh sách lưu tạm offline!');
    }

    function renderHistory() {
      const listEl = document.getElementById('historyList');
      if (!listEl) return;
      if (offlineHistory.length === 0) {
        listEl.innerHTML = '<div style="font-size:11px; color:#94a3b8; font-style:italic; text-align:center;">Chưa có mã nào được lưu offline</div>';
        return;
      }
      let html = '';
      offlineHistory.slice(0, 5).forEach(item => {
        html += \`<div class="history-item">
          <span class="history-item-text">\${item.text}</span>
          <span style="font-size:10px; color:#64748b;">\${item.time}</span>
        </div>\`;
      });
      listEl.innerHTML = html;
    }

    window.onload = function() {
      generateQR();
    };
  </script>
</body>
</html>`;

  // Download the self-contained offline index-offline-qrcode.html file
  const blob = new Blob([standaloneHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'VietinBank-SocTrang-QR-Offline.html';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 10000);
}


// Full clean pure JavaScript QRCode generator for browser offline usage (Supports QR Versions 1 to 40)
function getEmbeddedQRCodeEngineCode(): string {
  return `
  (function(global) {
    function QRCodeEngine() {}

    var QRMode = { MODE_NUMBER: 1, MODE_ALPHA_NUM: 2, MODE_8BIT_BYTE: 4 };
    var QRErrorCorrectLevel = { L: 1, M: 0, Q: 3, H: 2 };

    function getLengthInBits(mode, typeNumber) {
      if (1 <= typeNumber && typeNumber < 10) {
        return mode === QRMode.MODE_8BIT_BYTE ? 8 : (mode === QRMode.MODE_ALPHA_NUM ? 9 : 10);
      } else if (typeNumber < 27) {
        return mode === QRMode.MODE_8BIT_BYTE ? 16 : (mode === QRMode.MODE_ALPHA_NUM ? 11 : 12);
      } else {
        return mode === QRMode.MODE_8BIT_BYTE ? 16 : (mode === QRMode.MODE_ALPHA_NUM ? 13 : 14);
      }
    }

    function QRPolynomial(num, shift) {
      if (num.length === undefined) throw new Error(num.length + "/" + shift);
      var offset = 0;
      while (offset < num.length && num[offset] === 0) offset++;
      this.num = new Array(num.length - offset + shift);
      for (var i = 0; i < num.length - offset; i++) this.num[i] = num[offset + i];
    }
    QRPolynomial.prototype = {
      get: function(index) { return this.num[index]; },
      getLength: function() { return this.num.length; },
      multiply: function(e) {
        var num = new Array(this.getLength() + e.getLength() - 1);
        for (var i = 0; i < num.length; i++) num[i] = 0;
        for (var i = 0; i < this.getLength(); i++) {
          for (var j = 0; j < e.getLength(); j++) {
            num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
          }
        }
        return new QRPolynomial(num, 0);
      },
      mod: function(e) {
        if (this.getLength() - e.getLength() < 0) return this;
        var ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
        var num = new Array(this.getLength());
        for (var i = 0; i < this.getLength(); i++) num[i] = this.get(i);
        for (var i = 0; i < e.getLength(); i++) {
          num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
        }
        return new QRPolynomial(num, 0).mod(e);
      }
    };

    var QRMath = {
      glog: function(n) {
        if (n < 1) throw new Error("glog(" + n + ")");
        return QRMath.LOG_TABLE[n];
      },
      gexp: function(n) {
        while (n < 0) n += 255;
        while (n >= 256) n -= 255;
        return QRMath.EXP_TABLE[n];
      },
      EXP_TABLE: new Array(256),
      LOG_TABLE: new Array(256)
    };
    for (var i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
    for (var i = 8; i < 256; i++) {
      QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4] ^ QRMath.EXP_TABLE[i - 5] ^ QRMath.EXP_TABLE[i - 6] ^ QRMath.EXP_TABLE[i - 8];
    }
    for (var i = 0; i < 255; i++) QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;

    var QRRSBlock = {
      RS_BLOCK_TABLE: [
        [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
        [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
        [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
        [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
        [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],
        [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],
        [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14],
        [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15],
        [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13],
        [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16],
        [4, 101, 81], [1, 80, 50, 4, 81, 51], [4, 50, 22, 4, 51, 23], [3, 36, 12, 8, 37, 13],
        [2, 116, 92, 2, 117, 93], [6, 58, 36, 2, 59, 37], [4, 46, 20, 6, 47, 21], [7, 42, 14, 4, 43, 15],
        [4, 133, 107], [8, 59, 37, 1, 60, 38], [8, 44, 20, 4, 45, 21], [12, 33, 11, 4, 34, 12],
        [3, 145, 115, 1, 146, 116], [4, 64, 40, 5, 65, 41], [11, 36, 16, 5, 37, 17], [11, 36, 12, 5, 37, 13],
        [5, 109, 87, 1, 110, 88], [5, 65, 41, 5, 66, 42], [5, 54, 24, 7, 55, 25], [11, 36, 12, 7, 37, 13],
        [5, 122, 98, 1, 123, 99], [7, 73, 45, 3, 74, 46], [15, 43, 19, 2, 44, 20], [3, 45, 15, 13, 46, 16],
        [1, 135, 107, 5, 136, 108], [10, 74, 46, 1, 75, 47], [1, 50, 22, 15, 51, 23], [2, 42, 14, 17, 43, 15],
        [5, 150, 120, 1, 151, 121], [9, 69, 43, 4, 70, 44], [17, 50, 22, 1, 51, 23], [2, 42, 14, 19, 43, 15],
        [3, 141, 113, 4, 142, 114], [3, 70, 44, 11, 71, 45], [17, 47, 21, 4, 48, 22], [9, 39, 13, 16, 40, 14],
        [3, 135, 107, 5, 136, 108], [3, 67, 41, 13, 68, 42], [15, 54, 24, 5, 55, 25], [15, 43, 15, 10, 44, 16],
        [4, 144, 116, 4, 145, 117], [17, 68, 42], [17, 50, 22, 6, 51, 23], [19, 46, 16, 6, 47, 17],
        [2, 139, 111, 7, 140, 112], [17, 74, 46], [7, 54, 24, 16, 55, 25], [34, 37, 13],
        [4, 151, 121, 5, 152, 122], [4, 75, 47, 14, 76, 48], [11, 54, 24, 14, 55, 25], [16, 45, 15, 14, 46, 16],
        [6, 147, 117, 4, 148, 118], [6, 73, 45, 14, 74, 46], [11, 54, 24, 16, 55, 25], [30, 46, 16, 2, 47, 17],
        [8, 132, 106, 4, 133, 107], [8, 75, 47, 13, 76, 48], [7, 54, 24, 22, 55, 25], [22, 45, 15, 13, 46, 16],
        [10, 142, 114, 2, 143, 115], [19, 74, 46, 4, 75, 47], [28, 50, 22, 6, 51, 23], [33, 46, 16, 4, 47, 17],
        [8, 152, 122, 4, 153, 123], [22, 73, 45, 3, 74, 46], [8, 53, 23, 26, 54, 24], [12, 45, 15, 28, 46, 16],
        [3, 147, 117, 10, 148, 118], [3, 73, 45, 23, 74, 46], [4, 54, 24, 31, 55, 25], [11, 45, 15, 31, 46, 16],
        [7, 146, 116, 7, 147, 117], [21, 73, 45, 7, 74, 46], [1, 53, 23, 37, 54, 24], [19, 45, 15, 26, 46, 16],
        [5, 145, 115, 10, 146, 116], [19, 75, 47, 10, 76, 48], [15, 54, 24, 25, 55, 25], [23, 45, 15, 25, 46, 16],
        [13, 145, 115, 3, 146, 116], [2, 74, 46, 29, 75, 47], [42, 54, 24, 1, 55, 25], [23, 45, 15, 28, 46, 16],
        [17, 145, 115], [10, 74, 46, 23, 75, 47], [10, 54, 24, 35, 55, 25], [19, 45, 15, 35, 46, 16],
        [17, 145, 115, 1, 146, 116], [14, 74, 46, 21, 75, 47], [29, 54, 24, 19, 55, 25], [11, 45, 15, 46, 46, 16],
        [13, 145, 115, 6, 146, 116], [14, 74, 46, 23, 75, 47], [44, 54, 24, 7, 55, 25], [59, 46, 16, 1, 47, 17],
        [12, 151, 121, 7, 152, 122], [12, 75, 47, 26, 76, 48], [39, 54, 24, 14, 55, 25], [22, 45, 15, 41, 46, 16],
        [6, 151, 121, 14, 152, 122], [6, 75, 47, 34, 76, 48], [46, 54, 24, 10, 55, 25], [2, 45, 15, 64, 46, 16],
        [17, 152, 122, 4, 153, 123], [29, 74, 46, 14, 75, 47], [49, 54, 24, 10, 55, 25], [24, 45, 15, 46, 46, 16],
        [4, 152, 122, 18, 153, 123], [13, 74, 46, 32, 75, 47], [48, 54, 24, 14, 55, 25], [42, 45, 15, 32, 46, 16],
        [20, 147, 117, 4, 148, 118], [40, 75, 47, 7, 76, 48], [43, 54, 24, 22, 55, 25], [10, 45, 15, 67, 46, 16],
        [19, 148, 118, 6, 149, 119], [18, 75, 47, 31, 76, 48], [34, 54, 24, 34, 55, 25], [20, 45, 15, 61, 46, 16]
      ],
      getRSBlocks: function(typeNumber, errorCorrectLevel) {
        var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
        if (rsBlock === undefined) throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
        var length = rsBlock.length / 3;
        var list = [];
        for (var i = 0; i < length; i++) {
          var count = rsBlock[i * 3 + 0];
          var totalCount = rsBlock[i * 3 + 1];
          var dataCount = rsBlock[i * 3 + 2];
          for (var j = 0; j < count; j++) list.push({ totalCount: totalCount, dataCount: dataCount });
        }
        return list;
      },
      getRsBlockTable: function(typeNumber, errorCorrectLevel) {
        switch (errorCorrectLevel) {
          case QRErrorCorrectLevel.L: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
          case QRErrorCorrectLevel.M: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
          case QRErrorCorrectLevel.Q: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
          case QRErrorCorrectLevel.H: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
          default: return undefined;
        }
      }
    };

    function QRBitBuffer() {
      this.buffer = [];
      this.length = 0;
    }
    QRBitBuffer.prototype = {
      get: function(index) { return ((this.buffer[Math.floor(index / 8)] >>> (7 - index % 8)) & 1) == 1; },
      put: function(num, length) {
        for (var i = 0; i < length; i++) this.putBit(((num >>> (length - i - 1)) & 1) == 1);
      },
      putBit: function(bit) {
        var bufIndex = Math.floor(this.length / 8);
        if (this.buffer.length <= bufIndex) this.buffer.push(0);
        if (bit) this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
        this.length++;
      }
    };

    function QRCodeModel(typeNumber, errorCorrectLevel) {
      this.typeNumber = typeNumber;
      this.errorCorrectLevel = errorCorrectLevel;
      this.modules = null;
      this.moduleCount = 0;
      this.dataCache = null;
      this.dataList = [];
    }
    QRCodeModel.prototype = {
      addData: function(data) {
        this.dataList.push(new QR8bitByte(data));
        this.dataCache = null;
      },
      isDark: function(row, col) {
        if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
          throw new Error(row + "," + col);
        }
        return this.modules[row][col];
      },
      getModuleCount: function() { return this.moduleCount; },
      make: function() {
        if (this.typeNumber < 1) {
          var typeNumber = 1;
          for (typeNumber = 1; typeNumber <= 40; typeNumber++) {
            var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);
            var buffer = new QRBitBuffer();
            var totalDataCount = 0;
            for (var i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
            for (var i = 0; i < this.dataList.length; i++) {
              var data = this.dataList[i];
              buffer.put(data.mode, 4);
              buffer.put(data.getLength(), getLengthInBits(data.mode, typeNumber));
              data.write(buffer);
            }
            if (buffer.length <= totalDataCount * 8) break;
          }
          this.typeNumber = typeNumber;
        }
        this.makeImpl(false, this.getBestMaskPattern());
      },
      makeImpl: function(test, maskPattern) {
        this.moduleCount = this.typeNumber * 4 + 17;
        this.modules = new Array(this.moduleCount);
        for (var row = 0; row < this.moduleCount; row++) {
          this.modules[row] = new Array(this.moduleCount);
          for (var col = 0; col < this.moduleCount; col++) this.modules[row][col] = null;
        }
        this.setupPositionProbePattern(0, 0);
        this.setupPositionProbePattern(this.moduleCount - 7, 0);
        this.setupPositionProbePattern(0, this.moduleCount - 7);
        this.setupPositionAdjustPattern();
        this.setupTimingPattern();
        this.setupTypeInfo(test, maskPattern);
        if (this.typeNumber >= 7) this.setupTypeNumber(test);
        if (this.dataCache == null) {
          this.dataCache = QRCodeModel.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
        }
        this.mapData(this.dataCache, maskPattern);
      },
      setupPositionProbePattern: function(row, col) {
        for (var r = -1; r <= 7; r++) {
          if (row + r <= -1 || this.moduleCount <= row + r) continue;
          for (var c = -1; c <= 7; c++) {
            if (col + c <= -1 || this.moduleCount <= col + c) continue;
            if ((0 <= r && r <= 6 && (c == 0 || c == 6)) ||
                (0 <= c && c <= 6 && (r == 0 || r == 6)) ||
                (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
              this.modules[row + r][col + c] = true;
            } else {
              this.modules[row + r][col + c] = false;
            }
          }
        }
      },
      getBestMaskPattern: function() {
        var minPenalty = 0;
        var bestMaskPattern = 0;
        for (var i = 0; i < 8; i++) {
          this.makeImpl(true, i);
          var penalty = QRUtil.getLostPoint(this);
          if (i == 0 || minPenalty > penalty) {
            minPenalty = penalty;
            bestMaskPattern = i;
          }
        }
        return bestMaskPattern;
      },
      setupTimingPattern: function() {
        for (var r = 8; r < this.moduleCount - 8; r++) {
          if (this.modules[r][6] != null) continue;
          this.modules[r][6] = (r % 2 == 0);
        }
        for (var c = 8; c < this.moduleCount - 8; c++) {
          if (this.modules[6][c] != null) continue;
          this.modules[6][c] = (c % 2 == 0);
        }
      },
      setupPositionAdjustPattern: function() {
        var pos = QRUtil.getPatternPosition(this.typeNumber);
        for (var i = 0; i < pos.length; i++) {
          for (var j = 0; j < pos.length; j++) {
            var row = pos[i];
            var col = pos[j];
            if (this.modules[row][col] != null) continue;
            for (var r = -2; r <= 2; r++) {
              for (var c = -2; c <= 2; c++) {
                if (r == -2 || r == 2 || c == -2 || c == 2 || (r == 0 && c == 0)) {
                  this.modules[row + r][col + c] = true;
                } else {
                  this.modules[row + r][col + c] = false;
                }
              }
            }
          }
        }
      },
      setupTypeNumber: function(test) {
        var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
        for (var i = 0; i < 18; i++) {
          var mod = (!test && ((bits >> i) & 1) == 1);
          this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
          this.modules[i % 3 + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
        }
      },
      setupTypeInfo: function(test, maskPattern) {
        var data = (this.errorCorrectLevel << 3) | maskPattern;
        var bits = QRUtil.getBCHTypeInfo(data);
        for (var i = 0; i < 15; i++) {
          var mod = (!test && ((bits >> i) & 1) == 1);
          if (i < 6) this.modules[i][8] = mod;
          else if (i < 8) this.modules[i + 1][8] = mod;
          else this.modules[this.moduleCount - 15 + i][8] = mod;

          if (i < 8) this.modules[8][this.moduleCount - i - 1] = mod;
          else if (i < 9) this.modules[8][15 - i - 1 + 1] = mod;
          else this.modules[8][15 - i - 1] = mod;
        }
        this.modules[this.moduleCount - 8][8] = (!test);
      },
      mapData: function(data, maskPattern) {
        var inc = -1;
        var row = this.moduleCount - 1;
        var bitIndex = 7;
        var byteIndex = 0;
        for (var col = this.moduleCount - 1; col > 0; col -= 2) {
          if (col == 6) col--;
          while (true) {
            for (var c = 0; c < 2; c++) {
              if (this.modules[row][col - c] == null) {
                var dark = false;
                if (byteIndex < data.length) {
                  dark = (((data[byteIndex] >>> bitIndex) & 1) == 1);
                }
                var mask = QRUtil.getMask(maskPattern, row, col - c);
                if (mask) dark = !dark;
                this.modules[row][col - c] = dark;
                bitIndex--;
                if (bitIndex == -1) { byteIndex++; bitIndex = 7; }
              }
            }
            row += inc;
            if (row < 0 || this.moduleCount <= row) {
              row -= inc;
              inc = -inc;
              break;
            }
          }
        }
      }
    };

    QRCodeModel.createData = function(typeNumber, errorCorrectLevel, dataList) {
      var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
      var buffer = new QRBitBuffer();
      for (var i = 0; i < dataList.length; i++) {
        var data = dataList[i];
        buffer.put(data.mode, 4);
        buffer.put(data.getLength(), getLengthInBits(data.mode, typeNumber));
        data.write(buffer);
      }
      var totalDataCount = 0;
      for (var i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
      if (buffer.length > totalDataCount * 8) throw new Error("Thẻ mã QR bị quá tải nội dung (" + buffer.length + " bits > " + (totalDataCount * 8) + " bits max)");
      if (buffer.length + 4 <= totalDataCount * 8) buffer.put(0, 4);
      while (buffer.length % 8 != 0) buffer.putBit(false);
      while (true) {
        if (buffer.length >= totalDataCount * 8) break;
        buffer.put(0xec, 8);
        if (buffer.length >= totalDataCount * 8) break;
        buffer.put(0x11, 8);
      }
      return QRCodeModel.createBytes(buffer, rsBlocks);
    };

    QRCodeModel.createBytes = function(buffer, rsBlocks) {
      var offset = 0;
      var maxDcCount = 0;
      var maxEcCount = 0;
      var dcdata = new Array(rsBlocks.length);
      var ecdata = new Array(rsBlocks.length);
      for (var r = 0; r < rsBlocks.length; r++) {
        var dcCount = rsBlocks[r].dataCount;
        var ecCount = rsBlocks[r].totalCount - dcCount;
        maxDcCount = Math.max(maxDcCount, dcCount);
        maxEcCount = Math.max(maxEcCount, ecCount);
        dcdata[r] = new Array(dcCount);
        for (var i = 0; i < dcdata[r].length; i++) {
          dcdata[r][i] = 0xff & buffer.buffer[i + offset];
        }
        offset += dcCount;
        var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
        var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
        var modPoly = rawPoly.mod(rsPoly);
        ecdata[r] = new Array(rsPoly.getLength() - 1);
        for (var i = 0; i < ecdata[r].length; i++) {
          var modIndex = i + modPoly.getLength() - ecdata[r].length;
          ecdata[r][i] = (modIndex >= 0) ? modPoly.get(modIndex) : 0;
        }
      }
      var totalCodeCount = 0;
      for (var i = 0; i < rsBlocks.length; i++) totalCodeCount += rsBlocks[i].totalCount;
      var data = new Array(totalCodeCount);
      var index = 0;
      for (var i = 0; i < maxDcCount; i++) {
        for (var r = 0; r < rsBlocks.length; r++) {
          if (i < dcdata[r].length) data[index++] = dcdata[r][i];
        }
      }
      for (var i = 0; i < maxEcCount; i++) {
        for (var r = 0; r < rsBlocks.length; r++) {
          if (i < ecdata[r].length) data[index++] = ecdata[r][i];
        }
      }
      return data;
    };

    function QR8bitByte(data) {
      this.mode = QRMode.MODE_8BIT_BYTE;
      this.data = data;
    }
    QR8bitByte.prototype = {
      getLength: function() {
        return new TextEncoder().encode(this.data).length;
      },
      write: function(buffer) {
        var bytes = new TextEncoder().encode(this.data);
        for (var i = 0; i < bytes.length; i++) buffer.put(bytes[i], 8);
      }
    };

    var QRUtil = {
      PATTERN_POSITION_TABLE: [
        [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
        [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54],
        [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74],
        [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90], [6, 28, 50, 72, 94],
        [6, 26, 50, 74, 98], [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114],
        [6, 34, 62, 90, 118], [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134],
        [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154],
        [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170]
      ],
      G15: (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
      G18: (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
      G15_MASK: (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1),
      getBCHTypeInfo: function(data) {
        var d = data << 10;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
          d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15)));
        }
        return ((data << 10) | d) ^ QRUtil.G15_MASK;
      },
      getBCHTypeNumber: function(data) {
        var d = data << 12;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
          d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18)));
        }
        return (data << 12) | d;
      },
      getBCHDigit: function(data) {
        var digit = 0;
        while (data != 0) { digit++; data >>>= 1; }
        return digit;
      },
      getPatternPosition: function(typeNumber) {
        return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1] || [];
      },
      getMask: function(maskPattern, i, j) {
        switch (maskPattern) {
          case 0: return (i + j) % 2 == 0;
          case 1: return i % 2 == 0;
          case 2: return j % 3 == 0;
          case 3: return (i + j) % 3 == 0;
          case 4: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;
          case 5: return (i * j) % 2 + (i * j) % 3 == 0;
          case 6: return ((i * j) % 2 + (i * j) % 3) % 2 == 0;
          case 7: return ((i * j) % 3 + (i + j) % 2) % 2 == 0;
          default: return false;
        }
      },
      getErrorCorrectPolynomial: function(errorCorrectLength) {
        var a = new QRPolynomial([1], 0);
        for (var i = 0; i < errorCorrectLength; i++) {
          a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
        }
        return a;
      },
      getLostPoint: function(qrCode) {
        var moduleCount = qrCode.getModuleCount();
        var lostPoint = 0;
        for (var row = 0; row < moduleCount; row++) {
          for (var col = 0; col < moduleCount; col++) {
            var sameCount = 0;
            var dark = qrCode.isDark(row, col);
            for (var r = -1; r <= 1; r++) {
              if (row + r < 0 || moduleCount <= row + r) continue;
              for (var c = -1; c <= 1; c++) {
                if (col + c < 0 || moduleCount <= col + c) continue;
                if (r == 0 && c == 0) continue;
                if (dark == qrCode.isDark(row + r, col + c)) sameCount++;
              }
            }
            if (sameCount > 5) lostPoint += (3 + sameCount - 5);
          }
        }
        return lostPoint;
      }
    };

    // Global Public API matching window.QRCode.toCanvas
    global.QRCode = {
      toCanvas: function(canvas, text, options, callback) {
        try {
          if (!canvas) throw new Error("Canvas element is null");
          if (!text) throw new Error("No text provided");
          options = options || {};
          var width = options.width || 300;
          var margin = options.margin !== undefined ? options.margin : 2;
          var darkColor = (options.color && options.color.dark) ? options.color.dark : "#000000";
          var lightColor = (options.color && options.color.light) ? options.color.light : "#ffffff";

          var charCount = text.length;
          var ecl = charCount > 150 ? QRErrorCorrectLevel.Q : QRErrorCorrectLevel.M;

          var qr = new QRCodeModel(0, ecl);
          qr.addData(text);
          qr.make();

          var moduleCount = qr.getModuleCount();
          var size = moduleCount + margin * 2;
          
          var renderWidth = width;
          canvas.width = renderWidth;
          canvas.height = renderWidth;

          var ctx = canvas.getContext("2d");
          ctx.fillStyle = lightColor;
          ctx.fillRect(0, 0, renderWidth, renderWidth);

          var cellSize = renderWidth / size;

          ctx.fillStyle = darkColor;
          for (var r = 0; r < moduleCount; r++) {
            for (var c = 0; c < moduleCount; c++) {
              if (qr.isDark(r, c)) {
                var x = Math.round((c + margin) * cellSize);
                var y = Math.round((r + margin) * cellSize);
                var w = Math.ceil((c + margin + 1) * cellSize) - x;
                var h = Math.ceil((r + margin + 1) * cellSize) - y;
                ctx.fillRect(x, y, w, h);
              }
            }
          }

          if (callback) callback(null);
        } catch (err) {
          if (callback) callback(err);
          else console.error("QRCode Generation Error:", err);
        }
      }
    };
  })(typeof window !== 'undefined' ? window : this);
  `;
}


