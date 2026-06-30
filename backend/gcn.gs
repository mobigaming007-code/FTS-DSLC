// ==========================================
// QUẢN LÝ GCN: TNV
// Cập nhật: tổng buổi dùng số buổi sau khi trừ ViPham.
// Admin GCN dùng admings.gs để tránh trùng hàm.
// ==========================================

function getGCNData(inputTNV) {
  const tnvInfo = getTNVInfo(inputTNV);
  if (!tnvInfo.maTNV)
    return { success: false, error: "Phiên đăng nhập hết hạn!" };

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const cleanMa = tnvInfo.maTNV.toUpperCase();
  const soBuoiCong = getSoBuoiCongGoc(inputTNV);
  const soBuoiTru = getSoBuoiTru(inputTNV);
  const tongBuoi = getTongBuoi(inputTNV);

  const sheetDot = ss.getSheetByName("CauHinhDot");
  let dotHienTai = null;
  if (sheetDot) {
    const dots = sheetDot.getDataRange().getValues();
    const now = new Date();
    for (let i = 1; i < dots.length; i++) {
      if (!dots[i][0]) continue;
      let start = new Date(dots[i][1]),
        end = new Date(dots[i][2]);
      end.setHours(23, 59, 59, 999);
      if (isGCNConfigHidden_(dots[i][4])) continue;
      if (now >= start && now <= end) {
        dotHienTai = {
          soDot: dots[i][0],
          tenDot: dots[i][3],
          ketThuc: Utilities.formatDate(end, "GMT+7", "dd/MM/yyyy"),
        };
        break;
      }
    }
  }

  const sheetYC = ss.getSheetByName("YeuCauGCN");
  let history = [];
  let typesLocked = new Set();
  if (sheetYC) {
    const ycs = sheetYC.getDataRange().getValues();
    for (let i = ycs.length - 1; i >= 1; i--) {
      let rMa = (ycs[i][2] || "").toString().trim().toUpperCase();
      if (rMa === cleanMa) {
        let status = (ycs[i][7] || "").toString().trim();
        let loaiGCN = (ycs[i][6] || "").toString().trim();
        let dotYC = (ycs[i][1] || "").toString().trim();
        history.push({
          dot: dotYC,
          ngayGui:
            ycs[i][4] instanceof Date
              ? Utilities.formatDate(ycs[i][4], "GMT+7", "dd/MM/yyyy")
              : ycs[i][4],
          tongBuoiLucGui: ycs[i][5],
          loai: loaiGCN,
          trangThai: status,
          ngayHenTra:
            ycs[i][8] instanceof Date
              ? Utilities.formatDate(ycs[i][8], "GMT+7", "dd/MM/yyyy")
              : ycs[i][8] || "",
          gcnUrl: ycs[i][9] || "",
        });
        if (dotHienTai && dotYC == dotHienTai.soDot && status !== "Từ chối")
          typesLocked.add(loaiGCN);
      }
    }
  }

  const sheetConfig = ss.getSheetByName("CauHinhGCN");
  let danhSachGCN = [];
  if (sheetConfig) {
    const rows = sheetConfig.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i][1]) continue;
      if (isGCNConfigHidden_(rows[i][5])) continue;
      let tenLoai = rows[i][1].toString().trim();
      let minBuoi = Number(rows[i][2] || 0);
      danhSachGCN.push({
        ma: rows[i][0] || "",
        ten: tenLoai,
        minBuoi: minBuoi,
        moTa: rows[i][3] || "",
        thuTu: Number(rows[i][4] || 9999),
        duDieuKien: tongBuoi >= minBuoi,
        daGui: typesLocked.has(tenLoai),
      });
    }
    danhSachGCN.sort(function (a, b) {
      return Number(a.thuTu || 9999) - Number(b.thuTu || 9999);
    });
  }

  return {
    success: true,
    data: {
      tongBuoi,
      soBuoiCong,
      soBuoiTru,
      danhSachGCN,
      dot: dotHienTai,
      history,
    },
  };
}

function submitYeuCauGCN(inputTNV, requestData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("YeuCauGCN");
  const tnvInfo = getTNVInfo(inputTNV);
  if (!tnvInfo.maTNV)
    return { success: false, error: "Không xác định được thông tin TNV!" };

  const tongBuoiHienTai = getTongBuoi(inputTNV); // Đã trừ ViPham
  const inputDot = (requestData.dot || "").toString().trim();
  const currentData = sheet.getDataRange().getValues();
  let itemsToSave = [];

  requestData.listLoaiGCN.forEach((loai) => {
    let loaiTrim = loai.trim();
    let isExist = currentData.some(
      (r) =>
        (r[2] || "").toString().toUpperCase() === tnvInfo.maTNV.toUpperCase() &&
        (r[1] || "").toString() === inputDot &&
        (r[6] || "").toString() === loaiTrim &&
        (r[7] || "").toString() !== "Từ chối",
    );
    if (!isExist) itemsToSave.push(loaiTrim);
  });

  if (itemsToSave.length === 0)
    return { success: false, error: "Đơn này đã tồn tại!" };

  const createdAt = new Date();
  const createdItems = [];
  itemsToSave.forEach((loai) => {
    const maYC = "YC-" + Math.floor(100000 + Math.random() * 900000);
    sheet.appendRow([
      maYC,
      inputDot,
      tnvInfo.maTNV,
      tnvInfo.hoTen,
      createdAt,
      tongBuoiHienTai,
      loai,
      "Chờ duyệt",
      "",
      "",
      "",
      "",
    ]);
    createdItems.push({
      maYC: maYC,
      dot: inputDot,
      ngayGui: Utilities.formatDate(createdAt, "GMT+7", "dd/MM/yyyy"),
      tongBuoiLucGui: tongBuoiHienTai,
      loai: loai,
      trangThai: "Chờ duyệt",
      ngayHenTra: "",
      gcnUrl: "",
    });
  });
  return { success: true, items: createdItems };
}

function normalizeGCNText_(value) {
  return (value === null || value === undefined ? "" : value)
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function isGCNConfigHidden_(status) {
  const value = normalizeGCNText_(status);
  if (!value) return false;
  return (
    [
      "an",
      "da an",
      "dung",
      "dong",
      "khoa",
      "da khoa",
      "ngung",
      "khong hoat dong",
      "inactive",
      "hidden",
    ].indexOf(value) >= 0
  );
}

function formatGCNAdminDate_(value) {
  if (!value) return "";
  if (
    Object.prototype.toString.call(value) === "[object Date]" &&
    !isNaN(value.getTime())
  ) {
    return Utilities.formatDate(value, "GMT+7", "yyyy-MM-dd");
  }
  return value.toString();
}

function ensureGCNConfigSheet_(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  const requiredCols = headers.length;
  const lastCol = sheet.getLastColumn();
  if (lastCol < requiredCols) {
    if (lastCol === 0) sheet.insertColumns(1, requiredCols);
    else sheet.insertColumnsAfter(lastCol, requiredCols - lastCol);
  }
  const existing = sheet.getRange(1, 1, 1, requiredCols).getValues()[0];
  let changed = false;
  for (let i = 0; i < requiredCols; i++) {
    if (!existing[i]) {
      existing[i] = headers[i];
      changed = true;
    }
  }
  if (changed || sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, requiredCols).setValues([existing]);
  }
  return sheet;
}

function readCauHinhLoaiGCN_(sheet) {
  const rows = sheet.getDataRange().getValues();
  const result = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0] && !rows[i][1]) continue;
    result.push({
      rowNumber: i + 1,
      maLoaiGCN: (rows[i][0] || "").toString(),
      tenLoaiGCN: (rows[i][1] || "").toString(),
      soBuoiToiThieu: Number(rows[i][2] || 0),
      moTa: (rows[i][3] || "").toString(),
      thuTu: Number(rows[i][4] || 0),
      trangThai: (rows[i][5] || "Hoat dong").toString(),
    });
  }
  result.sort(function (a, b) {
    return Number(a.thuTu || 9999) - Number(b.thuTu || 9999);
  });
  return result;
}

function readCauHinhDotGCN_(sheet) {
  const rows = sheet.getDataRange().getValues();
  const result = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0] && !rows[i][3]) continue;
    result.push({
      rowNumber: i + 1,
      soDot: (rows[i][0] || "").toString(),
      ngayBatDau: formatGCNAdminDate_(rows[i][1]),
      ngayKetThuc: formatGCNAdminDate_(rows[i][2]),
      tenDot: (rows[i][3] || "").toString(),
      trangThai: (rows[i][4] || "Hoat dong").toString(),
    });
  }
  result.sort(function (a, b) {
    return Number(a.soDot || 0) - Number(b.soDot || 0);
  });
  return result;
}

function getCauHinhGCNAdmin(requestData) {
  const auth = requireAdmin_(requestData || {}, "gcn");
  if (!auth.ok) return { success: false, error: auth.error };
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetLoai = ensureGCNConfigSheet_(ss, "CauHinhGCN", [
    "MaLoaiGCN",
    "TenLoaiGCN",
    "SoBuoiToiThieu",
    "MoTa",
    "ThuTu",
    "TrangThai",
  ]);
  const sheetDot = ensureGCNConfigSheet_(ss, "CauHinhDot", [
    "SoDot",
    "NgayBatDau",
    "NgayKetThuc",
    "TenDot",
    "TrangThai",
  ]);
  return {
    success: true,
    loaiGCN: readCauHinhLoaiGCN_(sheetLoai),
    dotGCN: readCauHinhDotGCN_(sheetDot),
  };
}

function findGCNConfigRowByKey_(sheet, column, key) {
  const cleanKey = (key || "").toString().trim().toLowerCase();
  if (!cleanKey) return 0;
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (
      (rows[i][column - 1] || "").toString().trim().toLowerCase() === cleanKey
    )
      return i + 1;
  }
  return 0;
}

function adminLuuCauHinhLoaiGCN(requestData) {
  const auth = requireAdmin_(requestData || {}, "cauhinhgcn");
  if (!auth.ok) return { success: false, error: auth.error };
  const maLoaiGCN = (requestData.maLoaiGCN || "").toString().trim();
  const tenLoaiGCN = (requestData.tenLoaiGCN || "").toString().trim();
  if (!maLoaiGCN || !tenLoaiGCN)
    return { success: false, error: "Can nhap MaLoaiGCN va TenLoaiGCN." };
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ensureGCNConfigSheet_(ss, "CauHinhGCN", [
    "MaLoaiGCN",
    "TenLoaiGCN",
    "SoBuoiToiThieu",
    "MoTa",
    "ThuTu",
    "TrangThai",
  ]);
  let rowNumber = Number(requestData.rowNumber || 0);
  if (!rowNumber) rowNumber = findGCNConfigRowByKey_(sheet, 1, maLoaiGCN);
  const values = [
    [
      maLoaiGCN,
      tenLoaiGCN,
      Number(requestData.soBuoiToiThieu || 0),
      (requestData.moTa || "").toString(),
      Number(requestData.thuTu || 0),
      (requestData.trangThai || "Hoat dong").toString(),
    ],
  ];
  if (rowNumber && rowNumber >= 2 && rowNumber <= sheet.getLastRow()) {
    sheet.getRange(rowNumber, 1, 1, 6).setValues(values);
  } else {
    sheet.appendRow(values[0]);
    rowNumber = sheet.getLastRow();
  }
  const item = {
    rowNumber: rowNumber,
    maLoaiGCN: values[0][0],
    tenLoaiGCN: values[0][1],
    soBuoiToiThieu: values[0][2],
    moTa: values[0][3],
    thuTu: values[0][4],
    trangThai: values[0][5],
  };
  return { success: true, message: "Da luu cau hinh loai GCN.", item: item };
}

function adminXoaCauHinhLoaiGCN(requestData) {
  const auth = requireAdmin_(requestData || {}, "cauhinhgcn");
  if (!auth.ok) return { success: false, error: auth.error };
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ensureGCNConfigSheet_(ss, "CauHinhGCN", [
    "MaLoaiGCN",
    "TenLoaiGCN",
    "SoBuoiToiThieu",
    "MoTa",
    "ThuTu",
    "TrangThai",
  ]);
  const rowNumber = Number(requestData.rowNumber || 0);
  if (rowNumber < 2 || rowNumber > sheet.getLastRow())
    return { success: false, error: "Dong cau hinh khong hop le." };
  sheet.deleteRow(rowNumber);
  return { success: true, message: "Da xoa loai GCN." };
}

function adminLuuCauHinhDotGCN(requestData) {
  const auth = requireAdmin_(requestData || {}, "cauhinhgcn");
  if (!auth.ok) return { success: false, error: auth.error };
  const soDot = (requestData.soDot || "").toString().trim();
  const tenDot = (requestData.tenDot || "").toString().trim();
  if (!soDot || !tenDot)
    return { success: false, error: "Can nhap SoDot va TenDot." };
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ensureGCNConfigSheet_(ss, "CauHinhDot", [
    "SoDot",
    "NgayBatDau",
    "NgayKetThuc",
    "TenDot",
    "TrangThai",
  ]);
  let rowNumber = Number(requestData.rowNumber || 0);
  if (!rowNumber) rowNumber = findGCNConfigRowByKey_(sheet, 1, soDot);
  const values = [
    [
      soDot,
      (requestData.ngayBatDau || "").toString(),
      (requestData.ngayKetThuc || "").toString(),
      tenDot,
      (requestData.trangThai || "Hoat dong").toString(),
    ],
  ];
  if (rowNumber && rowNumber >= 2 && rowNumber <= sheet.getLastRow()) {
    sheet.getRange(rowNumber, 1, 1, 5).setValues(values);
  } else {
    sheet.appendRow(values[0]);
    rowNumber = sheet.getLastRow();
  }
  const item = {
    rowNumber: rowNumber,
    soDot: values[0][0],
    ngayBatDau: values[0][1],
    ngayKetThuc: values[0][2],
    tenDot: values[0][3],
    trangThai: values[0][4],
  };
  return { success: true, message: "Đã lưu tiến trình thao tác.", item: item };
}

function adminXoaCauHinhDotGCN(requestData) {
  const auth = requireAdmin_(requestData || {}, "cauhinhgcn");
  if (!auth.ok) return { success: false, error: auth.error };
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ensureGCNConfigSheet_(ss, "CauHinhDot", [
    "SoDot",
    "NgayBatDau",
    "NgayKetThuc",
    "TenDot",
    "TrangThai",
  ]);
  const rowNumber = Number(requestData.rowNumber || 0);
  if (rowNumber < 2 || rowNumber > sheet.getLastRow())
    return { success: false, error: "Dong cau hinh khong hop le." };
  sheet.deleteRow(rowNumber);
  return { success: true, message: "Da xoa dot cap GCN." };
}
