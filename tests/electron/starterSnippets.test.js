// Copyright (c) dendr000. MIT License.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SNIPPETS_DIR_NAME, scanSnippets } from '../../electron/fileSystem.js'
import { ensureStarterCommands, installStarterCommands, normalizeOffered, workspaceKey } from '../../electron/starterSnippets.js'
import { COMMANDS_PACK } from '../../shared/commandsPack.js'

// 새 워크스페이스를 처음 열 때 슬래시 명령을 자동으로 넣는 규칙. 실제 폴더(임시)에 만들어 확인한다.
const read = (relative) => readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8')

let root
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'gyeol-starter-'))
})
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
})

function workspace(name = 'ws') {
  const dir = path.join(root, name)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

describe('installStarterCommands', () => {
  it('묶음의 상용구를 전부 `명령` 폴더에 만들고 개수를 돌려준다', () => {
    const ws = workspace()
    expect(installStarterCommands(ws)).toBe(COMMANDS_PACK.entries.length)
    const snippets = scanSnippets(ws)
    expect(snippets).toHaveLength(COMMANDS_PACK.entries.length)
    expect(new Set(snippets.map((s) => s.category))).toEqual(new Set(['명령']))
    expect(snippets.map((s) => s.title)).toContain('/접기')
  })

  it('본문이 묶음 그대로 들어간다', () => {
    const ws = workspace()
    installStarterCommands(ws)
    const entry = COMMANDS_PACK.entries.find((e) => e.title === '/접기')
    const snippet = scanSnippets(ws).find((s) => s.title === '/접기')
    expect(fs.readFileSync(snippet.path, 'utf-8')).toBe(entry.content)
  })

  it('추천 순서 파일(_순서.txt)도 만든다', () => {
    const ws = workspace()
    installStarterCommands(ws)
    const orderPath = path.join(ws, SNIPPETS_DIR_NAME, '명령', '_순서.txt')
    const text = fs.readFileSync(orderPath, 'utf-8')
    expect(text.startsWith('#')).toBe(true)
    for (const title of COMMANDS_PACK.order) expect(text).toContain(title)
  })

  it('이미 있는 순서 파일은 덮어쓰지 않는다', () => {
    const ws = workspace()
    const dir = path.join(ws, SNIPPETS_DIR_NAME, '명령')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, '_순서.txt'), '내가 고친 순서\n', 'utf-8')
    installStarterCommands(ws)
    expect(fs.readFileSync(path.join(dir, '_순서.txt'), 'utf-8')).toBe('내가 고친 순서\n')
  })
})

describe('workspaceKey / normalizeOffered', () => {
  it('같은 폴더를 다른 모양으로 써도 같은 키다', () => {
    const ws = workspace()
    expect(workspaceKey(ws)).toBe(workspaceKey(path.join(ws, '.', 'x', '..')))
  })

  it('윈도에서는 대소문자만 다른 경로도 같은 키다 (윈도는 폴더 이름의 대소문자를 구분하지 않음)', () => {
    const ws = workspace('CaseTest')
    if (process.platform === 'win32') expect(workspaceKey(ws.toUpperCase())).toBe(workspaceKey(ws.toLowerCase()))
    else expect(workspaceKey(ws.toUpperCase())).not.toBe(workspaceKey(ws.toLowerCase()))
  })

  it('다른 폴더는 다른 키다', () => {
    expect(workspaceKey(workspace('a'))).not.toBe(workspaceKey(workspace('b')))
  })

  it('배열이 아니거나 이상한 값이 섞여도 문자열만 남긴다', () => {
    expect(normalizeOffered(undefined)).toEqual([])
    expect(normalizeOffered(null)).toEqual([])
    expect(normalizeOffered('x')).toEqual([])
    expect(normalizeOffered({ a: 1 })).toEqual([])
    expect(normalizeOffered(['a', 1, null, 'b'])).toEqual(['a', 'b'])
  })
})

describe('ensureStarterCommands', () => {
  it('상용구 폴더가 없는 새 워크스페이스에는 명령을 넣고 기록한다', () => {
    const ws = workspace()
    const result = ensureStarterCommands(ws, undefined)
    expect(result.installed).toBe(true)
    expect(result.changed).toBe(true)
    expect(result.offered).toEqual([workspaceKey(ws)])
    expect(scanSnippets(ws)).toHaveLength(COMMANDS_PACK.entries.length)
  })

  it('이미 상용구 폴더가 있는 워크스페이스는 건드리지 않고 확인한 것으로 기록만 한다', () => {
    const ws = workspace()
    const dir = path.join(ws, SNIPPETS_DIR_NAME, '내 폴더')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, '내것.md'), '내 상용구', 'utf-8')
    const result = ensureStarterCommands(ws, [])
    expect(result.installed).toBe(false)
    expect(result.changed).toBe(true)
    expect(result.offered).toEqual([workspaceKey(ws)])
    expect(scanSnippets(ws).map((s) => s.category)).toEqual(['내 폴더'])
  })

  it('빈 상용구 폴더(.wikidesk-snippets)만 있어도 건드리지 않는다', () => {
    const ws = workspace()
    fs.mkdirSync(path.join(ws, SNIPPETS_DIR_NAME))
    expect(ensureStarterCommands(ws, []).installed).toBe(false)
    expect(scanSnippets(ws)).toHaveLength(0)
  })

  it('이미 확인한 워크스페이스는 다시 넣지 않는다 (넣은 뒤 사용자가 지웠어도 되살리지 않음)', () => {
    const ws = workspace()
    const first = ensureStarterCommands(ws, [])
    fs.rmSync(path.join(ws, SNIPPETS_DIR_NAME), { recursive: true, force: true })
    const second = ensureStarterCommands(ws, first.offered)
    expect(second.installed).toBe(false)
    expect(second.changed).toBe(false)
    expect(second.offered).toEqual(first.offered)
    expect(fs.existsSync(path.join(ws, SNIPPETS_DIR_NAME))).toBe(false)
  })

  it('다른 워크스페이스를 열면 그쪽에는 다시 넣는다 (기록은 폴더별)', () => {
    const a = workspace('a')
    const b = workspace('b')
    const first = ensureStarterCommands(a, [])
    const second = ensureStarterCommands(b, first.offered)
    expect(second.installed).toBe(true)
    expect(second.offered).toEqual([workspaceKey(a), workspaceKey(b)])
  })

  it('기록 목록이 망가져 있어도(배열이 아님) 동작한다', () => {
    const ws = workspace()
    const result = ensureStarterCommands(ws, 'broken')
    expect(result.installed).toBe(true)
    expect(result.offered).toEqual([workspaceKey(ws)])
  })

  it('넘겨 준 목록을 바꾸지 않는다', () => {
    const ws = workspace()
    const given = ['x']
    ensureStarterCommands(ws, given)
    expect(given).toEqual(['x'])
  })
})

describe('연결 (소스 점검)', () => {
  const main = read('electron/main.js')
  const verify = read('scripts/verifyPackage.js')

  it('워크스페이스를 고를 때와 마지막 워크스페이스를 다시 열 때 모두 호출한다', () => {
    expect(main).toMatch(/selectWorkspace\(chosen\)\s*offerStarterCommands\(chosen\)/)
    expect(main).toMatch(/selectWorkspace\(lastWorkspace\)\s*offerStarterCommands\(lastWorkspace\)/)
  })

  it('확인한 폴더 목록을 설정 파일의 starterCommandsOffered 에 저장하고, 바뀐 때만 저장한다', () => {
    expect(main).toMatch(/ensureStarterCommands\(workspacePath, config\.starterCommandsOffered\)/)
    expect(main).toMatch(/if \(changed\) saveConfig\(\{ \.\.\.config, starterCommandsOffered: offered \}\)/)
  })

  it('실패해도 워크스페이스가 열리도록 오류를 삼킨다', () => {
    expect(main).toMatch(/function offerStarterCommands[\s\S]*?try \{[\s\S]*?\} catch \(error\) \{\s*console\.error/)
  })

  it('앱 안(app.asar)에 꼭 있어야 하는 파일 목록에 새 파일이 들어 있다', () => {
    expect(verify).toContain("'/electron/starterSnippets.js'")
    expect(verify).toContain("'/shared/commandsPack.js'")
  })
})
