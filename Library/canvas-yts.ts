// @ts-nocheck
import { createCanvas, loadImage } from "canvas"

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(' ')
  const lines = []
  let current = ''
  for (const word of words) {
    const test = current ? current + ' ' + word : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

function drawYTLogo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = '#FF0000'
  roundRect(ctx, x, y, w, h, 5)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(x + w * 0.38, y + h * 0.25)
  ctx.lineTo(x + w * 0.72, y + h * 0.5)
  ctx.lineTo(x + w * 0.38, y + h * 0.75)
  ctx.closePath()
  ctx.fill()
}

function formatViews(v: unknown) {
  if (!v) return ''
  const raw = String(v).replace(/\D/g, '')
  const n = parseInt(raw) || 0
  
  return n.toLocaleString('en-US') + ' views'
}

export async function canvas(videos: unknown[], query: string) {
  const COLS     = 5
  const W        = 1050
  const PAD      = 14
  const HEADER_H = 58
  const TABS_H   = 46
  const GAP      = 10

  const colW   = Math.floor((W - PAD * 2 - GAP * (COLS - 1)) / COLS)
  const thumbH = Math.floor(colW * 9 / 16)
  
  const INFO_H = 68
  const CARD_H = thumbH + INFO_H

  const showCount = Math.min(videos.length, 15)
  const rows  = Math.ceil(showCount / COLS)
  const gridH = rows * CARD_H + (rows - 1) * GAP

  const FOOTER_H = 24
  const TOTAL_H  = HEADER_H + TABS_H + PAD + gridH + PAD + FOOTER_H

  const cvs = createCanvas(W, TOTAL_H)
  const ctx = cvs.getContext('2d')

  
  ctx.fillStyle = '#0f0f0f'
  ctx.fillRect(0, 0, W, TOTAL_H)

  
  
  
  ctx.fillStyle = '#212121'
  ctx.fillRect(0, 0, W, HEADER_H)
  ctx.fillStyle = '#303030'
  ctx.fillRect(0, HEADER_H - 1, W, 1)

  
  drawYTLogo(ctx, PAD, 14, 36, 24)
  ctx.fillStyle = '#f1f1f1'
  ctx.font = 'bold 18px sans-serif'
  ctx.fillText('YouTube', PAD + 46, 32)

  
  const sbW = 340, sbH = 32
  const sbX = (W - sbW) / 2
  const sbY = (HEADER_H - sbH) / 2
  ctx.fillStyle = '#121212'
  roundRect(ctx, sbX, sbY, sbW, sbH, 20)
  ctx.fill()
  ctx.strokeStyle = '#303030'
  ctx.lineWidth = 1.2
  ctx.stroke()

  
  ctx.strokeStyle = '#717171'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.arc(sbX + 17, sbY + sbH / 2, 6, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(sbX + 21, sbY + sbH / 2 + 4)
  ctx.lineTo(sbX + 26, sbY + sbH / 2 + 9)
  ctx.stroke()

  ctx.fillStyle = '#717171'
  ctx.font = '13px sans-serif'
  const qShow = query.length > 38 ? query.slice(0, 35) + '...' : query
  ctx.fillText(qShow, sbX + 32, sbY + 21)

  
  
  
  const tabsY = HEADER_H
  ctx.fillStyle = '#212121'
  ctx.fillRect(0, tabsY, W, TABS_H)
  ctx.fillStyle = '#303030'
  ctx.fillRect(0, tabsY + TABS_H - 1, W, 1)

  const tabs = ['Semua', 'Musik', 'Game', 'Live', 'Baru diupload', 'Berita']
  let tx = PAD
  for (let i = 0; i < tabs.length; i++) {
    const t = tabs[i]
    ctx.font = 'bold 12px sans-serif'
    const tw = ctx.measureText(t).width
    const tW = tw + 20, tH = 28
    const tX = tx, tY = tabsY + (TABS_H - tH) / 2

    if (i === 0) {
      
      ctx.fillStyle = '#f1f1f1'
      roundRect(ctx, tX, tY, tW, tH, 20)
      ctx.fill()
      ctx.fillStyle = '#0f0f0f'
    } else {
      
      ctx.fillStyle = '#0f0f0f'
      roundRect(ctx, tX, tY, tW, tH, 20)
      ctx.fill()
      ctx.strokeStyle = '#3d3d3d'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.fillStyle = '#f1f1f1'
    }
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(t, tX + tW / 2, tY + 18)
    ctx.textAlign = 'left'
    tx += tW + 8
  }

  
  
  
  const gridY = HEADER_H + TABS_H + PAD
  const showVideos = videos.slice(0, showCount)

  for (let i = 0; i < showVideos.length; i++) {
    const v   = showVideos[i]
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const cx  = PAD + col * (colW + GAP)
    const cy  = gridY + row * (CARD_H + GAP)

    
    try {
      const url = 'https://i.ytimg.com/vi/' + v.videoId + '/mqdefault.jpg'
      const img = await loadImage(url)
      ctx.save()
      roundRect(ctx, cx, cy, colW, thumbH, 3)
      ctx.clip()
      ctx.drawImage(img, cx, cy, colW, thumbH)
      ctx.restore()
    } catch {
      ctx.fillStyle = '#1f1f1f'
      roundRect(ctx, cx, cy, colW, thumbH, 3)
      ctx.fill()
      ctx.fillStyle = '#555'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('No Image', cx + colW / 2, cy + thumbH / 2 + 3)
      ctx.textAlign = 'left'
    }

    
    if (v.duration) {
      ctx.font = 'bold 9px sans-serif'
      const dw = ctx.measureText(v.duration).width + 8
      ctx.fillStyle = 'rgba(0,0,0,0.88)'
      roundRect(ctx, cx + colW - dw - 3, cy + thumbH - 17, dw, 13, 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.fillText(v.duration, cx + colW - dw / 2 - 3, cy + thumbH - 7)
      ctx.textAlign = 'left'
    }

    
    const iX = cx
    let   iY = cy + thumbH + 12

    
    ctx.font = 'bold 11px sans-serif'
    ctx.fillStyle = '#f1f1f1'
    const titleLines = wrapText(ctx, v.title || '', colW)
    ctx.fillText(titleLines[0] || '', iX, iY)
    iY += 14
    if (titleLines[1]) {
      const l2 = ctx.measureText(titleLines[1]).width > colW
        ? titleLines[1].slice(0, Math.floor(colW / 6.8)) + '...'
        : titleLines[1]
      ctx.fillText(l2, iX, iY)
    }
    iY += 14

    
    ctx.font = '10px sans-serif'
    ctx.fillStyle = '#aaaaaa'
    const ch = (v.channel || '').length > 26
      ? (v.channel || '').slice(0, 24) + '...'
      : (v.channel || '')
    ctx.fillText(ch, iX, iY)
    iY += 13

    
    const views = formatViews(v.views)
    const ago   = v.ago || v.uploadedAt || ''
    const meta  = [views, ago].filter(Boolean).join(' • ')
    ctx.font = '10px sans-serif'
    ctx.fillStyle = '#aaaaaa'
    ctx.fillText(meta.length > 32 ? meta.slice(0, 30) + '...' : meta, iX, iY)
  }

  
  
  
  const ftY = TOTAL_H - FOOTER_H
  ctx.fillStyle = '#212121'
  ctx.fillRect(0, ftY, W, FOOTER_H)
  ctx.fillStyle = '#303030'
  ctx.fillRect(0, ftY, W, 1)
  ctx.fillStyle = '#717171'
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Powered by Morela', W / 2, ftY + 16)
  ctx.textAlign = 'left'

  return cvs.toBuffer('image/png')
}
