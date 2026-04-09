import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { BotStats } from '../types/global.js'

const __dirname  = path.dirname(fileURLToPath(import.meta.url as string))
const STATS_PATH = path.join(__dirname, '../data/stats.json')

let _stats:      BotStats | null = null
let _dirty:      boolean         = false
let _saveTimer:  ReturnType<typeof setTimeout> | null = null

function defaultStats(): BotStats {
  return {
    commands:  {},
    users:     {},
    hours:     {},
    days:      {},
    total:     0,
    startedAt: Date.now()
  }
}

export function initStats(): void {
  try {
    if (fs.existsSync(STATS_PATH)) {
      _stats = JSON.parse(fs.readFileSync(STATS_PATH, 'utf-8')) as BotStats
    } else {
      _stats = defaultStats()
      fs.writeFileSync(STATS_PATH, JSON.stringify(_stats, null, 2))
    }
  } catch {
    _stats = defaultStats()
  }
}

function scheduleSave(): void {
  if (_saveTimer) return
  _saveTimer = setTimeout(() => {
    _saveTimer = null
    if (!_dirty || !_stats) return
    try {
      fs.writeFileSync(STATS_PATH, JSON.stringify(_stats, null, 2))
      _dirty = false
    } catch {  }
  }, 3000)
}

export function trackCommand(command: string, senderJid: string): void {
  if (!_stats) initStats()
  if (!_stats) return

  const now  = new Date()
  const hour = now.getHours().toString()
  const day  = now.toLocaleDateString('id-ID', { weekday: 'long' })

  _stats.commands[command] = (_stats.commands[command] ?? 0) + 1
  _stats.users[senderJid]  = (_stats.users[senderJid]  ?? 0) + 1
  _stats.hours[hour]       = (_stats.hours[hour]        ?? 0) + 1
  _stats.days[day]         = (_stats.days[day]          ?? 0) + 1
  _stats.total             = (_stats.total              ?? 0) + 1

  _dirty = true
  scheduleSave()
}

export function getStats(): BotStats {
  if (!_stats) initStats()
  return _stats ?? defaultStats()
}

export function resetStats(): void {
  _stats = defaultStats()
  _dirty = true
  scheduleSave()
}
