import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { scanSnippets } from '../../electron/fileSystem.js'
import { installSnippetPack } from '../../scripts/install-snippet-pack.mjs'
import { COMMANDS_PACK } from '../../shared/commandsPack.js'
import { parseSnippetContent } from '../../src/lib/snippetExpansion.js'
import { folderGrammar, isSlashCommand } from '../../src/lib/snippetLanguage.js'
import { parseWikiText } from '../../src/lib/wikiParser.js'

const { entries } = COMMANDS_PACK
const byTitle = (title) => entries.find((e) => e.title === title)
// EditorPane 이 연결해 둔 동작 이름 — 여기 없는 이름을 {!이름} 에 쓰면 글자 그대로 들어가 버린다.
const KNOWN_ACTIONS = ['표', '그라데이션', '이미지', '자료', '틀', '분류', '별칭']

describe('슬래시 명령 묶음 데이터', () => {
  it('폴더는 `명령` 이고 언어 폴더가 아니다 (글에서 쓰이는 폴더)', () => {
    expect(COMMANDS_PACK.folder).toBe('명령')
    expect(folderGrammar('명령')).toBeNull()
  })

  it('모든 제목이 / 로 시작하고 겹치지 않고 윈도우 예약 이름이 아니다', () => {
    const titles = entries.map((e) => e.title)
    expect(new Set(titles).size).toBe(titles.length)
    for (const entry of entries) {
      expect(isSlashCommand(entry), entry.title).toBe(true)
      expect(entry.title.length, entry.title).toBeGreaterThan(1)
      expect(entry.title, entry.title).toBe(entry.title.trim())
      expect(entry.title, entry.title).not.toMatch(/\s/)
    }
  })

  it('요청한 예(/접기, /목차)가 그대로 들어 있다', () => {
    expect(byTitle('/접기').content).toBe('{{{#!folding {#}\n{#}\n}}}')
    expect(byTitle('/목차').content).toBe('[목차]\n[clearfix]')
  })

  it('/접기 는 제목 칸에 커서가 서고 Tab 으로 내용 칸에 간다', () => {
    const parsed = parseSnippetContent(byTitle('/접기').content)
    expect(parsed.text).toBe('{{{#!folding \n\n}}}')
    expect(parsed.caret).toBe('{{{#!folding '.length)
    expect(parsed.stops).toEqual(['{{{#!folding \n'.length])
  })

  it('/표 등 동작 명령은 {!이름} 하나뿐이고 이름은 에디터가 아는 동작이다', () => {
    const actions = entries.map((e) => parseSnippetContent(e.content).action).filter(Boolean)
    expect(actions.sort()).toEqual([...KNOWN_ACTIONS].sort())
    expect(parseSnippetContent(byTitle('/표').content).action).toBe('표')
  })

  it('일반 명령의 본문에는 {!...} 가 섞여 있지 않다', () => {
    for (const entry of entries) {
      const { action, text } = parseSnippetContent(entry.content)
      if (!action) expect(text, entry.title).not.toMatch(/\{![^{}\s]+\}/)
    }
  })

  it('추천 순서의 제목은 모두 실제 명령이고 /접기, /목차, /표 가 맨 앞쪽이다', () => {
    const titles = new Set(entries.map((e) => e.title))
    for (const title of COMMANDS_PACK.order) expect(titles.has(title), title).toBe(true)
    expect(COMMANDS_PACK.order.slice(0, 3)).toEqual(['/접기', '/목차', '/표'])
  })

  it('명령이 40개 이상이다', () => {
    expect(entries.length).toBeGreaterThanOrEqual(40)
  })
})

describe('명령을 펼친 글이 위키 문법으로 읽힌다', () => {
  const render = (title, fill = {}) => {
    const { text } = parseSnippetContent(byTitle(title).content)
    return parseWikiText(`앞\n\n${text.replace(/\u0000/g, '')}\n\n뒤`, fill)
  }
  const html = (r) => (typeof r === 'string' ? r : r.html)

  it('/접기 → 접기 블록', () => {
    const out = html(parseWikiText('{{{#!folding 제목\n내용\n}}}'))
    expect(out).toContain('wiki-folding')
  })

  it('/구분선 → 가로선, /줄바꿈 → <br>, /행 → 표 한 행', () => {
    expect(html(render('/구분선'))).toContain('<hr')
    expect(html(render('/줄바꿈'))).toContain('<br>')
    expect(html(render('/행'))).toContain('<table')
  })

  it('/코드 와 /sql → 코드블록, /sql 은 언어 이름이 SQL 로 보인다', () => {
    expect(html(render('/코드'))).toContain('wiki-code-wrap')
    expect(html(render('/sql'))).toContain('wiki-code-lang')
  })

  it('/제목2 → 2단계 제목', () => {
    const { text } = parseSnippetContent(byTitle('/제목2').content)
    expect(html(parseWikiText(text.replace('  ', ' 제목 ')))).toContain('<h2')
  })
})

describe('설치 (임시 폴더)', () => {
  let root

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'gyeoltarae-cmd-'))
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  it('/ 가 든 제목도 파일 이름 규칙(%2F)으로 저장되고 제목·본문 그대로 읽힌다', () => {
    const { created } = installSnippetPack({ workspacePath: root, folder: COMMANDS_PACK.folder, entries, order: COMMANDS_PACK.order })
    expect(created).toHaveLength(entries.length)

    const found = Object.fromEntries(scanSnippets(root).map((s) => [s.title, fs.readFileSync(s.path, 'utf-8')]))
    expect(found['/접기']).toBe('{{{#!folding {#}\n{#}\n}}}')
    expect(found['/표']).toBe('{!표}')
    expect(Object.keys(found)).toHaveLength(entries.length)
  })

  it('두 번 설치해도 안전하다', () => {
    const options = { workspacePath: root, folder: COMMANDS_PACK.folder, entries, order: COMMANDS_PACK.order }
    installSnippetPack(options)
    const second = installSnippetPack(options)
    expect(second.created).toEqual([])
    expect(second.skipped).toHaveLength(entries.length)
  })
})
