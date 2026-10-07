// Copyright (c) dendr000. MIT License.

// 폴더별 "자동 분류". 폴더(예: 따즈아)의 우클릭 메뉴에서 "읽어들일 글자"(DBMS, 외래키 …)를 정해 두면, 그
// 폴더 아래에서 새 문서를 만들 때 그 아래 폴더 이름과 문서 이름에서 그 글자를 찾아 [[분류:글자]] 로 자동으로
// 넣는다. 예) 글자 DBMS·외래키, 폴더 '01 올인원 DBMS!! 설계부터 운영까지!!', 문서 '04 외래키와 Join'
//   → [[분류:DBMS]] [[분류:외래키]].
// 작품 폴더(소설·웹툰·만화)의 구조 기반 자동 분류(store/useAppStore.js 의 findWorkFolderContext)와는 별개다.

// 설정은 그 폴더 안의 숨김 파일 하나에 저장한다 — 폴더를 옮기거나 이름을 바꿔도 설정이 같이 따라가도록.
// (electron/fileSystem.js 의 AUTO_CATEGORY_FILE_NAME 과 같은 이름이어야 하며 시험이 확인한다.)
export const AUTO_CATEGORY_FILE = '.wikidesk-auto-category.json'

// 입력칸의 글을 읽어들일 글자 목록으로. 쉼표(, ， 、)·세미콜론·줄바꿈으로 나누고 앞뒤 공백을 지우며 빈 항목과
// 같은 글자(중복)는 버린다. 글자 안의 공백(Group by)은 그대로 둔다.
export function parseKeywordInput(text) {
  const keywords = []
  for (const piece of (text ?? '').split(/[,，、;\n\r]+/)) {
    const keyword = piece.trim()
    if (keyword && !keywords.includes(keyword)) keywords.push(keyword)
  }
  return keywords
}

// 목록을 입력칸에 보여 줄 글로(parseKeywordInput 의 반대).
export function formatKeywordInput(keywords) {
  return (keywords ?? []).join(', ')
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

// 이름들(폴더 이름들 + 문서 이름, 이 순서) 중에서 읽어들일 글자가 들어 있는 것을 찾는다. 대소문자를
// 가리지 않는 부분 일치(글자는 정규식이 아니라 그냥 글자). 순서는 이름의 순서이고 한 이름 안에서는 목록의
// 순서이며, 같은 글자는 한 번만. 분류에는 목록에 적은 글자 그대로 쓴다.
export function matchKeywords(keywords, names) {
  const found = []
  for (const name of names) {
    const lowerName = name.toLowerCase()
    for (const keyword of keywords) {
      if (lowerName.includes(keyword.toLowerCase()) && !found.includes(keyword)) found.push(keyword)
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
