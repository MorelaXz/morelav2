


import { createCanvas, loadImage, registerFont } from 'canvas'
import path               from 'path'
import fs                 from 'fs'
import { fileURLToPath }  from 'url'
import { DateTime }       from 'luxon'
import baileys from '@itsukichan/baileys'
const { proto, generateWAMessageContent, generateWAMessageFromContent } = baileys
import {
    isRegistered,
    registerUser,
    unregisterUser,
    getUser,
    updateUser,
    getUsers,
    countUsers,
    getPhoneByLid
} from '../../Database/db.js'
import {
    botName,
    buildFkontak,
    sendCard,
    menuBuf,
    imagePath
} from '../../Library/utils.js'


const FONT_DIR   = path.join(process.cwd(), 'data', 'font')
const FONT_BOLD  = path.join(FONT_DIR, 'Poppins-Bold.ttf')
const FONT_MED   = path.join(FONT_DIR, 'Poppins-Medium.ttf')
const FONT_REG   = path.join(FONT_DIR, 'Poppins-Regular.ttf')
const FONT_LIGHT = path.join(FONT_DIR, 'Poppins-Light.ttf')

let _fontsLoaded = false
function loadFonts() {
    if (_fontsLoaded) return
    try {
        if (fs.existsSync(FONT_BOLD))  registerFont(FONT_BOLD,  { family: 'Poppins', weight: 'bold' })
        if (fs.existsSync(FONT_MED))   registerFont(FONT_MED,   { family: 'Poppins', weight: '500' })
        if (fs.existsSync(FONT_REG))   registerFont(FONT_REG,   { family: 'Poppins', weight: 'normal' })
        if (fs.existsSync(FONT_LIGHT)) registerFont(FONT_LIGHT, { family: 'Poppins', weight: '300' })
        _fontsLoaded = true
    } catch (e) { console.error('[REGISTER CANVAS] Font:', (e as Error).message) }
}




async function sendQuickReply(
    Morela:      any,
    jid:         string,
    caption:     string,
    buttonText:  string,
    buttonId:    string,
    imgBuf:      Buffer | null,
    quoted:      any
): Promise<void> {
    const IM = (proto.Message as any).InteractiveMessage

    let header: unknown
    if (imgBuf) {
        try {
            const { imageMessage } = await generateWAMessageContent(
                { image: imgBuf },
                { upload: Morela.waUploadToServer }
            )
            header = IM.Header.fromObject({ hasMediaAttachment: true, imageMessage })
        } catch {
            header = IM.Header.fromObject({ hasMediaAttachment: false })
        }
    } else {
        header = IM.Header.fromObject({ hasMediaAttachment: false })
    }

    const msg = generateWAMessageFromContent(
        jid,
        {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata:        {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: IM.fromObject({
                        body:   IM.Body.fromObject({ text: caption }),
                        footer: IM.Footer.fromObject({ text: '' }),
                        header,
                        nativeFlowMessage: IM.NativeFlowMessage.fromObject({
                            buttons: [
                                {
                                    name:            'quick_reply',
                                    buttonParamsJson: JSON.stringify({
                                        display_text: buttonText,
                                        id:           buttonId
                                    })
                                }
                            ]
                        })
                    })
                }
            }
        },
        { quoted }
    )

    await Morela.relayMessage(jid, msg.message, { messageId: msg.key.id })
}


function generateSN(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return Array.from({ length: 11 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}


function formatTanggal(ts: number): string {
    return DateTime.fromMillis(ts)
        .setZone('Asia/Jakarta')
        .setLocale('id')
        .toFormat('d/M/yyyy, HH.mm.ss')
}



function roundRect(ctx, x, y, w, h, r) {
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



function circleClip(ctx, cx, cy, r) {
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.closePath()
}


async function generateRegCanvas(
    nama:    string,
    snCode:  string,
    tanggal: string,
    ppBuf:   Buffer | null
): Promise<Buffer> {
    loadFonts()

    const F  = fs.existsSync(FONT_REG) ? 'Poppins' : 'Arial'
    const W  = 900
    const H  = 420
    const canvas = createCanvas(W, H)
    const ctx    = canvas.getContext('2d')

    
    const bg = ctx.createLinearGradient(0, 0, W, H)
    bg.addColorStop(0,   '#040410')
    bg.addColorStop(0.5, '#08081C')
    bg.addColorStop(1,   '#0C0618')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    
    const g1 = ctx.createRadialGradient(0, H * 0.5, 0, 0, H * 0.5, 400)
    g1.addColorStop(0, 'rgba(0,200,200,0.13)')
    g1.addColorStop(1, 'rgba(0,200,200,0)')
    ctx.fillStyle = g1
    ctx.fillRect(0, 0, W, H)

    
    const g2 = ctx.createRadialGradient(W, H * 0.4, 0, W, H * 0.4, 350)
    g2.addColorStop(0, 'rgba(120,60,255,0.12)')
    g2.addColorStop(1, 'rgba(120,60,255,0)')
    ctx.fillStyle = g2
    ctx.fillRect(0, 0, W, H)

    
    for (let i = 0; i < W; i += 3) {
        for (let j = 0; j < H; j += 3) {
            const v = Math.random()
            if (v > 0.7) {
                ctx.fillStyle = `rgba(255,255,255,${0.015 * v})`
                ctx.fillRect(i, j, 2, 2)
            }
        }
    }

    
    roundRect(ctx, 24, 24, W - 48, H - 48, 20)
    ctx.fillStyle = 'rgba(10,10,30,0.75)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,210,210,0.22)'
    ctx.lineWidth   = 1.5
    ctx.stroke()

    
    roundRect(ctx, 24, 24, 5, H - 48, 3)
    const barGrad = ctx.createLinearGradient(0, 24, 0, H - 24)
    barGrad.addColorStop(0, '#00E5E5')
    barGrad.addColorStop(0.5, '#7B4FFF')
    barGrad.addColorStop(1, '#00E5E5')
    ctx.fillStyle = barGrad
    ctx.fill()

    
    const titleGrad = ctx.createLinearGradient(60, 0, 600, 0)
    titleGrad.addColorStop(0, '#00E5E5')
    titleGrad.addColorStop(0.5, '#FFFFFF')
    titleGrad.addColorStop(1, '#7B4FFF')
    ctx.fillStyle   = titleGrad
    ctx.font        = `bold 28px "${F}"`
    ctx.textAlign   = 'left'
    ctx.shadowColor = 'rgba(0,210,210,0.6)'
    ctx.shadowBlur  = 12
    ctx.fillText('🎉 REGISTRASI BERHASIL', 60, 80)
    ctx.shadowBlur = 0

    
    ctx.strokeStyle = 'rgba(0,210,210,0.25)'
    ctx.lineWidth   = 1
    ctx.beginPath()
    ctx.moveTo(60, 95)
    ctx.lineTo(W - 60, 95)
    ctx.stroke()

    
    const AVATAR_X = W - 140
    const AVATAR_Y = H / 2 - 10
    const AVATAR_R = 75

    
    const TEXT_MAX_X = AVATAR_X - AVATAR_R - 30

    const rows = [
        { label: 'Nama',    value: nama,        color: '#FFFFFF',  weight: 'bold'   },
        { label: 'Kode',    value: snCode,       color: '#FFC107',  weight: 'bold'   },
        { label: 'Daftar',  value: tanggal,      color: '#CCCCDD',  weight: 'normal' },
        { label: 'Status',  value: 'Free',       color: '#4ADE80',  weight: '500'    },
        { label: 'Verified',value: 'True',       color: '#00E5E5',  weight: '500'    },
    ]

    const START_Y  = 135
    const ROW_H    = 46

    rows.forEach((row, i) => {
        const ry = START_Y + i * ROW_H

        
        ctx.font      = `normal 13px "${F}"`
        ctx.fillStyle = 'rgba(160,160,200,0.85)'
        ctx.textAlign = 'left'
        ctx.fillText(row.label + ' :', 60, ry)

        
        ctx.font      = `${row.weight} 17px "${F}"`
        ctx.fillStyle = row.color
        ctx.textAlign = 'left'

        
        let val = row.value
        if (ctx.measureText(val).width > TEXT_MAX_X - 160) {
            while (val.length > 1 && ctx.measureText(val + '…').width > TEXT_MAX_X - 160) {
                val = val.slice(0, -1)
            }
            val += '…'
        }
        ctx.fillText(val, 160, ry)

        
        if (i < rows.length - 1) {
            ctx.strokeStyle = 'rgba(100,100,150,0.18)'
            ctx.lineWidth   = 1
            ctx.beginPath()
            ctx.moveTo(60, ry + 12)
            ctx.lineTo(TEXT_MAX_X - 10, ry + 12)
            ctx.stroke()
        }
    })

    
    
    ctx.save()
    circleClip(ctx, AVATAR_X, AVATAR_Y, AVATAR_R + 6)
    const ringGrad = ctx.createLinearGradient(
        AVATAR_X - AVATAR_R, AVATAR_Y - AVATAR_R,
        AVATAR_X + AVATAR_R, AVATAR_Y + AVATAR_R
    )
    ringGrad.addColorStop(0, '#00E5E5')
    ringGrad.addColorStop(0.5, '#7B4FFF')
    ringGrad.addColorStop(1, '#00E5E5')
    ctx.fillStyle = ringGrad
    ctx.fill()
    ctx.restore()

    
    ctx.save()
    circleClip(ctx, AVATAR_X, AVATAR_Y, AVATAR_R)
    ctx.clip()
    if (ppBuf) {
        try {
            const ppImg = await loadImage(ppBuf)
            
            const s   = Math.max((AVATAR_R * 2) / ppImg.width, (AVATAR_R * 2) / ppImg.height)
            const iw  = ppImg.width  * s
            const ih  = ppImg.height * s
            const ix  = AVATAR_X - iw / 2
            const iy  = AVATAR_Y - ih / 2
            ctx.drawImage(ppImg, ix, iy, iw, ih)
        } catch {
            
            const av = ctx.createRadialGradient(AVATAR_X, AVATAR_Y, 0, AVATAR_X, AVATAR_Y, AVATAR_R)
            av.addColorStop(0, '#1A1A40')
            av.addColorStop(1, '#0A0A20')
            ctx.fillStyle = av
            ctx.fill()
        }
    } else {
        const av = ctx.createRadialGradient(AVATAR_X, AVATAR_Y, 0, AVATAR_X, AVATAR_Y, AVATAR_R)
        av.addColorStop(0, '#1A1A40')
        av.addColorStop(1, '#0A0A20')
        ctx.fillStyle = av
        ctx.fill()
    }
    ctx.restore()

    
    const badgeW  = 110
    const badgeH  = 28
    const badgeX  = AVATAR_X - badgeW / 2
    const badgeY  = AVATAR_Y + AVATAR_R + 10

    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 14)
    const badgeGrad = ctx.createLinearGradient(badgeX, 0, badgeX + badgeW, 0)
    badgeGrad.addColorStop(0, 'rgba(0,200,200,0.85)')
    badgeGrad.addColorStop(1, 'rgba(0,150,180,0.85)')
    ctx.fillStyle = badgeGrad
    ctx.fill()

    ctx.font      = `bold 11px "${F}"`
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.shadowColor = 'rgba(0,200,200,0.6)'
    ctx.shadowBlur  = 6
    ctx.fillText('✓  VERIFIED', badgeX + badgeW / 2, badgeY + 19)
    ctx.shadowBlur  = 0

    
    const FY = H - 50
    ctx.strokeStyle = 'rgba(0,210,210,0.15)'
    ctx.lineWidth   = 1
    ctx.beginPath()
    ctx.moveTo(40, FY)
    ctx.lineTo(W - 40, FY)
    ctx.stroke()

    ctx.font      = `500 13px "${F}"`
    ctx.fillStyle = 'rgba(160,160,200,0.8)'
    ctx.textAlign = 'center'
    ctx.fillText(`✦ ${botName} ✦`, W / 2, FY + 22)

    ctx.font      = `300 11px "${F}"`
    ctx.fillStyle = 'rgba(100,100,150,0.7)'
    ctx.fillText(
        DateTime.now().setZone('Asia/Jakarta').setLocale('id').toFormat('dd MMM yyyy · HH:mm') + ' WIB',
        W / 2, FY + 38
    )

    return canvas.toBuffer('image/png')
}



const DAFTAR_IMG_PATH = path.join(process.cwd(), 'media', 'register.jpg')
let _daftarImgCache: Buffer | null = null

function getDaftarImage(): Buffer | null {
    if (_daftarImgCache) return _daftarImgCache
    if (fs.existsSync(DAFTAR_IMG_PATH)) {
        _daftarImgCache = fs.readFileSync(DAFTAR_IMG_PATH)
    }
    return _daftarImgCache
}


async function fetchPP(Morela: any, jid: string): Promise<Buffer | null> {
    try {
        const url = await Morela.profilePictureUrl(jid, 'image')
        const res = await fetch(url)
        return Buffer.from(await res.arrayBuffer())
    } catch {
        return null
    }
}


function fmtTgl(ts: number): string {
    return DateTime.fromMillis(ts).setZone('Asia/Jakarta').setLocale('id').toFormat('d/M/yyyy, HH.mm.ss')
}




const handler = async (m: any, { Morela, args, text, reply, command, isOwn, isPrem, senderJid, fkontak }: any) => {
    const from    = m.chat
    const rawJid  = senderJid || m.sender || m.key.remoteJid
    
    let userJid = rawJid
    if (rawJid?.endsWith('@lid')) {
        const resolved = getPhoneByLid(rawJid.split('@')[0])
        if (resolved) userJid = resolved + '@s.whatsapp.net'
    }
    const userNumber = userJid.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '')
    const pushname   = m.pushName || userNumber

    
    
    
    if (command === 'daftar') {

        
        if (isOwn || isPrem) {
            return reply(
                `╭╌╌⬡「 ✅ *ᴀᴄᴄᴏᴜɴᴛ ᴘʀɪᴠɪʟᴇɢᴇᴅ* 」\n` +
                `┃\n` +
                `┃ ◦ 🔑 Kamu adalah *Owner/Premium*\n` +
                `┃ ◦ ✅ Akun sudah otomatis diizinkan\n` +
                `┃\n` +
                `╰╌╌⬡\n\n꒰ © ${botName} ꒱`
            )
        }

        
        if (isRegistered(userJid)) {
            const data = getUser(userJid) as any
            return reply(
                `╭╌╌⬡「 ✅ *ꜱᴜᴅᴀʜ ᴛᴇʀᴅᴀꜰᴛᴀʀ* 」\n` +
                `┃\n` +
                `┃ ◦ 👤 Nama  : *${data?.name || data?.regName || '-'}*\n` +
                `┃ ◦ 📅 Sejak : *${data?.regDate || '-'}*\n` +
                `┃\n` +
                `┃ ◦ ℹ️ Kamu sudah terdaftar!\n` +
                `┃ ◦ Gunakan *.cekrg* untuk lihat profil\n` +
                `┃\n` +
                `╰╌╌⬡\n\n꒰ © ${botName} ꒱`
            )
        }

        
        
        
        
        if (text && text.trim().length > 0) {
            const namaInput = text.trim().slice(0, 25)
            const snCode2   = generateSN()
            const nowMs2    = Date.now()
            const now2      = Math.floor(nowMs2 / 1000)

            const ok2 = registerUser(userJid, userNumber, namaInput)
            if (!ok2) return reply(`❌ Gagal daftar. Coba lagi dalam beberapa detik.`)

            updateUser(userJid, {
                sn_code:       snCode2,
                registered_at: now2,
            })

            await Morela.sendMessage(from, { react: { text: '✅', key: m.key } })

            const tanggal2 = fmtTgl(nowMs2)
            const ppBuf2   = await fetchPP(Morela, userJid)

            try {
                const canvasBuf2 = await generateRegCanvas(namaInput, snCode2, tanggal2, ppBuf2)

                const caption2 =
                    `🎉 *Registrasi Berhasil!*\n\n` +
                    `Nama: *${namaInput}*\n` +
                    `Kode: *${snCode2}*\n` +
                    `Tanggal Daftar: ${tanggal2}\n` +
                    `Status: *Free*\n` +
                    `Verified: *True*\n\n` +
                    `꒰ © ${botName} ꒱`

                await sendQuickReply(
                    Morela, from, caption2,
                    '📋 Menu', '.menu',
                    canvasBuf2, fkontak || m
                )

            } catch (e) {
                console.error('[REGISTER DIRECT CANVAS]', (e as Error).message)
                await reply(
                    `🎉 *Registrasi Berhasil!*\n\n` +
                    `Nama: *${namaInput}*\n` +
                    `Kode: *${snCode2}*\n` +
                    `Tanggal Daftar: ${tanggal2}\n` +
                    `Status: *Free*\n` +
                    `Verified: *True*\n\n` +
                    `꒰ © ${botName} ꒱`
                )
            }

            return
        }

        
        const imgBuf = getDaftarImage()

        const caption =
            `Selamat datang! 👋\n\n` +
            `Klik tombol di bawah untuk registrasi otomatis.\n\n` +
            `꒰ © ${botName} ꒱`

        if (imgBuf) {
            await sendQuickReply(
                Morela, from, caption,
                '⚡ Register Automatic', '.daftar_auto',
                imgBuf, fkontak || m
            )
        } else {
            await sendQuickReply(
                Morela, from, caption,
                '⚡ Register Automatic', '.daftar_auto',
                null, fkontak || m
            )
        }

        return
    }

    
    
    
    if (command === 'daftar_auto') {

        if (isOwn || isPrem) {
            return reply(`╭╌╌⬡「 ✅ *ᴘʀɪᴠɪʟᴇɢᴇᴅ* 」\n┃ Kamu Owner/Premium — tidak perlu daftar!\n╰╌╌⬡\n\n꒰ © ${botName} ꒱`)
        }

        if (isRegistered(userJid)) {
            const data = getUser(userJid) as any
            return reply(
                `╭╌╌⬡「 ✅ *ꜱᴜᴅᴀʜ ᴛᴇʀᴅᴀꜰᴛᴀʀ* 」\n┃\n` +
                `┃ ◦ 👤 *${data?.name || '-'}*\n` +
                `┃ ◦ Gunakan *.cekrg* untuk lihat profil\n` +
                `┃\n╰╌╌⬡\n\n꒰ © ${botName} ꒱`
            )
        }

        const nama   = pushname.slice(0, 25) || 'User'
        const snCode = generateSN()
        const nowMs  = Date.now()
        const now    = Math.floor(nowMs / 1000)

        const ok = registerUser(userJid, userNumber, nama)
        if (!ok) return reply(`❌ Gagal daftar. Coba lagi dalam beberapa detik.`)

        updateUser(userJid, {
            sn_code:       snCode,
            registered_at: now,
        })

        await Morela.sendMessage(from, { react: { text: '✅', key: m.key } })

        const tanggal = fmtTgl(nowMs)

        
        const ppBuf = await fetchPP(Morela, userJid)

        
        try {
            const canvasBuf = await generateRegCanvas(nama, snCode, tanggal, ppBuf)

            const caption =
                `🎉 *Registrasi Berhasil!*\n\n` +
                `Nama: *${nama}*\n` +
                `Kode: *${snCode}*\n` +
                `Tanggal Daftar: ${tanggal}\n` +
                `Status: *Free*\n` +
                `Verified: *True*\n\n` +
                `꒰ © ${botName} ꒱`

            await sendQuickReply(
                    Morela, from, caption,
                    '📋 Menu', '.menu',
                    canvasBuf, fkontak || m
                )

        } catch (e) {
            console.error('[REGISTER CANVAS]', (e as Error).message)
            
            await reply(
                `🎉 *Registrasi Berhasil!*\n\n` +
                `Nama: *${nama}*\n` +
                `Kode: *${snCode}*\n` +
                `Tanggal Daftar: ${tanggal}\n` +
                `Status: *Free*\n` +
                `Verified: *True*\n\n` +
                `꒰ © ${botName} ꒱`
            )
        }

        return
    }

    
    
    
    if (command === 'unreg' || command === 'unregister') {
        if (!isRegistered(userJid)) {
            return reply(
                `╭╌╌⬡「 ❌ *ʙᴇʟᴜᴍ ᴛᴇʀᴅᴀꜰᴛᴀʀ* 」\n` +
                `┃\n┃ ◦ ❌ Kamu belum terdaftar!\n┃ ◦ Ketik *.daftar* untuk daftar\n┃\n` +
                `╰╌╌⬡\n\n꒰ © ${botName} ꒱`
            )
        }

        const data    = getUser(userJid) as any
        const inputSN = text.trim().toUpperCase()

        if (!inputSN) {
            return reply(
                `╭╌╌⬡「 🔑 *ᴄᴀʀᴀ ᴜɴʀᴇɢ* 」\n┃\n` +
                `┃ ◦ Format : *.unreg KODE-SN*\n` +
                `┃ ◦ Contoh : *.unreg RYU7CWF62HS*\n┃\n` +
                `╰╌╌⬡\n\n꒰ © ${botName} ꒱`
            )
        }

        const storedSN = (data?.sn_code || '').toUpperCase()
        if (inputSN !== storedSN) {
            return reply(
                `╭╌╌⬡「 ❌ *ᴋᴏᴅᴇ ꜱɴ ꜱᴀʟᴀʜ* 」\n┃\n` +
                `┃ ◦ ❌ Kode SN tidak cocok!\n┃\n` +
                `╰╌╌⬡\n\n꒰ © ${botName} ꒱`
            )
        }

        const ok = unregisterUser(userJid)
        if (!ok) return reply(`❌ Gagal unreg. Coba lagi.`)

        await Morela.sendMessage(from, { react: { text: '🗑️', key: m.key } })

        return reply(
            `╭╌╌⬡「 ✅ *ᴜɴʀᴇɢ ʙᴇʀʜᴀꜱɪʟ* 」\n┃\n` +
            `┃ ◦ 🗑️ Akun *${data?.name || '-'}* dihapus\n` +
            `┃ ◦ Ketik *.daftar* untuk daftar ulang\n┃\n` +
            `╰╌╌⬡\n\n꒰ © ${botName} ꒱`
        )
    }

    
    
    
    if (command === 'cekrg' || command === 'profil' || command === 'profile') {
        if (!isOwn && !isPrem && !isRegistered(userJid)) {
            return reply(
                `╭╌╌⬡「 ❌ *ʙᴇʟᴜᴍ ᴛᴇʀᴅᴀꜰᴛᴀʀ* 」\n┃\n` +
                `┃ ◦ Ketik *.daftar* untuk daftar\n┃\n` +
                `╰╌╌⬡\n\n꒰ © ${botName} ꒱`
            )
        }

        const data    = getUser(userJid) as any
        const nama    = data?.name || data?.regName || pushname
        const snCode  = data?.sn_code || '-'
        const tgl     = data?.registered_at ? fmtTgl(data.registered_at * 1000) : (data?.regDate || '-')
        const premium = data?.premium || data?.is_premium ? '💎 Premium' : 'Free'

        const caption =
            `╭╌╌⬡「 👤 *ᴘʀᴏꜰɪʟ ᴀᴋᴜɴ* 」\n┃\n` +
            `┃ ◦ 📛 Nama    : *${nama}*\n` +
            `┃ ◦ 📱 Nomor   : *${userNumber}*\n` +
            `┃ ◦ 🔑 Kode SN : *${snCode}*\n` +
            `┃ ◦ 📅 Daftar  : *${tgl}*\n` +
            `┃ ◦ 💎 Status  : *${premium}*\n` +
            `┃ ◦ ✅ Verified : *True*\n┃\n` +
            `╰╌╌⬡\n\n꒰ © ${botName} ꒱`

        
        try {
            const ppBuf     = await fetchPP(Morela, userJid)
            const canvasBuf = await generateRegCanvas(nama, snCode, tgl, ppBuf)
            await Morela.sendMessage(from, {
                image:   canvasBuf,
                caption,
            }, { quoted: fkontak || m })
        } catch (e) {
            console.error('[CEKRG CANVAS]', (e as Error).message)
            
            await reply(caption)
        }

        return
    }

    
    
    
    if (command === 'deldaftar') {
        if (!isOwn) return reply(`❌ Fitur ini hanya untuk Owner!`)

        const allUsers = getUsers() as any
        const total    = countUsers()

        if (total === 0) {
            return reply(
                `╭╌╌⬡「 🗑️ *ᴅᴀꜰᴛᴀʀ ᴘᴇɴᴅᴀꜰᴛᴀʀ* 」\n┃\n` +
                `┃ ◦ 📭 Belum ada user terdaftar\n┃\n` +
                `╰╌╌⬡\n\n꒰ © ${botName} ꒱`
            )
        }

        
        if (text && text.trim()) {
            const targetJid  = text.trim()
            const targetUser = (allUsers[targetJid] ||
                Object.values(allUsers).find(
                    (u: any) => u.number === targetJid.replace('@s.whatsapp.net', '')
                )) as any

            if (!targetUser) {
                return reply(`❌ User tidak ditemukan di database.`)
            }

            const ok = unregisterUser(targetUser.id || targetJid)
            if (!ok) return reply(`❌ Gagal menghapus user. Coba lagi.`)

            
            const resolvedNumber =
                targetUser.number ||
                (targetUser.id  || '').replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '') ||
                targetJid.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '') ||
                '-'

            await Morela.sendMessage(from, { react: { text: '🗑️', key: m.key } })

            return reply(
                `╭╌╌⬡「 🗑️ *ʜᴀᴘᴜꜱ ꜱᴜᴋꜱᴇꜱ* 」\n┃\n` +
                `┃ ◦ 👤 User *${targetUser.name || targetUser.regName || '-'}* dihapus\n` +
                `┃ ◦ 📱 +${resolvedNumber}\n` +
                `┃ ◦ ℹ️ User harus ketik *.daftar* untuk daftar ulang\n┃\n` +
                `╰╌╌⬡\n\n꒰ © ${botName} ꒱`
            )
        }

        
        const sorted = Object.values(allUsers)
            .sort((a: any, b: any) => (a.registered_at || 0) - (b.registered_at || 0))

        const IM = (proto.Message as any).InteractiveMessage

        
        const rows = sorted.map((u: any) => {
            const tgl    = u.registered_at ? fmtTgl(u.registered_at * 1000) : (u.regDate || '-')
            const ageStr = u.age != null && u.age !== undefined
                ? `${u.age} th`
                : (u.premium || u.is_premium ? '💎 Premium' : 'Free')
            return {
                header:      `📅 ${tgl}`,
                title:       `${u.name || u.regName || 'User'} (${ageStr})`,
                description: `✅ Verified: ${u.registered ? 'Ya' : 'Tidak'}`,
                id:          `.deldaftar ${u.id || (u.number + '@s.whatsapp.net')}`
            }
        })

        const buttonParamsJson = JSON.stringify({
            title:    'Pilih User',
            sections: [
                {
                    title:           'Daftar Pendaftar',
                    highlight_label: 'Pilih',
                    rows
                }
            ]
        })

        const msg = generateWAMessageFromContent(
            from,
            {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata:        {},
                            deviceListMetadataVersion: 2
                        },
                        interactiveMessage: IM.fromObject({
                            body:   IM.Body.fromObject({
                                text: `🗑️ *Daftar Pendaftar*\n\n📋 Pilih user yang ingin dihapus dari daftar pendaftar:`
                            }),
                            footer: IM.Footer.fromObject({ text: `© ${botName}` }),
                            header: IM.Header.fromObject({ hasMediaAttachment: false }),
                            nativeFlowMessage: IM.NativeFlowMessage.fromObject({
                                buttons: [
                                    {
                                        name:             'single_select',
                                        buttonParamsJson
                                    }
                                ]
                            })
                        })
                    }
                }
            },
            { quoted: fkontak || m }
        )

        await Morela.relayMessage(from, msg.message, { messageId: msg.key.id })
        return
    }

    
    
    
    if (command === 'listuser' || command === 'listusers' || command === 'daftaruser') {
        if (!isOwn) return reply(`❌ Fitur ini hanya untuk Owner!`)

        const allUsers = getUsers() as any
        const total    = countUsers()

        if (total === 0) {
            return reply(
                `╭╌╌⬡「 📋 *ʟɪꜱᴛ ᴜꜱᴇʀ* 」\n┃\n┃ ◦ 📭 Belum ada user terdaftar\n┃\n` +
                `╰╌╌⬡\n\n꒰ © ${botName} ꒱`
            )
        }

        const sorted = Object.values(allUsers)
            .sort((a: any, b: any) => (b.registered_at || 0) - (a.registered_at || 0))

        let txt =
            `╭╌╌⬡「 📋 *ʟɪꜱᴛ ᴜꜱᴇʀ* 」\n┃\n` +
            `┃ ◦ 📊 Total : *${total} user*\n┃\n`

        sorted.forEach((u: any, i: number) => {
            const tgl    = u.registered_at ? fmtTgl(u.registered_at * 1000) : (u.regDate || '-')
            const prem   = u.premium || u.is_premium ? ' 💎' : ''
            const banned = u.banned  || u.is_banned  ? ' 🚫' : ''
            const ageStr = u.age != null && u.age !== undefined ? ` (${u.age} th)` : ''
            txt +=
                `┃ ◦ *${i + 1}.* ${u.name || u.regName || 'User'}${ageStr}${prem}${banned}
` +
                `┃    📱 +${u.number || (u.id || '').replace('@s.whatsapp.net', '')}
` +
                `┃    📅 ${tgl}
┃
`
        })

        txt += `╰╌╌⬡\n\n꒰ © ${botName} ꒱`
        await reply(txt)
    }
}

handler.command  = ['daftar', 'daftar_auto', 'unreg', 'unregister', 'cekrg', 'profil', 'profile', 'listuser', 'listusers', 'daftaruser', 'deldaftar']
handler.tags     = ['tools', 'register']
handler.help     = ['daftar', 'unreg kode_sn', 'cekrg', 'listuser']
handler.noLimit  = true
handler.owner    = false
handler.premium  = false
handler.group    = false
handler.private  = false
handler.admin    = false
handler.botAdmin = false

export default handler
