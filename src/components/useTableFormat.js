// Copyright (c) dendr000. MIT License.

// 표 편집기 "서식" 패널 네 가지(숫자 서식, 조건부 색, 열 너비, 줄무늬 행)의 상태와 동작. 계산 규칙은 lib/tableNumberFormat.js ·
// tableConditional.js · tableStyle.js 에 있고, 여기서는 입력칸 값을 모아 그 함수들을 부르고 결과를 격자에 반영하며 안내 글(message)을 만든다.
//
// 적용 범위: 여러 칸을 골라 두었으면 그 범위, 한 칸만 골랐으면 표 전체이고, 첫 행을 헤더로 쓰는 표는 맨 윗줄을 뺀다(헤더의 2024 같은 숫자를
// 서식으로 바꾸거나 헤더를 칠하지 않게). 열 너비는 고른 범위가 걸친 열에 적용한다.
import { useState } from 'react'
import { applyRuleSet, clearRuleSet, isRuleReady, matchRuleSet } from '../lib/tableConditional.js'
import { formatNumbersInRange } from '../lib/tableNumberFormat.js'
import { columnLabel } from '../lib/tableStats.js'
import {
  clearStripes,
  getColumnWidth,
  getRowHeight,
  normalizeHeight,
  normalizeWidth,
  setColumnWidth,
  setRowHeight,
  stripeRows,
} from '../lib/tableStyle.js'

// ctx: { grid, setGrid, range, isMultiCell, headerRow }
export function useTableFormat({ grid, setGrid, range, isMultiCell, headerRow }) {
  const [panel, setPanel] = useState(null) // 'number' | 'conditional' | 'width' | 'stripe' | null
  const [number, setNumber] = useState({ grouping: 'add', decimals: 'keep', currency: 'keep', suffix: 'keep' })
  // 조건부 색의 규칙 목록. 각 규칙은 { id, kind, a, b, bg, color, bold }. bg·color 가 빈 글자면 그 항목은 칠하지 않는다.
  const [rules, setRules] = useState([{ id: 1, kind: 'lt', a: '0', b: '', bg: '#ffd6d6', color: '', bold: false }])
  const [nextRuleId, setNextRuleId] = useState(2)
  const [widthForm, setWidthForm] = useState({ value: '', unit: 'px' })
  const [heightValue, setHeightValue] = useState('')
  const [stripe, setStripe] = useState({ color: '#e8eaf2', start: 'second' })
  const [message, setMessage] = useState('')

  const rowCount = grid.length
  const colCount = grid[0]?.length ?? 0
  const scope = isMultiCell ? { r1: range.r1, r2: range.r2, c1: range.c1, c2: range.c2 } : null
  const scopeLabel = isMultiCell ? '고른 범위' : '표 전체'
  const rowsLabel = range.r1 === range.r2 ? `${range.r1 + 1}행` : `${range.r1 + 1}~${range.r2 + 1}행`

  // 줄무늬는 헤더 행을 뺀 범위. 한 칸만 골랐으면 표 전체의 모든 열.
  function bodyScope() {
    const base = isMultiCell ? range : { r1: 0, r2: rowCount - 1, c1: 0, c2: colCount - 1 }
    return { r1: headerRow && base.r1 === 0 ? 1 : base.r1, r2: base.r2, c1: base.c1, c2: base.c2 }
  }

  // 조건부 색 미리 보기: 모든 규칙에 맞는 칸의 합. 규칙마다 맞는 칸 수도 보여 준다.
  const ruleMatches = panel === 'conditional' ? matchRuleSet(grid, rules, scope, { skipFirstRow: headerRow }) : { perRule: [], union: [] }
  const previewCells = new Set(ruleMatches.union.map(({ r, c }) => `${r}:${c}`))
  const currentWidth = panel === 'width' ? getColumnWidth(grid, range.c1) : null
  const currentHeight = panel === 'height' ? getRowHeight(grid, range.r1) : null

  function togglePanel(name) {
    setMessage('')
    setPanel((current) => (current === name ? null : name))
  }

  function applyNumberFormat() {
    const options = {
      grouping: number.grouping,
      decimals: number.decimals === 'keep' ? null : Number(number.decimals),
      currency: number.currency,
      suffix: number.suffix,
    }
    const { grid: next, count } = formatNumbersInRange(grid, scope, options, { skipFirstRow: headerRow })
    if (count === 0) {
      setMessage('바꿀 숫자 칸이 없습니다 (이미 그 서식이거나, 옵션이 모두 "그대로"이거나, 숫자 칸이 없음)')
      return
    }
    setGrid(next)
    setMessage(`${count}칸의 숫자 서식을 바꿨습니다`)
  }

  const MAX_RULES = 6

  function addRule() {
    if (rules.length >= MAX_RULES) return
    setRules((list) => [...list, { id: nextRuleId, kind: 'gt', a: '', b: '', bg: '#d6f5d6', color: '', bold: false }])
    setNextRuleId((id) => id + 1)
    setMessage('')
  }

  function updateRule(id, patch) {
    setRules((list) => list.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)))
  }

  function removeRule(id) {
    setRules((list) => (list.length > 1 ? list.filter((rule) => rule.id !== id) : list))
    setMessage('')
  }

  function applyRules() {
    if (!rules.some((rule) => isRuleReady(rule))) {
      setMessage('조건에 필요한 값을 입력하세요')
      return
    }
    if (!rules.some((rule) => isRuleReady(rule) && (rule.bg || rule.color || rule.bold))) {
      setMessage('칠할 배경색·글자색을 고르거나 굵게를 켜세요')
      return
    }
    const { grid: next, applied } = applyRuleSet(grid, rules, scope, { skipFirstRow: headerRow })
    if (applied === 0) {
      setMessage('조건에 맞는 칸이 없습니다')
      return
    }
    setGrid(next)
    setMessage(`${applied}개 조건을 적용해 ${ruleMatches.union.length}칸에 색을 입혔습니다`)
  }

  function clearRules() {
    const { grid: next, cleared } = clearRuleSet(grid, rules, scope, { skipFirstRow: headerRow })
    if (cleared === 0) {
      setMessage('조건에 맞는 칸이 없습니다')
      return
    }
    setGrid(next)
    setMessage(`${cleared}칸의 배경색·글자색·굵게를 지웠습니다`)
  }

  function applyWidth(clear) {
    const width = clear ? null : normalizeWidth(widthForm.value, widthForm.unit)
    if (!clear && width === null) {
      setMessage('너비는 정수로 입력하세요 (px 는 1~9999, % 는 1~100)')
      return
    }
    const { grid: next, changed } = setColumnWidth(grid, range.c1, range.c2, width)
    if (changed === 0) {
      setMessage(clear ? '지울 너비가 없습니다' : '이미 그 너비이거나, 너비를 붙일 수 있는 칸이 없습니다 (가로 병합된 열)')
      return
    }
    setGrid(next)
    setMessage(
      clear
        ? `${changed}개 열의 너비를 지웠습니다`
        : `${columnLabel(range.c1)}${range.c1 === range.c2 ? '' : `~${columnLabel(range.c2)}`}열의 너비를 ${width}로 정했습니다`,
    )
  }

  function applyHeight(clear) {
    const height = clear ? null : normalizeHeight(heightValue)
    if (!clear && height === null) {
      setMessage('높이는 1~9999 사이의 정수(px)로 입력하세요')
      return
    }
    const { grid: next, changed } = setRowHeight(grid, range.r1, range.r2, height)
    if (changed === 0) {
      setMessage(clear ? '지울 높이가 없습니다' : '이미 그 높이이거나, 높이를 붙일 수 있는 칸이 없습니다 (세로 병합된 행)')
      return
    }
    setGrid(next)
    setMessage(clear ? `${changed}개 행의 높이를 지웠습니다` : `${rowsLabel}의 높이를 ${height}로 정했습니다`)
  }

  function applyStripes(clear) {
    const area = bodyScope()
    const next = clear ? clearStripes(grid, area, stripe.color) : stripeRows(grid, area, stripe.color, { startWith: stripe.start })
    if (next === grid) {
      setMessage(clear ? '지울 줄무늬가 없습니다 (같은 색의 배경이 없음)' : '칠할 칸이 없습니다')
      return
    }
    setGrid(next)
    setMessage(clear ? '줄무늬를 지웠습니다' : '줄무늬를 칠했습니다')
  }

  return {
    panel,
    togglePanel,
    message,
    scopeLabel,
    number,
    setNumber,
    applyNumberFormat,
    rules,
    ruleCounts: ruleMatches.perRule.map((cells) => cells.length),
    ruleMatchCount: ruleMatches.union.length,
    maxRules: MAX_RULES,
    addRule,
    updateRule,
    removeRule,
    previewCells,
    applyRules,
    clearRules,
    widthForm,
    setWidthForm,
    currentWidth,
    widthColumns: range.c1 === range.c2 ? columnLabel(range.c1) : `${columnLabel(range.c1)}~${columnLabel(range.c2)}`,
    applyWidth,
    heightValue,
    setHeightValue,
    currentHeight,
    rowsLabel,
    applyHeight,
    stripe,
    setStripe,
    applyStripes,
  }
}
