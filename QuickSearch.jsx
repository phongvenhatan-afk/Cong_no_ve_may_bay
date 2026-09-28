import { useMemo, useRef, useState } from 'react'
import { khop, isMoneyOnly, dmy, fmt } from './calc'

// Ô tìm nhanh trên thanh đầu trang: gõ tên khách (không dấu cũng được) -> ra code vé
export default function QuickSearch({ rows, onPick }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const box = useRef()

  const results = useMemo(() => {
    if (q.trim().length < 2) return []
    const by = new Map()
    for (let i = rows.length - 1; i >= 0; i--) { // mới nhất trước
      const r = rows[i]
      if (isMoneyOnly(r.lx) || !r.code || !khop(r, q)) continue
      const g = by.get(r.code) || { code: r.code, ten: r.tenKhach, cb: r.chuyenBay, ngayBay: r.ngayBay, di: r.di, den: r.den, no: 0, n: 0, ngayXuat: r.ngayXuat }
      g.no += r.tienNo > 0 ? r.tienNo : 0; g.n++
      by.set(r.code, g)
      if (by.size >= 12) break
    }
    return [...by.values()]
  }, [rows, q])

  const pick = (g) => { onPick(g.code); setQ(''); setOpen(false) }

  return (
    <div className="qs" ref={box} onBlur={(e) => { if (!box.current.contains(e.relatedTarget)) setOpen(false) }}>
      <input
        className="qs-input" placeholder="Tìm tên khách / code vé…" value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0) }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, results.length - 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)) }
          if (e.key === 'Enter' && results[hi]) pick(results[hi])
          if (e.key === 'Escape') setOpen(false)
        }}
      />
      {open && q.trim().length >= 2 && (
        <div className="qs-drop">
          {results.map((g, i) => (
            <button key={g.code} className={'qs-item' + (i === hi ? ' on' : '')} onMouseEnter={() => setHi(i)} onClick={() => pick(g)}>
              <b className="mono">{g.code}</b>
              <span className="qs-name">{g.ten}</span>
              <span className="qs-meta">{g.cb} · {dmy(g.ngayBay)} · {g.di} → {g.den}{g.n > 1 ? ` · ${g.n} dòng` : ''}</span>
              {g.no > 0 && <span className="badge red">Nợ {fmt(g.no)}</span>}
            </button>
          ))}
          {!results.length && <div className="qs-empty">Không tìm thấy khách nào khớp “{q}”</div>}
        </div>
      )}
    </div>
  )
}
