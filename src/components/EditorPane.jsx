import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Heading1,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Superscript,
  Subscript,
  Palette,
  Asterisk,
  List,
  Quote,
  Minus,
  ListTree,
  ChevronDown,
  Sparkles,
  Table2,
  Tags,
  Tag,
  Database,
  LayoutTemplate,
  Image as ImageIcon,
  Zap,
  WandSparkles,
  BookmarkPlus,
  ListOrdered,
} from 'lucide-react'
import { TableEditorModal } from './TableEditorModal.jsx'
import { GradientEditorModal } from './GradientEditorModal.jsx'
import { FindReplaceBar } from './FindReplaceBar.jsx'
import { ColorPicker } from './ColorPicker.jsx'
import { useAppStore } from '../store/useAppStore.js'
import { stripLeadingNumber } from '../lib/displayName.js'
import { getApi } from '../lib/api.js'
import { resolveCycleReplacement } from '../lib/dictCycle.js'
import { getEditorScroll, setEditorScroll } from '../lib/scrollMemory.js'
import { matchSnippetShortcut } from '../lib/snippetShortcuts.js'
import { selectActiveSnippets, selectEnabledSnippets } from '../lib/snippetScope.js'
import { enterAcceptsSuggestion, findSnippetQuery, findExactSnippetMatch } from '../lib/snippetMatch.js'
import { fenceAutoCloseEdit, isInCodeFenceAt, isInLanguageCodeFenceAt } from '../lib/codeFence.js'
import { duplicateLinesEdit } from '../lib/lineDuplicate.js'
import { atomicDeleteRange, atomicStep } from '../lib/atomicTokens.js'
import { toggleCommentEdit } from '../lib/codeComment.js'
import { moveToLineEdge } from '../lib/lineEdge.js'
import { indentLinesEdit } from '../lib/lineIndent.js'
import { sortLinesEdit } from '../lib/lineSort.js'
import { blockSortEdit } from '../lib/blockSort.js'
import { INDENT } from '../lib/indentUnit.js'
import { listContinueEdit } from '../lib/listContinue.js'
import { wordCandidates } from '../lib/scopeWords.js'
import { lineIndexAt } from '../lib/lineMarks.js'
import { useHorizontalWheelScroll } from './useHorizontalWheelScroll.js'

// All edits go through document.execCommand('insertText', ...) instead of
// directly overwriting the React-controlled value. Setting `value` from
// outside a real input event breaks the textarea's native undo/redo chain;
// execCommand simulates real typing so Ctrl+Z keeps working for toolbar
// actions the same way it already does for hand-typed text.
function replaceRange(textarea, start, end, insertText, onChange) {
  textarea.focus()
  textarea.setSelectionRange(start, end)
  const applied = document.execCommand('insertText', false, insertText)
  if (!applied) {
    // Fallback for environments without execCommand support.
    const value = textarea.value
    textarea.value = value.slice(0, start) + insertText + value.slice(end)
  }
  onChange(textarea.value)
  return { start, end: start + insertText.length }
}

// caretAfter: 선택한 글을 감쌌으면 커서를 닫는 표시 바로 오른쪽 바깥에 둔다(이어서 다음 글을 바로 쓸 수 있게).
// 아니면(기본) 안쪽 글을 그대로 선택해 둔다. 선택이 없으면 어느 쪽이든 여는 표시와 닫는 표시 사이에 커서를 둔다.
function wrapSelection(textarea, before, after, onChange, { caretAfter = false } = {}) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = textarea.value.slice(start, end)
  replaceRange(textarea, start, end, `${before}${selected}${after}`, onChange)
  requestAnimationFrame(() => {
    textarea.focus()
    if (caretAfter && selected !== '') {
      const pos = start + before.length + selected.length + after.length
      textarea.setSelectionRange(pos, pos)
      return
    }
    textarea.setSelectionRange(start + before.length, start + before.length + selected.length)
  })
}

// Inserts `prefix` at the start of the line the cursor is currently on
// (목록/인용 등 줄 앞에 붙이는 문법용).
function insertLinePrefix(textarea, prefix, onChange) {
  const pos = textarea.selectionStart
  const lineStart = textarea.value.lastIndexOf('\n', pos - 1) + 1
  replaceRange(textarea, lineStart, lineStart, prefix, onChange)
  requestAnimationFrame(() => {
    textarea.focus()
    const newPos = pos + prefix.length
    textarea.setSelectionRange(newPos, newPos)
  })
}

// Inserts a standalone block on its own line(s) at the cursor.
function insertBlockText(textarea, onChange, block) {
  const pos = textarea.selectionStart
  const needsLeadingBreak = pos > 0 && textarea.value[pos - 1] !== '\n'
  const insertion = `${needsLeadingBreak ? '\n' : ''}${block}\n`
  replaceRange(textarea, pos, pos, insertion, onChange)
  requestAnimationFrame(() => {
    textarea.focus()
    const newPos = pos + insertion.length
    textarea.setSelectionRange(newPos, newPos)
  })
}

// [], (), '', "" — typing the opener inserts both and leaves the cursor
// between them; with a selection, wraps the selection instead (same
// wrapSelection already used for Ctrl+B/Ctrl+U). Typing the matching
// closer while it's already the very next character steps over it rather
// than inserting a redundant one, same as most code editors.
const AUTO_PAIRS = { '(': ')', '[': ']', "'": "'", '"': '"', '<': '>', '{': '}' }
const AUTO_PAIR_CLOSERS = new Set(Object.values(AUTO_PAIRS))

// [[분류:...]]/[[자료:...]]/[[별칭:...]]/[[파일:...]] are reserved link-target
// prefixes (see wikiParser.js's RESERVED_LINK_PREFIX_RE) — never auto-rewrite those.
const RESERVED_LINK_PREFIX_RE = /^(분류|자료|틀|별칭|파일):/

// True when the cursor sits right before a `]]` that closes a `[[` earlier
// on the same line, with nothing but plain link content between them (no
// other [[/]] in the way). Used to let Enter "exit" an in-progress wikilink
// instead of breaking it across two lines — see the Enter handler below.
function isInsideWikiLink(textarea) {
  const pos = textarea.selectionStart
  if (pos !== textarea.selectionEnd) return false
  const value = textarea.value
  if (value.slice(pos, pos + 2) !== ']]') return false
  const lineStart = value.lastIndexOf('\n', pos - 1) + 1
  const before = value.slice(lineStart, pos)
  const openIdx = before.lastIndexOf('[[')
  if (openIdx === -1) return false
  const inner = before.slice(openIdx + 2)
  return !inner.includes('[[') && !inner.includes(']]')
}

// Right after the user types the `]]` that closes a [[문서명]] (or
// [[문서명|표시명]]) wikilink, checks whether 문서명 resolves to exactly one
// doc whose REAL file name is different — either it has a leading order
// number ("0891 치고마") the typed text left out, or 문서명 was really a
// [[별칭:...]] declared inside some other, differently-named doc (real
// namu wiki style: no separate "0891 치고마" stub, just an alias declared
// inside "0892 우라오스") — and if so, rewrites the link in place to point
// at that real name ([[치고마]] -> [[0892 우라오스]]). If the author didn't
// already write their own |표시명, one showing the real name's number-
// stripped form is added too ([[0892 우라오스|우라오스]]), so the visible
// text reads clean even though the link now targets the exact file. A name
// that already matches exactly (most docs, since only order-numbered ones
// like 전국도감 entries or aliased ones differ) is left untouched. Returns
// true if it rewrote anything (the caller should skip its own onChange
// call in that case — replaceRange already fired it).
function maybeAutoResolveLink(textarea, docIndex, onChange) {
  const pos = textarea.selectionStart
  if (pos !== textarea.selectionEnd) return false
  const value = textarea.value
  if (value.slice(pos - 2, pos) !== ']]') return false

  const lineStart = value.lastIndexOf('\n', pos - 1) + 1
  const before = value.slice(lineStart, pos - 2)
  const openIdx = before.lastIndexOf('[[')
  if (openIdx === -1) return false
  const inner = before.slice(openIdx + 2)
  if (inner.includes('[[') || inner.includes(']]')) return false

  const pipeIdx = inner.indexOf('|')
  const target = (pipeIdx === -1 ? inner : inner.slice(0, pipeIdx)).trim()
  if (!target || RESERVED_LINK_PREFIX_RE.test(target)) return false

  const candidates = docIndex[target]
  if (candidates?.length !== 1 || candidates[0].name === target) return false

  const realName = candidates[0].name
  const strippedName = stripLeadingNumber(realName)
  const labelPart = pipeIdx !== -1 ? inner.slice(pipeIdx) : strippedName !== realName ? `|${strippedName}` : ''
  const start = lineStart + openIdx + 2
  const end = start + inner.length
  const replacement = `${realName}${labelPart}`
  replaceRange(textarea, start, end, replacement, onChange)
  requestAnimationFrame(() => {
    textarea.focus()
    const newPos = start + replacement.length + 2
    textarea.setSelectionRange(newPos, newPos)
  })
  return true
}

const FILE_REF_OPEN_TOKEN = '[[파일:'

// True while the cursor sits somewhere inside a just-opened [[파일:... on
// the current line, before any closing ]] or a |width — that's exactly the
// window where "which registered image did you mean" is still an open
// question worth suggesting answers for. Returns the range of the partial
// name typed so far (so a picked suggestion can replace just that part).
function detectFileRefQuery(textarea) {
  const pos = textarea.selectionStart
  if (pos !== textarea.selectionEnd) return null
  const value = textarea.value
  const lineStart = value.lastIndexOf('\n', pos - 1) + 1
  const upToCursor = value.slice(lineStart, pos)
  const openIdx = upToCursor.lastIndexOf(FILE_REF_OPEN_TOKEN)
  if (openIdx === -1) return null
  const afterOpen = upToCursor.slice(openIdx + FILE_REF_OPEN_TOKEN.length)
  if (afterOpen.includes('[[') || afterOpen.includes(']]') || afterOpen.includes('|')) return null
  return { start: lineStart + openIdx + FILE_REF_OPEN_TOKEN.length, end: pos, query: afterOpen }
}

// 현재 문서 안 찾기/찾아 바꾸기(Ctrl+F / Ctrl+Shift+F)용 — 사이드바의 "제목·내용 검색"은
// 워크스페이스 전체를 뒤지는 전역 검색이라 이거랑 별개. 대소문자 구분 안 함, 일반 부분
// 문자열 매치(정규식 아님) — 찾기 기능 대부분이 그렇듯 이 정도면 충분하고, 사용자가 입력한
// 문자를 정규식 특수문자로 오인할 걱정도 없앰.
function findAllMatches(haystack, query) {
  if (!query) return []
  const lowerHay = haystack.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const matches = []
  let idx = 0
  while (true) {
    const found = lowerHay.indexOf(lowerQuery, idx)
    if (found === -1) break
    matches.push({ start: found, end: found + query.length })
    idx = found + query.length
  }
  return matches
}

// cursorPos 바로 뒤(또는 그 자리)의 첫 매치, 없으면(전부 커서보다 앞이면) 처음으로 순환.
function nearestMatchIndex(matches, cursorPos) {
  if (matches.length === 0) return -1
  const idx = matches.findIndex((m) => m.start >= cursorPos)
  return idx === -1 ? 0 : idx
}

// 상용구 자동완성(추천 팝업) — 규칙은 lib/snippetMatch.js. 선택 영역이 있으면 찾지 않는다.
function detectSnippetQuery(textarea, snippetEntries, options) {
  if (textarea.selectionStart !== textarea.selectionEnd) return null
  return findSnippetQuery(textarea.value, textarea.selectionStart, snippetEntries, options)
}

// Mirrors the textarea's own text (same font/padding/wrapping) into an
// offscreen element so a <span> placed right at `position` reports real
// pixel coordinates via offsetTop/offsetLeft — a plain <textarea> has no
// API of its own for "where on screen is character N." Standard technique
// (same idea as the textarea-caret-position library); kept inline since
// it's the one spot that needs it.
const CARET_MIRROR_STYLE_PROPS = [
  'boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'fontFamily',
  'lineHeight', 'letterSpacing', 'textAlign', 'textIndent', 'tabSize',
]

// Builds the mirror, places the marker <span> at `position`, and hands both
// back to the caller — getCaretCoordinates and getContentTopOffset below
// just read different numbers off the same mirror rather than duplicating
// its construction.
function withCaretMirror(textarea, position, fn) {
  const div = document.createElement('div')
  const computed = window.getComputedStyle(textarea)
  div.style.position = 'absolute'
  div.style.visibility = 'hidden'
  div.style.whiteSpace = 'pre-wrap'
  div.style.wordWrap = 'break-word'
  for (const prop of CARET_MIRROR_STYLE_PROPS) div.style[prop] = computed[prop]
  // computed.width 는 스크롤바 자리까지 포함한 폭이라, 그대로 쓰면 거울의 글 영역이 입력칸보다 스크롤바 폭(약 15px)만큼
  // 넓어서 긴 줄이 다른 곳에서 접혀 커서 위치(추천 팝업, [편집] 점프)가 몇 줄씩 어긋난다. 입력칸이 실제로 글을 그리는 폭
  // (clientWidth, 스크롤바 제외 + 테두리)으로 맞춘다. 배경판과 같은 문제였다(docs/troubleshooting.md 2026-10-12).
  div.style.width = `${textarea.clientWidth + parseFloat(computed.borderLeftWidth) + parseFloat(computed.borderRightWidth)}px`
  div.textContent = textarea.value.slice(0, position)
  const span = document.createElement('span')
  span.textContent = textarea.value.slice(position) || '.'
  div.appendChild(span)
  document.body.appendChild(div)
  const result = fn(span, computed)
  document.body.removeChild(div)
  return result
}

function getCaretCoordinates(textarea, position) {
  return withCaretMirror(textarea, position, (span, computed) => {
    const textareaRect = textarea.getBoundingClientRect()
    return {
      top: textareaRect.top + span.offsetTop - textarea.scrollTop,
      left: textareaRect.left + span.offsetLeft - textarea.scrollLeft,
      height: parseFloat(computed.lineHeight) || 20,
    }
  })
}

// Same mirror, but the position asked for relative to the top of the FULL
// (unscrolled) content instead of the current viewport — what scrollTop
// itself needs, so a jump can be computed before touching scrollTop rather
// than after (getCaretCoordinates' viewport-relative number is meaningless
// for that: it's measured against whatever scroll position is about to
// change). Wrapping-aware unlike a plain newline count, since the mirror
// uses the textarea's own wrap settings.
function getContentTopOffset(textarea, position) {
  return withCaretMirror(textarea, position, (span) => span.offsetTop)
}

function lineRangeAt(text, pos) {
  const start = text.lastIndexOf('\n', pos - 1) + 1
  let end = text.indexOf('\n', pos)
  if (end === -1) end = text.length
  return [start, end]
}

function isTableLine(text, start, end) {
  return /^\|\|(.+)\|\|$/.test(text.slice(start, end).trim())
}

// Parses namu cell attributes (<-N>/<|N> span, <...> align/bgcolor, =header=,
// {{{#color ...}}}) back into the table editor's cell shape. Each line only
// yields the cells actually written on it — a row entirely covered by
// rowspans from above has none — so placeCellsIntoGrid (below) is what
// figures out real column positions and reconstructs the merged/covered
// cells a plain per-line parse can't see.
function extractPlainCells(line) {
  const match = line.trim().match(/^\|\|(.+)\|\|$/)
  if (!match) return null
  return match[1].split('||').map((raw) => {
    let content = raw.trim()
    const headerMatch = content.match(/^=(.*)=$/)
    const header = !!headerMatch
    if (headerMatch) content = headerMatch[1].trim()

    let bg = ''
    let align = ''
    let colspan = 1
    let rowspan = 1
    // Any <...> token this editor doesn't have a dedicated field for
    // (<colbgcolor=...>, <colcolor=...>, <rowbgcolor=...>, <nopad>, any
    // <table ...=...> table-wide attribute, etc.) is kept verbatim here
    // instead of being silently dropped — buildCellMarkup re-emits these
    // unchanged. Namu wiki reads a <table ...> token the same way no
    // matter which cell it's physically attached to (see renderTable's own
    // "적어도 표 전체에 적용됨" handling), so just keeping it on this same
    // cell position round-trips correctly without this editor needing to
    // understand what the token means. This is what stopped "그냥 정렬 하나
    // 추가하려고 적용을 눌렀는데 표 전체 속성/열 속성/굵은 라벨이 전부
    // 사라짐" from happening on any table this editor's own model doesn't
    // fully cover (i.e. basically anything copied straight from real namu
    // wiki).
    const extraAttrs = []
    let attr = content.match(/^<([^>]*)>(.*)$/)
    while (attr) {
      const token = attr[1]
      const colspanMatch = token.match(/^-(\d+)$/)
      const rowspanMatch = token.match(/^\|(\d+)$/)
      const bgMatch = token.match(/^bgcolor=(.+)$/)
      if (colspanMatch) colspan = Number(colspanMatch[1])
      else if (rowspanMatch) rowspan = Number(rowspanMatch[1])
      else if (token === ':') align = 'center'
      else if (token === '(') align = 'left'
      else if (token === ')') align = 'right'
      else if (bgMatch) bg = bgMatch[1]
      else extraAttrs.push(token)
      content = attr[2].trim()
      attr = content.match(/^<([^>]*)>(.*)$/)
    }

    let color = ''
    const colorMatch = content.match(/^\{\{\{#([0-9a-fA-F]{3,8}|[a-zA-Z]{3,20})\s([\s\S]*)\}\}\}$/)
    if (colorMatch) {
      color = colorMatch[1]
      content = colorMatch[2]
    }

    // Separate from `header` (결타래's own ||=칸=|| <th> syntax) — a
    // '''전체가 굵은''' cell can appear on any row (e.g. a 라벨:값 info
    // table's label column), not just row 0, and the editor's one global
    // "첫 번째 행을 헤더로" checkbox has no way to represent that. Losing
    // track of this per-cell meant every such label silently lost its bold
    // the moment the table round-tripped through this editor.
    const boldMatch = content.match(/^'''(.*)'''$/)
    const bold = !!boldMatch
    if (boldMatch) content = boldMatch[1]

    return { text: content, bg, color, align, bold, header, colspan, rowspan, extraAttrs }
  })
}

// Places each line's cells into real (row, col) grid positions the way a
// browser lays out an HTML table with colspan/rowspan — a cell claims the
// next free column in its row, then marks the cells it spans as covered so
// later rows skip them. Produces a full rectangular grid (every cell
// present, covered ones carrying mergedInto) matching TableEditorModal's
// shape.
function placeCellsIntoGrid(rawRows) {
  const rowCount = rawRows.length
  const cellAt = Array.from({ length: rowCount }, () => new Map())

  for (let r = 0; r < rowCount; r += 1) {
    let col = 0
    for (const raw of rawRows[r]) {
      while (cellAt[r].has(col)) col += 1
      const { colspan, rowspan } = raw
      for (let dr = 0; dr < rowspan && r + dr < rowCount; dr += 1) {
        for (let dc = 0; dc < colspan; dc += 1) {
          const rr = r + dr
          const cc = col + dc
          cellAt[rr].set(cc, dr === 0 && dc === 0 ? { type: 'origin', cell: raw } : { type: 'covered', origin: { r, c: col } })
        }
      }
      col += colspan
    }
  }

  let totalCols = 0
  for (const rowMap of cellAt) {
    for (const c of rowMap.keys()) totalCols = Math.max(totalCols, c + 1)
  }

  return Array.from({ length: rowCount }, (_, r) =>
    Array.from({ length: totalCols }, (_, c) => {
      const entry = cellAt[r].get(c)
      const blank = { text: '', bg: '', color: '', align: '', bold: false, header: false, colspan: 1, rowspan: 1, extraAttrs: [] }
      if (!entry) return { ...blank, mergedInto: null }
      if (entry.type === 'origin') return { ...entry.cell, mergedInto: null }
      return { ...blank, mergedInto: entry.origin }
    }),
  )
}

function findTableBlock(text, cursorPos) {
  const [lineStart, lineEnd] = lineRangeAt(text, cursorPos)
  if (!isTableLine(text, lineStart, lineEnd)) return null

  let blockStart = lineStart
  let cursor = lineStart
  while (cursor > 0) {
    const [prevStart, prevEnd] = lineRangeAt(text, cursor - 1)
    if (!isTableLine(text, prevStart, prevEnd)) break
    blockStart = prevStart
    cursor = prevStart
  }

  let blockEnd = lineEnd
  cursor = lineEnd
  while (cursor < text.length) {
    const [nextStart, nextEnd] = lineRangeAt(text, cursor + 1)
    if (!isTableLine(text, nextStart, nextEnd)) break
    blockEnd = nextEnd
    cursor = nextEnd
  }

  const rawRows = text
    .slice(blockStart, blockEnd)
    .split('\n')
    .map((line) => extractPlainCells(line))
    .filter(Boolean)

  return { blockStart, blockEnd, rows: placeCellsIntoGrid(rawRows) }
}

const FOLDING_TEMPLATE = `{{{#!folding 더 보기
숨겨진 내용
}}}`

// wikiParser.js의 HEADING_EQ_RE와 같은 모양(=제목= ~ ======제목======) — 편집기 폰트가
// 구분하기 힘들다는 피드백에 맞춰, 문단(제목) 줄만 배경을 얹어 눈에 띄게 함. 진짜 문법
// 강조(색칠)까지는 아니고 "이 줄이 제목이다"만 표시하는 가벼운 수준 — 일반 <textarea>는
// 글자 하나하나를 다른 색으로 칠할 방법이 없어서(그러려면 contentEditable로 통째로 바꿔야
// 함, 실행취소/IME 등 기존 동작이 전부 걸려 있어 위험도가 큼), 실제 글자는 여전히 진짜
// textarea가 그대로 그리고, 그 뒤에 깔린 이 배경만 흉내냄(withCaretMirror와 같은 기법 —
// 보이지 않는 거울 텍스트 뒤에 하이라이트 막대만 살아남게).
const NO_MARKS = []

// 줄 여백(점·줄 번호)이 차지하는 왼쪽 폭(px) — 이 안을 누르면 글 커서 대신 줄 강조를 켜고 끈다. App.css 의 --editor-pad-left 보다 작아야 한다.
const GUTTER_WIDTH = 56

const HEADING_LINE_RE = /^[ \t]*(={1,6})[ \t]*(.+?)[ \t]*\1[ \t]*$/

// 입력칸(textarea) 뒤에 같은 글을 보이지 않게 겹쳐 그리는 "배경판"의 내용. 글 한 줄(논리 줄)마다 block 하나(div.eline)를
// 만든다 — 줄바꿈 문자를 따로 넣지 않으므로(block 은 앞뒤가 자동으로 줄 경계) 이전에 제목 span 안의 줄바꿈 문자가 빈 줄을
// 하나 더 만들어 높이가 어긋나던 문제(docs/troubleshooting.md 2026-10-02)가 생기지 않는다. 줄마다 block 이면
// 줄 번호(CSS counter)를 그 줄의 첫 화면 줄 옆에 붙이고, 줄 위치(offsetTop)를 바로 읽어 점 클릭의 줄을 찾을 수 있다.
// 입력칸과 같은 폭·글꼴·줄 높이·여백이어야 줄 위치가 맞는다(App.css 의 .editor-highlight-backdrop 와
// tests/components/editorLayers.test.js 참고).
function renderHighlightLines(text, marks) {
  const marked = new Set(marks)
  return text.split('\n').map((line, i) => {
    const heading = HEADING_LINE_RE.test(line)
    // 제목 줄은 자동으로 강조가 켜진 상태이고, 그 밖의 줄은 줄 여백의 점을 눌러 켠 줄(marks)만 강조한다.
    const className = heading ? 'eline eline-on eline-heading' : marked.has(i) ? 'eline eline-on' : 'eline'
    // 빈 줄은 <br> 로 한 줄 높이를 만든다(내용이 없으면 block 의 높이가 0 이 되어 입력칸과 줄 수가 어긋난다).
    return (
      <div key={i} className={className}>
        {line === '' ? <br /> : line}
      </div>
    )
  })
}

function ToolbarButton({ icon: Icon, label, title, onClick, active = false }) {
  return (
    <button type="button" className={`toolbar-btn ${active ? 'active' : ''}`} title={title} onClick={onClick}>
      <Icon size={14} strokeWidth={2} />
      <span>{label}</span>
    </button>
  )
}

export function EditorPane({ text, onChange, disabled }) {
  const textareaRef = useRef(null)
  const backdropRef = useRef(null)
  // 툴바 위에서 마우스 휠을 굴리면 좌우로 스크롤(스크롤바를 잡지 않아도 됨).
  const toolbarRef = useRef(null)
  useHorizontalWheelScroll(toolbarRef, !disabled)
  // 줄 여백: 줄 번호 표시 여부, 이 문서에서 점을 눌러 강조해 둔 줄(lib/lineMarks.js 규칙, 스토어가 줄 수 변화를 따라 옮겨 줌).
  const editorLineNumbers = useAppStore((s) => s.editorLineNumbers)
  const setEditorLineNumbers = useAppStore((s) => s.setEditorLineNumbers)
  const toggleLineMark = useAppStore((s) => s.toggleLineMark)
  const lineMarks = useAppStore((s) => (s.openPath ? s.lineMarks[s.openPath] : undefined) ?? NO_MARKS)
  const [gutterHover, setGutterHover] = useState(null) // { line, top, on } — 점이 보일 줄
  const highlightLines = useMemo(() => renderHighlightLines(text, lineMarks), [text, lineMarks])
  const [tableModal, setTableModal] = useState(null)
  const [gradientModal, setGradientModal] = useState(null)
  const [fileSuggest, setFileSuggest] = useState(null)
  const [snippetSuggest, setSnippetSuggest] = useState(null)
  const [findBar, setFindBar] = useState(null)
  const saveOpenFile = useAppStore((s) => s.saveOpenFile)
  const requestPrompt = useAppStore((s) => s.requestPrompt)
  const docIndex = useAppStore((s) => s.docIndex)
  const imageIndex = useAppStore((s) => s.imageIndex)
  const snippetIndex = useAppStore((s) => s.snippetIndex)
  const activeSnippetFolder = useAppStore((s) => s.activeSnippetFolder)
  // 자동 추천 팝업·스페이스바 치환·Alt+Enter 가 쓰는 상용구 — 활성 폴더 범위(기본 '전체'). 툴바
  // "상용구 삽입" 목록은 이 범위와 무관하게 전체를 쓰므로 snippetIndex 를 그대로 둔다.
  // 거기에 더해 모달의 "폴더별 사용"에서 체크를 푼 폴더의 상용구는 뺀다.
  const disabledSnippetFolders = useAppStore((s) => s.disabledSnippetFolders)
  const activeSnippets = useMemo(
    () => selectEnabledSnippets(selectActiveSnippets(Object.values(snippetIndex), activeSnippetFolder), disabledSnippetFolders),
    [snippetIndex, activeSnippetFolder, disabledSnippetFolders],
  )
  const snippetSuggestEnabled = useAppStore((s) => s.snippetSuggestEnabled)
  const snippetSpaceExpandEnabled = useAppStore((s) => s.snippetSpaceExpandEnabled)
  const dictMap = useAppStore((s) => s.dictMap)
  const importImage = useAppStore((s) => s.importImage)
  const openPath = useAppStore((s) => s.openPath)
  // 폴더 범위 영어 단어(lib/scopeWords.js) — 같은 범위(두 번째 단계 폴더, 설정에 따라 최상위 폴더 전체)의 다른 문서에서 쓴
  // 영어 단어를 상용구 추천 팝업 후보에 "단어" 항목으로 더한다. 추천 팝업에만 쓰고 스페이스바 치환·Alt+Enter 는 상용구만 쓴다.
  const scopeWordIndex = useAppStore((s) => s.scopeWordIndex)
  const wholeScopeTopFolders = useAppStore((s) => s.wholeScopeTopFolders)
  const workspacePath = useAppStore((s) => s.workspacePath)
  const suggestEntries = useMemo(() => {
    if (!scopeWordIndex || !openPath || !workspacePath) return activeSnippets
    const excludeLower = new Set(activeSnippets.map((entry) => entry.title.toLowerCase()))
    const words = wordCandidates(scopeWordIndex, {
      currentPath: openPath,
      root: workspacePath,
      wholeTops: wholeScopeTopFolders,
      excludeLower,
    })
    return words.length === 0 ? activeSnippets : [...activeSnippets, ...words]
  }, [scopeWordIndex, openPath, workspacePath, wholeScopeTopFolders, activeSnippets])
  const editorJumpOffset = useAppStore((s) => s.editorJumpOffset)
  const clearEditorJump = useAppStore((s) => s.clearEditorJump)
  const openDictModal = useAppStore((s) => s.openDictModal)
  const openSnippetModal = useAppStore((s) => s.openSnippetModal)
  const toggleSnippetSuggest = useAppStore((s) => s.toggleSnippetSuggest)
  const activeTabId = useAppStore((s) => s.activeTabId)

  // Switching to a different document should never leave a stale suggestion
  // popup floating over the new one — but this must key on openPath, not
  // text, since text also changes on every ordinary keystroke (that's the
  // case updateFileSuggest/updateSnippetSuggest is supposed to keep it open for).
  useEffect(() => {
    setFileSuggest(null)
    setSnippetSuggest(null)
    setFindBar(null)
  }, [openPath])

  // 탭 전환 시 에디터 스크롤 위치 복원 — activeTabId가 바뀔 때만(타이핑으로 text가 바뀔
  // 때마다는 아님) 그 탭에서 마지막으로 기억해 둔 위치로 되돌림. 실제 저장은 아래
  // textarea의 onScroll에서 매 스크롤마다 scrollMemory.js에 직접 씀 — 리액트 상태를 거치지
  // 않아 리렌더를 안 일으킴(이유는 scrollMemory.js 자체 주석 참고).
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    const restored = getEditorScroll(activeTabId)
    textarea.scrollTop = restored
    if (backdropRef.current) backdropRef.current.scrollTop = restored
  }, [activeTabId])

  // 제목 줄 강조 배경이 실제 글자와 다른 줄에 겹쳐 보이던 버그 — 뒤에 깔린 하이라이트
  // 배경판(backdropRef)과 실제 textarea는 서로 다른 DOM 요소라 scrollTop을 따로
  // 들고 있는데, 지금까지는 textarea의 onScroll 이벤트가 실제로 발생할 때만 둘을
  // 맞췄음. 그런데 글자를 입력해서 내용 길이가 바뀌면(특히 커서를 따라 textarea가
  // 자동으로 스크롤될 때) 배경판 쪽 scrollHeight가 그 순간 아직 새 내용 기준으로
  // 다 안 커져 있어서 scrollTop을 못 따라가고 멈춰버리는 경우가 있었음 — "스크롤을
  // 위로 올렸다가 내리면 정상으로 보인다"는 제보가 바로 이 증상(수동 스크롤이
  // onScroll을 다시 발생시켜 그제서야 맞춰짐). text가 바뀔 때마다(탭 전환 포함) 커밋
  // 직후(페인트 전)에 textarea의 "지금 실제" scrollTop을 배경판에 강제로 다시
  // 맞춰서, 이벤트를 놓치는 경우가 있어도 다음 렌더에서 바로 복구되게 함.
  useLayoutEffect(() => {
    const textarea = textareaRef.current
    const backdrop = backdropRef.current
    if (!textarea || !backdrop) return
    backdrop.scrollTop = textarea.scrollTop
    backdrop.scrollLeft = textarea.scrollLeft
  }, [text])

  // Freshly created 문서/틀/자료/분류 open with no content yet — auto-focus
  // the editor so typing works immediately instead of requiring a manual
  // click into it. This doubles as the fix for a Windows-only Electron bug
  // (see FileTree.jsx's beginRename comment): a plain click into the
  // textarea right after a prompt modal closes or a sidebar item opens a
  // new document can look focused (blinking caret) while the OS never
  // actually routes keyboard input to it. refocusMainWindow() resyncs that,
  // but — same reasoning as PromptModal.jsx's own effect — the textarea
  // must be re-focused explicitly once that IPC round-trip actually
  // resolves; relying on the window regaining focus alone isn't enough.
  // Scoped to only-when-empty so opening an existing document to read it
  // doesn't steal focus away from the viewer pane.
  useEffect(() => {
    if (disabled) return
    const textarea = textareaRef.current
    if (!textarea || textarea.value) return
    // Immediate attempt first (same idea as a plain `autoFocus` — cheap,
    // and correct as long as the window isn't currently desynced), then a
    // second one once refocusMainWindow's IPC round-trip actually resolves,
    // which is the one that matters when it is.
    textarea.focus()
    getApi()
      .refocusWindow?.()
      ?.then(() => textarea.focus())
  }, [openPath, disabled])

  // A heading's [편집] link in the viewer (see ViewerPane.jsx's
  // handleWikiContentClick and wikiParser.js's editableOffsets) sets this
  // via requestEditorJump — a one-shot "jump the editor here, then forget
  // it" the same way promptRequest/resolvePrompt already works in this
  // store, since the offset is only meaningful once. Used to approximate the
  // target scroll position from a plain newline count, which undercounts
  // badly once any paragraph above the target is long enough to visually
  // wrap onto more than one line (routine in prose-heavy documents) — every
  // wrapped row past the first was invisible to a newline count, so the jump
  // landed short by however many wrapped rows came before it. Reusing the
  // same caret-mirror technique the autocomplete popups already use
  // (getContentTopOffset) measures the real, wrap-aware pixel position
  // instead.
  useEffect(() => {
    if (editorJumpOffset == null) return
    const textarea = textareaRef.current
    if (!textarea) return
    const offset = Math.min(editorJumpOffset, textarea.value.length)
    const contentTop = getContentTopOffset(textarea, offset)
    textarea.scrollTop = Math.max(0, contentTop - textarea.clientHeight / 3)
    if (backdropRef.current) backdropRef.current.scrollTop = textarea.scrollTop
    textarea.focus()
    textarea.setSelectionRange(offset, offset)
    clearEditorJump()
  }, [editorJumpOffset, clearEditorJump])

  // Recomputes (or closes) the [[파일: autocomplete popup from the
  // textarea's current cursor position — called after anything that could
  // have moved it into or out of a `[[파일:...` context (typing, clicking,
  // arrow keys).
  function updateFileSuggest() {
    const textarea = textareaRef.current
    if (!textarea) return
    const ctx = detectFileRefQuery(textarea)
    if (!ctx) {
      setFileSuggest(null)
      return
    }
    const items = Object.keys(imageIndex)
      .filter((name) => name.toLowerCase().includes(ctx.query.toLowerCase()))
      .sort((a, b) => a.localeCompare(b, 'ko'))
      .slice(0, 8)
    const caret = getCaretCoordinates(textarea, ctx.end)
    setFileSuggest({ start: ctx.start, end: ctx.end, items, activeIndex: 0, top: caret.top + caret.height, left: caret.left })
  }

  function selectFileSuggestItem(name) {
    const textarea = textareaRef.current
    if (!fileSuggest || !textarea) return
    const { start, end } = fileSuggest
    replaceRange(textarea, start, end, name, onChange)
    setFileSuggest(null)
    requestAnimationFrame(() => {
      textarea.focus()
      const pos = start + name.length
      textarea.setSelectionRange(pos, pos)
    })
  }

  // Recomputes (or closes) the 상용구 autocomplete popup — same idea as
  // updateFileSuggest, but [[파일: context always wins when both would
  // otherwise apply (rare overlap, but unambiguous priority beats a
  // flickering choice between two popups).
  // 마우스가 줄 여백 위에 있으면 그 줄의 { line, top, heading, on }, 아니면 null. 줄 위치는 배경판의 줄 block 에서 읽는다.
  function gutterHit(event) {
    const textarea = textareaRef.current
    const backdrop = backdropRef.current
    if (!editorLineNumbers || !textarea || !backdrop) return null
    const rect = textarea.getBoundingClientRect()
    const x = event.clientX - rect.left
    if (x < 0 || x >= GUTTER_WIDTH) return null
    const y = event.clientY - rect.top + textarea.scrollTop
    const blocks = backdrop.children
    const line = lineIndexAt(blocks.length, (i) => blocks[i].offsetTop, y)
    if (line === null) return null
    const block = blocks[line]
    if (y >= block.offsetTop + block.offsetHeight) return null // 마지막 줄 아래의 빈 곳
    return {
      line,
      top: block.offsetTop - textarea.scrollTop,
      heading: block.classList.contains('eline-heading'),
      on: block.classList.contains('eline-on'),
    }
  }

  function updateSnippetSuggest() {
    const textarea = textareaRef.current
    if (!textarea) return
    // "타이핑 중 추천 팝업"이 꺼져 있어도 언어가 적힌 코드블록(```MySQL 등) 안에서는 켠다 —
    // 코드를 쓸 때는 단축어(SELECT 같은)를 바로 불러 쓸 수 있게. 블록 밖으로 나오면 다시 설정을
    // 따른다(꺼져 있으면 꺼짐, 켜져 있으면 켜짐). 판단 규칙은 lib/codeFence.js.
    const inCodeBlock = isInLanguageCodeFenceAt(textarea.value, textarea.selectionStart)
    if (!snippetSuggestEnabled && !inCodeBlock) {
      setSnippetSuggest(null)
      return
    }
    if (detectFileRefQuery(textarea)) {
      setSnippetSuggest(null)
      return
    }
    // 코드블록 안에서는 단어 중간(NAME 의 끝 E)부터 시작하는 글자로는 후보를 찾지 않는다.
    const ctx = detectSnippetQuery(textarea, suggestEntries, { wordStartOnly: inCodeBlock })
    if (!ctx) {
      setSnippetSuggest(null)
      return
    }
    const caret = getCaretCoordinates(textarea, ctx.end)
    setSnippetSuggest({
      start: ctx.start,
      end: ctx.end,
      items: ctx.matches.slice(0, 8),
      activeIndex: 0,
      top: caret.top + caret.height,
      left: caret.left,
      mode: 'filter',
    })
  }

  // 상용구 본문 안의 {#} 마커는 치환 후 커서가 서야 할 자리를 가리킨다 — 마커 자체는
  // 지우고, 마커가 없으면 그냥 삽입된 본문 끝에 커서를 둔다. 팝업에서 고를 때
  // (selectSnippetSuggestItem)와 스페이스바 자동 치환(handleKeyDown)이 둘 다 이 함수를
  // 공유— 전자는 snippetSuggest.start/end, 후자는 직접 계산한 범위를 넘겨줌.
  function commitSnippetExpansion(entry, start, end) {
    const textarea = textareaRef.current
    if (!textarea) return
    const markerIdx = entry.content.indexOf('{#}')
    const content = markerIdx === -1 ? entry.content : entry.content.slice(0, markerIdx) + entry.content.slice(markerIdx + 3)
    replaceRange(textarea, start, end, content, onChange)
    setSnippetSuggest(null)
    requestAnimationFrame(() => {
      textarea.focus()
      const pos = markerIdx === -1 ? start + content.length : start + markerIdx
      textarea.setSelectionRange(pos, pos)
    })
  }

  function selectSnippetSuggestItem(entry) {
    if (!snippetSuggest) return
    commitSnippetExpansion(entry, snippetSuggest.start, snippetSuggest.end)
  }

  // Galpi의 isBpAuto(스페이스바 자동 치환) 포팅 — 커서 앞 줄의 끝부분이 등록된 상용구
  // 제목과 "정확히"(대소문자 구분) 일치하는지 확인. 규칙은 lib/snippetMatch.js. 같은 길이로
  // 여러 개(카테고리만 다른 동일 제목)가 동시에 걸리면 하나로 정할 수 없으니 applySnippetMatch
  // 가 숫자 선택 팝업을 띄움 — 이미 있는 snippetSuggest 'browse' 모드 렌더링을 그대로 재사용.
  function detectExactSnippetMatch(textarea, snippetEntries) {
    if (textarea.selectionStart !== textarea.selectionEnd) return null
    return findExactSnippetMatch(textarea.value, textarea.selectionStart, snippetEntries)
  }

  // detectExactSnippetMatch가 찾은 후보를 실제로 적용 — 하나면 바로 치환, 여럿이면(카테고리만
  // 다른 동일 제목) 숫자 선택 팝업. 스페이스바 자동 치환과 Alt+Enter 수동 치환이 공유.
  function applySnippetMatch(match) {
    const textarea = textareaRef.current
    if (!textarea) return
    if (match.matches.length === 1) {
      commitSnippetExpansion(match.matches[0], match.start, match.end)
      return
    }
    const caret = getCaretCoordinates(textarea, match.end)
    setSnippetSuggest({
      start: match.start,
      end: match.end,
      items: match.matches,
      activeIndex: 0,
      top: caret.top + caret.height,
      left: caret.left,
      mode: 'browse',
    })
  }

  // Alt+T 와 툴바 "상용구 등록" 버튼이 같이 씀 — 지금 선택된 글자(없으면 빈 값)를 본문 칸에
  // 채운 채로 상용구 모달을 엶. textarea 는 포커스를 잃어도(툴바 버튼을 눌러도) 선택 영역을
  // 그대로 기억하므로 버튼으로 열어도 같은 값을 읽을 수 있음.
  function openSnippetModalWithSelection() {
    const textarea = textareaRef.current
    if (!textarea) return
    const { selectionStart, selectionEnd } = textarea
    openSnippetModal(selectionStart !== selectionEnd ? textarea.value.slice(selectionStart, selectionEnd) : '')
  }

  // 툴바 "상용구 삽입" 버튼 — 필터링 없이 전체 상용구를 카테고리/제목 순으로 나열하고,
  // 앞 9개는 1~9 숫자키로도 바로 선택 가능(방향키+Enter/Tab도 그대로 동작).
  function openSnippetBrowser() {
    const textarea = textareaRef.current
    if (!textarea) return
    const items = Object.values(snippetIndex).sort(
      (a, b) => a.category.localeCompare(b.category, 'ko') || a.title.localeCompare(b.title, 'ko'),
    )
    if (items.length === 0) {
      window.alert('등록된 상용구가 없습니다. 사이드바의 "상용구"에서 먼저 추가하세요.')
      return
    }
    textarea.focus()
    const pos = textarea.selectionStart
    const caret = getCaretCoordinates(textarea, pos)
    setSnippetSuggest({
      start: pos,
      end: textarea.selectionEnd,
      items,
      activeIndex: 0,
      top: caret.top + caret.height,
      left: caret.left,
      mode: 'browse',
    })
  }

  // 매치 하나를 선택 영역으로 만들고([편집] 점프와 같은 getContentTopOffset 기법으로) 그
  // 위치가 보이게 스크롤 — 텍스트가에어리어엔 "이 매치들 전부 하이라이트" 같은 기능이
  // 없어서(플레인 텍스트 요소라 오버레이 없이는 불가능), 브라우저 기본 선택 하이라이트로
  // 현재 매치 하나만 표시하는 식으로 단순화함(대부분의 찾기 기능이 실제로 이렇게 동작함).
  function selectFindMatch(index, matches) {
    const textarea = textareaRef.current
    const match = matches[index]
    if (!textarea || !match) return
    textarea.focus()
    textarea.setSelectionRange(match.start, match.end)
    const contentTop = getContentTopOffset(textarea, match.start)
    textarea.scrollTop = Math.max(0, contentTop - textarea.clientHeight / 3)
  }

  // 아래 여섯 함수 전부 setFindBar에 "prev => {...실제 치환/포커스 이동...}" 형태의
  // 업데이터를 넘기지 않도록 주의해서 짬 — React 18 StrictMode는 개발 모드에서 상태
  // 업데이터 함수를 일부러 두 번 호출해 부작용(side effect)을 잡아내는데, replaceRange나
  // selectFindMatch 같은 실제 DOM 조작을 업데이터 안에 넣으면 그 두 번째 호출이 이미 한 번
  // 치환된 텍스트를 기준으로 또 치환을 시도해서 결과가 꼬임(실제로 "모두 바꾸기"가 이 문제로
  // 처음엔 동작하지 않았음). 그래서 여기서는 항상: 현재 findBar 상태를 읽어 부작용을 먼저
  // 다 실행한 뒤, setFindBar에는 순수한 객체(또는 그 결과만 반영하는 업데이터)만 넘김.
  function openFindBar(mode) {
    const textarea = textareaRef.current
    const selectedText =
      textarea && textarea.selectionStart !== textarea.selectionEnd
        ? textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)
        : ''
    const query = selectedText || findBar?.query || ''
    const matches = textarea ? findAllMatches(textarea.value, query) : []
    const currentIndex = nearestMatchIndex(matches, textarea?.selectionStart ?? 0)
    if (currentIndex !== -1) selectFindMatch(currentIndex, matches)
    setFindBar({ mode, query, replaceQuery: findBar?.replaceQuery ?? '', matches, currentIndex })
    // 이미 열려 있는 상태에서 Ctrl+F/Ctrl+Shift+F를 다시 눌렀을 때도(포커스가 그 사이 다시
    // 텍스트에어리어로 돌아가 있을 수 있음) 검색어 입력칸으로 포커스를 되돌려줌.
    requestAnimationFrame(() => {
      document.querySelector('.find-bar-input')?.focus()
      document.querySelector('.find-bar-input')?.select()
    })
  }

  function closeFindBar() {
    setFindBar(null)
    textareaRef.current?.focus()
  }

  function updateFindQuery(query) {
    const textarea = textareaRef.current
    const matches = textarea ? findAllMatches(textarea.value, query) : []
    const currentIndex = nearestMatchIndex(matches, textarea?.selectionStart ?? 0)
    if (currentIndex !== -1) selectFindMatch(currentIndex, matches)
    setFindBar((prev) => prev && { ...prev, query, matches, currentIndex })
  }

  function findNext() {
    if (!findBar || findBar.matches.length === 0) return
    const currentIndex = (findBar.currentIndex + 1) % findBar.matches.length
    selectFindMatch(currentIndex, findBar.matches)
    setFindBar((prev) => prev && { ...prev, currentIndex })
  }

  function findPrev() {
    if (!findBar || findBar.matches.length === 0) return
    const currentIndex = (findBar.currentIndex - 1 + findBar.matches.length) % findBar.matches.length
    selectFindMatch(currentIndex, findBar.matches)
    setFindBar((prev) => prev && { ...prev, currentIndex })
  }

  function replaceCurrentMatch() {
    const textarea = textareaRef.current
    if (!textarea || !findBar || findBar.currentIndex === -1) return
    const { start, end } = findBar.matches[findBar.currentIndex]
    replaceRange(textarea, start, end, findBar.replaceQuery, onChange)
    const matches = findAllMatches(textarea.value, findBar.query)
    const currentIndex = nearestMatchIndex(matches, start + findBar.replaceQuery.length)
    if (currentIndex !== -1) selectFindMatch(currentIndex, matches)
    setFindBar((prev) => prev && { ...prev, matches, currentIndex })
  }

  function replaceAllMatches() {
    const textarea = textareaRef.current
    if (!textarea || !findBar || findBar.matches.length === 0) return
    // 뒤에서부터 바꿔야 앞쪽을 바꿔도 아직 처리 안 한 뒤쪽 매치의 오프셋이 안 밀림.
    for (let i = findBar.matches.length - 1; i >= 0; i -= 1) {
      const { start, end } = findBar.matches[i]
      replaceRange(textarea, start, end, findBar.replaceQuery, onChange)
    }
    setFindBar((prev) => prev && { ...prev, matches: [], currentIndex: -1 })
  }

  function handleKeyDown(e) {
    const textarea = e.currentTarget
    if (fileSuggest) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFileSuggest((s) => s && { ...s, activeIndex: Math.min(s.activeIndex + 1, s.items.length - 1) })
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFileSuggest((s) => s && { ...s, activeIndex: Math.max(s.activeIndex - 1, 0) })
        return
      }
      if ((e.key === 'Enter' || e.key === 'Tab') && fileSuggest.items.length > 0) {
        e.preventDefault()
        selectFileSuggestItem(fileSuggest.items[fileSuggest.activeIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setFileSuggest(null)
        return
      }
    }
    if (snippetSuggest) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        // navigated: 방향키로 후보를 직접 골랐다는 표시 — 코드블록 안에서 Enter 가 확정할지 가르는 기준.
        setSnippetSuggest((s) => s && { ...s, navigated: true, activeIndex: Math.min(s.activeIndex + 1, s.items.length - 1) })
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSnippetSuggest((s) => s && { ...s, navigated: true, activeIndex: Math.max(s.activeIndex - 1, 0) })
        return
      }
      if (snippetSuggest.mode === 'browse' && !e.ctrlKey && !e.metaKey && !e.altKey && /^[1-9]$/.test(e.key)) {
        const idx = Number(e.key) - 1
        if (idx < snippetSuggest.items.length) {
          e.preventDefault()
          selectSnippetSuggestItem(snippetSuggest.items[idx])
          return
        }
      }
      // 코드블록 안에서는 방향키로 고르기 전의 Enter 는 확정하지 않고 줄바꿈으로 둔다(팝업은 닫음).
      // Tab 은 어디서나 확정. 이유는 lib/snippetMatch.js 의 enterAcceptsSuggestion.
      const inCodeBlock = isInLanguageCodeFenceAt(textarea.value, textarea.selectionStart)
      if (e.key === 'Enter' && !enterAcceptsSuggestion({ inCodeBlock, navigated: !!snippetSuggest.navigated })) {
        setSnippetSuggest(null)
      } else if ((e.key === 'Enter' || e.key === 'Tab') && snippetSuggest.items.length > 0) {
        e.preventDefault()
        selectSnippetSuggestItem(snippetSuggest.items[snippetSuggest.activeIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setSnippetSuggest(null)
        return
      }
    }
    // 스페이스바 자동 치환(snippetSpaceExpandEnabled) — 팝업(snippetSuggestEnabled)과는
    // 독립적으로 켜고 끌 수 있음. 정확히 일치하는 후보가 하나면 그 자리에서 바로 치환하고,
    // 길이가 같은 후보가 여럿(카테고리만 다른 동일 제목)이면 숫자 선택 팝업을 띄움. 타이핑
    // 중 추천 팝업(filter 모드)이 이미 떠 있어도 막지 않음 — Galpi 원본도 스페이스를 누르면
    // 그 팝업은 닫고 나서 정확 일치 검사를 그대로 이어감(이 줄이 없으면 제목과 정확히
    // 일치하는 접두사 팝업이 항상 먼저 떠 있는 상태라 스페이스바 치환이 사실상 평생 발동을
    // 못 함 — 실제로 이 버그로 처음 구현했을 때 스페이스바 치환이 전혀 동작하지 않았음).
    if (snippetSpaceExpandEnabled && e.key === ' ' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      if (snippetSuggest) setSnippetSuggest(null)
      const match = detectExactSnippetMatch(textarea, activeSnippets)
      if (match) {
        e.preventDefault()
        applySnippetMatch(match)
        return
      }
    }
    // Alt+Enter — Galpi의 isManual 수동 치환 포팅. snippetSpaceExpandEnabled 설정과
    // 무관하게 항상 동작함(툴바의 "상용구 삽입"과 같은 성격의 수동 트리거). 정확히 일치하는
    // 후보가 없으면 아무 표시 없이 그냥 평소 Alt+Enter처럼 줄바꿈이 들어감(Galpi 원본도
    // 이 경우 e.preventDefault()를 안 불러서 기본 동작이 그대로 진행됨 — 여기서도 동일).
    if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.key === 'Enter') {
      if (snippetSuggest) setSnippetSuggest(null)
      const match = detectExactSnippetMatch(textarea, activeSnippets)
      if (match) {
        e.preventDefault()
        applySnippetMatch(match)
        return
      }
    }
    // Alt+T / Alt+Shift+T — 갈피와 같은 상용구 단축키(판별은 snippetShortcuts.js).
    //  Alt+T: 상용구 모달 열기. 선택된 텍스트가 있으면 새 상용구의 "본문" 칸에 미리 채움.
    //  Alt+Shift+T: 타이핑 중 추천 팝업 켜기/끄기(켜졌는지는 툴바 마술봉 버튼 색으로 보임).
    const snippetShortcut = matchSnippetShortcut(e)
    if (snippetShortcut) {
      e.preventDefault()
      if (snippetShortcut === 'toggle-suggest') {
        toggleSnippetSuggest()
        setSnippetSuggest(null)
      } else {
        openSnippetModalWithSelection()
      }
      return
    }
    // Alt+Shift+H — 한자(사전) 등록. 선택된 텍스트가 있으면 그걸 "원문" 칸에 미리 채운 채로
    // 사전 모달을 열어서, 선택 → 단축키 → 한자만 입력하고 저장으로 바로 등록할 수 있게 함.
    if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'h') {
      e.preventDefault()
      const { selectionStart, selectionEnd } = textarea
      const selected = selectionStart !== selectionEnd ? textarea.value.slice(selectionStart, selectionEnd) : ''
      openDictModal(selected)
      return
    }
    // Alt+H — 고유명사 사전 순환치환(다른 Alt+Shift+H 단축키와 안 겹치게 Shift 안 눌렸을
    // 때만). 매치가 없어도 이 앱 안에서 예약된 조합으로 취급해 항상 여기서 소비한다.
    if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.key.toLowerCase() === 'h') {
      e.preventDefault()
      const pos = textarea.selectionStart
      if (pos !== textarea.selectionEnd) return
      const result = resolveCycleReplacement(textarea.value.slice(0, pos), dictMap)
      if (!result) return
      const start = pos - result.matchLength
      replaceRange(textarea, start, pos, result.replacement, onChange)
      requestAnimationFrame(() => {
        textarea.focus()
        const newPos = start + result.replacement.length
        textarea.setSelectionRange(newPos, newPos)
      })
      return
    }
    // Ctrl+F 찾기 / Ctrl+Shift+F 찾아 바꾸기 — caps lock 등으로 e.key 대소문자가 꼬일 수
    // 있어 toLowerCase 비교 + shiftKey로 모드를 가름(대문자 F 자체에 기대지 않음).
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'f') {
      e.preventDefault()
      openFindBar(e.shiftKey ? 'replace' : 'find')
      return
    }
    // Ctrl+S/B/U — Caps Lock이 켜진 상태에서는 e.key가 's' 대신 'S'로 오는데(Caps Lock은
    // 글자 키에 한해 Shift와 똑같이 대소문자를 뒤집음) 예전엔 여기서 소문자만 비교하고
    // 있었음 — 그래서 "처음엔 되다가 쓰다 보면 갑자기 안 됨, 그러다 또 됨" 현상이 실제로
    // Caps Lock이 켜져 있던 동안엔 이 세 단축키가 전부 조용히 무시되고 있었던 것. Ctrl+F와
    // 똑같이 toLowerCase 비교로 통일.
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      // Docs already autosave 800ms after the last keystroke — Ctrl+S here
      // only needs to stop the browser's own "Save Page As" dialog and,
      // since the user reached for it anyway, save immediately instead of
      // making them wait out the debounce.
      e.preventDefault()
      saveOpenFile()
      return
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault()
      // 굵게 — 글을 선택했으면 감싼 뒤 커서는 닫는 ''' 바깥 오른쪽에 둔다. 선택이 없으면 '''|''' 가운데(글을 써야
      // 하므로). 닫는 ''' 앞에서 → 키를 누르면 ''' 를 한 번에 건너뛴다(아래 atomicStep).
      wrapSelection(textarea, "'''", "'''", onChange, { caretAfter: true })
      return
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
      e.preventDefault()
      wrapSelection(textarea, '__', '__', onChange)
      return
    }
    // Alt+←/→ — 줄 처음/끝으로 이동(Home/End 키가 없는 노트북용), Alt+Shift+←/→ 는 거기까지 선택.
    // 이 키는 창 "뒤로 가기" 로도 쓰일 수 있어서 항상 기본 동작을 막는다. 규칙은 lib/lineEdge.js.
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault()
      const r = moveToLineEdge(
        textarea.value,
        textarea.selectionStart,
        textarea.selectionEnd,
        textarea.selectionDirection,
        e.key === 'ArrowLeft' ? 'start' : 'end',
        e.shiftKey,
      )
      textarea.setSelectionRange(r.start, r.end, r.direction)
      updateFileSuggest()
      updateSnippetSuggest()
      return
    }
    // ←/→, Shift+←/→, Backspace, Delete — 굵게 표시 ''' 와 줄 맨 앞 들여쓰기(공백 4칸)를 한 덩어리로 움직이고 지운다.
    // 한글 조합 중에는 건드리지 않는다. 마우스 클릭으로 ''' 사이에 커서를 놓는 것은 막을 수 없다. 규칙은 lib/atomicTokens.js.
    if (!e.ctrlKey && !e.altKey && !e.metaKey && !e.nativeEvent.isComposing) {
      const { value, selectionStart, selectionEnd, selectionDirection } = textarea
      const hasSelection = selectionStart !== selectionEnd
      const arrow = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
      const erase = e.shiftKey ? 0 : e.key === 'Backspace' ? -1 : e.key === 'Delete' ? 1 : 0
      if (arrow !== 0 && (e.shiftKey || !hasSelection)) {
        const backward = hasSelection && selectionDirection === 'backward'
        const focus = hasSelection && !backward ? selectionEnd : selectionStart
        const anchor = hasSelection && !backward ? selectionStart : hasSelection ? selectionEnd : selectionStart
        const target = atomicStep(value, focus, arrow, { tokens: !isInCodeFenceAt(value, focus) })
        if (target !== null) {
          e.preventDefault()
          if (e.shiftKey) {
            textarea.setSelectionRange(Math.min(anchor, target), Math.max(anchor, target), target < anchor ? 'backward' : 'forward')
          } else {
            textarea.setSelectionRange(target, target)
          }
          updateFileSuggest()
          updateSnippetSuggest()
          return
        }
      }
      if (erase !== 0 && !hasSelection) {
        const range = atomicDeleteRange(value, selectionStart, erase, { tokens: !isInCodeFenceAt(value, selectionStart) })
        if (range) {
          e.preventDefault()
          replaceRange(textarea, range.from, range.to, '', onChange)
          return
        }
      }
    }
    // Ctrl+/ — 코드블록(```) 안에서 현재 줄(선택했으면 걸친 줄 전체)을 주석 처리하고, 이미 주석이면 푼다.
    // 주석 기호는 코드블록의 언어(```sql -> --, ```js -> //)를 따른다(규칙은 lib/codeComment.js). 슬래시는
    // 키보드 배열에 따라 e.key 가 다를 수 있어 물리 키(e.code)도 본다. 코드블록 밖이면 null 이라 지나간다.
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === '/' || e.code === 'Slash' || e.code === 'NumpadDivide')) {
      const direction = textarea.selectionDirection
      const edit = toggleCommentEdit(textarea.value, textarea.selectionStart, textarea.selectionEnd)
      if (edit) {
        e.preventDefault()
        replaceRange(textarea, edit.from, edit.to, edit.insert, onChange)
        requestAnimationFrame(() => {
          textarea.focus()
          textarea.setSelectionRange(edit.selStart, edit.selEnd, direction)
        })
        return
      }
    }
    // Ctrl+` — 선택에 걸친 줄들을 이름순(가나다·ABC·숫자 크기순)으로 정렬하고, 이미 오름차순이면 내림차순으로 뒤집는다. 선택이
    // 없거나 한 줄뿐이거나 코드블록 여는·닫는 줄이 들어 있으면 sortLinesEdit 가 null 을 줘서 지나간다(규칙은 lib/lineSort.js).
    // 백틱은 키보드 배열에 따라 e.key 가 다를 수 있어 물리 키(e.code)도 본다.
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === '`' || e.code === 'Backquote')) {
      const edit = sortLinesEdit(textarea.value, textarea.selectionStart, textarea.selectionEnd)
      e.preventDefault()
      if (edit) {
        replaceRange(textarea, edit.from, edit.to, edit.insert, onChange)
        requestAnimationFrame(() => {
          textarea.focus()
          textarea.setSelectionRange(edit.selStart, edit.selEnd)
        })
      }
      return
    }
    // Ctrl+Shift+` — 선택에 걸친 줄들을 "묶음" 단위로 이름순 정렬한다(맨 윗줄 글자 기준, 딸린 줄은 함께 움직임). 묶음은 들여쓰기나
    // 목록 표시(*, 1.)·빈 줄로 나뉜다(규칙은 lib/blockSort.js). Shift 가 눌리면 US 배열에서 e.key 가 '~' 가 되므로 물리 키(e.code)도 본다.
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && (e.key === '~' || e.key === '`' || e.code === 'Backquote')) {
      const edit = blockSortEdit(textarea.value, textarea.selectionStart, textarea.selectionEnd)
      e.preventDefault()
      if (edit) {
        replaceRange(textarea, edit.from, edit.to, edit.insert, onChange)
        requestAnimationFrame(() => {
          textarea.focus()
          textarea.setSelectionRange(edit.selStart, edit.selEnd)
        })
      }
      return
    }
    // Ctrl+D — 현재 줄(선택했으면 선택에 걸친 줄 전체)을 아래에 복제한다. MySQL Workbench 의 줄 복제와 같고
    // 문서 어디서나 된다(처음에는 코드블록 안만 됐다). 한글 입력 상태에서는 e.key 가 자모일 수 있어 물리 키
    // (e.code)도 본다. 복제하면 코드블록(```) 구조가 깨지는 줄(여는 줄만, 닫는 줄만 등)이면 duplicateLinesEdit 이
    // null 을 줘서 아무것도 안 하고 지나간다.
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key.toLowerCase() === 'd' || e.code === 'KeyD')) {
      const edit = duplicateLinesEdit(textarea.value, textarea.selectionStart, textarea.selectionEnd)
      if (edit) {
        e.preventDefault()
        replaceRange(textarea, edit.insertAt, edit.insertAt, edit.insertText, onChange)
        requestAnimationFrame(() => {
          textarea.focus()
          textarea.setSelectionRange(edit.selStart, edit.selEnd)
        })
        return
      }
    }
    // Ctrl+Shift+Alt+- — 취소선. code로 체크(물리 키 기준) — Shift가 눌린 상태에서는
    // 키보드 배열에 따라 e.key가 '-'가 아니라 '_' 등으로 올 수 있어 code가 더 안전함.
    if (e.ctrlKey && e.shiftKey && e.altKey && (e.code === 'Minus' || e.code === 'NumpadSubtract')) {
      e.preventDefault()
      wrapSelection(textarea, '~~', '~~', onChange)
      return
    }
    // Tab — 여러 줄을 선택했으면 걸친 줄 전체를 들여쓰고, Shift+Tab 은 내어쓴다(선택이 없어도 현재 줄).
    // 그 밖에는 커서 자리에 공백 4칸. 규칙은 lib/lineIndent.js.
    if (e.key === 'Tab') {
      e.preventDefault()
      const direction = textarea.selectionDirection
      const edit = indentLinesEdit(textarea.value, textarea.selectionStart, textarea.selectionEnd, e.shiftKey)
      if (edit) {
        if (edit.insert !== textarea.value.slice(edit.from, edit.to)) {
          replaceRange(textarea, edit.from, edit.to, edit.insert, onChange)
        }
        requestAnimationFrame(() => {
          textarea.focus()
          textarea.setSelectionRange(edit.selStart, edit.selEnd, direction)
        })
        return
      }
      replaceRange(textarea, textarea.selectionStart, textarea.selectionEnd, INDENT, onChange)
      return
    }
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey && isInsideWikiLink(textarea)) {
      // Enter while the cursor sits right before the ]] closing an open
      // [[문서명 — almost always true right after typing [[, since that
      // auto-pairs to [[|]] — jumps past the ]] and resolves the link
      // (same as if ]] had just been typed) instead of splitting the
      // still-open [[...]] across two lines, which would break it.
      e.preventDefault()
      const newPos = textarea.selectionStart + 2
      textarea.setSelectionRange(newPos, newPos)
      maybeAutoResolveLink(textarea, docIndex, onChange)
      updateFileSuggest()
      updateSnippetSuggest()
      return
    }
    // `* 항목`·`1. 항목`·`> 인용` 줄에서 Enter — 아래 줄에 같은 표시(`* `, 다음 번호, `> `)를 이어 만들고, 표시만 있는 빈 줄에서 Enter 하면
    // 그 표시를 지워 목록·인용을 끝낸다. 한글 조합 중 Enter(글자 확정)는 건드리지 않는다. 규칙은 lib/listContinue.js.
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && !e.nativeEvent.isComposing) {
      const edit = listContinueEdit(textarea.value, textarea.selectionStart, textarea.selectionEnd)
      if (edit) {
        e.preventDefault()
        replaceRange(textarea, edit.from, edit.to, edit.insert, onChange)
        requestAnimationFrame(() => {
          textarea.focus()
          textarea.setSelectionRange(edit.caret, edit.caret)
        })
        return
      }
    }
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      const { selectionStart, selectionEnd, value } = textarea
      // 줄에 ``` 가 완성되면(백틱 2개 뒤에 세 번째를 침) 아래 줄에 닫는 ``` 를 같이 넣고
      // 커서는 여는 ``` 바로 뒤에 둔다 — 언어 이름(```sql)을 이어 쓰고 Enter 하면 두 줄 사이로
      // 들어간다. 이미 열린 코드블록 안에서 치는 ``` 는 닫는 줄이라 건드리지 않는다(규칙은
      // lib/codeFence.js 의 fenceAutoCloseEdit).
      if (e.key === '`') {
        const edit = fenceAutoCloseEdit(value, selectionStart, selectionEnd)
        if (edit) {
          e.preventDefault()
          replaceRange(textarea, selectionStart, selectionEnd, edit.insert, onChange)
          requestAnimationFrame(() => {
            textarea.focus()
            textarea.setSelectionRange(selectionStart + edit.caret, selectionStart + edit.caret)
          })
          return
        }
      }
      if (AUTO_PAIR_CLOSERS.has(e.key) && selectionStart === selectionEnd && value[selectionStart] === e.key) {
        e.preventDefault()
        const newPos = selectionStart + 1
        textarea.setSelectionRange(newPos, newPos)
        // Stepping over an already-there closer (see the comment above
        // AUTO_PAIR_CLOSERS) only moves the cursor — no text actually
        // changes, so no input/onChange event fires. That's exactly how a
        // real person types "]]" to close a [[문서명]] (the opener already
        // auto-inserted both closing brackets; typing "]" twice just walks
        // past them) — so without this, manually typing out the closing
        // brackets never triggered the auto-resolve rewrite, only pasting
        // a whole "[[...]]" at once did. Harmless no-op for any other
        // closer/context; it only ever matches right after "]]". Same
        // reasoning applies to the [[파일: suggestion popup below — closing
        // it here too, since stepping past ]] this way needs the same
        // explicit nudge onChange would otherwise give it for free.
        maybeAutoResolveLink(textarea, docIndex, onChange)
        updateFileSuggest()
        updateSnippetSuggest()
        return
      }
      if (Object.prototype.hasOwnProperty.call(AUTO_PAIRS, e.key)) {
        e.preventDefault()
        const closer = AUTO_PAIRS[e.key]
        if (selectionStart !== selectionEnd) {
          wrapSelection(textarea, e.key, closer, onChange)
        } else {
          replaceRange(textarea, selectionStart, selectionEnd, `${e.key}${closer}`, onChange)
          requestAnimationFrame(() => {
            textarea.focus()
            textarea.setSelectionRange(selectionStart + 1, selectionStart + 1)
          })
        }
      }
    }
  }

  function openTableEditor() {
    const textarea = textareaRef.current
    if (!textarea) return
    const cursorPos = textarea.selectionStart
    const existing = findTableBlock(text, cursorPos)
    if (existing) {
      const headerRow = existing.rows[0]?.filter((c) => !c.mergedInto).every((c) => c.header) ?? false
      setTableModal({
        range: [existing.blockStart, existing.blockEnd],
        initialRows: existing.rows.map((row) =>
          row.map(({ text, bg, color, align, bold, colspan, rowspan, mergedInto, extraAttrs }) => ({
            text,
            bg,
            color,
            align,
            bold,
            colspan,
            rowspan,
            mergedInto,
            extraAttrs,
          })),
        ),
        initialHeaderRow: headerRow,
      })
    } else {
      setTableModal({ range: [cursorPos, cursorPos], initialRows: null, initialHeaderRow: true })
    }
  }

  function confirmTableEditor(markup) {
    const [start, end] = tableModal.range
    const textarea = textareaRef.current
    replaceRange(textarea, start, end, markup, onChange)
    setTableModal(null)
    requestAnimationFrame(() => {
      textarea.focus()
      const pos = start + markup.length
      textarea.setSelectionRange(pos, pos)
    })
  }

  function handleColorPicked(hex) {
    wrapSelection(textareaRef.current, `{{{${hex} `, '}}}', onChange)
  }

  const wrap = (before, after = before) => wrapSelection(textareaRef.current, before, after, onChange)
  const linePrefix = (prefix) => insertLinePrefix(textareaRef.current, prefix, onChange)
  const blockInsert = (block) => insertBlockText(textareaRef.current, onChange, block)

  async function insertCategory() {
    const result = await requestPrompt({
      title: '분류 추가',
      fields: [{ key: 'name', label: '분류 이름', placeholder: '예: 포켓몬/세계관' }],
    })
    if (result?.name) blockInsert(`[[분류:${result.name}]]`)
  }

  async function insertAlias() {
    const result = await requestPrompt({
      title: '별칭 추가',
      fields: [
        {
          key: 'name',
          label: '별칭',
          placeholder: '예: 치고마 (검색만 이 문서로 연결 — 화면엔 안 보임)',
        },
      ],
    })
    if (result?.name) blockInsert(`[[별칭:${result.name}]]`)
  }

  async function insertDataRef() {
    const result = await requestPrompt({
      title: '자료 불러오기',
      fields: [
        { key: 'type', label: '유형', placeholder: '예: 기술, 특성' },
        { key: 'name', label: '이름', placeholder: '예: 번개펀치' },
      ],
    })
    if (result?.type && result?.name) blockInsert(`[[자료:${result.type}/${result.name}]]`)
  }

  async function insertTemplateCall() {
    const result = await requestPrompt({
      title: '틀 불러오기',
      fields: [
        { key: 'name', label: '틀 이름', placeholder: '예: 포켓몬정보상자' },
        { key: 'params', label: '매개변수 (선택) — 이름=값, 쉼표로 구분', placeholder: '예: 이름=피카츄, 타입=전기', required: false },
      ],
    })
    if (!result?.name) return
    const paramList = result.params
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    const paramsMarkup = paramList.map((p) => `|${p}`).join('')
    blockInsert(`{{틀:${result.name}${paramsMarkup}}}`)
  }

  // Opens the native file picker (via the store, which delegates to
  // electron/main.js) and, once something's actually been imported, inserts
  // the reference right away — no separate naming step needed since the
  // picked file's own name becomes the registered image name.
  async function insertImageRef() {
    const name = await importImage()
    if (name) blockInsert(`[[파일:${name}]]`)
  }

  return (
    <div className="editor-pane">
      {!disabled && (
        <div className="editor-toolbar" ref={toolbarRef}>
          <div className="toolbar-group">
            <ToolbarButton icon={Heading1} label="제목" title="제목 (=텍스트=)" onClick={() => wrap('=')} />
            <ToolbarButton icon={List} label="목록" title="목록 (* 항목)" onClick={() => linePrefix('* ')} />
            <ToolbarButton icon={Quote} label="인용" title="인용 (> 인용)" onClick={() => linePrefix('> ')} />
            <ToolbarButton icon={Minus} label="구분선" title="구분선" onClick={() => blockInsert('----')} />
            <ToolbarButton icon={ListTree} label="목차" title="자동 목차 ([목차])" onClick={() => blockInsert('[목차]')} />
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            <ToolbarButton icon={Bold} label="굵게" title="굵게 ('''텍스트''')" onClick={() => wrap("'''")} />
            <ToolbarButton icon={Italic} label="기울임" title="기울임 (''텍스트'')" onClick={() => wrap("''")} />
            <ToolbarButton icon={Underline} label="밑줄" title="밑줄 (__텍스트__)" onClick={() => wrap('__')} />
            <ToolbarButton icon={Strikethrough} label="취소선" title="취소선 (~~텍스트~~)" onClick={() => wrap('~~')} />
            <ToolbarButton icon={Superscript} label="위첨자" title="위첨자 (^^텍스트^^)" onClick={() => wrap('^^')} />
            <ToolbarButton icon={Subscript} label="아래첨자" title="아래첨자 (,,텍스트,,)" onClick={() => wrap(',,')} />
            <span className="toolbar-color-label">
              <Palette size={14} strokeWidth={2} />
              글자색
            </span>
            <ColorPicker value={null} onChange={handleColorPicked} title="글자 색 (선택한 텍스트에 적용)" />
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            <ToolbarButton icon={Asterisk} label="각주" title="각주 ([* 내용])" onClick={() => wrap('[* ', ']')} />
            <ToolbarButton
              icon={ChevronDown}
              label="접기"
              title="접기/펼치기 블록 삽입"
              onClick={() => blockInsert(FOLDING_TEMPLATE)}
            />
            <ToolbarButton
              icon={Sparkles}
              label="그라데이션"
              title="그라데이션 편집기 열기 (텍스트/표 셀 모두 안에서 전환 가능)"
              onClick={() => setGradientModal({ mode: 'text' })}
            />
            <ToolbarButton icon={Table2} label="표" title="표 삽입/편집" onClick={openTableEditor} />
            <ToolbarButton icon={Tags} label="분류" title="분류 추가 ([[분류:이름]])" onClick={insertCategory} />
            <ToolbarButton
              icon={Tag}
              label="별칭"
              title="검색용 별칭 추가 ([[별칭:이름]] — 이 이름으로 검색하면 이 문서가 나옴, 화면엔 표시 안 됨)"
              onClick={insertAlias}
            />
            <ToolbarButton
              icon={Database}
              label="자료 불러오기"
              title="저장된 자료 카드 삽입 ([[자료:유형/이름]], 그 줄에 단독으로 있어야 카드로 보임)"
              onClick={insertDataRef}
            />
            <ToolbarButton
              icon={LayoutTemplate}
              label="틀 불러오기"
              title="틀 삽입 ({{틀:이름}}, 매개변수 지정 가능 — 실제 나무위키 틀 문법)"
              onClick={insertTemplateCall}
            />
            <ToolbarButton
              icon={ImageIcon}
              label="이미지"
              title="이미지 가져오기 ([[파일:이름]] — 파일 선택 후 바로 삽입, 그 줄에 단독으로 있어야 그림으로 보임)"
              onClick={insertImageRef}
            />
            <ToolbarButton
              icon={Zap}
              label="상용구 삽입"
              title="등록된 상용구 전체 목록에서 골라 삽입 (앞 9개는 숫자키 1~9로도 선택 — 발동 단축어를 직접 타이핑해도 자동완성됨)"
              onClick={openSnippetBrowser}
            />
            <ToolbarButton
              icon={BookmarkPlus}
              label="상용구 등록"
              title="새 상용구 등록 (Alt+T) — 글자를 선택해 두면 그 내용이 본문에 채워진 채로 열림"
              onClick={openSnippetModalWithSelection}
            />
            <ToolbarButton
              icon={WandSparkles}
              label="추천 팝업"
              active={snippetSuggestEnabled}
              title={
                snippetSuggestEnabled
                  ? '타이핑 중 상용구 추천 팝업 켜짐 (Alt+Shift+T 또는 클릭하면 꺼짐)'
                  : '타이핑 중 상용구 추천 팝업 꺼짐 (Alt+Shift+T 또는 클릭하면 켜짐)'
              }
              onClick={toggleSnippetSuggest}
            />
            <ToolbarButton
              icon={ListOrdered}
              label="줄 번호"
              active={editorLineNumbers}
              title={
                editorLineNumbers
                  ? '줄 번호와 줄 강조 점 켜짐 (클릭하면 꺼짐) — 줄 왼쪽의 점을 누르면 그 줄이 강조됩니다'
                  : '줄 번호와 줄 강조 점 꺼짐 (클릭하면 켜짐)'
              }
              onClick={() => setEditorLineNumbers(!editorLineNumbers)}
            />
          </div>
        </div>
      )}
      <div className={`editor-text-wrap${editorLineNumbers ? ' with-gutter' : ''}`}>
        <div ref={backdropRef} className="editor-highlight-backdrop" aria-hidden="true">
          {highlightLines}
        </div>
        <textarea
          ref={textareaRef}
          className={`editor-textarea${gutterHover ? ' in-gutter' : ''}`}
          value={text}
          disabled={disabled}
          placeholder={
            disabled
              ? ''
              : '=제목=\n\n나무위키 스타일 문법으로 작성하세요.\n\'\'\'굵게\'\'\', __밑줄__, ~~취소선~~, \'\'기울임\'\'\n[* 각주 내용]\n* 목록\n> 인용\n||=칸1=||=칸2=||\n||값1||값2||\n#태그1 #태그2\n\n위 툴바 버튼으로도 문법을 몰라도 서식을 넣을 수 있습니다.'
          }
          onChange={(e) => {
            const rewrote = maybeAutoResolveLink(e.target, docIndex, onChange)
            if (!rewrote) onChange(e.target.value)
            updateFileSuggest()
            updateSnippetSuggest()
          }}
          onKeyDown={handleKeyDown}
          onMouseMove={(e) => {
            const hit = gutterHit(e)
            setGutterHover((prev) => {
              if (!hit) return prev === null ? prev : null
              return prev && prev.line === hit.line && prev.top === hit.top && prev.on === hit.on ? prev : hit
            })
          }}
          onMouseLeave={() => setGutterHover(null)}
          onMouseDown={(e) => {
            // 줄 여백의 점을 누르면 그 줄 강조를 켜고 끈다(제목 줄은 항상 켜져 있어서 바뀌지 않는다). 글 커서는 옮기지 않는다.
            const hit = gutterHit(e)
            if (!hit) return
            e.preventDefault()
            if (!hit.heading) {
              toggleLineMark(hit.line)
              setGutterHover({ ...hit, on: !hit.on }) // 눌러서 켜졌으면 빈 점 대신 채워진 점이 보이게(마우스를 움직이기 전에도)
            }
          }}
          onClick={() => {
            updateFileSuggest()
            updateSnippetSuggest()
          }}
          onKeyUp={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
              updateFileSuggest()
              updateSnippetSuggest()
            }
          }}
          onBlur={() => {
            setFileSuggest(null)
            setSnippetSuggest(null)
          }}
          onScroll={(e) => {
            setEditorScroll(activeTabId, e.target.scrollTop)
            setGutterHover(null)
            if (backdropRef.current) backdropRef.current.scrollTop = e.target.scrollTop
          }}
          spellCheck={false}
        />
        {editorLineNumbers && gutterHover && !gutterHover.on && (
          <div className="editor-gutter-dot" style={{ top: gutterHover.top + 9 }} aria-hidden="true" />
        )}
      </div>
      {findBar && (
        <FindReplaceBar
          state={findBar}
          onQueryChange={updateFindQuery}
          onReplaceQueryChange={(replaceQuery) => setFindBar((prev) => prev && { ...prev, replaceQuery })}
          onNext={findNext}
          onPrev={findPrev}
          onReplaceOne={replaceCurrentMatch}
          onReplaceAll={replaceAllMatches}
          onClose={closeFindBar}
        />
      )}
      {fileSuggest && (
        <div className="file-suggest-menu" style={{ top: fileSuggest.top, left: fileSuggest.left }}>
          {fileSuggest.items.length === 0 ? (
            <div className="file-suggest-empty">일치하는 이미지가 없습니다.</div>
          ) : (
            fileSuggest.items.map((name, i) => (
              <div
                key={name}
                className={`file-suggest-item ${i === fileSuggest.activeIndex ? 'active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  selectFileSuggestItem(name)
                }}
              >
                <img className="file-suggest-thumb" src={imageIndex[name].dataUrl} alt="" />
                <span>{name}</span>
              </div>
            ))
          )}
        </div>
      )}
      {snippetSuggest && (
        <div className="file-suggest-menu snippet-suggest-menu" style={{ top: snippetSuggest.top, left: snippetSuggest.left }}>
          {snippetSuggest.items.length === 0 ? (
            <div className="file-suggest-empty">일치하는 상용구가 없습니다.</div>
          ) : (
            snippetSuggest.items.map((entry, i) => (
              <div
                key={`${entry.category}/${entry.title}`}
                className={`file-suggest-item ${i === snippetSuggest.activeIndex ? 'active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  selectSnippetSuggestItem(entry)
                }}
              >
                {snippetSuggest.mode === 'browse' && i < 9 && <span className="snippet-suggest-badge">{i + 1}</span>}
                <span>{entry.title}</span>
                <span className="snippet-suggest-category">{entry.category}</span>
              </div>
            ))
          )}
        </div>
      )}
      {tableModal && (
        <TableEditorModal
          initialRows={tableModal.initialRows}
          initialHeaderRow={tableModal.initialHeaderRow}
          onCancel={() => setTableModal(null)}
          onConfirm={confirmTableEditor}
        />
      )}
      {gradientModal && (
        <GradientEditorModal
          initialMode={gradientModal.mode}
          onCancel={() => setGradientModal(null)}
          onConfirm={(markup) => {
            blockInsert(markup)
            setGradientModal(null)
          }}
        />
      )}
    </div>
  )
}
