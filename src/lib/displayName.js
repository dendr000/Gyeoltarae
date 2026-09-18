// "0891 치고마", "01 파랑" 같은 파일 이름 맨 앞의 순서 번호(전국도감 번호,
// 목록 순서 등) — 정렬용일 뿐 문서 "이름"의 일부가 아니므로, 번호를 눈에
// 띄게 보여줄 곳(파일트리 배지)과 실제 이름만 필요한 곳(에디터 헤더 제목)
// 양쪽에서 같은 기준으로 떼어낼 수 있도록 공용 유틸로 뺌.
const LEADING_NUMBER_RE = /^(\d+)\s(.+)$/

export function splitLeadingNumber(name) {
  const m = name.match(LEADING_NUMBER_RE)
  return m ? { number: m[1], rest: m[2] } : null
}

export function stripLeadingNumber(name) {
  return splitLeadingNumber(name)?.rest ?? name
}
