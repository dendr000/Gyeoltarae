import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_TEMPLATE_FILE_NAME,
  readDefaultTemplate,
  scanTree,
  writeDefaultTemplate,
} from '../../electron/fileSystem.js'
import { DEFAULT_TEMPLATE_FILE } from '../../src/lib/defaultTemplate.js'

let root

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'gyeoltarae-deftpl-'))
})

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
})

const dir = (...segments) => {
  const full = path.join(root, ...segments)
  fs.mkdirSync(full, { recursive: true })
  return full
}

describe('폴더 기본 틀 설정 파일 (폴더 안의 숨김 파일)', () => {
  it('메인 프로세스와 렌더러가 같은 파일 이름을 쓴다', () => {
    expect(DEFAULT_TEMPLATE_FILE_NAME).toBe(DEFAULT_TEMPLATE_FILE)
  })

  it('쓴 틀 이름을 그 폴더에서 그대로 읽는다', () => {
    const folder = dir('강의', '따즈아', '03 새 강의')
    writeDefaultTemplate(folder, '강의 틀')

    expect(readDefaultTemplate(root, folder)).toEqual({ folderPath: folder, template: '강의 틀' })
  })

  it('하위 폴더는 윗 폴더의 설정을 물려받는다', () => {
    const top = dir('따즈아')
    writeDefaultTemplate(top, '강의 틀')
    const sub = dir('따즈아', '하위', '더 하위')

    expect(readDefaultTemplate(root, sub)).toEqual({ folderPath: top, template: '강의 틀' })
  })

  it('여러 겹이면 가장 가까운 폴더의 설정 하나만 쓴다', () => {
    const top = dir('따즈아')
    const inner = dir('따즈아', '02 실습')
    writeDefaultTemplate(top, '바깥 틀')
    writeDefaultTemplate(inner, '안쪽 틀')

    expect(readDefaultTemplate(root, dir('따즈아', '02 실습', '하위'))).toEqual({ folderPath: inner, template: '안쪽 틀' })
    expect(readDefaultTemplate(root, top)).toEqual({ folderPath: top, template: '바깥 틀' })
  })

  it('형제 폴더의 설정은 서로 섞이지 않는다 (강의마다 다른 틀)', () => {
    const a = dir('따즈아', '01 올인원')
    const b = dir('따즈아', '02 실습')
    writeDefaultTemplate(a, 'A 틀')
    writeDefaultTemplate(b, 'B 틀')

    expect(readDefaultTemplate(root, a).template).toBe('A 틀')
    expect(readDefaultTemplate(root, b).template).toBe('B 틀')
    expect(readDefaultTemplate(root, dir('따즈아', '03 새 강의'))).toBeNull()
  })

  it('ownOnly 는 그 폴더 자신의 설정만 본다 — 윗 폴더 설정을 물려받지 않는다', () => {
    const top = dir('따즈아')
    writeDefaultTemplate(top, '강의 틀')
    const sub = dir('따즈아', '하위')

    expect(readDefaultTemplate(root, sub, true)).toBeNull()
    expect(readDefaultTemplate(root, top, true)).toEqual({ folderPath: top, template: '강의 틀' })
  })

  it('워크스페이스 밖의 설정은 읽지 않는다', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'gyeoltarae-outside-'))
    try {
      writeDefaultTemplate(outside, '밖')
      expect(readDefaultTemplate(root, outside)).toBeNull()
    } finally {
      fs.rmSync(outside, { recursive: true, force: true })
    }
  })

  it('빈 이름으로 쓰면 설정 파일을 지운다 (기본 틀 해제)', () => {
    const folder = dir('따즈아')
    writeDefaultTemplate(folder, '강의 틀')
    expect(fs.existsSync(path.join(folder, DEFAULT_TEMPLATE_FILE_NAME))).toBe(true)

    writeDefaultTemplate(folder, '  ')

    expect(fs.existsSync(path.join(folder, DEFAULT_TEMPLATE_FILE_NAME))).toBe(false)
    expect(readDefaultTemplate(root, folder)).toBeNull()
  })

  it('설정이 없는 폴더를 해제해도 오류 없이 지나간다', () => {
    expect(() => writeDefaultTemplate(dir('빈'), '')).not.toThrow()
    expect(() => writeDefaultTemplate(dir('빈2'), undefined)).not.toThrow()
  })

  it('이름의 앞뒤 공백을 정리해서 저장한다', () => {
    const folder = dir('따즈아')
    writeDefaultTemplate(folder, '  강의 틀 ')
    expect(readDefaultTemplate(root, folder).template).toBe('강의 틀')
  })

  it('파일이 망가져 있거나 모양이 틀려도 오류 없이 설정 없음(null)으로 본다', () => {
    const folder = dir('따즈아')
    const file = path.join(folder, DEFAULT_TEMPLATE_FILE_NAME)
    for (const text of ['{ 망가진 json', '{"template":123}', '{"template":"  "}', 'null', '[]']) {
      fs.writeFileSync(file, text, 'utf-8')
      expect(readDefaultTemplate(root, folder), text).toBeNull()
    }
  })

  it('폴더 이름을 바꿔도 설정이 같이 따라간다', () => {
    const folder = dir('따즈아')
    writeDefaultTemplate(folder, '강의 틀')
    const moved = path.join(root, '새 이름')
    fs.renameSync(folder, moved)

    expect(readDefaultTemplate(root, moved)).toEqual({ folderPath: moved, template: '강의 틀' })
  })

  it('설정 파일은 문서 트리에 나타나지 않는다', () => {
    const folder = dir('따즈아')
    fs.writeFileSync(path.join(folder, '문서.md'), 'x', 'utf-8')
    writeDefaultTemplate(folder, '강의 틀')

    const names = JSON.stringify(scanTree(root))
    expect(names).toContain('문서')
    expect(names).not.toContain('default-template')
  })

  it('한글 틀 이름도 깨지지 않고 저장된다 (UTF-8)', () => {
    const folder = dir('따즈아')
    writeDefaultTemplate(folder, '배워서 바로 써먹는 DBMS 틀')
    expect(readDefaultTemplate(root, folder).template).toBe('배워서 바로 써먹는 DBMS 틀')
  })
})
