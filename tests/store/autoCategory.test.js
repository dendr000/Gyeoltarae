import { beforeEach, describe, expect, it } from 'vitest'
import { ROOT, freshStore } from '../helpers/store.js'

const TOP = `${ROOT}/강의/따즈아`
const FOLDER_NAME = '01 올인원 DBMS!! 설계부터 운영까지!!'
const SUB = `${TOP}/${FOLDER_NAME}`

let ctx

// 워크스페이스 밑에 강의/따즈아/01 올인원 DBMS!! ... 폴더를 만든다 (실제 워크스페이스와 같은 모양).
beforeEach(async () => {
  ctx = await freshStore()
  await ctx.state().createFolder(ROOT, '강의')
  await ctx.state().createFolder(`${ROOT}/강의`, '따즈아')
  await ctx.state().createFolder(TOP, FOLDER_NAME)
})

const read = (filePath) => ctx.api.readFile(filePath)
const firstLines = async (filePath, n) => (await read(filePath)).split('\n').slice(0, n)

describe('폴더의 자동 분류 — 새 문서에 폴더·문서 이름의 글자를 분류로', () => {
  it('폴더 이름의 DBMS 와 문서 이름의 외래키가 분류로 들어간다 (사용자가 든 예 그대로)', async () => {
    await ctx.state().saveAutoCategory(TOP, ['DBMS', '외래키'])

    await ctx.state().createDoc(SUB, '04 외래키와 Join')

    expect(await firstLines(`${SUB}/04 외래키와 Join.md`, 4)).toEqual([
      '[[분류:ddazua]]',
      '[[분류:DBMS]]',
      '[[분류:외래키]]',
      '[목차]',
    ])
  })

  it('문서 이름에 읽을 글자가 없으면 폴더에서 찾은 것만 넣고 둘째 빈 칸은 남긴다', async () => {
    await ctx.state().saveAutoCategory(TOP, ['DBMS', '외래키'])

    await ctx.state().createDoc(SUB, '05 정렬과 그룹화')

    expect(await firstLines(`${SUB}/05 정렬과 그룹화.md`, 4)).toEqual([
      '[[분류:ddazua]]',
      '[[분류:DBMS]]',
      '[[분류:]]',
      '[목차]',
    ])
  })

  it('폴더 이름에도 문서 이름에도 읽을 글자가 없으면 기본 내용 그대로다', async () => {
    await ctx.state().saveAutoCategory(TOP, ['없는글자'])

    await ctx.state().createDoc(SUB, '06 부속 질의와 뷰')

    expect(await firstLines(`${SUB}/06 부속 질의와 뷰.md`, 3)).toEqual(['[[분류:ddazua]]', '[[분류:]]', '[[분류:]]'])
  })

  it('설정(읽을 글자)이 없으면 아무것도 바뀌지 않는다', async () => {
    await ctx.state().createDoc(SUB, '04 외래키와 Join')

    expect(await firstLines(`${SUB}/04 외래키와 Join.md`, 3)).toEqual(['[[분류:ddazua]]', '[[분류:]]', '[[분류:]]'])
  })

  it('설정 폴더 자신(따즈아)의 이름은 읽지 않는다', async () => {
    await ctx.state().saveAutoCategory(TOP, ['따즈아'])

    await ctx.state().createDoc(SUB, '메모')

    expect(await firstLines(`${SUB}/메모.md`, 2)).toEqual(['[[분류:ddazua]]', '[[분류:]]'])
  })

  it('따즈아 기본 내용이 없는 다른 폴더에서도 된다 — 기본 [[분류:]] 칸이 채워지고 남는 건 뒤에 붙는다', async () => {
    await ctx.state().createFolder(ROOT, '정보')
    await ctx.state().createFolder(`${ROOT}/정보`, '네트워크')
    await ctx.state().saveAutoCategory(`${ROOT}/정보`, ['네트워크', 'TCP'])

    await ctx.state().createDoc(`${ROOT}/정보/네트워크`, 'TCP 기초')

    expect(await read(`${ROOT}/정보/네트워크/TCP 기초.md`)).toBe('[[분류:네트워크]]\n[[분류:TCP]]\n')
  })

  it('직접 고른 글양식(틀)으로 만든 문서에도 분류가 붙는다', async () => {
    const templatePath = await ctx.api.ensureTemplate(ROOT, '내 양식')
    await ctx.api.writeFile(templatePath, '글양식 본문\n')
    await ctx.state().rebuildIndexes()
    await ctx.state().saveAutoCategory(TOP, ['DBMS'])

    await ctx.state().createDoc(SUB, '04 외래키와 Join', '내 양식')

    expect(await read(`${SUB}/04 외래키와 Join.md`)).toBe('글양식 본문\n\n[[분류:DBMS]]\n')
  })

  it('파일을 끌어다 놓아 가져온 문서에는 적용하지 않는다 (가져온 내용 그대로)', async () => {
    await ctx.state().saveAutoCategory(TOP, ['DBMS'])

    await ctx.state().importFiles(SUB, [{ name: '가져온 DBMS', content: '가져온 본문\n' }])

    expect(await read(`${SUB}/가져온 DBMS.md`)).toBe('가져온 본문\n')
  })

  it('설정이 여러 겹이면 가장 가까운 폴더의 설정만 쓴다', async () => {
    await ctx.state().saveAutoCategory(TOP, ['DBMS'])
    await ctx.state().saveAutoCategory(SUB, ['외래키'])

    await ctx.state().createDoc(SUB, '04 외래키와 Join')

    // 안쪽 설정(외래키)만 — 바깥(DBMS)은 합쳐지지 않는다
    expect(await firstLines(`${SUB}/04 외래키와 Join.md`, 3)).toEqual(['[[분류:ddazua]]', '[[분류:외래키]]', '[[분류:]]'])
  })

  it('저장한 설정을 그 폴더 자신의 설정으로 다시 읽는다', async () => {
    await ctx.state().saveAutoCategory(TOP, ['DBMS', '외래키'])

    expect(await ctx.api.readAutoCategory(ROOT, TOP, true)).toMatchObject({ keywords: ['DBMS', '외래키'] })
    // 하위 폴더 자신에는 설정이 없다(윗 폴더 것을 물려받아 쓰기만 함)
    expect(await ctx.api.readAutoCategory(ROOT, SUB, true)).toBeNull()
  })

  it('빈 목록으로 저장하면 자동 분류가 해제된다', async () => {
    await ctx.state().saveAutoCategory(TOP, ['DBMS'])
    await ctx.state().saveAutoCategory(TOP, [])

    await ctx.state().createDoc(SUB, '04 외래키와 Join')

    expect(await firstLines(`${SUB}/04 외래키와 Join.md`, 2)).toEqual(['[[분류:ddazua]]', '[[분류:]]'])
  })

  it('설정 파일은 문서 트리에 나타나지 않는다', async () => {
    await ctx.state().saveAutoCategory(TOP, ['DBMS'])
    await ctx.state().refreshTree()

    expect(JSON.stringify(ctx.state().tree)).not.toContain('auto-category')
  })
})
