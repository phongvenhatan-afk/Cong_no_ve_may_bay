// ================================================================
// Logic tính toán — chuyển nguyên từ công thức sheet "TỔNG" và "Cong no"
// ================================================================

export const DEFAULT_SETTINGS = {
  // Số dư điều chỉnh đầu kỳ: Nợ cũ(tháng M) = soDuDauKy + Σ(Nộp quỹ − Xuất vé) các tháng trước M
  soDuDauKy: 0,
  daiLyChinh: 'PN', // đại lý tính phí xuất vé vào quỹ
  airlines: [
    // cach: 'khach' = Giá bán là giá/khách; 'tong' = Giá bán là tổng tiền
    // heSoTE: hệ số trẻ em; emBe: ≤ 1 là hệ số × giá bán, > 1 là số tiền cố định / em bé
    // phiKhach: phí đại lý cộng thêm / (NL + TE) ; tinhPhiDL: có tính vào quỹ đại lý không
    { ten: 'Vietjet', cach: 'khach', heSoTE: 1, emBe: 110000, phiKhach: 5000, tinhPhiDL: true },
    { ten: 'Vietnamairline', cach: 'khach', heSoTE: 0.9, emBe: 0.1, phiKhach: 0, tinhPhiDL: true },
    { ten: 'Bamboo', cach: 'khach', heSoTE: 0.85, emBe: 110000, phiKhach: 0, tinhPhiDL: true },
    { ten: 'VU', cach: 'khach', heSoTE: 1, emBe: 162000, phiKhach: 5000, tinhPhiDL: true },
    { ten: 'SUN PQ', cach: 'khach', heSoTE: 0.8, emBe: 0.1, phiKhach: 0, tinhPhiDL: true },
    { ten: 'Ve tau', cach: 'tong', heSoTE: 1, emBe: 1, phiKhach: 0, tinhPhiDL: false },
  ],
  places: ['HA NOI', 'HAI PHONG', 'THANH HOA', 'HO CHI MINH', 'VINH', 'HUE', 'DA NANG', 'PHU QUOC',
    'CHU LAI', 'QUANG NAM', 'DONG HOI', 'DIEN BIEN', 'PLEIKU', 'BUON ME THUOT', 'RACH GIA', 'CA MAU',
    'NHA TRANG', 'QUY NHON', 'DA LAT', 'CON DAO', 'TUY HOA', 'CAN THO', 'VAN DON', 'SINGAPORE', 'UC'],
  banks: ['BIDV', 'MB bank', 'Techcombank', 'Vietcombank'],
  daiLy: ['PN'],
  phongVe: ['NA'],
}

export const LOAI_XUAT = { XV: 'Xuất vé', HL: 'Hành lý', DG: 'Đổi giờ', NQ: 'Nộp quỹ', DC: 'Điều chỉnh' }
export const isMoneyOnly = (lx) => lx === 'NQ' || lx === 'DC'
export const THU_TIEN = { R: 'Đã thu', C: 'Chưa thu', '1P': 'Thu 1 phần' }

export const num = (v) => {
  if (v === null || v === undefined || v === '') return 0
  if (typeof v === 'number') return isFinite(v) ? v : 0
  const s = String(v).trim()
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s)
  // chuỗi tiền định dạng "1.234.000" hoặc "1,234,000"
  const neg = s.startsWith('-')
  const d = s.replace(/[^\d]/g, '')
  return d ? (neg ? -1 : 1) * Number(d) : 0
}

export const fmt = (v) => {
  const n = Math.round(num(v))
  return n === 0 ? '0' : n.toLocaleString('vi-VN')
}
export const fmtBlank = (v) => (num(v) === 0 ? '' : fmt(v))

// 'YYYY-MM-DD' -> 'dd/mm/yyyy'
export const dmy = (s) => {
  if (!s) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s
}
export const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// 'YYYY-MM' -> 'T09 - 2026'
export const monthLabel = (k) => (k ? `T${k.slice(5, 7)} - ${k.slice(0, 4)}` : '')
export const monthKey = (iso) => (iso ? iso.slice(0, 7) : '')

export function airlineOf(settings, ten) {
  return (settings.airlines || []).find((a) => a.ten === ten)
}

// Cột T — THÀNH TIỀN
export function thanhTien(t, settings) {
  const nl = num(t.nl), te = num(t.te), eb = num(t.eb)
  const gb = num(t.giaBan), hl = num(t.hanhLy), dg = num(t.doiNgay)
  if (t.lx === 'HL' || t.lx === 'DG') return hl + dg
  if (isMoneyOnly(t.lx)) return 0
  const a = airlineOf(settings, t.hang)
  if (!a || a.cach !== 'khach') return gb
  const ebPart = num(a.emBe) <= 1 ? num(a.emBe) * eb * gb : num(a.emBe) * eb
  return (nl + num(a.heSoTE) * te) * gb + ebPart + hl + dg
}

// Cột X — TỔNG PHÍ ĐẠI LÝ (trừ vào quỹ)
export function phiDaiLy(t, settings) {
  if (isMoneyOnly(t.lx)) return 0
  if ((t.daiLy || '') !== settings.daiLyChinh || t.ttVe === 'Chua xuat') return 0
  const a = airlineOf(settings, t.hang)
  if (a && a.tinhPhiDL === false) return 0
  const net = num(t.giaNet)
  if (t.lx === 'HL' || t.lx === 'DG') return net
  return net + (num(t.nl) + num(t.te)) * num(a ? a.phiKhach : 0)
}

// Cột AC — TÌNH TRẠNG BAY
export function trangThaiBay(t, today) {
  if (!t.code || !t.ngayBay || !/^\d{4}-\d{2}-\d{2}$/.test(t.ngayBay)) return ''
  const diff = Math.round((Date.parse(t.ngayBay) - Date.parse(today)) / 86400000)
  if (diff < 0) return 'Da bay'
  if (diff <= 1) return 'Sap bay'
  return diff
}

// Gắn các cột tính toán vào 1 dòng
export function enrich(t, settings, today) {
  const T = thanhTien(t, settings)
  const X = phiDaiLy(t, settings)
  let U = null
  if (!isMoneyOnly(t.lx) && t.ttVe !== 'Chua xuat') {
    U = (t.daiLy || '') !== settings.daiLyChinh ? T - num(t.giaNet) : T - X
  }
  return {
    ...t,
    thanhTien: T,
    phiDL: X,
    hoaHong: U,
    tienNo: T - num(t.thanhToan),
    thang: monthKey(t.ngayXuat),
    bay: trangThaiBay(t, today),
  }
}

export function sortRows(rows) {
  return [...rows].sort((a, b) =>
    (a.ngayXuat || '').localeCompare(b.ngayXuat || '') || num(a.stt) - num(b.stt))
}

// Biến động quỹ của 1 dòng: + nộp quỹ + điều chỉnh − phí đại lý (vé đã xuất)
export const quyDelta = (r) => num(r.nopQuy) + num(r.dieuChinh) - (r.ttVe === 'Da xuat' ? r.phiDL : 0)

// Số dư quỹ đến hết ngày `iso` (bao gồm ngày đó); strict=true: trước ngày đó
export function soDuDen(rows, settings, iso, strict) {
  let b = num(settings.soDuDauKy)
  for (const r of rows) {
    if (!r.ngayXuat) continue
    if (strict ? r.ngayXuat < iso : r.ngayXuat <= iso) b += quyDelta(r)
  }
  return b
}

// Khách còn nợ: mọi dòng vé có thành tiền lớn hơn số đã thu
export const conNo = (r) => !isMoneyOnly(r.lx) && r.tienNo > 0.5

// Sheet "Cong no" — tổng hợp theo tháng (ô B2)
export function congNo(rows, settings, month) {
  let noCu = num(settings.soDuDauKy)
  let nopQuy = 0, xuatVe = 0, tongVe = 0, hoaHong = 0, dieuChinh = 0
  const detail = []
  for (const r of rows) {
    if (!r.thang) continue
    if (r.thang < month) {
      noCu += quyDelta(r)
    } else if (r.thang === month) {
      detail.push(r)
      nopQuy += num(r.nopQuy)
      dieuChinh += num(r.dieuChinh)
      if (r.ttVe === 'Da xuat') xuatVe += r.phiDL
      tongVe += num(r.nl) + num(r.te)
      hoaHong += num(r.hoaHong)
    }
  }
  // Cột Z — DƯ NỢ QUỸ chạy lũy kế trong tháng
  let run = noCu
  const withRun = detail.map((r) => {
    run += quyDelta(r)
    return { ...r, duNoQuy: run }
  })
  let chuaThu = 0, veChuaXuat = 0, sapBay = 0
  for (const r of rows) {
    if (conNo(r)) chuaThu += r.tienNo
    if (r.ttVe === 'Chua xuat') veChuaXuat++
    if (r.bay === 'Sap bay') sapBay++
  }
  return { noCu, nopQuy, xuatVe, dieuChinh, duNo: noCu + nopQuy - xuatVe + dieuChinh, chuaThu, tongVe, hoaHong, veChuaXuat, sapBay, detail: withRun }
}

// ---- Tìm kiếm không dấu, không phân biệt thứ tự / ký tự ngăn cách ----
export const khongDau = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D')
export const chuanHoa = (s) => khongDau(s).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()
export function khop(r, q) {
  const toks = chuanHoa(q).split(' ').filter(Boolean)
  if (!toks.length) return true
  const hay = ' ' + chuanHoa([r.code, r.tenKhach, r.chuyenBay, r.ghiChu, r.thongTinVe].join(' ')) + ' '
  return toks.every((t) => hay.includes(t))
}

// Tính số tiền thanh toán theo lựa chọn "Thu tiền"
export function thanhToanTheo(thuTien, tongTien, daThu) {
  if (thuTien === 'R') return tongTien
  if (thuTien === '1P') return num(daThu)
  return 0
}
