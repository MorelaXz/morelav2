// @ts-nocheck
import fs from "fs"
import path from "path"
import axios from "axios"
import { bi, buildFkontak, sendCard, uploadImage, createSend, menuBuf, CHANNEL_URL, OWNER_WA, BOT_JID, imagePath, botName, botVersion } from '../../Library/utils.js'

async function generate(prompt: unknown, width: number, height: number) {
  const session_hash = Math.random().toString(36).slice(2)
  const payload = {
    data: [prompt,"nsfw, (low quality, worst quality:1.2), very displeasing, 3d, watermark, signature, ugly, poorly drawn",0,true,width,height,7,28],
    event_data: null, fn_index: 0, trigger_id: 4, session_hash
  }
  const headers = {
    accept: "*/*", "content-type": "application/json",
    origin: "https://opparco-wainsfwillustrious-v120.hf.space",
    referer: "https://opparco-wainsfwillustrious-v120.hf.space/"
  }
  const join     = await axios.post("https://opparco-wainsfwillustrious-v120.hf.space/queue/join", payload, { headers })
  const eventId  = join.data.event_id
  const streamUrl = `https://opparco-wainsfwillustrious-v120.hf.space/queue/data?session_hash=${session_hash}&event_id=${eventId}`
  return new Promise(async (resolve, reject) => {
    const res = await axios.get(streamUrl, { headers, responseType: "stream" })
    res.data.on("data", chunk => {
      const lines = chunk.toString().split("\n")
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue
        const data = JSON.parse(line.replace("data: ", ""))
        if (data.msg === "process_completed") { res.data.destroy(); resolve(data) }
        if (data.msg === "queue_full")        { res.data.destroy(); reject(new Error("queue full")) }
      }
    })
  })
}

const handler = async (m: any, { Morela, reply, fkontak }: any) => {
  const prompt = m.text?.trim()
  if (!prompt) return reply("🖼️ Contoh: *.img anime girl*")

  await reply("⏳ Generating...")

  let result
  try {
    result = await generate(prompt, 768, 768)
  } catch {
    return reply("❌ Server penuh, coba lagi")
  }

  const url = result?.output?.data?.[0]?.url
  if (!url) return reply("❌ Gagal generate gambar")

  await Morela.sendMessage(m.chat, {
    image: { url },
    caption: `✨ AI Image Generator\nPrompt: ${prompt}`
  }, { quoted: fkontak || m })
}

handler.command = ["img"]
handler.tags    = ["ai"]
handler.help    = ["img <prompt>"]

export default handler