import path from "path"
import axios from "axios"
import fs from "fs"
import { bi, buildFkontak, sendCard, uploadImage, createSend, menuBuf, CHANNEL_URL, OWNER_WA, BOT_JID, imagePath, botName, botVersion } from '../../Library/utils.js'

function randomTime() {
const h = Math.floor(Math.random() * 24).toString().padStart(2, "0")
const m = Math.floor(Math.random() * 60).toString().padStart(2, "0")
return `${h}:${m}`
}

const handler = async (m: any, { Morela, reply, text, fkontak }: any) => {
const input = text?.trim()
if (!input) return reply("Contoh: .iqc teks lu, jangan kosong gitu doang")

await Morela.sendMessage(m.chat, { react: { text: "⏳", key: m.key } })

try {
const res = await axios.get("https://api.deline.web.id/maker/iqc", {
params: {
text:          input,
chatTime:      randomTime(),
statusBarTime: randomTime()
},
responseType: "arraybuffer",
headers: {
"User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/120 Safari/537.36",
Accept: "image/*"
},
timeout: 30000
})

const type = res.headers["content-type"] || ""  
if (!type.startsWith("image/")) throw new Error("Bukan gambar")  

await Morela.sendMessage(m.chat, {  
  image: Buffer.from(res.data),  
  caption: "nih hasilnya. jangan banyak komentar."  
}, { quoted: fkontak || m })  

await Morela.sendMessage(m.chat, { react: { text: "✅", key: m.key } })

} catch (e) {
console.error("[IQC ERROR]", (e as Error).message)
await Morela.sendMessage(m.chat, { react: { text: "❌", key: m.key } })
reply("❌ Gagal. mungkin request lo juga ga jelas.\nError: " + (e as Error).message)
}
}

handler.command = ["iqc"]
handler.tags    = ["tools"]
handler.help    = ["iqc <teks>"]

export default handler