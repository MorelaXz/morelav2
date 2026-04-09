// @ts-nocheck
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { createCanvas, loadImage } from 'canvas'
import sharp from 'sharp'
import { getGroup, updateGroup } from '../../Database/db.js'
import { imagePath, botName, buildFkontak } from '../../Library/utils.js'




async function createWelcomeCanvas(
  username: string,
  groupName: string,
  memberCount: unknown,
  avatarBuffer?: Buffer | null
): Promise<Buffer> {
  const W = 800, H = 480
  const canvas = createCanvas(W, H)
  const ctx    = canvas.getContext('2d')

  
  const bgGrad = ctx.createLinearGradient(0, 0, W, H)
  bgGrad.addColorStop(0,    '#0a0a1a')
  bgGrad.addColorStop(0.45, '#0d1b3e')
  bgGrad.addColorStop(1,    '#0a0a1a')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  
  const glowGrad = ctx.createRadialGradient(W/2, H/2, 20, W/2, H/2, 300)
  glowGrad.addColorStop(0,   'rgba(30,100,255,0.18)')
  glowGrad.addColorStop(0.5, 'rgba(10,60,180,0.08)')
  glowGrad.addColorStop(1,   'rgba(0,0,0,0)')
  ctx.fillStyle = glowGrad
  ctx.fillRect(0, 0, W, H)

  
  const frameGrad = ctx.createLinearGradient(0, 0, W, H)
  frameGrad.addColorStop(0,   '#1e90ff')
  frameGrad.addColorStop(0.5, '#00cfff')
  frameGrad.addColorStop(1,   '#1e90ff')
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
    ctx.fillStyle = `rgba(100,180,255,${Math.random()*0.5+0.3})`
    ctx.fill()
  }

  
  const avatarR = 80, avatarCX = W/2, avatarCY = 155

  
  const outerGlow = ctx.createRadialGradient(avatarCX, avatarCY, avatarR-5, avatarCX, avatarCY, avatarR+25)
  outerGlow.addColorStop(0, 'rgba(30,144,255,0.4)')
  outerGlow.addColorStop(1, 'rgba(30,144,255,0)')
  ctx.beginPath()
  ctx.arc(avatarCX, avatarCY, avatarR+25, 0, Math.PI*2)
  ctx.fillStyle = outerGlow
  ctx.fill()

  
  const ringGrad = ctx.createLinearGradient(avatarCX-avatarR, avatarCY, avatarCX+avatarR, avatarCY)
  ringGrad.addColorStop(0,   '#1e90ff')
  ringGrad.addColorStop(0.5, '#00cfff')
  ringGrad.addColorStop(1,   '#1e90ff')
  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.arc(avatarCX, avatarCY, avatarR+12, (Math.PI/2)*i+0.15, (Math.PI/2)*(i+1)-0.15)
    ctx.strokeStyle = ringGrad
    ctx.lineWidth   = 2.5
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.arc(avatarCX, avatarCY, avatarR+4, 0, Math.PI*2)
  ctx.strokeStyle = 'rgba(30,144,255,0.6)'
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
  ctx.strokeStyle = 'rgba(30,144,255,0.5)'
  ctx.lineWidth   = 1
  ctx.beginPath(); ctx.moveTo(W/2-140, lineY); ctx.lineTo(W/2-10, lineY); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(W/2+10, lineY);  ctx.lineTo(W/2+140, lineY); ctx.stroke()

  const sdGrad = ctx.createLinearGradient(W/2-100, 0, W/2+100, 0)
  sdGrad.addColorStop(0,   '#1e90ff')
  sdGrad.addColorStop(0.5, '#00cfff')
  sdGrad.addColorStop(1,   '#1e90ff')
  ctx.font      = 'bold 15px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = sdGrad
  ctx.fillText('✦ SELAMAT DATANG ✦', W/2, lineY+2)

  
  ctx.font      = 'bold 36px sans-serif'
  const nameGrad = ctx.createLinearGradient(W/2-200, 0, W/2+200, 0)
  nameGrad.addColorStop(0,   '#ffffff')
  nameGrad.addColorStop(0.4, '#a8d8ff')
  nameGrad.addColorStop(1,   '#ffffff')
  ctx.shadowColor = 'rgba(30,144,255,0.7)'
  ctx.shadowBlur  = 12
  ctx.fillStyle   = nameGrad
  const displayName = username.length > 18 ? username.slice(0, 16) + '..' : username
  ctx.fillText(displayName, W/2, 355)
  ctx.shadowBlur  = 0
  ctx.shadowColor = 'transparent'

  
  ctx.font      = '400 16px sans-serif'
  ctx.fillStyle = 'rgba(160,200,255,0.85)'
  const grpDisplay = groupName.length > 25 ? groupName.slice(0, 23) + '..' : groupName
  ctx.fillText(`🌸 bergabung ke grup · ${grpDisplay}`, W/2, 385)

  
  const badgeW = 120, badgeH = 28, badgeX = W/2-60, badgeY = 400
  ctx.beginPath()
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 14)
  const badgeBg = ctx.createLinearGradient(badgeX, 0, badgeX+badgeW, 0)
  badgeBg.addColorStop(0, 'rgba(30,100,255,0.35)')
  badgeBg.addColorStop(1, 'rgba(0,180,255,0.35)')
  ctx.fillStyle = badgeBg
  ctx.fill()
  ctx.strokeStyle = 'rgba(30,144,255,0.6)'
  ctx.lineWidth   = 1
  ctx.stroke()
  ctx.font      = '600 13px sans-serif'
  ctx.fillStyle = '#a8d8ff'
  ctx.fillText(`👥 ${memberCount} Anggota`, W/2, badgeY+18)

  
  ctx.font      = '400 11px sans-serif'
  ctx.fillStyle = 'rgba(80,130,200,0.5)'
  ctx.textAlign = 'right'
  ctx.fillText(`© ${botName}`, W-16, H-12)

  return canvas.toBuffer('image/png')
}

function drawDefaultAvatar(ctx: any, cx: number, cy: number, r: number) {
  const grad = ctx.createRadialGradient(cx, cy-r*0.2, 0, cx, cy, r)
  grad.addColorStop(0, '#1a3a6a')
  grad.addColorStop(1, '#0a1428')
  ctx.fillStyle = grad
  ctx.fillRect(cx-r, cy-r, r*2, r*2)
  ctx.fillStyle = 'rgba(120,170,220,0.5)'
  ctx.beginPath()
  ctx.arc(cx, cy-r*0.2, r*0.38, 0, Math.PI*2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx, cy+r*0.55, r*0.55, Math.PI, 0)
  ctx.fill()
}




const introRaw =
  `ֹ  ⑅᜔  ׄ ᥒᥲmᥲ  ᮫  ::\n` +
  `ֹ  ⑅᜔  ׄ ᥙmᥙr  ᮫   ::\n` +
  `ֹ  ⑅᜔  ׄ ᥲsk᥆𝗍  ᮫  ::\n` +
  `ֹ  ⑅᜔  ׄ ᥣᥱ᥎ᥱᥣ ᥲkᥙᥒ ᮫  ::\n` +
  `ֹ  ⑅᜔  ׄ іძ & ᥒіᥴkᥒᥲmᥱ ᮫  ::\n` +
  `ֹ  ⑅᜔  ׄ ᥲᥣᥲsᥲᥒ mᥲsᥙk sіᥒі ᮫  ::\n` +
  `ֹ  ⑅᜔  ׄ sіᥲ⍴ gᥙіᥣძ ᥕᥲrs & ⍴ᥙsһ gᥣ᥆rᥡ ? ᮫  ::\n` +
  `ֹ  ⑅᜔  ׄ sіᥲ⍴ mᥱᥒᥲᥲ𝗍і sᥱmᥙᥲ ⍴ᥱrᥲ𝗍ᥙrᥲᥒ ? ᮫  ::`

const introCopyText =
  `nama ::\numur ::\naskot ::\nlevel akun ::\nid & nickname ::\nalasan masuk sini ::\nsiap guild wars & push glory ? ::\nsiap menaati semua peraturan ? ::`

function buildIntroBlock(): string {
  return (
    `\n\nִ ࣪ ˖ ᨰꫀᥣᥴ᥆ꩇꫀ tׁׅᨵׁׅׅ ᰔ ִ𝗝𝗨𝗦𝗧 𝗔𝗡𝗚𝗘𝗟𝗦 ᰔ\n` +
    `         . ݁₊ ⊹ . ⟡ . ⊹ ₊ ݁.\n` +
    `ᥫ᭡ *before joining, yuk kenalin diri kamu dulu-!! ⋆*\n\n` +
    introRaw +
    `\n\n꒰ © ${botName} ꒱`
  )
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




export async function sendWelcome(
  Morela: any,
  groupJid: unknown,
  memberJid: unknown,
  groupName: string,
  memberCount: unknown,
  pushname: unknown,
  withIntro = false
) {
  const safeJid = sanitizeJid(memberJid)
  if (!safeJid) {
    console.warn('[WELCOME] JID tidak valid, skip:', memberJid)
    return
  }

  const userNum  = safeJid.split('@')[0].split(':')[0]
  const username = (typeof pushname === 'string' && pushname.trim()) ? pushname.trim() : userNum

  
  let fkontak: any = null
  try {
    fkontak = await buildFkontak(Morela)
  } catch (e) {
    console.warn('[WELCOME] buildFkontak gagal:', (e as Error).message)
  }

  
  const avatarBuffer = await fetchPP(Morela, safeJid)

  
  let imageBuffer: Buffer | null = null
  try {
    imageBuffer = await createWelcomeCanvas(username, groupName, memberCount, avatarBuffer)
  } catch (e) {
    console.error('[WELCOME] Canvas error:', (e as Error).message)
  }

  
  let thumbBuffer: Buffer | null = null
  if (imageBuffer) {
    try {
      thumbBuffer = await sharp(imageBuffer).resize(300, 150, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer()
    } catch { thumbBuffer = avatarBuffer }
  }

  
  let caption =
    `*Halo* @${userNum} 👋\n\n` +
    `Selamat datang di grup *${groupName}* 🌸\n` +
    `Member ke-*${memberCount}* yang bergabung!`

  if (withIntro) caption += buildIntroBlock()

  
  const interactiveButtons: any[] = []
  if (withIntro) {
    interactiveButtons.push({
      name: 'cta_copy',
      buttonParamsJson: JSON.stringify({
        display_text: '📋 Salin Format Intro',
        copy_code: introCopyText
      })
    })
  }

  
  const basePayload: any = {
    mentions: [safeJid],
    contextInfo: {
      mentionedJid:    [safeJid],
      forwardingScore: 9,
      isForwarded:     true,
      externalAdReply: {
        title:                 'SELAMAT DATANG 👋',
        body:                  'Undangan obrolan grup',
        thumbnail:             thumbBuffer ?? undefined,
        mediaType:             1,
        renderLargerThumbnail: false,
        showAdAttribution:     false,
        sourceUrl:             ''
      }
    },
    ...(interactiveButtons.length > 0 && {
      interactiveButtons,
      hasMediaAttachment: !!imageBuffer
    })
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
    console.log(`[WELCOME] ✅ @${userNum} | intro=${withIntro} | pp=${!!avatarBuffer} | fkontak=${!!fkontak}`)
  } catch (e) {
    console.error('[WELCOME] ❌ Gagal:', (e as Error).message)
    try {
      await Morela.sendMessage(groupJid, { text: caption, mentions: [safeJid] })
    } catch {}
  }
}


export async function sendIntro(
  _Morela: any, _groupJid: unknown, _memberJid: unknown,
  _groupName: string, _memberCount: unknown
) {
  
}




const handler = async (m: any, { Morela, args, reply, command, fkontak }: any) => {
  const from      = m.chat
  const mode      = (args[0] || '').toLowerCase()
  const hasMention = m.mentionedJid?.length > 0

  
  if (command === 'intro' || command === 'setintro') {
    const groupData    = getGroup(from)
    const currentIntro = groupData?.intro || false

    if (!mode || mode === 'status' || mode === 'cek') {
      return reply(
        `🎌 *INTRO STATUS*\n\n` +
        `Grup ini: ${currentIntro ? '🟢 AKTIF' : '🔴 NONAKTIF'}\n\n` +
        `• *.intro on*  — aktifkan\n` +
        `• *.intro off* — nonaktifkan\n\n` +
        `_Jika ON, format intro digabung dalam\n1 pesan welcome + tombol salin._`
      )
    }
    if (mode === 'on') {
      if (currentIntro) return reply('⚠️ Intro sudah aktif!')
      updateGroup(from, { intro: true })
      return reply('✅ *Intro Diaktifkan!*\n\n_Intro akan digabung dalam 1 pesan welcome._')
    }
    if (mode === 'off') {
      if (!currentIntro) return reply('⚠️ Intro sudah nonaktif!')
      updateGroup(from, { intro: false })
      return reply('✅ *Intro Dinonaktifkan!*')
    }
    return reply('❌ Gunakan: .intro on / off / status')
  }

  
  if (!hasMention) {
    const groupData = getGroup(from)
    const current   = groupData?.welcome || false
    const introOn   = groupData?.intro || false

    if (!mode || mode === 'status' || mode === 'cek') {
      return reply(
        `👋 *WELCOME STATUS*\n\n` +
        `Welcome : ${current ? '🟢 AKTIF' : '🔴 NONAKTIF'}\n` +
        `Intro   : ${introOn ? '🟢 AKTIF' : '🔴 NONAKTIF'}\n\n` +
        `• *.welcome on/off*  — atur welcome\n` +
        `• *.intro on/off*    — atur intro\n` +
        `• *.welcome @tag*    — test manual`
      )
    }
    if (mode === 'on') {
      if (current) return reply('⚠️ Welcome sudah aktif!')
      updateGroup(from, { welcome: true })
      return reply('✅ *Welcome Diaktifkan!* 🎉')
    }
    if (mode === 'off') {
      if (!current) return reply('⚠️ Welcome sudah nonaktif!')
      updateGroup(from, { welcome: false })
      return reply('✅ *Welcome Dinonaktifkan!*')
    }
    return reply('❌ Gunakan: .welcome on / off / status / @tag')
  }

  
  try {
    const groupMeta   = await Morela.groupMetadata(from)
    const groupName   = groupMeta.subject || 'Group'
    const memberCount = groupMeta.participants?.length || 0
    const targetJid   = m.mentionedJid[0]

    const safeTarget = sanitizeJid(targetJid)
    if (!safeTarget) return reply('❌ JID target tidak valid!')

    const participant = groupMeta.participants?.find(
      (p: any) => sanitizeJid(p.id) === safeTarget
    )
    const pushname = participant?.notify || participant?.name || null

    const groupData = getGroup(from)
    const withIntro = groupData?.intro || false

    await sendWelcome(Morela, from, safeTarget, groupName, memberCount, pushname, withIntro)
    reply(`✅ Welcome test terkirim!\nIntro: ${withIntro ? '🟢 digabung + tombol salin' : '🔴 nonaktif'}`)
  } catch (e) {
    console.error('[WELCOME CMD ERROR]', (e as Error).message)
    reply(`❌ Error: ${(e as Error).message}`)
  }
}

handler.help    = ['welcome on', 'welcome off', 'welcome @tag', 'intro on', 'intro off']
handler.tags    = ['group']
handler.command = ['welcome', 'testwelcome', 'setwelcome', 'intro', 'setintro']
handler.group   = true
handler.admin   = true
handler.noLimit = true

export default handler
