import { beforeEach, describe, expect, it } from 'vitest'
import { findSnippetQuery } from '../../src/lib/snippetMatch.js'
import { ROOT, freshStore } from '../helpers/store.js'

const ORDER_PATH = `${ROOT}/.wikidesk-snippets/SQL/_순서.txt`

let ctx

// SQL 폴더에 상용구 셋을 만들어 둔다(제목 = 본문).
beforeEach(async () => {
  ctx = await freshStore()
  for (const title of ['SET', 'SUM', 'SELECT']) await ctx.state().createSnippetWithContent('SQL', title, title)
})

const entries = () => Object.values(ctx.state().snippetIndex)

describe('상용구 후보에 붙는 순서(rank) — 폴더의 _순서.txt', () => {
  it('순서 목록 파일이 없으면 rank 가 없고 기존 정렬(짧은 순)과 같다', async () => {
    expect(entries().every((e) => e.rank === undefined)).toBe(true)
    const titles = findSnippetQuery('s', 1, entries())?.matches.map((m) => m.title)
    expect(titles).toEqual(['SET', 'SUM', 'SELECT'])
  })

  it('순서 목록 파일을 두면 목록의 위치가 rank 가 되고, 추천에서 SELECT 가 SET 보다 위로 온다', async () => {
    await ctx.api.writeFile(ORDER_PATH, '# 설명\nSELECT\nSET\n')
    await ctx.state().rebuildIndexes()

    const byTitle = Object.fromEntries(entries().map((e) => [e.title, e.rank]))
    expect(byTitle).toEqual({ SELECT: 0, SET: 1, SUM: undefined })
    const titles = findSnippetQuery('s', 1, entries())?.matches.map((m) => m.title)
    expect(titles).toEqual(['SELECT', 'SET', 'SUM'])
  })

  it('순서 목록 파일이 상용구 목록에 상용구로 섞여 들어오지 않는다', async () => {
    await ctx.api.writeFile(ORDER_PATH, 'SELECT\n')
    await ctx.state().rebuildIndexes()

    expect(Object.keys(ctx.state().snippetIndex).sort()).toEqual(['SQL/SELECT', 'SQL/SET', 'SQL/SUM'])
  })

  it('순서 목록은 그 폴더에만 적용된다 (다른 폴더의 같은 제목은 영향 없음)', async () => {
    await ctx.state().createSnippetWithContent('영어', 'SELECT', '셀렉트')
    await ctx.api.writeFile(ORDER_PATH, 'SELECT\n')
    await ctx.state().rebuildIndexes()

    expect(ctx.state().snippetIndex['SQL/SELECT'].rank).toBe(0)
    expect(ctx.state().snippetIndex['영어/SELECT'].rank).toBeUndefined()
  })

  it('목록을 고치고 다시 읽으면 바뀐 순서가 반영된다', async () => {
    await ctx.api.writeFile(ORDER_PATH, 'SELECT\nSET\n')
    await ctx.state().rebuildIndexes()
    expect(ctx.state().snippetIndex['SQL/SET'].rank).toBe(1)

    await ctx.api.writeFile(ORDER_PATH, 'SET\nSELECT\n')
    await ctx.state().rebuildIndexes()
    expect(ctx.state().snippetIndex['SQL/SET'].rank).toBe(0)
    expect(ctx.state().snippetIndex['SQL/SELECT'].rank).toBe(1)
  })
})
