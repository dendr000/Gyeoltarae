// Copyright (c) dendr000. MIT License.

// 편집기 줄 여백의 "강조 켜기" 표시 — 줄 위에 마우스를 올리면 나오는 점을 눌러 그 줄을 강조해 두는 기능의 순수 규칙.
// 표시는 줄 번호(0부터)의 목록이다. 문서를 고치면 줄 번호가 밀리므로, 고치기 전·후의 글을 비교해서 표시가 같은 글에
// 계속 붙어 있게 옮긴다. 화면과 분리한 순수 함수라서 시험할 수 있다. 표시는 앱을 켜 둔 동안만 유지된다(파일에 저장하지 않는다).

// 줄 하나가 바뀌는 흔한 경우(글자 입력)는 줄 수가 그대로라서 표시를 건드리지 않는다. 줄이 늘거나 줄면 앞쪽에서부터 같은
// 줄과 뒤쪽에서부터 같은 줄을 빼고 남은 "바뀐 구간"만 따진다.
//  - 바뀐 구간 앞의 표시는 그대로, 바뀐 구간 뒤의 표시는 줄 수가 달라진 만큼 옮긴다.
//  - 바뀐 구간 안의 표시는 구간의 첫 줄이고 새 글에도 구간이 남아 있으면 그대로 두고(줄을 Enter 로 나눈 경우 앞쪽 조각에
//    표시가 남는다), 나머지는 지운다(그 줄이 사라졌거나 합쳐졌으므로).
export function shiftMarks(marks, oldText, newText) {
  if (marks.length === 0 || oldText === newText) return marks
  if (newText === '') return [] // 문서를 전부 지우면 표시도 모두 지운다
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  if (oldLines.length === newLines.length) return marks

  const limit = Math.min(oldLines.length, newLines.length)
  let prefix = 0
  while (prefix < limit && oldLines[prefix] === newLines[prefix]) prefix += 1
  let suffix = 0
  while (
    suffix < limit - prefix &&
    oldLines[oldLines.length - 1 - suffix] === newLines[newLines.length - 1 - suffix]
  ) {
    suffix += 1
  }

  const delta = newLines.length - oldLines.length
  const oldChangedEnd = oldLines.length - suffix // 옛 글에서 바뀐 구간은 [prefix, oldChangedEnd)
  const newChangedLength = newLines.length - suffix - prefix
  const next = []
  for (const line of marks) {
    if (line < prefix) next.push(line)
    else if (line >= oldChangedEnd) next.push(line + delta)
    else if (line === prefix && newChangedLength > 0) next.push(line)
  }
  return next
}

// 표시를 켜거나 끈 새 목록(오름차순, 원래 목록은 바꾸지 않는다).
export function toggleMark(marks, line) {
  return marks.includes(line) ? marks.filter((n) => n !== line) : [...marks, line].sort((a, b) => a - b)
}

// 세로 위치 y 에 걸린 줄 번호. 각 줄의 시작 위치(topOf(i))가 오름차순이라는 점을 이용한 이분 탐색이다. y 가 첫 줄
// 시작보다 위면 null.
export function lineIndexAt(count, topOf, y) {
  if (count === 0 || y < topOf(0)) return null
  let low = 0
  let high = count - 1
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    if (topOf(mid) <= y) low = mid
    else high = mid - 1
  }
  return low
}
