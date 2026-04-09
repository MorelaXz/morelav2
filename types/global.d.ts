import type { WASocket, WAMessage, proto } from "@itsukichan/baileys"


declare global {
  var owner: string[]
  var mainOwner: string
  var prefa: string[]
  var prefix: string
  var thumbnail: Buffer | null
  var thumbnailUrl: string
  var botName: string
  var botVersion: string
  var ownerName: string
  var tgGlobal: { token: string; chatId: string }
  var tgBot: { token: string; ownerId: string }
  var __privateModeOn__: boolean
  var __jadibotCache__: Set<string> | null
  var jadibotSessions: Map<string, { startedAt?: number; stop: () => Promise<void>; [key: string]: unknown }> | undefined
  var __sock__: WASocket | undefined
  var __messageStore__: unknown
}


export type LimitEntry = {
  count: number
  limitHitAt: number | null
}

export type LimitResult =
  | { allowed: true;  count: number; sisa: number }
  | { allowed: false; resetAt: number; limitHitAt: number }

export type AbuseResult =
  | { allowed: true }
  | { allowed: false; reason: 'muted';        action: string }
  | { allowed: false; reason: 'rate_limit';   action: string }
  | { allowed: false; reason: 'flood';        action: string; shouldWarn: true; autoBlacklist: boolean }
  | { allowed: false; reason: 'spam_command'; action: string; shouldWarn: true; autoBlacklist: boolean }

export type AbuseStatus = {
  jid:            string
  muted:          boolean
  muteRemaining:  number
  warnings:       number
  recentMessages: number
}


export type UserData = {
  id:             string
  name?:          string
  registered?:    boolean
  regName?:       string
  regAge?:        string
  regDate?:       string
  level?:         number
  exp?:           number
  premium?:       boolean
  premiumExpiry?: number | null
  banned?:        boolean
  [key: string]:  unknown
}

export type GroupData = {
  id:            string
  subject?:      string
  selfmode?:     boolean
  antilink?:     boolean
  antigrup?:     boolean
  antilinkmode?: string
  welcome?:      boolean
  welcomemsg?:   string
  goodbye?:      boolean
  goodbyemsg?:   string
  openclose?:    boolean
  nsfw?:         boolean
  intro?:        boolean
  [key: string]: unknown
}

export type LidMapData = Record<string, string>


export type BotStats = {
  commands:  Record<string, number>
  users:     Record<string, number>
  hours:     Record<string, number>
  days:      Record<string, number>
  total:     number
  startedAt: number
}




export type MsgObj = WAMessage & {
  
  id:              string
  isBaileys:       boolean
  chat:            string
  fromMe:          boolean
  isGroup:         boolean
  sender:          string
  mtype:           string
  msg:             proto.IMessage[keyof proto.IMessage] | null | undefined
  body:            string
  text:            string
  mentionedJid:    string[]
  quoted:          MsgObj | null
  
  reply:           (text: string | Buffer, chatId?: string, opts?: Record<string, unknown>) => Promise<WAMessage | undefined>
  download:        () => Promise<Buffer>
  copy:            () => MsgObj
  copyNForward:    (jid?: string, force?: boolean, opts?: Record<string, unknown>) => Promise<WAMessage | undefined>
  getQuotedObj:    () => Promise<MsgObj | false>
  getQuotedMessage: () => Promise<MsgObj | false>
  
  _isJadibot?:      boolean
  _stikerHandled?:  boolean
}


export type Message = MsgObj


export type GetFileResult = {
  res?:      Buffer | undefined
  filename:  string
  size:      string | number
  ext:       string
  mime:      string
  data:      Buffer
  cleanup:   () => void
}

export type ExtSocket = WASocket & {
  
  public?:                  boolean
  
  decodeJid:                (jid: string) => string
  getFile:                  (path: string | Buffer, save?: boolean) => Promise<GetFileResult>
  downloadMediaMessage:     (message: MsgObj | Record<string, unknown>) => Promise<Buffer>
  downloadMedia:            (message: MsgObj | Record<string, unknown>, opts?: {
    forceType?: string | null
    maxRetries?: number
    retryDelay?: number
  }) => Promise<Buffer>
  sendText:                 (jid: string, text: string, quoted?: unknown, opts?: Record<string, unknown>) => Promise<WAMessage | undefined>
  sendImageAsSticker:       (jid: string, src: string | Buffer, quoted?: unknown, opts?: Record<string, unknown>) => Promise<Buffer>
  sendVideoAsSticker:       (jid: string, src: string | Buffer, quoted?: unknown, opts?: Record<string, unknown>) => Promise<Buffer>
  downloadAndSaveMediaMessage: (message: MsgObj | Record<string, unknown>, filename: string, attachExtension?: boolean) => Promise<string>
  sendMedia:                (jid: string, path: string, caption?: string, quoted?: unknown, opts?: Record<string, unknown>) => Promise<WAMessage | undefined>
  sendPoll:                 (jid: string, question: string, options: string[]) => Promise<WAMessage | undefined>
}



export type FkontakMsg = {
  key: {
    participant: string
    fromMe:      boolean
    id:          string
    remoteJid:   string
  }
  message: {
    contactMessage: {
      displayName:    string
      vcard:          string
      jpegThumbnail?: Buffer
    }
  }
}


export type HandleData = {
  Morela:                      ExtSocket
  conn:                        ExtSocket
  text:                        string
  args:                        string[]
  isOwn:                       boolean
  isPrem:                      boolean
  isAdmin:                     boolean
  botAdmin:                    boolean
  senderJid:                   string
  usedPrefix:                  string
  command?:                    string
  reply:                       (msg: string, opt?: Record<string, unknown>) => Promise<unknown>
  fkontak:                     FkontakMsg | MsgObj   
  downloadContentFromMessage?: unknown
}


export type PluginHandler = {
  (m: Message, ctx: HandleData): Promise<unknown>
  command?:   string[]
  tags?:      string[]
  help?:      string[]
  owner?:     boolean
  premium?:   boolean
  group?:     boolean
  private?:   boolean
  admin?:     boolean
  botAdmin?:  boolean
  noLimit?:   boolean
  passive?:   boolean
}

export type PluginModule = {
  handler:    PluginHandler | ((m: Message, ctx: HandleData) => Promise<unknown>)
  command?:   string[]
  tags?:      string[]
  help?:      string[]
  owner?:     boolean
  premium?:   boolean
  group?:     boolean
  private?:   boolean
  admin?:     boolean
  botAdmin?:  boolean
  noLimit?:   boolean
  passive?:   boolean
}


export type Ctx = {
  sock:        WASocket
  args:        string[]
  text:        string
  fromButton:  boolean
  reply:       (msg: string, opt?: Record<string, unknown>) => Promise<unknown>
  replyMedia:  (media: unknown, opt?: Record<string, unknown>) => Promise<unknown>
}
