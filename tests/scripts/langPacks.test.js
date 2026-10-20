import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveCodeLanguage } from '../../src/lib/codeHighlight.js'
import { scanSnippets, snippetsDirPath } from '../../electron/fileSystem.js'
import { installSnippetPack } from '../../scripts/install-snippet-pack.mjs'
import { LANGUAGE_PACKS } from '../../scripts/snippet-packs/langs.js'
import { calls, languagePack, t } from '../../scripts/snippet-packs/lang/common.js'

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

// 호출 항목: 함수 이름 뒤에 괄호가 붙고 커서가 괄호 안에 선다(printf -> printf();).
describe('호출 항목 (printf -> printf();)', () => {
  const find = (key, title) => LANGUAGE_PACKS[key].entries.find((e) => titleOf(e) === title)
  // 변수 이름으로도 자주 쓰는 이름 — 호출로 만들면 변수를 쓰다가 괄호가 붙을 수 있어서 단어로만 둔다.
  const VARIABLE_LIKE = [
    'size', 'count', 'min', 'max', 'sum', 'list', 'map', 'set', 'str', 'int', 'float', 'string', 'name', 'id', 'key',
    'value', 'index', 'length', 'data', 'result', 'line', 'text', 'temp', 'tmp', 'file', 'path', 'type', 'input',
    'filter',
  ]
  const isCall = (entry) =>
    typeof entry !== 'string' && entry.content !== entry.title && entry.content.startsWith(entry.title) && /^[(<![]/.test(entry.content.slice(entry.title.length))
  const callsOf = (pack) => pack.entries.filter(isCall)

  it('요청한 C++ 의 printf 는 printf(); 이고 커서가 괄호 안이다', () => {
    expect(find('cpp', 'printf')).toEqual({ title: 'printf', content: 'printf({#});' })
    const content = find('cpp', 'printf').content
    expect(content.indexOf('{#}')).toBe('printf('.length)
  })

  it('식 안에서 쓰는 함수(strlen)는 ; 를 붙이지 않는다 (int n = strlen(); 뒤에 ; 가 또 붙으면 안 되므로)', () => {
    expect(find('cpp', 'strlen').content).toBe('strlen({#})')
    expect(find('c', 'malloc').content).toBe('malloc({#})')
  })

  it('인자 없는 함수(isEmpty)는 커서가 괄호 뒤다', () => {
    expect(find('java', 'isEmpty').content).toBe('isEmpty(){#}')
  })

  it('형 변환(static_cast)은 꺾쇠 안에 커서가 선다', () => {
    expect(find('cpp', 'static_cast').content).toBe('static_cast<{#}>()')
  })

  it('문장 끝 기호는 언어를 따른다 — C 계열은 ;, Python·Go·Kotlin·Swift·JS 는 없다', () => {
    expect(find('java', 'println').content).toBe('println({#});')
    expect(find('csharp', 'WriteLine').content).toBe('WriteLine({#});')
    expect(find('php', 'var_dump').content).toBe('var_dump({#});')
    expect(find('rust', 'println!').content).toBe('println!({#});')
    expect(find('python', 'print').content).toBe('print({#})')
    expect(find('go', 'Println').content).toBe('Println({#})')
    expect(find('kotlin', 'println').content).toBe('println({#})')
    expect(find('swift', 'print').content).toBe('print({#})')
    expect(find('javascript', 'alert').content).toBe('alert({#})')
  })

  it('Rust 의 vec! 는 대괄호, CSS 의 함수는 이름만 제목이다', () => {
    expect(find('rust', 'vec!').content).toBe('vec![{#}]')
    expect(find('css', 'rgb').content).toBe('rgb({#})')
    expect(find('css', 'rgb()')).toBeUndefined()
  })

  it('모든 언어에 호출 항목이 있고, 커서 자리는 한 개 이하다', () => {
    for (const [key, pack] of Object.entries(LANGUAGE_PACKS)) {
      const found = callsOf(pack)
      if (key === 'ruby' || key === 'bash' || key === 'html') continue
      expect(found.length, key).toBeGreaterThanOrEqual(5)
      for (const entry of found) expect(entry.content.split('{#}').length - 1, `${key}/${entry.title}`).toBeLessThanOrEqual(1)
    }
  })

  it('변수 이름으로 흔한 단어는 호출로 만들지 않는다 (size·count·min·sum 등은 단어로만)', () => {
    // CSS 는 변수가 없고 PHP 변수는 $ 가 붙어서 이름이 겹치지 않으므로 뺀다.
    for (const [key, pack] of Object.entries(LANGUAGE_PACKS)) {
      if (key === 'css' || key === 'php') continue
      for (const entry of callsOf(pack)) expect(VARIABLE_LIKE.includes(entry.title), `${key}/${entry.title}`).toBe(false)
    }
  })

  it('호출 항목은 같은 이름의 단어를 대신한다 (제목이 한 번만 나온다)', () => {
    for (const pack of Object.values(LANGUAGE_PACKS)) {
      const titles = pack.entries.map(titleOf)
      expect(new Set(titles).size).toBe(titles.length)
    }
  })
})

describe('languagePack 만들기 규칙', () => {
  it('호출 제목이 서로 겹치면 오류, 호출은 같은 이름의 단어를 대신한다', () => {
    expect(() => languagePack({ folder: 'X', calls: [{ title: 'a', content: 'a()' }, { title: 'a', content: 'a({#})' }] })).toThrow(/겹칩니다/)
    const pack = languagePack({ folder: 'X', keywords: ['printf', 'int'], calls: calls({ statements: ['printf'], end: ';' }) })
    expect(pack.entries).toEqual([{ title: 'printf', content: 'printf({#});' }, 'int'])
  })

  it('calls() 는 문장·식·인자 없음·묶음표를 구분해 만든다', () => {
    expect(calls({ statements: ['a'], expressions: ['b'], noArgs: ['c'], end: ';', braces: { 'vec!': '[]' } })).toEqual([
      { title: 'a', content: 'a({#});' },
      { title: 'b', content: 'b({#})' },
      { title: 'c', content: 'c(){#}' },
      { title: 'vec!', content: 'vec![{#}];' },
    ])
  })

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
    expect(bodies['println!']).toBe('println!({#});')
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

  it('--merge-order: 이미 있는 순서 파일을 고치지 않고 없는 제목만 뒤에 덧붙인다', () => {
    const dir = path.join(snippetsDirPath(root), 'Java')
    fs.mkdirSync(dir, { recursive: true })
    const orderPath = path.join(dir, '_순서.txt')
    fs.writeFileSync(orderPath, '# 내가 고침\nvoid\npublic\n', 'utf-8')

    const merged = install('java', { mergeOrder: true })

    expect(merged.orderFile).toBe('merged')
    const lines = fs.readFileSync(orderPath, 'utf-8').split('\n')
    expect(lines.slice(0, 3)).toEqual(['# 내가 고침', 'void', 'public'])
    expect(lines.filter((l) => l === 'void')).toHaveLength(1)
    expect(lines).toContain('class')
    expect(merged.orderAdded).toBe(LANGUAGE_PACKS.java.order.length - 2)

    const again = install('java', { mergeOrder: true })
    expect(again.orderFile).toBe('kept')
  })

  it('--merge-order 가 없으면 이미 있는 순서 파일은 그대로 둔다', () => {
    const dir = path.join(snippetsDirPath(root), 'Java')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, '_순서.txt'), 'void\n', 'utf-8')
    expect(install('java').orderFile).toBe('kept')
    expect(fs.readFileSync(path.join(dir, '_순서.txt'), 'utf-8')).toBe('void\n')
  })

  it('순서 파일을 미리보기(dryRun)로 합쳐 보면 파일은 그대로이고 덧붙일 개수만 알려 준다', () => {
    const dir = path.join(snippetsDirPath(root), 'Java')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, '_순서.txt'), 'void\n', 'utf-8')
    const result = install('java', { mergeOrder: true, dryRun: true })
    expect(result.orderFile).toBe('merged')
    expect(fs.readFileSync(path.join(dir, '_순서.txt'), 'utf-8')).toBe('void\n')
  })

  it('--refresh: 처음 설치한 그대로인 단어(printf)만 호출(printf();)로 바꾸고 사용자가 고친 본문은 그대로 둔다', () => {
    const dir = path.join(snippetsDirPath(root), 'C++')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'printf.md'), 'printf', 'utf-8')
    fs.writeFileSync(path.join(dir, 'strlen.md'), '내가 고친 strlen', 'utf-8')
    fs.writeFileSync(path.join(dir, 'int.md'), 'int', 'utf-8')

    const plain = install('cpp')
    expect(plain.updated).toEqual([])
    expect(installed('C++').printf).toBe('printf')

    const result = install('cpp', { refresh: true })

    expect(result.updated).toContain('printf')
    expect(result.updated).not.toContain('strlen')
    expect(result.updated).not.toContain('int')
    const bodies = installed('C++')
    expect(bodies.printf).toBe('printf({#});')
    expect(bodies.strlen).toBe('내가 고친 strlen')
    expect(bodies.int).toBe('int')
    expect(install('cpp', { refresh: true }).updated).toEqual([])
  })

  it('--refresh 미리보기(dryRun)는 파일을 바꾸지 않고 바꿀 제목만 알려 준다', () => {
    const dir = path.join(snippetsDirPath(root), 'C++')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'printf.md'), 'printf', 'utf-8')
    const result = install('cpp', { refresh: true, dryRun: true })
    expect(result.updated).toContain('printf')
    expect(installed('C++').printf).toBe('printf')
  })

  it('다른 폴더(영어 등)는 건드리지 않는다', () => {
    const other = path.join(snippetsDirPath(root), '영어')
    fs.mkdirSync(other, { recursive: true })
    fs.writeFileSync(path.join(other, 'ERD.md'), 'ERD(Entity-Relation Diagram)', 'utf-8')
    install('html')
    expect(installed('영어')).toEqual({ ERD: 'ERD(Entity-Relation Diagram)' })
  })
})

describe('자주 쓰는 순서 — 자주 쓰는 키워드가 드물게 쓰는 키워드보다 위', () => {
  it('Java 에서 i 를 쳤을 때 int 가 interface 보다 위다', () => {
    const { order } = LANGUAGE_PACKS.java
    expect(order.indexOf('int')).toBeGreaterThanOrEqual(0)
    expect(order.indexOf('int')).toBeLessThan(order.indexOf('interface'))
  })

  it('C++ 에서 int 가 interface 급의 드문 이름보다 위다 (int 는 순서 목록의 앞쪽)', () => {
    const { order } = LANGUAGE_PACKS.cpp
    expect(order.indexOf('int')).toBeLessThan(20)
  })
})
