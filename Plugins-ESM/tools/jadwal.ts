// @ts-nocheck
import axios from "axios"
import path from "path"
import fs from "fs"
import { bi, buildFkontak, sendCard, uploadImage, createSend, menuBuf, CHANNEL_URL, OWNER_WA, BOT_JID, imagePath, botName, botVersion } from '../../Library/utils.js'

const CHANNEL_JID = '120363420704282055@newsletter'

function buildContextInfo() {
  return {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid:   CHANNEL_JID,
      serverMessageId: 1,
      newsletterName:  botName
    },
    externalAdReply: {
      title:                 botName,
      body:                  botVersion,
      mediaType:             1,
      thumbnail:             fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : undefined,
      sourceUrl:             CHANNEL_URL,
      renderLargerThumbnail: false,
      showAdAttribution:     false
    }
  }
}

const handler = async (m: any, { Morela, args, fkontak }: any) => {
  const send = async text =>
    Morela.sendMessage(
      m.chat,
      {
        text: ' ',
        footer: bi(text),
        interactiveButtons: [
          {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
              display_text: 'Channel',
              url:          CHANNEL_URL,
              merchant_url: CHANNEL_URL
            })
          }
        ],
        contextInfo: buildContextInfo()
      },
      { quoted: fkontak || m }
    )

  if (!args[0]) {
    return send(
      '🕌 Jadwal Sholat\n\n' +
      '❌ Nama kota tidak boleh kosong!\n\n' +
      'Contoh:\n' +
      '.jadwal cirebon\n' +
      '.jadwal jakarta\n' +
      '.jadwal bandung'
    )
  }

  const city = args.join(' ')

  try {
    const now   = new Date()
    const day   = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year  = now.getFullYear()
    const today = `${day}-${month}-${year}`

    const url = `https://api.aladhan.com/v1/timingsByCity/${today}?city=${encodeURIComponent(city)}&country=Indonesia&method=11`
    const { data } = await axios.get(url)

    if (data.code !== 200) {
      return send(
        '🕌 Jadwal Sholat\n\n' +
        `❌ Kota "${city}" tidak ditemukan!\n` +
        'Pastikan nama kota benar.'
      )
    }

    const { timings, date } = data.data
    const readable   = date.readable
    const hijriDate  = date.hijri.date
    const hijriMonth = date.hijri.month.en

    return send(
      '🕌 Jadwal Sholat\n\n' +
      `📍 Kota     : ${city.toUpperCase()}\n` +
      `📅 Tanggal  : ${readable}\n` +
      `🌙 Hijriyah : ${hijriDate} ${hijriMonth}\n\n` +
      `🌄 Imsak   : ${timings.Imsak}\n` +
      `🌅 Subuh   : ${timings.Fajr}\n` +
      `🌞 Terbit  : ${timings.Sunrise}\n` +
      `☀️ Dzuhur  : ${timings.Dhuhr}\n` +
      `🌤 Ashar   : ${timings.Asr}\n` +
      `🌇 Maghrib : ${timings.Maghrib}\n` +
      `🌙 Isya    : ${timings.Isha}\n\n` +
      `© ${botName}`
    )

  } catch (err) {
    return send(
      '🕌 Jadwal Sholat\n\n' +
      '❌ Gagal mengambil jadwal sholat.\n' +
      'Pastikan nama kota benar.'
    )
  }
}

handler.command = ['jadwal', 'sholat', 'prayer']
handler.help    = ['jadwal <kota>']
handler.tags    = ['islam']

export default handler