// Copyright (c) dendr000. MIT License.

// 폴더별 "자동 분류". 폴더(예: 따즈아)의 우클릭 메뉴에서 "읽어들일 글자"(DBMS, 외래키 …)를 정해 두면, 그
// 폴더 아래에서 새 문서를 만들 때 그 아래 폴더 이름과 문서 이름에서 그 글자를 찾아 [[분류:글자]] 로 자동으로
// 넣는다. 예) 글자 DBMS·외래키, 폴더 '01 올인원 DBMS!! 설계부터 운영까지!!', 문서 '04 외래키와 Join'
//   → [[분류:DBMS]] [[분류:외래키]].
// 항목을 `글자>분류이름`(예: 외래키>DBMS/외래키)으로 적으면 글자를 찾았을 때 분류는 그 분류 이름으로 넣는다.
// 작품 폴더(소설·웹툰·만화)의 구조 기반 자동 분류(store/useAppStore.js 의 findWorkFolderContext)와는 별개다.

// 설정은 그 폴더 안의 숨김 파일 하나에 저장한다 — 폴더를 옮기거나 이름을 바꿔도 설정이 같이 따라가도록.
// (electron/fileSystem.js 의 AUTO_CATEGORY_FILE_NAME 과 같은 이름이어야 하며 시험이 확인한다.)
export const AUTO_CATEGORY_FILE = '.wikidesk-auto-category.json'

// 목록의 항목 하나를 해석한다. 두 가지 모양이다:
//   `글자`          — 이름에서 글자를 찾으면 분류도 그 글자 그대로(예전 방식).
//   `글자>분류이름` — 이름에서 글자를 찾으면 분류는 다른 이름으로 넣는다. 예) `보안>DBMS/보안` 은 이름에 "보안"이
//                    있으면 [[분류:DBMS/보안]]. 분야/주제처럼 계층 이름을 쓰려고 만든 것이다.
// 첫 `>` 만 나누는 표시로 본다. 양옆 공백은 지우고 글자 안의 공백(부속 질의)은 둔다. 분류 이름이 비면(`보안>`) 글자를
// 그대로 쓴다. 찾을 글자가 비면(`>분류`, 빈 글) 쓸 수 없는 항목이라 null.
export function parseKeywordEntry(entry) {
  const text = String(entry ?? '')
  const at = text.indexOf('>')
  if (at === -1) {
    const term = text.trim()
    return term ? { term, category: term } : null
  }
  const term = text.slice(0, at).trim()
  if (!term) return null
  return { term, category: text.slice(at + 1).trim() || term }
}

// 입력칸의 글을 읽어들일 글자 목록으로. 쉼표(, ， 、)·세미콜론·줄바꿈으로 나누고, 항목마다 parseKeywordEntry 로
// 해석해서 쓸 수 없는 항목과 똑같은 항목(중복)은 버린다. `글자 > 분류` 는 저장 모양 `글자>분류` 로 정리한다. 같은 글자가
// 다른 분류를 가리키는 항목(보안>A, 보안>B)은 둘 다 둔다.
export function parseKeywordInput(text) {
  const keywords = []
  for (const piece of (text ?? '').split(/[,，、;\n\r]+/)) {
    const parsed = parseKeywordEntry(piece)
    if (!parsed) continue
    // 분류 이름이 글자와 같으면(`보안>`, `DBMS>DBMS` 포함) 글자만 남기고, 다르면 `글자>분류` 로 정리한다.
    const keyword = parsed.category === parsed.term ? parsed.term : `${parsed.term}>${parsed.category}`
    if (!keywords.includes(keyword)) keywords.push(keyword)
  }
  return keywords
}

// 목록을 입력칸에 보여 줄 글로(parseKeywordInput 의 반대): 한 줄에 하나씩. 항목이 많거나 `글자>분류` 항목이 있을 때
// 여러 줄 입력칸에서 고치기 쉽다.
export function formatKeywordLines(keywords) {
  return (keywords ?? []).join('\n')
}

function normalizePath(p) {
  return p.replace(/\\/g, '/').replace(/\/+$/, '')
}

// 설정이 있는 폴더(configFolderPath) 아래에서 문서가 놓일 폴더(dirPath)까지의 폴더 이름들(위 → 아래).
// 설정 폴더 자신의 이름은 읽지 않는다(따즈아 폴더에서 "따즈아"를 찾는 게 아니므로). 문서가 설정 폴더 자신에
// 놓이면 빈 목록. 하위가 아니면(이름 앞부분만 같은 다른 폴더 등) 빈 목록.
export function relativeSegments(configFolderPath, dirPath) {
  const base = normalizePath(configFolderPath)
  const dir = normalizePath(dirPath)
  if (dir === base || !dir.startsWith(`${base}/`)) return []
  return dir.slice(base.length + 1).split('/')
}

// 이름들(폴더 이름들 + 문서 이름, 이 순서) 중에서 읽어들일 글자가 들어 있는 것을 찾아 **넣을 분류 이름들**을 돌려준다.
// 대소문자를 가리지 않는 부분 일치(글자는 정규식이 아니라 그냥 글자). 순서는 이름의 순서이고 한 이름 안에서는 목록의
// 순서이며, 같은 분류는 한 번만. 글자만 적은 항목은 목록에 적은 글자 그대로, `글자>분류이름` 항목은 분류 이름을 쓴다
// (parseKeywordEntry). 쓸 수 없는 항목(`>분류`)은 무시한다.
export function matchKeywords(keywords, names) {
  const entries = keywords.map(parseKeywordEntry).filter(Boolean)
  const found = []
  for (const name of names) {
    const lowerName = name.toLowerCase()
    for (const { term, category } of entries) {
      if (lowerName.includes(term.toLowerCase()) && !found.includes(category)) found.push(category)
    }
  }
  return found
}

const CATEGORY_LINE_RE = /^\s*\[\[분류:[^\]]*\]\]\s*$/

// 문서 내용의 비어 있는 [[분류:]] 칸을 위에서부터 차례로 categories 로 채운다. 이미 같은 분류가 적혀 있으면
// (예: 기본 내용의 ddazua) 다시 넣지 않는다. 빈 칸이 모자라면 맨 위 분류 줄 묶음 바로 뒤에 새 줄로 넣고,
// 분류 줄이 아예 없는 내용(글양식)은 맨 끝에 붙인다. 빈 칸이 남으면 그대로 둔다(직접 채우라는 자리).
export function fillCategoryTags(content, categories) {
  const present = new Set([...content.matchAll(/\[\[분류:([^\]|]+)/g)].map((m) => m[1].trim()))
  const toAdd = categories.filter((category) => !present.has(category))
  if (toAdd.length === 0) return content

  let out = content
  const leftover = []
  for (const category of toAdd) {
    if (out.includes('[[분류:]]')) out = out.replace('[[분류:]]', () => `[[분류:${category}]]`)
    else leftover.push(category)
  }
  if (leftover.length === 0) return out

  const extra = leftover.map((category) => `[[분류:${category}]]`)
  const lines = out.split('\n')
  const first = lines.findIndex((line) => CATEGORY_LINE_RE.test(line))
  if (first === -1) return `${out.replace(/\s+$/, '')}\n\n${extra.join('\n')}\n`
  let last = first
  while (last + 1 < lines.length && CATEGORY_LINE_RE.test(lines[last + 1])) last += 1
  lines.splice(last + 1, 0, ...extra)
  return lines.join('\n')
}
