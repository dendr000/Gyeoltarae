// Copyright (c) dendr000. MIT License.

// 폴더의 "기본 틀" — 폴더에 글양식(틀) 하나를 지정해 두면 그 폴더(와 아래 폴더)에서 새 문서를 만들 때 그 틀이 자동으로
// 선택된다. 설정은 폴더 안의 숨김 파일 하나에 { "template": "틀 이름" } 로 저장되어 폴더를 옮기거나 이름을 바꿔도 따라간다
// (electron/fileSystem.js 의 DEFAULT_TEMPLATE_FILE_NAME 과 같은 이름이어야 하며 시험이 확인한다). 화면과 분리한 순수
// 함수라서 시험할 수 있다.
export const DEFAULT_TEMPLATE_FILE = '.wikidesk-default-template.json'

// 새 문서 입력창에서 "틀을 쓰지 않음(빈 문서)" 을 고른 값. 빈 값('')은 "자동 — 폴더 기본 틀이 있으면 그것"이다.
export const NO_TEMPLATE = '__none__'

// 새 문서의 시작 내용으로 쓸 글양식을 정한다. 우선순위:
//   1. 사용자가 입력창에서 직접 고른 틀(explicit)
//   2. 폴더 기본 틀 설정(folderDefaultName — 가장 가까운 윗 폴더의 설정)
//   3. 그 밖(내장 폴더 기본 내용 → 예전 기본 내용)은 호출한 쪽이 이어서 정한다
// explicit 이 NO_TEMPLATE 이면 폴더 설정도 내장 기본 내용도 건너뛰고 빈 문서로 시작한다.
// 이름의 틀이 없어졌거나 내용이 비어 있으면(지우거나 이름을 바꾼 뒤) 그 단계는 건너뛰고 다음으로 간다.
// 돌려주는 값: { source: 'none' | 'explicit' | 'folder' | 'fallback', template }
export function chooseStartTemplate({ explicit, folderDefaultName, templateIndex }) {
  if (explicit === NO_TEMPLATE) return { source: 'none', template: null }
  const usable = (name) => {
    const template = name ? templateIndex?.[name] : null
    return template?.rawText ? template : null
  }
  const chosen = usable(explicit)
  if (chosen) return { source: 'explicit', template: chosen }
  const folderTemplate = usable(folderDefaultName)
  if (folderTemplate) return { source: 'folder', template: folderTemplate }
  return { source: 'fallback', template: null }
}
