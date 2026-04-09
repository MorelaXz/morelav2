

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url as string))
const DATA_PATH = path.join(__dirname, '../data/privatemode.json')

type PrivateModeData = { enabled: boolean }

function loadData(): PrivateModeData {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      
      fs.writeFileSync(DATA_PATH, JSON.stringify({ enabled: true }, null, 2))
      return { enabled: true }
    }
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) as PrivateModeData
  } catch {
    return { enabled: true }
  }
}

function saveData(data: PrivateModeData): void {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2))
  } catch (e) {
    const err = e as Error
    console.error('[PrivateMode] Gagal simpan data:', err.message)
  }
}


export function isPrivateMode(): boolean {
  const data = loadData()
  return data.enabled === true
}


export function setPrivateMode(value: boolean): boolean {
  const data = loadData()
  data.enabled = Boolean(value)
  saveData(data)
  
  globalThis.__privateModeOn__ = data.enabled
  return data.enabled
}


const _initData = loadData()
globalThis.__privateModeOn__ = _initData.enabled
