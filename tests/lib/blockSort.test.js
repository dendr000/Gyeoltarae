// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { blockSortEdit } from '../../src/lib/blockSort.js'

function apply(value, edit) {
  return value.slice(0, edit.from) + edit.insert + value.slice(edit.to)
}
const FLIP = { flip: true } // 설정 "다시 누르면 뒤집기"가 켜진 상태
const sortAll = (value, options) => {
  const edit = blockSortEdit(value, 0, value.length, options)
  return edit ? apply(value, edit) : null
}

describe('들여쓰기로 묶기: 안 들여쓴 줄이 묶음의 맨 윗줄, 들여쓴 줄은 딸린 줄', () => {
  it('맨 윗줄 글자 기준으로 정렬하고 딸린 줄은 따라가며 서로의 순서는 그대로다', () => {
    const value = '* 다\n  * 하위2\n  * 하위1\n* 가\n  * 가하위'
    expect(sortAll(value)).toBe('* 가\n  * 가하위\n* 다\n  * 하위2\n  * 하위1')
  })

  it('이미 오름차순이면 기본은 아무것도 하지 않는다 (뒤집지 않는다)', () => {
    expect(sortAll('* 가\n  * 가하위\n* 다\n  * 다하위')).toBeNull()
  })

  it('(예: * 자 / * 가 / * 마) 한 번 누르면 오름차순이고 이미 정렬된 뒤에는 그대로다', () => {
    const once = sortAll('* 자\n* 가\n* 마')
    expect(once).toBe('* 가\n* 마\n* 자')
    expect(sortAll(once)).toBeNull()
  })

  it('내림차순으로 놓인 묶음도 기본은 오름차순이 된다', () => {
    expect(sortAll('* 다\n  * 다하위\n* 가\n  * 가하위')).toBe('* 가\n  * 가하위\n* 다\n  * 다하위')
  })

  it('설정을 켜면(flip) 이미 오름차순일 때 묶음 단위로 내림차순으로 뒤집는다', () => {
    expect(sortAll('* 가\n  * 가하위\n* 다\n  * 다하위', FLIP)).toBe('* 다\n  * 다하위\n* 가\n  * 가하위')
  })

  it('설정을 켜도 정렬되어 있지 않으면 먼저 오름차순이 되고, 한 번 더 누르면 내림차순이다', () => {
    const once = sortAll('* 자\n* 가\n* 마', FLIP)
    expect(once).toBe('* 가\n* 마\n* 자')
    const twice = sortAll(once, FLIP)
    expect(twice).toBe('* 자\n* 마\n* 가')
    expect(sortAll(twice, FLIP)).toBe('* 가\n* 마\n* 자')
  })

  it('설정을 켜고 번호 목록을 뒤집어도 번호는 제자리에 남는다', () => {
    expect(sortAll('1. 가\n2. 나\n3. 다', FLIP)).toBe('1. 다\n2. 나\n3. 가')
  })

  it('설정을 꺼 두면(flip: false) 번호 목록이 이미 정렬되어 있을 때 아무것도 하지 않는다', () => {
    expect(sortAll('1. 가\n2. 나\n3. 다', { flip: false })).toBeNull()
  })

  it('설정을 켜도 모두 같아서 바뀔 것이 없으면 아무것도 하지 않는다', () => {
    expect(sortAll('* 가\n* 가', FLIP)).toBeNull()
  })

  it('1~3줄, 1~2줄처럼 크기가 다른 묶음도 통째로 옮긴다', () => {
    const value = '다\n  다1\n  다2\n가\n  가1\n나'
    expect(sortAll(value)).toBe('가\n  가1\n나\n다\n  다1\n  다2')
  })

  it('탭으로 들여쓴 줄도 딸린 줄이다', () => {
    expect(sortAll('나\n\t나1\n가\n\t가1')).toBe('가\n\t가1\n나\n\t나1')
  })

  it('탭 한 개는 공백 4칸으로 센다 (공백 2칸보다 깊다)', () => {
    expect(sortAll('  나\n\t나1\n  가')).toBe('  가\n  나\n\t나1')
  })

  it('가장 얕은 들여쓰기를 기준으로 삼는다 (전체가 한 칸씩 들여써져 있어도 된다)', () => {
    expect(sortAll(' * 나\n   * 나1\n * 가\n   * 가1')).toBe(' * 가\n   * 가1\n * 나\n   * 나1')
  })

  it('첫 줄이 더 깊게 들여써진 경우는 그 줄 하나를 따로 한 묶음으로 본다', () => {
    expect(sortAll('    힘\n나\n가')).toBe('가\n나\n    힘')
  })

  it('딸린 줄 앞의 빈 줄은 묶음 안에 남는다', () => {
    expect(sortAll('나\n\n  나1\n가')).toBe('가\n나\n\n  나1')
  })
})

describe('목록 표시(*, 1., -)는 비교에서 뺀다', () => {
  it('* 와 - 와 + 가 섞여 있어도 표시 뒤의 글자로 정렬한다', () => {
    expect(sortAll('* 나\n- 가\n+ 다')).toBe('- 가\n* 나\n+ 다')
  })

  it('번호 목록은 번호가 제자리에 남고 내용만 정렬된다 (1. 다 / 2. 가 -> 1. 가 / 2. 다)', () => {
    expect(sortAll('1. 다\n2. 가\n3. 나')).toBe('1. 가\n2. 나\n3. 다')
  })

  it('번호 목록에 딸린 줄이 있어도 번호는 제자리에 남는다', () => {
    expect(sortAll('1. 다\n  * 다1\n2. 가\n  * 가1')).toBe('1. 가\n  * 가1\n2. 다\n  * 다1')
  })

  it('번호의 자릿수와 점·괄호 모양을 그 자리의 것으로 유지한다', () => {
    expect(sortAll('01) 나\n02) 가')).toBe('01) 가\n02) 나')
  })

  it('번호가 아닌 묶음이 섞여 있으면 번호를 다시 매기지 않는다', () => {
    expect(sortAll('1. 나\n* 가\n3. 다')).toBe('* 가\n1. 나\n3. 다')
  })

  it('번호가 같은 번호끼리(전부 1.) 있어도 그대로 유지된다', () => {
    expect(sortAll('1. 나\n1. 가')).toBe('1. 가\n1. 나')
  })

  it('숫자는 크기로 비교한다 (항목2 가 항목10 앞)', () => {
    expect(sortAll('* 항목10\n* 항목2\n* 항목1')).toBe('* 항목1\n* 항목2\n* 항목10')
  })
})

describe('빈 줄로 묶기: 들여쓴 줄이 없으면 빈 줄 사이의 덩어리가 한 묶음', () => {
  it('빈 줄로 나뉜 덩어리를 첫 줄 기준으로 정렬하고 빈 줄의 자리는 그대로다', () => {
    expect(sortAll('나1\n나2\n\n가1\n가2')).toBe('가1\n가2\n\n나1\n나2')
  })

  it('덩어리 사이의 빈 줄 개수가 달라도 각 자리의 빈 줄이 그대로 남는다', () => {
    expect(sortAll('다\n\n\n나\n\n가')).toBe('가\n\n\n나\n\n다')
  })

  it('빈 줄 없이 들여쓰기도 없는 줄들은 한 묶음이라 아무것도 하지 않는다 (줄 정렬 Ctrl+` 를 쓴다)', () => {
    expect(sortAll('다\n나\n가')).toBeNull()
  })

  it('들여쓰기와 빈 줄이 함께 있으면 묶음 사이의 빈 줄은 구분선으로 남는다', () => {
    expect(sortAll('나\n  나1\n\n가\n  가1')).toBe('가\n  가1\n\n나\n  나1')
  })
})

describe('범위와 안전장치', () => {
  it('선택 앞뒤의 빈 줄은 제자리에 남는다', () => {
    expect(sortAll('\n나\n  나1\n가\n\n')).toBe('\n가\n나\n  나1\n\n')
  })

  it('선택에 걸친 줄의 묶음만 정렬하고 나머지는 그대로 둔다', () => {
    const doc = '앞\n나\n  나1\n가\n뒤'
    const start = doc.indexOf('나')
    const end = doc.indexOf('가') + 1
    expect(apply(doc, blockSortEdit(doc, start, end))).toBe('앞\n가\n나\n  나1\n뒤')
  })

  it('정렬한 뒤 그 줄들 전체가 선택된 채로 남는다', () => {
    const value = '나\n  나1\n가'
    const edit = blockSortEdit(value, 0, value.length)
    expect(apply(value, edit).slice(edit.selStart, edit.selEnd)).toBe('가\n나\n  나1')
  })

  it('다음 줄 맨 앞에서 끝나는 선택은 그 다음 줄을 포함하지 않는다', () => {
    const value = '다\n나\n  나1\n가'
    const edit = blockSortEdit(value, 0, '다\n나\n  나1\n'.length)
    expect(apply(value, edit)).toBe('나\n  나1\n다\n가')
  })

  it('선택이 없으면 아무것도 하지 않는다', () => {
    expect(blockSortEdit('나\n가', 1, 1)).toBeNull()
  })

  it('묶음이 하나뿐이면 아무것도 하지 않는다', () => {
    expect(sortAll('나\n  나1\n  나2')).toBeNull()
  })

  it('빈 문서나 빈 줄뿐인 선택은 아무것도 하지 않는다', () => {
    expect(blockSortEdit('', 0, 0)).toBeNull()
    expect(sortAll('\n\n')).toBeNull()
  })

  it('이미 모두 같은 묶음 머리라 바뀔 것이 없으면 아무것도 하지 않는다', () => {
    expect(sortAll('* 가\n* 가')).toBeNull()
  })

  it('코드블록 여는·닫는 줄(```)이 들어 있으면 하지 않는다', () => {
    expect(sortAll('```sql\nb\n  c\na\n```')).toBeNull()
  })

  it('CRLF 문서는 CRLF 를 유지한다', () => {
    expect(sortAll('나\r\n  나1\r\n가\r\n  가1')).toBe('가\r\n  가1\r\n나\r\n  나1')
  })

  it('CRLF 문서에서 마지막 줄바꿈까지 선택해도 줄바꿈이 깨지지 않는다', () => {
    expect(sortAll('나\r\n  나1\r\n가\r\n')).toBe('가\r\n나\r\n  나1\r\n')
  })
})

describe('소스 점검: 편집기에 Ctrl+Shift+` 가 연결됐다', () => {
  const pane = readFileSync(new URL('../../src/components/EditorPane.jsx', import.meta.url), 'utf8')

  it('설정한 묶음 정렬 키(기본 Ctrl+Shift+`, 물리 키 포함)로 blockSortEdit 를 부른다', () => {
    expect(pane).toMatch(/matchesShortcut\(e\.nativeEvent, shortcuts\['line\.blockSort'\]\)[\s\S]{0,200}blockSortEdit\(/)
  })

  it('설정한 줄 정렬 키(기본 Ctrl+`)는 여전히 줄 정렬(sortLinesEdit)이다', () => {
    expect(pane).toMatch(/matchesShortcut\(e\.nativeEvent, shortcuts\['line\.sort'\]\)[\s\S]{0,400}sortLinesEdit\(/)
  })
})
