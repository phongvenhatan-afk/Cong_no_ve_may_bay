// Đọc khối "Thông tin vé" dán từ tin nhắn / hệ thống đặt chỗ
import { khongDau, num } from './calc.js'

const pad = (n) => String(n).padStart(2, '0')
const TITLE_NL = ['MR', 'MRS', 'MS', 'ONG', 'BA', 'ANH', 'CHI']
const TITLE_TE = ['MSTR', 'MISS', 'CHD', 'CHILD']
const TITLE_EB = ['INF', 'INFANT']

// Bỏ danh xưng ở đầu/cuối tên, trả về { ten, loai: 'nl'|'te'|'eb' }
export function tachTen(line) {
  let w = khongDau(line).toUpperCase().replace(/[^A-Z\s/,]/g, ' ').replace(/[/,]/g, ' ').split(/\s+/).filter(Boolean)
  let loai = 'nl'
  const check = (t) => {
    if (TITLE_TE.includes(t)) { loai = 'te'; return true }
    if (TITLE_EB.includes(t)) { loai = 'eb'; return true }
    return TITLE_NL.includes(t)
  }
  while (w.length > 1 && check(w[0])) w = w.slice(1)
  while (w.length > 1 && check(w[w.length - 1])) w = w.slice(0, -1)
  return { ten: w.join(' '), loai }
}

// Tên địa danh -> tên trong danh mục (không dấu, viết hoa)
export function diaDanh(s, places = []) {
  let p = khongDau(s).toUpperCase().replace(/\bTP\.?\s*/g, '').replace(/THANH PHO\s*/g, '')
    .replace(/[^A-Z\s]/g, ' ').replace(/\s+/g, ' ').trim()
  if (/^(SAI GON|SGN|HCM)$/.test(p)) p = 'HO CHI MINH'
  const hit = places.find((x) => x === p) || places.find((x) => p.includes(x) || x.includes(p))
  return hit || p
}

function hangTu(ten, cb) {
  const s = khongDau(ten || '').toLowerCase()
  if (s.includes('vietjet')) return 'Vietjet'
  if (s.includes('bamboo')) return 'Bamboo'
  if (s.includes('vietravel')) return 'VU'
  if (s.includes('sun')) return 'SUN PQ'
  if (s.includes('vietnam')) return 'Vietnamairline'
  const pre = (cb || '').slice(0, 2).toUpperCase()
  return { VJ: 'Vietjet', VN: 'Vietnamairline', QH: 'Bamboo', VU: 'VU', '9G': 'SUN PQ' }[pre] || ''
}

// Trả về các trường đọc được; trường nào không có thì không có khóa đó
export function parseThongTinVe(text, places) {
  const out = {}
  if (!text || !text.trim()) return out
  const lines = khongDau(text).split(/\r?\n/).map((l) => l.trim())
  const val = (re) => { for (const l of lines) { const m = re.exec(l); if (m) return m } return null }

  // Code vé: 6 ký tự sau "Code:"
  let codeIdx = lines.findIndex((l) => /code[^:：]*[:：]\s*[A-Za-z0-9]{6}/i.test(l))
  if (codeIdx >= 0) out.code = /code[^:：]*[:：]\s*([A-Za-z0-9]{6})/i.exec(lines[codeIdx])[1].toUpperCase()
  else {
    const m = /^([A-Z0-9]{6})\b/.exec(lines.find(Boolean) || '')
    if (m) { out.code = m[1]; codeIdx = lines.findIndex(Boolean) }
  }

  // Tên khách: các dòng ngay sau dòng code, tới dòng "---" hoặc dòng có dấu ":"
  if (codeIdx >= 0) {
    const names = []
    let i = codeIdx + 1
    // tên nằm ngay trên cùng dòng code, sau code (vd "Code: ABC123 MR NGUYEN VAN A")
    const same = /code[^:：]*[:：]\s*[A-Za-z0-9]{6}\s*[-–]?\s*(.+)$/i.exec(lines[codeIdx])
    if (same && /[A-Za-z]{2}/.test(same[1])) names.push(same[1])
    for (; i < lines.length; i++) {
      const l = lines[i]
      if (!l) { if (names.length) break; else continue }
      if (/^[-–—_=]{2,}/.test(l) || /[:：]/.test(l)) break
      names.push(l)
    }
    const ts = names.map(tachTen).filter((t) => t.ten)
    if (ts.length) {
      out.tenKhach = ts.map((t) => t.ten).join(', ')
      out.nl = ts.filter((t) => t.loai === 'nl').length
      out.te = ts.filter((t) => t.loai === 'te').length
      out.eb = ts.filter((t) => t.loai === 'eb').length
    }
  }

  // Hành trình: có thể xuống dòng sau dấu "-"
  const hi = lines.findIndex((l) => /^hanh trinh\s*[:：]/i.test(l))
  if (hi >= 0) {
    let v = lines[hi].replace(/^hanh trinh\s*[:：]\s*/i, '')
    if (lines[hi + 1] && /^[-–>]/.test(lines[hi + 1])) v += ' ' + lines[hi + 1]
    else if (/[-–>]\s*$/.test(v) && lines[hi + 1]) v += ' ' + lines[hi + 1]
    const parts = v.split(/\s*(?:-|–|->|→)\s*/).map((x) => x.trim()).filter(Boolean)
    if (parts.length >= 2) { out.di = diaDanh(parts[0], places); out.den = diaDanh(parts[parts.length - 1], places) }
  }

  let m = val(/ngay\s*(?:di|bay|khoi hanh)\s*[:：]\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/i)
  if (m) out.ngayBay = `${m[3]}-${pad(m[2])}-${pad(m[1])}`
  m = val(/(?:thoi gian bay|gio bay|gio khoi hanh)\s*[:：]\s*(\d{1,2})[:h](\d{2})/i)
  if (m) out.gioBay = `${pad(m[1])}:${m[2]}`
  m = val(/(?:so hieu(?:\s*cb|\s*chuyen bay)?|chuyen bay)\s*[:：]\s*([A-Z0-9]{2}\s?\d{2,4})/i)
  if (m) out.chuyenBay = m[1].replace(/\s/g, '').toUpperCase()
  m = val(/hang hang khong\s*[:：]\s*(.+)/i)
  const hang = hangTu(m ? m[1] : '', out.chuyenBay)
  if (hang) out.hang = hang
  m = val(/^(?:tong(?:\s*tien)?|net|gia net)\s*[:：]?\s*([\d.,]+)/i)
  if (m) out.giaNet = num(m[1])
  m = val(/tinh trang\s*[:：]\s*(.+)/i)
  if (m) {
    const s = m[1].toLowerCase()
    if (s.includes('giu cho') || s.includes('hold')) out.ttVe = 'Chua xuat'
    else if (s.includes('xuat') || s.includes('ok') || s.includes('thanh toan')) out.ttVe = 'Da xuat'
  }
  m = val(/(?:thoi gian|han)\s*giu cho\s*[:：]\s*(.+)/i)
  if (m) out.hanGiuCho = m[1].trim()
  return out
}
