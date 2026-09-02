// Gera ícones PNG simples (sem dependências externas) para o PWA.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crcInput = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcInput), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function hexToRgb(hex) {
  const v = hex.replace('#', '')
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]
}

function makePng(size, { bg, ring, coin }) {
  const [br, bgc, bb] = hexToRgb(bg)
  const [rr, rg, rb] = hexToRgb(ring)
  const [cr, cg, cb] = hexToRgb(coin)
  const cx = size / 2
  const cy = size / 2
  const outerR = size * 0.34
  const innerR = size * 0.27
  const barW = size * 0.07

  const raw = Buffer.alloc(size * (1 + size * 4))
  for (let y = 0; y < size; y++) {
    let rowStart = y * (1 + size * 4)
    raw[rowStart] = 0 // filter type: none
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      let r = br
      let g = bgc
      let b = bb
      if (dist <= outerR && dist >= innerR) {
        r = rr
        g = rg
        b = rb
      } else if (dist < innerR) {
        r = cr
        g = cg
        b = cb
      }
      // barra central (representando gráfico de barras / "R$")
      if (
        dist < innerR * 0.92 &&
        Math.abs(dx) < barW * 1.6 &&
        y > cy - innerR * 0.55 &&
        y < cy + innerR * 0.55
      ) {
        r = rr
        g = rg
        b = rb
      }
      const px = rowStart + 1 + x * 4
      raw[px] = r
      raw[px + 1] = g
      raw[px + 2] = b
      raw[px + 3] = 255
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const idat = deflateSync(raw)
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

const palette = { bg: '#0f172a', ring: '#10b981', coin: '#34d399' }

const outputs = [
  ['public/pwa-192.png', 192],
  ['public/pwa-512.png', 512],
  ['public/apple-touch-icon.png', 180],
]

for (const [file, size] of outputs) {
  writeFileSync(file, makePng(size, palette))
  console.log('gerado', file)
}
