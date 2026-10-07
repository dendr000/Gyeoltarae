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

// 글자·숫자·밑줄 — 코드에서 한 단어를 이루는 글자(한글 포함).
const WORD_CHAR_RE = /[\p{L}\p{N}_]/u

// options.wordStartOnly: 단어 "중간"에서 시작하는 글자로는 찾지 않는다. 코드블록 안에서 켠다 — 이 검색은
// 줄 끝의 모든 접미사를 시험하므로(고정 트리거 글자가 없어서), 끄면 `NAME` 을 칠 때 끝의 "E" 한 글자를
// 새 단어로 보고 END·ERD·ELSE ... 를 추천한다. 단어의 시작이란 줄 맨 앞이거나 바로 앞이 단어 글자가
// 아닌 자리(공백·괄호·점·쉼표 등)이다. 기호로 시작하는 접미사(->)는 글자 바로 뒤여도 시작으로 인정한다.
// 글(문단)에서는 켜지 않는다: 한국어는 조사가 붙어서 단어 중간에서 단축어가 시작되는 일이 흔하다.
export function findSnippetQuery(value, pos, entries, { wordStartOnly = false } = {}) {
  if (entries.length === 0) return null
  const lineStart = value.lastIndexOf('\n', pos - 1) + 1
  const upToCursor = value.slice(lineStart, pos)
  if (!upToCursor.trim()) return null

  const checkLimit = Math.max(0, upToCursor.length - SNIPPET_LOOKBACK)
  for (let start = checkLimit; start < upToCursor.length; start += 1) {
    if (wordStartOnly && start > 0 && WORD_CHAR_RE.test(upToCursor[start - 1]) && WORD_CHAR_RE.test(upToCursor[start])) {
      continue
    }
    const suffix = upToCursor.slice(start)
    const lowerSuffix = suffix.toLowerCase()
    const prefixMatches = entries.filter((entry) => entry.title.toLowerCase().startsWith(lowerSuffix))
    if (prefixMatches.length === 0) continue
    // 확정해도 아무것도 안 바뀌는 후보(본문이 이미 친 글자와 똑같음 — 예: SELECT 를 다 쳤는데 본문이
    // SELECT 인 후보)는 내지 않는다. 키워드를 상용구로 많이 등록해 두면 다 친 글자에 대해서도 후보가
    // 뜨고 Enter 가 그걸 확정해 버리기 때문. 걸리는 게 전부 그런 후보면 더 짧은 글자로 되돌아가 다른
    // 후보를 찾지 않고 팝업을 닫는다 — "NOT NULL" 을 다 쳤는데 끝의 "NULL" 로 "NULLIF" 를 찾으면 안 되므로.
    const matches = prefixMatches.filter((entry) => entry.content !== suffix)
    if (matches.length === 0) return null
    // 순서 목록(_순서.txt)에 있는 후보(entry.rank 가 있는 것)를 목록에 없는 후보보다 먼저, 그다음 대소문자까지
    // 같은 것 우선, 그다음 정확히 일치하는 제목, 그다음 rank(작을수록 위), 그다음 제목이 짧은 순 — 정확
    // 일치와 짧은 순은 Galpi와 동일. 목록에 적은 것은 사용자가 직접 고른 순서라서, 소문자로 `create` 를 쳤을 때
    // 대소문자가 같다는 이유만으로 목록에 없는 created_at 이 CREATE TABLE 위에 오지 않게 한다.
    // 순서 목록이 없으면 예전 정렬과 똑같다.
    matches.sort((a, b) => {
      const aListed = Number.isFinite(a.rank) ? 0 : 1
      const bListed = Number.isFinite(b.rank) ? 0 : 1
      if (aListed !== bListed) return aListed - bListed
      const aCase = a.title.startsWith(suffix) ? 0 : 1
      const bCase = b.title.startsWith(suffix) ? 0 : 1
      if (aCase !== bCase) return aCase - bCase
      const aExact = a.title.length === suffix.length ? 0 : 1
      const bExact = b.title.length === suffix.length ? 0 : 1
      if (aExact !== bExact) return aExact - bExact
      const aRank = a.rank ?? Infinity
      const bRank = b.rank ?? Infinity
      if (aRank !== bRank) return aRank < bRank ? -1 : 1
      if (a.title.length !== b.title.length) return a.title.length - b.title.length
      return a.title.localeCompare(b.title, 'ko') || a.category.localeCompare(b.category, 'ko')
    })
    return { start: lineStart + start, end: pos, matches }
  }
  return null
}

// 추천 팝업이 떠 있을 때 Enter 가 후보를 확정하는가. 코드블록 밖(글을 쓰는 중)에서는 예전처럼 항상
// 확정한다. 코드블록 안에서는 방향키로 후보를 직접 고르기 전에는 확정하지 않고 그냥 줄바꿈이 들어가게
// 한다 — 코드는 줄 끝이 `NOT NULL` 처럼 키워드로 끝나는 일이 많은데, 그때마다 Enter 가 "NULLIF" 같은
// 후보를 확정해 버리면 줄바꿈도 안 되고 글자도 망가진다. Tab 은 코드블록 안에서도 항상 확정한다.
export function enterAcceptsSuggestion({ inCodeBlock, navigated }) {
  return !inCodeBlock || navigated
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
