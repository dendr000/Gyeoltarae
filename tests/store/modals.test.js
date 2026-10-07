// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { freshStore } from '../helpers/store.js'

describe('상용구 모달 열림 상태 (사이드바 버튼과 Alt+T 가 같이 쓰는 상태)', () => {
  it('처음엔 닫혀 있다', async () => {
    const { state } = await freshStore()
    expect(state().snippetModalOpen).toBe(false)
    expect(state().snippetModalPrefillContent).toBe('')
  })

  it('선택한 글자를 넘겨서 열면 본문에 채울 값으로 기억한다', async () => {
    const { state } = await freshStore()
    state().openSnippetModal('선택해 둔 문장')
    expect(state().snippetModalOpen).toBe(true)
    expect(state().snippetModalPrefillContent).toBe('선택해 둔 문장')
  })

  it('아무것도 안 넘기고 열면 빈 값이고, 닫으면 채울 값도 비운다', async () => {
    const { state } = await freshStore()
    state().openSnippetModal('이전 선택')
    state().closeSnippetModal()
    expect(state().snippetModalOpen).toBe(false)
    expect(state().snippetModalPrefillContent).toBe('')

    state().openSnippetModal()
    expect(state().snippetModalOpen).toBe(true)
    expect(state().snippetModalPrefillContent).toBe('')
  })
})

describe('상용구 추천 팝업 토글 (Alt+Shift+T)', () => {
  it('기본은 켜져 있고, 한 번 누르면 꺼지고, 또 누르면 다시 켜진다', async () => {
    const { state } = await freshStore()
    expect(state().snippetSuggestEnabled).toBe(true)

    state().toggleSnippetSuggest()
    expect(state().snippetSuggestEnabled).toBe(false)

    state().toggleSnippetSuggest()
    expect(state().snippetSuggestEnabled).toBe(true)
  })

  it('스페이스바 자동 치환 스위치는 건드리지 않는다 (두 스위치는 서로 독립)', async () => {
    const { state } = await freshStore()
    const before = state().snippetSpaceExpandEnabled

    state().toggleSnippetSuggest()

    expect(state().snippetSpaceExpandEnabled).toBe(before)
  })
})

describe('사전 모달 열림 상태 (사이드바 버튼과 Alt+Shift+H 가 같이 쓰는 상태)', () => {
  it('선택한 글자를 넘겨서 열고, 닫으면 비운다', async () => {
    const { state } = await freshStore()

    state().openDictModal('동방')
    expect(state().dictModalOpen).toBe(true)
    expect(state().dictModalPrefillWord).toBe('동방')

    state().closeDictModal()
    expect(state().dictModalOpen).toBe(false)
    expect(state().dictModalPrefillWord).toBe('')
  })
})
