// @ts-nocheck
import { botName } from '../../Library/utils.js'


const TS_KEYWORDS = new Set([
  'admin', 'description', 'owner', 'member', 'id', 'name', 'true', 'false', 'null'
])

function tokenizeCode(code: string): { highlightType: number; codeContent: string }[] {
  const blocks: { highlightType: number; codeContent: string }[] = []
  const tokens = code.match(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|https?:\/\/[^\s]+|[a-zA-Z_$][a-zA-Z0-9_$]*|[\s\S]/g) || []

  for (const tok of tokens) {
    if (tok.startsWith('//') || tok.startsWith('/*')) {
      blocks.push({ highlightType: 2, codeContent: tok }) 
    } else if (/^["'`]/.test(tok)) {
      blocks.push({ highlightType: 3, codeContent: tok }) 
    } else if (tok.startsWith('http')) {
      blocks.push({ highlightType: 3, codeContent: tok }) 
    } else if (TS_KEYWORDS.has(tok.toLowerCase())) {
      blocks.push({ highlightType: 1, codeContent: tok }) 
    } else if (/^\d+$/.test(tok) || tok.includes('@s.whatsapp.net')) {
      blocks.push({ highlightType: 4, codeContent: tok }) 
    } else {
      blocks.push({ highlightType: 0, codeContent: tok }) 
    }
  }

  const merged: { highlightType: number; codeContent: string }[] = []
  for (const b of blocks) {
    if (merged.length && merged[merged.length - 1].highlightType === b.highlightType) {
      merged[merged.length - 1].codeContent += b.codeContent
    } else {
      merged.push({ ...b })
    }
  }
  return merged
}


const handler = async (m: any, { Morela, text, usedPrefix, command, reply, fkontak }: any) => {
  
  let query = text ? text.trim() : ""
  
  if (!query) {
    if (m.isGroup) {
      query = m.chat
    } else {
      return reply(
        `🔍 *ɪɴsᴘᴇᴄᴛ*\n\n` +
        `> Cek info grup atau saluran via link/ID\n\n` +
        `*ᴄᴏɴᴛᴏʜ:*\n` +
        `> \`${usedPrefix}${command} https://chat.whatsapp.com/xxx\`\n` +
        `> \`${usedPrefix}${command} https://whatsapp.com/channel/xxx\`\n` +
        `> \`${usedPrefix}${command} 120363xxx@g.us\`\n` +
        `> \`${usedPrefix}${command} 120363xxx@newsletter\``
      )
    }
  }

  const grupPattern    = /chat\.whatsapp\.com\/([\w\d]*)/
  const saluranPattern = /whatsapp\.com\/channel\/([\w\d]*)/

  await Morela.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })

  try {
    if (query.endsWith('@g.us')) {
      const groupInfo = await Morela.groupMetadata(query)
      await sendGroupInfo(Morela, m, fkontak, groupInfo)

    } else if (query.endsWith('@newsletter')) {
      const channelInfo = await Morela.newsletterMetadata('jid', query)
      await sendChannelInfo(Morela, m, fkontak, channelInfo)

    } else if (grupPattern.test(query)) {
      const inviteCode = query.match(grupPattern)[1]
      let groupInfo  = await Morela.groupGetInviteInfo(inviteCode)
      
      try {
        const fullMeta = await Morela.groupMetadata(groupInfo.id)
        groupInfo = fullMeta
      } catch {
        
      }

      await sendGroupInfo(Morela, m, fkontak, groupInfo)

    } else if (saluranPattern.test(query)) {
      const inviteCode  = query.match(saluranPattern)[1]
      const channelInfo = await Morela.newsletterMetadata('invite', inviteCode)
      await sendChannelInfo(Morela, m, fkontak, channelInfo)

    } else {
      await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return reply('❌ Format tidak valid!\n\nGunakan link grup, link saluran, JID @g.us, atau @newsletter')
    }

  } catch (error) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    if (error.data === 400 || error.data === 406) return reply('❌ Grup/Saluran tidak ditemukan!')
    if (error.data === 401) return reply('❌ Bot di-kick dari grup tersebut!')
    if (error.data === 410) return reply('❌ URL grup telah di-reset!')
    return reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${(error as Error).message}`)
  }
}


async function sendGroupInfo(Morela: Record<string, unknown>, m: Record<string, unknown>, fkontak: unknown, groupInfo: any) {
  
  const { getPhoneByLid } = await import('../../Database/db.js')

  
  const resolveToPhone = (jid: string) => {
    if (!jid) return null
    let num = jid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
    if (jid.endsWith('@lid')) {
      const resolved = getPhoneByLid(num)
      if (resolved) num = resolved.replace(/[^0-9]/g, '')
    }
    return num
  }

  const memberCount = groupInfo.participants?.length || groupInfo.size || 0
  const rawOwnerId = groupInfo.owner || groupInfo.creator || null
  const resolvedOwner = resolveToPhone(rawOwnerId)

  let adminListText = ""
  let adminCount = 0

  if (groupInfo.participants) {
    const admins = groupInfo.participants.filter((p: any) => p.admin)
    adminCount = admins.length

    
    const resolvedAdmins = admins.map((a: any) => {
      const cleanNum = resolveToPhone(a.id)
      return `admin: +${cleanNum}`
    })

    adminListText = resolvedAdmins.length > 0 
      ? resolvedAdmins.join('\n') 
      : 'admin: tidak ada'
  } else {
    adminCount = resolvedOwner ? 1 : 0
    adminListText = resolvedOwner 
      ? `admin: +${resolvedOwner}\n\n// Info: Bot belum join grup ini. Bot cuma bisa lihat sang pembuat grup.`
      : `// Info: Tidak ada data admin karena bot belum join grup ini.`
  }

  const descText = `description:\n\n${groupInfo.desc || 'Tidak ada deskripsi'}`

  const content = {
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          submessages: [
            
            {
              messageType: 2,
              messageText: `📋 *ɪɴꜰᴏʀᴍᴀᴛɪᴏɴ ɢʀᴏᴜᴘ* — ${botName}`
            },
            
            {
              messageType: 4,
              tableMetadata: {
                title: "Detail Grup",
                rows: [
                  { items: ["Field", "Value"], isHeading: true },
                  { items: ["Group Name", groupInfo.subject || "-"] },
                  { items: ["Members", String(memberCount)] },
                  { items: ["Admins", String(adminCount)] },
                  { items: ["Owner", resolvedOwner ? `+${resolvedOwner}` : "-"] },
                  { items: ["Restrict", groupInfo.restrict ? "Yes" : "No"] },
                  { items: ["Announce", groupInfo.announce ? "Yes" : "No"] },
                  { items: ["Created", new Date((groupInfo.creation || 0) * 1000).toLocaleDateString('id-ID')] }
                ]
              }
            },
            
            {
              messageType: 5,
              codeMetadata: {
                codeLanguage: "Text",
                codeBlocks: tokenizeCode(descText)
              }
            },
            
            {
              messageType: 5,
              codeMetadata: {
                codeLanguage: "Text",
                codeBlocks: tokenizeCode(adminListText)
              }
            }
          ],
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
            forwardOrigin: 4,
          }
        }
      }
    }
  }

  await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  return Morela.relayMessage(m.chat, content, { messageId: m.key.id })
}


async function sendChannelInfo(Morela: Record<string, unknown>, m: Record<string, unknown>, fkontak: unknown, channelInfo: any) {
  const descText = `description:\n\n${channelInfo.description || 'Tidak ada deskripsi'}`

  const content = {
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          submessages: [
            
            {
              messageType: 2,
              messageText: `📺 *ɪɴꜰᴏʀᴍᴀᴛɪᴏɴ ᴄʜᴀɴɴᴇʟ* — ${botName}`
            },
            
            {
              messageType: 4,
              tableMetadata: {
                title: "Detail Saluran",
                rows: [
                  { items: ["Field", "Value"], isHeading: true },
                  { items: ["Name", channelInfo.name || "-"] },
                  { items: ["Subscribers", String(channelInfo.subscriberCount || 0)] },
                  { items: ["Status", channelInfo.state || "-"] },
                  { items: ["Verified", channelInfo.verification || "-"] },
                  { items: ["ID", channelInfo.id ? channelInfo.id.split('@')[0] : "-"] }
                ]
              }
            },
            
            {
              messageType: 5,
              codeMetadata: {
                codeLanguage: "Text",
                codeBlocks: tokenizeCode(descText)
              }
            }
          ],
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
            forwardOrigin: 4,
          }
        }
      }
    }
  }

  await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  return Morela.relayMessage(m.chat, content, { messageId: m.key.id })
}

handler.command = ['inspect', 'cekgrup', 'ceksaluran', 'groupinfo', 'channelinfo']
handler.help    = ['inspect <link/id grup/saluran>']
handler.tags    = ['tools']
handler.noLimit = true

export default handler