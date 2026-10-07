import { describe, expect, it } from 'vitest'
import { fenceAutoCloseEdit, isCodeFenceClose, isInsideCodeFence, matchCodeFenceOpen } from '../../src/lib/codeFence.js'

const F = '```'

describe('matchCodeFenceOpen / isCodeFenceClose', () => {
  it('백틱 3개 이상 + 선택적인 언어 이름만 있는 줄이 여는 줄이다', () => {
    expect(matchCodeFenceOpen(F)).toEqual({ ticks: 3, lang: '' })
    expect(matchCodeFenceOpen(`${F}sql`)).toEqual({ ticks: 3, lang: 'sql' })
    expect(matchCodeFenceOpen(`  ${F}MySQL  `)).toEqual({ ticks: 3, lang: 'MySQL' })
    expect(matchCodeFenceOpen('````java')).toEqual({ ticks: 4, lang: 'java' })
  })

  it('한글·기호가 든 언어 이름도 받는다', () => {
    expect(matchCodeFenceOpen(`${F}자바스크립트`)?.lang).toBe('자바스크립트')
    expect(matchCodeFenceOpen(`${F}C++`)?.lang).toBe('C++')
    expect(matchCodeFenceOpen(`${F}C#`)?.lang).toBe('C#')
    expect(matchCodeFenceOpen(`${F}No-SQL`)?.lang).toBe('No-SQL')
  })

  it('같은 줄에 다른 글자가 더 있으면 여는 줄이 아니다', () => {
    expect(matchCodeFenceOpen(`${F}code${F}`)).toBeNull()
    expect(matchCodeFenceOpen(`${F}sql 설명`)).toBeNull()
    expect(matchCodeFenceOpen('``')).toBeNull()
    expect(matchCodeFenceOpen('')).toBeNull()
  })

  it('닫는 줄은 여는 줄 이상의 백틱만 있는 줄이다', () => {
    expect(isCodeFenceClose(F, 3)).toBe(true)
    expect(isCodeFenceClose('````', 3)).toBe(true)
    expect(isCodeFenceClose(F, 4)).toBe(false)
    expect(isCodeFenceClose(`${F}sql`, 3)).toBe(false)
  })
})

describe('isInsideCodeFence', () => {
  const lines = ['본문', F, 'code', F, '뒤']

  it('여는 줄 뒤 ~ 닫는 줄 사이는 안이다', () => {
    expect(isInsideCodeFence(lines, 0)).toBe(false)
    expect(isInsideCodeFence(lines, 1)).toBe(false) // 여는 줄 자신이 시작될 때는 아직 밖
    expect(isInsideCodeFence(lines, 2)).toBe(true)
    expect(isInsideCodeFence(lines, 3)).toBe(true) // 닫는 줄이 시작될 때는 아직 안
    expect(isInsideCodeFence(lines, 4)).toBe(false)
  })

  it('닫는 줄이 없으면 끝까지 안이다', () => {
    expect(isInsideCodeFence([F, 'a', 'b'], 3)).toBe(true)
  })

  it('백틱 4개로 연 블록 안의 ``` 줄은 닫는 줄이 아니다', () => {
    expect(isInsideCodeFence(['````', F, 'x'], 3)).toBe(true)
  })
})

describe('fenceAutoCloseEdit (``` 를 치면 아래 줄에 닫는 ``` 를 넣어 줌)', () => {
  // 편집기에서 세 번째 백틱을 누르기 직전의 상태: 줄에 백틱 2개가 있고 커서가 그 뒤에 있다.
  const at = (value, pos = value.length) => fenceAutoCloseEdit(value, pos, pos)

  it('빈 줄에서 세 번째 백틱을 누르면 아래 줄에 닫는 ``` 를 넣고 커서는 첫 ``` 뒤에 둔다', () => {
    expect(at('``')).toEqual({ insert: '`\n```', caret: 1 })
  })

  it('들여쓴 줄이면 닫는 줄도 같은 들여쓰기를 쓴다', () => {
    expect(at('  ``')).toEqual({ insert: '`\n  ```', caret: 1 })
  })

  it('문서 중간(앞에 본문이 있는 줄)에서도 동작한다', () => {
    const value = '앞 문단\n\n``'
    expect(at(value)).toEqual({ insert: '`\n```', caret: 1 })
  })

  it('이미 닫힌 코드블록 뒤에서는 새 코드블록으로 본다', () => {
    const value = `${F}\ncode\n${F}\n\n\`\``
    expect(at(value)).toEqual({ insert: '`\n```', caret: 1 })
  })

  it('열린 코드블록 안에서 치는 ``` 는 닫는 줄이므로 아무것도 넣지 않는다', () => {
    const value = `${F}sql\nSELECT 1;\n\`\``
    expect(at(value)).toBeNull()
  })

  it('백틱이 2개가 아니면 동작하지 않는다 (1개째·2개째·4개째)', () => {
    expect(at('')).toBeNull()
    expect(at('`')).toBeNull()
    expect(at('```')).toBeNull()
  })

  it('줄에 다른 글자가 앞에 있으면 동작하지 않는다 (글 중간의 인라인 백틱)', () => {
    expect(at('코드 ``')).toBeNull()
  })

  it('커서 뒤에 같은 줄 글자가 더 있으면 동작하지 않는다', () => {
    const value = '``뒤에 글자'
    expect(fenceAutoCloseEdit(value, 2, 2)).toBeNull()
  })

  it('커서 뒤가 공백뿐이면 동작한다', () => {
    expect(fenceAutoCloseEdit('``   ', 2, 2)).toEqual({ insert: '`\n```', caret: 1 })
  })

  it('글자를 선택한 상태에서는 동작하지 않는다', () => {
    expect(fenceAutoCloseEdit('``', 0, 2)).toBeNull()
  })

  it('커서가 줄 중간이 아니라 문서 중간 줄의 끝이어도 아래 줄을 밀어낸다 (뒤에 줄이 더 있는 경우)', () => {
    const value = '``\n뒤 문단'
    expect(fenceAutoCloseEdit(value, 2, 2)).toEqual({ insert: '`\n```', caret: 1 })
  })
})
