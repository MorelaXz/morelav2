// @ts-nocheck
import FormData from 'form-data'
import fetch    from 'node-fetch'
import { fileTypeFromBuffer } from 'file-type'
import { downloadContentFromMessage } from '@itsukichan/baileys'
import { buildFkontak, botName, CHANNEL_URL } from '../../Library/utils.js'


async function uploadCatbox(buffer: Buffer, fileName: unknown) {
  const ft   = await fileTypeFromBuffer(buffer)
  const ext  = ft?.ext || 'jpg'
  const form = new FormData()
  form.append('fileToUpload', buffer, `${fileName}.${ext}`)
  form.append('reqtype', 'fileupload')
  const res  = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: form, timeout: 30000 })
  const text = await res.text()
  if (text.startsWith('https://')) return text.trim()
  throw new Error(text || 'gagal')
}

async function uploadTmpFiles(buffer: Buffer, fileName: unknown) {
  const ft   = await fileTypeFromBuffer(buffer)
  const ext  = ft?.ext || 'bin'
  const form = new FormData()
  form.append('file', buffer, `${fileName}.${ext}`)
  const res  = await fetch('https://tmpfiles.org/api/v1/upload', { method: 'POST', body: form, timeout: 30000 })
  const data = await res.json()
  if (data.status === 'success' && data.data?.url) {
    const parts = data.data.url.split('/')
    return `https://tmpfiles.org/dl/${parts[parts.length - 2]}/${parts[parts.length - 1]}`
  }
  throw new Error('gagal')
}

async function uploadPixhost(buffer: Buffer, fileName: unknown) {
  const ft   = await fileTypeFromBuffer(buffer)
  const ext  = ft?.ext || 'jpg'
  const form = new FormData()
  form.append('content', buffer, `${fileName}.${ext}`)
  form.append('content_type', '0')
  form.append('max_th_size', '300')
  const res  = await fetch('https://api.pixhost.to/images', {
    method: 'POST', body: form,
    headers: { Accept: 'application/json', ...form.getHeaders() },
    timeout: 30000
  })
  const text = await res.text()
  if (!text || !text.trim()) throw new Error('Response kosong dari Pixhost')
  let data
  try { data = JSON.parse(text) } catch { throw new Error('Response tidak valid') }
  if (data.direct_th_url) return data.direct_th_url.replace('/th/', '/images/')
  throw new Error(data.error || 'gagal')
}

const SERVICES = [
  { name: 'Catbox',   emoji: '📦', fn: uploadCatbox,   note: 'Permanen' },
  { name: 'TmpFiles', emoji: '⏳', fn: uploadTmpFiles, note: 'Sementara 24 jam' },
  { name: 'Pixhost',  emoji: '🖼️', fn: uploadPixhost,  note: 'Khusus gambar' },
]

function unwrapMsg(msg: string) {
  let m = msg || {}
  for (let i = 0; i < 10; i++) {
    if (m?.ephemeralMessage?.message)           { m = m.ephemeralMessage.message;           continue }
    if (m?.viewOnceMessage?.message)            { m = m.viewOnceMessage.message;            continue }
    if (m?.viewOnceMessageV2?.message)          { m = m.viewOnceMessageV2.message;          continue }
    if (m?.viewOnceMessageV2Extension?.message) { m = m.viewOnceMessageV2Extension.message; continue }
    if (m?.documentWithCaptionMessage?.message) { m = m.documentWithCaptionMessage.message; continue }
    break
  }
  return m
}

function pickMediaNode(m: Record<string, unknown>) {
  const c = (node, type) => node ? { node, type } : null
  if (m.quoted?.mtype === 'imageMessage')    return c(m.quoted, 'image')
  if (m.quoted?.mtype === 'videoMessage')    return c(m.quoted, 'video')
  if (m.quoted?.mtype === 'documentMessage') return c(m.quoted, 'document')
  if (m.quoted?.mtype === 'stickerMessage')  return c(m.quoted, 'sticker')
  if (m.quoted?.mtype === 'audioMessage')    return c(m.quoted, 'audio')
  if (m.quoted?.message) {
    const uq = unwrapMsg(m.quoted.message)
    if (uq?.imageMessage)    return c(uq.imageMessage,    'image')
    if (uq?.videoMessage)    return c(uq.videoMessage,    'video')
    if (uq?.documentMessage) return c(uq.documentMessage, 'document')
    if (uq?.stickerMessage)  return c(uq.stickerMessage,  'sticker')
    if (uq?.audioMessage)    return c(uq.audioMessage,    'audio')
  }
  if (m.message) {
    const ur = unwrapMsg(m.message)
    if (ur?.imageMessage)    return c(ur.imageMessage,    'image')
    if (ur?.videoMessage)    return c(ur.videoMessage,    'video')
    if (ur?.documentMessage) return c(ur.documentMessage, 'document')
    if (ur?.stickerMessage)  return c(ur.stickerMessage,  'sticker')
    if (ur?.audioMessage)    return c(ur.audioMessage,    'audio')
  }
  return null
}

const handler = async (m: any, { Morela, reply, usedPrefix, fkontak }: any) => {
  const media = pickMediaNode(m)

  if (!media) {
    return Morela.sendMessage(m.chat, {
      text: ' ',
      footer:
        `╭──「 📤 *Upload File* 」\n│\n` +
        `│  Reply file/foto/video lalu ketik:\n` +
        `│  *${usedPrefix}upload*\n│\n` +
        `│  📌 *Layanan:*\n` +
        `│  📦 Catbox   — permanen\n` +
        `│  ⏳ TmpFiles — 24 jam\n` +
        `│  🖼️ Pixhost  — khusus gambar\n│\n` +
        `│  Semua diupload sekaligus!\n│\n` +
        `╰─────────────────────\n© ${botName}`,
      interactiveButtons: [{
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({ display_text: 'Channel', url: CHANNEL_URL, merchant_url: CHANNEL_URL })
      }],
      hasMediaAttachment: false
    }, { quoted: fkontak || m })
  }

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  let buffer
  try {
    const stream = await downloadContentFromMessage(media.node, media.type)
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    buffer = Buffer.concat(chunks)
    if (!buffer.length) throw new Error('Buffer kosong')
  } catch (e) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return reply(`❌ Gagal download file\n\n${(e as Error).message}`)
  }

  const ft       = await fileTypeFromBuffer(buffer)
  const ext      = ft?.ext || 'bin'
  const fileName = `upload-${Date.now()}`
  const size     = buffer.length >= 1024 * 1024
    ? (buffer.length / 1024 / 1024).toFixed(2) + ' MB'
    : (buffer.length / 1024).toFixed(1) + ' KB'

  await Morela.sendMessage(m.chat, { react: { text: '⚙️', key: m.key } })

  const results = await Promise.allSettled(
    SERVICES.map((svc: unknown) => svc.fn(buffer, fileName))
  )

  const lines   = [`╭──「 📤 *Upload Result* 」`, `│  📁 \`${fileName}.${ext}\` • ${size}`, `│`]
  const buttons = []
  let anySuccess = false

  for (let i = 0; i < SERVICES.length; i++) {
    const svc = SERVICES[i]
    const res = results[i]

    if (res.status === 'fulfilled') {
      anySuccess = true
      const url = res.value
      lines.push(`│  ${svc.emoji} *${svc.name}* ✅ — ${svc.note}`)
      lines.push(`│`)
      buttons.push({
        name: 'cta_copy',
        buttonParamsJson: JSON.stringify({
          display_text: `Salin ${svc.name}`,
          copy_code:    url
        })
      })
    } else {
      lines.push(`│  ${svc.emoji} *${svc.name}* ❌ ${res.reason?.message || 'gagal'}`)
      lines.push(`│`)
    }
  }

  lines.push(`╰─────────────────────`)
  lines.push(`© ${botName}`)

  buttons.push({
    name: 'cta_url',
    buttonParamsJson: JSON.stringify({ display_text: 'Channel', url: CHANNEL_URL, merchant_url: CHANNEL_URL })
  })

  await Morela.sendMessage(m.chat, {
    text: ' ',
    footer: lines.join('\n'),
    interactiveButtons: buttons,
    hasMediaAttachment: false
  }, { quoted: fkontak || m })

  await Morela.sendMessage(m.chat, { react: { text: anySuccess ? '✅' : '❌', key: m.key } })
}

handler.help    = ['upload (reply file/foto/video)']
handler.tags    = ['tools']
handler.command = ['upload', 'up', 'upfile']
handler.noLimit = false

export default handler