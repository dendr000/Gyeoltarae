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

describe('duplicateLinesEdit (Ctrl+D — 현재 줄을 아래에 복제)', () => {
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

  it('코드블록 밖(문단·표·목록)에서는 null — 평소 Ctrl+D 동작을 그대로 둔다', () => {
    expect(at('문단 글^')).toBeNull()
    expect(at(`${F}sql\nx\n${F}\n뒤 문단^`)).toBeNull()
    expect(at(`앞 문단^\n${F}sql\nx\n${F}`)).toBeNull()
  })

  it('언어가 없는 ``` 블록 안에서도 복제된다 (코드블록이면 된다)', () => {
    const r = at(`${F}\nx^\n${F}`)
    expect(r.next).toBe(`${F}\nx\nx\n${F}`)
  })

  it('닫는 줄이 없는 블록(문서 끝까지가 코드)에서도 복제된다', () => {
    const r = at(`${F}sql\nSELECT 1;^`)
    expect(r.next).toBe(`${F}sql\nSELECT 1;\nSELECT 1;`)
  })

  it('백틱 4개로 연 블록 안의 ``` 줄은 코드 본문이라 복제할 수 없는 줄(펜스 모양)로 본다', () => {
    // 4틱 블록 안의 ``` 줄 자체는 펜스처럼 보이므로 건드리지 않는다 (안전한 쪽)
    expect(at(`\`\`\`\`\n${F}^\n\`\`\`\``)).toBeNull()
  })

  it('빈 문서는 null', () => {
    expect(duplicateLinesEdit('', 0, 0)).toBeNull()
  })
})
