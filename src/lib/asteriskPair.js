// Copyright (c) dendr000. MIT License.

// 최상위 폴더 "AI챗" 안의 문서에서만 쓰는 별표(*) 자동 짝 맞추기. AI 대화를 붙여 넣어 정리하는 폴더라 마크다운 강조(`*기울임*`, `**굵게**`)를 자주 치기 때문이다.
// 화면(textarea)과 분리한 순수 함수라서 시험할 수 있다(tests/lib/asteriskPair.test.js). 규칙:
//   별표 하나를 치면 `*|*` (두 개가 생기고 커서는 사이)   — 바로 이어서 별표를 한 번 더 치면 `**|**` (굵게)
//   글을 선택하고 별표를 치면 선택한 글을 `*글*` 로 감싼다
//   닫는 별표가 바로 앞에 있으면 새로 쓰지 않고 그 별표를 넘어간다
//   줄 맨 앞에서 `*` 뒤에 바로 공백을 치면 목록 표시(`* 항목`)로 보고 자동으로 생긴 닫는 별표를 지운다
// "바로 이어서" 는 방금 자동으로 짝을 만든 자리(freshPairAt, 부르는 쪽이 기억한다)에 커서가 그대로 있을 때다. 글 가운데의 `**글*|*` 처럼
// 모양만 같은 자리와 구분하려는 것이다(모양만으로는 둘을 구별할 수 없다).
export const AI_CHAT_FOLDER = 'AI챗'

// 문서가 작업 폴더 바로 아래의 "AI챗" 폴더(그 아래 어느 깊이든) 안에 있는지. 윈도·맥 경로 구분자와 한글 조합 방식(NFC/NFD) 차이를 무시한다.
export function isAiChatDoc(docPath, workspacePath) {
  if (typeof docPath !== 'string' || typeof workspacePath !== 'string' || !docPath || !workspacePath) return false
  const clean = (p) => p.normalize('NFC').replace(/\\/g, '/').replace(/\/+$/, '')
  const doc = clean(docPath)
  const root = clean(workspacePath)
  const prefix = `${root}/`
  if (doc.length <= prefix.length || doc.slice(0, prefix.length).toLowerCase() !== prefix.toLowerCase()) return false
  const segments = doc.slice(prefix.length).split('/')
  // 폴더 안의 문서여야 한다(맨 위 파일 `AI챗.md` 는 폴더가 아니다).
  return segments.length >= 2 && segments[0] === AI_CHAT_FOLDER
}

function countRun(value, from, step) {
  let count = 0
  for (let i = from; i >= 0 && i < value.length && value[i] === '*'; i += step) count += 1
  return count
}

// 키를 누르기 전의 글(value)과 선택(start~end)에서, 이 키를 어떻게 처리할지 정한다. 건드리지 않을 키면 null.
//   { type: 'replace', from, to, insert, selStart, selEnd, fresh } : from~to 를 insert 로 바꾸고 selStart~selEnd 를 선택(같으면 커서). fresh 가 true 면 방금 짝을 만든 것
//   { type: 'move', caret }                                : 글은 그대로 두고 커서만 옮긴다(이미 있는 닫는 별표를 넘어감)
export function asteriskPairEdit(value, start, end, key, freshPairAt = -1) {
  if (key === '*') {
    if (start !== end) {
      const selected = value.slice(start, end)
      return { type: 'replace', from: start, to: end, insert: `*${selected}*`, selStart: start + 1, selEnd: start + 1 + selected.length }
    }
    const before = countRun(value, start - 1, -1)
    const after = countRun(value, start, 1)
    // `*|*` 에서 한 번 더 치면 굵게(`**|**`)로 넓힌다.
    if (before === 1 && after === 1 && freshPairAt === start) return { type: 'replace', from: start, to: start + 1, insert: '***', selStart: start + 1, selEnd: start + 1 }
    // 닫는 별표가 바로 뒤에 있으면 넘어간다.
    if (after >= 1) return { type: 'move', caret: start + 1 }
    // 앞에 별표가 붙어 있는데 뒤에는 없으면(`**` 를 직접 치는 중) 짝을 만들지 않고 그냥 쓴다.
    if (before >= 1) return null
    return { type: 'replace', from: start, to: start, insert: '**', selStart: start + 1, selEnd: start + 1, fresh: true }
  }
  if (key === ' ' && start === end) {
    // 줄 맨 앞 `*|*` 에서 공백을 치면 목록 표시이므로 닫는 별표를 지운다.
    if (freshPairAt !== start || value[start - 1] !== '*' || value[start] !== '*' || value[start - 2] === '*' || value[start + 1] === '*') return null
    const lineStart = value.lastIndexOf('\n', start - 2) + 1
    if (value.slice(lineStart, start - 1).trim() !== '') return null
    return { type: 'replace', from: start, to: start + 1, insert: ' ', selStart: start + 1, selEnd: start + 1 }
  }
  return null
}
