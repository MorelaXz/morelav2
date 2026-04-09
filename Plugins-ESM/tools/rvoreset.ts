import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { resetTgGlobal } from '../../Library/tg_global.js'

const __dirname   = path.dirname(fileURLToPath(import.meta.url as string))
const CONFIG_PATH = path.join(__dirname, '../../data/rvo_tg.json')

function loadCfg() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return { enabled: false, token: '', chatId: '' }
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
  } catch { return { enabled: false, token: '', chatId: '' } }
}

function saveCfg(data: unknown[]) {
  try { fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2)) } catch {}
}

const handler = async (m: any, { reply, args }: any) => {
  const sub = args[0]?.toLowerCase()
  const cfg = loadCfg()

  if (sub === 'token') {
    cfg.token = ''
    saveCfg(cfg)
    return reply('✅ Token berhasil direset!')
  }

  if (sub === 'id') {
    cfg.chatId = ''
    saveCfg(cfg)
    return reply('✅ Chat ID berhasil direset!')
  }

  if (sub === 'all') {
    cfg.token   = ''
    cfg.chatId  = ''
    cfg.enabled = false
    saveCfg(cfg)
    resetTgGlobal() 
    return reply('✅ Token & Chat ID direset!\nStatus: OFF\n\n⚠️ Global Telegram config juga direset.\nSemua modul (tgspy, backup, remote) ikut ter-reset.')
  }

  return reply('❌ Format:\n.rvoreset token\n.rvoreset id\n.rvoreset all')
}

handler.command = ['rvoreset']
handler.owner   = true
handler.noLimit = true
handler.tags    = ['owner']
handler.help    = ['rvoreset token/id/all']

export default handler