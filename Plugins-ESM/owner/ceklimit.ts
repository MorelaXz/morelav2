// @ts-nocheck
import { getUsage, resetLimit, getAllUsage, clearAllLimits } from '../../Database/usagelimit.js'
import { getPhoneByLid } from '../../Database/db.js'
import fs from 'fs'
import { buildFkontak, imagePath, CHANNEL_URL, botName } from '../../Library/utils.js'

const DAILY_LIMIT = 15

const handler = async (m: any, { Morela, args, command, isOwn, isAdmin, senderJid: senderJidParam, fkontak }: any) => {

    const send = (text) =>
        Morela.sendMessage(m.chat, {
            text
        }, { quoted: fkontak || m })

    function resolveJid(raw: string | null | undefined) {
        if (!raw) return null
        if (raw.endsWith('@lid')) {
            const lid = raw.split('@')[0]
            try {
                const phone = getPhoneByLid(lid)
                if (phone) return phone + '@s.whatsapp.net'
            } catch {}
        }
        const num = raw.replace(/@.*/, '').replace(/[^0-9]/g, '')
        return num ? num + '@s.whatsapp.net' : null
    }

    function resolveTarget(argIndex: unknown = 0) {
        if (args[argIndex]) return resolveJid(args[argIndex])
        if (m.mentionedJid?.[0]) return resolveJid(m.mentionedJid[0])
        if (m.quoted) return resolveJid(m.quoted.sender || m.quoted.key?.participant || m.quoted.key?.remoteJid)
        return null
    }

    const isPrivileged = isOwn || isAdmin

    if (command === 'resetlimitall') {
        if (!isOwn) return send(
            `╭╌╌⬡「 🔒 *ᴀᴋsᴇs ᴅɪᴛᴏʟᴀᴋ* 」\n` +
            `┃\n` +
            `┃ ❌ Fitur ini hanya untuk Owner!\n` +
            `┃\n` +
            `╰╌╌⬡\n\n© ${botName}`
        )

        const allData = getAllUsage()
        const total   = Object.keys(allData).length

        if (!total) return send(
            `╭╌╌⬡「 🔄 *ʀᴇsᴇᴛ sᴇᴍᴜᴀ ʟɪᴍɪᴛ* 」\n` +
            `┃\n` +
            `┃ 📭 Tidak ada data limit untuk direset.\n` +
            `┃\n` +
            `╰╌╌⬡\n\n© ${botName}`
        )

        clearAllLimits()

        return send(
            `╭╌╌⬡「 ✅ *ʀᴇsᴇᴛ sᴇᴍᴜᴀ ʟɪᴍɪᴛ* 」\n` +
            `┃\n` +
            `┃ ◦ 👥 Total user : *${total} user*\n` +
            `┃ ◦ 🔄 Status     : *Semua limit direset*\n` +
            `┃ ◦ ✨ Limit baru : *${DAILY_LIMIT}x / user*\n` +
            `┃\n` +
            `╰╌╌⬡\n\n© ${botName}`
        )
    }

    if (command === 'resetlimit') {
        if (!isOwn) return send(
            `╭╌╌⬡「 🔒 *ᴀᴋsᴇs ᴅɪᴛᴏʟᴀᴋ* 」\n` +
            `┃\n` +
            `┃ ❌ Fitur ini hanya untuk Owner/Admin!\n` +
            `┃\n` +
            `╰╌╌⬡\n\n© ${botName}`
        )
        const targetJid = resolveTarget(0)
        if (!targetJid) return send(
            `╭╌╌⬡「 🔄 *ʀᴇsᴇᴛ ʟɪᴍɪᴛ* 」\n` +
            `┃\n` +
            `┃ ❌ Sebutkan target!\n` +
            `┃\n` +
            `┃ 📌 *Cara:*\n` +
            `┃ ◦ Reply pesan + \`.resetlimit\`\n` +
            `┃ ◦ \`.resetlimit\` @mention\n` +
            `┃ ◦ \`.resetlimit\` 628xxx\n` +
            `┃\n` +
            `╰╌╌⬡\n\n© ${botName}`
        )
        const num      = targetJid.split('@')[0]
        const berhasil = resetLimit(targetJid)
        return send(
            berhasil
                ? `╭╌╌⬡「 ✅ *ʟɪᴍɪᴛ ᴅɪ-ʀᴇsᴇᴛ* 」\n` +
                  `┃\n` +
                  `┃ ◦ 📱 Nomor : *+${num}*\n` +
                  `┃ ◦ 🔄 Limit : *Kembali ke ${DAILY_LIMIT}x*\n` +
                  `┃\n` +
                  `╰╌╌⬡\n\n© ${botName}`
                : `╭╌╌⬡「 ❌ *ɢᴀɢᴀʟ ʀᴇsᴇᴛ* 」\n` +
                  `┃\n` +
                  `┃ ◦ 📱 Nomor : *+${num}*\n` +
                  `┃ ⚠️ User tidak ditemukan di data limit.\n` +
                  `┃\n` +
                  `╰╌╌⬡\n\n© ${botName}`
        )
    }

    if (args[0] === 'reset') {
        if (!isOwn) return send(
            `╭╌╌⬡「 🔒 *ᴀᴋsᴇs ᴅɪᴛᴏʟᴀᴋ* 」\n` +
            `┃\n` +
            `┃ ❌ Fitur ini hanya untuk Owner/Admin!\n` +
            `┃\n` +
            `╰╌╌⬡\n\n© ${botName}`
        )
        const targetJid = resolveTarget(1)
        if (!targetJid) return send(
            `╭╌╌⬡「 🔄 *ʀᴇsᴇᴛ ʟɪᴍɪᴛ* 」\n` +
            `┃\n` +
            `┃ ❌ Sebutkan target!\n` +
            `┃\n` +
            `┃ 📌 *Cara:*\n` +
            `┃ ◦ Reply pesan + \`.ceklimit reset\`\n` +
            `┃ ◦ \`.ceklimit reset\` @mention\n` +
            `┃ ◦ \`.ceklimit reset\` 628xxx\n` +
            `┃\n` +
            `╰╌╌⬡\n\n© ${botName}`
        )
        const num      = targetJid.split('@')[0]
        const berhasil = resetLimit(targetJid)
        return send(
            berhasil
                ? `╭╌╌⬡「 ✅ *ʟɪᴍɪᴛ ᴅɪ-ʀᴇsᴇᴛ* 」\n` +
                  `┃\n` +
                  `┃ ◦ 📱 Nomor : *+${num}*\n` +
                  `┃ ◦ 🔄 Limit : *Kembali ke ${DAILY_LIMIT}x*\n` +
                  `┃\n` +
                  `╰╌╌⬡\n\n© ${botName}`
                : `╭╌╌⬡「 ❌ *ɢᴀɢᴀʟ ʀᴇsᴇᴛ* 」\n` +
                  `┃\n` +
                  `┃ ◦ 📱 Nomor : *+${num}*\n` +
                  `┃ ⚠️ User tidak ditemukan di data limit.\n` +
                  `┃\n` +
                  `╰╌╌⬡\n\n© ${botName}`
        )
    }

    if (command === 'listlimit' || args[0] === 'list') {
        if (!isOwn) return send(
            `╭╌╌⬡「 🔒 *ᴀᴋsᴇs ᴅɪᴛᴏʟᴀᴋ* 」\n` +
            `┃\n` +
            `┃ ❌ Fitur ini hanya untuk Owner/Admin!\n` +
            `┃\n` +
            `╰╌╌⬡\n\n© ${botName}`
        )

        const allData = getAllUsage()
        const entries = Object.entries(allData)

        if (!entries.length) return send(
            `╭╌╌⬡「 📋 *ʟɪsᴛ ʟɪᴍɪᴛ* 」\n` +
            `┃\n` +
            `┃ 📭 Belum ada data limit user.\n` +
            `┃\n` +
            `╰╌╌⬡\n\n© ${botName}`
        )

        const now = Date.now()

        const habis  = []
        const aktif  = []

        for (const [jid, data] of entries) {
            const count      = data.count || 0
            const limitHitAt = data.limitHitAt || null
            const num        = jid.replace('@s.whatsapp.net', '')
            const sudahReset = limitHitAt && (now - limitHitAt) >= 24 * 60 * 60 * 1000

            if (limitHitAt && !sudahReset) {
                
                const sisaMs  = (limitHitAt + 24 * 60 * 60 * 1000) - now
                const sisaJam = Math.floor(sisaMs / (60 * 60 * 1000))
                const sisaMnt = Math.floor((sisaMs % (60 * 60 * 1000)) / (60 * 1000))
                habis.push({ num, count, sisaJam, sisaMnt })
            } else if (count > 0) {
                
                aktif.push({ num, count, sisa: DAILY_LIMIT - count })
            }
        }

        habis.sort((a, b) => b.count - a.count)
        aktif.sort((a, b) => b.count - a.count)

        let lines = `╭╌╌⬡「 📋 *ʟɪsᴛ ʟɪᴍɪᴛ ᴜsᴇʀ* 」\n┃\n`
        lines += `┃ 📊 Total data : *${entries.length} user*\n`
        lines += `┃ 🔴 Kena limit : *${habis.length} user*\n`
        lines += `┃ 🟡 Aktif pakai: *${aktif.length} user*\n`
        lines += `┃\n`

        if (habis.length) {
            lines += `┃ 🔴 *HABIS LIMIT:*\n`
            for (const u of habis) {
                lines += `┃ ◦ +${u.num} → ${u.count}/${DAILY_LIMIT}x ⏰ ${u.sisaJam}j${u.sisaMnt}m\n`
            }
            lines += `┃\n`
        }

        if (aktif.length) {
            lines += `┃ 🟡 *MASIH ADA SISA:*\n`
            
            const tampil = aktif.slice(0, 20)
            for (const u of tampil) {
                lines += `┃ ◦ +${u.num} → ${u.count}/${DAILY_LIMIT}x (sisa ${u.sisa}x)\n`
            }
            if (aktif.length > 20) lines += `┃ ◦ ... +${aktif.length - 20} user lainnya\n`
            lines += `┃\n`
        }

        lines += `┃ 💡 Reset: \`.resetlimit\` @mention\n`
        lines += `╰╌╌⬡\n\n© ${botName}`

        return send(lines)
    }

    let resolvedJid = senderJidParam || m.sender || m.key.participant || m.key.remoteJid
    if (isPrivileged) {
        if (m.mentionedJid?.[0]) {
            resolvedJid = resolveJid(m.mentionedJid[0]) || resolvedJid
        } else if (m.quoted) {
            resolvedJid = resolveJid(m.quoted.sender || m.quoted.key?.participant || m.quoted.key?.remoteJid) || resolvedJid
        }
    }

    const usage = getUsage(resolvedJid)
    const num   = resolvedJid.split('@')[0]

    const sudahHabis = usage.count >= DAILY_LIMIT && usage.limitHitAt
    let resetInfo    = ''
    if (sudahHabis) {
        const sisaMs  = (usage.limitHitAt + 24 * 60 * 60 * 1000) - Date.now()
        const sisaJam = Math.floor(sisaMs / (60 * 60 * 1000))
        const sisaMnt = Math.floor((sisaMs % (60 * 60 * 1000)) / (60 * 1000))
        resetInfo = `┃ ◦ ⏰ Reset  : *${sisaJam}j ${sisaMnt}m lagi*\n`
    }

    const filled = Math.min(usage.count, DAILY_LIMIT)
    const bar    = '█'.repeat(filled) + '░'.repeat(DAILY_LIMIT - filled)

    return send(
        `╭╌╌⬡「 📊 *ᴄᴇᴋ ʟɪᴍɪᴛ ʜᴀʀɪᴀɴ* 」\n` +
        `┃\n` +
        `┃ ◦ 📱 Nomor  : *+${num}*\n` +
        (isPrivileged && resolvedJid !== (senderJidParam || m.sender)
            ? `┃ ◦ 👮 Dicek  : *${isOwn ? 'Owner' : 'Admin'}*\n`
            : '') +
        `┃\n` +
        `┃ ◦ 📈 Pakai  : *${usage.count} / ${DAILY_LIMIT}x*\n` +
        `┃ ◦ ✨ Sisa   : *${usage.sisa}x*\n` +
        `┃ ◦ 🔵 Status : ${sudahHabis ? '🔴 *Habis*' : '🟢 *Masih ada*'}\n` +
        resetInfo +
        `┃\n` +
        `┃ \`[${bar}]\`\n` +
        `┃\n` +
        `╰╌╌⬡\n\n© ${botName}`
    )
}

handler.command = ['ceklimit', 'limit', 'mylimit', 'resetlimit', 'listlimit', 'resetlimitall']
handler.noLimit = true
handler.tags    = ['info']
handler.help    = ['ceklimit', 'ceklimit reset <nomor/reply/mention>', 'resetlimit', 'listlimit', 'ceklimit list', 'resetlimitall']

export default handler