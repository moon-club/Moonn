import axios from 'axios'
import os from 'os'
import path from 'path'
import fs from 'fs'

const YT = 'https://www.youtube.com'
const CNV = 'https://cnv.cx/v2'
const FRAME = 'https://frame.y2meta-uk.com'
const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'
const FALLBACK = { key: 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8', version: '2.20261002.10.00' }

export const MP4_QUALITIES = [1080, 720, 360, 240, 144]
export const MP3_QUALITIES = [320, 256, 128]
export const DEFAULT_MP4 = 360
export const DEFAULT_MP3 = 128
export const MAX_SECONDS = 30 * 60

const yt = axios.create({
  timeout: 30000,
  headers: { 'User-Agent': UA, 'Content-Type': 'application/json', Origin: YT, Referer: YT + '/' }
})

const cnv = axios.create({
  timeout: 30000,
  headers: { 'User-Agent': UA, Referer: FRAME + '/', Origin: FRAME }
})

async function getConfig() {
  try {
    const res = await axios.get(YT + '/?hl=en', {
      timeout: 10000,
      headers: { 'User-Agent': UA, Cookie: 'CONSENT=YES+1; SOCS=CAI' }
    })
    const html = String(res.data)
    const key = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)
    const version = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)
    return { key: key ? key[1] : FALLBACK.key, version: version ? version[1] : FALLBACK.version }
  } catch {
    return FALLBACK
  }
}

const txt = (o) => (o ? o.simpleText || (o.runs ? o.runs.map((r) => r.text).join('') : null) : null) || null

function collect(node, out) {
  if (Array.isArray(node)) {
    for (const n of node) collect(n, out)
    return
  }
  if (!node || typeof node !== 'object') return
  if (node.videoRenderer) out.push(node.videoRenderer)
  for (const k in node) {
    if (k !== 'videoRenderer') collect(node[k], out)
  }
}

export const toSeconds = (d) => (d ? d.split(':').reverse().reduce((a, v, i) => a + Number(v) * 60 ** i, 0) : 0)

export async function searchFirst(query) {
  const cfg = await getConfig()
  const res = await yt.post(
    `${YT}/youtubei/v1/search?key=${cfg.key}&prettyPrint=false`,
    {
      context: { client: { clientName: 'WEB', clientVersion: cfg.version, hl: 'es', gl: 'CO' } },
      query,
      params: 'EgIQAQ=='
    },
    { headers: { 'X-Youtube-Client-Name': '1', 'X-Youtube-Client-Version': cfg.version } }
  )
  const found = []
  collect(res.data, found)
  const v = found.find((x) => x.videoId)
  if (!v) return null
  return {
    videoId: v.videoId,
    title: txt(v.title) || 'Sin título',
    channel: txt(v.ownerText) || 'Desconocido',
    duration: txt(v.lengthText),
    seconds: toSeconds(txt(v.lengthText)),
    thumbnail: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`
  }
}

export function extractVideoId(input) {
  const s = String(input).trim()
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s
  const m = s.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

export async function getInfoById(videoId) {
  try {
    const res = await axios.get(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { timeout: 10000 }
    )
    return {
      videoId,
      title: res.data.title || 'Sin título',
      channel: res.data.author_name || 'Desconocido',
      duration: null,
      seconds: 0,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    }
  } catch {
    return { videoId, title: 'Sin título', channel: 'Desconocido', duration: null, seconds: 0, thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` }
  }
}

async function getKey(videoId) {
  const res = await cnv.get(`${CNV}/sanity/key?id=${videoId}`)
  return res.data.key
}

async function convert(key, videoId, format, videoQuality, audioBitrate) {
  const res = await cnv.post(
    `${CNV}/converter`,
    new URLSearchParams({
      link: `https://youtu.be/${videoId}`,
      format,
      audioBitrate: String(audioBitrate),
      videoQuality: String(videoQuality),
      filenameStyle: 'pretty',
      vCodec: 'h264'
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded', accept: '*/*', key } }
  )
  return (res.data && res.data.url) || null
}

export async function convertWithFallback(videoId, isAudio, wanted) {
  const key = await getKey(videoId)
  const list = isAudio ? MP3_QUALITIES : MP4_QUALITIES
  const start = list.indexOf(wanted)
  const order = list.slice(start === -1 ? 0 : start)

  for (const q of order) {
    const url = isAudio
      ? await convert(key, videoId, 'mp3', 720, q).catch(() => null)
      : await convert(key, videoId, 'mp4', q, 128).catch(() => null)
    if (url) return { url, quality: isAudio ? `${q}kbps` : `${q}p` }
  }
  return null
}

// --- COMANDO DEL BOT ---
export default {
  command: ['ytt', 'yttv'],
  category: 'downloader',
  description: 'Descarga audio o video de YouTube con el nuevo scraper.',
  run: async ({ msg, sock, usedPrefix, command, text }) => {
    if (!text) {
      return msg.reply(
        `✿ Ingresa el nombre o enlace de YouTube.\n\n` +
        `• Audio: *${usedPrefix}ytt* <búsqueda o link>\n` +
        `• Video: *${usedPrefix}yttv* <búsqueda or link>`
      )
    }

    const isVideo = command === 'yttv'
    await msg.reply(`⏳ Buscando y procesando ${isVideo ? 'el video' : 'el audio'}...`)

    try {
      // Obtener ID del video (por enlace directo o búsqueda)
      let videoId = extractVideoId(text)
      let info = null

      if (!videoId) {
        info = await searchFirst(text)
        if (!info) return msg.reply('❌ No se encontró ningún resultado para tu búsqueda.')
        videoId = info.videoId
      } else {
        info = await getInfoById(videoId)
      }

      if (info.seconds && info.seconds > MAX_SECONDS) {
        return msg.reply(`❌ El video supera el límite de ${MAX_SECONDS / 60} minutos.`)
      }

      // Realizar conversión con el scraper
      const targetQuality = isVideo ? DEFAULT_MP4 : DEFAULT_MP3
      const downloaded = await convertWithFallback(videoId, !isVideo, targetQuality)

      if (!downloaded || !downloaded.url) {
        return msg.reply('❌ No se pudo generar el enlace de descarga en este momento.')
      }

      // Enviar el archivo multimedia por WhatsApp
      if (isVideo) {
        await sock.sendMessage(msg.chat, {
          video: { url: downloaded.url },
          mimetype: 'video/mp4',
          caption: `🎬 *${info.title}*\n📡 Canal: ${info.channel} (${downloaded.quality})`
        }, { quoted: msg })
      } else {
        await sock.sendMessage(msg.chat, {
          audio: { url: downloaded.url },
          mimetype: 'audio/mpeg',
          fileName: `${info.title}.mp3`
        }, { quoted: msg })
      }

    } catch (error) {
      console.error('[ytt error]:', error)
      await msg.reply(`❌ Ocurrió un error al procesar la solicitud: ${error.message}`)
    }
  }
}
