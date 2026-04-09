// @ts-nocheck


import axios from 'axios'
import { buildFkontak, sendCard, menuBuf, botName } from '../../Library/utils.js'

const API_KEY    = '5wCjC'
const BASE_URL   = 'https://api.theresav.biz.id/image/genmyart'

const STYLES = {
  'anime'       : 'anime',
  'realistic'   : 'realistic',
  'cartoon'     : 'cartoon',
  'watercolor'  : 'watercolor',
  'oil'         : 'oil',
  'sketch'      : 'sketch',
  'pixel'       : 'pixel',
  'cyberpunk'   : 'cyberpunk',
  'fantasy'     : 'fantasy',
  'minimalist'  : 'minimalist',
}

const RESOLUTIONS = {
  'square'    : { res: '512x512',  ratio: 'square'    },
  'portrait'  : { res: '512x768',  ratio: 'portrait'  },
  'landscape' : { res: '768x512',  ratio: 'landscape' },
}

async function genImage(prompt: unknown, style: unknown = 'anime', resolution: unknown = 'square') {
  const { res, ratio } = RESOLUTIONS[resolution] || RESOLUTIONS['square']
  const url = `${BASE_URL}?apikey=${API_KEY}&prompt=${encodeURIComponent(prompt)}&style=${style}&resolution=${res}&aspectRatio=${ratio}&numImages=1`

  const resp = await axios.get(url, { timeout: 60000 })
  const data = resp.data

  if (data?.result?.[0]) return data.result[0]

  throw new Error('Tidak ada gambar di response API')
}

const handler = async (m: any, { Morela, command, reply, isOwn, isPrem, senderJid }: any) => {
  const fkontak = await buildFkontak(Morela)

  if (command === 'genstyle') {
    const list = Object.keys(STYLES).map((s, i) => `  ${i + 1}. ${s}`).join('\n')
    return sendCard(Morela, m.chat,
      `╭╌╌⬡「 🎨 *GenMyArt Styles* 」\n` +
      `┃ Format: *.genmyart style | prompt*\n` +
      `┃\n` +
      `┃ Style tersedia:\n${list}\n` +
      `┃\n` +
      `┃ Contoh:\n` +
      `┃ *.genmyart anime | cute girl*\n` +
      `┃ *.genmyart cyberpunk | city night*\n` +
      `╰╌╌⬡\n\n© ${botName}`,
      menuBuf, fkontak
    )
  }

  const input = m.text?.trim()
  if (!input) {
    return reply(
      `🖼️ *GenMyArt AI Image Generator*\n\n` +
      `Cara pakai:\n` +
      `• *.genmyart <prompt>* — style anime (default)\n` +
      `• *.genmyart <style> | <prompt>* — pilih style\n\n` +
      `Contoh:\n` +
      `• .genmyart cute anime girl\n` +
      `• .genmyart cyberpunk | city at night\n\n` +
      `Ketik *.genstyle* untuk lihat semua style`
    )
  }

  let style  = 'anime'
  let prompt = input

  if (input.includes('|')) {
    const parts  = input.split('|')
    const rawStyle = parts[0].trim().toLowerCase()
    const rawPrompt = parts.slice(1).join('|').trim()

    if (STYLES[rawStyle]) {
      style  = STYLES[rawStyle]
      prompt = rawPrompt
    } else {
      return reply(`❌ Style *${rawStyle}* tidak tersedia.\nKetik *.genstyle* untuk lihat daftar style.`)
    }
  }

  if (!prompt) return reply('❌ Prompt tidak boleh kosong!')

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })
  await reply(`🎨 Generating *${style}* image...\nPrompt: _${prompt}_`)

  try {
    const imgUrl = await genImage(prompt, style)

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    await Morela.sendMessage(m.chat, {
      image    : { url: imgUrl },
      caption  : `✨ *GenMyArt AI Image*\n\n🎨 Style  : ${style}\n📝 Prompt : ${prompt}\n\n© ${botName}`
    }, { quoted: fkontak || m })

  } catch (err) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    console.error('[GenMyArt Error]', (err as Error).message)
    return reply(`❌ Gagal generate gambar.\nError: ${(err as Error).message}`)
  }
}

handler.command  = ['genmyart', 'genstyle']
handler.tags     = ['ai']
handler.help     = [
  'genmyart <prompt> — generate AI image (style anime)',
  'genmyart <style> | <prompt> — generate dengan style tertentu',
  'genstyle — lihat daftar style tersedia',
]
handler.noLimit  = false

export default handler