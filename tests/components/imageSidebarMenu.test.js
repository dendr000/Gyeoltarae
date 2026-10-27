// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 이미지 공간의 우클릭 메뉴와 편집창 삽입 연결을 소스로 점검한다. 규칙 자체는 tests/lib/imageRefs.test.js, tests/store/imageRename.test.js.
const read = (relative) => readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8')
const sidebar = read('src/components/ImageSidebar.jsx')
const editor = read('src/components/EditorPane.jsx')
const css = read('src/App.css')

describe('이미지 우클릭 메뉴', () => {
  it('이미지 항목을 우클릭하면 메뉴를 연다(이름을 바꾸는 중에는 열지 않는다)', () => {
    expect(sidebar).toMatch(/onContextMenu=\{\(e\) => !isRenaming && openImageMenu\(e, name\)\}/)
  })

  it('기본 우클릭 메뉴를 막고 메뉴를 마우스 자리에 띄운다', () => {
    expect(sidebar).toMatch(/function openImageMenu\(e, name\) \{\s*e\.preventDefault\(\)/)
    expect(sidebar).toMatch(/setMenu\(\{ x: e\.clientX, y: e\.clientY, items \}\)/)
    expect(sidebar).toMatch(/<ContextMenu x=\{menu\.x\} y=\{menu\.y\} items=\{menu\.items\} onClose=\{\(\) => setMenu\(null\)\} \/>/)
  })

  it('메뉴 항목은 문서에 넣기·문법 복사·이름 바꾸기·삭제이고 삭제는 위험 표시다', () => {
    expect(sidebar).toMatch(/label: '문서에 넣기'/)
    expect(sidebar).toMatch(/label: '문법 복사 \(\[\[파일:이름\]\]\)'/)
    expect(sidebar).toMatch(/label: '이름 바꾸기', onClick: \(\) => beginRename\(name\)/)
    expect(sidebar).toMatch(/label: '삭제', danger: true, onClick: \(\) => onDeleteImage\(name\)/)
  })

  it('"문서에 넣기"는 클립보드가 아니라 편집창 삽입 요청을 쓴다', () => {
    expect(sidebar).toMatch(/onClick: \(\) => requestEditorInsert\(`\[\[파일:\$\{name\}\]\]`\)/)
  })

  it('"문서에 넣기"는 편집창이 보이는 모드에서 문서가 열려 있을 때만 메뉴에 나온다', () => {
    expect(sidebar).toMatch(/Boolean\(s\.openPath\) && s\.mode !== 'preview'/)
    expect(sidebar).toMatch(/if \(editorAvailable\) items\.push\(\{ label: '문서에 넣기'/)
  })

  it('이름을 바꾼 뒤 문서 링크가 바뀐 개수를 알려 준다', () => {
    expect(sidebar).toMatch(/const changed = await onRenameImage\(name, trimmed\)/)
    expect(sidebar).toMatch(/if \(changed > 0\) \{[\s\S]*?문서 \$\{changed\}개의 이미지 링크도 함께 바꿨습니다/)
    expect(css).toMatch(/\.image-sidebar-notice\s*\{[^}]*var\(--accent\)/)
  })

  it('더블클릭 이름 바꾸기와 한 번 클릭 문법 복사는 그대로 있다', () => {
    expect(sidebar).toMatch(/onClick=\{\(\) => !isRenaming && handleCopy\(name\)\}/)
    expect(sidebar).toMatch(/onDoubleClick=\{\(e\) => \{[\s\S]*?beginRename\(name\)/)
  })
})

describe('편집창의 삽입 요청 받기', () => {
  it('요청이 오면 편집창이 있고 쓸 수 있을 때 커서 자리에 단독 줄로 넣는다', () => {
    expect(editor).toMatch(/if \(textarea && !disabled\) insertBlockText\(textarea, onChange, request\.text\)/)
  })

  it('받은 요청은 바로 지워서 한 번만 넣는다', () => {
    expect(editor).toMatch(/insertBlockText\(textarea, onChange, request\.text\)\s*clearEditorInsert\(request\.id\)/)
  })

  it('렌더 직후가 아니라 한 틱 미뤄서 넣는다(리액트가 넣은 글을 옛 값으로 되돌리지 않게)', () => {
    expect(editor).toMatch(/const timer = setTimeout\(\(\) => \{[\s\S]*?\}, 0\)\s*return \(\) => clearTimeout\(timer\)/)
  })

  it('요청이 없으면 아무것도 하지 않는다', () => {
    expect(editor).toMatch(/useEffect\(\(\) => \{\s*if \(!editorInsertRequest\) return/)
  })
})
