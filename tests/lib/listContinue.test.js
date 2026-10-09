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

  it('목록이 아닌 줄은 null', () => {
    expect(enter('그냥 문장^')).toBeNull()
    expect(enter('1. 번호^')).toBeNull()
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
