# 배포 빌드 — 다른 사람에게 줄 때

## 한 줄 요약

`npm run dist:win:packager` 가 만드는 **`release-packager\Gyeoltarae-win32-x64` 폴더 전체**를 zip 으로 묶어 주면 된다. 받는 사람은 압축을 풀고 `Gyeoltarae.exe` 를 실행하면 된다(설치·Node 불필요, Windows 64비트). 이 폴더에는 계획서(docs)·임시 메모·이 PC 경로가 든 파일이 **들어가지 않고**, 라이선스와 D2Coding 글꼴 파일이 exe 옆에 함께 들어간다.

## 폴더 안에 들어 있는 것

| 파일·폴더 | 내용 |
|---|---|
| `Gyeoltarae.exe` + dll·pak 파일들 | 앱 본체(Electron). **exe 하나만 따로 주면 실행되지 않는다** — 폴더째 줘야 한다 |
| `resources\app.asar` | 결타래 코드와 화면, 필요한 모듈(chokidar, readdirp). 약 5MB |
| `LICENSE` | **Electron 의** MIT 라이선스(Electron 이 둔다) |
| `LICENSE-Gyeoltarae.txt` | 결타래의 MIT 라이선스 (이름이 달라서 위 파일을 덮어쓰지 않는다) |
| `THIRD_PARTY_NOTICES.md` | D2Coding 등 제3자 저작권·라이선스 고지(SIL OFL 1.1 전문 포함) |
| `fonts\` | `D2Coding-Ver1.3.2-20180524.ttf`(수정하지 않은 원본), `D2Coding-OFL.txt`(라이선스 전문), `README.txt`(설치 안내) |

- **글꼴은 앱 안에도 이미 들어 있다**(화면 파일 `dist\assets`). `fonts\` 폴더의 파일은 설치하지 않아도 앱이 정상으로 보이게 하려는 것이 아니라, 받는 사람이 다른 프로그램에서도 쓰고 싶을 때 설치하라는 것과 OFL 이 요구하는 "글꼴을 다시 배포할 때 저작권 표기와 라이선스를 함께 주기"를 지키려는 것이다. 설치하면 결타래는 설치된 D2Coding 을 먼저 쓴다.
- 워크스페이스(문서 폴더)는 포함되지 않는다. 받는 사람이 처음 켜면 "워크스페이스 폴더 선택" 화면이 뜨고 설정은 그 사람 PC 에 따로 저장된다. 앱 설치 폴더 안은 워크스페이스로 고를 수 없다.

## 빌드에서 뺀 것 (예전에는 들어갔다)

0.110.0 까지는 `app.asar`(약 56MB)에 다음이 같이 들어 있었다. 이제는 빠져서 약 5MB 가 되었다.

| 뺀 것 | 이유 |
|---|---|
| `docs/` 52개 (계획서·기능 설명·CHANGELOG) | 받는 사람에게 필요 없고, CHANGELOG 에 이 PC 경로(`C:\dev`)가 있었다 |
| `결타래.lnk` | 이 PC 경로가 들어 있는 바로가기 |
| `electron-test-log.txt`, `scratch-portfolio.*` | 임시·메모 파일 |
| `.gitignore`, `.oxlintrc.json`, `package-lock.json`, `public/`, `build/icon.svg·png` | 개발용 파일(창 아이콘으로 쓰는 `build/icon.ico` 는 남긴다) |
| `LICENSE`, `THIRD_PARTY_NOTICES.md` (asar 안) | 앱 안에 묻히지 않게 exe 옆으로 옮겼다 |
| `node_modules` 6,201개 중 대부분 | react, lucide-react 등은 화면 번들(`dist`)에 이미 들어 있다. **메인 프로세스가 실제로 쓰는 chokidar 와 그 의존(readdirp)만** 남긴다 |

- **쓰는 모듈 목록은 자동으로 정한다.** `electron/*.js` 가 가져오는 외부 모듈을 읽고 그 의존을 따라간다. 새 의존을 메인 프로세스에서 쓰기 시작하면 빌드에 저절로 들어간다.
- 패키저는 쓰지 않는 모듈의 **빈 폴더 껍데기**(`node_modules\react` 등, 안에 파일 없음)를 남긴다. 해롭지 않다.

## 빌드가 스스로 점검한다

패키징이 끝나면 `app.asar` 안의 **파일 목록**을 점검하고, 어긋나면 **빌드를 실패**로 끝낸다.

- **필요한 파일이 없을 때**: `electron/main.js`, `electron/preload.cjs`, `shared/*.js`, `dist/index.html`, `build/icon.ico`, 쓰는 모듈의 `package.json` 중 하나라도 없으면 앱이 켜지지 않으므로 실패한다.
- **넣지 않기로 한 파일이 있을 때**: docs, `.lnk`, 임시 메모, 쓰지 않는 모듈의 파일이 하나라도 들어 있으면 실패한다.
- 끝나면 `exe` 옆에 라이선스·고지·글꼴을 복사한다. 이 항목들은 다음 빌드의 "폴더 안전 점검"(워크스페이스가 들어 있는 폴더를 지우지 않으려는 점검)이 정상 산출물로 알도록 목록에 들어 있다.

## 임시 위치에 빌드해서 확인하기

환경 변수 `GYELTARAE_PACKAGE_OUT` 에 폴더를 주면 그 안에 `Gyeoltarae-win32-x64` 를 만든다. **실행 중인 앱의 폴더를 건드리지 않고** 새 빌드를 확인할 때 쓴다(프로젝트 루트의 `결타래.lnk` 는 다시 만들지 않는다).

```bash
GYELTARAE_PACKAGE_OUT=C:/임시/폴더 npm run dist:win:packager
```

## 받는 사람에게 알려 줄 것

- **Windows 가 "PC를 보호했습니다" 화면을 띄울 수 있다.** 서명이 없는 exe 라서 그렇다. **추가 정보 > 실행**을 누르면 된다. zip 파일을 오른쪽 클릭 > 속성 > 맨 아래 **차단 해제**를 체크한 뒤 압축을 풀면 대부분 안 뜬다.
- **zip 안에서 바로 실행하지 말고 압축을 푼 폴더에서 실행**해야 한다.
- 앱을 켜 둔 채 폴더를 압축하면 파일이 사용 중이라 실패한다. 앱을 끄고 압축한다.

## 확인한 것

- 새로 빌드한 exe 를 임시 설정·임시 워크스페이스로 실제로 띄워서 확인했다: 창이 뜨고 문서 트리가 보이며, 설정 읽기, D2Coding 글꼴 로드, **폴더 감시기(chokidar)가 새 파일을 알아챔**, 워크스페이스 바로가기 스크립트(asar 밖으로 풀어 둔 `.ps1`) 실행이 모두 정상이었고 콘솔 오류는 없었다.

## 관련 파일

| 파일 | 역할 |
|---|---|
| `scripts/package-win.js` | 빌드 진행(걸러내기 → 패키징 → 점검 → 추가 파일 복사 → 바로가기) |
| `scripts/packageIgnore.js` | 배포에서 뺄 파일 규칙, 메인 프로세스가 쓰는 모듈 찾기·의존 따라가기 |
| `scripts/verifyPackage.js` | 만든 뒤 `app.asar` 안 파일 목록 점검(필요한 것·넣지 않기로 한 것) |
| `scripts/distributionExtras.js` | exe 옆에 두는 라이선스·고지·글꼴 복사 |
| `tests/scripts/packageIgnore.test.js` | 위 네 가지의 규칙 시험(실제 패키징은 하지 않는다) |

## 용어 설명 (초보자용)

| 용어 | 뜻 |
|---|---|
| 배포 | 만든 앱을 다른 사람에게 주는 것 |
| 패키징 | 앱 코드와 실행에 필요한 것을 묶어 exe 로 쓸 수 있는 폴더로 만드는 것 |
| app.asar | 앱의 코드·화면 파일을 하나로 묶은 파일. 실행 중에 Electron 이 안을 읽는다 |
| node_modules | 앱이 쓰는 외부 부품(라이브러리)이 설치되는 폴더. 화면 쪽 부품은 이미 화면 번들에 합쳐져 있어서 배포에는 필요 없다 |
| OFL (SIL Open Font License) | D2Coding 글꼴의 라이선스. 글꼴을 다시 배포할 때 저작권 표기와 라이선스 전문을 함께 주면 된다 |
| 서명 | 만든 사람과 변조 여부를 증명하는 디지털 도장. 결타래 exe 에는 없다 |
