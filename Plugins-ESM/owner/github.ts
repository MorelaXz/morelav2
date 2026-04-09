// @ts-nocheck
import unzipper from 'unzipper'
import fetch    from 'node-fetch'
import fs       from 'fs'
import path     from 'path'
import { bi, CHANNEL_URL, imagePath, botName } from '../../Library/utils.js'


const GITHUB_TOKEN    = 'YOUR_TOKEN_HERE'
const GITHUB_USERNAME = 'MorelaXz'


const SKIP_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build',
  '__pycache__', '.DS_Store', '.cache', '.vercel'
])

const SKIP_EXTS = new Set([
  '.mp3', '.mp4', '.avi', '.mkv', '.mov',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.exe', '.bin', '.dll', '.so', '.dylib',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
])

const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_FILES     = 1000
const BLOB_DELAY    = 150
const RETRY_MAX     = 5


const SECRET_PATTERNS = [
  // ─── GitHub Tokens ───────────────────────────────────────────────────────────
  { regex: /ghp_[A-Za-z0-9]{36}/g,                                    placeholder: 'ghp_YOUR_GITHUB_TOKEN_HERE'        },
  { regex: /github_pat_[A-Za-z0-9_]{82}/g,                            placeholder: 'github_pat_YOUR_TOKEN_HERE'        },

  // ─── Vercel ──────────────────────────────────────────────────────────────────
  { regex: /vcp_[A-Za-z0-9]{60,}/g,                                   placeholder: 'YOUR_VERCEL_TOKEN_HERE'            },

  // ─── OpenAI ──────────────────────────────────────────────────────────────────
  { regex: /sk-[A-Za-z0-9]{32,}/g,                                    placeholder: 'YOUR_OPENAI_KEY_HERE'              },

  // ─── Google ──────────────────────────────────────────────────────────────────
  { regex: /AIza[A-Za-z0-9\-_]{35}/g,                                 placeholder: 'YOUR_GOOGLE_API_KEY_HERE'          },

  // ─── Bearer Token ────────────────────────────────────────────────────────────
  { regex: /Bearer\s+[A-Za-z0-9\-_\.]{20,}/g,                         placeholder: 'Bearer YOUR_TOKEN_HERE'           },

  // ─── Slack ───────────────────────────────────────────────────────────────────
  { regex: /['"]xoxb-[A-Za-z0-9\-]{50,}['"]/g,                        placeholder: "'YOUR_SLACK_TOKEN_HERE'"           },
  { regex: /['"]xoxp-[A-Za-z0-9\-]{50,}['"]/g,                        placeholder: "'YOUR_SLACK_TOKEN_HERE'"           },

  // ─── Hardcoded token/key/secret di variabel (const X = 'xxx') ────────────────
  {
    regex: /((?:TOKEN|API_KEY|SECRET|PASSWORD|APIKEY|ACCESS_KEY|AUTH_KEY|PRIVATE_KEY)\s*=\s*['"])[A-Za-z0-9\-_\.\/\+]{8,}(['""])/gi,
    placeholder: '$1YOUR_TOKEN_HERE$2'
  },

  // ─── Nomor HP Indonesia (08xxx atau 628xxx), di dalam string atau plain ───────
  { regex: /(['"`])((?:62|0)8[1-9][0-9]{7,11})(['"`])/g,              placeholder: "$1628xxxxxxxxxx$3"                 },
  { regex: /(?<![A-Za-z0-9])((?:62|0)8[1-9][0-9]{7,11})(?![A-Za-z0-9])/g, placeholder: '628xxxxxxxxxx'              },
]

function redactSecrets(content) {
  let result = content
  for (const { regex, placeholder } of SECRET_PATTERNS) {
    result = result.replace(regex, placeholder)
  }
  return result
}


const sleep = (ms) => new Promise(r => setTimeout(r, ms))


const GH_HEADERS = {
  'Authorization': `Bearer ${GITHUB_TOKEN}`,
  'Accept':        'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type':  'application/json',
  'User-Agent':    botName,
}

async function ghFetch(endpoint, method = 'GET', body = null) {
  const res = await fetch(`https://api.github.com${endpoint}`, {
    method,
    headers: GH_HEADERS,
    body: body ? JSON.stringify(body) : undefined,
    timeout: 30000,
  })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, json }
}


async function ensureRepo(repoName, isPrivate = false) {
  const check = await ghFetch(`/repos/${GITHUB_USERNAME}/${repoName}`)
  if (check.ok) return { created: false, url: check.json.html_url, defaultBranch: check.json.default_branch || 'main' }

  const create = await ghFetch('/user/repos', 'POST', {
    name:        repoName,
    private:     isPrivate,
    auto_init:   true,
    description: `Pushed via ${botName} WhatsApp Bot`,
  })
  if (!create.ok) throw new Error(`Gagal buat repo: ${create.json.message || create.status}`)
  return { created: true, url: create.json.html_url, defaultBranch: create.json.default_branch || 'main' }
}


async function getLatestCommitSha(repoName, branch) {
  const res = await ghFetch(`/repos/${GITHUB_USERNAME}/${repoName}/git/ref/heads/${branch}`)
  if (!res.ok) return null
  return res.json.object?.sha || null
}


async function getTreeSha(repoName, commitSha) {
  const res = await ghFetch(`/repos/${GITHUB_USERNAME}/${repoName}/git/commits/${commitSha}`)
  if (!res.ok) return null
  return res.json.tree?.sha || null
}


async function createBlobWithRetry(repoName, content, encoding = 'base64') {
  let lastError = ''
  for (let attempt = 1; attempt <= RETRY_MAX; attempt++) {
    const res = await ghFetch(`/repos/${GITHUB_USERNAME}/${repoName}/git/blobs`, 'POST', {
      content,
      encoding,
    })

    if (res.ok) return res.json.sha

    lastError = res.json.message || String(res.status)

    if (res.status === 429 || res.status === 403) {
      await sleep(6000 * attempt)
      continue
    }

    if (attempt < RETRY_MAX) {
      await sleep(2000 * attempt)
      continue
    }
  }
  throw new Error(lastError)
}


async function createTree(repoName, treeItems, baseTreeSha = null) {
  const body = { tree: treeItems }
  if (baseTreeSha) body.base_tree = baseTreeSha
  const res = await ghFetch(`/repos/${GITHUB_USERNAME}/${repoName}/git/trees`, 'POST', body)
  if (!res.ok) throw new Error(`Tree error: ${res.json.message || res.status}`)
  return res.json.sha
}


async function createCommit(repoName, message, treeSha, parentSha = null) {
  const body = { message, tree: treeSha }
  if (parentSha) body.parents = [parentSha]
  const res = await ghFetch(`/repos/${GITHUB_USERNAME}/${repoName}/git/commits`, 'POST', body)
  if (!res.ok) throw new Error(`Commit error: ${res.json.message || res.status}`)
  return res.json.sha
}


async function updateRef(repoName, branch, commitSha) {
  const res = await ghFetch(
    `/repos/${GITHUB_USERNAME}/${repoName}/git/refs/heads/${branch}`,
    'PATCH',
    { sha: commitSha, force: true }
  )
  if (!res.ok) throw new Error(`Update ref error: ${res.json.message || res.status}`)
  return res.ok
}


const TEXT_EXTS = new Set([
  '.ts', '.js', '.mjs', '.cjs', '.json', '.md', '.txt',
  '.env', '.yaml', '.yml', '.toml', '.ini', '.sh', '.bash',
  '.html', '.css', '.jsx', '.tsx', '.vue', '.svelte',
])

async function extractFiles(buffer) {
  const zip   = await unzipper.Open.buffer(buffer)
  const files = []

  for (const f of zip.files) {
    if (f.type !== 'File') continue

    let filePath = f.path.replace(/^\/+/, '')

    const parts = filePath.split('/')
    if (parts.length > 1 && !parts[0].includes('.')) {
      filePath = parts.slice(1).join('/')
    }

    if (!filePath) continue

    const pathParts = filePath.split('/')
    if (pathParts.some(p => SKIP_DIRS.has(p))) continue

    const ext = path.extname(filePath).toLowerCase()
    if (SKIP_EXTS.has(ext)) continue

    if (f.uncompressedSize > MAX_FILE_SIZE) continue

    const data = await f.buffer()
    if (!data.length) continue

    let base64
    if (TEXT_EXTS.has(ext) || ext === '') {
      const text    = data.toString('utf8')
      const cleaned = redactSecrets(text)
      base64        = Buffer.from(cleaned, 'utf8').toString('base64')
    } else {
      base64 = data.toString('base64')
    }

    files.push({ path: filePath, base64 })

    if (files.length >= MAX_FILES) break
  }

  return files
}


const handler = async (m, { Morela, reply, text, fkontak, usedPrefix, command, downloadContentFromMessage }) => {
  const thumb = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : undefined

  const sendCard = (txt, title, url = CHANNEL_URL) =>
    Morela.sendMessage(m.chat, {
      text: txt,
      contextInfo: {
        externalAdReply: {
          title, body: `${botName} Multidevice 🔥`,
          mediaType: 1, renderLargerThumbnail: false,
          showAdAttribution: false, sourceUrl: url, thumbnail: thumb
        }
      }
    }, { quoted: fkontak || m })

  if (!text) return sendCard(
    `╭╌╌⬡「 🐙 *${bi('Push GitHub')}* 」\n` +
    `┃\n` +
    `┃ Push semua file bot ke GitHub!\n` +
    `┃\n` +
    `┃ 📌 *Cara pakai:*\n` +
    `┃ Reply file *.zip* bot kamu\n` +
    `┃ lalu ketik:\n` +
    `┃ \`${usedPrefix}${command} nama-repo\`\n` +
    `┃\n` +
    `┃ 📝 *Contoh:*\n` +
    `┃ \`${usedPrefix}${command} morela-bot\`\n` +
    `┃\n` +
    `┃ ⚙️ *Opsi:*\n` +
    `┃ \`${usedPrefix}${command} nama-repo private\`\n` +
    `┃ (untuk repo private)\n` +
    `┃\n` +
    `┃ ⚠️ node_modules & file binary\n` +
    `┃    di-skip otomatis\n` +
    `┃ 🔒 Token & secret di-redact\n` +
    `┃    otomatis sebelum push\n` +
    `╰╌╌⬡\n\n© ${botName}`,
    '🐙 Push ke GitHub'
  )

  const q = m.quoted
  if (!q || !q.mimetype) return reply('❌ Reply file *.zip* dulu!')
  if (!q.mimetype.includes('zip')) return reply('❌ Hanya mendukung file *.zip*')

  const args      = text.trim().split(/\s+/)
  const repoName  = args[0].toLowerCase().replace(/[^a-z0-9\-_\.]/g, '')
  const isPrivate = args[1] === 'private'

  if (repoName.length < 2) return reply('❌ Nama repo minimal 2 karakter\nContoh: `morela-bot`')

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  try {
    await reply('📥 Mendownload file ZIP...')
    const stream = await downloadContentFromMessage(q, 'document')
    let   media  = Buffer.from([])
    for await (const chunk of stream) media = Buffer.concat([media, chunk])
    if (!media.length) return reply('❌ Gagal download file ZIP')

    await reply('📦 Mengekstrak & menyensor secret...')
    const files = await extractFiles(media)
    if (!files.length) return reply('❌ Tidak ada file yang bisa di-push (semua di-skip)')

    await reply(
      `✅ *${files.length} file* siap di-push\n` +
      `🔒 Token/secret sudah di-redact\n` +
      `🔄 Menghubungkan ke GitHub...`
    )

    const repo = await ensureRepo(repoName, isPrivate)
    await reply(
      repo.created
        ? `🆕 Repo baru dibuat: *${repoName}*`
        : `📂 Repo sudah ada: *${repoName}*`
    )

    const branch      = repo.defaultBranch
    const latestSha   = await getLatestCommitSha(repoName, branch)
    const baseTreeSha = latestSha ? await getTreeSha(repoName, latestSha) : null

    await reply(`🚀 Mengupload ${files.length} file ke GitHub...\n⏳ Mohon tunggu...`)

    const treeItems  = []
    const failedList = []
    let   uploaded   = 0

    for (const file of files) {
      try {
        const blobSha = await createBlobWithRetry(repoName, file.base64, 'base64')
        treeItems.push({
          path: file.path,
          mode: '100644',
          type: 'blob',
          sha:  blobSha,
        })
        uploaded++
        await sleep(BLOB_DELAY)

        if (uploaded % 50 === 0) {
          await reply(`⏳ Progress: ${uploaded}/${files.length} file...`)
        }
      } catch (err) {
        failedList.push({ path: file.path, reason: err.message || 'Unknown error' })
      }
    }

    if (!treeItems.length) return reply('❌ Semua file gagal diupload')

    await reply('🌳 Membuat commit tree...')
    const treeSha = await createTree(repoName, treeItems, baseTreeSha)

    const now       = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
    const commitMsg = `🤖 Push via ${botName} — ${now}`
    const commitSha = await createCommit(repoName, commitMsg, treeSha, latestSha)

    await updateRef(repoName, branch, commitSha)

    const repoUrl = `https://github.com/${GITHUB_USERNAME}/${repoName}`

    await sendCard(
      `╭╌╌⬡「 ✅ *${bi('Push Berhasil!')}* 」\n` +
      `┃\n` +
      `┃ 🐙 Repo   : ${repoName}\n` +
      `┃ 📁 Files  : ${uploaded} file\n` +
      (failedList.length ? `┃ ⚠️ Gagal  : ${failedList.length} file\n` : '') +
      `┃ 🔒 Visib  : ${isPrivate ? 'Private' : 'Public'}\n` +
      `┃ 🌿 Branch : ${branch}\n` +
      `┃\n` +
      `┃ 🔗 ${repoUrl}\n` +
      `┃\n` +
      `╰╌╌⬡\n\n© ${botName}`,
      '✅ Push GitHub Berhasil!',
      repoUrl
    )

    if (failedList.length) {
      const chunkSize = 20
      for (let i = 0; i < failedList.length; i += chunkSize) {
        const chunk   = failedList.slice(i, i + chunkSize)
        const failMsg = chunk
          .map((f, idx) => `${i + idx + 1}. \`${f.path}\`\n   ↳ ${f.reason}`)
          .join('\n\n')
        await reply(
          `❌ *File gagal di-push (${i + 1}–${Math.min(i + chunkSize, failedList.length)} dari ${failedList.length}):*\n\n` +
          failMsg
        )
        await sleep(500)
      }
    }

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    console.error('[PUSHGITHUB]', e)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply(`❌ Error: ${e.message}`)
  }
}

handler.command   = ['pushgithub', 'pgit', 'gitpush']
handler.tags      = ['owner']
handler.help      = ['pushgithub <nama-repo> [private] — reply ZIP bot untuk push ke GitHub']
handler.mainOwner = true
handler.noLimit   = true

export default handler