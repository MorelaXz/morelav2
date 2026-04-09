// @ts-nocheck


import chalk from 'chalk'


const CONFIG = {
  
  DELAY_OWNER   : 50,     
  DELAY_PREMIUM : 100,    
  DELAY_USER    : 150,    
  DELAY_MEDIA   : 300,    

  
  MAX_PER_SECOND : 20,    
  GLOBAL_DELAY   : 20,    

  
  MAX_QUEUE_PER_JID : 30, 

  
  PRIORITY_OWNER   : 3,
  PRIORITY_PREMIUM : 2,
  PRIORITY_USER    : 1,
  PRIORITY_SYSTEM  : 9,   
}


let _sock           = null       
let _processing     = false      
let _globalQueue    = []         
let _perJidCount    = new Map()  
let _lastSentTime   = 0          
let _sentThisSecond = 0          
let _lastSecond     = 0          


const _stats = {
  totalQueued   : 0,
  totalSent     : 0,
  totalDropped  : 0,
  totalErrors   : 0,
  queueSize     : () => _globalQueue.length
}


export function initQueue(sock: unknown) {
  _sock = sock
  console.log(chalk.green('[MSGQUEUE] Message Queue initialized ✅'))
}


export function enqueue(jid: unknown, content: unknown, opts: unknown = {}, options: unknown = {}) {
  return new Promise((resolve, reject) => {
    const {
      priority = CONFIG.PRIORITY_USER,
      isMedia  = false
    } = options

    
    const jidCount = _perJidCount.get(jid) || 0
    if (jidCount >= CONFIG.MAX_QUEUE_PER_JID) {
      _stats.totalDropped++
      console.warn(chalk.yellow(`[MSGQUEUE] Drop: JID ${jid} queue penuh (${jidCount}/${CONFIG.MAX_QUEUE_PER_JID})`))
      
      return resolve(null)
    }

    const item = {
      jid,
      content,
      opts,
      priority,
      isMedia,
      resolve,
      reject,
      queuedAt: Date.now()
    }

    _globalQueue.push(item)
    _globalQueue.sort((a, b) => b.priority - a.priority) 

    _perJidCount.set(jid, jidCount + 1)
    _stats.totalQueued++

    if (!_processing) _drain()
  })
}


export function sendQueued(jid: unknown, content: unknown, opts: unknown = {}, userLevel: unknown = 'user') {
  const priority = userLevel === 'owner'   ? CONFIG.PRIORITY_OWNER
                 : userLevel === 'premium' ? CONFIG.PRIORITY_PREMIUM
                 : CONFIG.PRIORITY_USER

  const isMedia = !!(
    content?.image || content?.video || content?.audio ||
    content?.sticker || content?.document
  )

  return enqueue(jid, content, opts, { priority, isMedia })
}


export function sendSystem(jid: unknown, content: unknown, opts: unknown = {}) {
  return enqueue(jid, content, opts, { priority: CONFIG.PRIORITY_SYSTEM })
}


async function _drain() {
  if (_processing || !_sock || _globalQueue.length === 0) return
  _processing = true

  while (_globalQueue.length > 0) {
    const item = _globalQueue.shift()
    const { jid, content, opts, priority, isMedia, resolve, reject } = item

    
    const cur = _perJidCount.get(jid) || 0
    if (cur <= 1) _perJidCount.delete(jid)
    else _perJidCount.set(jid, cur - 1)

    
    const now    = Date.now()
    const second = Math.floor(now / 1000)

    if (second !== _lastSecond) {
      _sentThisSecond = 0
      _lastSecond     = second
    }

    if (_sentThisSecond >= CONFIG.MAX_PER_SECOND) {
      
      const wait = ((_lastSecond + 1) * 1000) - now + 10
      await _sleep(wait)
      _sentThisSecond = 0
    }

    
    const timeSinceLast = Date.now() - _lastSentTime
    const delay = isMedia  ? CONFIG.DELAY_MEDIA
                : priority === CONFIG.PRIORITY_SYSTEM  ? 50
                : priority === CONFIG.PRIORITY_OWNER   ? CONFIG.DELAY_OWNER
                : priority === CONFIG.PRIORITY_PREMIUM ? CONFIG.DELAY_PREMIUM
                : CONFIG.DELAY_USER

    if (timeSinceLast < delay) {
      await _sleep(delay - timeSinceLast)
    }

    
    try {
      const result = await _sock.sendMessage(jid, content, opts)
      _lastSentTime = Date.now()
      _sentThisSecond++
      _stats.totalSent++
      resolve(result)
    } catch (e) {
      _stats.totalErrors++
      console.error(chalk.red(`[MSGQUEUE] Error kirim ke ${jid}:`), (e as Error).message)
      reject(e)
    }

    
    await _sleep(CONFIG.GLOBAL_DELAY)
  }

  _processing = false
}


export function flushJid(jid: unknown) {
  const before = _globalQueue.length
  _globalQueue = _globalQueue.filter(item => {
    if (item.jid === jid) {
      item.resolve(null) 
      return false
    }
    return true
  })
  _perJidCount.delete(jid)
  const flushed = before - _globalQueue.length
  if (flushed > 0) console.log(chalk.cyan(`[MSGQUEUE] Flush ${flushed} pesan dari ${jid}`))
  return flushed
}


export function getQueueStats() {
  return {
    ..._stats,
    queueSize:       _globalQueue.length,
    processing:      _processing,
    perJidCount:     Object.fromEntries(_perJidCount),
    sentThisSecond:  _sentThisSecond
  }
}


const _sleep = (ms) => new Promise(r => setTimeout(r, ms))

export default { initQueue, enqueue, sendQueued, sendSystem, flushJid, getQueueStats, CONFIG }
