

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname  = path.dirname(fileURLToPath(import.meta.url as string))
const DATA_PATH  = path.join(__dirname, '../data/mainowner.json')


let _cache:     string | null = null
let _cacheTime: number        = 0
const TTL = 60 * 1000 

function _load(): string {
  const now = Date.now()
  if (_cache !== null && (now - _cacheTime) < TTL) return _cache
  try {
    if (fs.existsSync(DATA_PATH)) {
      const raw = fs.readFileSync(DATA_PATH, 'utf-8')
      const arr = JSON.parse(raw) as string[]
      _cache = Array.isArray(arr) ? (arr[0]?.replace(/[^0-9]/g, '') ?? '') : ''
    } else {
      
      const fallback = (global.mainOwner ?? '').replace(/[^0-9]/g, '')
      _cache = fallback
      if (fallback) _save(fallback)
    }
  } catch {
    _cache = (global.mainOwner ?? '').replace(/[^0-9]/g, '')
  }
  _cacheTime = now
  
  if (_cache) global.mainOwner = _cache
  return _cache
}

function _save(nomor: string): void {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify([nomor], null, 2), 'utf-8')
  } catch (e) {
    const err = e as Error
    console.error('[MAINOWNER] Gagal simpan:', err.message)
  }
}


export function getMainOwner(): string {
  return _load()
}


export function isMainOwner(nomor: string): boolean {
  if (!nomor) return false
  const mo = _load()
  return !!mo && nomor.replace(/[^0-9]/g, '') === mo
}


export function setMainOwner(nomor: string): void {
  const clean = nomor.replace(/[^0-9]/g, '')
  if (!clean) return
  _cache     = clean
  _cacheTime = Date.now()
  global.mainOwner = clean
  _save(clean)
}


export function reloadMainOwnerCache(): void {
  _cache     = null
  _cacheTime = 0
  _load()
}


_load()
