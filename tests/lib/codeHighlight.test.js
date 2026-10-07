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
    for (const name of ['MySQL', 'MariaDB', 'MSSQL', 'Oracle', 'SQLite', 'SQL']) {
      expect(resolveCodeLanguage(name)?.grammar, name).toBe('sql')
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
