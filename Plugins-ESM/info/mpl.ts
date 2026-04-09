// @ts-nocheck
import axios        from 'axios'
import * as cheerio from 'cheerio'
import { botName }  from '../../Library/utils.js'

const MPL_URL    = 'https://id-mpl.com/schedule'
const SSWEB_URL  = 'https://api-faa.my.id/faa/ssweb-3hasil'
const CACHE_TTL  = 15 * 60 * 1000

let _cache     = null
let _cacheTime = 0


async function fetchMPL() {
  const now = Date.now()
  if (_cache && (now - _cacheTime) < CACHE_TTL) return _cache

  const { data: html } = await axios.get(MPL_URL, {
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36' }
  })

  const $ = cheerio.load(html)

  let currentWeek = 1
  $('.tab-linker.active').each((_, el) => {
    const rel = parseInt($(el).attr('rel') || '1')
    if (!isNaN(rel)) currentWeek = rel
  })

  const days = []
  const weekEl = $(`#t-week-${currentWeek}`)

  weekEl.find('.col-lg-4').each((_, colEl) => {
    const dateText = $(colEl).find('.match.date').text().trim()
    if (!dateText) return

    const matches = []
    $(colEl).find('.match:not(.date)').each((_, matchEl) => {
      const teams  = $(matchEl).find('.team')
      const scores = $(matchEl).find('.score')
      const time   = $(matchEl).find('.time .pt-1').first().text().trim()

      const team1  = $(teams[0]).find('.name').text().trim()
      const team2  = $(teams[1]).find('.name').text().trim()
      const score1 = $(scores[0]).text().trim()
      const score2 = $(scores[1]).text().trim()
      if (!team1 || !team2) return

      const hasReplay = $(matchEl).find('.button-watch.replay').length > 0
      const hasWatch  = $(matchEl).find('.button-watch.live:not(.detail)').length > 0
      const isDone    = hasReplay || (score1 !== '' && score2 !== '')
      const isLive    = hasWatch && !hasReplay

      matches.push({
        team1, team2,
        score1: isDone ? score1 : '',
        score2: isDone ? score2 : '',
        time, date: dateText,
        status: isDone ? 'done' : isLive ? 'live' : 'upcoming'
      })
    })

    if (matches.length) days.push({ date: dateText, matches })
  })

  
  const standings = []
  $('.table-standings tbody tr').each((i, row) => {
    const cells = $(row).find('td')
    if (cells.length < 4) return
    const rank = parseInt($(cells[0]).text().trim()) || (i + 1)
    const team = $(cells[1]).find('.team-name, .name, span').text().trim()
      || $(cells[1]).text().trim().replace(/\s+/g, ' ')
    standings.push({
      rank, team: team.slice(0, 20),
      matchPoint: parseInt($(cells[2]).text().trim()) || 0,
      matchWL:    $(cells[3]).text().trim() || '-',
      netGameWin: parseInt($(cells[4]).text().trim()) || 0,
      gameWL:     $(cells[5]).text().trim() || '-',
    })
  })

  const result = { week: currentWeek, days, standings }
  _cache = result; _cacheTime = now
  return result
}


async function fetchSsweb() {
  const { data } = await axios.get(SSWEB_URL, {
    params:  { url: 'https://id-mpl.com/schedule' },
    timeout: 60000
  })
  if (!data?.status || !data?.results) throw new Error('ssweb gagal: ' + JSON.stringify(data))
  const imgUrl = data.results.desktop || data.results.mobile || data.results.tablet
  if (!imgUrl) throw new Error('ssweb: tidak ada URL gambar')
  return imgUrl
}


function formatText(data) {
  let txt = `╭╌╌⬡「 🏆 *ᴊᴀᴅᴡᴀʟ ᴍᴘʟ ɪᴅ ꜱ17* 」\n┃ 📅 Week *${data.week}*\n┃\n`

  for (const day of data.days) {
    txt += `┃ 📆 *${day.date}*\n`
    for (const m of day.matches) {
      if (m.status === 'done')
        txt += `┃ ✅ ${m.team1} ${m.score1}-${m.score2} ${m.team2}\n`
      else if (m.status === 'live')
        txt += `┃ 🔴 *LIVE:* ${m.team1} vs ${m.team2}\n`
      else
        txt += `┃ ⏳ ${m.team1} vs ${m.team2} — ${m.time || 'TBD'} WIB\n`
    }
    txt += `┃\n`
  }

  return txt + `╰╌╌⬡\n\n© ${botName}`
}


const handler = async (m, { Morela, command, fkontak }) => {
  const send    = (txt)         => Morela.sendMessage(m.chat, { text: txt },                   { quoted: fkontak || m })
  const sendImg = (imgUrl, cap) => Morela.sendMessage(m.chat, { image: { url: imgUrl }, caption: cap }, { quoted: fkontak || m })

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  try {
    const data = await fetchMPL()

    if (!data.days.length) {
      await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return send(`╭╌╌⬡「 🏆 *ᴍᴘʟ ɪᴅ* 」\n┃ ⚠️ Tidak ada data jadwal saat ini.\n╰╌╌⬡\n\n© ${botName}`)
    }

    const caption = formatText(data)

    
    if (command === 'mpltext') {
      await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
      return send(caption)
    }

    
    try {
      const imgUrl = await fetchSsweb()
      await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
      return sendImg(imgUrl, caption)
    } catch (ssErr) {
      console.error('[MPL Ssweb Error]', ssErr.message)
      await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
      return send(caption)
    }

  } catch (e) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return send(`╭╌╌⬡「 🏆 *ᴍᴘʟ ɪᴅ* 」\n┃ ❌ Gagal: ${e.message}\n╰╌╌⬡\n\n© ${botName}`)
  }
}

handler.command = ['mpl', 'jadwalmpl', 'mpltext']
handler.tags    = ['info']
handler.noLimit = false
handler.help    = ['mpl — jadwal & skor MPL ID (thumbnail ssweb realtime)', 'mpltext — versi teks']

export default handler