// Nhập dữ liệu từ file Excel cũ (sheet "TỔNG") và xuất Excel
import * as XLSX from 'xlsx'
import { num, thanhTien, sortRows, monthLabel, dmy, quyDelta, LOAI_XUAT, THU_TIEN } from './calc.js'

const pad = (n) => String(n).padStart(2, '0')

function toISODate(v) {
  if (v === null || v === undefined || v === '') return ''
  if (typeof v === 'number') {
    const d = (XLSX.SSF || XLSX.default.SSF).parse_date_code(v)
    return d ? `${d.y}-${pad(d.m)}-${pad(d.d)}` : ''
  }
  const s = String(v).trim()
  let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s)
  if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return s
}
function toTime(v) {
  if (v === null || v === undefined || v === '') return ''
  if (typeof v === 'number') {
    const mins = Math.round((v % 1) * 1440)
    return `${pad(Math.floor(mins / 60) % 24)}:${pad(mins % 60)}`
  }
  const m = /^(\d{1,2}):(\d{2})/.exec(String(v).trim())
  return m ? `${pad(m[1])}:${m[2]}` : String(v)
}
const str = (v) => (v === null || v === undefined ? '' : String(v).trim())
const val = (ws, addr) => ws[addr]?.v

// Trả về { rows, soDuDauKy|null, info }
export async function readLegacyWorkbook(file, settings) {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: false })
  const tongName = wb.SheetNames.find((n) => n.normalize('NFC').toUpperCase() === 'TỔNG'.normalize('NFC'))
    || wb.SheetNames.find((n) => /T.NG/i.test(n)) || wb.SheetNames[0]
  const ws = wb.Sheets[tongName]
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null })
  const rows = []
  for (let i = 1; i < aoa.length; i++) {
    const r = aoa[i]
    const lx = str(r[0]).toUpperCase()
    if (!lx) continue
    const t = {
      stt: i,
      lx,
      ngayXuat: toISODate(r[1]),
      code: str(r[2]),
      tenKhach: str(r[3]),
      nl: num(r[4]), te: num(r[5]), eb: num(r[6]),
      hang: str(r[7]),
      chuyenBay: str(r[8]),
      ngayBay: toISODate(r[9]),
      gioBay: toTime(r[10]),
      di: str(r[11]), den: str(r[12]),
      daiLy: str(r[13]), phongVe: str(r[14]),
      giaNet: num(r[15]), giaBan: num(r[16]), hanhLy: num(r[17]), doiNgay: num(r[18]),
      ttVe: str(r[21]),
      thuTien: str(r[22]).toUpperCase(),
      nopQuy: num(r[24]),
      nganHang: str(r[27]),
      ghiChu: str(r[31]),
    }
    // Giữ đúng số "Tiền nợ" (cột AE) như file cũ: thanhToan = Thành tiền − Tiền nợ
    const T = thanhTien(t, settings)
    const ae = r[30]
    t.thanhToan = typeof ae === 'number' ? T - ae : num(r[29])
    rows.push(t)
  }
  // Nợ cũ của tháng đang chọn trong sheet "Cong no" để tính số dư đầu kỳ
  let noCuRef = null
  const cn = wb.Sheets[wb.SheetNames.find((n) => /cong\s*no/i.test(n))]
  if (cn) {
    const b2 = str(val(cn, 'B2')), d3 = val(cn, 'D3')
    const m = /T(\d{1,2})\s*-\s*(\d{4})/.exec(b2)
    if (m && typeof d3 === 'number') noCuRef = { month: `${m[2]}-${pad(m[1])}`, noCu: d3 }
  }
  return { rows, noCuRef, sheet: tongName }
}

// Tính số dư đầu kỳ để Nợ cũ của tháng tham chiếu khớp với file Excel
export function calcSoDuDauKy(enrichedRows, ref) {
  let cum = 0
  for (const r of enrichedRows) {
    if (r.thang && r.thang < ref.month) cum += quyDelta(r)
  }
  return ref.noCu - cum
}

const COLS = [
  ['LX', (r) => r.lx], ['Ngày xuất', (r) => dmy(r.ngayXuat)], ['Code vé', (r) => r.code], ['Tên khách', (r) => r.tenKhach],
  ['NL', (r) => r.nl || ''], ['TE', (r) => r.te || ''], ['EB', (r) => r.eb || ''], ['Hãng bay', (r) => r.hang],
  ['Chuyến bay', (r) => r.chuyenBay], ['Ngày bay', (r) => dmy(r.ngayBay)], ['Giờ bay', (r) => r.gioBay],
  ['Hành trình đi', (r) => r.di], ['Hành trình đến', (r) => r.den], ['Đại lý', (r) => r.daiLy], ['Phòng vé', (r) => r.phongVe],
  ['Giá net', (r) => r.giaNet], ['Giá bán', (r) => r.giaBan], ['Hành lý', (r) => r.hanhLy], ['Đổi ngày/giờ', (r) => r.doiNgay],
  ['Thành tiền', (r) => r.thanhTien], ['Hoa hồng', (r) => r.hoaHong ?? ''], ['TT vé', (r) => r.ttVe], ['Thu tiền', (r) => r.thuTien],
  ['Tổng phí đại lý', (r) => r.phiDL], ['Nộp quỹ', (r) => r.nopQuy], ['Điều chỉnh', (r) => r.dieuChinh || ''], ['Tháng', (r) => monthLabel(r.thang)],
  ['Ngân hàng', (r) => r.nganHang], ['Tình trạng bay', (r) => r.bay], ['Thanh toán', (r) => r.thanhToan], ['Tiền nợ', (r) => r.tienNo],
  ['Ghi chú', (r) => r.ghiChu],
]

export function exportRows(rows, filename, extra) {
  const aoa = []
  if (extra) { extra.forEach((l) => aoa.push(l)); aoa.push([]) }
  const hasRun = rows.some((r) => r.duNoQuy !== undefined)
  aoa.push([...COLS.map((c) => c[0]), ...(hasRun ? ['Dư nợ quỹ'] : [])])
  sortRows(rows).forEach((r) => aoa.push([...COLS.map((c) => c[1](r)), ...(hasRun ? [r.duNoQuy] : [])]))
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Data')
  return saveWorkbook(wb, filename)
}

// Trên trang Claude (artifact) phải tải file qua capability "downloads"; chạy thường thì tải trực tiếp
export async function saveWorkbook(wb, filename) {
  const c = typeof window !== 'undefined' && window.claude
  if (c && typeof c.use === 'function') {
    const dl = await c.use('downloads')
    if (dl) {
      try { await dl.save({ filename, data: XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) }) } catch (e) { /* người dùng từ chối */ }
      return
    }
  }
  XLSX.writeFile(wb, filename)
}

export { LOAI_XUAT, THU_TIEN }

// ---- Bảng kê công nợ đại lý PN (Sổ chi tiết phải thu - phải trả, file .XLS) ----
const ddmmyyyy = (s) => { const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s || ''); return m ? `${m[3]}-${pad(m[2])}-${pad(m[1])}` : '' }
export function maTuMoTa(moTa, soCT) {
  const m = /^\s*([A-Z0-9]{6})(?:\*\d+)?\s*-/.exec(moTa || '')
  if (m) return m[1]
  const n = /^(?:VJA|VUA|QHA|VNA)([A-Z0-9]{6})/.exec(soCT || '')
  return n ? n[1] : ''
}

export async function readPNBalance(file) {
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null })
  const txt = (v) => (v === null || v === undefined ? '' : String(v))
  let from = '', to = '', noDK = null, noCK = null, hdr = -1
  aoa.forEach((r, i) => r.forEach((c) => {
    const s = txt(c)
    if (/from date/i.test(s)) from = ddmmyyyy(s)
    if (/to date/i.test(s)) to = ddmmyyyy(s)
    if (hdr < 0 && /Ngày CT/i.test(s)) hdr = i
  }))
  if (hdr < 0) throw new Error('Không thấy dòng tiêu đề "Ngày CT" — file không đúng mẫu sổ chi tiết công nợ')
  // Xác định cột theo tiêu đề (2 dòng tiêu đề)
  const h1 = aoa[hdr].map(txt), h2 = (aoa[hdr + 1] || []).map(txt)
  const col = (re, row, dflt) => { const i = row.findIndex((s) => re.test(s)); return i >= 0 ? i : dflt }
  const C = {
    ngay: col(/Ngày CT/i, h1, 1), soCT: col(/Số CT/i, h1, 2), route: col(/Hành trình/i, h1, 3), moTa: col(/Nội dung/i, h1, 4),
    loai: col(/Doc\.?\s*Type/i, h1, 6), no: col(/Nợ \(Debit\)|Debit/i, h2, 11), co: col(/Có \(Credit\)|Credit/i, h2, 12), du: col(/Công nợ|Balance/i, h1, 13),
  }
  const lines = []
  for (let i = hdr + 2; i < aoa.length; i++) {
    const r = aoa[i]
    const loai = txt(r[C.loai]).trim()
    if (typeof r[C.ngay] !== 'number' || !loai) continue
    if (loai === 'DK') { noDK = num(r[C.du]); continue }
    if (loai === 'CK') { noCK = num(r[C.du]); continue }
    const d = (XLSX.SSF || XLSX.default.SSF).parse_date_code(r[C.ngay])
    const moTa = txt(r[C.moTa]).trim(), soCT = txt(r[C.soCT]).trim()
    lines.push({
      ngay: `${d.y}-${pad(d.m)}-${pad(d.d)}`, soCT, route: txt(r[C.route]).trim(), moTa, loai,
      no: num(r[C.no]), co: num(r[C.co]), code: maTuMoTa(moTa, soCT),
    })
  }
  if (!to && lines.length) to = lines[lines.length - 1].ngay
  if (!from && lines.length) from = lines[0].ngay
  return { from, to, noDK, noCK, lines }
}
