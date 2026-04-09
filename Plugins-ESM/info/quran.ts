// @ts-nocheck
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { canvasQuranSurah, canvasQuranAyat } from '../../Library/canvas-quran.js'

const BASE = 'https://equran.id/api/v2'

const QARI: Record<string, string> = {
  '01': 'Abdullah Al-Juhany',
  '02': 'Abdul-Muhsin Al-Qasim',
  '03': 'Abdurrahman as-Sudais',
  '04': 'Ibrahim Al-Dossari',
  '05': 'Misyari Rasyid Al-Afasi',
  '06': 'Yasser Al-Dosari',
}

const pickQari = () => {
  const keys = Object.keys(QARI)
  return keys[Math.floor(Math.random() * keys.length)]
}


let _surahList: any[] | null = null
async function getSurahList() {
  if (_surahList) return _surahList
  const { data } = await axios.get(`${BASE}/surat`, { timeout: 15000 })
  _surahList = data.data
  return _surahList
}


async function resolveSurah(query: string): Promise<number | null> {
  const num = parseInt(query)
  if (!isNaN(num) && num >= 1 && num <= 114) return num
  const list = await getSurahList()
  const norm = (s: string) => s.toLowerCase().replace(/^(al|as|ar|az|at|an)-?/i, '').replace(/[\s-]/g, '')
  const q = norm(query)
  const found = list.find((s: any) => norm(s.namaLatin).startsWith(q) || norm(s.namaLatin) === q)
  return found ? found.nomor : null
}


async function downloadAudio(url: string): Promise<Buffer> {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 60000,
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })
  return Buffer.from(res.data)
}


const handler = async (m: any, { Morela, reply, text }: any) => {
  if (!text?.trim()) {
    return reply(
`╭──「 📖 *Al-Qur'an* 」
│
│  .quran alfatihah
│  .quran albaqarah ayat 255
│  .quran albaqarah ayat 1 sampai 5
│  .quran 2 ayat 255
│  .quran list
│
╰─────────────────────`)
  }

  await Morela.sendMessage(m.chat, { react: { text: '🕌', key: m.key } })

  try {
    const raw = text.trim().toLowerCase()

    
    if (raw === 'list') {
      const list = await getSurahList()
      for (let i = 0; i < list.length; i += 30) {
        const chunk = list.slice(i, i + 30)
        await Morela.sendMessage(m.chat, {
          text: `╭──「 📋 *Daftar Surah ${i+1}–${Math.min(i+30, list.length)}* 」\n│\n` +
                chunk.map((s: any) => `│  ${String(s.nomor).padStart(3,' ')}. *${s.namaLatin}* — ${s.arti}`).join('\n') +
                `\n╰─────────────────────`
        }, { quoted: m })
      }
      return await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    }

    
    const ayatMatch = raw.match(/^(.+?)\s+ayat\s+(\d+)(?:\s+sampai\s+(\d+))?$/)
    let surahQuery: string
    let ayatStart: number | null = null
    let ayatEnd:   number | null = null

    if (ayatMatch) {
      surahQuery = ayatMatch[1].trim()
      ayatStart  = parseInt(ayatMatch[2])
      ayatEnd    = ayatMatch[3] ? parseInt(ayatMatch[3]) : ayatStart
    } else {
      surahQuery = raw
    }

    
    const nomor = await resolveSurah(surahQuery)
    if (!nomor) return reply(`❌ Surah *${surahQuery}* tidak ditemukan.\nContoh: *.quran alfatihah* atau *.quran 1*`)

    const { data: res } = await axios.get(`${BASE}/surat/${nomor}`, { timeout: 15000 })
    const surah = res.data
    const qKey  = pickQari()
    const qName = QARI[qKey]

    
    if (!ayatStart) {
      const imgBuf  = await canvasQuranSurah({
        nomor: surah.nomor, nama: surah.nama, namaLatin: surah.namaLatin,
        jumlahAyat: surah.jumlahAyat, tempatTurun: surah.tempatTurun, arti: surah.arti
      })
      const audBuf  = await downloadAudio(surah.audioFull[qKey])

      
      await Morela.sendMessage(m.chat, {
        image:    imgBuf,
        caption:  `🕌 *${surah.namaLatin}* — ${surah.arti}\n📖 ${surah.jumlahAyat} ayat  •  📍 ${surah.tempatTurun}\n🎙️ *${qName}*`,
        mimetype: 'image/jpeg'
      }, { quoted: m })

      
      await Morela.sendMessage(m.chat, {
        audio:    audBuf,
        mimetype: 'audio/mpeg',
        fileName: `${surah.namaLatin}.mp3`
      })

    
    } else {
      const start = Math.max(1, ayatStart)
      const end   = Math.min(surah.jumlahAyat, ayatEnd!)

      if (start > surah.jumlahAyat)
        return reply(`❌ Surah ${surah.namaLatin} hanya punya *${surah.jumlahAyat} ayat*`)
      if (end - start > 19)
        return reply(`❌ Maksimal 20 ayat sekaligus`)

      const ayatRange = surah.ayat.filter((a: any) => a.nomorAyat >= start && a.nomorAyat <= end)

      for (const ayat of ayatRange) {
        const imgBuf = await canvasQuranAyat({
          nomor: surah.nomor, nama: surah.nama, namaLatin: surah.namaLatin,
          jumlahAyat: surah.jumlahAyat, tempatTurun: surah.tempatTurun, arti: surah.arti,
          ayatNum: ayat.nomorAyat, teksArab: ayat.teksArab,
          teksLatin: ayat.teksLatin, teksIndonesia: ayat.teksIndonesia
        })
        const audBuf = await downloadAudio(ayat.audio[qKey])

        
        await Morela.sendMessage(m.chat, {
          image:    imgBuf,
          caption:  `📖 *${surah.namaLatin} : Ayat ${ayat.nomorAyat}*\n\n${ayat.teksArab}\n\n_${ayat.teksLatin.trim()}_\n\n${ayat.teksIndonesia}\n\n🎙️ *${qName}*`,
          mimetype: 'image/jpeg'
        }, { quoted: m })

        
        await Morela.sendMessage(m.chat, {
          audio:    audBuf,
          mimetype: 'audio/mpeg',
          fileName: `${surah.namaLatin}_ayat${ayat.nomorAyat}.mp3`
        })
      }
    }

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    console.error('[QURAN ERROR]', (e as Error).message)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply(`❌ Gagal: ${(e as Error).message}`)
  }
}

handler.help    = ['quran <surah>', 'quran <surah> ayat <n>', 'quran <surah> ayat <n> sampai <m>']
handler.tags    = ['info', 'islami']
handler.command = ['quran', 'alquran', 'qs']

export default handler