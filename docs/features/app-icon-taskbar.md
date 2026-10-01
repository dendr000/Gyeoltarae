# 앱 아이콘 · 작업 표시줄 정체성

> 지침 원문: `C:\dev\docs\guidelines\510_electron-icon.md` — 모든 Electron(Windows exe) 프로젝트에 공통으로 적용하는 규칙.
> 이 문서는 그 지침을 결타래에 실제로 적용한 내용을 정리한다.

## 무엇을, 왜

exe를 빌드만 하고 이 설정을 빼먹으면 작업 표시줄에서 다음처럼 보인다 (전부 겪었던 증상은 아니고, 지침에 정리된 일반적인 증상):

- 고정한 아이콘이 **Electron 기본 로고**(흰 종이/아톰 모양)로 나온다.
- 마우스를 올리면 이름이 "결타래"가 아니라 **"Electron"**으로 뜬다.
- 고정해 둔 아이콘과 실행 중인 창이 **서로 다른 앱처럼** 따로 떨어져 보인다.

세 증상 모두 원인이 다르다 — 아이콘 파일, 파일 정보(FileDescription 등), **AppUserModelID(AUMID)**. 이 문서는 이 세 가지를 결타래에 어떻게 넣었는지 적는다.

## 용어 설명 (초보자용)

| 용어 | 뜻 |
|---|---|
| **ICO 파일** | Windows가 쓰는 아이콘 전용 이미지 형식. 16×16부터 256×256까지 여러 크기를 한 파일 안에 같이 담을 수 있다(크기마다 선명하게 보이려고). |
| **exe 파일 정보(VersionInfo)** | 실행 파일 안에 박혀 있는 "이 프로그램이 누가·무엇을 위해 만들었나" 메타데이터. 탐색기에서 exe 속성을 열면 보이는 제품명·설명·회사명이 여기서 나온다. |
| **AppUserModelID (AUMID)** | Windows가 "이 창과 이 작업 표시줄 아이콘이 같은 앱이다"를 판단하는 기준값(역방향 도메인 표기, 예: `com.gyeoltarae.app`). 창을 만들 때와 바로가기를 만들 때 같은 값을 써야 서로 짝이 맞는다. |
| **AUMID vs. `app.setName()`** | 서로 다른 역할이다. `app.setName('wikidesk')`는 Electron이 사용자 설정 폴더(`%APPDATA%\wikidesk\`) 위치를 정할 때 쓰는 **내부 이름**(결타래로 개명하기 전부터 써 오던 값이라 그대로 고정해 둠)이고, AUMID(`com.gyeoltarae.app`)는 **작업 표시줄 전용** 값이다. 둘은 바꿔도 서로 영향 없다. |

## 결타래에 적용한 내용

1. **아이콘**: `build/icon.svg`(원본, 보라색 나선 — 실타래(감긴 실)이자 나이테(결)를 동시에 표현) → `build/icon.ico`(16·24·32·48·64·128·256px 전부 포함). `scripts/make-icon.cjs`로 만들었다(별도 이미지 라이브러리 없이 Electron 자체로 SVG를 그려 PNG로 캡처한 뒤 ICO로 묶음). `icon.svg`를 고치면 아래 명령으로 다시 만든다:
   ```bash
   node node_modules/electron/cli.js scripts/make-icon.cjs
   ```
2. **exe 파일 정보 + 아이콘 리소스**: `scripts/package-win.js`의 `@electron/packager` 호출에 `icon: build/icon.ico`와 `win32metadata`(CompanyName/FileDescription/ProductName/InternalName/OriginalFilename)를 넣었다. `electron-builder`용 `package.json`의 `build.win`에도 같은 `icon`을 넣어 뒀다(이 PC에서는 EPERM 문제로 평소엔 packager 쪽만 씀).
3. **AUMID**: `electron/main.js`에서 창을 만들기 전에 `app.setAppUserModelId('com.gyeoltarae.app')` 호출. `package.json`의 `build.appId`와 같은 값으로 맞춰 뒀다.
4. **개발 모드 창 아이콘**: `BrowserWindow({ icon: 'build/icon.ico', ... })` — `npm run electron:dev`로 띄워도 기본 아이콘 대신 앱 아이콘이 보인다.

## 확인한 것 / 확인이 더 필요한 것

- ✅ (자동) 패키징 후 `(Get-Item Gyeoltarae.exe).VersionInfo`의 `ProductName`/`FileDescription`이 "결타래"로 나옴 — 2026-10-02 확인.
- ✅ (자동) exe에서 추출한 아이콘이 나선 모양(Electron 기본 로고 아님) — 2026-10-02 확인.
- ⚠️ (사용자 확인 필요, 자동화 불가) 작업 표시줄에 실제로 고정해서 **같은 칸에** 뜨는지는 Claude가 터미널로 확인할 수 없다. 처음 확인할 때:
  1. `Gyeoltarae.exe`(또는 바로가기)를 실행 → 작업 표시줄의 실행 중 아이콘이 나선 아이콘인지 확인.
  2. 우클릭 → **작업 표시줄에 고정**.
  3. 종료 후 고정된 아이콘으로 다시 실행 → 아이콘이 하나만 뜨는지(새 창이 같은 칸에 묶이는지) 확인.
  4. **이전에 이미 결타래를 작업 표시줄에 고정해 뒀다면, 그 바로가기는 옛 아이콘/AUMID 없음 상태를 그대로 들고 있다** — 한 번 고정 해제했다가 새로 빌드된 exe로 다시 고정해야 한다.

## 유지 보수 메모

- **AUMID(`com.gyeoltarae.app`) 값은 한 번 정하면 바꾸지 않는다.** 바꾸면 이미 고정해 둔 바로가기가 새 창을 "다른 앱"으로 인식해 묶이지 않는다.
- **`build/icon.ico`는 저장소에 커밋한다**(빌드마다 새로 만들지 않음) — `build/icon.svg`/`scripts/make-icon.cjs`만 있으면 언제든 재생성 가능.
- 개발 중(`npm run electron:dev`)에는 작업 표시줄에 고정하지 않는다 — `electron.exe` 자체가 고정되어 버린다. 고정은 항상 패키징된 `Gyeoltarae.exe`로 한다.
