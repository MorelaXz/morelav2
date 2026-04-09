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

function drawSpotifyLogo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save()
  ctx.fillStyle = '#1DB954'
  ctx.beginPath()
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#000'
  ctx.lineCap = 'round'
  const arcs = [
    { r: size * 0.28, dy: size * 0.18 },
    { r: size * 0.21, dy: size * 0.30 },
    { r: size * 0.14, dy: size * 0.42 },
  ]
  for (const a of arcs) {
    ctx.lineWidth = size * 0.07
    ctx.beginPath()
    ctx.arc(x + size * 0.36, y + size * 0.5 + a.dy - a.r, a.r, Math.PI * 1.15, Math.PI * 1.9)
    ctx.stroke()
  }
  ctx.restore()
}

export async function canvasSpotify(tracks: unknown[], query: string) {
  const W       = 1280
  const PAD     = 28
  const BG      = '#121212'
  const BG2     = '#181818'
  const GREEN   = '#1DB954'
  const WHITE   = '#FFFFFF'
  const GRAY    = '#B3B3B3'
  const DARK    = '#282828'

  
  const HEADER_H  = 64
  const SEARCH_H  = 52
  const TABS_H    = 48
  const SEC_H     = 36       
  const TOP_H     = 200      
  const ROW_H     = 64       
  const FOOTER_H  = 32

  const songCount = Math.min(tracks.length, 7)
  const TOTAL_H   = 720

  const cvs = createCanvas(W, TOTAL_H)
  const ctx = cvs.getContext('2d')

  
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, TOTAL_H)

  
  ctx.fillStyle = BG2
  ctx.fillRect(0, 0, 220, TOTAL_H)
  ctx.fillStyle = '#1A1A1A'
  ctx.fillRect(220, 0, 1, TOTAL_H)

  
  ctx.fillStyle = BG2
  ctx.fillRect(0, 0, W, HEADER_H)

  
  drawSpotifyLogo(ctx, 16, 16, 32)
  ctx.fillStyle = WHITE
  ctx.font = 'bold 22px sans-serif'
  ctx.fillText('Spotify', 56, 38)

  
  const navItems = ['Beranda', 'Cari', 'Koleksi Kamu']
  navItems.forEach((item, i) => {
    ctx.fillStyle = i === 1 ? WHITE : GRAY
    ctx.font = i === 1 ? 'bold 13px sans-serif' : '13px sans-serif'
    ctx.fillText(item, 18, HEADER_H + 28 + i * 36)
  })

  
  ctx.fillStyle = DARK
  roundRect(ctx, 12, HEADER_H + 128, 196, 60, 8)
  ctx.fill()
  ctx.fillStyle = WHITE
  ctx.font = 'bold 12px sans-serif'
  ctx.fillText('Buat playlist pertamamu', 20, HEADER_H + 152)
  ctx.fillStyle = GRAY
  ctx.font = '10px sans-serif'
  ctx.fillText('Caranya mudah, kami akan', 20, HEADER_H + 166)
  ctx.fillText('membantumu', 20, HEADER_H + 178)

  
  ctx.fillStyle = WHITE
  roundRect(ctx, 20, HEADER_H + 182, 100, 22, 11)
  ctx.fill()
  ctx.fillStyle = '#000'
  ctx.font = 'bold 10px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Buat playlist', 70, HEADER_H + 197)
  ctx.textAlign = 'left'

  
  const MX = 232  
  const MW = W - MX - PAD  

  
  const SY = HEADER_H + 10
  ctx.fillStyle = '#2A2A2A'
  roundRect(ctx, MX, SY, MW, 34, 17)
  ctx.fill()
  ctx.strokeStyle = '#3E3E3E'
  ctx.lineWidth = 1
  ctx.stroke()

  
  ctx.strokeStyle = GRAY
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.arc(MX + 18, SY + 17, 7, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(MX + 23, SY + 22)
  ctx.lineTo(MX + 28, SY + 27)
  ctx.stroke()

  ctx.fillStyle = WHITE
  ctx.font = '13px sans-serif'
  const qShow = query.length > 40 ? query.slice(0, 38) + '...' : query
  ctx.fillText(qShow, MX + 36, SY + 21)

  
  ctx.fillStyle = GRAY
  ctx.font = '14px sans-serif'
  ctx.fillText('✕', MX + MW - 24, SY + 22)

  
  const TY = HEADER_H + SEARCH_H + 4
  const tabs = ['Semua', 'Lagu', 'Playlist', 'Artis', 'Album', 'Profil', 'Podcast & Acara']
  let tx = MX
  tabs.forEach((tab, i) => {
    ctx.font = 'bold 12px sans-serif'
    const tw = ctx.measureText(tab).width + 22
    const tH = 30, tY = TY + 9
    if (i === 0) {
      ctx.fillStyle = WHITE
      roundRect(ctx, tx, tY, tw, tH, 15)
      ctx.fill()
      ctx.fillStyle = '#000'
    } else {
      ctx.fillStyle = '#2A2A2A'
      roundRect(ctx, tx, tY, tw, tH, 15)
      ctx.fill()
      ctx.fillStyle = WHITE
    }
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(tab, tx + tw / 2, tY + 20)
    ctx.textAlign = 'left'
    tx += tw + 8
  })

  
  const topTrack = tracks[0]
  const secY1    = HEADER_H + SEARCH_H + TABS_H
  ctx.fillStyle  = WHITE
  ctx.font       = 'bold 16px sans-serif'
  ctx.fillText('Hasil teratas', MX, secY1 + 24)

  const cardY = secY1 + SEC_H
  const cardW = 200

  
  ctx.fillStyle = DARK
  roundRect(ctx, MX, cardY, cardW, TOP_H, 8)
  ctx.fill()

  
  try {
    const img = await loadImage(topTrack.thumbnail)
    ctx.save()
    roundRect(ctx, MX + 12, cardY + 12, cardW - 24, 120, 6)
    ctx.clip()
    ctx.drawImage(img, MX + 12, cardY + 12, cardW - 24, 120)
    ctx.restore()
  } catch {
    ctx.fillStyle = '#3E3E3E'
    roundRect(ctx, MX + 12, cardY + 12, cardW - 24, 120, 6)
    ctx.fill()
  }

  
  ctx.fillStyle = WHITE
  ctx.font = 'bold 15px sans-serif'
  const topTitle = topTrack.title.length > 22 ? topTrack.title.slice(0, 20) + '..' : topTrack.title
  ctx.fillText(topTitle, MX + 12, cardY + 148)
  ctx.fillStyle = GRAY
  ctx.font = '12px sans-serif'
  const topArtist = topTrack.artist.length > 26 ? topTrack.artist.slice(0, 24) + '..' : topTrack.artist
  ctx.fillText('Lagu • ' + topArtist, MX + 12, cardY + 165)

  
  ctx.fillStyle = GREEN
  ctx.beginPath()
  ctx.arc(MX + cardW - 28, cardY + TOP_H - 20, 18, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.moveTo(MX + cardW - 35, cardY + TOP_H - 27)
  ctx.lineTo(MX + cardW - 35, cardY + TOP_H - 13)
  ctx.lineTo(MX + cardW - 18, cardY + TOP_H - 20)
  ctx.closePath()
  ctx.fill()

  
  const listX  = MX + cardW + 20
  const listW  = MW - cardW - 20
  ctx.fillStyle = WHITE
  ctx.font      = 'bold 16px sans-serif'
  ctx.fillText('Lagu', listX, secY1 + 24)

  for (let i = 0; i < Math.min(tracks.length, 4); i++) {
    const t  = tracks[i]
    const ry = cardY + i * ROW_H

    
    if (i === 0) {
      ctx.fillStyle = '#2A2A2A'
      roundRect(ctx, listX - 8, ry + 4, listW + 16, ROW_H - 4, 6)
      ctx.fill()
    }

    
    try {
      const img = await loadImage(t.thumbnail)
      ctx.save()
      roundRect(ctx, listX, ry + 10, 44, 44, 4)
      ctx.clip()
      ctx.drawImage(img, listX, ry + 10, 44, 44)
      ctx.restore()
    } catch {
      ctx.fillStyle = '#3E3E3E'
      roundRect(ctx, listX, ry + 10, 44, 44, 4)
      ctx.fill()
    }

    
    ctx.fillStyle = WHITE
    ctx.font = 'bold 13px sans-serif'
    const title = t.title.length > 35 ? t.title.slice(0, 33) + '..' : t.title
    ctx.fillText(title, listX + 54, ry + 28)

    
    ctx.fillStyle = GRAY
    ctx.font = '11px sans-serif'
    const artist = t.artist.length > 40 ? t.artist.slice(0, 38) + '..' : t.artist
    ctx.fillText(artist, listX + 54, ry + 44)

    
    ctx.fillStyle = GRAY
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(t.duration || '', listX + listW, ry + 36)
    ctx.textAlign = 'left'

    
    ctx.strokeStyle = GRAY
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(listX + listW - 28, ry + 32, 8, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(listX + listW - 28, ry + 26)
    ctx.lineTo(listX + listW - 28, ry + 38)
    ctx.moveTo(listX + listW - 34, ry + 32)
    ctx.lineTo(listX + listW - 22, ry + 32)
    ctx.stroke()
  }

  
  const allY = secY1 + SEC_H + TOP_H + 16
  ctx.fillStyle = WHITE
  ctx.font = 'bold 16px sans-serif'
  ctx.fillText('Semua Hasil', MX, allY + 20)

  for (let i = 0; i < songCount; i++) {
    const t  = tracks[i]
    const ry = allY + SEC_H + i * ROW_H

    
    if (i > 0) {
      ctx.fillStyle = '#2A2A2A'
      ctx.fillRect(MX, ry, MW, 1)
    }

    
    try {
      const img = await loadImage(t.thumbnail)
      ctx.save()
      roundRect(ctx, MX, ry + 8, 46, 46, 4)
      ctx.clip()
      ctx.drawImage(img, MX, ry + 8, 46, 46)
      ctx.restore()
    } catch {
      ctx.fillStyle = '#3E3E3E'
      roundRect(ctx, MX, ry + 8, 46, 46, 4)
      ctx.fill()
    }

    
    ctx.fillStyle = GRAY
    ctx.font = 'bold 12px sans-serif'
    ctx.fillText(String(i + 1), MX + 52, ry + 26)

    
    ctx.fillStyle = WHITE
    ctx.font = 'bold 13px sans-serif'
    const title = t.title.length > 50 ? t.title.slice(0, 48) + '..' : t.title
    ctx.fillText(title, MX + 70, ry + 28)

    
    ctx.fillStyle = GRAY
    ctx.font = '11px sans-serif'
    const artist = t.artist.length > 55 ? t.artist.slice(0, 53) + '..' : t.artist
    ctx.fillText(artist, MX + 70, ry + 44)

    
    ctx.fillStyle = GRAY
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(t.duration || '', MX + MW, ry + 36)
    ctx.textAlign = 'left'
  }

  
  const ftY = TOTAL_H - FOOTER_H
  ctx.fillStyle = BG2
  ctx.fillRect(0, ftY, W, FOOTER_H)
  ctx.fillStyle = '#282828'
  ctx.fillRect(0, ftY, W, 1)
  ctx.fillStyle = GRAY
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Powered by Morela • Spotify Search', W / 2, ftY + 20)
  ctx.textAlign = 'left'

  return cvs.toBuffer('image/png')
}
