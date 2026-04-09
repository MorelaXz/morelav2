

import fs    from 'fs'
import path  from 'path'
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import type { LimitEntry, LimitResult } from '../types/global.js'

const __dirname  = path.dirname(fileURLToPath(import.meta.url as string))
const DB_DIR     = path.join(__dirname, '../data')
const LIMIT_PATH = path.join(DB_DIR, 'usagelimit.json')

export const DAILY_LIMIT = 15
export const RESET_MS    = 24 * 60 * 60 * 1000

type LimitStore = Record<string, LimitEntry>

let _limitData: LimitStore | null = null
let _writeTimer: ReturnType<typeof setTimeout> | null = null

function scheduleWrite(): void {
  if (_writeTimer) clearTimeout(_writeTimer)
  _writeTimer = setTimeout(async () => {
    _writeTimer = null
    try {
      await fs.promises.writeFile(LIMIT_PATH, JSON.stringify(_limitData, null, 2))
    } catch (e) {
      const err = e as Error
      console.error(chalk.red('❌ [LIMIT] Gagal simpan usagelimit.json:', err.message))
    }
  }, 2000)
}

function load(): LimitStore {
  if (_limitData) return _limitData
  try {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })
    if (fs.existsSync(LIMIT_PATH)) {
      _limitData = JSON.parse(fs.readFileSync(LIMIT_PATH, 'utf-8')) as LimitStore
    } else {
      _limitData = {}
      fs.writeFileSync(LIMIT_PATH, '{}')
      console.log(chalk.green('✅ [LIMIT] usagelimit.json dibuat'))
    }
  } catch {
    console.warn(chalk.yellow('⚠️ [LIMIT] Gagal baca usagelimit.json, reset ke {}'))
    _limitData = {}
  }
  return _limitData
}

function cleanJid(jid: string): string {
  if (!jid) return ''
  return jid.replace(/@.*/, '').replace(/[^0-9]/g, '') + '@s.whatsapp.net'
}


export function getUserDailyLimit(level: number = 0): number {
  const tier = Math.floor((level ?? 0) / 15)
  return DAILY_LIMIT + (tier * 5)
}


export function checkLimit(jid: string, maxLimit: number = DAILY_LIMIT): LimitResult {
  const data = load()
  const key  = cleanJid(jid)
  if (!key || key === '@s.whatsapp.net') {
    return { allowed: true, count: 0, sisa: maxLimit }
  }

  const entry = data[key]
  if (!entry) return { allowed: true, count: 0, sisa: maxLimit }

  const now = Date.now()

  
  if (entry.limitHitAt) {
    const selisih = now - entry.limitHitAt
    if (selisih >= RESET_MS) {
      data[key] = { count: 0, limitHitAt: null }
      _limitData = data
      scheduleWrite()
      return { allowed: true, count: 0, sisa: maxLimit }
    }
    return {
      allowed:    false,
      resetAt:    entry.limitHitAt + RESET_MS,
      limitHitAt: entry.limitHitAt
    }
  }

  
  if (entry.count >= maxLimit) {
    data[key].limitHitAt = now
    _limitData = data
    scheduleWrite()
    return {
      allowed:    false,
      resetAt:    now + RESET_MS,
      limitHitAt: now
    }
  }

  return {
    allowed: true,
    count:   entry.count ?? 0,
    sisa:    maxLimit - (entry.count ?? 0)
  }
}


export function addUsage(jid: string, maxLimit: number = DAILY_LIMIT): void {
  const data = load()
  const key  = cleanJid(jid)
  if (!key || key === '@s.whatsapp.net') return

  if (!data[key]) data[key] = { count: 0, limitHitAt: null }

  data[key].count = (data[key].count ?? 0) + 1

  if (data[key].count >= maxLimit && !data[key].limitHitAt) {
    data[key].limitHitAt = Date.now()
    console.log(chalk.yellow(`[LIMIT] ${key} kena limit hari ini (${maxLimit}x)`))
  }

  _limitData = data
  scheduleWrite()
}


export function getUsage(jid: string, maxLimit: number = DAILY_LIMIT): {
  count: number; limitHitAt: number | null; sisa: number
} {
  const data  = load()
  const key   = cleanJid(jid)
  const entry = data[key] ?? { count: 0, limitHitAt: null }
  return {
    count:      entry.count      ?? 0,
    limitHitAt: entry.limitHitAt ?? null,
    sisa:       Math.max(0, maxLimit - (entry.count ?? 0))
  }
}

export function resetLimit(jid: string): boolean {
  const data = load()
  const key  = cleanJid(jid)
  if (!key || key === '@s.whatsapp.net') return false
  data[key] = { count: 0, limitHitAt: null }
  _limitData = data
  scheduleWrite()
  return true
}

export function getAllUsage(): LimitStore { return load() }

export function initLimitDB(): void {
  load()
  console.log(chalk.green.bold(`✅ Usage Limit DB ready → base limit ${DAILY_LIMIT}x/hari (dinamis per level)`))
}

export function clearAllLimits(): void {
  _limitData = {}
  scheduleWrite()
}


export function cancelPendingWrite(): void {
  if (_writeTimer) { clearTimeout(_writeTimer); _writeTimer = null }
  console.log(chalk.cyan('[LIMIT] Pending write dibatalkan'))
}

export default {
  checkLimit, addUsage, resetLimit,
  getUsage, getAllUsage, initLimitDB,
  clearAllLimits, getUserDailyLimit,
  DAILY_LIMIT, RESET_MS
}
