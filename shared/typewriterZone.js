// Copyright (c) dendr000. MIT License.

// 타자기 스크롤의 구역 설정값. 편집창을 세로로 5등분해 글을 쓰는 줄(커서)이 머무를 구역을 고른다.
//   0 = 끔(기본), 1 = 맨 위쪽, 2 = 위쪽, 3 = 가운데, 4 = 아래쪽, 5 = 맨 아래쪽
// 메인 프로세스(설정 저장·메뉴)와 화면(스토어·편집기)이 함께 쓰는 순수 함수라서 shared/ 에 둔다.
export const TYPEWRITER_ZONE_COUNT = 5

// 0~5 의 정수만 받고, 그 밖의 값(문자열, 소수, 범위 밖, undefined 등)은 끔(0)으로 본다 — 망가진 설정 파일이 와도 끔으로 돌아간다.
// (Number.isInteger 는 숫자가 아닌 값('3', true, [3] 등)을 변환하지 않고 거절한다.)
export function normalizeTypewriterZone(value) {
  return Number.isInteger(value) && value >= 0 && value <= TYPEWRITER_ZONE_COUNT ? value : 0
}
