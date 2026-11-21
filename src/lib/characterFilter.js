// Copyright (c) dendr000. MIT License.

// 인물 표의 걸러 보기·정렬·집계·위키 표 변환. 화면과 무관한 순수 함수(tests/lib/characterFilter.test.js).
// 입력 characters 는 lib/characterTable.js 의 parseCharacters 결과다.

const VALUE_SPLIT_RE = /[,、/·]/

// 속성 값 "복사, 마약" 을 칩 하나씩("복사", "마약")으로 나눈다. 빈 조각은 버린다.
export function splitAttrValue(value) {
  return String(value ?? '')
    .split(VALUE_SPLIT_RE)
    .map((v) => v.trim())
    .filter((v) => v !== '')
}

// 속성 key 의 값별 인물 수. 많은 순(같으면 가나다 순).
export function attrValueCounts(characters, key) {
  const counts = new Map()
  for (const c of characters) {
    const seen = new Set(splitAttrValue(c.attrs[key]))
    for (const v of seen) counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  return [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'ko'))
}

function toNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

// 걸러 보기. filters: { query: 글자 검색(이름·속성 값·비고·소속), attrs: { 키: 고른 값들의 배열 } (같은 키 안에서는 하나라도 맞으면 통과, 키끼리는 모두
// 맞아야 통과), episodeFrom/episodeTo: 이 범위 안에 등장하는 회차가 하나라도 있는 인물 (한쪽만 있어도 됨) }.
export function filterCharacters(characters, filters = {}) {
  const query = String(filters.query ?? '').trim().toLowerCase()
  const attrFilters = Object.entries(filters.attrs ?? {}).filter(([, values]) => values && values.length > 0)
  const from = toNumber(filters.episodeFrom)
  const to = toNumber(filters.episodeTo)
  const lo = from !== null && to !== null && from > to ? to : from
  const hi = from !== null && to !== null && from > to ? from : to
  return characters.filter((c) => {
    if (query !== '') {
      const haystack = [c.name, c.group, c.note, ...Object.values(c.attrs)].join('\n').toLowerCase()
      if (!haystack.includes(query)) return false
    }
    for (const [key, values] of attrFilters) {
      const have = splitAttrValue(c.attrs[key])
      if (!values.some((v) => have.includes(v))) return false
    }
    if (lo !== null || hi !== null) {
      if (!c.episodes.some((e) => (lo === null || e.no >= lo) && (hi === null || e.no <= hi))) return false
    }
    return true
  })
}

// 정렬 기준의 값: 이름·소속·속성은 글, 회차 관련은 숫자. 값이 없으면 null.
function sortValue(c, key) {
  switch (key) {
    case 'name':
      return c.name
    case 'group':
      return c.group === '' ? null : c.group
    case 'first':
      return c.firstEpisode
    case 'last':
      return c.lastEpisode
    case 'count':
      return c.episodeCount
    case 'order':
      return c.id
    default:
      return c.attrs[key] ?? null
  }
}

// 정렬한 새 배열을 돌려준다(원본은 그대로). 값이 없는 인물은 오름·내림 모두 맨 뒤. 같은 값이면 문서에 적힌 순서를 지킨다.
export function sortCharacters(characters, key, direction = 'asc') {
  const sign = direction === 'desc' ? -1 : 1
  return [...characters].sort((a, b) => {
    const va = sortValue(a, key)
    const vb = sortValue(b, key)
    if (va === null && vb === null) return a.id - b.id
    if (va === null) return 1
    if (vb === null) return -1
    const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'ko', { numeric: true })
    return cmp * sign || a.id - b.id
  })
}

// 위키 표(||) 글자로 바꾼다 — 거른 결과를 다른 문서에 붙여 넣을 때 쓴다. 칸 안의 | 와 줄바꿈은 위키 표를 깨므로 바꾼다.
// columns: 속성 키들. 맨 앞 열은 이름, 그 뒤 소속(있을 때만), 속성들, 첫·마지막 회차.
export function toWikiTable(characters, columns) {
  const cell = (value) => String(value ?? '').replace(/\|/g, '/').replace(/\s*\n\s*/g, ' ').trim()
  const withGroup = characters.some((c) => c.group !== '')
  const header = ['이름', ...(withGroup ? ['소속'] : []), ...columns, '첫 회차', '마지막 회차']
  const row = (cells) => `||${cells.map((v) => cell(v)).join('||')}||`
  const lines = [`||${header.map((h) => `=${cell(h)}=`).join('||')}||`]
  for (const c of characters) {
    lines.push(row([c.name, ...(withGroup ? [c.group] : []), ...columns.map((k) => c.attrs[k] ?? ''), c.firstEpisode ?? '', c.lastEpisode ?? '']))
  }
  return lines.join('\n')
}
