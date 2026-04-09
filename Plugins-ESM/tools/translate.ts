// @ts-nocheck
import axios from 'axios'
import { botName } from '../../Library/utils.js'

const handler = async (m, { Morela, reply, command, text, args, isOwn, isPrem, isAdmin, botAdmin, fkontak, usedPrefix }) => {
  if (!text) return reply(`Contoh: ${usedPrefix}${command} <teks> [tujuan]\nContoh: .terjemah halo dunia id`)
  
  try {
    
    const parts = text.trim().split(' ')
    let targetLang = 'id' 
    let queryText = text
    
    
    const lastPart = parts[parts.length - 1]
    const secondLast = parts[parts.length - 2]

    if (/^[a-z]{2}$/.test(lastPart)) {
      targetLang = lastPart
      
      const connectors = ['to', 'ke', 'into', 'dalam']
      if (connectors.includes(secondLast?.toLowerCase())) {
        queryText = parts.slice(0, -2).join(' ') 
      } else {
        queryText = parts.slice(0, -1).join(' ') 
      }
    }
    
    if (!queryText) return reply('Teks yang akan diterjemahkan tidak boleh kosong!')
    
    await reply('🔄 Sedang menerjemahkan...')
    
    
    const translateResponse = await axios.get('https://api.mymemory.translated.net/get', {
      params: {
        q: queryText,
        langpair: `en|${targetLang}`  
      },
      timeout: 10000
    })
    
    const translatedText = translateResponse.data.responseData?.translatedText
    
    if (!translatedText || translatedText === queryText) {
      
      return reply(`🌐 Hasil Terjemahan:\n\n${queryText}\n\n_(Bahasa mungkin sudah sesuai atau tidak ada terjemahan yang tersedia)_`)
    }
    
    reply(`🌐 Hasil Terjemahan:\n\n${translatedText}`)
    
  } catch (e) {
    console.error('Translation error:', e)
    
    if (e.message?.includes('timeout') || e.message?.includes('NetworkError')) {
      reply(`❌ Error: Koneksi timeout atau gangguan jaringan. Coba lagi dalam beberapa saat.`)
    } else if (e.message?.includes('429') || e.message?.includes('rate limit')) {
      reply(`❌ Error: Terlalu banyak request. Tunggu beberapa menit sebelum mencoba lagi.`)
    } else {
      reply(`❌ Error: Gagal menerjemahkan teks. Pastikan koneksi internet stabil dan coba lagi.`)
    }
  }
}

handler.command  = ['terjemah', 'translate', 'tl']
handler.tags     = ['tools']
handler.owner    = false
handler.premium  = false
handler.noLimit  = false
handler.help     = ['terjemah <teks> [bahasa tujuan>', 'translate <text> [target lang>', 'tl <teks> [tujuan>']
export default handler