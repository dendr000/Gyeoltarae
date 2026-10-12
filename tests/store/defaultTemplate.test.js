import { beforeEach, describe, expect, it } from 'vitest'
import { NO_TEMPLATE } from '../../src/lib/defaultTemplate.js'
import { DDAZUA_TEMPLATE, FOLDER_01 } from '../helpers/ddazuaTemplate.js'
import { ROOT, freshStore } from '../helpers/store.js'

let ctx
let dir // 강의/따즈아
let lecture // 강의/따즈아/03 새 강의

async function makeTemplate(name, body) {
  const templatePath = await ctx.api.ensureTemplate(ROOT, name)
  await ctx.api.writeFile(templatePath, body)
  await ctx.state().rebuildIndexes()
}

const read = (filePath) => ctx.api.readFile(filePath)

beforeEach(async () => {
  ctx = await freshStore()
  await ctx.state().createFolder(ROOT, '강의')
  await ctx.state().createFolder(`${ROOT}/강의`, '따즈아')
  dir = `${ROOT}/강의/따즈아`
  await ctx.state().createFolder(dir, '03 새 강의')
  lecture = `${dir}/03 새 강의`
})

describe('폴더 기본 틀 — 새 문서를 만들 때 자동으로 고른다', () => {
  it('기본 틀을 정해 둔 폴더에서 틀을 고르지 않고 만들면 그 틀로 시작한다', async () => {
    await makeTemplate('강의 틀', '=  =\n본문 자리\n')
    await ctx.state().saveDefaultTemplate(lecture, '강의 틀')

    await ctx.state().createDoc(lecture, '문서')

    expect(await read(`${lecture}/문서.md`)).toBe('=  =\n본문 자리\n')
  })

  it('틀이 정해지지 않은 폴더는 예전 그대로다 ([[분류:]] 한 줄)', async () => {
    await makeTemplate('강의 틀', '틀 본문\n')

    await ctx.state().createDoc(lecture, '문서')

    expect(await read(`${lecture}/문서.md`)).toBe('[[분류:]]\n')
  })

  it('하위 폴더는 윗 폴더의 기본 틀을 물려받는다', async () => {
    await makeTemplate('강의 틀', '틀 본문\n')
    await ctx.state().saveDefaultTemplate(dir, '강의 틀')
    await ctx.state().createFolder(lecture, '부록')

    await ctx.state().createDoc(`${lecture}/부록`, '문서')

    expect(await read(`${lecture}/부록/문서.md`)).toBe('틀 본문\n')
  })

  it('강의 폴더마다 다른 틀을 줄 수 있다', async () => {
    await makeTemplate('틀 A', 'A 본문\n')
    await makeTemplate('틀 B', 'B 본문\n')
    await ctx.state().createFolder(dir, '04 다른 강의')
    await ctx.state().saveDefaultTemplate(lecture, '틀 A')
    await ctx.state().saveDefaultTemplate(`${dir}/04 다른 강의`, '틀 B')

    await ctx.state().createDoc(lecture, '문서')
    await ctx.state().createDoc(`${dir}/04 다른 강의`, '문서')

    expect(await read(`${lecture}/문서.md`)).toBe('A 본문\n')
    expect(await read(`${dir}/04 다른 강의/문서.md`)).toBe('B 본문\n')
  })

  it('직접 고른 틀이 폴더 기본 틀보다 우선한다', async () => {
    await makeTemplate('기본', '기본 본문\n')
    await makeTemplate('직접', '직접 본문\n')
    await ctx.state().saveDefaultTemplate(lecture, '기본')

    await ctx.state().createDoc(lecture, '문서', '직접')

    expect(await read(`${lecture}/문서.md`)).toBe('직접 본문\n')
  })

  it('"틀을 쓰지 않음"을 고르면 기본 틀을 건너뛰고 빈 문서로 시작한다', async () => {
    await makeTemplate('기본', '기본 본문\n')
    await ctx.state().saveDefaultTemplate(lecture, '기본')

    await ctx.state().createDoc(lecture, '문서', NO_TEMPLATE)

    expect(await read(`${lecture}/문서.md`)).toBe('[[분류:]]\n')
  })

  it('기본 틀을 해제하면(빈 이름) 다시 예전 그대로다', async () => {
    await makeTemplate('기본', '기본 본문\n')
    await ctx.state().saveDefaultTemplate(lecture, '기본')
    await ctx.state().saveDefaultTemplate(lecture, '')

    await ctx.state().createDoc(lecture, '문서')

    expect(await read(`${lecture}/문서.md`)).toBe('[[분류:]]\n')
  })

  it('정해 둔 틀이 지워졌으면(이름이 없으면) 오류 없이 예전 기본 내용으로 시작한다', async () => {
    await ctx.state().saveDefaultTemplate(lecture, '지워진 틀')

    await ctx.state().createDoc(lecture, '문서')

    expect(await read(`${lecture}/문서.md`)).toBe('[[분류:]]\n')
  })

  it('틀 본문의 빈 [[분류:]] 칸은 폴더 자동 분류(읽어들일 글자)가 채운다', async () => {
    await makeTemplate('분류 틀', '[[분류:]]\n본문\n')
    await ctx.state().saveDefaultTemplate(lecture, '분류 틀')
    await ctx.state().saveAutoCategory(dir, ['DBMS'])

    await ctx.state().createDoc(lecture, 'DBMS 개론')

    expect(await read(`${lecture}/DBMS 개론.md`)).toBe('[[분류:DBMS]]\n본문\n')
  })

  it('틀 본문의 {{{#!if}}} 같은 문법은 틀을 직접 골랐을 때처럼 한 번 풀려서 복사된다', async () => {
    await makeTemplate('조건 틀', '{{{#!if 1 == 1\n참일 때 내용\n}}}\n')
    await ctx.state().saveDefaultTemplate(lecture, '조건 틀')
    await ctx.state().createDoc(lecture, '직접 고른 문서', '조건 틀')
    const explicit = await read(`${lecture}/직접 고른 문서.md`)

    await ctx.state().createDoc(lecture, '기본 틀 문서')

    expect(await read(`${lecture}/기본 틀 문서.md`)).toBe(explicit)
  })
})

describe('폴더 기본 틀과 내장 폴더 기본 내용(따즈아 01·02)의 우선순위', () => {
  it('01 올인원 폴더는 기본 틀 설정이 없으면 내장 기본 내용을 쓴다', async () => {
    await ctx.state().createFolder(dir, FOLDER_01)

    await ctx.state().createDoc(`${dir}/${FOLDER_01}`, '문서')

    expect(await read(`${dir}/${FOLDER_01}/문서.md`)).toBe(DDAZUA_TEMPLATE)
  })

  it('같은 폴더에 기본 틀을 정하면 내장 기본 내용보다 그 틀이 우선한다', async () => {
    await makeTemplate('내 틀', '내 틀 본문\n')
    await ctx.state().createFolder(dir, FOLDER_01)
    await ctx.state().saveDefaultTemplate(`${dir}/${FOLDER_01}`, '내 틀')

    await ctx.state().createDoc(`${dir}/${FOLDER_01}`, '문서')

    expect(await read(`${dir}/${FOLDER_01}/문서.md`)).toBe('내 틀 본문\n')
  })

  it('"틀을 쓰지 않음"은 내장 기본 내용도 건너뛴다', async () => {
    await ctx.state().createFolder(dir, FOLDER_01)

    await ctx.state().createDoc(`${dir}/${FOLDER_01}`, '문서', NO_TEMPLATE)

    expect(await read(`${dir}/${FOLDER_01}/문서.md`)).toBe('[[분류:]]\n')
  })

  it('정해 둔 틀이 지워지면 내장 기본 내용으로 돌아간다', async () => {
    await ctx.state().createFolder(dir, FOLDER_01)
    await ctx.state().saveDefaultTemplate(`${dir}/${FOLDER_01}`, '지워진 틀')

    await ctx.state().createDoc(`${dir}/${FOLDER_01}`, '문서')

    expect(await read(`${dir}/${FOLDER_01}/문서.md`)).toBe(DDAZUA_TEMPLATE)
  })
})
