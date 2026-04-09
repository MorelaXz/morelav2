

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'


declare global {
  
  var tgspy: { token: string; chatId: string } | undefined
}

const __dirname   = path.dirname(fileURLToPath(import.meta.url as string))
const CONFIG_PATH = path.join(__dirname, '../data/tg_global.json')

interface TgConfig {
  token:  string
  chatId: string
}

function _load(): TgConfig {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify({ token: '', chatId: '' }, null, 2))
      return { token: '', chatId: '' }
    }
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as TgConfig
  } catch { return { token: '', chatId: '' } }
}

function _save(data: TgConfig): void {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2))
    if (!global.tgGlobal) global.tgGlobal = { token: '', chatId: '' }
    global.tgGlobal.token  = data.token  || ''
    global.tgGlobal.chatId = data.chatId || ''
    if (!global.tgBot) global.tgBot = { token: '', ownerId: '' }
    global.tgBot.token   = data.token  || ''
    global.tgBot.ownerId = data.chatId || ''
  } catch {}
}


export function getTgToken():  string { return global.tgGlobal?.token  || _load().token  || '' }
export function getTgChatId(): string { return global.tgGlobal?.chatId || _load().chatId || '' }

export function setTgToken(val: unknown):  void { const c = _load(); c.token  = String(val || ''); _save(c) }
export function setTgChatId(val: unknown): void { const c = _load(); c.chatId = String(val || ''); _save(c) }

export function resetTgGlobal(): void {
  _save({ token: '', chatId: '' })
  if (global.tgspy) { global.tgspy.token = ''; global.tgspy.chatId = '' }
}

export function loadTgGlobal(): TgConfig { return _load() }
export function saveTgGlobal(data: TgConfig): void { _save(data) }

export function initTgGlobal(): void {
  const cfg = _load()
  if (!cfg.token && !cfg.chatId) return
  _save(cfg)
  console.log('[TG_GLOBAL] ✅ Config loaded')
}
