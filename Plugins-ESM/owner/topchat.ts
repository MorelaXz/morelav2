// @ts-nocheck
import fs    from 'fs'
import path  from 'path'
import https from 'https'
import http  from 'http'
import { fileURLToPath } from 'url'
import { createCanvas, loadImage } from 'canvas'
import { bi, buildFkontak, imagePath, botName, CHANNEL_URL } from '../../Library/utils.js'

const __dirname   = path.dirname(fileURLToPath(import.meta.url as string))
const DB_PATH     = path.join(__dirname, '../../data/chatcount.json')

function getDB() {
  if ((globalThis as Record<string, unknown>).__chatCountDB__) return (globalThis as Record<string, unknown>).__chatCountDB__
  try {
    if (fs.existsSync(DB_PATH)) {
      (globalThis as Record<string, unknown>).__chatCountDB__ = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
      return (globalThis as Record<string, unknown>).__chatCountDB__
    }
  } catch {}
  return {}
}

function saveDB() {
  try {
    const data = (globalThis as Record<string, unknown>).__chatCountDB__
    if (data) { const _t = DB_PATH + '.tmp'; fs.writeFileSync(_t, JSON.stringify(data, null, 2)); fs.renameSync(_t, DB_PATH); }
  } catch (e) { console.error('[TOPCHAT CMD] save error:', (e as Error).message) }
}

function getLeaderboard(scope: unknown, limit: unknown = 10) {
  const db   = getDB()
  const data = db[scope] || {}
  return Object.entries(data)
    .map(([jid, v]) => ({ jid, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

function medal(rank: unknown) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `${rank}.`
}

function fetchBuffer(url: string) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    lib.get(url, { timeout: 8000 }, (res) => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end',  () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

function drawRoundedRect(ctx: unknown, x: number, y: number, w: number, h: number, r: number) {
  if (w < 2 * r) r = w / 2
  if (h < 2 * r) r = h / 2
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

function drawCircleImage(ctx: unknown, img: Buffer, x: number, y: number, size: number) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(img, x, y, size, size)
  ctx.restore()
}

function drawFallbackAvatar(ctx: unknown, x: number, y: number, size: number, label: string) {
  const cx = x + size / 2, cy = y + size / 2
  const g  = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2)
  g.addColorStop(0, '#7070CC'); g.addColorStop(1, '#3030AA')
  ctx.beginPath(); ctx.arc(cx, cy, size / 2, 0, Math.PI * 2)
  ctx.fillStyle = g; ctx.fill()
  ctx.fillStyle = '#FFFFFF'; ctx.font = `bold ${Math.floor(size * 0.38)}px Arial`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText((label || '?').slice(0, 2).toUpperCase(), cx, cy)
}

async function generateTopChat({ scopeLabel, groupName, memberCount, total, entries, groupPhotoBuf }: { scopeLabel: unknown; groupName: string; memberCount: unknown; total: number; entries: unknown[]; groupPhotoBuf?: Buffer }) {

  const W  = 1080
  const H1 = 340
  const H2 = 500
  const H3 = 310
  const H  = H1 + H2 + H3

  const canvas = createCanvas(W, H)
  const ctx    = canvas.getContext('2d')

  const rng = (n) => Math.random() * n

  function drawStars(ax: unknown, ay: unknown, aw: unknown, ah: unknown, count: number = 80) {
    ctx.save()
    ctx.beginPath(); ctx.rect(ax, ay, aw, ah); ctx.clip()
    for (let i = 0; i < count; i++) {
      const sr = rng(1.4) + 0.2
      const alpha = rng(0.55) + 0.15
      ctx.beginPath()
      ctx.arc(ax + rng(aw), ay + rng(ah), sr, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`
      ctx.fill()
    }
    ctx.restore()
  }

  function neonDivider(y: number, c1: unknown = '#FF2D9A', c2: unknown = '#BF00FF', blur: unknown = 10) {
    const g = ctx.createLinearGradient(0, y, W, y)
    g.addColorStop(0, 'transparent')
    g.addColorStop(0.15, c1)
    g.addColorStop(0.5, c2)
    g.addColorStop(0.85, c1)
    g.addColorStop(1, 'transparent')
    ctx.save()
    ctx.shadowColor = c1; ctx.shadowBlur = blur
    ctx.strokeStyle = g; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    ctx.restore()
  }

  function cornerBracket(x: number, y: number, sx: unknown, sy: unknown, color: string, size: number = 26) {
    ctx.save()
    ctx.strokeStyle = color; ctx.lineWidth = 2.5
    ctx.shadowColor = color; ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.moveTo(x, y + sy * size); ctx.lineTo(x, y); ctx.lineTo(x + sx * size, y)
    ctx.stroke()
    ctx.restore()
  }

  const bg1 = ctx.createLinearGradient(0, 0, W, H1)
  bg1.addColorStop(0,   '#06061A')
  bg1.addColorStop(0.5, '#0C0C26')
  bg1.addColorStop(1,   '#06061A')
  ctx.fillStyle = bg1; ctx.fillRect(0, 0, W, H1)
  drawStars(0, 0, W, H1, 70)

  ctx.save(); ctx.globalAlpha = 0.06; ctx.strokeStyle = '#FF2D9A'; ctx.lineWidth = 1
  for (let i = -H1; i < W + H1; i += 70) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H1, H1); ctx.stroke()
  }
  ctx.restore()

  ctx.save()
  for (let gx = 30; gx < W; gx += 45)
    for (let gy = 30; gy < H1; gy += 45) {
      ctx.beginPath(); ctx.arc(gx, gy, 0.9, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(150,80,255,0.12)'; ctx.fill()
    }
  ctx.restore()

  const BC = 'rgba(255,45,154,0.75)'
  cornerBracket(18, 18,  1,  1, BC)
  cornerBracket(W-18, 18, -1,  1, BC)
  cornerBracket(18, H1-18, 1, -1, BC)
  cornerBracket(W-18, H1-18, -1, -1, BC)

  const photoSize = 176
  const photoX    = 62
  const photoY    = (H1 - photoSize) / 2

  ctx.save()
  ctx.shadowColor = '#FF2D9A'; ctx.shadowBlur = 35
  ctx.beginPath()
  ctx.arc(photoX + photoSize/2, photoY + photoSize/2, photoSize/2 + 5, 0, Math.PI * 2)
  ctx.strokeStyle = '#FF2D9A'; ctx.lineWidth = 2; ctx.stroke()
  ctx.restore()

  ctx.beginPath()
  ctx.arc(photoX + photoSize/2, photoY + photoSize/2, photoSize/2 + 12, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(191,0,255,0.28)'; ctx.lineWidth = 1; ctx.stroke()

  if (groupPhotoBuf) {
    try {
      const img = await loadImage(groupPhotoBuf)
      drawCircleImage(ctx, img, photoX, photoY, photoSize)
    } catch { drawFallbackAvatar(ctx, photoX, photoY, photoSize, groupName) }
  } else {
    drawFallbackAvatar(ctx, photoX, photoY, photoSize, groupName)
  }

  const tx = photoX + photoSize + 52
  let   ty = 52

  ctx.save()
  const nameGrad = ctx.createLinearGradient(tx, ty, tx + 500, ty + 50)
  nameGrad.addColorStop(0, '#FFFFFF')
  nameGrad.addColorStop(0.45, '#EDD6FF')
  nameGrad.addColorStop(1, '#FF9AE0')
  ctx.fillStyle = nameGrad
  ctx.font = 'bold 44px Arial'
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.shadowColor = '#CC00FF'; ctx.shadowBlur = 18
  const dname = groupName.length > 20 ? groupName.slice(0, 18) + '..' : groupName
  ctx.fillText(dname, tx, ty)
  ctx.restore()
  ty += 62

  ctx.save()
  const pillW = ctx.measureText(scopeLabel).width + 36
  ctx.beginPath()
  drawRoundedRect(ctx, tx, ty, pillW, 30, 15)
  ctx.fillStyle = 'rgba(255,45,154,0.18)'; ctx.fill()
  drawRoundedRect(ctx, tx, ty, pillW, 30, 15)
  ctx.strokeStyle = '#FF2D9A'; ctx.lineWidth = 1
  ctx.shadowColor = '#FF2D9A'; ctx.shadowBlur = 8
  ctx.stroke()
  ctx.fillStyle = '#FFAEE0'; ctx.font = 'bold 13px Arial'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(scopeLabel, tx + pillW / 2, ty + 15)
  ctx.restore()
  ty += 48

  const stats = [
    { label: 'MEMBERS',  val: String(memberCount) },
    { label: 'MESSAGES', val: total.toLocaleString() },
    { label: 'TOP',      val: (entries[0]?.name || '-').slice(0, 10) },
  ]
  let sx = tx
  for (const s of stats) {
    ctx.font = 'bold 22px Arial'
    const vw = ctx.measureText(s.val).width
    const cardW = Math.max(vw + 50, 110)
    ctx.save()
    drawRoundedRect(ctx, sx, ty, cardW, 78, 12)
    ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fill()
    drawRoundedRect(ctx, sx, ty, cardW, 78, 12)
    ctx.strokeStyle = 'rgba(191,0,255,0.30)'; ctx.lineWidth = 1; ctx.stroke()
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 22px Arial'
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    ctx.shadowColor = '#FF2D9A'; ctx.shadowBlur = 10
    ctx.fillText(s.val, sx + cardW/2, ty + 12)
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(200,150,255,0.65)'; ctx.font = 'bold 11px Arial'
    ctx.textBaseline = 'bottom'
    ctx.fillText(s.label, sx + cardW/2, ty + 76)
    ctx.restore()
    sx += cardW + 14
  }

  const p2y = H1
  ctx.fillStyle = '#040410'; ctx.fillRect(0, p2y, W, H2)
  drawStars(0, p2y, W, H2, 45)

  ctx.save(); ctx.strokeStyle = 'rgba(100,40,180,0.07)'; ctx.lineWidth = 1
  for (let gx2 = 0; gx2 < W; gx2 += 54) {
    ctx.beginPath(); ctx.moveTo(gx2, p2y); ctx.lineTo(gx2, p2y + H2); ctx.stroke()
  }
  for (let gy2 = p2y; gy2 < p2y + H2; gy2 += 54) {
    ctx.beginPath(); ctx.moveTo(0, gy2); ctx.lineTo(W, gy2); ctx.stroke()
  }
  ctx.restore()

  neonDivider(p2y, '#FF2D9A', '#BF00FF', 12)

  ctx.save()
  ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 16px Arial'
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.shadowColor = '#BF00FF'; ctx.shadowBlur = 12
  ctx.fillText('◈  CHAT ACTIVITY CHART  ◈', W/2, p2y + 16)
  ctx.restore()

  const cLeft   = 75
  const cRight  = W - 28
  const cBottom = p2y + H2 - 70
  const cTop    = p2y + 58
  const cW      = cRight - cLeft
  const cH      = cBottom - cTop

  const barData  = entries.slice(0, 10)
  const maxCount = barData[0]?.count || 1

  const ySteps = 4
  for (let s = 0; s <= ySteps; s++) {
    const val = Math.round((maxCount / ySteps) * s)
    const sy  = cBottom - (val / maxCount) * cH
    ctx.save()
    if (s === 0) {
      ctx.strokeStyle = 'rgba(255,45,154,0.5)'; ctx.lineWidth = 1.5
    } else {
      ctx.strokeStyle = 'rgba(191,0,255,0.14)'; ctx.lineWidth = 1
      ctx.setLineDash([5, 7])
    }
    ctx.beginPath(); ctx.moveTo(cLeft, sy); ctx.lineTo(cRight, sy); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(200,150,255,0.60)'; ctx.font = '12px Arial'
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
    ctx.fillText(String(val), cLeft - 8, sy)
    ctx.restore()
  }

  ctx.save()
  ctx.fillStyle = 'rgba(180,100,255,0.45)'; ctx.font = '13px Arial'; ctx.textAlign = 'center'
  ctx.translate(16, p2y + H2/2); ctx.rotate(-Math.PI/2)
  ctx.fillText('pesan', 0, 0); ctx.restore()

  const barSlot = cW / Math.max(barData.length, 1)
  const barW    = barSlot * 0.58
  const barOff  = (barSlot - barW) / 2

  barData.forEach((u, i) => {
    const bx  = cLeft + i * barSlot + barOff
    const bh  = u.count > 0 ? Math.max(8, (u.count / maxCount) * cH) : 3
    const by  = cBottom - bh
    const bcx = bx + barW / 2
    const isTop1 = i === 0
    const isTop3 = i < 3
    const colorTop = isTop1 ? '#FF1A8C' : isTop3 ? '#FF4DB8' : '#9933CC'
    const colorBot = isTop1 ? '#7A0045' : isTop3 ? '#8B0057' : '#4A0080'
    const gColor   = isTop1 ? '#FF1A8C' : isTop3 ? '#FF2D9A' : '#9933CC'

    ctx.save()
    ctx.shadowColor = gColor; ctx.shadowBlur = isTop3 ? 28 : 16
    ctx.globalAlpha = 0.45
    const gGlow = ctx.createLinearGradient(bx, by, bx, cBottom)
    gGlow.addColorStop(0, colorTop); gGlow.addColorStop(1, colorBot)
    ctx.fillStyle = gGlow
    drawRoundedRect(ctx, bx - 2, by + 4, barW + 4, bh - 4, 5)
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.shadowColor = gColor; ctx.shadowBlur = isTop3 ? 18 : 8
    const gSolid = ctx.createLinearGradient(bx, by, bx, cBottom)
    gSolid.addColorStop(0, colorTop); gSolid.addColorStop(1, colorBot)
    ctx.fillStyle = gSolid
    drawRoundedRect(ctx, bx, by, barW, bh, 4)
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.strokeStyle = isTop3 ? 'rgba(255,210,240,0.55)' : 'rgba(210,150,255,0.35)'
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(bx + 3, by + 8); ctx.lineTo(bx + 3, cBottom - 2); ctx.stroke()
    ctx.restore()

    if (isTop1) {
      ctx.font = '22px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
      ctx.fillText('👑', bcx, by - 22)
    }

    ctx.save()
    ctx.fillStyle = isTop3 ? '#FFFFFF' : '#DDB8FF'
    ctx.font = isTop3 ? 'bold 13px Arial' : '12px Arial'
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
    ctx.shadowColor = gColor; ctx.shadowBlur = 8
    ctx.fillText(String(u.count), bcx, by - (isTop1 ? 4 : 3))
    ctx.restore()

    const sname = (u.name || u.jid.split('@')[0]).slice(0, 7)
    ctx.save()
    ctx.fillStyle = isTop3 ? 'rgba(255,200,240,0.92)' : 'rgba(190,155,240,0.65)'
    ctx.font = isTop3 ? 'bold 12px Arial' : '11px Arial'
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    ctx.fillText(sname, bcx, cBottom + 8)
    ctx.fillStyle = isTop3 ? 'rgba(255,130,210,0.70)' : 'rgba(170,110,255,0.50)'
    ctx.font = '10px Arial'
    ctx.fillText(`#${i + 1}`, bcx, cBottom + 24)
    ctx.restore()
  })

  ctx.fillStyle = 'rgba(180,100,255,0.40)'; ctx.font = '13px Arial'
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.fillText('member', W/2, cBottom + 46)

  const p3y = H1 + H2
  ctx.fillStyle = '#050516'; ctx.fillRect(0, p3y, W, H3)
  drawStars(0, p3y, W, H3, 35)
  neonDivider(p3y, '#BF00FF', '#FF2D9A', 14)

  ctx.save()
  ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 17px Arial'
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.shadowColor = '#FF2D9A'; ctx.shadowBlur = 14
  ctx.fillText('◈  TOP CHATTERS  ◈', W/2, p3y + 20)
  ctx.restore()

  const names   = entries.slice(0, 8)
  const cols    = 4
  const cellW   = W / cols
  const gridTop = p3y + 60
  const rowH    = 100
  const BADGE_C = ['#FFD700', '#B8B8B8', '#CD7F32']
  const BADGE_G = ['rgba(255,215,0,0.9)', 'rgba(200,200,200,0.8)', 'rgba(205,127,50,0.9)']

  names.forEach((u, i) => {
    const col  = i % cols
    const row  = Math.floor(i / cols)
    const cx3  = col * cellW
    const cy3  = gridTop + row * rowH
    const cardPad = 10

    ctx.save()
    drawRoundedRect(ctx, cx3 + cardPad, cy3 + 4, cellW - cardPad * 2, rowH - 14, 12)
    ctx.fillStyle = i < 3 ? 'rgba(255,45,154,0.08)' : 'rgba(100,50,180,0.06)'; ctx.fill()
    drawRoundedRect(ctx, cx3 + cardPad, cy3 + 4, cellW - cardPad * 2, rowH - 14, 12)
    ctx.strokeStyle = i < 3 ? 'rgba(255,45,154,0.30)' : 'rgba(140,70,220,0.18)'
    ctx.lineWidth = 1
    if (i < 3) { ctx.shadowColor = 'rgba(255,45,154,0.3)'; ctx.shadowBlur = 6 }
    ctx.stroke()
    ctx.restore()

    const midX = cx3 + cellW / 2
    const badgeR = 16
    const badgeY = cy3 + 26

    ctx.save()
    if (i < 3) {
      ctx.shadowColor = BADGE_G[i]; ctx.shadowBlur = 16
      ctx.beginPath(); ctx.arc(midX, badgeY, badgeR, 0, Math.PI * 2)
      const bg = ctx.createRadialGradient(midX - 3, badgeY - 3, 2, midX, badgeY, badgeR)
      bg.addColorStop(0, '#FFFFFF'); bg.addColorStop(1, BADGE_C[i])
      ctx.fillStyle = bg; ctx.fill()
      ctx.fillStyle = '#111'; ctx.font = 'bold 14px Arial'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.shadowBlur = 0
      ctx.fillText(String(i + 1), midX, badgeY)
    } else {
      ctx.beginPath(); ctx.arc(midX, badgeY, badgeR, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(120,60,200,0.22)'; ctx.fill()
      ctx.strokeStyle = 'rgba(160,90,255,0.35)'; ctx.lineWidth = 1; ctx.stroke()
      ctx.fillStyle = 'rgba(190,140,255,0.75)'; ctx.font = 'bold 13px Arial'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(`#${i + 1}`, midX, badgeY)
    }
    ctx.restore()

    const name = (u.name || u.jid.split('@')[0]).slice(0, 11)
    ctx.save()
    ctx.fillStyle = i < 3 ? '#FFFFFF' : 'rgba(200,165,255,0.80)'
    ctx.font = i < 3 ? 'bold 15px Arial' : '14px Arial'
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    if (i < 3) { ctx.shadowColor = '#FF2D9A'; ctx.shadowBlur = 6 }
    ctx.fillText(name, midX, cy3 + 50)
    ctx.restore()

    ctx.fillStyle = i < 3 ? 'rgba(255,170,220,0.72)' : 'rgba(180,130,255,0.55)'
    ctx.font = '12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    ctx.fillText(`${u.count.toLocaleString()} msg`, midX, cy3 + 70)
  })

  neonDivider(p3y + H3 - 46, '#9933CC', '#FF2D9A', 8)
  ctx.fillStyle = 'rgba(160,110,210,0.55)'; ctx.font = 'bold 14px Arial'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(`✦ made by ${botName} bot ✦`, W/2, p3y + H3 - 23)

  return canvas.toBuffer('image/png')
}

const handler = async (m: any, { Morela, args, reply, command, isOwn, isAdmin, senderJid, fkontak }: any) => {
  const sub  = (args[0] || '').toLowerCase()
  const from = m.chat

  if (command === 'myscore' || command === 'skor') {
    const db       = getDB()
    const groupCt  = m.isGroup ? (db[from]?.[senderJid]?.count || 0) : 0
    const globalCt = db['_global']?.[senderJid]?.count || 0
    const name     = m.pushName || senderJid.split('@')[0]

    let groupRank = '-'
    if (m.isGroup) {
      const sorted  = Object.entries(db[from] || {}).sort(([,a],[,b]) => b.count - a.count)
      const idx     = sorted.findIndex(([jid]) => jid === senderJid)
      groupRank     = idx >= 0 ? `#${idx + 1}` : '-'
    }
    const sortedG  = Object.entries(db['_global'] || {}).sort(([,a],[,b]) => b.count - a.count)
    const globalRk = sortedG.findIndex(([jid]) => jid === senderJid)

    return Morela.sendMessage(from, {
      text:
        `╭╌╌⬡「 📊 *ᴍʏ sᴄᴏʀᴇ* 」\n` +
        `┃ 👤 *${name}*\n┃\n` +
        `${m.isGroup ? `┃ 🏠 *Grup ini:*\n┃  ◦ 💬 ${groupCt.toLocaleString()} pesan\n┃  ◦ 🏆 Rank *${groupRank}*\n┃\n` : ''}` +
        `┃ 🌐 *Global:*\n` +
        `┃  ◦ 💬 ${globalCt.toLocaleString()} pesan\n` +
        `┃  ◦ 🏆 Rank *${globalRk >= 0 ? `#${globalRk + 1}` : '-'}*\n` +
        `╰╌╌⬡\n\n꒰ © ${botName} ꒱`
    }, { quoted: fkontak || m })
  }

  if (sub === 'reset') {
    if (!isAdmin && !isOwn) return reply('❌ Hanya admin/owner yang bisa reset!')
    if (!m.isGroup) return reply('❌ Hanya bisa di grup!')
    const db    = getDB()
    const total = Object.values(db[from] || {}).reduce((s, v) => s + v.count, 0)
    delete db[from]; saveDB()
    return reply(`✅ Reset! Total ${total.toLocaleString()} pesan dihapus.\n\n꒰ © ${botName} ꒱`)
  }

  if (sub === 'all') {
    const entries = getLeaderboard('_global', 30)
    if (!entries.length) return reply('❌ Belum ada data chat.')

    const db      = getDB()
    const total   = Object.values(db['_global'] || {}).reduce((s, v) => s + v.count, 0)
    const members = Object.keys(db['_global'] || {}).length

    await Morela.sendMessage(from, { react: { text: '⏳', key: m.key } })
    try {
      const imgBuf  = await generateTopChat({
        scopeLabel:    'GLOBAL LEADERBOARD',
        groupName:     'Semua Chat',
        memberCount:   members,
        total, entries,
        groupPhotoBuf: null
      })
      const top3Count = entries.slice(0, 3).reduce((s, u) => s + u.count, 0)
      const caption =
        `╭╌╌⬡「 🌐 *ᴛᴏᴘ ᴄʜᴀᴛ ɢʟᴏʙᴀʟ* 」\n` +
        `┃ ◦ Total Pesan  : *${total.toLocaleString()}*\n` +
        `┃ ◦ Total Member : *${members} orang*\n┃\n` +
        entries.map((u, i) => {
          const pct = total > 0 ? ((u.count / total) * 100).toFixed(1) : 0
          return `┃ ${medal(i + 1)} *${u.name}* — ${u.count.toLocaleString()} _(${pct}%)_`
        }).join('\n') + '\n' +
        `┃\n┃ ◦ 📈 % Top 3 : *${total > 0 ? (top3Count / total * 100).toFixed(1) : 0}%*\n` +
        `╰╌╌⬡\n\n© ${botName}`

      await Morela.sendMessage(from, { image: imgBuf, caption }, { quoted: fkontak || m })
      await Morela.sendMessage(from, { react: { text: '✅', key: m.key } })
    } catch (e) {
      console.error('[TOPCHAT]', e)
      await Morela.sendMessage(from, { react: { text: '❌', key: m.key } })
      reply('❌ Gagal generate: ' + (e as Error).message)
    }
    return
  }

  if (!m.isGroup) {
    return reply(
      `📊 *Top Chat*\n\n` +
      `• *.topchat* — leaderboard grup\n` +
      `• *.topchat all* — leaderboard global\n` +
      `• *.myscore* — skor kamu\n` +
      `• *.topchat reset* — reset data (admin)\n\n꒰ © ${botName} ꒱`
    )
  }

  const entries = getLeaderboard(from, 30)
  if (!entries.length) return reply('❌ Belum ada data chat di grup ini.')

  const db      = getDB()
  const total   = Object.values(db[from] || {}).reduce((s, v) => s + v.count, 0)
  const members = Object.keys(db[from] || {}).length

  let groupName     = 'Grup'
  let groupPhotoBuf = null
  let allMembers    = []

  try {
    const meta = await Morela.groupMetadata(from)
    groupName  = meta.subject || 'Grup'
    allMembers = meta.participants.map((p: unknown) => p.id)  
  } catch {}
  try {
    const ppUrl = await Morela.profilePictureUrl(from, 'image')
    groupPhotoBuf = await fetchBuffer(ppUrl)
  } catch {}

  await Morela.sendMessage(from, { react: { text: '⏳', key: m.key } })

  try {
    const imgBuf  = await generateTopChat({
      scopeLabel:  `${members} MEMBERS`,
      groupName, memberCount: members,
      total, entries, groupPhotoBuf
    })
    const top3    = entries.slice(0, 3).reduce((s, u) => s + u.count, 0)

    const caption =
      `╭╌╌⬡「 🏠 *ᴛᴏᴘ ᴄʜᴀᴛ ɢʀᴜᴘ* 」\n` +
      `┃ 🏠 *${groupName.slice(0, 25)}*\n` +
      `┃ ◦ 👥 Member       : *${members}*\n` +
      `┃ ◦ 💬 Total Pesan  : *${total.toLocaleString()}*\n┃\n` +
      entries.map((u, i) => {
        const pct = total > 0 ? ((u.count / total) * 100).toFixed(1) : 0
        return `┃ ${medal(i + 1)} *${u.name}* — ${u.count.toLocaleString()} _(${pct}%)_`
      }).join('\n') + '\n' +
      `┃\n┃ ◦ 📈 % Top 3 : *${total > 0 ? (top3 / total * 100).toFixed(1) : 0}%*\n` +
      `╰╌╌⬡\n\n© ${botName}`

    await Morela.sendMessage(from, {
      image:    imgBuf,
      caption,
      mentions: allMembers
    }, { quoted: fkontak || m })

    await Morela.sendMessage(from, { react: { text: '✅', key: m.key } })
  } catch (e) {
    console.error('[TOPCHAT]', e)
    await Morela.sendMessage(from, { react: { text: '❌', key: m.key } })
    reply('❌ Gagal generate: ' + (e as Error).message)
  }
}

handler.command = ['topchat', 'leaderboard', 'lb', 'myscore', 'skor']
handler.tags    = ['owner']
handler.help    = ['topchat', 'topchat all', 'myscore']
handler.owner   = true
handler.noLimit = true

export default handler