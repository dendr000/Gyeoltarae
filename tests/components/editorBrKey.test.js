// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 문서 편집기의 숫자패드 Enter -> [br] 입력(소스 점검). 실제 키 입력은 실제 창에서 확인한다(docs/features/br-shortcut.md).
const pane = readFileSync(new URL('../../src/components/EditorPane.jsx', import.meta.url), 'utf8')

describe('EditorPane 의 숫자패드 Enter', () => {
  it('isNumpadEnterKey 로 판단해 선택 범위(없으면 커서 자리)에 [br] 을 넣는다', () => {
    expect(pane).toContain("from '../lib/numpadEnter.js'")
    expect(pane).toMatch(/if \(isNumpadEnterKey\(e\) && !e\.nativeEvent\.isComposing\) \{\s*e\.preventDefault\(\)\s*replaceRange\(textarea, textarea\.selectionStart, textarea\.selectionEnd, '\[br\]', onChange\)/)
  })

  it('입력칸의 되돌리기(Ctrl+Z)가 이어지도록 replaceRange(execCommand)로 넣는다', () => {
    const handler = pane.slice(pane.indexOf('isNumpadEnterKey(e) &&'), pane.indexOf('isNumpadEnterKey(e) &&') + 400)
    expect(handler).toContain('replaceRange(')
    expect(handler).not.toContain('textarea.value =')
  })

  it('위키 링크 Enter·목록 이어쓰기 처리보다 앞에 있다 (그쪽은 key === Enter 라서 숫자패드 Enter 도 걸린다)', () => {
    const at = pane.indexOf('isNumpadEnterKey(e) &&')
    expect(at).toBeGreaterThan(-1)
    expect(at).toBeLessThan(pane.indexOf("e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey && isInsideWikiLink(textarea)"))
    expect(at).toBeLessThan(pane.indexOf('listContinueEdit(textarea.value'))
  })

  it('상용구·파일 추천 팝업의 Enter 확정 처리보다는 뒤에 있다 (팝업이 열려 있으면 숫자패드 Enter 도 확정)', () => {
    const at = pane.indexOf('isNumpadEnterKey(e) &&')
    expect(at).toBeGreaterThan(pane.indexOf("if ((e.key === 'Enter' || e.key === 'Tab') && fileSuggest.items.length > 0)"))
  })
})
