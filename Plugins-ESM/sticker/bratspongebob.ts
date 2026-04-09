// @ts-nocheck
import { createCanvas, loadImage } from "canvas"
import fetch from "node-fetch"
import sharp from "sharp"

const handler = async (m: any, { Morela, text, reply, command, fkontak }: any) => {
  if (!text) return reply(
    `Masukkan teks!\n\nContoh:\n.${command} falzx hama banget jir`
  )

  try {
    const imageUrl = "https://img1.pixhost.to/images/11791/687260942_vynaa-valerie.jpg"
    const res = await fetch(imageUrl)
    const buffer = await res.arrayBuffer()
    const img = await loadImage(Buffer.from(buffer))

    const canvas = createCanvas(img.width, img.height)
    const ctx = canvas.getContext("2d")

    ctx.drawImage(img, 0, 0, img.width, img.height)

    const boardX = img.width * 0.55
    const boardY = img.height * 0.18
    const boardW = img.width * 0.35
    const boardH = img.height * 0.42

    ctx.fillStyle = "#000000"
    ctx.textAlign = "center"
    ctx.textBaseline = "top"

    const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
      const words = text.split(" ")
      let line = ""
      let lines = []

      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + " "
        if (ctx.measureText(testLine).width > maxWidth && i > 0) {
          lines.push(line)
          line = words[i] + " "
        } else {
          line = testLine
        }
      }

      lines.push(line)
      lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight))
      return lines.length * lineHeight
    }

    let fontSize = 52
    while (fontSize > 16) {
      ctx.font = `bold ${fontSize}px Arial`
      if (wrapText(ctx, text, -9999, -9999, boardW, fontSize + 6) <= boardH) break
      fontSize--
    }

    ctx.font = `bold ${fontSize}px Arial`
    wrapText(ctx, text, boardX + boardW / 2, boardY, boardW, fontSize + 6)

    const pngBuffer = canvas.toBuffer()
    const webpBuffer = await sharp(pngBuffer).webp({ quality: 90 }).toBuffer()

    await Morela.sendMessage(
      m.chat,
      { sticker: webpBuffer },
      { quoted: fkontak || m }
    )

  } catch (e) {
    console.error(e)
    reply("❌ Gagal membuat stiker")
  }
}

handler.command = ["bratspongebob", "spongebob"]
handler.tags = ["maker"]
handler.help = ["bratspongebob <teks>"]

export default handler