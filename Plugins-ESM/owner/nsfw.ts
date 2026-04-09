// @ts-nocheck
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { botName, CHANNEL_URL, CHANNEL_JID } from '../../Library/utils.js'

const COMMANDS = [
  'shinobu', 'megumin', 'bully', 'cuddle', 'cry', 'hug', 'awoo',
  'kiss', 'lick', 'pat', 'smug', 'bonk', 'yeet', 'blush', 'smile', 'wave', 'highfive',
  'handhold', 'nom', 'bite', 'glomp', 'slap', 'kill', 'happy', 'wink', 'poke', 'dance',
  'cringe', 'trap', 'blowjob', 'hentai', 'boobs', 'ass', 'pussy', 'thighs', 'lesbian',
  'lewdneko', 'cum', 'waifu-nsfw', 'neko-nsfw'
]

function gifToMp4(gifBuffer: unknown) {
  const tmpDir  = os.tmpdir()
  const ts      = Date.now()
  const gifPath = path.join(tmpDir, `nsfw_${ts}.gif`)
  const mp4Path = path.join(tmpDir, `nsfw_${ts}.mp4`)
  try {
    fs.writeFileSync(gifPath, gifBuffer)
    execSync(`ffmpeg -y -i "${gifPath}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -preset ultrafast -crf 23 "${mp4Path}"`, {
      stdio: 'pipe', timeout: 30000
    })
    if (fs.existsSync(mp4Path)) {
      const buf = fs.readFileSync(mp4Path)
      try { fs.unlinkSync(mp4Path) } catch {}
      try { fs.unlinkSync(gifPath) } catch {}
      return buf
    }
  } catch (e) {
    console.error('[NSFW] FFmpeg failed:', (e as Error).message)
    try { if (fs.existsSync(gifPath)) fs.unlinkSync(gifPath) } catch {}
    try { if (fs.existsSync(mp4Path)) fs.unlinkSync(mp4Path) } catch {}
  }
  return null
}

async function fetchRule34(tag: unknown) {
  try {
    const { data } = await axios.get(`https://rule34.xxx/index.php?page=dapi&s=post&q=index&tags=${tag}&json=1`, { timeout: 10000 })
    if (data?.length > 0) return data[Math.floor(Math.random() * data.length)].file_url
  } catch {}
  return null
}

async function fetchWaifuPics(type: string, category: unknown = 'nsfw') {
  try {
    const { data } = await axios.get(`https://api.waifu.pics/${category}/${type}`, { timeout: 10000 })
    return data.url
  } catch {}
  return null
}

const handler = async (m: any, { Morela, command, reply, fkontak }: any) => {
  let cmd = command.toLowerCase()
  if (cmd === 'neko-nsfw') cmd = 'neko'
  if (cmd === 'waifu-nsfw') cmd = 'waifu'

  await Morela.sendMessage(m.chat, { react: { text: '🔁', key: m.key } })

  try {
    let imageUrl = await fetchRule34(cmd)
    if (!imageUrl) imageUrl = await fetchWaifuPics(cmd, 'nsfw')
    if (!imageUrl) imageUrl = await fetchWaifuPics(cmd, 'sfw')

    if (!imageUrl) {
      await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return reply(`❌ Gambar tidak ditemukan untuk tag: ${cmd}`)
    }

    const res         = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 30000 })
    const buffer      = Buffer.from(res.data)
    const contentType = res.headers['content-type']
    const isGif       = contentType?.includes('gif') || imageUrl.endsWith('.gif')

    const ctxInfo = {
      forwardingScore: 9999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid:   CHANNEL_JID,
        newsletterName:  `© ${botName}`,
        serverMessageId: 127
      }
    }

    if (isGif) {
      const mp4 = gifToMp4(buffer)
      if (mp4) {
        await Morela.sendMessage(m.chat, {
          video: mp4, gifPlayback: true,
          caption: `🔞 *${cmd.toUpperCase()}*\n\n© ${botName}`,
          contextInfo: ctxInfo
        }, { quoted: fkontak || m })
      } else {
        await Morela.sendMessage(m.chat, {
          image: buffer, mimetype: 'image/gif',
          caption: `🔞 *${cmd.toUpperCase()}*\n\n© ${botName}`,
          contextInfo: ctxInfo
        }, { quoted: fkontak || m })
      }
    } else {
      await Morela.sendMessage(m.chat, {
        image: buffer,
        caption: `🔞 *${cmd.toUpperCase()}*\n\n© ${botName}`,
        contextInfo: ctxInfo
      }, { quoted: fkontak || m })
    }

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    console.error('[NSFW]', (e as Error).message)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply(`❌ Error: ${(e as Error).message}`)
  }
}

handler.command = COMMANDS
handler.owner   = true
handler.tags    = ['nsfw']
handler.help    = ['nsfw <command>']
handler.noLimit = true

export default handler