

import { createCanvas, loadImage, registerFont } from 'canvas'
import path from 'path'
import { fileURLToPath } from 'url'
import { DateTime } from 'luxon'
import fs from 'fs'
import { getGroup, updateGroup } from '../../Database/db.js'
import {
    buildFkontak,
    sendCard,
    botName,
} from '../../Library/utils.js'


const __dirname  = path.dirname(fileURLToPath(import.meta.url as string))
const FONT_DIR   = path.join(process.cwd(), 'data', 'font')
const FONT_BOLD  = path.join(FONT_DIR, 'Poppins-Bold.ttf')
const FONT_MED   = path.join(FONT_DIR, 'Poppins-Medium.ttf')
const FONT_REG   = path.join(FONT_DIR, 'Poppins-Regular.ttf')
const FONT_LIGHT = path.join(FONT_DIR, 'Poppins-Light.ttf')

let _fontsLoaded = false
const loadFonts = () => {
    if (_fontsLoaded) return
    try {
        if (fs.existsSync(FONT_BOLD))  registerFont(FONT_BOLD,  { family: 'Poppins', weight: 'bold' })
        if (fs.existsSync(FONT_MED))   registerFont(FONT_MED,   { family: 'Poppins', weight: '500' })
        if (fs.existsSync(FONT_REG))   registerFont(FONT_REG,   { family: 'Poppins', weight: 'normal' })
        if (fs.existsSync(FONT_LIGHT)) registerFont(FONT_LIGHT, { family: 'Poppins', weight: '300' })
        _fontsLoaded = true
    } catch (e) { console.error('[ANTISTATUS] Font:', (e as Error).message) }
}

const FEATURES = {
    antibot:     'Anti Bot Lain',
    antivideo:   'Anti Video',
    antifoto:    'Anti Foto/Gambar',
    antiaudio:   'Anti Audio/Voice',
    antidokumen: 'Anti Dokumen/File',
    antisticker: 'Anti Sticker',
    antimention: 'Anti Tag Status',
}
const VALID_KEYS = Object.keys(FEATURES)


const roundRect = (ctx, x, y, w, h, r) => {
    r = Math.min(r, w / 2, h / 2)
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


const drawNoiseTexture = (ctx, x, y, w, h, alpha = 0.03) => {
    const size = 2
    for (let i = 0; i < w; i += size) {
        for (let j = 0; j < h; j += size) {
            const v = Math.random()
            if (v > 0.6) {
                ctx.fillStyle = `rgba(255,255,255,${alpha * v})`
                ctx.fillRect(x + i, y + j, size, size)
            }
        }
    }
}


const ellipsis = (ctx, text, maxW) => {
    if (ctx.measureText(text).width <= maxW) return text
    while (text.length > 1 && ctx.measureText(text + '…').width > maxW) text = text.slice(0, -1)
    return text + '…'
}



async function generateAntiStatusCanvas(groupName: string, grp: Record<string, unknown>) {
    loadFonts()
    const F = fs.existsSync(FONT_REG) ? 'Poppins' : 'Arial'

    const items = [
        { label: 'Anti Bot Lain',    key: 'antibot',     emoji: '[BOT]' },
        { label: 'Anti Video',       key: 'antivideo',   emoji: '[VID]' },
        { label: 'Anti Foto',        key: 'antifoto',    emoji: '[IMG]' },
        { label: 'Anti Audio/Voice', key: 'antiaudio',   emoji: '[AUD]' },
        { label: 'Anti Dokumen',     key: 'antidokumen', emoji: '[DOC]' },
        { label: 'Anti Sticker',     key: 'antisticker', emoji: '[STK]' },
        { label: 'Anti Tag Status',  key: 'antimention', emoji: '[TAG]' },
        { label: 'Anti Link',        key: 'antilink',    emoji: '[URL]' },
    ]

    const W        = 900
    const HEADER_H = 220
    const GRID_H   = items.length * 54 + 80
    const FOOTER_H = 60
    const H        = HEADER_H + GRID_H + FOOTER_H

    const canvas = createCanvas(W, H)
    const ctx    = canvas.getContext('2d')

    const ACCENT  = '#7C6FFF'
    const ACCENT2 = '#FF6FD8'
    const BORDER  = 'rgba(124,111,255,0.18)'
    const TEXT_1  = '#FFFFFF'
    const TEXT_2  = '#A8A8C8'
    const TEXT_3  = '#6060A0'

    const bg = ctx.createLinearGradient(0, 0, W, H)
    bg.addColorStop(0,   '#080810')
    bg.addColorStop(0.4, '#0C0C20')
    bg.addColorStop(1,   '#100818')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    ctx.save()
    const g1 = ctx.createRadialGradient(W * 0.15, HEADER_H * 0.6, 0, W * 0.15, HEADER_H * 0.6, 280)
    g1.addColorStop(0, 'rgba(124,111,255,0.12)')
    g1.addColorStop(1, 'rgba(124,111,255,0)')
    ctx.fillStyle = g1
    ctx.fillRect(0, 0, W, HEADER_H)
    const g2 = ctx.createRadialGradient(W * 0.85, H * 0.6, 0, W * 0.85, H * 0.6, 320)
    g2.addColorStop(0, 'rgba(255,111,216,0.07)')
    g2.addColorStop(1, 'rgba(255,111,216,0)')
    ctx.fillStyle = g2
    ctx.fillRect(0, 0, W, H)
    ctx.restore()

    drawNoiseTexture(ctx, 0, 0, W, H, 0.025)

    roundRect(ctx, 20, 20, W - 40, HEADER_H - 30, 18)
    ctx.fillStyle   = 'rgba(124,111,255,0.06)'
    ctx.fill()
    ctx.strokeStyle = BORDER
    ctx.lineWidth   = 1
    ctx.stroke()

    const titleGrad = ctx.createLinearGradient(0, 50, W, 100)
    titleGrad.addColorStop(0, ACCENT)
    titleGrad.addColorStop(0.5, TEXT_1)
    titleGrad.addColorStop(1, ACCENT2)
    ctx.fillStyle   = titleGrad
    ctx.font        = `bold 38px "${F}"`
    ctx.textAlign   = 'center'
    ctx.shadowColor = 'rgba(124,111,255,0.5)'
    ctx.shadowBlur  = 14
    ctx.fillText('ANTI GROUP STATUS', W / 2, 84)
    ctx.shadowBlur  = 0

    ctx.font      = `500 16px "${F}"`
    ctx.fillStyle = TEXT_2
    ctx.fillText(ellipsis(ctx, groupName, W - 100), W / 2, 112)

    const tagGrad = ctx.createLinearGradient(W / 2 - 70, 0, W / 2 + 70, 0)
    tagGrad.addColorStop(0, ACCENT)
    tagGrad.addColorStop(1, ACCENT2)
    roundRect(ctx, W / 2 - 70, 124, 140, 26, 13)
    ctx.fillStyle = tagGrad
    ctx.fill()
    ctx.font      = `500 12px "${F}"`
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.fillText('PERLINDUNGAN GRUP', W / 2, 141)

    
    const onCount  = items.filter((it: unknown) => !!grp?.[it.key]).length
    const offCount = items.length - onCount
    const pills = [
        { label: `${onCount} Aktif`,     color: 'rgba(63,185,80,0.2)',    border: 'rgba(63,185,80,0.5)',   text: '#3fb950' },
        { label: `${offCount} Nonaktif`, color: 'rgba(139,148,158,0.15)', border: 'rgba(139,148,158,0.3)', text: TEXT_3 },
    ]
    let px = W / 2 - 85
    ctx.font = `normal 12px "${F}"`
    pills.forEach((p: unknown) => {
        
        const tw = ctx.measureText(p.label).width + 22
        roundRect(ctx, px, 158, tw, 26, 13)
        
        ctx.fillStyle   = p.color; ctx.fill()
        
        ctx.strokeStyle = p.border; ctx.lineWidth = 1; ctx.stroke()
        
        ctx.fillStyle   = p.text
        
        ctx.fillText(p.label, px + tw / 2, 175)
        px += tw + 8
    })

    const SECTION_Y = HEADER_H + 10
    roundRect(ctx, 20, SECTION_Y, W - 40, GRID_H - 10, 18)
    ctx.fillStyle   = 'rgba(124,111,255,0.03)'
    ctx.fill()
    ctx.strokeStyle = BORDER
    ctx.lineWidth   = 1
    ctx.stroke()

    ctx.font        = `500 13px "${F}"`
    ctx.fillStyle   = TEXT_3
    ctx.textAlign   = 'left'
    ctx.fillText('STATUS FITUR', 44, SECTION_Y + 26)
    ctx.strokeStyle = 'rgba(124,111,255,0.2)'
    ctx.lineWidth   = 1
    ctx.beginPath()
    ctx.moveTo(44 + ctx.measureText('STATUS FITUR').width + 10, SECTION_Y + 21)
    ctx.lineTo(W - 40, SECTION_Y + 21)
    ctx.stroke()

    items.forEach((item, i) => {
        const isOn  = !!grp?.[item.key]
        const ry    = SECTION_Y + 50 + i * 54
        const ROW_H = 44

        roundRect(ctx, 36, ry - 6, W - 72, ROW_H, 10)
        ctx.fillStyle = i % 2 === 0 ? 'rgba(124,111,255,0.06)' : 'rgba(0,0,0,0)'
        ctx.fill()

        roundRect(ctx, 36, ry - 6, 4, ROW_H, 2)
        ctx.fillStyle = isOn ? '#3fb950' : '#484f58'
        ctx.fill()

        roundRect(ctx, 44, ry, 46, 28, 6)
        ctx.fillStyle   = isOn ? 'rgba(124,111,255,0.3)' : 'rgba(60,60,80,0.5)'
        ctx.fill()
        ctx.strokeStyle = isOn ? 'rgba(124,111,255,0.5)' : 'rgba(80,80,100,0.4)'
        ctx.lineWidth   = 1
        ctx.stroke()
        ctx.font      = `bold 10px "${F}"`
        ctx.fillStyle = isOn ? '#a78bfa' : '#6060A0'
        ctx.textAlign = 'center'
        ctx.fillText(item.emoji, 67, ry + 18)

        ctx.font      = `500 16px "${F}"`
        ctx.fillStyle = isOn ? TEXT_1 : TEXT_2
        ctx.textAlign = 'left'
        ctx.fillText(item.label, 100, ry + 20)

        const bX = W - 120
        const bY = ry
        roundRect(ctx, bX, bY, 80, 28, 8)
        ctx.fillStyle   = isOn ? 'rgba(63,185,80,0.2)'  : 'rgba(139,148,158,0.15)'
        ctx.fill()
        ctx.strokeStyle = isOn ? 'rgba(63,185,80,0.6)'  : 'rgba(139,148,158,0.3)'
        ctx.lineWidth   = 1
        ctx.stroke()
        ctx.font        = `bold 13px "${F}"`
        ctx.fillStyle   = isOn ? '#3fb950' : TEXT_3
        ctx.textAlign   = 'center'
        ctx.shadowColor = isOn ? 'rgba(63,185,80,0.4)' : 'transparent'
        ctx.shadowBlur  = isOn ? 6 : 0
        ctx.fillText(isOn ? '✓ ON' : '✗ OFF', bX + 40, bY + 19)
        ctx.shadowBlur  = 0

        if (i < items.length - 1) {
            ctx.strokeStyle = 'rgba(124,111,255,0.08)'
            ctx.lineWidth   = 1
            ctx.beginPath()
            ctx.moveTo(40, ry + ROW_H + 2)
            ctx.lineTo(W - 40, ry + ROW_H + 2)
            ctx.stroke()
        }
    })

    const fY = H - FOOTER_H
    const fGrad = ctx.createLinearGradient(0, fY, W, fY)
    fGrad.addColorStop(0,   'rgba(124,111,255,0.08)')
    fGrad.addColorStop(0.5, 'rgba(255,111,216,0.08)')
    fGrad.addColorStop(1,   'rgba(124,111,255,0.08)')
    ctx.fillStyle = fGrad
    ctx.fillRect(0, fY, W, FOOTER_H)
    ctx.strokeStyle = 'rgba(124,111,255,0.2)'
    ctx.lineWidth   = 1
    ctx.beginPath(); ctx.moveTo(0, fY); ctx.lineTo(W, fY); ctx.stroke()

    ctx.font      = `500 13px "${F}"`
    ctx.fillStyle = TEXT_2
    ctx.textAlign = 'center'
    ctx.fillText(`✦ ${botName} ✦`, W / 2, fY + 22)
    ctx.font      = `300 11px "${F}"`
    ctx.fillStyle = TEXT_3
    ctx.fillText(DateTime.now().setZone('Asia/Jakarta').setLocale('id').toFormat('dd MMM yyyy · HH:mm') + ' WIB', W / 2, fY + 42)

    return canvas.toBuffer('image/png')
}

function buildFooter(grp: Record<string, unknown>, groupName: string) {
    
    const icon = v => v ? '✅' : '❌'
    return (
        `╭╌╌⬡「 🛡️ *ᴀɴᴛɪ ɢʀᴏᴜᴘ sᴛᴀᴛᴜs* 」\n` +
        `┃ 📍 *${groupName}*\n┃\n` +
        `┃ ${icon(grp?.antibot)}  Anti Bot Lain\n` +
        `┃ ${icon(grp?.antivideo)}  Anti Video\n` +
        `┃ ${icon(grp?.antifoto)}  Anti Foto/Gambar\n` +
        `┃ ${icon(grp?.antiaudio)}  Anti Audio/Voice\n` +
        `┃ ${icon(grp?.antidokumen)}  Anti Dokumen/File\n` +
        `┃ ${icon(grp?.antisticker)}  Anti Sticker\n` +
        `┃ ${icon(grp?.antimention)}  Anti Tag Status\n` +
        `┃ ${icon(grp?.antilink)}  Anti Link → *.antilink on/off*\n┃\n` +
        `┃ *.on <fitur>* / *.off <fitur>* untuk toggle\n` +
        `╰╌╌⬡\n\n© ${botName}`
    )
}





async function onHandler(m: Record<string, unknown>, { args = [], reply }: any) {
    const from  = m.chat
    
    const fitur = (args[0] || '').toLowerCase()

    if (!fitur) return reply(
        `╭╌╌⬡「 📋 *ᴅᴀꜰᴛᴀʀ ꜰɪᴛᴜʀ ᴀɴᴛɪ* 」\n┃\n` +
        `┃ antibot  antivideo  antifoto\n` +
        `┃ antiaudio  antidokumen  antisticker\n` +
        `┃ antimention\n┃\n` +
        `┃ *Anti Link?* → *.antilink on* 👈\n` +
        `╰╌╌⬡\n\n© ${botName}`
    )
    if (!VALID_KEYS.includes(fitur)) return reply(
        `╭╌╌⬡「 ❌ *ᴇʀʀᴏʀ* 」\n┃ Fitur *${fitur}* tidak dikenal!\n╰╌╌⬡\n\n© ${botName}`
    )
    
    const grp = getGroup(from) || {}
    
    if (grp[fitur]) return reply(
        
        `╭╌╌⬡「 ⚠️ *ɪɴꜰᴏ* 」\n┃ *${FEATURES[fitur]}* sudah aktif!\n╰╌╌⬡\n\n© ${botName}`
    )
    
    updateGroup(from, { [fitur]: true })
    reply(
        `╭╌╌⬡「 ✅ *ʙᴇʀʜᴀsɪʟ* 」\n` +
        
        `┃ *${FEATURES[fitur]}* berhasil *diaktifkan!*\n` +
        `┃ _Bot harus jadi admin agar bisa hapus pesan._\n` +
        `╰╌╌⬡\n\n© ${botName}`
    )
}



async function offHandler(m: Record<string, unknown>, { args = [], reply }: any) {
    const from  = m.chat
    
    const fitur = (args[0] || '').toLowerCase()

    if (!fitur) return reply(
        `╭╌╌⬡「 ❌ *ᴇʀʀᴏʀ* 」\n┃ Contoh: *.off antibot*\n╰╌╌⬡\n\n© ${botName}`
    )
    if (!VALID_KEYS.includes(fitur)) return reply(
        `╭╌╌⬡「 ❌ *ᴇʀʀᴏʀ* 」\n┃ Fitur *${fitur}* tidak dikenal!\n╰╌╌⬡\n\n© ${botName}`
    )
    
    const grp = getGroup(from) || {}
    
    if (!grp[fitur]) return reply(
        
        `╭╌╌⬡「 ⚠️ *ɪɴꜰᴏ* 」\n┃ *${FEATURES[fitur]}* memang sudah nonaktif!\n╰╌╌⬡\n\n© ${botName}`
    )
    
    updateGroup(from, { [fitur]: false })
    reply(
        
        `╭╌╌⬡「 ✅ *ʙᴇʀʜᴀsɪʟ* 」\n┃ *${FEATURES[fitur]}* berhasil *dinonaktifkan!*\n╰╌╌⬡\n\n© ${botName}`
    )
}


async function statusHandler(m: Record<string, unknown>, { Morela, reply }: any) {
    const from = m.chat
    
    const grp  = getGroup(from) || {}

    let groupName = 'Grup'
    try {
        
        const meta = await Morela.groupMetadata(from)
        groupName  = meta.subject || 'Grup'
    } catch {}

    try {
        const imgBuf  = await generateAntiStatusCanvas(groupName, grp)
        const footer  = buildFooter(grp, groupName)
        
        const fkontak = await buildFkontak(Morela)
        
        await sendCard(Morela, from, footer, imgBuf, fkontak)
    } catch (e) {
        console.error('[ANTISTATUS CANVAS]', (e as Error).message)
        reply(buildFooter(grp, groupName))
    }
}



async function delwarnHandler(m: Record<string, unknown>, { args = [], reply }: any) {
    const from = m.chat
    let targetJid = null

    
    if (m.quoted?.sender) {
        
        targetJid = m.quoted.sender
    
    } else if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
        
        targetJid = m.message.extendedTextMessage.contextInfo.mentionedJid[0]
    
    } else if (args[0]) {
        
        const num = args[0].replace(/[^0-9]/g, '')
        if (num.length >= 6) targetJid = num + '@s.whatsapp.net'
    }

    if (!targetJid) return reply(
        `╭╌╌⬡「 ❓ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ* 」\n` +
        `┃ • Reply pesan user → *.delwarn*\n` +
        `┃ • Mention → *.delwarn @user*\n` +
        `┃ • Nomor  → *.delwarn 628xxx*\n` +
        `╰╌╌⬡\n\n© ${botName}`
    )

    
    const grp   = getGroup(from) || {}
    
    const warns = grp.warns || {}
    if (!warns[targetJid] || warns[targetJid].count === 0) return reply(
        `╭╌╌⬡「 ⚠️ *ɪɴꜰᴏ* 」\n┃ @${targetJid.split('@')[0]} tidak punya warn.\n╰╌╌⬡\n\n© ${botName}`
    )

    const before = warns[targetJid].count
    warns[targetJid].count = 0
    
    updateGroup(from, { warns })
    reply(
        `╭╌╌⬡「 ✅ *ᴅᴇʟᴡᴀʀɴ* 」\n` +
        `┃ Warn @${targetJid.split('@')[0]} direset!\n` +
        `┃ Sebelumnya: *${before}/5*\n` +
        `╰╌╌⬡\n\n© ${botName}`
    )
}


async function listwarnHandler(m: Record<string, unknown>, { reply }: any) {
    const from  = m.chat
    
    const grp   = getGroup(from) || {}
    
    const warns = grp.warns || {}
    
    const aktif = Object.entries(warns).filter(([, v]) => v.count > 0)

    if (!aktif.length) return reply(
        `╭╌╌⬡「 ✅ *ʟɪsᴛᴡᴀʀɴ* 」\n┃ Tidak ada user yang punya warn.\n╰╌╌⬡\n\n© ${botName}`
    )

    let list = `╭╌╌⬡「 📋 *ʟɪsᴛ ᴡᴀʀɴ ɢʀᴜᴘ* 」\n┃\n`
    aktif
        
        .sort((a, b) => b[1].count - a[1].count)
        .forEach(([jid, data], i) => {
            
            list += `┃ ${i + 1}. @${jid.split('@')[0]} — *${data.count}/5*\n`
        })
    list += `┃\n┃ *.delwarn @user* untuk reset\n╰╌╌⬡\n\n© ${botName}`
    reply(list)
}


const router = async (m, ctx) => {
    const cmd = ctx.command || ''
    if (cmd === 'on')                                               return onHandler(m, ctx)
    if (cmd === 'off')                                              return offHandler(m, ctx)
    if (['antistatus','groupstatus','statusgrup'].includes(cmd))    return statusHandler(m, ctx)
    if (['delwarn','resetwarn','clearwarn'].includes(cmd))          return delwarnHandler(m, ctx)
    if (['listwarn','warnlist'].includes(cmd))                      return listwarnHandler(m, ctx)
}

router.command  = ['on','off','antistatus','groupstatus','statusgrup','delwarn','resetwarn','clearwarn','listwarn','warnlist']
router.group    = true
router.admin    = true

router.noLimit  = true
router.tags     = ['group', 'anti', 'warn']
router.help     = ['on <fitur>', 'off <fitur>', 'antistatus', 'delwarn', 'listwarn']

export default router