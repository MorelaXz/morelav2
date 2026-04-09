// @ts-nocheck
import axios        from 'axios'
import cron         from 'node-cron'
import fs           from 'fs'
import { DateTime } from 'luxon'
import {
  bi, imagePath, botName, CHANNEL_URL,
  buildFkontak
} from '../../Library/utils.js'
import { getGroup, updateGroup, getAllGroups } from '../../Database/db.js'

const TZ        = 'Asia/Jakarta'
const API_KEY   = 'LBvaK7'
const CACHE_TTL = 30 * 60 * 1000  


let _cache: unknown[]  = []
let _cacheTime         = 0

async function fetchJadwal(): Promise<unknown[]> {
  const now = Date.now()
  if (_cache.length && (now - _cacheTime) < CACHE_TTL) return _cache

  const r = await axios.get(`https://api.neoxr.eu/api/bola?apikey=${API_KEY}`, { timeout: 15000 })
  if (!r.data?.status || !Array.isArray(r.data?.data) || !r.data.data.length)
    throw new Error('Tidak ada jadwal tersedia dari API')

  _cache     = r.data.data
  _cacheTime = now
  return _cache
}


const LEAGUE_EMOJI: Record<string, string> = {
  'liga inggris':  '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'premier league': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'liga italia':   '🇮🇹',         'serie a':         '🇮🇹',
  'liga spanyol':  '🇪🇸',         'la liga':          '🇪🇸',
  'liga jerman':   '🇩🇪',         'bundesliga':       '🇩🇪',
  'liga prancis':  '🇫🇷',         'ligue 1':          '🇫🇷',
  'liga belanda':  '🇳🇱',         'eredivisie':       '🇳🇱',
  'liga champions':'🏆',          'champions league': '🏆', 'ucl': '🏆',
  'liga europa':   '🟠',
  'bri super league': '🇮🇩',     'liga 1':           '🇮🇩',
}

function getLeagueEmoji(league: string): string {
  const lower = (league || '').toLowerCase()
  for (const [key, emoji] of Object.entries(LEAGUE_EMOJI)) {
    if (lower.includes(key) || key.includes(lower)) return emoji
  }
  return '⚽'
}


function formatJadwal(matches: unknown[], filter = ''): string {
  const grouped: Record<string, unknown[]> = {}
  for (const match of matches.slice(0, 50)) {
    const date = (match as any).date || 'TBA'
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(match)
  }

  let text = `╭╌╌⬡「 ⚽ *${bi('Jadwal Bola')}* 」\n`
  if (filter) text += `┃ 🔍 Filter : *${filter}*\n`
  text += `┃ 📊 Total  : *${matches.length} pertandingan*\n┃\n`

  for (const [date, games] of Object.entries(grouped)) {
    text += `┃ 📅 *${date}*\n`
    for (const g of games as any[]) {
      const emoji = getLeagueEmoji(g.league)
      text += `┃ ${emoji} ${g.league}\n`
      text += `┃   ⏰ ${g.time || 'TBA'} WIB\n`
      text += `┃   🏠 ${g.home_team} 🆚 ${g.away_team}\n`
      text += `┃\n`
    }
  }

  text += `╰╌╌⬡\n\n© ${botName}`
  return text
}


function formatNotif(matches: unknown[]): string {
  const now = DateTime.now().setZone(TZ)
  let text =
    `╭╌╌⬡「 ⚽ *${bi('Jadwal Bola Malam Ini')}* 」\n` +
    `┃ 📅 *${now.toFormat('cccc, d MMMM yyyy', { locale: 'id' })}*\n` +
    `┃\n`

  for (const g of (matches as any[]).slice(0, 10)) {
    const emoji = getLeagueEmoji(g.league)
    text += `┃ ${emoji} *${g.league}*\n`
    text += `┃   ⏰ ${g.time || 'TBA'} WIB\n`
    text += `┃   🏠 ${g.home_team}\n`
    text += `┃   ✈️  ${g.away_team}\n`
    text += `┃\n`
  }

  if (matches.length > 10)
    text += `┃ ...dan ${matches.length - 10} pertandingan lainnya\n┃\n`

  text += `╰╌╌⬡\n\n© ${botName}`
  return text
}


function getJadwalCfg(groupJid: string) {
  return (getGroup(groupJid) as any)?.jadwalbola ?? null
}
function setJadwalCfg(groupJid: string, data: unknown) {
  updateGroup(groupJid, { jadwalbola: data })
}
function getAllActive(): Record<string, any> {
  const all = getAllGroups()
  const res: Record<string, any> = {}
  for (const [jid, g] of Object.entries(all)) {
    if ((g as any)?.jadwalbola?.active) res[jid] = (g as any).jadwalbola
  }
  return res
}


let _cron: ReturnType<typeof cron.schedule> | null = null

function getSock(): any {
  return (globalThis as any).__sock__ ?? null
}

function startScheduler(): void {
  if (_cron) { _cron.stop(); _cron = null }

  _cron = cron.schedule('* * * * *', async () => {
    const sock = getSock()
    if (!sock) return

    const now    = DateTime.now().setZone(TZ)
    const hour   = now.hour
    const minute = now.minute
    const active = getAllActive()

    if (!Object.keys(active).length) return

    for (const [groupJid, cfg] of Object.entries(active)) {
      const notifHour = cfg.hour   ?? 18
      const notifMin  = cfg.minute ?? 0
      if (hour !== notifHour || minute !== notifMin) continue

      try {
        const matches = await fetchJadwal()
        if (!matches?.length) continue

        const thumb = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : undefined

        let fk: any = null
        try { fk = await buildFkontak(sock) } catch {}

        await sock.sendMessage(groupJid, {
          text: formatNotif(matches),
          contextInfo: {
            externalAdReply: {
              title:                 `⚽ Jadwal Bola ${now.toFormat('d MMM')}`,
              body:                  `${botName} Multidevice 🔥`,
              mediaType:             1,
              renderLargerThumbnail: false,
              showAdAttribution:     false,
              sourceUrl:             CHANNEL_URL,
              thumbnail:             thumb
            }
          }
        }, { quoted: fk ?? undefined })

        console.log(`[JADWALBOLA] ✅ Notif terkirim → ${groupJid}`)
      } catch (e) {
        console.error(`[JADWALBOLA] ❌ Gagal → ${groupJid}:`, (e as Error).message)
      }
    }
  }, { timezone: TZ })

  console.log('[JADWALBOLA] ✅ Scheduler aktif (cek tiap menit)')
}


startScheduler()


const handler = async (m: any, { Morela, reply, args, text, isOwn, isAdmin, usedPrefix, command }: any) => {
  
  ;(globalThis as any).__sock__ = Morela

  const thumb = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : undefined
  const from  = m.chat as string
  const sub   = (args[0] || '').toLowerCase()

  
  let fkontak: any = null
  try { fkontak = await buildFkontak(Morela) } catch {}

  const sendMsg = (txt: string, title = '⚽ Jadwal Bola') =>
    Morela.sendMessage(from, {
      text: txt,
      contextInfo: {
        externalAdReply: {
          title,
          body:                  `${botName} Multidevice 🔥`,
          mediaType:             1,
          renderLargerThumbnail: false,
          showAdAttribution:     false,
          sourceUrl:             CHANNEL_URL,
          thumbnail:             thumb
        }
      }
    }, { quoted: fkontak || m })

  
  if (sub === 'on' || sub === 'aktif') {
    if (!m.isGroup)             return reply('❌ Fitur ini hanya untuk grup!')
    if (!isOwn && !isAdmin)     return reply('❌ Hanya admin grup atau owner!')

    let hour = 18, minute = 0
    const jamArg = args[1]
    if (jamArg) {
      const parts = jamArg.replace('.', ':').split(':')
      hour   = parseInt(parts[0]) || 18
      minute = parseInt(parts[1]) || 0
    }

    setJadwalCfg(from, { active: true, hour, minute })

    return sendMsg(
      `╭╌╌⬡「 ⚽ *${bi('Jadwal Bola ON')}* 」\n` +
      `┃\n` +
      `┃ ✅ Notif jadwal bola *aktif!*\n` +
      `┃ ⏰ Notif otomatis dikirim tiap:\n` +
      `┃    *${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')} WIB*\n` +
      `┃\n` +
      `┃ Ubah jam: \`${usedPrefix}${command} on 20:00\`\n` +
      `┃ Matikan : \`${usedPrefix}${command} off\`\n` +
      `╰╌╌⬡\n\n© ${botName}`,
      '⚽ Jadwal Bola Aktif!'
    )
  }

  
  if (sub === 'off' || sub === 'nonaktif') {
    if (!m.isGroup)          return reply('❌ Fitur ini hanya untuk grup!')
    if (!isOwn && !isAdmin)  return reply('❌ Hanya admin grup atau owner!')

    setJadwalCfg(from, { active: false })

    return sendMsg(
      `╭╌╌⬡「 ⚽ *${bi('Jadwal Bola OFF')}* 」\n` +
      `┃\n` +
      `┃ ❌ Notif jadwal bola *dimatikan*\n` +
      `┃\n` +
      `╰╌╌⬡\n\n© ${botName}`,
      '⚽ Jadwal Bola Nonaktif'
    )
  }

  
  if (sub === 'status' || sub === 'cek') {
    const cfg = m.isGroup ? getJadwalCfg(from) : null
    const statusTxt = !m.isGroup
      ? `ℹ️ Cek status hanya di dalam grup`
      : cfg?.active
        ? `✅ *Aktif* — Notif jam *${String(cfg.hour).padStart(2,'0')}:${String(cfg.minute).padStart(2,'0')} WIB*`
        : `❌ *Nonaktif*`

    return sendMsg(
      `╭╌╌⬡「 ⚽ *${bi('Status Jadwal Bola')}* 」\n` +
      `┃\n` +
      `┃ ${statusTxt}\n` +
      `┃\n` +
      `┃ Commands:\n` +
      `┃ \`${usedPrefix}${command} on [jam]\`  — aktifkan\n` +
      `┃ \`${usedPrefix}${command} off\`       — matikan\n` +
      `┃ \`${usedPrefix}${command} [liga]\`    — cari jadwal\n` +
      `╰╌╌⬡\n\n© ${botName}`,
      '⚽ Status Jadwal Bola'
    )
  }

  
  const filter = args.join(' ').toLowerCase().trim()

  await Morela.sendMessage(from, { react: { text: '⏳', key: m.key } })

  try {
    let matches = await fetchJadwal()

    if (filter) {
      matches = matches.filter((g: any) =>
        g.league?.toLowerCase().includes(filter)    ||
        g.home_team?.toLowerCase().includes(filter) ||
        g.away_team?.toLowerCase().includes(filter) ||
        g.date?.toLowerCase().includes(filter)
      )
    }

    if (!matches.length) {
      await Morela.sendMessage(from, { react: { text: '❌', key: m.key } })
      return reply(`❌ Tidak ada jadwal${filter ? ` untuk: *${filter}*` : ''}`)
    }

    await sendMsg(formatJadwal(matches, filter), '⚽ Jadwal Pertandingan')
    await Morela.sendMessage(from, { react: { text: '✅', key: m.key } })

  } catch (e) {
    await Morela.sendMessage(from, { react: { text: '❌', key: m.key } })
    reply(`❌ Gagal ambil jadwal\n\n${(e as Error).message}`)
  }
}

handler.command  = ['jadwalbola', 'bola', 'football', 'soccer']
handler.tags     = ['info']
handler.help     = ['jadwalbola [liga]', 'jadwalbola on [jam]', 'jadwalbola off', 'jadwalbola status']
handler.owner    = false
handler.premium  = false
handler.noLimit  = true

export default handler