import { beforeEach, describe, expect, it } from 'vitest'
import { DDAZUA_TEMPLATE, FOLDER_01, FOLDER_02, PRACTICE_TEMPLATE } from '../helpers/ddazuaTemplate.js'
import { ROOT, freshStore } from '../helpers/store.js'

let ctx
let dir // 따즈아 폴더
let sub01 // 따즈아/01 올인원 DBMS!! 설계부터 운영까지!!
let sub02 // 따즈아/02 배워서 바로 써먹는 DBMS

// 워크스페이스 밑에 강의/따즈아 와 그 아래 01, 02 폴더를 만들어 둔다 (실제 워크스페이스와 같은 모양).
beforeEach(async () => {
  ctx = await freshStore()
  await ctx.state().createFolder(ROOT, '강의')
  await ctx.state().createFolder(`${ROOT}/강의`, '따즈아')
  dir = `${ROOT}/강의/따즈아`
  await ctx.state().createFolder(dir, FOLDER_01)
  await ctx.state().createFolder(dir, FOLDER_02)
  sub01 = `${dir}/${FOLDER_01}`
  sub02 = `${dir}/${FOLDER_02}`
})

const read = (filePath) => ctx.api.readFile(filePath)

describe('새 문서 만들기 — 따즈아 하위 폴더별 기본 내용', () => {
  it('01 올인원 폴더에서 만든 새 문서는 요청받은 기본 내용으로 시작한다', async () => {
    await ctx.state().createDoc(sub01, '01 데이터베이스 개론')

    expect(await read(`${sub01}/01 데이터베이스 개론.md`)).toBe(DDAZUA_TEMPLATE)
  })

  it('01 올인원 폴더 아래 더 깊은 폴더에서 만들어도 같다', async () => {
    await ctx.state().createFolder(sub01, '부록')

    await ctx.state().createDoc(`${sub01}/부록`, '부록 문서')

    expect(await read(`${sub01}/부록/부록 문서.md`)).toBe(DDAZUA_TEMPLATE)
  })

  it('02 배워서 바로 써먹는 폴더에서 만든 새 문서는 큰 제목 + DBeaver 코드블록 셋으로 시작한다', async () => {
    await ctx.state().createDoc(sub02, '01 첫 실습')

    expect(await read(`${sub02}/01 첫 실습.md`)).toBe(PRACTICE_TEMPLATE)
  })

  it('따즈아 폴더 자신에서 만든 새 문서는 이제 예전 기본 내용([[분류:]] 한 줄)이다', async () => {
    await ctx.state().createDoc(dir, '새 강의')

    expect(await read(`${dir}/새 강의.md`)).toBe('[[분류:]]\n')
  })

  it('틀이 정해지지 않은 따즈아 하위 폴더도 [[분류:]] 한 줄이다', async () => {
    await ctx.state().createFolder(dir, '03 다른 강의')

    await ctx.state().createDoc(`${dir}/03 다른 강의`, '문서')

    expect(await read(`${dir}/03 다른 강의/문서.md`)).toBe('[[분류:]]\n')
  })

  it('따즈아 밖에서 만든 새 문서는 예전 기본 내용([[분류:]] 한 줄) 그대로다', async () => {
    await ctx.state().createDoc(`${ROOT}/강의`, '다른 문서')

    expect(await read(`${ROOT}/강의/다른 문서.md`)).toBe('[[분류:]]\n')
  })

  it('사용자가 고른 글양식(틀)이 있으면 폴더 기본 내용보다 글양식이 우선한다', async () => {
    const templatePath = await ctx.api.ensureTemplate(ROOT, '내 양식')
    await ctx.api.writeFile(templatePath, '글양식 본문\n')
    await ctx.state().rebuildIndexes()

    await ctx.state().createDoc(sub02, '양식 문서', '내 양식')

    const content = await read(`${sub02}/양식 문서.md`)
    expect(content).toContain('글양식 본문')
    expect(content).not.toContain('DBeaver')
  })

  it('파일을 끌어다 놓아 가져온 문서는 가져온 내용 그대로이고 기본 내용이 끼어들지 않는다', async () => {
    await ctx.state().importFiles(sub02, [{ name: '가져온', content: '가져온 본문\n' }])

    expect(await read(`${sub02}/가져온.md`)).toBe('가져온 본문\n')
  })

  it('01 폴더가 작품 폴더(소설 밑) 안에 있으면 빈 [[분류:]] 줄이 그 작품의 자동 분류로 채워진다', async () => {
    await ctx.state().createFolder(`${ROOT}/소설`, '작품')
    await ctx.state().createFolder(`${ROOT}/소설/작품`, '따즈아')
    await ctx.state().createFolder(`${ROOT}/소설/작품/따즈아`, FOLDER_01)

    await ctx.state().createDoc(`${ROOT}/소설/작품/따즈아/${FOLDER_01}`, '안쪽 문서')

    const content = await read(`${ROOT}/소설/작품/따즈아/${FOLDER_01}/안쪽 문서.md`)
    // 첫 번째 빈 칸이 자동 분류 줄들(작품, 작품/…)로 바뀌고, 둘째 빈 칸부터는 기본 내용 그대로 남는다.
    const lines = content.split('\n')
    expect(lines.slice(0, 2)).toEqual(['[[분류:ddazua]]', '[[분류:작품]]'])
    const rest = lines.slice(2).filter((line) => !line.startsWith('[[분류:작품/'))
    expect(rest).toEqual(DDAZUA_TEMPLATE.split('\n').slice(2))
  })

  it('02 폴더에 자동 분류(읽어들일 글자)가 있으면 찾은 분류가 맨 위 분류 줄들 바로 뒤에 붙는다', async () => {
    await ctx.state().saveAutoCategory(dir, ['DBMS', '외래키'])

    await ctx.state().createDoc(sub02, '04 외래키와 Join')

    const lines = (await read(`${sub02}/04 외래키와 Join.md`)).split('\n')
    // DBMS 는 이미 적혀 있어 다시 넣지 않고, 새로 찾은 외래키만 분류 줄들 뒤에 들어간다.
    expect(lines.slice(0, 6)).toEqual([
      '[[분류:ddazua]]',
      '[[분류:DBMS]]',
      '[[분류:DBMS/]]',
      '[[분류:외래키]]',
      '[목차]',
      '[clearfix]',
    ])
  })

  it('02 폴더가 작품 폴더 안에 있으면 비어 있는 분류 칸이 없어서 작품 자동 분류 줄은 맨 끝에 붙는다', async () => {
    await ctx.state().createFolder(`${ROOT}/소설/작품`, '따즈아')
    await ctx.state().createFolder(`${ROOT}/소설/작품/따즈아`, FOLDER_02)

    await ctx.state().createDoc(`${ROOT}/소설/작품/따즈아/${FOLDER_02}`, '안쪽 문서')

    const content = await read(`${ROOT}/소설/작품/따즈아/${FOLDER_02}/안쪽 문서.md`)
    expect(content.startsWith(PRACTICE_TEMPLATE.replace(/\s+$/, ''))).toBe(true)
    expect(content).toContain('\n\n[[분류:작품]]')
  })

  it('기본 내용으로 시작한 문서는 열려서 편집창에 같은 내용이 보인다', async () => {
    await ctx.state().createDoc(sub02, '열리는 문서')

    expect(ctx.state().openPath).toBe(`${sub02}/열리는 문서.md`)
    expect(ctx.state().rawText).toBe(PRACTICE_TEMPLATE)
  })
})
