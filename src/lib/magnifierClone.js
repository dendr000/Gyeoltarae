// Copyright (c) dendr000. MIT License.
import { cloneStyleNodes, collectHoverCss, rebuildClone } from './magnifierDom.js'

// 돋보기(둥근 돋보기·영역 확대창)가 함께 쓰는 "앱 화면 복제본". 복제본은 shadow DOM 안에 두고, 앱 화면이 바뀌면 다시 만든다.
// 둥근 돋보기(magnifierLens.js)와 영역 확대창(magnifierRegion.js)은 이 복제본을 어디에 어떤 모양으로 보여 줄지만 다르다.
const STAGE_CSS = `
:host { display: block; }
.mag-stage { position: absolute; left: 0; top: 0; overflow: hidden; transform-origin: 0 0; background: var(--bg); user-select: none; }
`

// className: host 에 붙일 클래스(모양은 App.css). onDirty: 앱 화면이 바뀌어 복제본을 다시 만들어야 할 때 불리는 함수(다시 그리기를 예약하는 데 쓴다).
export function createCloneView({ className, onDirty }) {
  const host = document.createElement('div')
  host.className = className
  host.setAttribute('aria-hidden', 'true')
  const shadow = host.attachShadow({ mode: 'open' })
  const hoverStyle = document.createElement('style')
  hoverStyle.textContent = collectHoverCss(document)
  const baseStyle = document.createElement('style')
  baseStyle.textContent = STAGE_CSS
  const stage = document.createElement('div')
  stage.className = 'mag-stage'
  // 복제본은 보여 주기만 한다 — 마우스·키보드를 받지 않아 복제본 안의 입력 칸이 포커스를 가져가지 못한다.
  stage.inert = true
  shadow.append(...cloneStyleNodes(document), hoverStyle, baseStyle, stage)
  // body 가 아니라 html 아래에 둔다 — body 의 변화를 지켜보는 감시자가 돋보기 자신의 움직임에 반응하지 않도록.
  document.documentElement.appendChild(host)

  let dirty = true
  const markDirty = () => {
    dirty = true
    onDirty()
  }
  const observer = new MutationObserver(markDirty)
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true })
  document.addEventListener('scroll', markDirty, true)
  document.addEventListener('input', markDirty, true)
  document.addEventListener('change', markDirty, true)
  window.addEventListener('resize', markDirty)

  return {
    host,
    stage,
    // 창 크기와 같은 크기로 맞추고, 바뀐 것이 있으면 복제본을 다시 만든다. 다시 그릴 때마다 부른다.
    sync() {
      stage.style.width = `${window.innerWidth}px`
      stage.style.height = `${window.innerHeight}px`
      if (dirty) {
        dirty = false
        rebuildClone(document.body, stage, host)
      }
    },
    destroy() {
      observer.disconnect()
      document.removeEventListener('scroll', markDirty, true)
      document.removeEventListener('input', markDirty, true)
      document.removeEventListener('change', markDirty, true)
      window.removeEventListener('resize', markDirty)
      host.remove()
    },
  }
}
