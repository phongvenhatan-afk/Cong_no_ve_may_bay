import { useMemo, useRef, useState } from 'react'
import { Modal, Field, MoneyInput, Select, Combo } from './ui'
import { enrich, fmt, num, todayISO, thanhToanTheo, THU_TIEN, dmy } from './calc'
import { parseThongTinVe } from './parseVe'

const EMPTY = (s) => ({
  lx: 'XV', ngayXuat: todayISO(), thongTinVe: '', code: '', tenKhach: '', nl: 1, te: 0, eb: 0,
  hang: '', chuyenBay: '', ngayBay: '', gioBay: '', di: '', den: '', hanGiuCho: '',
  daiLy: s.daiLyChinh || 'PN', phongVe: (s.phongVe || ['NA'])[0], giaNet: 0, giaBan: 0, hanhLy: 0, doiNgay: 0,
  ttVe: 'Da xuat', thuTien: '', daThu: 0, ghiChu: '',
})

const TITLES = { new: 'Nhập vé mới', edit: 'Sửa dòng', hl: 'Thêm hành lý', dg: 'Đổi ngày / giờ bay' }

// Dòng cũ (nhập từ Excel) chưa có "Thông tin vé": dựng lại từ các cột
const dungThongTin = (r) => r.thongTinVe || [r.code && `Code: ${r.code}`, r.tenKhach].filter(Boolean).join('\n')

function initial(mode, src, s) {
  if (mode === 'new') return EMPTY(s)
  if (mode === 'edit') return { ...EMPTY(s), ...src, thongTinVe: dungThongTin(src), daThu: num(src.thanhToan) }
  const base = {
    ...EMPTY(s), thongTinVe: dungThongTin(src), code: src.code, tenKhach: src.tenKhach, nl: src.nl, te: src.te, eb: src.eb,
    hang: src.hang, chuyenBay: src.chuyenBay, ngayBay: src.ngayBay, gioBay: src.gioBay, di: src.di, den: src.den,
    daiLy: s.daiLyChinh || 'PN',
  }
  return mode === 'hl' ? { ...base, lx: 'HL' } : { ...base, lx: 'DG' }
}

function validate(f, mode) {
  const need = []
  const req = (k, l) => { if (f[k] === '' || f[k] === null || f[k] === undefined) need.push(l) }
  req('lx', 'Loại xuất'); req('ngayXuat', 'Ngày xuất'); req('thuTien', 'Thu tiền')
  if (mode === 'edit') return need
  if (f.lx === 'HL') { if (!num(f.hanhLy)) need.push('Tiền hành lý'); if (!num(f.giaNet)) need.push('Giá net') }
  else if (f.lx === 'DG') { req('ngayBay', 'Ngày bay mới'); if (!num(f.doiNgay)) need.push('Phí đổi'); if (!num(f.giaNet)) need.push('Giá net') }
  else {
    if (!f.code) need.push('Code vé (dòng "Code: xxxxxx" trong Thông tin vé)')
    if (!f.tenKhach) need.push('Tên khách (dòng ngay dưới Code)')
    req('hang', 'Hãng bay'); req('ngayBay', 'Ngày bay'); req('di', 'Hành trình đi'); req('den', 'Hành trình đến')
    if (!num(f.nl) && !num(f.te) && !num(f.eb)) need.push('Số khách')
    if (!num(f.giaNet)) need.push('Giá net'); if (!num(f.giaBan)) need.push('Giá bán')
  }
  if (f.thuTien === '1P' && !num(f.daThu)) need.push('Số tiền khách đã trả')
  return need
}

export default function TicketForm({ mode, src, settings, tickets, onSave, onClose }) {
  const [f, setF] = useState(() => initial(mode, src, settings))
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const infoRef = useRef()
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }))
  const today = todayISO()
  const calc = useMemo(() => enrich(f, settings, today), [f, settings, today])
  const T = calc.thanhTien
  const thanhToan = thanhToanTheo(f.thuTien, T, f.daThu)
  const dup = mode === 'new' && f.lx === 'XV' && f.code &&
    tickets.find((t) => t.code?.toUpperCase() === f.code.toUpperCase())
  const airlines = settings.airlines.map((a) => a.ten)

  // Dán / sửa "Thông tin vé" -> tự điền các ô đọc được
  function onInfo(text) {
    const p = parseThongTinVe(text, settings.places)
    if (mode === 'hl') { delete p.giaNet; delete p.ttVe } // hành lý: giá net là tiền hành lý, nhập riêng
    if (mode === 'dg') { delete p.giaNet }
    setF((o) => ({ ...o, ...p, thongTinVe: text, ...(p.code ? {} : { code: o.code }), ...(p.tenKhach ? {} : { tenKhach: o.tenKhach }) }))
  }

  async function save(again) {
    const need = validate(f, mode)
    if (need.length) { setErr('Còn thiếu: ' + need.join(', ')); return }
    setBusy(true)
    try {
      const { daThu, id, thanhTien, phiDL, hoaHong, tienNo, thang, bay, duNoQuy, ...rest } = f
      const data = { ...rest, code: (f.code || '').trim().toUpperCase(), tenKhach: (f.tenKhach || '').trim().toUpperCase(), thanhToan }
      if (mode !== 'edit') data.stt = Date.now()
      await onSave(data, again)
      if (again) {
        setF({ ...EMPTY(settings), ngayXuat: f.ngayXuat }); setErr('')
        setTimeout(() => infoRef.current?.focus(), 0)
      }
    } catch (e) { setErr('Lỗi lưu: ' + e.message) } finally { setBusy(false) }
  }

  const title = TITLES[mode] + (mode !== 'new' && src?.code ? ` — ${src.code}` : '')
  return (
    <Modal title={title} onClose={onClose} wide footer={
      <>
        {err && <div className="err">{err}</div>}
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Hủy</button>
        {mode === 'new' && <button className="btn" disabled={busy} onClick={() => save(true)}>Lưu &amp; nhập tiếp</button>}
        <button className="btn primary" disabled={busy} onClick={() => save(false)}>{busy ? 'Đang lưu…' : 'Lưu'}</button>
      </>
    }>
      {mode === 'dg' && <p className="note-box">Vé gốc bay {dmy(src.ngayBay)} {src.gioBay}. Dán thông tin vé mới (hoặc sửa ngày bay) và nhập phí đổi.</p>}
      <div className="info-grid">
        <Field label="Thông tin vé (dán nguyên tin nhắn đặt chỗ)">
          <textarea ref={infoRef} autoFocus={mode === 'new'} rows={9} className="info-text" value={f.thongTinVe}
            placeholder={'Code: ED2VVU\nMR HA VAN THIEU\n---\nHành trình: Thanh Hoá - Tp. Hồ Chí Minh\nNgày đi: 16/10/2026\nThời gian bay: 13:15 - 15:15\nSố hiệu CB: VJ245\n...'}
            onChange={(e) => onInfo(e.target.value)} />
        </Field>
        <div className="info-side">
          <Field label="Loại xuất"><Select value={f.lx} onChange={set('lx')} options={[['XV', 'XV – Xuất vé'], ['HL', 'HL – Hành lý'], ['DG', 'DG – Đổi giờ']]} /></Field>
          <Field label="Ngày xuất"><input type="date" value={f.ngayXuat} onChange={(e) => set('ngayXuat')(e.target.value)} /></Field>
          <div className="parsed">
            <div><span>Code vé</span><b className="mono">{f.code || '—'}</b></div>
            <div><span>Khách</span><b>{f.tenKhach || '—'}</b></div>
            {f.gioBay && <div><span>Giờ bay</span><b>{f.gioBay}</b></div>}
            {f.hanGiuCho && <div><span>Giữ chỗ đến</span><b>{f.hanGiuCho}</b></div>}
            {dup && <div className="warn">Code này đã có trong sổ ({dup.lx} {dmy(dup.ngayXuat)})</div>}
          </div>
        </div>
      </div>
      <div className="grid">
        <Field label="Người lớn"><input type="number" min="0" value={f.nl} onChange={(e) => set('nl')(num(e.target.value))} /></Field>
        <Field label="Trẻ em"><input type="number" min="0" value={f.te} onChange={(e) => set('te')(num(e.target.value))} /></Field>
        <Field label="Em bé"><input type="number" min="0" value={f.eb} onChange={(e) => set('eb')(num(e.target.value))} /></Field>
        <Field label="Hãng bay"><Select value={f.hang} onChange={set('hang')} options={airlines.includes(f.hang) || !f.hang ? airlines : [...airlines, f.hang]} allowEmpty /></Field>
        <Field label="Chuyến bay"><input className="mono up" value={f.chuyenBay} onChange={(e) => set('chuyenBay')(e.target.value.toUpperCase())} /></Field>
      </div>
      <div className="grid">
        <Field label="Ngày bay"><input type="date" value={/^\d{4}-/.test(f.ngayBay || '') ? f.ngayBay : ''} onChange={(e) => set('ngayBay')(e.target.value)} /></Field>
        <Field label="Hành trình đi"><Combo id="dl-di" value={f.di} onChange={(v) => set('di')(v.toUpperCase())} options={settings.places} /></Field>
        <Field label="Hành trình đến"><Combo id="dl-den" value={f.den} onChange={(v) => set('den')(v.toUpperCase())} options={settings.places} /></Field>
        <Field label="Đại lý"><Combo id="dl-daily" value={f.daiLy} onChange={set('daiLy')} options={settings.daiLy} /></Field>
        <Field label="Phòng vé"><Combo id="dl-pv" value={f.phongVe} onChange={set('phongVe')} options={settings.phongVe} /></Field>
      </div>
      <div className="grid">
        <Field label="Giá net"><MoneyInput value={f.giaNet} onChange={set('giaNet')} /></Field>
        <Field label={settings.airlines.find((a) => a.ten === f.hang)?.cach === 'khach' ? 'Giá bán / khách' : 'Giá bán (tổng)'}><MoneyInput value={f.giaBan} onChange={set('giaBan')} autoFocus={mode === 'edit'} /></Field>
        <Field label="Hành lý"><MoneyInput value={f.hanhLy} onChange={set('hanhLy')} autoFocus={mode === 'hl'} /></Field>
        <Field label="Phí đổi ngày/giờ"><MoneyInput value={f.doiNgay} onChange={set('doiNgay')} /></Field>
        <Field label="Tình trạng vé">
          <div className="seg">
            {[['Da xuat', 'Đã xuất'], ['Chua xuat', 'Chưa xuất']].map(([v, l]) => (
              <button key={v} type="button" className={f.ttVe === v ? 'on' : ''} onClick={() => set('ttVe')(v)}>{l}</button>
            ))}
          </div>
        </Field>
      </div>
      <div className="grid">
        <Field label="Thu tiền" span={2}>
          <div className="seg">
            {Object.entries(THU_TIEN).map(([v, l]) => (
              <button key={v} type="button" className={f.thuTien === v ? 'on ' + v : ''} onClick={() => set('thuTien')(v)}>{v} · {l}</button>
            ))}
          </div>
        </Field>
        {f.thuTien === '1P' && <Field label="Khách đã trả"><MoneyInput value={f.daThu} onChange={set('daThu')} /></Field>}
        <Field label="Ghi chú" span={f.thuTien === '1P' ? 2 : 3}><input value={f.ghiChu} onChange={(e) => set('ghiChu')(e.target.value)} /></Field>
      </div>
      <div className="summary">
        <div><span>Thành tiền</span><b>{fmt(T)}</b></div>
        <div><span>Phí đại lý (trừ quỹ)</span><b>{fmt(calc.phiDL)}</b></div>
        <div><span>Hoa hồng</span><b className={calc.hoaHong < 0 ? 'neg' : 'pos'}>{calc.hoaHong === null ? '—' : fmt(calc.hoaHong)}</b></div>
        <div><span>Khách còn nợ</span><b className={T - thanhToan > 0 ? 'neg' : ''}>{f.thuTien ? fmt(T - thanhToan) : '—'}</b></div>
      </div>
    </Modal>
  )
}
