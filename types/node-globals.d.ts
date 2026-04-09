


declare var process: {
  env: Record<string, string | undefined>
  argv: string[]
  exit(code?: number): never
  cwd(): string
  uptime(): number
  pid: number
  version: string
  versions: Record<string, string>
  platform: string
  memoryUsage(): { rss: number; heapUsed: number; heapTotal: number; external: number }
  nextTick(fn: () => void): void
  on(event: 'uncaughtException', fn: (err: Error) => void): typeof process
  on(event: 'unhandledRejection', fn: (reason: unknown, promise: unknown) => void): typeof process
  on(event: 'SIGTERM' | 'SIGINT', fn: () => void): typeof process
  on(event: string, fn: (...args: unknown[]) => void): typeof process
  kill(pid: number, signal?: string | number): void
  stdin: NodeJS.ReadableStream & { setEncoding(enc: string): void }
  stdout: NodeJS.WritableStream & { write(data: string): boolean }
  stderr: NodeJS.WritableStream & { write(data: string): boolean }
  _getActiveHandles?(): unknown[]
  _getActiveRequests?(): unknown[]
}

type BufferEncoding = 'utf-8' | 'utf8' | 'ascii' | 'base64' | 'hex' | 'binary' | 'latin1' | 'ucs-2' | 'ucs2' | 'base64url'

interface Buffer extends Uint8Array {
  toString(encoding?: BufferEncoding, start?: number, end?: number): string
  write(str: string, encoding?: BufferEncoding): number
  readUInt8(offset?: number): number
  readUInt16BE(offset?: number): number
  readUInt32BE(offset?: number): number
  indexOf(val: string | number | Buffer, byteOffset?: number, encoding?: BufferEncoding): number
  slice(start?: number, end?: number): Buffer
  copy(target: Buffer, targetStart?: number, sourceStart?: number, sourceEnd?: number): number
  compare(other: Buffer): number
  equals(other: Buffer): boolean
  fill(val: number | string, start?: number, end?: number): this
}

declare var Buffer: {
  from(data: string | number[] | ArrayBuffer | SharedArrayBuffer | Uint8Array, encoding?: BufferEncoding): Buffer
  from(data: Buffer): Buffer
  isBuffer(obj: unknown): obj is Buffer
  isEncoding(encoding: string): boolean
  alloc(size: number, fill?: number | string | Buffer, encoding?: BufferEncoding): Buffer
  allocUnsafe(size: number): Buffer
  byteLength(data: string | Buffer, encoding?: BufferEncoding): number
  concat(buffers: Buffer[], totalLength?: number): Buffer
  compare(a: Buffer, b: Buffer): number
}

declare namespace NodeJS {
  type Timeout = ReturnType<typeof setTimeout>
  type Timer = ReturnType<typeof setInterval>
  interface EventEmitter {
    on(event: string, listener: (...args: unknown[]) => void): this
    off(event: string, listener: (...args: unknown[]) => void): this
    emit(event: string, ...args: unknown[]): boolean
    removeAllListeners(event?: string): this
  }
  interface ReadableStream {
    pipe<T extends WritableStream>(dest: T, opts?: { end?: boolean }): T
    on(event: string, listener: (...args: unknown[]) => void): this
    [key: string]: unknown
  }
  interface WritableStream {
    write(data: unknown): boolean
    end(data?: unknown): void
    on(event: string, listener: (...args: unknown[]) => void): this
    [key: string]: unknown
  }
  interface ErrnoException extends Error {
    code?: string
    errno?: number
    path?: string
  }
}

declare function setTimeout(callback: ((...args: unknown[]) => void) | (() => void) | ((value?: unknown) => void), ms?: number, ...args: unknown[]): NodeJS.Timeout
declare function clearTimeout(timeoutId: NodeJS.Timeout | string | number | undefined): void
declare function setInterval(callback: (...args: unknown[]) => void, ms?: number, ...args: unknown[]): NodeJS.Timer
declare function clearInterval(intervalId: NodeJS.Timer | string | number | undefined): void
declare function setImmediate(callback: (...args: unknown[]) => void, ...args: unknown[]): unknown
declare function clearImmediate(immediateId: unknown): void
declare function queueMicrotask(callback: () => void): void

declare var console: Console

interface Console {
  log(...data: unknown[]): void
  error(...data: unknown[]): void
  warn(...data: unknown[]): void
  info(...data: unknown[]): void
  debug(...data: unknown[]): void
  dir(obj: unknown, opts?: { depth?: number; colors?: boolean }): void
  table(data: unknown, cols?: string[]): void
  time(label?: string): void
  timeEnd(label?: string): void
  trace(...data: unknown[]): void
  assert(cond: boolean, ...data: unknown[]): void
  clear(): void
}

declare var global: typeof globalThis

declare var __dirname: string
declare var __filename: string

declare function require(id: string): unknown

interface URL {
  href: string
  protocol: string
  host: string
  hostname: string
  port: string
  pathname: string
  search: string
  hash: string
  origin: string
  username: string
  password: string
  toString(): string
}

declare var URL: {
  new(input: string, base?: string | URL): URL
}



declare function fetch(input: string | URL, init?: Record<string, unknown>): Promise<{
  ok: boolean
  status: number
  statusText: string
  json(): Promise<unknown>
  text(): Promise<string>
  arrayBuffer(): Promise<ArrayBuffer>
  blob(): Promise<{ arrayBuffer(): Promise<ArrayBuffer> }>
  headers: { get(name: string): string | null }
}>


interface HashObject {
  update(data: Buffer | string, inputEncoding?: string): HashObject
  digest(encoding: 'hex' | 'base64' | 'binary'): string
  digest(): Buffer
}
interface HmacObject {
  update(data: Buffer | string, inputEncoding?: string): HmacObject
  digest(encoding: 'hex' | 'base64' | 'binary'): string
  digest(): Buffer
}
declare module 'crypto' {
  export function randomUUID(): string
  export function randomBytes(size: number): Buffer
  export function createHash(algorithm: string): HashObject
  export function createHmac(algorithm: string, key: string | Buffer): HmacObject
  export const constants: Record<string, number>
  export function publicEncrypt(key: unknown, data: Buffer): Buffer
  export function privateDecrypt(key: unknown, data: Buffer): Buffer
  export function createCipheriv(algo: string, key: Buffer | string, iv: Buffer | string): {
    update(data: Buffer | string, inputEnc?: string, outputEnc?: string): Buffer
    final(outputEnc?: string): Buffer
    [key: string]: unknown
  }
  export function createDecipheriv(algo: string, key: Buffer | string, iv: Buffer | string): {
    update(data: Buffer | string, inputEnc?: string, outputEnc?: string): Buffer
    final(outputEnc?: string): Buffer
    [key: string]: unknown
  }
  const _default: {
    randomUUID(): string
    randomBytes(size: number): Buffer
    createHash(algorithm: string): HashObject
    createHmac(algorithm: string, key: string | Buffer): HmacObject
    constants: Record<string, number>
    [key: string]: unknown
  }
  export default _default
}


declare module 'os' {
  export function tmpdir(): string
  export function freemem(): number
  export function totalmem(): number
  export function cpus(): Array<{ model: string; speed: number; times: Record<string, number> }>
  export function platform(): string
  export function hostname(): string
  export function type(): string
  export function release(): string
  export function arch(): string
  export function uptime(): number
  export function networkInterfaces(): Record<string, Array<{ address: string; netmask: string; family: string; mac: string; internal: boolean; cidr?: string }> | undefined>
  const _default: {
    tmpdir(): string; freemem(): number; totalmem(): number
    platform(): string; hostname(): string; type(): string
    release(): string; arch(): string; uptime(): number
    networkInterfaces(): Record<string, Array<{ address: string; netmask: string; family: string; mac: string; internal: boolean; cidr?: string }> | undefined>
    cpus(): Array<{ model: string; speed: number; times: Record<string, number> }>
    [key: string]: unknown
  }
  export default _default
}


interface ImportMeta {
  url: string
}



declare class CanvasRenderingContext2D {
  [key: string]: unknown
  fillStyle: string | CanvasGradient | CanvasPattern
  strokeStyle: string | CanvasGradient | CanvasPattern
  font: string
  textAlign: string
  textBaseline: string
  lineWidth: number
  globalAlpha: number
  shadowColor: string
  shadowBlur: number
  lineCap: string
  fillRect(x: number, y: number, w: number, h: number): void
  clearRect(x: number, y: number, w: number, h: number): void
  fillText(text: string, x: number, y: number, maxWidth?: number): void
  measureText(text: string): { width: number }
  beginPath(): void
  closePath(): void
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  arc(x: number, y: number, r: number, sa: number, ea: number, ccw?: boolean): void
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void
  fill(): void
  stroke(): void
  clip(): void
  save(): void
  restore(): void
  scale(x: number, y: number): void
  rotate(angle: number): void
  translate(x: number, y: number): void
  drawImage(...args: unknown[]): void
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradient
  createPattern(src: unknown, rep: string): CanvasPattern
  setLineDash(segments: number[]): void
  rect(x: number, y: number, w: number, h: number): void
  strokeText(text: string, x: number, y: number): void
  strokeRect(x: number, y: number, w: number, h: number): void
}

interface CanvasGradient { addColorStop(offset: number, color: string): void }
interface CanvasPattern { [key: string]: unknown }
