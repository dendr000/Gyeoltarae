// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TABLE_EDITOR_HELP } from '../../src/lib/tableEditorHelp.js'

// 표 편집기의 도움말. 예전에는 표 위쪽에 작은 글씨 한 덩어리로 적혀 있어서 눈에 잘 안 들어왔다. 지금은 헤더의 "?" 단추에 마우스를 올리면
// 주제별로 나뉜 큰 글씨 팝업으로 보인다. 내용은 이 데이터 파일 하나에 있다.

const allText = TABLE_EDITOR_HELP.flatMap((section) => [section.title, ...section.items.map((item) => `${item.keys ?? ''} ${item.text}`)]).join('\n')

describe('도움말 데이터 모양', () => {
  it('주제(section)가 여럿이고 각 주제에 제목과 항목이 있다', () => {
    expect(TABLE_EDITOR_HELP.length).toBeGreaterThanOrEqual(6)
    for (const section of TABLE_EDITOR_HELP) {
      expect(section.title.trim()).not.toBe('')
      expect(section.items.length).toBeGreaterThan(0)
    }
  })

  it('항목마다 설명(text)이 있고, 키(keys)는 있어도 되지만 있으면 비어 있지 않다', () => {
    for (const section of TABLE_EDITOR_HELP) {
      for (const item of section.items) {
        expect(item.text.trim()).not.toBe('')
        if (item.keys !== undefined) expect(item.keys.trim()).not.toBe('')
      }
    }
  })

  it('주제 제목이 겹치지 않는다', () => {
    const titles = TABLE_EDITOR_HELP.map((section) => section.title)
    expect(new Set(titles).size).toBe(titles.length)
  })

  it('한 항목이 너무 길지 않다 (한 덩어리로 읽기 힘든 글로 돌아가지 않도록, 160자 이하)', () => {
    for (const section of TABLE_EDITOR_HELP) {
      for (const item of section.items) expect(item.text.length).toBeLessThanOrEqual(160)
    }
  })
})

describe('도움말에 있어야 할 내용', () => {
  const topics = [
    ['범위 선택', 'Shift+클릭'],
    ['행 번호·열 글자', '행 번호'],
    ['합계·평균', '합계'],
    ['복사·붙여넣기', 'Ctrl+C'],
    ['아래로 채우기', 'Ctrl+D'],
    ['자동 채우기 핸들', '핸들'],
    ['찾아 바꾸기', 'Ctrl+F'],
    ['되돌리기', 'Ctrl+Z'],
    ['굵게 단축키', 'Ctrl+B'],
    ['밑줄 단축키', 'Ctrl+U'],
    ['칸 이동', 'Tab'],
    ['칸 안 줄바꿈', '[br]'],
    ['적용 단추', '적용'],
    ['바깥 두 번 클릭으로 닫기', '두 번'],
    ['둘째 줄 툴바', '둘째 줄'],
    ['셋째 줄 서식 툴바', '셋째 줄'],
    ['칸과 큰 입력칸 오가기', 'F2'],
    ['칸과 큰 입력칸 오가기(다른 키)', 'Ctrl+Enter'],
    ['행 추가 단추 자리', '행 추가'],
    ['열 너비 가장 긴 칸 기준', '가장 긴 칸 기준'],
    ['열 추가 단추 자리', '열 추가'],
  ]
  for (const [name, needle] of topics) {
    it(`${name}: "${needle}" 이(가) 들어 있다`, () => {
      expect(allText).toContain(needle)
    })
  }
})

describe('소스 점검: 화면 연결', () => {
  const read = (relative) => readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8')
  const modal = read('src/components/TableEditorModal.jsx')

  it('표 위의 작은 글씨 안내(cell-style-hint)는 없어졌다', () => {
    expect(modal).not.toContain('cell-style-hint')
    expect(modal).not.toContain('Shift+클릭이나 행 번호')
  })

  it('헤더에 도움말 단추 컴포넌트가 있다', () => {
    expect(modal).toMatch(/<TableEditorHelp\s*\/>/)
  })

  it('도움말 단추는 마우스를 올리면 열리고(hover) 눌러서 고정할 수도 있다', () => {
    const help = read('src/components/TableEditorHelp.jsx')
    expect(help).toContain('onMouseEnter')
    expect(help).toContain('onMouseLeave')
    expect(help).toContain('onClick')
    expect(help).toContain('TABLE_EDITOR_HELP')
  })

  it('도움말 글씨는 14px 이상이다', () => {
    const css = read('src/App.css')
    const block = css.match(/\.table-editor-help-popover\s*\{[^}]*\}/)?.[0] ?? ''
    expect(Number(block.match(/font-size:\s*(\d+)px/)?.[1] ?? 0)).toBeGreaterThanOrEqual(14)
  })
})
