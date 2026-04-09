// @ts-nocheck
import axios        from 'axios'
import * as cheerio from 'cheerio'
import fs           from 'fs'
import { bi, CHANNEL_URL, imagePath, botName } from '../../Library/utils.js'

const BASE = 'https://www.transfermarkt.co.id'
const HDR  = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
}

function fmtRp(raw) {
  if (!raw || raw === 'N/A' || raw === '-') return raw || 'N/A'
  const RATE = 17000
  if (raw.includes('Mlyr')) { const v = parseFloat(raw.replace('Mlyr.','').replace(',','.').trim()); return `€${(v*1000000000/RATE/1000000).toFixed(2)}M` }
  if (raw.includes('Jt'))   { const v = parseFloat(raw.replace('Jt.','').replace(',','.').trim());   return `€${(v*1000000/RATE/1000000).toFixed(2)}M` }
  if (raw.includes('Rb'))   { const v = parseFloat(raw.replace('Rb.','').replace(',','.').trim());   return `€${(v*1000/RATE/1000).toFixed(2)}K` }
  return raw
}


async function getPlayer(query: string) {
  
  const { data: sData } = await axios.get(`${BASE}/schnellsuche/ergebnis/schnellsuche`, {
    params: { query }, headers: HDR, timeout: 20000
  })
  const $s = cheerio.load(sData)

  const playerLink = $s('a[href*="/profil/spieler/"]').filter((_, el) => {
    const href = $s(el).attr('href') || ''
    return /^\/[^/]+\/profil\/spieler\/\d+$/.test(href) && $s(el).text().trim().length > 1
  }).first()

  if (!playerLink.length) {
    throw new Error(`Pemain "${query}" tidak ditemukan di Transfermarkt.`)
  }

  const href          = playerLink.attr('href') || ''
  const id            = href.match(/spieler\/(\d+)/)?.[1]!
  const slug          = href.split('/')[1]
  const nameFromSearch = playerLink.text().trim()

  
  const { data: pData } = await axios.get(`${BASE}/${slug}/profil/spieler/${id}`, {
    headers: HDR, timeout: 20000
  })
  const $p = cheerio.load(pData)

  
  const info: Record<string, string> = {}
  let lbl = ''
  $p('.info-table .info-table__content').each((i, el) => {
    const t = $p(el).text().trim().replace(/\s+/g, ' ')
    if (i % 2 === 0) lbl = t
    else if (lbl) { info[lbl] = t; lbl = '' }
  })

  
  const trophies: string[] = []
  $p('.data-header__success-data').each((_, el) => {
    const title = $p(el).attr('title')
    const count = $p(el).find('.data-header__success-number').text().trim()
    if (title) trophies.push(`${count}x ${title}`)
  })

  
  const mvEl = $p('a.data-header__market-value-wrapper').clone()
  mvEl.find('p').remove()
  const marketValue = mvEl.text().trim().replace(/\s+/g, '') || 'N/A'

  
  const shirtnumber = $p('span.data-header__shirt-number').text().replace('#', '').trim() || '-'
  const isCaptain   = $p('img[alt="Kapten"]').length > 0

  
  const league = $p('.data-header__league-link').text().trim().replace(/\s+/g, ' ') || '-'

  
  const image = $p('.data-header__profile-image').attr('src') || null

  
  const headerItemsText = $p('.data-header__items').text().trim().replace(/\s+/g, ' ')
  
  const timnasNama  = headerItemsText.match(/Pemain Internasional saat ini:\s*([^\n]+?)(?:Jumlah|$)/)?.[1]?.trim() || '-'
  const timnasCapRaw = headerItemsText.match(/Jumlah penampilan \/ Gol:\s*([\d]+)\s*\/\s*([\d]+)/)
  const timnasCap   = timnasCapRaw ? `${timnasCapRaw[1]} cap / ${timnasCapRaw[2]} gol` : '-'

  
  const nameClean = $p('h1.data-header__headline-wrapper strong').text().trim() || nameFromSearch

  
  const timnasCareer: any[] = []
  try {
    
    const timnasHref = $p('a[href*="nationalmannschaft"]').first().attr('href') || ''
    if (timnasHref) {
      const { data: ntData } = await axios.get(`${BASE}${timnasHref}`, {
        headers: HDR, timeout: 15000
      })
      const $nt = cheerio.load(ntData)

      
      $nt('.grid-view').each((_, section) => {
        const $sec  = $nt(section)
        const nama  = $sec.find('h2.content-box-headline').text().trim()
        if (!nama) return

        
        const row0  = $sec.find('table.items tbody tr').first()
        const cols  = row0.find('td')
        if (!cols.length) return

        const debut  = $sec.find('table.items tbody tr').last().find('td').eq(3).text().trim()
        const apps   = $sec.find('.tabellenplatz').text().trim() || '-'

        
        const footer = $sec.find('tfoot tr td')
        const totalApps  = footer.eq(1).text().trim() || '-'
        const totalGoals = footer.eq(2).text().trim() || '-'

        timnasCareer.push({ nama, apps: totalApps, goals: totalGoals })
      })
    }
  } catch {  }

  
  const { data: statData } = await axios.get(`${BASE}/${slug}/leistungsdaten/spieler/${id}`, {
    headers: HDR, timeout: 20000
  })
  const $st = cheerio.load(statData)

  const stats: any[] = []
  $st('table.items tbody tr').each((_, row) => {
    const cols = $st(row).find('td')
    if (cols.length < 5) return
    const comp        = $st(cols[1]).text().trim().replace(/\s+/g, ' ')
    const apps        = $st(cols[2]).text().trim()
    const goals       = $st(cols[3]).text().trim()
    const assist      = $st(cols[4]).text().trim()
    const kuning      = $st(cols[5]).text().trim()
    const kuningMerah = $st(cols[6]).text().trim()
    const merah       = $st(cols[7]).text().trim()
    const menit       = $st(cols[8]).text().trim()
    if (comp && comp.length > 1 && apps && apps !== '-') {
      stats.push({ comp, apps, goals, assist, kuning, kuningMerah, merah, menit })
    }
  })

  
  const careerStats: any[] = []
  try {
    const { data: cdData } = await axios.get(
      `${BASE}/${slug}/leistungsdatendetails/spieler/${id}/saison/ges/verein/0/liga/0/wettbewerb//pos/0/trainer_id/0/assisted/1/zuschauer/0/`,
      { headers: HDR, timeout: 20000 }
    )
    const $cd = cheerio.load(cdData)
    const agg: Record<string, {apps:number,goals:number,assist:number,menit:number}> = {}
    $cd('table.items tbody tr').each((_, row) => {
      const cols = $cd(row).find('td')
      if (cols.length < 8) return
      const comp   = $cd(cols[2]).text().trim().replace(/\s+/g, ' ')
      const apps   = parseInt($cd(cols[4]).text().trim()) || 0
      const goals  = parseInt($cd(cols[5]).text().trim()) || 0
      const assist = parseInt($cd(cols[6]).text().trim()) || 0
      const menit  = parseInt($cd(cols[8]).text().replace(/[^0-9]/g,'')) || 0
      if (!comp || !apps) return
      if (!agg[comp]) agg[comp] = {apps:0,goals:0,assist:0,menit:0}
      agg[comp].apps   += apps
      agg[comp].goals  += goals
      agg[comp].assist += assist
      agg[comp].menit  += menit
    })
    for (const [comp, v] of Object.entries(agg)) {
      careerStats.push({comp, ...v})
    }
    careerStats.sort((a,b) => b.apps - a.apps)
  } catch {}

  return {
    id, slug,
    name:        nameClean,
    image,
    club:        info['Klub Saat Ini:']         || $p('.data-header__club a').first().text().trim() || 'N/A',
    fullName:    info['Nama lengkap:']           || '-',
    age:         info['Tanggal lahir / Umur:']   || '-',
    birthplace:  info['Tempat kelahiran:']       || '-',
    height:      info['Tinggi:']                 || '-',
    nationality: info['Kewarganegaraan:']        || '-',
    position:    info['Posisi:']                 || '-',
    foot:        info['Kaki dominan:']           || '-',
    agent:       info['Agen pemain:']?.replace(/\s+/g, ' ').trim() || '-',
    joined:      info['Bergabung:']              || '-',
    contract:    info['Kontrak berakhir:']       || '-',
    sponsor:     info['Penjual pakaian swasta:'] || '-',
    lastRenewal: info['Perpanjangan kontrak terakhir:'] || '-',
    marketValue,
    trophies,
    stats: stats.slice(0, 6),
    careerStats: careerStats.slice(0, 10),
    shirtnumber, isCaptain, league,
    timnasNama, timnasCap, timnasCareer
  }
}


async function searchClub(query: string) {
  const { data } = await axios.get(`${BASE}/schnellsuche/ergebnis/schnellsuche`, {
    params: { query }, headers: HDR, timeout: 20000
  })
  const $ = cheerio.load(data)
  const results: any[] = []

  $('a[href*="/verein/"]').filter((_, el) => {
    return /^\/[^/]+\/[^/]+\/verein\/\d+$/.test($(el).attr('href') || '')
  }).each((_, el) => {
    if (results.length >= 5) return false
    const href  = $(el).attr('href') || ''
    const id    = href.match(/verein\/(\d+)/)?.[1]
    const slug  = href.split('/')[1]
    const name  = $(el).text().trim()
    const row   = $(el).closest('tr')
    const liga  = row.find('td').eq(2).text().trim()
    const nilai = row.find('.rechts').last().text().trim()
    if (name && id && !results.find(r => r.id === id)) {
      results.push({ name, id, slug, liga, nilai })
    }
  })
  return results
}

async function getKlub(slug: string, id: string) {
  const url = `${BASE}/${slug}/kader/verein/${id}`
  const { data } = await axios.get(url, { headers: HDR, timeout: 20000 })
  const $ = cheerio.load(data)

  const namaKlub   = $('h1.data-header__headline-wrapper strong').text().trim() ||
                     $('.data-header__headline-wrapper').text().trim()
  const liga       = $('.data-header__club a').eq(1).text().trim()
  const logoUrl    = $('.data-header__profile-image').attr('src') || ''
  const mvEl       = $('a.data-header__market-value-wrapper').clone()
  mvEl.find('p').remove()
  const totalNilai = mvEl.text().trim().replace(/\s+/g, '') || '-'

  const players: any[] = []
  const seen = new Set<string>()

  $('a[href*="/profil/spieler/"]').filter((_, el) => {
    return /^\/[^/]+\/profil\/spieler\/\d+$/.test($(el).attr('href') || '')
  }).each((_, el) => {
    const name = $(el).text().trim()
    if (!name || seen.has(name)) return
    seen.add(name)
    const href = $(el).attr('href') || ''
    const pid  = href.match(/spieler\/(\d+)/)?.[1]
    const row  = $(el).closest('tr')
    const val  = row.find('.rechts.hauptlink').text().trim() ||
                 row.find('td.rechts').last().text().trim()
    players.push({ name, val: val || '-', pid })
  })

  return { namaKlub, liga, logoUrl, totalNilai, players, url }
}


const handler = async (m: any, { Morela, reply, text, args, usedPrefix, fkontak }: any) => {
  const sub   = args[0]?.toLowerCase()
  const thumb = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : undefined

  if (!text) return Morela.sendMessage(m.chat, {
    text:
      `╭╌╌⬡「 ⚽ *${bi('Transfermarkt')}* 」\n` +
      `┃\n` +
      `┃ 📌 *Commands:*\n` +
      `┃ \`${usedPrefix}tm <nama pemain>\`\n` +
      `┃ \`${usedPrefix}tm klub <nama klub>\`\n` +
      `┃\n` +
      `┃ 📝 *Contoh:*\n` +
      `┃ \`${usedPrefix}tm Rizky Ridho\`\n` +
      `┃ \`${usedPrefix}tm klub persija\`\n` +
      `┃\n` +
      `╰╌╌⬡\n\n© ${botName}`,
    contextInfo: {
      externalAdReply: {
        title: '⚽ Transfermarkt', body: `${botName} Multidevice 🔥`,
        mediaType: 1, renderLargerThumbnail: false,
        showAdAttribution: false, sourceUrl: CHANNEL_URL, thumbnail: thumb
      }
    }
  }, { quoted: fkontak || m })

  
  if (sub === 'klub') {
    const query = args.slice(1).join(' ')
    if (!query) return reply(`Contoh: \`${usedPrefix}tm klub persija\``)

    await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })
    await reply(`🔍 Mencari klub *${query}*...`)

    try {
      const clubs = await searchClub(query)
      if (!clubs.length) {
        await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        return reply(`❌ Klub *${query}* tidak ditemukan`)
      }

      const club = clubs[0]
      const { namaKlub, liga, logoUrl, totalNilai, players } = await getKlub(club.slug, club.id)

      let logo: any = thumb
      if (logoUrl) try {
        logo = Buffer.from((await axios.get(logoUrl, {
          responseType: 'arraybuffer', headers: HDR, timeout: 8000
        })).data)
      } catch {}

      const sorted = [...players].sort((a: any, b: any) => {
        const n = (v: string) => {
          const x = parseFloat(v.replace(',', '.'))
          return v.includes('Mlyr') ? x : v.includes('Jt') ? x / 1000 : 0
        }
        return n(b.val) - n(a.val)
      })

      let playerTxt = ''
      for (const p of sorted.slice(0, 15))
        playerTxt += `┃ ◦ ${p.name.slice(0, 22).padEnd(22)} → ${fmtRp(p.val)}\n`
      if (players.length > 15) playerTxt += `┃ ◦ ...dan ${players.length - 15} pemain lainnya\n`

      const caption =
        `╭╌╌⬡「 🏟️ *${bi(namaKlub || club.name)}* 」\n` +
        `┃\n` +
        `┃ 🏆 Liga     : ${liga || club.liga || '-'}\n` +
        `┃ 👥 Pemain   : *${players.length} pemain*\n` +
        `┃ 💰 Total MV : *${fmtRp(totalNilai) || '-'}*\n` +
        `┃\n` +
        `┃ 📋 *SQUAD (nilai pasar):*\n` +
        playerTxt +
        `┃\n` +
        `╰╌╌⬡\n\n© ${botName}`

      await Morela.sendMessage(m.chat, {
        image: logo, caption,
        contextInfo: {
          externalAdReply: {
            title: `🏟️ ${namaKlub || club.name}`, body: `${botName} Multidevice 🔥`,
            mediaType: 1, renderLargerThumbnail: false, showAdAttribution: false,
            sourceUrl: `${BASE}/${club.slug}/kader/verein/${club.id}`, thumbnail: thumb
          }
        }
      }, { quoted: fkontak || m })

      await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e: any) {
      await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      reply(`❌ ${e.message}`)
    }
    return
  }

  
  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })
  await reply(`🔍 Mencari *${text}*...`)

  try {
    const d = await getPlayer(text)

    let foto: any = thumb
    if (d.image) try {
      foto = Buffer.from((await axios.get(d.image, {
        responseType: 'arraybuffer', headers: HDR, timeout: 8000
      })).data)
    } catch {}

    
    let statsTxt = ''
    if (d.stats.length) {
      statsTxt = `┃\n┃ 📊 *STATISTIK MUSIM INI*\n`
      for (const s of d.stats) {
        statsTxt +=
          `┃ ◦ *${s.comp}*\n` +
          `┃   ▸ Main: ${s.apps}  Gol: ${s.goals}  Assist: ${s.assist}\n` +
          `┃   ▸ 🟨 ${s.kuning}  🟨🟥 ${s.kuningMerah}  🟥 ${s.merah}  ⏱ ${s.menit}\n`
      }
    }

    
    let trophyTxt = ''
    if (d.trophies.length) {
      trophyTxt = `┃\n┃ 🏆 *GELAR & TROFI*\n`
      for (const t of d.trophies) trophyTxt += `┃ ◦ ${t}\n`
    }

    
    let timnasTxt = ''
    if (d.timnasNama !== '-') {
      timnasTxt = `┃\n┃ 🌏 *TIM NASIONAL*\n`
      timnasTxt += `┃ ◦ Tim : *${d.timnasNama}*\n`
      timnasTxt += `┃ ◦ Cap : ${d.timnasCap}\n`
      if (d.timnasCareer.length) {
        for (const tc of d.timnasCareer) {
          timnasTxt += `┃ ◦ ${tc.nama} — ${tc.apps} main / ${tc.goals} gol\n`
        }
      }
    }

    const caption =
      `╭╌╌⬡「 ⚽ *${bi(d.name)}* 」\n` +
      `┃\n` +
      `┃ 👤 *PROFIL*\n` +
      `┃ ◦ Nama Lengkap  : ${d.fullName}\n` +
      `┃ ◦ Lahir         : ${d.age}\n` +
      `┃ ◦ Tempat Lahir  : ${d.birthplace}\n` +
      `┃ ◦ Kewarganeg.   : ${d.nationality}\n` +
      `┃ ◦ Tinggi        : ${d.height}\n` +
      `┃ ◦ Kaki Dominan  : ${d.foot}\n` +
      `┃ ◦ Posisi        : ${d.position}\n` +
      `┃ ◦ No. Punggung  : ${d.shirtnumber}${d.isCaptain ? ' 🅒 *Kapten*' : ''}\n` +
      `┃\n` +
      `┃ 🏟️ *KLUB*\n` +
      `┃ ◦ Klub Sekarang : *${d.club}*\n` +
      `┃ ◦ Liga          : ${d.league}\n` +
      `┃ ◦ Bergabung     : ${d.joined}\n` +
      `┃ ◦ Kontrak s/d   : ${d.contract}\n` +
      `┃ ◦ Perpanjangan  : ${d.lastRenewal}\n` +
      `┃ ◦ Agen          : ${d.agent}\n` +
      `┃ ◦ Sponsor       : ${d.sponsor}\n` +
      `┃\n` +
      `┃ 💰 *NILAI PASAR*\n` +
      `┃ ◦ *${fmtRp(d.marketValue)}*\n` +
      timnasTxt +
      trophyTxt +
      statsTxt +
      `┃\n` +
      (d.careerStats?.length ? [`┃`, `┃ 📈 *CAREER STATS (semua musim)*`].join('\n') + '\n' + d.careerStats.map((cs) => `┃ ◦ *${cs.comp}* — ${cs.apps}x main, ${cs.goals} gol, ${cs.assist} assist, ${Math.floor(cs.menit/90)} jam`).join('\n') + '\n' : '') +
      `╰╌╌⬡\n\n© ${botName}`

    await Morela.sendMessage(m.chat, {
      image: foto, caption,
      contextInfo: {
        externalAdReply: {
          title: `⚽ ${d.name}`, body: `${botName} Multidevice 🔥`,
          mediaType: 1, renderLargerThumbnail: false, showAdAttribution: false,
          sourceUrl: `${BASE}/${d.slug}/profil/spieler/${d.id}`, thumbnail: thumb
        }
      }
    }, { quoted: fkontak || m })

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e: any) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply(`❌ ${e.message}`)
  }
}

handler.command  = ['tm', 'transfermarkt', 'tmklub']
handler.tags     = ['info']
handler.help     = ['tm <nama pemain>', 'tm klub <nama klub>']
handler.owner    = false
handler.premium  = false
handler.noLimit  = false
handler.group    = false
handler.private  = false
handler.admin    = false
handler.botAdmin = false

export default handler