import { useMemo, useState } from 'react'
import TicketTable from './TicketTable'
import { fmt, monthLabel, khop } from './calc'
import { exportRows } from './excel'

export function SoTong({ rows, settings, months, onAction, query, setQuery }) {
  const [thang, setThang] = useState('')
  const [lx, setLx] = useState('')
  const [hang, setHang] = useState('')
  const [thu, setThu] = useState('')
  const q = query.trim()
  const view = useMemo(() => rows.filter((r) =>
    (!thang || r.thang === thang) && (!lx || r.lx === lx) && (!hang || r.hang === hang) && (!thu || r.thuTien === thu) &&
    khop(r, q)
  ), [rows, thang, lx, hang, thu, q])
  return (
    <div className="page">
      <div className="toolbar wrap">
        <input className="search" placeholder="Tìm code vé, tên khách, chuyến bay, ghi chú…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={thang} onChange={(e) => setThang(e.target.value)}><option value="">Mọi tháng</option>{months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>
        <select value={lx} onChange={(e) => setLx(e.target.value)}><option value="">Mọi loại</option>{['XV', 'HL', 'DG', 'NQ', 'DC'].map((x) => <option key={x}>{x}</option>)}</select>
        <select value={hang} onChange={(e) => setHang(e.target.value)}><option value="">Mọi hãng</option>{settings.airlines.map((a) => <option key={a.ten}>{a.ten}</option>)}</select>
        <select value={thu} onChange={(e) => setThu(e.target.value)}><option value="">Thu tiền: tất cả</option><option value="R">R</option><option value="C">C</option><option value="1P">1P</option></select>
        <div className="spacer" />
        <button className="btn" onClick={() => exportRows(view, 'SoTong_VeMayBay.xlsx')}>Xuất Excel ({view.length})</button>
      </div>
      <TicketTable rows={view} preset="tong" onAction={onAction} startAtEnd={!q} />
    </div>
  )
}

export function ListPage({ title, desc, rows, preset, onAction, total }) {
  return (
    <div className="page">
      <div className="toolbar">
        <div><h2>{title}</h2><p className="muted">{desc}</p></div>
        <div className="spacer" />
        {total !== undefined && <div className="total-pill">Tổng: <b>{fmt(total)}</b></div>}
        <button className="btn" onClick={() => exportRows(rows, title.replace(/\s/g, '_') + '.xlsx')}>Xuất Excel</button>
      </div>
      <TicketTable rows={rows} preset={preset} onAction={onAction} />
    </div>
  )
}

