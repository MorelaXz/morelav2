// @ts-nocheck
import path from "path"
import fs from "fs"
import axios from "axios"
import FormData from "form-data"
import { downloadContentFromMessage } from "@itsukichan/baileys"

const IMGBB_KEY = "a0fa1c4b6c7b1570879c6d71b590f4bf"
const MENU_IMG  = path.join(process.cwd(), 'media/menu.jpg')
const BOT_JID   = "13135550002@s.whatsapp.net"
const botName   = global.botName || "Morela"

async function buildFkontak(Morela: Record<string, unknown>) {
  const BOT_NUMBER = BOT_JID.split("@")[0]
  let Mekik
  try {
    const pp  = await Morela.profilePictureUrl(BOT_JID, "image")
    const res = await fetch(pp)
    Mekik = Buffer.from(await res.arrayBuffer())
  } catch {
    Mekik = fs.existsSync(MENU_IMG) ? fs.readFileSync(MENU_IMG) : Buffer.alloc(0)
  }
  return {
    key: {
      participant: '0@s.whatsapp.net',
      fromMe:      false,
      id:          "StatusBiz",
      remoteJid:   "status@broadcast"
    },
    message: {
      contactMessage: {
        displayName:   botName,
        vcard: `BEGIN:VCARD
VERSION:3.0
N:${botName}
FN:${botName}
ORG:${botName};
TEL;type=CELL;type=VOICE;waid=${BOT_NUMBER}:${BOT_NUMBER}
END:VCARD`,
        jpegThumbnail: Mekik
      }
    }
  }
}

const sessions = new Map()

async function uploadImgBB(buffer: Buffer) {
  try {
    const base64 = buffer.toString("base64")
    const res = await axios.post(
      `https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`,
      new URLSearchParams({ image: base64 }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 30000 }
    )
    const url = res.data?.data?.url
    if (!url) throw new Error("No URL")
    return url
  } catch {
    return null
  }
}

async function imageUpscaler(buffer: Buffer, filename: unknown, multiplier: unknown = 2) {
  const pageRes = await fetch("https://www.iloveimg.com/id/tingkatkan-gambar", {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
  })

  const html   = await pageRes.text()
  const token  = html.match(/"token":"([^"]+)"/)?.[1]
  const taskId = html.match(/ilovepdfConfig\.taskId\s*=\s*'([^']+)'/)?.[1]
  if (!token || !taskId) throw new Error("Gagal ambil token/taskId")

  const uploadForm = new FormData()
  uploadForm.append("name", filename)
  uploadForm.append("chunk", "0")
  uploadForm.append("chunks", "1")
  uploadForm.append("task", taskId)
  uploadForm.append("preview", "1")
  uploadForm.append("pdfinfo", "0")
  uploadForm.append("pdfforms", "0")
  uploadForm.append("pdfresetforms", "0")
  uploadForm.append("v", "web.0")
  uploadForm.append("file", buffer, { filename, contentType: "image/jpeg" })

  const uploadRes = await axios.post(
    "https://api1g.iloveimg.com/v1/upload",
    uploadForm,
    {
      headers: {
        ...uploadForm.getHeaders(),
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Authorization": `Bearer ${token}`
      }
    }
  )
  const serverFilename = uploadRes.data?.server_filename
  if (!serverFilename) throw new Error("Upload gagal")

  const processForm = new FormData()
  processForm.append("packaged_filename", "iloveimg-upscaled")
  processForm.append("multiplier", String(multiplier))
  processForm.append("task", taskId)
  processForm.append("tool", "upscaleimage")
  processForm.append("files[0][server_filename]", serverFilename)
  processForm.append("files[0][filename]", filename)

  const processRes = await axios.post(
    "https://api1g.iloveimg.com/v1/process",
    processForm,
    {
      headers: {
        ...processForm.getHeaders(),
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Authorization": `Bearer ${token}`,
        "Origin": "https://www.iloveimg.com"
      }
    }
  )
  if (processRes.data?.status !== "TaskSuccess")
    throw new Error("Processing gagal: " + JSON.stringify(processRes.data))

  const downloadRes = await axios.get(
    `https://api1g.iloveimg.com/v1/download/${taskId}`,
    {
      responseType: "arraybuffer",
      headers: {
        "Authorization": `Bearer ${token}`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    }
  )
  return Buffer.from(downloadRes.data)
}

const handler = async (m: any, { Morela, reply, command, fkontak }: any) => {

  if (command === "hdv2_2x" || command === "hdv2_4x") {
    const multiplier = command === "hdv2_4x" ? 4 : 2
    const emoji      = multiplier === 2 ? "⚡" : "🚀"

    const sessionData = sessions.get(m.sender)
    if (!sessionData) return reply(
`╭──「 ❌ *Session Expired* 」
│
│  Kirim ulang gambar dengan *.hdv2*
╰─────────────────────`
    )

    sessions.delete(m.sender)
    await Morela.sendMessage(m.chat, { react: { text: "⏳", key: m.key } })

    try {
      const resultBuffer = await imageUpscaler(sessionData.buffer, sessionData.filename, multiplier)
      const imgbbUrl     = await uploadImgBB(resultBuffer)

      const caption =
`╭──「 ✨ *Upscale Selesai!* 」
│
│  ${emoji} Level   » *${multiplier}x*
│  📁 Ukuran  » *${(resultBuffer.length / 1024).toFixed(1)} KB*
│
╰─────────────────────
_© ${botName}_`

      await Morela.sendMessage(
        m.chat,
        {
          image: imgbbUrl ? { url: imgbbUrl } : resultBuffer,
          caption
        },
        { quoted: fkontak || m }
      )

      await Morela.sendMessage(m.chat, { react: { text: "✅", key: m.key } })

    } catch (e) {
      await reply(
`╭──「 ❌ *Upscale Gagal* 」
│
│  ${(e as Error)?.message || e}
╰─────────────────────`
      )
      await Morela.sendMessage(m.chat, { react: { text: "❌", key: m.key } })
    }
    return
  }

  const msg = m.message
  const img = msg?.imageMessage ||
    msg?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage

  if (!img) return reply(
`╭──「 🖼️ *Image Upscaler* 」
│
│  Kirim atau reply foto dengan
│  caption *.hdv2*
│
╰─────────────────────`
  )

  await Morela.sendMessage(m.chat, { react: { text: "⏳", key: m.key } })

  let buffer
  try {
    const stream = await downloadContentFromMessage(img, "image")
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    buffer = Buffer.concat(chunks)

    if (!buffer || buffer.length === 0) throw new Error("Buffer kosong")
    if (buffer.length < 1000)           throw new Error("Gambar terlalu kecil / corrupt")
    if (buffer.length > 5 * 1024 * 1024) {
      await Morela.sendMessage(m.chat, { react: { text: "❌", key: m.key } })
      return reply("❌ Gambar terlalu besar! Maks *5MB*")
    }
  } catch (err) {
    await Morela.sendMessage(m.chat, { react: { text: "❌", key: m.key } })
    return reply("❌ Gagal download gambar: " + (err as Error).message)
  }

  sessions.set(m.sender, {
    buffer,
    filename: `image_${Date.now()}.jpg`
  })

  const menuBuffer = fs.existsSync(MENU_IMG) ? fs.readFileSync(MENU_IMG) : null

  const footer =
`╭──「 🖼️ *Image Upscaler* 」
│
│  ✦ Pilih level upscale di bawah
│
│  ⚡ *2x*  →  Cepat & ringan
│  🚀 *4x*  →  Kualitas maksimal
│
╰─────────────────────
© ${botName}`

  await Morela.sendMessage(
    m.chat,
    {
      ...(menuBuffer
        ? { image: menuBuffer, caption: ' ' }
        : { text: ' ' }
      ),
      footer,
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({ display_text: "⚡ Upscale 2x", id: ".hdv2_2x" })
        },
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({ display_text: "🚀 Upscale 4x", id: ".hdv2_4x" })
        }
      ],
      hasMediaAttachment: !!menuBuffer
    },
    { quoted: fkontak || m }
  )

  await Morela.sendMessage(m.chat, { react: { text: "✅", key: m.key } })
}

handler.help    = ["hdv2 <reply foto>"]
handler.tags    = ["tools"]
handler.command = ["hdv2", "hdv2_2x", "hdv2_4x"]

export default handler