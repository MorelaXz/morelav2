import { downloadContentFromMessage } from '@itsukichan/baileys'
import sharp from 'sharp'

const handler = async (m: any, { Morela, reply, fkontak }: any) => {
  try {
    if (!m.quoted)
      return reply('❌ Reply stiker yang ingin dijadikan gambar!')

    const mtype = m.quoted.mtype || ''
    if (!mtype.includes('sticker') && !/webp/i.test(m.quoted.mimetype || ''))
      return reply('❌ Yang di-reply bukan stiker!')

    await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

    const stickerMsg = m.quoted.stickerMessage
      || m.quoted[mtype]
      || m.quoted.msg
      || m.quoted

    if (!stickerMsg?.mediaKey && !stickerMsg?.url) {
      throw new Error('Tidak bisa menemukan data stiker')
    }

    const stream = await downloadContentFromMessage(stickerMsg, 'sticker')
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    const webpBuffer = Buffer.concat(chunks)

    if (!webpBuffer || webpBuffer.length === 0)
      throw new Error('Buffer kosong setelah download')

    const pngBuffer = await sharp(webpBuffer)
      .png()
      .toBuffer()

    await Morela.sendMessage(
      m.chat,
      { image: pngBuffer, caption: '✅ Stiker berhasil dikonversi!' },
      { quoted: fkontak || m }
    )

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (err) {
    console.error('[TOIMAGE]', err)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {})
    reply('❌ Gagal convert stiker: ' + (err as Error).message)
  }
}

handler.help    = ['toimage', 'toimg']
handler.tags    = ['sticker']
handler.command = ['toimage', 'toimg']

export default handler