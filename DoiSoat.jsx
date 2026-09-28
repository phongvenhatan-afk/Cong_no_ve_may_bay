import { Fragment, useMemo, useState } from 'react'
import { fmt, dmy } from './calc'
import { readPNBalance } from './excel'
import { doiSoatTheoNgay } from './doiSoatLogic'

const ST = {
  ok: ['green', 'Khớp'], lech: ['amber', 'Lệch tiền'], pn: ['red', 'Chỉ có ở PN'], so: ['violet', 'Chỉ có trong sổ'],
}
const Lech = ({ v }) => <span className={Math.abs(v) < 1 ? 'muted' : 'neg strong'}>{Math.abs(v) < 1 ? '—' : fmt(v)}</span>

function SoDu({ label, pn, so }) {
  const d = (pn ?? 0) - so
  return (
    <div className="kpi">
      <span className="kpi-l">{label}</span>
      <span className="kpi-v">{pn === null ? '—' : fmt(pn)}</span>
      <span className="kpi-s">Sổ: {fmt(so)} · {Math.abs(d) < 1 ? <b className="pos">khớp</b> : <b className="neg">lệch {fmt(d)}</b>}</span>
    </div>
  )
}

export default function DoiSoat({ rows, settings, onChot }) {
  const [pn, setPn] = useState(null)
  const [file, setFile] = useState('')
  const [err, setErr] = useState('')
  const [onlyLech, setOnlyLech] = useState(true)
  const [open, setOpen] = useState({})
  const res = useMemo(() => (pn ? doiSoatTheoNgay(pn, rows, settings) : null), [pn, rows, settings])

  async function pick(e) {
    const f = e.target.files[0]; e.target.value = ''
    if (!f) return
    try { setErr(''); const p = await readPNBalance(f); setPn(p); setFile(f.name); setOpen({}) } catch (x) { setErr(x.message); setPn(null) }
  }
  const days = res ? res.days.filter((D) => !onlyLech || D.lech) : []
  const nLech = res ? res.days.filter((D) => D.lech).length : 0
  const lechCK = res ? (res.pnCK ?? 0) - res.soCK : 0

  return (
    <div className="page">
      <div className="toolbar">
        <div>
          <h2>Đối soát công nợ đại lý PN</h2>
          <p className="muted">Chọn file “Sổ chi tiết phải thu – phải trả” (.XLS) PN gửi. Web so từng ngày: phát sinh nợ với phí đại lý trong sổ, thanh toán với nộp quỹ. Ngày nào lệch thì mở ra xem từng vé.</p>
        </div>
        <div className="spacer" />
        <label className="btn primary file">{pn ? 'Chọn file khác…' : 'Chọn file bảng kê PN…'}<input type="file" accept=".xls,.xlsx" hidden onChange={pick} /></label>
      </div>
      {err && <div className="banner">{err}</div>}

      {res && <>
        <p className="muted small">File {file} · từ {dmy(res.from)} đến {dmy(res.to)} · {pn.lines.length} dòng. Số dương = số mình còn nợ PN.</p>
        <div className="kpis">
          <SoDu label={`Nợ đầu kỳ ${dmy(res.from)}`} pn={res.pnDK} so={res.soDK} />
          <div className="kpi"><span className="kpi-l">Phát sinh nợ (PN)</span><span className="kpi-v">{fmt(res.tong.pnNo)}</span><span className="kpi-s">Sổ: {fmt(res.tong.soNo)} · <Lech v={res.tong.pnNo - res.tong.soNo} /></span></div>
          <div className="kpi"><span className="kpi-l">Thanh toán (PN)</span><span className="kpi-v">{fmt(res.tong.pnCo)}</span><span className="kpi-s">Sổ: {fmt(res.tong.soCo)} · <Lech v={res.tong.pnCo - res.tong.soCo} /></span></div>
          <SoDu label={`Nợ cuối kỳ ${dmy(res.to)}`} pn={res.pnCK} so={res.soCK} />
          <div className={'kpi' + (nLech ? ' alert' : '')}><span className="kpi-l">Số ngày lệch</span><span className="kpi-v">{nLech}/{res.days.length}</span>
            {res.pnCK !== null && Math.abs(lechCK) >= 1 && (
              <button className="btn small" onClick={() => onChot({ ngay: res.to, noDaiLy: res.pnCK })}>Chốt theo số PN…</button>
            )}
          </div>
        </div>

        <div className="toolbar">
          <label className="check"><input type="checkbox" checked={onlyLech} onChange={(e) => setOnlyLech(e.target.checked)} /> Chỉ hiện ngày lệch</label>
          <div className="spacer" />
          <button className="btn ghost small" onClick={() => setOpen(Object.fromEntries(days.map((D) => [D.ngay, true])))}>Mở tất cả</button>
          <button className="btn ghost small" onClick={() => setOpen({})}>Thu gọn</button>
        </div>

        <div className="table-card"><div className="table-wrap"><table className="ds">
          <thead><tr>
            <th>Ngày</th><th className="num">PN phát sinh nợ</th><th className="num">Sổ: phí đại lý</th><th className="num">Lệch</th>
            <th className="num">PN thanh toán</th><th className="num">Sổ: nộp quỹ</th><th className="num">Lệch</th><th></th>
          </tr></thead>
          <tbody>
            {days.map((D) => (
              <Fragment key={D.ngay}>
                <tr className={'day' + (D.lech ? ' bad' : '')} onClick={() => setOpen((o) => ({ ...o, [D.ngay]: !o[D.ngay] }))}>
                  <td className="nowrap"><span className="caret">{open[D.ngay] ? '▾' : '▸'}</span> <b>{dmy(D.ngay)}</b></td>
                  <td className="num">{fmt(D.pnNo)}</td><td className="num">{fmt(D.soNo)}</td><td className="num"><Lech v={D.lechNo} /></td>
                  <td className="num">{D.pnCo ? fmt(D.pnCo) : ''}</td><td className="num">{D.soCo ? fmt(D.soCo) : ''}</td><td className="num"><Lech v={D.lechCo} /></td>
                  <td>{D.lech ? <span className="badge red">Lệch</span> : <span className="badge green">Khớp</span>}</td>
                </tr>
                {open[D.ngay] && (
                  <tr className="detail"><td colSpan="8">
                    <table className="inner">
                      <thead><tr><th>Trạng thái</th><th>Code / chứng từ</th><th>Khách / nội dung</th><th className="num">PN</th><th className="num">Sổ</th><th className="num">Lệch</th><th>Ghi chú</th></tr></thead>
                      <tbody>
                        {D.groups.map((g) => (
                          <tr key={g.key} className={g.status === 'ok' ? 'dim' : ''}>
                            <td><span className={'badge ' + ST[g.status][0]}>{g.tt ? (g.status === 'ok' ? 'Thanh toán khớp' : 'Thanh toán lệch') : ST[g.status][1]}</span></td>
                            <td className="mono">{g.tt ? 'Nộp quỹ' : g.code || g.pnLines[0]?.soCT || ''}{g.pnLines.length > 1 && <span className="muted"> ×{g.pnLines.length}</span>}</td>
                            <td className="wrap-cell">{g.ten}</td>
                            <td className="num">{g.pn ? fmt(g.pn) : ''}</td><td className="num">{g.so ? fmt(g.so) : ''}</td>
                            <td className="num"><Lech v={g.diff} /></td>
                            <td className="small muted">{g.goiY || ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td></tr>
                )}
              </Fragment>
            ))}
            {!days.length && <tr><td colSpan="8" className="empty">Không có ngày nào lệch.</td></tr>}
          </tbody>
          <tfoot><tr>
            <td><b>Cộng</b></td><td className="num"><b>{fmt(res.tong.pnNo)}</b></td><td className="num"><b>{fmt(res.tong.soNo)}</b></td><td className="num"><Lech v={res.tong.pnNo - res.tong.soNo} /></td>
            <td className="num"><b>{fmt(res.tong.pnCo)}</b></td><td className="num"><b>{fmt(res.tong.soCo)}</b></td><td className="num"><Lech v={res.tong.pnCo - res.tong.soCo} /></td><td></td>
          </tr></tfoot>
        </table></div></div>
      </>}
      {!res && !err && <div className="card"><p className="muted">Chưa chọn file. Mẫu file: PTTK_Balance Sheet Form III_M2 All_DL376_….XLS</p></div>}
    </div>
  )
}
