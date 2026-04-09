// @ts-nocheck
import axios    from 'axios'
import FormData from 'form-data'
import fs       from 'fs'
import { downloadContentFromMessage } from '@itsukichan/baileys'
import { bi, CHANNEL_URL, imagePath, botName } from '../../Library/utils.js'



const faceswapSessions = new Map()


function detectMime(buf) {
  const hex = buf.slice(0, 4).toString('hex')
  if (hex === '89504e47')       return 'image/png'
  if (hex.startsWith('524946')) return 'image/webp'
  return 'image/jpeg'
}
function extFromMime(mime) {
  if (mime === 'image/png')  return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}


function unwrapMsg(msg) {
  let m = msg || {}
  for (let i = 0; i < 10; i++) {
    if (m.ephemeralMessage)           { m = m.ephemeralMessage?.message || m; continue }
    if (m.viewOnceMessage)            { m = m.viewOnceMessage?.message || m; continue }
    if (m.viewOnceMessageV2)          { m = m.viewOnceMessageV2?.message || m; continue }
    if (m.viewOnceMessageV2Extension) { m = m.viewOnceMessageV2Extension?.message || m; continue }
    if (m.documentWithCaptionMessage) { m = m.documentWithCaptionMessage?.message || m; continue }
    break
  }
  return m
}


function pickImageNode(m) {
  
  if (m?.mtype === 'imageMessage') {
    const node = m.message?.imageMessage || m
    if (node?.mediaKey || node?.directPath) return node
  }
  
  const quoted = m?.quoted
  if (quoted?.mtype === 'imageMessage') {
    const fromMsg = quoted.message?.imageMessage
    if (fromMsg?.mediaKey || fromMsg?.directPath) return fromMsg
    if (quoted?.mediaKey || quoted?.directPath) return quoted
  }
  
  if (quoted?.message) {
    const uq = unwrapMsg(quoted.message)
    if (uq?.imageMessage) return uq.imageMessage
  }
  
  if (m?.message) {
    const ur = unwrapMsg(m.message)
    if (ur?.imageMessage) return ur.imageMessage
  }
  return null
}


async function downloadImageBuffer(node) {
  if (!node?.mediaKey && !node?.directPath && !node?.url) {
    throw new Error('Gambar tidak punya media key — coba kirim ulang foto yang baru')
  }

  
  if (node.mediaKey) {
    try {
      const stream = await downloadContentFromMessage(node, 'image')
      const chunks = []
      for await (const c of stream) chunks.push(c)
      const buf = Buffer.concat(chunks)
      if (buf.length > 0) return buf
    } catch (e) {
      const msg = e.message || ''
      if (!msg.includes('empty media key') && !msg.includes('Cannot derive')) throw e
    }
  }

  
  const url = node.url || node.directPath
  if (url) {
    const res = await axios.get(url, {
      responseType: 'arraybuffer', timeout: 20000,
      headers: { 'User-Agent': 'WhatsApp/2.23.20.0' }
    })
    const buf = Buffer.from(res.data)
    if (buf.length > 0) return buf
  }

  throw new Error('Gagal download gambar. Coba kirim ulang foto yang baru')
}


async function createJob(sourceBuffer, targetBuffer) {
  const form = new FormData()
  const srcMime = detectMime(sourceBuffer)
  const tgtMime = detectMime(targetBuffer)

  form.append('source_image', sourceBuffer, {
    filename: `source.${extFromMime(srcMime)}`,
    contentType: srcMime
  })
  form.append('target_image', targetBuffer, {
    filename: `target.${extFromMime(tgtMime)}`,
    contentType: tgtMime
  })

  const res = await axios.post(
    'https://api.lovefaceswap.com/api/face-swap/create-poll',
    form,
    {
      headers: {
        ...form.getHeaders(),
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/139.0.0.0 Mobile Safari/537.36',
        'Accept':  'application/json',
        'origin':  'https://lovefaceswap.com',
        'referer': 'https://lovefaceswap.com/'
      },
      maxBodyLength: Infinity,
      timeout: 30000
    }
  )

  const taskId = res.data?.data?.task_id
  if (!taskId) throw new Error('API tidak mengembalikan task_id: ' + JSON.stringify(res.data).slice(0, 200))
  return taskId
}


async function checkJob(jobId) {
  const res = await axios.get(
    `https://api.lovefaceswap.com/api/common/get?job_id=${jobId}`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/139.0.0.0 Mobile Safari/537.36',
        'origin':  'https://lovefaceswap.com',
        'referer': 'https://lovefaceswap.com/'
      },
      timeout: 15000
    }
  )
  return res.data?.data
}


async function doFaceSwap(sourceBuffer, targetBuffer) {
  const jobId = await createJob(sourceBuffer, targetBuffer)

  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 3000))
    const result = await checkJob(jobId)
    if (result?.image_url?.length) return result.image_url[0]
    if (result?.status === 'failed' || result?.status === 'error') {
      throw new Error('Face swap API gagal: ' + (result?.message || 'Unknown error'))
    }
  }

  throw new Error('Face swap timeout (>2 menit)')
}


const handler = async (m, { Morela, reply, usedPrefix, command, fkontak }) => {
  const thumb   = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : undefined
  const session = faceswapSessions.get(m.sender)
  const node    = pickImageNode(m)

  
  if (!node && !session) {
    return Morela.sendMessage(m.chat, {
      text:
        `╭╌╌⬡「 😶 *${bi('Face Swap')}* 」\n` +
        `┃ Tukar wajah antara dua foto!\n` +
        `┃\n` +
        `┃ 📋 *Cara pakai:*\n` +
        `┃ 1️⃣ Kirim foto pertama (muka sumber)\n` +
        `┃    + caption: \`${usedPrefix}${command}\`\n` +
        `┃\n` +
        `┃ 2️⃣ Kirim foto kedua (foto target)\n` +
        `┃    + caption: \`${usedPrefix}${command}\`\n` +
        `┃\n` +
        `┃ ⏱️ Session berlaku 5 menit\n` +
        `┃ 🔄 Kirim \`${usedPrefix}${command} reset\`\n` +
        `┃    untuk batalkan session\n` +
        `┃\n` +
        `╰╌╌⬡\n\n© ${botName}`,
      contextInfo: { externalAdReply: { title: '😶 Face Swap AI', body: `${botName} Multidevice 🔥`, mediaType: 1, renderLargerThumbnail: false, showAdAttribution: false, sourceUrl: CHANNEL_URL, thumbnail: thumb } }
    }, { quoted: fkontak || m })
  }

  
  const textArg = (m.text || m.body || '').replace(/^\S+\s*/, '').trim().toLowerCase()
  if (textArg === 'reset' || textArg === 'cancel') {
    faceswapSessions.delete(m.sender)
    return reply('🔄 Session faceswap direset!')
  }

  
  if (!session) {
    await Morela.sendMessage(m.chat, { react: { text: '1️⃣', key: m.key } })
    await reply('⏳ Menyimpan gambar pertama...')

    try {
      const buf = await downloadImageBuffer(node)
      if (buf.length < 1000) throw new Error('Gambar terlalu kecil atau corrupt')

      faceswapSessions.set(m.sender, { buffer: buf, timestamp: Date.now() })

      
      setTimeout(() => faceswapSessions.delete(m.sender), 5 * 60 * 1000)

      await Morela.sendMessage(m.chat, {
        text:
          `╭╌╌⬡「 1️⃣ *${bi('Gambar 1 Tersimpan')}* 」\n` +
          `┃\n` +
          `┃ ✅ Foto pertama berhasil disimpan!\n` +
          `┃\n` +
          `┃ Sekarang kirim foto kedua\n` +
          `┃ (target) + caption:\n` +
          `┃ \`${usedPrefix}${command}\`\n` +
          `┃\n` +
          `┃ ⏱️ Session berlaku *5 menit*\n` +
          `┃ Ketik \`${usedPrefix}${command} reset\` untuk batal\n` +
          `╰╌╌⬡\n\n© ${botName}`,
        contextInfo: { externalAdReply: { title: '✅ Foto 1 Tersimpan!', body: 'Kirim foto ke-2 sekarang', mediaType: 1, renderLargerThumbnail: false, showAdAttribution: false, sourceUrl: CHANNEL_URL, thumbnail: thumb } }
      }, { quoted: fkontak || m })

    } catch (e) {
      faceswapSessions.delete(m.sender)
      await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      reply(`❌ Gagal simpan gambar: ${e.message}`)
    }
    return
  }

  
  if (!node) {
    return Morela.sendMessage(m.chat, {
      text:
        `╭╌╌⬡「 2️⃣ *${bi('Kirim Foto Ke-2')}* 」\n` +
        `┃\n` +
        `┃ ✅ Foto pertama sudah tersimpan!\n` +
        `┃\n` +
        `┃ Sekarang kirim foto kedua (target)\n` +
        `┃ + caption: \`${usedPrefix}${command}\`\n` +
        `┃\n` +
        `┃ Atau ketik \`${usedPrefix}${command} reset\`\n` +
        `┃ untuk batalkan\n` +
        `╰╌╌⬡\n\n© ${botName}`,
      contextInfo: { externalAdReply: { title: '⏳ Tunggu Foto Ke-2', body: `${botName} Multidevice 🔥`, mediaType: 1, renderLargerThumbnail: false, showAdAttribution: false, sourceUrl: CHANNEL_URL, thumbnail: thumb } }
    }, { quoted: fkontak || m })
  }

  
  await Morela.sendMessage(m.chat, { react: { text: '2️⃣', key: m.key } })
  await Morela.sendMessage(m.chat, {
    text:
      `╭╌╌⬡「 🔄 *${bi('Memproses...')}* 」\n` +
      `┃\n` +
      `┃ Sedang menukar wajah...\n` +
      `┃ Estimasi: *30-60 detik*\n` +
      `┃\n` +
      `╰╌╌⬡\n\n© ${botName}`,
    contextInfo: { externalAdReply: { title: '🔄 AI Processing...', body: 'Harap tunggu', mediaType: 1, renderLargerThumbnail: false, showAdAttribution: false, sourceUrl: CHANNEL_URL, thumbnail: thumb } }
  }, { quoted: fkontak || m })

  try {
    const targetBuf = await downloadImageBuffer(node)
    if (targetBuf.length < 1000) throw new Error('Gambar kedua terlalu kecil atau corrupt')

    const sourceBuf = session.buffer

    await Morela.sendMessage(m.chat, { react: { text: '⚙️', key: m.key } })

    const resultUrl = await doFaceSwap(sourceBuf, targetBuf)

    
    const resultRes = await axios.get(resultUrl, { responseType: 'arraybuffer', timeout: 30000 })
    const resultBuf = Buffer.from(resultRes.data)

    
    faceswapSessions.delete(m.sender)

    await Morela.sendMessage(m.chat, {
      image:   resultBuf,
      caption:
        `╭╌╌⬡「 ✅ *${bi('Face Swap Selesai')}* 」\n` +
        `┃ ◦ Status : *Berhasil!*\n` +
        `┃ ◦ API    : lovefaceswap.com\n` +
        `╰╌╌⬡\n\n© ${botName}`,
      contextInfo: { externalAdReply: { title: '✅ Face Swap Done!', body: `${botName} Multidevice 🔥`, mediaType: 1, renderLargerThumbnail: false, showAdAttribution: false, sourceUrl: CHANNEL_URL, thumbnail: thumb } }
    }, { quoted: fkontak || m })

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    faceswapSessions.delete(m.sender)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply(`❌ Face swap gagal\n\n${e.message}`)
  }
}

handler.command  = ['faceswap', 'fs', 'tukarwajah']
handler.tags     = ['ai']
handler.help     = ['faceswap — tukar wajah 2 foto (kirim 2x)']
handler.noLimit  = false
handler.owner    = false
handler.premium  = false

export default handler