// Copyright (c) dendr000. MIT License.

// 폴더 범위 영어 단어 추천 — 문서에 써 온 영어 단어(CREATE, employee_id ...)를 같은 "범위"의 다른 문서를 쓸 때
// 자동 추천 팝업에 올린다. 문서 A 에서 CREATE 를 썼다면 같은 범위의 문서 B 에서 C 만 쳐도 CREATE 가 뜬다.
// 화면과 분리한 순수 함수라서 시험할 수 있다. 문서 내용은 store 의 searchIndex({ [경로]: { content } })를 쓴다.
//
// 범위: 워크스페이스 루트 아래 "두 번째 단계 폴더"(예: 강의/따즈아, 웹툰/멸망 이후의 세계). 최상위 폴더 바로 아래에
// 있는 문서는 그 최상위 폴더가 범위다. 루트 바로 아래의 문서는 범위가 없다. 최상위 폴더마다 "전체 문서에서 모으기"를
// 켜면 그 폴더 아래 모든 문서의 단어를 쓴다(wholeTops).

// 영문자로 시작하고 영문자·숫자·밑줄이 이어지는 3글자 이상. 한글은 대상이 아니다. 앞에 영문자·숫자·밑줄이 붙어 있으면
// (12abc) 단어의 중간이라 뽑지 않는다. 한글 바로 뒤(NULL값, 한글word)는 뽑는다 — 조사가 붙는 한국어 글이라서.
const WORD_RE = /(?<![A-Za-z0-9_])[A-Za-z][A-Za-z0-9_]{2,}/g

// 단어로 세지 않을 글: [[위키 링크·분류]], {{틀}}, <표 속성 태그>, 주소(URL).
const NOISE_RE = /\[\[[^\]\n]*\]\]|\{\{[^}\n]*\}\}|<[^>\n]*>|https?:\/\/\S+/g

export function extractWords(text) {
  return (text ?? '').replace(NOISE_RE, ' ').match(WORD_RE) ?? []
}

function normalizePath(path) {
  return path.replace(/\\/g, '/').replace(/\/+$/, '')
}

// 문서 경로의 범위. { top, scope } 또는 범위가 없으면 null.
//   top   - 최상위 폴더 이름(루트 바로 아래 폴더)
//   scope - 범위 이름("최상위/두번째" 또는, 최상위 폴더 바로 아래 문서면 최상위 이름)
export function scopeOfPath(filePath, root) {
  const base = normalizePath(root)
  const path = normalizePath(filePath)
  if (!path.startsWith(`${base}/`)) return null
  const segments = path.slice(base.length + 1).split('/')
  if (segments.length < 2) return null // 루트 바로 아래의 문서
  if (segments.length === 2) return { top: segments[0], scope: segments[0] }
  return { top: segments[0], scope: `${segments[0]}/${segments[1]}` }
}

// 단어 색인. byScope: 범위별, byTop: 최상위 폴더별(그 아래 모든 문서). 단어는 대소문자 구분 없이 하나로 묶고
// (키는 소문자), 쓰인 모양별 횟수(forms)·쓰인 문서(docs)·전체 횟수(total)를 센다.
export function buildScopeWordIndex(searchIndex, root) {
  const byScope = new Map()
  const byTop = new Map()
  const add = (map, key, filePath, counts) => {
    let words = map.get(key)
    if (!words) map.set(key, (words = new Map()))
    for (const [lower, forms] of counts) {
      let stat = words.get(lower)
      if (!stat) words.set(lower, (stat = { forms: new Map(), docs: new Set(), total: 0 }))
      stat.docs.add(filePath)
      for (const [form, n] of forms) {
        stat.forms.set(form, (stat.forms.get(form) ?? 0) + n)
        stat.total += n
      }
    }
  }
  for (const [filePath, entry] of Object.entries(searchIndex ?? {})) {
    const sc = scopeOfPath(filePath, root)
    if (!sc) continue
    const counts = new Map() // 소문자 -> Map(모양 -> 횟수)
    for (const word of extractWords(entry?.content)) {
      const lower = word.toLowerCase()
      let forms = counts.get(lower)
      if (!forms) counts.set(lower, (forms = new Map()))
      forms.set(word, (forms.get(word) ?? 0) + 1)
    }
    if (counts.size === 0) continue
    add(byScope, sc.scope, filePath, counts)
    add(byTop, sc.top, filePath, counts)
  }
  return { byScope, byTop }
}

// 가장 많이 쓰인 모양(같으면 사전순 — 대문자 CREATE 가 소문자 create 보다 앞).
function displayForm(forms) {
  let best = null
  let bestCount = -1
  for (const [form, n] of forms) {
    if (n > bestCount || (n === bestCount && form < best)) {
      best = form
      bestCount = n
    }
  }
  return best
}

// 지금 쓰는 문서(currentPath)에 추천할 단어 후보 목록 — 상용구 후보와 같은 모양({ category, title, content, ... })
// 에 word: true, freq(쓰인 횟수)를 더한 것. 상용구 추천 팝업(findSnippetQuery)이 그대로 쓴다.
//   wholeTops    - "전체 문서에서 모으기"를 켠 최상위 폴더 이름 목록
//   excludeLower - 후보에서 뺄 소문자 단어(이미 같은 이름의 상용구가 있을 때)
// 이 문서에서만 나온 단어는 뺀다 — 방금 치고 있는 글자가 후보로 되돌아오는 것을 막으려는 것.
export function wordCandidates(index, { currentPath, root, wholeTops = [], excludeLower = new Set() }) {
  if (!index || !currentPath) return []
  const sc = scopeOfPath(currentPath, root)
  if (!sc) return []
  const whole = wholeTops.includes(sc.top)
  const words = whole ? index.byTop.get(sc.top) : index.byScope.get(sc.scope)
  if (!words) return []
  const here = normalizePath(currentPath)
  const label = whole ? sc.top : sc.scope
  const out = []
  for (const [lower, stat] of words) {
    if (excludeLower.has(lower)) continue
    if (stat.docs.size === 1 && normalizePath([...stat.docs][0]) === here) continue
    const form = displayForm(stat.forms)
    out.push({ category: `단어(${label})`, title: form, content: form, path: null, word: true, freq: stat.total })
  }
  return out
}

// 최상위 폴더(name)의 "전체 문서에서 모으기" 체크를 켜거나 끈 새 목록(원래 목록은 바꾸지 않는다).
export function withWholeTop(wholeTops, name, whole) {
  const rest = wholeTops.filter((n) => n !== name)
  return whole ? [...rest, name] : rest
}
