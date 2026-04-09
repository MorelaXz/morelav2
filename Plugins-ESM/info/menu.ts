import fs    from 'fs'
import axios from 'axios'
import os    from 'os'
import path  from 'path'
import { fileURLToPath } from 'url'
import { runtime } from '../../System/message.js'
import baileys from '@itsukichan/baileys'
import { isSelfMode } from '../../System/selfmode.js'

const {
  generateWAMessageContent,
  generateWAMessageFromContent,
  proto
} = baileys

const __filename = fileURLToPath(import.meta.url as string)
const __dirname  = path.dirname(__filename)

const imagePath        = path.join(process.cwd(), 'media/menu.jpg')
const MENU_IMG_DEFAULT = 'https://api.deline.web.id/lWF5z2DXzM.png'
const MENUIMG_CONFIG   = path.join(process.cwd(), 'data', 'menuimg.json')

function getMenuImg(): string {
  try {
    if (!fs.existsSync(MENUIMG_CONFIG)) return MENU_IMG_DEFAULT
    const cfg = JSON.parse(fs.readFileSync(MENUIMG_CONFIG, 'utf-8')) as { url?: string }
    return cfg.url || MENU_IMG_DEFAULT
  } catch { return MENU_IMG_DEFAULT }
}

async function getMenuBuf(): Promise<Buffer> {
  return downloadToBuffer(getMenuImg())
}

function getFkontakBuf(): Buffer {
  const fkontakPath = path.join(process.cwd(), 'media', 'fkontak.jpg')
  if (fs.existsSync(fkontakPath)) return fs.readFileSync(fkontakPath)
  if (fs.existsSync(imagePath))   return fs.readFileSync(imagePath)
  return Buffer.alloc(0)
}

const BOT_JID     = '13135550002@s.whatsapp.net'
const CHANNEL_JID = '120363420704282055@newsletter'
const CHANNEL_URL = 'https://whatsapp.com/channel/0029VbC6GY50VycJQ7nFgo3v'
const OWNER_WA    = 'https://wa.me/628xxxxxxxxxx'
const botName     = global.botName    || 'Morela'
const botVersion  = global.botVersion || 'v2.0.0'
const ownerName   = global.ownerName  || 'putraa'
const ownerSocial = ''


interface MenuCategory {
  emoji:    string
  title:    string
  commands: string[]
}

interface MorelaSock {
  waUploadToServer:              (...args: unknown[]) => unknown
  relayMessage:                  (jid: string, message: unknown, opts: unknown) => Promise<unknown>
  sendMessage:                   (jid: string, content: unknown, opts?: unknown) => Promise<unknown>
  groupFetchAllParticipating:    () => Promise<Record<string, { participants?: unknown[] }>>
  [key: string]:                 unknown
}


export const MENU_LISTS: Record<string, MenuCategory> = {
  ai:         { emoji: '🤖', title: 'AI MENU',    commands: ['img','image','genmyart','mathgpt','aion/off','ai2on/off','removebg','to4k'] },
  downloader: { emoji: '📥', title: 'DOWNLOADER', commands: ['yts','tt','tt2','alldownload','ttslide','play','ig','pin','ptv','upload','mediafire','spotify','soundcloud','sad'] },
  sticker:    { emoji: '✨', title: 'STICKER',     commands: ['attp','emoji','emojimix','qc','brat','bratvid','bratruromiya','brattren','bratgura','stickerpack','smeme','bratspongebob','ttp','stiker','stikerbrat','swm','linesticker'] },
  maker:      { emoji: '🎨', title: 'MAKER',       commands: ['fakedev','fakeff','fakeffduo','discord','fakestory','faketweet','iqc','musiccard','carbon','fakeml','toimage','tofigurav3','tofigurav2','tofigura','tosad','tosatan','tosdmtinggi','toreal','tomoai','tomaya','tolego','tokamboja','tokacamata','tojepang','toghibli','todubai','todpr','tochibi','tobrewok','toblonde','tobotak','tohijab','tomekah','tomirror','tovintage','tomaid','tomangu','topeci','topiramida','topolaroid','topunk','toroh','tostreetwear','totato','totrain','totua','toturky','toanime','tomonyet','toroblox','tobabi','toputih','tobersama','putihkan','hitamkan'] },
  ephoto:     { emoji: '🖼️', title: 'EPHOTO',     commands: ['glitchtext','writetext','advancedglow','typographytext','pixelglitch','neonglitch','flagtext','flag3dtext','deletingtext','blackpinkstyle','glowingtext','underwatertext','logomaker','cartoonstyle','papercutstyle','watercolortext','effectclouds','blackpinklogo','gradienttext','summerbeach','luxurygold','multicoloyellowneon','sandsummer','galaxywallpaper','1917style','makingneon','royaltext','freecreate','galaxystyle','lighteffects','flaming'] },
  tools:      { emoji: '🛠️', title: 'TOOLS',      commands: ['hd','hdv1','hdvid','hdv2','tempmail','rvo on/off','skipsfl','tri','ttf','ping','test','removewm','daftar','listuser','getpp','getppgrup','inspect','tovideo','toimage','tgspy','facedetector','deploy','bypass'] },
  game:       { emoji: '🎮', title: 'GAME & RPG',  commands: ['truthordare','susunkata','tebaksurah','tebakkata','tebakkimia','tebakbendera','tebakgambar','asahotak','family100','quran','quote','guildwar','buildml','profil','me','mining','tambang','listmining','truth','dare','bucin','gombal','cekkhodam','khodam','akankah','apakah','bagaimana','berapa','bisakah','coba','dimana','haruskah','kapan','kapankah','mengapa','rate','mimpi','soulmatch','tembak','terima','tolak','putus','cekpacar','jodoh','cp','couple','jodohku','gay','siapa','bego','goblok','janda','perawan','babi','tolol','pekok','jancok','pintar','asu','bodoh','lesby','bajingan','anjing','ngentod','monyet','mastah','newbie','bangsat','bangke','sange','sangean','dakjal','horny','wibu','peak','pantek','setan','iblis','cacat','yatim','piatu','gaycek','cekgay','sangecek','ceksange','lesbicek','ceklesbi','top','top5','sulap'] },
  info:       { emoji: 'i', title: 'INFO', commands: ['tm','transfermarkt','jadwalbola'] },
  nsfw:       { emoji: '🔞', title: '18+ / NSFW',   commands: ['shinobu','megumin','bully','cuddle','cry','hug','awoo','kiss','lick','pat','smug','bonk','yeet','blush','smile','wave','highfive','handhold','nom','bite','glomp','slap','kill','happy','wink','poke','dance','cringe','trap','blowjob','hentai','boobs','ass','pussy','thighs','lesbian','lewdneko','cum','waifu-nsfw','neko-nsfw'] },
  admin:      { emoji: '🔰', title: 'ADMIN',       commands: [
    'open','close','opengc','closegc','resetlink',
    'welcome on/off','goodbye on/off','intro on/off','reactionkick',
    'antilink on/off',
    'on antibot','on antivideo','on antifoto','on antiaudio','on antidokumen','on antisticker','on antimention',
    'off antibot (contoh)',
    'antistatus','listwarn','delwarn','delwarn @user','mute','unmute','htprem'
  ] },
  owner:      { emoji: '👑', title: 'OWNER',       commands: [
    'owner','addowner','delowner','listowner',
    'addprem','delprem',
    'plugin','delplugin','getplugin','listplugin','reloadplugin',
    'backup','backupdb','clearcache','self','public','stikercmd','sc','sewa','deldaftar',
    'undress','pay','ceklimit','listlimit','resetlimitall','resetdb','cekdb',
    'topchat','setmenu',
    'jadibot','stopbot','listbot',
    'd','nsfw','privatemode on/off',
    'healthcheck','stats','resetstats',
    'tgbot token','tgbot id','tgbot test','tgbot on','tgbot off','tgbot reset',
    'tgspy',
    '=>','>','$','sewabot','listsewa','ceksewa','delsewa'
  ] }
}


function bi(text: string): string {
  const m: Record<string, string> = {
    'A':'𝑨','B':'𝑩','C':'𝑪','D':'𝑫','E':'𝑬','F':'𝑭','G':'𝑮','H':'𝑯','I':'𝑰','J':'𝑱',
    'K':'𝑲','L':'𝑳','M':'𝑴','N':'𝑵','O':'𝑶','P':'𝑷','Q':'𝑸','R':'𝑹','S':'𝑺','T':'𝑻',
    'U':'𝑼','V':'𝑽','W':'𝑾','X':'𝑿','Y':'𝒀','Z':'𝒁',
    'a':'𝒂','b':'𝒃','c':'𝒄','d':'𝒅','e':'𝒆','f':'𝒇','g':'𝒈','h':'𝒉','i':'𝒊','j':'𝒋',
    'k':'𝒌','l':'𝒍','m':'𝒎','n':'𝒏','o':'𝒐','p':'𝒑','q':'𝒒','r':'𝒓','s':'𝒔','t':'𝒕',
    'u':'𝒖','v':'𝒗','w':'𝒘','x':'𝒙','y':'𝒚','z':'𝒛',
    '0':'𝟎','1':'𝟏','2':'𝟐','3':'𝟑','4':'𝟒','5':'𝟓','6':'𝟔','7':'𝟕','8':'𝟖','9':'𝟗'
  }
  return String(text).split('').map(c => m[c] ?? c).join('')
}

async function downloadToBuffer(url: string): Promise<Buffer> {
  const res = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer', timeout: 15000 })
  return Buffer.from(res.data)
}

async function uploadImage(Morela: MorelaSock, buffer: Buffer) {
  const { imageMessage } = await generateWAMessageContent(
    { image: buffer },
    { upload: Morela.waUploadToServer as Parameters<typeof generateWAMessageContent>[1]['upload'] }
  )
  return imageMessage
}

import { getGreeting, getGreeting_v3 } from '../../Library/utils.js'
import { getUser, isRegistered } from '../../Database/db.js'
import { getUsage, getUserDailyLimit } from '../../Database/usagelimit.js'

function getRuntime(): string {
  return `Node.js ${process.version}`
}

function getRank(level: number): string {
  if (level >= 100) return '👑 Legend'
  if (level >= 50)  return '💎 Diamond'
  if (level >= 30)  return '🥇 Gold'
  if (level >= 20)  return '🥈 Silver'
  if (level >= 10)  return '🥉 Bronze'
  return '🪨 Iron'
}

interface UserInfo {
  akses: string; limit: string; level: string
  exp: string; rank: string; saldo: string
  daftar: string; status: string
}

function buildUserInfo(senderJid: string, isOwn: boolean, isPrem: boolean): UserInfo {
  try {
    const ud    = getUser(senderJid)
    const isReg = isRegistered(senderJid)
    if (isOwn) return {
      akses: '👑 Owner', limit: '9.000.000.000.000', level: '9.000.000.000.000',
      exp: '9.000.000.000.000', rank: '👑 Legend', saldo: 'Rp 9.000.000.000.000',
      daftar: isReg ? '✅ Sudah' : '❌ Belum', status: '🟢 Good'
    }
    if (!isReg || !ud) return {
      akses: isPrem ? '💎 Premium' : '👤 User', limit: '-', level: '-',
      exp: '-', rank: '-', saldo: '-', daftar: '❌ Belum', status: '🟡 Unknown'
    }
    const maxLimit = getUserDailyLimit(ud.level || 0)
    const usage    = getUsage(senderJid, maxLimit)
    const limitStr = `${usage.sisa}/${maxLimit}`
    const status   = usage.sisa > maxLimit * 0.5 ? '🟢 Good' : usage.sisa > 0 ? '🟡 Low' : '🔴 Habis'
    return {
      akses: isPrem ? '💎 Premium' : '👤 User', limit: limitStr,
      level: String(ud.level || 0), exp: String(ud.exp || 0),
      rank: getRank(ud.level || 0),
      saldo: `Rp ${(ud.balance as number || 0).toLocaleString('id-ID')}`,
      daftar: '✅ Sudah', status
    }
  } catch {
    return { akses: '👤 User', limit: '-', level: '-', exp: '-', rank: '-', saldo: '-', daftar: '-', status: '🟡 Unknown' }
  }
}

const CONFIG_PATH = path.join(__dirname, '../../data/menuconfig.json')

export function getMenuStyle(jid: string): string {
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as Record<string, string>
    return cfg[jid] || cfg['default'] || 'v1'
  } catch { return 'v1' }
}


const IM = proto.Message.InteractiveMessage as unknown as {
  fromObject: (o: Record<string, unknown>) => unknown
  Body:              { fromObject: (o: Record<string, unknown>) => unknown }
  Footer:            { fromObject: (o: Record<string, unknown>) => unknown }
  Header:            { fromObject: (o: Record<string, unknown>) => unknown }
  NativeFlowMessage: { fromObject: (o: Record<string, unknown>) => unknown }
}




async function buildFkontak_v1(Morela: MorelaSock) {
  const BOT_NUMBER = BOT_JID.split('@')[0]
  const Mekik = getFkontakBuf()
  return {
    key: { participant: '0@s.whatsapp.net', fromMe: false, id: 'StatusBiz', remoteJid: 'status@broadcast' },
    message: { contactMessage: {
      displayName: bi('Morela'),
      vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${bi('Morela Multidevice')}\nFN:${bi('Morela Multidevice')}\nORG:${botName};\nTEL;type=CELL;type=VOICE;waid=${BOT_NUMBER}:${BOT_NUMBER}\nEND:VCARD`,
      jpegThumbnail: Mekik
    } }
  }
}

function buildMenuText_v1(pushname: string, totalGroups: number = 0, totalUsers: number = 0, groupJid: string = '', senderJid: string = '', isOwn: boolean = false, isPrem: boolean = false): string {
  const uptime = runtime(process.uptime())
  const mode   = isSelfMode(groupJid) ? 'ꜱᴇʟꜰ' : 'ᴘᴜʙʟɪᴄ'
  let totalCommands = 0
  Object.values(MENU_LISTS).forEach(d => totalCommands += d.commands.length)
  const ui = buildUserInfo(senderJid, isOwn, isPrem)
  let txt = `${getGreeting()}, ${bi(pushname)}!\n\n`
  txt += `*╔══〔 🌸 ɪɴꜰᴏ ʙᴏᴛ 🌸 〕══╗*\n`
  txt += `◦❒ ɴᴀᴍᴇ     : ${bi(botName)}\n◦❒ ᴠᴇʀꜱɪᴏɴ  : ${bi(botVersion)}\n`
  txt += `◦❒ ᴜᴘᴛɪᴍᴇ   : ${bi(uptime)}\n◦❒ ᴏᴡɴᴇʀ    : ${bi(ownerName)}\n`
  txt += `◦❒ ᴍᴏᴅᴇ     : ${bi(mode)}\n◦❒ ᴄᴏᴍᴍᴀɴᴅꜱ : ${bi(String(totalCommands))}\n`
  txt += `◦❒ ɢʀᴏᴜᴘ    : ${bi(String(totalGroups))}\n◦❒ ᴜꜱᴇʀ     : ${bi(String(totalUsers))}\n`
  txt += `*╚══════════════════╝*\n\n`
  txt += `*╔══〔 👤 ɪɴꜰᴏ ᴜꜱᴇʀ 〕══╗*\n`
  txt += `◦❒ ɴᴀᴍᴀ    : ${bi(pushname)}\n◦❒ ᴀᴋꜱᴇꜱ   : ${ui.akses}\n`
  txt += `◦❒ ʟɪᴍɪᴛ   : ${bi(ui.limit)}\n◦❒ ʟᴇᴠᴇʟ   : ${bi(ui.level)}\n`
  txt += `◦❒ ᴇxᴘ     : ${bi(ui.exp)}\n◦❒ ʀᴀɴᴋ    : ${ui.rank}\n`
  txt += `◦❒ ꜱᴀʟᴅᴏ   : ${bi(ui.saldo)}\n◦❒ ᴅᴀꜰᴛᴀʀ  : ${ui.daftar}\n◦❒ ꜱᴛᴀᴛᴜꜱ  : ${ui.status}\n`
  txt += `*╚══════════════════╝*\n\n`
  txt += `*╔══〔 📡 ᴛᴇʟᴇɢʀᴀᴍ ʙᴏᴛ 📡 〕══╗*\n`
  ;['/start','/status','/restart','/cc','/on','/off','/listbot','/stopbot','/broadcast','/resetlink','/resetlink all','/kirim','/exec','/eval','/shell'].forEach(c => { txt += `◦❒ ${c}\n` })
  txt += `*╚══════════════════╝*\n\n`
  txt += `*╔══〔 📋 ꜱᴇᴍᴜᴀ ᴄᴏᴍᴍᴀɴᴅ 📋 〕══╗*\n\n`
  for (const [, data] of Object.entries(MENU_LISTS)) {
    txt += `*${data.emoji} ${data.title}*\n`
    data.commands.forEach((cmd, i) => { txt += `◦❒ ${bi(String(i + 1).padStart(2, '0'))}. .${bi(cmd)}\n` })
    txt += `\n`
  }
  txt += `*╚══════════════════╝*`
  return txt.trim()
}

function buildCategoryText_v1(data: MenuCategory): string {
  let txt = `*╔══〔 ${data.emoji} ${data.title} 〕══╗*\n`
  data.commands.forEach((cmd, i) => { txt += `◦❒ ${bi(String(i + 1).padStart(2, '0'))}. .${bi(cmd)}\n` })
  txt += `*╚══════════════════╝*\n\nᴋᴇᴛɪᴋ ᴘᴇʀɪɴᴛᴀʜ ᴅɪ ᴀᴛᴀꜱ ᴜɴᴛᴜᴋ ᴍᴇɴɢɢᴜɴᴀᴋᴀɴ ꜰɪᴛᴜʀ`
  return txt
}

async function sendMenu_v1(Morela: MorelaSock, jid: string, footerText: string, imgBuf: Buffer, quoted: unknown): Promise<void> {
  const imageMessage = await uploadImage(Morela, imgBuf)
  const msg = generateWAMessageFromContent(jid, {
    viewOnceMessage: { message: {
      messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
      interactiveMessage: IM.fromObject({
        body:   IM.Body.fromObject({ text: ' ' }),
        footer: IM.Footer.fromObject({ text: footerText }),
        header: IM.Header.fromObject({ title: `🔰 ${bi('Information')} ${bi(botName)} ${bi('Bot')} 💤`, hasMediaAttachment: true, imageMessage }),
        nativeFlowMessage: IM.NativeFlowMessage.fromObject({
          buttons: [{ name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: 'Chat Owner', url: OWNER_WA, merchant_url: OWNER_WA }) }],
          messageParamsJson: JSON.stringify({
            limited_time_offer: { text: bi(`${botName} ${botVersion}`), url: CHANNEL_URL, copy_code: bi('Rp 999999999999999') },
            bottom_sheet: { in_thread_buttons_limit: 999, divider_indices: [1, 999], list_title: `🔰 ${bi('Information')} ${bi(botName)} ${bi('Bot')} 💤`, button_title: `${botName} Bot` },
            tap_target_configuration: { title: botName, description: botVersion, canonical_url: CHANNEL_URL, domain: 'whatsapp.com', button_index: 0 }
          })
        })
      })
    } }
  }, { quoted })
  await Morela.relayMessage(jid, msg.message, { messageId: msg.key.id })
}




async function buildFkontak_v2(Morela: MorelaSock) {
  const BOT_NUMBER = BOT_JID.split('@')[0]
  const Mekik = getFkontakBuf()
  return {
    key: { participant: '0@s.whatsapp.net', fromMe: false, id: 'StatusBiz', remoteJid: 'status@broadcast' },
    message: { contactMessage: {
      displayName: botName,
      vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${botName}\nFN:${botName}\nORG:${botName};\nTEL;type=CELL;type=VOICE;waid=${BOT_NUMBER}:${BOT_NUMBER}\nEND:VCARD`,
      jpegThumbnail: Mekik
    } }
  }
}

function buildContextInfo_v2() {
  return {
    forwardingScore: 999, isForwarded: true,
    externalAdReply: { title: botName, body: botVersion, thumbnail: getFkontakBuf() || undefined, mediaType: 1, renderLargerThumbnail: false, showAdAttribution: false, sourceUrl: CHANNEL_URL },
    forwardedNewsletterMessageInfo: { newsletterJid: CHANNEL_JID, newsletterName: botName }
  }
}

function buildMenuText_v2(pushname: string, groupJid: string = '', senderJid: string = '', isOwn: boolean = false, isPrem: boolean = false): string {
  const uptime = runtime(process.uptime())
  const mode   = isSelfMode(groupJid) ? 'ꜱᴇʟꜰ' : 'ᴘᴜʙʟɪᴄ'
  let totalCommands = 0
  Object.values(MENU_LISTS).forEach(d => totalCommands += d.commands.length)
  const ui = buildUserInfo(senderJid, isOwn, isPrem)
  let txt = `${getGreeting()}, ${bi(pushname)}!\n\n`
  txt += `*╭─❁ ɪɴꜰᴏ ʙᴏᴛ ❁*\n`
  txt += `◦❒ ɴᴀᴍᴇ     : ${bi(botName)}\n◦❒ ᴠᴇʀꜱɪᴏɴ  : ${bi(botVersion)}\n`
  txt += `◦❒ ᴜᴘᴛɪᴍᴇ   : ${bi(uptime)}\n◦❒ ᴏᴡɴᴇʀ    : ${bi(ownerName)}\n`
  txt += `◦❒ ᴍᴏᴅᴇ     : ${bi(mode)}\n◦❒ ᴄᴏᴍᴍᴀɴᴅꜱ : ${bi(String(totalCommands))}\n*╰─❁*\n\n`
  txt += `*╭─❁ 👤 ɪɴꜰᴏ ᴜꜱᴇʀ ❁*\n`
  txt += `◦❒ ɴᴀᴍᴀ    : ${bi(pushname)}\n◦❒ ᴀᴋꜱᴇꜱ   : ${ui.akses}\n`
  txt += `◦❒ ʟɪᴍɪᴛ   : ${bi(ui.limit)}\n◦❒ ʟᴇᴠᴇʟ   : ${bi(ui.level)}\n`
  txt += `◦❒ ᴇxᴘ     : ${bi(ui.exp)}\n◦❒ ʀᴀɴᴋ    : ${ui.rank}\n`
  txt += `◦❒ ꜱᴀʟᴅᴏ   : ${bi(ui.saldo)}\n◦❒ ᴅᴀꜰᴛᴀʀ  : ${ui.daftar}\n◦❒ ꜱᴛᴀᴛᴜꜱ  : ${ui.status}\n*╰─❁*\n\n`
  txt += `*╭─📡 ᴛᴇʟᴇɢʀᴀᴍ ʙᴏᴛ*\n`
  ;['/start','/status','/restart','/cc','/on','/off','/listbot','/stopbot','/broadcast','/resetlink','/resetlink all','/kirim','/exec','/eval','/shell'].forEach(c => { txt += `◦❒ ${c}\n` })
  txt += `*╰─❁*\n\n*╭─❁ ꜱᴇᴍᴜᴀ ᴄᴏᴍᴍᴀɴᴅ ❁*\n\n`
  for (const [, data] of Object.entries(MENU_LISTS)) {
    txt += `*${data.emoji} ${data.title}*\n`
    data.commands.forEach(cmd => { txt += `◦❒ .${bi(cmd)}\n` })
    txt += `\n`
  }
  txt += `*╰─❁*`
  return txt.trim()
}

function buildCategoryText_v2(data: MenuCategory): string {
  let txt = `*╭─❁ ${data.emoji} ${data.title} ❁*\n`
  data.commands.forEach(cmd => { txt += `◦❒ .${bi(cmd)}\n` })
  txt += `*╰─❁*\n\nᴋᴇᴛɪᴋ ᴘᴇʀɪɴᴛᴀʜ ᴅɪ ᴀᴛᴀꜱ ᴜɴᴛᴜᴋ ᴍᴇɴɢɢᴜɴᴀᴋᴀɴ ꜰɪᴛᴜʀ`
  return txt
}




async function buildFkontak_v3(Morela: MorelaSock) {
  const BOT_NUMBER = BOT_JID.split('@')[0]
  const Mekik = getFkontakBuf()
  return {
    key: { participant: '0@s.whatsapp.net', fromMe: false, id: 'StatusBiz', remoteJid: 'status@broadcast' },
    message: { contactMessage: {
      displayName: botName,
      vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${botName}\nFN:${botName}\nORG:${botName};\nTEL;type=CELL;type=VOICE;waid=${BOT_NUMBER}:${BOT_NUMBER}\nEND:VCARD`,
      jpegThumbnail: Mekik
    } }
  }
}

function buildContextInfo_v3() {
  return {
    forwardingScore: 1, isForwarded: true,
    forwardedNewsletterMessageInfo: { newsletterJid: CHANNEL_JID, serverMessageId: 1, newsletterName: botName },
    externalAdReply: { title: botName, body: botVersion, mediaType: 1, thumbnail: getFkontakBuf() || undefined, sourceUrl: CHANNEL_URL, renderLargerThumbnail: false, showAdAttribution: false }
  }
}

function buildSections_v3() {
  let totalCommands = 0
  Object.values(MENU_LISTS).forEach(d => totalCommands += d.commands.length)
  const rows = Object.entries(MENU_LISTS).map(([key, data]) => ({
    title: `✦ ${data.title}`, description: `MENU ${data.title}`, id: `.menu_${key}`
  }))
  return [{ title: `✦ Total Menu ${totalCommands}`, rows }]
}

function buildFooter_v3(pushname: string, groupJid: string = '', senderJid: string = '', isOwn: boolean = false, isPrem: boolean = false): string {
  const uptime    = runtime(process.uptime())
  const vpsUptime = runtime(os.uptime())
  const mode      = isSelfMode(groupJid) ? 'Self' : 'Public'
  let totalCommands = 0
  Object.values(MENU_LISTS).forEach(d => totalCommands += d.commands.length)
  const ui = buildUserInfo(senderJid, isOwn, isPrem)
  let footer = `${getGreeting_v3()}\n\n${pushname}\n\n`
  footer += `┏━━━━━━━━━━━━━━━━━━━┓\n┃ BOT INFORMATION\n┣━━━━━━━━━━━━━━━━━━━┫\n`
  footer += `┃ Name    → ${botName}\n┃ Version → ${botVersion}\n┃ Runtime → ${getRuntime()}\n`
  footer += `┃ VPS Up  → ${vpsUptime}\n┃ Bot Up  → ${uptime}\n┣━━━━━━━━━━━━━━━━━━━┫\n`
  footer += `┃ Owner   → ${ownerName}`
  if (ownerSocial) footer += `\n┃ Social  → ${ownerSocial}`
  footer += `\n┃ Mode    → ${mode}\n┃ Commands → ${totalCommands}\n┣━━━━━━━━━━━━━━━━━━━┫\n`
  footer += `┃ INFO USER\n┣━━━━━━━━━━━━━━━━━━━┫\n`
  footer += `┃ Nama   → ${pushname}\n┃ Akses  → ${ui.akses}\n┃ Limit  → ${ui.limit}\n`
  footer += `┃ Level  → ${ui.level}\n┃ EXP    → ${ui.exp}\n┃ Rank   → ${ui.rank}\n`
  footer += `┃ Saldo  → ${ui.saldo}\n┃ Daftar → ${ui.daftar}\n┃ Status → ${ui.status}\n`
  footer += `┗━━━━━━━━━━━━━━━━━━━┛`
  return footer
}

function buildCategoryFooter_v3(data: MenuCategory): string {
  let caption = `╭─────○ [ ${data.emoji} ${data.title} ]\n│\n`
  data.commands.forEach(cmd => { caption += `│  ▸ ${cmd}\n` })
  caption += `│\n╰─────────────────○\n\nKetik perintah di atas untuk menggunakan fitur`
  return caption
}




const handler = async (m: any, { Morela, reply, command, isOwn, isPrem, senderJid }: any) => {
  try {
    const style    = getMenuStyle(m.chat)
    const pushname = String(m.pushName || 'User')
    const ujid     = String(senderJid || m.sender || m.key.remoteJid)

    if (command.startsWith('menu_')) {
      const cat  = command.replace('menu_', '')
      const data = MENU_LISTS[cat]
      if (!data) return reply('❌ Kategori tidak ditemukan')
      if (style === 'v3') {
        const imgBuf  = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : await getMenuBuf()
        const fkontak = await buildFkontak_v3(Morela)
        return Morela.sendMessage(m.chat, {
          image: imgBuf, caption: ' ', footer: buildCategoryFooter_v3(data),
          interactiveButtons: [
            { name: 'single_select', buttonParamsJson: JSON.stringify({ title: 'Pilih Menu', sections: buildSections_v3() }) },
            { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: 'Channel', url: CHANNEL_URL, merchant_url: CHANNEL_URL }) }
          ],
          hasMediaAttachment: true, contextInfo: buildContextInfo_v3()
        }, { quoted: fkontak || m })
      } else if (style === 'v2') {
        const menuBuf = await getMenuBuf()
        const fkontak = await buildFkontak_v2(Morela)
        return Morela.sendMessage(m.chat, { image: menuBuf, caption: buildCategoryText_v2(data), contextInfo: buildContextInfo_v2() }, { quoted: fkontak || m })
      } else {
        const menuBuf = await getMenuBuf()
        const fkontak = await buildFkontak_v1(Morela)
        return sendMenu_v1(Morela, m.chat, buildCategoryText_v1(data), menuBuf, fkontak)
      }
    }

    if (style === 'v3') {
      const imgBuf  = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : await getMenuBuf()
      const fkontak = await buildFkontak_v3(Morela)
      await Morela.sendMessage(m.chat, {
        image: imgBuf, caption: ' ',
        footer: buildFooter_v3(pushname, m.chat, ujid, isOwn, isPrem),
        interactiveButtons: [
          { name: 'single_select', buttonParamsJson: JSON.stringify({ title: 'Pilih Menu', sections: buildSections_v3() }) },
          { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: 'Channel', url: CHANNEL_URL, merchant_url: CHANNEL_URL }) }
        ],
        hasMediaAttachment: true, contextInfo: buildContextInfo_v3()
      }, { quoted: fkontak || m })
    } else if (style === 'v2') {
      const menuBuf = await getMenuBuf()
      const fkontak = await buildFkontak_v2(Morela)
      await Morela.sendMessage(m.chat, { image: menuBuf, caption: buildMenuText_v2(pushname, m.chat, ujid, isOwn, isPrem), contextInfo: buildContextInfo_v2() }, { quoted: fkontak || m })
    } else {
      const menuBuf = await getMenuBuf()
      const fkontak = await buildFkontak_v1(Morela)
      let totalGroups = 0, totalUsers = 0
      try {
        const chats  = await Morela.groupFetchAllParticipating()
        const groups = Object.values(chats)
        totalGroups  = groups.length
        totalUsers   = groups.reduce((acc: number, g: unknown) => acc + (((g as Record<string, unknown>).participants as unknown[] | undefined)?.length ?? 0), 0)
      } catch {}
      await sendMenu_v1(Morela, m.chat, buildMenuText_v1(pushname, totalGroups, totalUsers, m.chat, ujid, isOwn, isPrem), menuBuf, fkontak)
    }
  } catch (e) {
    console.error('[MENU ERROR]', e)
    reply(`❌ Error: ${(e as Error).message}`)
  }
}

handler.help    = ['menu', 'help']
handler.tags    = ['info']
handler.noLimit = true
handler.command = [
  'menu', 'help',
  'menu_ai', 'menu_downloader', 'menu_sticker',
  'menu_maker', 'menu_ephoto', 'menu_tools',
  'menu_game', 'menu_info', 'menu_admin', 'menu_owner', 'menu_nsfw'
]

export default handler