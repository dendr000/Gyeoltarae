import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveCodeLanguage } from '../../src/lib/codeHighlight.js'
import { scanSnippets, snippetsDirPath } from '../../electron/fileSystem.js'
import { installSnippetPack } from '../../scripts/install-snippet-pack.mjs'
import { LANGUAGE_PACKS } from '../../scripts/snippet-packs/langs.js'
import { languagePack, t } from '../../scripts/snippet-packs/lang/common.js'

const EXPECTED_GRAMMAR = {
  cpp: 'cpp', c: 'c', java: 'java', html: 'xml', css: 'css', python: 'python', javascript: 'javascript',
  typescript: 'typescript', csharp: 'csharp', go: 'go', kotlin: 'kotlin', rust: 'rust', swift: 'swift',
  php: 'php', ruby: 'ruby', bash: 'bash',
}
const titleOf = (entry) => (typeof entry === 'string' ? entry : entry.title)
const contentOf = (entry) => (typeof entry === 'string' ? entry : entry.content)
// 코드에서 늘 치는 글자 — 이런 글자로 시작하는 제목이 있으면 칠 때마다 추천 팝업이 뜬다.
const TYPED_ALL_THE_TIME = '[(-|,;:.=+*/<>{)}\'"'

describe('언어 상용구 묶음 목록', () => {
  it('요청한 언어(C++, Java, HTML, Python)를 포함해 16개 언어다', () => {
    expect(Object.keys(LANGUAGE_PACKS).sort()).toEqual(Object.keys(EXPECTED_GRAMMAR).sort())
    for (const name of ['cpp', 'java', 'html', 'python']) expect(LANGUAGE_PACKS[name]).toBeDefined()
  })

  it('폴더 이름이 코드블록 언어 이름이고, 그 언어의 문법표로 색을 칠한다', () => {
    for (const [key, pack] of Object.entries(LANGUAGE_PACKS)) {
      expect(resolveCodeLanguage(pack.folder)?.grammar, `${key} (${pack.folder})`).toBe(EXPECTED_GRAMMAR[key])
    }
  })

  it('폴더 이름이 서로 다르다', () => {
    const folders = Object.values(LANGUAGE_PACKS).map((p) => p.folder.toLowerCase())
    expect(new Set(folders).size).toBe(folders.length)
  })
})

describe.each(Object.entries(LANGUAGE_PACKS))('%s 묶음 데이터', (key, pack) => {
  const titles = pack.entries.map(titleOf)
  const templates = pack.entries.filter((e) => typeof e !== 'string')

  it('항목이 충분히 많다 (단어 + 틀)', () => {
    expect(titles.length).toBeGreaterThanOrEqual(250)
    expect(templates.length).toBeGreaterThanOrEqual(25)
  })

  it('제목이 정확히 같은 것은 없다', () => {
    expect(new Set(titles).size).toBe(titles.length)
  })

  it('제목은 비어 있지 않고 앞뒤 공백·줄바꿈이 없고 끝이 점이 아니다', () => {
    for (const title of titles) {
      expect(title.length, title).toBeGreaterThan(0)
      expect(title, title).toBe(title.trim())
      expect(title, title).not.toMatch(/[\n\r\t]/)
      expect(title, title).not.toMatch(/\.$/)
    }
  })

  it('윈도우 예약 이름(con, nul 등)이 제목이 아니다', () => {
    for (const title of titles) expect(title, title).not.toMatch(/^(con|prn|aux|nul|com\d|lpt\d)$/i)
  })

  it('코드에서 늘 치는 기호로 시작하는 제목이 없다 (칠 때마다 추천 팝업이 뜨므로)', () => {
    for (const title of titles) expect(TYPED_ALL_THE_TIME.includes(title[0]), title).toBe(false)
  })

  it('모든 제목이 보이는 ASCII 글자뿐이다 (한글·이모지 없음)', () => {
    for (const title of titles) expect(/^[\x20-\x7e]+$/.test(title), title).toBe(true)
  })

  it('틀의 본문에는 커서 자리 {#} 가 많아야 한 개다 (두 번째부터는 글자로 남는다)', () => {
    for (const entry of templates) {
      const count = entry.content.split('{#}').length - 1
      expect(count, entry.title).toBeLessThanOrEqual(1)
    }
  })

  it('틀은 본문이 있고 제목과 다르다', () => {
    for (const entry of templates) {
      expect(entry.content.length, entry.title).toBeGreaterThan(0)
      expect(entry.content, entry.title).not.toBe(entry.title)
    }
  })

  it('단어는 제목과 본문이 같다 (스페이스바 자동 치환이 켜져 있어도 바뀌는 게 없다)', () => {
    for (const entry of pack.entries) {
      if (typeof entry === 'string') expect(contentOf(entry)).toBe(entry)
    }
  })

  it('추천 순서(order)의 제목은 모두 실제 항목이고 중복이 없다', () => {
    const set = new Set(titles)
    expect(pack.order.length).toBeGreaterThan(0)
    for (const title of pack.order) expect(set.has(title), title).toBe(true)
    expect(new Set(pack.order).size).toBe(pack.order.length)
  })
})

describe('언어별 대표 항목', () => {
  const has = (key, title) => LANGUAGE_PACKS[key].entries.map(titleOf).includes(title)

  it('C++ — 키워드, 헤더, 표준 라이브러리, 틀', () => {
    for (const title of ['namespace', 'template', 'constexpr', '#include', 'iostream', 'vector', 'unique_ptr', 'cout', 'cppbase', 'fori']) {
      expect(has('cpp', title), title).toBe(true)
    }
  })

  it('Java — 키워드, 표준 클래스, 어노테이션, 틀(psvm, sout)', () => {
    for (const title of ['public', 'ArrayList', 'HashMap', 'StringBuilder', '@Override', 'psvm', 'sout']) {
      expect(has('java', title), title).toBe(true)
    }
  })

  it('HTML — 태그, 속성, 엔티티, 문서 뼈대 틀', () => {
    for (const title of ['div', 'span', 'href', 'class', '&nbsp;', 'html5']) expect(has('html', title), title).toBe(true)
  })

  it('Python — 키워드, 내장 함수, 특수 메서드, 틀(ifmain)', () => {
    for (const title of ['def', 'lambda', 'print', 'enumerate', '__init__', 'ifmain', 'withopen']) {
      expect(has('python', title), title).toBe(true)
    }
  })

  it('html5 틀은 문서 뼈대이고 커서가 제목 칸에 있다', () => {
    const html5 = LANGUAGE_PACKS.html.entries.find((e) => titleOf(e) === 'html5')
    expect(html5.content).toContain('<!DOCTYPE html>')
    expect(html5.content).toContain('<title>{#}</title>')
  })

  it('Go 의 틀은 gofmt 처럼 탭으로 들여쓴다', () => {
    const fori = LANGUAGE_PACKS.go.entries.find((e) => titleOf(e) === 'fori')
    expect(fori.content).toContain('\t')
    expect(fori.content).not.toMatch(/^ {2,}/m)
  })
})

describe('languagePack 만들기 규칙', () => {
  it('틀 제목이 서로 겹치면 만들 때 오류', () => {
    expect(() => languagePack({ folder: 'X', templates: [t('a', '1'), t('a', '2')] })).toThrow(/겹칩니다/)
  })

  it('틀 제목이 단어와 같으면 오류 (키워드 뒤 공백에서 틀이 펼쳐지는 사고를 막는다)', () => {
    expect(() => languagePack({ folder: 'X', keywords: ['for'], templates: [t('for', 'for () {}')] })).toThrow(/단어와 같습니다/)
  })

  it('단어끼리 겹치면 하나만 남긴다', () => {
    const pack = languagePack({ folder: 'X', keywords: ['a', 'a', 'b'] })
    expect(pack.entries).toEqual(['a', 'b'])
  })

  it('order 는 실제로 있는 제목만 남긴다', () => {
    const pack = languagePack({ folder: 'X', keywords: ['a'], first: ['a', 'zzz'] })
    expect(pack.order).toEqual(['a'])
  })

  it('t() 는 줄을 줄바꿈으로 이어 붙인다', () => {
    expect(t('x', 'a', 'b')).toEqual({ title: 'x', content: 'a\nb' })
  })
})

describe('설치 (임시 폴더)', () => {
  // 파일을 수백 개 만들고(만들 때마다 폴더를 읽는다) 기본 5초로는 모자랄 수 있다.
  vi.setConfig({ testTimeout: 60000 })
  let root

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'gyeoltarae-lang-'))
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  const install = (key, options = {}) => {
    const pack = LANGUAGE_PACKS[key]
    return installSnippetPack({ workspacePath: root, folder: pack.folder, entries: pack.entries, order: pack.order, ...options })
  }
  const installed = (folder) =>
    Object.fromEntries(scanSnippets(root).filter((s) => s.category === folder).map((s) => [s.title, fs.readFileSync(s.path, 'utf-8')]))

  it('C++ 을 설치하면 `C++` 폴더가 만들어지고 단어는 제목=본문, 틀은 여러 줄 본문이다', () => {
    const { created, skipped } = install('cpp')
    expect(created).toHaveLength(LANGUAGE_PACKS.cpp.entries.length)
    expect(skipped).toEqual([])
    const bodies = installed('C++')
    expect(bodies.namespace).toBe('namespace')
    expect(bodies['#include']).toBe('#include')
    expect(bodies.fori).toContain('for (int i = 0; i < {#}; i++) {')
    expect(bodies.fori.split('\n').length).toBeGreaterThan(1)
  })

  it('파일 이름에 못 쓰는 글자가 든 제목(Rust 의 #[tokio::main], println!)도 그대로 저장되고 읽힌다', () => {
    install('rust')
    const bodies = installed('Rust')
    expect(bodies['#[tokio::main]']).toBe('#[tokio::main]')
    expect(bodies['println!']).toBe('println!')
  })

  it('대소문자만 다른 제목(Rust 의 self / Self, C# 의 string / String)도 서로 덮어쓰지 않는다', () => {
    install('rust')
    install('csharp')
    const rust = installed('Rust')
    const cs = installed('C#')
    expect(rust.self).toBe('self')
    expect(rust.Self).toBe('Self')
    expect(cs.string).toBe('string')
    expect(cs.String).toBe('String')
  })

  it('두 번 설치해도 안전하다 — 두 번째는 전부 건너뛴다', () => {
    install('go')
    const second = install('go')
    expect(second.created).toEqual([])
    expect(second.skipped).toHaveLength(LANGUAGE_PACKS.go.entries.length)
  })

  it('이미 있는 상용구는 덮어쓰지 않는다', () => {
    const dir = path.join(snippetsDirPath(root), 'Python')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'ifmain.md'), '내 본문', 'utf-8')
    const { skipped } = install('python')
    expect(skipped).toEqual(['ifmain'])
    expect(installed('Python').ifmain).toBe('내 본문')
  })

  it('추천 순서 파일(_순서.txt)을 만들고 상용구로 세지 않는다', () => {
    const { orderFile } = install('java')
    expect(orderFile).toBe('created')
    expect(scanSnippets(root)).toHaveLength(LANGUAGE_PACKS.java.entries.length)
  })

  it('다른 폴더(영어 등)는 건드리지 않는다', () => {
    const other = path.join(snippetsDirPath(root), '영어')
    fs.mkdirSync(other, { recursive: true })
    fs.writeFileSync(path.join(other, 'ERD.md'), 'ERD(Entity-Relation Diagram)', 'utf-8')
    install('html')
    expect(installed('영어')).toEqual({ ERD: 'ERD(Entity-Relation Diagram)' })
  })
})
