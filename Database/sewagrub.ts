

import fs    from 'fs'
import path  from 'path'
import chalk from 'chalk'
import { fileURLToPath } from 'url'

const __dirname  = path.dirname(fileURLToPath(import.meta.url as string))
const DATA_PATH  = path.join(__dirname, '../data/SewaGrub.json')

export interface SewaGrubEntry {
  groupId:         string   
  groupName:       string   
  ownerJid:        string   
  startDate:       string   
  expiryDate:      string   
  expiryTimestamp: number   
  addedBy:         string   
}

type SewaStore = Record<string, SewaGrubEntry>


let _cache: SewaStore | null = null

function _load(): SewaStore {
  if (_cache) return _cache
  try {
    if (fs.existsSync(DATA_PATH)) {
      _cache = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8')) as SewaStore
      console.log(chalk.green.bold(`✅ SewaGrub DB ready → ${Object.keys(_cache).length} grup`))
    } else {
      _cache = {}
      _save(_cache)
      console.log(chalk.green.bold('✅ SewaGrub DB created →'), chalk.cyan(DATA_PATH))
    }
  } catch (e) {
    console.warn(chalk.yellow('[SEWAGRUB] Gagal load:', (e as Error).message))
    _cache = {}
  }
  return _cache
}

function _save(data: SewaStore): void {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8')
  } catch (e) {
    console.error(chalk.red('[SEWAGRUB] Gagal simpan:', (e as Error).message))
  }
}




export function setSewa(entry: SewaGrubEntry): void {
  const store = _load()
  store[entry.groupId] = entry
  _cache = store
  _save(store)
}


export function getSewa(groupId: string): SewaGrubEntry | null {
  return _load()[groupId] ?? null
}


export function delSewa(groupId: string): boolean {
  const store = _load()
  if (!store[groupId]) return false
  delete store[groupId]
  _cache = store
  _save(store)
  return true
}


export function getAllSewa(): SewaStore {
  return { ..._load() }
}


export function getExpiredSewa(): SewaGrubEntry[] {
  const now = Date.now()
  return Object.values(_load()).filter(e => e.expiryTimestamp <= now)
}


export function reloadSewaCache(): void {
  _cache = null
  _load()
}


_load()
