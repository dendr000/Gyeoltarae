import { beforeEach, describe, expect, it } from 'vitest'
import { ROOT, freshStore } from '../helpers/store.js'

let ctx
let docPath

beforeEach(async () => {
  ctx = await freshStore()
  docPath = await ctx.api.createFile(ROOT, '표시 시험')
  await ctx.api.writeFile(docPath, 'a\nb\nc\nd')
  await ctx.state().refreshTree()
  await ctx.state().openFile(docPath, '표시 시험.md')
})

describe('편집기 줄 여백 — 강조 표시 (스토어)', () => {
  it('줄을 켜고 끌 수 있다', () => {
    ctx.state().toggleLineMark(2)
    ctx.state().toggleLineMark(0)
    expect(ctx.state().lineMarks[docPath]).toEqual([0, 2])
    ctx.state().toggleLineMark(0)
    expect(ctx.state().lineMarks[docPath]).toEqual([2])
  })

  it('문서에 줄이 늘면 강조 표시가 같은 글을 따라 내려간다', () => {
    ctx.state().toggleLineMark(2) // c
    ctx.state().updateText('a\nNEW\nb\nc\nd')
    expect(ctx.state().lineMarks[docPath]).toEqual([3])
  })

  it('글자만 입력하면(줄 수 그대로) 강조 표시는 그대로', () => {
    ctx.state().toggleLineMark(1)
    ctx.state().updateText('a\nbbb\nc\nd')
    expect(ctx.state().lineMarks[docPath]).toEqual([1])
  })

  it('다른 문서의 표시와 섞이지 않는다', async () => {
    ctx.state().toggleLineMark(1)
    const other = await ctx.api.createFile(ROOT, '다른 문서')
    await ctx.api.writeFile(other, 'x\ny')
    await ctx.state().refreshTree()
    await ctx.state().openFile(other, '다른 문서.md')
    ctx.state().updateText('x\nNEW\ny')
    expect(ctx.state().lineMarks[docPath]).toEqual([1])
    expect(ctx.state().lineMarks[other]).toBeUndefined()
  })

  it('열린 문서가 없으면 아무 일도 없다', async () => {
    const fresh = await freshStore()
    fresh.state().toggleLineMark(0)
    expect(fresh.state().lineMarks).toEqual({})
  })

  it('줄 번호 표시: 기본 켜짐, 끄고 켤 수 있다', () => {
    expect(ctx.state().editorLineNumbers).toBe(true)
    ctx.state().setEditorLineNumbers(false)
    expect(ctx.state().editorLineNumbers).toBe(false)
    ctx.state().setEditorLineNumbers(true)
    expect(ctx.state().editorLineNumbers).toBe(true)
  })
})
