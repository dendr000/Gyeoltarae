// Copyright (c) dendr000. MIT License.

// 뷰어에서 글 속의 연속 공백(2칸 이상)을 화면에서도 그대로 보여 준다. HTML 은 공백이 몇 칸이든 한 칸으로
// 합쳐 그리기 때문에, 편집창에서 `컬럼명 IS NULL      컬럼 값이` 처럼 간격을 맞춰 써도 뷰어에서는 한 칸으로
// 보였다. 2칸 이상 이어진 공백만 <span class="wiki-spaces"> 로 감싸고 CSS(white-space: pre)로 칸 수를 지킨다.
// 공백 자체는 일반 공백(U+0020)이라서 뷰어에서 복사해도 &nbsp;(U+00A0) 같은 다른 글자가 섞이지 않는다.
// 원문(편집창과 저장된 파일)은 그대로이고, 파서가 만든 HTML(wikiParser.js 의 parseWikiText 마지막)에 적용한다.

// 이 태그 안은 건드리지 않는다 — 코드블록·인라인 코드는 이미 공백을 그대로 보여 주고(pre/code), 표는 셀 구분자
// 양옆 공백이 문법의 일부라서 기존 처리를 유지한다.
const SKIP_TAGS = new Set(['pre', 'code', 'style', 'script', 'textarea', 'table'])

// 공백뿐인 조각(`</strong>   <em>` 처럼 인라인 태그 사이)은 앞뒤가 모두 인라인 태그일 때만 보존한다. 블록 태그
// 사이의 공백(`</li>  <li>` 등 태그 모양을 맞추려고 들어간 들여쓰기)은 글이 아니므로 span 으로 감싸지 않는다
// (ul·table 바로 아래에 span 이 오면 잘못된 HTML 이 된다).
const BLOCK_TAGS = new Set([
  'p', 'div', 'br', 'hr', 'li', 'ul', 'ol', 'dl', 'dt', 'dd', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'blockquote', 'details', 'summary', 'pre', 'figure', 'figcaption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
])

const TAG_SPLIT_RE = /(<[^>]*>)/
const TAG_NAME_RE = /^<(\/?)([a-zA-Z][a-zA-Z0-9]*)/
const RUN_RE = / {2,}/g
const MARK = 'class="wiki-spaces"'

function tagName(tag) {
  const m = tag.match(TAG_NAME_RE)
  return m ? m[2].toLowerCase() : ''
}

function wrapRuns(text) {
  return text.replace(RUN_RE, (run) => `<span ${MARK}>${run}</span>`)
}

// HTML 문자열 안의 글(태그 사이)에서 2칸 이상 연속 공백을 감싼다. 태그 속성, 코드블록, 인라인 코드, 표,
// style 은 그대로 둔다. 이미 감싼 것은 다시 감싸지 않으므로 두 번 적용해도 결과가 같다(접기 블록처럼 파서가
// 안쪽을 따로 한 번 더 돌리는 경우에 안전).
export function preserveSpaces(html) {
  if (!html.includes('  ')) return html
  const parts = html.split(TAG_SPLIT_RE) // [글, 태그, 글, 태그, ..., 글]
  let skipDepth = 0
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i]
    if (i % 2 === 1) {
      const name = tagName(part)
      if (SKIP_TAGS.has(name)) skipDepth = Math.max(0, skipDepth + (part.startsWith('</') ? -1 : 1))
      continue
    }
    if (part === '' || skipDepth > 0 || !part.includes('  ')) continue
    if (part.trim() === '') {
      const before = parts[i - 1]
      const after = parts[i + 1]
      if (before === undefined || after === undefined) continue
      if (before.includes(MARK)) continue // 이미 감싼 공백의 안쪽
      if (BLOCK_TAGS.has(tagName(before)) || BLOCK_TAGS.has(tagName(after))) continue
    }
    parts[i] = wrapRuns(part)
  }
  return parts.join('')
}
