import { useEffect, useState } from 'react'
import { num } from './calc'

export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Đóng">×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({ label, children, span, hint }) {
  return (
    <label className={'field' + (span ? ` span${span}` : '')}>
      <span className="lbl">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  )
}

// Ô nhập tiền có dấu phân cách hàng nghìn
export function MoneyInput({ value, onChange, ...p }) {
  const [txt, setTxt] = useState(value ? Number(value).toLocaleString('vi-VN') : '')
  useEffect(() => {
    if (num(txt) !== num(value)) setTxt(value ? Number(value).toLocaleString('vi-VN') : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return (
    <input
      inputMode="numeric"
      className="num"
      value={txt}
      onChange={(e) => {
        const n = num(e.target.value)
        setTxt(e.target.value === '' || e.target.value === '-' ? e.target.value : n.toLocaleString('vi-VN'))
        onChange(n)
      }}
      {...p}
    />
  )
}

export function Select({ value, onChange, options, allowEmpty, ...p }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...p}>
      {allowEmpty && <option value="">—</option>}
      {options.map((o) => {
        const [v, l] = Array.isArray(o) ? o : [o, o]
        return <option key={v} value={v}>{l}</option>
      })}
    </select>
  )
}

export function Combo({ value, onChange, options, id, ...p }) {
  return (
    <>
      <input list={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...p} />
      <datalist id={id}>{options.map((o) => <option key={o} value={o} />)}</datalist>
    </>
  )
}

export function Badge({ kind, children }) {
  return <span className={'badge ' + (kind || '')}>{children}</span>
}

export function Toast({ msg, onDone }) {
  useEffect(() => { if (msg) { const t = setTimeout(onDone, 2600); return () => clearTimeout(t) } }, [msg, onDone])
  return msg ? <div className="toast">{msg}</div> : null
}
