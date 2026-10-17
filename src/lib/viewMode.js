// Copyright (c) dendr000. MIT License.

// 화면 모드('preview' 뷰어 | 'dual' 듀얼 | 'focus' 편집)의 기본값과, 모드를 자동으로 바꿔야 하는 경우를 정한다. 화면과 분리한 순수 함수라서 시험할 수 있다.

// 앱을 켰을 때의 모드. 예전에는 듀얼이었고, 지금은 편집(focus)이다. 사용자가 헤더나 Ctrl+1/2/3, Ctrl+E 로 바꾼 모드는 그 실행 동안 유지된다.
export const DEFAULT_MODE = 'focus'

// 문서 화면 값(fields: openPath, viewingCategory, viewingData, viewingTemplate)이 바뀔 때 적용할 모드를 돌려준다.
// 편집 모드에서는 오른쪽 뷰어가 가려지는데, 아직 페이지가 없는 분류·자료·틀(openPath 가 null 이고 viewing* 만 있는 화면)은 "만들기" 단추가
// 뷰어에만 있다. 그대로 두면 빈 편집창만 보여서 만들 방법이 사라지므로, 그때만 듀얼로 바꿔 뷰어가 보이게 한다. 그 밖에는 모드를 건드리지 않는다.
// 문서 화면 값이 들어 있지 않은 변경(탭 목록만 바뀜 등)은 openPath 가 undefined 라서 해당하지 않는다.
export function modeForDocFields(mode, fields) {
  const viewerOnly = fields.openPath === null && Boolean(fields.viewingCategory || fields.viewingData || fields.viewingTemplate)
  return mode === 'focus' && viewerOnly ? 'dual' : mode
}
