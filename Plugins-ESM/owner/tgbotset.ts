

import axios from 'axios'
import { getTgToken, getTgChatId, setTgToken, setTgChatId, resetTgGlobal, loadTgGlobal } from '../../Library/tg_global.js'

const handler = async (m: any, { reply, args }: any) => {
  const sub = args[0]?.toLowerCase()

  
  if (!sub) {
    const token  = getTgToken()
    const chatId = getTgChatId()
    return reply(
      `╭──「 📡 *Telegram Config* 」\n` +
      `│\n` +
      `│ Token   : ${token  ? '✅ Set' : '❌ Belum'}\n` +
      `│ Chat ID : ${chatId ? `✅ ${chatId}` : '❌ Belum'}\n` +
      `│\n` +
      `│ ⚡ Satu config untuk:\n` +
      `│ tgspy · rvo · backup · remote\n` +
      `│\n` +
      `│ .tgbot token <TOKEN>\n` +
      `│ .tgbot id <CHAT_ID>\n` +
      `│ .tgbot test\n` +
      `│ .tgbot on / off\n` +
      `│ .tgbot reset\n` +
      `╰─────────────────────`
    )
  }

  
  if (sub === 'token') {
    const val = args.slice(1).join(' ').trim()
    if (!val) return reply('❌ Format: .tgbot token <TOKEN>')
    setTgToken(val)
    return reply(`✅ Token disimpan!\nBerlaku untuk tgspy, rvo, backup & remote.\nPreview: ${val.slice(0, 12)}...`)
  }

  
  if (sub === 'id') {
    const val = args.slice(1).join(' ').trim()
    if (!val) return reply('❌ Format: .tgbot id <CHAT_ID>\n\nCara dapat: chat @userinfobot di Telegram')
    setTgChatId(val)
    return reply(`✅ Chat ID disimpan: ${val}\nBerlaku untuk tgspy, rvo, backup & remote.`)
  }

  
  if (sub === 'on') {
    const token  = getTgToken()
    const chatId = getTgChatId()
    if (!token || !chatId) return reply('❌ Set token & id dulu!\n.tgbot token <TOKEN>\n.tgbot id <ID>')
    try {
      const { startTgBot } = await import('../../tgbot.js')
      startTgBot()
    } catch {}
    return reply(
      `✅ *Telegram aktif!*\n\n` +
      `Berlaku untuk:\n` +
      `📡 Remote control\n` +
      `🔍 TG Spy\n` +
      `🔓 RVO backup\n` +
      `💾 Backup panel`
    )
  }

  
  if (sub === 'off') {
    try {
      const { stopTgBot } = await import('../../tgbot.js')
      stopTgBot()
    } catch {}
    return reply('❌ Telegram Remote *dimatikan.*')
  }

  
  if (sub === 'test') {
    const token  = getTgToken()
    const chatId = getTgChatId()
    if (!token || !chatId) return reply('❌ Token atau Chat ID belum diset!')
    await reply('⏳ Tes koneksi...')
    try {
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id:    chatId,
        text:       `✅ *Morela - Test Koneksi*\n\n🕐 ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
        parse_mode: 'Markdown'
      }, { timeout: 10000 })
      return reply('✅ Berhasil! Cek Telegram kamu.')
    } catch (e) {
      return reply(`❌ Gagal: ${(e as Error).message}`)
    }
  }

  
  if (sub === 'reset') {
    resetTgGlobal()
    try {
      const { stopTgBot } = await import('../../tgbot.js')
      stopTgBot()
    } catch {}
    return reply('✅ Semua config Telegram direset!\n\ntgspy · rvo · backup · remote → semua terhapus')
  }

  return reply('❌ Tidak dikenal.\nKetik *.tgbot* untuk bantuan.')
}

handler.command = ['tgbot', 'tgbotset']
handler.owner   = true
handler.noLimit = true
handler.tags    = ['owner']
handler.help    = ['tgbot on/off', 'tgbot token <T>', 'tgbot id <ID>', 'tgbot reset']

export default handler
