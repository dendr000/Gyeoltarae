// Copyright (c) dendr000. MIT License.

// 에디터가 커서 앞 글자에서 상용구를 찾는 규칙. 화면(textarea)과 분리한 순수 함수라서 시험할 수
// 있다. entries 는 { category, title, content, ... } 상용구 엔트리 배열.
//
// 같은 제목이 카테고리마다 따로 있을 수 있으므로 제목 문자열이 아니라 엔트리 객체를 그대로
// 돌려준다 — 실제 삽입될 내용(content)이 카테고리에 따라 다르기 때문.

// 상용구 자동완성용 — Galpi 원본과 달리 고정 트리거 문자가 없다. 커서 앞 줄의 끝부분을
// 최대 SNIPPET_LOOKBACK자까지 가장 긴 접미사부터 하나씩 줄여가며, 등록된 상용구 제목 중
// 그 접미사로 "시작하는"(prefix match) 것이 하나라도 있는 첫 길이에서 멈춘다(짧은 접미사가
// 긴 접미사를 가로채지 않도록).
//
// 추천 팝업은 대소문자를 가리지 않고 찾되(소문자로 쳐도 "MySQL"을 추천), 대소문자까지 똑같이
// 시작하는 제목을 맨 앞에 보여 준다 — "MYSQL"과 "mysql"을 따로 등록해 둔 경우 친 글자와 같은
// 쪽이 먼저 뜨도록.
export const SNIPPET_LOOKBACK = 30

export function findSnippetQuery(value, pos, entries) {
  if (entries.length === 0) return null
  const lineStart = value.lastIndexOf('\n', pos - 1) + 1
  const upToCursor = value.slice(lineStart, pos)
  if (!upToCursor.trim()) return null

  const checkLimit = Math.max(0, upToCursor.length - SNIPPET_LOOKBACK)
  for (let start = checkLimit; start < upToCursor.length; start += 1) {
    const suffix = upToCursor.slice(start)
    const lowerSuffix = suffix.toLowerCase()
    const matches = entries.filter((entry) => entry.title.toLowerCase().startsWith(lowerSuffix))
    if (matches.length === 0) continue
    // 대소문자까지 같은 것 우선, 그다음 정확히 일치하는 제목, 그다음 제목이 짧은 순 —
    // 뒤의 두 기준은 Galpi와 동일.
    matches.sort((a, b) => {
      const aCase = a.title.startsWith(suffix) ? 0 : 1
      const bCase = b.title.startsWith(suffix) ? 0 : 1
      if (aCase !== bCase) return aCase - bCase
      const aExact = a.title.length === suffix.length ? 0 : 1
      const bExact = b.title.length === suffix.length ? 0 : 1
      if (aExact !== bExact) return aExact - bExact
      if (a.title.length !== b.title.length) return a.title.length - b.title.length
      return a.title.localeCompare(b.title, 'ko') || a.category.localeCompare(b.category, 'ko')
    })
    return { start: lineStart + start, end: pos, matches }
  }
  return null
}

// Galpi의 isBpAuto(스페이스바 자동 치환) 포팅 — 커서 앞 줄의 끝부분이 등록된 상용구
// 제목과 접두사가 아니라 "정확히" 일치하는지 확인(길이가 다른 제목들이 동시에 일치할 수
// 있으므로 가장 긴 것 우선). 같은 길이로 여러 개(카테고리만 다른 동일 제목)가 동시에
// 걸리면 하나로 정할 수 없으니 호출부가 숫자 선택 팝업을 띄운다.
//
// 대소문자를 구분한다 — "MYSQL"과 "mysql"을 각각 다른 상용구로 등록할 수 있어야 하므로.
// (추천 팝업 findSnippetQuery 는 대소문자를 가리지 않는다.)
export function findExactSnippetMatch(value, pos, entries) {
  if (entries.length === 0) return null
  const lineStart = value.lastIndexOf('\n', pos - 1) + 1
  const currentLine = value.slice(lineStart, pos)
  if (!currentLine.trim()) return null

  const matches = entries.filter((entry) => entry.title && currentLine.endsWith(entry.title))
  if (matches.length === 0) return null
  const maxLen = Math.max(...matches.map((e) => e.title.length))
  const longest = matches.filter((e) => e.title.length === maxLen)
  return { start: pos - maxLen, end: pos, matches: longest }
}
