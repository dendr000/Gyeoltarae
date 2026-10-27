// Copyright (c) dendr000. MIT License.

// 문서 속 이미지 참조([[파일:이름]], [[파일:이름|너비]], [[파일:이름|300px|link=문서명]])의 이름을 바꾸는 규칙. 이미지 공간에서 이미지 이름을 바꾸면
// 이미 문서에 쓰여 있는 참조도 같이 새 이름으로 바꿔서 그림이 "없음"으로 끊기지 않게 한다. 화면과 분리한 순수 함수라서 시험할 수 있다(tests/lib/imageRefs.test.js).
//   - 참조의 이름 부분만 바꾸고 `|` 뒤의 옵션(너비, link= 등)은 그대로 둔다.
//   - 코드블록(``` 로 감싼 줄들) 안의 글은 예시일 수 있으므로 건드리지 않는다.
//   - 이름은 정확히 같아야 바꾼다(다른 이미지의 참조는 그대로).
const IMAGE_REF_RE = /\[\[파일:([^\]|]+)((?:\|[^\]]*)?)\]\]/g
const FENCE_LINE_RE = /^\s*```/

// 줄 하나에서 참조를 바꾼다.
function renameInLine(line, oldName, newName) {
  return line.replace(IMAGE_REF_RE, (whole, name, suffix) => (name.trim() === oldName ? `[[파일:${newName}${suffix}]]` : whole))
}

// 글 전체에서 oldName 이미지 참조를 newName 으로 바꾼 글. 바꿀 것이 없으면 같은 글(같은 문자열)을 돌려준다.
export function renameImageRefs(content, oldName, newName) {
  if (typeof content !== 'string' || !oldName || !newName || oldName === newName) return content
  if (!content.includes(`[[파일:`)) return content
  const lines = content.split('\n')
  let inFence = false
  let changed = false
  for (let i = 0; i < lines.length; i += 1) {
    if (FENCE_LINE_RE.test(lines[i])) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const next = renameInLine(lines[i], oldName, newName)
    if (next !== lines[i]) {
      lines[i] = next
      changed = true
    }
  }
  return changed ? lines.join('\n') : content
}

// 이 글에 그 이미지의 참조가 있는지(코드블록 밖). 바꿀 문서를 빨리 가려내는 데 쓴다.
export function hasImageRef(content, name) {
  return renameImageRefs(content, name, `${name}\u0000`) !== content
}
