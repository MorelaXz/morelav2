// @ts-nocheck
import crypto from 'crypto'
import webpmux from 'node-webpmux'
import { buildFkontak } from '../../Library/utils.js'

const { Image } = webpmux



async function addExif(buffer: Buffer, packname: unknown, author: unknown) {
  const img = new Image()
  await img.load(buffer)

  const jsonBuf = Buffer.from(JSON.stringify({
    'sticker-pack-id':        crypto.randomUUID(),
    'sticker-pack-name':      packname  || '',
    'sticker-pack-publisher': author    || '',
    'emojis':                 ['🤖']
  }), 'utf8')

  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2A, 0x00,
    0x08, 0x00, 0x00, 0x00,
    0x01, 0x00,
    0x41, 0x57,
    0x07, 0x00,
    0x00, 0x00, 0x00, 0x00,  
    0x16, 0x00, 0x00, 0x00   
  ])

  const exif = Buffer.concat([exifAttr, jsonBuf])
  exif.writeUIntLE(jsonBuf.length, 14, 4)  

  img.exif = exif
  return await img.save(null)
}



const handler = async (m: any, { Morela, text, reply, downloadContentFromMessage, fkontak }: any) => {
  try {
    
    if (!m.quoted) return reply(
`╭──「 🖊️ *Stiker Watermark* 」
│
│  Reply sebuah stiker dengan perintah ini!
│
│  📌 *Cara pakai:*
│  • Reply stiker + *.wm NamaPack*
│  • Reply stiker + *.wm Pack|Author*
│
│  📝 *Contoh:*
│  • .wm Kyzo
│  • .wm Morela|Bot
│
╰─────────────────────`
    )

    if (m.quoted.mtype !== 'stickerMessage') {
      return reply('❌ Yang di-reply harus *stiker*, bukan foto/video/teks!')
    }

    if (!text?.trim()) return reply(
`❌ *Packname kosong!*

Contoh:
  *.wm NamaPack*
  *.wm Pack|Author*`
    )

    let [packname, ...authorArr] = text.trim().split('|')
    let author = authorArr.join('|').trim()
    packname   = packname?.trim() || ''

    await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

    let img
    try {
      const stream = await downloadContentFromMessage(m.quoted, 'sticker')
      const chunks = []
      for await (const c of stream) chunks.push(c)
      img = Buffer.concat(chunks)
      if (!img?.length) throw new Error('Buffer kosong')
    } catch (e) {
      await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return reply('❌ Gagal mengambil sticker: ' + (e as Error).message)
    }

    let sticker
    try {
      sticker = await addExif(img, packname, author)
    } catch (e) {
      console.error('[WM EXIF]', e)
      await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return reply('❌ Terjadi kesalahan saat memberi watermark sticker')
    }

    await Morela.sendMessage(
      m.chat,
      { sticker },
      { quoted: fkontak || m }
    )
    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    console.error('[STIKERWM ERROR]', e)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {})
    reply('❌ Terjadi kesalahan saat memberi watermark sticker')
  }
}

handler.help    = ['wm <Pack> — Reply stiker ganti nama pack', 'wm Pack|Author']
handler.tags    = ['sticker']
handler.command = ['stikerwm', 'swm', 'setwm', 'wm']

export default handler