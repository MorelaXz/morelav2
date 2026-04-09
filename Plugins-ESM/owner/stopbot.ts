// @ts-nocheck
import fs   from 'fs'
import path from 'path'
import { botName } from '../../Library/utils.js'
import { removeJadibot, isJadibot, listJadibot, clearAllJadibot } from '../../Library/jadibotdb.js'

const sessionDir  = (nomor) => path.join(process.cwd(), 'sessions', 'jadibot', nomor)
const cleanNumber = (text)  => text.replace(/[^0-9]/g, '')

const handler = async (m: any, { reply, text, args }: any) => {
  if (!global.jadibotSessions) global.jadibotSessions = new Map()

  if (text && cleanNumber(text).length >= 8) {
    const nomor = cleanNumber(text)

    
    if (!global.jadibotSessions.has(nomor) && !isJadibot(nomor)) return reply(
      `⚠️ Tidak ada jadibot aktif untuk *+${nomor}*\n\n` +
      `Ketik *.listbot* untuk lihat semua jadibot aktif.`
    )

    try {
      
      if (global.jadibotSessions.has(nomor)) {
        await global.jadibotSessions.get(nomor).stop()
      } else {
        
        
        removeJadibot(nomor)
        const dir = sessionDir(nomor)
        if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
      }
      return reply(
        `✅ *Jadibot Dihentikan!*\n\n` +
        `📱 Nomor: *+${nomor}*\n` +
        `🗑️ Sesi telah dihapus.\n\n` +
        `꒰ © ${botName} ꒱`
      )
    } catch (e) {
      
      removeJadibot(nomor)
      global.jadibotSessions.delete(nomor)
      return reply(`✅ Jadibot *+${nomor}* dihentikan (force).`)
    }
  }

  if (args[0]?.toLowerCase() === 'all') {
    const activeList = listJadibot()
    const total = Math.max(global.jadibotSessions.size, activeList.length)
    if (total === 0) return reply('ℹ️ Tidak ada jadibot yang berjalan.')

    let stopped = 0

    
    for (const [nomor, session] of global.jadibotSessions.entries()) {
      try {
        await session.stop()
        stopped++
      } catch {
        removeJadibot(nomor)
        global.jadibotSessions.delete(nomor)
        stopped++
      }
    }

    
    for (const nomor of activeList) {
      if (!global.jadibotSessions.has(nomor)) {
        removeJadibot(nomor)
        const dir = sessionDir(nomor)
        if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
        stopped++
      }
    }

    clearAllJadibot()

    return reply(
      `✅ *Semua Jadibot Dihentikan!*\n\n` +
      `📊 Total: *${stopped}* jadibot dihentikan.\n\n` +
      `꒰ © ${botName} ꒱`
    )
  }

  return reply(
    `🛑 *STOPBOT*\n\n` +
    `*Format:*\n` +
    `_.stopbot 628xxxxxxxxxx_\n` +
    `_.stopbot all_ — hentikan semua\n\n` +
    `*Contoh:*\n` +
    `_.stopbot 628xxxxxxxxxx_\n\n` +
    `꒰ © ${botName} ꒱`
  )
}

handler.command = ['stopbot', 'stopjadibot']
handler.owner   = true
handler.noLimit = true
handler.tags    = ['owner']
handler.help    = ['stopbot <nomor>', 'stopbot all']

export default handler
