// @ts-nocheck
import { downloadContentFromMessage } from "@itsukichan/baileys"
import axios from "axios"
import FormData from "form-data"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { getTgToken, getTgChatId } from "../../Library/tg_global.js"

const __dirname    = path.dirname(fileURLToPath(import.meta.url as string))
const CONFIG_PATH  = path.join(__dirname, "../../data/rvo_tg.json")
const SENT_PATH    = path.join(__dirname, "../../data/rvo_sent.json")



const _sentCache = new Set()

function loadSentCache() {
  try {
    if (!fs.existsSync(SENT_PATH)) return
    const arr = JSON.parse(fs.readFileSync(SENT_PATH, "utf-8"))
    for (const k of arr) _sentCache.add(k)
  } catch {}
}

function markSent(hash: unknown) {
  _sentCache.add(hash)
  try {
    const arr = [..._sentCache].slice(-500) 
    fs.writeFileSync(SENT_PATH, JSON.stringify(arr, null, 2))
  } catch {}
}

function alreadySent(hash: unknown) {
  return _sentCache.has(hash)
}


loadSentCache()


function loadCfg() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      const def = { enabled: false, token: "", chatId: "" }
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(def, null, 2))
      return def
    }
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"))
  } catch { return { enabled: false, token: "", chatId: "" } }
}

const handler = async (m: any, { Morela, reply }: any) => {
  
  const ctxInfo =
    m.message?.extendedTextMessage?.contextInfo ||
    m.message?.imageMessage?.contextInfo ||
    m.message?.videoMessage?.contextInfo ||
    m.message?.documentMessage?.contextInfo ||
    {}

  const quoted = ctxInfo.quotedMessage
  if (!quoted) return

  try {
    
    const msg =
      quoted.viewOnceMessageV2?.message           ||
      quoted.viewOnceMessageV2Extension?.message  ||
      quoted.viewOnceMessage?.message             ||
      quoted.ephemeralMessage?.message            ||
      quoted

    const media =
      msg.imageMessage ||
      msg.videoMessage ||
      msg.audioMessage ||
      msg.documentMessage

    if (!media) return

    const mime = media.mimetype || ""
    let type = "document"

    if (mime.startsWith("image/")) type = "image"
    else if (mime.startsWith("video/")) type = "video"
    else if (mime.startsWith("audio/")) type = "audio"

    let stream
    try {
      stream = await downloadContentFromMessage(media, type)
    } catch (dlErr) {
      if ((dlErr as Error).message?.includes('bad decrypt') || (dlErr as Error).message?.includes('decrypt')) { console.log('[RVO] Skip media expired'); return }
      throw dlErr
    }
    let buffer = Buffer.from([])

    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk])
    }

    
    const cfg = loadCfg()
    if (cfg.enabled && (getTgToken() || cfg.token) && (getTgChatId() || cfg.chatId)) {

      
      const hash = media.fileSha256
        ? Buffer.from(media.fileSha256).toString("base64")
        : null

      if (hash && alreadySent(hash)) {
        console.log("[RVO] Skip — sudah dikirim sebelumnya:", hash.slice(0, 10))
        return
      }

      console.log('[RVO] Kirim ke Telegram...')
      await sendToTelegram(buffer, type, mime, media.caption, cfg)

      
      if (hash) markSent(hash)
    }

  } catch (e) {
    console.error("[RVO]", e)
  }
}


const sendToTelegram = async (buffer, type, mime, caption = "", cfg) => {
  try {
    const token  = getTgToken()  || cfg.token  || ''
    const chatId = getTgChatId() || cfg.chatId || ''
    if (!token || !chatId) return

    const fileName = `media_${Date.now()}.${getFileExtension(mime)}`
    const filePath = path.join("./temp", fileName)

    
    if (!fs.existsSync("./temp")) {
      fs.mkdirSync("./temp", { recursive: true })
    }

    
    fs.writeFileSync(filePath, buffer)

    const form = new FormData()
    form.append("chat_id", chatId)

    if (type === "image") {
      form.append("photo", fs.createReadStream(filePath))
      form.append("caption", caption || "📸 Foto dari View-Once")
    } else if (type === "video") {
      form.append("video", fs.createReadStream(filePath))
      form.append("caption", caption || "🎥 Video dari View-Once")
    } else if (type === "audio") {
      form.append("audio", fs.createReadStream(filePath))
      form.append("caption", caption || "🎵 Audio dari View-Once")
    } else {
      form.append("document", fs.createReadStream(filePath))
      form.append("caption", caption || "📄 Dokumen dari View-Once")
    }

    const endpoint = `https://api.telegram.org/bot${token}/send${
      type === "image"
        ? "Photo"
        : type === "video"
          ? "Video"
          : type === "audio"
            ? "Audio"
            : "Document"
    }`

    await axios.post(endpoint, form, {
      headers: form.getHeaders()
    })

    
    fs.unlinkSync(filePath)

    console.log("[TELEGRAM] Media berhasil dikirim")
  } catch (e) {
    console.error("[TELEGRAM ERROR]", e)
  }
}


const getFileExtension = (mime) => {
  const extensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "application/pdf": "pdf"
  }
  return extensions[mime] || "bin"
}

handler.tags    = ['passive']


export default handler