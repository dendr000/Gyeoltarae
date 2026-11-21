// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 인물 표 보기가 뷰어·헤더에 연결돼 있고 성능·화면 규칙을 지키는지 소스로 점검한다(실제 화면은 실제 창에서 확인).
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')
const view = read('src/components/CharacterTableView.jsx')
const viewer = read('src/components/ViewerPane.jsx')
const header = read('src/components/EditorHeader.jsx')
const css = read('src/App.css')

describe('CharacterTableView 성능', () => {
  it('글이 바뀌어도 입력을 막지 않게 파싱을 뒤로 미룬다', () => {
    expect(view).toMatch(/useDeferredValue\(text\)/)
    expect(view).toMatch(/useMemo\(\(\) => parseCharacters\(deferredText\), \[deferredText\]\)/)
  })

  it('화면에 보이는 행만 그린다(고정 행 높이와 위아래 빈 칸)', () => {
    expect(view).toMatch(/rows\.slice\(first, last\)/)
    expect(view).toMatch(/const ROW_HEIGHT = \d+/)
  })

  it('상태는 문서별로 기억하고 바뀔 때 저장한다', () => {
    expect(view).toMatch(/loadViewState\(openPath\)/)
    expect(view).toMatch(/saveViewState\(openPath, view\)/)
  })

  it('이 화면은 문서를 고치지 않는다(저장·쓰기 호출이 없다)', () => {
    expect(view).not.toMatch(/writeFile|saveFile|onChange\(/)
  })
})

describe('연결', () => {
  it('뷰어는 표 보기가 켜지면 문서 대신 인물 표를 그리고, 행을 누르면 문서로 돌아가 그 제목으로 간다', () => {
    expect(viewer).toMatch(/if \(characterTableOpen\) \{[\s\S]*<CharacterTableView/)
    expect(viewer).toMatch(/setCharacterTableOpen\(false\)\s*scrollToCharacter\(c\.offset\)/)
    expect(viewer).toMatch(/wiki-heading-edit-link\[data-source-offset="\$\{offset\}"\]/)
  })

  it('편집기 이동은 제목 줄 위치로 requestEditorJump 를 부른다', () => {
    expect(viewer).toMatch(/requestEditorJump\(c\.offset\)/)
  })

  it('헤더 단추는 편집 모드에서 켜면 듀얼로 바꿔 표가 보이게 한다', () => {
    expect(header).toMatch(/if \(next && mode === 'focus'\) onModeChange\('dual'\)/)
  })
})

describe('화면 규칙', () => {
  it('버튼·머리글·칩은 줄바꿈하지 않는다', () => {
    for (const selector of ['.ctable-btn', '.ctable-sort', '.ctable-chip', '.ctable-open']) {
      const start = css.indexOf(`\n${selector} {`)
      expect(start, selector).toBeGreaterThan(-1)
      expect(css.slice(start, css.indexOf('\n}', start)), selector).toMatch(/white-space:\s*nowrap/)
    }
  })

  it('색은 라이트·다크가 같이 바뀌는 변수만 쓴다', () => {
    const block = css.slice(css.indexOf('/* --- 인물 표 보기'))
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('코드에 이모지를 쓰지 않는다', () => {
    expect(view).not.toMatch(/\p{Extended_Pictographic}/u)
  })
})
