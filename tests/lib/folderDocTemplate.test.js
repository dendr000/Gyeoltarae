import { describe, expect, it } from 'vitest'
import { findFolderDocTemplate } from '../../src/lib/folderDocTemplate.js'
import { DDAZUA_TEMPLATE, DDAZUA_TEMPLATE_LINES } from '../helpers/ddazuaTemplate.js'

describe('findFolderDocTemplate (폴더별 새 문서 기본 틀)', () => {
  it('따즈아 폴더 안이면 요청받은 기본 내용을 돌려준다', () => {
    expect(findFolderDocTemplate('D:/WikiDesk/강의/따즈아')).toBe(DDAZUA_TEMPLATE)
  })

  it('따즈아 아래 하위 폴더(숫자가 붙은 폴더 포함)에서도 적용된다', () => {
    expect(findFolderDocTemplate('D:/WikiDesk/강의/따즈아/01 올인원 DBMS!! 설계부터 운영까지!!')).toBe(DDAZUA_TEMPLATE)
    expect(findFolderDocTemplate('/mock/workspace/따즈아/01 가/02 나/03 다')).toBe(DDAZUA_TEMPLATE)
  })

  it('Windows 경로(역슬래시)도 받는다', () => {
    expect(findFolderDocTemplate('D:\\WikiDesk\\강의\\따즈아\\01 올인원')).toBe(DDAZUA_TEMPLATE)
  })

  it('맨 위에 분류 세 줄(ddazua 와 빈 칸 둘)과 [목차]가 있다', () => {
    const lines = findFolderDocTemplate('/a/따즈아').split('\n')
    expect(lines.slice(0, 4)).toEqual(['[[분류:ddazua]]', '[[분류:]]', '[[분류:]]', '[목차]'])
  })

  it('큰 제목(=  =) 묶음이 네 개이고 묶음마다 작은 제목(==  ==)이 둘, 빈 목록 항목(* )이 둘이다', () => {
    const lines = findFolderDocTemplate('/a/따즈아').split('\n')
    expect(lines.filter((l) => l === '=  =')).toHaveLength(4)
    expect(lines.filter((l) => l === '==  ==')).toHaveLength(8)
    expect(lines.filter((l) => l === '* ')).toHaveLength(8)
  })

  it('묶음 사이에는 빈 줄이 두 개, 묶음 안 작은 제목 사이에는 빈 줄이 하나 있다', () => {
    const text = findFolderDocTemplate('/a/따즈아')
    expect(text).toContain('* \n\n==  ==\n* \n\n\n=  =\n')
    expect(text).not.toContain('\n\n\n\n')
  })

  it('줄 끝의 공백("* ")이 지워지지 않고 그대로 있다', () => {
    expect(findFolderDocTemplate('/a/따즈아')).toContain('==  ==\n* \n')
    expect(DDAZUA_TEMPLATE_LINES.filter((l) => l === '* ')).toHaveLength(8)
  })

  it('문서 끝은 줄바꿈으로 끝난다', () => {
    expect(findFolderDocTemplate('/a/따즈아').endsWith('* \n')).toBe(true)
  })

  it('따즈아 밖의 폴더는 null (기존 기본 내용을 그대로 쓴다)', () => {
    expect(findFolderDocTemplate('D:/WikiDesk/강의')).toBeNull()
    expect(findFolderDocTemplate('D:/WikiDesk/강의/다른강의')).toBeNull()
    expect(findFolderDocTemplate('/mock/workspace/만화/작품')).toBeNull()
  })

  it('폴더 이름 전체가 같아야 한다 — 이름 일부만 같거나 번호가 붙은 폴더는 해당하지 않는다', () => {
    expect(findFolderDocTemplate('/a/따즈아 (1)')).toBeNull()
    expect(findFolderDocTemplate('/a/01 따즈아')).toBeNull()
    expect(findFolderDocTemplate('/a/따즈아강의')).toBeNull()
  })

  it('경로 맨 앞이 따즈아여도 동작하고, 빈 경로는 null', () => {
    expect(findFolderDocTemplate('따즈아')).toBe(DDAZUA_TEMPLATE)
    expect(findFolderDocTemplate('')).toBeNull()
  })
})
