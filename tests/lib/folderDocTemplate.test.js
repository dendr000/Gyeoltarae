import { describe, expect, it } from 'vitest'
import { findFolderDocTemplate } from '../../src/lib/folderDocTemplate.js'
import {
  DDAZUA_TEMPLATE,
  DDAZUA_TEMPLATE_LINES,
  FOLDER_01,
  FOLDER_02,
  PRACTICE_TEMPLATE,
} from '../helpers/ddazuaTemplate.js'

const F01 = `D:/WikiDesk/강의/따즈아/${FOLDER_01}`
const F02 = `D:/WikiDesk/강의/따즈아/${FOLDER_02}`

describe('findFolderDocTemplate (폴더별 새 문서 기본 틀) — 따즈아 하위 폴더마다 따로', () => {
  it('01 올인원 폴더는 요청받은 기본 내용(분류·목차·큰 제목 네 묶음)을 돌려준다', () => {
    expect(findFolderDocTemplate(F01)).toBe(DDAZUA_TEMPLATE)
  })

  it('02 배워서 바로 써먹는 폴더는 요청받은 기본 내용(큰 제목 + DBeaver 코드블록 셋)을 돌려준다', () => {
    expect(findFolderDocTemplate(F02)).toBe(PRACTICE_TEMPLATE)
  })

  it('두 폴더의 내용은 서로 다르다', () => {
    expect(findFolderDocTemplate(F01)).not.toBe(findFolderDocTemplate(F02))
  })

  it('따즈아 폴더 자신과 틀이 정해지지 않은 하위 폴더는 null (기본 [[분류:]] 한 줄로 시작)', () => {
    expect(findFolderDocTemplate('D:/WikiDesk/강의/따즈아')).toBeNull()
    expect(findFolderDocTemplate('D:/WikiDesk/강의/따즈아/03 다른 강의')).toBeNull()
    expect(findFolderDocTemplate('/mock/workspace/따즈아/01 가/02 나/03 다')).toBeNull()
  })

  it('폴더 이름 전체가 같아야 한다 — 앞부분만 같거나 번호·글자가 다르면 해당하지 않는다', () => {
    expect(findFolderDocTemplate('/a/따즈아/01 올인원')).toBeNull()
    expect(findFolderDocTemplate('/a/따즈아/02 배워서 바로 써먹는')).toBeNull()
    expect(findFolderDocTemplate(`/a/따즈아/${FOLDER_02} (1)`)).toBeNull()
    expect(findFolderDocTemplate('/a/따즈아/03 배워서 바로 써먹는 DBMS')).toBeNull()
  })

  it('부모가 따즈아가 아니면 같은 이름이어도 해당하지 않는다', () => {
    expect(findFolderDocTemplate(`D:/WikiDesk/강의/다른강의/${FOLDER_01}`)).toBeNull()
    expect(findFolderDocTemplate(`D:/WikiDesk/${FOLDER_02}`)).toBeNull()
    expect(findFolderDocTemplate(`/a/따즈아 (1)/${FOLDER_02}`)).toBeNull()
  })

  it('그 폴더 아래 더 깊은 하위 폴더에서 만들어도 그 폴더의 틀이 적용된다', () => {
    expect(findFolderDocTemplate(`${F01}/하위/더 하위`)).toBe(DDAZUA_TEMPLATE)
    expect(findFolderDocTemplate(`${F02}/하위`)).toBe(PRACTICE_TEMPLATE)
  })

  it('Windows 경로(역슬래시)도 받는다', () => {
    expect(findFolderDocTemplate(`D:\\WikiDesk\\강의\\따즈아\\${FOLDER_01}`)).toBe(DDAZUA_TEMPLATE)
    expect(findFolderDocTemplate(`D:\\WikiDesk\\강의\\따즈아\\${FOLDER_02}`)).toBe(PRACTICE_TEMPLATE)
  })

  it('한글을 자모로 풀어 쓴 이름(NFD)이어도 같은 폴더로 본다', () => {
    expect(findFolderDocTemplate(`/a/따즈아/${FOLDER_02}`.normalize('NFD'))).toBe(PRACTICE_TEMPLATE)
  })

  it('경로 맨 앞이 따즈아여도 동작하고, 빈 경로는 null', () => {
    expect(findFolderDocTemplate(`따즈아/${FOLDER_02}`)).toBe(PRACTICE_TEMPLATE)
    expect(findFolderDocTemplate('')).toBeNull()
  })

  it('따즈아 밖의 폴더는 null (기존 기본 내용을 그대로 쓴다)', () => {
    expect(findFolderDocTemplate('D:/WikiDesk/강의')).toBeNull()
    expect(findFolderDocTemplate('D:/WikiDesk/강의/다른강의')).toBeNull()
    expect(findFolderDocTemplate('/mock/workspace/만화/작품')).toBeNull()
  })
})

describe('01 올인원 폴더의 기본 내용 (기존 규칙 그대로)', () => {
  const text = findFolderDocTemplate(F01)

  it('맨 위에 분류 세 줄(ddazua 와 빈 칸 둘)과 [목차]가 있다', () => {
    expect(text.split('\n').slice(0, 4)).toEqual(['[[분류:ddazua]]', '[[분류:]]', '[[분류:]]', '[목차]'])
  })

  it('큰 제목(=  =) 묶음이 네 개이고 묶음마다 작은 제목(==  ==)이 둘, 빈 목록 항목(* )이 둘이다', () => {
    const lines = text.split('\n')
    expect(lines.filter((l) => l === '=  =')).toHaveLength(4)
    expect(lines.filter((l) => l === '==  ==')).toHaveLength(8)
    expect(lines.filter((l) => l === '* ')).toHaveLength(8)
  })

  it('묶음 사이에는 빈 줄이 두 개, 묶음 안 작은 제목 사이에는 빈 줄이 하나 있다', () => {
    expect(text).toContain('* \n\n==  ==\n* \n\n\n=  =\n')
    expect(text).not.toContain('\n\n\n\n')
  })

  it('줄 끝의 공백("* ")이 지워지지 않고 그대로 있다', () => {
    expect(text).toContain('==  ==\n* \n')
    expect(DDAZUA_TEMPLATE_LINES.filter((l) => l === '* ')).toHaveLength(8)
  })

  it('문서 끝은 줄바꿈으로 끝난다', () => {
    expect(text.endsWith('* \n')).toBe(true)
  })
})

describe('02 배워서 바로 써먹는 폴더의 기본 내용', () => {
  const text = findFolderDocTemplate(F02)

  it('큰 제목(=  =, 가운데 공백 둘)이 셋이고 각각 바로 아래에 DBeaver 코드블록이 있다', () => {
    const lines = text.split('\n')
    expect(lines.filter((l) => l === '=  =')).toHaveLength(3)
    expect(lines.filter((l) => l === '```DBeaver')).toHaveLength(3)
    expect(lines.filter((l) => l === '```')).toHaveLength(3)
    expect(text).toContain('=  =\n```DBeaver\n```\n')
  })

  it('묶음 사이에는 빈 줄이 하나이고 문서는 줄바꿈 하나로 끝난다', () => {
    expect(text).toContain('```\n\n=  =\n')
    expect(text).not.toContain('\n\n\n')
    expect(text.endsWith('```\n')).toBe(true)
  })

  it('분류·목차 줄은 없다', () => {
    expect(text).not.toContain('[[분류:')
    expect(text).not.toContain('[목차]')
  })
})
