// @ts-nocheck
import { createCanvas, registerFont } from 'canvas'
import path from 'path'

const fontDir = path.join(process.cwd(), 'data/font')
try {
  registerFont(path.join(fontDir, 'Poppins-Bold.ttf'),    { family: 'Poppins', weight: 'bold' })
  registerFont(path.join(fontDir, 'Poppins-Regular.ttf'), { family: 'Poppins', weight: 'normal' })
  registerFont(path.join(fontDir, 'Poppins-Light.ttf'),   { family: 'Poppins', weight: '300' })
  registerFont(path.join(fontDir, 'Poppins-Medium.ttf'),  { family: 'Poppins', weight: '500' })
} catch {}

function roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
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


function drawOrnament(ctx: any, cx: number, cy: number, r: number, color: string, alpha = 0.15) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth   = 1.5
  ctx.translate(cx, cy)
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 8)
    ctx.beginPath()
    ctx.arc(0, -r * 0.6, r * 0.45, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

export interface QuranSurahData {
  nomor:       number
  nama:        string   
  namaLatin:   string
  jumlahAyat:  number
  tempatTurun: string
  arti:        string
}

export interface QuranAyatData extends QuranSurahData {
  ayatNum:     number
  teksArab:    string
  teksLatin:   string
  teksIndonesia: string
}


export async function canvasQuranSurah(d: QuranSurahData): Promise<Buffer> {
  const W = 900
  const H = 420

  const BG1    = '#0d1f1a'
  const BG2    = '#122b23'
  const GOLD   = '#c9a84c'
  const GREEN  = '#2ecc71'
  const WHITE  = '#f0ede5'
  const MUTED  = '#8a9e94'
  const CARD   = '#1a3028'

  const cvs = createCanvas(W, H)
  const ctx  = cvs.getContext('2d')

  
  const grad = ctx.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, BG1)
  grad.addColorStop(1, BG2)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  
  drawOrnament(ctx, -20,  -20,  180, GOLD, 0.12)
  drawOrnament(ctx, W+20, H+20, 200, GOLD, 0.10)
  drawOrnament(ctx, W-60, 40,   100, GREEN, 0.08)

  
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, W, 5)

  
  ctx.fillStyle = GREEN
  ctx.fillRect(0, 5, 5, H - 5)

  
  ctx.save()
  roundRect(ctx, 32, 28, 70, 70, 14)
  ctx.fillStyle = GOLD
  ctx.globalAlpha = 0.15
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 2
  roundRect(ctx, 32, 28, 70, 70, 14)
  ctx.stroke()
  ctx.fillStyle = GOLD
  ctx.font = 'bold 28px Poppins'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(d.nomor), 67, 63)
  ctx.restore()

  
  ctx.fillStyle = WHITE
  ctx.font = 'bold 44px Poppins'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(d.namaLatin, 120, 72)

  
  ctx.fillStyle = GOLD
  ctx.font = '500 18px Poppins'
  ctx.fillText(`"${d.arti}"`, 120, 100)

  
  ctx.strokeStyle = GOLD
  ctx.globalAlpha = 0.25
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(32, 118)
  ctx.lineTo(W - 32, 118)
  ctx.stroke()
  ctx.globalAlpha = 1

  
  ctx.fillStyle = GOLD
  ctx.font = '500 56px Poppins'
  ctx.textAlign = 'right'
  
  ctx.fillText(d.nama, W - 40, 90)

  
  const infos = [
    { icon: '🕌', label: 'Tempat Turun',  val: d.tempatTurun },
    { icon: '📖', label: 'Jumlah Ayat',   val: String(d.jumlahAyat) + ' ayat' },
    { icon: '🔢', label: 'Nomor Surah',   val: `${d.nomor} / 114` },
  ]

  infos.forEach((info, i) => {
    const x = 32 + i * 284
    const y = 140
    const iw = 270
    const ih = 90

    
    ctx.save()
    roundRect(ctx, x, y, iw, ih, 14)
    ctx.fillStyle = CARD
    ctx.globalAlpha = 0.8
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.strokeStyle = GOLD
    ctx.globalAlpha = 0.2
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.restore()

    
    ctx.font = '24px Poppins'
    ctx.textAlign = 'left'
    ctx.fillStyle = WHITE
    ctx.fillText(info.icon, x + 16, y + 34)

    
    ctx.fillStyle = MUTED
    ctx.font = '300 13px Poppins'
    ctx.fillText(info.label.toUpperCase(), x + 16, y + 56)

    
    ctx.fillStyle = WHITE
    ctx.font = 'bold 18px Poppins'
    ctx.fillText(info.val, x + 16, y + 78)
  })

  
  ctx.fillStyle = GREEN
  ctx.fillRect(32, 252, 5, 22)
  ctx.fillStyle = WHITE
  ctx.font = 'bold 16px Poppins'
  ctx.textAlign = 'left'
  ctx.fillText('PILIH AYAT', 44, 268)

  ctx.fillStyle = MUTED
  ctx.font = '13px Poppins'
  ctx.fillText(`Gunakan .quran ${d.nomor}:<nomor ayat> untuk tampilkan ayat spesifik`, 44, 292)
  ctx.fillText(`Contoh: .quran ${d.nomor}:1  atau  .quran ${d.namaLatin}:3`, 44, 312)

  
  ctx.fillStyle = GOLD
  ctx.font = '300 13px Poppins'
  ctx.fillText(`🎵 Audio tersedia · .quran ${d.nomor} audio  →  dengarkan surah lengkap`, 44, 340)

  
  ctx.fillStyle = CARD
  ctx.fillRect(0, H - 40, W, 40)

  ctx.fillStyle = MUTED
  ctx.font = '12px Poppins'
  ctx.textAlign = 'center'
  ctx.fillText('Al-Qur\'an Digital  •  Source: equran.id  •  Morela Bot', W / 2, H - 14)

  
  ctx.fillStyle = GOLD
  ctx.fillRect(0, H - 3, W, 3)

  return cvs.toBuffer('image/jpeg', { quality: 0.92 })
}


export async function canvasQuranAyat(d: QuranAyatData): Promise<Buffer> {
  const W = 900
  const H = 480

  const BG1   = '#0d1f1a'
  const BG2   = '#122b23'
  const GOLD  = '#c9a84c'
  const GREEN = '#2ecc71'
  const WHITE = '#f0ede5'
  const MUTED = '#8a9e94'
  const CARD  = '#1a3028'

  const cvs = createCanvas(W, H)
  const ctx  = cvs.getContext('2d')

  
  const grad = ctx.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, BG1)
  grad.addColorStop(1, BG2)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  drawOrnament(ctx, W - 80, 80, 140, GOLD, 0.10)
  drawOrnament(ctx, 40, H - 60, 120, GREEN, 0.08)

  
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, W, 5)
  ctx.fillStyle = GREEN
  ctx.fillRect(0, 5, 5, H - 5)

  
  ctx.save()
  roundRect(ctx, 32, 24, 130, 48, 10)
  ctx.fillStyle = GOLD
  ctx.globalAlpha = 0.12
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 1.5
  roundRect(ctx, 32, 24, 130, 48, 10)
  ctx.stroke()
  ctx.fillStyle = GOLD
  ctx.font = 'bold 14px Poppins'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`SURAH ${d.nomor}  •  AYAT ${d.ayatNum}`, 97, 48)
  ctx.restore()

  
  ctx.fillStyle = WHITE
  ctx.font = 'bold 36px Poppins'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(d.namaLatin, 180, 58)

  ctx.fillStyle = GOLD
  ctx.font = '500 15px Poppins'
  ctx.fillText(`"${d.arti}"  •  ${d.tempatTurun}`, 180, 78)

  
  ctx.strokeStyle = GOLD
  ctx.globalAlpha = 0.25
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(32, 100)
  ctx.lineTo(W - 32, 100)
  ctx.stroke()
  ctx.globalAlpha = 1

  
  ctx.save()
  roundRect(ctx, 32, 112, W - 64, 100, 14)
  ctx.fillStyle = CARD
  ctx.globalAlpha = 0.9
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.strokeStyle = GOLD
  ctx.globalAlpha = 0.15
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.restore()

  
  ctx.fillStyle = GOLD
  ctx.font = '500 28px Poppins'  
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillText(d.teksArab, W - 56, 162)

  
  ctx.fillStyle = MUTED
  ctx.font = '300 14px Poppins'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  
  const latinWords = d.teksLatin.split(' ')
  let line = '', lY = 232
  for (const w of latinWords) {
    const test = line + w + ' '
    if (ctx.measureText(test).width > W - 80 && line) {
      ctx.fillText(line.trim(), 44, lY)
      line = w + ' '
      lY += 22
    } else { line = test }
  }
  if (line) ctx.fillText(line.trim(), 44, lY)

  
  lY += 28
  ctx.fillStyle = WHITE
  ctx.font = '500 16px Poppins'
  const indoWords = d.teksIndonesia.split(' ')
  let lineI = ''
  for (const w of indoWords) {
    const test = lineI + w + ' '
    if (ctx.measureText(test).width > W - 80 && lineI) {
      ctx.fillText(lineI.trim(), 44, lY)
      lineI = w + ' '
      lY += 24
    } else { lineI = test }
  }
  if (lineI) ctx.fillText(lineI.trim(), 44, lY)

  
  ctx.fillStyle = CARD
  ctx.fillRect(0, H - 40, W, 40)
  ctx.fillStyle = MUTED
  ctx.font = '12px Poppins'
  ctx.textAlign = 'center'
  ctx.fillText(`Al-Qur\'an Digital  •  ${d.namaLatin} Ayat ${d.ayatNum}/${d.jumlahAyat}  •  Source: equran.id`, W / 2, H - 14)
  ctx.fillStyle = GOLD
  ctx.fillRect(0, H - 3, W, 3)

  return cvs.toBuffer('image/jpeg', { quality: 0.92 })
}
