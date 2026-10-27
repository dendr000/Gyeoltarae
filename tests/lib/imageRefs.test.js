// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { hasImageRef, renameImageRefs } from '../../src/lib/imageRefs.js'

// 이미지 이름을 바꿀 때 문서에 이미 쓰인 [[파일:이름]] 참조도 같이 바꾸는 규칙.
describe('renameImageRefs', () => {
  it('[[파일:옛이름]] 을 새 이름으로 바꾼다', () => {
    expect(renameImageRefs('앞\n[[파일:고양이]]\n뒤', '고양이', '야옹이')).toBe('앞\n[[파일:야옹이]]\n뒤')
  })

  it('너비 옵션은 그대로 둔다', () => {
    expect(renameImageRefs('[[파일:고양이|300px]]', '고양이', '야옹이')).toBe('[[파일:야옹이|300px]]')
  })

  it('link= 같은 여러 옵션도 그대로 둔다', () => {
    expect(renameImageRefs('[[파일:고양이|300px|link=문서명]]', '고양이', '야옹이')).toBe('[[파일:야옹이|300px|link=문서명]]')
    expect(renameImageRefs('[[파일:고양이|link=문서명|300px]]', '고양이', '야옹이')).toBe('[[파일:야옹이|link=문서명|300px]]')
  })

  it('한 문서에 여러 번 있어도 모두 바꾼다 (한 줄에 둘 이상도)', () => {
    const text = '[[파일:고양이]]\n글\n[[파일:고양이|100px]]\n표 || [[파일:고양이]] || [[파일:고양이]] ||'
    expect(renameImageRefs(text, '고양이', '새')).toBe('[[파일:새]]\n글\n[[파일:새|100px]]\n표 || [[파일:새]] || [[파일:새]] ||')
  })

  it('이름이 정확히 같은 참조만 바꾼다 (이름이 비슷한 다른 이미지는 그대로)', () => {
    const text = '[[파일:고양이]]\n[[파일:고양이2]]\n[[파일:큰 고양이]]\n[[파일:고양]]'
    expect(renameImageRefs(text, '고양이', '새')).toBe('[[파일:새]]\n[[파일:고양이2]]\n[[파일:큰 고양이]]\n[[파일:고양]]')
  })

  it('이름 앞뒤 공백이 있어도 같은 이미지로 본다', () => {
    expect(renameImageRefs('[[파일: 고양이 ]]', '고양이', '새')).toBe('[[파일:새]]')
  })

  it('이름에 공백·괄호·한글·영문이 섞여도 바꾼다', () => {
    expect(renameImageRefs('[[파일:사진 (1)]]', '사진 (1)', 'photo 2')).toBe('[[파일:photo 2]]')
  })

  it('코드블록 안의 참조는 건드리지 않는다 (예시 글일 수 있음)', () => {
    const text = '[[파일:고양이]]\n```\n[[파일:고양이]]\n```\n[[파일:고양이]]'
    expect(renameImageRefs(text, '고양이', '새')).toBe('[[파일:새]]\n```\n[[파일:고양이]]\n```\n[[파일:새]]')
  })

  it('언어가 적힌 코드블록과 들여쓴 여는 줄도 코드블록으로 본다', () => {
    const text = '```python\n[[파일:고양이]]\n```\n  ```\n[[파일:고양이]]\n  ```\n[[파일:고양이]]'
    expect(renameImageRefs(text, '고양이', '새')).toBe('```python\n[[파일:고양이]]\n```\n  ```\n[[파일:고양이]]\n  ```\n[[파일:새]]')
  })

  it('닫히지 않은 코드블록은 끝까지 코드로 본다', () => {
    const text = '[[파일:고양이]]\n```\n[[파일:고양이]]'
    expect(renameImageRefs(text, '고양이', '새')).toBe('[[파일:새]]\n```\n[[파일:고양이]]')
  })

  it('다른 문법의 [[...]] (문서 링크·분류)는 건드리지 않는다', () => {
    const text = '[[고양이]] [[분류:고양이]] [[자료:고양이]]'
    expect(renameImageRefs(text, '고양이', '새')).toBe(text)
  })

  it('바꿀 것이 없으면 같은 글을 그대로 돌려준다', () => {
    const text = '그냥 글\n[[파일:다른것]]'
    expect(renameImageRefs(text, '고양이', '새')).toBe(text)
  })

  it('윈도 줄바꿈(CRLF)도 그대로 보존하며 바꾼다', () => {
    expect(renameImageRefs('앞\r\n[[파일:고양이]]\r\n뒤', '고양이', '새')).toBe('앞\r\n[[파일:새]]\r\n뒤')
  })

  it('이름이 같거나 비어 있거나 글이 문자열이 아니면 그대로 둔다', () => {
    expect(renameImageRefs('[[파일:고양이]]', '고양이', '고양이')).toBe('[[파일:고양이]]')
    expect(renameImageRefs('[[파일:고양이]]', '', '새')).toBe('[[파일:고양이]]')
    expect(renameImageRefs('[[파일:고양이]]', '고양이', '')).toBe('[[파일:고양이]]')
    expect(renameImageRefs(undefined, '고양이', '새')).toBeUndefined()
    expect(renameImageRefs(null, '고양이', '새')).toBeNull()
  })

  it('새 이름이 옛 이름을 포함해도 한 번만 바꾼다 (되풀이로 늘어나지 않음)', () => {
    expect(renameImageRefs('[[파일:a]]', 'a', 'aa')).toBe('[[파일:aa]]')
    expect(renameImageRefs('[[파일:aa]]', 'a', 'aaa')).toBe('[[파일:aa]]')
  })
})

describe('hasImageRef', () => {
  it('코드블록 밖에 그 이미지의 참조가 있으면 true 이다', () => {
    expect(hasImageRef('글 [[파일:고양이]]', '고양이')).toBe(true)
    expect(hasImageRef('[[파일:고양이|50px]]', '고양이')).toBe(true)
  })

  it('없거나, 이름이 다르거나, 코드블록 안에만 있으면 false 이다', () => {
    expect(hasImageRef('글만', '고양이')).toBe(false)
    expect(hasImageRef('[[파일:고양이2]]', '고양이')).toBe(false)
    expect(hasImageRef('```\n[[파일:고양이]]\n```', '고양이')).toBe(false)
  })
})
