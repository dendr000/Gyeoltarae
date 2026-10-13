import { describe, expect, it } from 'vitest'
import { duplicateLinesEdit } from '../../src/lib/lineDuplicate.js'

const F = '```'

// 편집 결과를 적용해서 새 문서와 선택 영역을 돌려주는 도우미.
function apply(value, selStart, selEnd = selStart) {
  const edit = duplicateLinesEdit(value, selStart, selEnd)
  if (!edit) return null
  const next = value.slice(0, edit.insertAt) + edit.insertText + value.slice(edit.insertAt)
  return { next, selStart: edit.selStart, selEnd: edit.selEnd }
}

// 커서(^) 하나로 위치를 적는다.
function at(doc) {
  const pos = doc.indexOf('^')
  return apply(doc.replace('^', ''), pos)
}

describe('duplicateLinesEdit (Ctrl+D — 현재 줄을 아래에 복제, 문서 어디서나)', () => {
  it('커서가 있는 줄을 바로 아래 줄에 그대로 복제한다', () => {
    const r = at(`${F}sql\nSELECT * FROM t;^\n${F}`)
    expect(r.next).toBe(`${F}sql\nSELECT * FROM t;\nSELECT * FROM t;\n${F}`)
  })

  it('커서가 줄 중간에 있어도 줄 전체를 복제한다', () => {
    const r = at(`${F}sql\nSELECT^ * FROM t;\n${F}`)
    expect(r.next).toBe(`${F}sql\nSELECT * FROM t;\nSELECT * FROM t;\n${F}`)
  })

  it('커서는 복제된 줄의 같은 자리로 옮겨 간다', () => {
    const doc = `${F}sql\nSELECT^ * FROM t;\n${F}`
    const pos = doc.indexOf('^')
    const r = apply(doc.replace('^', ''), pos)
    const lineLen = 'SELECT * FROM t;'.length
    // 원래 줄 시작 + 줄 길이 + 줄바꿈(1) 만큼 뒤 = 복제된 줄의 같은 열
    expect(r.selStart).toBe(pos + lineLen + 1)
    expect(r.selEnd).toBe(r.selStart)
  })

  it('들여쓰기와 줄 끝 공백도 그대로 복제한다', () => {
    const r = at(`${F}sql\n    id INT,  ^\n${F}`)
    expect(r.next).toBe(`${F}sql\n    id INT,  \n    id INT,  \n${F}`)
  })

  it('줄이 빈 줄이어도 빈 줄이 복제된다', () => {
    const r = at(`${F}sql\na\n^\n${F}`)
    expect(r.next).toBe(`${F}sql\na\n\n\n${F}`)
  })

  it('블록의 마지막 줄을 복제하면 닫는 ``` 앞에 들어간다 (닫는 줄은 건드리지 않음)', () => {
    const r = at(`${F}sql\nx^\n${F}`)
    expect(r.next).toBe(`${F}sql\nx\nx\n${F}`)
  })

  it('문서의 마지막 줄(뒤에 줄바꿈이 없음)도 복제된다', () => {
    const r = at(`${F}sql\nSELECT 1;^`)
    expect(r.next).toBe(`${F}sql\nSELECT 1;\nSELECT 1;`)
  })

  it('윈도우 줄바꿈(CRLF) 문서에서도 줄 끝의 \\r 을 줄 안에 포함하지 않고 정상으로 복제한다', () => {
    const doc = `${F}sql\r\nSELECT 1;^\r\n${F}`
    const pos = doc.indexOf('^')
    const r = apply(doc.replace('^', ''), pos)
    // 복제된 줄도 CRLF 로 이어진다
    expect(r.next).toBe(`${F}sql\r\nSELECT 1;\r\nSELECT 1;\r\n${F}`)
  })

  it('여러 줄을 선택했으면 선택에 걸친 줄 전체를 통째로 복제하고 선택도 복제본으로 옮긴다', () => {
    const value = `${F}sql\na\nb\nc\n${F}`
    const start = value.indexOf('a')
    const end = value.indexOf('b') + 1 // b 를 포함해서 선택
    const r = apply(value, start, end)
    expect(r.next).toBe(`${F}sql\na\nb\na\nb\nc\n${F}`)
    expect(r.next.slice(r.selStart, r.selEnd)).toBe('a\nb')
    // 복제본(두 번째 a)을 가리킨다
    expect(r.selStart).toBe(r.next.lastIndexOf('a'))
  })

  it('선택이 다음 줄 맨 앞에서 끝나면 그 다음 줄은 포함하지 않는다', () => {
    const value = `${F}sql\na\nb\n${F}`
    const start = value.indexOf('a')
    const end = value.indexOf('b') // 다음 줄 맨 앞(b 앞)
    const r = apply(value, start, end)
    expect(r.next).toBe(`${F}sql\na\na\nb\n${F}`)
  })

  it('``` 줄(여는 줄·닫는 줄)에서는 null — 복제하지 않는다', () => {
    expect(at(`${F}sql^\nx\n${F}`)).toBeNull()
    expect(at(`${F}sql\nx\n${F}^`)).toBeNull()
  })

  it('선택이 ``` 줄을 걸치면 null', () => {
    const value = `${F}sql\nx\n${F}\n뒤`
    expect(duplicateLinesEdit(value, value.indexOf('x'), value.indexOf('뒤'))).toBeNull()
  })

  describe('코드블록 밖에서도 복제된다 (문서 전체에서 쓰는 기능)', () => {
    it('문단 줄', () => {
      expect(at('문단 글^').next).toBe('문단 글\n문단 글')
      expect(at('앞 줄\n문단^ 글\n뒤 줄').next).toBe('앞 줄\n문단 글\n문단 글\n뒤 줄')
    })

    it('표 줄·목록 줄·제목 줄도 그대로 복제한다', () => {
      expect(at('||가||나||^\n||다||라||').next).toBe('||가||나||\n||가||나||\n||다||라||')
      expect(at(' * 항목^').next).toBe(' * 항목\n * 항목')
      expect(at('== 제목 ==^').next).toBe('== 제목 ==\n== 제목 ==')
    })

    it('코드블록 앞뒤의 문단 줄도 복제된다', () => {
      expect(at(`${F}sql\nx\n${F}\n뒤 문단^`).next).toBe(`${F}sql\nx\n${F}\n뒤 문단\n뒤 문단`)
      expect(at(`앞 문단^\n${F}sql\nx\n${F}`).next).toBe(`앞 문단\n앞 문단\n${F}sql\nx\n${F}`)
    })

    it('커서는 복제된 줄의 같은 자리로 옮겨 간다', () => {
      const r = apply('abc def', 3)
      expect(r.next).toBe('abc def\nabc def')
      expect(r.selStart).toBe(3 + 'abc def'.length + 1)
    })

    it('여러 줄을 선택하면 걸친 줄 전체를 통째로 복제한다', () => {
      const value = '가\n나\n다'
      const r = apply(value, 0, value.indexOf('나') + 1)
      expect(r.next).toBe('가\n나\n가\n나\n다')
      expect(r.next.slice(r.selStart, r.selEnd)).toBe('가\n나')
    })

    it('빈 줄도 복제된다', () => {
      expect(at('가\n^\n나').next).toBe('가\n\n\n나')
    })

    it('CRLF 문서에서도 정상', () => {
      const doc = '가\r\n나^\r\n다'
      const pos = doc.indexOf('^')
      expect(apply(doc.replace('^', ''), pos).next).toBe('가\r\n나\r\n나\r\n다')
    })

    it('코드블록 한 덩어리(여는 줄~닫는 줄)를 통째로 선택하면 블록 전체가 복제된다 (구조가 그대로라서)', () => {
      const value = `앞\n${F}sql\nx\n${F}\n뒤`
      const r = apply(value, value.indexOf(F), value.indexOf(F, value.indexOf('x')) + 1)
      expect(r.next).toBe(`앞\n${F}sql\nx\n${F}\n${F}sql\nx\n${F}\n뒤`)
    })

    it('블록 안의 줄과 닫는 줄을 함께 고르면 블록이 깨지므로 null', () => {
      const value = `${F}sql\nx\n${F}\n뒤`
      expect(duplicateLinesEdit(value, value.indexOf('x'), value.indexOf(F, value.indexOf('x')) + 1)).toBeNull()
    })

    it('블록 밖의 줄과 여는 줄을 함께 고르면 null', () => {
      const value = `앞\n${F}sql\nx\n${F}`
      expect(duplicateLinesEdit(value, 0, value.indexOf('sql'))).toBeNull()
    })
  })

  it('언어가 없는 ``` 블록 안에서도 복제된다 (코드블록이면 된다)', () => {
    const r = at(`${F}\nx^\n${F}`)
    expect(r.next).toBe(`${F}\nx\nx\n${F}`)
  })

  it('닫는 줄이 없는 블록(문서 끝까지가 코드)에서도 복제된다', () => {
    const r = at(`${F}sql\nSELECT 1;^`)
    expect(r.next).toBe(`${F}sql\nSELECT 1;\nSELECT 1;`)
  })

  it('백틱 4개로 연 블록 안의 ``` 줄은 코드 본문이라 그대로 복제된다 (블록 구조가 달라지지 않으므로)', () => {
    const four = '````'
    expect(at(`${four}\n${F}^\n${four}`).next).toBe(`${four}\n${F}\n${F}\n${four}`)
  })

  it('빈 문서는 null', () => {
    expect(duplicateLinesEdit('', 0, 0)).toBeNull()
  })
})
