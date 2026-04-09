// @ts-nocheck
import { getGroup } from '../../Database/db.js'

export default {
  tags: ['admin', 'mute'],

  handler: async (m, { Morela, isOwn, isAdmin }) => {
    if (!m.message) return
    if (!m.isGroup)  return
    if (m.fromMe)    return
    if (isOwn || isAdmin) return

    const groupData = getGroup(m.chat)
    if (!groupData?.mute) return

    const senderRaw = m.key.participant || m.key.remoteJid

    try {
      await Morela.sendMessage(m.chat, {
        delete: {
          remoteJid:   m.chat,
          fromMe:      false,
          id:          m.key.id,
          participant: senderRaw
        }
      })
      console.log(`[MUTE] Deleted msg from ${senderRaw?.split('@')[0]} in ${m.chat.slice(0, 15)}...`)
    } catch (e) {
      console.error('[MUTE] Delete failed:', e.message)
    }
  }
}