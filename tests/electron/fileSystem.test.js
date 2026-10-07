import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createDoc,
  createFolder,
  ensureSnippet,
  movePath,
  renamePath,
  scanSnippets,
  scanTree,
  snippetsDirPath,
} from '../../electron/fileSystem.js'

// 실제 디스크에 임시 폴더를 만들어서 진행 — 파일을 옮기고 이름을 바꾸는 코드는 가짜 파일
// 시스템으로는 진짜 동작(예: Windows 경로, 폴더째 이동)을 확인할 수 없으므로.
let root

function put(rel, content = 'x') {
  const full = path.join(root, rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content, 'utf-8')
  return full
}

function dir(rel) {
  const full = path.join(root, rel)
  fs.mkdirSync(full, { recursive: true })
  return full
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'gyeoltarae-test-'))
})

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
})

describe('movePath — 다른 폴더로 이동', () => {
  it('문서를 옮기면 이름·확장자·내용이 그대로고 원래 자리에서는 사라진다', () => {
    const src = put('웹툰/A/설정.md', '내용')
    const dest = dir('만화')

    const moved = movePath(src, dest)

    expect(moved).toBe(path.join(dest, '설정.md'))
    expect(fs.readFileSync(moved, 'utf-8')).toBe('내용')
    expect(fs.existsSync(src)).toBe(false)
  })

  it('폴더를 옮기면 안에 들어 있던 문서와 하위 폴더가 전부 같이 따라간다', () => {
    const folder = dir('웹툰/주인공')
    put('웹툰/주인공/능력.md', '능력')
    put('웹툰/주인공/세부/아이템.md', '아이템')
    const dest = dir('소설')

    const moved = movePath(folder, dest)

    expect(fs.readFileSync(path.join(moved, '능력.md'), 'utf-8')).toBe('능력')
    expect(fs.readFileSync(path.join(moved, '세부', '아이템.md'), 'utf-8')).toBe('아이템')
    expect(fs.existsSync(folder)).toBe(false)
  })

  it('폴더를 자기 자신 안으로 옮기려 하면 막고, 아무것도 건드리지 않는다', () => {
    const folder = dir('A')
    put('A/문서.md')

    expect(() => movePath(folder, folder)).toThrow('자기 자신')
    expect(fs.existsSync(path.join(folder, '문서.md'))).toBe(true)
  })

  it('폴더를 자기 하위 폴더 안으로 옮기려 하면 막는다', () => {
    const folder = dir('A')
    const child = dir('A/B/C')
    put('A/B/C/문서.md')

    expect(() => movePath(folder, child)).toThrow('하위 폴더')
    expect(fs.existsSync(path.join(child, '문서.md'))).toBe(true)
  })

  it('이름이 비슷하기만 한 다른 폴더(ab → abc)는 하위 폴더로 오인하지 않고 옮긴다', () => {
    const ab = dir('ab')
    const abc = dir('abc')

    const moved = movePath(ab, abc)

    expect(moved).toBe(path.join(abc, 'ab'))
    expect(fs.existsSync(moved)).toBe(true)
  })

  it('이미 그 폴더에 있는 걸 같은 폴더로 옮기면 아무 일도 일어나지 않는다', () => {
    const src = put('A/문서.md', '내용')

    const result = movePath(src, path.join(root, 'A'))

    expect(result).toBe(src)
    expect(fs.readFileSync(src, 'utf-8')).toBe('내용')
  })

  it('목적지에 같은 이름이 있으면 덮어쓰지 않고 " (2)", " (3)"을 붙인다', () => {
    const dest = dir('목적지')
    put('목적지/설정.md', '기존')
    const first = put('원본1/설정.md', '새것1')
    const second = put('원본2/설정.md', '새것2')

    const movedFirst = movePath(first, dest)
    const movedSecond = movePath(second, dest)

    expect(path.basename(movedFirst)).toBe('설정 (2).md')
    expect(path.basename(movedSecond)).toBe('설정 (3).md')
    // 기존 파일은 그대로
    expect(fs.readFileSync(path.join(dest, '설정.md'), 'utf-8')).toBe('기존')
    expect(fs.readFileSync(movedFirst, 'utf-8')).toBe('새것1')
  })

  it('폴더 이름이 겹쳐도 덮어쓰지 않고 번호를 붙인다', () => {
    const dest = dir('목적지')
    dir('목적지/자료')
    const src = dir('다른곳/자료')

    const moved = movePath(src, dest)

    expect(path.basename(moved)).toBe('자료 (2)')
  })
})

describe('renamePath — 이름 변경', () => {
  it('문서는 이름만 바뀌고 .md 확장자는 유지된다', () => {
    const src = put('A/예전.md', '내용')

    const renamed = renamePath(src, '새이름')

    expect(path.basename(renamed)).toBe('새이름.md')
    expect(fs.readFileSync(renamed, 'utf-8')).toBe('내용')
    expect(fs.existsSync(src)).toBe(false)
  })

  it('폴더 이름을 바꾸면 안의 문서가 그대로 따라온다', () => {
    const src = dir('주인공')
    put('주인공/능력.md', '능력')

    const renamed = renamePath(src, '유성호')

    expect(path.basename(renamed)).toBe('유성호')
    expect(fs.readFileSync(path.join(renamed, '능력.md'), 'utf-8')).toBe('능력')
  })

  it('Windows에서 쓸 수 없는 글자("?", ":" 등)는 밑줄로 바뀌어 이름 변경이 실패하지 않는다', () => {
    const src = put('A/문서.md')

    const renamed = renamePath(src, '질문? 부제: 이야기')

    expect(path.basename(renamed)).toBe('질문_ 부제_ 이야기.md')
    expect(fs.existsSync(renamed)).toBe(true)
  })
})

describe('createDoc / createFolder', () => {
  it('새 문서는 분류 태그 자리 하나만 있는 상태로 시작한다 ([목차]/개요 제목 없음)', () => {
    const file = createDoc(dir('A'), '새 문서')
    expect(fs.readFileSync(file, 'utf-8')).toBe('[[분류:]]\n')
  })

  it('같은 이름의 문서가 있으면 덮어쓰지 않고 " (1)"을 붙인다', () => {
    const d = dir('A')
    const first = createDoc(d, '문서')
    const second = createDoc(d, '문서')

    expect(path.basename(first)).toBe('문서.md')
    expect(path.basename(second)).toBe('문서 (1).md')
  })

  it('폴더 이름이 겹쳐도 덮어쓰지 않고 번호를 붙인다', () => {
    const d = dir('A')
    createFolder(d, '폴더')
    expect(path.basename(createFolder(d, '폴더'))).toBe('폴더 (1)')
  })
})

describe('scanTree — 사이드바에 보이는 트리', () => {
  it('폴더가 문서보다 먼저 나오고, 문서 이름에서는 .md가 빠진다', () => {
    put('문서B.md')
    put('문서A.md')
    put('폴더/안쪽.md')

    const tree = scanTree(root)

    expect(tree.map((n) => `${n.type}:${n.name}`)).toEqual(['dir:폴더', 'file:문서A', 'file:문서B'])
    expect(tree[0].children.map((n) => n.name)).toEqual(['안쪽'])
  })

  it('점(.)으로 시작하는 내부 폴더와 .md가 아닌 파일은 보이지 않는다', () => {
    put('.wikidesk-data/기술/번개펀치.md')
    put('메모.txt')
    put('문서.md')

    expect(scanTree(root).map((n) => n.name)).toEqual(['문서'])
  })
})

// 상용구는 "단축어 = 파일 이름"이라, Windows 파일 이름에 못 쓰는 글자(* ? : / \ " < > |)가
// 단축어에 들어가면 예전엔 전부 "_"로 바뀌어 저장됐다(제보: "*를 ※로 바꾸려는데 *가 _로 바뀜").
// 서로 다른 단축어가 같은 "_.md"로 겹쳐서 나중 것이 앞의 것을 덮어쓰기도 했다.
describe('상용구 단축어에 파일 이름에 못 쓰는 글자가 들어가는 경우', () => {
  // 백슬래시는 문자 코드(92)로 — 소스에 직접 쓰면 이스케이프 때문에 헷갈리기 쉬움
  const ILLEGAL = ['*', '?', ':', '/', String.fromCharCode(92), '"', '<', '>', '|']

  function register(title, content = '본문') {
    const file = ensureSnippet(root, '공통', title)
    fs.writeFileSync(file, content, 'utf-8')
    return file
  }

  it('"*" 를 단축어로 등록하면 다시 읽어도 "*" 그대로다 ("_" 로 바뀌지 않는다)', () => {
    register('*', '※')

    const [entry] = scanSnippets(root)

    expect(entry.title).toBe('*')
    expect(fs.readFileSync(entry.path, 'utf-8')).toBe('※')
  })

  it('못 쓰는 글자 아홉 개 모두 단축어로 저장했다가 그대로 읽힌다', () => {
    for (const ch of ILLEGAL) register(ch, `본문${ch}`)

    const titles = scanSnippets(root).map((e) => e.title)

    expect(titles.sort()).toEqual([...ILLEGAL].sort())
  })

  it('글자 사이에 섞여 있어도 그대로 읽힌다 (a*b, 100%, 가:나)', () => {
    for (const title of ['a*b', '100%', '가:나']) register(title)

    expect(scanSnippets(root).map((e) => e.title).sort()).toEqual(['100%', 'a*b', '가:나'])
  })

  it('서로 다른 단축어("*" 와 "?")는 서로 다른 파일이라 앞의 것을 덮어쓰지 않는다', () => {
    register('*', '별표 본문')
    register('?', '물음표 본문')

    const byTitle = Object.fromEntries(scanSnippets(root).map((e) => [e.title, fs.readFileSync(e.path, 'utf-8')]))

    expect(byTitle).toEqual({ '*': '별표 본문', '?': '물음표 본문' })
  })

  it('같은 단축어를 다시 등록하면 같은 파일을 쓴다 (중복 파일이 생기지 않는다)', () => {
    const first = ensureSnippet(root, '공통', '*')
    const second = ensureSnippet(root, '공통', '*')

    expect(second).toBe(first)
    expect(scanSnippets(root)).toHaveLength(1)
  })

  it('디스크의 실제 파일 이름에는 Windows 에서 못 쓰는 글자가 없다', () => {
    for (const ch of ILLEGAL) register(ch)

    const names = fs.readdirSync(path.join(snippetsDirPath(root), '공통'))

    expect(names).toHaveLength(ILLEGAL.length)
    for (const name of names) expect(ILLEGAL.some((ch) => name.includes(ch))).toBe(false)
  })

  it('단축어가 우연히 "%2A" 처럼 생겼어도 "*" 로 잘못 읽히지 않는다', () => {
    register('%2A', '글자 그대로')
    register('*', '진짜 별표')

    const titles = scanSnippets(root).map((e) => e.title).sort()

    expect(titles).toEqual(['%2A', '*'])
  })

  it('이미 "_.md" 로 저장돼 있던 예전 상용구는 그대로 "_" 단축어로 읽힌다 (기존 데이터 호환)', () => {
    const legacy = path.join(snippetsDirPath(root), '공통', '_.md')
    fs.mkdirSync(path.dirname(legacy), { recursive: true })
    fs.writeFileSync(legacy, '예전 본문', 'utf-8')

    expect(scanSnippets(root).map((e) => e.title)).toEqual(['_'])
  })
})
