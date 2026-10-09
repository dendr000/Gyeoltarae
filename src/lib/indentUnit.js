// Copyright (c) dendr000. MIT License.

// 들여쓰기 한 칸 = 공백 4칸. Tab 키, 여러 줄 들여쓰기, 목록 이어쓰기가 모두 이 값을 쓴다.
// (파서의 wikiParser.js listDepthByIndent 도 탭을 공백 4칸으로 센다 — 바꾸려면 둘을 같이 본다.)
export const INDENT_UNIT = 4
export const INDENT = ' '.repeat(INDENT_UNIT)
