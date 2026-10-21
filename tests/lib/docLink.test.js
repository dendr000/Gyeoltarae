// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { docLinkFor, lookupDocCandidates, parentFolderName } from '../../src/lib/docLink.js'
import { parseWikiText } from '../../src/lib/wikiParser.js'

// 문서 링크: 이름이 같은 문서가 여럿이면 [[문서명(폴더명)]] 로 어느 폴더의 문서인지 구분한다(나무위키의 동음이의 문서 표기처럼).
// docIndex 는 { 이름: [{ path, name }] } — 이름은 파일 이름과 앞 순서 번호를 뗀 이름 둘 다 키가 된다(store 의 rebuildIndexes).
const doc = (path) => ({ path, name: path.split(/[\\/]/).pop().replace(/\.md$/, '') })
function indexOf(...docs) {
  const index = {}
  const add = (key, d) => {
    if (!key) return
    index[key] ??= []
    if (!index[key].some((x) => x.path === d.path)) index[key].push(d)
  }
  for (const d of docs) {
    add(d.name, d)
    add(d.name.replace(/^\d+\s/, ''), d)
  }
  return index
}

const W = 'D:\\WikiDesk'
const ram = doc(`${W}\\강의\\03 멘토씨리즈 C언어(개정판)\\03 변수와 RAM`)
const ramPython = doc(`${W}\\강의\\05 파이썬\\변수와 RAM`)
const solo = doc(`${W}\\메모\\혼자`)

describe('parentFolderName', () => {
  it('문서가 들어 있는 폴더의 이름이다 (윈도·슬래시 경로)', () => {
    expect(parentFolderName(`${W}\\강의\\05 파이썬\\변수와 RAM`)).toBe('05 파이썬')
    expect(parentFolderName('/ws/강의/a/b')).toBe('a')
  })

  it('폴더가 없으면 빈 글이다', () => {
    expect(parentFolderName('문서')).toBe('')
    expect(parentFolderName('')).toBe('')
  })
})

describe('lookupDocCandidates', () => {
  const index = indexOf(ram, ramPython, solo)

  it('이름이 그대로 있으면 그 목록이다 (같은 이름이 둘이면 둘 다)', () => {
    expect(lookupDocCandidates('혼자', index)).toEqual([solo])
    expect(lookupDocCandidates('변수와 RAM', index)).toHaveLength(2)
  })

  it('문서명(폴더명) 은 그 폴더의 문서 하나로 좁힌다', () => {
    expect(lookupDocCandidates('변수와 RAM(파이썬)', index)).toEqual([ramPython])
  })

  it('폴더 이름은 앞 순서 번호가 있는 채로도 쓸 수 있다', () => {
    expect(lookupDocCandidates('변수와 RAM(05 파이썬)', index)).toEqual([ramPython])
  })

  it('폴더 이름에 괄호가 들어 있어도 구분한다', () => {
    expect(lookupDocCandidates('변수와 RAM(멘토씨리즈 C언어(개정판))', index)).toEqual([ram])
    expect(lookupDocCandidates('변수와 RAM(03 멘토씨리즈 C언어(개정판))', index)).toEqual([ram])
  })

  it('문서 이름 자체에 괄호가 있는 문서는 이름 그대로 찾는 것이 먼저다', () => {
    const paren = doc(`${W}\\a\\함수(개념)`)
    const base = doc(`${W}\\개념\\함수`)
    const idx = indexOf(paren, base)
    expect(lookupDocCandidates('함수(개념)', idx)).toEqual([paren])
  })

  it('폴더가 맞지 않거나 문서가 없으면 빈 목록이다', () => {
    expect(lookupDocCandidates('변수와 RAM(없는폴더)', index)).toEqual([])
    expect(lookupDocCandidates('없는 문서(파이썬)', index)).toEqual([])
    expect(lookupDocCandidates('없는 문서', index)).toEqual([])
  })

  it('괄호 안이 비었거나 앞이 비면 구분하지 않는다', () => {
    expect(lookupDocCandidates('변수와 RAM()', index)).toEqual([])
    expect(lookupDocCandidates('(파이썬)', index)).toEqual([])
  })

  it('같은 폴더 이름이 둘 이상의 위치에 있으면 일치하는 문서를 모두 돌려준다 (모호함은 부르는 쪽이 처리)', () => {
    const a = doc(`${W}\\x\\공통\\이름`)
    const b = doc(`${W}\\y\\공통\\이름`)
    expect(lookupDocCandidates('이름(공통)', indexOf(a, b))).toHaveLength(2)
  })

  it('Object 기본 속성 이름(constructor 등)은 문서로 보지 않는다', () => {
    expect(lookupDocCandidates('constructor', {})).toEqual([])
    expect(lookupDocCandidates('toString(폴더)', {})).toEqual([])
  })

  it('이름 앞뒤의 공백도 무시한다', () => {
    expect(lookupDocCandidates('  혼자  ', index)).toEqual([solo])
    expect(lookupDocCandidates(' 변수와 RAM(파이썬) ', index)).toEqual([ramPython])
  })

  it('괄호 안 앞뒤 공백은 무시한다', () => {
    expect(lookupDocCandidates('변수와 RAM ( 파이썬 )', index)).toEqual([ramPython])
  })
})

describe('docLinkFor (문서 하나를 가리키는 링크 글)', () => {
  const index = indexOf(ram, ramPython, solo)

  it('이름이 하나뿐이면 [[문서명]] 이다 (앞 순서 번호는 뗀 이름)', () => {
    expect(docLinkFor(solo, index)).toBe('[[혼자]]')
    const numbered = doc(`${W}\\a\\0891 치고마`)
    expect(docLinkFor(numbered, indexOf(numbered))).toBe('[[치고마]]')
  })

  it('이름이 같은 문서가 여럿이면 [[문서명(폴더명)]] 이다 (폴더 이름은 앞 번호를 뗀 이름)', () => {
    expect(docLinkFor(ramPython, index)).toBe('[[변수와 RAM(파이썬)]]')
    expect(docLinkFor(ram, index)).toBe('[[변수와 RAM(멘토씨리즈 C언어(개정판))]]')
  })

  it('만든 링크는 되돌려 찾으면 그 문서 하나로 풀린다', () => {
    for (const d of [ram, ramPython, solo]) {
      const link = docLinkFor(d, index)
      const target = link.slice(2, -2)
      expect(lookupDocCandidates(target, index)).toEqual([d])
    }
  })

  it('폴더 이름의 앞 번호를 떼면 다른 폴더와 겹칠 때는 번호가 있는 폴더 이름을 쓴다', () => {
    const a = doc(`${W}\\x\\01 장\\이름`)
    const b = doc(`${W}\\y\\02 장\\이름`)
    const idx = indexOf(a, b)
    expect(docLinkFor(a, idx)).toBe('[[이름(01 장)]]')
    expect(docLinkFor(b, idx)).toBe('[[이름(02 장)]]')
  })

  it('목록에 아직 없는 문서(새 문서 등)는 이름만으로 링크를 만든다', () => {
    const fresh = doc(`${W}\\a\\새 문서`)
    expect(docLinkFor(fresh, {})).toBe('[[새 문서]]')
  })

  it('번호 뗀 이름이 겹치면 번호 있는 파일 이름이 아니라 [[번호 뗀 이름(폴더명)]] 을 쓴다 (화면에 보이는 이름으로)', () => {
    const a = doc(`${W}\\x\\01 시작`)
    const b = doc(`${W}\\y\\02 시작`)
    const idx = indexOf(a, b)
    expect(docLinkFor(a, idx)).toBe('[[시작(x)]]')
    expect(docLinkFor(b, idx)).toBe('[[시작(y)]]')
  })

  it('같은 폴더 이름이라 폴더로도 못 가리면 번호 있는 파일 이름으로 간다', () => {
    const a = doc(`${W}\\x\\공통\\01 시작`)
    const b = doc(`${W}\\y\\공통\\02 시작`)
    const idx = indexOf(a, b)
    expect(docLinkFor(a, idx)).toBe('[[01 시작]]')
    expect(docLinkFor(b, idx)).toBe('[[02 시작]]')
  })
})

describe('위키 링크 해석 ([[문서명(폴더명)]])', () => {
  const index = indexOf(ram, ramPython, solo)
  const linkHtml = (text) => parseWikiText(text, { docIndex: index }).html

  it('문서명(폴더명) 은 그 폴더의 문서로 바로 연결된다', () => {
    const html = linkHtml('[[변수와 RAM(파이썬)]]')
    expect(html).toContain('class="wiki-link"')
    expect(html).toContain(`data-doc-path="${ramPython.path}"`)
  })

  it('이름만 쓰면 같은 이름이 여럿이라 고르기 링크(모호)다 (예전과 같다)', () => {
    expect(linkHtml('[[변수와 RAM]]')).toContain('wiki-link-ambiguous')
  })

  it('폴더가 맞지 않으면 없는 문서 링크다', () => {
    expect(linkHtml('[[변수와 RAM(없는폴더)]]')).toContain('wiki-link-missing')
  })

  it('폴더 이름에 괄호가 있어도 연결된다', () => {
    const html = linkHtml('[[변수와 RAM(멘토씨리즈 C언어(개정판))]]')
    expect(html).toContain(`data-doc-path="${ram.path}"`)
  })

  it('보이는 글자는 쓴 그대로이고, | 로 보일 글을 따로 줄 수도 있다', () => {
    expect(linkHtml('[[변수와 RAM(파이썬)]]')).toContain('>변수와 RAM(파이썬)<')
    expect(linkHtml('[[변수와 RAM(파이썬)|파이썬의 변수]]')).toContain('>파이썬의 변수<')
  })

  it('제목으로 바로 가는 링크 [[문서명(폴더명)#제목]] 도 된다', () => {
    const html = linkHtml('[[변수와 RAM(파이썬)#메모리]]')
    expect(html).toContain('class="wiki-anchor-link"')
    expect(html).toContain(`data-doc-path="${ramPython.path}"`)
  })

  it('같은 폴더 이름이 둘 이상의 위치에 있어 그래도 모호하면 고르기 링크다', () => {
    const a = doc(`${W}\\x\\공통\\이름`)
    const b = doc(`${W}\\y\\공통\\이름`)
    const html = parseWikiText('[[이름(공통)]]', { docIndex: indexOf(a, b) }).html
    expect(html).toContain('wiki-link-ambiguous')
  })
})
