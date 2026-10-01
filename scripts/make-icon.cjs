// build/icon.svg → build/icon.ico(+icon.png). Electron 자체로 SVG 를 그려서 PNG 로 캡처한 뒤 ICO 로 묶는다.
// (별도 이미지 라이브러리 없이 동작)   실행: node node_modules/electron/cli.js scripts/make-icon.cjs
const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const SIZES = [16, 24, 32, 48, 64, 128, 256]
const root = path.join(__dirname, '..')
const svg = fs.readFileSync(path.join(root, 'build', 'icon.svg'), 'utf8')

app.disableHardwareAcceleration()

let win = null

async function open() {
  win = new BrowserWindow({ width: 256, height: 256, show: false, frame: false, transparent: true, webPreferences: { offscreen: true } })
  const file = path.join(require('node:os').tmpdir(), 'gyeoltarae-icon.html')
  fs.writeFileSync(file, '<html><body style="margin:0;background:transparent;overflow:hidden">' + svg + '</body></html>')
  await win.loadFile(file)
}

async function render(size) {
  // 같은 창에서 SVG 크기만 바꿔 가며 캡처
  await win.webContents.executeJavaScript(
    `(() => { const s = document.querySelector('svg'); s.setAttribute('width', '${size}'); s.setAttribute('height', '${size}'); })()`,
  )
  await new Promise((r) => setTimeout(r, 300))
  const img = await win.webContents.capturePage({ x: 0, y: 0, width: size, height: size })
  return img.toPNG()
}

function buildIco(entries) {
  const head = Buffer.alloc(6)
  head.writeUInt16LE(0, 0)
  head.writeUInt16LE(1, 2)
  head.writeUInt16LE(entries.length, 4)
  const dir = Buffer.alloc(16 * entries.length)
  let offset = 6 + dir.length
  entries.forEach((e, i) => {
    const o = i * 16
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o)
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o + 1)
    dir.writeUInt8(0, o + 2)
    dir.writeUInt8(0, o + 3)
    dir.writeUInt16LE(1, o + 4)
    dir.writeUInt16LE(32, o + 6)
    dir.writeUInt32LE(e.png.length, o + 8)
    dir.writeUInt32LE(offset, o + 12)
    offset += e.png.length
  })
  return Buffer.concat([head, dir, ...entries.map((e) => e.png)])
}

app.whenReady().then(async () => {
  try {
    await open()
    const entries = []
    for (const size of SIZES) entries.push({ size, png: await render(size) })
    fs.writeFileSync(path.join(root, 'build', 'icon.ico'), buildIco(entries))
    fs.writeFileSync(path.join(root, 'build', 'icon.png'), entries[entries.length - 1].png)
    console.log('icon.ico 생성:', entries.map((e) => `${e.size}px(${e.png.length}B)`).join(' '))
  } catch (e) {
    console.error(e)
    process.exitCode = 1
  }
  app.quit()
})
