// Copyright (c) dendr000. MIT License.

// Ctrl+N(Mac 은 Cmd+N)으로 새 문서 만들기: 지금 열려 있는 문서가 있는 폴더에 만든다. 화면과 분리한 순수 함수라서 시험할 수 있다.
// Shift/Alt 가 같이 눌린 조합은 다른 단축키를 위해 비워 두고, 한글 입력 조합 중(isComposing)에는 반응하지 않는다. 한글 자판 상태에서는 e.key 가
// 'ㅜ' 로 올 수 있어서 물리 키 위치(e.code === 'KeyN')도 함께 본다.
export function isNewDocKey(e) {
  if (e.isComposing) return false
  if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return false
  return e.key?.toLowerCase() === 'n' || e.code === 'KeyN'
}

// 새 문서를 만들 폴더: 열린 문서(openPath)가 있는 폴더, 열린 문서가 없으면 작업 폴더. 경로 구분자는 \ 와 / 둘 다 받는다.
export function newDocTargetDir(openPath, workspacePath) {
  if (!openPath) return workspacePath
  const index = Math.max(openPath.lastIndexOf('\\'), openPath.lastIndexOf('/'))
  return index <= 0 ? workspacePath : openPath.slice(0, index)
}
