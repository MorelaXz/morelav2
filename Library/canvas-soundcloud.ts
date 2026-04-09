// @ts-nocheck
import { createCanvas, loadImage } from 'canvas'

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


function drawSCLogo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save()
  const cx = x + size * 0.5
  const cy = y + size * 0.54

  
  ctx.fillStyle = '#FF5500'
  roundRect(ctx, x, y, size, size, size * 0.22)
  ctx.fill()

  
  ctx.fillStyle = '#FFFFFF'
  const bars = [
    { h: 0.30, x: 0.18 },
    { h: 0.44, x: 0.28 },
    { h: 0.58, x: 0.38 },
    { h: 0.70, x: 0.48 },
    { h: 0.58, x: 0.58 },
    { h: 0.44, x: 0.68 },
    { h: 0.30, x: 0.78 },
  ]
  const bw = size * 0.06
  bars.forEach(b => {
    const bh = size * b.h
    const bx = x + size * b.x
    const by = cy - bh / 2
    roundRect(ctx, bx - bw / 2, by, bw, bh, bw / 2)
    ctx.fill()
  })

  ctx.restore()
}


function drawWaveform(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.save()
  ctx.fillStyle = color
  const bars = 60
  const bw    = w / bars - 1
  for (let i = 0; i < bars; i++) {
    const rand = 0.15 + Math.abs(Math.sin(i * 0.7 + 1.2)) * 0.7 + Math.abs(Math.sin(i * 0.3)) * 0.15
    const bh   = h * Math.min(rand, 1)
    const bx   = x + i * (bw + 1)
    const by   = y + (h - bh) / 2
    roundRect(ctx, bx, by, bw, bh, 1)
    ctx.fill()
  }
  ctx.restore()
}

function fmtNum(n: number) {
  if (!n) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

function trim(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 0 && ctx.measureText(t + '...').width > maxW) t = t.slice(0, -1)
  return t + '...'
}


export async function canvasSoundCloud(tracks: unknown[], query: string) {
  const W       = 1280
  const TOTAL_H = 720
  const PAD     = 24

  
  const BG      = '#121212'
  const BG2     = '#1A1A1A'
  const PANEL   = '#222222'
  const ORANGE  = '#FF5500'
  const WHITE   = '#FFFFFF'
  const GRAY    = '#999999'
  const LGRAY   = '#CCCCCC'
  const DARK    = '#2A2A2A'
  const DKLINE  = '#333333'

  const SIDEBAR_W = 210
  const MX        = SIDEBAR_W + PAD
  const MW        = W - MX - PAD
  const HEADER_H  = 56
  const ROW_H     = 72

  const cvs = createCanvas(W, TOTAL_H)
  const ctx = cvs.getContext('2d')

  
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, TOTAL_H)

  
  ctx.fillStyle = BG2
  ctx.fillRect(0, 0, SIDEBAR_W, TOTAL_H)

  
  drawSCLogo(ctx, 16, 12, 32)
  ctx.fillStyle = WHITE
  ctx.font = 'bold 18px sans-serif'
  ctx.fillText('SoundCloud', 56, 34)

  
  const navItems = [
    { icon: '⌂', label: 'Home',     active: false },
    { icon: '♪', label: 'Feed',     active: false },
    { icon: '⊞', label: 'Library',  active: false },
    { icon: '⊕', label: 'Upload',   active: false },
  ]
  navItems.forEach((n, i) => {
    const ny = HEADER_H + 20 + i * 38
    ctx.fillStyle = n.active ? ORANGE : GRAY
    ctx.font = n.active ? 'bold 13px sans-serif' : '13px sans-serif'
    ctx.fillText(`${n.icon}  ${n.label}`, 20, ny)
  })

  
  ctx.fillStyle = DKLINE
  ctx.fillRect(0, HEADER_H + 175, SIDEBAR_W, 1)

  
  ctx.fillStyle = GRAY
  ctx.font = 'bold 10px sans-serif'
  ctx.fillText('RECENTLY PLAYED', 16, HEADER_H + 200)
  const recentItems = ['Alan Walker', 'Trap Nation', 'NCS Release']
  recentItems.forEach((r, i) => {
    ctx.fillStyle = '#555'
    roundRect(ctx, 16, HEADER_H + 212 + i * 34, 32, 32, 3)
    ctx.fill()
    ctx.fillStyle = LGRAY
    ctx.font = '11px sans-serif'
    ctx.fillText(r, 56, HEADER_H + 232 + i * 34)
  })

  
  ctx.fillStyle = BG2
  ctx.fillRect(SIDEBAR_W, 0, W - SIDEBAR_W, HEADER_H)
  ctx.fillStyle = DKLINE
  ctx.fillRect(SIDEBAR_W, HEADER_H - 1, W - SIDEBAR_W, 1)

  
  const sbW = 420, sbH = 32, sbX = MX, sbY = (HEADER_H - sbH) / 2
  ctx.fillStyle = DARK
  roundRect(ctx, sbX, sbY, sbW, sbH, 16)
  ctx.fill()
  ctx.strokeStyle = '#444'
  ctx.lineWidth = 1
  ctx.stroke()

  
  ctx.strokeStyle = GRAY
  ctx.lineWidth   = 1.8
  ctx.beginPath()
  ctx.arc(sbX + 18, sbY + 16, 7, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(sbX + 23, sbY + 21)
  ctx.lineTo(sbX + 28, sbY + 26)
  ctx.stroke()

  ctx.fillStyle = WHITE
  ctx.font = '13px sans-serif'
  const qShow = query.length > 35 ? query.slice(0, 33) + '...' : query
  ctx.fillText(qShow, sbX + 36, sbY + 21)

  
  ctx.fillStyle = ORANGE
  ctx.beginPath()
  ctx.arc(W - PAD - 16, HEADER_H / 2, 16, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = WHITE
  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('ME', W - PAD - 16, HEADER_H / 2 + 4)
  ctx.textAlign = 'left'

  
  const BY = HEADER_H + 18
  ctx.fillStyle = GRAY
  ctx.font = '12px sans-serif'
  ctx.fillText('Search results for ', MX, BY)
  ctx.fillStyle = WHITE
  ctx.font = 'bold 12px sans-serif'
  const titleStart = MX + ctx.measureText('Search results for ').width + 40
  
  ctx.fillStyle = GRAY
  ctx.font = '12px sans-serif'
  ctx.fillText(`Search results for "`, MX, BY)
  ctx.fillStyle = WHITE
  ctx.font = 'bold 12px sans-serif'
  const pfx = ctx.measureText('Search results for "').width
  ctx.fillText(query, MX + pfx, BY)
  ctx.fillStyle = GRAY
  ctx.font = '12px sans-serif'
  const pfx2 = pfx + ctx.measureText(query).width
  ctx.fillText('"', MX + pfx2, BY)

  
  const total = tracks.length
  ctx.fillStyle = GRAY
  ctx.font = '11px sans-serif'
  ctx.fillText(`Found ${total}+ tracks`, MX, BY + 16)

  
  const tabY   = HEADER_H + 42
  const tabs   = ['Everything', 'Tracks', 'People', 'Albums', 'Playlists']
  let tabX     = MX
  tabs.forEach((tab, i) => {
    ctx.font = 'bold 12px sans-serif'
    const tw = ctx.measureText(tab).width + 22
    const tH = 28, tY = tabY
    if (i === 0) {
      
      ctx.fillStyle = DARK
      roundRect(ctx, tabX, tY, tw, tH, 14)
      ctx.fill()
      ctx.strokeStyle = ORANGE
      ctx.lineWidth   = 2
      ctx.beginPath()
      ctx.moveTo(tabX + 4, tY + tH)
      ctx.lineTo(tabX + tw - 4, tY + tH)
      ctx.stroke()
      ctx.fillStyle = WHITE
    } else {
      ctx.fillStyle = 'transparent'
      ctx.fillStyle = GRAY
    }
    ctx.font = i === 0 ? 'bold 12px sans-serif' : '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(tab, tabX + tw / 2, tY + 18)
    ctx.textAlign = 'left'
    tabX += tw + 10
  })

  
  const listY   = tabY + 36
  const maxRows = Math.min(tracks.length, 7)

  for (let i = 0; i < maxRows; i++) {
    const t  = tracks[i]
    const ry = listY + i * ROW_H

    
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.02)'
      ctx.fillRect(MX - 8, ry, MW + 16, ROW_H)
    }

    
    if (i > 0) {
      ctx.fillStyle = DKLINE
      ctx.fillRect(MX, ry, MW, 1)
    }

    const thumbSz = 52
    const thumbY  = ry + (ROW_H - thumbSz) / 2

    
    const thumbUrl = (t.artwork_url || '')
      .replace('-large', '-t200x200')
      .replace('-t500x500', '-t200x200')

    let imgDrawn = false
    if (thumbUrl) {
      try {
        const img = await loadImage(thumbUrl)
        ctx.save()
        roundRect(ctx, MX, thumbY, thumbSz, thumbSz, 3)
        ctx.clip()
        ctx.drawImage(img, MX, thumbY, thumbSz, thumbSz)
        ctx.restore()
        imgDrawn = true
      } catch {}
    }
    if (!imgDrawn) {
      ctx.fillStyle = PANEL
      roundRect(ctx, MX, thumbY, thumbSz, thumbSz, 3)
      ctx.fill()
      
      ctx.fillStyle = GRAY
      ctx.font = '22px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('♪', MX + thumbSz / 2, thumbY + thumbSz / 2 + 8)
      ctx.textAlign = 'left'
    }

    
    if (i === 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.beginPath()
      ctx.arc(MX + thumbSz / 2, thumbY + thumbSz / 2, thumbSz / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = WHITE
      ctx.beginPath()
      ctx.moveTo(MX + thumbSz * 0.34, thumbY + thumbSz * 0.28)
      ctx.lineTo(MX + thumbSz * 0.72, thumbY + thumbSz * 0.5)
      ctx.lineTo(MX + thumbSz * 0.34, thumbY + thumbSz * 0.72)
      ctx.closePath()
      ctx.fill()
    }

    const infoX = MX + thumbSz + 14
    const infoW = MW - thumbSz - 14 - 200  

    
    ctx.fillStyle = WHITE
    ctx.font = 'bold 13px sans-serif'
    ctx.fillText(trim(ctx, t.title || 'Unknown', infoW - 10), infoX, ry + 24)

    
    ctx.fillStyle = GRAY
    ctx.font = '12px sans-serif'
    const artist = t.user?.username || 'Unknown'
    ctx.fillText(trim(ctx, artist, infoW - 10), infoX, ry + 40)

    
    const genre = t.genre
    if (genre) {
      ctx.fillStyle = DARK
      const gw = ctx.measureText(genre).width + 14
      roundRect(ctx, infoX, ry + 46, gw, 16, 8)
      ctx.fill()
      ctx.fillStyle = GRAY
      ctx.font = '9px sans-serif'
      ctx.fillText(genre.slice(0, 18), infoX + 7, ry + 57)
    }

    
    const wfX = MX + thumbSz + 14 + infoW + 10
    const wfW = 200
    const wfY = ry + 20
    const wfH = 28
    drawWaveform(ctx, wfX, wfY, wfW, wfH, i === 0 ? ORANGE : '#444')
    
    if (i === 0) {
      drawWaveform(ctx, wfX, wfY, wfW * 0.3, wfH, ORANGE)
    }

    
    const dur   = t.duration || 0
    const mins  = Math.floor(dur / 60000)
    const secs  = Math.floor((dur % 60000) / 1000)
    const durTx = `${mins}:${secs.toString().padStart(2, '0')}`
    ctx.fillStyle = GRAY
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(durTx, MX + MW, ry + 28)
    ctx.textAlign = 'left'

    
    const plays = fmtNum(t.playback_count)
    const likes = fmtNum(t.likes_count)

    ctx.fillStyle = GRAY
    ctx.font      = '10px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`▶ ${plays}`, MX + MW, ry + 44)
    ctx.fillText(`♥ ${likes}`, MX + MW - 60, ry + 44)
    ctx.textAlign = 'left'

    
    ctx.fillStyle = GRAY
    ctx.font = 'bold 16px sans-serif'
    ctx.fillText('···', MX + MW - 16, ry + 58)
  }

  
  const FY = TOTAL_H - 48
  ctx.fillStyle = '#1A1A1A'
  ctx.fillRect(0, FY, W, 48)
  ctx.fillStyle = DKLINE
  ctx.fillRect(0, FY, W, 1)

  
  const controls = ['⏮', '⏪', '▶', '⏩', '⏭']
  controls.forEach((c, i) => {
    const cx = W / 2 - 60 + i * 30
    ctx.fillStyle = i === 2 ? WHITE : GRAY
    ctx.font = i === 2 ? 'bold 18px sans-serif' : '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(c, cx, FY + 28)
  })

  
  ctx.fillStyle = GRAY
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('0:00', W / 2 - 120, FY + 30)
  ctx.textAlign = 'right'
  ctx.fillText('10:39', W / 2 + 120, FY + 30)

  
  ctx.fillStyle = '#444'
  roundRect(ctx, W / 2 - 110, FY + 34, 220, 3, 2)
  ctx.fill()
  ctx.fillStyle = ORANGE
  roundRect(ctx, W / 2 - 110, FY + 34, 0, 3, 2)
  ctx.fill()

  
  ctx.fillStyle = GRAY
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('🔊  ──────', W - 20, FY + 30)
  ctx.textAlign = 'left'

  
  ctx.fillStyle = '#444'
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Morela Bot • SoundCloud Search', W / 2, TOTAL_H - 2)
  ctx.textAlign = 'left'

  return cvs.toBuffer('image/png')
}
