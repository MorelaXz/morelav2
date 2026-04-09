import path from 'path'
import fetch from 'node-fetch'
import fs from 'fs'
import { bi, buildFkontak, sendCard, uploadImage, createSend, menuBuf, CHANNEL_URL, OWNER_WA, BOT_JID, imagePath, botName, botVersion } from '../../Library/utils.js'

const API_URL = 'https://kazztzyy.my.id'
const ppBase64 = fs.existsSync(imagePath) ? fs.readFileSync(imagePath).toString('base64') : ''

const waContext = () => ({
  externalAdReply: {
    body: botName,
    thumbnail: fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : undefined,
    sourceUrl: 'https://www.whatsapp.com',
    mediaType: 2,
    renderLargerThumbnail: false,
    showAdAttribution: false
  }
})

function buildBar(pct: number) {
  const filled = Math.round(pct / 10)
  const empty  = 10 - filled
  const color  = pct >= 80 ? '🟥' : pct >= 50 ? '🟨' : '🟩'
  return color.repeat(filled) + '⬜'.repeat(empty)
}

const handler = async (m: any, { Morela, text, usedPrefix, command, reply, fkontak }: any) => {
  if (!text) return reply(
`╭──「 🔑 *Cek API Key* 」
│
│  Masukkan nama key!
│
│  📌 *Contoh:*
│  ${usedPrefix}${command} NamaKey
│
╰─────────────────────`
  )

  const key = text.trim()

  await Morela.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })

  let d: Record<string, any>
  try {
    const res = await fetch(`${API_URL}/api/apikey/check?key=${encodeURIComponent(key)}`)
    d = await res.json() as Record<string, any>
  } catch {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return reply('❌ Gagal menghubungi server API')
  }

  if (!d.success) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return reply(`❌ ${d.message}`)
  }

  const pct    = Math.round((d.used / d.limit_total) * 100)
  const bar    = buildBar(pct)
  const status = d.is_valid ? '✅ *AKTIF*' : '🚫 *LIMIT HABIS*'
  const sisa   = d.remaining

  const caption =
`╭──「 🔑 *CEK API KEY* 」
│
│  🪪 *Key*      » ${d.key}
│
├──「 📊 *Statistik* 」
│
│  📦 Total    » *${d.limit_total.toLocaleString('id-ID')}*
│  🔥 Terpakai » *${d.used.toLocaleString('id-ID')}*
│  💎 Sisa     » *${sisa.toLocaleString('id-ID')}*
│
├──「 📈 *Penggunaan* 」
│
│  ${bar}
│  ┗━ *${pct}%* terpakai
│
╰──「 ${status} 」`

  await Morela.sendMessage(m.chat, {
    text: caption,
    contextInfo: waContext()
  }, { quoted: fkontak || m })

  await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
}

handler.help    = ['cekkey <NamaKey>']
handler.tags    = ['tools']
handler.command = ['cekkey']

export default handler