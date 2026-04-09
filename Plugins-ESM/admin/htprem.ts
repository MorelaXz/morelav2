// @ts-nocheck



import { botName } from '../../Library/utils.js'

const handler = async (m: any, { Morela, reply, fkontak }: any) => {
    const from = m.chat

    
    const metadata     = await Morela.groupMetadata(from)
    const mentions     = metadata.participants.map((p: any) => p.id)

    
    const rawText  = (m.text || '').trim()
    const pipeIdx  = rawText.indexOf('|')
    const cmd      = pipeIdx !== -1 ? rawText.slice(0, pipeIdx).trim() : ''
    const text     = pipeIdx !== -1 ? rawText.slice(pipeIdx + 1).trim() : rawText

    
    if (!m.quoted && !text) {
        return reply(
            `╭╌╌⬡「 📢 *ʜɪᴅᴇᴛᴀɢ ᴘʀᴇᴍɪᴜᴍ* 」\n` +
            `┃\n` +
            `┃ ◦ Reply pesan lalu ketik *.htprem*\n` +
            `┃ ◦ Atau: *.htprem <pesan>*\n` +
            `┃ ◦ Custom tag: *.htprem tag | pesan*\n` +
            `┃\n` +
            `┃ ◦ Support: teks, gambar, video,\n` +
            `┃   sticker, audio, dokumen\n` +
            `┃\n` +
            `╰╌╌⬡\n\n꒰ © ${botName} ꒱`
        )
    }

    
    if (m.quoted) {
        const qMsg = m.quoted?.message || m.quoted || {}
        const type = Object.keys(qMsg)[0]

        
        if (type === 'imageMessage') {
            try {
                const media   = await m.quoted.download()
                const caption = qMsg.imageMessage?.caption || text || ''
                return await Morela.sendMessage(from, {
                    image: media,
                    caption,
                    mentions
                })
            } catch { return reply('❌ Gagal download gambar') }
        }

        
        if (type === 'videoMessage') {
            try {
                const media   = await m.quoted.download()
                const caption = qMsg.videoMessage?.caption || text || ''
                return await Morela.sendMessage(from, {
                    video: media,
                    caption,
                    mentions
                })
            } catch { return reply('❌ Gagal download video') }
        }

        
        if (type === 'stickerMessage') {
            try {
                const media = await m.quoted.download()
                await Morela.sendMessage(from, { sticker: media, mentions })
                if (text) await Morela.sendMessage(from, { text, mentions })
            } catch { return reply('❌ Gagal download sticker') }
            return
        }

        
        if (type === 'audioMessage') {
            try {
                const media    = await m.quoted.download()
                const audioMsg = qMsg.audioMessage || {}
                await Morela.sendMessage(from, {
                    audio:    media,
                    mimetype: audioMsg.mimetype || 'audio/mp4',
                    ptt:      audioMsg.ptt || false,
                    mentions
                })
                if (text) await Morela.sendMessage(from, { text, mentions })
            } catch { return reply('❌ Gagal download audio') }
            return
        }

        
        if (type === 'documentMessage') {
            try {
                const media  = await m.quoted.download()
                const docMsg = qMsg.documentMessage || {}
                await Morela.sendMessage(from, {
                    document: media,
                    mimetype: docMsg.mimetype || 'application/octet-stream',
                    fileName: docMsg.fileName || 'file',
                    mentions
                })
                if (text) await Morela.sendMessage(from, { text, mentions })
            } catch { return reply('❌ Gagal download dokumen') }
            return
        }

        
        const quotedText =
            m.quoted?.text ||
            qMsg.conversation ||
            qMsg.extendedTextMessage?.text || ''

        const finalText = text || quotedText
        if (!finalText) return reply('❌ *Pesan kosong!*')

        return await Morela.sendMessage(from, { text: finalText, mentions })
    }

    
    await Morela.sendMessage(from, {
        text: cmd ? `@${from} ${text}` : text,
        contextInfo: cmd ? {
            groupMentions: [{ groupJid: from, groupSubject: cmd }],
            mentionedJid: mentions
        } : undefined,
        mentions
    }, { quoted: fkontak || m })
}

handler.command  = ['htpremium', 'hidetagpremium', 'htprem']
handler.tags     = ['group']
handler.help     = ['htprem <pesan>', 'htprem tag | pesan']
handler.noLimit  = true
handler.owner    = false
handler.premium  = false
handler.group    = true
handler.private  = false
handler.admin    = true
handler.botAdmin = false

export default handler