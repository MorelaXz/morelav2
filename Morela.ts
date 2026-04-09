

import type { MsgObj, ExtSocket } from './types/global.js'
import type { GroupMetadata } from '@itsukichan/baileys'
import { isSelfMode, isAllowedWhenSelf } from './System/selfmode.js'
import { isPrivateMode } from './System/privatemode.js'
import './config.js';
import { promises as fsPromises } from 'fs';
import fs from 'fs';
import util from 'util';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import crypto from 'crypto';
import { DateTime } from 'luxon';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import baileys from '@itsukichan/baileys';

const {
    downloadContentFromMessage,
    proto,
    generateWAMessage,
    getContentType,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    areJidsSameUser
} = baileys;

const __filename = fileURLToPath(import.meta.url as string);
const __dirname = path.dirname(__filename);

const execPromise = promisify(exec);

import {
    smsg,
    tanggal,
    getTime,
    isUrl,
    sleep,
    clockString,
    runtime,
    fetchJson,
    getBuffer,
    jsonformat,
    format,
    parseMention,
    getRandom,
    getGroupAdm,
    generateProfilePicture
} from './System/message.js';

import Case from './Library/system.js';
import { getGreeting } from './Library/utils.js';
import { runPassiveHandlers } from './Plugins-ESM/_pluginmanager.js';
import handleMessage from './Library/handle.js';
import { isJadibot, hasAnyJadibot, listJadibot } from './Library/jadibotdb.js';
import { getMainOwner, isMainOwner } from './System/mainowner.js';









const FKONTAK_PATH     = path.join(process.cwd(), 'data', 'fkontak_cache.json')
const FKONTAK_TTL_MS   = 7 * 24 * 60 * 60 * 1000  
let   _fkontakMemCache: import('@itsukichan/baileys').WAMessage | null = null   


function _loadFkontakFromFile(): unknown | null {
    try {
        if (!fs.existsSync(FKONTAK_PATH)) return null
        const raw  = fs.readFileSync(FKONTAK_PATH, 'utf-8')
        const data = JSON.parse(raw)
        
        if (data && data._savedAt && (Date.now() - data._savedAt) < FKONTAK_TTL_MS) {
            return data.fkontak
        }
        return null 
    } catch { return null }
}


function _saveFkontakToFile(fkontak: unknown): void {
    try {
        const dir = path.dirname(FKONTAK_PATH)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(FKONTAK_PATH, JSON.stringify({
            _savedAt : Date.now(),
            fkontak
        }, null, 2))
    } catch (e) {
        const _err = e as Error
        console.error('[FKONTAK] Gagal simpan cache:', _err.message)
    }
}


export function invalidateFkontakCache(): void {
    _fkontakMemCache = null
    try { if (fs.existsSync(FKONTAK_PATH)) fs.unlinkSync(FKONTAK_PATH) } catch {}
    console.log('[FKONTAK] Cache direset — akan fetch ulang ke WA saat dibutuhkan')
}

const OWNER_PATH = './data/Own.json';
const PREMIUM_PATH = './data/Prem.json';


let _ownerCache: string[] | null = null
let _ownerCacheTime = 0
const OWNER_CACHE_TTL = 5 * 60 * 1000 

async function getOwnerList(): Promise<string[]> {
    const now = Date.now()
    if (_ownerCache && (now - _ownerCacheTime) < OWNER_CACHE_TTL) {
        return _ownerCache
    }
    try {
        if (fs.existsSync(OWNER_PATH)) {
            
            _ownerCache = JSON.parse(fs.readFileSync(OWNER_PATH, 'utf-8'))
            _ownerCacheTime = now
        }
        if (!_ownerCache?.length && global.owner) {
            _ownerCache = Array.isArray(global.owner) ? global.owner : [global.owner]
        }
    } catch (e) {
        console.error('Error loading owner data:', e)
        if (global.owner) {
            _ownerCache = Array.isArray(global.owner) ? global.owner : [global.owner]
        }
    }
    return _ownerCache || []
}


export function invalidateOwnerCache(): void {
    _ownerCache = null
    _ownerCacheTime = 0
}


let _premiumCache: string[] | null = null
let _premiumCacheTime = 0
const PREMIUM_CACHE_TTL = 5 * 60 * 1000 

async function getPremiumList(): Promise<string[]> {
    const now = Date.now()
    if (_premiumCache && (now - _premiumCacheTime) < PREMIUM_CACHE_TTL) {
        return _premiumCache
    }
    try {
        if (fs.existsSync(PREMIUM_PATH)) {
            
            _premiumCache = JSON.parse(fs.readFileSync(PREMIUM_PATH, 'utf-8'))
            _premiumCacheTime = now
        }
    } catch (e) {
        console.error('Error loading premium data:', e)
    }
    return _premiumCache || []
}


export function invalidatePremiumCache(): void {
    _premiumCache = null
    _premiumCacheTime = 0
}









import { saveGroup as dbSaveGroup, getGroup as dbGetGroup, saveLidMap, getPhoneByLid } from './Database/db.js';

type _GroupCacheEntry = { data: Record<string, unknown>; timestamp: number }
const groupMetadataCache = new Map<string, _GroupCacheEntry>();
const GROUP_CACHE_TTL    = 10 * 60 * 1000; 
const GROUP_FETCH_TIMEOUT = 5000;           
const pendingGroupFetch  = new Map<string, Promise<Record<string, unknown>>>();


(globalThis as Record<string, unknown>).__groupMetadataCache__ = groupMetadataCache;

async function getGroupMetadataCached(sock: Record<string, unknown>, groupJid: string, store: Record<string, unknown> | null): Promise<Record<string, unknown>> {
    const now = Date.now();

    
    const cached = groupMetadataCache.get(groupJid);
    if (cached && (now - cached.timestamp) < GROUP_CACHE_TTL) {
        return cached.data;
    }

    
    const _storeGM = store?.groupMetadata as Record<string, Record<string, unknown>> | undefined;
    if (_storeGM && _storeGM[groupJid]) {
        const storeData = _storeGM[groupJid];
        if (storeData && (storeData.participants as unknown[])?.length > 0) {
            groupMetadataCache.set(groupJid, { data: storeData, timestamp: now });
            return storeData;
        }
    }

    
    const dbData = dbGetGroup(groupJid);
    if (dbData && (dbData.participants as unknown[])?.length > 0) {
        groupMetadataCache.set(groupJid, { data: dbData, timestamp: now });
        return dbData;
    }

    
    if (pendingGroupFetch.has(groupJid)) {
        return (pendingGroupFetch.get(groupJid) as Promise<Record<string, unknown>>);
    }

    const fetchPromise = Promise.race([
        (sock.groupMetadata as (jid: string) => Promise<Record<string, unknown>>)(groupJid),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`groupMetadata timeout: ${groupJid}`)), GROUP_FETCH_TIMEOUT)
        )
    ]).then((data: unknown) => {
        const dataObj = data as Record<string, unknown>;
        groupMetadataCache.set(groupJid, { data: dataObj, timestamp: Date.now() });
        dbSaveGroup(groupJid, dataObj as import('./types/global.js').GroupData);
        pendingGroupFetch.delete(groupJid);
        return dataObj;
    }).catch(err => {
        pendingGroupFetch.delete(groupJid);
        throw err;
    });

    pendingGroupFetch.set(groupJid, fetchPromise as Promise<Record<string, unknown>>);
    return fetchPromise;
}


export function invalidateGroupCache(groupJid: string): void {
    groupMetadataCache.delete(groupJid);
}

const Morela = async (Morela: ExtSocket, m: MsgObj, chatUpdate: Record<string, unknown>, store: Record<string, unknown> | null): Promise<void> => {
    try {
        let body = '';
        
        
        if (m.message?.interactiveResponseMessage) {
            const interactiveResponse = m.message.interactiveResponseMessage;
            const nativeFlowResponse = interactiveResponse.nativeFlowResponseMessage;

            if (nativeFlowResponse) {
                try {
                    const paramsJson = JSON.parse(nativeFlowResponse.paramsJson);
                    body = paramsJson.id || paramsJson.display_text || interactiveResponse.body?.text || '';
                } catch (e) {
                    body = interactiveResponse.body?.text || '';
                    console.error('[InteractiveResponse] paramsJson parse error:', (e as Error).message);
                }
            } else {
                body = interactiveResponse.body?.text || '';
            }
        }
        
        else if (m.message?.listResponseMessage) {
            body = m.message.listResponseMessage.singleSelectReply?.selectedRowId || '';
        }
        
        else if (m.message?.templateButtonReplyMessage) {
            body = m.message.templateButtonReplyMessage.selectedId || "";
        }
        else if (m.message?.buttonsResponseMessage) {
            body = m.message.buttonsResponseMessage.selectedButtonId || '';
        }
        
        else {
            const messageTypes = {
                conversation: m.message?.conversation || '',
                imageMessage: m.message?.imageMessage?.caption || '',
                videoMessage: m.message?.videoMessage?.caption || '',
                audioMessage: m.message?.audioMessage?.caption || '',
                stickerMessage: m.message?.stickerMessage?.caption || '',
                documentMessage: m.message?.documentMessage?.fileName || '',
                extendedTextMessage: m.message?.extendedTextMessage?.text || '',
            };

            if (m.mtype && (messageTypes as Record<string, string>)[m.mtype]) {
                body = (messageTypes as Record<string, string>)[m.mtype];
            } else if (m.text) {
                body = m.text;
            } else {
                body = '';
            }
        }

        const budy = (typeof m.text === 'string' ? m.text : '');
        const prefixPattern = /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi;
        const prefixMatch = body.match(prefixPattern);
        const prefix = global.prefa ? (prefixMatch ? prefixMatch[0] : "") : (global.prefa ?? global.prefix);

        
        
        
        
        
        
        
        
        const _hasAnyJadibotActive = (global.jadibotSessions?.size ?? 0) > 0
        if (!m._isJadibot && _hasAnyJadibotActive) {
            const _isGroup = (m.key?.remoteJid as string || '').endsWith('@g.us')
            const _rawSender = _isGroup
                ? (m.key?.participant || m.key?.remoteJid || '')
                
                : m.fromMe ? '' : (m.key?.remoteJid || m.sender || '')
            const _rawStr = (_rawSender as string) || ''
            let _quickNum = _rawStr.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
            
            if (_rawStr.endsWith('@lid')) {
                const _lidNum = _rawStr.split('@')[0]
                const _resolved = getPhoneByLid(_lidNum)
                if (_resolved) _quickNum = _resolved.replace(/[^0-9]/g, '')
            }
            
            if (_quickNum && !isMainOwner(_quickNum)) return
        }
        

        let Owner: string[] = [];
        let Premium: string[] = [];

        Owner = await getOwnerList();
        Premium = await getPremiumList();

        const CMD = body.startsWith(prefix);
        const command = CMD ? body.slice(prefix.length).trim().split(' ')[0].toLowerCase() : '';
        const args = CMD ? body.slice(prefix.length).trim().split(' ').slice(1) : [];
        const text = args.join(' ');

        const BotNum = await Morela.decodeJid(Morela.user?.id ?? '');
        const botJid = BotNum.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        
        const from = m.key.remoteJid;
        const sender = m.isGroup ? (m.key.participant || m.participant) : m.key.remoteJid;
        const pushname = m.pushName || "No Name";
        
        
        
        
        
        
        let senderNumber: string | null = null;
        let groupMetadata: Record<string, unknown> | null = null;
        let groupName: string = "";
        let participants: Array<{ id: string; admin?: string | null; lid?: string }> = [];
        let groupAdmin: string[] = [];
        let botAdmin: boolean = false;
        let isAdmin: boolean = false;

        
        
        const senderRaw = m.sender || m.key.participant || m.key.remoteJid || '';
        const senderIsLid = senderRaw.endsWith('@lid');
        
        if (m.isGroup) {
            try {
                groupMetadata = await getGroupMetadataCached(Morela, from, store);
                groupName = (groupMetadata.subject as string) || "";
                participants = (groupMetadata.participants as Array<{ id: string; admin?: string | null; lid?: string }>) || [];
                
                let senderParticipant = null;
                
                if (senderIsLid) {
                    const senderLid = senderRaw.split('@')[0];
                    senderParticipant = participants.find(function (p) {
                        if (p.lid) {
                            return p.lid.split('@')[0] === senderLid;
                        }
                        return false;
                    });
                }
                
                if (!senderParticipant) {
                    
                    const senderNum = senderRaw.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
                    senderParticipant = participants.find(function (p) {
                        const pNum = p.id.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
                        return pNum === senderNum && pNum.length > 4;
                    });
                }
                
                if (senderParticipant) {
                    senderNumber = senderParticipant.id.split('@')[0].split(':')[0];
                    isAdmin = senderParticipant.admin === 'admin' || senderParticipant.admin === 'superadmin';
                    
                    if (senderIsLid) {
                        const senderLid = senderRaw.split('@')[0];
                        saveLidMap(senderLid, senderNumber);
                    }
                } else {
                    
                    
                    try {
                        const liveMeta = await (Morela.groupMetadata as (jid: string) => Promise<Record<string, unknown>>)(from);
                        if (liveMeta) {
                            groupMetadataCache.set(from, { data: liveMeta, timestamp: Date.now() });
                            const liveParticipants = (liveMeta.participants as Array<{ id: string; admin?: string | null }>) || [];
                            const senderClean = senderRaw.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
                            const liveSender = liveParticipants.find(p => {
                                const pNum = p.id.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
                                return pNum === senderClean && pNum.length > 4;
                            });
                            if (liveSender) {
                                senderNumber = liveSender.id.split('@')[0].split(':')[0];
                                isAdmin = liveSender.admin === 'admin' || liveSender.admin === 'superadmin';
                                participants = liveParticipants;
                                console.log(chalk.cyan(`[LIVE FETCH] sender ditemukan: ${senderNumber}, isAdmin=${isAdmin}`));
                            }
                        }
                    } catch (liveErr) {
                        console.warn(`[LIVE FETCH FAILED] ${(liveErr as Error).message}`);
                    }

                    if (!senderNumber) {
                        if (senderIsLid) {
                            const senderLid = senderRaw.split('@')[0];
                            const mappedPhone = getPhoneByLid(senderLid);
                            if (mappedPhone) {
                                senderNumber = mappedPhone;
                                console.log(chalk.cyan(`[LID RESOLVED VIA MAP] ${senderLid} → ${senderNumber}`));
                            } else {
                                senderNumber = senderLid;
                            }
                        } else {
                            senderNumber = senderRaw.split('@')[0].split(':')[0];
                        }
                    }
                }
                
                groupAdmin = await getGroupAdm(participants);
                
                const botNumber = botJid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
                botAdmin = groupAdmin.some(admin => {
                    const adminNum = admin.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
                    return adminNum === botNumber && adminNum.length > 4;
                });
                
            } catch (error) {
                const _gerr = error as Error
                const isTimeout = _gerr.message && _gerr.message.includes('timeout');
                console.error(isTimeout
                    ? `[GROUP METADATA TIMEOUT] Grup ${from} - mencoba LID map fallback...`
                    : `[GROUP METADATA ERROR]: ${_gerr.message}`
                );
                
                if (senderIsLid) {
                    const senderLid = senderRaw.split('@')[0];
                    const mappedPhone = getPhoneByLid(senderLid);
                    if (mappedPhone) {
                        senderNumber = mappedPhone;
                        console.log(chalk.green(`[LID MAP FALLBACK] ${senderLid} → ${senderNumber}`));
                    } else {
                        senderNumber = senderLid;
                    }
                } else {
                    senderNumber = senderRaw.split('@')[0].split(':')[0];
                }
            }
        } else {
            
            
            
            
            
            
            
            const privateSenderRaw = (senderRaw || m.key?.remoteJid || m.sender || '') as string
            const privateIsLid = privateSenderRaw.endsWith('@lid')

            if (privateIsLid) {
                const senderLid = privateSenderRaw.split('@')[0]
                const mappedPhone = getPhoneByLid(senderLid)
                if (mappedPhone) {
                    senderNumber = mappedPhone
                    console.log(chalk.cyan(`[LID PRIVATE] ${senderLid} → ${senderNumber}`))
                } else {
                    senderNumber = senderLid
                    console.log(chalk.yellow(`[LID PRIVATE UNMAPPED] ${senderLid}`))
                }
            } else {
                
                senderNumber = privateSenderRaw.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
            }
        }
        
        
        
        
        
        
        if (senderNumber && !/^\d+$/.test(senderNumber)) {
            
            const _lidClean = senderNumber.replace(/[^0-9]/g, '')
            const _lidResolved = getPhoneByLid(_lidClean)
            if (_lidResolved) {
                console.log(chalk.green(`[SAFETY NET] senderNumber LID ${senderNumber} → ${_lidResolved}`))
                senderNumber = _lidResolved
            }
        }

        const MAIN_OWNER_NUM = getMainOwner()

        
        const botNumber = botJid.split('@')[0].split(':')[0];

        
        
        
        
        
        
        
        
        
        
        
        
        const jadibotNumber = m._isJadibot ? botNumber : null;
        const senderIsJadibotItself: boolean = !!(jadibotNumber && senderNumber === jadibotNumber);

        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        const _sessionsActive = (global.jadibotSessions?.size ?? 0) > 0
        const isActiveJadibotSender = _sessionsActive && !!(
            senderNumber &&
            (MAIN_OWNER_NUM ? senderNumber !== MAIN_OWNER_NUM : true) &&
            (global.jadibotSessions?.has(senderNumber) || isJadibot(senderNumber))
        );

        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        const _cleanMainOwner = MAIN_OWNER_NUM ? MAIN_OWNER_NUM.replace(/[^0-9]/g, '') : ''
        const _cleanBotNum    = botNumber.replace(/[^0-9]/g, '')
        const _cleanSender    = senderNumber ? String(senderNumber).replace(/[^0-9]/g, '') : ''

        
        if (command) {
            console.log(chalk.gray(`[OWNER DEBUG] sender=${_cleanSender} mainOwner=${_cleanMainOwner} bot=${_cleanBotNum} isGroup=${m.isGroup}`))
        }

        const isOwn: boolean = !!(!senderIsJadibotItself && !isActiveJadibotSender &&
            (_cleanSender && _cleanSender.length > 3) && (
                m._isJadibot
                    
                    
                    ? (
                        (_cleanMainOwner && _cleanSender === _cleanMainOwner) ||
                        Owner.some(ownerNum => {
                            const cleanOwnerNum = ownerNum.replace(/[^0-9]/g, '')
                            return _cleanSender === cleanOwnerNum
                        })
                    )
                    
                    : (
                        Owner.some(ownerNum => {
                            const cleanOwnerNum = ownerNum.replace(/[^0-9]/g, '')
                            return _cleanSender === cleanOwnerNum
                        }) ||
                        _cleanSender === _cleanBotNum ||
                        (_cleanMainOwner && _cleanSender === _cleanMainOwner)
                    )
            ));

        
        const isPrem: boolean = !!(!senderIsJadibotItself && !isActiveJadibotSender && (
            m._isJadibot
                ? (
                    (_cleanMainOwner && _cleanSender === _cleanMainOwner) ||
                    Owner.some(ownerNum => {
                        const cleanOwnerNum = ownerNum.replace(/[^0-9]/g, '')
                        return _cleanSender === cleanOwnerNum
                    }) ||
                    Premium.some(premNum => {
                        const cleanPremNum = premNum.replace(/[^0-9]/g, '')
                        return _cleanSender === cleanPremNum
                    }) ||
                    _cleanSender === _cleanBotNum
                )
                : (
                    Premium.some(premNum => {
                        const cleanPremNum = premNum.replace(/[^0-9]/g, '')
                        return _cleanSender === cleanPremNum
                    }) ||
                    _cleanSender === _cleanBotNum
                )
        ));

        
        
        
        
        
        
        
        const isSuperOwn = !!(
            _cleanMainOwner &&
            _cleanSender === _cleanMainOwner &&
            !senderIsJadibotItself
        );
        
        
        const fatkuns = m.quoted || m;
        let quoted = m.quoted || null;

        if (fatkuns.mtype === 'buttonsMessage') {
            quoted = fatkuns[Object.keys(fatkuns)[1]];
        } else if (fatkuns.mtype === 'templateMessage') {
            quoted = fatkuns.hydratedTemplate?.[Object.keys(fatkuns.hydratedTemplate)[1]];
        } else if (fatkuns.mtype === 'product') {
            quoted = fatkuns[Object.keys(fatkuns)[0]];
        }

        
        
        
        
        
        const getFkontak = async () => {
            
            if (_fkontakMemCache) return _fkontakMemCache

            
            const fromFile = _loadFkontakFromFile()
            if (fromFile) {
                _fkontakMemCache = fromFile  
                return _fkontakMemCache
            }

            
            try {
                const { buildFkontak: _bfk } = await import('./Library/utils.js')
                const fresh = await _bfk(Morela)
                _fkontakMemCache = fresh
                _saveFkontakToFile(fresh)  
                return _fkontakMemCache
            } catch {
                return m  
            }
        }

        const reply = async (teks: string): Promise<unknown> => {
            const fk = await getFkontak()
            return Morela.sendMessage(m.chat, { text: teks }, { quoted: fk })
        };

        const time = DateTime.now().setZone("Asia/Jakarta").toFormat("HH:mm:ss");
        const ucapanWaktu = getGreeting();

        const todayDateWIB = new Date().toLocaleDateString('id-ID', {
            timeZone: 'Asia/Jakarta',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const RunTime = `_${runtime(process.uptime())}_`;

        const pickRandom = (arr: unknown[]): unknown => {
            return arr[Math.floor(Math.random() * arr.length)];
        };

        if (command && !m.message?.reactionMessage) {
            const logBox = (title: string, color: string, items: string[]): void => {
                const boxTop = `╭${'─'.repeat(58)}╮`;
                const boxBottom = `╰${'─'.repeat(58)}╯`;

                console.log(chalk.hex(color).bold(boxTop));
                console.log(chalk.hex(color).bold(`│ ${title.padEnd(56)} │`));
                console.log(chalk.hex(color).bold(`├${'─'.repeat(58)}┤`));

                items.forEach(item => {
                    console.log(chalk.hex(color).bold(`│ ${item.padEnd(56)} │`));
                });

                console.log(chalk.hex(color).bold(boxBottom));
            };

            const logItems = [
                `📅 ${chalk.cyan('Date')}    : ${todayDateWIB}`,
                `🕐 ${chalk.cyan('Time')}    : ${time}`,
                `💬 ${chalk.cyan('Type')}    : ${m.mtype}`,
                `🗣️ ${chalk.cyan('Sender')}  : ${pushname}`,
                `🤖 ${chalk.cyan('Bot')}     : ${BotNum}`,
                `📝 ${chalk.cyan('Command')} : ${chalk.yellow(command)}`,
                `📋 ${chalk.cyan('Args')}    : ${args.length > 0 ? chalk.green(args.join(' ')) : chalk.gray('None')}`
            ];
            if (m.isGroup) {
                logItems.splice(3, 0, `🌍 ${chalk.cyan('Group')}   : ${groupName}`);
                logItems.splice(4, 0, `🔑 ${chalk.cyan('Chat ID')} : ${m.chat}`);
                logBox(`📱 GROUP MESSAGE • ${groupName}`, '#3498db', logItems);
            } else {
                logBox(`🔒 PRIVATE MESSAGE • ${pushname}`, '#9b59b6', logItems);
            }
        }

        const handleDataesm = { 
            Morela, 
            text, 
            args, 
            isOwn, 
            isPrem, 
            CMD, 
            command, 
            reply, 
            m, 
            botAdmin, 
            isAdmin, 
            groupAdmin,
            downloadContentFromMessage,
            senderJid: senderNumber ? (senderNumber + '@s.whatsapp.net') : (m.sender || m.key.remoteJid),
            usedPrefix: prefix,
            conn: Morela
        };

        
        
        
        
        
        try {
            await runPassiveHandlers(m, {
                Morela,
                isOwn,
                isPrem,
                isAdmin,
                botAdmin,
                downloadContentFromMessage
            });
        } catch (error) {
            console.error('[Passive Handlers Error]:', (error as Error).message);
        }

        
        if (m._stikerHandled) return;

        
        
        
        if (m.isGroup) {
            if (isSelfMode(from) && !isOwn) return;
        } else {
            if (!isOwn && isPrivateMode()) return;
        }

        
        
        
        
        
        
        
        

        if (isOwn) { try { (await import("fs")).default.writeFileSync("./data/lastchat_owner.json", JSON.stringify({ jid: from })) } catch {} }
        let pluginHandled: boolean = false;
        if (CMD) {
            try {
                pluginHandled = await handleMessage(m, command, handleDataesm);
            } catch (error) {
                console.error('Plugin handler error:', error);
                if (isOwn) {
                    await reply(`⚠️ Plugin error: ${(error as Error).message}\n\nGunakan .restart jika masalah berlanjut.`);
                }
            }
        }

        if (!pluginHandled) {
            switch (command) {
                default:
                    if (budy.startsWith('=>') && isSuperOwn) {
                        try {
                            const code = budy.slice(2).replace(/[\u200e\u200f\u200b\u200d\u2028\u2029\ufeff\u00a0]/g, ' ').trim();
                            const conn = Morela;
                            const result = await eval(`(async () => { return ${code} })()`);
                            const formattedResult = util.format(result);
                            await m.reply(formattedResult);
                        } catch (error) {
                            await m.reply(`❌ Error:\n${(error as Error).message}`);
                        }
                    }

                    else if (budy.startsWith('>') && isSuperOwn) {
                        try {
                            const code = budy.slice(1).replace(/[\u200e\u200f\u200b\u200d\u2028\u2029\ufeff\u00a0]/g, ' ').trim();
                            const conn = Morela;
                            let evaled;
                            try {
                                evaled = await eval(`(async () => { return ${code} })()`);
                            } catch (_) {
                                evaled = await eval(`(async () => { ${code} })()`);
                            }
                            if (evaled === undefined) evaled = '✅ Done (no return value)';
                            if (typeof evaled !== 'string') {
                                evaled = util.inspect(evaled, { depth: 3 });
                            }
                            await m.reply(evaled);
                        } catch (error) {
                            await m.reply(`❌ Error:\n${(error as Error).message}`);
                        }
                    }

                    else if (budy.startsWith('$') && isSuperOwn) {
                        const shellCmd = budy.slice(1).trim();
                        try { fs.writeFileSync('./data/lastchat_owner.json', JSON.stringify({ jid: from })) } catch {}
                        const isRestartCmd = /\b(pm2\s+(restart|stop|reload|kill))\b/i.test(shellCmd);

                        if (isRestartCmd) {
                            
                            
                            try { await m.reply(`⏳ Menjalankan: \`${shellCmd}\`\n\n_Bot akan restart dalam beberapa detik..._`); } catch {}
                            
                            await new Promise(r => setTimeout(r, 2500));
                            
                            
                            console.log(`[SHELL] $ ${shellCmd}`);
                            execPromise(shellCmd).catch(() => {});
                            return; 
                        }

                        console.log(`[SHELL] $ ${shellCmd}`);
                        execPromise(shellCmd)
                            .then(({ stdout, stderr }) => {
                                const out = stdout?.trim();
                                const err = stderr?.trim();
                                if (err) {
                                    console.error(`[SHELL] stderr: ${err}`);
                                    return m.reply(`⚠️ *stderr:*\n\`\`\`\n${err}\n\`\`\``);
                                }
                                if (out) {
                                    console.log(`[SHELL] stdout: ${out}`);
                                    return m.reply(`📤 *stdout:*\n\`\`\`\n${out}\n\`\`\``);
                                }
                                return m.reply('✅ Command executed (no output)');
                            })
                            .catch(error => {
                                console.error(`[SHELL] error: ${(error as Error).message}`);
                                return m.reply(`❌ *Error:*\n\`\`\`\n${(error as Error).message}\n\`\`\``);
                            });
                    }
                    break;
            }
        }

    } catch (error) {
        console.error(chalk.red.bold('Error in message handler:'), error);

        const selfModeActive = m?.key?.remoteJid ? isSelfMode(m.key.remoteJid) : false;
        
        if (m && m.chat) {
            try {
                const senderRawCheck = m.key?.participant || m.key?.remoteJid || '';
                let senderNumCheck = senderRawCheck.split('@')[0].split(':')[0];
                
                if (senderRawCheck.endsWith('@lid')) {
                    const mappedPhone = getPhoneByLid(senderNumCheck);
                    if (mappedPhone) senderNumCheck = mappedPhone;
                }

                let ownerCheck: string[] = [];
                try {
                    if (fs.existsSync(OWNER_PATH)) {
                        ownerCheck = JSON.parse(fs.readFileSync(OWNER_PATH, 'utf-8')) as string[];
                    }
                } catch {}
                if (!ownerCheck.length && global.owner) {
                    ownerCheck = Array.isArray(global.owner) ? global.owner : [global.owner];
                }
                const isOwnerForError = ownerCheck.some(o => o.replace(/[^0-9]/g, '') === senderNumCheck);
                
                if (isOwnerForError) {
                    try {
                        const _ownerJid = ownerCheck[0].replace(/[^0-9]/g,'') + '@s.whatsapp.net';
                        const _outerErr = error as Error
                        await Morela.sendMessage(_ownerJid, {
                            text: '❌ *Error di Bot*\n\n' + (_outerErr.stack || _outerErr.message).slice(0, 1500)
                        });
                    } catch {}
                }
            } catch (sendError) {
                console.error('Failed to send error message:', sendError);
            }
        }
    }
};

const currentFile = __filename;
fs.watchFile(currentFile, () => {
    fs.unwatchFile(currentFile);
    console.log(chalk.green(`✔ ${path.basename(currentFile)} updated! Reloading...`));
});

export default Morela;
