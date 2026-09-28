import { useMemo, useState } from 'react'
import TicketTable from './TicketTable'
import { congNo, fmt, monthLabel, num, todayISO, monthKey } from './calc'
import { exportRows } from './excel'

function Kpi({ label, value, sub, tone, onClick, big }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={'kpi' + (tone ? ' ' + tone : '') + (big ? ' big' : '') + (onClick ? ' click' : '')} onClick={onClick}>
      <span className="kpi-l">{label}</span>
      <span className="kpi-v">{value}</span>
      {sub && <span className="kpi-s">{sub}</span>}
    </Tag>
  )
}

export default function CongNo({ rows, settings, month, setMonth, months, onAction, goTab, onChot }) {
  const [lx, setLx] = useState('')
  const r = useMemo(() => congNo(rows, settings, month), [rows, settings, month])
  const detail = lx ? r.detail.filter((x) => x.lx === lx) : r.detail
  const dc = r.detail.filter((x) => x.lx === 'DC').pop()
  const lastDay = () => {
    const t = todayISO()
    if (monthKey(t) === month) return t
    const [y, m] = month.split('-').map(Number)
    return `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
  }
  const sum = (k) => detail.reduce((s, x) => s + num(x[k]), 0)

  return (
    <div className="page">
      <div className="toolbar">
        <label className="month-pick">
          <span>Tháng</span>
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </label>
        <div className="chips">
          {[['', 'Tất cả'], ['XV', 'Xuất vé'], ['HL', 'Hành lý'], ['DG', 'Đổi giờ'], ['NQ', 'Nộp quỹ'], ['DC', 'Điều chỉnh']].map(([v, l]) => (
            <button key={v} className={'chip' + (lx === v ? ' on' : '')} onClick={() => setLx(v)}>{l}</button>
          ))}
        </div>
        <div className="spacer" />
        <button className="btn" onClick={() => exportRows(r.detail, `CongNo_${monthLabel(month).replace(/\s/g, '')}.xlsx`, [
          ['CÔNG NỢ VÉ MÁY BAY', monthLabel(month)], ['Nợ cũ', r.noCu], ['Nộp quỹ', r.nopQuy], ['Xuất vé', r.xuatVe], ['Điều chỉnh', r.dieuChinh],
          ['Dư nợ', r.duNo], ['Chưa thu', r.chuaThu], ['Tổng vé', r.tongVe], ['Hoa hồng', r.hoaHong],
        ])}>Xuất Excel</button>
      </div>

      <div className="kpis">
        <Kpi big label={`Dư nợ quỹ ${settings.daiLyChinh} · ${monthLabel(month)}`} value={fmt(r.duNo)} tone={r.duNo < 0 ? 'neg' : 'pos'}
          sub={r.duNo < 0 ? 'Đang nợ đại lý' : 'Quỹ còn dư'} />
        <Kpi label="Nợ cũ (đầu tháng)" value={fmt(r.noCu)} tone={r.noCu < 0 ? 'neg' : ''} />
        <Kpi label="Nộp quỹ" value={fmt(r.nopQuy)} tone="pos" />
        <Kpi label="Xuất vé (phí đại lý)" value={fmt(r.xuatVe)} />
        <Kpi label="Điều chỉnh khi chốt" value={fmt(r.dieuChinh)} tone={r.dieuChinh ? 'warn' : ''} sub={dc ? 'Sửa số chốt →' : 'Chốt số dư với đại lý →'}
          onClick={() => onChot(dc ? null : { ngay: lastDay() }, dc)} />
        <Kpi label="Hoa hồng" value={fmt(r.hoaHong)} tone="pos" />
        <Kpi label="Tổng vé (NL + TE)" value={fmt(r.tongVe)} />
        <Kpi label="Khách chưa trả" value={fmt(r.chuaThu)} tone={r.chuaThu > 0 ? 'warn' : ''} onClick={() => goTab('no')} sub="Xem danh sách →" />
        <Kpi label="Vé chưa xuất" value={r.veChuaXuat} tone={r.veChuaXuat ? 'warn' : ''} onClick={() => goTab('chuaxuat')} sub="Xem →" />
        <Kpi label="Khách sắp bay" value={r.sapBay} tone={r.sapBay ? 'alert' : ''} onClick={() => goTab('sapbay')} sub="Hôm nay / ngày mai →" />
      </div>

      <TicketTable
        rows={detail}
        preset="congno"
        onAction={onAction}
        pageSize={1000}
        empty="Chưa có dòng nào trong tháng này"
        footer={(cols) => (
          <tr>
            <td className="sticky-l"></td>
            {cols.map(([k]) => {
              const v = { giaNet: sum('giaNet'), thanhTien: sum('thanhTien'), hoaHong: sum('hoaHong'), phiDL: sum('phiDL'), nopQuy: sum('nopQuy'), hanhLy: sum('hanhLy'), doiNgay: sum('doiNgay') }[k]
              return <td key={k} className="num">{k === 'tenKhach' ? <b>Tổng {detail.length} dòng</b> : v !== undefined ? <b>{fmt(v)}</b> : ''}</td>
            })}
            <td className="sticky-r"></td>
          </tr>
        )}
      />
    </div>
  )
}
