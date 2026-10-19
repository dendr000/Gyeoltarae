import { describe, expect, it } from 'vitest'
import { highlightCode, resolveCodeLanguage } from '../../src/lib/codeHighlight.js'

describe('resolveCodeLanguage (언어 이름 해석)', () => {
  it('대소문자 구분 없이 같은 언어로 본다 — MySQL / MYSQL / mysql', () => {
    for (const name of ['MySQL', 'MYSQL', 'mysql', 'mYsQl']) {
      expect(resolveCodeLanguage(name)).toEqual({ label: 'MySQL', grammar: 'sql' })
    }
  })

  it('Oracle 은 영문 대소문자와 한글 이름을 모두 받는다', () => {
    for (const name of ['Oracle', 'ORACLE', 'oracle', '오라클']) {
      expect(resolveCodeLanguage(name)).toEqual({ label: 'Oracle', grammar: 'sql' })
    }
  })

  it('요청받은 언어들이 모두 칠할 문법표를 가진다', () => {
    const wanted = [
      'MySQL', 'Oracle', 'PostgreSQL', 'MSSQL', 'MongoDB', 'MariaDB', 'No-SQL', 'JAVA',
      '자바스크립트', '타입스크립트', '파이썬', 'C++',
    ]
    for (const name of wanted) {
      const resolved = resolveCodeLanguage(name)
      expect(resolved?.grammar, name).toBeTruthy()
    }
  })

  it('정식 이름(label)이 윗줄에 보일 이름이다', () => {
    expect(resolveCodeLanguage('JAVA')?.label).toBe('Java')
    expect(resolveCodeLanguage('자바스크립트')?.label).toBe('JavaScript')
    expect(resolveCodeLanguage('타입스크립트')?.label).toBe('TypeScript')
    expect(resolveCodeLanguage('파이썬')?.label).toBe('Python')
    expect(resolveCodeLanguage('No-SQL')?.label).toBe('NoSQL')
    expect(resolveCodeLanguage('postgres')?.label).toBe('PostgreSQL')
  })

  it('PostgreSQL 만 전용 문법표(pgsql)이고 나머지 SQL 계열은 공통 sql 이다', () => {
    expect(resolveCodeLanguage('PostgreSQL')?.grammar).toBe('pgsql')
    for (const name of ['MySQL', 'MariaDB', 'MSSQL', 'Oracle', 'SQLite', 'DBeaver', 'SQL']) {
      expect(resolveCodeLanguage(name)?.grammar, name).toBe('sql')
    }
  })

  it('DBeaver 는 SQL 도구라서 공통 SQL 문법으로 칠하고, 대소문자·한글 이름도 받는다', () => {
    for (const name of ['DBeaver', 'dbeaver', 'DBEAVER', 'D-Beaver', '디비버']) {
      expect(resolveCodeLanguage(name), name).toEqual({ label: 'DBeaver', grammar: 'sql' })
    }
  })

  it('MongoDB·NoSQL 은 자바스크립트 문법으로 칠한다', () => {
    expect(resolveCodeLanguage('MongoDB')?.grammar).toBe('javascript')
    expect(resolveCodeLanguage('NoSQL')?.grammar).toBe('javascript')
  })

  it('공백·하이픈·밑줄·점·슬래시는 무시한다 (No-SQL, node.js, PL/SQL)', () => {
    expect(resolveCodeLanguage('No SQL')?.label).toBe('NoSQL')
    expect(resolveCodeLanguage('no_sql')?.label).toBe('NoSQL')
    expect(resolveCodeLanguage('Node.js')?.label).toBe('JavaScript')
    expect(resolveCodeLanguage('PL/SQL')?.label).toBe('Oracle')
  })

  it('C / C++ / C# 은 서로 다른 언어다', () => {
    expect(resolveCodeLanguage('C')).toEqual({ label: 'C', grammar: 'c' })
    expect(resolveCodeLanguage('c++')).toEqual({ label: 'C++', grammar: 'cpp' })
    expect(resolveCodeLanguage('C#')).toEqual({ label: 'C#', grammar: 'csharp' })
  })

  it('모르는 이름은 적은 그대로 보여 주고 색은 입히지 않는다', () => {
    expect(resolveCodeLanguage('Foobar')).toEqual({ label: 'Foobar', grammar: null })
    expect(resolveCodeLanguage('에스프레소')).toEqual({ label: '에스프레소', grammar: null })
  })

  it('이름이 없으면 null', () => {
    expect(resolveCodeLanguage('')).toBeNull()
    expect(resolveCodeLanguage('   ')).toBeNull()
    expect(resolveCodeLanguage(undefined)).toBeNull()
  })
})

describe('highlightCode (색 입히기)', () => {
  it('SQL 키워드·문자열·숫자에 토큰 클래스가 붙는다', () => {
    const html = highlightCode("SELECT name FROM t WHERE id = 10 AND n = 'a';", 'sql')
    expect(html).toContain('<span class="hljs-keyword">SELECT</span>')
    expect(html).toContain('<span class="hljs-number">10</span>')
    expect(html).toContain('<span class="hljs-string">&#x27;a&#x27;</span>')
  })

  it('소문자 키워드도 칠한다 (SQL 은 대소문자 무관)', () => {
    expect(highlightCode('select 1', 'sql')).toContain('<span class="hljs-keyword">select</span>')
  })

  it('색을 입혀도 태그를 걷어내면 원래 글자와 같다 (복사 버튼이 원본을 복사할 수 있다)', () => {
    const body = "CREATE TABLE mytable(\n  id INT PRIMARY KEY,\n  name VARCHAR(10) -- 이름 <b>&\n);"
    const html = highlightCode(body, 'sql')
    const text = html
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, '&')
    expect(text).toBe(body)
  })

  it('본문의 HTML 은 이스케이프되어 태그로 살아나지 않는다', () => {
    const html = highlightCode('<script>alert(1)</script>', 'javascript')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;')
  })

  it('같은 입력은 같은 결과를 돌려준다 (캐시)', () => {
    const body = 'SELECT 1'
    expect(highlightCode(body, 'sql')).toBe(highlightCode(body, 'sql'))
  })

  it('문법표가 다르면 같은 본문도 다르게 칠한다', () => {
    const body = 'SELECT 1'
    expect(highlightCode(body, 'sql')).toContain('hljs-keyword')
    expect(highlightCode(body, 'python')).not.toContain('<span class="hljs-keyword">SELECT</span>')
  })

  it('빈 본문도 오류 없이 처리한다', () => {
    expect(highlightCode('', 'sql')).toBe('')
  })
})

// 언어 상용구 폴더(C++, Java, HTML, Python 등)와 같은 이름의 코드블록(```C++ 등)이 뷰어에서 그 언어답게 칠해지는지.
describe('언어별 색 입히기 — 코드블록 언어 이름 → 문법표 → 토큰', () => {
  const SAMPLES = [
    { names: ['C++', 'c++', 'cpp', 'CPP', 'C/C++', 'hpp'], label: 'C++', grammar: 'cpp', code: '// 주석\nint main() { return 0; }\n#include <iostream>', tokens: ['hljs-comment', 'hljs-keyword', 'hljs-meta'] },
    { names: ['C', 'c'], label: 'C', grammar: 'c', code: '/* 주석 */\nint x = 1;\n#define A 1', tokens: ['hljs-comment', 'hljs-keyword', 'hljs-meta'] },
    { names: ['Java', 'JAVA', 'java', '자바'], label: 'Java', grammar: 'java', code: '// 주석\npublic class A { String s = "x"; }', tokens: ['hljs-comment', 'hljs-keyword', 'hljs-string'] },
    { names: ['HTML', 'html', 'htm', 'XHTML'], label: 'HTML', grammar: 'xml', code: '<!-- 주석 -->\n<a href="x">링크</a>', tokens: ['hljs-comment', 'hljs-tag', 'hljs-name', 'hljs-attr', 'hljs-string'] },
    { names: ['CSS', 'css'], label: 'CSS', grammar: 'css', code: '/* 주석 */\n.a:hover { color: #fff; margin: 0 auto; }', tokens: ['hljs-comment', 'hljs-selector-class', 'hljs-attribute', 'hljs-number'] },
    { names: ['Python', 'python', 'py', 'PY', '파이썬'], label: 'Python', grammar: 'python', code: '# 주석\ndef f(self):\n    return "x"', tokens: ['hljs-comment', 'hljs-keyword', 'hljs-string'] },
    { names: ['JavaScript', 'js', 'JS', 'mjs'], label: 'JavaScript', grammar: 'javascript', code: '// 주석\nconst a = 1\nfunction f() { return "x" }', tokens: ['hljs-comment', 'hljs-keyword', 'hljs-string', 'hljs-number'] },
    { names: ['TypeScript', 'ts', 'TS'], label: 'TypeScript', grammar: 'typescript', code: '// 주석\nconst a: number = 1\ninterface X {}', tokens: ['hljs-comment', 'hljs-keyword'] },
    { names: ['C#', 'c#', 'csharp', 'cs'], label: 'C#', grammar: 'csharp', code: '// 주석\npublic class A { string s = "x"; }', tokens: ['hljs-comment', 'hljs-keyword', 'hljs-string'] },
    { names: ['Go', 'go', 'golang'], label: 'Go', grammar: 'go', code: '// 주석\nfunc main() { x := "s" }', tokens: ['hljs-comment', 'hljs-keyword', 'hljs-string'] },
    { names: ['Kotlin', 'kt'], label: 'Kotlin', grammar: 'kotlin', code: '// 주석\nfun main() { val x = "s" }', tokens: ['hljs-comment', 'hljs-keyword', 'hljs-string'] },
    { names: ['Rust', 'rs'], label: 'Rust', grammar: 'rust', code: '// 주석\nfn main() { let x = "s"; }', tokens: ['hljs-comment', 'hljs-keyword', 'hljs-string'] },
    { names: ['Swift'], label: 'Swift', grammar: 'swift', code: '// 주석\nfunc f() { let x = "s" }', tokens: ['hljs-comment', 'hljs-keyword', 'hljs-string'] },
    { names: ['PHP', 'php'], label: 'PHP', grammar: 'php', code: '<?php // 주석\n$a = "x"; function f() {}', tokens: ['hljs-comment', 'hljs-keyword', 'hljs-string'] },
    { names: ['Ruby', 'rb'], label: 'Ruby', grammar: 'ruby', code: '# 주석\ndef f\n  "x"\nend', tokens: ['hljs-comment', 'hljs-keyword', 'hljs-string'] },
    { names: ['Bash', 'sh', 'shell'], label: 'Bash', grammar: 'bash', code: '# 주석\nif [ -f x ]; then echo "a"; fi', tokens: ['hljs-comment', 'hljs-keyword', 'hljs-string'] },
  ]

  it.each(SAMPLES)('$label — 이름 변형을 모두 받는다', ({ names, label, grammar }) => {
    for (const name of names) expect(resolveCodeLanguage(name), name).toEqual({ label, grammar })
  })

  it.each(SAMPLES)('$label — 주석·키워드·문자열 같은 토큰에 색 클래스가 붙는다', ({ grammar, code, tokens }) => {
    const html = highlightCode(code, grammar)
    for (const token of tokens) expect(html, token).toContain(token)
  })

  it('HTML 안의 <style> 과 <script> 는 CSS·자바스크립트로 따로 칠한다', () => {
    const html = highlightCode('<style>.a { color: red; }</style><script>const a = 1</script>', 'xml')
    expect(html).toContain('language-css')
    expect(html).toContain('language-javascript')
    expect(html).toContain('hljs-keyword')
  })

  it('C++ 의 클래스 이름과 함수 이름은 title 로 칠한다', () => {
    const html = highlightCode('class Stack { void run() {} };', 'cpp')
    expect(html).toContain('hljs-title')
  })

  it('C 와 C++ 와 C# 이 서로 다른 문법표다', () => {
    expect(new Set(['C', 'C++', 'C#'].map((name) => resolveCodeLanguage(name).grammar)).size).toBe(3)
  })
})
