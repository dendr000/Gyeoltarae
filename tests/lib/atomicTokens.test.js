import { describe, expect, it } from 'vitest'
import { atomicDeleteRange, atomicStep } from '../../src/lib/atomicTokens.js'

describe('atomicStep - 굵게 표시 `\'\'\'` 를 한 덩어리로', () => {
  const bold = "'''a'''" // 위치: ' ' ' [3]a [4]' ' ' [7]

  it('커서 바로 오른쪽이 여는 `\'\'\'` 면 3칸 건너뛴다', () => {
    expect(atomicStep(bold, 0, 1)).toBe(3)
  })

  it('커서 바로 왼쪽이 여는 `\'\'\'` 면 3칸 되돌아간다', () => {
    expect(atomicStep(bold, 3, -1)).toBe(0)
  })

  it('닫는 `\'\'\'` 도 한 번에 건너뛴다', () => {
    expect(atomicStep(bold, 4, 1)).toBe(7)
    expect(atomicStep(bold, 7, -1)).toBe(4)
  })

  it('안쪽 글자 사이에서는 해당 없음 (null)', () => {
    expect(atomicStep(bold, 3, 1)).toBeNull()
    expect(atomicStep(bold, 4, -1)).toBeNull()
  })

  it('따옴표가 2개(이탤릭)·4개·5개 이어진 곳은 덩어리로 보지 않는다', () => {
    expect(atomicStep("''a", 0, 1)).toBeNull()
    expect(atomicStep("''''a", 0, 1)).toBeNull()
    expect(atomicStep("a''''", 1, 1)).toBeNull()
    expect(atomicStep("'''''a", 0, 1)).toBeNull()
    expect(atomicStep("a'''''", 6, -1)).toBeNull()
  })

  it('글 중간의 `\'\'\'` 도 같다', () => {
    const v = "앞 '''굵게''' 뒤"
    expect(atomicStep(v, 2, 1)).toBe(5)
    expect(atomicStep(v, v.indexOf('뒤') - 1, -1)).toBe(v.indexOf('뒤') - 4)
  })

  it('tokens: false 면 `\'\'\'` 를 덩어리로 보지 않는다 (코드블록 안)', () => {
    expect(atomicStep(bold, 0, 1, { tokens: false })).toBeNull()
    expect(atomicStep(bold, 3, -1, { tokens: false })).toBeNull()
  })
})

describe('atomicStep - 줄 앞 들여쓰기(공백 4칸 단위)', () => {
  it('왼쪽: 이전 4칸 단위 위치로 간다', () => {
    const v = `${' '.repeat(8)}x`
    expect(atomicStep(v, 8, -1)).toBe(4)
    expect(atomicStep(v, 6, -1)).toBe(4)
    expect(atomicStep(v, 4, -1)).toBe(0)
  })

  it('왼쪽: 한 칸만 움직이는 경우는 null (평소 동작과 같다)', () => {
    expect(atomicStep(`${' '.repeat(5)}x`, 5, -1)).toBeNull() // 5 -> 4 는 한 칸
    expect(atomicStep(' x', 1, -1)).toBeNull()
    expect(atomicStep(' x', 0, -1)).toBeNull()
  })

  it('오른쪽: 다음 4칸 단위 위치로 가되 들여쓰기 끝을 넘지 않는다', () => {
    const v = `${' '.repeat(8)}x`
    expect(atomicStep(v, 0, 1)).toBe(4)
    expect(atomicStep(v, 2, 1)).toBe(4)
    expect(atomicStep(v, 4, 1)).toBe(8)
    expect(atomicStep(`${' '.repeat(2)}x`, 0, 1)).toBe(2) // 공백이 4칸보다 적으면 있는 만큼
    expect(atomicStep(`${' '.repeat(6)}x`, 4, 1)).toBe(6)
  })

  it('들여쓰기가 끝나는 자리(글자 앞)에서 오른쪽은 해당 없음', () => {
    expect(atomicStep('    x', 4, 1)).toBeNull()
  })

  it('글자 뒤의 공백(단어 사이, 줄 중간)은 건드리지 않는다', () => {
    expect(atomicStep(`ab${' '.repeat(6)}c`, 8, -1)).toBeNull()
    expect(atomicStep(`ab${' '.repeat(6)}c`, 2, 1)).toBeNull()
  })

  it('둘째 줄 이후도 그 줄의 맨 앞을 기준으로 센다', () => {
    const v = `first\n${' '.repeat(8)}x`
    expect(atomicStep(v, 6 + 8, -1)).toBe(6 + 4)
    expect(atomicStep(v, 6, 1)).toBe(6 + 4)
  })

  it('탭 문자가 섞인 들여쓰기는 해당 없음', () => {
    expect(atomicStep('\t    x', 5, -1)).toBeNull()
  })
})

describe('atomicDeleteRange (Backspace / Delete)', () => {
  it('Backspace: 커서 왼쪽의 `\'\'\'` 전체', () => {
    expect(atomicDeleteRange("'''a'''", 7, -1)).toEqual({ from: 4, to: 7 })
  })

  it('Delete: 커서 오른쪽의 `\'\'\'` 전체', () => {
    expect(atomicDeleteRange("'''a'''", 0, 1)).toEqual({ from: 0, to: 3 })
  })

  it('Backspace: 들여쓰기 6칸 뒤에서는 2칸(4칸 단위 위치까지)', () => {
    expect(atomicDeleteRange(`${' '.repeat(6)}x`, 6, -1)).toEqual({ from: 4, to: 6 })
  })

  it('Backspace: 들여쓰기 8칸 뒤에서는 4칸', () => {
    expect(atomicDeleteRange(`${' '.repeat(8)}x`, 8, -1)).toEqual({ from: 4, to: 8 })
  })

  it('Delete: 줄 맨 앞에서는 4칸', () => {
    expect(atomicDeleteRange(`${' '.repeat(8)}x`, 0, 1)).toEqual({ from: 0, to: 4 })
  })

  it('해당 없으면 null (평소 Backspace/Delete)', () => {
    expect(atomicDeleteRange('abc', 2, -1)).toBeNull()
    expect(atomicDeleteRange(' x', 1, -1)).toBeNull()
    expect(atomicDeleteRange("''a", 2, -1)).toBeNull()
  })

  it('tokens: false 면 `\'\'\'` 는 지우지 않는다', () => {
    expect(atomicDeleteRange("'''a'''", 7, -1, { tokens: false })).toBeNull()
  })
})
