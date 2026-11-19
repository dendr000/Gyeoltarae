// Copyright (c) dendr000. MIT License.

// 각주 `[* 내용]` 의 모양. 뷰어(wikiParser.js)와 편집기(footnoteEdit.js)가 같은 규칙으로 각주를 찾도록 한 곳에 둔다.
// `[*` 뒤에 공백 하나(없어도 됨), 내용은 `]` 가 나오기 전까지다. 단 내용 안의 아래 세 가지는 닫는 표시가 아니다.
//   [br]          줄 안 줄바꿈
//   [[문서]]      위키링크 (나무위키처럼 각주 안에서 링크를 쓸 수 있다)
//   [0], [x]      대괄호 한 쌍 (배열 첨자 같은 글)
// 그 밖의 `]` 는 각주를 닫는다. allowNewline 은 줄바꿈을 내용에 허용할지다(뷰어는 여러 줄로 합쳐진 표 행 때문에 허용하고, 편집기는 한 줄 안만 본다).
const BRACKET_GROUP = String.raw`\[br\]|\[\[[^\]\n]*\]\]|\[[^\[\]\n]*\]`

export function footnoteRegExp(allowNewline = false) {
  const plain = allowNewline ? String.raw`[^\]]` : String.raw`[^\]\n]`
  return new RegExp(String.raw`\[\*\s?((?:${BRACKET_GROUP}|${plain})*)\]`, 'g')
}

// 각주 안에 그대로 둘 수 있는 대괄호 묶음(위 세 가지). 편집 상자에서 `]` 를 `］` 로 바꿀 때 이 묶음은 건드리지 않는다.
const KEEP_GROUP_RE = new RegExp(BRACKET_GROUP, 'g')

// 각주 내용 안의 "닫는 표시가 될 `]`" 를 전각 `］` 로 바꾼다. 위 묶음 안의 `]` 는 그대로 둔다.
export function escapeFootnoteClosers(text) {
  let out = ''
  let last = 0
  for (const m of text.matchAll(KEEP_GROUP_RE)) {
    out += text.slice(last, m.index).replace(/\]/g, '］') + m[0]
    last = m.index + m[0].length
  }
  return out + text.slice(last).replace(/\]/g, '］')
}
