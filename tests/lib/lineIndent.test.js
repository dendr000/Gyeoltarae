import { describe, expect, it } from 'vitest'
import { indentLinesEdit } from '../../src/lib/lineIndent.js'

// 편집을 적용해서 새 문서와 선택 영역을 돌려주는 도우미. 선택은 [ 와 ] 로, 커서만이면 ^ 로 적는다.
function run(doc, outdent = false) {
  const hasRange = doc.includes('[')
  const selStart = hasRange ? doc.indexOf('[') : doc.indexOf('^')
  const clean = hasRange ? doc.replace('[', '').replace(']', '') : doc.replace('^', '')
  const selEnd = hasRange ? doc.indexOf(']') - 1 : selStart
  const edit = indentLinesEdit(clean, selStart, selEnd, outdent)
  if (!edit) return null
  const next = clean.slice(0, edit.from) + edit.insert + clean.slice(edit.to)
  return { next, selected: next.slice(edit.selStart, edit.selEnd), selStart: edit.selStart, selEnd: edit.selEnd }
}

describe('indentLinesEdit - 들여쓰기(Tab)', () => {
  it('여러 줄에 걸쳐 선택하면 걸친 모든 줄 앞에 공백 4칸을 붙인다', () => {
    const r = run('aa\nb[b\ncc\nd]d\nee')
    expect(r.next).toBe('aa\n    bb\n    cc\n    dd\nee')
  })

  it('선택한 글자는 그대로 선택된 채로 남는다', () => {
    const r = run('aa\nb[b\ncc\nd]d\nee')
    expect(r.selected).toBe('b\n    cc\n    d')
  })

  it('한 줄 안의 선택이나 커서만 있으면 null (평소 Tab 동작)', () => {
    expect(run('a[bc]d')).toBeNull()
    expect(run('abc^')).toBeNull()
  })

  it('빈 줄은 들여쓰지 않는다', () => {
    const r = run('[a\n\nb]')
    expect(r.next).toBe('    a\n\n    b')
  })

  it('줄 전체를 선택해 마지막이 다음 줄 맨 앞이면 그 다음 줄은 건드리지 않는다', () => {
    const r = run('a\n[b\nc\n]d')
    expect(r.next).toBe('a\n    b\n    c\nd')
    // 줄 맨 앞에서 시작한 선택은 시작점이 그대로라서 새로 붙은 들여쓰기까지 포함한다.
    expect(r.selected).toBe('    b\n    c\n')
  })

  it('이미 들여쓴 줄에는 4칸이 더해진다', () => {
    const r = run('[  a\n\tb]')
    expect(r.next).toBe('      a\n    \tb')
  })

  it('문서 맨 앞부터 선택해도 동작한다', () => {
    const r = run('[a\nb]')
    expect(r.next).toBe('    a\n    b')
  })

  it('줄 맨 앞(0번째 칸)에서 시작한 선택은 시작점이 맨 앞에 남는다', () => {
    const r = run('[a\nb]')
    expect(r.selStart).toBe(0)
  })
})

describe('indentLinesEdit - 내어쓰기(Shift+Tab)', () => {
  it('여러 줄에서 앞 공백 최대 4칸씩 지운다', () => {
    const r = run('    a\n  b[b\n      c]c', true)
    // 줄 시작 위치 기준이 아니라 선택이 걸친 줄만 대상: 두 번째, 세 번째 줄
    expect(r.next).toBe('    a\nbb\n  cc')
  })

  it('탭 문자 하나도 지운다', () => {
    const r = run('[\ta\n\tb]', true)
    expect(r.next).toBe('a\nb')
  })

  it('선택이 없어도 현재 줄을 내어쓴다', () => {
    const r = run('x\n    y^\nz', true)
    expect(r.next).toBe('x\ny\nz')
  })

  it('커서가 지워지는 공백 안에 있으면 줄 맨 앞으로 옮겨진다', () => {
    const r = run('  ^  y', true)
    expect(r.selStart).toBe(0)
  })

  it('커서가 글 뒤에 있으면 같은 글자 뒤에 남는다', () => {
    const r = run('    y^', true)
    expect(r.next).toBe('y')
    expect(r.selStart).toBe(1)
  })

  it('지울 공백이 없어도 결과를 돌려준다 (내용은 그대로)', () => {
    const r = run('abc^', true)
    expect(r.next).toBe('abc')
  })

  it('공백이 4칸보다 적으면 있는 만큼만 지운다', () => {
    const r = run('  a^', true)
    expect(r.next).toBe('a')
  })

  it('공백이 4칸보다 많으면 4칸만 지운다', () => {
    const r = run('      a^', true)
    expect(r.next).toBe('  a')
  })
})
