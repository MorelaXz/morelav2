// @ts-nocheck
import { getGroup } from '../../Database/db.js'

const LINK_REGEX =
  /(https?:\/\/[^\s]+|www\.[^\s]+|chat\.whatsapp\.com\/[^\s]+|wa\.me\/\d+|instagram\.com\/[^\s]+|t\.me\/[^\s]+|discord\.(gg|com)\/[^\s]+)/i

function extractAllText(m: Record<string, unknown>) {
  const texts = []

  if (m.message?.conversation)                                               texts.push(m.message.conversation)
  if (m.message?.extendedTextMessage?.text)                                  texts.push(m.message.extendedTextMessage.text)
  if (m.message?.imageMessage?.caption)                                      texts.push(m.message.imageMessage.caption)
  if (m.message?.videoMessage?.caption)                                      texts.push(m.message.videoMessage.caption)
  if (m.message?.ephemeralMessage?.message?.extendedTextMessage?.text)       texts.push(m.message.ephemeralMessage.message.extendedTextMessage.text)
  if (m.message?.viewOnceMessageV2?.message?.imageMessage?.caption)          texts.push(m.message.viewOnceMessageV2.message.imageMessage.caption)
  if (m.message?.buttonsMessage?.contentText)                                texts.push(m.message.buttonsMessage.contentText)
  if (m.message?.templateMessage?.hydratedTemplate?.hydratedContentText)    texts.push(m.message.templateMessage.hydratedTemplate.hydratedContentText)
  if (m.message?.listMessage?.description)                                   texts.push(m.message.listMessage.description)

  return texts.join(' ')
}

function hasProhibitedContent(m: Record<string, unknown>) {
  const text = extractAllText(m)
  if (text && LINK_REGEX.test(text)) {
    console.log('[ANTILINK] Detected text link:', text.match(LINK_REGEX)?.[0])
    return true
  }

  const extCtx = m.message?.extendedTextMessage?.contextInfo
  if (extCtx) {
    if (extCtx.inviteLinkGroupTypeV2 || extCtx.inviteLinkGroupType) {
      console.log('[ANTILINK] Detected channel invitation link')
      return true
    }
    const adUrl = extCtx.externalAdReply?.sourceUrl
    if (adUrl && (adUrl.includes('chat.whatsapp.com') || adUrl.includes('wa.me') || adUrl.includes('whatsapp.com/channel'))) {
      console.log('[ANTILINK] Detected embedded WA link card:', adUrl)
      return true
    }
  }

  if (m.message?.viewOnceMessageV2?.message?.extendedTextMessage?.contextInfo?.inviteLinkGroupTypeV2) {
    console.log('[ANTILINK] Detected channel link in viewOnce')
    return true
  }

  const mediaMsg = m.message?.imageMessage || m.message?.videoMessage
  if (mediaMsg?.contextInfo) {
    const ctx = mediaMsg.contextInfo
    if (ctx.inviteLinkGroupTypeV2 || ctx.inviteLinkGroupType) {
      console.log('[ANTILINK] Detected channel link in media message')
      return true
    }
    const mediaUrl = ctx.externalAdReply?.sourceUrl
    if (mediaUrl && (mediaUrl.includes('chat.whatsapp.com') || mediaUrl.includes('wa.me') || mediaUrl.includes('whatsapp.com/channel'))) {
      console.log('[ANTILINK] Detected embedded link in media:', mediaUrl)
      return true
    }
  }

  return false
}

export default {
  tags: ['group', 'antilink'],
  handler: async (m, { Morela, isOwn, isAdmin, fkontak }) => {
    if (!m.message) return
    if (!m.isGroup)  return
    if (m.fromMe)    return

    const from      = m.chat
    const groupData = getGroup(from)
    if (!groupData?.antilink) return

    const text = extractAllText(m)
    if (text && /^[.!,/]/.test(text.trim())) return

    if (isOwn || isAdmin) return

    if (!hasProhibitedContent(m)) return

    const senderRaw = m.key.participant || m.key.remoteJid

    try {
      await Morela.sendMessage(from, {
        delete: {
          remoteJid:   from,
          fromMe:      false,
          id:          m.key.id,
          participant: senderRaw
        }
      })
      console.log(`[ANTILINK] ✅ Deleted link from ${senderRaw.split('@')[0]} in ${from.slice(0, 15)}...`)
    } catch (e) {
      console.error('[ANTILINK] ❌ Delete failed:', (e as Error).message)
    }
  }
}