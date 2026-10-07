// Copyright (c) dendr000. MIT License.

// 특정 폴더 밑에서 새 문서를 만들 때 자동으로 채워 넣는 기본 내용(폴더별 새 문서 틀).
// 폴더 이름으로 찾는다 — 그 폴더 자신이나 그 아래 어느 깊이의 폴더에서 만들어도 적용된다.
// (작품 폴더의 자동 [[분류:...]] 규칙은 store/useAppStore.js 의 findWorkFolderContext 가 따로
// 맡는다. 이 틀은 그와 별개로, 작품 폴더가 아닌 곳의 새 문서 모양을 정하는 용도.)
//
// 내용에 `[[분류:]]`(이름이 빈 줄)를 두면 그 자리는 사용자가 채울 칸이다. 이 문서가 작품 폴더 밑에
// 있으면 그 빈 칸이 자동 분류 태그로 채워진다(applyAutoCategoryTags).
// 따즈아: 큰 제목(=  =) 네 묶음, 묶음마다 작은 제목(==  ==) 둘과 빈 목록 항목(* )이 있는 강의 노트 뼈대.
// 분류는 ddazua 와 비워 둔 칸 둘 — 빈 칸은 폴더의 "자동 분류"(lib/autoCategory.js)가 폴더·문서 이름에서
// 찾은 글자로 채운다(없으면 비어 있는 채로 남아 직접 쓰면 된다). 줄 끝의 공백("* ")도 그대로 둔다.
const DDAZUA_SECTION = '=  =\n==  ==\n* \n\n==  ==\n* \n'
const DDAZUA_TEMPLATE = `[[분류:ddazua]]\n[[분류:]]\n[[분류:]]\n[목차]\n\n${[DDAZUA_SECTION, DDAZUA_SECTION, DDAZUA_SECTION, DDAZUA_SECTION].join('\n\n')}`

const FOLDER_DOC_TEMPLATES = [{ folderName: '따즈아', content: DDAZUA_TEMPLATE }]

// dirPath(새 문서를 만들 폴더 경로) 위쪽 어딘가에 틀이 정해진 폴더가 있으면 그 틀의 내용,
// 없으면 null. 경로 구분자는 / 와 \ 둘 다 받는다. 이름은 폴더 이름 전체가 같아야 한다
// ("따즈아 (1)" 같은 이름은 해당하지 않음). 틀이 여러 개 걸리면 가장 안쪽 폴더의 것을 쓴다.
export function findFolderDocTemplate(dirPath) {
  const segments = dirPath.split(/[\\/]/)
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const found = FOLDER_DOC_TEMPLATES.find((t) => t.folderName === segments[i])
    if (found) return found.content
  }
  return null
}
