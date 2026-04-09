// @ts-nocheck
import axios    from 'axios'
import fs       from 'fs'
import FormData from 'form-data'
import { downloadContentFromMessage } from '@itsukichan/baileys'
import { bi, CHANNEL_URL, imagePath, botName } from '../../Library/utils.js'





const IMGBB_KEY = 'a0fa1c4b6c7b1570879c6d71b590f4bf'

const PROMPT = `Ultra-high-resolution 4K enhancement based strictly on the provided reference image. Absolute fidelity to original facial anatomy, proportions, and identity. Preserve expression, gaze, pose, camera angle, framing, and perspective with zero deviation. Clothing, hair, skin, and background elements must remain unchanged in structure, placement, and design. Recover fine-grain detail with natural realism. Enhance pores, fine lines, hair strands, eyelashes, fabric weave, seams, and material edges without introducing stylization. Maintain original color science, white balance, and tonal relationships exactly as captured. Lighting direction, intensity, contrast, and shadow behavior must match the source image precisely, with only improved clarity and expanded dynamic range. No relighting, no reshaping. Remove any grain. Apply controlled sharpening and high-frequency detail reconstruction. Remove compression artifacts and noise while retaining authentic texture. No smoothing, no plastic skin, no artificial gloss. Facial features must remain consistent across the entire image with coherent anatomy and clean, stable edges. Negative constraints: no warping, no facial drift, no added or missing anatomy, no altered hands, no distortions, no perspective shift, no text or graphics, no hallucinated detail, no stylized rendering. Output must read as a true-to-life, photorealistic upscale that matches the reference exactly, only clearer, sharper, and higher resolution.`





function genserial(): string {
  let s = ''
  for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16)
  return s
}


async function uploadImage(buffer: Buffer): Promise<string> {
  const base64 = buffer.toString('base64')
  const res = await axios.post<{ data?: { url?: string } }>(
    `https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`,
    new URLSearchParams({ image: base64 }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 30000 }
  )
  const url = res.data?.data?.url
  if (!url) throw new Error('ImgBB: tidak ada URL di response')
  return url
}

async function createJob(imageUrl: string): Promise<string> {
  const form = new FormData()
  form.append('model_name',         'magiceraser_v4')
  form.append('original_image_url', imageUrl)
  form.append('prompt',             PROMPT)
  form.append('ratio',              'match_input_image')
  form.append('output_format',      'jpg')

  const res = await axios.post(
    'https://api.magiceraser.org/api/magiceraser/v2/image-editor/create-job',
    form,
    {
      headers: {
        ...form.getHeaders(),
        'product-code':   'magiceraser',
        'product-serial': genserial(),
        origin:           'https://imgupscaler.ai',
        referer:          'https://imgupscaler.ai/'
      },
      timeout: 30000
    }
  )
  const jobId = res.data?.result?.job_id
  if (!jobId) throw new Error(`createJob: job_id tidak ada\n${JSON.stringify(res.data).slice(0, 200)}`)
  return jobId
}

async function cekJob(jobId: string) {
  const res = await axios.get(
    `https://api.magiceraser.org/api/magiceraser/v1/ai-remove/get-job/${jobId}`,
    {
      headers: {
        origin:  'https://imgupscaler.ai',
        referer: 'https://imgupscaler.ai/'
      },
      timeout: 30000
    }
  )
  return res.data
}


function extractOutputUrl(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>

  
  const r = d.result as Record<string, unknown> | undefined
  if (Array.isArray(r?.output_url) && typeof r.output_url[0] === 'string') return r.output_url[0]
  if (typeof r?.output_url === 'string') return r.output_url
  if (typeof r?.url         === 'string') return r.url
  if (typeof r?.image       === 'string') return r.image

  
  if (typeof d.output_url === 'string')  return d.output_url
  if (Array.isArray(d.output_url) && typeof d.output_url[0] === 'string') return d.output_url[0]
  if (typeof d.url        === 'string')  return d.url
  if (typeof d.image      === 'string')  return d.image

  return null
}





function unwrapMsg(msg: unknown): Record<string, unknown> {
  let m = (msg || {}) as Record<string, unknown>
  for (let i = 0; i < 10; i++) {
    if (m.ephemeralMessage)           { m = (m.ephemeralMessage as Record<string, unknown>).message as Record<string, unknown> || m; continue }
    if (m.viewOnceMessage)            { m = (m.viewOnceMessage as Record<string, unknown>).message as Record<string, unknown> || m; continue }
    if (m.viewOnceMessageV2)          { m = (m.viewOnceMessageV2 as Record<string, unknown>).message as Record<string, unknown> || m; continue }
    if (m.viewOnceMessageV2Extension) { m = (m.viewOnceMessageV2Extension as Record<string, unknown>).message as Record<string, unknown> || m; continue }
    if (m.documentWithCaptionMessage) { m = (m.documentWithCaptionMessage as Record<string, unknown>).message as Record<string, unknown> || m; continue }
    break
  }
  return m
}

function pickImageNode(m: Record<string, unknown>): Record<string, unknown> | null {
  const quoted = m.quoted as Record<string, unknown> | undefined
  if (quoted?.mtype === 'imageMessage') return quoted
  if (quoted?.message) {
    const uq = unwrapMsg(quoted.message)
    if (uq?.imageMessage) return uq.imageMessage as Record<string, unknown>
  }
  if (m.message) {
    const ur = unwrapMsg(m.message)
    if (ur?.imageMessage) return ur.imageMessage as Record<string, unknown>
  }
  return null
}





const handler = async (m: any, { Morela, reply, usedPrefix, fkontak }: any) => {
  const imageNode = pickImageNode(m)

  
  if (!imageNode) return reply(
    `╭╌╌⬡「 🔮 *To 4K* 」\n` +
    `┃\n` +
    `┃ 📸 Kirim atau reply gambar\n` +
    `┃ dengan caption \`${usedPrefix}to4k\`\n` +
    `┃\n` +
    `┃ 📌 *Catatan:*\n` +
    `┃ ◦ Hasil  : *Ultra HD 4K*\n` +
    `┃ ◦ Proses : *±1–3 menit*\n` +
    `┃ ◦ AI     : *MagicEraser v4*\n` +
    `┃\n` +
    `╰╌╌⬡\n\n© ${botName}`
  )

  if ((imageNode.fileLength as number || 0) > 20 * 1024 * 1024)
    return reply('❌ Gambar terlalu besar, maksimal *20 MB*')

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  
  let buffer: Buffer
  try {
    const stream = await downloadContentFromMessage(imageNode as Parameters<typeof downloadContentFromMessage>[0], 'image')
    const chunks: Buffer[] = []
    for await (const chunk of stream) chunks.push(chunk)
    buffer = Buffer.concat(chunks)
    if (!buffer.length) throw new Error('Buffer kosong')
  } catch (e) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return reply(`❌ Gagal download gambar\n\n${(e as Error).message}`)
  }

  await Morela.sendMessage(m.chat, { react: { text: '⚙️', key: m.key } })

  
  let imageUrl: string
  try {
    imageUrl = await uploadImage(buffer)
  } catch (e) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return reply(`❌ Gagal upload gambar\n\n${(e as Error).message}`)
  }

  
  let resultUrl = ''
  let resultBuf: Buffer | null = null
  let jobId = ''
  try {
    jobId = await createJob(imageUrl)

    let result: unknown
    let attempts = 0
    const MAX_WAIT = 80 

    do {
      await new Promise(r => setTimeout(r, 3000))
      result  = await cekJob(jobId)
      attempts++
      if (attempts >= MAX_WAIT) throw new Error('Timeout: proses 4K terlalu lama (>4 menit)')
    } while ((result as Record<string, unknown>)?.code === 300006)

    
    const raw = JSON.stringify(result).slice(0, 300)
    console.log('[TO4K] response:', raw)

    const found = extractOutputUrl(result)
    if (!found) throw new Error(`Output URL tidak ditemukan\n\nResponse: ${raw}`)

    
    try {
      const imgRes = await axios.get(found, { responseType: 'arraybuffer', timeout: 60000 })
      resultBuf = Buffer.from(imgRes.data as ArrayBuffer)
    } catch {
      resultUrl = found 
    }

  } catch (e) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return reply(`❌ Proses 4K gagal\n\n${(e as Error).message}`)
  }

  
  const thumb = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : undefined

  await Morela.sendMessage(m.chat, {
    image:   resultBuf ? resultBuf : { url: resultUrl },
    caption:
      `╭╌╌⬡「 🔮 *To 4K* 」\n` +
      `┃\n` +
      `┃ ◦ 🤖 AI     : \`MagicEraser v4\`\n` +
      `┃ ◦ 🆔 Job ID : \`${jobId}\`\n` +
      `┃ ◦ ✅ Status : *Berhasil*\n` +
      `┃\n` +
      `╰╌╌⬡\n\n© ${botName}`,
    contextInfo: {
      externalAdReply: {
        title:                 '🔮 To 4K — Berhasil!',
        body:                  `${botName} Multidevice 🔥`,
        mediaType:             1,
        renderLargerThumbnail: false,
        showAdAttribution:     false,
        sourceUrl:             CHANNEL_URL,
        thumbnail:             thumb
      }
    }
  }, { quoted: fkontak || m })

  await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
}

handler.command  = ['to4k', '4k', 'upscale4k']
handler.tags     = ['tools', 'ai']
handler.help     = ['to4k — reply foto → upscale Ultra HD 4K (AI MagicEraser v4)']
handler.premium  = true
handler.noLimit  = true

export default handler