import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  AUTO_CATEGORY_FILE_NAME,
  readAutoCategory,
  scanTree,
  writeAutoCategory,
} from '../../electron/fileSystem.js'
import { AUTO_CATEGORY_FILE } from '../../src/lib/autoCategory.js'

let root

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'gyeoltarae-autocat-'))
})

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
})

const dir = (...segments) => {
  const full = path.join(root, ...segments)
  fs.mkdirSync(full, { recursive: true })
  return full
}

describe('자동 분류 설정 파일 (폴더 안의 숨김 파일)', () => {
  it('메인 프로세스와 렌더러가 같은 파일 이름을 쓴다', () => {
    expect(AUTO_CATEGORY_FILE_NAME).toBe(AUTO_CATEGORY_FILE)
  })

  it('쓴 글자를 그 폴더에서 그대로 읽는다', () => {
    const folder = dir('강의', '따즈아')
    writeAutoCategory(folder, ['DBMS', '외래키'])

    expect(readAutoCategory(root, folder)).toEqual({ folderPath: folder, keywords: ['DBMS', '외래키'] })
  })

  it('설정이 있는 폴더의 하위 폴더에서 찾아도 그 설정(가장 가까운 윗 폴더)을 돌려준다', () => {
    const top = dir('강의', '따즈아')
    writeAutoCategory(top, ['DBMS'])
    const sub = dir('강의', '따즈아', '01 올인원', '하위')

    expect(readAutoCategory(root, sub)).toEqual({ folderPath: top, keywords: ['DBMS'] })
  })

  it('설정이 여러 겹이면 가장 가까운 폴더의 것이 이긴다 (합치지 않는다)', () => {
    const top = dir('따즈아')
    const inner = dir('따즈아', '세부')
    writeAutoCategory(top, ['바깥'])
    writeAutoCategory(inner, ['안쪽'])

    expect(readAutoCategory(root, inner)).toEqual({ folderPath: inner, keywords: ['안쪽'] })
    expect(readAutoCategory(root, top)).toEqual({ folderPath: top, keywords: ['바깥'] })
  })

  it('설정이 없는 폴더(윗 폴더 어디에도 없음)는 null', () => {
    expect(readAutoCategory(root, dir('다른', '폴더'))).toBeNull()
  })

  it('워크스페이스 밖의 설정은 읽지 않는다', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'gyeoltarae-outside-'))
    try {
      writeAutoCategory(outside, ['밖'])
      expect(readAutoCategory(root, outside)).toBeNull()
    } finally {
      fs.rmSync(outside, { recursive: true, force: true })
    }
  })

  it('워크스페이스 맨 위 폴더의 설정도 읽는다', () => {
    writeAutoCategory(root, ['전체'])
    expect(readAutoCategory(root, dir('가'))).toEqual({ folderPath: path.resolve(root), keywords: ['전체'] })
  })

  it('ownOnly 는 그 폴더 자신의 설정만 본다 — 윗 폴더 설정을 물려받지 않는다', () => {
    const top = dir('따즈아')
    writeAutoCategory(top, ['DBMS'])
    const sub = dir('따즈아', '하위')

    expect(readAutoCategory(root, sub, true)).toBeNull()
    expect(readAutoCategory(root, top, true)).toEqual({ folderPath: top, keywords: ['DBMS'] })
  })

  it('빈 목록으로 쓰면 설정 파일을 지운다 (자동 분류 해제)', () => {
    const folder = dir('따즈아')
    writeAutoCategory(folder, ['DBMS'])
    expect(fs.existsSync(path.join(folder, AUTO_CATEGORY_FILE_NAME))).toBe(true)

    writeAutoCategory(folder, [])

    expect(fs.existsSync(path.join(folder, AUTO_CATEGORY_FILE_NAME))).toBe(false)
    expect(readAutoCategory(root, folder)).toBeNull()
  })

  it('설정이 없는 폴더에 빈 목록을 써도 오류 없이 지나간다', () => {
    expect(() => writeAutoCategory(dir('빈'), [])).not.toThrow()
  })

  it('쓸 때 앞뒤 공백·빈 항목·중복을 정리한다', () => {
    const folder = dir('따즈아')
    writeAutoCategory(folder, ['  DBMS ', '', 'DBMS', '외래키'])

    expect(readAutoCategory(root, folder).keywords).toEqual(['DBMS', '외래키'])
  })

  it('파일이 망가져 있거나 모양이 틀려도 오류 없이 설정 없음(null)으로 본다', () => {
    const folder = dir('따즈아')
    fs.writeFileSync(path.join(folder, AUTO_CATEGORY_FILE_NAME), '{ 망가진 json', 'utf-8')
    expect(readAutoCategory(root, folder)).toBeNull()

    fs.writeFileSync(path.join(folder, AUTO_CATEGORY_FILE_NAME), '{"keywords":"문자열"}', 'utf-8')
    expect(readAutoCategory(root, folder)).toBeNull()

    fs.writeFileSync(path.join(folder, AUTO_CATEGORY_FILE_NAME), '{"keywords":[1,null,"  ","유효"]}', 'utf-8')
    expect(readAutoCategory(root, folder).keywords).toEqual(['유효'])
  })

  it('글자 파일이 있는 폴더를 옮기면(이름 바꾸기) 설정도 같이 따라간다', () => {
    const folder = dir('따즈아')
    writeAutoCategory(folder, ['DBMS'])
    const moved = path.join(root, '새 이름')
    fs.renameSync(folder, moved)

    expect(readAutoCategory(root, moved)).toEqual({ folderPath: moved, keywords: ['DBMS'] })
  })

  it('설정 파일은 문서 트리에 나타나지 않는다', () => {
    const folder = dir('따즈아')
    fs.writeFileSync(path.join(folder, '문서.md'), 'x', 'utf-8')
    writeAutoCategory(folder, ['DBMS'])

    const names = JSON.stringify(scanTree(root))
    expect(names).toContain('문서')
    expect(names).not.toContain('auto-category')
  })

  it('한글 글자도 깨지지 않고 저장된다 (UTF-8)', () => {
    const folder = dir('따즈아')
    writeAutoCategory(folder, ['외래키'])
    const raw = fs.readFileSync(path.join(folder, AUTO_CATEGORY_FILE_NAME), 'utf-8')
    expect(JSON.parse(raw)).toEqual({ keywords: ['외래키'] })
  })
})
