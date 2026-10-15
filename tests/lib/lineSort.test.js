// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { sortLinesEdit } from '../../src/lib/lineSort.js'

// 편집 결과를 적용해 새 문서를 돌려주는 도우미 (화면의 replaceRange 와 같은 일)
function apply(value, edit) {
  return value.slice(0, edit.from) + edit.insert + value.slice(edit.to)
}
const sortAll = (value) => {
  const edit = sortLinesEdit(value, 0, value.length)
  return edit ? apply(value, edit) : null
}

describe('줄 이름순 정렬 (Ctrl+`)', () => {
  it('선택한 줄들을 오름차순으로 정렬한다', () => {
    expect(sortAll('다\n가\n나')).toBe('가\n나\n다')
  })

  it('이미 오름차순이면 내림차순으로 뒤집는다 (다시 누르면 반대로)', () => {
    expect(sortAll('가\n나\n다')).toBe('다\n나\n가')
  })

  it('내림차순 상태에서 누르면 오름차순이 된다', () => {
    expect(sortAll('다\n나\n가')).toBe('가\n나\n다')
  })

  it('두 번 누르면 오름차순 -> 내림차순 -> 오름차순으로 돌아온다', () => {
    let v = '나\n다\n가'
    v = sortAll(v)
    expect(v).toBe('가\n나\n다')
    v = sortAll(v)
    expect(v).toBe('다\n나\n가')
    v = sortAll(v)
    expect(v).toBe('가\n나\n다')
  })

  it('한글 · 영문 · 숫자를 섞어도 폴더 트리와 같은 한국어 이름순이다 (숫자 < 한글 < 영문)', () => {
    expect(sortAll('하늘\nbanana\n10\n가을\napple\n2')).toBe('2\n10\n가을\n하늘\napple\nbanana')
  })

  it('숫자는 크기순이다 (문서2 가 문서10 앞)', () => {
    expect(sortAll('문서10\n문서2\n문서1')).toBe('문서1\n문서2\n문서10')
  })

  it('대소문자는 구분하지 않고, 같은 것끼리는 원래 순서를 지킨다', () => {
    expect(sortAll('b\nA\na\nB')).toBe('A\na\nb\nB')
  })

  it('앞의 공백(들여쓰기)은 무시하고 비교한다', () => {
    expect(sortAll('  다\n가\n    나')).toBe('가\n    나\n  다')
  })

  it('내림차순에서도 앞의 공백은 무시하고 비교한다', () => {
    expect(sortAll('  가\n나\n    다')).toBe('    다\n나\n  가')
  })

  it('빈 줄은 오름차순에서도 내림차순에서도 맨 아래로 간다', () => {
    expect(sortAll('다\n\n가\n나')).toBe('가\n나\n다\n')
    expect(sortAll('가\n나\n다\n\n')).toBe('다\n나\n가\n\n')
  })
})

describe('범위와 선택', () => {
  const doc = '앞줄\n다\n가\n나\n뒷줄'

  it('선택에 걸친 줄만 정렬하고 나머지는 그대로 둔다', () => {
    const start = doc.indexOf('다')
    const end = doc.indexOf('나') + 1
    const edit = sortLinesEdit(doc, start, end)
    expect(apply(doc, edit)).toBe('앞줄\n가\n나\n다\n뒷줄')
  })

  it('줄의 중간에서 시작해 중간에서 끝나도 걸친 줄 전체를 정렬한다', () => {
    const edit = sortLinesEdit('b1\na2\nc3', 1, 6)
    expect(apply('b1\na2\nc3', edit)).toBe('a2\nb1\nc3')
  })

  it('줄 전체를 골라 다음 줄 맨 앞에서 끝나면 그 다음 줄은 포함하지 않는다', () => {
    const value = '다\n나\n가'
    const edit = sortLinesEdit(value, 0, '다\n나\n'.length)
    expect(apply(value, edit)).toBe('나\n다\n가')
  })

  it('정렬한 뒤 그 줄들 전체가 선택된 상태로 남는다', () => {
    const value = '나\n가\n다'
    const edit = sortLinesEdit(value, 0, value.length)
    const after = apply(value, edit)
    expect(after.slice(edit.selStart, edit.selEnd)).toBe('가\n나\n다')
  })

  it('선택이 없으면 아무것도 하지 않는다', () => {
    expect(sortLinesEdit('나\n가', 1, 1)).toBeNull()
  })

  it('한 줄만 선택했으면 아무것도 하지 않는다', () => {
    expect(sortLinesEdit('나\n가\n다', 0, 1)).toBeNull()
  })

  it('빈 문서는 아무것도 하지 않는다', () => {
    expect(sortLinesEdit('', 0, 0)).toBeNull()
  })

  it('이미 모두 같은 줄이라 바뀔 것이 없으면 아무것도 하지 않는다', () => {
    expect(sortAll('가\n가\n가')).toBeNull()
  })
})

describe('줄바꿈과 코드블록', () => {
  it('CRLF 문서는 CRLF 를 유지한다', () => {
    expect(sortAll('다\r\n가\r\n나')).toBe('가\r\n나\r\n다')
  })

  it('CRLF 에서 마지막 줄바꿈이 없는 줄도 정렬된다', () => {
    expect(sortAll('b\r\na\r\n')).toBe('a\r\nb\r\n')
  })

  it('코드블록 여는·닫는 줄이 선택에 들어 있으면 하지 않는다 (구조가 깨지므로)', () => {
    expect(sortAll('```sql\nb\na\n```')).toBeNull()
  })

  it('코드블록 안의 줄만 골라 정렬하는 것은 된다', () => {
    const value = '```sql\nb\na\n```'
    const start = value.indexOf('b')
    const end = value.indexOf('a') + 1
    expect(apply(value, sortLinesEdit(value, start, end))).toBe('```sql\na\nb\n```')
  })
})

describe('소스 점검: 편집기에 Ctrl+` 가 연결됐다', () => {
  const pane = readFileSync(new URL('../../src/components/EditorPane.jsx', import.meta.url), 'utf8')

  it('Backquote 키(물리 키 포함)로 sortLinesEdit 를 부른다', () => {
    expect(pane).toMatch(/e\.key === '`' \|\| e\.code === 'Backquote'[\s\S]{0,400}sortLinesEdit\(/)
  })

  it('Shift 나 Alt 가 같이 눌리면 반응하지 않는다', () => {
    expect(pane).toMatch(/\(e\.ctrlKey \|\| e\.metaKey\) && !e\.shiftKey && !e\.altKey && \(e\.key === '`'/)
  })
})
