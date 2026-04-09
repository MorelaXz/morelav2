// @ts-nocheck
import {
  generateWAMessageContent,
  generateWAMessageFromContent,
  proto
} from "@itsukichan/baileys"

const handler = async (m: any, { Morela, text, reply, usedPrefix, command, fkontak }: any) => {
  try {
    if (!text) return reply(`Contoh: ${usedPrefix}${command} pohon sawit`)

    await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

    const url = `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(text)}&type=image`
    const res = await fetch(url)
    const json = await res.json()

    if (!res.ok || !json.status || !json.data?.length) {
      return reply('❌ Gagal mengambil data atau hasil kosong.')
    }

    async function createImage(imgUrl: unknown) {
      const { imageMessage } = await generateWAMessageContent(
        { image: { url: imgUrl } },
        { upload: Morela.waUploadToServer }
      )
      return imageMessage
    }

    
    const images = json.data
      .filter((item: any) => item.image_url)
      .slice(0, 5)

    const cards = []
    let i = 1
    for (const item of images) {
      cards.push({
        body: proto.Message.InteractiveMessage.Body.fromObject({
          text: `📌 ${item.seo_alt_text?.slice(0, 80) || `Gambar ke-${i}`}`
        }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({
          text: `📌 Pinterest • ${item.pinner?.full_name || 'Unknown'}`
        }),
        header: proto.Message.InteractiveMessage.Header.fromObject({
          title: 'PINTEREST',
          hasMediaAttachment: true,
          imageMessage: await createImage(item.image_url)
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
          buttons: [
            {
              name: 'cta_url',
              buttonParamsJson: JSON.stringify({
                display_text: 'Lihat di Pinterest',
                url: item.image_url,
                merchant_url: item.image_url
              })
            }
          ]
        })
      })
    }

    const msg = generateWAMessageFromContent(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2
            },
            interactiveMessage: proto.Message.InteractiveMessage.fromObject({
              body: proto.Message.InteractiveMessage.Body.create({}),
              footer: proto.Message.InteractiveMessage.Footer.create({ text: 'PINTEREST' }),
              header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
              carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards })
            })
          }
        }
      },
      { quoted: fkontak || m }
    )

    await Morela.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    console.error('[PIN]', (e as Error).message)
    await reply('❌ Terjadi kesalahan saat memproses permintaan.')
  }
}

handler.command = ['pinterest', 'pin']
handler.tags    = ['search']
handler.help    = ['pinterest <query>']

export default handler