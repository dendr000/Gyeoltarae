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

// 목록 표시 없이 들여쓰기만 있는 줄 — 내용을 쓰고 Enter 하면 아래 줄에 같은 들여쓰기가 이어지고, 들여쓰기만 있는 줄에서 Enter 하면
// 들여쓰기가 지워진다(목록의 `* ` 와 같은 방식). 묶음 정렬(Ctrl+Shift+`)용 계층 글을 쓰기 편하게 하려는 것이다.
describe('listContinueEdit - 들여쓰기 이어쓰기 (표시 없는 들여쓴 줄)', () => {
  it('공백으로 들여쓴 줄 끝에서 Enter 하면 아래 줄에 같은 들여쓰기가 생긴다', () => {
    expect(enter('    내용^').next).toBe('    내용\n    ^')
    expect(enter('  가^').next).toBe('  가\n  ^')
  })

  it('탭으로 들여쓴 줄은 탭을 그대로 이어받는다', () => {
    expect(enter('\t내용^').next).toBe('\t내용\n\t^')
    expect(enter(' \t섞임^').next).toBe(' \t섞임\n \t^')
  })

  it('글 중간에서 Enter 하면 커서 뒤쪽 글이 같은 들여쓰기로 내려간다', () => {
    expect(enter('  가^나').next).toBe('  가\n  ^나')
  })

  it('들여쓰기만 있는 줄에서 Enter 하면 들여쓰기가 지워져 빈 줄이 된다 (이어쓰기 끝)', () => {
    expect(enter('    ^').next).toBe('^')
    expect(enter('위\n  내용\n  ^\n아래').next).toBe('위\n  내용\n^\n아래')
  })

  it('윈도우 줄바꿈(CRLF)에서도 들여쓰기만 있는 줄은 줄바꿈을 남기고 지운다', () => {
    expect(enter('위\r\n    ^\r\n아래').next).toBe('위\r\n^\r\n아래')
  })

  it('두 번 치면 이어쓰기 -> 끝이다 (내용 한 줄 + Enter, 그다음 Enter)', () => {
    const first = enter('  가^').next
    expect(first).toBe('  가\n  ^')
    expect(enter(first).next).toBe('  가\n^')
  })

  it('커서가 들여쓰기 앞이나 안에 있으면 평소 Enter (null)', () => {
    expect(enter('^  가')).toBeNull()
    expect(enter(' ^ 가')).toBeNull()
    expect(enter(' ^ ')).toBeNull() // 들여쓰기만 있는 줄의 중간
  })

  it('들여쓰지 않은 글은 그대로 null (들여쓰기 이어쓰기는 들여쓴 줄만)', () => {
    expect(enter('가^')).toBeNull()
    expect(enter('가\n나^')).toBeNull()
  })

  it('목록·번호·인용 표시가 있는 들여쓴 줄은 예전처럼 그 표시를 이어받는다', () => {
    expect(enter('  * 항목^').next).toBe('  * 항목\n  * ^')
    expect(enter('  1. 항목^').next).toBe('  1. 항목\n  2. ^')
    expect(enter('  > 인용^').next).toBe('  > 인용\n  > ^')
  })

  it('목록이 아닌 모양(**굵게**, 1.사과)은 들여쓰기만 이어받는다', () => {
    expect(enter('  **굵게**^').next).toBe('  **굵게**\n  ^')
    expect(enter('  1.사과^').next).toBe('  1.사과\n  ^')
  })

  it('선택 영역이 있으면 null', () => {
    expect(listContinueEdit('  가나', 3, 4)).toBeNull()
  })

  it('코드블록 안에서는 null', () => {
    expect(enter(`${F}\n  코드^\n${F}`)).toBeNull()
    expect(enter(`${F}\n  ^\n${F}`)).toBeNull()
  })

  it('코드블록이 끝난 뒤에는 다시 동작한다', () => {
    expect(enter(`${F}\nx\n${F}\n  가^`).next).toBe(`${F}\nx\n${F}\n  가\n  ^`)
  })
})
