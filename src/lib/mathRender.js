// Copyright (c) dendr000. MIT License.
import katex from 'katex'

// 문서 속 수식(LaTeX)을 뷰어에서 진짜 수식 모양으로 그린다(KaTeX, 앱 안에 들어 있어 인터넷이 필요 없다).
//   \( ... \)            글 속에 들어가는 수식            \(\sigma^{2}\), \(x_{i}\)
//   \[ ... \]  /  $$ ... $$   줄을 차지하는 가운데 정렬 수식
// 위키 문법(`''`, `__`, `^^`, `,,` 등)이 수식 안의 `_`, `^` 를 건드리지 않도록, 수식은 파서가 글을 해석하기 전에 자리 표시 글자로 바꿔 두었다가
// 다 끝난 뒤 그려 낸 HTML 로 되돌린다(extractMath -> restoreMath). 코드블록(```)과 한 줄 안의 `백틱 코드` 안은 건드리지 않는다.
// 문법이 틀린 수식은 원문을 그대로(빨간 글씨로) 보여 준다. 규칙은 tests/lib/mathRender.test.js.
const OPEN = ''
const CLOSE = ''
const TOKEN_RE = new RegExp(`${OPEN}(\\d+)${CLOSE}`, 'g')
const FENCE_LINE_RE = /^\s*```/
// 한 줄 안의 `코드` — 이 안의 \( 는 수식이 아니다.
const INLINE_CODE_RE = /`[^`\n]*`/g
const INLINE_MATH_RE = /\\\((.+?)\\\)/g
const DISPLAY_MATH_RE = /\\\[([\s\S]+?)\\\]|\$\$([\s\S]+?)\$\$/g

// 같은 수식은 한 번만 그리고 기억한다(문서를 고칠 때마다 모든 수식을 다시 그리지 않도록).
const cache = new Map()
const CACHE_LIMIT = 2000
// 그려 낸 HTML 보관함 — 자리 표시 글자의 번호가 여기를 가리킨다. 번호는 수식 글(와 모드)마다 하나이며 바뀌지 않는다.
const store = []
const rawStore = [] // 같은 번호의 원문(구분 기호 포함) — 제목 위치 찾기·목차처럼 원문이 필요한 곳에 되돌린다
const idByKey = new Map()

function renderTex(tex, displayMode) {
  const key = `${displayMode ? 'D' : 'I'}:${tex}`
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  let html
  try {
    html = katex.renderToString(tex.trim(), { displayMode, throwOnError: false, output: 'html', strict: 'ignore', trust: false })
  } catch {
    html = `<span class="math-error">${escapeHtml(displayMode ? `\\[${tex}\\]` : `\\(${tex}\\)`)}</span>`
  }
  if (cache.size >= CACHE_LIMIT) cache.clear()
  cache.set(key, html)
  return html
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// 수식 하나를 보관함에 넣고 자리 표시 글자를 돌려준다.
function tokenFor(tex, displayMode, raw) {
  const key = `${displayMode ? 'D' : 'I'}:${tex}`
  let id = idByKey.get(key)
  if (id === undefined) {
    id = store.length
    store.push(renderTex(tex, displayMode))
    rawStore.push(raw)
    idByKey.set(key, id)
  }
  return `${OPEN}${id}${CLOSE}`
}

// 코드블록 밖의 글 조각 하나에서 수식을 자리 표시 글자로 바꾼다. 줄에 걸친 \[ \] / $$ $$ 는 조각 전체에서 찾는다.
function replaceInSegment(segment) {
  // 한 줄 안의 `코드` 는 가려 두었다가 되돌린다.
  const codes = []
  let text = segment.replace(INLINE_CODE_RE, (whole) => {
    codes.push(whole)
    return `${codes.length - 1}`
  })
  text = text.replace(DISPLAY_MATH_RE, (whole, a, b) => tokenFor(a ?? b, true, whole))
  text = text
    .split('\n')
    .map((line) => (line.includes('\\(') ? line.replace(INLINE_MATH_RE, (whole, tex) => tokenFor(tex, false, whole)) : line))
    .join('\n')
  return text.replace(/(\d+)/g, (whole, n) => codes[Number(n)])
}

// 글 속의 수식을 자리 표시 글자로 바꾼 글을 돌려준다. 수식이 없으면 같은 글(같은 문자열)이다.
export function extractMath(source) {
  if (typeof source !== 'string' || (!source.includes('\\(') && !source.includes('\\[') && !source.includes('$$'))) return source
  const lines = source.split('\n')
  const out = []
  let inFence = false
  let segment = []
  const flush = () => {
    if (segment.length > 0) out.push(replaceInSegment(segment.join('\n')))
    segment = []
  }
  for (const line of lines) {
    if (FENCE_LINE_RE.test(line)) {
      flush()
      out.push(line)
      inFence = !inFence
      continue
    }
    if (inFence) out.push(line)
    else segment.push(line)
  }
  flush()
  return out.join('\n')
}

// 자리 표시 글자를 그려 낸 수식 HTML 로 되돌린다. 자리 표시가 없으면 같은 글이다.
export function restoreMath(html) {
  if (typeof html !== 'string' || !html.includes(OPEN)) return html
  return html.replace(TOKEN_RE, (whole, id) => store[Number(id)] ?? '')
}

// 자리 표시 글자를 수식의 원문(\( ... \) 그대로)으로 되돌린다 — 제목 글로 원문 위치를 찾거나 목차에 보일 때 쓴다.
export function restoreRawMath(text) {
  if (typeof text !== 'string' || !text.includes(OPEN)) return text
  return text.replace(TOKEN_RE, (whole, id) => rawStore[Number(id)] ?? '')
}

// 글에 수식이 들어 있는지(그릴 필요가 있는지) 빠르게 본다.
export function hasMath(source) {
  return typeof source === 'string' && (source.includes('\\(') || source.includes('\\[') || source.includes('$$'))
}
