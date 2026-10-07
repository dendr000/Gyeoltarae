import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TreeLabel } from '../../src/components/TreeLabel.jsx'

// 화면(DOM) 없이 시험하려고 서버 쪽 렌더링(문자열로 그리기)을 쓴다 — 이 컴포넌트는 이름을 받아
// 번호 배지와 이름 글자를 그리는 것뿐이라 브라우저 없이 결과 HTML 로 확인할 수 있다.
const render = (name) => renderToStaticMarkup(createElement(TreeLabel, { name }))

describe('TreeLabel (파일 트리의 이름 표시)', () => {
  it('앞에 숫자가 있으면 숫자를 배지로 따로 보여 주고 나머지를 이름으로 보여 준다 — 폴더 이름 예', () => {
    expect(render('01 올인원 DBMS!! 설계부터 운영까지!!')).toBe(
      '<span class="tree-number-badge">01</span><span class="tree-label">올인원 DBMS!! 설계부터 운영까지!!</span>',
    )
  })

  it('문서 이름도 같은 기준이다', () => {
    expect(render('0891 치고마')).toBe('<span class="tree-number-badge">0891</span><span class="tree-label">치고마</span>')
  })

  it('02, 03 같은 번호도 앞의 0을 유지한 채 그대로 보여 준다', () => {
    expect(render('02 테이블 생성')).toContain('<span class="tree-number-badge">02</span>')
    expect(render('03 조건절')).toContain('<span class="tree-number-badge">03</span>')
  })

  it('숫자로 시작하지 않으면 이름만 보인다', () => {
    expect(render('강의')).toBe('<span class="tree-label">강의</span>')
  })

  it('숫자 뒤에 공백이 없으면(2024년, 3D) 번호로 보지 않는다', () => {
    expect(render('2024년 기록')).toBe('<span class="tree-label">2024년 기록</span>')
    expect(render('3D')).toBe('<span class="tree-label">3D</span>')
  })

  it('숫자만 있는 이름은 번호로 떼어내지 않는다 (이름이 사라지지 않게)', () => {
    expect(render('01')).toBe('<span class="tree-label">01</span>')
  })

  it('이름 안의 HTML 특수문자는 이스케이프된다', () => {
    expect(render('01 <b>굵게</b>')).toContain('&lt;b&gt;굵게&lt;/b&gt;')
    expect(render('01 <b>굵게</b>')).not.toContain('<b>')
  })
})
