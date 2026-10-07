import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ensureSnippet, scanSnippets, snippetsDirPath } from '../../electron/fileSystem.js'

// 상용구 단축어의 대소문자 구분. Windows 는 "MYSQL.md" 와 "mysql.md" 를 같은 파일로 취급해서,
// "mysql" 을 등록하면 이미 있던 "MYSQL" 의 파일을 열어 내용을 덮어쓰고 "mysql" 은 목록에
// 나타나지 않았다. 아래는 실제 디스크에 임시 폴더를 만들어 확인한다(Windows 가 아닌 곳에서는
// 충돌 자체가 없어서 이 시험이 원래부터 통과한다 — 이 시험이 버그를 잡는 건 Windows 에서다).
let root

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'gyeoltarae-snippet-case-'))
})

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
})

// 등록: 파일을 만들고 본문을 쓴다(앱의 createSnippetWithContent 와 같은 흐름).
function register(title, content, category = '공통') {
  const file = ensureSnippet(root, category, title)
  fs.writeFileSync(file, content, 'utf-8')
  return file
}

function bodies() {
  return Object.fromEntries(scanSnippets(root).map((e) => [e.title, fs.readFileSync(e.path, 'utf-8')]))
}

describe('대소문자만 다른 상용구 단축어', () => {
  it('MYSQL 과 mysql 을 따로 등록하면 둘 다 남고 본문이 서로 덮어쓰이지 않는다', () => {
    register('MYSQL', '첫째')
    register('mysql', '둘째')

    expect(bodies()).toEqual({ MYSQL: '첫째', mysql: '둘째' })
  })

  it('등록 순서가 반대(mysql 먼저)여도 둘 다 남는다', () => {
    register('mysql', '소문자')
    register('MYSQL', '대문자')

    expect(bodies()).toEqual({ mysql: '소문자', MYSQL: '대문자' })
  })

  it('대소문자 변형이 셋 이상이어도 각각 따로 저장된다', () => {
    register('MYSQL', 'a')
    register('mysql', 'b')
    register('MySQL', 'c')

    expect(bodies()).toEqual({ MYSQL: 'a', mysql: 'b', MySQL: 'c' })
  })

  it('이미 있는 단축어를 다시 등록하면 같은 파일을 쓴다 (대소문자 변형이 있어도 중복 파일이 생기지 않는다)', () => {
    const upper = register('MYSQL', '첫째')
    const lower = register('mysql', '둘째')

    expect(ensureSnippet(root, '공통', 'MYSQL')).toBe(upper)
    expect(ensureSnippet(root, '공통', 'mysql')).toBe(lower)
    expect(scanSnippets(root)).toHaveLength(2)
  })

  it('충돌이 없으면 파일 이름은 단축어 그대로다 (예전 파일과 호환)', () => {
    const file = register('MySQL', '본문')

    expect(path.basename(file)).toBe('MySQL.md')
  })

  it('충돌할 때 새로 만든 파일 이름에는 영문자가 그대로 남지 않고 %XX 표기만 남는다', () => {
    register('MYSQL', 'a')
    const lower = register('mysql', 'b')

    const name = path.basename(lower, '.md')
    expect(name).toBe('%6D%79%73%71%6C')
    // %XX 표기를 걷어내면 아무 글자도 남지 않는다 (16진수의 A~F 는 표기의 일부)
    expect(name.replace(/%[0-9A-F]{2}/g, '')).toBe('')
  })

  it('예전 방식으로 저장된 "MYSQL.md" 가 있는 폴더에 "mysql" 을 새로 등록해도 예전 파일을 덮어쓰지 않는다', () => {
    const legacy = path.join(snippetsDirPath(root), '공통', 'MYSQL.md')
    fs.mkdirSync(path.dirname(legacy), { recursive: true })
    fs.writeFileSync(legacy, '예전 본문', 'utf-8')

    register('mysql', '새 본문')

    expect(bodies()).toEqual({ MYSQL: '예전 본문', mysql: '새 본문' })
  })

  it('영문자 인코딩 이름으로 저장된 단축어를 읽으면 원래 단축어로 돌아온다', () => {
    const encoded = path.join(snippetsDirPath(root), '공통', '%4D%59%53%51%4C.md')
    fs.mkdirSync(path.dirname(encoded), { recursive: true })
    fs.writeFileSync(encoded, '본문', 'utf-8')

    expect(scanSnippets(root).map((e) => e.title)).toEqual(['MYSQL'])
  })

  it('못 쓰는 글자와 대소문자가 같이 있어도 구분되고 원래대로 읽힌다', () => {
    register('A*', 'a')
    register('a*', 'b')

    expect(bodies()).toEqual({ 'A*': 'a', 'a*': 'b' })
  })

  it('한글 단축어와 영문 대소문자 변형이 섞여도 서로 영향이 없다', () => {
    register('오라클', '한글')
    register('ORACLE', '대문자')
    register('oracle', '소문자')
    register('Oracle', '혼합')

    expect(bodies()).toEqual({ 오라클: '한글', ORACLE: '대문자', oracle: '소문자', Oracle: '혼합' })
  })

  it('영문자 아닌 대소문자 글자(É/é)도 구분된다', () => {
    register('é', '소문자')
    register('É', '대문자')

    expect(bodies()).toEqual({ é: '소문자', É: '대문자' })
  })

  it('"%" 가 들어간 단축어가 영문자 인코딩과 섞여도 원래대로 읽힌다', () => {
    register('100%A', 'a')
    register('100%a', 'b')

    expect(bodies()).toEqual({ '100%A': 'a', '100%a': 'b' })
  })

  it('다른 카테고리에서는 같은 대소문자 단축어도 서로 영향이 없다', () => {
    register('MYSQL', '공통쪽', '공통')
    register('mysql', '무협쪽', '무협')

    const byKey = Object.fromEntries(scanSnippets(root).map((e) => [`${e.category}/${e.title}`, fs.readFileSync(e.path, 'utf-8')]))
    expect(byKey).toEqual({ '공통/MYSQL': '공통쪽', '무협/mysql': '무협쪽' })
  })
})
