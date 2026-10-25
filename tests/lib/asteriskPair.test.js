// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { AI_CHAT_FOLDER, asteriskPairEdit, isAiChatDoc } from '../../src/lib/asteriskPair.js'

// 최상위 폴더 "AI챗" 안의 문서에서 별표를 치면 짝을 맞춰 주는 규칙. 순수 함수만 시험한다(화면 연결은 tests/components/editorAsterisk.test.js).
const WS = 'D:\\WikiDesk'

// 키를 눌렀을 때의 결과 글과 선택을 흉내 낸다. | 가 커서, [ ] 가 선택 범위이다.
function press(marked, key, fresh = false) {
  const open = marked.indexOf('[')
  let value
  let start
  let end
  if (open !== -1) {
    const close = marked.indexOf(']')
    value = marked.slice(0, open) + marked.slice(open + 1, close) + marked.slice(close + 1)
    start = open
    end = close - 1
  } else {
    start = marked.indexOf('|')
    end = start
    value = marked.slice(0, start) + marked.slice(start + 1)
  }
  const edit = asteriskPairEdit(value, start, end, key, fresh ? start : -1)
  if (!edit) return null
  if (edit.type === 'move') return `${value.slice(0, edit.caret)}|${value.slice(edit.caret)}`
  const next = value.slice(0, edit.from) + edit.insert + value.slice(edit.to)
  if (edit.selStart === edit.selEnd) return `${next.slice(0, edit.selStart)}|${next.slice(edit.selStart)}`
  return `${next.slice(0, edit.selStart)}[${next.slice(edit.selStart, edit.selEnd)}]${next.slice(edit.selEnd)}`
}

describe('isAiChatDoc', () => {
  it('작업 폴더 바로 아래 AI챗 폴더 안의 문서는 맞다 (윈도 경로)', () => {
    expect(isAiChatDoc('D:\\WikiDesk\\AI챗\\대화1.md', WS)).toBe(true)
  })

  it('AI챗 폴더 아래 더 깊은 폴더의 문서도 맞다', () => {
    expect(isAiChatDoc('D:\\WikiDesk\\AI챗\\2026\\10월\\대화.md', WS)).toBe(true)
  })

  it('슬래시 경로(브라우저 미리보기, 맥)도 맞다', () => {
    expect(isAiChatDoc('/mock/workspace/AI챗/대화.md', '/mock/workspace')).toBe(true)
  })

  it('작업 폴더 경로 끝의 구분자와 대소문자 차이(윈도)를 무시한다', () => {
    expect(isAiChatDoc('D:\\WikiDesk\\AI챗\\대화.md', 'd:\\wikidesk\\')).toBe(true)
  })

  it('한글을 풀어 쓴(NFD) 경로도 맞다', () => {
    expect(isAiChatDoc('D:\\WikiDesk\\AI챗\\대화.md'.normalize('NFD'), WS)).toBe(true)
  })

  it('다른 최상위 폴더는 아니다', () => {
    expect(isAiChatDoc('D:\\WikiDesk\\강의\\대화.md', WS)).toBe(false)
  })

  it('AI챗이 최상위가 아니면 아니다 (다른 폴더 안의 AI챗)', () => {
    expect(isAiChatDoc('D:\\WikiDesk\\강의\\AI챗\\대화.md', WS)).toBe(false)
  })

  it('이름이 비슷한 폴더는 아니다', () => {
    expect(isAiChatDoc('D:\\WikiDesk\\AI챗2\\대화.md', WS)).toBe(false)
    expect(isAiChatDoc('D:\\WikiDesk\\ai챗\\대화.md', WS)).toBe(false)
    expect(isAiChatDoc('D:\\WikiDesk\\AI챗 보관\\대화.md', WS)).toBe(false)
  })

  it('작업 폴더 맨 위의 문서(AI챗.md)는 폴더가 아니므로 아니다', () => {
    expect(isAiChatDoc('D:\\WikiDesk\\AI챗.md', WS)).toBe(false)
  })

  it('작업 폴더 밖의 경로, 작업 폴더 자신, 비어 있거나 문자열이 아닌 값은 아니다', () => {
    expect(isAiChatDoc('E:\\Other\\AI챗\\대화.md', WS)).toBe(false)
    expect(isAiChatDoc('D:\\WikiDesk', WS)).toBe(false)
    expect(isAiChatDoc('D:\\WikiDeskX\\AI챗\\대화.md', WS)).toBe(false)
    expect(isAiChatDoc('', WS)).toBe(false)
    expect(isAiChatDoc(null, WS)).toBe(false)
    expect(isAiChatDoc('D:\\WikiDesk\\AI챗\\대화.md', null)).toBe(false)
    expect(isAiChatDoc(undefined, undefined)).toBe(false)
  })

  it('폴더 이름 상수는 AI챗이다', () => {
    expect(AI_CHAT_FOLDER).toBe('AI챗')
  })
})

describe('별표 하나를 칠 때', () => {
  it('별표가 두 개 생기고 커서는 그 사이에 선다', () => {
    expect(press('|', '*')).toBe('*|*')
    expect(press('안녕 |', '*')).toBe('안녕 *|*')
    expect(press('앞|뒤', '*')).toBe('앞*|*뒤')
  })

  it('줄 중간에서도, 문서 맨 앞·맨 끝에서도 같다', () => {
    expect(press('가나다\n|라마바', '*')).toBe('가나다\n*|*라마바')
    expect(press('|가나다', '*')).toBe('*|*가나다')
  })

  it('이어서 한 번 더 치면 굵게(**|**)로 넓어진다', () => {
    expect(press('*|*', '*', true)).toBe('**|**')
  })

  it('방금 짝을 만든 자리가 아니면(모양만 `*|*` 인 글 가운데) 넓히지 않고 닫는 별표를 넘어간다', () => {
    expect(press('*|*', '*', false)).toBe('**|')
    expect(press('글*|*', '*', false)).toBe('글**|')
  })

  it('넓어진 뒤에 글을 쓰고 별표를 치면 닫는 별표를 하나씩 넘어간다', () => {
    expect(press('**굵게|**', '*')).toBe('**굵게*|*')
    expect(press('**굵게*|*', '*')).toBe('**굵게**|')
  })

  it('짝을 만든 직후의 결과에는 fresh 표시가 붙고, 그 밖의 결과에는 붙지 않는다', () => {
    expect(asteriskPairEdit('', 0, 0, '*').fresh).toBe(true)
    expect(asteriskPairEdit('*', 0, 0, '*').fresh).toBeUndefined()
    expect(asteriskPairEdit('가나', 0, 2, '*').fresh).toBeUndefined()
    expect(asteriskPairEdit('**', 1, 1, '*', 1).fresh).toBeUndefined()
  })

  it('기울임 글을 쓰고 별표를 치면 닫는 별표를 넘어간다', () => {
    expect(press('*기울임|*', '*')).toBe('*기울임*|')
  })

  it('굵게 시작 한가운데(**|**)에서 별표를 치면 넘어간다(더 늘리지 않는다)', () => {
    expect(press('**|**', '*')).toBe('***|*')
  })

  it('앞에 별표가 붙어 있고 뒤에는 없으면(직접 **를 치는 중) 짝을 만들지 않고 그냥 쓴다', () => {
    expect(press('**|', '*')).toBeNull()
    expect(press('글*|', '*')).toBeNull() // 앞에 한 개 + 뒤에 없음 = 직접 치는 중
  })

  it('글자 사이 별표(글*|글)처럼 앞이 글자일 때는 짝을 만든다', () => {
    expect(press('글|글', '*')).toBe('글*|*글')
  })
})

describe('글을 선택하고 별표를 칠 때', () => {
  it('선택한 글을 별표로 감싸고 안쪽 글을 그대로 선택해 둔다', () => {
    expect(press('가[나다]라', '*')).toBe('가*[나다]*라')
  })

  it('한 글자 선택도 감싼다', () => {
    expect(press('[가]', '*')).toBe('*[가]*')
  })

  it('여러 줄 선택도 감싼다', () => {
    expect(press('[가\n나]', '*')).toBe('*[가\n나]*')
  })
})

describe('줄 맨 앞의 목록 표시', () => {
  it('줄 맨 앞 `*|*` 에서 공백을 치면 닫는 별표를 지우고 `* ` 로 만든다', () => {
    expect(press('*|*', ' ', true)).toBe('* |')
  })

  it('들여쓴 줄 맨 앞도 같다', () => {
    expect(press('  *|*', ' ', true)).toBe('  * |')
  })

  it('앞 줄이 있어도 이 줄이 맨 앞이면 같다', () => {
    expect(press('앞 줄\n*|*', ' ', true)).toBe('앞 줄\n* |')
  })

  it('글 중간의 `*|*` 에서 공백을 치면 그냥 쓴다(닫는 별표를 지우지 않음)', () => {
    expect(press('가 *|*', ' ', true)).toBeNull()
  })

  it('굵게 짝(**|**)에서 공백은 그냥 쓴다', () => {
    expect(press('**|**', ' ', true)).toBeNull()
  })

  it('뒤에 닫는 별표가 없으면 그냥 쓴다', () => {
    expect(press('*|', ' ', true)).toBeNull()
    expect(press('* |글', ' ', true)).toBeNull()
  })

  it('방금 짝을 만든 자리가 아니면(손으로 쓴 `*` 와 `*` 사이) 공백을 그냥 쓴다', () => {
    expect(press('*|*', ' ', false)).toBeNull()
  })

  it('글을 선택한 채 공백은 건드리지 않는다', () => {
    expect(press('[*]*', ' ', true)).toBeNull()
  })
})

describe('다른 키', () => {
  it('별표와 공백 외의 키는 건드리지 않는다', () => {
    for (const key of ['a', '(', '[', '_', '`', 'Enter', 'Backspace']) expect(asteriskPairEdit('가|나', 2, 2, key)).toBeNull()
  })
})
