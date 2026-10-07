// Copyright (c) dendr000. MIT License.

// 뷰어에서 글 속의 곧은 따옴표(' ")를 열림/닫힘이 구분되는 둥근 따옴표(‘ ’ “ ”)로 바꿔 보여 준다.
// 키보드의 ' 와 " 는 열림·닫힘 구분이 없는 글자 하나라서 어떤 글꼴로도 구분이 안 되므로, 화면에 그릴
// 때만 바꾼다. 원문(편집창과 저장된 파일)은 그대로라서 '''굵게''' 같은 문법과 style="..." 같은
// 속성에는 영향이 없다. 파서가 만든 HTML(wikiParser.js 의 parseWikiText 마지막)에 적용한다.

// 이 태그 안의 글자는 바꾸지 않는다 — 코드블록과 인라인 코드는 곧은 따옴표가 그대로여야 하고(복사해서
// 코드로 쓰므로), style 안은 글이 아니다.
const SKIP_TAGS = new Set(['pre', 'code', 'style', 'script', 'textarea'])

// 이 태그를 지나면 줄·칸이 바뀐 것으로 본다(앞 글자가 없는 상태 = 여는 따옴표 자리). 인라인 태그(strong,
// em, span, a ...)는 지나가도 앞 글자를 그대로 이어서 본다 — `<strong>가</strong>"` 의 따옴표는 "가" 뒤라
// 닫는 따옴표.
const BLOCK_TAGS = new Set([
  'p', 'div', 'br', 'hr', 'li', 'ul', 'ol', 'dl', 'dt', 'dd', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'blockquote', 'details', 'summary', 'pre', 'figure', 'figcaption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
])

// 바로 앞 글자가 이것이면 여는 따옴표다. 그 밖(글자·숫자·닫는 괄호·마침표 등)이면 닫는 따옴표.
const OPENING_CONTEXT = new Set(['(', '[', '{', '“', '‘', '–', '—'])

const TAG_SPLIT_RE = /(<[^>]*>)/
const TAG_NAME_RE = /^<(\/?)([a-zA-Z][a-zA-Z0-9]*)/
const QUOTE_RE = /&quot;|"|'/g

function isOpeningContext(prev) {
  return prev === '' || /\s/.test(prev) || OPENING_CONTEXT.has(prev)
}

// 글 한 조각(태그가 없는 부분)의 따옴표를 바꾼다. prev 는 이 조각 바로 앞의 보이는 글자.
// 바꾼 글과, 조각이 끝난 뒤의 "앞 글자"를 같이 돌려준다.
function convertText(text, prev) {
  let out = ''
  let last = 0
  QUOTE_RE.lastIndex = 0
  let match
  while ((match = QUOTE_RE.exec(text)) !== null) {
    if (match.index > last) {
      const chunk = text.slice(last, match.index)
      out += chunk
      prev = chunk[chunk.length - 1]
    }
    const open = isOpeningContext(prev)
    const quote = match[0] === "'" ? (open ? '‘' : '’') : open ? '“' : '”'
    out += quote
    prev = quote
    last = match.index + match[0].length
  }
  if (last === 0) return { text, prev: text.length ? text[text.length - 1] : prev }
  if (last < text.length) {
    const chunk = text.slice(last)
    out += chunk
    prev = chunk[chunk.length - 1]
  }
  return { text: out, prev }
}

// HTML 문자열 안의 글(태그 사이)의 곧은 따옴표를 둥근 따옴표로 바꾼다. 태그 속성, 코드블록,
// 인라인 코드, style 은 그대로 둔다. 이미 둥근 따옴표인 것은 건드리지 않으므로 두 번 적용해도
// 결과가 같다(접기 블록처럼 파서가 안쪽을 따로 한 번 더 돌리는 경우에 안전).
export function applySmartQuotes(html) {
  if (!html.includes('"') && !html.includes("'") && !html.includes('&quot;')) return html
  const parts = html.split(TAG_SPLIT_RE) // [글, 태그, 글, 태그, ..., 글]
  let skipDepth = 0
  let prev = '' // 문서 맨 앞은 앞 글자가 없는 상태
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i]
    if (i % 2 === 1) {
      const tag = part.match(TAG_NAME_RE)
      if (tag) {
        const name = tag[2].toLowerCase()
        if (SKIP_TAGS.has(name)) skipDepth = Math.max(0, skipDepth + (tag[1] ? -1 : 1))
        if (BLOCK_TAGS.has(name)) prev = ''
      }
      continue
    }
    if (part === '') continue
    if (skipDepth > 0) {
      prev = part[part.length - 1]
      continue
    }
    const converted = convertText(part, prev)
    parts[i] = converted.text
    prev = converted.prev
  }
  return parts.join('')
}

// 화면에서 고른 글(둥근 따옴표가 섞여 있을 수 있음)을 원문에서 찾을 때 쓰도록 곧은 따옴표로 되돌린다.
// 열림/닫힘 어느 쪽이든 곧은 따옴표 하나로 돌아가므로 원문 어디에 쓴 것이든 같은 글자가 된다.
export function toStraightQuotes(text) {
  return text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
}
