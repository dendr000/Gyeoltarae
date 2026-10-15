// Copyright (c) dendr000. MIT License.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { decodeFileNameChars, encodeFileNameChars } from '../../shared/fileNameChars.js'
import {
  createDoc,
  createFolder,
  ensureCategoryPage,
  ensureDataEntry,
  ensureSnippet,
  ensureTemplate,
  importImageData,
  readSnippetOrders,
  renameImage,
  renamePath,
  scanCategoryPages,
  scanDataEntries,
  scanImages,
  scanSnippets,
  scanTemplates,
  scanTree,
} from '../../electron/fileSystem.js'

// Windows 파일 이름에 못 쓰는 글자 9개와 보기에 같은 전각 글자. 소스에 직접 쓰면 헷갈리는 백슬래시는 문자 코드로 만든다.
const BACKSLASH = String.fromCharCode(92)
const PAIRS = [
  ['<', '＜'],
  ['>', '＞'],
  [':', '：'],
  ['"', '＂'],
  ['/', '／'],
  [BACKSLASH, '＼'],
  ['|', '｜'],
  ['?', '？'],
  ['*', '＊'],
]
const hasIllegal = (text) => [...text].some((ch) => PAIRS.some(([ascii]) => ascii === ch) || ch.charCodeAt(0) < 32)

describe('encodeFileNameChars / decodeFileNameChars (순수 함수)', () => {
  for (const [ascii, full] of PAIRS) {
    it(`${full} (U+${full.codePointAt(0).toString(16).toUpperCase()}) <-> ${ascii}`, () => {
      expect(encodeFileNameChars(`가${ascii}나`)).toBe(`가${full}나`)
      expect(decodeFileNameChars(`가${full}나`)).toBe(`가${ascii}나`)
    })
  }

  it('못 쓰는 글자 9개를 모두 바꾸고, 결과에는 못 쓰는 글자가 하나도 남지 않는다', () => {
    const all = PAIRS.map(([a]) => a).join('')
    expect(hasIllegal(all)).toBe(true) // 도우미가 제대로 걸러내는지 확인
    expect(hasIllegal(encodeFileNameChars(all))).toBe(false)
    expect(encodeFileNameChars(all)).toBe(PAIRS.map(([, f]) => f).join(''))
  })

  it('왕복하면 원래 이름이 된다', () => {
    const name = `질문? 부제: A/B <c> "d" |e| *f* ${BACKSLASH}g`
    expect(decodeFileNameChars(encodeFileNameChars(name))).toBe(name)
  })

  it('보통 글자·다른 기호·다른 전각 글자는 건드리지 않는다', () => {
    const plain = '문서 1 (a) [b] {c} ! @ # $ % ^ & + = ~ ` , . ; - _ Ａ１ ！ （）'
    expect(encodeFileNameChars(plain)).toBe(plain)
    expect(decodeFileNameChars(plain)).toBe(plain)
  })

  it('제어 문자는 전각 짝이 없어서 밑줄로 바꾼다', () => {
    expect(encodeFileNameChars('a\x00b\x1fc\td')).toBe('a_b_c_d')
  })

  it('keepSlash 로 풀면 전각 슬래시(／)는 그대로 두고 나머지는 푼다 (분류·틀 이름의 "/" 는 계층 구분자라서)', () => {
    expect(decodeFileNameChars('가／나：다', { keepSlash: true })).toBe('가／나:다')
    expect(decodeFileNameChars('가／나：다')).toBe('가/나:다')
  })

  it('빈 문자열과 undefined 를 견딘다', () => {
    expect(encodeFileNameChars('')).toBe('')
    expect(decodeFileNameChars('')).toBe('')
    expect(encodeFileNameChars(undefined)).toBe('')
    expect(decodeFileNameChars(undefined)).toBe('')
  })
})

// 실제 디스크에 임시 폴더를 만들어 진행 (파일 이름은 Windows 만 진짜 제약이 있으므로)
let root
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'gyeoltarae-fname-'))
})
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
})
const names = (dirPath) => fs.readdirSync(dirPath).sort()

describe('문서·폴더: 디스크에는 전각 글자, 앱에는 원래 글자', () => {
  it('문서 이름에 ":" 와 "/" 를 쓰면 디스크 파일은 전각이고 트리에는 원래 글자로 보인다', () => {
    const file = createDoc(root, '서문: 시작/끝')
    expect(path.basename(file)).toBe('서문： 시작／끝.md')
    expect(names(root)).toEqual(['서문： 시작／끝.md'])
    expect(scanTree(root).map((n) => n.name)).toEqual(['서문: 시작/끝'])
  })

  it('못 쓰는 글자 9개를 전부 넣어도 만들어지고, 트리에는 그대로 보인다', () => {
    const title = PAIRS.map(([a]) => a).join('') + '끝'
    const file = createDoc(root, title)
    expect(fs.existsSync(file)).toBe(true)
    expect(scanTree(root)[0].name).toBe(title)
  })

  it('폴더 이름도 같다 (안의 문서는 그대로 따라온다)', () => {
    const folder = createFolder(root, '제1장: 시작?')
    createDoc(folder, '가/나')
    expect(names(root)).toEqual(['제1장： 시작？'])
    const tree = scanTree(root)
    expect(tree[0]).toMatchObject({ type: 'dir', name: '제1장: 시작?' })
    expect(tree[0].children.map((n) => n.name)).toEqual(['가/나'])
  })

  it('이름을 바꿀 때도 같다 (예전에는 밑줄로 바뀌었다)', () => {
    const src = createDoc(root, '문서')
    const renamed = renamePath(src, '질문? 부제: 이야기')
    expect(path.basename(renamed)).toBe('질문？ 부제： 이야기.md')
    expect(fs.existsSync(renamed)).toBe(true)
    expect(scanTree(root)[0].name).toBe('질문? 부제: 이야기')
  })

  it('화면에 보이는 이름 그대로 다시 이름 바꾸기를 해도 실패하지 않고 같은 파일이다', () => {
    const file = createDoc(root, 'a:b')
    const again = renamePath(file, 'a:b')
    expect(again).toBe(file)
    expect(fs.existsSync(file)).toBe(true)
  })

  it('같은 이름을 또 만들면 (1) 이 붙는다 — 전각으로 바뀐 뒤에도 겹침을 감지한다', () => {
    createDoc(root, 'a:b')
    const second = createDoc(root, 'a:b')
    expect(path.basename(second)).toBe('a：b (1).md')
    expect(scanTree(root).map((n) => n.name)).toEqual(['a:b', 'a:b (1)'])
  })

  it('이미 전각 글자로 저장돼 있던 문서도 원래 글자로 보인다', () => {
    fs.writeFileSync(path.join(root, '예전：문서.md'), 'x')
    expect(scanTree(root)[0].name).toBe('예전:문서')
  })

  it('예전에 밑줄로 저장된 문서는 그대로 밑줄로 보인다 (되돌릴 방법이 없어서)', () => {
    fs.writeFileSync(path.join(root, '질문_ 부제.md'), 'x')
    expect(scanTree(root)[0].name).toBe('질문_ 부제')
  })

  it('못 쓰는 글자뿐인 이름도 전각이 되어 비지 않는다 (기본 이름으로 바뀌지 않는다)', () => {
    const file = createDoc(root, '???')
    expect(path.basename(file)).toBe('？？？.md')
    expect(scanTree(root)[0].name).toBe('???')
  })
})

describe('분류·틀: "/" 는 계층 구분자로 남고 나머지는 전각으로 저장된다', () => {
  it('분류 이름 "포켓몬: 도감/전국" -> 폴더 "포켓몬： 도감" 아래 "전국.md", 앱에서는 원래 이름', () => {
    const file = ensureCategoryPage(root, '포켓몬: 도감/전국')
    expect(path.relative(path.join(root, '.wikidesk-categories'), file).split(path.sep)).toEqual(['포켓몬： 도감', '전국.md'])
    expect(scanCategoryPages(root).map((p) => p.name)).toEqual(['포켓몬: 도감/전국'])
  })

  it('분류 이름의 마지막 조각(파일 이름)에 ":" 가 있어도 원래 글자로 보인다', () => {
    const file = ensureCategoryPage(root, '작품/부제: 이야기?')
    expect(path.basename(file)).toBe('부제： 이야기？.md')
    expect(scanCategoryPages(root).map((p) => p.name)).toEqual(['작품/부제: 이야기?'])
  })

  it('분류 이름 안의 전각 슬래시(／)는 계층으로 풀리지 않고 그대로 남는다', () => {
    const dirPath = path.join(root, '.wikidesk-categories')
    fs.mkdirSync(dirPath, { recursive: true })
    fs.writeFileSync(path.join(dirPath, '가／나.md'), '')
    expect(scanCategoryPages(root).map((p) => p.name)).toEqual(['가／나'])
  })

  it('틀 이름도 같다', () => {
    const file = ensureTemplate(root, '타입?/불꽃')
    expect(path.relative(path.join(root, '.wikidesk-templates'), file).split(path.sep)).toEqual(['타입？', '불꽃.md'])
    expect(scanTemplates(root).map((p) => p.name)).toEqual(['타입?/불꽃'])
  })
})

describe('자료·상용구·이미지', () => {
  it('자료의 유형과 이름: 디스크는 전각, 앱에서는 원래 글자', () => {
    const file = ensureDataEntry(root, '기술: 물', '파도타기?')
    expect(path.relative(path.join(root, '.wikidesk-data'), file).split(path.sep)).toEqual(['기술： 물', '파도타기？.md'])
    expect(scanDataEntries(root)).toMatchObject([{ type: '기술: 물', name: '파도타기?' }])
  })

  it('상용구 카테고리 폴더 이름도 같고, 순서 파일 키도 원래 글자다', () => {
    const file = ensureSnippet(root, 'SQL: 기본', 'sel')
    expect(path.basename(path.dirname(file))).toBe('SQL： 기본')
    fs.writeFileSync(path.join(path.dirname(file), '_순서.txt'), 'sel')
    expect(scanSnippets(root).map((e) => e.category)).toEqual(['SQL: 기본'])
    expect(readSnippetOrders(root)).toEqual({ 'SQL: 기본': 'sel' })
  })

  it('상용구 제목(단축어)은 예전 %XX 방식 그대로다 (바뀌지 않는다)', () => {
    const file = ensureSnippet(root, '공통', '*')
    expect(path.basename(file)).toBe('%2A.md')
    expect(scanSnippets(root).map((e) => e.title)).toEqual(['*'])
  })

  it('전각 글자가 든 파일 이름으로 가져온 이미지는 원래 글자 이름으로 등록된다', () => {
    const imported = importImageData(root, '사진：1.png', Buffer.from([1, 2, 3]))
    expect(imported.name).toBe('사진:1')
    expect(path.basename(imported.path)).toBe('사진：1.png')
  })

  it('이미지 이름 바꾸기: 파일은 전각, 앱에서는 원래 글자, 다시 원래 글자로 찾아 바꿀 수 있다', () => {
    importImageData(root, '원본.png', Buffer.from([1, 2, 3]))
    const renamed = renameImage(root, '원본', '그림: 1/2')
    expect(renamed.name).toBe('그림: 1/2')
    expect(path.basename(renamed.path)).toBe('그림： 1／2.png')
    expect(scanImages(root).map((i) => i.name)).toEqual(['그림: 1/2'])
    const again = renameImage(root, '그림: 1/2', '다시')
    expect(again.name).toBe('다시')
  })
})

describe('소스 점검: 화면 쪽에서 경로로 이름을 만드는 곳이 원래 글자로 바꿔 쓴다', () => {
  const read = (relative) => fs.readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8')

  it('스토어의 basename 과 작품 폴더 이름(findWorkFolderContext)이 전각을 풀어서 쓴다', () => {
    const store = read('src/store/useAppStore.js')
    expect(store).toMatch(/function basename\(filePath\)[\s\S]{0,160}decodeFileNameChars/)
    expect(store).toMatch(/function findWorkFolderContext[\s\S]{0,260}decodeFileNameChars/)
  })

  it('자동 분류의 폴더 이름 목록(relativeSegments)이 전각을 풀어서 쓴다', () => {
    expect(read('src/lib/autoCategory.js')).toMatch(/export function relativeSegments[\s\S]{0,400}decodeFileNameChars/)
  })

  it('안내 문구에 폴더 이름을 보여 주는 App.jsx 두 곳이 전각을 풀어서 쓴다', () => {
    const app = read('src/App.jsx')
    expect((app.match(/decodeFileNameChars\(inherited\.folderPath/g) ?? []).length).toBe(2)
  })
})
