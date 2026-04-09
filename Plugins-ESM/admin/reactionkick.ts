// @ts-nocheck




export default {
    
    tags: ['group'],
    help: ['React 👍 ke pesan untuk kick member (admin only)'],

    handler: async (m, { Morela, fkontak }) => {
        try {
            
            if (!m.message?.reactionMessage) return

            const from = m.chat

            if (!from || !from.endsWith('@g.us')) return

            const reaction = m.message.reactionMessage.text
            if (reaction !== '👍') return

            console.log('[REACTION KICK] 👍 detected')

            let meta
            try {
                meta = await Morela.groupMetadata(from)
            } catch (e) {
                console.error('[REACTION KICK] Get metadata failed:', (e as Error).message)
                
                return
            }

            const senderRaw = m.key.participant || m.key.remoteJid
            const senderIsLid = senderRaw.endsWith('@lid')

            let senderParticipant = null

            if (senderIsLid) {
                const senderLid = senderRaw.split('@')[0]
                senderParticipant = meta.participants.find((p: unknown) => {
                    if (p.lid) {
                        return p.lid.split('@')[0] === senderLid
                    }
                    return false
                })
            }

            if (!senderParticipant) {
                const senderNum = senderRaw.split('@')[0].split(':')[0]
                senderParticipant = meta.participants.find((p: unknown) => {
                    const pNum = p.id.split('@')[0].split(':')[0]
                    return pNum === senderNum
                })
            }

            if (!senderParticipant || !senderParticipant.admin) {
                console.log('[REACTION KICK] Bukan admin, skip')
                return
            }

            console.log('[REACTION KICK] Admin confirmed')

            const reactedKey = m.message.reactionMessage.key
            const targetRaw = reactedKey?.participant || reactedKey?.remoteJid

            if (!targetRaw) {
                console.log('[REACTION KICK] Target not found')
                return
            }

            console.log('[REACTION KICK] Target:', targetRaw)

            const targetIsLid = targetRaw.endsWith('@lid')
            let targetParticipant = null

            if (targetIsLid) {
                const targetLid = targetRaw.split('@')[0]
                targetParticipant = meta.participants.find((p: unknown) => {
                    if (p.lid) {
                        return p.lid.split('@')[0] === targetLid
                    }
                    return false
                })
            }

            if (!targetParticipant) {
                const targetNum = targetRaw.split('@')[0].split(':')[0]
                targetParticipant = meta.participants.find((p: unknown) => {
                    const pNum = p.id.split('@')[0].split(':')[0]
                    return pNum === targetNum
                })
            }

            if (!targetParticipant) {
                console.log('[REACTION KICK] Target not in group')
                
                return
            }

            if (targetParticipant.admin) {
                console.log('[REACTION KICK] Target is admin, skip')
                
                return
            }

            console.log('[REACTION KICK] Kicking:', targetParticipant.id)

            try {
                await Morela.groupParticipantsUpdate(
                    from,
                    [targetParticipant.id],
                    'remove'
                )

                console.log('[REACTION KICK] Success! (silent)')


            } catch (e) {
                console.error('[REACTION KICK] Kick failed:', (e as Error).message)
                
            }

        } catch (error) {
            console.error('[REACTION KICK] Unexpected error:', (error as Error).message)
            
        }
    }
}