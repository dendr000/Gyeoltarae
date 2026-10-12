import { beforeEach, describe, expect, it } from 'vitest'
import { wordCandidates } from '../../src/lib/scopeWords.js'
import { ROOT, freshStore } from '../helpers/store.js'

let ctx
let dir // 강의/따즈아 (두 번째 단계 폴더)
let other // 강의/다른강의

async function writeDoc(folder, name, content) {
  const filePath = await ctx.api.createFile(folder, name)
  await ctx.api.writeFile(filePath, content)
  return filePath
}

const titlesFor = (currentPath, wholeTops = []) =>
  wordCandidates(ctx.state().scopeWordIndex, { currentPath, root: ROOT, wholeTops })
    .map((i) => i.title)
    .sort()

beforeEach(async () => {
  ctx = await freshStore()
  await ctx.state().createFolder(ROOT, '강의')
  await ctx.state().createFolder(`${ROOT}/강의`, '따즈아')
  await ctx.state().createFolder(`${ROOT}/강의`, '다른강의')
  dir = `${ROOT}/강의/따즈아`
  other = `${ROOT}/강의/다른강의`
})

describe('폴더 범위 영어 단어 색인 (스토어)', () => {
  it('문서를 저장·색인하면 같은 범위의 다른 문서를 쓸 때 그 단어가 후보가 된다', async () => {
    await writeDoc(dir, 'A', 'CREATE TABLE emp;')
    const b = await writeDoc(dir, 'B', '새 글')
    await ctx.state().refreshTree()
    await ctx.state().rebuildIndexes()

    expect(titlesFor(b)).toEqual(['CREATE', 'TABLE', 'emp'])
  })

  it('다른 두 번째 단계 폴더의 단어는 기본으로는 안 뜨고, 최상위 폴더 전체 모으기를 켜면 뜬다', async () => {
    await writeDoc(other, 'C', 'Alpha')
    const b = await writeDoc(dir, 'B', '새 글')
    await ctx.state().refreshTree()
    await ctx.state().rebuildIndexes()

    expect(titlesFor(b)).toEqual([])
    ctx.state().setWholeScopeTopFolder('강의', true)
    expect(ctx.state().wholeScopeTopFolders).toEqual(['강의'])
    expect(titlesFor(b, ctx.state().wholeScopeTopFolders)).toEqual(['Alpha'])
    ctx.state().setWholeScopeTopFolder('강의', false)
    expect(ctx.state().wholeScopeTopFolders).toEqual([])
  })

  it('문서를 고쳐 저장하면(색인 다시 만들기) 새 단어가 반영된다', async () => {
    const a = await writeDoc(dir, 'A', 'First')
    const b = await writeDoc(dir, 'B', 'x')
    await ctx.state().refreshTree()
    await ctx.state().rebuildIndexes()
    expect(titlesFor(b)).toEqual(['First'])

    await ctx.api.writeFile(a, 'First Second')
    await ctx.state().rebuildIndexes()

    expect(titlesFor(b)).toEqual(['First', 'Second'])
  })

  it('추천을 끄면 색인을 비우고 다시 만들어도 만들지 않는다. 다시 켜면 바로 만든다', async () => {
    await writeDoc(dir, 'A', 'CREATE')
    const b = await writeDoc(dir, 'B', 'x')
    await ctx.state().refreshTree()
    await ctx.state().rebuildIndexes()
    expect(ctx.state().scopeWordIndex).not.toBeNull()

    ctx.state().setScopeWordSuggestEnabled(false)
    expect(ctx.state().scopeWordIndex).toBeNull()
    await ctx.state().rebuildIndexes()
    expect(ctx.state().scopeWordIndex).toBeNull()

    ctx.state().setScopeWordSuggestEnabled(true)
    expect(titlesFor(b)).toEqual(['CREATE'])
  })

  it('기본값: 추천 켜짐, 전체 모으기는 어느 폴더도 켜지 않은 상태', () => {
    expect(ctx.state().scopeWordSuggestEnabled).toBe(true)
    expect(ctx.state().wholeScopeTopFolders).toEqual([])
  })
})
