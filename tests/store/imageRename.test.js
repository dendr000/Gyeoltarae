// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { freshStore, ROOT } from '../helpers/store.js'

// 이미지 이름을 바꾸면 문서에 이미 쓰인 [[파일:옛이름]] 도 같이 바뀐다(열려 있는 탭 포함). 가짜 API(mockApi)의 가짜 파일 시스템으로 시험한다.
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

async function setup(docs) {
  const { state, api } = await freshStore()
  await api.importImageData(ROOT, '고양이.png', PNG)
  for (const [name, content] of Object.entries(docs)) await api.writeFile(`${ROOT}/${name}.md`, content)
  await state().loadWorkspace(ROOT)
  return { state, api }
}
const read = (api, name) => api.readFile(`${ROOT}/${name}.md`)

describe('renameImage: 문서 속 참조도 같이 바꾼다', () => {
  it('참조가 있는 문서만 새 이름으로 바꾸고 바꾼 문서 수를 돌려준다', async () => {
    const { state, api } = await setup({ 가: '[[파일:고양이]]', 나: '[[파일:고양이|200px]] 글', 다: '관계 없음 [[파일:다른]]' })
    const changed = await state().renameImage('고양이', '야옹이')
    expect(changed).toBe(2)
    expect(await read(api, '가')).toBe('[[파일:야옹이]]')
    expect(await read(api, '나')).toBe('[[파일:야옹이|200px]] 글')
    expect(await read(api, '다')).toBe('관계 없음 [[파일:다른]]')
  })

  it('이미지 자체도 새 이름으로 바뀐다(색인에 새 이름만 있다)', async () => {
    const { state } = await setup({ 가: '[[파일:고양이]]' })
    await state().renameImage('고양이', '야옹이')
    expect(Object.keys(state().imageIndex)).toEqual(['야옹이'])
  })

  it('참조하는 문서가 없으면 0 을 돌려주고 문서는 그대로다', async () => {
    const { state, api } = await setup({ 가: '그냥 글' })
    expect(await state().renameImage('고양이', '야옹이')).toBe(0)
    expect(await read(api, '가')).toBe('그냥 글')
  })

  it('같은 이름이 이미 있어 번호가 붙은 이름으로 바뀌면 문서도 그 최종 이름을 쓴다', async () => {
    const { state, api } = await setup({ 가: '[[파일:고양이]]' })
    await api.importImageData(ROOT, '강아지.png', PNG)
    await state().loadWorkspace(ROOT)
    await state().renameImage('고양이', '강아지')
    const finalName = Object.keys(state().imageIndex).find((name) => name !== '강아지')
    expect(finalName).toMatch(/^강아지 \(1\)$/)
    expect(await read(api, '가')).toBe(`[[파일:${finalName}]]`)
  })

  it('이름이 그대로면(같은 이름) 문서를 건드리지 않는다', async () => {
    const { state, api } = await setup({ 가: '[[파일:고양이]]' })
    expect(await state().renameImage('고양이', '고양이')).toBe(0)
    expect(await read(api, '가')).toBe('[[파일:고양이]]')
  })

  it('코드블록 안의 참조는 그대로 둔다', async () => {
    const { state, api } = await setup({ 가: '[[파일:고양이]]\n```\n[[파일:고양이]]\n```' })
    await state().renameImage('고양이', '야옹이')
    expect(await read(api, '가')).toBe('[[파일:야옹이]]\n```\n[[파일:고양이]]\n```')
  })

  it('열려 있는 문서의 화면 글도 바뀌고, 다시 저장돼도 옛 참조로 되돌아가지 않는다', async () => {
    const { state, api } = await setup({ 가: '앞 [[파일:고양이]]' })
    await state().openFile(`${ROOT}/가.md`, '가')
    expect(state().rawText).toBe('앞 [[파일:고양이]]')
    await state().renameImage('고양이', '야옹이')
    expect(state().rawText).toBe('앞 [[파일:야옹이]]')
    expect(state().isDirty).toBe(false)
    expect(state().tabs.find((tab) => tab.openPath === `${ROOT}/가.md`).rawText).toBe('앞 [[파일:야옹이]]')
    await state().flushActiveTabToDisk()
    expect(await read(api, '가')).toBe('앞 [[파일:야옹이]]')
  })

  it('열려 있는 문서에서 저장 안 된 입력이 있어도 먼저 저장한 뒤 바꾼다(입력이 날아가지 않음)', async () => {
    const { state, api } = await setup({ 가: '[[파일:고양이]]' })
    await state().openFile(`${ROOT}/가.md`, '가')
    state().updateText('[[파일:고양이]]\n새로 쓴 글')
    expect(state().isDirty).toBe(true)
    await state().renameImage('고양이', '야옹이')
    expect(await read(api, '가')).toBe('[[파일:야옹이]]\n새로 쓴 글')
    expect(state().rawText).toBe('[[파일:야옹이]]\n새로 쓴 글')
  })

  it('배경 탭으로 열려 있는 문서의 탭 글도 같이 바뀐다', async () => {
    const { state } = await setup({ 가: '[[파일:고양이]]', 나: '다른 문서' })
    await state().openFile(`${ROOT}/가.md`, '가')
    await state().openFile(`${ROOT}/나.md`, '나')
    await state().renameImage('고양이', '야옹이')
    expect(state().tabs.find((tab) => tab.openPath === `${ROOT}/가.md`).rawText).toBe('[[파일:야옹이]]')
    expect(state().rawText).toBe('다른 문서')
  })

  it('참조가 없는 문서는 디스크에서 다시 읽지도 않는다(색인으로 후보만 가려 빠르다)', async () => {
    const { state, api } = await setup({ 가: '[[파일:고양이]]', 나: '관계 없음', 다: '관계 없음 2' })
    const reads = []
    const baseRead = api.readFile
    api.readFile = async (path) => {
      reads.push(path)
      return baseRead(path)
    }
    await state().rewriteImageReferences('고양이', '야옹이')
    expect(reads).toEqual([`${ROOT}/가.md`])
  })

  it('색인에는 아직 참조가 없지만 열려 있는 탭 글에는 참조가 막 생긴 문서도 바꾼다', async () => {
    const { state, api } = await setup({ 가: '처음엔 참조 없음' })
    await state().openFile(`${ROOT}/가.md`, '가')
    state().updateText('이제 [[파일:고양이]] 있음')
    await api.writeFile(`${ROOT}/가.md`, '이제 [[파일:고양이]] 있음')
    expect(state().searchIndex[`${ROOT}/가.md`].content).toBe('처음엔 참조 없음')
    await state().rewriteImageReferences('고양이', '야옹이')
    expect(await read(api, '가')).toBe('이제 [[파일:야옹이]] 있음')
  })

  it('검색 색인도 새 이름 기준으로 다시 만들어진다', async () => {
    const { state } = await setup({ 가: '[[파일:고양이]]' })
    await state().renameImage('고양이', '야옹이')
    expect(state().searchIndex[`${ROOT}/가.md`].content).toBe('[[파일:야옹이]]')
  })

  it('작업 폴더가 없으면 0 을 돌려준다', async () => {
    const { state } = await setup({})
    state().workspacePath = null
    expect(await state().renameImage('고양이', '야옹이')).toBe(0)
  })
})

describe('편집창 삽입 요청 (이미지 우클릭 "문서에 넣기")', () => {
  it('처음에는 요청이 없다', async () => {
    const { state } = await setup({})
    expect(state().editorInsertRequest).toBeNull()
  })

  it('요청을 올리면 글과 고유 번호가 담기고, 같은 번호로 지울 수 있다', async () => {
    const { state } = await setup({})
    state().requestEditorInsert('[[파일:고양이]]')
    const request = state().editorInsertRequest
    expect(request.text).toBe('[[파일:고양이]]')
    expect(request.id).toBeTruthy()
    state().clearEditorInsert(request.id)
    expect(state().editorInsertRequest).toBeNull()
  })

  it('다른 번호로는 지워지지 않는다(새 요청이 옛 요청의 정리에 지워지지 않게)', async () => {
    const { state } = await setup({})
    state().requestEditorInsert('첫째')
    const first = state().editorInsertRequest
    state().requestEditorInsert('둘째')
    state().clearEditorInsert(first.id)
    expect(state().editorInsertRequest.text).toBe('둘째')
  })
})
