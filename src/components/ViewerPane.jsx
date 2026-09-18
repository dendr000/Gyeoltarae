import { useCallback, useMemo, useState } from 'react'
import { parseWikiText, groupByChoseong, extractCategories } from '../lib/wikiParser.js'
import { FloatingToc } from './FloatingToc.jsx'
import { ContextMenu } from './ContextMenu.jsx'
import { useAppStore } from '../store/useAppStore.js'
import { getApi } from '../lib/api.js'

function dirnameOf(filePath) {
  const idx = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
  return idx === -1 ? filePath : filePath.slice(0, idx)
}

// Shared by every rendered-HTML surface (normal docs, category page bodies):
// resolves clicks on 분류 badges, 자료 cards, missing-틀 placeholders, and
// [[문서명]] wikilinks through the store, which already knows whether a
// real page/entry/template/doc file exists for the target.
function handleWikiContentClick(
  e,
  { onOpenCategory, onOpenDataEntry, onOpenTemplate, onOpenDoc, onCreateLinkedDoc, onAmbiguousLink, onAnchorLink, onEditHeading },
) {
  // Only the main document view passes onEditHeading (see ViewerPane's
  // own parseWikiText call and requestEditorJump) — category/data/template
  // preview panes don't, so a heading's [편집] link (when editableOffsets
  // rendered one at all) is simply inert there instead of trying to jump
  // an editor that isn't showing this content in the first place.
  const editHeadingLink = e.target.closest('.wiki-heading-edit-link')
  if (editHeadingLink && onEditHeading) {
    e.preventDefault()
    getApi().refocusWindow?.()
    onEditHeading(Number(editHeadingLink.dataset.sourceOffset))
    return
  }
  const catLink = e.target.closest('.wiki-category-link')
  if (catLink) {
    e.preventDefault()
    getApi().refocusWindow?.()
    onOpenCategory(catLink.dataset.category)
    return
  }
  const dataCard = e.target.closest('.data-card')
  if (dataCard) {
    getApi().refocusWindow?.()
    onOpenDataEntry(dataCard.dataset.type, dataCard.dataset.name)
    return
  }
  const missingTemplate = e.target.closest('.template-missing')
  if (missingTemplate) {
    getApi().refocusWindow?.()
    onOpenTemplate(missingTemplate.dataset.template)
    return
  }
  const anchorLink = e.target.closest('.wiki-anchor-link')
  if (anchorLink) {
    e.preventDefault()
    getApi().refocusWindow?.()
    onAnchorLink(anchorLink.dataset.docPath || null, anchorLink.dataset.docName || null, anchorLink.dataset.anchorName)
    return
  }
  const wikiLink = e.target.closest('.wiki-link')
  if (wikiLink) {
    e.preventDefault()
    getApi().refocusWindow?.()
    onOpenDoc(wikiLink.dataset.docPath, wikiLink.dataset.docName)
    return
  }
  const missingLink = e.target.closest('.wiki-link-missing')
  if (missingLink) {
    e.preventDefault()
    getApi().refocusWindow?.()
    onCreateLinkedDoc(missingLink.dataset.docTarget)
    return
  }
  const ambiguousLink = e.target.closest('.wiki-link-ambiguous')
  if (ambiguousLink) {
    e.preventDefault()
    getApi().refocusWindow?.()
    onAmbiguousLink(ambiguousLink.dataset.docTarget, e.clientX, e.clientY)
  }
}

function CategoryBadges({ names, onOpenCategory, emptyHint }) {
  if (!names || names.length === 0) {
    return emptyHint ? <p className="category-empty-hint">{emptyHint}</p> : null
  }
  return (
    <div className="wiki-category-bar">
      {names.map((name) => (
        <button
          key={name}
          type="button"
          className="category-badge-btn"
          onClick={() => {
            getApi().refocusWindow?.()
            onOpenCategory(name)
          }}
        >
          {name}
        </button>
      ))}
    </div>
  )
}

function CategoryPageView({
  categoryName,
  entry,
  categoryIndex,
  dataIndex,
  templateIndex,
  docIndex,
  imageIndex,
  onOpenDoc,
  onOpenCategory,
  onOpenDataEntry,
  onOpenTemplate,
  onCreatePage,
  onCreateLinkedDoc,
  onAmbiguousLink,
  onAnchorLink,
}) {
  const safeEntry = entry ?? { members: [], parents: [], pagePath: null, pageName: null, pageRawText: '' }

  const subcategories = useMemo(
    () =>
      Object.keys(categoryIndex)
        .filter((name) => name !== categoryName && categoryIndex[name].parents?.includes(categoryName))
        .sort((a, b) => a.localeCompare(b, 'ko')),
    [categoryIndex, categoryName],
  )

  const { html: pageHtml } = useMemo(
    () =>
      safeEntry.pageRawText
        ? parseWikiText(safeEntry.pageRawText, { dataIndex, templateIndex, docIndex, imageIndex })
        : { html: '' },
    [safeEntry.pageRawText, dataIndex, templateIndex, docIndex, imageIndex],
  )

  const groupedDocs = useMemo(
    () => groupByChoseong(safeEntry.members, (m) => m.name),
    [safeEntry.members],
  )

  const handlePageBodyClick = useCallback(
    (e) =>
      handleWikiContentClick(e, {
        onOpenCategory,
        onOpenDataEntry,
        onOpenTemplate,
        onOpenDoc,
        onCreateLinkedDoc,
        onAmbiguousLink,
        onAnchorLink,
      }),
    [onOpenCategory, onOpenDataEntry, onOpenTemplate, onOpenDoc, onCreateLinkedDoc, onAmbiguousLink, onAnchorLink],
  )

  return (
    <div className="category-page" onClick={handlePageBodyClick}>
      <div className="category-page-header">
        <span className="category-page-kicker">분류</span>
        <h1>{categoryName}</h1>
      </div>

      <div className="category-page-section">
        <h3>상위 분류</h3>
        <CategoryBadges names={safeEntry.parents} onOpenCategory={onOpenCategory} emptyHint="상위 분류가 없습니다." />
      </div>

      {safeEntry.pagePath ? (
        safeEntry.pageRawText.trim() && (
          <div className="wiki-rendered category-page-body" dangerouslySetInnerHTML={{ __html: pageHtml }} />
        )
      ) : (
        <div className="category-page-section category-page-no-doc">
          <p className="category-empty-hint">이 분류에 대한 설명 문서가 아직 없습니다.</p>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              getApi().refocusWindow?.()
              onCreatePage(categoryName)
            }}
          >
            분류 설명 문서 만들기
          </button>
        </div>
      )}

      {subcategories.length > 0 && (
        <div className="category-page-section">
          <h3>하위 분류</h3>
          <CategoryBadges names={subcategories} onOpenCategory={onOpenCategory} />
        </div>
      )}

      <div className="category-page-section">
        <h3>
          문서 목록 <span className="category-page-count">({safeEntry.members.length})</span>
        </h3>
        {groupedDocs.length === 0 ? (
          <p className="category-empty-hint">이 분류에 속한 문서가 없습니다.</p>
        ) : (
          groupedDocs.map(({ group, items }) => (
            <div className="category-group" key={group}>
              <span className="category-group-label">{group}</span>
              <div className="category-group-items">
                {items.map((doc) => (
                  <button
                    key={doc.path}
                    type="button"
                    className="category-doc-link"
                    onClick={() => {
                      getApi().refocusWindow?.()
                      onOpenDoc(doc.path, doc.name)
                    }}
                  >
                    {doc.name}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// A right-hand backlink list used by both the 자료 and 틀 detail views —
// "which documents actually reference this."
function UsedByList({ items, onOpenDoc, emptyHint }) {
  const grouped = useMemo(() => groupByChoseong(items, (m) => m.name), [items])
  if (grouped.length === 0) return <p className="category-empty-hint">{emptyHint}</p>
  return grouped.map(({ group, items: docs }) => (
    <div className="category-group" key={group}>
      <span className="category-group-label">{group}</span>
      <div className="category-group-items">
        {docs.map((doc) => (
          <button
            key={doc.path}
            type="button"
            className="category-doc-link"
            onClick={() => {
              getApi().refocusWindow?.()
              onOpenDoc(doc.path, doc.name)
            }}
          >
            {doc.name}
          </button>
        ))}
      </div>
    </div>
  ))
}

function DataEntryView({
  type,
  name,
  entry,
  templateIndex,
  docIndex,
  imageIndex,
  onOpenDoc,
  onOpenCategory,
  onOpenDataEntry,
  onOpenTemplate,
  onCreateEntry,
  onCreateLinkedDoc,
  onAmbiguousLink,
  onAnchorLink,
}) {
  const key = `${type}/${name}`
  const safeEntry = entry ?? { type, name, path: null, rawText: '', usedBy: [] }

  const { html: cardHtml } = useMemo(
    () =>
      parseWikiText(`[[자료:${type}/${name}]]`, {
        dataIndex: { [key]: safeEntry },
        templateIndex,
        docIndex,
        imageIndex,
      }),
    [type, name, key, safeEntry, templateIndex, docIndex, imageIndex],
  )

  const handleBodyClick = useCallback(
    (e) =>
      handleWikiContentClick(e, {
        onOpenCategory,
        onOpenDataEntry,
        onOpenTemplate,
        onOpenDoc,
        onCreateLinkedDoc,
        onAmbiguousLink,
        onAnchorLink,
      }),
    [onOpenCategory, onOpenDataEntry, onOpenTemplate, onOpenDoc, onCreateLinkedDoc, onAmbiguousLink, onAnchorLink],
  )

  return (
    <div className="category-page" onClick={handleBodyClick}>
      <div className="category-page-header">
        <span className="category-page-kicker">자료 · {type}</span>
        <h1>{name}</h1>
      </div>

      {safeEntry.path ? (
        <div className="wiki-rendered data-entry-preview" dangerouslySetInnerHTML={{ __html: cardHtml }} />
      ) : (
        <div className="category-page-section category-page-no-doc">
          <p className="category-empty-hint">아직 만들어지지 않은 자료입니다.</p>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              getApi().refocusWindow?.()
              onCreateEntry(type, name)
            }}
          >
            자료 만들기
          </button>
        </div>
      )}

      <div className="category-page-section">
        <h3>
          참조하는 문서 <span className="category-page-count">({safeEntry.usedBy.length})</span>
        </h3>
        <UsedByList items={safeEntry.usedBy} onOpenDoc={onOpenDoc} emptyHint="아직 이 자료를 참조하는 문서가 없습니다." />
      </div>
    </div>
  )
}

function TemplateView({
  name,
  entry,
  templateIndex,
  dataIndex,
  docIndex,
  imageIndex,
  onOpenDoc,
  onOpenCategory,
  onOpenDataEntry,
  onOpenTemplate,
  onCreateTemplate,
  onCreateLinkedDoc,
  onAmbiguousLink,
  onAnchorLink,
}) {
  const safeEntry = entry ?? { name, path: null, rawText: '', usedBy: [] }

  // Previewed with no arguments — {{{매개변수}}} tokens fall back to their
  // own default (or blank), same as visiting the 틀 page directly would.
  const { html: previewHtml } = useMemo(
    () =>
      parseWikiText(`{{틀:${name}}}`, {
        templateIndex: { ...templateIndex, [name]: safeEntry },
        dataIndex,
        docIndex,
        imageIndex,
      }),
    [name, templateIndex, safeEntry, dataIndex, docIndex, imageIndex],
  )

  const handleBodyClick = useCallback(
    (e) =>
      handleWikiContentClick(e, {
        onOpenCategory,
        onOpenDataEntry,
        onOpenTemplate,
        onOpenDoc,
        onCreateLinkedDoc,
        onAmbiguousLink,
        onAnchorLink,
      }),
    [onOpenCategory, onOpenDataEntry, onOpenTemplate, onOpenDoc, onCreateLinkedDoc, onAmbiguousLink, onAnchorLink],
  )

  return (
    <div className="category-page" onClick={handleBodyClick}>
      <div className="category-page-header">
        <span className="category-page-kicker">틀</span>
        <h1>{name}</h1>
      </div>

      {safeEntry.path ? (
        safeEntry.rawText.trim() && (
          <div className="wiki-rendered template-preview" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        )
      ) : (
        <div className="category-page-section category-page-no-doc">
          <p className="category-empty-hint">아직 만들어지지 않은 틀입니다.</p>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              getApi().refocusWindow?.()
              onCreateTemplate(name)
            }}
          >
            틀 만들기
          </button>
        </div>
      )}

      <div className="category-page-section">
        <h3>
          이 틀을 사용하는 문서 <span className="category-page-count">({safeEntry.usedBy.length})</span>
        </h3>
        <UsedByList items={safeEntry.usedBy} onOpenDoc={onOpenDoc} emptyHint="아직 이 틀을 사용하는 문서가 없습니다." />
      </div>
    </div>
  )
}

export function ViewerPane({ text, emptyHint }) {
  const openPath = useAppStore((s) => s.openPath)
  const workspacePath = useAppStore((s) => s.workspacePath)
  const categoryIndex = useAppStore((s) => s.categoryIndex)
  const dataIndex = useAppStore((s) => s.dataIndex)
  const templateIndex = useAppStore((s) => s.templateIndex)
  const docIndex = useAppStore((s) => s.docIndex)
  const imageIndex = useAppStore((s) => s.imageIndex)
  const viewingCategory = useAppStore((s) => s.viewingCategory)
  const viewingData = useAppStore((s) => s.viewingData)
  const viewingTemplate = useAppStore((s) => s.viewingTemplate)
  const openFile = useAppStore((s) => s.openFile)
  const openCategory = useAppStore((s) => s.openCategory)
  const createCategoryPage = useAppStore((s) => s.createCategoryPage)
  const openDataEntry = useAppStore((s) => s.openDataEntry)
  const createDataEntry = useAppStore((s) => s.createDataEntry)
  const openTemplate = useAppStore((s) => s.openTemplate)
  const createTemplate = useAppStore((s) => s.createTemplate)
  const createDoc = useAppStore((s) => s.createDoc)
  const requestEditorJump = useAppStore((s) => s.requestEditorJump)

  // [[문서명]] that doesn't resolve in docIndex (see rebuildIndexes in
  // useAppStore.js) is missing entirely — clicking it creates a new doc
  // named `target`, placed next to whatever document is currently open
  // (falling back to the workspace root if none is, e.g. clicked from a
  // 분류 page). [[문서명]] that resolves to more than one doc (two docs
  // sharing a name, or a name a leading order-number strips down to) can't
  // silently pick one, so it opens this little picker instead.
  const [linkMenu, setLinkMenu] = useState(null)

  const handleCreateLinkedDoc = useCallback(
    (target) => {
      const dirPath = openPath ? dirnameOf(openPath) : workspacePath
      if (dirPath) createDoc(dirPath, target)
    },
    [openPath, workspacePath, createDoc],
  )

  const handleAmbiguousLink = useCallback(
    (target, x, y) => {
      const candidates = docIndex[target] ?? []
      setLinkMenu({
        x,
        y,
        items: candidates.map((c) => ({
          label: c.path,
          onClick: () => openFile(c.path, c.name),
        })),
      })
    },
    [docIndex, openFile],
  )

  const linkMenuEl = linkMenu && (
    <ContextMenu x={linkMenu.x} y={linkMenu.y} items={linkMenu.items} onClose={() => setLinkMenu(null)} />
  )

  // anchorName is already a slug (see wikiParser.js's slugifyName) — a
  // heading's own id is "h-" + that slug, an explicit [anchor(이름)]'s is
  // "anchor-" + it; whichever one actually exists in this document wins.
  // Retries across a few animation frames rather than assuming one is
  // enough: after navigating to a different document, openFile's state
  // update, the resulting re-render, and dangerouslySetInnerHTML actually
  // landing in the DOM don't all finish within the same frame, so the id
  // this is looking for may not exist yet on the first try.
  const scrollToAnchor = useCallback((anchorName, attemptsLeft = 10) => {
    const el = document.getElementById(`h-${anchorName}`) ?? document.getElementById(`anchor-${anchorName}`)
    if (el) {
      el.scrollIntoView({ behavior: 'auto', block: 'start' })
      return
    }
    if (attemptsLeft <= 0) return
    requestAnimationFrame(() => scrollToAnchor(anchorName, attemptsLeft - 1))
  }, [])

  // Same document: the target's already on screen, just scroll. A
  // different document: open it first — scrollToAnchor's own retry loop
  // covers the wait for that new content to actually land in the DOM.
  const handleAnchorLink = useCallback(
    (docPath, docName, anchorName) => {
      if (!docPath || docPath === openPath) {
        scrollToAnchor(anchorName)
        return
      }
      openFile(docPath, docName).then(() => scrollToAnchor(anchorName))
    },
    [openPath, openFile, scrollToAnchor],
  )

  // While the currently open document IS the category page / data entry /
  // template being viewed, render its own (possibly unsaved) live text
  // instead of the last indexed-from-disk snapshot, so editing it feels as
  // real-time as any other document instead of only updating after the
  // next autosave.
  const isLiveOwnDoc = !!viewingCategory && !!openPath && categoryIndex[viewingCategory]?.pagePath === openPath
  const dataKey = viewingData ? `${viewingData.type}/${viewingData.name}` : null
  const isLiveOwnData = !!viewingData && !!openPath && dataIndex[dataKey]?.path === openPath
  const isLiveOwnTemplate = !!viewingTemplate && !!openPath && templateIndex[viewingTemplate]?.path === openPath

  const { html, toc } = useMemo(
    () => parseWikiText(text, { dataIndex, templateIndex, docIndex, imageIndex, editableOffsets: true }),
    [text, dataIndex, templateIndex, docIndex, imageIndex],
  )

  const categoryEntry = useMemo(() => {
    const base = categoryIndex[viewingCategory] ?? {
      members: [],
      parents: [],
      pagePath: null,
      pageName: null,
      pageRawText: '',
    }
    if (!isLiveOwnDoc) return base
    return { ...base, pageRawText: text, parents: extractCategories(text) }
  }, [categoryIndex, viewingCategory, isLiveOwnDoc, text])

  const dataEntry = useMemo(() => {
    const base = dataIndex[dataKey] ?? { type: viewingData?.type, name: viewingData?.name, path: null, rawText: '', usedBy: [] }
    if (!isLiveOwnData) return base
    return { ...base, rawText: text }
  }, [dataIndex, dataKey, viewingData, isLiveOwnData, text])

  const templateEntry = useMemo(() => {
    const base = templateIndex[viewingTemplate] ?? { name: viewingTemplate, path: null, rawText: '', usedBy: [] }
    if (!isLiveOwnTemplate) return base
    return { ...base, rawText: text }
  }, [templateIndex, viewingTemplate, isLiveOwnTemplate, text])

  const handleContentClick = useCallback(
    (e) =>
      handleWikiContentClick(e, {
        onOpenCategory: openCategory,
        onOpenDataEntry: openDataEntry,
        onOpenTemplate: openTemplate,
        onOpenDoc: openFile,
        onCreateLinkedDoc: handleCreateLinkedDoc,
        onAmbiguousLink: handleAmbiguousLink,
        onAnchorLink: handleAnchorLink,
        onEditHeading: requestEditorJump,
      }),
    [
      openCategory,
      openDataEntry,
      openTemplate,
      openFile,
      handleCreateLinkedDoc,
      handleAmbiguousLink,
      handleAnchorLink,
      requestEditorJump,
    ],
  )

  // Shift+더블클릭으로 뷰어에서 편집기의 해당 위치로 점프 — 렌더링된 HTML은 굵게/기울임체
  // 같은 문법이 이미 걷힌 상태라 클릭한 지점을 소스 오프셋으로 정확히 역산할 일반적인
  // 방법은 없음(특히 틀 전개·조건부 블록을 거친 내용이면 원문에 그 형태 그대로 존재하지도
  // 않음). 대신 더블클릭이 기본으로 선택해 주는 단어 하나를 골라, 클릭 지점 바로 앞의
  // 제목(이미 정확한 오프셋을 알고 있는 [편집] 링크들)부터 그 단어를 원문에서 찾아 이동 —
  // 완벽하지 않지만(같은 섹션 안에 같은 단어가 여러 번 나오면 첫 번째로 감) 대부분의 경우
  // 원하는 문단 근처로 정확히 데려다줌.
  const handleContentDoubleClick = useCallback(
    (e) => {
      if (!e.shiftKey) return
      if (e.target.closest('a, button')) return
      const word = window.getSelection()?.toString().trim()
      if (!word) return
      const container = e.currentTarget
      let searchStart = 0
      for (const link of container.querySelectorAll('.wiki-heading-edit-link')) {
        if (e.target.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_PRECEDING) {
          searchStart = Number(link.dataset.sourceOffset)
        }
      }
      const foundOffset = text.indexOf(word, searchStart)
      if (foundOffset !== -1) {
        getApi().refocusWindow?.()
        requestEditorJump(foundOffset)
      }
    },
    [text, requestEditorJump],
  )

  if (viewingCategory) {
    return (
      <div className="viewer-pane">
        <div className="viewer-scroll">
          <CategoryPageView
            categoryName={viewingCategory}
            entry={categoryEntry}
            categoryIndex={categoryIndex}
            dataIndex={dataIndex}
            templateIndex={templateIndex}
            docIndex={docIndex}
            imageIndex={imageIndex}
            onOpenDoc={openFile}
            onOpenCategory={openCategory}
            onOpenDataEntry={openDataEntry}
            onOpenTemplate={openTemplate}
            onCreatePage={createCategoryPage}
            onCreateLinkedDoc={handleCreateLinkedDoc}
            onAmbiguousLink={handleAmbiguousLink}
            onAnchorLink={handleAnchorLink}
          />
        </div>
        {linkMenuEl}
      </div>
    )
  }

  if (viewingData) {
    return (
      <div className="viewer-pane">
        <div className="viewer-scroll">
          <DataEntryView
            type={viewingData.type}
            name={viewingData.name}
            entry={dataEntry}
            templateIndex={templateIndex}
            docIndex={docIndex}
            imageIndex={imageIndex}
            onOpenDoc={openFile}
            onOpenCategory={openCategory}
            onOpenDataEntry={openDataEntry}
            onOpenTemplate={openTemplate}
            onCreateEntry={createDataEntry}
            onCreateLinkedDoc={handleCreateLinkedDoc}
            onAmbiguousLink={handleAmbiguousLink}
            onAnchorLink={handleAnchorLink}
          />
        </div>
        {linkMenuEl}
      </div>
    )
  }

  if (viewingTemplate) {
    return (
      <div className="viewer-pane">
        <div className="viewer-scroll">
          <TemplateView
            name={viewingTemplate}
            entry={templateEntry}
            templateIndex={templateIndex}
            dataIndex={dataIndex}
            docIndex={docIndex}
            imageIndex={imageIndex}
            onOpenDoc={openFile}
            onOpenCategory={openCategory}
            onOpenDataEntry={openDataEntry}
            onOpenTemplate={openTemplate}
            onCreateTemplate={createTemplate}
            onCreateLinkedDoc={handleCreateLinkedDoc}
            onAmbiguousLink={handleAmbiguousLink}
            onAnchorLink={handleAnchorLink}
          />
        </div>
        {linkMenuEl}
      </div>
    )
  }

  if (!text?.trim()) {
    return <div className="viewer-pane viewer-pane-empty">{emptyHint}</div>
  }

  return (
    <div className="viewer-pane">
      <div className="viewer-scroll" onClick={handleContentClick} onDoubleClick={handleContentDoubleClick}>
        <div className="wiki-rendered" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
      <FloatingToc toc={toc} />
      {linkMenuEl}
    </div>
  )
}
