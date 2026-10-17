// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { BOLD_MARK, UNDERLINE_MARK, toggleInlineMark } from '../../src/lib/tableInline.js'

// 표 편집기 칸 안에서 Ctrl+B(굵게 '''…''') / Ctrl+U(밑줄 __…__): 고른 글자에 표시를 씌우고, 이미 씌워져 있으면 벗긴다.
// 문서 편집기의 같은 단축키와 같은 표시를 쓴다. 화면과 분리한 순수 함수.

const apply = (text, start, end, mark, options) => {
  const result = toggleInlineMark(text, start, end, mark, options)
  return result && { ...result, shown: `${result.text.slice(0, result.selStart)}[${result.text.slice(result.selStart, result.selEnd)}]${result.text.slice(result.selEnd)}` }
}

describe('표시 값', () => {
  it('굵게는 \'\'\', 밑줄은 __ 이다', () => {
    expect(BOLD_MARK).toBe("'''")
    expect(UNDERLINE_MARK).toBe('__')
  })
})

describe('toggleInlineMark: 고른 글자에 표시를 씌운다', () => {
  it('고른 글자를 표시로 감싸고 그 글자만 선택된 채로 남긴다', () => {
    const r = apply('가나다라', 1, 3, BOLD_MARK)
    expect(r.text).toBe("가'''나다'''라")
    expect(r.shown).toBe("가'''[나다]'''라")
  })

  it('밑줄도 같다', () => {
    expect(apply('가나다라', 0, 2, UNDERLINE_MARK).text).toBe('__가나__다라')
  })

  it('칸 전체를 골라도 감싼다', () => {
    expect(apply('합계', 0, 2, BOLD_MARK).text).toBe("'''합계'''")
  })

  it('공백이 든 글자, 영문, 숫자도 그대로 감싼다', () => {
    expect(apply('a b 12', 2, 6, BOLD_MARK).text).toBe("a '''b 12'''")
  })

  it('여러 줄을 고른 입력칸(아래 큰 입력칸)에서도 줄바꿈째 감싼다', () => {
    expect(apply('첫줄\n둘째줄', 0, 7, BOLD_MARK).text).toBe("'''첫줄\n둘째줄'''")
  })

  it('고른 범위가 거꾸로(start 가 end 보다 큼)여도 같다', () => {
    expect(apply('가나다라', 3, 1, BOLD_MARK).text).toBe("가'''나다'''라")
  })
})

describe('toggleInlineMark: 이미 씌워져 있으면 벗긴다 (다시 누르면 되돌아온다)', () => {
  it('글자만 고르고 바깥에 표시가 붙어 있으면 표시를 벗긴다', () => {
    const r = apply("가'''나다'''라", 4, 6, BOLD_MARK)
    expect(r.text).toBe('가나다라')
    expect(r.shown).toBe('가[나다]라')
  })

  it('표시까지 포함해서 골랐으면 그 표시를 벗긴다', () => {
    const r = apply("가'''나다'''라", 1, 9, BOLD_MARK)
    expect(r.text).toBe('가나다라')
    expect(r.shown).toBe('가[나다]라')
  })

  it('두 번 누르면 원래 글로 돌아온다 (씌우기 -> 벗기기)', () => {
    const first = toggleInlineMark('가나다', 1, 2, UNDERLINE_MARK)
    const second = toggleInlineMark(first.text, first.selStart, first.selEnd, UNDERLINE_MARK)
    expect(second.text).toBe('가나다')
    expect([second.selStart, second.selEnd]).toEqual([1, 2])
  })

  it('한쪽에만 표시가 있으면 벗기지 않고 새로 감싼다', () => {
    expect(apply("가'''나다라", 4, 6, BOLD_MARK).text).toBe("가" + "'".repeat(6) + "나다'''라")
  })

  it('오른쪽에만 표시가 있고 왼쪽은 다른 글이면 그 글을 지우지 않고 새로 감싼다', () => {
    expect(apply("xxx나'''다", 3, 4, BOLD_MARK).text).toBe("xxx'''나'''" + "'''다")
  })

  it('다른 표시(굵게 안의 밑줄)는 서로 벗기지 않는다', () => {
    expect(apply("'''가나'''", 3, 5, UNDERLINE_MARK).text).toBe("'''__가나__'''")
  })
})

describe('toggleInlineMark: 고른 글자가 없을 때', () => {
  it('기본은 null 이다 (호출한 쪽이 다른 동작을 한다: 굵게는 칸 전체 굵게)', () => {
    expect(toggleInlineMark('가나다', 1, 1, BOLD_MARK)).toBeNull()
    expect(toggleInlineMark('', 0, 0, BOLD_MARK)).toBeNull()
  })

  it('insertEmpty 를 켜면 표시 한 쌍을 넣고 그 사이에 커서를 둔다 (문서 편집기와 같음)', () => {
    const r = apply('가나', 1, 1, UNDERLINE_MARK, { insertEmpty: true })
    expect(r.text).toBe('가____나')
    expect([r.selStart, r.selEnd]).toEqual([3, 3])
  })

  it('insertEmpty 여도 글자를 골랐으면 평소처럼 감싼다', () => {
    expect(apply('가나', 0, 1, UNDERLINE_MARK, { insertEmpty: true }).text).toBe('__가__나')
  })
})

describe('toggleInlineMark: 범위 밖 값에도 안전하다', () => {
  it('글 길이를 넘는 위치는 글 끝으로 맞춘다 (선택 위치도 글 안으로)', () => {
    const r = apply('가나', 0, 99, BOLD_MARK)
    expect(r.text).toBe("'''가나'''")
    expect([r.selStart, r.selEnd]).toEqual([3, 5])
  })

  it('음수 위치는 0 으로 맞춘다 (선택 위치도 0 부터)', () => {
    const r = apply('가나', -5, 1, BOLD_MARK)
    expect(r.text).toBe("'''가'''나")
    expect([r.selStart, r.selEnd]).toEqual([3, 4])
  })
})
