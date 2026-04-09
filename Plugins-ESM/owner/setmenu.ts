// @ts-nocheck
import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { botName } from '../../Library/utils.js'

const __dirname   = path.dirname(fileURLToPath(import.meta.url as string))
const CONFIG_PATH = path.join(__dirname, '../../data/menuconfig.json')
const imagePath   = path.join(process.cwd(), 'media/menu.jpg')

function setMenuStyle(jid: string, style: string) {
  let cfg = {}
  try { cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) } catch {}
  cfg[jid] = style
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8')
}

function getMenuStyle(jid: string) {
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
    return cfg[jid] || cfg['default'] || 'v1'
  } catch { return 'v1' }
}

const STYLES = ['v1', 'v2', 'v3']

const handler = async (m: any, { Morela, args, fkontak }: any) => {
  const style   = args[0]?.toLowerCase()
  const current = getMenuStyle(m.chat)
  const menuBuf = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : null

  const send = async (text: string) => {
    if (menuBuf) {
      await Morela.sendMessage(m.chat, { image: menuBuf, caption: text }, { quoted: fkontak || m })
    } else {
      await reply(text)
    }
  }

  if (!style) {
    return send(
      `🎨 *Menu Style*\n\n` +
      `◦ Aktif: *${current.toUpperCase()}*\n` +
      `◦ Opsi : ${STYLES.map(v => v.toUpperCase()).join(', ')}\n\n` +
      `Gunakan: *.setmenu v1/v2/v3*`
    )
  }

  if (!STYLES.includes(style)) return send(`❌ Style *${style}* tidak tersedia!`)
  if (current === style) return send(`⚠️ Style *${style.toUpperCase()}* sudah aktif.`)

  setMenuStyle(m.chat, style)
  return send(`✅ Style *${style.toUpperCase()}* berhasil diaktifkan!\n\n© ${botName}`)
}

handler.command = ['setmenu', 'menustyle']
handler.tags    = ['owner']
handler.help    = ['setmenu v1/v2/v3']
handler.owner   = true 

export default handler