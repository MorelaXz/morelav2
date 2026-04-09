


import fs      from 'fs'
import path    from 'path'
import os      from 'os'
import baileys from '@itsukichan/baileys'

const {
  generateWAMessageContent,
  generateWAMessageFromContent,
  proto
} = baileys


interface MorelaSock {
  waUploadToServer:    ((...args: unknown[]) => unknown)
  profilePictureUrl:   (jid: string, type: string) => Promise<string>
  relayMessage:        (jid: unknown, message: unknown, opts: unknown) => Promise<unknown>
  sendMessage:         (jid: string, content: unknown, opts?: unknown) => Promise<unknown>
  [key: string]:       unknown
}




export const CHANNEL_URL = 'https://whatsapp.com/channel/0029VbC6GY50VycJQ7nFgo3v'
export const OWNER_WA    = 'https://wa.me/628xxxxxxxxxx'
export const BOT_JID     = '13135550002@s.whatsapp.net'
export const imagePath    = path.join(process.cwd(), 'media/menu.jpg')
export const fkontakPath  = path.join(process.cwd(), 'media/fkontak.jpg')
export const botName     = global.botName    || 'Morela'
export const botVersion  = global.botVersion || 'v2.0.0'
export const ownerName   = global.ownerName  || 'putraa'




export function bi(text: string): string {
  const map: Record<string, string> = {
    'A':'𝑨','B':'𝑩','C':'𝑪','D':'𝑫','E':'𝑬','F':'𝑭','G':'𝑮','H':'𝑯','I':'𝑰','J':'𝑱',
    'K':'𝑲','L':'𝑳','M':'𝑴','N':'𝑵','O':'𝑶','P':'𝑷','Q':'𝑸','R':'𝑹','S':'𝑺','T':'𝑻',
    'U':'𝑼','V':'𝑽','W':'𝑾','X':'𝑿','Y':'𝒀','Z':'𝒁',
    'a':'𝒂','b':'𝒃','c':'𝒄','d':'𝒅','e':'𝒆','f':'𝒇','g':'𝒈','h':'𝒉','i':'𝒊','j':'𝒋',
    'k':'𝒌','l':'𝒍','m':'𝒎','n':'𝒏','o':'𝒐','p':'𝒑','q':'𝒒','r':'𝒓','s':'𝒔','t':'𝒕',
    'u':'𝒖','v':'𝒗','w':'𝒘','x':'𝒙','y':'𝒚','z':'𝒛',
    '0':'𝟎','1':'𝟏','2':'𝟐','3':'𝟑','4':'𝟒','5':'𝟓','6':'𝟔','7':'𝟕','8':'𝟖','9':'𝟗'
  }
  return String(text).split('').map(c => map[c] ?? c).join('')
}




export async function uploadImage(Morela: MorelaSock, buffer: unknown) {
  const { imageMessage } = await generateWAMessageContent(
    { image: buffer as Buffer },
    { upload: Morela.waUploadToServer as Parameters<typeof generateWAMessageContent>[1]['upload'] }
  )
  return imageMessage
}




export async function buildFkontak(Morela: MorelaSock) {
  const BOT_NUMBER = BOT_JID.split('@')[0]
  let Mekik: Buffer

  try {
    const pp  = await Morela.profilePictureUrl(BOT_JID, 'image')
    const res = await fetch(pp)
    Mekik = Buffer.from(await res.arrayBuffer())
  } catch {
    const fbPath = path.join(process.cwd(), 'media', 'fkontak.jpg')
    Mekik = fs.existsSync(fbPath)
      ? fs.readFileSync(fbPath)
      : fs.existsSync(imagePath)
        ? fs.readFileSync(imagePath)
        : Buffer.alloc(0)
  }

  return {
    key: {
      participant: '0@s.whatsapp.net',
      fromMe:      false,
      id:          'StatusBiz',
      remoteJid:   'status@broadcast'
    },
    message: {
      contactMessage: {
        displayName:   bi(botName),
        vcard:
`BEGIN:VCARD
VERSION:3.0
N:${bi(botName + ' Multidevice')}
FN:${bi(botName + ' Multidevice')}
ORG:${botName};
TEL;type=CELL;type=VOICE;waid=${BOT_NUMBER}:${BOT_NUMBER}
END:VCARD`,
        jpegThumbnail: Mekik
      }
    }
  }
}




export async function sendCard(Morela: MorelaSock, jid: unknown, footerText: unknown, imgBuf: unknown, quoted: unknown) {
  const imageMessage = await uploadImage(Morela, imgBuf)

  
  const InteractiveMessage = proto.Message.InteractiveMessage as unknown as {
    fromObject: (obj: Record<string, unknown>) => unknown
    Body:       { fromObject: (obj: Record<string, unknown>) => unknown }
    Footer:     { fromObject: (obj: Record<string, unknown>) => unknown }
    Header:     { fromObject: (obj: Record<string, unknown>) => unknown }
    NativeFlowMessage: { fromObject: (obj: Record<string, unknown>) => unknown }
  }

  const msg = generateWAMessageFromContent(
    jid as string,
    {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata:        {},
            deviceListMetadataVersion: 2
          },
          interactiveMessage: InteractiveMessage.fromObject({
            body:   InteractiveMessage.Body.fromObject({ text: ' ' }),
            footer: InteractiveMessage.Footer.fromObject({ text: footerText }),
            header: InteractiveMessage.Header.fromObject({
              title:              `🔰 ${bi('Information')} ${bi(botName)} ${bi('Bot')} 💤`,
              hasMediaAttachment: true,
              imageMessage
            }),
            nativeFlowMessage: InteractiveMessage.NativeFlowMessage.fromObject({
              buttons: [
                {
                  name: 'cta_url',
                  buttonParamsJson: JSON.stringify({
                    display_text: 'Chat Owner',
                    url:          OWNER_WA,
                    merchant_url: OWNER_WA
                  })
                }
              ],
              messageParamsJson: JSON.stringify({
                limited_time_offer: {
                  text:      bi(`${botName} ${botVersion}`),
                  url:       CHANNEL_URL,
                  copy_code: bi('Rp 9999999999999999999')
                },
                bottom_sheet: {
                  in_thread_buttons_limit: 999,
                  divider_indices:         [1, 999],
                  list_title:              botName,
                  button_title:            `${botName} Bot`
                },
                tap_target_configuration: {
                  title:         botName,
                  description:   botVersion,
                  canonical_url: CHANNEL_URL,
                  domain:        'whatsapp.com',
                  button_index:  0
                }
              })
            })
          })
        }
      }
    },
    { quoted }
  )

  
  if (!jid || typeof jid !== 'string' || jid.length < 5) {
    console.warn('[sendCard] JID tidak valid, pesan dibatalkan:', jid)
    return
  }
  await Morela.relayMessage(jid, msg.message, { messageId: msg.key.id })
}




export function createSend(Morela: MorelaSock, m: { chat: string }, menuBuf: unknown, fkontak: unknown) {
  return (text: string) => sendCard(
    Morela,
    m.chat,
    `${text}\n\n© ${botName}`,
    menuBuf,
    fkontak
  )
}




export const menuBuf = fs.existsSync(imagePath)
  ? fs.readFileSync(imagePath)
  : null




export function getGreeting(): string {
  const h    = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false })
  const hour = parseInt(h)
  if (hour < 5)  return '🌙 Selamat Malam'
  if (hour < 11) return '🌅 Selamat Pagi'
  if (hour < 15) return '☀️ Selamat Siang'
  if (hour < 18) return '🌤️ Selamat Sore'
  return '🌙 Selamat Malam'
}

export const getGreeting_v3 = getGreeting

export const CHANNEL_JID = '120363420704282055@newsletter'




export async function atomicWriteJSON(filePath: string, data: unknown, indent: number = 2): Promise<void> {
  const dir = path.dirname(filePath)
  await fs.promises.mkdir(dir, { recursive: true })
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, indent), 'utf-8')
}

export function atomicWriteJSONSync(filePath: string, data: unknown, indent: number = 2): void {
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(data, null, indent), 'utf-8')
}




export function buildCtx() {
  return {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid:   CHANNEL_JID,
      serverMessageId: 1,
      newsletterName:  'Kunjungi saluran resmi kami ✨'
    },
    externalAdReply: {
      body:                  `${botName} Multidevice 🔥`,
      mediaType:             1,
      thumbnail:             (() => {
        const p = path.join(process.cwd(), 'media', 'fkontak.jpg')
        return fs.existsSync(p) ? fs.readFileSync(p) : fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : undefined
      })(),
      renderLargerThumbnail: false,
      showAdAttribution:     false,
      sourceUrl:             CHANNEL_URL
    }
  }
}
