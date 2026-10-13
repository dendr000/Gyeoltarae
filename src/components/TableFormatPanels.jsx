import { Hash, MoveHorizontal, Paintbrush, Rows4 } from 'lucide-react'
import { ColorPicker } from './ColorPicker.jsx'
import { RULE_KINDS } from '../lib/tableConditional.js'

// 표 편집기의 "서식" 툴바(셋째 줄)와 그 패널 — 숫자 서식, 조건부 색, 열 너비, 줄무늬 행. 상태와 동작은 useTableFormat 이 갖고 있고, 여기서는
// 그리기만 한다. format 은 그 훅이 돌려준 값. 한 번에 패널 하나만 열린다.

const GROUPING_OPTIONS = [
  ['add', '넣기'],
  ['remove', '빼기'],
  ['keep', '그대로'],
]
const DECIMALS_OPTIONS = [['keep', '그대로'], ...[0, 1, 2, 3, 4, 5, 6].map((n) => [String(n), `${n}자리`])]
const CURRENCY_OPTIONS = [['keep', '그대로'], ['none', '없음'], ...['₩', '$', '€', '¥', '£'].map((s) => [s, s])]
const SUFFIX_OPTIONS = [['keep', '그대로'], ['none', '없음'], ...['%', '원', '개', '명', '점', 'kg'].map((s) => [s, s])]

const RULE_LABELS = {
  gt: '값이 다음보다 큼 (>)',
  gte: '값이 다음 이상 (≥)',
  lt: '값이 다음보다 작음 (<)',
  lte: '값이 다음 이하 (≤)',
  eq: '값이 다음과 같음 (=)',
  neq: '값이 다음과 다름 (≠)',
  between: '값이 두 값 사이 (양 끝 포함)',
  contains: '글자를 포함',
  empty: '비어 있음',
  notEmpty: '비어 있지 않음',
  max: '최댓값',
  min: '최솟값',
  duplicate: '중복된 값',
}

function Select({ value, options, onChange, title }) {
  return (
    <select className="table-format-select" value={value} title={title} onChange={(e) => onChange(e.target.value)}>
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  )
}

function Field({ label, children }) {
  return (
    <label className="table-format-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function NumberPanel({ f }) {
  const set = (key) => (value) => f.setNumber((state) => ({ ...state, [key]: value }))
  return (
    <>
      <Field label="천 단위 쉼표">
        <Select value={f.number.grouping} options={GROUPING_OPTIONS} onChange={set('grouping')} />
      </Field>
      <Field label="소수 자릿수">
        <Select value={f.number.decimals} options={DECIMALS_OPTIONS} onChange={set('decimals')} />
      </Field>
      <Field label="앞 기호">
        <Select value={f.number.currency} options={CURRENCY_OPTIONS} onChange={set('currency')} />
      </Field>
      <Field label="뒤 글자">
        <Select value={f.number.suffix} options={SUFFIX_OPTIONS} onChange={set('suffix')} />
      </Field>
      <button type="button" className="table-format-apply" onClick={f.applyNumberFormat}>
        적용
      </button>
    </>
  )
}

function ConditionalPanel({ f }) {
  const spec = RULE_KINDS.find((entry) => entry.kind === f.rule.kind)
  const set = (key) => (value) => f.setRule((state) => ({ ...state, [key]: value }))
  const numeric = f.rule.kind !== 'contains'
  return (
    <>
      <Field label="조건">
        <Select value={f.rule.kind} options={RULE_KINDS.map(({ kind }) => [kind, RULE_LABELS[kind]])} onChange={set('kind')} />
      </Field>
      {spec.inputs >= 1 && (
        <input
          type="text"
          className="table-format-input"
          placeholder={numeric ? '값 (숫자)' : '찾을 글자'}
          value={f.rule.a}
          onChange={(e) => set('a')(e.target.value)}
        />
      )}
      {spec.inputs === 2 && (
        <input type="text" className="table-format-input" placeholder="값 (숫자)" value={f.rule.b} onChange={(e) => set('b')(e.target.value)} />
      )}
      <span className="table-format-field">
        <span>배경색</span>
        <ColorPicker value={f.rule.bg} onChange={set('bg')} onClear={() => set('bg')('')} title="맞는 칸의 배경색 (지우면 배경은 칠하지 않음)" />
      </span>
      <span className="table-format-field">
        <span>글자색</span>
        <ColorPicker value={f.rule.color} onChange={set('color')} onClear={() => set('color')('')} title="맞는 칸의 글자색 (지우면 글자색은 칠하지 않음)" />
      </span>
      <label className="table-format-field">
        <input type="checkbox" checked={f.rule.bold} onChange={(e) => set('bold')(e.target.checked)} />
        <span>굵게</span>
      </label>
      <span className="table-format-count">{f.ruleMatchCount}칸이 조건에 맞음 (점선 표시)</span>
      <button type="button" className="table-format-apply" onClick={f.applyRule}>
        색 적용
      </button>
      <button type="button" className="table-format-apply" onClick={f.clearRule} title="조건에 맞는 칸의 배경색·글자색·굵게를 지웁니다">
        색 지우기
      </button>
    </>
  )
}

function WidthPanel({ f }) {
  const current = f.currentWidth
  return (
    <>
      <span className="table-format-count">{f.widthColumns}열의 너비</span>
      <input
        type="text"
        inputMode="numeric"
        className="table-format-input table-format-input-short"
        placeholder={current ? String(current.value) : '숫자'}
        value={f.widthForm.value}
        onChange={(e) => f.setWidthForm((state) => ({ ...state, value: e.target.value }))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            f.applyWidth(false)
          }
        }}
      />
      <Select
        value={f.widthForm.unit}
        options={[['px', 'px (픽셀)'], ['%', '% (표 너비의 비율)']]}
        onChange={(unit) => f.setWidthForm((state) => ({ ...state, unit }))}
      />
      <button type="button" className="table-format-apply" onClick={() => f.applyWidth(false)}>
        적용
      </button>
      <button type="button" className="table-format-apply" onClick={() => f.applyWidth(true)}>
        지우기
      </button>
      <span className="table-format-count">지금: {current ? `${current.value}${current.unit}` : '정하지 않음 (글자 길이에 맞춤)'}</span>
    </>
  )
}

function StripePanel({ f }) {
  return (
    <>
      <span className="table-format-field">
        <span>줄무늬 색</span>
        <ColorPicker
          value={f.stripe.color}
          onChange={(color) => f.setStripe((state) => ({ ...state, color }))}
          onClear={() => {}}
          title="번갈아 칠할 배경색"
        />
      </span>
      <Field label="시작">
        <Select
          value={f.stripe.start}
          options={[['second', '둘째 줄부터'], ['first', '첫 줄부터']]}
          onChange={(start) => f.setStripe((state) => ({ ...state, start }))}
        />
      </Field>
      <button type="button" className="table-format-apply" onClick={() => f.applyStripes(false)}>
        칠하기
      </button>
      <button type="button" className="table-format-apply" onClick={() => f.applyStripes(true)} title="범위 안에서 이 색의 배경을 지웁니다">
        해제
      </button>
    </>
  )
}

const PANELS = {
  number: { label: '숫자 서식', icon: <Hash size={14} />, Body: NumberPanel, hint: '숫자 칸의 쉼표·소수 자릿수·기호를 글자로 바꿉니다' },
  conditional: { label: '조건부 색', icon: <Paintbrush size={14} />, Body: ConditionalPanel, hint: '조건에 맞는 칸을 한꺼번에 칠합니다 (값이 바뀌어도 자동으로 다시 칠하지는 않음)' },
  width: { label: '열 너비', icon: <MoveHorizontal size={14} />, Body: WidthPanel, hint: '고른 열의 너비를 정합니다' },
  stripe: { label: '줄무늬', icon: <Rows4 size={14} />, Body: StripePanel, hint: '행을 한 줄 걸러 칠합니다' },
}

export function TableFormatPanels({ format }) {
  const active = format.panel ? PANELS[format.panel] : null
  return (
    <>
      <div className="cell-style-toolbar table-format-toolbar">
        <span className="cell-style-toolbar-sublabel">서식</span>
        {Object.entries(PANELS).map(([name, { label, icon, hint }]) => (
          <button key={name} type="button" className={format.panel === name ? 'active' : ''} title={hint} onClick={() => format.togglePanel(name)}>
            {icon}
            {label}
          </button>
        ))}
      </div>
      {active && (
        <div className="table-format-panel">
          <span className="table-format-scope">
            {active.label} — 적용 범위: {format.panel === 'width' ? '고른 열' : format.scopeLabel}
            {format.panel !== 'width' && ' (첫 행을 헤더로 쓰면 그 행은 제외)'}
          </span>
          <active.Body f={format} />
          {format.message && <span className="table-find-message">{format.message}</span>}
        </div>
      )}
    </>
  )
}
