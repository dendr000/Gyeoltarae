import { beforeEach, describe, expect, it } from 'vitest'
import { DDAZUA_TEMPLATE } from '../helpers/ddazuaTemplate.js'
import { ROOT, freshStore } from '../helpers/store.js'

let ctx
let dir // 따즈아 폴더
let sub // 따즈아 아래 "01 올인원" 폴더

// 워크스페이스 밑에 강의/따즈아/01 올인원 폴더를 만들어 둔다 (실제 워크스페이스와 같은 모양).
beforeEach(async () => {
  ctx = await freshStore()
  await ctx.state().createFolder(ROOT, '강의')
  await ctx.state().createFolder(`${ROOT}/강의`, '따즈아')
  await ctx.state().createFolder(`${ROOT}/강의/따즈아`, '01 올인원')
  dir = `${ROOT}/강의/따즈아`
  sub = `${dir}/01 올인원`
})

const read = (filePath) => ctx.api.readFile(filePath)

describe('새 문서 만들기 — 따즈아 폴더의 기본 내용', () => {
  it('따즈아 폴더에서 만든 새 문서는 요청받은 기본 내용으로 시작한다', async () => {
    await ctx.state().createDoc(dir, '새 강의')

    expect(await read(`${dir}/새 강의.md`)).toBe(DDAZUA_TEMPLATE)
  })

  it('따즈아 아래 하위 폴더에서 만들어도 같다', async () => {
    await ctx.state().createDoc(sub, '01 데이터베이스 개론')

    expect(await read(`${sub}/01 데이터베이스 개론.md`)).toBe(DDAZUA_TEMPLATE)
  })

  it('따즈아 밖에서 만든 새 문서는 예전 기본 내용([[분류:]] 한 줄) 그대로다', async () => {
    await ctx.state().createDoc(`${ROOT}/강의`, '다른 문서')

    expect(await read(`${ROOT}/강의/다른 문서.md`)).toBe('[[분류:]]\n')
  })

  it('사용자가 고른 글양식(틀)이 있으면 폴더 기본 내용보다 글양식이 우선한다', async () => {
    const templatePath = await ctx.api.ensureTemplate(ROOT, '내 양식')
    await ctx.api.writeFile(templatePath, '글양식 본문\n')
    await ctx.state().rebuildIndexes()

    await ctx.state().createDoc(dir, '양식 문서', '내 양식')

    const content = await read(`${dir}/양식 문서.md`)
    expect(content).toContain('글양식 본문')
    expect(content).not.toContain('ddazua')
  })

  it('파일을 끌어다 놓아 가져온 문서는 가져온 내용 그대로이고 기본 내용이 끼어들지 않는다', async () => {
    await ctx.state().importFiles(dir, [{ name: '가져온', content: '가져온 본문\n' }])

    expect(await read(`${dir}/가져온.md`)).toBe('가져온 본문\n')
  })

  it('따즈아가 작품 폴더(소설 밑) 안에 있으면 빈 [[분류:]] 줄이 그 작품의 자동 분류로 채워진다', async () => {
    await ctx.state().createFolder(`${ROOT}/소설`, '작품')
    await ctx.state().createFolder(`${ROOT}/소설/작품`, '따즈아')

    await ctx.state().createDoc(`${ROOT}/소설/작품/따즈아`, '안쪽 문서')

    // 작품 폴더의 자동 분류가 첫 번째 빈 칸에 들어가고(두 줄), 두 번째 빈 칸은 그대로 남는다.
    expect(await read(`${ROOT}/소설/작품/따즈아/안쪽 문서.md`)).toBe(
      DDAZUA_TEMPLATE.replace('[[분류:]]', '[[분류:작품]]\n[[분류:작품/따즈아]]'),
    )
  })

  it('기본 내용으로 시작한 문서는 열려서 편집창에 같은 내용이 보인다', async () => {
    await ctx.state().createDoc(dir, '열리는 문서')

    expect(ctx.state().openPath).toBe(`${dir}/열리는 문서.md`)
    expect(ctx.state().rawText).toBe(DDAZUA_TEMPLATE)
  })
})
