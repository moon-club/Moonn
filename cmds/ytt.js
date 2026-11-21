import fetch from 'node-fetch'
import yts from 'yt-search'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'

export const QUALITIES = ['144p', '240p', '360p', '480p', '720p', '1080p']
export const DEFAULT_QUALITY = '480p'
export const MAX_SECONDS = 25 * 60

const MAX_BYTES = 120 * 1024 * 1024
const API_TIMEOUT = 45000
const SEARCH_TIMEOUT = 20000
const DL_TIMEOUT = 5 * 60 * 1000

export const isYT = (t) => /(youtube\.com|youtu\.be)\//i.test(t)

const tooBig = () => {
  const e = new Error('El archivo supera los 120 MB')
  e.code = 'TOO_BIG'
  return e
}

const toSeconds = (d) => {
  if (d === undefined || d === null || d === '') return 0
  if (typeof d === 'number') return d
  const s = String(d).trim()
  if (/^\d+$/.test(s)) return Number(s)
  const p = s.split(':').map(Number)
  if (p.some(isNaN)) return 0
  return p.reduce((a, v) => a * 60 + v, 0)
}

// Endpoints organizados usando las APIs de tu settings.js (con fallback automático)
const getEndpoints = (type) => {
  const evogbUrl = String(global.APIs?.evogb?.url || global.links?.api || 'https://api.evogb.org').replace(/\/$/, '')
  const evogbKey = global.APIs?.evogb?.key
  const customRoute = global.APIs?.evogb?.routes?.[type]

  const vredenUrl = String(global.APIs?.vreden?.url || 'https://api.vreden.web.id').replace(/\/$/, '')
  const deliriusUrl = String(global.APIs?.delirius?.url || 'https://api.delirius.online').replace(/\/$/, '')
  const siputzxUrl = String(global.APIs?.siputzx?.url || 'https://app.siputzx.my.id').replace(/\/$/, '')

  if (type === 'ytmp3') {
    return [
      ...(customRoute ? [{ base: evogbUrl, path: customRoute, key: evogbKey }] : []),
      { base: evogbUrl, path: '/api/dl/ytmp3', key: evogbKey },
      { base: evogbUrl, path: '/api/ytmp3', key: evogbKey },
      { base: evogbUrl, path: '/download/ytmp3', key: evogbKey },
      { base: vredenUrl, path: '/api/ytmp3', key: null },
      { base: deliriusUrl, path: '/download/ytmp3', key: null },
      { base: siputzxUrl, path: '/api/d/ytmp3', key: null }
    ]
  } else {
    return [
      ...(customRoute ? [{ base: evogbUrl, path: customRoute, key: evogbKey }] : []),
      { base: evogbUrl, path: '/api/dl/ytmp4', key: evogbKey },
      { base: evogbUrl, path: '/api/ytmp4', key: evogbKey },
      { base: evogbUrl, path: '/download/ytmp4', key: evogbKey },
      { base: vredenUrl, path: '/api/ytmp4', key: null },
      { base: deliriusUrl, path: '/download/ytmp4', key: null },
      { base: siputzxUrl, path: '/api/d/ytmp4', key: null }
    ]
  }
}

async function fetchEndpoint(endpoint, params) {
  const queryObj = { ...params }
  if (endpoint.key) queryObj.key = endpoint.key // Solo agrega key si existe en settings.js

  const qs = new URLSearchParams(queryObj).toString()
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), API_TIMEOUT)

  try {
    const fullUrl = `${endpoint.base}${endpoint.path}?${qs}`
    const res = await fetch(fullUrl, {
      headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0' },
      signal: ctrl.signal
    })
    if (!res.ok) {
      console.error(`[yt] ${endpoint.base}${endpoint.path} respondió ${res.status}`)
      return null
    }
    const json = await res.json()
    // Diferentes APIs devuelven el objeto en data, result, download o directamente
    const d = json?.data || json?.result || (json?.url || json?.dl ? json : null)
    if (!d || Array.isArray(d)) return null

    // Extraer el link de descarga sin importar cómo lo llame cada API
    const dl = d.dl || d.download?.url || d.download || d.url || d.video || d.audio || d.link
    if (!dl || typeof dl !== 'string') return null

    return {
      dl,
      title: d.title || d.metadata?.title || d.name || 'sin título',
      quality: d.quality || d.calidad || params.quality || '128kbps',
      seconds: toSeconds(d.seconds ?? d.duration ?? d.metadata?.seconds ?? d.timestamp ?? d.lengthSeconds)
    }
  } catch (e) {
    console.error(`[yt] ${endpoint.base}${endpoint.path} falló: ${e.name === 'AbortError' ? 'timeout' : e.message}`)
    return null
  } finally {
    clearTimeout(t)
  }
}

async function mediaWithFallback(type, params) {
  const endpoints = getEndpoints(type)
  for (const ep of endpoints) {
    const result = await fetchEndpoint(ep, params)
    if (result) return result
  }
  return null
}

export async function search(query, limit = 10) {
  let timer
  try {
    const res = await Promise.race([
      yts(query),
      new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('timeout')), SEARCH_TIMEOUT) })
    ])
    return (res.videos || []).slice(0, limit).map((v) => ({
      title: v.title,
      url: v.url,
      seconds: v.seconds || 0,
      author: v.author?.name || ''
    }))
  } catch (e) {
    console.error(`[yt] búsqueda falló: ${e.message}`)
    return []
  } finally {
    clearTimeout(timer)
  }
}

async function toUrl(input) {
  if (isYT(input)) return input
  const [first] = await search(input, 1)
  if (!first) console.error(`[yt] la búsqueda no devolvió videos para: ${input}`)
  return first?.url || null
}

const fallbackOf = (q) => {
  if (QUALITIES.indexOf(q) > QUALITIES.indexOf('480p')) return '480p'
  if (q === '480p') return '360p'
  return null
}

export async function resolveVideo(input, quality = DEFAULT_QUALITY) {
  const url = await toUrl(input)
  if (!url) return null
  const order = [quality]
  const fb = fallbackOf(quality)
  if (fb) order.push(fb)
  for (const q of order) {
    const data = await mediaWithFallback('ytmp4', { url, quality: q })
    if (data) return { ...data, asked: quality, tried: q }
  }
  return null
}

export async function resolveAudio(input) {
  const url = await toUrl(input)
  if (!url) return null
  return mediaWithFallback('ytmp3', { url })
}

export async function download(url, dest) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), DL_TIMEOUT)
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: ctrl.signal })
    if (!res.ok) throw new Error(`Descarga ${res.status}`)
    const len = Number(res.headers.get('content-length') || 0)
    if (len && len > MAX_BYTES) throw tooBig()

    let bytes = 0
    const limit = async function* (src) {
      for await (const chunk of src) {
        bytes += chunk.length
        if (bytes > MAX_BYTES) throw tooBig()
        yield chunk
      }
    }
    const body = typeof res.body.pipe === 'function' ? res.body : Readable.fromWeb(res.body)
    await pipeline(body, limit, fs.createWriteStream(dest))
  } finally {
    clearTimeout(t)
  }
}

let ffmpegOk
const hasFfmpeg = () => ffmpegOk ??= new Promise((res) => {
  try {
    const c = spawn('ffmpeg', ['-version'], { stdio: 'ignore' })
    c.on('error', () => res(false))
    c.on('close', (code) => res(code === 0))
  } catch {
    res(false)
  }
})

function probe(file) {
  return new Promise((resolve) => {
    let out = ''
    let child
    try {
      child = spawn('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,pix_fmt', '-of', 'json', file], { timeout: 15000, killSignal: 'SIGKILL' })
    } catch {
      return resolve(null)
    }
    child.stdout.on('data', (d) => { out += d })
    child.on('error', () => resolve(null))
    child.on('close', (code) => {
      if (code !== 0) return resolve(null)
      try {
        const streams = JSON.parse(out).streams || []
        const v = streams.find((s) => s.codec_type === 'video')
        const a = streams.find((s) => s.codec_type === 'audio')
        resolve({ v: v?.codec_name, pix: v?.pix_fmt, a: a?.codec_name })
      } catch {
        resolve(null)
      }
    })
  })
}

function runFfmpeg(args, output, timeout) {
  return new Promise((resolve) => {
    let err = ''
    let child
    try {
      child = spawn('ffmpeg', ['-y', '-v', 'error', ...args, output], { stdio: ['ignore', 'ignore', 'pipe'], timeout, killSignal: 'SIGKILL' })
    } catch {
      return resolve(false)
    }
    try { os.setPriority(child.pid, 19) } catch {}
    child.stderr.on('data', (d) => { if (err.length < 2000) err += d })
    child.on('error', () => resolve(false))
    child.on('close', (code) => {
      const ok = code === 0 && fs.existsSync(output) && fs.statSync(output).size > 0
      if (!ok) console.error(`[ffmpeg] falló (code ${code}): ${err.trim().slice(-300)}`)
      resolve(ok)
    })
  })
}

export async function prepareVideo(input, output) {
  if (!(await hasFfmpeg())) return false
  const info = await probe(input)
  const vOk = info?.v === 'h264' && info?.pix === 'yuv420p'
  const aOk = !!info && (!info.a || info.a === 'aac')

  const args = ['-i', input, '-map', '0:v:0', '-map', '0:a:0?']
  if (vOk) args.push('-c:v', 'copy')
  else args.push('-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-pix_fmt', 'yuv420p')
  if (aOk) args.push('-c:a', 'copy')
  else args.push('-c:a', 'aac', '-b:a', '128k')
  args.push('-movflags', '+faststart')

  return runFfmpeg(args, output, vOk && aOk ? 2 * 60 * 1000 : 6 * 60 * 1000)
}

export async function prepareAudio(input, output) {
  if (!(await hasFfmpeg())) return false
  const info = await probe(input)
  const args = ['-i', input, '-vn', '-map', '0:a:0']
  if (info?.a === 'mp3') args.push('-c:a', 'copy')
  else args.push('-c:a', 'libmp3lame', '-b:a', '128k')
  return runFfmpeg(args, output, 4 * 60 * 1000)
}

// --- COMANDO PARA MOONN ---
export default {
  command: ['ytt', 'yttv'],
  category: 'downloader',
  description: 'Descarga audio o video de YouTube.',
  run: async ({ msg, sock, usedPrefix, command, text }) => {
    if (!text) {
      return msg.reply(
        `✿ Ingresa el nombre o enlace de YouTube.\n\n` +
        `• Audio: *${usedPrefix}ytt* <búsqueda o link>\n` +
        `• Video: *${usedPrefix}yttv* <búsqueda o link>`
      )
    }

    const isVideo = command === 'yttv'
    await msg.reply(`⏳ Descargando ${isVideo ? 'video' : 'audio'}, por favor espera...`)

    const tmpDir = os.tmpdir()
    const randomName = Math.random().toString(36).substring(2)
    const rawFile = path.join(tmpDir, `raw_${randomName}.mp4`)
    const processedFile = path.join(tmpDir, `out_${randomName}.${isVideo ? 'mp4' : 'mp3'}`)

    try {
      const mediaInfo = isVideo
        ? await resolveVideo(text, DEFAULT_QUALITY)
        : await resolveAudio(text)

      if (!mediaInfo || !mediaInfo.dl) {
        return msg.reply('❌ Ninguna API devolvió el enlace de descarga en este momento.')
      }

      if (mediaInfo.seconds && mediaInfo.seconds > MAX_SECONDS) {
        return msg.reply(`❌ El video supera el límite permitido de ${MAX_SECONDS / 60} minutos.`)
      }

      await download(mediaInfo.dl, rawFile)

      const success = isVideo
        ? await prepareVideo(rawFile, processedFile)
        : await prepareAudio(rawFile, processedFile)

      const finalFile = success && fs.existsSync(processedFile) ? processedFile : rawFile

      if (isVideo) {
        await sock.sendMessage(msg.chat, {
          video: fs.readFileSync(finalFile),
          mimetype: 'video/mp4',
          caption: `🎬 *${mediaInfo.title}* (${mediaInfo.tried || DEFAULT_QUALITY})`
        }, { quoted: msg })
      } else {
        await sock.sendMessage(msg.chat, {
          audio: fs.readFileSync(finalFile),
          mimetype: 'audio/mpeg',
          fileName: `${mediaInfo.title}.mp3`
        }, { quoted: msg })
      }

    } catch (error) {
      console.error('[ytt error]:', error)
      await msg.reply(error.code === 'TOO_BIG' ? '❌ El archivo supera los 120 MB.' : global.msgglobal || `❌ Error: ${error.message}`)
    } finally {
      if (fs.existsSync(rawFile)) fs.unlinkSync(rawFile)
      if (fs.existsSync(processedFile)) fs.unlinkSync(processedFile)
    }
  }
    }
