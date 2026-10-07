import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SNIPPET_ORDER_FILE_NAME, scanSnippets, snippetsDirPath } from '../../electron/fileSystem.js'
import { installSnippetPack } from '../../scripts/install-snippet-pack.mjs'
import { SQL_PACK } from '../../scripts/snippet-packs/sql.js'
import { parseSnippetOrder } from '../../src/lib/snippetOrder.js'

describe('SQL 키워드 묶음 데이터', () => {
  const titles = SQL_PACK.entries

  it('폴더 이름은 SQL 이고 제목이 모두 문자열이다', () => {
    expect(SQL_PACK.folder).toBe('SQL')
    expect(titles.length).toBeGreaterThan(0)
    for (const title of titles) expect(typeof title).toBe('string')
  })

  it('요청한 키워드(SELECT, NULL 등)와 자주 쓰는 키워드가 들어 있다', () => {
    for (const keyword of [
      'SELECT', 'NULL', 'NOT NULL', 'IS NULL', 'FROM', 'WHERE', 'INSERT INTO', 'UPDATE', 'DELETE FROM',
      'CREATE TABLE', 'ALTER TABLE', 'PRIMARY KEY', 'FOREIGN KEY', 'AUTO_INCREMENT', 'VARCHAR', 'INT',
      'ORDER BY', 'GROUP BY', 'LEFT JOIN', 'COUNT', 'LIKE', 'BETWEEN',
    ]) {
      expect(titles, keyword).toContain(keyword)
    }
  })

  it('제목이 겹치지 않는다 (대소문자만 다른 것까지 — Windows 에서는 같은 파일이므로)', () => {
    expect(new Set(titles).size).toBe(titles.length)
    expect(new Set(titles.map((t) => t.toLowerCase())).size).toBe(titles.length)
  })

  it('제목은 비어 있지 않고 앞뒤 공백이 없고 Windows 파일 이름에 못 쓰는 글자가 없다', () => {
    // 못 쓰는 글자: < > : " / \ | ? * 와 제어 문자(코드 32 미만). 정규식 대신 글자별로 검사한다.
    const illegal = (ch) => ch.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(ch)
    for (const title of titles) {
      expect(title.length, title).toBeGreaterThan(0)
      expect(title, title).toBe(title.trim())
      expect([...title].filter(illegal), title).toEqual([])
      expect(title, title).not.toMatch(/[. ]$/)
    }
  })

  it('제목은 대문자 키워드다 (소문자로 치면 추천 팝업이 대문자로 바꿔 줌)', () => {
    for (const title of titles) expect(title, title).toBe(title.toUpperCase())
  })

  it('사용자가 이미 가진 상용구 제목(ERD, MYSQL, WORKBENCH, sql)과 겹치지 않는다', () => {
    for (const mine of ['ERD', 'MYSQL', 'WORKBENCH', 'sql', 'SQL']) expect(titles).not.toContain(mine)
  })

  it('개수가 너무 적거나 너무 많지 않다 (사이드바 목록이 터지지 않을 정도)', () => {
    expect(titles.length).toBeGreaterThanOrEqual(100)
    expect(titles.length).toBeLessThanOrEqual(200)
  })
})

describe('SQL 키워드 묶음의 추천 순서(order)', () => {
  const { order, entries } = SQL_PACK

  it('모든 키워드가 정확히 한 번씩 들어 있고 모르는 제목은 없다', () => {
    expect([...order].sort()).toEqual([...entries].sort())
  })

  it('SELECT 가 맨 위고 SET 보다 위다 (s 를 쳤을 때 SELECT 가 먼저 뜨게)', () => {
    expect(order[0]).toBe('SELECT')
    expect(order.indexOf('SELECT')).toBeLessThan(order.indexOf('SET'))
    expect(order.indexOf('SELECT')).toBeLessThan(order.indexOf('SUM'))
  })

  it('FROM, WHERE 같은 기본 절이 앞쪽에 있다', () => {
    for (const keyword of ['FROM', 'WHERE', 'INSERT INTO', 'UPDATE']) {
      expect(order.indexOf(keyword), keyword).toBeLessThan(10)
    }
  })
})

describe('installSnippetPack (설치)', () => {
  let root

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'gyeoltarae-pack-'))
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  const install = (options = {}) =>
    installSnippetPack({
      workspacePath: root,
      folder: SQL_PACK.folder,
      entries: SQL_PACK.entries,
      order: SQL_PACK.order,
      ...options,
    })
  const orderPath = () => path.join(snippetsDirPath(root), 'SQL', SNIPPET_ORDER_FILE_NAME)

  // 설치된 SQL 폴더의 { 제목: 본문 }
  function installed(folder = 'SQL') {
    return Object.fromEntries(
      scanSnippets(root)
        .filter((s) => s.category === folder)
        .map((s) => [s.title, fs.readFileSync(s.path, 'utf-8')]),
    )
  }

  it('묶음의 모든 키워드를 상용구로 만들고, 본문은 제목과 같다', () => {
    const { created, skipped } = install()

    expect(created).toHaveLength(SQL_PACK.entries.length)
    expect(skipped).toEqual([])
    const bodies = installed()
    expect(Object.keys(bodies).sort()).toEqual([...SQL_PACK.entries].sort())
    for (const [title, body] of Object.entries(bodies)) expect(body, title).toBe(title)
  })

  it('띄어쓰기가 든 키워드(ORDER BY, NOT NULL)도 제목 그대로 읽힌다', () => {
    install()
    const bodies = installed()
    expect(bodies['ORDER BY']).toBe('ORDER BY')
    expect(bodies['NOT NULL']).toBe('NOT NULL')
  })

  it('미리보기(dryRun)는 디스크에 아무것도 만들지 않고 만들 개수만 알려 준다', () => {
    const { created } = install({ dryRun: true })

    expect(created).toHaveLength(SQL_PACK.entries.length)
    expect(fs.existsSync(snippetsDirPath(root))).toBe(false)
  })

  it('두 번 실행해도 안전하다 — 두 번째는 전부 건너뛰고 아무것도 바꾸지 않는다', () => {
    install()
    const before = installed()

    const second = install()

    expect(second.created).toEqual([])
    expect(second.skipped).toHaveLength(SQL_PACK.entries.length)
    expect(installed()).toEqual(before)
  })

  it('이미 있는 상용구는 덮어쓰지 않는다 (사용자가 고친 본문이 그대로 남는다)', () => {
    const dir = path.join(snippetsDirPath(root), 'SQL')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'SELECT.md'), '내가 고친 본문', 'utf-8')

    const { created, skipped } = install()

    expect(skipped).toEqual(['SELECT'])
    expect(created).toHaveLength(SQL_PACK.entries.length - 1)
    expect(installed().SELECT).toBe('내가 고친 본문')
  })

  it('폴더 이름의 대소문자만 다른 기존 폴더(sql)에 같은 제목이 있어도 덮어쓰지 않는다', () => {
    const dir = path.join(snippetsDirPath(root), 'sql')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'NULL.md'), '내 NULL', 'utf-8')

    const { skipped } = install()

    expect(skipped).toContain('NULL')
    const all = scanSnippets(root).filter((s) => s.title === 'NULL')
    expect(all.map((s) => fs.readFileSync(s.path, 'utf-8'))).toEqual(['내 NULL'])
  })

  it('다른 폴더의 기존 상용구(영어/MYSQL 등)는 건드리지 않는다', () => {
    const other = path.join(snippetsDirPath(root), '영어')
    fs.mkdirSync(other, { recursive: true })
    fs.writeFileSync(path.join(other, 'MYSQL.md'), 'MySQL', 'utf-8')
    fs.writeFileSync(path.join(other, 'sql.md'), 'SQL', 'utf-8')

    install()

    expect(installed('영어')).toEqual({ MYSQL: 'MySQL' , sql: 'SQL' })
  })

  it('폴더에 순서 목록 파일(_순서.txt)을 만들고, 읽으면 SELECT 가 0번이다', () => {
    const { orderFile } = install()

    expect(orderFile).toBe('created')
    const order = parseSnippetOrder(fs.readFileSync(orderPath(), 'utf-8'))
    expect(order.get('SELECT')).toBe(0)
    expect(order.get('SELECT')).toBeLessThan(order.get('SET'))
    expect(order.size).toBe(SQL_PACK.entries.length)
  })

  it('순서 목록 파일은 상용구 목록에 상용구로 나타나지 않는다', () => {
    install()

    expect(scanSnippets(root)).toHaveLength(SQL_PACK.entries.length)
  })

  it('이미 있는 순서 목록 파일은 덮어쓰지 않는다 (사용자가 고친 순서가 남는다)', () => {
    install()
    fs.writeFileSync(orderPath(), 'SET\nSELECT\n', 'utf-8')

    const second = install()

    expect(second.orderFile).toBe('kept')
    expect(fs.readFileSync(orderPath(), 'utf-8')).toBe('SET\nSELECT\n')
  })

  it('미리보기(dryRun)에서는 순서 목록 파일도 만들지 않는다', () => {
    const { orderFile } = install({ dryRun: true })

    expect(orderFile).toBe('dry-run')
    expect(fs.existsSync(snippetsDirPath(root))).toBe(false)
  })

  it('order 를 안 주면 순서 목록 파일을 만들지 않는다', () => {
    const { orderFile } = install({ order: undefined })

    expect(orderFile).toBe('none')
    expect(fs.existsSync(orderPath())).toBe(false)
  })

  it('상용구를 전부 건너뛰는 두 번째 실행에서 순서 목록 파일이 없으면 새로 만든다', () => {
    install({ order: undefined })

    const second = install()

    expect(second.created).toEqual([])
    expect(second.orderFile).toBe('created')
    expect(fs.existsSync(orderPath())).toBe(true)
  })

  it('{ title, content } 형태의 항목은 본문을 그대로 쓴다', () => {
    installSnippetPack({
      workspacePath: root,
      folder: '샘플',
      entries: ['A', { title: 'B', content: '본문 B{#}' }],
    })

    expect(installed('샘플')).toEqual({ A: 'A', B: '본문 B{#}' })
  })

  it('파일 이름에 못 쓰는 글자가 든 제목(*)도 앱과 같은 규칙으로 저장되고 그대로 읽힌다', () => {
    installSnippetPack({ workspacePath: root, folder: '기호', entries: [{ title: '*', content: '※' }] })

    expect(installed('기호')).toEqual({ '*': '※' })
  })
})
