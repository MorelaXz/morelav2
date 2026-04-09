// @ts-nocheck
import fs from "fs"
import axios from "axios"

const IMGBB_KEY = "a0fa1c4b6c7b1570879c6d71b590f4bf"



async function uploadImgBB(buffer: Buffer) {
  try {
    const base64 = buffer.toString("base64")

    const upload = await axios.post(
      `https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`,
      new URLSearchParams({ image: base64 }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 30000
      }
    )

    const url = upload.data?.data?.url
    if (!url) throw new Error("No URL returned from ImgBB")
    
    return url
  } catch (error) {
    if (error.response) {
      throw new Error(`ImgBB Error: ${error.response.status} - ${error.response.data?.error?.message || error.response.statusText}`)
    }
    throw new Error(`Upload failed: ${(error as Error).message}`)
  }
}



const handler = async (m: any, { text, Morela, reply, downloadContentFromMessage, fkontak }: any) => {
  const name = text?.trim()
  if (!name) return reply("❌ Kirim/reply gambar + .fakeml Nama\n\nContoh:\n.fakeml SULTAN GAMING")

  const msg = m.message
  const img =
    msg?.imageMessage ||
    msg?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage

  if (!img) {
    return reply("❌ Kirim atau reply gambar terlebih dahulu.")
  }

  await Morela.sendMessage(m.chat, {
    react: { text: "⏳", key: m.key }
  })

  let tmpOutput = null

  try {
    
    const stream = await downloadContentFromMessage(img, "image")
    const chunks = []
    for await (const c of stream) {
      chunks.push(c)
    }
    const buffer = Buffer.concat(chunks)

    if (!buffer || buffer.length === 0) {
      return reply("❌ Gagal mendownload gambar.")
    }

    const avatarUrl = await uploadImgBB(buffer)

    const api = `https://api.deline.web.id/maker/fakeml?text=${encodeURIComponent(name)}&avatar=${encodeURIComponent(avatarUrl)}`

    const res = await axios.get(api, {
      responseType: "arraybuffer",
      timeout: 60000,
      validateStatus: () => true
    })

    const contentType = res.headers['content-type'] || ''

    if (!contentType.startsWith('image/')) {
      const errorText = Buffer.from(res.data).toString('utf-8')
      return reply(`❌ API Error:\n\n${errorText.substring(0, 200)}`)
    }

    const resultBuffer = Buffer.from(res.data)

    if (resultBuffer.length < 1000) {
      return reply("❌ Response terlalu kecil, kemungkinan error dari API")
    }

    if (!fs.existsSync('./tmp')) {
      fs.mkdirSync('./tmp', { recursive: true })
    }

    tmpOutput = `./tmp/fakeml-output-${Date.now()}.jpg`
    fs.writeFileSync(tmpOutput, resultBuffer)

    await Morela.sendMessage(
      m.chat,
      {
        image: fs.readFileSync(tmpOutput)
      },
      { quoted: fkontak || m }
    )

    await Morela.sendMessage(m.chat, {
      react: { text: "✅", key: m.key }
    })

    if (fs.existsSync(tmpOutput)) fs.unlinkSync(tmpOutput)

  } catch (e) {
    console.error("[FAKEML ERROR]:", e)

    if (tmpOutput && fs.existsSync(tmpOutput)) fs.unlinkSync(tmpOutput)

    await Morela.sendMessage(m.chat, {
      react: { text: "❌", key: m.key }
    })

    let errorMsg = (e as Error).message
    if (e.response) {
      errorMsg = `HTTP ${e.response.status}: ${e.response.statusText}`
    } else if (e.code === 'ECONNABORTED') {
      errorMsg = "Timeout - API terlalu lama"
    } else if (e.code === 'ENOTFOUND') {
      errorMsg = "Domain tidak ditemukan"
    }

    reply(`❌ *Error saat membuat fake ML profile*\n\n${errorMsg}\n\n💡 Tips:\n• Coba lagi dalam beberapa saat\n• Gunakan gambar dengan ukuran lebih kecil\n• Pastikan koneksi internet stabil`)
  }
}

handler.command = ["fakeml", "mlbbfake", "mlcard", "mlfake"]
handler.help = ["fakeml <nama> - Buat fake ML profile"]
handler.tags = ["maker"]

export default handler