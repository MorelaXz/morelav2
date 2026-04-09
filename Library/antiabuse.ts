

import fs   from 'fs'
import path from 'path'
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import type { AbuseResult, AbuseStatus } from '../types/global.js'

const __dirname  = path.dirname(fileURLToPath(import.meta.url as string))
const DATA_DIR   = path.join(__dirname, '../data')
const ABUSE_PATH = path.join(DATA_DIR, 'antiabuse.json')


const CONFIG = {
  FLOOD_MAX_MSG     : 15,
  FLOOD_WINDOW_MS   : 5_000,
  FLOOD_MUTE_MS     : 60_000,
  CMD_RATE_DEFAULT  : 3_000,
  CMD_RATE_HEAVY    : 10_000,
  CMD_RATE_LIGHT    : 1_500,
  SPAM_CMD_MAX      : 5,
  SPAM_CMD_WINDOW   : 30_000,
  SPAM_CMD_MUTE_MS  : 120_000,
  MAX_WARNINGS      : 3,
  CLEANUP_INTERVAL  : 10 * 60_000
}

const HEAVY_COMMANDS = new Set([
  'ytmp3', 'ytmp4', 'play', 'spotify', 'soundcloud',
  'tiktok', 'ig', 'fb', 'pin', 'mediafire', 'alldownload',
  'ai', 'autoai', 'autoai2', 'img', 'image', 'genmart',
  'klingai', 'toanime', 'mathgpt', 'hd', 'hdv1', 'hdv2',
  'removebg', 'removewm', 'stiker', 'attp', 'ttp', 'carbon'
])

const LIGHT_COMMANDS = new Set([
  'ping', 'speed', 'runtime', 'uptime', 'menu',
  'morela', 'totalfitur', 'q', 'quote'
])


type FloodData = { timestamps: number[]; mutedUntil: number }
type SpamData  = { times: number[];      mutedUntil: number }
type WarnEntry = { count: number; lastAt: number }
type WarnStore = Record<string, WarnEntry>


const _floodMap   = new Map<string, FloodData>()
const _cmdRateMap = new Map<string, number>()
const _spamCmdMap = new Map<string, SpamData>()
const _muteMap    = new Map<string, number>()


let _warnData: WarnStore = {}

function _loadWarnData(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    if (fs.existsSync(ABUSE_PATH)) {
      _warnData = JSON.parse(fs.readFileSync(ABUSE_PATH, 'utf-8')) as WarnStore
    }
  } catch {
    _warnData = {}
  }
}

let _saveTimer: ReturnType<typeof setTimeout> | null = null

function _scheduleWarnSave(): void {
  if (_saveTimer) clearTimeout(_saveTimer)
  _saveTimer = setTimeout(() => {
    _saveTimer = null
    try {
      fs.writeFileSync(ABUSE_PATH, JSON.stringify(_warnData, null, 2))
    } catch (e) {
      const err = e as Error
      console.error(chalk.red('[ANTIABUSE] Gagal simpan data warning:', err.message))
    }
  }, 2000)
}

_loadWarnData()


function isMuted(jid: string): boolean {
  const until = _muteMap.get(jid) ?? 0
  if (Date.now() < until) return true
  if (until > 0) _muteMap.delete(jid)
  return false
}

function setMute(jid: string, durationMs: number): void {
  _muteMap.set(jid, Date.now() + durationMs)
}


function getWarnings(jid: string): number {
  return _warnData[jid]?.count ?? 0
}

function addWarning(jid: string): number {
  if (!_warnData[jid]) _warnData[jid] = { count: 0, lastAt: 0 }
  _warnData[jid].count++
  _warnData[jid].lastAt = Date.now()
  _scheduleWarnSave()
  return _warnData[jid].count
}

function resetWarning(jid: string): void {
  delete _warnData[jid]
  _scheduleWarnSave()
}


function getCmdRate(command: string): number {
  if (HEAVY_COMMANDS.has(command)) return CONFIG.CMD_RATE_HEAVY
  if (LIGHT_COMMANDS.has(command)) return CONFIG.CMD_RATE_LIGHT
  return CONFIG.CMD_RATE_DEFAULT
}




export function checkAbuse(jid: string, command: string | null = null): AbuseResult {
  const now = Date.now()

  
  if (isMuted(jid)) {
    const remaining = Math.ceil(((  _muteMap.get(jid) ?? 0) - now) / 1000)
    return {
      allowed: false,
      reason:  'muted',
      action:  `Kamu sedang di-mute. Tunggu *${remaining} detik* lagi.`
    }
  }

  
  if (!_floodMap.has(jid)) _floodMap.set(jid, { timestamps: [], mutedUntil: 0 })
  const floodData = _floodMap.get(jid)!

  floodData.timestamps = floodData.timestamps.filter(t => now - t < CONFIG.FLOOD_WINDOW_MS)
  floodData.timestamps.push(now)

  if (floodData.timestamps.length > CONFIG.FLOOD_MAX_MSG) {
    const warns = addWarning(jid)
    setMute(jid, CONFIG.FLOOD_MUTE_MS)
    floodData.timestamps = []

    const isBlacklist = warns >= CONFIG.MAX_WARNINGS
    return {
      allowed:       false,
      reason:        'flood',
      shouldWarn:    true,
      autoBlacklist: isBlacklist,
      action:
        `⚠️ *Flood Detected!*\n\n` +
        `Kamu mengirim pesan terlalu cepat!\n` +
        `Di-mute selama *${CONFIG.FLOOD_MUTE_MS / 1000} detik*.\n\n` +
        `⚠️ Warning: *${warns}/${CONFIG.MAX_WARNINGS}*` +
        (isBlacklist ? `\n\n🚫 Kamu telah di-*blacklist* karena terlalu sering melanggar!` : '')
    }
  }

  
  if (command) {
    const rateKey  = `${jid}:${command}`
    const lastUsed = _cmdRateMap.get(rateKey) ?? 0
    const rateMs   = getCmdRate(command)
    const elapsed  = now - lastUsed

    if (lastUsed > 0 && elapsed < rateMs) {
      const sisa = Math.ceil((rateMs - elapsed) / 1000)
      return {
        allowed: false,
        reason:  'rate_limit',
        action:  `⏳ Pelan-pelan! Tunggu *${sisa}s* sebelum pakai *.${command}* lagi.`
      }
    }
    _cmdRateMap.set(rateKey, now)

    
    const spamKey = `${jid}:${command}`
    if (!_spamCmdMap.has(spamKey)) _spamCmdMap.set(spamKey, { times: [], mutedUntil: 0 })
    const spamData = _spamCmdMap.get(spamKey)!

    spamData.times = spamData.times.filter(t => now - t < CONFIG.SPAM_CMD_WINDOW)
    spamData.times.push(now)

    if (spamData.times.length >= CONFIG.SPAM_CMD_MAX) {
      const warns = addWarning(jid)
      setMute(jid, CONFIG.SPAM_CMD_MUTE_MS)
      spamData.times = []

      const isBlacklist = warns >= CONFIG.MAX_WARNINGS
      return {
        allowed:       false,
        reason:        'spam_command',
        shouldWarn:    true,
        autoBlacklist: isBlacklist,
        action:
          `⚠️ *Spam Command Detected!*\n\n` +
          `Kamu terlalu sering pakai *.${command}*!\n` +
          `Di-mute selama *${CONFIG.SPAM_CMD_MUTE_MS / 1000} detik*.\n\n` +
          `⚠️ Warning: *${warns}/${CONFIG.MAX_WARNINGS}*` +
          (isBlacklist ? `\n\n🚫 Kamu telah di-*blacklist* karena terlalu sering melanggar!` : '')
      }
    }
  }

  return { allowed: true }
}


export function resetAbuse(jid: string): void {
  _muteMap.delete(jid)
  _floodMap.delete(jid)
  _spamCmdMap.forEach((_, k) => { if (k.startsWith(jid)) _spamCmdMap.delete(k) })
  _cmdRateMap.forEach((_, k) => { if (k.startsWith(jid)) _cmdRateMap.delete(k) })
  resetWarning(jid)
  console.log(chalk.cyan(`[ANTIABUSE] Reset untuk ${jid}`))
}


export function getAbuseStatus(jid: string): AbuseStatus {
  const now     = Date.now()
  const muted   = isMuted(jid)
  const muteEnd = _muteMap.get(jid) ?? 0
  const warns   = getWarnings(jid)
  const flood   = _floodMap.get(jid)?.timestamps?.length ?? 0

  return {
    jid,
    muted,
    muteRemaining: muted ? Math.ceil((muteEnd - now) / 1000) : 0,
    warnings: warns,
    recentMessages: flood
  }
}


setInterval(() => {
  const now = Date.now()
  let cleaned = 0

  for (const [jid, data] of _floodMap) {
    data.timestamps = data.timestamps.filter(t => now - t < CONFIG.FLOOD_WINDOW_MS)
    if (data.timestamps.length === 0) { _floodMap.delete(jid); cleaned++ }
  }

  for (const [key, data] of _spamCmdMap) {
    data.times = data.times.filter(t => now - t < CONFIG.SPAM_CMD_WINDOW)
    if (data.times.length === 0) { _spamCmdMap.delete(key); cleaned++ }
  }

  for (const [jid, until] of _muteMap) {
    if (now >= until) { _muteMap.delete(jid); cleaned++ }
  }

  for (const [key, time] of _cmdRateMap) {
    if (now - time > 60_000) { _cmdRateMap.delete(key); cleaned++ }
  }

  if (cleaned > 0) console.log(chalk.gray(`[ANTIABUSE] Cleanup: ${cleaned} entri dihapus`))
}, CONFIG.CLEANUP_INTERVAL)

export { CONFIG, getWarnings, addWarning, resetWarning, isMuted, setMute }
export default { checkAbuse, resetAbuse, getAbuseStatus, CONFIG }
