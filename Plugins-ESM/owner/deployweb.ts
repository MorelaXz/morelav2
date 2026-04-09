// @ts-nocheck
import unzipper from 'unzipper'
import fetch    from 'node-fetch'
import fs       from 'fs'
import { bi, CHANNEL_URL, imagePath, botName } from '../../Library/utils.js'

const VERCEL_TOKEN = 'YOUR_TOKEN_HERE'

const handler = async (m, { Morela, reply, text, fkontak, usedPrefix, command, downloadContentFromMessage }) => {

  const thumb = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : undefined

  const q = m.quoted
  if (!text) return Morela.sendMessage(m.chat, {
    text:
      `╭╌╌⬡「 🚀 *${bi('Deploy Web')}* 」\n` +
      `┃\n` +
      `┃ Deploy website ke Vercel langsung\n` +
      `┃ dari WhatsApp!\n` +
      `┃\n` +
      `┃ 📌 *Cara pakai:*\n` +
      `┃ Reply file .zip atau .html\n` +
      `┃ lalu ketik:\n` +
      `┃ \`${usedPrefix}${command} nama-web\`\n` +
      `┃\n` +
      `┃ 📝 *Contoh:*\n` +
      `┃ \`${usedPrefix}${command} portofolio-aku\`\n` +
      `┃\n` +
      `╰╌╌⬡\n\n© ${botName}`,
    contextInfo: { externalAdReply: { title: '🚀 Deploy Web ke Vercel', body: `${botName} Multidevice 🔥`, mediaType: 1, renderLargerThumbnail: false, showAdAttribution: false, sourceUrl: CHANNEL_URL, thumbnail: thumb } }
  }, { quoted: fkontak || m })

  if (!q || !q.mimetype) return reply('❌ Reply file *.zip* atau *.html* dulu!')

  const mime = q.mimetype
  if (!/zip|html/.test(mime)) return reply('❌ Hanya mendukung file *.zip* atau *.html*')

  const webName = text.trim().toLowerCase().replace(/[^a-z0-9\-_]/g, '')
  if (webName.length < 3) return reply('❌ Nama web minimal 3 karakter\nContoh: `portofolio-aku`')

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })
  await Morela.sendMessage(m.chat, {
    text:
      `╭╌╌⬡「 ⏳ *${bi('Proses Deploy')}* 」\n` +
      `┃ ◦ 📥 Download file...\n` +
      `╰╌╌⬡\n\n© ${botName}`,
    contextInfo: { externalAdReply: { title: '⏳ Sedang Proses...', body: `${botName} Multidevice 🔥`, mediaType: 1, renderLargerThumbnail: false, showAdAttribution: false, sourceUrl: CHANNEL_URL, thumbnail: thumb } }
  }, { quoted: fkontak || m })

  try {
    
    const mtype  = mime.includes('zip') ? 'document' : 'document'
    const stream = await downloadContentFromMessage(q, mtype)
    let   media  = Buffer.from([])
    for await (const chunk of stream) media = Buffer.concat([media, chunk])
    if (!media.length) return reply('❌ Gagal download file')

    const files = []

    
    if (/zip/.test(mime)) {
      await reply('📦 Mengekstrak ZIP...')
      const zip = await unzipper.Open.buffer(Buffer.from(media))

      for (const f of zip.files) {
        if (f.type !== 'File') continue
        const data = await f.buffer()
        if (data.length > 5 * 1024 * 1024) continue 
        files.push({
          file:     f.path.replace(/^\/+/, ''),
          data:     data.toString('base64'),
          encoding: 'base64'
        })
      }

      if (!files.some(f => f.file.endsWith('.html')))
        return reply('❌ Tidak ada file *.html* di dalam ZIP')

    
    } else {
      files.push({
        file:     'index.html',
        data:     Buffer.from(media).toString('base64'),
        encoding: 'base64'
      })
    }

    await reply(`🚀 Deploy *${webName}* ke Vercel... (${files.length} file)`)

    
    const res = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({
        name: webName,
        files,
        projectSettings: {
          framework:       null,
          buildCommand:    null,
          outputDirectory: null
        }
      })
    })

    const json = await res.json()
    if (!res.ok) {
      console.error('[DEPLOYWEB] Vercel error:', JSON.stringify(json))
      return reply(`❌ Deploy gagal!\n\n${json.error?.message || JSON.stringify(json).slice(0, 200)}`)
    }

    const url = `https://${webName}.vercel.app`

    await Morela.sendMessage(m.chat, {
      text:
        `╭╌╌⬡「 ✅ *${bi('Deploy Success')}* 」\n` +
        `┃\n` +
        `┃ 🌐 URL    : ${url}\n` +
        `┃ 📦 Files  : ${files.length} file\n` +
        `┃ ⚡ Status : ${json.readyState || 'Deploying'}\n` +
        `┃\n` +
        `┃ ⏳ Tunggu ±1 menit sampai\n` +
        `┃    website aktif!\n` +
        `┃\n` +
        `╰╌╌⬡\n\n© ${botName}`,
      contextInfo: { externalAdReply: { title: '✅ Deploy Berhasil!', body: url, mediaType: 1, renderLargerThumbnail: false, showAdAttribution: false, sourceUrl: url, thumbnail: thumb } }
    }, { quoted: fkontak || m })

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    console.error('[DEPLOYWEB]', e)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply(`❌ Error: ${e.message}`)
  }
}

handler.command = ['deployweb', 'cweb', 'vweb', 'deploy']
handler.tags    = ['owner']
handler.help    = ['deploy <nama> — reply file .zip/.html untuk deploy ke Vercel']
handler.mainOwner = true
handler.noLimit = true

export default handler