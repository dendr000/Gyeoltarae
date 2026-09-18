// 고유명사 사전 — Alt+H 순환치환 (Galpi 프로젝트의 dictLocalDb.js를 그대로 포팅).
// Galpi는 사전이 11만 건 이상이라 IndexedDB에 캐싱하고 비동기로 조회했지만, 결타래의
// 사전은 워크스페이스 하나(개인 세계관 위키) 분량이라 전체를 메모리에 올려두고 동기적으로
// 찾아도 체감 지연이 없다 — 그래서 여기엔 캐싱 계층이 없고, useAppStore.js의
// rebuildIndexes가 매번 파일을 새로 읽어 parseDictText로 만든 Map을 그대로 쓴다.

// Alt+H 순환치환 대상 원문의 최대 길이 방어선(Galpi와 동일) — 사전 내 원문은 보통 10자
// 안팎이고, "원문(한자)" 순환 형태까지 고려해도 이 정도면 충분하다.
const MAX_MATCH_LEN = 24

// "원문(한자)" 형태의 줄 하나를 한 항목으로 파싱 — 같은 원문이 여러 줄이면 동음이의어로
// 보고 배열에 순서대로 쌓는다(등록 순서가 곧 Alt+H 순환 순서).
export function parseDictText(text) {
  const map = new Map()
  for (const rawLine of (text ?? '').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const match = line.match(/^([^()]+)\(([^()]+)\)$/)
    if (!match) continue
    const word = match[1].trim()
    const translation = match[2].trim()
    if (!word || !translation) continue
    if (!map.has(word)) map.set(word, [])
    map.get(word).push(translation)
  }
  return map
}

// [원문, 원문(한자1), 원문(한자2), ...] — 이 배열 안에서 다음 인덱스로 넘어가는 것이
// "순환"의 전부다.
function buildCycleList(word, translations) {
  return [word, ...translations.map((t) => `${word}(${t})`)]
}

// 커서 바로 앞 텍스트(textBefore)를 받아, 그 끝부분이 사전 원문(또는 이미 순환된
// "원문(한자)" 형태) 중 하나와 일치하는지 찾아 다음 순환 후보를 돌려준다. 못 찾으면 null.
// 가장 긴 접미사부터 시도해서, 짧은 원문이 긴 원문을 가로채지 않게 한다(예: "동방불패"가
// 사전에 있으면 "방불패" 대신 "동방불패" 전체가 먼저 매치되어야 함).
export function resolveCycleReplacement(textBefore, dictMap) {
  if (!textBefore || !dictMap || dictMap.size === 0) return null
  const maxLen = Math.min(MAX_MATCH_LEN, textBefore.length)

  for (let len = maxLen; len >= 1; len -= 1) {
    const suffix = textBefore.slice(-len)
    // "지체(之體)"처럼 이미 한자가 붙은 형태면 '(' 앞의 베이스 원문으로 조회한다.
    const parenIdx = suffix.indexOf('(')
    const base = parenIdx > 0 ? suffix.slice(0, parenIdx) : suffix
    const translations = dictMap.get(base)
    if (!translations || translations.length === 0) continue

    const cycleList = buildCycleList(base, translations)
    const matchIdx = cycleList.indexOf(suffix)
    if (matchIdx === -1) continue

    const nextIndex = (matchIdx + 1) % cycleList.length
    return { matchLength: suffix.length, replacement: cycleList[nextIndex] }
  }

  return null
}
