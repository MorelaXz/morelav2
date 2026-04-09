// @ts-nocheck


import fs    from 'fs'
import path  from 'path'
import https from 'https'
import http  from 'http'
import { fileURLToPath } from 'url'
import pluginManager from '../_pluginmanager.js'
import { botName, CHANNEL_URL, buildFkontak } from '../../Library/utils.js'
import { isSelfMode } from '../../System/selfmode.js'
import { isRegistered } from '../../Database/db.js'

const __dirname   = path.dirname(fileURLToPath(import.meta.url as string))
const DYM_IMG     = 'https://api.deline.web.id/7jc259yPwH.jpg'
const DYM_CACHE   = path.join(__dirname, '../../data/dym_thumb.jpg')
const CHANNEL_JID = '120363420704282055@newsletter'

if (!(globalThis as Record<string, unknown>).__dymDedup__) (globalThis as Record<string, unknown>).__dymDedup__ = new Map()
function isDuplicate(key: string) {
  const now = Date.now()
  if ((globalThis as Record<string, unknown>).__dymDedup__.has(key) && now - (globalThis as Record<string, unknown>).__dymDedup__.get(key) < 5000) return true
  (globalThis as Record<string, unknown>).__dymDedup__.set(key, now)
  for (const [k, t] of (globalThis as Record<string, unknown>).__dymDedup__)
    if (now - t > 10000) (globalThis as Record<string, unknown>).__dymDedup__.delete(k)
  return false
}

function fetchBuffer(url: string) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    lib.get(url, { timeout: 10000 }, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end',  () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

let _thumb = null
async function getThumb() {
  if (_thumb) return _thumb
  if (fs.existsSync(DYM_CACHE)) {
    _thumb = fs.readFileSync(DYM_CACHE)
    return _thumb
  }
  try {
    _thumb = await fetchBuffer(DYM_IMG)
    fs.writeFileSync(DYM_CACHE, _thumb)
    return _thumb
  } catch { return null }
}
getThumb().catch(() => {})

function buildDymPdf(cmd: string, prefix: unknown, similars: unknown) {
  const body = similars.length > 0
    ? `Did you mean?\n\nCommand "${prefix}${cmd}" tidak ditemukan.\n\nMungkin maksud kamu:\n${similars.map((c: unknown) => `- ${prefix}${c}`).join('\n')}`
    : `Did you mean?\n\nCommand "${prefix}${cmd}" tidak ditemukan.\n\nKetik ${prefix}menu untuk daftar command.`

  const escaped = body.replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  const stream  = `BT /F1 12 Tf 40 750 Td (${escaped.split('\n').join(') Tj T* (')}) Tj ET`
  const pdf =
    `%PDF-1.4\n` +
    `1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n` +
    `2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n` +
    `3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n` +
    `4 0 obj<</Length ${stream.length}>>\nstream\n${stream}\nendstream\nendobj\n` +
    `5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n` +
    `xref\n0 6\n0000000000 65535 f\n` +
    `trailer<</Size 6/Root 1 0 R>>\nstartxref\n0\n%%EOF`
  return Buffer.from(pdf)
}

function levenshtein(a: unknown, b: unknown) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  )
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[m][n]
}

function findSimilar(input: unknown, allCmds: unknown, max: unknown = 5, threshold: unknown = 3) {
  return allCmds
    .map((cmd: unknown) => ({ cmd, dist: levenshtein(input.toLowerCase(), cmd.toLowerCase()) }))
    .filter((x: unknown) => x.dist <= threshold)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, max)
    .map((x: unknown) => x.cmd)
}

export default {
  tags: ['passive', 'didyoumean'],

  handler: async (m, { Morela, isOwn, fkontak }) => {
    try {
      if (!m.message)                               return
      if (m.message?.reactionMessage)              return
      if (m.message?.protocolMessage)              return
      if (m.message?.senderKeyDistributionMessage) return
      if (m.chat === 'status@broadcast')           return
      if (m.key?.fromMe)                           return

      if (m.isGroup && isSelfMode(m.chat) && !isOwn) return

      if (!isOwn) {
        const userJid = m.sender || m.key?.participant || m.key?.remoteJid
        if (userJid && !isRegistered(userJid)) return
      }

      const body = m.body || m.text || ''
      if (!body) return

      const prefixMatch = body.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/i)
      if (!prefixMatch) return
      const prefix = prefixMatch[0]
      const cmd    = body.slice(prefix.length).trim().split(' ')[0].toLowerCase()
      if (!cmd) return

      if (pluginManager.getPlugin(cmd)) return

      if (isOwn && ['>', '=>', '$'].some((p: unknown) => body.startsWith(p))) return

      if (isDuplicate(`${m.chat}:${cmd}:${m.key?.id || ''}`)) return

      const allCmds  = [...pluginManager.plugins.keys()]
      const similars = findSimilar(cmd, allCmds)
      const pushname = m.pushName || 'kak'
      const thumb    = await getThumb()

      const contextInfo = {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid:   CHANNEL_JID,
          serverMessageId: 1,
          newsletterName:  botName
        },
        externalAdReply: {
          title:                 `❓ Did You Mean?`,
          body:                  `© ${botName}`,
          mediaType:             1,
          thumbnail:             thumb || undefined,
          renderLargerThumbnail: false,
          showAdAttribution:     false,
          sourceUrl:             CHANNEL_URL
        }
      }

      let text = `╭╌╌⬡「 ❓ *ᴅɪᴅ ʏᴏᴜ ᴍᴇᴀɴ?* 」\n`
      text    += `┃ ◦ 👤 User   : *${pushname}*\n`
      text    += `┃ ◦ 🔍 CMD    : *${prefix}${cmd}*\n`
      text    += `┃ ◦ 📌 Status : *Tidak Ditemukan*\n`
      text    += `┃\n`

      if (similars.length > 0) {
        text += `┃ _Mungkin maksud kamu:_\n`
        similars.forEach((c: unknown) => { text += `┃ ➤ \`${prefix}${c}\`\n` })
        text += `┃\n`
        text += `┃ _Ketik ${prefix}menu untuk semua command_\n`
      } else {
        text += `┃ _Command tidak tersedia di bot ini_\n`
        text += `┃ Ketik *${prefix}menu* untuk semua command\n`
      }

      text += `╰╌╌⬡\n\n© ${botName}`

      const pdfBuf = buildDymPdf(cmd, prefix, similars)

      const fkontak = await buildFkontak(Morela)

      await Morela.sendMessage(m.chat, {
        document:      pdfBuf,
        mimetype:      'application/pdf',
        fileName:      'Did you mean.pdf',
        caption:       text,
        jpegThumbnail: thumb || undefined,
        contextInfo
      }, { quoted: fkontak || m })

    } catch {
      
    }
  }
}