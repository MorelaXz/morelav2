// @ts-nocheck
import axios from 'axios'
import { botName } from '../../Library/utils.js'

const API_KEY = 'tgZvi'
const API_URL = 'https://api.theresav.biz.id/tools/sfl'

const handler = async (m, { Morela, reply, text, usedPrefix, command, fkontak }) => {
  if (!text) return reply(
    `╭╌╌⬡「 🔓 *ʙʏᴘᴀꜱꜱ ʟɪɴᴋ* 」\n` +
    `┃\n` +
    `┃ 📌 *Format:*\n` +
    `┃ \`${usedPrefix}${command} <url>\`\n` +
    `┃\n` +
    `┃ 📝 *Contoh:*\n` +
    `┃ \`${usedPrefix}${command} https://sfl.gl/Qfnhx\`\n` +
    `┃\n` +
    `┃ ✅ *Support:* sfl.gl, dan shortlink lainnya\n` +
    `┃\n` +
    `╰╌╌⬡\n\n© ${botName}`
  )

  const url = text.trim()
  if (!url.startsWith('http')) return reply('❌ URL tidak valid, harus diawali *https://*')

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  try {
    const res = await axios.get(API_URL, {
      params: { url, apikey: API_KEY },
      timeout: 30000
    })

    const data = res.data
    if (!data?.status || !data?.data?.bypassed_url) {
      throw new Error(data?.message || 'Gagal bypass, coba link lain')
    }

    const { original_url, bypassed_url, stats } = data.data

    await Morela.sendMessage(m.chat, {
      text:
        `╭╌╌⬡「 🔓 *ʙʏᴘᴀꜱꜱ ʟɪɴᴋ* 」\n` +
        `┃\n` +
        `┃ 🔗 *Original :*\n` +
        `┃ ${original_url}\n` +
        `┃\n` +
        `┃ ✅ *Bypassed :*\n` +
        `┃ ${bypassed_url}\n` +
        `┃\n` +
        `┃ ⏱ Durasi  : ${stats?.duration || '-'} detik\n` +
        `┃ 👆 Klik    : ${stats?.clicks || '-'}x\n` +
        `┃\n` +
        `╰╌╌⬡\n\n© ${botName}`
    }, { quoted: fkontak || m })

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply(`❌ Bypass gagal\n\n${e.message}`)
  }
}

handler.command  = ['bypass', 'bypasslink', 'bl']
handler.tags     = ['tools']
handler.help     = ['bypass <url>']
handler.noLimit  = false
handler.owner    = false
handler.premium  = false
handler.group    = false
handler.private  = false
handler.admin    = false
handler.botAdmin = false

export default handler