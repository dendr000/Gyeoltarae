function jumpTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'auto', block: 'start' })
}

export function FloatingToc({ toc }) {
  if (!toc || toc.length === 0) return null

  return (
    <nav className="floating-toc" aria-label="목차 바로가기">
      <ul>
        {toc.map((h) => (
          <li key={h.id} style={{ paddingLeft: (h.level - 1) * 8 }}>
            <button type="button" onClick={() => jumpTo(h.id)} title={`${h.number}. ${h.text}`}>
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
