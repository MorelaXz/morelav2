import { botName } from '../../Library/utils.js'
import { DateTime } from 'luxon'

function formatUptime(ms: number) {
  const jam   = Math.floor(ms / 3600000)
  const menit = Math.floor((ms % 3600000) / 60000)
  const detik = Math.floor((ms % 60000) / 1000)
  if (jam > 0)   return `${jam}j ${menit}m`
  if (menit > 0) return `${menit}m ${detik}d`
  return `${detik}d`
}

const handler = async (m: any, { Morela, reply }: any) => {
  if (!global.jadibotSessions) global.jadibotSessions = new Map()

  const now = Date.now()
  let no = 1

  let msg =
    `🤖 *LIST SEMUA BOT*\n` +
    `╭────────────────────\n`

  
  const mainNum    = Morela?.user?.id?.split(':')[0]?.split('@')[0] || '?'
  const waUptime   = process.uptime()
  const waJam      = Math.floor(waUptime / 3600)
  const waMenit    = Math.floor((waUptime % 3600) / 60)
  const waUptimeStr = waJam > 0 ? `${waJam}j ${waMenit}m` : `${waMenit}m`
  const waStatus   = Morela?.user?.id ? '🟢 Online' : '🔴 Offline'

  msg +=
    `│\n` +
    `│ ${no++}. 📱 *Bot Utama*\n` +
    `│    📞 +${mainNum}\n` +
    `│    ${waStatus}\n` +
    `│    ⏱️ Uptime: ${waUptimeStr}\n`

  
  const jadibots = [...global.jadibotSessions.entries()]
  for (const [nomor, session] of jadibots) {
    const uptime = formatUptime(now - (session.startedAt || now))
    msg +=
      `│\n` +
      `│ ${no++}. 🤖 *Jadibot*\n` +
      `│    📞 +${nomor}\n` +
      `│    🟢 Online\n` +
      `│    ⏱️ Uptime: ${uptime}\n`
  }

  
  const tgToken  = global.tgBot?.token   || ''
  const tgStatus = tgToken ? '🟢 Aktif' : '🔴 Belum setup'
  const tgId     = global.tgBot?.ownerId || '-'
  msg +=
    `│\n` +
    `│ ${no++}. 📡 *Telegram Bot*\n` +
    `│    ${tgStatus}\n` +
    (tgToken ? `│    👤 Owner ID: ${tgId}\n` : `│    Ketik .tgbot untuk setup\n`)

  
  const totalBot = 1 + jadibots.length + 1
  msg +=
    `│\n` +
    `╰────────────────────\n\n` +
    `📊 Total: *${no - 1} bot terdaftar*\n` +
    (jadibots.length > 0 ? `_Ketik .stopbot <nomor> untuk hentikan jadibot_\n\n` : `\n`) +
    `꒰ © ${botName} ꒱`

  reply(msg)
}

handler.command = ['listbot', 'listjadibot', 'botlist', 'daftarbot']
handler.owner   = true
handler.noLimit = true
handler.tags    = ['owner']
handler.help    = ['listbot — lihat semua jadibot aktif']

export default handler