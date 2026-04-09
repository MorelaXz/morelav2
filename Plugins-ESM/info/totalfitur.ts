// @ts-nocheck

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createCanvas } from 'canvas'
import { buildFkontak, imagePath, botName, CHANNEL_URL } from '../../Library/utils.js'
import { MENU_LISTS } from '../info/menu.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url as string))

const TAG_EMOJI = {
  ai:'🤖', tools:'🔧', maker:'🎨', sticker:'✨', downloader:'📥',
  owner:'👑', group:'👥', admin:'🔰', fun:'🎭', game:'🎮',
  search:'🔍', info:'📊', main:'🏠', ephoto:'🖼️', islam:'🕌',
  passive:'⚡', image:'🖼️', system:'⚙️',
}
function getTagEmoji(tag: string) { return TAG_EMOJI[tag.toLowerCase()] || '📦' }

const PALETTE = [
  '#00D4FF','#BF00FF','#FF2D9A','#00FF99','#FFB800',
  '#FF4455','#44BBFF','#FF8833','#33FF88','#FF33FF',
  '#AAFF00','#0088FF','#FFEE00','#00FFEE','#FF5588',
  '#AA55FF','#55FFAA','#FFCC33','#33CCFF','#FF3388',
]


function collectStatsFromMenu() {
  const tagMap = new Map<string, number>()
  let total = 0

  for (const [key, data] of Object.entries(MENU_LISTS)) {
    const count = (data as any).commands.length
    total += count
    tagMap.set(key, (tagMap.get(key) || 0) + count)
  }

  const categories = [...tagMap.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count)

  return { total, categories, catCount: categories.length }
}


function rRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  if (r > w / 2) r = w / 2
  if (r > h / 2) r = h / 2
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y,     x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x,     y + h, r)
  ctx.arcTo(x,     y + h, x,     y,     r)
  ctx.arcTo(x,     y,     x + w, y,     r)
  ctx.closePath()
}

function bracket(ctx: any, x: number, y: number, w: number, h: number, color: string, size = 18) {
  ctx.save()
  ctx.strokeStyle = color; ctx.lineWidth = 2.5
  ctx.shadowColor = color; ctx.shadowBlur = 8; ctx.lineCap = 'square'
  ctx.beginPath(); ctx.moveTo(x, y + size); ctx.lineTo(x, y); ctx.lineTo(x + size, y); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + w - size, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + size); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x, y + h - size); ctx.lineTo(x, y + h); ctx.lineTo(x + size, y + h); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + w - size, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - size); ctx.stroke()
  ctx.restore()
}

function neonLine(ctx: any, x1: number, y: number, x2: number, c1: string, c2: string) {
  const g = ctx.createLinearGradient(x1, y, x2, y)
  g.addColorStop(0, 'transparent'); g.addColorStop(0.15, c1)
  g.addColorStop(0.5, c2); g.addColorStop(0.85, c1); g.addColorStop(1, 'transparent')
  ctx.save()
  ctx.strokeStyle = g; ctx.lineWidth = 1.5
  ctx.shadowColor = c1; ctx.shadowBlur = 10
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke()
  ctx.restore()
}

function scanlines(ctx: any, x: number, y: number, w: number, h: number) {
  ctx.save(); ctx.globalAlpha = 0.03
  for (let sy = y; sy < y + h; sy += 3) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x, sy, w, 1) }
  ctx.restore()
}

async function generateCanvas({ total, categories, catCount }: { total: number; categories: any[]; catCount: number }) {
  const top10 = categories.slice(0, 10)
  const W = 1200, H = 740
  const cv = createCanvas(W, H); const ctx = cv.getContext('2d')

  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#020210'); bg.addColorStop(0.45, '#08082A'); bg.addColorStop(1, '#020210')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
  ctx.save()
  for (let gx = 0; gx < W; gx += 42)
    for (let gy = 0; gy < H; gy += 42) {
      ctx.beginPath(); ctx.arc(gx, gy, 0.8, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(80,50,220,0.07)'; ctx.fill()
    }
  ctx.restore()
  scanlines(ctx, 0, 0, W, H)

  const HEADER_H = 86
  rRect(ctx, 0, 0, W, HEADER_H, 0)
  const hBg = ctx.createLinearGradient(0, 0, W, 0)
  hBg.addColorStop(0, 'rgba(0,212,255,0.10)'); hBg.addColorStop(0.5, 'rgba(130,0,255,0.07)'); hBg.addColorStop(1, 'rgba(255,45,154,0.10)')
  ctx.fillStyle = hBg; ctx.fill()
  neonLine(ctx, 0, HEADER_H, W, '#00D4FF', '#BF00FF')

  ctx.save()
  const barAccent = ctx.createLinearGradient(0, 0, 0, HEADER_H)
  barAccent.addColorStop(0, '#00D4FF'); barAccent.addColorStop(1, '#BF00FF')
  ctx.fillStyle = barAccent; ctx.shadowColor = '#00D4FF'; ctx.shadowBlur = 12
  ctx.fillRect(0, 0, 5, HEADER_H); ctx.restore()

  ctx.save()
  ctx.font = 'bold 32px Arial'; ctx.fillStyle = '#FFFFFF'; ctx.textBaseline = 'middle'
  ctx.shadowColor = '#00D4FF'; ctx.shadowBlur = 16
  ctx.fillText('DISTRIBUSI FITUR', 28, 30); ctx.restore()

  ctx.save()
  ctx.font = '14px Arial'; ctx.fillStyle = 'rgba(140,175,255,0.50)'; ctx.textBaseline = 'middle'
  ctx.fillText(`${botName}  •  Command Statistics`, 28, 58); ctx.restore()

  const pills = [
    { val: String(total),    label: 'TOTAL',    c: '#00D4FF' },
    { val: String(total),    label: 'ENABLED',  c: '#00FF99' },
    { val: String(catCount), label: 'KATEGORI', c: '#BF00FF' },
  ]
  let px = W - 420
  for (const p of pills) {
    const pillW = 118, pillH = 52, pillY = (HEADER_H - pillH) / 2
    ctx.save()
    rRect(ctx, px, pillY, pillW, pillH, 8)
    ctx.fillStyle = p.c + '1A'; ctx.fill()
    rRect(ctx, px, pillY, pillW, pillH, 8)
    ctx.strokeStyle = p.c; ctx.lineWidth = 1.5; ctx.shadowColor = p.c; ctx.shadowBlur = 10; ctx.stroke()
    ctx.font = 'bold 20px Arial'; ctx.fillStyle = p.c
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.shadowBlur = 10
    ctx.fillText(p.val, px + pillW / 2, pillY + 8)
    ctx.font = 'bold 11px Arial'; ctx.fillStyle = 'rgba(190,215,255,0.40)'; ctx.shadowBlur = 0
    ctx.fillText(p.label, px + pillW / 2, pillY + 34)
    ctx.restore()
    px += 132
  }

  const PAD = 18, TOP = HEADER_H + PAD, BOT = H - 46, AVAIL = BOT - TOP
  const LEFT_W = 290, RIGHT_W = 290
  const CENTER_W = W - LEFT_W - RIGHT_W - PAD * 4
  const LEFT_X = PAD, CENTER_X = LEFT_X + LEFT_W + PAD, RIGHT_X = CENTER_X + CENTER_W + PAD

  
  for (const [x, w, c] of [[LEFT_X, LEFT_W, '#00D4FF'], [CENTER_X, CENTER_W, '#BF00FF'], [RIGHT_X, RIGHT_W, '#FF2D9A']] as any) {
    ctx.save()
    rRect(ctx, x, TOP, w, AVAIL, 12)
    ctx.fillStyle = c + '0A'; ctx.fill()
    rRect(ctx, x, TOP, w, AVAIL, 12)
    ctx.strokeStyle = c + '2E'; ctx.lineWidth = 1.2; ctx.stroke()
    ctx.restore()
    bracket(ctx, x, TOP, w, AVAIL, c, 16)
  }

  
  const lCX = LEFT_X + LEFT_W / 2, lCY = TOP + AVAIL * 0.46
  const doR = 110, doIn = 63
  ctx.save()
  ctx.font = 'bold 13px Arial'; ctx.fillStyle = 'rgba(0,212,255,0.55)'
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.fillText('DISTRIBUSI KATEGORI', lCX, TOP + 14); ctx.restore()
  neonLine(ctx, LEFT_X + 16, TOP + 33, LEFT_X + LEFT_W - 16, '#00D4FF', '#0055FF')

  let ang = -Math.PI / 2
  for (let i = 0; i < categories.length; i++) {
    const sweep = (categories[i].count / total) * 2 * Math.PI
    const col = PALETTE[i % PALETTE.length]
    ctx.save()
    ctx.shadowColor = col; ctx.shadowBlur = i < 5 ? 18 : 5
    ctx.globalAlpha = i < 4 ? 1 : 0.70
    ctx.beginPath(); ctx.moveTo(lCX, lCY)
    ctx.arc(lCX, lCY, doR, ang, ang + sweep); ctx.closePath()
    ctx.fillStyle = col; ctx.fill()
    ctx.strokeStyle = '#04041A'; ctx.lineWidth = 2.8; ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.stroke()
    ctx.restore()
    ang += sweep
  }
  ctx.save()
  ctx.beginPath(); ctx.arc(lCX, lCY, doIn, 0, Math.PI * 2)
  ctx.fillStyle = '#050520'; ctx.fill()
  ctx.strokeStyle = 'rgba(0,212,255,0.20)'; ctx.lineWidth = 1.5; ctx.stroke()
  ctx.restore()
  ctx.save()
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = 'bold 40px Arial'; ctx.fillStyle = '#FFFFFF'
  ctx.shadowColor = '#00D4FF'; ctx.shadowBlur = 22
  ctx.fillText(String(total), lCX, lCY - 14)
  ctx.font = 'bold 12px Arial'; ctx.fillStyle = 'rgba(100,180,255,0.55)'; ctx.shadowBlur = 0
  ctx.fillText('TOTAL CMD', lCX, lCY + 16); ctx.restore()

  const legendTop = TOP + AVAIL * 0.78
  const legends = categories.slice(0, 8)
  const cols2 = 2, legW = (LEFT_W - 32) / cols2
  legends.forEach((cat, i) => {
    const col = PALETTE[i % PALETTE.length]
    const lcx = LEFT_X + 16 + (i % cols2) * legW
    const lcy = legendTop + Math.floor(i / cols2) * 26
    ctx.save()
    ctx.beginPath(); ctx.arc(lcx + 7, lcy + 8, 5, 0, Math.PI * 2)
    ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 6; ctx.fill(); ctx.restore()
    ctx.save()
    ctx.font = '13px Arial'; ctx.fillStyle = 'rgba(210,225,255,0.85)'
    ctx.textBaseline = 'top'; ctx.textAlign = 'left'
    ctx.fillText(cat.tag.toUpperCase().slice(0, 9), lcx + 18, lcy + 1); ctx.restore()
    ctx.save()
    ctx.font = 'bold 12px Arial'; ctx.fillStyle = col + 'BB'
    ctx.textBaseline = 'top'; ctx.textAlign = 'right'
    ctx.fillText(String(cat.count), lcx + legW - 4, lcy + 1); ctx.restore()
  })

  
  const cInnerX = CENTER_X + 14, cInnerW = CENTER_W - 28
  const cTop = TOP + 44, cBot = BOT - 14
  ctx.save()
  ctx.font = 'bold 13px Arial'; ctx.fillStyle = 'rgba(191,0,255,0.6)'
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.fillText('TOP CATEGORIES', CENTER_X + CENTER_W / 2, TOP + 14); ctx.restore()
  neonLine(ctx, CENTER_X + 16, TOP + 33, CENTER_X + CENTER_W - 16, '#BF00FF', '#FF2D9A')

  const RANK_W = 28, LABEL_W = 92, COUNT_W = 70
  const BAR_X = cInnerX + RANK_W + LABEL_W + 6
  const BAR_W = cInnerW - RANK_W - LABEL_W - COUNT_W - 16
  const maxVal = top10[0]?.count || 1
  const slotH = (cBot - cTop) / top10.length
  const BAR_H = Math.min(28, slotH * 0.58)

  top10.forEach((cat, i) => {
    const col = PALETTE[i % PALETTE.length]
    const pct = (cat.count / total * 100).toFixed(1)
    const fw = Math.max(6, (cat.count / maxVal) * BAR_W)
    const rowY = cTop + i * slotH, midY = rowY + slotH / 2, barY = midY - BAR_H / 2
    if (i % 2 === 0) { ctx.save(); ctx.globalAlpha = 0.04; ctx.fillStyle = '#FFFFFF'; ctx.fillRect(cInnerX, rowY, cInnerW, slotH); ctx.restore() }
    ctx.save()
    ctx.font = i < 3 ? 'bold 15px Arial' : '13px Arial'
    ctx.fillStyle = i < 3 ? col : 'rgba(140,165,220,0.50)'
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
    ctx.fillText(`${i + 1}`, cInnerX + RANK_W - 4, midY); ctx.restore()
    ctx.save()
    ctx.font = i < 3 ? 'bold 14px Arial' : '13px Arial'
    ctx.fillStyle = i < 3 ? '#FFFFFF' : 'rgba(185,205,250,0.82)'
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    ctx.fillText(cat.tag.toUpperCase().slice(0, 10), cInnerX + RANK_W + 2, midY); ctx.restore()
    ctx.save()
    rRect(ctx, BAR_X, barY, BAR_W, BAR_H, BAR_H / 2)
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill(); ctx.restore()
    ctx.save()
    ctx.shadowColor = col; ctx.shadowBlur = i < 3 ? 20 : 10
    rRect(ctx, BAR_X, barY, fw, BAR_H, BAR_H / 2)
    const barG = ctx.createLinearGradient(BAR_X, 0, BAR_X + fw, 0)
    barG.addColorStop(0, col); barG.addColorStop(1, col + '60')
    ctx.fillStyle = barG; ctx.fill(); ctx.restore()
    if (fw > 20) {
      ctx.save(); ctx.globalAlpha = 0.18
      rRect(ctx, BAR_X + 2, barY + 2, fw - 4, BAR_H / 2.5, (BAR_H / 2.5) / 2)
      ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.restore()
    }
    ctx.save()
    ctx.font = i < 3 ? 'bold 13px Arial' : '12px Arial'
    ctx.fillStyle = i < 3 ? col : 'rgba(165,190,245,0.65)'
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    ctx.fillText(`${cat.count}  ${pct}%`, BAR_X + fw + 8, midY); ctx.restore()
  })

  
  const rInnerX = RIGHT_X + 14, rInnerW = RIGHT_W - 28
  const rTop = TOP + 44, rBot = BOT - 6
  const maxShow = Math.min(categories.length, 24)
  const rowH2 = (rBot - rTop) / maxShow
  ctx.save()
  ctx.font = 'bold 13px Arial'; ctx.fillStyle = 'rgba(255,45,154,0.60)'
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.fillText('ALL CATEGORIES', RIGHT_X + RIGHT_W / 2, TOP + 14); ctx.restore()
  neonLine(ctx, RIGHT_X + 16, TOP + 33, RIGHT_X + RIGHT_W - 16, '#FF2D9A', '#BF00FF')

  categories.slice(0, maxShow).forEach((cat, i) => {
    const col = PALETTE[i % PALETTE.length]
    const pct = (cat.count / total * 100).toFixed(0)
    const ry = rTop + i * rowH2, midY = ry + rowH2 / 2
    if (i % 2 === 0) { ctx.save(); ctx.globalAlpha = 0.03; ctx.fillStyle = '#FFFFFF'; ctx.fillRect(RIGHT_X, ry, RIGHT_W, rowH2); ctx.restore() }
    ctx.save()
    ctx.beginPath(); ctx.arc(rInnerX + 6, midY, 5.5, 0, Math.PI * 2)
    ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = i < 3 ? 10 : 4; ctx.fill(); ctx.restore()
    ctx.save()
    ctx.font = i < 3 ? 'bold 13px Arial' : '12.5px Arial'
    ctx.fillStyle = i < 3 ? '#FFFFFF' : 'rgba(195,215,250,0.82)'
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
    ctx.fillText(cat.tag.toUpperCase().slice(0, 10), rInnerX + 18, midY); ctx.restore()
    ctx.save()
    ctx.font = i < 3 ? 'bold 12px Arial' : '11.5px Arial'
    ctx.fillStyle = col + 'CC'
    ctx.textBaseline = 'middle'; ctx.textAlign = 'right'
    ctx.fillText(`${cat.count} (${pct}%)`, rInnerX + rInnerW, midY); ctx.restore()
  })

  
  neonLine(ctx, 0, H - 38, W, '#00D4FF', '#BF00FF')
  const now = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta', hour12: false,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
  ctx.save()
  ctx.font = 'bold 14px Arial'; ctx.fillStyle = '#00D4FF'
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.shadowColor = '#00D4FF'; ctx.shadowBlur = 8
  ctx.fillText(`+ ${total} TOTAL COMMANDS AVAILABLE`, PAD, H - 20); ctx.restore()
  ctx.save()
  ctx.font = '12px Arial'; ctx.fillStyle = 'rgba(120,150,220,0.38)'
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
  ctx.fillText(`Generated at ${now} WIB`, W - PAD, H - 20); ctx.restore()

  return cv.toBuffer('image/png')
}

const handler = async (m: any, { Morela, reply, fkontak }: any) => {
  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })
  try {
    const stats = collectStatsFromMenu()
    const { total, categories, catCount } = stats
    const imgBuf = await generateCanvas(stats)

    const caption =
      `╭╌╌⬡「 📈 *sᴛᴀᴛɪsᴛɪᴋ* 」\n` +
      `┃ ◦ Total Commands : *${total}*\n` +
      `┃ ◦ Categories     : *${catCount}*\n` +
      `╰╌╌⬡\n\n` +
      `╭╌╌⬡「 📋 *ᴋᴀᴛᴇɢᴏʀɪ* 」\n` +
      categories.map(c => {
        const pct = (c.count / total * 100).toFixed(1)
        return `┃ ${getTagEmoji(c.tag)} \`${c.tag.toUpperCase()}\`: *${c.count}* _(${pct}%)_`
      }).join('\n') + '\n' +
      `╰╌╌⬡\n\n> ⚡ *${total}* fitur tersedia — ${botName}`

    await Morela.sendMessage(m.chat, { image: imgBuf, caption }, { quoted: fkontak || m })
    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  } catch (e: any) {
    console.error('[TTF]', e)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply(`❌ Gagal generate: ${e.message}`)
  }
}

handler.command = ['ttf', 'cmdstats', 'featstats', 'totalfitur']
handler.tags    = ['info', 'owner']
handler.help    = ['ttf — statistik distribusi fitur dari menu']
handler.noLimit = true
handler.owner   = true

export default handler