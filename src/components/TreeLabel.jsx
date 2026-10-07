// Copyright (c) dendr000. MIT License.

import { splitLeadingNumber } from '../lib/displayName.js'

// 파일 트리 한 줄의 이름 표시 — "01 올인원 DBMS", "0891 치고마" 처럼 이름 맨 앞에 순서 번호가
// 있으면 번호를 따로 배지로 보여 주고 나머지를 이름으로 보여 준다. 문서 행과 폴더 행이 같은
// 기준으로 표시되도록 한 곳에 둔다(번호를 떼는 규칙 자체는 lib/displayName.js).
export function TreeLabel({ name }) {
  const split = splitLeadingNumber(name)
  if (!split) return <span className="tree-label">{name}</span>
  return (
    <>
      <span className="tree-number-badge">{split.number}</span>
      <span className="tree-label">{split.rest}</span>
    </>
  )
}
