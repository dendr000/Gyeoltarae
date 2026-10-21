// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 사이드바 문서 목록에서 Shift+클릭하면 그 문서의 링크 글([[문서명]] 또는 [[문서명(폴더명)]])을 클립보드에 복사한다(소스 점검).
// 실제 클릭·복사는 실제 창에서 확인한다(docs/features/copy-doc-link.md).
const tree = readFileSync(new URL('../../src/components/FileTree.jsx', import.meta.url), 'utf8')
const app = readFileSync(new URL('../../src/App.jsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../../src/App.css', import.meta.url), 'utf8')

describe('FileTree 의 Shift+클릭 링크 복사', () => {
  it('문서 줄에서 Shift 가 눌린 클릭은 문서를 열지 않고 링크를 복사한다', () => {
    const fileRow = tree.slice(tree.indexOf('className={`tree-row tree-row-file'), tree.indexOf('onDoubleClick={() => beginRename()}'))
    expect(fileRow).toMatch(/onClick=\{\(e\) => \{[\s\S]{0,200}if \(e\.shiftKey\) \{[\s\S]{0,120}onCopyLink\(node\)[\s\S]{0,80}return/)
    expect(fileRow.indexOf('e.shiftKey')).toBeLessThan(fileRow.indexOf('onOpenFile(node.path, node.name)'))
  })

  it('Shift+누르기에 글자 범위가 선택되지 않게 mousedown 을 막는다', () => {
    const fileRow = tree.slice(tree.indexOf('className={`tree-row tree-row-file'), tree.indexOf('onDoubleClick={() => beginRename()}'))
    expect(fileRow).toMatch(/onMouseDown=\{\(e\) => \{\s*if \(e\.shiftKey\) e\.preventDefault\(\)/)
  })

  it('링크 글은 docLinkFor 로 만들어 클립보드에 쓰고, 복사한 글을 잠깐 안내한다', () => {
    expect(tree).toContain("from '../lib/docLink.js'")
    expect(tree).toMatch(/docLinkFor\(\{ path: node\.path, name: node\.name \}, docIndex \?\? \{\}\)/)
    expect(tree).toMatch(/navigator\.clipboard\.writeText\(text\)/)
    expect(tree).toContain('tree-copy-notice')
  })

  it('복사에 실패하면 실패했다고 알린다 (클립보드를 못 쓰는 환경)', () => {
    expect(tree).toMatch(/catch \{\s*setCopyNotice\(\{ text, ok: false \}\)/)
    expect(tree).toContain('복사하지 못했습니다')
  })

  it('폴더 안쪽 문서까지 같은 복사 함수가 전달된다 (재귀)', () => {
    expect(tree.match(/onCopyLink=\{onCopyLink\}/g) ?? []).toHaveLength(1)
    expect(tree).toContain('onCopyLink={copyDocLink}')
  })

  it('도움말(title)에 Shift+클릭 안내가 있다', () => {
    expect(tree).toMatch(/title="[^"]*Shift\+클릭[^"]*링크[^"]*"/)
  })
})

describe('App 연결', () => {
  it('FileTree 에 문서 목록(docIndex)을 넘긴다', () => {
    const at = app.indexOf('<FileTree')
    expect(app.slice(at, at + 700)).toContain('docIndex={docIndex}')
  })

  it('안내 글 CSS 가 있다', () => {
    expect(css).toMatch(/\.tree-copy-notice\s*\{/)
  })
})
