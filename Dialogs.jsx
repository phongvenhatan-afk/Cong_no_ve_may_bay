import { useState } from 'react'
import { Modal, Field, MoneyInput, Select, Combo } from './ui'
import { fmt, num, todayISO, dmy, soDuDen } from './calc'

export function NopQuyForm({ src, settings, onSave, onClose }) {
  const [f, setF] = useState(src ? { ...src } : {
    lx: 'NQ', ngayXuat: todayISO(), nganHang: settings.banks[0] || '', daiLy: settings.daiLyChinh || 'PN',
    phongVe: (settings.phongVe || ['NA'])[0], nopQuy: 0, ghiChu: '',
  })
  const [err, setErr] = useState('')
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }))
  async function save() {
    if (!f.ngayXuat || !f.nganHang || !num(f.nopQuy)) { setErr('Vui lòng nhập ngày, ngân hàng và số tiền'); return }
    const { id, thanhTien, phiDL, hoaHong, tienNo, thang, bay, duNoQuy, ...rest } = f
    try { await onSave({ ...rest, stt: src ? src.stt : Date.now() }) } catch (e) { setErr(e.message) }
  }
  return (
    <Modal title={src ? 'Sửa nộp quỹ' : 'Nộp quỹ'} onClose={onClose} footer={
      <>{err && <div className="err">{err}</div>}<div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Hủy</button>
        <button className="btn primary" onClick={save}>Lưu</button></>
    }>
      <div className="grid g2">
        <Field label="Ngày nộp"><input type="date" value={f.ngayXuat} onChange={(e) => set('ngayXuat')(e.target.value)} /></Field>
        <Field label="Ngân hàng"><Combo id="dl-bank" value={f.nganHang} onChange={set('nganHang')} options={settings.banks} /></Field>
        <Field label="Đại lý"><Combo id="dl-daily2" value={f.daiLy} onChange={set('daiLy')} options={settings.daiLy} /></Field>
        <Field label="Phòng vé"><Combo id="dl-pv2" value={f.phongVe} onChange={set('phongVe')} options={settings.phongVe} /></Field>
        <Field label="Số tiền nộp" span={2}><MoneyInput autoFocus value={f.nopQuy} onChange={set('nopQuy')} /></Field>
        <Field label="Ghi chú" span={2}><input value={f.ghiChu || ''} onChange={(e) => set('ghiChu')(e.target.value)} /></Field>
      </div>
    </Modal>
  )
}

function Info({ r }) {
  return (
    <div className="info-box">
      <div><b className="mono">{r.code}</b> · {r.tenKhach}</div>
      <div>{r.hang} {r.chuyenBay} · {r.di} → {r.den} · {dmy(r.ngayBay)} {r.gioBay}</div>
      <div>Thành tiền <b>{fmt(r.thanhTien)}</b> · Đã thu <b>{fmt(r.thanhToan)}</b> · Còn nợ <b className={r.tienNo > 0 ? 'neg' : ''}>{fmt(r.tienNo)}</b></div>
    </div>
  )
}

export function XuatVeDialog({ r, onSave, onClose }) {
  const [ngay, setNgay] = useState(todayISO())
  const [thu, setThu] = useState(r.thuTien || 'R')
  return (
    <Modal title="Xuất vé" onClose={onClose} footer={
      <><div className="spacer" /><button className="btn ghost" onClick={onClose}>Hủy</button>
        <button className="btn primary" onClick={() => onSave({
          ngayXuat: ngay, ttVe: 'Da xuat', thuTien: thu,
          thanhToan: thu === 'R' ? r.thanhTien : thu === 'C' ? 0 : num(r.thanhToan),
        })}>Xác nhận xuất vé</button></>
    }>
      <Info r={r} />
      <div className="grid g2">
        <Field label="Ngày xuất"><input type="date" value={ngay} onChange={(e) => setNgay(e.target.value)} /></Field>
        <Field label="Thu tiền"><Select value={thu} onChange={setThu} options={[['R', 'R · Đã thu đủ'], ['C', 'C · Chưa thu'], ['1P', '1P · Giữ số đã thu']]} /></Field>
      </div>
      <p className="hint">Ngày xuất sẽ đổi sang ngày trên, dòng được tính vào công nợ của tháng đó.</p>
    </Modal>
  )
}

export function ThuNoDialog({ r, onSave, onClose }) {
  const [kieu, setKieu] = useState('R')
  const [tien, setTien] = useState(0)
  const [err, setErr] = useState('')
  function save() {
    if (kieu === 'R') return onSave({ thuTien: 'R', thanhToan: r.thanhTien })
    if (!num(tien)) { setErr('Nhập số tiền khách trả'); return }
    const tt = num(r.thanhToan) + num(tien)
    onSave({ thuTien: tt >= r.thanhTien ? 'R' : '1P', thanhToan: tt })
  }
  return (
    <Modal title="Thu nợ khách" onClose={onClose} footer={
      <>{err && <div className="err">{err}</div>}<div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Hủy</button><button className="btn primary" onClick={save}>Lưu</button></>
    }>
      <Info r={r} />
      <div className="seg big">
        <button className={kieu === 'R' ? 'on R' : ''} onClick={() => setKieu('R')}>Thu đủ {fmt(r.tienNo)}</button>
        <button className={kieu === '1P' ? 'on 1P' : ''} onClick={() => setKieu('1P')}>Thu một phần</button>
      </div>
      {kieu === '1P' && <Field label="Số tiền thu lần này"><MoneyInput autoFocus value={tien} onChange={setTien} /></Field>}
    </Modal>
  )
}

export function ConfirmDialog({ title, text, onYes, onClose, danger }) {
  return (
    <Modal title={title} onClose={onClose} footer={
      <><div className="spacer" /><button className="btn ghost" onClick={onClose}>Hủy</button>
        <button className={'btn ' + (danger ? 'danger' : 'primary')} onClick={onYes}>Đồng ý</button></>
    }><p>{text}</p></Modal>
  )
}

// Chốt công nợ cuối kỳ: nhập số dư theo biên bản với đại lý -> tạo dòng Điều chỉnh (DC)
export function ChotDialog({ init, existing, rows, settings, onSave, onDelete, onClose }) {
  const [ngay, setNgay] = useState(existing?.ngayXuat || init?.ngay || todayISO())
  const others = rows.filter((r) => !existing || r.id !== existing.id)
  const base = soDuDen(others, settings, ngay, false)
  const target0 = existing ? base + num(existing.dieuChinh) : init?.noDaiLy !== undefined ? -init.noDaiLy : base
  const [huong, setHuong] = useState(target0 <= 0 ? 'no' : 'du')
  const [v, setV] = useState(Math.abs(Math.round(target0)))
  const [ghiChu, setGhiChu] = useState(existing?.ghiChu || 'Điều chỉnh chênh lệch khi chốt công nợ')
  const target = huong === 'no' ? -num(v) : num(v)
  const adj = Math.round(target - base)
  const show = (x) => (x < 0 ? `Nợ đại lý ${fmt(-x)}` : `Quỹ dư ${fmt(x)}`)
  return (
    <Modal title="Chốt công nợ / điều chỉnh số dư" onClose={onClose} footer={
      <>{existing && <button className="btn ghost danger-text" onClick={onDelete}>Xóa điều chỉnh</button>}<div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Hủy</button>
        <button className="btn primary" disabled={!adj && !existing} onClick={() => onSave({
          lx: 'DC', ngayXuat: ngay, dieuChinh: adj, ghiChu, daiLy: settings.daiLyChinh, tenKhach: 'ĐIỀU CHỈNH CHỐT CÔNG NỢ', stt: 9e15,
        })}>Lưu điều chỉnh</button></>
    }>
      <div className="grid g2">
        <Field label="Ngày chốt"><input type="date" value={ngay} onChange={(e) => setNgay(e.target.value)} /></Field>
        <div className="field"><span className="lbl">Số dư theo sổ đến hết ngày {dmy(ngay)}</span><b className={'big-num ' + (base < 0 ? 'neg' : 'pos')}>{show(base)}</b></div>
      </div>
      <Field label="Số dư chốt với đại lý (theo biên bản / bảng kê)">
        <div className="seg">
          <button type="button" className={huong === 'no' ? 'on C' : ''} onClick={() => setHuong('no')}>Mình còn nợ đại lý</button>
          <button type="button" className={huong === 'du' ? 'on R' : ''} onClick={() => setHuong('du')}>Quỹ còn dư</button>
        </div>
      </Field>
      <MoneyInput autoFocus value={v} onChange={setV} />
      <div className="summary two">
        <div><span>Số điều chỉnh sẽ ghi</span><b className={adj < 0 ? 'neg' : adj > 0 ? 'pos' : ''}>{adj > 0 ? '+' : ''}{fmt(adj)}</b></div>
        <div><span>Số dư sau điều chỉnh</span><b>{show(target)}</b></div>
      </div>
      <Field label="Ghi chú"><input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} /></Field>
      <p className="hint muted">Dòng điều chỉnh được cộng vào quỹ ngày {dmy(ngay)} và chuyển sang nợ cũ các tháng sau.</p>
    </Modal>
  )
}
