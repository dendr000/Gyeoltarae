import { describe, expect, it } from 'vitest'
import { commentSyntaxFor, toggleCommentEdit } from '../../src/lib/codeComment.js'

const F = '```'

// 편집을 적용한다. 선택은 [ 와 ], 커서만이면 ^ 로 적는다.
function run(doc) {
  const hasRange = doc.includes('[')
  const selStart = hasRange ? doc.indexOf('[') : doc.indexOf('^')
  const clean = hasRange ? doc.replace('[', '').replace(']', '') : doc.replace('^', '')
  const selEnd = hasRange ? doc.indexOf(']') - 1 : selStart
  const edit = toggleCommentEdit(clean, selStart, selEnd)
  if (!edit) return null
  const next = clean.slice(0, edit.from) + edit.insert + clean.slice(edit.to)
  return { next, selected: next.slice(edit.selStart, edit.selEnd), selStart: edit.selStart, selEnd: edit.selEnd }
}

const sql = (body) => `${F}sql\n${body}\n${F}`

describe('commentSyntaxFor (언어별 주석 기호)', () => {
  it('SQL 계열은 --, 슬래시 계열은 //, 해시 계열은 #', () => {
    for (const n of ['sql', 'MySQL', 'oracle', 'DBeaver', 'PostgreSQL']) expect(commentSyntaxFor(n).open, n).toBe('-- ')
    for (const n of ['js', 'java', 'c++', 'C#', 'go', '자바스크립트']) expect(commentSyntaxFor(n).open, n).toBe('// ')
    for (const n of ['python', 'bash', 'yaml', 'dockerfile']) expect(commentSyntaxFor(n).open, n).toBe('# ')
  })

  it('CSS 와 HTML/XML 은 줄마다 감싸는 방식', () => {
    expect(commentSyntaxFor('css')).toEqual({ open: '/* ', close: ' */' })
    expect(commentSyntaxFor('html')).toEqual({ open: '<!-- ', close: ' -->' })
  })

  it('언어를 안 적었거나 모르는 이름이면 SQL 주석(--)', () => {
    expect(commentSyntaxFor('').open).toBe('-- ')
    expect(commentSyntaxFor('엉뚱한이름').open).toBe('-- ')
  })

  it('주석이 없는 형식(json, markdown, diff)은 null', () => {
    for (const n of ['json', 'markdown', 'diff']) expect(commentSyntaxFor(n), n).toBeNull()
  })
})

describe('toggleCommentEdit - 주석 처리', () => {
  it('커서가 있는 한 줄을 주석 처리한다', () => {
    expect(run(sql('SELECT 1^;')).next).toBe(sql('-- SELECT 1;'))
  })

  it('다시 누르면 주석이 풀린다', () => {
    expect(run(sql('-- SELECT 1^;')).next).toBe(sql('SELECT 1;'))
  })

  it('여러 줄을 선택하면 걸친 줄 전체를 같이 주석 처리한다', () => {
    const r = run(sql('SELECT a[,\n  b,\n  c]\nFROM t;'))
    expect(r.next).toBe(sql('-- SELECT a,\n--   b,\n--   c\nFROM t;'))
  })

  it('여러 줄을 같이 풀 수 있다', () => {
    const r = run(sql('-- SELECT [a,\n--   b,\n--   c]\nFROM t;'))
    expect(r.next).toBe(sql('SELECT a,\n  b,\n  c\nFROM t;'))
  })

  it('일부만 주석인 줄들을 선택하면 전부 주석 처리한다 (이미 주석인 줄은 한 번 더 감싼다)', () => {
    const r = run(sql('[-- a\nb]'))
    expect(r.next).toBe(sql('-- -- a\n-- b'))
  })

  it('주석 기호는 선택한 줄들의 가장 얕은 들여쓰기 칸에 넣는다', () => {
    const r = run(sql('[  a\n    b]'))
    expect(r.next).toBe(sql('  -- a\n  --   b'))
  })

  it('들여쓴 줄을 풀면 들여쓰기는 그대로 남는다', () => {
    expect(run(sql('  -- a^')).next).toBe(sql('  a'))
  })

  it('빈 줄은 건드리지 않고, 있어도 나머지가 주석 처리된다', () => {
    expect(run(sql('[a\n\nb]')).next).toBe(sql('-- a\n\n-- b'))
    expect(run(sql('[-- a\n\n-- b]')).next).toBe(sql('a\n\nb'))
  })

  it('주석 기호 뒤 공백이 없는 줄(--x)도 풀린다', () => {
    expect(run(sql('--x^')).next).toBe(sql('x'))
  })

  it('줄 전체를 선택해 다음 줄 맨 앞에서 끝나면 그 다음 줄은 건드리지 않는다', () => {
    const r = run(sql('[a\nb\n]c'))
    expect(r.next).toBe(sql('-- a\n-- b\nc'))
  })

  it('언어별 기호: JavaScript 는 //, Python 은 #', () => {
    expect(run(`${F}js\nlet a^\n${F}`).next).toBe(`${F}js\n// let a\n${F}`)
    expect(run(`${F}python\nx = 1^\n${F}`).next).toBe(`${F}python\n# x = 1\n${F}`)
  })

  it('언어가 없는 코드블록은 SQL 주석', () => {
    expect(run(`${F}\nx^\n${F}`).next).toBe(`${F}\n-- x\n${F}`)
  })

  it('CSS 는 줄마다 /* */ 로 감싸고 풀 수 있다', () => {
    const doc = `${F}css\ncolor: red;^\n${F}`
    const once = run(doc).next
    expect(once).toBe(`${F}css\n/* color: red; */\n${F}`)
    expect(run(once.replace('color', '^color')).next).toBe(doc.replace('^', ''))
  })

  it('HTML 은 <!-- --> 로 감싼다', () => {
    expect(run(`${F}html\n<p>a</p>^\n${F}`).next).toBe(`${F}html\n<!-- <p>a</p> -->\n${F}`)
  })
})

describe('toggleCommentEdit - 선택 위치', () => {
  it('선택은 같은 글자를 계속 선택하고, 새 주석 기호까지 포함해 선택한다', () => {
    const r = run(sql('[a\nb]'))
    expect(r.selected).toBe('-- a\n-- b')
  })

  it('커서만 있으면 커서는 같은 글자 뒤에 남는다', () => {
    const r = run(sql('SEL^ECT'))
    expect(r.next).toBe(sql('-- SELECT'))
    expect(r.next.slice(0, r.selStart)).toBe(`${F}sql\n-- SEL`)
  })

  it('줄 맨 앞에 있던 커서는 주석 기호 뒤로 간다', () => {
    const r = run(sql('^a'))
    expect(r.next.slice(r.selStart, r.selStart + 1)).toBe('a')
  })

  it('풀 때 커서가 주석 기호 안에 있으면 줄의 글 앞으로 모인다', () => {
    const r = run(sql('-^- a'))
    expect(r.next).toBe(sql('a'))
    expect(r.next.slice(r.selStart, r.selStart + 1)).toBe('a')
  })
})

describe('toggleCommentEdit - 동작하지 않는 경우', () => {
  it('코드블록 밖이면 null', () => {
    expect(run('그냥 글^')).toBeNull()
    expect(run(`${F}sql\na\n${F}\n밖의 글^`)).toBeNull()
  })

  it('``` 줄에 걸치면 null', () => {
    expect(run(`${F}sql\n[a\n${F}]`)).toBeNull()
    expect(run(`${F}sql\na\n${F}\n[b\n${F}js\nc]\n${F}`)).toBeNull()
  })

  it('주석이 없는 형식이면 null', () => {
    expect(run(`${F}json\n{}^\n${F}`)).toBeNull()
  })

  it('비어 있지 않은 줄이 없으면 null', () => {
    expect(run(sql('^'))).toBeNull()
  })
})
