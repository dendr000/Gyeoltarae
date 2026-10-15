// Copyright (c) dendr000. MIT License.

// 배포 폴더(exe 가 있는 폴더)에 앱 안에 묻히지 않도록 따로 두는 파일들: 라이선스, 제3자 고지, D2Coding 글꼴 파일.
//  - LICENSE-Gyeoltarae.txt : 결타래 자신의 MIT 라이선스. Electron 이 이미 두는 LICENSE(Electron 의 라이선스)를 덮어쓰지 않도록 이름이 다르다.
//  - THIRD_PARTY_NOTICES.md : D2Coding 등 제3자 저작권·라이선스 고지(SIL OFL 1.1 전문 포함).
//  - fonts/                 : 앱에 번들한 D2Coding 글꼴(수정하지 않은 원본)과 OFL 라이선스 전문, 설치 안내. OFL 은 글꼴을 다시 배포할 때
//                             저작권 표기와 라이선스를 함께 주도록 요구한다. 받는 사람이 다른 프로그램에서도 쓸 수 있게 설치용으로도 둔다.
import fs from 'node:fs'
import path from 'node:path'

// 만들어지는 최상위 항목들. 빌드 폴더 안전 점검(KNOWN_TOP_LEVEL_ENTRIES)이 이것을 "정상 산출물"로 알아야 다음 빌드가 중단되지 않는다.
export const EXTRA_TOP_LEVEL_ENTRIES = ['LICENSE-Gyeoltarae.txt', 'THIRD_PARTY_NOTICES.md', 'fonts']

const FONT_FILE = 'D2Coding-Ver1.3.2-20180524.ttf'
const FONT_LICENSE_FILE = 'D2Coding-OFL.txt'

const FONT_README = `D2Coding 글꼴 (고정폭 한글 글꼴)
D2Coding font (monospaced Korean font)

- 만든 곳 / Copyright: NHN Corporation (Copyright (c) 2015-2016 NHN Corporation)
- 라이선스 / License: SIL Open Font License 1.1 (OFL) — 전문은 ${FONT_LICENSE_FILE} 에 있습니다.
- 글꼴 파일은 수정하지 않은 원본입니다. / The font file is the unmodified original.

결타래는 이 글꼴을 앱 안에 이미 넣어 두었기 때문에, 이 폴더의 파일을 설치하지 않아도 앱은 정상으로 보입니다.
이 폴더의 글꼴 파일은 다른 프로그램(메모장, 코드 편집기 등)에서도 쓰고 싶을 때 설치하라고 함께 둔 것입니다.

설치 방법: ${FONT_FILE} 를 오른쪽 클릭한 뒤 "설치" (또는 "모든 사용자용으로 설치")를 고르세요.
설치하면 결타래는 설치된 D2Coding 을 먼저 사용합니다.
`

export function copyDistributionExtras(root, outDir) {
  fs.mkdirSync(outDir, { recursive: true })
  fs.copyFileSync(path.join(root, 'LICENSE'), path.join(outDir, 'LICENSE-Gyeoltarae.txt'))
  fs.copyFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), path.join(outDir, 'THIRD_PARTY_NOTICES.md'))

  const fontSource = path.join(root, 'src', 'assets', 'fonts')
  const fontOut = path.join(outDir, 'fonts')
  fs.mkdirSync(fontOut, { recursive: true })
  fs.copyFileSync(path.join(fontSource, FONT_FILE), path.join(fontOut, FONT_FILE))
  fs.copyFileSync(path.join(fontSource, FONT_LICENSE_FILE), path.join(fontOut, FONT_LICENSE_FILE))
  fs.writeFileSync(path.join(fontOut, 'README.txt'), FONT_README, 'utf8')
}
