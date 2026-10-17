// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { emptyCell, insertColumn, insertIndexAfterColumn, insertIndexAfterRow, insertRow } from '../../src/lib/tableGrid.js'

// 표 편집기: 행·열마다 있는 "+" 단추(그 행 아래 / 그 열 오른쪽에 하나 끼움)가 끼울 자리. 병합이 걸친 행·열이면 병합 전체의 뒤로 미뤄서
// 병합 한가운데에 끼워 병합이 늘어나는 일이 없게 한다(툴바의 "아래에 행 삽입"과 같은 규칙).
const cell = (text, extra = {}) => ({ ...emptyCell(), text, ...extra })
const covered = (r, c) => ({ ...emptyCell(), mergedInto: { r, c } })
const plain = (rows, cols) => Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => cell(`${r}${c}`)))

describe('insertIndexAfterRow', () => {
  it('병합이 없으면 바로 다음 줄 앞이다', () => {
    const grid = plain(3, 2)
    expect(insertIndexAfterRow(grid, 0)).toBe(1)
    expect(insertIndexAfterRow(grid, 1)).toBe(2)
  })

  it('맨 아래 행이면 행 수와 같다 (맨 아래에 끼움)', () => {
    expect(insertIndexAfterRow(plain(3, 2), 2)).toBe(3)
  })

  it('세로 병합(rowspan 2)의 대표 칸이 있는 행이면 병합이 끝난 다음 줄이다', () => {
    const grid = plain(4, 2)
    grid[1][0] = cell('병합', { rowspan: 2 })
    grid[2][0] = covered(1, 0)
    expect(insertIndexAfterRow(grid, 1)).toBe(3)
  })

  it('병합에 가려진 행(병합의 둘째 줄)이어도 병합이 끝난 다음 줄이다', () => {
    const grid = plain(4, 2)
    grid[1][0] = cell('병합', { rowspan: 2 })
    grid[2][0] = covered(1, 0)
    expect(insertIndexAfterRow(grid, 2)).toBe(3)
  })

  it('병합이 없는 같은 표의 다른 행에는 영향이 없다', () => {
    const grid = plain(4, 2)
    grid[1][0] = cell('병합', { rowspan: 2 })
    grid[2][0] = covered(1, 0)
    expect(insertIndexAfterRow(grid, 0)).toBe(1)
    expect(insertIndexAfterRow(grid, 3)).toBe(4)
  })

  it('끼운 결과의 새 행은 정확히 그 행 아래(병합이 있으면 병합 뒤)에 비어 있다', () => {
    const grid = plain(3, 2)
    const next = insertRow(grid, insertIndexAfterRow(grid, 0))
    expect(next.map((row) => row[0].text)).toEqual(['00', '', '10', '20'])
  })

  it('병합 행에서 끼워도 병합은 늘어나지 않는다', () => {
    const grid = plain(4, 2)
    grid[1][0] = cell('병합', { rowspan: 2 })
    grid[2][0] = covered(1, 0)
    const next = insertRow(grid, insertIndexAfterRow(grid, 1))
    expect(next[1][0].rowspan).toBe(2)
    expect(next[3].every((c) => c.text === '' && !c.mergedInto)).toBe(true)
  })
})

describe('insertIndexAfterColumn', () => {
  it('병합이 없으면 바로 다음 열 앞이다', () => {
    const grid = plain(2, 3)
    expect(insertIndexAfterColumn(grid, 0)).toBe(1)
    expect(insertIndexAfterColumn(grid, 1)).toBe(2)
  })

  it('맨 오른쪽 열이면 열 수와 같다 (맨 오른쪽에 끼움)', () => {
    expect(insertIndexAfterColumn(plain(2, 3), 2)).toBe(3)
  })

  it('가로 병합(colspan 2)이 걸친 열이면 병합이 끝난 다음 열이다 (대표 열·가려진 열 모두)', () => {
    const grid = plain(2, 4)
    grid[0][1] = cell('병합', { colspan: 2 })
    grid[0][2] = covered(0, 1)
    expect(insertIndexAfterColumn(grid, 1)).toBe(3)
    expect(insertIndexAfterColumn(grid, 2)).toBe(3)
    expect(insertIndexAfterColumn(grid, 0)).toBe(1)
    expect(insertIndexAfterColumn(grid, 3)).toBe(4)
  })

  it('끼운 결과의 새 열은 정확히 그 열 오른쪽에 비어 있고, 병합은 늘어나지 않는다', () => {
    const grid = plain(2, 4)
    grid[0][1] = cell('병합', { colspan: 2 })
    grid[0][2] = covered(0, 1)
    const next = insertColumn(grid, insertIndexAfterColumn(grid, 1))
    expect(next[0][1].colspan).toBe(2)
    expect(next.every((row) => row[3].text === '' && !row[3].mergedInto)).toBe(true)
    expect(next[0].length).toBe(5)
  })
})
