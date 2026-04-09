import axios from 'axios'
import * as cheerio from 'cheerio'
import { botName } from '../../Library/utils.js'

async function scrapeWhois(url: string) {
  const rawUrl = url.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')

  const { data: html } = await axios.get('https://fudomains.com/whois/' + rawUrl, {
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
    }
  })

  const $ = cheerio.load(html)
  const whoisRawText = $('.whoisText').text()
  const whoisLines = whoisRawText.split('\n').map((l: string) => l.trim()).filter(Boolean)

  const info: Record<string, any> = {
    domainStatus: [] as string[],
    nameServers:  [] as string[],
    dnssecData:   [] as string[]
  }

  const keyMap: Record<string, string> = {
    'Domain Name':             'domainName',
    'Registry Domain ID':      'registryDomainId',
    'Registrar WHOIS Server':  'registrarWhoisServer',
    'Registrar URL':           'registrarUrl',
    'Updated Date':            'updatedDate',
    'Creation Date':           'creationDate',
    'Registry Expiry Date':    'registryExpiryDate',
    'Registrar':               'registrar',
    'Registrar IANA ID':       'registrarIanaId',
    'DNSSEC':                  'dnssec',
  }

  for (const line of whoisLines) {
    if (line.startsWith('>>> Last update of whois database:')) {
      info.lastUpdate = line.replace('>>> Last update of whois database:', '').replace('<<<', '').trim()
      continue
    }
    const sep = line.indexOf(':')
    if (sep === -1) continue
    const key   = line.substring(0, sep).trim()
    const value = line.substring(sep + 1).trim()

    if (key === 'Domain Status')   info.domainStatus.push(value)
    else if (key === 'Name Server') info.nameServers.push(value)
    else if (key === 'DNSSEC DS Data') info.dnssecData.push(value)
    else if (keyMap[key]) info[keyMap[key]] = value
  }

  return { domain: rawUrl, info }
}

const handler = async (m: any, { reply, text, usedPrefix, command }: any) => {
  if (!text) return reply(
    `╭╌╌⬡「 🌐 *ᴡʜᴏɪs ʟᴏᴏᴋᴜᴘ* 」\n` +
    `┃\n` +
    `┃ Cek info registrasi domain\n` +
    `┃\n` +
    `┃ 📌 *Cara pakai:*\n` +
    `┃ \`${usedPrefix}${command} google.com\`\n` +
    `┃\n` +
    `╰╌╌⬡\n\n© ${botName}`
  )

  await reply('🔍 Mencari info domain...')

  try {
    const { domain, info } = await scrapeWhois(text)

    if (!info.domainName && !info.registrar) return reply(`❌ Data WHOIS tidak ditemukan untuk: *${domain}*`)

    const ns = info.nameServers?.length
      ? info.nameServers.map((n: string) => `┃   • ${n}`).join('\n')
      : '┃   -'

    const status = info.domainStatus?.length
      ? info.domainStatus.slice(0, 3).map((s: string) => `┃   • ${s.split(' ')[0]}`).join('\n')
      : '┃   -'

    return reply(
      `╭╌╌⬡「 🌐 *ᴡʜᴏɪs ʟᴏᴏᴋᴜᴘ* 」\n` +
      `┃\n` +
      `┃ 🔎 Domain   : *${info.domainName || domain}*\n` +
      `┃ 🏢 Registrar: ${info.registrar || '-'}\n` +
      `┃ 📅 Dibuat   : ${info.creationDate || '-'}\n` +
      `┃ ⏳ Expired  : ${info.registryExpiryDate || '-'}\n` +
      `┃ 🔄 Update   : ${info.updatedDate || '-'}\n` +
      `┃ 🔐 DNSSEC   : ${info.dnssec || '-'}\n` +
      `┃\n` +
      `┃ 📡 *Name Servers:*\n` +
      ns + '\n' +
      `┃\n` +
      `┃ 📊 *Status:*\n` +
      status + '\n' +
      `┃\n` +
      `╰╌╌⬡\n\n© ${botName}`
    )
  } catch (e) {
    return reply(`❌ Gagal mengambil data WHOIS\n\n${(e as Error).message}`)
  }
}

handler.command  = ['whois', 'domaininfo', 'cekdomain']
handler.tags     = ['tools']
handler.help     = ['whois <domain>']
handler.noLimit  = false
handler.owner    = false
handler.premium  = false
handler.group    = false
handler.private  = false
handler.admin    = false
handler.botAdmin = false

export default handler