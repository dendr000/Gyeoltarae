// Copyright (c) dendr000. MIT License.

// 표 편집기 숫자 서식 — 천 단위 쉼표, 소수 자릿수, 통화 기호, 뒤 글자(%, 원 등)를 칸의 글자에 직접 적용한다. 문서에는 서식이 아니라
// 바뀐 글자(`1,234,567`, `₩1,500원`)가 남는다. 화면과 분리한 순수 함수라서 시험할 수 있다. 받은 격자는 바꾸지 않는다.
//
// 숫자인지·부분으로 나누는 것은 tableStats.js 의 parseCellNumberParts 와 같은 규칙이다(쉼표, 통화 기호, 뒤 단위 3글자까지).
// 옵션: { grouping: 'keep' | 'add' | 'remove', decimals: null(그대로) | 0..6, currency: 'keep' | 'none' | 기호, suffix: 'keep' | 'none' | 글자 }

import { parseCellNumberParts } from './tableStats.js'

// 5 에서 올림(양수). 1.005.toFixed(2) 가 "1.00" 이 되는 이진 소수 오차를 피하려고 지수 표기로 자리를 옮겨 반올림한다.
function roundHalfUp(value, decimals) {
  const rounded = Math.round(Number(`${value}e${decimals}`))
  const shifted = Number(`${rounded}e-${decimals}`)
  return Number.isFinite(shifted) ? shifted : Number(value.toFixed(decimals))
}

function addGrouping(integerDigits) {
  return integerDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function isNoop(options) {
  return options.grouping === 'keep' && options.decimals == null && options.currency === 'keep' && options.suffix === 'keep'
}

// 칸의 글자 하나에 서식을 적용한 새 글자. 바꾸지 않는 경우는 null — 숫자 칸이 아님, 앞에 0 이 붙은 코드 번호(007), 옵션이 모두 "그대로".
export function formatNumberText(text, options) {
  if (isNoop(options)) return null
  const parts = parseCellNumberParts(text)
  if (parts === null || parts.padded) return null

  const decimals = options.decimals ?? parts.decimals
  const magnitude = roundHalfUp(Math.abs(parts.value), decimals)
  const [integerDigits, fraction] = magnitude.toFixed(decimals).split('.')
  const grouped = options.grouping === 'add' || (options.grouping === 'keep' && parts.grouped)
  const currency = options.currency === 'keep' ? parts.currency : options.currency === 'none' ? '' : options.currency
  const suffix = options.suffix === 'keep' ? parts.suffix : options.suffix === 'none' ? '' : options.suffix
  const negative = parts.value < 0 && magnitude !== 0

  return `${negative ? '-' : ''}${currency}${grouped ? addGrouping(integerDigits) : integerDigits}${fraction === undefined ? '' : `.${fraction}`}${suffix}`
}

// scope({ r1, r2, c1, c2 }, 끝 포함) 안(null 이면 표 전체)의 숫자 칸에 서식을 적용한 { grid, count }. count 는 실제로 글자가 바뀐 칸 수다.
// 병합에 가려진 칸은 건너뛴다. options 와 별개로 skipFirstRow 가 켜지면 맨 윗줄(헤더의 2024 같은 숫자)은 건드리지 않는다.
// 바꿀 것이 없으면 받은 격자를 그대로 돌려준다.
export function formatNumbersInRange(grid, scope, options, { skipFirstRow = false } = {}) {
  let count = 0
  const next = grid.map((row, r) =>
    row.map((cell, c) => {
      if (!cell || cell.mergedInto || typeof cell.text !== 'string') return cell
      if (skipFirstRow && r === 0) return cell
      if (scope && !(r >= scope.r1 && r <= scope.r2 && c >= scope.c1 && c <= scope.c2)) return cell
      const formatted = formatNumberText(cell.text, options)
      if (formatted === null || formatted === cell.text) return cell
      count += 1
      return { ...cell, text: formatted }
    }),
  )
  return count === 0 ? { grid, count: 0 } : { grid: next, count }
}
