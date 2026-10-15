// Copyright (c) dendr000. MIT License.

// 타자기 스크롤 — 글을 쓰는 줄(커서)이 편집창의 고른 높이에 머물도록 편집창을 스크롤한다. 시선을 한 곳에 둔 채 글을 쓰게 하려는 것이다.
// 편집창을 세로로 5등분해 구역 1(맨 위쪽)~5(맨 아래쪽) 중 한 곳의 **한가운데**에 커서 줄의 가운데를 맞춘다. 화면(textarea)과 분리한
// 순수 함수라서 시험할 수 있다. 설정값 검증은 메인과 함께 쓰는 shared/typewriterZone.js.
import { TYPEWRITER_ZONE_COUNT, normalizeTypewriterZone } from '../../shared/typewriterZone.js'

// 구역 -> 편집창 높이의 몇 배 지점(0~1)인지. 끔(0)이거나 잘못된 값이면 null. 구역 n 의 한가운데 = (n - 0.5) / 5.
export function zoneRatio(zone) {
  const normalized = normalizeTypewriterZone(zone)
  return normalized === 0 ? null : (normalized - 0.5) / TYPEWRITER_ZONE_COUNT
}

// 커서 줄이 그 구역에 오게 하는 scrollTop(정수). 끔이면 null(= 스크롤을 건드리지 않는다).
//   caretTop     - 커서 줄의 맨 위, 글 전체(스크롤하지 않은 상태) 맨 위에서부터의 거리(px)
//   lineHeight   - 한 줄의 높이(px)
//   clientHeight - 편집창이 보여 주는 높이(px)
//   scrollHeight - 글 전체 높이(px, 아래 여백 포함)
// 글 맨 위 근처는 음수가 되므로 0 에서, 맨 아래 근처는 scrollHeight - clientHeight 에서 멈춘다(그 앞뒤에서는 커서가 그 구역에 못 온다).
export function typewriterScrollTop({ caretTop, lineHeight, clientHeight, scrollHeight, zone }) {
  const ratio = zoneRatio(zone)
  if (ratio === null) return null
  const target = caretTop + lineHeight / 2 - clientHeight * ratio
  const max = Math.max(0, scrollHeight - clientHeight)
  return Math.min(max, Math.max(0, Math.round(target)))
}

// 글을 쓸 때마다 커서 위치를 재는데, 그 비용이 글 길이에 비례한다(약 1만 자에 1ms, 40만 자에 50ms 이상). 아주 긴 글에서는 타자기 스크롤을
// 쓰지 않고 브라우저 기본 스크롤에 맡긴다. 보통의 문서(수천~수만 자)는 한도에 한참 못 미친다.
export const TYPEWRITER_MAX_CHARS = 300_000

export function canTypewrite(textLength) {
  return textLength <= TYPEWRITER_MAX_CHARS
}

// 커서를 옮기는 키. 글자·Enter·지우기 같은 편집은 입력 이벤트(onChange)가 따로 처리하므로 여기에는 없다.
const NAV_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'])

export function isTypewriterNavKey(key) {
  return NAV_KEYS.has(key)
}
