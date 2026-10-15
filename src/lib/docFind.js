// Copyright (c) dendr000. MIT License.

// 현재 문서 안 찾기·찾아 바꾸기(Ctrl+F / Ctrl+Shift+F)의 규칙. 사이드바의 "제목·내용 검색"은 워크스페이스 전체를 뒤지는 전역 검색이라 이것과 별개다.
// 화면(textarea)과 분리한 순수 함수라서 시험할 수 있다.
//
// 대소문자를 구분하지 않는 일반 부분 문자열 매치(정규식 아님)라서, 입력한 글자를 정규식 특수문자로 오인할 걱정이 없다.
// **줄바꿈도 그냥 글자 하나다.** 찾을 내용·바꿀 내용에 줄바꿈을 넣을 수 있고(찾기 바에서 Shift+Enter, 여러 줄 붙여 넣기), "\n" 같은
// 표기를 따로 해석하지 않는다 — 문서에 글자 그대로 적힌 백슬래시+n(예: 코드의 printf("\n"))과 헷갈리지 않는다. 편집창의 글(textarea.value)은
// 줄바꿈이 항상 "\n" 하나라서 CRLF 를 따로 다루지 않는다.

// haystack 안에서 query 가 나오는 곳 전부: [{ start, end }] — 앞에서부터 겹치지 않게 센다.
export function findAllMatches(haystack, query) {
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
export function nearestMatchIndex(matches, cursorPos) {
  if (matches.length === 0) return -1
  const idx = matches.findIndex((m) => m.start >= cursorPos)
  return idx === -1 ? 0 : idx
}

// "모두 바꾸기"를 한 번의 편집으로 만든다: { from, to, insert } — text 의 [from, to) 를 insert 로 갈아 끼우면 모든 매치가 바뀐 결과가 된다.
// 첫 매치의 시작부터 마지막 매치의 끝까지만 다시 쓰고 앞뒤 글은 건드리지 않는다. 매치마다 따로 바꾸면(편집을 매치 수만큼 반복하면)
// 줄바꿈처럼 매치가 수천 개일 때 느리고 Ctrl+Z 도 그만큼 눌러야 해서, 한 번에 바꾸고 되돌리기도 한 번으로 끝나게 한다.
// 매치가 없으면 null.
export function replaceAllEdit(text, matches, replacement) {
  if (matches.length === 0) return null
  const from = matches[0].start
  const to = matches[matches.length - 1].end
  let insert = ''
  let cursor = from
  for (const { start, end } of matches) {
    insert += text.slice(cursor, start) + replacement
    cursor = end
  }
  return { from, to, insert }
}

// 찾기 바 입력칸(field: 'query' 찾기 칸, 'replace' 바꿀 내용 칸)에서 눌린 키가 하는 일.
//   'next' | 'prev' | 'replaceOne' | 'close' — 해당 동작을 한다(호출한 쪽이 기본 동작을 막는다)
//   'newline'                              — 입력칸 안에서 줄바꿈을 넣는다(기본 동작을 그대로 둔다: Shift+Enter)
//   null                                   — 아무것도 하지 않는다
// 찾기 칸: Enter 다음, Ctrl/Cmd+Enter 이전(Shift+Enter 는 줄바꿈이라 이전 찾기를 옮겼다), F3 다음, Shift+F3 이전.
// 바꿀 내용 칸: Enter 하나 바꾸기, Shift+Enter 줄바꿈. 한글 조합 중(글자 확정)의 키는 가로채지 않는다.
export function findKeyAction(e, field) {
  if (e.isComposing) return null
  if (e.key === 'Escape') return 'close'
  if (e.altKey) return null
  const modifier = e.ctrlKey || e.metaKey
  if (e.key === 'Enter') {
    if (e.shiftKey && !modifier) return 'newline'
    if (e.shiftKey) return null
    if (field === 'replace') return modifier ? null : 'replaceOne'
    return modifier ? 'prev' : 'next'
  }
  if (e.key === 'F3' && field === 'query' && !modifier) return e.shiftKey ? 'prev' : 'next'
  return null
}

// 글 안의 위치(offset)를 (줄 번호, 줄 안 칸)으로 바꾼다 — 줄은 0부터. 편집창 뒤쪽 표시층은 줄마다 요소 하나라서, 찾은 글을 그 위에 칠하려면
// 이 값이 필요하다. offset 은 0 ~ text.length 이고, 줄바꿈 바로 뒤는 다음 줄의 0칸이다.
export function offsetToLineColumn(text, offset) {
  const before = text.slice(0, offset)
  const line = before.split('\n').length - 1
  const lineStart = before.lastIndexOf('\n') + 1
  return { line, column: offset - lineStart }
}

// 표시하려는 매치가 지금 글에서도 그 자리에 있는지 — 찾은 뒤에 글이 바뀌었으면(타자, 되돌리기 등) 낡은 위치에 표시가 남지 않게 한다.
export function isMatchCurrent(text, match, query) {
  if (!match || !query) return false
  return text.slice(match.start, match.end).toLowerCase() === query.toLowerCase()
}
