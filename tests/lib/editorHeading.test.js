// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { headingLineFlags } from '../../src/lib/editorHeading.js'

// 편집 모드의 제목 줄 강조: 어느 줄이 제목 줄(=제목= ~ ======제목======)인지 판단한다. 코드블록(```) 안의 줄은 제목이 아니다.
const flags = (text) => headingLineFlags(text)

describe('headingLineFlags', () => {
  it('제목 줄만 true 이다 (1~6급)', () => {
    expect(flags('= 가 =\n일반 글\n== 나 ==\n======다======')).toEqual([true, false, true, true])
  })

  it('= 가 없는 줄이나 한쪽에만 = 가 있는 줄은 제목이 아니다', () => {
    expect(flags('가나다\n= 가\n나 =')).toEqual([false, false, false])
  })

  it('앞뒤 공백이 있어도 제목이다', () => {
    expect(flags('  == 가 ==  ')).toEqual([true])
  })

  it('==# 제목 #== (처음부터 접힌 제목)도 제목이다', () => {
    expect(flags('==# 가 #==')).toEqual([true])
  })

  it('코드블록 안의 줄은 제목처럼 생겨도 제목이 아니다', () => {
    const text = ['= 변수 =', '```', '================', 'OS Kernel Space', '================', '```', '= 소스코드 =', '```C++', '= 안 =', '```'].join('\n')
    expect(flags(text)).toEqual([true, false, false, false, false, false, true, false, false, false])
  })

  it('코드블록이 닫히면 그 뒤의 제목은 다시 제목이다', () => {
    expect(flags('```\n= 안 =\n```\n= 밖 =')).toEqual([false, false, false, true])
  })

  it('닫히지 않은 코드블록은 글 끝까지 코드로 본다', () => {
    expect(flags('= 위 =\n```\n= 아래 =')).toEqual([true, false, false])
  })

  it('백틱 4개로 연 코드블록 안의 백틱 3개 줄은 닫는 줄이 아니다', () => {
    expect(flags('````\n```\n= 안 =\n````\n= 밖 =')).toEqual([false, false, false, false, true])
  })

  it('빈 글이나 줄이 하나뿐이어도 동작한다', () => {
    expect(flags('')).toEqual([false])
    expect(flags('= 가 =')).toEqual([true])
  })

  it('줄 수는 글의 줄 수와 같다 (윈도 줄바꿈의 \\r 이 붙어도 제목으로 본다)', () => {
    expect(flags('= 가 =\r\n나\r\n')).toEqual([true, false, false])
  })
})
