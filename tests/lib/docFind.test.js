// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { findAllMatches, findKeyAction, isMatchCurrent, nearestMatchIndex, offsetToLineColumn, replaceAllEdit } from '../../src/lib/docFind.js'

// 문서 찾기·바꾸기(Ctrl+F / Ctrl+Shift+F)의 규칙. 찾을 내용·바꿀 내용에 줄바꿈을 넣을 수 있다(Shift+Enter, 여러 줄 붙여 넣기).
// 화면(textarea)과 분리한 순수 함수라서 시험할 수 있다. 편집창의 글(textarea.value)은 줄바꿈이 항상 "\n" 하나다.

const apply = (text, edit) => text.slice(0, edit.from) + edit.insert + text.slice(edit.to)

describe('findAllMatches', () => {
  it('대소문자를 구분하지 않고 겹치지 않게 앞에서부터 센다', () => {
    expect(findAllMatches('Abc abc ABC', 'abc')).toEqual([
      { start: 0, end: 3 },
      { start: 4, end: 7 },
      { start: 8, end: 11 },
    ])
    expect(findAllMatches('aaa', 'aa')).toEqual([{ start: 0, end: 2 }])
  })

  it('빈 찾기 글이면 아무것도 찾지 않는다', () => {
    expect(findAllMatches('abc', '')).toEqual([])
  })

  it('정규식 특수문자도 그냥 글자로 찾는다', () => {
    expect(findAllMatches('a.b a*b (x)', '.')).toEqual([{ start: 1, end: 2 }])
    expect(findAllMatches('a.b a*b (x)', '(x)')).toEqual([{ start: 8, end: 11 }])
  })

  it('줄바꿈 하나(\\n)를 찾는다', () => {
    expect(findAllMatches('가\n나\n다', '\n')).toEqual([
      { start: 1, end: 2 },
      { start: 3, end: 4 },
    ])
  })

  it('여러 줄짜리 글을 한 덩어리로 찾는다', () => {
    expect(findAllMatches('앞\n가\n나\n뒤\n가\n다', '가\n나')).toEqual([{ start: 2, end: 5 }])
  })

  it('줄바꿈이 들어 있어도 대소문자는 구분하지 않는다', () => {
    expect(findAllMatches('Hello\nWorld', 'hello\nworld')).toEqual([{ start: 0, end: 11 }])
  })

  it('빈 줄(\\n\\n)만 찾는다 — 한 줄바꿈과 구별된다', () => {
    expect(findAllMatches('가\n\n나\n다', '\n\n')).toEqual([{ start: 1, end: 3 }])
  })

  it('문서에 글자 그대로 적힌 백슬래시+n(\\n 두 글자)은 줄바꿈과 다르다', () => {
    const text = 'printf("\\n");\n끝'
    expect(findAllMatches(text, '\n')).toEqual([{ start: 13, end: 14 }]) // 진짜 줄바꿈만
    expect(findAllMatches(text, '\\n')).toEqual([{ start: 8, end: 10 }]) // 글자 \n 만
  })

  it('찾은 범위의 길이는 찾을 글의 길이와 같다 (줄바꿈 포함)', () => {
    const [match] = findAllMatches('x\ny\nz', 'x\ny')
    expect(match.end - match.start).toBe('x\ny'.length)
  })
})

describe('nearestMatchIndex', () => {
  const matches = [{ start: 2 }, { start: 10 }, { start: 20 }]

  it('커서 바로 뒤(또는 그 자리)의 첫 매치를 고른다', () => {
    expect(nearestMatchIndex(matches, 0)).toBe(0)
    expect(nearestMatchIndex(matches, 2)).toBe(0)
    expect(nearestMatchIndex(matches, 3)).toBe(1)
    expect(nearestMatchIndex(matches, 20)).toBe(2)
  })

  it('전부 커서보다 앞이면 처음으로 돌아간다', () => {
    expect(nearestMatchIndex(matches, 21)).toBe(0)
  })

  it('매치가 없으면 -1 이다', () => {
    expect(nearestMatchIndex([], 5)).toBe(-1)
  })
})

describe('replaceAllEdit: 모두 바꾸기를 한 번의 편집으로', () => {
  it('찾은 곳 전부를 바꾼 결과를 하나의 { from, to, insert } 로 돌려준다', () => {
    const text = 'a-b-c'
    const matches = findAllMatches(text, '-')
    const edit = replaceAllEdit(text, matches, '+')
    expect(apply(text, edit)).toBe('a+b+c')
  })

  it('첫 매치의 시작부터 마지막 매치의 끝까지만 바꾼다 (앞뒤 글은 건드리지 않는다)', () => {
    const text = '앞글 x 가운데 x 뒷글'
    const edit = replaceAllEdit(text, findAllMatches(text, 'x'), 'Y')
    expect(edit.from).toBe(text.indexOf('x'))
    expect(edit.to).toBe(text.lastIndexOf('x') + 1)
    expect(apply(text, edit)).toBe('앞글 Y 가운데 Y 뒷글')
  })

  it('매치 사이의 글은 그대로 남는다', () => {
    const text = 'x1x22x333x'
    expect(apply(text, replaceAllEdit(text, findAllMatches(text, 'x'), ''))).toBe('122333')
  })

  it('줄바꿈을 줄바꿈 아닌 글로, 글을 줄바꿈으로 바꾼다', () => {
    const text = '가\n나\n다'
    expect(apply(text, replaceAllEdit(text, findAllMatches(text, '\n'), ', '))).toBe('가, 나, 다')
    const csv = '가, 나, 다'
    expect(apply(csv, replaceAllEdit(csv, findAllMatches(csv, ', '), '\n'))).toBe('가\n나\n다')
  })

  it('빈 줄을 한 줄로 줄인다 (\\n\\n -> \\n)', () => {
    const text = '가\n\n나\n\n다'
    expect(apply(text, replaceAllEdit(text, findAllMatches(text, '\n\n'), '\n'))).toBe('가\n나\n다')
  })

  it('여러 줄짜리 바꿀 글도 된다', () => {
    const text = '[A]와 [A]'
    expect(apply(text, replaceAllEdit(text, findAllMatches(text, '[A]'), '첫째\n둘째'))).toBe('첫째\n둘째와 첫째\n둘째')
  })

  it('바꿀 글이 찾는 글을 포함해도(a -> aa) 무한 반복하지 않고 한 번씩만 바꾼다', () => {
    const text = 'a-a'
    expect(apply(text, replaceAllEdit(text, findAllMatches(text, 'a'), 'aa'))).toBe('aa-aa')
  })

  it('매치가 하나뿐이어도 된다', () => {
    const text = '가나다'
    expect(apply(text, replaceAllEdit(text, findAllMatches(text, '나'), '!'))).toBe('가!다')
  })

  it('매치가 없으면 null 이다', () => {
    expect(replaceAllEdit('abc', [], 'x')).toBeNull()
  })

  it('JavaScript 의 split/join 과 같은 결과다 (큰 문서)', () => {
    const text = Array.from({ length: 2000 }, (_, i) => `줄 ${i}`).join('\n')
    const edit = replaceAllEdit(text, findAllMatches(text, '\n'), ' / ')
    expect(apply(text, edit)).toBe(text.split('\n').join(' / '))
  })
})

describe('offsetToLineColumn: 글 위치 -> (줄, 줄 안 위치)', () => {
  const text = '가나\n\n다라마\n끝'

  it('맨 앞은 0줄 0칸이다', () => {
    expect(offsetToLineColumn(text, 0)).toEqual({ line: 0, column: 0 })
  })

  it('같은 줄 안에서는 칸만 늘어난다', () => {
    expect(offsetToLineColumn(text, 1)).toEqual({ line: 0, column: 1 })
    expect(offsetToLineColumn(text, 2)).toEqual({ line: 0, column: 2 }) // 줄 끝(줄바꿈 바로 앞)
  })

  it('줄바꿈 바로 뒤는 다음 줄의 0칸이다', () => {
    expect(offsetToLineColumn(text, 3)).toEqual({ line: 1, column: 0 }) // 빈 줄
    expect(offsetToLineColumn(text, 4)).toEqual({ line: 2, column: 0 })
  })

  it('여러 줄에 걸쳐서도 센다', () => {
    expect(offsetToLineColumn(text, 6)).toEqual({ line: 2, column: 2 })
    expect(offsetToLineColumn(text, 8)).toEqual({ line: 3, column: 0 })
  })

  it('글의 맨 끝(길이와 같은 위치)도 된다', () => {
    expect(offsetToLineColumn(text, text.length)).toEqual({ line: 3, column: 1 })
    expect(offsetToLineColumn('', 0)).toEqual({ line: 0, column: 0 })
    expect(offsetToLineColumn('끝\n', 2)).toEqual({ line: 1, column: 0 })
  })
})

describe('isMatchCurrent: 표시하려는 매치가 아직 그 자리에 있는지', () => {
  it('그 자리의 글이 찾는 글과 같으면(대소문자 무시) 참이다', () => {
    expect(isMatchCurrent('xx Abc yy', { start: 3, end: 6 }, 'abc')).toBe(true)
  })

  it('줄바꿈이 든 매치도 같은 방식이다', () => {
    expect(isMatchCurrent('가\n나', { start: 0, end: 3 }, '가\n나')).toBe(true)
  })

  it('글이 바뀌어 그 자리가 달라졌으면 거짓이다 (낡은 표시를 남기지 않는다)', () => {
    expect(isMatchCurrent('xx abd yy', { start: 3, end: 6 }, 'abc')).toBe(false)
    expect(isMatchCurrent('짧음', { start: 3, end: 6 }, 'abc')).toBe(false)
  })

  it('매치나 찾는 글이 없으면 거짓이다', () => {
    expect(isMatchCurrent('abc', undefined, 'abc')).toBe(false)
    expect(isMatchCurrent('abc', { start: 0, end: 3 }, '')).toBe(false)
  })
})

describe('findKeyAction: 찾기 바 입력칸의 키', () => {
  const key = (over) => ({ key: 'Enter', shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, isComposing: false, ...over })

  it('찾기 칸: Enter 는 다음 찾기', () => {
    expect(findKeyAction(key({}), 'query')).toBe('next')
  })

  it('찾기 칸: Shift+Enter 는 줄바꿈 입력 (기본 동작을 그대로 둔다)', () => {
    expect(findKeyAction(key({ shiftKey: true }), 'query')).toBe('newline')
  })

  it('찾기 칸: 이전 찾기는 Ctrl+Enter 와 Shift+F3, 다음 찾기는 F3 도 된다', () => {
    expect(findKeyAction(key({ ctrlKey: true }), 'query')).toBe('prev')
    expect(findKeyAction(key({ metaKey: true }), 'query')).toBe('prev')
    expect(findKeyAction(key({ key: 'F3' }), 'query')).toBe('next')
    expect(findKeyAction(key({ key: 'F3', shiftKey: true }), 'query')).toBe('prev')
  })

  it('바꿀 내용 칸: Enter 는 하나 바꾸기, Shift+Enter 는 줄바꿈 입력', () => {
    expect(findKeyAction(key({}), 'replace')).toBe('replaceOne')
    expect(findKeyAction(key({ shiftKey: true }), 'replace')).toBe('newline')
  })

  it('바꿀 내용 칸에서는 Ctrl+Enter·F3 가 아무 일도 하지 않는다 (null)', () => {
    expect(findKeyAction(key({ ctrlKey: true }), 'replace')).toBeNull()
    expect(findKeyAction(key({ key: 'F3' }), 'replace')).toBeNull()
  })

  it('두 칸 모두 Esc 는 닫기', () => {
    expect(findKeyAction(key({ key: 'Escape' }), 'query')).toBe('close')
    expect(findKeyAction(key({ key: 'Escape' }), 'replace')).toBe('close')
  })

  it('한글 조합 중(글자 확정)의 Enter 와 Esc 는 가로채지 않는다 (null)', () => {
    expect(findKeyAction(key({ isComposing: true }), 'query')).toBeNull()
    expect(findKeyAction(key({ isComposing: true }), 'replace')).toBeNull()
    expect(findKeyAction(key({ key: 'Escape', isComposing: true }), 'query')).toBeNull()
  })

  it('Alt 가 같이 눌린 Enter·여러 보조키 조합과 다른 키는 아무 일도 하지 않는다 (null)', () => {
    expect(findKeyAction(key({ altKey: true }), 'query')).toBeNull()
    expect(findKeyAction(key({ ctrlKey: true, shiftKey: true }), 'query')).toBeNull()
    expect(findKeyAction(key({ key: 'a' }), 'query')).toBeNull()
    expect(findKeyAction(key({ key: 'Tab' }), 'replace')).toBeNull()
  })
})

describe('소스 점검: 찾기 바와 편집기 연결', () => {
  const read = (relative) => readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8')
  const bar = read('src/components/FindReplaceBar.jsx')
  const pane = read('src/components/EditorPane.jsx')

  it('찾기·바꾸기 칸이 여러 줄을 받는 textarea(늘어나는 입력칸)이고 한 줄 input 은 없다', () => {
    expect((bar.match(/<textarea/g) ?? []).length).toBe(1) // 늘어나는 입력칸 하나를
    expect((bar.match(/<GrowingInput/g) ?? []).length).toBe(2) // 찾기 칸과 바꿀 내용 칸이 함께 쓴다
    expect(bar).not.toMatch(/<input[^>]*type="text"/)
  })

  it('키 처리는 findKeyAction 으로 한다 (찾기 칸·바꾸기 칸)', () => {
    expect(bar).toMatch(/findKeyAction\(e\.nativeEvent, field\)/)
    expect(bar).toMatch(/handleKey\('query'/)
    expect(bar).toMatch(/handleKey\('replace'/)
  })

  it('줄바꿈(newline) 동작은 기본 동작을 막지 않는다 (preventDefault 를 부르지 않는다)', () => {
    expect(bar).toMatch(/action === 'newline'\) return/)
  })

  it('이전 찾기 단추의 안내에 새 단축키가 적혀 있다', () => {
    expect(bar).toContain('이전 (Ctrl+Enter 또는 Shift+F3)')
    expect(bar).toContain('다음 (Enter 또는 F3)')
  })

  it('입력칸 안내 글에 Shift+Enter 줄바꿈이 적혀 있다', () => {
    expect((bar.match(/Shift\+Enter: 줄바꿈/g) ?? []).length).toBe(2)
  })

  // 찾기 칸에서 글을 치면 첫 글자에서 편집기로 포커스가 넘어가 다음 글자가 문서의 선택된 글을 덮어쓰던 문제(2026-10-15 발견)의 회귀 방지.
  // 찾은 글은 편집기에 포커스를 주지 않고, 편집기 뒤쪽 표시층에 칠한다(포커스가 없는 입력칸은 선택 색이 그려지지 않는다).
  it('selectFindMatch 는 편집기로 포커스를 옮기지 않는다 (찾기 칸에서 계속 칠 수 있게)', () => {
    const body = pane.slice(pane.indexOf('function selectFindMatch'), pane.indexOf('function openFindBar'))
    expect(body).toContain('setSelectionRange(match.start, match.end)')
    expect(body).not.toMatch(/\.focus\(\)/)
  })

  it('찾은 글은 편집기 뒤쪽 표시층에 칠하고(CSS 사용자 지정 강조), 찾기 바를 닫으면 지운다', () => {
    expect(pane).toMatch(/CSS\.highlights\.set\('find-current'/)
    expect(pane).toMatch(/CSS\.highlights\.delete\('find-current'\)/)
    expect(read('src/App.css')).toMatch(/::highlight\(find-current\)\s*\{[^}]*background/)
  })

  it('바꾸기(하나·모두) 뒤에 포커스를 원래 입력칸으로 돌려 놓는다 (Enter 를 거듭 눌러도 문서에 줄바꿈이 들어가지 않게)', () => {
    expect((pane.match(/restoreFocus\(/g) ?? []).length).toBeGreaterThanOrEqual(3) // 정의 1 + 하나 바꾸기 + 모두 바꾸기
  })

  it('편집기가 찾기 계산을 docFind.js 에서 가져오고 모두 바꾸기를 한 번의 편집(replaceAllEdit)으로 한다', () => {
    expect(pane).toContain("from '../lib/docFind.js'")
    expect(pane).toMatch(/replaceAllEdit\(textarea\.value, findBar\.matches, findBar\.replaceQuery\)/)
    expect(pane).not.toMatch(/function findAllMatches/)
  })
})
