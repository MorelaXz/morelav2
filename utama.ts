
import type {
  ExtSocket,
  GetFileResult,
  GroupData,
  MsgObj
} from './types/global.js'
import type { GroupMetadata, MediaType, AnyMessageContent } from '@itsukichan/baileys'
import type { Logger } from 'pino'
import './config.js';
import baileys from "@itsukichan/baileys";
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    downloadContentFromMessage,
    makeCacheableSignalKeyStore,
    makeInMemoryStore,
    jidDecode,
} = baileys;

import chalk from 'chalk';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import fs from 'fs';
import { fileTypeFromBuffer } from 'file-type';
import readline from 'readline';
import path from 'path';
import os from 'os';
import { smsg, getBuffer, getSizeMedia, sleep } from './System/message.js';
import './System/privatemode.js';
import morelaHandler, { invalidateGroupCache } from './Morela.js';
import { initDB, saveGroup, updateGroup, deleteGroup, getGroup, getAllGroups } from './Database/db.js';
import { getExpiredSewa, delSewa } from './Database/sewagrub.js';
import { initLimitDB } from './Database/usagelimit.js';
import { startTgBot } from './tgbot.js';
import { initTgGlobal } from './Library/tg_global.js';

initDB();
initLimitDB();
import { initStats } from "./Database/stats.js";
initStats();
import { sendWelcome } from './Plugins-ESM/admin/welcome.js';
import { sendGoodbye } from './Plugins-ESM/admin/goodbye.js';
import { initGcScheduler } from './Plugins-ESM/admin/openclose-schedule.js';


console.clear();

const usePairingCode = true;


const silentLogger: Logger = pino({ level: 'silent' }) as unknown as Logger;


type BaileysStore = ReturnType<typeof makeInMemoryStore>

function question(query: string): Promise<string> {
    const rl = readline.createInterface({
        input:  process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(query, (answer: string) => {
            rl.close();
            resolve(answer);
        });
    });
}


let _isConnecting  = false
let _currentSock: any = null

async function connectToWhatsApp(): Promise<void> {
    if (_isConnecting) {
        console.log(chalk.yellow('[CONNECT] Sudah ada proses koneksi berjalan, skip.'))
        return
    }
    _isConnecting = true

    
    if (_currentSock) {
        try { _currentSock.end(undefined) } catch {}
        _currentSock = null
    }
    console.log(chalk.hex('#a855f7').bold(`
    ╔══════════════════════════════════════════════╗
    ║                                              ║
    ║    ███╗   ███╗ ██████╗ ██████╗ ███████╗     ║
    ║    ████╗ ████║██╔═══██╗██╔══██╗██╔════╝     ║
    ║    ██╔████╔██║██║   ██║██████╔╝█████╗       ║
    ║    ██║╚██╔╝██║██║   ██║██╔══██╗██╔══╝       ║
    ║    ██║ ╚═╝ ██║╚██████╔╝██║  ██║███████╗     ║
    ║    ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝     ║
    ║                                              ║
    ║         ✦  WhatsApp Bot  v2.0  ✦            ║
    ║       Multidevice • ESM • PM2 Ready          ║
    ║                                              ║
    ╚══════════════════════════════════════════════╝`));
    console.log(chalk.hex('#a855f7')(`    ▶ Node.js ${process.version} | PID: ${process.pid}`));
    console.log(chalk.gray(`    ▶ Starting at ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n`));

    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const store: BaileysStore  = makeInMemoryStore({ logger: silentLogger });
    let version: number[];
    try { const _fv = await fetchLatestBaileysVersion(); version = _fv.version; } catch { version = [2, 3000, 1018827609]; console.warn('[WA] fetchLatestBaileysVersion gagal, pakai fallback version'); }

    const _rawSocket = makeWASocket({
        printQRInTerminal:              !usePairingCode,
        version,
        browser:                        ["Ubuntu", "Chrome", "114.0.5735.198"],
        syncFullHistory:                false,
        markOnlineOnConnect:            true,
        connectTimeoutMs:               60000,
        defaultQueryTimeoutMs:          60000,  
        keepAliveIntervalMs:            25000,  
        generateHighQualityLinkPreview: true,
        cachedGroupMetadata: async (jid: string) => store.groupMetadata?.[jid] ?? undefined,
        patchMessageBeforeSending: (message: AnyMessageContent) => {
            const m = message as Record<string, unknown>;
            if (m.buttonsMessage || m.templateMessage || m.listMessage || m.interactiveMessage) {
                return { viewOnceMessage: { message: { messageContextInfo: { deviceListMetadataVersion: 2, deviceListMetadata: {} }, ...m } } } as AnyMessageContent;
            }
            return message;
        },
        logger: silentLogger,
        auth: {
            creds: state.creds,
            keys:  makeCacheableSignalKeyStore(state.keys, silentLogger),
        }
    });

    const Morela = _rawSocket as unknown as ExtSocket;
    _currentSock = _rawSocket  
    _isConnecting = false       

    if (!Morela.authState.creds.registered) {
        await new Promise<void>(r => setTimeout(() => r(), 3000));
        const phoneNumber = await question(chalk.blue(`Enter Your Number\nYour Number: `));
        const code = await Morela.requestPairingCode(phoneNumber.trim(), "MORELAXZ");
        console.log(chalk.green.bold(`\n╔══════════════════════════════╗`));
        console.log(chalk.green.bold(`║   MORELAXZ PAIRING CODE      ║`));
        console.log(chalk.green.bold(`╠══════════════════════════════╣`));
        console.log(chalk.green.bold(`║       ${code}        ║`));
        console.log(chalk.green.bold(`╚══════════════════════════════╝\n`));
    }

    store.bind(Morela.ev);
    globalThis.__messageStore__ = store;
    globalThis.__sock__         = Morela as unknown as typeof globalThis.__sock__;

    
    setTimeout(() => initGcScheduler(Morela), 10_000)

    
    setInterval(() => {
        try {
            if (!store?.messages) return;
            let total = 0;
            for (const jid of Object.keys(store.messages)) {
                const arr = (store.messages[jid] as { array?: unknown[] })?.array;
                if (arr && arr.length > 50) {
                    total += arr.length - 50;
                    (store.messages[jid] as { array: unknown[] }).array = arr.slice(-50);
                }
            }
            if (total > 0) console.log(chalk.cyan(`[STORE-CLEANUP] Cleared ${total} old messages`));
        } catch {}
    
    }, 1 * 60 * 60 * 1000);

    
    
    
    
    async function checkAndLeaveExpiredSewa(): Promise<void> {
        try {
            const expired = getExpiredSewa()
            if (expired.length === 0) return
            console.log(chalk.yellow(`[SEWA] Ditemukan ${expired.length} grup expired — mulai proses keluar...`))
            for (const entry of expired) {
                try {
                    console.log(chalk.yellow(`[SEWA] Keluar dari: ${entry.groupName} (${entry.groupId})`))
                    await Morela.sendMessage(entry.groupId, {
                        text:
                            `⏰ *Masa sewa bot telah habis!*\n\n` +
                            `📛 Grup: *${entry.groupName}*\n` +
                            `📅 Expired: ${new Date(entry.expiryTimestamp).toLocaleDateString('id-ID', {
                                day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta'
                            })}\n\n` +
                            `Bot otomatis keluar dari grup ini.\n` +
                            `Hubungi owner untuk memperpanjang sewa. 🙏\n\n` +
                            `© ${(global as any).botName ?? 'Morela'}`
                    })
                    await new Promise(r => setTimeout(r, 2000))
                    await Morela.groupLeave(entry.groupId)
                    console.log(chalk.green(`[SEWA] ✅ Berhasil keluar: ${entry.groupName}`))
                } catch (e) {
                    console.error(chalk.red(`[SEWA] ❌ Gagal keluar dari ${entry.groupId}:`, (e as Error).message))
                }
                
                delSewa(entry.groupId)
                await new Promise(r => setTimeout(r, 1500))
            }
        } catch (e) {
            console.error(chalk.red('[SEWA SCHEDULER] Error:', (e as Error).message))
        }
    }
    
    setTimeout(() => checkAndLeaveExpiredSewa(), 15_000)
    
    setInterval(() => checkAndLeaveExpiredSewa(), 5 * 60 * 1000)
    

    Morela.ev.on('call', async (_caller: unknown) => { console.log("CALL OUTGOING"); });

    Morela.decodeJid = (jid: string): string => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            const d = jidDecode(jid) ?? {};
            return d.user && d.server ? `${d.user}@${d.server}` : jid;
        }
        return jid;
    };

    
    Morela.ev.on('messages.upsert', async (chatUpdate: Record<string, unknown>) => {
        type _ChatUpd = { type: string; messages: Array<Record<string, unknown>> }
        const _cu = chatUpdate as unknown as _ChatUpd
        try {
            if (_cu.type !== 'notify') {
                const _tmp = _cu.messages?.[0]
                const _key = _tmp?.key as Record<string,unknown> | undefined
                if (_cu.type !== 'append' || !(_key?.fromMe && !String(_key?.remoteJid ?? '').endsWith('@g.us'))) return;
            }
            let mek = _cu.messages[0] as Record<string, unknown>;
            const _mkey = mek.key as Record<string,unknown> | undefined
            if (!mek.message) return;
            if (_mkey?.fromMe && String(_mkey?.remoteJid ?? '').endsWith('@g.us')) return;
            const _outerKey = Object.keys(mek.message as Record<string,unknown>)[0];
            const _msg = mek.message as Record<string, unknown>
            if (_outerKey === 'deviceSentMessage')  mek.message = (_msg.deviceSentMessage as Record<string,unknown>)?.message  ?? mek.message;
            if (_outerKey === 'ephemeralMessage')    mek.message = (_msg.ephemeralMessage as Record<string,unknown>)?.message   ?? mek.message;
            if ((mek.key as Record<string,unknown>)?.remoteJid === 'status@broadcast') return;
            if (String((mek.key as Record<string,unknown>)?.remoteJid ?? '').includes('@newsletter')) return;
            const _kid = (mek.key as Record<string,unknown>)?.id as string | undefined
            if (!_kid || (_kid.startsWith('BAE5') && _kid.length === 16)) return;
            const m = smsg(Morela, mek, store);
            morelaHandler(Morela, m, chatUpdate, store).catch((err: Error) => {
                console.error(chalk.red('❌ morelaHandler error:'), err.message);
            });
        } catch (error) {
            console.error(chalk.red("❌ Error processing message:"), (error as Error).message);
        }
    });

    
    Morela.getFile = async (PATH: string | Buffer, save = false): Promise<GetFileResult> => {
        let res: Buffer | undefined, data: Buffer;
        if (Buffer.isBuffer(PATH))                         { data = PATH; }
        else if (/^data:.*\/.*?;base64,/i.test(PATH))     { data = Buffer.from(PATH.split(',')[1] ?? '', 'base64'); }
        else if (/^https?:\/\//.test(PATH))                { res = data = await getBuffer(PATH); }
        else if (fs.existsSync(PATH))                      { data = fs.readFileSync(PATH); }
        else                                               { data = Buffer.from(PATH); }
        const type     = await fileTypeFromBuffer(data! as unknown as Uint8Array) ?? { mime: 'application/octet-stream', ext: 'bin' };
        const filename = path.join(os.tmpdir(), `morela_${Date.now()}.${type.ext}`);
        if (save) await fs.promises.writeFile(filename, data! as unknown as Uint8Array);
        return { res, filename, size: await getSizeMedia(data!), ...type, data: data!, cleanup: () => { if (save && fs.existsSync(filename)) try { fs.unlinkSync(filename); } catch {} } };
    };

    
    Morela.downloadMediaMessage = async (message: MsgObj | Record<string, unknown>): Promise<Buffer> => {
        const msg    = message as Record<string, unknown>;
        const quoted = (msg.msg ?? msg.message ?? msg) as Record<string, unknown>;
        const mime   = String(((quoted.msg as Record<string, unknown>) ?? quoted).mimetype ?? '');
        let   mtype  = msg.mtype ? String(msg.mtype).replace(/Message/gi, '') : mime.split('/')[0];
        if (!mtype || mtype === 'undefined') {
            for (const t of ['image','video','sticker','audio','document'] as MediaType[]) {
                if (quoted[`${t}Message`] || mime.includes(t)) { mtype = t; break; }
            }
        }
        try {
            const stream = await downloadContentFromMessage(quoted as Parameters<typeof downloadContentFromMessage>[0], mtype as MediaType);
            let buf = Buffer.from([]);
            for await (const c of stream) buf = Buffer.concat([buf, c]);
            if (!buf.length) throw new Error("Empty buffer");
            return buf;
        } catch (err) {
            const u = String((quoted as Record<string, unknown>).url ?? '');
            if (u) { const r = await getBuffer(u); if (r?.length) return r; }
            throw new Error(`Download failed: ${(err as Error).message}`);
        }
    };

    
    Morela.downloadMedia = async (message: MsgObj | Record<string, unknown>, opts: { forceType?: string | null; maxRetries?: number; retryDelay?: number } = {}): Promise<Buffer> => {
        const { forceType = null, maxRetries = 3, retryDelay = 1000 } = opts;
        const msg = message as Record<string, unknown>;
        let lastErr: unknown;
        for (let i = 1; i <= maxRetries; i++) {
            try {
                const quoted = (msg.msg ?? msg.message ?? msg) as Record<string, unknown>;
                const mime   = String(((quoted.msg as Record<string, unknown>) ?? quoted).mimetype ?? '');
                let   mtype  = forceType ?? (msg.mtype ? String(msg.mtype).replace(/Message/gi,'') : mime.split('/')[0]);
                if (!mtype || mtype === 'undefined') {
                    for (const t of ['image','video','sticker','audio','document'] as MediaType[]) {
                        if (quoted[`${t}Message`] || mime.includes(t)) { mtype = t; break; }
                    }
                }
                const stream   = await downloadContentFromMessage(quoted as Parameters<typeof downloadContentFromMessage>[0], mtype as MediaType);
                const tmp      = path.join(os.tmpdir(), `morela_dl_${Date.now()}.tmp`);
                const ws       = fs.createWriteStream(tmp);
                let   bytes    = 0;
                for await (const c of stream) { ws.write(c); bytes += c.length; }
                await new Promise<void>((res, rej) => ws.end((e?: Error | null) => e ? rej(e) : res()));
                if (!bytes) { try { fs.unlinkSync(tmp); } catch {} throw new Error("Empty"); }
                const buf = fs.readFileSync(tmp);
                try { fs.unlinkSync(tmp); } catch {}
                return buf;
            } catch (e) { lastErr = e; if (i < maxRetries) await sleep(retryDelay * Math.pow(2, i-1)); }
        }
        throw lastErr ?? new Error("Download failed");
    };

    
    Morela.sendText = (jid: string, text: string, quoted: unknown = '', options: Record<string,unknown> = {}) =>
        Morela.sendMessage(jid, { text, ...options } as AnyMessageContent, { quoted });

    
    const _getStickerHelpers = () => globalThis as Record<string, unknown> as {
        writeExifImg?: (b: Buffer, o: unknown) => Promise<Buffer>;
        imageToWebp?:  (b: Buffer) => Promise<Buffer>;
        writeExifVid?: (b: Buffer, o: unknown) => Promise<Buffer>;
        videoToWebp?:  (b: Buffer) => Promise<Buffer>;
    };

    const _toBuffer = async (src: string | Buffer): Promise<Buffer> => {
        if (Buffer.isBuffer(src)) return src;
        if (/^data:.*\/.*?;base64,/i.test(src)) return Buffer.from(src.split(',')[1] ?? '', 'base64');
        if (/^https?:\/\//.test(src)) return getBuffer(src);
        if (fs.existsSync(src)) return fs.readFileSync(src);
        return Buffer.alloc(0);
    };

    Morela.sendImageAsSticker = async (jid: string, src: string | Buffer, quoted: unknown, options: Record<string, unknown> = {}) => {
        const buff = await _toBuffer(src);
        const h    = _getStickerHelpers();
        const buf  = (options.packname || options.author) && h.writeExifImg
            ? await h.writeExifImg(buff, options)
            : h.imageToWebp ? await h.imageToWebp(buff) : buff;
        await Morela.sendMessage(jid, { sticker: buf } as AnyMessageContent, { quoted });
        return buf;
    };

    Morela.sendVideoAsSticker = async (jid: string, src: string | Buffer, quoted: unknown, options: Record<string, unknown> = {}) => {
        const buff = await _toBuffer(src);
        const h    = _getStickerHelpers();
        const buf  = (options.packname || options.author) && h.writeExifVid
            ? await h.writeExifVid(buff, options)
            : h.videoToWebp ? await h.videoToWebp(buff) : buff;
        await Morela.sendMessage(jid, { sticker: buf } as AnyMessageContent, { quoted });
        return buf;
    };

    Morela.downloadAndSaveMediaMessage = async (message: Record<string, unknown>, filename: string, attachExtension: boolean = true) => {
        const msg    = message as Record<string, unknown>;
        const quoted = (msg.msg ?? msg) as Record<string, unknown>;
        const mime   = String(((quoted.msg as Record<string, unknown>) ?? quoted).mimetype ?? '');
        const mtype  = msg.mtype ? String(msg.mtype).replace(/Message/gi,'') : mime.split('/')[0];
        const stream = await downloadContentFromMessage(quoted as Parameters<typeof downloadContentFromMessage>[0], mtype as MediaType);
        let buf = Buffer.from([]);
        for await (const c of stream) buf = Buffer.concat([buf, c]);
        const type = await fileTypeFromBuffer(buf as unknown as Uint8Array);
        const name = attachExtension ? `${filename}.${type?.ext ?? 'bin'}` : filename;
        fs.writeFileSync(name, buf as unknown as Uint8Array);
        return name;
    };

    Morela.sendMedia = async (jid: string, filePath: string, caption: string = '', quoted: unknown = '', options: Record<string, unknown> = {}) => {
        const file = await Morela.getFile(filePath, true);
        const mt   = file.mime.split('/')[0];
        let   cnt: AnyMessageContent;
        if      (mt === 'image') cnt = { image: file.data, caption, ...options } as AnyMessageContent;
        else if (mt === 'video') cnt = { video: file.data, caption, ...options } as AnyMessageContent;
        else if (mt === 'audio') cnt = { audio: file.data, ptt: Boolean(options.ptt) } as AnyMessageContent;
        else                     cnt = { document: file.data, mimetype: file.mime, fileName: String(options.fileName ?? 'file') } as AnyMessageContent;
        try { await Morela.sendMessage(jid, cnt, { quoted }); } finally { file.cleanup(); }
    };

    Morela.sendPoll = async (jid: string, name: string, values: string[]) => {
        await Morela.sendMessage(jid, { poll: { name, values, selectableCount: 1 } } as AnyMessageContent);
    };

    Morela.public = true;

    
    Morela.ev.on('connection.update', async (update: Record<string, unknown>) => {
        const { connection, lastDisconnect } = update as { connection?: string; lastDisconnect?: { error?: unknown } };
        if (connection === 'close') {
            
            if (_isShuttingDown) {
                console.log(chalk.gray('[CONNECTION] Koneksi ditutup saat shutdown — skip reconnect.'));
                return;
            }
            const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
            if (statusCode === DisconnectReason.loggedOut) {
                console.log(chalk.red('❌ Logged out! Hapus folder ./session dan jalankan ulang.'));
                _writeLog('[DISCONNECT] Logged out'); process.exit(1); return;
            }
            if (statusCode === 428) {
                reconnectCount++;
                const delay428 = 5 * 60 * 1000;
                console.log(chalk.yellow('⚠️ WA tolak koneksi (428). Reconnect dalam 5 menit...'));
                _writeLog('[DISCONNECT] 428 - reconnect in 5min');
                setTimeout(() => { _isConnecting = false; connectToWhatsApp() }, delay428);
                return;
            }
            reconnectCount++;
            const delay = Math.min(5000 * Math.pow(1.5, reconnectCount - 1), 60000);
            console.log(chalk.yellow(`⚠️ Koneksi putus (${statusCode}). Reconnect ke-${reconnectCount} dalam ${Math.round(delay/1000)}s...`));
            _writeLog(`[DISCONNECT] code=${statusCode}, reconnect #${reconnectCount}`);
            setTimeout(() => { _isConnecting = false; connectToWhatsApp() }, delay);

        } else if (connection === 'open') {
            reconnectCount = 0;
            console.log(chalk.hex('#a855f7').bold('✅ Connected to WhatsApp!'));
            console.log(chalk.hex('#a855f7').bold('🤖 Morela siap digunakan!'));

            setTimeout(async () => {
                try {
                    let ownerJid: string;
                    try {
                        const lc = JSON.parse(fs.readFileSync('./data/lastchat_owner.json','utf-8')) as { jid: string };
                        ownerJid = lc.jid;
                    } catch {
                        try {
                            const { getMainOwner } = await import('./System/mainowner.js');
                            ownerJid = getMainOwner() + '@s.whatsapp.net';
                        } catch { ownerJid = (global.mainOwner ?? '').replace(/[^0-9]/g,'') + '@s.whatsapp.net'; }
                    }
                    const { execSync } = await import('child_process');
                    await Morela.sendMessage(ownerJid, { text: '📤 *PM2 Status:*\n\n```\n' + execSync('pm2 list --no-color').toString() + '\n```' });
                } catch (e) { console.error('[NOTIF ONLINE] Gagal kirim:', (e as Error).message); }
            }, 5000);

            initTgGlobal();
            startTgBot();

            try {
                const { clearAllJadibot } = await import('./Library/jadibotdb.js');
                if (!global.jadibotSessions || global.jadibotSessions.size === 0) {
                    clearAllJadibot();
                    console.log('[JADIBOTDB] jadibot.json dibersihkan saat startup');
                }
            } catch (e) { console.error('[JADIBOTDB CLEAN]', (e as Error).message); }

            setTimeout(async () => {
                try {
                    const jadibotDir = './sessions/jadibot';
                    if (fs.existsSync(jadibotDir)) {
                        const { spawnJadibot } = await import('./Plugins-ESM/owner/jadibot.js');
                        for (const nomor of fs.readdirSync(jadibotDir)) {
                            if (!global.jadibotSessions?.has(nomor)) {
                                console.log('[JADIBOT] Auto-restore:', nomor);
                                spawnJadibot(nomor, () => {}, null as never, null as never).catch(() => {});
                            }
                        }
                    }
                    setTimeout(async () => {
                        try {
                            const { syncWithSessions } = await import('./Library/jadibotdb.js');
                            if (global.jadibotSessions) { syncWithSessions(global.jadibotSessions); console.log('[JADIBOTDB] Sync selesai'); }
                        } catch (e) { console.error('[JADIBOTDB SYNC]', (e as Error).message); }
                    }, 8000);
                } catch (e) { console.error('[JADIBOT AUTO-RESTORE]', (e as Error).message); }
            }, 5000);

            setTimeout(async () => {
                try {
                    const activeJids = new Set(Object.keys(await Morela.groupFetchAllParticipating()));
                    let cleaned = 0;
                    for (const jid of Object.keys(getAllGroups())) {
                        if (!activeJids.has(jid)) { deleteGroup(jid); cleaned++; }
                    }
                    if (cleaned > 0) console.log(`[GROUP CLEANUP] Total ${cleaned} grup dihapus dari DB`);
                } catch (e) { console.error('[GROUP CLEANUP] Error:', (e as Error).message); }
            }, 10000);
        }
    });

    (Morela.ev as unknown as { on(e: string, fn: (err: Error) => void): void }).on('error', (err: Error) => {
        console.error(chalk.red("Error: "), err.message);
    });

    
    Morela.ev.on('group-participants.update', async ({ id, participants, action }: { id: string; participants: string[]; action: string }) => {
        if (id) invalidateGroupCache(id);
        const botNum     = Morela.user?.id?.replace(/[^0-9]/g, '') ?? '';
        const botJidFull = (Morela.user?.id?.split(':')[0] ?? '') + '@s.whatsapp.net';
        const botRemoved = (action === 'remove' || action === 'leave') &&
            participants.some((p: string) => p.replace(/[^0-9]/g,'') === botNum || p === botJidFull);
        if (botRemoved) { console.log(`[GROUP DB] Bot removed from ${id}`); deleteGroup(id); return; }

        const getMeta = async (): Promise<GroupMetadata | null> => {
            try {
                if ((store?.groupMetadata?.[id] as GroupMetadata)?.participants?.length > 0)
                    return store.groupMetadata[id] as GroupMetadata;
                return await Morela.groupMetadata(id);
            } catch { return null; }
        };

        if (action === 'add' && participants.length > 0) {
            try {
                const gd   = getGroup(id);
                const meta = gd?.welcome ? await getMeta() : null;
                if (gd?.welcome && meta) {
                    saveGroup(id, { id: meta.id, name: meta.subject });
                    for (const jid2 of participants) {
                        if (!jid2) continue;
                        try { await sendWelcome(Morela, id, jid2, meta.subject ?? 'Group', meta.participants?.length ?? 0, null, gd.intro ?? false); } catch {}
                    }
                }
            } catch {}
        }

        if ((action === 'remove' || action === 'leave') && participants.length > 0) {
            try {
                const gd   = getGroup(id);
                const meta = gd?.goodbye ? await getMeta() : null;
                if (gd?.goodbye && meta) {
                    saveGroup(id, { id: meta.id, name: meta.subject });
                    for (const jid3 of participants) {
                        if (!jid3) continue;
                        try { await sendGoodbye(Morela, id, jid3, meta.subject ?? 'Group', meta.participants?.length ?? 0, null); } catch {}
                    }
                }
            } catch {}
        }

        if (action === 'promote' || action === 'demote') {
            try { const m = await getMeta(); if (m) saveGroup(id, { id: m.id, name: m.subject }); } catch {}
        }
    });

    
    Morela.ev.on('groups.update', async (updates: unknown) => { const _updates = updates as Partial<GroupMetadata>[];
        for (const update of _updates) {
            if (!update.id) continue;
            invalidateGroupCache(update.id);
            const partial: Partial<GroupData> = {};
            if (update.subject) partial.name = update.subject;
            if (update.desc)    partial.desc = update.desc;
            if (Object.keys(partial).length > 0) updateGroup(update.id, partial);
        }
    });

    Morela.ev.on('creds.update', saveCreds);
}




const _logDir = './logs', _logFile = _logDir + '/error.log', _LOG_MAX = 2 * 1024 * 1024;
if (!fs.existsSync(_logDir)) fs.mkdirSync(_logDir, { recursive: true });

function _rotateLog(): void {
    try {
        if (fs.statSync(_logFile).size >= _LOG_MAX) {
            fs.renameSync(_logFile, _logFile.replace('.log', `_${Date.now()}.log`));
            const old = fs.readdirSync(_logDir).filter((f: string) => f.startsWith('error_') && f.endsWith('.log')).sort();
            while (old.length > 5) { const f = old.shift(); if (f) try { fs.unlinkSync(path.join(_logDir, f)); } catch {} }
        }
    } catch {}
}

function _writeLog(msg: string): void {
    try {
        _rotateLog();
        fs.appendFileSync(_logFile, `[${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}] ${msg}\n`);
    } catch {}
}

function _safeOwnerJid(): string | null {
    try {
        const own = JSON.parse(fs.readFileSync('./data/Own.json', 'utf-8')) as string[];
        return Array.isArray(own) && own[0] ? own[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null;
    } catch { return null; }
}


const _throttle = new Map<string, number>();
const _origErr  = console.error.bind(console);

console.error = (...args: unknown[]) => {
    _origErr(...args);
    try {
        const msg = args.map(a => typeof a === 'object'
            ? ((a as Record<string,unknown>)?.stack ?? (a as Record<string,unknown>)?.message ?? JSON.stringify(a))
            : String(a)).join(' ');
        if (!['failed','Error','error','timeout','status code'].some(k => msg.includes(k))) return;
        _writeLog(msg);
        const k = msg.slice(0, 50), last = _throttle.get(k) ?? 0;
        if (Date.now() - last < 30_000) return;
        _throttle.set(k, Date.now());
        if (_throttle.size > 100) { const now = Date.now(); for (const [k2,t] of _throttle) if (now - t > 5*60_000) _throttle.delete(k2); }
        const jid = _safeOwnerJid();
        if (jid) (globalThis.__sock__ as ExtSocket | undefined)?.sendMessage(jid, { text: '🔴 *Console Error*\n\n' + msg.slice(0, 1500) });
    } catch {}
};




let reconnectCount = 0;

process.on('uncaughtException', (err: unknown) => { const _err = err as Error; err = _err;
    const _e = err as Error;
    console.error(chalk.red.bold('🔴 [uncaughtException]'), _e.message, _e.stack);
    _writeLog('[uncaughtException] ' + (_e.stack ?? _e.message));
    const jid = _safeOwnerJid();
    if (jid) try { (globalThis.__sock__ as ExtSocket | undefined)?.sendMessage(jid, { text: '🔴 *uncaughtException*\n\n' + (_e.stack ?? _e.message).slice(0, 1500) }); } catch {}
});

process.on('unhandledRejection', (reason: unknown) => {
    const r   = reason as Error;
    const msg = r?.message ?? String(r);
    if (['Timed Out','Connection Closed','Connection Terminated','Socket connection timeout'].some(e => msg.includes(e))) return;
    console.error(chalk.red.bold('🔴 [unhandledRejection]'), msg);
    _writeLog('[unhandledRejection] ' + String(r?.stack ?? r?.message ?? r));
    const jid = _safeOwnerJid();
    if (jid) try { (globalThis.__sock__ as ExtSocket | undefined)?.sendMessage(jid, { text: '🔴 *unhandledRejection*\n\n' + String(r?.stack ?? r?.message ?? r).slice(0, 1500) }); } catch {}
});




let _isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
    if (_isShuttingDown) return;
    _isShuttingDown = true;
    console.log(chalk.yellow(`\n⚠️ [${signal}] Graceful shutdown...`));
    _writeLog(`[SHUTDOWN] ${signal}`);
    
    
    
    
    try {
        const sock = globalThis.__sock__ as (ExtSocket & { end: (e: Error) => Promise<void> }) | undefined;
        if (sock) {
            
            try { (sock as any).ws?.close?.(); } catch {}
        }
    } catch (e) { console.log(chalk.gray('[SHUTDOWN] Socket close:', (e as Error).message)); }
    console.log(chalk.green('✅ Shutdown selesai.'));
    setTimeout(() => process.exit(0), 500);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

connectToWhatsApp();
