// @ts-nocheck
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { atomicWriteJSON } from '../../Library/utils.js'

const SAFE_PKG_RE = /^[a-zA-Z0-9@._\-/]+$/

const __filename = fileURLToPath(import.meta.url as string)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.join(__dirname, '../..')
const PKG_PATH = path.join(ROOT_DIR, 'package.json')

export default {
    command: ['addpkg', 'addpackage', 'npmadd'],
    mainOwner: true,
    noLimit: true,
    tags: ['owner'],
    help: ['addpkg <name[@version]>'],

    handler: async (m, { args, reply, fkontak }) => {

        
        const { isMainOwner: _isMO } = await import('../../System/mainowner.js')
        const { getPhoneByLid: _getPBL } = await import('../../Database/db.js')
        const _rawSnd = (m.sender || '')
        let _sndNum = _rawSnd.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
        if (_rawSnd.endsWith('@lid')) {
            const _res = _getPBL(_sndNum)
            if (_res) _sndNum = _res.replace(/[^0-9]/g, '')
        }
        if (!_isMO(_sndNum)) return reply('❌ Fitur ini hanya untuk Main Owner!')
        

        if (!args[0]) {
            return reply(
                '📦 *NPM Package Installer*\n\n' +
                '❌ Format salah!\n\n' +
                '*Contoh:*\n' +
                '• .addpkg archiver\n' +
                '• .addpkg archiver@5.3.1\n' +
                '• .addpkg moment@latest'
            )
        }

        const pkgInput = args[0]
        const pkgName = pkgInput.split('@')[0]
        const pkgVersion = pkgInput.includes('@')
            ? pkgInput.split('@').slice(1).join('@')
            : 'latest'

        if (!SAFE_PKG_RE.test(pkgName) || !SAFE_PKG_RE.test(pkgVersion)) {
            return reply('❌ Nama atau versi package mengandung karakter tidak valid!')
        }

        if (!fs.existsSync(PKG_PATH)) {
            return reply('❌ package.json tidak ditemukan')
        }

        let pkg
        try {
            pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'))
        } catch (err) {
            return reply(`❌ package.json rusak:\n${(err as Error).message}`)
        }

        pkg.dependencies ||= {}

        pkg.dependencies[pkgName] = pkgVersion

        try {
            await atomicWriteJSON(PKG_PATH, pkg)
        } catch (err) {
            return reply(`❌ Gagal update package.json:\n${(err as Error).message}`)
        }

        reply(
            `📦 *Installing Package*\n\n` +
            `Package: ${pkgName}\n` +
            `Version: ${pkgVersion}\n\n` +
            `⏳ Mohon tunggu...`
        )

        const proc = spawn('npm', ['install', `${pkgName}@${pkgVersion}`], {
            cwd: ROOT_DIR,
            shell: false   
        })

        let stderr = ''
        proc.stderr.on('data', (d) => { stderr += d.toString() })

        proc.on('close', (code) => {
            if (code !== 0) {
                return reply(
                    `❌ *Install Gagal*\n\n` +
                    `Package: ${pkgName}@${pkgVersion}\n\n` +
                    `Error:\n${stderr.slice(0, 800) || 'Exit code ' + code}`
                )
            }
            reply(
                `✅ *Install Berhasil!*\n\n` +
                `📦 Package: ${pkgName}@${pkgVersion}\n` +
                `✓ Sudah ditambahkan ke dependencies\n` +
                `✓ Siap digunakan dalam plugin`
            )
        })

        proc.on('error', (err) => {
            reply(`❌ Gagal menjalankan npm:\n${(err as Error).message}`)
        })
    }
}