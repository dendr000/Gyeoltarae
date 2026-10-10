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

// 따즈아/01 올인원 DBMS!! 설계부터 운영까지!! 폴더의 이름(규칙이 이 이름 전체로 찾는다).
export const FOLDER_01 = '01 올인원 DBMS!! 설계부터 운영까지!!'
// 따즈아/02 배워서 바로 써먹는 DBMS 폴더의 새 문서 기본 내용 — 사용자가 요청한 본문(---------- 안쪽)을 줄 단위로
// 그대로 옮겨 적은 기대값이다. 구현과 따로 적어서 어긋나면 시험이 실패한다. 큰 제목 줄은 "=  =" (= 사이 공백 둘).
export const FOLDER_02 = '02 배워서 바로 써먹는 DBMS'
export const PRACTICE_TEMPLATE_LINES = [
  '[[분류:ddazua]]',
  '[[분류:DBMS]]',
  '[[분류:DBMS/]]',
  '[목차]',
  '[clearfix]',
  '',
  '=  =',
  '```DBeaver',
  '```',
  '',
  '=  =',
  '```DBeaver',
  '```',
  '',
  '=  =',
  '```DBeaver',
  '```',
  '',
]
export const PRACTICE_TEMPLATE = PRACTICE_TEMPLATE_LINES.join('\n')
