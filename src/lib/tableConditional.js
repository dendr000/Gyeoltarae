// Copyright (c) dendr000. MIT License.

// 표 편집기 조건부 색 — "0보다 작으면 빨강" 같은 규칙에 맞는 칸을 찾아 배경색·글자색·굵게를 한꺼번에 입힌다. 입힌 색은 칸의 서식으로 문서에
// 남고, 값이 바뀌어도 자동으로 다시 칠해지지는 않는다(한 번 적용하는 도구). 화면과 분리한 순수 함수라서 시험할 수 있다.
// 규칙: { kind, a, b } — a, b 는 입력칸의 글자(숫자는 합계와 같은 읽기 규칙, 쉼표·통화 기호·단위 허용).
//
//   gt / gte / lt / lte / eq / neq   숫자 비교 — 숫자 칸끼리만 비교한다(글자·빈 칸은 해당 없음)
//   between                          a 와 b 사이(양 끝 포함, 순서 무관)
//   contains                         글자 포함(대소문자 구분 없음)
//   empty / notEmpty                 비어 있음(공백만 있는 칸도) / 비어 있지 않음
//   max / min                        범위 안 숫자의 최댓값 / 최솟값(같은 값이 여럿이면 모두)
//   duplicate                        중복된 값(앞뒤 공백·대소문자 무시, 빈 칸 제외)

import { parseCellNumber } from './tableStats.js'

// 입력칸이 몇 개 필요한지(UI 가 입력칸을 보여 줄 때 쓴다).
export const RULE_KINDS = [
  { kind: 'gt', inputs: 1 },
  { kind: 'gte', inputs: 1 },
  { kind: 'lt', inputs: 1 },
  { kind: 'lte', inputs: 1 },
  { kind: 'eq', inputs: 1 },
  { kind: 'neq', inputs: 1 },
  { kind: 'between', inputs: 2 },
  { kind: 'contains', inputs: 1 },
  { kind: 'empty', inputs: 0 },
  { kind: 'notEmpty', inputs: 0 },
  { kind: 'max', inputs: 0 },
  { kind: 'min', inputs: 0 },
  { kind: 'duplicate', inputs: 0 },
]

const NUMERIC_COMPARE = {
  gt: (value, a) => value > a,
  gte: (value, a) => value >= a,
  lt: (value, a) => value < a,
  lte: (value, a) => value <= a,
  eq: (value, a) => value === a,
  neq: (value, a) => value !== a,
}

// 규칙에 입력이 충분한가(숫자 비교는 숫자 기준 값, 글자 포함은 글자). 모르는 규칙이면 false.
export function isRuleReady(rule) {
  const spec = RULE_KINDS.find((entry) => entry.kind === rule.kind)
  if (!spec) return false
  if (rule.kind === 'contains') return typeof rule.a === 'string' && rule.a.trim() !== ''
  if (rule.kind === 'between') return parseCellNumber(rule.a) !== null && parseCellNumber(rule.b) !== null
  if (spec.inputs === 1) return parseCellNumber(rule.a) !== null
  return true
}

function inScope(r, c, scope) {
  return !scope || (r >= scope.r1 && r <= scope.r2 && c >= scope.c1 && c <= scope.c2)
}

// 규칙에 맞는 칸들 [{ r, c }](위→아래, 왼쪽→오른쪽 순서). scope({ r1, r2, c1, c2 })가 null 이면 표 전체, skipFirstRow 가 켜지면 맨 윗줄(헤더)은 뺀다.
// 병합에 가려진 칸은 건너뛴다. 입력이 모자라면 빈 배열.
export function matchRule(grid, rule, scope, { skipFirstRow = false } = {}) {
  if (!isRuleReady(rule)) return []

  const candidates = []
  for (let r = skipFirstRow ? 1 : 0; r < grid.length; r += 1) {
    for (let c = 0; c < grid[r].length; c += 1) {
      const cell = grid[r][c]
      if (!cell || cell.mergedInto || !inScope(r, c, scope)) continue
      const text = typeof cell.text === 'string' ? cell.text : ''
      candidates.push({ r, c, text, value: parseCellNumber(text) })
    }
  }

  let matched
  if (NUMERIC_COMPARE[rule.kind]) {
    const a = parseCellNumber(rule.a)
    matched = candidates.filter((cell) => cell.value !== null && NUMERIC_COMPARE[rule.kind](cell.value, a))
  } else if (rule.kind === 'between') {
    const low = Math.min(parseCellNumber(rule.a), parseCellNumber(rule.b))
    const high = Math.max(parseCellNumber(rule.a), parseCellNumber(rule.b))
    matched = candidates.filter((cell) => cell.value !== null && cell.value >= low && cell.value <= high)
  } else if (rule.kind === 'contains') {
    const needle = rule.a.toLowerCase()
    matched = candidates.filter((cell) => cell.text.toLowerCase().includes(needle))
  } else if (rule.kind === 'empty') {
    matched = candidates.filter((cell) => cell.text.trim() === '')
  } else if (rule.kind === 'notEmpty') {
    matched = candidates.filter((cell) => cell.text.trim() !== '')
  } else if (rule.kind === 'max' || rule.kind === 'min') {
    const numbers = candidates.filter((cell) => cell.value !== null).map((cell) => cell.value)
    if (numbers.length === 0) return []
    const extreme = rule.kind === 'max' ? Math.max(...numbers) : Math.min(...numbers)
    matched = candidates.filter((cell) => cell.value === extreme)
  } else if (rule.kind === 'duplicate') {
    const keyOf = (cell) => cell.text.trim().toLowerCase()
    const counts = new Map()
    for (const cell of candidates) if (keyOf(cell) !== '') counts.set(keyOf(cell), (counts.get(keyOf(cell)) ?? 0) + 1)
    matched = candidates.filter((cell) => keyOf(cell) !== '' && counts.get(keyOf(cell)) >= 2)
  } else {
    matched = []
  }
  return matched.map(({ r, c }) => ({ r, c }))
}

function mapCells(grid, cells, change) {
  if (cells.length === 0) return grid
  const targets = new Set(cells.map(({ r, c }) => `${r}:${c}`))
  return grid.map((row, r) => row.map((cell, c) => (targets.has(`${r}:${c}`) ? change(cell) : cell)))
}

// cells 의 칸에 서식을 입힌 새 격자. style = { bg, color, bold } — 값이 없는(undefined·null) 항목과 bold 가 true 가 아닌 것은 건드리지 않는다.
// 칸이 없으면 받은 격자를 그대로 돌려준다.
export function applyRuleStyle(grid, cells, style) {
  return mapCells(grid, cells, (cell) => ({
    ...cell,
    ...(style.bg != null ? { bg: style.bg } : {}),
    ...(style.color != null ? { color: style.color } : {}),
    ...(style.bold === true ? { bold: true } : {}),
  }))
}

// cells 의 칸의 배경색·글자색·굵게를 지운 새 격자.
export function clearRuleStyle(grid, cells) {
  return mapCells(grid, cells, (cell) => ({ ...cell, bg: '', color: '', bold: false }))
}

// ---- 여러 조건 ---------------------------------------------------------------------------------------------------------
// 규칙 목록(각각 { kind, a, b, bg, color, bold })을 위에서부터 차례로 적용한다. 맞는 칸은 모두 처음 표의 글자로 판단하고(색을 입혀도 글자는
// 그대로이므로 순서와 상관없다), 같은 칸에 여러 규칙이 맞으면 뒤의 규칙이 같은 항목(배경색·글자색)을 덮어쓴다. 입력이 모자라거나 칠할 것이 없는
// 규칙은 건너뛴다.

function hasStyle(rule) {
  return Boolean(rule.bg) || Boolean(rule.color) || rule.bold === true
}

// 규칙마다 맞는 칸 perRule 과, 합친(중복 없는, 위→아래·왼쪽→오른쪽 순서) 칸 union 을 돌려준다. 칠할 것이 없는 규칙도 맞는 칸은 센다(미리 보기용).
export function matchRuleSet(grid, rules, scope, options = {}) {
  const perRule = rules.map((rule) => matchRule(grid, rule, scope, options))
  const seen = new Set()
  const union = []
  for (const cells of perRule) {
    for (const cell of cells) {
      const key = `${cell.r}:${cell.c}`
      if (!seen.has(key)) {
        seen.add(key)
        union.push(cell)
      }
    }
  }
  union.sort((a, b) => a.r - b.r || a.c - b.c)
  return { perRule, union }
}

// 규칙들을 적용한 { grid, applied }. applied 는 실제로 적용된(입력이 충분하고 칠할 것이 있고 맞는 칸이 있는) 규칙 수다. 적용한 것이 없으면 같은 격자.
export function applyRuleSet(grid, rules, scope, options = {}) {
  const { perRule } = matchRuleSet(grid, rules, scope, options)
  let next = grid
  let applied = 0
  rules.forEach((rule, i) => {
    if (!hasStyle(rule) || perRule[i].length === 0) return
    next = applyRuleStyle(next, perRule[i], { bg: rule.bg || null, color: rule.color || null, bold: rule.bold })
    applied += 1
  })
  return { grid: next, applied }
}

// 모든 규칙에 맞는 칸(합친 것)의 배경색·글자색·굵게를 지운 { grid, cleared }. cleared 는 지운 칸 수. 맞는 칸이 없으면 같은 격자.
export function clearRuleSet(grid, rules, scope, options = {}) {
  const { union } = matchRuleSet(grid, rules, scope, options)
  return { grid: clearRuleStyle(grid, union), cleared: union.length }
}
