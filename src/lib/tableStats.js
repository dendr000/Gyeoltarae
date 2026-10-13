// Copyright (c) dendr000. MIT License.

// 표 편집기 상태 표시줄 — 고른 칸의 합계·평균·개수·최소·최대. 화면과 분리한 순수 함수라서 시험할 수 있다.
// grid 는 편집기의 2차원 셀 배열({ text, mergedInto, colspan, rowspan, ... }). 계산 결과는 화면에만 보이고 문서에는 쓰지 않는다.

// 숫자 모양: 천 단위 쉼표(1,234)는 3자리씩 맞을 때만 인정하고, 소수는 .5 처럼 앞이 비어도 된다.
const NUMBER = String.raw`(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+`
// 앞에는 부호와 통화 기호만, 뒤에는 % 나 짧은 단위(최대 3글자, 숫자·구분 기호 제외)만 허용한다.
// 그 밖의 글이 섞이면 숫자 칸이 아니다 — "서울 3호선", "2024-01-05", "010-1234-5678", "10:30" 이 숫자로 읽히면 합계가 엉뚱해진다.
const CELL_NUMBER = new RegExp(String.raw`^([+-]?)\s*([₩$€¥£]?)\s*([+-]?)\s*(${NUMBER})\s*((?:[%A-Za-z가-힣㎏㎖㎡㎝㎜㎞℃℉°]{1,3})?)$`)

// 칸의 글에서 숫자를 읽어 부분으로 나눈다: { value(부호 포함), currency(통화 기호), suffix(뒤 단위), decimals(소수 자릿수), grouped(천 단위 쉼표가
// 있는가), padded(007 처럼 앞에 0 이 붙은 정수인가) }. 숫자 칸이 아니면 null. 숫자 서식(tableNumberFormat.js)이 원래 모양을 알아야 해서 쓴다.
export function parseCellNumberParts(text) {
  if (typeof text !== 'string') return null
  // 셀 안 줄바꿈 [br] 은 공백으로 보고, 유니코드 마이너스는 일반 마이너스로 바꾼다.
  const cleaned = text.replace(/\[br\]/gi, ' ').replace(/−/g, '-').trim()
  const match = CELL_NUMBER.exec(cleaned)
  if (!match) return null
  const [, signBefore, currency, signAfter, digits, suffix] = match
  if (signBefore && signAfter) return null // "--3", "+-3"
  const magnitude = Number(digits.replace(/,/g, ''))
  if (!Number.isFinite(magnitude)) return null
  const [integerDigits, fractionDigits = ''] = digits.replace(/,/g, '').split('.')
  return {
    value: signBefore === '-' || signAfter === '-' ? -magnitude : magnitude,
    currency,
    suffix,
    decimals: fractionDigits.length,
    grouped: digits.includes(','),
    padded: integerDigits.length > 1 && integerDigits.startsWith('0'),
  }
}

// 칸의 글에서 숫자 값을 읽는다. 숫자 칸이 아니면 null.
export function parseCellNumber(text) {
  const parts = parseCellNumberParts(text)
  return parts === null ? null : parts.value
}

// 0.1 + 0.2 = 0.30000000000000004 같은 이진 소수 오차를 15자리 유효숫자로 걷어낸다.
function tidy(value) {
  const rounded = Number(value.toPrecision(15))
  return rounded === 0 ? 0 : rounded
}

// 고른 범위({ r1, r2, c1, c2 }, 끝 포함)의 집계.
// - 다른 칸의 병합에 가려진 칸(mergedInto)은 세지 않는다. 병합한 칸은 한 번만 센다.
// - options.skipFirstRow: 첫 행을 헤더로 쓰는 표에서 맨 윗줄(예: 연도 "2024")이 합계에 섞이지 않게 뺀다.
// 돌려주는 값: selected(센 칸 수) · filled(그중 글이 있는 칸) · count(숫자로 읽은 칸) · sum · avg/min/max(숫자가 없으면 null)
//   · skippedHeader(맨 윗줄을 뺐는지)
export function rangeStats(grid, range, options = {}) {
  const skipFirstRow = options.skipFirstRow === true
  const skippedHeader = skipFirstRow && range.r1 <= 0 && range.r2 >= 0
  const rowStart = Math.max(skippedHeader ? 1 : 0, range.r1)
  const rowEnd = Math.min(grid.length - 1, range.r2)

  let selected = 0
  let filled = 0
  let count = 0
  let sum = 0
  let min = null
  let max = null
  for (let r = rowStart; r <= rowEnd; r += 1) {
    const row = grid[r] ?? []
    const colEnd = Math.min(row.length - 1, range.c2)
    for (let c = Math.max(0, range.c1); c <= colEnd; c += 1) {
      const cell = row[c]
      if (!cell || cell.mergedInto) continue
      selected += 1
      if (typeof cell.text === 'string' && cell.text.trim() !== '') filled += 1
      const value = parseCellNumber(cell.text)
      if (value === null) continue
      count += 1
      sum += value
      if (min === null || value < min) min = value
      if (max === null || value > max) max = value
    }
  }
  return {
    selected,
    filled,
    count,
    sum: tidy(sum),
    avg: count === 0 ? null : tidy(sum / count),
    min,
    max,
    skippedHeader,
  }
}

// 상태 표시줄에 보일 글자. 소수는 6자리까지(뒤의 0 은 생략), 기본은 천 단위 쉼표, grouping:false 면 복사용(쉼표 없음).
export function formatStat(value, { grouping = true } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return ''
  return tidy(value).toLocaleString('ko-KR', { maximumFractionDigits: 6, useGrouping: grouping })
}

// 0 -> A, 25 -> Z, 26 -> AA (엑셀의 열 이름).
export function columnLabel(index) {
  let name = ''
  let n = index + 1
  while (n > 0) {
    const remainder = (n - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    n = Math.floor((n - 1) / 26)
  }
  return name
}

// 한 칸은 B2, 여러 칸은 B2:D5.
export function rangeLabel({ r1, r2, c1, c2 }) {
  const start = `${columnLabel(c1)}${r1 + 1}`
  return r1 === r2 && c1 === c2 ? start : `${start}:${columnLabel(c2)}${r2 + 1}`
}
