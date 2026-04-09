// @ts-nocheck
import axios from 'axios'
import { createCanvas, loadImage } from 'canvas'
import sharp from 'sharp'
import { getGroup, updateGroup } from '../../Database/db.js'
import { buildFkontak, botName } from '../../Library/utils.js'




async function createGoodbyeCanvas(
  username: string,
  groupName: string,
  memberCount: unknown,
  avatarBuffer?: Buffer | null
): Promise<Buffer> {
  const W = 800, H = 480
  const canvas = createCanvas(W, H)
  const ctx    = canvas.getContext('2d')

  
  const bgGrad = ctx.createLinearGradient(0, 0, W, H)
  bgGrad.addColorStop(0,    '#1a0a0a')
  bgGrad.addColorStop(0.45, '#2d0d1a')
  bgGrad.addColorStop(1,    '#1a0a0a')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  
  const glowGrad = ctx.createRadialGradient(W/2, H/2, 20, W/2, H/2, 300)
  glowGrad.addColorStop(0,   'rgba(200,40,80,0.18)')
  glowGrad.addColorStop(0.5, 'rgba(140,20,60,0.08)')
  glowGrad.addColorStop(1,   'rgba(0,0,0,0)')
  ctx.fillStyle = glowGrad
  ctx.fillRect(0, 0, W, H)

  
  const frameGrad = ctx.createLinearGradient(0, 0, W, H)
  frameGrad.addColorStop(0,   '#ff4466')
  frameGrad.addColorStop(0.5, '#ff80a0')
  frameGrad.addColorStop(1,   '#ff4466')
  const r = 18
  ctx.beginPath()
  ctx.moveTo(r, 0); ctx.lineTo(W-r, 0); ctx.quadraticCurveTo(W, 0, W, r)
  ctx.lineTo(W, H-r); ctx.quadraticCurveTo(W, H, W-r, H)
  ctx.lineTo(r, H); ctx.quadraticCurveTo(0, H, 0, H-r)
  ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.strokeStyle = frameGrad
  ctx.lineWidth   = 2.5
  ctx.stroke()

  
  const stars = [
    {x:60,y:60},{x:740,y:50},{x:30,y:400},{x:770,y:420},
    {x:120,y:200},{x:680,y:180},{x:200,y:430},{x:600,y:440},
    {x:400,y:30},{x:150,y:80},{x:650,y:90},{x:50,y:250},
    {x:750,y:270},{x:350,y:460},{x:460,y:20}
  ]
  for (const {x, y} of stars) {
    ctx.beginPath()
    ctx.arc(x, y, Math.random()*2+1, 0, Math.PI*2)
    ctx.fillStyle = `rgba(255,120,150,${Math.random()*0.5+0.3})`
    ctx.fill()
  }

  
  const avatarR = 80, avatarCX = W/2, avatarCY = 155

  
  const outerGlow = ctx.createRadialGradient(avatarCX, avatarCY, avatarR-5, avatarCX, avatarCY, avatarR+25)
  outerGlow.addColorStop(0, 'rgba(255,60,100,0.4)')
  outerGlow.addColorStop(1, 'rgba(255,60,100,0)')
  ctx.beginPath()
  ctx.arc(avatarCX, avatarCY, avatarR+25, 0, Math.PI*2)
  ctx.fillStyle = outerGlow
  ctx.fill()

  
  const ringGrad = ctx.createLinearGradient(avatarCX-avatarR, avatarCY, avatarCX+avatarR, avatarCY)
  ringGrad.addColorStop(0,   '#ff4466')
  ringGrad.addColorStop(0.5, '#ff80a0')
  ringGrad.addColorStop(1,   '#ff4466')
  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.arc(avatarCX, avatarCY, avatarR+12, (Math.PI/2)*i+0.15, (Math.PI/2)*(i+1)-0.15)
    ctx.strokeStyle = ringGrad
    ctx.lineWidth   = 2.5
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.arc(avatarCX, avatarCY, avatarR+4, 0, Math.PI*2)
  ctx.strokeStyle = 'rgba(255,60,100,0.6)'
  ctx.lineWidth   = 1.5
  ctx.stroke()

  
  ctx.save()
  ctx.beginPath()
  ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI*2)
  ctx.clip()

  if (avatarBuffer && avatarBuffer.length > 500) {
    try {
      const img = await loadImage(avatarBuffer)
      ctx.drawImage(img, avatarCX-avatarR, avatarCY-avatarR, avatarR*2, avatarR*2)
    } catch { drawDefaultAvatar(ctx, avatarCX, avatarCY, avatarR) }
  } else {
    drawDefaultAvatar(ctx, avatarCX, avatarCY, avatarR)
  }
  ctx.restore()

  
  const lineY = 308
  ctx.strokeStyle = 'rgba(255,60,100,0.5)'
  ctx.lineWidth   = 1
  ctx.beginPath(); ctx.moveTo(W/2-140, lineY); ctx.lineTo(W/2-10, lineY); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(W/2+10, lineY);  ctx.lineTo(W/2+140, lineY); ctx.stroke()

  const sdGrad = ctx.createLinearGradient(W/2-100, 0, W/2+100, 0)
  sdGrad.addColorStop(0,   '#ff4466')
  sdGrad.addColorStop(0.5, '#ff80a0')
  sdGrad.addColorStop(1,   '#ff4466')
  ctx.font      = 'bold 15px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = sdGrad
  ctx.fillText('✦ SAMPAI JUMPA ✦', W/2, lineY+2)

  
  ctx.font      = 'bold 36px sans-serif'
  const nameGrad = ctx.createLinearGradient(W/2-200, 0, W/2+200, 0)
  nameGrad.addColorStop(0,   '#ffffff')
  nameGrad.addColorStop(0.4, '#ffb0c0')
  nameGrad.addColorStop(1,   '#ffffff')
  ctx.shadowColor = 'rgba(255,60,100,0.7)'
  ctx.shadowBlur  = 12
  ctx.fillStyle   = nameGrad
  const displayName = username.length > 18 ? username.slice(0, 16) + '..' : username
  ctx.fillText(displayName, W/2, 355)
  ctx.shadowBlur  = 0
  ctx.shadowColor = 'transparent'

  
  ctx.font      = '400 16px sans-serif'
  ctx.fillStyle = 'rgba(255,180,190,0.85)'
  const grpDisplay = groupName.length > 25 ? groupName.slice(0, 23) + '..' : groupName
  ctx.fillText(`💔 telah meninggalkan · ${grpDisplay}`, W/2, 385)

  
  const badgeW = 120, badgeH = 28, badgeX = W/2-60, badgeY = 400
  ctx.beginPath()
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 14)
  const badgeBg = ctx.createLinearGradient(badgeX, 0, badgeX+badgeW, 0)
  badgeBg.addColorStop(0, 'rgba(200,40,80,0.35)')
  badgeBg.addColorStop(1, 'rgba(255,80,120,0.35)')
  ctx.fillStyle = badgeBg
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,60,100,0.6)'
  ctx.lineWidth   = 1
  ctx.stroke()
  ctx.font      = '600 13px sans-serif'
  ctx.fillStyle = '#ffb0c0'
  ctx.fillText(`👥 ${memberCount} Anggota`, W/2, badgeY+18)

  
  ctx.font      = '400 11px sans-serif'
  ctx.fillStyle = 'rgba(200,80,100,0.5)'
  ctx.textAlign = 'right'
  ctx.fillText(`© ${botName}`, W-16, H-12)

  return canvas.toBuffer('image/png')
}

function drawDefaultAvatar(ctx: any, cx: number, cy: number, r: number) {
  const grad = ctx.createRadialGradient(cx, cy-r*0.2, 0, cx, cy, r)
  grad.addColorStop(0, '#4a1a2a')
  grad.addColorStop(1, '#1a0a10')
  ctx.fillStyle = grad
  ctx.fillRect(cx-r, cy-r, r*2, r*2)
  ctx.fillStyle = 'rgba(220,120,150,0.5)'
  ctx.beginPath()
  ctx.arc(cx, cy-r*0.2, r*0.38, 0, Math.PI*2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx, cy+r*0.55, r*0.55, Math.PI, 0)
  ctx.fill()
}




function sanitizeJid(jid: unknown): string | null {
  if (!jid || typeof jid !== 'string') return null
  const t = jid.trim()
  if (!t) return null
  if (t.endsWith('@s.whatsapp.net')) return t
  if (t.endsWith('@lid')) {
    const num = t.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
    return (num && num.length >= 5) ? num + '@s.whatsapp.net' : null
  }
  if (t.endsWith('@g.us')) return null
  const num = t.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
  return (num && num.length >= 5) ? num + '@s.whatsapp.net' : null
}




async function fetchPP(Morela: any, jid: string): Promise<Buffer | null> {
  const num = jid.split('@')[0].split(':')[0]
  const candidates = [jid, num + '@s.whatsapp.net', num + '@c.us'].filter(
    (v, i, a) => a.indexOf(v) === i
  )
  for (const candidate of candidates) {
    try {
      const pp  = await Morela.profilePictureUrl(candidate, 'image')
      if (!pp) continue
      const res = await axios.get(pp, { responseType: 'arraybuffer', timeout: 8000 })
      if (res.data?.byteLength > 500) return Buffer.from(res.data)
    } catch {}
  }
  return null
}




export async function sendGoodbye(
  Morela: any,
  groupJid: unknown,
  memberJid: unknown,
  groupName: string,
  memberCount: unknown,
  pushname: unknown
) {
  const safeJid = sanitizeJid(memberJid)
  if (!safeJid) {
    console.warn('[GOODBYE] JID tidak valid, skip:', memberJid)
    return
  }

  const userNum  = safeJid.split('@')[0].split(':')[0]
  const username = (typeof pushname === 'string' && pushname.trim()) ? pushname.trim() : userNum

  
  let fkontak: any = null
  try { fkontak = await buildFkontak(Morela) } catch {}

  
  const avatarBuffer = await fetchPP(Morela, safeJid)

  
  let imageBuffer: Buffer | null = null
  try {
    imageBuffer = await createGoodbyeCanvas(username, groupName, memberCount, avatarBuffer)
  } catch (e) {
    console.error('[GOODBYE] Canvas error:', (e as Error).message)
  }

  
  let thumbBuffer: Buffer | null = null
  if (imageBuffer) {
    try {
      thumbBuffer = await sharp(imageBuffer).resize(300, 150, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer()
    } catch { thumbBuffer = avatarBuffer }
  }

  
  const caption =
    `*Sampai Jumpa* @${userNum} 👋\n\n` +
    `Semoga ketemu lagi di grup *${groupName}* 🌸\n` +
    `Sisa member: *${memberCount}* orang\n\n` +
    `꒰ © ${botName} ꒱`

  
  const basePayload: any = {
    mentions: [safeJid],
    contextInfo: {
      mentionedJid:    [safeJid],
      forwardingScore: 9,
      isForwarded:     true,
      externalAdReply: {
        title:                 'SAMPAI JUMPA 👋',
        body:                  'Undangan obrolan grup',
        thumbnail:             thumbBuffer ?? undefined,
        mediaType:             1,
        renderLargerThumbnail: false,
        showAdAttribution:     false,
        sourceUrl:             ''
      }
    }
  }

  try {
    if (imageBuffer) {
      await Morela.sendMessage(groupJid, {
        ...basePayload,
        image:    imageBuffer,
        caption,
        mimetype: 'image/png',
      }, { quoted: fkontak })
    } else {
      await Morela.sendMessage(groupJid, {
        ...basePayload,
        text: caption,
      }, { quoted: fkontak })
    }
    console.log(`[GOODBYE] ✅ @${userNum} | pp=${!!avatarBuffer} | fkontak=${!!fkontak}`)
  } catch (e) {
    console.error('[GOODBYE] ❌ Gagal:', (e as Error).message)
    try {
      await Morela.sendMessage(groupJid, { text: caption, mentions: [safeJid] })
    } catch {}
  }
}




const handler = async (m: any, { Morela, args, reply }: any) => {
  const from       = m.chat
  const mode       = (args[0] || '').toLowerCase()
  const hasMention = m.mentionedJid?.length > 0

  
  if (!hasMention) {
    const groupData = getGroup(from)
    const current   = groupData?.goodbye || false

    if (!mode || mode === 'status' || mode === 'cek') {
      return reply(
        `👋 *GOODBYE STATUS*\n\n` +
        `Grup ini: ${current ? '🟢 AKTIF' : '🔴 NONAKTIF'}\n\n` +
        `• *.goodbye on*   — aktifkan pesan perpisahan\n` +
        `• *.goodbye off*  — nonaktifkan\n` +
        `• *.goodbye @tag* — test kirim manual`
      )
    }
    if (mode === 'on') {
      if (current) return reply('⚠️ Goodbye sudah aktif!')
      updateGroup(from, { goodbye: true })
      return reply('✅ *Goodbye Diaktifkan!* 👋\n\nBot akan otomatis mengirim pesan perpisahan saat member keluar.')
    }
    if (mode === 'off') {
      if (!current) return reply('⚠️ Goodbye sudah nonaktif!')
      updateGroup(from, { goodbye: false })
      return reply('✅ *Goodbye Dinonaktifkan!*')
    }
    return reply('❌ Gunakan: .goodbye on / off / status / @tag')
  }

  
  try {
    const groupMeta   = await Morela.groupMetadata(from)
    const groupName   = groupMeta.subject || 'Group'
    const memberCount = groupMeta.participants?.length || 0
    const targetJid   = m.mentionedJid[0]

    const safeTarget = sanitizeJid(targetJid)
    if (!safeTarget) return reply('❌ JID target tidak valid!')

    const participant = groupMeta.participants?.find((p: any) => sanitizeJid(p.id) === safeTarget)
    const pushname    = participant?.notify || participant?.name || null

    await sendGoodbye(Morela, from, safeTarget, groupName, memberCount, pushname)
    reply('✅ Goodbye test terkirim!')
  } catch (e) {
    console.error('[GOODBYE CMD ERROR]', (e as Error).message)
    reply(`❌ Error: ${(e as Error).message}`)
  }
}

handler.help    = ['goodbye on', 'goodbye off', 'goodbye @tag']
handler.tags    = ['group']
handler.command = ['goodbye', 'testgoodbye', 'setgoodbye']
handler.group   = true
handler.admin   = true
handler.noLimit = true

export default handler
