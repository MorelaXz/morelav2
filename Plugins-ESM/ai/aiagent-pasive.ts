
import axios from 'axios'
import { writeFile } from 'fs/promises'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { botName } from '../../Library/utils.js'
import { isMainOwner } from '../../System/mainowner.js'
import { getPhoneByLid } from '../../Database/db.js'


const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const BOT_ROOT   = path.resolve(__dirname, '../..')
const PLUGIN_DIR = path.resolve(__dirname, '..')


if (!globalThis.__aiAgentStatus__)     globalThis.__aiAgentStatus__     = {}
if (!globalThis.__aiAgentHistory__)    globalThis.__aiAgentHistory__    = {}
if (!globalThis.__aiAgentLock__)       globalThis.__aiAgentLock__       = new Set()

if (!globalThis.__aiAgentHistoryTs__)  globalThis.__aiAgentHistoryTs__  = {}



const _AI_HISTORY_TTL_MS = 6 * 60 * 60 * 1000   
const _AI_HISTORY_MAX_KEYS = 200                   
setInterval(() => {
  try {
    const now  = Date.now()
    const ts   = globalThis.__aiAgentHistoryTs__ as Record<string, number>
    const hist = globalThis.__aiAgentHistory__   as Record<string, unknown[]>
    let cleaned = 0
    for (const key of Object.keys(ts)) {
      if (now - (ts[key] || 0) > _AI_HISTORY_TTL_MS) {
        delete hist[key]
        delete ts[key]
        cleaned++
      }
    }
    
    const keys = Object.keys(ts).sort((a, b) => (ts[a] || 0) - (ts[b] || 0))
    if (keys.length > _AI_HISTORY_MAX_KEYS) {
      const excess = keys.slice(0, keys.length - _AI_HISTORY_MAX_KEYS)
      for (const k of excess) { delete hist[k]; delete ts[k]; cleaned++ }
    }
    if (cleaned > 0) console.log(`[AI-HISTORY] Cleanup: ${cleaned} stale entries dihapus`)
  } catch {}
}, 30 * 60 * 1000) 


const OPENROUTER_API_KEY = 'YOUR_TOKEN_HERE'

const MODEL_ID    = 'arcee-ai/trinity-large-preview:free'
const MODEL_LABEL = '🚀 Google Lyria 3 Pro'




const SYSTEM_PROMPT_BASE = `Kamu adalah Morela, asisten AI berbasis WhatsApp yang dikembangkan oleh Alputraa.

Kepribadian: profesional, komunikatif, dan kompeten di bidang IT & teknologi.
Jawab dengan bahasa Indonesia yang jelas dan terstruktur.
Kalau user nanya hal teknis, berikan penjelasan yang akurat dan mudah dipahami.
Jangan pernah mengaku sebagai Claude, GPT, Gemini, atau AI lain. Kamu HANYA Morela.

FORMAT WHATSAPP — WAJIB DIIKUTI, TIDAK BOLEH DILANGGAR:
- DILARANG KERAS menggunakan tanda * (asterisk/bintang) dalam bentuk apapun — baik *bold*, **bold**, maupun bullet point *
- DILARANG KERAS menggunakan ## atau ### atau # untuk heading/judul
- DILARANG menggunakan _ (underscore) untuk italic
- DILARANG menggunakan markdown formatting apapun
- Gunakan HURUF KAPITAL untuk penekanan kata penting jika perlu
- Gunakan emoji sebagai pengganti bullet point: 🔹 ✅ 📌 🎯 dll
- Gunakan tanda — atau : untuk memisahkan label dan nilai
- Gunakan garis pemisah seperti ──────────── jika perlu membagi section
- Boleh panjang asal rapi dan mudah dibaca

CONTOH FORMAT YANG BENAR:
🎯 Fitur Download
🎵 Download lagu — sebutkan nama lagu/artis
📥 Download video — kirim link TikTok/IG/YT

CONTOH FORMAT YANG SALAH (JANGAN LAKUKAN):
**Fitur Download**
- *Download lagu* — sebutkan nama lagu
## Fitur

GAYA KOMUNIKASI:
- Bahasa Indonesia formal-santai (tidak kaku, tapi jelas)
- Langsung ke inti, tanpa basa-basi berlebihan
- Boleh jawab panjang kalau perlu, asal terstruktur dan rapi

ATURAN TOOL — WAJIB LANGSUNG DIPANGGIL, JANGAN NANYA DULU:

1. download_music → Panggil SEGERA kalau ada kata: lagu, musik, mp3, download lagu, cari lagu, atau nama artis/judul lagu.
   Langsung eksekusi tanpa tanya "lagu apa?" — gunakan query yang ada.
2. download_video → Panggil SEGERA kalau ada link TikTok/IG/YT/Twitter atau kata "download video/reels/shorts".

PRINSIP UTAMA: Jangan minta klarifikasi untuk request download. Langsung eksekusi.
Respond SELALU dalam bahasa Indonesia kecuali user pakai bahasa lain.`





const SYSTEM_PROMPT_MAIN_OWNER = `

═══════════════════════════════════════════════════
  MODE MAIN OWNER — AKSES PENUH SERVER
═══════════════════════════════════════════════════

Tool tambahan tersedia:
▸ read_file      — baca isi file di server
▸ list_files     — lihat daftar file/folder di server
▸ write_plugin   — tulis plugin baru (AUTO-RELOAD)
▸ scan_and_count — scan semua file & hitung total baris kode
▸ check_logs     — baca log error/output terbaru dari pm2
▸ analyze_error  — analisis error log + diagnosis + solusi
▸ find_plugin    — cari file plugin berdasarkan nama command/fitur/kata kunci

ATURAN TOOL TAMBAHAN — WAJIB LANGSUNG DIPANGGIL:

4. list_files     → Panggil kalau ada kata: "lihat folder", "ada file apa", "isi folder", "struktur bot", "plugin apa aja", "list file".
5. read_file      → Panggil kalau ada kata: "baca file", "lihat kode", "cek file", "isi file", atau menyebut nama file.
6. write_plugin   → Panggil LANGSUNG kalau ada kata: "buat plugin", "convert plugin", "tulis kode", "bikin fitur", "tambah command".
   PENTING: Langsung tulis dan simpan plugin — JANGAN cek file lain dulu, JANGAN find_plugin dulu, JANGAN fetch_url dulu.
   Buat plugin sesuai permintaan user, simpan, selesai.
   WAJIB: Selalu gunakan ekstensi .ts (TypeScript), BUKAN .js. Contoh filename: "tools/bratv2.ts"
7. scan_and_count → Panggil SEGERA kalau ada kata: "hitung baris", "berapa baris kode", "scan semua file", "total kode", "cek semua file", "line of code", "LOC".
8. check_logs     → Panggil SEGERA kalau ada kata: "cek log", "lihat error", "log terbaru", "ada error apa", "pm2 log".
9. analyze_error  → Panggil SEGERA kalau user paste stack trace/error message, atau ada kata: "debug", "kenapa error", "fix error", "analisis error ini".
10. find_plugin   → Panggil HANYA kalau user minta LIHAT atau CARI kode plugin yang sudah ada. Jangan panggil ini untuk membuat plugin baru.
    Setelah find_plugin menemukan file → langsung panggil read_file untuk baca isi file tersebut.

ALUR DEBUG OTOMATIS:
Kalau user bilang "ada error" tanpa paste error → check_logs dulu → lalu analyze_error dari hasil log.
Kalau user paste error langsung → analyze_error langsung → kalau perlu fix kode → write_plugin.

══ FORMAT PLUGIN MORELA ══════════════════════════════

WAJIB: Simpan sebagai file .ts (TypeScript). Contoh filename yang benar: "tools/bratv2.ts"
DILARANG: Jangan pernah simpan sebagai .js

\`\`\`typescript
// @ts-nocheck
import axios from 'axios'
import { botName } from '../../Library/utils.js'

const handler = async (m, { Morela, reply, command, text, args, isOwn, isPrem, isAdmin, botAdmin, fkontak, usedPrefix }) => {
  if (!text) return reply(\`Contoh: \${usedPrefix}\${command} <input>\`)
  try {
    await reply('hasilnya di sini')
  } catch (e) {
    reply(\`❌ Error: \${e.message}\`)
  }
}

handler.command  = ['namacommand']
handler.tags     = ['tools']
handler.owner    = false
handler.premium  = false
handler.noLimit  = false
handler.help     = ['namacommand <input>']
export default handler
\`\`\`

PENTING:
- SELALU export default
- SELALU simpan sebagai .ts bukan .js
- Gunakan Morela.sendMessage bukan conn/sock/client
`




const TOOLS_BASE = [
  {
    type: 'function',
    function: {
      name:        'download_video',
      description: 'Download video dari TikTok, Instagram Reels, YouTube Shorts, Twitter/X, Facebook, dll.',
      parameters:  { type: 'object', properties: { url: { type: 'string', description: 'URL video' } }, required: ['url'] },
    },
  },
  {
    type: 'function',
    function: {
      name:        'download_music',
      description: 'Cari dan download lagu/musik dari YouTube. Panggil SEGERA kalau user sebut nama lagu/artis.',
      parameters:  { type: 'object', properties: { query: { type: 'string', description: 'Nama lagu atau artis' } }, required: ['query'] },
    },
  },
]




const TOOLS_MAIN_OWNER_EXTRA = [
  {
    type: 'function',
    function: {
      name:        'list_files',
      description: 'Lihat daftar file dan folder di direktori tertentu di server bot.',
      parameters:  {
        type: 'object',
        properties: {
          dirpath: { type: 'string', description: 'Path direktori relatif dari root bot. Default "."' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name:        'read_file',
      description: 'Baca isi file di server bot.',
      parameters:  {
        type: 'object',
        properties: {
          filepath: { type: 'string', description: 'Path file relatif dari root bot.' },
        },
        required: ['filepath'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name:        'write_plugin',
      description: 'Tulis/simpan plugin baru ke Plugins-ESM/. WAJIB menggunakan ekstensi .ts (TypeScript). Contoh filename: "tools/bratv2.ts". DILARANG pakai .js.',
      parameters: {
        type: 'object',
        properties: {
          filename: { type: 'string', description: 'Nama file dengan subfolder. WAJIB ekstensi .ts. Contoh: "tools/bratv2.ts"' },
          code:     { type: 'string', description: 'Isi kode plugin TypeScript lengkap format Morela dengan export default.' },
        },
        required: ['filename', 'code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name:        'scan_and_count',
      description: 'Scan SEMUA file kode (.ts, .js, dll) di seluruh direktori bot secara rekursif dan hitung total baris kode per file maupun keseluruhan.',
      parameters: {
        type: 'object',
        properties: {
          extensions: {
            type:        'array',
            items:       { type: 'string' },
            
            description: 'Ekstensi file yang ingin discan. Default: [".ts"] karena semua plugin Morela adalah TypeScript.',
          },
          dirpath: {
            type:        'string',
            description: 'Direktori yang ingin discan. Default: "." (root bot)',
          },
          skip_dirs: {
            type:        'array',
            items:       { type: 'string' },
            description: 'Folder yang ingin di-skip. Default: node_modules, .git, dist, build',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name:        'check_logs',
      description: 'Baca log error/output terbaru dari pm2 atau file log bot. Panggil kalau ada kata: "cek log", "lihat error", "log terbaru", "pm2 log", "ada error apa".',
      parameters: {
        type: 'object',
        properties: {
          lines: {
            type:        'number',
            description: 'Berapa baris log terakhir yang ingin dibaca. Default: 50',
          },
          type: {
            type:        'string',
            enum:        ['error', 'out', 'all'],
            description: 'Jenis log: error (stderr), out (stdout), all (keduanya). Default: all',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name:        'analyze_error',
      description: 'Analisis error log/stack trace dan berikan diagnosis + solusi. Panggil kalau ada kata: "error ini", "kenapa error", "debug", "fix error", "analisis error", atau user paste stack trace/error message.',
      parameters: {
        type: 'object',
        properties: {
          error_text: {
            type:        'string',
            description: 'Teks error, stack trace, atau log yang ingin dianalisis',
          },
          context: {
            type:        'string',
            description: 'Konteks tambahan: nama file, plugin, atau situasi saat error terjadi (opsional)',
          },
        },
        required: ['error_text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name:        'find_plugin',
      description: 'Cari file plugin berdasarkan nama command, nama file, atau kata kunci. Panggil SEGERA kalau user menyebut nama command/fitur/plugin yang ingin dilihat kodenya, misal "cek file tohijab", "plugin sticker ada di mana", "file yang handle command ytdl", "api apa yang dipakai di download".',
      parameters: {
        type: 'object',
        properties: {
          keyword: {
            type:        'string',
            description: 'Nama command, nama fitur, atau kata kunci yang dicari. Contoh: "tohijab", "ytdl", "sticker", "openai"',
          },
        },
        required: ['keyword'],
      },
    },
  },
]




function getSenderNum(m) {
  const raw = m.sender || m.key?.participant || m.key?.remoteJid || ''
  let num = raw.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
  if (raw.endsWith('@lid')) {
    try {
      const resolved = getPhoneByLid(num)
      if (resolved) num = resolved.replace(/[^0-9]/g, '')
    } catch {}
  }
  return num
}

const MAX_HISTORY = 20

function getHistory(key) {
  const store = globalThis.__aiAgentHistory__
  const ts    = globalThis.__aiAgentHistoryTs__ as Record<string, number>
  if (!store[key]) store[key] = []
  ts[key] = Date.now()  
  return store[key]
}

function pushHistory(key, role, content) {
  const store = globalThis.__aiAgentHistory__
  const ts    = globalThis.__aiAgentHistoryTs__ as Record<string, number>
  const h = getHistory(key)
  h.push({ role, content })
  if (h.length > MAX_HISTORY) h.splice(0, 2)
  store[key] = h
  ts[key] = Date.now()  
}

function clearHistory(key) {
  globalThis.__aiAgentHistory__[key] = []
}




async function callOpenRouter(messages, tools = null) {
  const body = {
    model:       MODEL_ID,
    messages,
    max_tokens:  2048,
    temperature: 0.7,
  }
  if (tools && tools.length > 0) {
    body.tools       = tools
    body.tool_choice = 'auto'
  }

  const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', body, {
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type':  'application/json',
      'HTTP-Referer':  'https://wa.me',
      'X-Title':       `${botName} Agent`,
    },
    timeout: 60000,
  })
  return res.data?.choices?.[0]?.message || null
}




function parseXmlToolCall(content) {
  if (!content) return null

  
  const toolCallMatch = content.match(/<tool_call>[\s\S]*?<function=([\w]+)>([\s\S]*?)<\/function>[\s\S]*?<\/tool_call>/i)
  if (toolCallMatch) {
    const name = toolCallMatch[1]
    const body = toolCallMatch[2]
    const args = {}
    for (const pm of body.matchAll(/<parameter=([\w]+)>([\s\S]*?)<\/parameter>/gi)) {
      let val = pm[2].trim()
      try { val = JSON.parse(val) } catch {}
      args[pm[1]] = val
    }
    return { name, args }
  }

  
  const jsonMatch = content.match(/```(?:json)?\s*({[\s\S]*?})\s*```/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1])
      if (parsed.function_name || parsed.name) {
        return {
          name: parsed.function_name || parsed.name,
          args: typeof parsed.arguments === 'string'
            ? JSON.parse(parsed.arguments)
            : (parsed.arguments || parsed.args || parsed.parameters || {}),
        }
      }
    } catch {}
  }

  
  const invokeMatch = content.match(/<invoke name="([^"]+)">([\s\S]*?)<\/invoke>/i)
  if (invokeMatch) {
    const name = invokeMatch[1]
    const args = {}
    for (const pm of invokeMatch[2].matchAll(/<parameter name="([^"]+)">([\s\S]*?)<\/parameter>/gi)) {
      let val = pm[2].trim()
      try { val = JSON.parse(val) } catch {}
      args[pm[1]] = val
    }
    return { name, args }
  }

  return null
}




async function toolDownloadVideo(url) {
  try {
    const baseHeaders = {
      'accept':       '*/*',
      'content-type': 'application/json',
      'origin':       'https://downr.org',
      'referer':      'https://downr.org/',
      'user-agent':   'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/144.0.0.0 Mobile Safari/537.36',
    }
    const baseCookie = '_ga=GA1.1.536005378.1770437315'
    let cookie = baseCookie
    try {
      const sessRes = await axios.get('https://downr.org/.netlify/functions/analytics', {
        headers: { ...baseHeaders, cookie: baseCookie }, timeout: 8000,
      })
      const sess = sessRes.headers['set-cookie']?.[0]?.split(';')[0]
      if (sess) cookie = `${baseCookie}; ${sess}`
    } catch {}

    const { data } = await axios.post('https://downr.org/.netlify/functions/nyt', { url }, {
      headers: { ...baseHeaders, cookie }, timeout: 20000,
    })

    if (!data?.medias?.length) return { text: `❌ Gagal download: media tidak ditemukan` }

    const videos  = data.medias.filter(v => v.type === 'video')
    const audios  = data.medias.filter(v => v.type === 'audio')
    const images  = data.medias.filter(v => v.type === 'image')
    const bestVid = videos.find(v => v.quality === 'no_watermark') ||
                    videos.find(v => v.quality === 'hd_no_watermark') ||
                    videos[0]

    if (bestVid) return { text: `🎬 *${data.title || 'Video'}*\n👤 ${data.author || '-'}`, media: { type: 'video', url: bestVid.url, caption: data.title || '' } }
    if (audios[0]) return { text: `🎵 *${data.title || 'Audio'}*`, media: { type: 'audio', url: audios[0].url } }
    if (images[0]) return { text: `🖼️ *${data.title || 'Image'}*`, media: { type: 'image', url: images[0].url } }
    return { text: `ℹ️ Media ditemukan tapi format tidak bisa dikirim.` }
  } catch (e) {
    return { text: `❌ Error download video: ${e.message}` }
  }
}




async function toolDownloadMusic(query) {
  try {
    const { data } = await axios.get('https://api-faa.my.id/faa/ytplay', {
      params: { query }, timeout: 30000,
    })
    if (!data?.status || !data?.result) return { text: `❌ Lagu "${query}" tidak ditemukan.` }
    const r        = data.result
    const audioUrl = r.mp3 || r.audio || r.audioUrl || r.audio_url || r.download_url || r.url || null
    if (!audioUrl) return { text: `ℹ️ Ditemukan: *${r.title || query}*\nTapi tidak ada audio URL.` }
    return {
      text:  `🎵 *${r.title || query}*\n👤 ${r.artist || r.author || r.channel || '-'}\n⏱️ ${r.duration || '-'}`,
      media: { type: 'audio', url: audioUrl, title: r.title || query, artist: r.artist || r.author || '-', duration: r.duration || '-', thumb: r.thumbnail || r.thumb || null },
    }
  } catch (e) {
    return { text: `❌ Error cari lagu: ${e.message}` }
  }
}




async function toolListFiles(dirpath = '.') {
  try {
    const resolved = path.resolve(BOT_ROOT, dirpath)
    if (!resolved.startsWith(BOT_ROOT)) return { text: `❌ Akses ditolak.` }
    if (!fs.existsSync(resolved))        return { text: `❌ Direktori tidak ditemukan: ${dirpath}` }
    if (!fs.statSync(resolved).isDirectory()) return { text: `❌ ${dirpath} bukan direktori.` }

    const SKIP  = new Set(['.git', 'node_modules', '.DS_Store', '__pycache__'])
    const items = fs.readdirSync(resolved, { withFileTypes: true })
    const dirs  = []
    const files = []
    for (const item of items) {
      if (SKIP.has(item.name)) continue
      item.isDirectory() ? dirs.push(`📁 ${item.name}/`) : files.push(`📄 ${item.name}`)
    }
    const list    = [...dirs.sort(), ...files.sort()].join('\n') || '(kosong)'
    const relPath = path.relative(BOT_ROOT, resolved) || '.'
    return { text: `📁 *${relPath}*\n\n${list}` }
  } catch (e) {
    return { text: `❌ Error list files: ${e.message}` }
  }
}




async function toolReadFile(filepath) {
  try {
    const resolved = path.resolve(BOT_ROOT, filepath)
    if (!resolved.startsWith(BOT_ROOT + path.sep) && resolved !== BOT_ROOT) return { text: `❌ Akses ditolak.` }
    if (!fs.existsSync(resolved)) return { text: `❌ File tidak ditemukan: ${filepath}` }
    const stat = fs.statSync(resolved)
    if (stat.isDirectory()) return { text: `❌ ${filepath} adalah direktori.` }
    const binaryExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp3', '.mp4', '.ttf', '.woff', '.woff2', '.zip', '.bin']
    if (binaryExts.some(ext => filepath.toLowerCase().endsWith(ext))) return { text: `⚠️ File binary tidak bisa dibaca: ${filepath}` }
    if (stat.size > 80 * 1024) return { text: `⚠️ File terlalu besar (${Math.round(stat.size / 1024)}KB). Max 80KB.` }
    const content = fs.readFileSync(resolved, 'utf-8')
    const relPath = path.relative(BOT_ROOT, resolved)
    return { text: `📄 *${relPath}* (${stat.size} bytes):\n\`\`\`\n${content}\n\`\`\`` }
  } catch (e) {
    return { text: `❌ Error read file: ${e.message}` }
  }
}






async function toolWritePlugin(filename, code) {
  try {
    if (!filename || !code) return { text: `❌ filename dan code tidak boleh kosong.` }

    
    if (!filename.endsWith('.ts') && !filename.endsWith('.js')) filename += '.ts'

    
    if (filename.endsWith('.js')) {
      filename = filename.replace(/\.js$/, '.ts')
    }

    let targetPath
    if (filename.startsWith('Plugins-ESM/') || filename.startsWith('./Plugins-ESM/')) {
      targetPath = path.join(BOT_ROOT, filename)
    } else {
      targetPath = path.join(PLUGIN_DIR, filename)
    }

    
    
    
    if (!targetPath.startsWith(PLUGIN_DIR + path.sep)) {
      return { text: `❌ Target file harus di dalam Plugins-ESM/` }
    }

    if (!code.includes('export default')) return { text: `❌ Kode tidak valid: tidak ada "export default".` }

    const dir = path.dirname(targetPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    await writeFile(targetPath, code, 'utf-8')

    const relPath  = path.relative(BOT_ROOT, targetPath)
    const cmdMatch = code.match(/handler\.command\s*=\s*\[([^\]]+)\]/)
    const cmdList  = cmdMatch
      ? cmdMatch[1].replace(/['"]/g, '').split(',').map(s => s.trim()).filter(Boolean).map(c => `.${c}`).join(', ')
      : '(passive plugin)'

    return {
      text: `✅ *Plugin berhasil ditulis!*\n\n📄 File   : \`${relPath}\`\n🔧 Command: ${cmdList}\n\n🔄 Plugin manager auto-reload...\n_(Plugin aktif dalam ~300ms)_`,
    }
  } catch (e) {
    return { text: `❌ Error write plugin: ${e.message}` }
  }
}





async function toolScanAndCount(extensions = ['.ts'], dirpath = '.', skipDirs = ['node_modules', '.git', 'dist', 'build', '__pycache__', '.DS_Store']) {
  try {
    const resolved = path.resolve(BOT_ROOT, dirpath)
    if (!resolved.startsWith(BOT_ROOT)) return { text: `❌ Akses ditolak: path di luar direktori bot.` }

    const results = []
    const skipped = []
    const exts    = extensions.map(e => e.startsWith('.') ? e : `.${e}`)

    function walkDir(dir) {
      let entries
      try { entries = fs.readdirSync(dir, { withFileTypes: true }) }
      catch { return }

      for (const entry of entries) {
        if (skipDirs.includes(entry.name)) continue
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          walkDir(fullPath)
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase()
          if (!exts.includes(ext)) continue

          const stat = fs.statSync(fullPath)
          if (stat.size > 500 * 1024) {
            skipped.push(path.relative(BOT_ROOT, fullPath) + ' (>500KB)')
            continue
          }

          try {
            const content = fs.readFileSync(fullPath, 'utf-8')
            const lines   = content.split('\n')
            const blank   = lines.filter(l => l.trim() === '').length
            const code    = lines.length - blank
            results.push({ file: path.relative(BOT_ROOT, fullPath), lines: lines.length, blank, code })
          } catch {
            skipped.push(path.relative(BOT_ROOT, fullPath))
          }
        }
      }
    }

    walkDir(resolved)

    if (!results.length) return { text: `⚠️ Tidak ada file dengan ekstensi ${exts.join(', ')} ditemukan di ${dirpath}.` }

    results.sort((a, b) => b.lines - a.lines)

    const totalLines = results.reduce((s, r) => s + r.lines, 0)
    const totalCode  = results.reduce((s, r) => s + r.code, 0)
    const totalBlank = results.reduce((s, r) => s + r.blank, 0)
    const totalFiles = results.length

    const top     = results.slice(0, 15)
    const topText = top
      .map((r, i) => `${String(i + 1).padStart(2, ' ')}. ${r.file.padEnd(45, ' ')} ${String(r.lines).padStart(5)} baris`)
      .join('\n')

    const folderMap = {}
    for (const r of results) {
      const folder = r.file.includes('/') ? r.file.split('/')[0] : '(root)'
      folderMap[folder] = (folderMap[folder] || 0) + r.lines
    }
    const folderText = Object.entries(folderMap)
      .sort((a, b) => b[1] - a[1])
      .map(([folder, lines]) => `  📁 ${folder}: ${lines.toLocaleString()} baris`)
      .join('\n')

    let result = `📊 *Hasil Scan Kode Bot*\n`
    result    += `━━━━━━━━━━━━━━━━━━━━━━━━\n`
    result    += `📁 Total File  : ${totalFiles}\n`
    result    += `📝 Total Baris : ${totalLines.toLocaleString()}\n`
    result    += `✅ Baris Kode  : ${totalCode.toLocaleString()}\n`
    result    += `⬜ Baris Kosong: ${totalBlank.toLocaleString()}\n`
    result    += `🔍 Ekstensi    : ${exts.join(', ')}\n\n`
    result    += `📂 *Breakdown per Folder:*\n${folderText}\n\n`
    result    += `🏆 *Top ${top.length} File Terbesar:*\n\`\`\`\n${topText}\n\`\`\``

    if (skipped.length) {
      result += `\n\n⚠️ File di-skip (${skipped.length}): ${skipped.slice(0, 5).join(', ')}${skipped.length > 5 ? '...' : ''}`
    }

    return { text: result }
  } catch (e) {
    return { text: `❌ Error scan: ${e.message}` }
  }
}




async function toolCheckLogs(lines = 50, type = 'all') {
  try {
    const tryPm2 = () => {
      try {
        execSync('pm2 --version', { stdio: 'pipe' })

        const errLog = type === 'out' ? '' : (() => {
          try { return execSync(`pm2 logs --err --nostream --lines ${lines} 2>/dev/null`, { encoding: 'utf-8', stdio: 'pipe', timeout: 5000 }) }
          catch { return '' }
        })()

        const outLog = type === 'error' ? '' : (() => {
          try { return execSync(`pm2 logs --out --nostream --lines ${lines} 2>/dev/null`, { encoding: 'utf-8', stdio: 'pipe', timeout: 5000 }) }
          catch { return '' }
        })()

        const combined = [
          outLog ? `📤 *STDOUT:*\n${outLog}` : '',
          errLog ? `🔴 *STDERR:*\n${errLog}` : '',
        ].filter(Boolean).join('\n\n')

        return combined || null
      } catch {
        return null
      }
    }

    const tryLogFile = () => {
      const logPaths = [
        path.join(BOT_ROOT, 'logs', 'error.log'),
        path.join(BOT_ROOT, 'logs', 'combined.log'),
        path.join(BOT_ROOT, 'error.log'),
        path.join(BOT_ROOT, 'bot.log'),
        path.join(process.env.HOME || '/root', '.pm2', 'logs', 'morela-error.log'),
        path.join(process.env.HOME || '/root', '.pm2', 'logs', 'morela-out.log'),
      ]

      for (const logPath of logPaths) {
        if (!fs.existsSync(logPath)) continue
        try {
          const content = fs.readFileSync(logPath, 'utf-8')
          const lineArr = content.split('\n').filter(Boolean)
          const sliced  = lineArr.slice(-lines).join('\n')
          if (sliced.trim()) return `📄 *${path.relative(BOT_ROOT, logPath)}:*\n${sliced}`
        } catch {}
      }
      return null
    }

    const fileResult = tryPm2() || tryLogFile()

    if (!fileResult) {
      return {
        text: `⚠️ Tidak ada log ditemukan.\n\nCoba cek manual:\n\`\`\`\npm2 logs --lines 50\n\`\`\`\nAtau pastikan folder \`logs/\` ada di root bot.`,
      }
    }

    const trimmed = fileResult.length > 3500
      ? '...(dipotong)\n' + fileResult.slice(-3500)
      : fileResult

    const errorCount   = (trimmed.match(/error/gi)   || []).length
    const warningCount = (trimmed.match(/warn/gi)    || []).length

    const summary = errorCount || warningCount
      ? `\n\n📊 *Summary:* ${errorCount} error, ${warningCount} warning ditemukan.`
      : ''

    return { text: `🪵 *Log Terbaru (${lines} baris):*\n\`\`\`\n${trimmed}\n\`\`\`${summary}` }
  } catch (e) {
    return { text: `❌ Gagal baca log: ${e.message}` }
  }
}




async function toolAnalyzeError(errorText, context = '') {
  try {
    if (!errorText?.trim()) return { text: `❌ Error text tidak boleh kosong.` }

    const detections = []

    if (/cannot find module/i.test(errorText))
      detections.push('📦 *Module tidak ditemukan* — package belum di-install atau path import salah.')
    if (/syntaxerror/i.test(errorText))
      detections.push('🔤 *Syntax Error* — ada kesalahan penulisan kode (kurung, titik koma, dll).')
    if (/typeerror/i.test(errorText))
      detections.push('🔢 *Type Error* — variable undefined/null atau tipe data tidak sesuai.')
    if (/econnrefused|econnreset|etimedout/i.test(errorText))
      detections.push('🌐 *Network Error* — koneksi gagal, cek internet atau API endpoint.')
    if (/401|unauthorized/i.test(errorText))
      detections.push('🔑 *Auth Error* — API key salah, expired, atau tidak ada izin.')
    if (/403|forbidden/i.test(errorText))
      detections.push('🚫 *Forbidden* — akses ditolak oleh server.')
    if (/404/i.test(errorText))
      detections.push('❓ *Not Found* — endpoint atau resource tidak ditemukan.')
    if (/429|rate.?limit/i.test(errorText))
      detections.push('⏱️ *Rate Limit* — terlalu banyak request, tunggu beberapa saat.')
    if (/500|internal server/i.test(errorText))
      detections.push('💥 *Server Error* — error di sisi server eksternal, bukan bot.')
    if (/heap out of memory|javascript heap/i.test(errorText))
      detections.push('🧠 *Out of Memory* — bot kekurangan RAM, perlu restart atau optimasi.')
    if (/enoent/i.test(errorText))
      detections.push('📂 *File Not Found* — file atau direktori yang diakses tidak ada.')
    if (/permission denied|eacces/i.test(errorText))
      detections.push('🔒 *Permission Denied* — tidak ada akses baca/tulis ke file/folder.')
    if (/export default|export \{/i.test(errorText))
      detections.push('📤 *Export Error* — masalah pada format export module.')
    if (/ts\(\d+\)|typescript/i.test(errorText))
      detections.push('📘 *TypeScript Error* — type mismatch atau deklarasi type salah.')

    const analysisPrompt = `Kamu adalah expert software engineer spesialis Node.js, JavaScript, TypeScript, dan WhatsApp Bot development.

Analisis error berikut dan berikan:
1. **Root Cause** — penyebab utama error (1-2 kalimat)
2. **Lokasi** — di bagian kode mana error kemungkinan terjadi
3. **Solusi** — langkah konkret untuk fix (sertakan contoh kode jika perlu)
4. **Pencegahan** — cara mencegah error ini terjadi lagi

${context ? `Konteks tambahan: ${context}\n` : ''}

ERROR:
\`\`\`
${errorText.substring(0, 2000)}
\`\`\`

${detections.length ? `Pre-deteksi otomatis:\n${detections.join('\n')}\n` : ''}

Jawab dalam bahasa Indonesia, format markdown, langsung ke poin. Sertakan contoh kode yang benar jika ada solusi berupa kode.`

    const aiMessages = [
      { role: 'system', content: 'Kamu adalah expert Node.js/TypeScript engineer. Analisis error dengan akurat dan berikan solusi konkret.' },
      { role: 'user',   content: analysisPrompt },
    ]

    const aiResponse = await callOpenRouter(aiMessages, null)
    const aiText     = aiResponse?.content?.trim() || ''

    const quickDetect = detections.length
      ? `🔍 *Deteksi Cepat:*\n${detections.join('\n')}\n\n`
      : ''

    const finalText = `🧠 *Analisis Error*\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n${quickDetect}${aiText || 'Tidak dapat menganalisis error ini.'}`

    return { text: finalText.substring(0, 4000) }
  } catch (e) {
    return { text: `❌ Gagal analisis error: ${e.message}` }
  }
}




async function toolFindPlugin(keyword) {
  try {
    if (!keyword?.trim()) return { text: `❌ Keyword tidak boleh kosong.` }

    const kw      = keyword.trim().toLowerCase()
    const matches = []

    function walkDir(dir) {
      let entries
      try { entries = fs.readdirSync(dir, { withFileTypes: true }) }
      catch { return }

      for (const entry of entries) {
        if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) continue
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          walkDir(fullPath)
        } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
          const stat = fs.statSync(fullPath)
          if (stat.size > 200 * 1024) continue

          try {
            const content  = fs.readFileSync(fullPath, 'utf-8')
            const lower    = content.toLowerCase()
            if (!lower.includes(kw)) continue

            const relPath = path.relative(BOT_ROOT, fullPath)

            const cmdMatches = content.match(/handler\.command\s*=\s*\[([^\]]+)\]/g) || []
            const commands   = cmdMatches
              .map(m => m.match(/handler\.command\s*=\s*\[([^\]]+)\]/)?.[1] || '')
              .join(', ')
              .replace(/['"]/g, '')
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
              .map(c => `.${c}`)

            const lines       = content.split('\n')
            const matchLines  = []
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].toLowerCase().includes(kw)) {
                const start   = Math.max(0, i - 1)
                const end     = Math.min(lines.length - 1, i + 1)
                const snippet = lines.slice(start, end + 1).map((l, idx) => `${start + idx + 1}: ${l}`).join('\n')
                matchLines.push(snippet)
                if (matchLines.length >= 3) break
              }
            }

            matches.push({
              file:     relPath,
              commands: commands.length ? commands.join(', ') : '(passive/no command)',
              snippets: matchLines,
            })
          } catch {}
        }
      }
    }

    walkDir(PLUGIN_DIR)
    if (!matches.length) walkDir(BOT_ROOT)

    if (!matches.length) {
      return { text: `❌ Tidak ditemukan file plugin yang mengandung keyword *"${keyword}"*.\n\nKemungkinan:\n- Nama command salah\n- Plugin belum ada\n- Keyword terlalu umum` }
    }

    let result = `🔍 *Hasil pencarian: "${keyword}"*\n`
    result    += `━━━━━━━━━━━━━━━━━━━━━━━━\n`
    result    += `Ditemukan di ${matches.length} file:\n\n`

    for (const m of matches) {
      result += `📄 *${m.file}*\n`
      result += `🔧 Command: ${m.commands}\n`
      if (m.snippets.length) {
        result += `📝 Konteks:\n\`\`\`\n${m.snippets[0]}\n\`\`\`\n`
      }
      result += '\n'
    }

    result += `_Gunakan "baca file ${matches[0].file}" untuk lihat kode lengkapnya._`

    return { text: result.substring(0, 4000) }
  } catch (e) {
    return { text: `❌ Error find plugin: ${e.message}` }
  }
}




async function executeTool(name, args, isMO) {
  const moOnly = new Set(['write_plugin', 'read_file', 'list_files', 'scan_and_count', 'check_logs', 'analyze_error', 'find_plugin'])
  if (moOnly.has(name) && !isMO) return { text: `🔒 Tool ini hanya untuk Main Owner.` }

  switch (name) {
    case 'download_video':  return toolDownloadVideo(args.url)
    case 'download_music':  return toolDownloadMusic(args.query)
    case 'list_files':      return toolListFiles(args.dirpath || '.')
    case 'read_file':       return toolReadFile(args.filepath)
    case 'write_plugin':    return toolWritePlugin(args.filename, args.code)
    case 'scan_and_count':  return toolScanAndCount(args.extensions, args.dirpath, args.skip_dirs)
    case 'check_logs':      return toolCheckLogs(args.lines || 50, args.type || 'all')
    case 'analyze_error':   return toolAnalyzeError(args.error_text, args.context || '')
    case 'find_plugin':     return toolFindPlugin(args.keyword)
    default:                return { text: `❓ Tool "${name}" tidak dikenal.` }
  }
}




async function sendMedia(Morela, chatId, media, quoted) {
  if (!media?.url) return
  if (media.type === 'video') {
    const buf = await axios.get(media.url, { responseType: 'arraybuffer', timeout: 60000 }).then(r => Buffer.from(r.data))
    await Morela.sendMessage(chatId, { video: buf, caption: media.caption || '', mimetype: 'video/mp4' }, { quoted })
    return
  }
  if (media.type === 'audio') {
    const buf = await axios.get(media.url, { responseType: 'arraybuffer', timeout: 60000 }).then(r => Buffer.from(r.data))
    let thumb = null
    if (media.thumb) {
      try { thumb = await axios.get(media.thumb, { responseType: 'arraybuffer', timeout: 10000 }).then(r => Buffer.from(r.data)) } catch {}
    }
    await Morela.sendMessage(chatId, {
      audio:    buf,
      mimetype: 'audio/mpeg',
      ptt:      false,
      fileName: `${media.title || 'audio'}.mp3`,
      contextInfo: thumb ? {
        externalAdReply: {
          title: media.title || 'Audio', body: media.artist ? `👤 ${media.artist}` : '',
          thumbnail: thumb, mediaType: 1, renderLargerThumbnail: false, showAdAttribution: false,
        },
      } : undefined,
    }, { quoted })
    return
  }
  if (media.type === 'image') {
    await Morela.sendMessage(chatId, { image: { url: media.url } }, { quoted })
  }
}

const delay = ms => new Promise(res => setTimeout(res, ms))




function stripMarkdown(text) {
  if (!text) return text

  const parts = text.split(/(```[\s\S]*?```|`[^`\n]+`)/g)

  return parts.map((part, i) => {
    if (i % 2 === 1) return part

    return part
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*([\s\S]*?)\*\*/g, '$1')
      .replace(/(?<!\w)\*([^*\n]+?)\*(?!\w)/g, '$1')
      .replace(/__([\s\S]*?)__/g, '$1')
      .replace(/(?<!\w)_([^_\n]+?)_(?!\w)/g, '$1')
      .replace(/^[ \t]*[*\-]\s+/gm, '🔹 ')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/(?<![0-9])\*(?![0-9*])/g, '')
  }).join('').trim()
}


const toolLoadMsg = {
  download_video:  '🎬 Sedang mengunduh video...',
  download_music:  '🎵 Sedang mencari lagu...',
  list_files:      '📁 Membaca struktur folder server...',
  read_file:       '📄 Membuka file...',
  write_plugin:    '📝 Menulis plugin ke server...',
  scan_and_count:  '🔍 Memindai semua file kode... (mungkin butuh beberapa detik)',
  check_logs:      '🪵 Membaca log terbaru...',
  analyze_error:   '🧠 Menganalisis error...',
  find_plugin:     '🔍 Mencari plugin...',
}

const DIRECT_SEND_TOOLS = new Set(['write_plugin', 'scan_and_count', 'check_logs', 'analyze_error'])
const SILENT_TOOLS      = new Set(['read_file', 'list_files'])




const handler = {
  tags: ['passive', 'ai'],

  handler: async (m, { Morela, fkontak }) => {
    let lockKey = null
    try {
      if (!m.message)                               return
      if (m.message?.reactionMessage)              return
      if (m.message?.protocolMessage)              return
      if (m.message?.senderKeyDistributionMessage) return
      if (m.chat === 'status@broadcast')           return
      if (m.key?.fromMe)                           return
      if (!m.isGroup)                              return
      if (!globalThis.__aiAgentStatus__[m.chat])  return

      const text = m.body || m.text || ''
      if (!text) return
      if (/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^,🐤🗿]/i.test(text)) return

      const senderNum = getSenderNum(m)
      const isMO      = isMainOwner(senderNum)

      if (!isMO) return

      const userId  = m.sender || m.key?.participant || ''
      const histKey = `${m.chat}:${userId}`

      lockKey = `${m.chat}:${userId}`
      if (globalThis.__aiAgentLock__.has(lockKey)) return
      globalThis.__aiAgentLock__.add(lockKey)

      if (/^(reset|lupa|forget|clear)$/i.test(text.trim())) {
        clearHistory(histKey)
        return Morela.sendMessage(m.chat, {
          text: '🧹 History dihapus. Siap melanjutkan dari awal.',
        }, { quoted: fkontak || m })
      }

      const systemPrompt = isMO ? SYSTEM_PROMPT_BASE + SYSTEM_PROMPT_MAIN_OWNER : SYSTEM_PROMPT_BASE
      const tools        = isMO ? [...TOOLS_BASE, ...TOOLS_MAIN_OWNER_EXTRA] : TOOLS_BASE

      const history  = getHistory(histKey)
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: text },
      ]

      await Morela.sendPresenceUpdate('composing', m.chat)

      const MAX_CHAIN         = 6
      let   mediaToSend       = null
      let   finalResponseText = ''

      const collectedResults = []

      const sendLoad = async (toolName, toolArgs) => {
        if (SILENT_TOOLS.has(toolName)) return
        const loadText = toolName === 'write_plugin'
          ? `📝 Sedang menulis plugin ${toolArgs.filename || ''}...`
          : toolLoadMsg[toolName] || `🔧 Memproses ${toolName}...`
        await Morela.sendMessage(m.chat, { text: loadText }, { quoted: fkontak || m })
      }

      const extractToolCall = (msg) => {
        if (msg.tool_calls?.length) {
          const tc = msg.tool_calls[0]
          try { return { name: tc.function.name, args: JSON.parse(tc.function.arguments) } }
          catch { return { name: tc.function.name, args: {} } }
        }
        const xml = parseXmlToolCall(msg.content || '')
        if (xml) return { name: xml.name, args: xml.args }
        return null
      }

      const buildFollowUp = () => {
        const ctx = collectedResults
          .map(r => `[HASIL ${r.name.toUpperCase()}]:\n${r.result}`)
          .join('\n\n')
        return [
          ...messages,
          {
            role:    'user',
            content: `${text}\n\n--- DATA DARI SERVER ---\n${ctx}\n--- SELESAI ---\n\nBerdasarkan data di atas, jawab pertanyaan user secara langsung dan profesional. Jangan sebut nama tool atau function.`,
          },
        ]
      }

      let currentMsg = await callOpenRouter(messages, tools)
      if (!currentMsg) return

      for (let step = 0; step < MAX_CHAIN; step++) {
        const tc = extractToolCall(currentMsg)

        if (!tc) {
          finalResponseText = stripMarkdown(
            (currentMsg.content || '')
              .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
              .trim()
          )
          break
        }

        const { name: toolName, args: toolArgs } = tc

        await sendLoad(toolName, toolArgs)

        const toolResult = await executeTool(toolName, toolArgs, isMO)
        if (toolResult.media && !mediaToSend) mediaToSend = toolResult.media

        if (DIRECT_SEND_TOOLS.has(toolName)) {
          pushHistory(histKey, 'user', text)
          pushHistory(histKey, 'assistant', toolResult.text)
          await Morela.sendPresenceUpdate('paused', m.chat)
          await Morela.sendMessage(m.chat, { text: toolResult.text }, { quoted: fkontak || m })
          return
        }

        collectedResults.push({ name: toolName, result: toolResult.text || 'OK' })

        if (toolName === 'find_plugin') {
          const filePaths = [...toolResult.text.matchAll(/📄 \*([^\*]+\.(js|ts))\*/g)]
            .map(m => m[1])
            .slice(0, 3)
          if (filePaths.length) {
            await Morela.sendMessage(m.chat, { text: `📄 Membuka ${filePaths.length} file...` }, { quoted: fkontak || m })
            for (const fp of filePaths) {
              const readResult = await toolReadFile(fp)
              collectedResults.push({ name: `read_file(${fp})`, result: readResult.text || '' })
            }
          }
          currentMsg = await callOpenRouter(buildFollowUp(), null)
          if (!currentMsg) break
          continue
        }

        const nextMessages = [
          ...messages,
          {
            role:    'assistant',
            content: (currentMsg.content || '').replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '').trim() || `[called ${toolName}]`,
          },
          {
            role:    'user',
            content: `[HASIL ${toolName.toUpperCase()}]:\n${toolResult.text}\n\nLanjutkan atau jawab pertanyaan user jika sudah cukup data.`,
          },
        ]

        currentMsg = await callOpenRouter(nextMessages, tools)
        if (!currentMsg) break
      }

      if (!finalResponseText) finalResponseText = '...'
      finalResponseText = stripMarkdown(finalResponseText)

      pushHistory(histKey, 'user', text)
      pushHistory(histKey, 'assistant', finalResponseText)

      await delay(Math.min(3000, 500 + finalResponseText.length * 15))
      await Morela.sendPresenceUpdate('paused', m.chat)
      await Morela.sendMessage(m.chat, { text: finalResponseText }, { quoted: fkontak || m })

      if (mediaToSend) {
        try { await sendMedia(Morela, m.chat, mediaToSend, fkontak || m) }
        catch (e) { console.error('[AI AGENT PASIVE] media error:', e.message) }
      }

    } catch (err) {
      console.error('[AI AGENT PASIVE] error:', err.message)
    } finally {
      globalThis.__aiAgentLock__.delete(lockKey)
    }
  },
}

export default handler