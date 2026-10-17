// onJump(id): 접힌 문단 안의 제목이면 펴고 이동하는 함수(ViewerPane 이 넘김). 없으면 그냥 스크롤한다.
function jumpTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'auto', block: 'start' })
}

export function FloatingToc({ toc, onJump = jumpTo }) {
  if (!toc || toc.length === 0) return null

  return (
    <nav className="floating-toc" aria-label="목차 바로가기">
      <ul>
        {toc.map((h) => (
          <li key={h.id} style={{ paddingLeft: (h.level - 1) * 8 }}>
            <button type="button" onClick={() => onJump(h.id)} title={`${h.number}. ${h.text}`}>
              <span className="floating-toc-dot" />
              <span className="floating-toc-label">
                {h.number}. {h.text}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
