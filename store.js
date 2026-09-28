// Lớp dữ liệu: Firestore (khi có cấu hình .env) hoặc DEMO (localStorage)
import { useEffect, useState, useCallback } from 'react'
import { initializeApp } from 'firebase/app'
import {
  getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc,
  writeBatch, getDocs, serverTimestamp,
} from 'firebase/firestore'
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { DEFAULT_SETTINGS } from './calc'

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}
export const DEMO = !cfg.apiKey || !cfg.projectId

const COL = 'vmb_tickets'
const CFG_DOC = ['vmb_config', 'settings']

let db = null, auth = null
if (!DEMO) {
  const app = initializeApp(cfg)
  db = getFirestore(app)
  auth = getAuth(app)
}

// ---------------- DEMO (localStorage) ----------------
const LS_T = 'vmb_tickets_v1', LS_S = 'vmb_settings_v1'
const listeners = new Set()
const mem = {}
const lsRead = (k, d) => {
  try { const v = localStorage.getItem(k); if (v !== null) return JSON.parse(v) } catch { /* bỏ qua */ }
  if (k in mem) return mem[k]
  const s = typeof window !== 'undefined' && window.__VMB_SEED__
  if (s) return k === LS_T ? s.tickets : s.settings
  return d
}
const lsWrite = (k, v) => { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* trình duyệt chặn lưu: giữ trong bộ nhớ */ } }
const emit = () => listeners.forEach((f) => f())
// Dữ liệu mẫu nhúng sẵn cho bản demo (nếu có)
const SEED = typeof window !== 'undefined' ? window.__VMB_SEED__ : null
export const HAS_SEED = !!SEED
export function resetDemo() {
  if (!SEED) return
  lsWrite(LS_T, SEED.tickets); lsWrite(LS_S, SEED.settings); emit()
}
if (DEMO && SEED) {
  try { if (localStorage.getItem(LS_T) === null) { localStorage.setItem(LS_T, JSON.stringify(SEED.tickets)); localStorage.setItem(LS_S, JSON.stringify(SEED.settings)) } } catch { /* bỏ qua */ }
}
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

const demoApi = {
  async add(t) { const all = lsRead(LS_T, []); const id = newId(); all.push({ ...t, id }); lsWrite(LS_T, all); emit(); return id },
  async update(id, patch) { const all = lsRead(LS_T, []).map((t) => (t.id === id ? { ...t, ...patch } : t)); lsWrite(LS_T, all); emit() },
  async remove(id) { lsWrite(LS_T, lsRead(LS_T, []).filter((t) => t.id !== id)); emit() },
  async bulkAdd(list, replace, onProgress) {
    const base = replace ? [] : lsRead(LS_T, [])
    lsWrite(LS_T, base.concat(list.map((t) => ({ ...t, id: newId() })))); onProgress?.(list.length); emit()
  },
  async saveSettings(s) { lsWrite(LS_S, s); emit() },
}

// ---------------- FIRESTORE ----------------
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([k, v]) => v !== undefined && k !== 'id'))
const fsApi = {
  async add(t) { const r = await addDoc(collection(db, COL), { ...clean(t), createdAt: serverTimestamp(), createdBy: auth.currentUser?.email || '' }); return r.id },
  async update(id, patch) { await updateDoc(doc(db, COL, id), { ...clean(patch), updatedAt: serverTimestamp(), updatedBy: auth.currentUser?.email || '' }) },
  async remove(id) { await deleteDoc(doc(db, COL, id)) },
  // Thay thế an toàn: ghi dữ liệu mới xong mới xóa dữ liệu cũ (rớt mạng giữa chừng không mất dữ liệu)
  async bulkAdd(list, replace, onProgress) {
    const old = replace ? (await getDocs(collection(db, COL))).docs.map((d) => d.ref) : []
    let done = 0
    for (let i = 0; i < list.length; i += 450) {
      const b = writeBatch(db)
      list.slice(i, i + 450).forEach((t) => b.set(doc(collection(db, COL)), clean(t)))
      await b.commit()
      done += Math.min(450, list.length - i); onProgress?.(done)
    }
    for (let i = 0; i < old.length; i += 450) {
      const b = writeBatch(db)
      old.slice(i, i + 450).forEach((r) => b.delete(r))
      await b.commit()
    }
  },
  async saveSettings(s) { await setDoc(doc(db, ...CFG_DOC), s) },
}

export const api = DEMO ? demoApi : fsApi

export function useAuth() {
  const [user, setUser] = useState(DEMO ? { email: 'demo' } : undefined)
  useEffect(() => { if (!DEMO) return onAuthStateChanged(auth, (u) => setUser(u || null)) }, [])
  const login = useCallback((email, pw) => signInWithEmailAndPassword(auth, email, pw), [])
  const logout = useCallback(() => (DEMO ? null : signOut(auth)), [])
  return { user, login, logout }
}

export function useData(enabled) {
  const [tickets, setTickets] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!enabled) return
    if (DEMO) {
      const load = () => {
        setTickets(lsRead(LS_T, []))
        setSettings({ ...DEFAULT_SETTINGS, ...lsRead(LS_S, {}) })
        setReady(true)
      }
      load(); listeners.add(load)
      return () => listeners.delete(load)
    }
    const u1 = onSnapshot(collection(db, COL), (snap) => {
      setTickets(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setReady(true)
    }, (e) => setError(e.message))
    const u2 = onSnapshot(doc(db, ...CFG_DOC), (d) => {
      setSettings({ ...DEFAULT_SETTINGS, ...(d.exists() ? d.data() : {}) })
    }, (e) => setError(e.message))
    return () => { u1(); u2() }
  }, [enabled])

  return { tickets, settings, ready, error }
}
