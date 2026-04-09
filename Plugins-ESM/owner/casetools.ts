// @ts-nocheck


import Case from '../../Library/system.js'

const handler = async (m: any, { command, args, text, reply, quoted, Morela, fkontak }: any) => {

  const send = (txt) => Morela.sendMessage(m.chat, { text: txt }, { quoted: fkontak || m })

  
  const { isMainOwner: _isMO } = await import('../../System/mainowner.js')
  const { getPhoneByLid: _getPBL } = await import('../../Database/db.js')
  const _rawSnd = (m.sender || '')
  let _sndNum = _rawSnd.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
  if (_rawSnd.endsWith('@lid')) {
    const _res = _getPBL(_sndNum)
    if (_res) _sndNum = _res.replace(/[^0-9]/g, '')
  }
  if (!_isMO(_sndNum)) return send('❌ Fitur ini hanya untuk Main Owner!')
  

  if (command === 'getcase') {
    if (!text) return reply('❌ Masukkan nama case!\n\nContoh: .getcase menu')
    try {
      const hasil = Case.get(text)
      reply(`📄 *Case: ${text}*\n\n\`\`\`js\n${hasil}\n\`\`\``)
    } catch (e) {
      reply(`❌ ${(e as Error).message}`)
    }
  }

  else if (command === 'addcase') {
    if (!text) return reply('❌ Masukkan code case!\n\nContoh:\n```case "test": {\n  reply(\'Hello!\');\n  break;\n}```')
    try {
      Case.add(text)
      reply('✅ Case berhasil ditambahkan.')
    } catch (e) {
      reply(`❌ ${(e as Error).message}`)
    }
  }

  else if (command === 'delcase') {
    if (!text) return reply('❌ Masukkan nama case!\n\nContoh: .delcase test')
    try {
      Case.delete(text)
      reply(`✅ Case "${text}" berhasil dihapus.`)
    } catch (e) {
      reply(`❌ ${(e as Error).message}`)
    }
  }

  else if (command === 'listcase') {
    try {
      reply('📜 *List Case:*\n\n' + Case.list())
    } catch (e) {
      reply(`❌ ${(e as Error).message}`)
    }
  }

  else if (command === 'case2plugin') {
    const textInput = args.join(' ') || (quoted && quoted.text)
    if (!textInput) return reply('❌ Kirim code case atau reply case!\n\nContoh:\n```case "test": {\n  reply(\'Hello!\');\n  break;\n}```')

    function convertCaseToHandler(code: unknown) {
      const nameMatch = code.match(/case\s+["'](.+?)["']:/)
      const cmd = nameMatch ? nameMatch[1] : 'cmd'
      const bodyCode = code
        .replace(/case\s+["'](.+?)["']:\s*/g, '')
        .replace(/break/g, '')
        .trim()
      return `const handler = async (m: any, { text, args, reply, Morela, fkontak }: any) => {\n${bodyCode}\n}\n\nhandler.help = ['${cmd}']\nhandler.tags = ['tools']\nhandler.command = ['${cmd}']\n\nexport default handler`
    }

    const result = convertCaseToHandler(textInput)
    await reply(`✅ *CASE → HANDLER ESM*\n\n\`\`\`js\n${result}\n\`\`\``)
  }

  else if (command === 'cjs2esm') {
    const textInput = args.join(' ') || (quoted && quoted.text)
    if (!textInput) return reply('❌ Kirim kode CJS atau reply file JS!\n\nContoh:\n.cjs2esm const fs = require(\'fs\')')

    try {
      function convertCJS(code: unknown) {
        let result = code
        result = result.replace(/const\s+(\w+)\s*=\s*require\(['"](.+?)['"]\)/g, "import $1 from '$2'")
        result = result.replace(/module\.exports\s*=\s*/g, 'export default ')
        result = result.replace(/exports\.(\w+)\s*=\s*/g, 'export const $1 = ')
        return result
      }
      const esmCode = convertCJS(textInput)
      await reply(`✅ *CJS → ESM Converted*\n\n\`\`\`js\n${esmCode}\n\`\`\``)
    } catch (err) {
      reply('Gagal convert: ' + (err as Error).message)
    }
  }

  else if (command === 'esm2cjs') {
    const q = m.quoted ? m.quoted : m
    const textInput = (q.msg && (q.msg.text || q.msg.caption)) || q.text || ''
    if (!textInput) return reply('❌ Kirim/quote kode ESM yang ingin di-convert.')

    try {
      function convertEsmToCjs(code: unknown) {
        let result = code
        result = result.replace(/import\s+(\w+)\s+from\s+['"](.+?)['"]/g, "const $1 = require('$2')")
        result = result.replace(/export\s+default\s+/g, 'module.exports = ')
        result = result.replace(/export\s+const\s+(\w+)\s*=/g, 'exports.$1 =')
        return result
      }
      const converted = convertEsmToCjs(textInput)
      const buffer = Buffer.from(converted, 'utf8')
      await Morela.sendMessage(m.chat, {
        document: buffer,
        fileName: 'converted.cjs',
        mimetype: 'text/javascript'
      }, { quoted: fkontak || m })
    } catch (err) {
      console.error(err)
      reply('Gagal convert: ' + (err as Error).message)
    }
  }
}

handler.command = ['getcase', 'addcase', 'delcase', 'listcase', 'case2plugin', 'cjs2esm', 'esm2cjs']
handler.mainOwner = true
handler.noLimit = true
handler.tags    = ['owner']
handler.help    = ['getcase <n>', 'addcase <code>', 'delcase <n>', 'listcase', 'case2plugin', 'cjs2esm', 'esm2cjs']

export default handler
