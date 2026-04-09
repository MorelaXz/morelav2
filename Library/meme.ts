// @ts-nocheck
import { createCanvas, loadImage, registerFont } from 'canvas'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url as string)
const __dirname  = path.dirname(__filename)


const fontPath = path.join(__dirname, 'impact.ttf')
if (fs.existsSync(fontPath)) {
  registerFont(fontPath, { family: 'Impact' })
}

function wrapText(context: unknown, text: string, maxWidth: number) {
  const words = text.split(' ')
  const lines = []
  let currentLine = words[0]

  for (let i = 1; i < words.length; i++) {
    const word  = words[i]
    const width = context.measureText(currentLine + ' ' + word).width
    if (width < maxWidth) {
      currentLine += ' ' + word
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }
  lines.push(currentLine)
  return lines
}

function drawTextWithOutline(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fillStyle: unknown = 'white', strokeStyle: unknown = 'black', lineWidth: unknown = 4) {
  ctx.strokeStyle = strokeStyle
  ctx.lineWidth   = lineWidth
  ctx.lineJoin    = 'round'
  ctx.strokeText(text, x, y)

  ctx.fillStyle = fillStyle
  ctx.fillText(text, x, y)
}

async function createMeme(buffer: unknown, topText: unknown, bottomText: unknown) {
  try {
    const image  = await loadImage(buffer)
    const canvas = createCanvas(image.width, image.height)
    const ctx    = canvas.getContext('2d')

    ctx.drawImage(image, 0, 0, image.width, image.height)

    const baseFontSize = Math.max(image.width * 0.17, 32)
    ctx.font         = `bold ${baseFontSize}px Impact, Arial`
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'top'

    const margin   = image.width * 0.05
    const maxWidth = image.width - margin * 2

    if (topText && topText.trim()) {
      const topLines  = wrapText(ctx, topText.toUpperCase(), maxWidth)
      const lineHeight = baseFontSize * 1.1

      topLines.forEach((line, index) => {
        drawTextWithOutline(
          ctx, line,
          image.width / 2,
          margin + index * lineHeight,
          'white', 'black',
          baseFontSize * 0.10
        )
      })
    }

    if (bottomText && bottomText.trim()) {
      const bottomLines     = wrapText(ctx, bottomText.toUpperCase(), maxWidth)
      const lineHeight      = baseFontSize * 1.1
      const visualAdjust    = baseFontSize * 0.1
      const totalTextHeight = (bottomLines.length - 1) * lineHeight + baseFontSize
      const startY          = image.height - margin - totalTextHeight + visualAdjust

      bottomLines.forEach((line, index) => {
        drawTextWithOutline(
          ctx, line,
          image.width / 2,
          startY + index * lineHeight,
          'white', 'black',
          baseFontSize * 0.10
        )
      })
    }

    return canvas.toBuffer('image/png')
  } catch (error) {
    throw new Error((error as Error).message || 'No result found.')
  }
}

export { createMeme }
export default { createMeme }
