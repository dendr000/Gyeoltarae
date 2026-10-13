import { describe, expect, it } from 'vitest'
import { listContinueEdit } from '../../src/lib/listContinue.js'

const F = '```'

// Enter 를 적용해서 새 문서와 커서 위치를 돌려주는 도우미. 커서는 ^ 로 적는다.
function enter(doc) {
  const pos = doc.indexOf('^')
  const clean = doc.replace('^', '')
  const edit = listContinueEdit(clean, pos, pos)
  if (!edit) return null
  const next = clean.slice(0, edit.from) + edit.insert + clean.slice(edit.to)
  return { next: next.slice(0, edit.caret) + '^' + next.slice(edit.caret) }
}

describe('listContinueEdit (목록 Enter 이어쓰기)', () => {
  it('`* 문장` 끝에서 Enter 하면 아래 줄에 `* ` 가 생긴다', () => {
    expect(enter('* 사과^').next).toBe('* 사과\n* ^')
  })

  it('들여쓴 목록은 같은 들여쓰기와 별표 개수를 이어받는다', () => {
    expect(enter('    * 배^').next).toBe('    * 배\n    * ^')
    expect(enter('** 깊은^').next).toBe('** 깊은\n** ^')
  })

  it('커서가 글 중간이면 뒤쪽 글이 새 항목으로 내려간다', () => {
    expect(enter('* 사^과').next).toBe('* 사\n* ^과')
  })

  it('내용이 없는 `* ` 줄에서 Enter 하면 `* ` 가 지워진다', () => {
    expect(enter('* 사과\n* ^').next).toBe('* 사과\n^')
  })

  it('`* ` 뒤에 공백만 더 있어도 빈 항목으로 본다', () => {
    expect(enter('*   ^').next).toBe('^')
  })

  it('들여쓴 빈 항목은 들여쓰기까지 통째로 지운다', () => {
    expect(enter('    * ^').next).toBe('^')
  })

  it('빈 항목 제거는 그 줄만 건드린다', () => {
    expect(enter('a\n* ^\nb').next).toBe('a\n^\nb')
  })

  it('별표만 있고 공백이 없는 줄(굵게 표기 등)은 목록이 아니다', () => {
    expect(enter('**굵게**^')).toBeNull()
    expect(enter('*^')).toBeNull()
  })

  it('커서가 `* ` 표시보다 앞이면 평소 Enter', () => {
    expect(enter('^* 사과')).toBeNull()
    expect(enter('*^ 사과')).toBeNull()
  })

  it('목록·인용이 아닌 줄은 null', () => {
    expect(enter('그냥 문장^')).toBeNull()
    expect(listContinueEdit('', 0, 0)).toBeNull()
  })

  it('선택 영역이 있으면 null', () => {
    expect(listContinueEdit('* 사과', 2, 4)).toBeNull()
  })

  it('코드블록 안에서는 null', () => {
    expect(enter(`${F}\n* 사과^\n${F}`)).toBeNull()
  })

  it('코드블록이 끝난 뒤에는 다시 동작한다', () => {
    expect(enter(`${F}\nx\n${F}\n* 사과^`).next).toBe(`${F}\nx\n${F}\n* 사과\n* ^`)
  })

  it('문서 첫 줄과 마지막 줄에서도 동작한다', () => {
    expect(enter('* a^\nb').next).toBe('* a\n* ^\nb')
    expect(enter('b\n* a^').next).toBe('b\n* a\n* ^')
  })
})

describe('listContinueEdit - 번호 목록 (1. 항목)', () => {
  it('`1. 문장` 끝에서 Enter 하면 아래 줄에 다음 번호가 생긴다', () => {
    expect(enter('1. 사과^').next).toBe('1. 사과\n2. ^')
    expect(enter('9. 아홉^').next).toBe('9. 아홉\n10. ^')
    expect(enter('10. 열^').next).toBe('10. 열\n11. ^')
  })

  it('들여쓴 번호 목록은 같은 들여쓰기를 이어받는다', () => {
    expect(enter('    3. 배^').next).toBe('    3. 배\n    4. ^')
  })

  it('앞에 0 이 붙은 번호는 자릿수를 유지한다 (01. → 02.)', () => {
    expect(enter('01. 가^').next).toBe('01. 가\n02. ^')
    expect(enter('09. 가^').next).toBe('09. 가\n10. ^')
  })

  it('내용이 없는 항목에서 Enter 하면 그 줄을 비워서 목록을 끝낸다', () => {
    expect(enter('1. 사과\n2. ^').next).toBe('1. 사과\n^')
    expect(enter('    2. ^').next).toBe('^')
  })

  it('줄 중간에서 Enter 하면 커서 뒤 글자가 다음 번호 뒤로 내려간다', () => {
    expect(enter('1. 사^과').next).toBe('1. 사\n2. ^과')
  })

  it('번호 표시(1.) 앞이나 안에서 Enter 하면 평소 동작 (null)', () => {
    expect(enter('^1. 사과')).toBeNull()
    expect(enter('1^. 사과')).toBeNull()
    expect(enter('1.^ 사과')).toBeNull() // 점 바로 뒤, 공백 앞도 표시 안
  })

  it('번호 목록이 아닌 줄은 null — 점이 없거나(1 사과), 번호 뒤 공백이 없거나(1.사과), 글 속의 번호', () => {
    expect(enter('1 사과^')).toBeNull()
    expect(enter('1.사과^')).toBeNull()
    expect(enter('총 3. 사과^')).toBeNull()
    expect(enter('a. 사과^')).toBeNull()
  })

  it('코드블록 안과 선택 영역이 있을 때는 동작하지 않는다', () => {
    expect(enter(`${F}\n1. 사과^\n${F}`)).toBeNull()
    expect(listContinueEdit('1. 사과', 0, 3)).toBeNull()
  })

  it('CRLF 문서에서도 줄 끝의 \r 을 내용으로 보지 않는다', () => {
    const doc = '1. 사과\r\n2. 배'
    const pos = doc.indexOf('사과') + 2
    const edit = listContinueEdit(doc, pos, pos)
    expect(edit.insert).toBe('\n2. ')
  })
})

describe('listContinueEdit - 인용 (> 내용)', () => {
  it('`> 문장` 끝에서 Enter 하면 아래 줄에 `> ` 가 생긴다', () => {
    expect(enter('> 인용^').next).toBe('> 인용\n> ^')
  })

  it('`>` 개수(깊이)와 들여쓰기를 이어받는다', () => {
    expect(enter('>> 깊은^').next).toBe('>> 깊은\n>> ^')
    expect(enter('  > 들여쓴^').next).toBe('  > 들여쓴\n  > ^')
  })

  it('`>문장` (공백 없는 인용)도 이어 쓰되 다음 줄은 `> ` 로 만든다', () => {
    expect(enter('>인용^').next).toBe('>인용\n> ^')
  })

  it('내용이 없는 인용 줄에서 Enter 하면 그 줄을 비워서 인용을 끝낸다', () => {
    expect(enter('> 인용\n> ^').next).toBe('> 인용\n^')
    expect(enter('>> ^').next).toBe('^')
    expect(enter('>^').next).toBe('^')
  })

  it('줄 중간에서 Enter 하면 커서 뒤 글자가 다음 `> ` 뒤로 내려간다', () => {
    expect(enter('> 인^용').next).toBe('> 인\n> ^용')
  })

  it('`>` 표시 앞에서 Enter 하면 평소 동작 (null)', () => {
    expect(enter('^> 인용')).toBeNull()
    expect(enter('>^> 인용')).toBeNull()
    expect(enter('>^ 인용')).toBeNull() // > 바로 뒤, 공백 앞도 표시 안
  })

  it('인용이 아닌 글은 null (줄 중간의 >, 화살표 ->)', () => {
    expect(enter('a > b^')).toBeNull()
    expect(enter('-> 다음^')).toBeNull()
  })

  it('코드블록 안에서는 동작하지 않는다', () => {
    expect(enter(`${F}\n> 코드^\n${F}`)).toBeNull()
  })
})

describe('listContinueEdit - 세 종류가 섞인 문서', () => {
  it('각 줄은 자기 종류만 이어받는다 (* → *, 1. → 2., > → >)', () => {
    expect(enter('* a^\n1. b\n> c').next).toBe('* a\n* ^\n1. b\n> c')
    expect(enter('* a\n1. b^\n> c').next).toBe('* a\n1. b\n2. ^\n> c')
    expect(enter('* a\n1. b\n> c^').next).toBe('* a\n1. b\n> c\n> ^')
  })
})
