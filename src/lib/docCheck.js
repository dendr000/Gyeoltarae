// Copyright (c) dendr000. MIT License.
import { isCodeFenceClose, matchCodeFenceOpen } from './codeFence.js'
import { footnoteRegExp } from './footnoteSyntax.js'
import { inlineCodeRanges } from './inlineCode.js'

// 문서 점검: 글이 화면에서 엉뚱하게 보이게 만드는 흔한 실수(닫히지 않은 코드블록·{{{·각주·수식, = 개수가 다른 제목, 없는 문서 링크)를 찾는다.
// 화면과 분리한 순수 함수라서 시험할 수 있다(tests/lib/docCheck.test.js). 코드블록(```) 안과 한 줄 안의 `코드`·{{{ 코드 }}} 안은 점검하지 않는다.
// 돌려주는 값: [{ kind, severity, label, message, offset, line }] — offset 은 글 안 글자 위치(편집기로 이동할 때 쓴다), line 은 1부터 센 줄 번호. 앞쪽부터 정렬한다.

const LABELS = {
  'codeblock-open': '코드블록이 닫히지 않음',
  'brace-open': '{{{ 가 닫히지 않음',
  'brace-close': '짝 없는 }}}',
  'footnote-open': '각주가 닫히지 않음',
  'math-open': '수식이 닫히지 않음',
  'heading-mismatch': '제목의 = 개수가 다름',
  'link-missing': '없는 문서 링크',
}

// 수식의 여는/닫는 표시: 백슬래시 + 괄호 (\( 와 \)).
const MATH_OPEN = String.raw`\(`
const MATH_CLOSE = String.raw`\)`

function lineOfOffset(starts, offset) {
  let lo = 0
  let hi = starts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (starts[mid] <= offset) lo = mid
    else hi = mid - 1
  }
  return lo + 1
}

// 글 속 코드·코드블록 안을 같은 길이의 공백으로 가린 글(위치가 그대로 유지된다)과, 코드블록 점검 결과를 돌려준다.
function maskCode(text) {
  const rawLines = text.split('\n')
  const masked = []
  const issues = []
  let open = null
  let openOffset = 0
  let offset = 0
  for (const raw of rawLines) {
    const line = raw.replace(/\r$/, '')
    let out
    if (open !== null) {
      if (isCodeFenceClose(line, open.ticks)) open = null
      out = ' '.repeat(raw.length)
    } else {
      const opened = matchCodeFenceOpen(line)
      if (opened !== null) {
        open = opened
        openOffset = offset
        out = ' '.repeat(raw.length)
      } else {
        const chars = [...raw]
        for (const [s, e] of inlineCodeRanges(line)) for (let i = s; i < e; i += 1) chars[i] = ' '
        out = chars.join('')
      }
    }
    masked.push(out)
    offset += raw.length + 1
  }
  if (open !== null) issues.push({ kind: 'codeblock-open', offset: openOffset })
  return { masked: masked.join('\n'), maskedLines: masked, rawLines, issues }
}

export function checkDocument(text, { missingLinks = [] } = {}) {
  if (typeof text !== 'string' || text === '') return []
  const { masked, maskedLines, rawLines, issues } = maskCode(text)
  const starts = []
  let acc = 0
  for (const raw of rawLines) {
    starts.push(acc)
    acc += raw.length + 1
  }

  // {{{ }}} 짝: 줄마다 차례로 훑어 열기는 쌓고 닫기는 하나씩 꺼낸다.
  const stack = []
  maskedLines.forEach((line, i) => {
    for (const m of line.matchAll(/\{\{\{|\}\}\}/g)) {
      if (m[0] === '{{{') stack.push(starts[i] + m.index)
      else if (stack.length > 0) stack.pop()
      else issues.push({ kind: 'brace-close', offset: starts[i] + m.index })
    }
  })
  for (const offset of stack) issues.push({ kind: 'brace-open', offset })

  // 각주: 짝이 맞는 각주를 지우고 남은 `[*` 가 닫히지 않은 각주다.
  // 닫는 ] 가 없는데 안에 [[링크]]·[br] 이 있으면 그 첫 ] 에서 각주가 끝나 버린다 — 그렇게 끝난 각주는 안의 [[ 가 ]] 보다 많거나 [br 로 끝나므로 같이 알린다.
  // (`[* 구간 [1, 2)]` 처럼 대괄호가 섞여도 정상으로 닫힌 각주는 알리지 않는다.)
  const withoutFootnotes = masked.replace(footnoteRegExp(true), (whole, body, index) => {
    const opens = (body.match(/\[\[/g) ?? []).length
    const closes = (body.match(/\]\]/g) ?? []).length
    if (opens > closes || /\[br$/.test(body)) issues.push({ kind: 'footnote-open', offset: index })
    return whole.replace(/[^\n]/g, ' ')
  })
  for (const m of withoutFootnotes.matchAll(/\[\*/g)) issues.push({ kind: 'footnote-open', offset: m.index })

  // 수식: 한 줄 안에서 \( 가 \) 보다 많으면 닫히지 않은 것이다.
  maskedLines.forEach((line, i) => {
    const opens = line.split(MATH_OPEN).length - 1
    const closes = line.split(MATH_CLOSE).length - 1
    if (opens > closes) issues.push({ kind: 'math-open', offset: starts[i] + line.lastIndexOf(MATH_OPEN) })
  })

  // 제목: 줄이 = 로 시작하고 = 로 끝나는데 양쪽 개수가 다르면 제목 글자에 =가 섞여 보인다. 코드 안의 줄은 가려져 있어 건너뛴다.
  maskedLines.forEach((line, i) => {
    const trimmed = line.replace(/\r$/, '')
    if (!trimmed.startsWith('=') || !trimmed.endsWith('=')) return
    const lead = trimmed.match(/^=+/)[0].length
    const tail = trimmed.match(/=+$/)[0].length
    if (lead + tail >= trimmed.length) return // ======== 처럼 글자가 없는 줄
    if (lead !== tail) issues.push({ kind: 'heading-mismatch', offset: starts[i] })
  })

  // 없는 문서 링크: 그려진 글에서 모은 이름이 글의 어디에 있는지 찾는다(못 찾으면 맨 앞).
  const missing = []
  for (const name of missingLinks) {
    const found = text.indexOf(`[[${name}`)
    missing.push({ kind: 'link-missing', offset: found === -1 ? 0 : found, name })
  }

  const all = [...issues, ...missing]
  return all
    .map((issue) => ({
      kind: issue.kind,
      severity: issue.kind === 'link-missing' ? 'info' : 'warn',
      label: LABELS[issue.kind],
      message: messageFor(issue),
      offset: issue.offset,
      line: lineOfOffset(starts, issue.offset),
    }))
    .sort((a, b) => a.offset - b.offset)
}

function messageFor(issue) {
  switch (issue.kind) {
    case 'codeblock-open':
      return '``` 로 연 코드블록에 닫는 ``` 가 없어 이 아래 글이 모두 코드로 보입니다'
    case 'brace-open':
      return '{{{ 로 연 블록에 닫는 }}} 가 없습니다'
    case 'brace-close':
      return '여는 {{{ 없이 }}} 만 있습니다'
    case 'footnote-open':
      return '[* 로 시작한 각주에 닫는 ] 가 없습니다'
    case 'math-open':
      return `${MATH_OPEN} 로 연 수식에 닫는 ${MATH_CLOSE} 가 없어 수식으로 그려지지 않습니다`
    case 'heading-mismatch':
      return '제목의 앞뒤 = 개수가 달라 제목 글자에 =가 섞여 보입니다'
    case 'link-missing':
      return `[[${issue.name}]] 문서가 없습니다 (눌러서 만들 수는 있습니다)`
    default:
      return ''
  }
}

const HTML_ENTITY = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" }

// 그려진 html 에서 문서가 없는 링크(.wiki-link-missing)의 대상 이름을 중복 없이 모은다.
export function findMissingLinks(html) {
  if (typeof html !== 'string' || !html.includes('wiki-link-missing')) return []
  const names = []
  for (const m of html.matchAll(/class="wiki-link-missing"[^>]*?data-doc-target="([^"]*)"/g)) {
    const name = m[1].replace(/&(?:amp|lt|gt|quot|#39);/g, (e) => HTML_ENTITY[e])
    if (!names.includes(name)) names.push(name)
  }
  return names
}
