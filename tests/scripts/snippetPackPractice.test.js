import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { scanSnippets, snippetsDirPath } from '../../electron/fileSystem.js'
import { installSnippetPack } from '../../scripts/install-snippet-pack.mjs'
import { SQL_PACK } from '../../scripts/snippet-packs/sql.js'
import { SQL_PRACTICE_PACK } from '../../scripts/snippet-packs/sql-practice.js'

describe('SQL 학습용 이름 묶음 데이터', () => {
  const titles = SQL_PRACTICE_PACK.entries

  it('SQL 키워드 묶음과 같은 폴더(SQL)에 설치한다', () => {
    expect(SQL_PRACTICE_PACK.folder).toBe(SQL_PACK.folder)
  })

  it('요청한 예(student, STUDENT, name, emp, dept)가 소문자와 대문자로 모두 들어 있다', () => {
    for (const title of ['student', 'STUDENT', 'name', 'NAME', 'emp', 'EMP', 'dept', 'DEPT']) {
      expect(titles, title).toContain(title)
    }
  })

  it('SCOTT 샘플(EMP, DEPT)의 열 이름과 값이 들어 있다', () => {
    for (const title of ['empno', 'EMPNO', 'ename', 'ENAME', 'deptno', 'DEPTNO', 'hiredate', 'sal', 'comm', 'dname', 'loc', 'salgrade']) {
      expect(titles, title).toContain(title)
    }
    for (const title of ['SMITH', 'KING', 'CLERK', 'MANAGER', 'ACCOUNTING', 'NEW YORK']) expect(titles, title).toContain(title)
  })

  it('MySQL 샘플(employees, sakila, world, classicmodels)의 이름이 들어 있다', () => {
    for (const title of ['emp_no', 'dept_emp', 'first_name', 'film_id', 'rental_date', 'CountryCode', 'customerNumber', 'quantityOrdered']) {
      expect(titles, title).toContain(title)
    }
  })

  it('제목이 정확히 같은 것은 없다 (대소문자만 다른 소문자·대문자 쌍은 의도한 것)', () => {
    expect(new Set(titles).size).toBe(titles.length)
  })

  it('SQL 키워드 묶음의 제목과 대소문자 무시로도 겹치지 않는다 (DATE, COUNT, INDEX 등)', () => {
    const keywords = new Set(SQL_PACK.entries.map((title) => title.toLowerCase()))
    for (const title of titles) expect(keywords.has(title.toLowerCase()), title).toBe(false)
  })

  it('제목은 비어 있지 않고 앞뒤 공백이 없고 Windows 파일 이름에 못 쓰는 글자와 예약 이름이 없다', () => {
    const illegal = (ch) => ch.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(ch)
    const reserved = /^(con|prn|aux|nul|com\d|lpt\d)$/i
    for (const title of titles) {
      expect(title.length, title).toBeGreaterThan(0)
      expect(title, title).toBe(title.trim())
      expect([...title].filter(illegal), title).toEqual([])
      expect(title, title).not.toMatch(/[. ]$/)
      expect(title, title).not.toMatch(reserved)
    }
  })

  it('이름(소문자)에는 대문자 짝이 반드시 있다 — 소문자만 있는 이름이 새지 않는다', () => {
    const set = new Set(titles)
    const lowerOnly = titles.filter((t) => t === t.toLowerCase() && t !== t.toUpperCase() && !set.has(t.toUpperCase()))
    expect(lowerOnly).toEqual([])
  })

  it('이모지나 한글 같은 ASCII 가 아닌 글자가 없다', () => {
    for (const title of titles) expect(/^[\x20-\x7e]+$/.test(title), title).toBe(true)
  })

  it('개수가 충분히 많지만 사이드바가 터질 정도는 아니다', () => {
    expect(titles.length).toBeGreaterThanOrEqual(500)
    expect(titles.length).toBeLessThanOrEqual(2000)
  })
})

describe('학습용 이름 묶음 설치', () => {
  // 파일을 천 개 넘게 만들어서(만들 때마다 폴더를 읽는다) 기본 5초로는 모자란다.
  vi.setConfig({ testTimeout: 60000 })
  let root

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'gyeoltarae-practice-'))
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  const installPack = (pack, options = {}) =>
    installSnippetPack({ workspacePath: root, folder: pack.folder, entries: pack.entries, order: pack.order, ...options })

  // 설치된 SQL 폴더의 { 제목: 본문 }
  function installed() {
    return Object.fromEntries(
      scanSnippets(root)
        .filter((s) => s.category === 'SQL')
        .map((s) => [s.title, fs.readFileSync(s.path, 'utf-8')]),
    )
  }

  it('소문자와 대문자 짝이 서로 덮어쓰지 않고 각각 저장되며, 본문은 제목과 같다', () => {
    const { created, skipped } = installPack(SQL_PRACTICE_PACK)

    expect(created).toHaveLength(SQL_PRACTICE_PACK.entries.length)
    expect(skipped).toEqual([])
    const bodies = installed()
    expect(Object.keys(bodies).sort()).toEqual([...SQL_PRACTICE_PACK.entries].sort())
    for (const [title, body] of Object.entries(bodies)) expect(body, title).toBe(title)
    expect(bodies.student).toBe('student')
    expect(bodies.STUDENT).toBe('STUDENT')
  })

  it('SQL 키워드 묶음 위에 설치해도 키워드는 그대로이고 두 번째 실행은 전부 건너뛴다', () => {
    installPack(SQL_PACK)
    const keywordsBefore = Object.fromEntries(Object.entries(installed()).filter(([title]) => SQL_PACK.entries.includes(title)))

    const first = installPack(SQL_PRACTICE_PACK)
    const second = installPack(SQL_PRACTICE_PACK)

    expect(first.created).toHaveLength(SQL_PRACTICE_PACK.entries.length)
    expect(second.created).toEqual([])
    expect(second.skipped).toHaveLength(SQL_PRACTICE_PACK.entries.length)
    const all = installed()
    for (const [title, body] of Object.entries(keywordsBefore)) expect(all[title], title).toBe(body)
    expect(Object.keys(all)).toHaveLength(SQL_PACK.entries.length + SQL_PRACTICE_PACK.entries.length)
  })

  it('이미 사용자가 고쳐 둔 상용구(emp)는 덮어쓰지 않는다', () => {
    const dir = path.join(snippetsDirPath(root), 'SQL')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'emp.md'), '내 emp', 'utf-8')

    const { skipped } = installPack(SQL_PRACTICE_PACK)

    expect(skipped).toEqual(['emp'])
    const bodies = installed()
    expect(bodies.emp).toBe('내 emp')
    expect(bodies.EMP).toBe('EMP')
  })

  it('순서 목록(_순서.txt)을 새로 만들지 않고, 이미 있는 것도 건드리지 않는다', () => {
    installPack(SQL_PACK)
    const orderPath = path.join(snippetsDirPath(root), 'SQL', '_순서.txt')
    const before = fs.readFileSync(orderPath, 'utf-8')

    const { orderFile } = installPack(SQL_PRACTICE_PACK)

    expect(orderFile).toBe('none')
    expect(fs.readFileSync(orderPath, 'utf-8')).toBe(before)
  })
})
