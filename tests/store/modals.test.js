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

describe('상용구 활성 폴더 — 모달을 닫으면 "전체"로 자동 복귀', () => {
  it("처음엔 '전체' 이고 복귀 설정은 켜져 있다", async () => {
    const { state } = await freshStore()
    expect(state().activeSnippetFolder).toBe('전체')
    expect(state().snippetResetFolderOnClose).toBe(true)
  })

  it('모달을 여는 것만으로는 고른 폴더가 바뀌지 않는다', async () => {
    const { state } = await freshStore()
    state().setActiveSnippetFolder('무협')

    state().openSnippetModal()

    expect(state().activeSnippetFolder).toBe('무협')
  })

  it('폴더를 고른 채 모달을 닫으면 "전체"가 된다 (기본 설정)', async () => {
    const { state } = await freshStore()
    state().openSnippetModal()
    state().setActiveSnippetFolder('무협')

    state().closeSnippetModal()

    expect(state().activeSnippetFolder).toBe('전체')
    expect(state().snippetModalOpen).toBe(false)
  })

  it('복귀 설정을 끄면 닫아도 고른 폴더가 그대로 유지된다', async () => {
    const { state } = await freshStore()
    state().setSnippetResetFolderOnClose(false)
    state().openSnippetModal()
    state().setActiveSnippetFolder('무협')

    state().closeSnippetModal()

    expect(state().activeSnippetFolder).toBe('무협')
  })

  it('복귀 설정을 다시 켜면 그 뒤로는 닫을 때 "전체"가 된다', async () => {
    const { state } = await freshStore()
    state().setSnippetResetFolderOnClose(false)
    state().setActiveSnippetFolder('무협')
    state().setSnippetResetFolderOnClose(true)

    state().closeSnippetModal()

    expect(state().activeSnippetFolder).toBe('전체')
  })

  it('활성 폴더 설정은 추천 팝업·스페이스바 치환 스위치와 서로 독립이다', async () => {
    const { state } = await freshStore()
    const before = { suggest: state().snippetSuggestEnabled, space: state().snippetSpaceExpandEnabled }

    state().setActiveSnippetFolder('무협')
    state().setSnippetResetFolderOnClose(false)
    state().closeSnippetModal()

    expect(state().snippetSuggestEnabled).toBe(before.suggest)
    expect(state().snippetSpaceExpandEnabled).toBe(before.space)
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
