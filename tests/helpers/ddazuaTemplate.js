// Copyright (c) dendr000. MIT License.

// 따즈아 폴더의 새 문서 기본 내용 — 사용자가 요청한 본문을 줄 단위로 그대로 옮겨 적은 기대값이다.
// 구현(src/lib/folderDocTemplate.js)과 따로 적어서, 구현이 바뀌면 이 기대값과 어긋나 시험이 실패한다.
// 줄 끝의 공백("* ")도 요청 그대로다.
export const DDAZUA_TEMPLATE_LINES = [
  '[[분류:ddazua]]',
  '[[분류:]]',
  '[[분류:]]',
  '[목차]',
  '',
  '=  =',
  '==  ==',
  '* ',
  '',
  '==  ==',
  '* ',
  '',
  '',
  '=  =',
  '==  ==',
  '* ',
  '',
  '==  ==',
  '* ',
  '',
  '',
  '=  =',
  '==  ==',
  '* ',
  '',
  '==  ==',
  '* ',
  '',
  '',
  '=  =',
  '==  ==',
  '* ',
  '',
  '==  ==',
  '* ',
  '',
]

export const DDAZUA_TEMPLATE = DDAZUA_TEMPLATE_LINES.join('\n')
