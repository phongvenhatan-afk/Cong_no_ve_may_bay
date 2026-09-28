// Đối chiếu bảng kê PN với sổ, theo từng ngày
import { num, isMoneyOnly, soDuDen } from './calc.js'

const near = (a, b) => Math.abs(a - b) < 1

export function doiSoatTheoNgay(pn, rows, settings) {
  const { from, to } = pn
  const inRange = (d) => d && d >= from && d <= to
  const days = new Map()
  const day = (d) => {
    if (!days.has(d)) days.set(d, { ngay: d, pnNo: 0, pnCo: 0, soNo: 0, soCo: 0, pnLines: [], soRows: [] })
    return days.get(d)
  }
  for (const l of pn.lines) {
    if (!inRange(l.ngay)) continue
    const D = day(l.ngay); D.pnNo += l.no; D.pnCo += l.co; D.pnLines.push(l)
  }
  for (const r of rows) {
    if (!inRange(r.ngayXuat) || r.lx === 'DC') continue
    const no = r.ttVe === 'Da xuat' ? r.phiDL : 0, co = num(r.nopQuy)
    if (!no && !co) continue
    const D = day(r.ngayXuat); D.soNo += no; D.soCo += co; D.soRows.push(r)
  }
  const list = [...days.values()].sort((a, b) => a.ngay.localeCompare(b.ngay))
  for (const D of list) {
    D.lechNo = D.pnNo - D.soNo; D.lechCo = D.pnCo - D.soCo
    D.lech = !near(D.lechNo, 0) || !near(D.lechCo, 0)
    D.groups = ghep(D)
  }
  // Gợi ý: code chỉ có ở 1 bên nhưng xuất hiện ở ngày khác bên kia
  const onlyPN = new Map(), onlySo = new Map()
  for (const D of list) for (const g of D.groups) {
    if (!g.code) continue
    if (g.status === 'pn') onlyPN.set(g.code, D.ngay)
    if (g.status === 'so') onlySo.set(g.code, D.ngay)
  }
  for (const D of list) for (const g of D.groups) {
    if (g.status === 'pn' && onlySo.has(g.code)) g.goiY = `Sổ ghi ngày ${onlySo.get(g.code)}`
    if (g.status === 'so' && onlyPN.has(g.code)) g.goiY = `PN ghi ngày ${onlyPN.get(g.code)}`
  }
  // Không cùng code: thử tìm bên kia (ngày khác) có cùng số tiền
  const le = []
  for (const D of list) for (const g of D.groups) if ((g.status === 'pn' || g.status === 'so') && !g.goiY && !g.tt) le.push({ D, g })
  for (const a of le) {
    const b = le.find((x) => x !== a && x.g.status !== a.g.status && near(x.g.pn + x.g.so, a.g.pn + a.g.so))
    if (b) a.g.goiY = `Cùng số tiền với ${b.g.code || 'dòng'} ${b.g.status === 'so' ? 'trong sổ' : 'bên PN'} ngày ${b.D.ngay}`
  }
  const tong = list.reduce((t, D) => ({ pnNo: t.pnNo + D.pnNo, pnCo: t.pnCo + D.pnCo, soNo: t.soNo + D.soNo, soCo: t.soCo + D.soCo }), { pnNo: 0, pnCo: 0, soNo: 0, soCo: 0 })
  // Số dư: PN ghi dương = mình nợ; sổ ghi âm = mình nợ -> đổi dấu để so
  const soDK = -soDuDen(rows, settings, from, true)
  const soCK = -soDuDen(rows, settings, to, false)
  return { from, to, days: list, tong, pnDK: pn.noDK, pnCK: pn.noCK, soDK, soCK }
}

// Ghép từng dòng trong 1 ngày: theo code vé (cộng dồn nhiều khách), còn lại theo số tiền
function ghep(D) {
  const G = new Map()
  const g = (k) => { if (!G.has(k)) G.set(k, { code: k.startsWith('#') ? '' : k, key: k, pn: 0, so: 0, pnLines: [], soRows: [] }); return G.get(k) }
  D.pnLines.forEach((l, i) => {
    const k = l.co ? '#TT' : l.code || '#' + i
    const x = g(k); x.pn += l.no + l.co; x.pnLines.push(l)
  })
  D.soRows.forEach((r) => {
    const k = isMoneyOnly(r.lx) ? '#TT' : (r.code || '').toUpperCase() || '#s' + r.id
    const x = g(k); x.so += (r.ttVe === 'Da xuat' ? r.phiDL : 0) + num(r.nopQuy); x.soRows.push(r)
  })
  // Dòng PN không có code: ghép với nhóm sổ còn lẻ có cùng số tiền
  const lePN = [...G.values()].filter((x) => x.so === 0 && x.pn && x.key !== '#TT')
  const leSo = [...G.values()].filter((x) => x.pn === 0 && x.so && x.key !== '#TT')
  for (const a of lePN.filter((x) => !x.code)) {
    const b = leSo.find((y) => !y.used && near(y.so, a.pn))
    if (b) { b.used = true; b.pn = a.pn; b.pnLines = a.pnLines; G.delete(a.key) }
  }
  return [...G.values()].map((x) => {
    const diff = x.pn - x.so
    const status = near(diff, 0) ? 'ok' : !x.so ? 'pn' : !x.pn ? 'so' : 'lech'
    const m = x.pnLines[0]?.moTa || ''
    const parts = m.split(' - ')
    const ten = x.soRows[0]?.tenKhach || (parts.length >= 3 ? parts.slice(1, -1).join(' - ') : m).trim()
    return { ...x, diff, status, ten, tt: x.key === '#TT' }
  }).sort((a, b) => (a.status === 'ok') - (b.status === 'ok') || Math.abs(b.diff) - Math.abs(a.diff))
}
