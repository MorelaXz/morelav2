import path from 'path'
import axios from 'axios'
import fs from 'fs'
import { execSync } from 'child_process'

const SESSION_FILE = path.join(process.cwd(), 'data/tebaksurah.json')

export function loadSessions() {
  try {
    if (!fs.existsSync(SESSION_FILE)) return {}
    return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'))
  } catch { return {} }
}

export function saveSessions(data: unknown[]) {
  try {
    fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true })
    
    const _tmp = SESSION_FILE + '.tmp';
    fs.writeFileSync(_tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(_tmp, SESSION_FILE);
  } catch (e) {
    console.error('[TEBAKSURAH] Gagal simpan session:', (e as Error).message)
  }
}


function mp3ToOpus(mp3Buffer: Buffer): Buffer {
  const tempDir = path.join(process.cwd(), 'media', 'temp')
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

  const stamp   = Date.now()
  const mp3Path = path.join(tempDir, `${stamp}_ts.mp3`)
  const oggPath = path.join(tempDir, `${stamp}_ts.ogg`)

  try {
    fs.writeFileSync(mp3Path, mp3Buffer)
    execSync(
      `ffmpeg -y -i "${mp3Path}" -c:a libopus -b:a 48k -vbr on -ar 48000 -ac 1 "${oggPath}"`,
      { stdio: 'pipe', timeout: 30000 }
    )
    const result = fs.readFileSync(oggPath)
    return result
  } finally {
    if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path)
    if (fs.existsSync(oggPath)) fs.unlinkSync(oggPath)
  }
}

const handler = async (m: any, { Morela, reply, fkontak }: any) => {
  await Morela.sendMessage(m.chat, { react: { text: "🕌", key: m.key } })

  try {
    const { data } = await axios.get('https://api.deline.web.id/game/tebaksurah', {
      timeout: 15000
    })

    if (!data?.status || !data?.result) throw new Error("Gagal ambil soal")

    const r        = data.result
    const surah    = r.surah
    const ayahNum  = r.numberInSurah
    const qari     = r.edition?.englishName || 'Alafasy'

    const jawabanEn = surah.englishName.toUpperCase()
    const jawabanAr = surah.name.replace(/سُورَةُ\s*/g, '').trim()

    const sessions = loadSessions()
    sessions[m.sender] = {
      chat:        m.chat,
      timestamp:   Date.now(),
      jawabanEn,
      jawabanAr,
      surahNumber: surah.number,
      surahName:   surah.englishName,
      surahAr:     surah.name,
      translation: surah.englishNameTranslation,
      ayahNum,
      qari,
      lastWrong:   0,
      timedOut:    false
    }
    saveSessions(sessions)

    await Morela.sendMessage(m.chat, {
      text:
`╭──「 🕌 *Tebak Surah* 」
│
│  Dengarkan audio & tebak nama surahnya!
│
│  📖 *Ayat ke*  » ${ayahNum}
│  🎙️ *Qari*    » ${qari}
│  ⏰ *Waktu*    » 90 detik
│
│  Ketik nama surah (Inggris/Arab)
│  💡 *Contoh:* Al-Fatihah / Al-Baqarah
│
│  Atau ketik *nyerah* untuk menyerah
╰─────────────────────
_© Morela Bot_`
    }, { quoted: fkontak || m })

    
    const audioRes = await axios.get(r.audio, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const mp3Buffer = Buffer.from(audioRes.data)

    
    let audioBuffer: Buffer
    let mimetype: string
    let ptt: boolean

    try {
      audioBuffer = mp3ToOpus(mp3Buffer)
      mimetype    = 'audio/ogg; codecs=opus'
      ptt         = true
    } catch (ffErr) {
      console.warn('[TEBAKSURAH] ffmpeg gagal, fallback ke mp3:', (ffErr as Error).message)
      audioBuffer = mp3Buffer
      mimetype    = 'audio/mpeg'
      ptt         = false  
    }

    await Morela.sendMessage(m.chat, {
      audio: audioBuffer,
      mimetype,
      ptt
    }, { quoted: fkontak || m })

    await Morela.sendMessage(m.chat, { react: { text: "✅", key: m.key } })

  } catch (e) {
    console.error('[TEBAKSURAH ERROR]', (e as Error).message)
    await Morela.sendMessage(m.chat, { react: { text: "❌", key: m.key } })
    return reply(
`╭──「 ❌ *Gagal Ambil Soal* 」
│
│  ${(e as Error).message}
╰─────────────────────`
    )
  }
}

handler.help    = ['tebaksurah']
handler.tags    = ['game']
handler.command = ['tebaksurah', 'ts']

export default handler
