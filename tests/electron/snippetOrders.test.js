import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SNIPPET_ORDER_FILE_NAME, readSnippetOrders, scanSnippets, snippetsDirPath } from '../../electron/fileSystem.js'
import { SNIPPET_ORDER_FILE } from '../../src/lib/snippetOrder.js'

let root

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'gyeoltarae-orders-'))
})

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
})

function put(category, fileName, content) {
  const dir = path.join(snippetsDirPath(root), category)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, fileName), content, 'utf-8')
}

describe('readSnippetOrders (폴더별 순서 목록 파일 읽기)', () => {
  it('메인 프로세스와 렌더러가 같은 파일 이름을 쓴다', () => {
    expect(SNIPPET_ORDER_FILE_NAME).toBe(SNIPPET_ORDER_FILE)
  })

  it('순서 목록 파일이 있는 폴더만 { 폴더 이름: 글 } 로 돌려준다', () => {
    put('SQL', '_순서.txt', 'SELECT\nFROM\n')
    put('SQL', 'SELECT.md', 'SELECT')
    put('영어', 'ERD.md', 'ERD')

    expect(readSnippetOrders(root)).toEqual({ SQL: 'SELECT\nFROM\n' })
  })

  it('여러 폴더에 있으면 각각 돌려준다', () => {
    put('SQL', '_순서.txt', 'A')
    put('Java', '_순서.txt', 'B')

    expect(readSnippetOrders(root)).toEqual({ SQL: 'A', Java: 'B' })
  })

  it('상용구 폴더가 아예 없으면 빈 객체', () => {
    expect(readSnippetOrders(root)).toEqual({})
  })

  it('순서 목록 파일은 상용구로 취급되지 않는다 (목록에 상용구로 나타나지 않음)', () => {
    put('SQL', '_순서.txt', 'SELECT')
    put('SQL', 'SELECT.md', 'SELECT')

    expect(scanSnippets(root).map((s) => s.title)).toEqual(['SELECT'])
  })

  it('파일 내용은 해석하지 않고 그대로 돌려준다 (BOM·CRLF 포함 — 해석은 렌더러)', () => {
    put('SQL', '_순서.txt', '﻿SELECT\r\nFROM\r\n')

    expect(readSnippetOrders(root).SQL).toBe('﻿SELECT\r\nFROM\r\n')
  })

  it('폴더가 아닌 파일이 상용구 폴더 바로 아래에 있어도 무시한다', () => {
    put('SQL', '_순서.txt', 'A')
    fs.writeFileSync(path.join(snippetsDirPath(root), '_순서.txt'), '엉뚱한 위치', 'utf-8')

    expect(readSnippetOrders(root)).toEqual({ SQL: 'A' })
  })
})
