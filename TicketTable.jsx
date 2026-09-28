import { useEffect, useState } from 'react'
import { fmt, fmtBlank, dmy, num } from './calc'
import { Badge } from './ui'

const LX_KIND = { XV: 'blue', HL: 'violet', DG: 'amber', NQ: 'green', DC: 'red' }

export function BayBadge({ v }) {
  if (v === '') return null
  if (v === 'Da bay') return <Badge kind="muted">Đã bay</Badge>
  if (v === 'Sap bay') return <Badge kind="red">Sắp bay</Badge>
  return <Badge kind="plain">{v} ngày</Badge>
}

const ALL_COLS = {
  lx: { h: 'LX', c: (r) => <Badge kind={LX_KIND[r.lx]}>{r.lx}</Badge> },
  ngayXuat: { h: 'Ngày xuất', c: (r) => dmy(r.ngayXuat), cls: 'nowrap' },
  code: { h: 'Code vé', c: (r) => <b className="mono">{r.code}</b> },
  tenKhach: { h: 'Tên khách', c: (r) => r.tenKhach, cls: 'name' },
  pax: { h: 'NL/TE/EB', c: (r) => (r.lx === 'NQ' || r.lx === 'DC' ? '' : [r.nl, r.te, r.eb].map((x) => num(x)).join('/')), cls: 'center' },
  hang: { h: 'Hãng', c: (r) => r.hang },
  chuyenBay: { h: 'C.bay', c: (r) => r.chuyenBay, cls: 'mono' },
  ngayBay: { h: 'Ngày bay', c: (r) => dmy(r.ngayBay), cls: 'nowrap' },
  gioBay: { h: 'Giờ', c: (r) => r.gioBay },
  hanhTrinh: { h: 'Hành trình', c: (r) => (r.di || r.den ? `${r.di} → ${r.den}` : ''), cls: 'nowrap small' },
  giaNet: { h: 'Giá net', c: (r) => fmtBlank(r.giaNet), cls: 'num' },
  giaBan: { h: 'Giá bán', c: (r) => fmtBlank(r.giaBan), cls: 'num' },
  hanhLy: { h: 'Hành lý', c: (r) => fmtBlank(r.hanhLy), cls: 'num' },
  doiNgay: { h: 'Đổi giờ', c: (r) => fmtBlank(r.doiNgay), cls: 'num' },
  thanhTien: { h: 'Thành tiền', c: (r) => fmtBlank(r.thanhTien), cls: 'num strong' },
  hoaHong: { h: 'Hoa hồng', c: (r) => (r.hoaHong === null ? '' : fmt(r.hoaHong)), cls: (r) => 'num' + (r.hoaHong < 0 ? ' neg' : '') },
  ttVe: { h: 'TT vé', c: (r) => (r.ttVe === 'Chua xuat' ? <Badge kind="amber">Chưa xuất</Badge> : r.ttVe ? <Badge kind="muted">Đã xuất</Badge> : '') },
  thuTien: { h: 'Thu', c: (r) => (r.thuTien === 'C' ? <Badge kind="red">C</Badge> : r.thuTien === '1P' ? <Badge kind="amber">1P</Badge> : r.thuTien ? <Badge kind="green">R</Badge> : '') },
  phiDL: { h: 'Phí đại lý', c: (r) => fmtBlank(r.phiDL), cls: 'num' },
  nopQuy: { h: 'Nộp quỹ / ĐC', c: (r) => (r.lx === 'DC' ? <span title="Điều chỉnh chốt công nợ">ĐC {fmt(r.dieuChinh)}</span> : fmtBlank(r.nopQuy)), cls: (r) => 'num ' + (r.lx === 'DC' ? 'dc' : 'pos') },
  duNoQuy: { h: 'Dư nợ quỹ', c: (r) => fmt(r.duNoQuy), cls: (r) => 'num' + (r.duNoQuy < 0 ? ' neg' : '') },
  thanhToan: { h: 'Đã thu', c: (r) => fmtBlank(r.thanhToan), cls: 'num' },
  tienNo: { h: 'Còn nợ', c: (r) => fmtBlank(r.tienNo), cls: (r) => 'num' + (r.tienNo > 0 ? ' neg strong' : '') },
  bay: { h: 'Bay', c: (r) => <BayBadge v={r.bay} /> },
  nganHang: { h: 'Ngân hàng', c: (r) => r.nganHang },
  ghiChu: { h: 'Ghi chú', c: (r) => r.ghiChu, cls: 'note' },
}

export const PRESETS = {
  congno: ['lx', 'ngayXuat', 'code', 'tenKhach', 'pax', 'hang', 'chuyenBay', 'ngayBay', 'gioBay', 'hanhTrinh', 'giaNet', 'giaBan', 'hanhLy', 'doiNgay', 'thanhTien', 'hoaHong', 'ttVe', 'thuTien', 'phiDL', 'nopQuy', 'duNoQuy', 'bay', 'ghiChu'],
  tong: ['lx', 'ngayXuat', 'code', 'tenKhach', 'pax', 'hang', 'chuyenBay', 'ngayBay', 'gioBay', 'hanhTrinh', 'daiLy', 'giaNet', 'giaBan', 'hanhLy', 'doiNgay', 'thanhTien', 'hoaHong', 'ttVe', 'thuTien', 'phiDL', 'nopQuy', 'thanhToan', 'tienNo', 'nganHang', 'bay', 'ghiChu'],
  bay: ['code', 'tenKhach', 'pax', 'hang', 'chuyenBay', 'ngayBay', 'gioBay', 'hanhTrinh', 'ttVe', 'thuTien', 'tienNo', 'ghiChu'],
  no: ['ngayXuat', 'code', 'tenKhach', 'pax', 'hang', 'chuyenBay', 'ngayBay', 'hanhTrinh', 'thanhTien', 'thuTien', 'thanhToan', 'tienNo', 'ghiChu'],
}
ALL_COLS.daiLy = { h: 'Đại lý', c: (r) => r.daiLy }
ALL_COLS.hanGiuCho = { h: 'Giữ chỗ đến', c: (r) => r.hanGiuCho || '', cls: 'nowrap' }
PRESETS.giucho = ['ngayXuat', 'code', 'tenKhach', 'pax', 'hang', 'chuyenBay', 'ngayBay', 'hanhTrinh', 'giaNet', 'hanGiuCho', 'thuTien', 'ghiChu']

function Actions({ r, onAction }) {
  const [open, setOpen] = useState(null)
  useEffect(() => {
    if (!open) return
    const c = () => setOpen(null)
    setTimeout(() => { window.addEventListener('click', c); window.addEventListener('scroll', c, true); window.addEventListener('resize', c) }, 0)
    return () => { window.removeEventListener('click', c); window.removeEventListener('scroll', c, true); window.removeEventListener('resize', c) }
  }, [open])
  const toggle = (e) => {
    if (open) return setOpen(null)
    const b = e.currentTarget.getBoundingClientRect()
    const h = 44 + 34 * 7, below = window.innerHeight - b.bottom > h
    setOpen({ right: Math.max(8, window.innerWidth - b.right), ...(below ? { top: b.bottom + 4 } : { bottom: window.innerHeight - b.top + 4 }) })
  }
  const items = r.lx === 'NQ' || r.lx === 'DC'
    ? [['edit', 'Sửa'], ['delete', 'Xóa']]
    : [
        ['edit', 'Sửa'],
        r.ttVe === 'Chua xuat' && ['xuat', 'Xuất vé'],
        r.tienNo > 0 && ['thuno', 'Thu nợ'],
        ['hl', 'Thêm hành lý'],
        ['dg', 'Đổi ngày/giờ'],
        ['find', 'Xem cùng code'],
        ['delete', 'Xóa'],
      ].filter(Boolean)
  return (
    <div className="actions">
      <button className="icon-btn" aria-label="Thao tác" onClick={toggle}>⋯</button>
      {open && (
        <div className="menu" style={open}>
          {items.map(([k, l]) => (
            <button key={k} className={k === 'delete' ? 'danger' : ''} onClick={() => { setOpen(null); onAction(k, r) }}>{l}</button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TicketTable({ rows, preset = 'tong', onAction, pageSize = 100, footer, empty = 'Không có dữ liệu', startAtEnd }) {
  const cols = PRESETS[preset].map((k) => [k, ALL_COLS[k]])
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const [page, setPage] = useState(startAtEnd ? pages - 1 : 0)
  useEffect(() => { setPage(startAtEnd ? pages - 1 : 0) }, [rows.length, pages, startAtEnd])
  const p = Math.min(page, pages - 1)
  const view = rows.slice(p * pageSize, (p + 1) * pageSize)
  return (
    <div className="table-card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="sticky-l">#</th>
              {cols.map(([k, c]) => <th key={k} className={typeof c.cls === 'string' && c.cls.includes('num') ? 'num' : ''}>{c.h}</th>)}
              {onAction && <th className="sticky-r"></th>}
            </tr>
          </thead>
          <tbody>
            {view.map((r, i) => (
              <tr key={r.id} className={r.lx === 'NQ' ? 'row-nq' : r.ttVe === 'Chua xuat' ? 'row-pending' : ''}>
                <td className="sticky-l idx">{p * pageSize + i + 1}</td>
                {cols.map(([k, c]) => (
                  <td key={k} className={typeof c.cls === 'function' ? c.cls(r) : c.cls || ''}>{c.c(r)}</td>
                ))}
                {onAction && <td className="sticky-r"><Actions r={r} onAction={onAction} /></td>}
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={cols.length + 2} className="empty">{empty}</td></tr>}
          </tbody>
          {footer && <tfoot>{footer(cols)}</tfoot>}
        </table>
      </div>
      {pages > 1 && (
        <div className="pager">
          <button disabled={p === 0} onClick={() => setPage(0)}>«</button>
          <button disabled={p === 0} onClick={() => setPage(p - 1)}>‹</button>
          <span>Trang {p + 1}/{pages} · {rows.length} dòng</span>
          <button disabled={p >= pages - 1} onClick={() => setPage(p + 1)}>›</button>
          <button disabled={p >= pages - 1} onClick={() => setPage(pages - 1)}>»</button>
        </div>
      )}
    </div>
  )
}
