import { describe, expect, it } from 'vitest'
import { enterTarget, shiftTabTarget, tabTarget } from '../../src/lib/tableNav.js'

// 셀 모양은 표 편집기의 grid 와 같다: { colspan, rowspan, mergedInto }. 병합으로 가려진 칸은 mergedInto 가 있다.
const cell = () => ({ text: '', colspan: 1, rowspan: 1, mergedInto: null })
const grid = (rows, cols) => Array.from({ length: rows }, () => Array.from({ length: cols }, cell))

describe('tabTarget (Tab — 오른쪽 셀, 행 끝이면 아래 행의 첫 번째 셀)', () => {
  it('오른쪽에 셀이 있으면 오른쪽 셀로 간다 (아래 행으로 내려가지 않는다)', () => {
    expect(tabTarget(grid(3, 3), 0, 0)).toEqual({ r: 0, c: 1, addRow: false })
    expect(tabTarget(grid(3, 3), 0, 1)).toEqual({ r: 0, c: 2, addRow: false })
    expect(tabTarget(grid(3, 3), 2, 0)).toEqual({ r: 2, c: 1, addRow: false })
  })

  it('행의 마지막 셀이면 아래 행의 첫 번째 셀(0열)로 간다', () => {
    expect(tabTarget(grid(3, 3), 0, 2)).toEqual({ r: 1, c: 0, addRow: false })
    expect(tabTarget(grid(3, 3), 1, 2)).toEqual({ r: 2, c: 0, addRow: false })
  })

  it('마지막 행의 마지막 셀이면 새 행을 만들고 그 행의 첫 번째 셀로 간다', () => {
    expect(tabTarget(grid(3, 3), 2, 2)).toEqual({ r: 3, c: 0, addRow: true })
  })

  it('마지막 행이라도 오른쪽에 셀이 있으면 새 행을 만들지 않고 오른쪽으로 간다', () => {
    expect(tabTarget(grid(3, 3), 2, 0)).toEqual({ r: 2, c: 1, addRow: false })
  })

  it('열이 하나뿐인 표는 Tab 마다 아래 행으로 내려가고 마지막에서 새 행이 생긴다', () => {
    expect(tabTarget(grid(2, 1), 0, 0)).toEqual({ r: 1, c: 0, addRow: false })
    expect(tabTarget(grid(2, 1), 1, 0)).toEqual({ r: 2, c: 0, addRow: true })
  })

  it('오른쪽 칸이 병합(colspan)에 가려져 있으면 건너뛰고 그다음 보이는 셀로 간다', () => {
    const g = grid(2, 4)
    g[0][0] = { ...cell(), colspan: 3 } // 0~2 열을 차지
    g[0][1] = { ...cell(), mergedInto: { r: 0, c: 0 } }
    g[0][2] = { ...cell(), mergedInto: { r: 0, c: 0 } }
    expect(tabTarget(g, 0, 0)).toEqual({ r: 0, c: 3, addRow: false })
  })

  it('오른쪽 칸이 위 셀의 세로 병합(rowspan)에 가려져 있어도 건너뛴다', () => {
    const g = grid(3, 3)
    g[1][1] = { ...cell(), mergedInto: { r: 0, c: 1 } }
    expect(tabTarget(g, 1, 0)).toEqual({ r: 1, c: 2, addRow: false })
  })

  it('오른쪽이 전부 가려져 있으면 행의 끝으로 보고 아래 행의 첫 번째 보이는 셀로 간다', () => {
    const g = grid(3, 3)
    g[0][1] = { ...cell(), mergedInto: { r: 0, c: 0 } }
    g[0][2] = { ...cell(), mergedInto: { r: 0, c: 0 } }
    g[1][0] = { ...cell(), mergedInto: { r: 0, c: 0 } } // 아래 행의 첫 칸도 가려짐
    expect(tabTarget(g, 0, 0)).toEqual({ r: 1, c: 1, addRow: false })
  })
})

describe('shiftTabTarget (Shift+Tab — 왼쪽 셀, 행 처음이면 윗 행의 마지막 셀)', () => {
  it('왼쪽에 셀이 있으면 왼쪽 셀로 간다', () => {
    expect(shiftTabTarget(grid(3, 3), 1, 2)).toEqual({ r: 1, c: 1 })
    expect(shiftTabTarget(grid(3, 3), 2, 1)).toEqual({ r: 2, c: 0 })
  })

  it('행의 첫 번째 셀이면 윗 행의 마지막 셀로 간다', () => {
    expect(shiftTabTarget(grid(3, 3), 1, 0)).toEqual({ r: 0, c: 2 })
    expect(shiftTabTarget(grid(3, 3), 2, 0)).toEqual({ r: 1, c: 2 })
  })

  it('표의 맨 처음 셀이면 null — 평소 포커스 이동에 맡긴다', () => {
    expect(shiftTabTarget(grid(3, 3), 0, 0)).toBeNull()
  })

  it('가려진 칸은 건너뛴다 (왼쪽 병합, 윗 행의 가려진 마지막 칸)', () => {
    const g = grid(3, 3)
    g[1][1] = { ...cell(), mergedInto: { r: 1, c: 0 } }
    expect(shiftTabTarget(g, 1, 2)).toEqual({ r: 1, c: 0 })
    const h = grid(2, 3)
    h[0][2] = { ...cell(), mergedInto: { r: 0, c: 1 } }
    expect(shiftTabTarget(h, 1, 0)).toEqual({ r: 0, c: 1 })
  })

  it('Tab 과 서로 반대로 움직인다 (Tab 한 번 뒤 Shift+Tab 한 번이면 제자리)', () => {
    const g = grid(3, 3)
    for (const [r, c] of [[0, 0], [0, 1], [0, 2], [1, 0], [1, 2]]) {
      const forward = tabTarget(g, r, c)
      expect(shiftTabTarget(g, forward.r, forward.c)).toEqual({ r, c })
    }
  })
})

describe('enterTarget (Enter — 바로 아래 셀로)', () => {
  it('같은 열의 바로 아래 셀이다', () => {
    expect(enterTarget(grid(3, 3), 0, 2)).toEqual({ r: 1, c: 2, addRow: false })
    expect(enterTarget(grid(3, 3), 1, 0)).toEqual({ r: 2, c: 0, addRow: false })
  })

  it('마지막 행이면 새 행을 만들고 같은 열로 간다', () => {
    expect(enterTarget(grid(3, 3), 2, 1)).toEqual({ r: 3, c: 1, addRow: true })
  })

  it('세로로 병합된 셀(rowspan 2)은 병합이 끝난 다음 행으로 간다', () => {
    const g = grid(4, 2)
    g[0][0] = { ...cell(), rowspan: 2 }
    g[1][0] = { ...cell(), mergedInto: { r: 0, c: 0 } }
    expect(enterTarget(g, 0, 0)).toEqual({ r: 2, c: 0, addRow: false })
  })

  it('세로 병합이 표 끝까지 이어지면 새 행을 만든다', () => {
    const g = grid(2, 2)
    g[0][0] = { ...cell(), rowspan: 2 }
    g[1][0] = { ...cell(), mergedInto: { r: 0, c: 0 } }
    expect(enterTarget(g, 0, 0)).toEqual({ r: 2, c: 0, addRow: true })
  })

  it('아래 칸이 다른 셀의 병합에 가려져 있으면 그 병합 셀(보이는 셀)로 간다', () => {
    const g = grid(3, 3)
    g[1][1] = { ...cell(), mergedInto: { r: 1, c: 0 } } // 옆 셀의 colspan 이 덮은 칸
    expect(enterTarget(g, 0, 1)).toEqual({ r: 1, c: 0, addRow: false })
  })

  it('가로로 병합된 셀(colspan)에서도 같은 열의 아래로 간다', () => {
    const g = grid(2, 3)
    g[0][0] = { ...cell(), colspan: 2 }
    g[0][1] = { ...cell(), mergedInto: { r: 0, c: 0 } }
    expect(enterTarget(g, 0, 0)).toEqual({ r: 1, c: 0, addRow: false })
  })
})
