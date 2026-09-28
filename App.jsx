import planeUrl from './plane.svg'
import { useCallback, useMemo, useState } from 'react'
import { useAuth, useData, api, DEMO } from './store'
import { enrich, sortRows, todayISO, monthKey, num, conNo } from './calc'
import CongNo from './CongNo'
import { SoTong, ListPage } from './Pages'
import DoiSoat from './DoiSoat'
import QuickSearch from './QuickSearch'
import Settings from './Settings'
import TicketForm from './TicketForm'
import { NopQuyForm, XuatVeDialog, ThuNoDialog, ConfirmDialog, ChotDialog } from './Dialogs'
import { Toast } from './ui'

const TABS = [
  ['congno', 'Công nợ'], ['tong', 'Sổ tổng'], ['sapbay', 'Sắp bay'], ['chuaxuat', 'Chưa xuất'],
  ['no', 'Khách nợ'], ['doisoat', 'Đối soát PN'], ['caidat', 'Cài đặt'],
]

function Login({ login }) {
  const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [err, setErr] = useState('')
  return (
    <div className="login">
      <form onSubmit={async (e) => { e.preventDefault(); try { await login(email, pw) } catch { setErr('Sai email hoặc mật khẩu') } }}>
        <img src={planeUrl} alt="" width="40" />
        <h1>Công nợ vé máy bay</h1>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        <input type="password" placeholder="Mật khẩu" value={pw} onChange={(e) => setPw(e.target.value)} />
        {err && <div className="err">{err}</div>}
        <button className="btn primary">Đăng nhập</button>
      </form>
    </div>
  )
}

export default function App() {
  const { user, login, logout } = useAuth()
  const { tickets, settings, ready, error } = useData(!!user)
  const [tab, setTab] = useState('congno')
  const [month, setMonth] = useState(monthKey(todayISO()))
  const [dlg, setDlg] = useState(null)
  const [msg, setMsg] = useState('')
  const [query, setQuery] = useState('')
  const toast = useCallback((m) => setMsg(m), [])
  const today = todayISO()

  const rows = useMemo(() => sortRows(tickets.map((t) => enrich(t, settings, today))), [tickets, settings, today])
  const months = useMemo(() => {
    const s = new Set(rows.map((r) => r.thang).filter(Boolean)); s.add(monthKey(today))
    return [...s].sort().reverse()
  }, [rows, today])

  if (user === undefined) return <div className="loading">Đang tải…</div>
  if (!user) return <Login login={login} />

  const close = () => setDlg(null)
  const run = async (fn, m) => { try { await fn(); toast(m); close() } catch (e) { toast('Lỗi: ' + e.message) } }

  function onAction(k, r) {
    if (k === 'edit' && r.lx === 'DC') setDlg({ t: 'chot', r })
    else if (k === 'edit') setDlg({ t: r.lx === 'NQ' ? 'nq' : 'edit', r })
    else if (k === 'find') { setQuery(r.code); setTab('tong') }
    else setDlg({ t: k, r })
  }

  const sapBay = rows.filter((r) => r.bay === 'Sap bay')
  const chuaXuat = rows.filter((r) => r.ttVe === 'Chua xuat')
  const khachNo = rows.filter(conNo)

  return (
    <div className="app">
      <header>
        <div className="brand"><img src={planeUrl} alt="" width="22" /><span>Công nợ vé máy bay</span>{DEMO && <em className="demo">DEMO</em>}</div>
        <nav>
          {TABS.map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
              {l}
              {k === 'sapbay' && sapBay.length > 0 && <i className="dot red">{sapBay.length}</i>}
              {k === 'chuaxuat' && chuaXuat.length > 0 && <i className="dot">{chuaXuat.length}</i>}
            </button>
          ))}
        </nav>
        <QuickSearch rows={rows} onPick={(code) => { setQuery(code); setTab('tong') }} />
        <div className="head-actions">
          <button className="btn primary" onClick={() => setDlg({ t: 'new' })}>+ Nhập vé</button>
          <button className="btn green" onClick={() => setDlg({ t: 'nq' })}>+ Nộp quỹ</button>
          {!DEMO && <button className="btn ghost small" onClick={logout} title={user.email}>Thoát</button>}
        </div>
      </header>

      {error && <div className="banner">Lỗi kết nối dữ liệu: {error}</div>}
      {!ready ? <div className="loading">Đang tải dữ liệu…</div> : (
        <main>
          {tab === 'congno' && <CongNo rows={rows} settings={settings} month={month} setMonth={setMonth} months={months} onAction={onAction} goTab={setTab} onChot={(init, r) => setDlg({ t: 'chot', init, r })} />}
          {tab === 'tong' && <SoTong rows={rows} settings={settings} months={months} onAction={onAction} query={query} setQuery={setQuery} />}
          {tab === 'sapbay' && <ListPage title="Khách sắp bay" desc="Ngày bay là hôm nay hoặc ngày mai" rows={sapBay} preset="bay" onAction={onAction} />}
          {tab === 'chuaxuat' && <ListPage title="Vé chưa xuất" desc="Vé đang giữ chỗ, chưa xuất — bấm ⋯ → Xuất vé khi đã xuất" rows={chuaXuat} preset="giucho" onAction={onAction} />}
          {tab === 'no' && <ListPage title="Khách còn nợ" desc="Các dòng có Thành tiền > số khách đã trả" rows={khachNo} preset="no" onAction={onAction} total={khachNo.reduce((s, r) => s + num(r.tienNo), 0)} />}
          {tab === 'doisoat' && <DoiSoat rows={rows} settings={settings} onChot={(init) => setDlg({ t: 'chot', init })} />}
          {tab === 'caidat' && <Settings key={JSON.stringify(settings)} settings={settings} rows={rows} toast={toast} />}
        </main>
      )}

      {dlg && ['new', 'edit', 'hl', 'dg'].includes(dlg.t) && (
        <TicketForm mode={dlg.t} src={dlg.r} settings={settings} tickets={tickets} onClose={close}
          onSave={async (data, again) => {
            if (dlg.t === 'edit') await api.update(dlg.r.id, data); else await api.add(data)
            if (data.ngayXuat) setMonth(monthKey(data.ngayXuat))
            toast(dlg.t === 'edit' ? 'Đã cập nhật' : 'Đã lưu ' + (data.code || ''))
            if (!again) close()
          }} />
      )}
      {dlg?.t === 'nq' && (
        <NopQuyForm src={dlg.r} settings={settings} onClose={close}
          onSave={(d) => run(() => (dlg.r ? api.update(dlg.r.id, d) : api.add(d)), 'Đã lưu nộp quỹ')} />
      )}
      {dlg?.t === 'xuat' && <XuatVeDialog r={dlg.r} onClose={close} onSave={(p) => run(() => api.update(dlg.r.id, p), 'Đã xuất vé ' + dlg.r.code)} />}
      {dlg?.t === 'thuno' && <ThuNoDialog r={dlg.r} onClose={close} onSave={(p) => run(() => api.update(dlg.r.id, p), 'Đã ghi nhận thu nợ')} />}
      {dlg?.t === 'delete' && (
        <ConfirmDialog danger title="Xóa dòng" text={`Xóa dòng ${dlg.r.lx} ${dlg.r.code || ''} ${dlg.r.tenKhach || ''}? Không thể hoàn tác.`}
          onClose={close} onYes={() => run(() => api.remove(dlg.r.id), 'Đã xóa')} />
      )}
      {dlg?.t === 'chot' && (
        <ChotDialog init={dlg.init} existing={dlg.r} rows={rows} settings={settings} onClose={close}
          onDelete={() => run(() => api.remove(dlg.r.id), 'Đã xóa điều chỉnh')}
          onSave={(d) => run(async () => {
            if (dlg.r) { if (d.dieuChinh) await api.update(dlg.r.id, d); else await api.remove(dlg.r.id) }
            else await api.add(d)
            setMonth(monthKey(d.ngayXuat))
          }, 'Đã lưu điều chỉnh chốt công nợ')} />
      )}
      <Toast msg={msg} onDone={() => setMsg('')} />
    </div>
  )
}
