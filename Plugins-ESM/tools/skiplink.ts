// @ts-nocheck
import axios from 'axios'

let handler = async (m, { text, usedPrefix, command, reply }) => {
  if (!text) {
    return reply(`Contoh:\n${usedPrefix + command} https://sfl.gl/xxxx`)
  }

  if (!text.startsWith('http')) {
    return reply('❌ URL tidak valid')
  }

  try {
    reply('⏳ Bypass SFL...')

    const api = `https://api.neoxr.eu/api/shortlink?url=${encodeURIComponent(text)}&apikey=mwgAQq`
    const res = await axios.get(api, {
      timeout: 30000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
    const json = res.data

    if (!json.status) {
      return reply(`❌ Gagal bypass: ${json.message || 'Unknown error'}`)
    }

    const result = json.result || json.data || json

    let msg = `🔓 *SFL Bypass Success*\n\n`
    msg += `🔗 Original  : ${text}\n`
    msg += `✅ Bypassed  : ${result.url || result.result || result.link || JSON.stringify(result)}`

    reply(msg)

  } catch (e) {
    console.error('SFL ERROR:', e)
    reply('❌ Error bypass SFL')
  }
}

handler.help    = ['skipsfl <url>']
handler.tags    = ['tools']
handler.command = ['skipsfl']
handler.owner   = true
handler.noLimit = true

export default handler