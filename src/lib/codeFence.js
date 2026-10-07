// Copyright (c) dendr000. MIT License.

// ``` 코드블록의 "펜스"(여는 줄·닫는 줄) 규칙. 렌더링(wikiParser.js)과 편집기의 자동 닫기
// (EditorPane.jsx)가 같은 규칙을 써야 "편집기가 닫아 준 줄 = 뷰어가 닫는 줄로 보는 줄"이
// 어긋나지 않으므로 한 곳에 둔다.

// 여는 줄은 백틱 3개 이상 + 선택적인 언어 이름만 있어야 한다 — "```코드```"처럼 한 줄에
// 같이 쓴 건 코드블록이 아니라 그냥 글자. 언어 이름은 공백·백틱만 아니면 무엇이든(한글
// "자바스크립트", "C++", "C#" 등) 받는다. 닫는 줄은 여는 줄 이상의 백틱만 있는 줄이라,
// 백틱 4개로 열면 안에 백틱 3개짜리 줄을 그대로 보여줄 수 있다.
const CODE_FENCE_OPEN_RE = /^(`{3,})([^\s`]*)\s*$/
const CODE_FENCE_CLOSE_RE = /^(`{3,})\s*$/

export function matchCodeFenceOpen(line) {
  const m = line.trim().match(CODE_FENCE_OPEN_RE)
  return m ? { ticks: m[1].length, lang: m[2] } : null
}

export function isCodeFenceClose(line, ticks) {
  const m = line.trim().match(CODE_FENCE_CLOSE_RE)
  return m !== null && m[1].length >= ticks
}

// lines[index] 가 시작될 때 열려 있는 코드블록의 여는 줄 정보({ ticks, lang }), 없으면 null —
// index 앞 줄들만 훑어서 판단한다.
export function openCodeFenceAt(lines, index) {
  let open = null
  for (let i = 0; i < index && i < lines.length; i += 1) {
    if (open === null) {
      open = matchCodeFenceOpen(lines[i])
    } else if (isCodeFenceClose(lines[i], open.ticks)) {
      open = null
    }
  }
  return open
}

// lines[index] 가 시작될 때 열려 있는 코드블록 안인가. 안이면 그 줄의 ``` 는 새로 여는 게 아니라
// 닫는 줄이다.
export function isInsideCodeFence(lines, index) {
  return openCodeFenceAt(lines, index) !== null
}

// 커서(pos)가 있는 줄 앞쪽의 줄들(커서 줄은 빼고).
function linesBeforeCursorLine(value, pos) {
  const lineStart = value.lastIndexOf('\n', pos - 1) + 1
  const lines = value.slice(0, lineStart).split('\n')
  // 마지막 요소는 lineStart 직전의 빈 조각("...\n" 뒤)이라 실제 줄은 아니다.
  lines.pop()
  return lines
}

// 커서가 "언어 이름이 적힌 코드블록"(```sql, ```MySQL, ```자바스크립트 ...) 안에 있는가. 언어가 없는
// ``` 블록(그냥 글자일 수 있음)과 여는 줄 자신, 닫힌 뒤는 아니다. 에디터가 이 안에서는 상용구 추천
// 팝업을 설정과 상관없이 켜는 데 쓴다(EditorPane.jsx 의 updateSnippetSuggest).
export function isInLanguageCodeFenceAt(value, pos) {
  const lines = linesBeforeCursorLine(value, pos)
  const open = openCodeFenceAt(lines, lines.length)
  return open !== null && open.lang !== ''
}

// 편집기에서 백틱을 눌렀을 때 ``` 가 완성되면 아래 줄에 닫는 ``` 를 같이 넣어 주기 위한 계산.
// 눌린 백틱은 아직 value 에 없다(keydown 시점). 조건:
//  - 선택 영역이 없고, 커서 앞의 같은 줄이 (들여쓰기 +) 백틱 정확히 2개이며(눌러서 3개가 됨),
//  - 커서 뒤 같은 줄에는 공백뿐이고,
//  - 이미 열린 코드블록 안이 아니다(안이면 지금 치는 ``` 는 닫는 줄이다).
// 해당하면 { insert, caret } — insert 를 커서 자리에 넣고, 커서는 insert 의 caret 번째 글자
// 뒤(= 첫 ``` 바로 뒤, 언어 이름을 이어 쓸 자리)에 둔다. 아니면 null.
export function fenceAutoCloseEdit(value, selectionStart, selectionEnd) {
  if (selectionStart !== selectionEnd) return null
  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
  const lineEndIdx = value.indexOf('\n', selectionStart)
  const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx

  const before = value.slice(lineStart, selectionStart)
  const indentMatch = before.match(/^([ \t]*)``$/)
  if (!indentMatch) return null
  if (value.slice(selectionStart, lineEnd).trim() !== '') return null

  const linesBefore = linesBeforeCursorLine(value, selectionStart)
  if (isInsideCodeFence(linesBefore, linesBefore.length)) return null

  return { insert: `\`\n${indentMatch[1]}\`\`\``, caret: 1 }
}
