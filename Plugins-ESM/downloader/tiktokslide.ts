// @ts-nocheck
import path from 'path'
import { proto, generateWAMessageFromContent, generateWAMessageContent } from '@itsukichan/baileys'
import fs from 'fs'
import { bi, buildFkontak, sendCard, uploadImage, createSend, menuBuf, CHANNEL_URL, OWNER_WA, BOT_JID, imagePath, botName, botVersion } from '../../Library/utils.js'

const ppBase64 = fs.existsSync(imagePath) ? fs.readFileSync(imagePath).toString('base64') : ''

async function searchSlide(query: Record<string, unknown>) {
  const body = `keywords=${encodeURIComponent(query)}&count=1&cursor=0&web=1&hd=1`
  const res = await fetch('https://www.tikwm.com/api/photo/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body
  })
  const json = await res.json()
  return json?.data?.videos?.[0]
}

async function createImage(url: string, Morela: Record<string, unknown>) {
  const { imageMessage } = await generateWAMessageContent(
    { image: { url } },
    { upload: Morela.waUploadToServer }
  )
  return imageMessage
}

const handler = async (m: any, { Morela, text, reply, fkontak }: any) => {
  if (!text) return reply(
`╭──「 🎴 *TikTok Slide* 」
│
│  Masukkan kata pencarian!
│
│  📌 *Contoh:*
│  .ttslide kucing lucu
│
╰─────────────────────`
  )

  await Morela.sendMessage(m.chat, { react: { text: '✨', key: m.key } })

  try {
    const data = await searchSlide(text)
    if (!data) {
      await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return reply('❌ Tidak ditemukan.')
    }

    const images = data.images || []
    if (!images.length) {
      await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return reply('❌ Tidak ada foto di postingan ini.')
    }

    const cards = []
    for (const img of images.slice(0, 6)) {
      cards.push({
        body: proto.Message.InteractiveMessage.Body.fromObject({
          text: data.title || 'TikTok Slide'
        }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({
          text: `© ${botName}`
        }),
        header: proto.Message.InteractiveMessage.Header.fromObject({
          title: data.author.nickname,
          hasMediaAttachment: true,
          imageMessage: await createImage(img, Morela)
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
          buttons: [
            {
              name: 'cta_url',
              buttonParamsJson: JSON.stringify({
                display_text: 'Buka TikTok',
                url: `https://www.tiktok.com/@${data.author.unique_id || 'user'}/video/${data.video_id}`
              })
            }
          ]
        })
      })
    }

    const msg = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: proto.Message.InteractiveMessage.Body.create({
              text:
`🎴 *TIKTOK SLIDE*

│  📝 Judul    » ${data.title || '-'}
│  👤 Uploader » ${data.author.nickname}
│  🖼️ Total    » ${images.length} foto`
            }),
            footer: proto.Message.InteractiveMessage.Footer.create({
              text: `© ${botName}`
            }),
            header: proto.Message.InteractiveMessage.Header.create({
              hasMediaAttachment: false
            }),
            carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards })
          })
        }
      }
    }, { quoted: fkontak || m })

    await Morela.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    console.error('[TTSLIDE ERROR]', e)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply('❌ Gagal mengambil slide: ' + (e as Error).message)
  }
}

handler.help    = ['ttslide <query>']
handler.tags    = ['downloader']
handler.command = ['ttslide', 'tiktokslide', 'tiktokphoto']

export default handler