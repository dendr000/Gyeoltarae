// Copyright (c) dendr000. MIT License.

// CSS 상용구 — 속성 이름, 값, 함수, 선택자(가상 클래스·가상 요소), @규칙, 자주 쓰는 틀.
import { languagePack, t, words } from './common.js'

const PROPERTIES = words(`
  color background background-color background-image background-size background-position background-repeat
  background-attachment background-clip border border-top border-right border-bottom border-left border-color
  border-width border-style border-radius border-collapse border-spacing outline outline-offset box-shadow
  text-shadow margin margin-top margin-right margin-bottom margin-left padding padding-top padding-right
  padding-bottom padding-left width height min-width max-width min-height max-height box-sizing overflow
  overflow-x overflow-y display position top right bottom left z-index float clear visibility opacity
  flex flex-direction flex-wrap flex-flow flex-grow flex-shrink flex-basis justify-content align-items
  align-content align-self order gap row-gap column-gap grid grid-template grid-template-columns
  grid-template-rows grid-template-areas grid-area grid-column grid-row grid-auto-flow grid-auto-rows
  grid-auto-columns place-items place-content place-self
  font font-family font-size font-weight font-style font-variant line-height letter-spacing word-spacing
  text-align text-decoration text-transform text-indent text-overflow white-space word-break word-wrap
  overflow-wrap vertical-align list-style list-style-type list-style-position cursor pointer-events
  user-select resize content quotes counter-reset counter-increment transform transform-origin
  transition transition-property transition-duration transition-timing-function transition-delay animation
  animation-name animation-duration animation-timing-function animation-delay animation-iteration-count
  animation-direction animation-fill-mode animation-play-state filter backdrop-filter object-fit
  object-position aspect-ratio clip-path mask scroll-behavior scroll-snap-type will-change appearance
  table-layout caption-side empty-cells columns column-count column-width inset isolation mix-blend-mode
`)

const VALUES = words(`
  none auto inherit initial unset revert normal block inline inline-block inline-flex inline-grid flex grid
  table table-cell contents absolute relative fixed sticky static hidden visible scroll clip collapse
  solid dashed dotted double groove ridge inset outset transparent currentColor center start end left right
  top bottom space-between space-around space-evenly stretch baseline flex-start flex-end column column-reverse
  row row-reverse wrap nowrap wrap-reverse bold bolder lighter italic oblique underline overline line-through
  uppercase lowercase capitalize nowrap pre pre-wrap pre-line break-word break-all ellipsis cover contain
  no-repeat repeat repeat-x repeat-y pointer default text move not-allowed grab grabbing zoom-in crosshair
  ease ease-in ease-out ease-in-out linear infinite alternate forwards backwards both paused running
  border-box content-box serif sans-serif monospace cursive system-ui !important
  px em rem vh vw vmin vmax ch fr deg rad turn ms
`)

const FUNCTIONS = [
  'rgb()', 'rgba()', 'hsl()', 'hsla()', 'url()', 'var()', 'calc()', 'min()', 'max()', 'clamp()', 'attr()',
  'linear-gradient()', 'radial-gradient()', 'conic-gradient()', 'repeat()', 'minmax()', 'fit-content()',
  'translate()', 'translateX()', 'translateY()', 'scale()', 'rotate()', 'skew()', 'matrix()',
  'cubic-bezier()', 'steps()', 'blur()', 'brightness()', 'contrast()', 'grayscale()', 'drop-shadow()',
]

// 가상 클래스(:hover)·가상 요소(::before)는 앞의 콜론을 빼고 이름만 둔다. 속성 값을 쓸 때도 `color:` 처럼 콜론을 치므로,
// 콜론으로 시작하는 제목을 두면 그때마다 추천 팝업이 뜬다. `a:ho` 까지 치면 `hover` 가 뜬다.
const SELECTORS = words(`
  hover active focus focus-visible focus-within visited link checked disabled enabled required optional valid
  invalid first-child last-child nth-child nth-of-type first-of-type last-of-type only-child not is where has root
  empty target before after first-line first-letter selection placeholder marker backdrop
`)

const AT_RULES = [
  '@media', '@import', '@font-face', '@keyframes', '@supports', '@charset', '@layer', '@container', '@property',
]
const TEMPLATES = [
  t('cssreset', '* {', '    margin: 0;', '    padding: 0;', '    box-sizing: border-box;', '}'),
  t('cssbase', 'html {', '    font-size: 16px;', '}', '', 'body {', '    margin: 0;', '    font-family: system-ui, -apple-system, "Segoe UI", "Malgun Gothic", sans-serif;', '    line-height: 1.6;', '    {#}', '}'),
  t('cssroot', ':root {', '    --primary: #6c4ee3;', '    --text: #222;', '    {#}', '}'),
  t('cssvar', 'var(--{#})'),
  t('flexc', 'display: flex;', 'justify-content: center;', 'align-items: center;{#}'),
  t('flexcol', 'display: flex;', 'flex-direction: column;', 'gap: {#}px;'),
  t('flexsb', 'display: flex;', 'justify-content: space-between;', 'align-items: center;{#}'),
  t('flexwrap', 'display: flex;', 'flex-wrap: wrap;', 'gap: {#}px;'),
  t('gridcols', 'display: grid;', 'grid-template-columns: repeat({#}, 1fr);', 'gap: 16px;'),
  t('gridauto', 'display: grid;', 'grid-template-columns: repeat(auto-fit, minmax({#}px, 1fr));', 'gap: 16px;'),
  t('centerabs', 'position: absolute;', 'top: 50%;', 'left: 50%;', 'transform: translate(-50%, -50%);{#}'),
  t('abscover', 'position: absolute;', 'inset: 0;{#}'),
  t('fixedtop', 'position: fixed;', 'top: 0;', 'left: 0;', 'width: 100%;', 'z-index: 100;{#}'),
  t('stickyt', 'position: sticky;', 'top: 0;{#}'),
  t('mxauto', 'margin: 0 auto;{#}'),
  t('maxw', 'max-width: {#}px;', 'margin: 0 auto;'),
  t('ellips', 'overflow: hidden;', 'text-overflow: ellipsis;', 'white-space: nowrap;{#}'),
  t('clamp2', 'display: -webkit-box;', '-webkit-line-clamp: {#};', '-webkit-box-orient: vertical;', 'overflow: hidden;'),
  t('clearfix', '.clearfix::after {', '    content: "";', '    display: block;', '    clear: both;', '}'),
  t('trans', 'transition: {#} 0.3s ease;'),
  t('transall', 'transition: all 0.3s ease;{#}'),
  t('shadow', 'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);{#}'),
  t('rounded', 'border-radius: {#}px;'),
  t('circle', 'border-radius: 50%;{#}'),
  t('hoverb', '&:hover {', '    {#}', '}'),
  t('hoverrule', '.{#}:hover {', '    ', '}'),
  t('rule', '.{#} {', '    ', '}'),
  t('ridrule', '#{#} {', '    ', '}'),
  t('mediamax', '@media (max-width: {#}px) {', '    ', '}'),
  t('mediamin', '@media (min-width: {#}px) {', '    ', '}'),
  t('mediadark', '@media (prefers-color-scheme: dark) {', '    {#}', '}'),
  t('mediapr', '@media print {', '    {#}', '}'),
  t('keyframes', '@keyframes {#} {', '    from {', '        opacity: 0;', '    }', '    to {', '        opacity: 1;', '    }', '}'),
  t('animate', 'animation: {#} 1s ease-in-out infinite;'),
  t('fontface', '@font-face {', '    font-family: "{#}";', '    src: url("") format("woff2");', '    font-display: swap;', '}'),
  t('importcss', '@import url("{#}");'),
  t('gradient', 'background: linear-gradient(to right, #6c4ee3, #4dd0e1);{#}'),
  t('bgcover', 'background: url("{#}") center / cover no-repeat;'),
  t('hide', 'display: none;{#}'),
  t('sronly', 'position: absolute;', 'width: 1px;', 'height: 1px;', 'padding: 0;', 'margin: -1px;', 'overflow: hidden;', 'clip: rect(0, 0, 0, 0);', 'white-space: nowrap;', 'border: 0;'),
  t('scrollb', '::-webkit-scrollbar {', '    width: {#}px;', '}', '', '::-webkit-scrollbar-thumb {', '    background: #888;', '    border-radius: 4px;', '}'),
  t('smooth', 'scroll-behavior: smooth;{#}'),
  t('aspect', 'aspect-ratio: {#} / 9;'),
  t('imgfit', 'width: 100%;', 'height: 100%;', 'object-fit: cover;{#}'),
]

export const CSS_PACK = languagePack({
  folder: 'CSS',
  description: 'CSS — 속성·값·함수·선택자·@규칙·틀',
  keywords: [...PROPERTIES, ...VALUES, ...FUNCTIONS, ...SELECTORS, ...AT_RULES],
  templates: TEMPLATES,
  first: [
    'color', 'background', 'background-color', 'margin', 'padding', 'border', 'width', 'height', 'display',
    'position', 'font-size', 'font-weight', 'text-align', 'flex', 'justify-content', 'align-items', 'grid',
    'none', 'block', 'flex', 'auto', 'center', 'relative', 'absolute', 'hidden', 'transition', 'transform',
    'opacity', 'overflow', 'cursor', 'box-sizing', 'border-radius', 'gap', 'z-index',
    'flexc', 'rule', 'mediamax', 'cssreset',
    'background-image', 'background-size', 'background-position', 'box-shadow', 'text-decoration', 'line-height', 'letter-spacing', 'font-family', 'text-transform', 'white-space', 'overflow-x', 'overflow-y', 'top', 'left', 'right', 'bottom', 'float', 'clear', 'flex-direction', 'flex-wrap', 'flex-grow', 'align-content', 'grid-template-columns', 'grid-template-rows', 'min-width', 'max-width', 'min-height', 'max-height', 'animation', 'visibility', 'outline', 'content', 'list-style', 'object-fit', 'aspect-ratio', 'inline-block', 'inline', 'fixed', 'sticky', 'static', 'flex-start', 'flex-end', 'space-between', 'space-around', 'wrap', 'nowrap', 'column', 'row', 'solid', 'dashed', 'dotted', 'bold', 'italic', 'underline', 'uppercase', 'transparent', 'inherit', 'initial', 'rgb', 'rgba', 'hsl', 'url', 'var', 'calc', 'linear-gradient', 'translate', 'rotate', 'scale', 'hover', 'focus', 'active', 'first-child', 'last-child', 'nth-child', 'before', 'after', 'root',
  ],
})
