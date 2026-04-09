// @ts-nocheck
import pkg from "@itsukichan/baileys";
const { proto, getContentType, generateWAMessage, areJidsSameUser } = pkg;

import chalk from 'chalk';
import fs from 'fs';
import Crypto from 'crypto';
import axios from 'axios';
import { DateTime } from 'luxon';
import { sizeFormatter } from 'human-readable';
import util from 'util';
import Jimp from 'jimp';

const unixTimestampSeconds = (date: Date = new Date()): number =>
  Math.floor(date.getTime() / 1000);

export { unixTimestampSeconds };

export const generateMessageTag = (epoch?: number): string => {
  let tag = unixTimestampSeconds().toString();
  if (epoch) tag += '.--' + epoch;
  return tag;
};

export const processTime = (timestamp: number, now: number): number => {
  return (now - DateTime.fromMillis(timestamp * 1000).toMillis()) / 1000;
};

export const getRandom = (ext: string): string => {
  return `${Math.floor(Math.random() * 10000)}${ext}`;
};

export const getBuffer = async (url: string, options?: Record<string, unknown>): Promise<Buffer> => {
  try {
    const res = await axios({
      method: "get",
      url,
      headers: {
        'DNT': '1',
        'Upgrade-Insecure-Request': '1'
      },
      ...options,
      responseType: 'arraybuffer'
    });
    return res.data as Buffer;
  } catch (err) {
    throw err;
  }
};

export const fetchJson = async (url: string, options?: Record<string, unknown>): Promise<unknown> => {
  try {
    const res = await axios({
      method: 'GET',
      url: url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
      },
      ...options
    });
    return res.data;
  } catch (err) {
    throw err;
  }
};

export const runtime = function(seconds: number): string {
  seconds = Number(seconds);
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor(seconds % (3600 * 24) / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = Math.floor(seconds % 60);
  const dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
  const hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
  const mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
  const sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
  return dDisplay + hDisplay + mDisplay + sDisplay;
};

export const clockString = (ms: number): string => {
  const h = isNaN(ms) ? '--' : Math.floor(ms / 3600000);
  const m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60;
  const s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60;
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
};

export const sleep = async (ms: number): Promise<void> => {
  return new Promise<void>(resolve => setTimeout(() => resolve(), ms));
};

export const isUrl = (url: string): RegExpMatchArray | null => {
  return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'));
};

export const getTime = (format: string, date?: Date): string => {
  if (date) {
    return date.toLocaleString('id');
  } else {
    return DateTime.now().setZone('Asia/Jakarta').setLocale('id').toFormat(format);
  }
};

export const formatDate = (n: number, locale: string = 'id'): string => {
  const d = new Date(n);
  return d.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  });
};

export const tanggal = (numer: number): string => {
  const myMonths = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const myDays = ['Minggu','Senin','Selasa','Rabu','Kamis','Jum\'at','Sabtu'];
  const tgl = new Date(numer);
  const day = tgl.getDate();
  const bulan = tgl.getMonth();
  const thisDay = myDays[tgl.getDay()];
  const yy = tgl.getFullYear();
  const year = yy;
  return `${thisDay}, ${day} - ${myMonths[bulan]} - ${year}`;
};

export const formatp = sizeFormatter({
  std: 'JEDEC',
  decimalPlaces: 2,
  keepTrailingZeroes: false,
  render: (literal: number, symbol: string) => `${literal} ${symbol}B`,
});

export const jsonformat = (string: unknown): string => {
  return JSON.stringify(string, null, 2);
};

export const format = (...args: unknown[]): string => {
  return util.format(...args);
};

export const logic = (check: unknown, inp: unknown[], out: unknown[]): unknown => {
  if (inp.length !== out.length) throw new Error('Input and Output must have same length');
  for (const i in inp)
    if (util.isDeepStrictEqual(check, inp[i])) return out[i];
  return null;
};

export const generateProfilePicture = async (buffer: Buffer): Promise<{ img: Buffer; preview: Buffer }> => {
  const jimp = await Jimp.read(buffer);
  const min = jimp.getWidth();
  const max = jimp.getHeight();
  const cropped = jimp.crop(0, 0, min, max);
  return {
    img: await cropped.scaleToFit(720, 720).getBufferAsync(Jimp.MIME_JPEG),
    preview: await cropped.scaleToFit(720, 720).getBufferAsync(Jimp.MIME_JPEG)
  };
};

export const bytesToSize = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const getSizeMedia = (filePath: string | Buffer): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof filePath === 'string' && /http/.test(filePath)) {
      axios.get(filePath).then((res: { headers: Record<string, string> }) => {
        const length = parseInt(res.headers['content-length'] as string);
        const size = bytesToSize(length, 3);
        if (!isNaN(length)) resolve(size);
      }).catch(reject);
    } else if (Buffer.isBuffer(filePath)) {
      const length = Buffer.byteLength(filePath);
      const size = bytesToSize(length, 3);
      if (!isNaN(length)) resolve(size);
    } else {
      reject('error gatau apah');
    }
  });
};

export const parseMention = (text: string = ''): string[] => {
  return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net');
};

type Participant = { id: string; admin?: string | null }

export const getGroupAdm = (participants: Participant[]): string[] => {
  return participants
    .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
    .map(p => p.id);
};

export const smsg = (conn: Record<string, unknown>, m: Record<string, unknown>, store?: unknown): unknown => {
  if (!m) return m;
  const M = proto.WebMessageInfo;
  if (m['key']) {
    const key = m['key'] as Record<string, unknown>;
    m['id'] = key['id'];
    m['isBaileys'] = (m['id'] as string)?.startsWith('BAE5') && (m['id'] as string)?.length === 16;
    m['chat'] = key['remoteJid'];
    m['fromMe'] = key['fromMe'];
    m['isGroup'] = (m['chat'] as string)?.endsWith('@g.us');
    const decodeJid = conn['decodeJid'] as (s: string) => string;
    m['sender'] = decodeJid(
      (m['fromMe'] ? (conn['user'] as Record<string, unknown>)?.['id'] as string : '')
      || m['participant'] as string
      || key['participant'] as string
      || m['chat'] as string
      || ''
    );
    if (m['isGroup']) m['participant'] = decodeJid(key['participant'] as string) || '';
  }
  if (m['message']) {
    const message = m['message'] as Record<string, unknown>;
    m['mtype'] = getContentType(message as Parameters<typeof getContentType>[0]);
    const mtype = m['mtype'] as string;
    m['msg'] = (mtype == 'viewOnceMessage'
      ? (message[mtype] as Record<string, unknown>)?.['message'] as unknown
      : message[mtype]) || {};

    const _interactiveBody = (() => {
      if (mtype !== 'interactiveResponseMessage') return ''
      try {
        const nfr = (m['msg'] as Record<string, unknown>)?.['nativeFlowResponseMessage'] as Record<string, unknown>
        if (nfr?.['paramsJson']) {
          const p = JSON.parse(nfr['paramsJson'] as string) as Record<string, string>
          return p['id'] || p['display_text'] || ''
        }
        return ((m['msg'] as Record<string, unknown>)?.['body'] as Record<string, string>)?.['text'] || ''
      } catch { return ((m['msg'] as Record<string, unknown>)?.['body'] as Record<string, string>)?.['text'] || '' }
    })()

    const msg = m['msg'] as Record<string, unknown>
    m['body'] = message['conversation']
      || msg?.['caption']
      || msg?.['text']
      || (mtype == 'listResponseMessage' && (msg?.['singleSelectReply'] as Record<string, unknown>)?.['selectedRowId'])
      || (mtype == 'buttonsResponseMessage' && msg?.['selectedButtonId'])
      || (mtype == 'viewOnceMessage' && msg?.['caption'])
      || _interactiveBody
      || m['text'];

    let quoted = m['quoted'] = msg?.['contextInfo']
      ? (msg['contextInfo'] as Record<string, unknown>)['quotedMessage']
      : null;
    m['mentionedJid'] = msg?.['contextInfo']
      ? (msg['contextInfo'] as Record<string, unknown>)['mentionedJid']
      : [];

    if (m['quoted']) {
      const quotedObj = m['quoted'] as Record<string, unknown>
      let type = Object.keys(quotedObj)[0];
      m['quoted'] = quotedObj[type] as Record<string, unknown>;
      if (['productMessage'].includes(type)) {
        type = Object.keys(m['quoted'] as Record<string, unknown>)[0];
        m['quoted'] = (m['quoted'] as Record<string, unknown>)[type] as Record<string, unknown>;
      }
      if (typeof m['quoted'] === 'string') m['quoted'] = { text: m['quoted'] };
      
      if (!m['quoted'] || typeof m['quoted'] !== 'object') {
        m['quoted'] = null;
      } else {
      const q = m['quoted'] as Record<string, unknown>
      const ctxInfo = msg?.['contextInfo'] as Record<string, unknown>
      q['mtype'] = type;
      q['id'] = ctxInfo?.['stanzaId'];
      q['chat'] = ctxInfo?.['remoteJid'] || m['chat'];
      q['isBaileys'] = q['id'] ? (q['id'] as string).startsWith('BAE5') && (q['id'] as string).length === 16 : false;
      const decodeJid = conn['decodeJid'] as (s: string) => string;
      q['sender'] = decodeJid(ctxInfo?.['participant'] as string);
      q['fromMe'] = q['sender'] === decodeJid((conn['user'] as Record<string, unknown>)?.['id'] as string);
      q['text'] = q['text'] || q['caption'] || q['conversation'] || q['contentText'] || q['selectedDisplayText'] || q['title'] || '';
      q['mentionedJid'] = msg?.['contextInfo'] ? ctxInfo?.['mentionedJid'] : [];
      m['getQuotedObj'] = m['getQuotedMessage'] = async () => {
        if (!q['id']) return false;
        const storeTyped = store as { loadMessage: (chat: string, id: string, conn: unknown) => Promise<unknown> }
        const loaded = await storeTyped.loadMessage(m['chat'] as string, q['id'] as string, conn);
        return smsg(conn, loaded as Record<string, unknown>, store);
      };
      const vM = q['fakeObj'] = M.fromObject({
        key: {
          remoteJid: q['chat'],
          fromMe: q['fromMe'],
          id: q['id']
        },
        message: quoted,
        ...(m['isGroup'] ? { participant: q['sender'] } : {})
      });
      const sendMessage = conn['sendMessage'] as (jid: string, content: unknown, opts?: unknown) => Promise<unknown>
      const copyNForward = conn['copyNForward'] as (jid: string, msg: unknown, force: boolean, opts: unknown) => Promise<unknown>
      const downloadMediaMessage = conn['downloadMediaMessage'] as (msg: unknown) => Promise<unknown>
      q['delete'] = () => sendMessage(q['chat'] as string, { delete: (vM as Record<string, unknown>)['key'] });
      q['copyNForward'] = (jid: string, forceForward: boolean = false, options: Record<string, unknown> = {}) => copyNForward(jid, vM, forceForward, options);
      q['download'] = () => downloadMediaMessage(m['quoted']);
      } 
    }
  }
  const msg = m['msg'] as Record<string, unknown> | undefined
  const downloadMediaMessage = conn['downloadMediaMessage'] as (msg: unknown) => Promise<unknown>
  if (msg?.['url']) m['download'] = () => downloadMediaMessage(msg);
  m['text'] = msg?.['text'] || msg?.['caption'] || (m['message'] as Record<string, unknown>)?.['conversation'] || msg?.['contentText'] || msg?.['selectedDisplayText'] || msg?.['title'] || '';
  const sendMessage = conn['sendMessage'] as (jid: string, content: unknown, opts?: unknown) => Promise<unknown>
  m['reply'] = (text: string | Buffer, chatId: string = m['chat'] as string, options: Record<string, unknown> = {}) =>
    Buffer.isBuffer(text)
      ? sendMessage(chatId, { document: text, mimetype: 'application/octet-stream' }, { quoted: m, ...options })
      : sendMessage(chatId, { text: String(text) }, { quoted: m, ...options });
  m['copy'] = () => smsg(conn, M.fromObject(M.toObject(m as Parameters<typeof M.toObject>[0])) as unknown as Record<string, unknown>);
  m['copyNForward'] = (jid: string = m['chat'] as string, forceForward: boolean = false, options: Record<string, unknown> = {}) => {
    const copyNForward = conn['copyNForward'] as (jid: string, msg: unknown, force: boolean, opts: unknown) => Promise<unknown>
    return copyNForward(jid, m, forceForward, options);
  };
  conn['appenTextMessage'] = async (text: string, chatUpdate: Record<string, unknown>) => {
    const msgOptions = {
      userJid: (conn['user'] as Record<string, unknown>)?.['id'] as string,
      quoted: (m['quoted'] as Record<string, unknown>)?.['fakeObj']
    } as Parameters<typeof generateWAMessage>[2];
    const messages = await generateWAMessage(m['chat'] as string, { text: text, mentions: m['mentionedJid'] as string[] }, msgOptions);
    const msgKey = messages.key as Record<string, unknown>;
    msgKey['fromMe'] = areJidsSameUser(m['sender'] as string, (conn['user'] as Record<string, unknown>)?.['id'] as string);
    msgKey['id'] = (m['key'] as Record<string, unknown>)?.['id'] as string;
    (messages as Record<string, unknown>)['pushName'] = m['pushName'];
    if (m['isGroup']) (messages as Record<string, unknown>)['participant'] = m['sender'];
    const msg = {
      ...chatUpdate,
      messages: [proto.WebMessageInfo.fromObject(messages)],
      type: 'append'
    };
    (conn['ev'] as { emit: (event: string, data: unknown) => void }).emit('messages.upsert', msg);
  };
  return m;
};
