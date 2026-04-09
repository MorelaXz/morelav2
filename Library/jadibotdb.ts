

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'


declare global {
    
    var __jadibotCache__: Set<string> | null
}

const __dirname  = path.dirname(fileURLToPath(import.meta.url as string))
const DB_PATH    = path.join(__dirname, '../data/jadibot.json')



if (!globalThis.__jadibotCache__) globalThis.__jadibotCache__ = null

function loadCache(): Set<string> {
    if (globalThis.__jadibotCache__) return globalThis.__jadibotCache__
    try {
        if (fs.existsSync(DB_PATH)) {
            const raw  = fs.readFileSync(DB_PATH, 'utf-8')
            const list = JSON.parse(raw) as unknown[]
            globalThis.__jadibotCache__ = new Set(Array.isArray(list) ? list.map(String) : [])
        } else {
            globalThis.__jadibotCache__ = new Set()
            _writeFile(globalThis.__jadibotCache__)
        }
    } catch {
        globalThis.__jadibotCache__ = new Set()
    }
    return globalThis.__jadibotCache__ as Set<string>
}

function _writeFile(cache: Set<string>): void {
    try {
        const data = JSON.stringify([...cache], null, 2)
        fs.writeFileSync(DB_PATH, data, 'utf-8')
    } catch (e) {
        const err = e as Error
        console.error('[JADIBOTDB] Gagal tulis file:', err.message)
    }
}




export function isJadibot(nomor: unknown): boolean {
    if (!nomor) return false
    return loadCache().has(String(nomor).replace(/[^0-9]/g, ''))
}


export function hasAnyJadibot(): boolean {
    return loadCache().size > 0
}


export function listJadibot(): string[] {
    return [...loadCache()]
}


export function addJadibot(nomor: unknown): void {
    if (!nomor) return
    const clean = String(nomor).replace(/[^0-9]/g, '')
    if (!clean) return
    const cache = loadCache()
    cache.add(clean)
    _writeFile(cache)
}


export function removeJadibot(nomor: unknown): void {
    if (!nomor) return
    const clean = String(nomor).replace(/[^0-9]/g, '')
    const cache = loadCache()
    cache.delete(clean)
    _writeFile(cache)
    globalThis.__jadibotCache__ = null
    loadCache()
}


export function clearAllJadibot(): void {
    globalThis.__jadibotCache__ = new Set()
    _writeFile(globalThis.__jadibotCache__)
}


export function reloadJadibotCache(): void {
    globalThis.__jadibotCache__ = null
    loadCache()
}


export function syncWithSessions(sessions: unknown): void {
    if (!(sessions instanceof Map)) return
    const cache = loadCache()
    let changed = false
    for (const nomor of [...cache]) {
        if (!(sessions as Map<string, unknown>).has(nomor)) {
            cache.delete(nomor)
            changed = true
            console.log(`[JADIBOTDB] Hapus stale entry: ${nomor}`)
        }
    }
    if (changed) {
        _writeFile(cache)
        globalThis.__jadibotCache__ = cache
    }
}


loadCache()
