// @ts-nocheck
import { createCanvas } from 'canvas'
import fs from 'fs'
import { getStats, resetStats } from '../../Database/stats.js'
import { getUser } from '../../Database/db.js'
import { botName, CHANNEL_URL, imagePath } from '../../Library/utils.js'

function uptime(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d} hari ${h % 24} jam`
  if (h > 0) return `${h} jam ${m % 60} menit`
  return `${m} menit ${s % 60} detik`
}

function getUserName(jid: string) {
  try { const u = getUser(jid); return u?.name || null } catch { return null }
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  if (w < 2*r) r = w/2
  if (h < 2*r) r = h/2
  ctx.beginPath()
  ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y)
  ctx.quadraticCurveTo(x+w, y, x+w, y+r)
  ctx.lineTo(x+w, y+h-r)
  ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h)
  ctx.lineTo(x+r, y+h)
  ctx.quadraticCurveTo(x, y+h, x, y+h-r)
  ctx.lineTo(x, y+r)
  ctx.quadraticCurveTo(x, y, x+r, y)
  ctx.closePath()
}

async function generateStatsDashboard({ total, age, topCmds, topUsers, topHours, topDays, maxCmd, maxUser, maxHour }) {
  const W  = 1080
  const H1 = 300
  const H2 = 480
  const H3 = 320
  const H4 = 320
  const H  = H1 + H2 + H3 + H4

  const canvas = createCanvas(W, H)
  const ctx    = canvas.getContext('2d')
  const rng    = (n) => Math.random() * n

  function drawStars(ax, ay, aw, ah, count = 80) {
    ctx.save()
    ctx.beginPath(); ctx.rect(ax, ay, aw, ah); ctx.clip()
    for (let i = 0; i < count; i++) {
      const sr = rng(1.4) + 0.2
      const alpha = rng(0.55) + 0.15
      ctx.beginPath()
      ctx.arc(ax + rng(aw), ay + rng(ah), sr, 0, Math.PI*2)
      ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`
      ctx.fill()
    }
    ctx.restore()
  }

  function neonDivider(y, c1 = '#FF2D9A', c2 = '#BF00FF', blur = 10) {
    const g = ctx.createLinearGradient(0, y, W, y)
    g.addColorStop(0, 'transparent'); g.addColorStop(0.15, c1)
    g.addColorStop(0.5, c2); g.addColorStop(0.85, c1); g.addColorStop(1, 'transparent')
    ctx.save()
    ctx.shadowColor = c1; ctx.shadowBlur = blur
    ctx.strokeStyle = g; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    ctx.restore()
  }

  function cornerBracket(x, y, sx, sy, color, size = 26) {
    ctx.save()
    ctx.strokeStyle = color; ctx.lineWidth = 2.5
    ctx.shadowColor = color; ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.moveTo(x, y + sy*size); ctx.lineTo(x, y); ctx.lineTo(x + sx*size, y)
    ctx.stroke()
    ctx.restore()
  }

  
  const bg1 = ctx.createLinearGradient(0, 0, W, H1)
  bg1.addColorStop(0, '#06061A'); bg1.addColorStop(0.5, '#0C0C26'); bg1.addColorStop(1, '#06061A')
  ctx.fillStyle = bg1; ctx.fillRect(0, 0, W, H1)
  drawStars(0, 0, W, H1, 70)

  ctx.save(); ctx.globalAlpha = 0.05; ctx.strokeStyle = '#FF2D9A'; ctx.lineWidth = 1
  for (let i = -H1; i < W+H1; i += 70) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i+H1, H1); ctx.stroke() }
  ctx.restore()

  ctx.save()
  for (let gx = 30; gx < W; gx += 45)
    for (let gy = 30; gy < H1; gy += 45) {
      ctx.beginPath(); ctx.arc(gx, gy, 0.9, 0, Math.PI*2)
      ctx.fillStyle = 'rgba(150,80,255,0.12)'; ctx.fill()
    }
  ctx.restore()

  const BC = 'rgba(255,45,154,0.75)'
  cornerBracket(18, 18, 1, 1, BC); cornerBracket(W-18, 18, -1, 1, BC)
  cornerBracket(18, H1-18, 1, -1, BC); cornerBracket(W-18, H1-18, -1, -1, BC)

  
  const tg = ctx.createLinearGradient(0, 60, W, 120)
  tg.addColorStop(0, '#FFFFFF'); tg.addColorStop(0.45, '#EDD6FF'); tg.addColorStop(1, '#FF9AE0')
  ctx.fillStyle = tg; ctx.font = 'bold 72px Arial'
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.shadowColor = '#CC00FF'; ctx.shadowBlur = 22
  ctx.fillText('STATS DASHBOARD', W/2, 38); ctx.shadowBlur = 0

  
  const sub = `📊 Total ${total.toLocaleString('id')}x  •  ⏱ ${age}`
  ctx.save()
  const pillW = ctx.measureText(sub).width + 48
  drawRoundedRect(ctx, W/2 - pillW/2, 134, pillW, 34, 17)
  ctx.fillStyle = 'rgba(255,45,154,0.15)'; ctx.fill()
  drawRoundedRect(ctx, W/2 - pillW/2, 134, pillW, 34, 17)
  ctx.strokeStyle = '#FF2D9A'; ctx.lineWidth = 1; ctx.shadowColor = '#FF2D9A'; ctx.shadowBlur = 8; ctx.stroke()
  ctx.fillStyle = '#FFAEE0'; ctx.font = 'bold 16px Arial'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(sub, W/2, 151)
  ctx.restore()

  
  const cards = [
    { label: 'COMMANDS', val: total.toLocaleString('id') + 'x' },
    { label: 'TRACKING', val: age },
    { label: 'TOP CMD',  val: topCmds[0] ? `.${topCmds[0][0]}` : '-' },
  ]
  let sx = 120
  for (const c of cards) {
    const cw = 270
    ctx.save()
    drawRoundedRect(ctx, sx, 196, cw, 72, 12)
    ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fill()
    drawRoundedRect(ctx, sx, 196, cw, 72, 12)
    ctx.strokeStyle = 'rgba(191,0,255,0.30)'; ctx.lineWidth = 1; ctx.stroke()
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 22px Arial'
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    ctx.shadowColor = '#FF2D9A'; ctx.shadowBlur = 10
    ctx.fillText(c.val.length > 14 ? c.val.slice(0,12)+'..' : c.val, sx+cw/2, 206)
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(200,150,255,0.65)'; ctx.font = 'bold 11px Arial'
    ctx.textBaseline = 'bottom'
    ctx.fillText(c.label, sx+cw/2, 266)
    ctx.restore()
    sx += cw + 20
  }

  
  const p2y = H1
  ctx.fillStyle = '#040410'; ctx.fillRect(0, p2y, W, H2)
  drawStars(0, p2y, W, H2, 45)

  ctx.save(); ctx.strokeStyle = 'rgba(100,40,180,0.07)'; ctx.lineWidth = 1
  for (let gx2 = 0; gx2 < W; gx2 += 54) { ctx.beginPath(); ctx.moveTo(gx2, p2y); ctx.lineTo(gx2, p2y+H2); ctx.stroke() }
  for (let gy2 = p2y; gy2 < p2y+H2; gy2 += 54) { ctx.beginPath(); ctx.moveTo(0, gy2); ctx.lineTo(W, gy2); ctx.stroke() }
  ctx.restore()

  neonDivider(p2y, '#FF2D9A', '#BF00FF', 12)

  ctx.save()
  ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 16px Arial'
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.shadowColor = '#BF00FF'; ctx.shadowBlur = 12
  ctx.fillText('◈  TOP COMMAND CHART  ◈', W/2, p2y+16)
  ctx.restore()

  const cLeft = 75, cRight = W-28
  const cBottom = p2y + H2 - 70, cTop = p2y + 58
  const cW = cRight - cLeft, cH = cBottom - cTop
  const barData = topCmds.slice(0, 8)
  const maxCount = barData[0]?.[1] || 1

  for (let s = 0; s <= 4; s++) {
    const val = Math.round((maxCount / 4) * s)
    const sy  = cBottom - (val / maxCount) * cH
    ctx.save()
    if (s === 0) { ctx.strokeStyle = 'rgba(255,45,154,0.5)'; ctx.lineWidth = 1.5 }
    else { ctx.strokeStyle = 'rgba(191,0,255,0.14)'; ctx.lineWidth = 1; ctx.setLineDash([5,7]) }
    ctx.beginPath(); ctx.moveTo(cLeft, sy); ctx.lineTo(cRight, sy); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(200,150,255,0.60)'; ctx.font = '12px Arial'
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
    ctx.fillText(String(val), cLeft-8, sy)
    ctx.restore()
  }

  const barSlot = cW / Math.max(barData.length, 1)
  const barW2   = barSlot * 0.58
  const barOff  = (barSlot - barW2) / 2

  barData.forEach(([cmd, count], i) => {
    const bx = cLeft + i * barSlot + barOff
    const bh = count > 0 ? Math.max(8, (count / maxCount) * cH) : 3
    const by = cBottom - bh
    const bcx = bx + barW2/2
    const isTop1 = i === 0, isTop3 = i < 3
    const colorTop = isTop1 ? '#FF1A8C' : isTop3 ? '#FF4DB8' : '#9933CC'
    const colorBot = isTop1 ? '#7A0045' : isTop3 ? '#8B0057' : '#4A0080'
    const gColor   = isTop1 ? '#FF1A8C' : isTop3 ? '#FF2D9A' : '#9933CC'

    ctx.save()
    ctx.shadowColor = gColor; ctx.shadowBlur = isTop3 ? 28 : 16; ctx.globalAlpha = 0.45
    const gGlow = ctx.createLinearGradient(bx, by, bx, cBottom)
    gGlow.addColorStop(0, colorTop); gGlow.addColorStop(1, colorBot)
    ctx.fillStyle = gGlow; drawRoundedRect(ctx, bx-2, by+4, barW2+4, bh-4, 5); ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.shadowColor = gColor; ctx.shadowBlur = isTop3 ? 18 : 8
    const gSolid = ctx.createLinearGradient(bx, by, bx, cBottom)
    gSolid.addColorStop(0, colorTop); gSolid.addColorStop(1, colorBot)
    ctx.fillStyle = gSolid; drawRoundedRect(ctx, bx, by, barW2, bh, 4); ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.strokeStyle = isTop3 ? 'rgba(255,210,240,0.55)' : 'rgba(210,150,255,0.35)'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(bx+3, by+8); ctx.lineTo(bx+3, cBottom-2); ctx.stroke()
    ctx.restore()

    if (isTop1) { ctx.font = '22px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('👑', bcx, by-22) }

    ctx.save()
    ctx.fillStyle = isTop3 ? '#FFFFFF' : '#DDB8FF'
    ctx.font = isTop3 ? 'bold 13px Arial' : '12px Arial'
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
    ctx.shadowColor = gColor; ctx.shadowBlur = 8
    ctx.fillText(`${count}x`, bcx, by - (isTop1 ? 4 : 3))
    ctx.restore()

    ctx.save()
    ctx.fillStyle = isTop3 ? 'rgba(255,200,240,0.92)' : 'rgba(190,155,240,0.65)'
    ctx.font = isTop3 ? 'bold 12px Arial' : '11px Arial'
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    ctx.fillText(`.${cmd}`.slice(0, 8), bcx, cBottom+8)
    ctx.fillStyle = isTop3 ? 'rgba(255,130,210,0.70)' : 'rgba(170,110,255,0.50)'
    ctx.font = '10px Arial'
    ctx.fillText(`#${i+1}`, bcx, cBottom+24)
    ctx.restore()
  })

  
  const p3y = H1 + H2
  ctx.fillStyle = '#050516'; ctx.fillRect(0, p3y, W, H3)
  drawStars(0, p3y, W, H3, 35)
  neonDivider(p3y, '#BF00FF', '#FF2D9A', 14)

  ctx.save()
  ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 17px Arial'
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.shadowColor = '#FF2D9A'; ctx.shadowBlur = 14
  ctx.fillText('◈  USER PALING AKTIF  ◈', W/2, p3y+20)
  ctx.restore()

  const BADGE_C = ['#FFD700', '#B8B8B8', '#CD7F32']
  const users   = topUsers.slice(0, 5)
  const colsU   = 5
  const cellWU  = W / colsU
  const gridTopU = p3y + 60
  const rowHU   = 220

  users.forEach(([jid, count], i) => {
    const col = i % colsU
    const cx3 = col * cellWU
    const cy3 = gridTopU
    const cardPad = 10
    const midX = cx3 + cellWU/2

    ctx.save()
    drawRoundedRect(ctx, cx3+cardPad, cy3+4, cellWU-cardPad*2, rowHU-14, 12)
    ctx.fillStyle = i < 3 ? 'rgba(255,45,154,0.08)' : 'rgba(100,50,180,0.06)'; ctx.fill()
    drawRoundedRect(ctx, cx3+cardPad, cy3+4, cellWU-cardPad*2, rowHU-14, 12)
    ctx.strokeStyle = i < 3 ? 'rgba(255,45,154,0.30)' : 'rgba(140,70,220,0.18)'; ctx.lineWidth = 1
    if (i < 3) { ctx.shadowColor = 'rgba(255,45,154,0.3)'; ctx.shadowBlur = 6 }
    ctx.stroke()
    ctx.restore()

    const badgeR = 18, badgeY = cy3 + 34
    ctx.save()
    if (i < 3) {
      ctx.shadowColor = BADGE_C[i]; ctx.shadowBlur = 16
      ctx.beginPath(); ctx.arc(midX, badgeY, badgeR, 0, Math.PI*2)
      const bgb = ctx.createRadialGradient(midX-3, badgeY-3, 2, midX, badgeY, badgeR)
      bgb.addColorStop(0, '#FFFFFF'); bgb.addColorStop(1, BADGE_C[i])
      ctx.fillStyle = bgb; ctx.fill()
      ctx.fillStyle = '#111'; ctx.font = 'bold 14px Arial'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowBlur = 0
      ctx.fillText(String(i+1), midX, badgeY)
    } else {
      ctx.beginPath(); ctx.arc(midX, badgeY, badgeR, 0, Math.PI*2)
      ctx.fillStyle = 'rgba(120,60,200,0.22)'; ctx.fill()
      ctx.strokeStyle = 'rgba(160,90,255,0.35)'; ctx.lineWidth = 1; ctx.stroke()
      ctx.fillStyle = 'rgba(190,140,255,0.75)'; ctx.font = 'bold 13px Arial'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(`#${i+1}`, midX, badgeY)
    }
    ctx.restore()

    const num  = jid.split('@')[0].split(':')[0]
    const name = getUserName(jid) || `+${num.slice(-6)}`
    const short = name.length > 10 ? name.slice(0,9)+'..' : name

    ctx.save()
    ctx.fillStyle = i < 3 ? '#FFFFFF' : 'rgba(200,165,255,0.80)'
    ctx.font = i < 3 ? 'bold 15px Arial' : '14px Arial'
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    if (i < 3) { ctx.shadowColor = '#FF2D9A'; ctx.shadowBlur = 6 }
    ctx.fillText(short, midX, cy3+62)
    ctx.restore()

    ctx.fillStyle = 'rgba(180,130,255,0.6)'; ctx.font = '11px Arial'
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    ctx.fillText(`+${num.slice(-8)}`, midX, cy3+84)

    ctx.save()
    ctx.fillStyle = i < 3 ? 'rgba(255,170,220,0.85)' : 'rgba(180,130,255,0.65)'
    ctx.font = i < 3 ? 'bold 18px Arial' : '16px Arial'
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    if (i < 3) { ctx.shadowColor = '#FF2D9A'; ctx.shadowBlur = 8 }
    ctx.fillText(`${count.toLocaleString()}x`, midX, cy3+108)
    ctx.restore()

    const barBgX = cx3+cardPad+10, barBgW = cellWU-cardPad*2-20
    const barFillW = (count / (topUsers[0]?.[1] || 1)) * barBgW
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    drawRoundedRect(ctx, barBgX, cy3+140, barBgW, 8, 4); ctx.fill()
    const bg2 = ctx.createLinearGradient(barBgX, 0, barBgX+barFillW, 0)
    bg2.addColorStop(0, i < 3 ? '#FF2D9A' : '#9933CC'); bg2.addColorStop(1, i < 3 ? '#FF9AE0' : '#BF00FF')
    ctx.fillStyle = bg2; drawRoundedRect(ctx, barBgX, cy3+140, Math.max(4, barFillW), 8, 4); ctx.fill()
  })

  
  const p4y = H1 + H2 + H3
  ctx.fillStyle = '#040410'; ctx.fillRect(0, p4y, W, H4)
  drawStars(0, p4y, W, H4, 30)
  neonDivider(p4y, '#FF2D9A', '#BF00FF', 12)

  ctx.save()
  ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 17px Arial'
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.shadowColor = '#BF00FF'; ctx.shadowBlur = 12
  ctx.fillText('◈  WAKTU TERSIBUK  ◈', W/2, p4y+16)
  ctx.restore()

  const DAYS_ID = { Sunday:'Minggu', Monday:'Senin', Tuesday:'Selasa', Wednesday:'Rabu', Thursday:'Kamis', Friday:'Jumat', Saturday:'Sabtu' }
  const halfW2  = (W - 80) / 2
  const row4Y   = p4y + 56
  const maxDay  = topDays[0]?.[1] || 1

  function drawStatCard(x, y, w, title, rows, maxVal, color) {
    const cardH = 48 + rows.length * 42
    ctx.save()
    drawRoundedRect(ctx, x, y, w, cardH, 14)
    ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fill()
    drawRoundedRect(ctx, x, y, w, cardH, 14)
    ctx.strokeStyle = 'rgba(255,45,154,0.25)'; ctx.lineWidth = 1; ctx.stroke()
    ctx.restore()

    ctx.save()
    ctx.fillStyle = '#FFAEE0'; ctx.font = 'bold 14px Arial'
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'
    ctx.shadowColor = '#FF2D9A'; ctx.shadowBlur = 6
    ctx.fillText(title, x+16, y+14)
    ctx.restore()
    neonDivider(y+38, '#FF2D9A', '#9933CC', 4)

    let ry = y + 52
    for (const [label, count] of rows) {
      const pct = count / (maxVal || 1)
      ctx.fillStyle = 'rgba(200,165,255,0.75)'; ctx.font = '14px Arial'
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
      ctx.fillText(label, x+16, ry)

      const barX = x + 185, barBW = w - 185 - 70
      ctx.fillStyle = 'rgba(255,255,255,0.07)'
      drawRoundedRect(ctx, barX, ry-7, barBW, 14, 7); ctx.fill()
      const fw = Math.max(4, pct * barBW)
      const bgg = ctx.createLinearGradient(barX, 0, barX+fw, 0)
      bgg.addColorStop(0, color+'99'); bgg.addColorStop(1, color)
      ctx.fillStyle = bgg; drawRoundedRect(ctx, barX, ry-7, fw, 14, 7); ctx.fill()

      ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'right'
      ctx.fillText(`${count}x`, x+w-12, ry)
      ry += 42
    }
  }

  const jamRows  = topHours.map(([h, c]) => [`${h.padStart(2,'0')}:00 - ${(+h+1).toString().padStart(2,'0')}:00`, c])
  const hariRows = topDays.map(([d, c]) => [DAYS_ID[d] || d, c])

  drawStatCard(40,             row4Y, halfW2, '🕐 JAM TERSIBUK',  jamRows,  maxHour, '#FFD93D')
  drawStatCard(40+halfW2+20,   row4Y, halfW2, '📅 HARI TERSIBUK', hariRows, maxDay,  '#FF8A65')

  neonDivider(H-44, '#9933CC', '#FF2D9A', 8)
  ctx.fillStyle = 'rgba(160,110,210,0.55)'; ctx.font = 'bold 14px Arial'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(`✦ stats dashboard  •  made by ${botName} bot ✦`, W/2, H-22)

  return canvas.toBuffer('image/png')
}


const handler = async (m: any, { Morela, command, reply, fkontak }: any) => {
  if (command === 'resetstats') {
    resetStats()
    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    return reply('✅ Stats direset!')
  }

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  const stats    = getStats()
  const topCmds  = Object.entries(stats.commands || {}).sort((a,b) => b[1]-a[1]).slice(0, 8)
  const topUsers = Object.entries(stats.users    || {}).sort((a,b) => b[1]-a[1]).slice(0, 5)
  const topHours = Object.entries(stats.hours    || {}).sort((a,b) => b[1]-a[1]).slice(0, 5)
  const topDays  = Object.entries(stats.days     || {}).sort((a,b) => b[1]-a[1]).slice(0, 3)
  const maxCmd   = topCmds[0]?.[1]  || 1
  const maxUser  = topUsers[0]?.[1] || 1
  const maxHour  = topHours[0]?.[1] || 1
  const age      = uptime(Date.now() - (stats.startedAt || Date.now()))

  try {
    await Morela.sendMessage(m.chat, { react: { text: '⚙️', key: m.key } })

    const buffer = await generateStatsDashboard({
      total: stats.total || 0, age,
      topCmds, topUsers, topHours, topDays,
      maxCmd, maxUser, maxHour
    })

    const DAYS_ID2 = { Sunday:'Minggu', Monday:'Senin', Tuesday:'Selasa', Wednesday:'Rabu', Thursday:'Kamis', Friday:'Jumat', Saturday:'Sabtu' }

    const footer =
      `📊 *STATS DASHBOARD*\n\n` +
      `╭╌╌⬡「 ⚡ *ʀɪɴɢᴋᴀꜱᴀɴ* 」\n` +
      `┃ ◦ Total Command : *${(stats.total||0).toLocaleString('id')}x*\n` +
      `┃ ◦ Tracking Sejak: *${age}*\n╰╌╌⬡\n\n` +
      `╭╌╌⬡「 🏆 *ᴛᴏᴘ ᴄᴏᴍᴍᴀɴᴅ* 」\n` +
      topCmds.map(([cmd, count]) => `┃ ◦ .${cmd.padEnd(14)} *${count}x* (${Math.round(count/(stats.total||1)*100)}%)`).join('\n') +
      '\n╰╌╌⬡\n\n' +
      `╭╌╌⬡「 👤 *ᴜꜱᴇʀ ᴀᴋᴛɪꜰ* 」\n` +
      topUsers.map(([jid, count]) => {
        const num  = jid.split('@')[0].split(':')[0]
        const name = getUserName(jid)
        const label = name ? `${name} (+${num.slice(-4)})` : `+${num}`
        return `┃ ◦ ${label.slice(0,18).padEnd(18)} *${count}x*`
      }).join('\n') + '\n╰╌╌⬡\n\n' +
      `╭╌╌⬡「 🕐 *ᴊᴀᴍ ᴛᴇʀꜱɪʙᴜᴋ* 」\n` +
      topHours.map(([hour, count]) => `┃ ◦ ${hour.padStart(2,'0')}:00 - ${(+hour+1).toString().padStart(2,'0')}:00  *${count}x*`).join('\n') +
      '\n╰╌╌⬡\n\n' +
      `╭╌╌⬡「 📅 *ʜᴀʀɪ ᴛᴇʀꜱɪʙᴜᴋ* 」\n` +
      topDays.map(([day, count]) => `┃ ◦ ${(DAYS_ID2[day]||day).padEnd(10)} *${count}x*`).join('\n') +
      '\n╰╌╌⬡\n\n© ' + botName

    await Morela.sendMessage(m.chat, {
      image: buffer, caption: ' ', footer,
      interactiveButtons: [{
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({ display_text: 'Channel', url: CHANNEL_URL, merchant_url: CHANNEL_URL })
      }],
      hasMediaAttachment: true
    }, { quoted: fkontak || m })

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (err) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply(`❌ Error: ${err.message}`)
  }
}

handler.command = ['stats', 'botstats', 'resetstats']
handler.owner   = true
handler.tags    = ['owner']
handler.help    = ['stats — dashboard statistik bot']
handler.noLimit = true

export default handler