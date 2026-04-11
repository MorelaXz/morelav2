// @ts-nocheck

import { getGroup, updateGroup } from '../../Database/db.js'

const FEATURE_NAMES = {
    antibot:     'Anti Bot',
    antivideo:   'Anti Video',
    antifoto:    'Anti Foto',
    antiaudio:   'Anti Audio',
    antidokumen: 'Anti Dokumen',
    antisticker: 'Anti Sticker',
    antimention: 'Anti Tag Status',
}

function getText(m: Record<string, unknown>) {
    return (
        m.text ||
        m.msg?.caption ||
        m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        m.message?.imageMessage?.caption ||
        m.message?.videoMessage?.caption ||
        m.message?.documentMessage?.caption ||
        ''
    )
}

async function deleteMsg(sock: Record<string, unknown>, m: Record<string, unknown>) {
    await sock.sendMessage(m.chat, {
        delete: {
            remoteJid:   m.chat,
            fromMe:      false,
            id:          m.key.id,
            participant: m.key.participant || m.key.remoteJid
        }
    })
}

async function addWarn(
    sock: Record<string, unknown>,
    m: Record<string, unknown>,
    reason: string,
    senderJid: string,
    botAdmin: unknown,
    fkontak: unknown
) {
    try {
        const groupData = getGroup(m.chat) || {}
        const warns     = groupData.warns || {}

        if (!warns[senderJid]) warns[senderJid] = { count: 0 }
        warns[senderJid].count++
        warns[senderJid].updatedAt = Date.now()

        updateGroup(m.chat, { warns })

        const count     = warns[senderJid].count
        const senderNum = senderJid.split('@')[0]

        await sock.sendMessage(m.chat, {
            text:
                `*Peringatan ${count}/5*\n\n` +
                `@${senderNum} melanggar aturan:\n` +
                `*${reason}*\n\n` +
                (count >= 5
                    ? 'Peringatan penuh! Akan segera dikeluarkan.'
                    : `Jika mencapai 5 peringatan, akan dikeluarkan.`),
            mentions: [senderJid]
        }, { quoted: fkontak || m })

        if (count >= 5 && botAdmin) {
            await sock.groupParticipantsUpdate(m.chat, [senderJid], 'remove')
            warns[senderJid].count = 0
            updateGroup(m.chat, { warns })
            console.log(`[ANTI] Kicked ${senderNum} after 5 warns`)
        }
    } catch (e) {
        console.error('[ANTI] addWarn error:', (e as Error).message)
    }
}

async function act(
    sock: Record<string, unknown>,
    m: Record<string, unknown>,
    reason: string,
    senderJid: string,
    botAdmin: unknown,
    fkontak: unknown
) {
    try {
        await deleteMsg(sock, m)
        console.log(`[ANTI] Deleted (${reason}) from ${senderJid.split('@')[0]}`)
    } catch (e) {
        console.error('[ANTI] Delete failed:', (e as Error).message)
    }
    await addWarn(sock, m, reason, senderJid, botAdmin, fkontak)
}

// ─── FIX: Deteksi bot yang jauh lebih komprehensif ───────────────────────────
function isBotMessage(m: Record<string, unknown>): boolean {
    const pushName = (m.pushName as string) || ''
    const mtype    = (m.mtype as string) || ''
    const msg      = (m.message as Record<string, unknown>) || {}

    // 1. Tipe pesan yang hanya dibuat oleh bot
    const BOT_MTYPES = [
        'interactiveMessage',
        'interactiveResponseMessage',
        'listMessage',
        'listResponseMessage',
        'buttonsMessage',
        'buttonsResponseMessage',
        'templateMessage',
        'templateButtonReplyMessage',
        'highlyStructuredMessage',
    ]
    if (BOT_MTYPES.includes(mtype)) return true

    // 2. ViewOnce bot
    if (msg.viewOnceMessage) {
        const inner = (msg.viewOnceMessage as any)?.message || {}
        if (inner.interactiveMessage || inner.buttonsMessage) return true
    }

    // 3. externalAdReply = bot broadcast/iklan bot
    const ctx: Record<string, unknown> =
        (msg.extendedTextMessage as any)?.contextInfo   ||
        (msg.imageMessage as any)?.contextInfo          ||
        (msg.videoMessage as any)?.contextInfo          ||
        (msg.documentMessage as any)?.contextInfo       ||
        {}
    if (ctx.externalAdReply) return true

    // 4. pushName mengandung kata kunci bot
    const lowerName = pushName.toLowerCase()
    if (/\bbot\b/.test(lowerName) && !/^~/.test(pushName)) return true

    const ltext = getText(m) as string

    // 5. FIX: Copyright khas bot — "© Morela", "© THE-DEVIL", "© NazBot"
    if (/©\s*\S+/.test(ltext)) return true

    // 6. FIX: Format kotak border khas bot WA (╭╌, ┃, ╰╌)
    if (/[╭╰┃]/.test(ltext) && /[╌─┄]/.test(ltext)) return true

    // 7. FIX: Format badge title khas bot — 「 TITLE 」
    if (/[「」]/.test(ltext)) return true

    // 8. FIX: Banyak baris prefix simbol seragam (>=4 baris pakai ┃ atau |)
    const lines = ltext.split('\n')
    const prefixedLines = lines.filter((l: string) => /^[┃|◉•▸►»]/.test(l.trim()))
    if (prefixedLines.length >= 4) return true

    // 9. Pola teks bot umum
    if (/hallo pengguna|silakan tekan tombol|permintaan anda sedang diproses/i.test(ltext)) return true
    if (/hello user|please wait|click the button|your request is being processed/i.test(ltext)) return true
    if (/level up|breakthrough|you have reached a new (level|stage)|exp gained/i.test(ltext)) return true
    if (/\+\d+[\.,]?\d*\s*(exp|xp|money|coin|gold|gems?)\b/i.test(ltext)) return true

    return false
}

export default {
    tags: ['group', 'anti', 'passive'],

    handler: async (m, { Morela, isOwn, isAdmin, botAdmin, fkontak }) => {

        if (!m.isGroup)  return
        if (!m.message)  return

        // Selalu skip pesan dari bot sendiri
        if (isOwn) return

        const from = m.chat

        const senderJid: string =
            (m.sender as string) ||
            (m.key?.participant as string) ||
            (m.key?.remoteJid as string) ||
            ''

        if (!senderJid) return

        const grp = getGroup(from)
        if (!grp) return

        const mtype = (m.mtype as string) || ''

        // ─── FIX UTAMA: antibot dicek SEBELUM guard isAdmin ──────────────
        // Bot lain bisa saja jadi admin grup — tetap harus diblock
        if (grp.antibot && isBotMessage(m)) {
            console.log(`[ANTI-BOT] Bot terdeteksi: ${senderJid} | mtype: ${mtype} | admin: ${isAdmin}`)
            return act(Morela, m, FEATURE_NAMES.antibot, senderJid, botAdmin, fkontak)
        }

        // Untuk fitur anti lainnya: skip kalau sender adalah admin
        if (isAdmin) return

        if (grp.antivideo && mtype === 'videoMessage') {
            return act(Morela, m, FEATURE_NAMES.antivideo, senderJid, botAdmin, fkontak)
        }

        if (grp.antifoto && mtype === 'imageMessage') {
            return act(Morela, m, FEATURE_NAMES.antifoto, senderJid, botAdmin, fkontak)
        }

        if (grp.antiaudio && mtype === 'audioMessage') {
            return act(Morela, m, FEATURE_NAMES.antiaudio, senderJid, botAdmin, fkontak)
        }

        if (grp.antidokumen && mtype === 'documentMessage') {
            return act(Morela, m, FEATURE_NAMES.antidokumen, senderJid, botAdmin, fkontak)
        }

        if (grp.antisticker && mtype === 'stickerMessage') {
            return act(Morela, m, FEATURE_NAMES.antisticker, senderJid, botAdmin, fkontak)
        }

        if (grp.antimention && mtype === 'groupStatusMentionMessage') {
            return act(Morela, m, FEATURE_NAMES.antimention, senderJid, botAdmin, fkontak)
        }
    }
}
