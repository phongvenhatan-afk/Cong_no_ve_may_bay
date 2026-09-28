import { useState } from 'react'
import { Field, MoneyInput } from './ui'
import { enrich, sortRows, todayISO, monthLabel, fmt, DEFAULT_SETTINGS } from './calc'
import { readLegacyWorkbook, calcSoDuDauKy, exportRows } from './excel'
import { api, DEMO, HAS_SEED, resetDemo } from './store'

const listToText = (l) => (l || []).join(', ')
const textToList = (t) => t.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)

export default function Settings({ settings, rows, toast }) {
  const [s, setS] = useState(() => JSON.parse(JSON.stringify(settings)))
  const [imp, setImp] = useState(null)
  const [progress, setProgress] = useState('')
  const set = (k) => (v) => setS((o) => ({ ...o, [k]: v }))
  const setAir = (i, k, v) => setS((o) => ({ ...o, airlines: o.airlines.map((a, j) => (j === i ? { ...a, [k]: v } : a)) }))

  async function save() {
    await api.saveSettings(s)
    toast('Đã lưu cài đặt')
  }

  async function pickFile(e) {
    const f = e.target.files[0]; e.target.value = ''
    if (!f) return
    setProgress('Đang đọc file…')
    try {
      const res = await readLegacyWorkbook(f, s)
      const today = todayISO()
      const en = sortRows(res.rows.map((r) => enrich(r, s, today)))
      const sdk = res.noCuRef ? calcSoDuDauKy(en, res.noCuRef) : null
      setImp({ ...res, file: f.name, sdk })
      setProgress('')
    } catch (err) { setProgress('Lỗi đọc file: ' + err.message) }
  }

  async function doImport(replace) {
    setProgress('Đang ghi dữ liệu…')
    try {
      await api.bulkAdd(imp.rows, replace, (n) => setProgress(`Đã ghi ${n}/${imp.rows.length} dòng…`))
      if (imp.sdk !== null) {
        const ns = { ...s, soDuDauKy: Math.round(imp.sdk) }
        setS(ns); await api.saveSettings(ns)
      }
      toast(`Đã nhập ${imp.rows.length} dòng`)
      setImp(null); setProgress('')
    } catch (err) { setProgress('Lỗi: ' + err.message) }
  }

  return (
    <div className="page settings">
      <section className="card">
        <h2>Nhập dữ liệu từ file Excel cũ</h2>
        <p className="muted">Chọn file <b>CONG NO VE MAY BAY.xlsm</b>. Ứng dụng đọc sheet “TỔNG” (giữ nguyên số tiền nợ từng dòng) và lấy “Nợ cũ” ở sheet “Cong no” để tính số dư đầu kỳ.</p>
        <label className="btn primary file">Chọn file Excel…<input type="file" accept=".xlsx,.xlsm,.xls" hidden onChange={pickFile} /></label>
        {progress && <p className="progress">{progress}</p>}
        {imp && (
          <div className="import-box">
            <p>File <b>{imp.file}</b> — sheet “{imp.sheet}”: <b>{imp.rows.length}</b> dòng.</p>
            {imp.noCuRef && <p>Nợ cũ {monthLabel(imp.noCuRef.month)} trong file: <b>{fmt(imp.noCuRef.noCu)}</b> → số dư đầu kỳ sẽ đặt: <b>{fmt(imp.sdk)}</b></p>}
            <div className="row">
              {rows.length > 0 && <button className="btn" onClick={() => exportRows(rows, `VeMayBay_TruocKhiNhap_${todayISO()}.xlsx`)}>1. Sao lưu {rows.length} dòng hiện có</button>}
              <button className="btn danger" onClick={() => doImport(true)}>{rows.length > 0 ? '2. ' : ''}Thay thế toàn bộ bằng dữ liệu trong file</button>
              <button className="btn ghost" onClick={() => setImp(null)}>Hủy</button>
            </div>
          </div>
        )}
        <div className="row">
          <button className="btn" onClick={() => exportRows(rows, `VeMayBay_SaoLuu_${todayISO()}.xlsx`)}>Sao lưu toàn bộ ra Excel ({rows.length} dòng)</button>
        </div>
      </section>

      <section className="card">
        <h2>Công nợ quỹ đại lý</h2>
        <div className="grid g3">
          <Field label="Đại lý tính quỹ" hint="Phí xuất vé của đại lý này trừ vào quỹ"><input value={s.daiLyChinh} onChange={(e) => set('daiLyChinh')(e.target.value)} /></Field>
          <Field label="Số dư đầu kỳ (điều chỉnh)" hint="Nợ cũ tháng M = số này + Σ(Nộp quỹ − Xuất vé) các tháng trước"><MoneyInput value={s.soDuDauKy} onChange={set('soDuDauKy')} /></Field>
        </div>
      </section>

      <section className="card">
        <h2>Hãng bay & cách tính thành tiền</h2>
        <p className="muted">Giá bán theo khách: Thành tiền = (NL + hệ số TE × TE) × Giá bán + phần em bé + hành lý + phí đổi. Em bé ≤ 1 là hệ số × giá bán, &gt; 1 là số tiền cố định/em bé.</p>
        <div className="table-wrap"><table className="edit-table">
          <thead><tr><th>Hãng</th><th>Cách tính</th><th>Hệ số TE</th><th>Em bé</th><th>Phí ĐL / khách</th><th>Trừ quỹ ĐL</th><th></th></tr></thead>
          <tbody>
            {s.airlines.map((a, i) => (
              <tr key={i}>
                <td><input value={a.ten} onChange={(e) => setAir(i, 'ten', e.target.value)} /></td>
                <td><select value={a.cach} onChange={(e) => setAir(i, 'cach', e.target.value)}><option value="khach">Giá / khách</option><option value="tong">Giá bán = tổng</option></select></td>
                <td><input type="number" step="0.01" value={a.heSoTE} onChange={(e) => setAir(i, 'heSoTE', Number(e.target.value))} /></td>
                <td><input type="number" value={a.emBe} onChange={(e) => setAir(i, 'emBe', Number(e.target.value))} /></td>
                <td><input type="number" value={a.phiKhach} onChange={(e) => setAir(i, 'phiKhach', Number(e.target.value))} /></td>
                <td className="center"><input type="checkbox" checked={a.tinhPhiDL !== false} onChange={(e) => setAir(i, 'tinhPhiDL', e.target.checked)} /></td>
                <td><button className="icon-btn" onClick={() => setS((o) => ({ ...o, airlines: o.airlines.filter((_, j) => j !== i) }))}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <button className="btn ghost" onClick={() => setS((o) => ({ ...o, airlines: [...o.airlines, { ten: '', cach: 'khach', heSoTE: 1, emBe: 0, phiKhach: 0, tinhPhiDL: true }] }))}>+ Thêm hãng</button>
      </section>

      <section className="card">
        <h2>Danh mục</h2>
        <div className="grid g2">
          <Field label="Điểm đi / đến"><textarea rows="3" defaultValue={listToText(s.places)} onBlur={(e) => set('places')(textToList(e.target.value))} /></Field>
          <Field label="Ngân hàng"><textarea rows="3" defaultValue={listToText(s.banks)} onBlur={(e) => set('banks')(textToList(e.target.value))} /></Field>
          <Field label="Đại lý"><textarea rows="2" defaultValue={listToText(s.daiLy)} onBlur={(e) => set('daiLy')(textToList(e.target.value))} /></Field>
          <Field label="Phòng vé"><textarea rows="2" defaultValue={listToText(s.phongVe)} onBlur={(e) => set('phongVe')(textToList(e.target.value))} /></Field>
        </div>
      </section>

      <div className="save-bar">
        <button className="btn ghost" onClick={() => setS(JSON.parse(JSON.stringify({ ...DEFAULT_SETTINGS, soDuDauKy: s.soDuDauKy })))}>Khôi phục mặc định</button>
        <button className="btn primary" onClick={save}>Lưu cài đặt</button>
      </div>
      {DEMO && HAS_SEED && (
        <section className="card">
          <h2>Bản demo</h2>
          <p className="muted">Dữ liệu demo là bản sao từ file CONG NO VE MAY BAY.xlsm, chỉ lưu trong trình duyệt của bạn. Thử thoải mái, rồi bấm nút dưới để quay về dữ liệu ban đầu.</p>
          <div className="row"><button className="btn" onClick={() => { resetDemo(); toast('Đã khôi phục dữ liệu demo ban đầu') }}>Khôi phục dữ liệu demo</button></div>
        </section>
      )}
      {DEMO && <p className="muted small">Đang chạy chế độ DEMO: dữ liệu chỉ lưu trong trình duyệt này. Cấu hình Firebase trong file .env để dùng chung nhiều người.</p>}
    </div>
  )
}
