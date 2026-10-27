// 이미지 전용 공간 — 분류/자료/틀 사이드바와 같은 자리에 나란히 표시됨.
// 다른 세 공간과 달리 이름만 미리 적어두는 개념이 없음(실제 파일이 있어야
// 뭔가 존재하므로): "+"를 누르면 바로 네이티브 파일 선택 창이 뜨고, 고른
// 파일이 즉시 .wikidesk-images로 복사되어 등록됨(electron/main.js의
// images:import 참고). 항목을 클릭하면 문서에 붙여넣을 수 있게 [[파일:이름]]
// 문법을 클립보드로 복사해 줌 — 자료/틀처럼 "열어서 편집"할 텍스트 내용이
// 없기 때문. 더블클릭하면 FileTree.jsx와 같은 방식으로 이름을 바꿀 수 있음.
// 우클릭하면 메뉴(문서에 넣기·문법 복사·이름 바꾸기·삭제)가 뜬다. "문서에 넣기"는 클립보드를 쓰지 않고 편집창 커서 자리에 바로 넣는다.
// 이름을 바꾸면 문서에 이미 쓰인 [[파일:옛이름]] 도 같이 바뀐다(store renameImage, lib/imageRefs.js).
// 파일 탐색기에서 이미지를 이 영역에 직접 끌어다 놓아도 등록됨 — FileTree의
// 드롭 영역과는 별개로, 여기 자체가 "이미지"의 자연스러운 드롭 대상이기
// 때문에(사용자가 실제로 여기다 먼저 끌어다 놔봄) 이 컴포넌트도 직접
// onDrop을 받는다.
import { useState } from 'react'
import { getApi } from '../lib/api.js'
import { readFileAsBase64, IMPORTABLE_IMAGE_EXT } from '../lib/fileEncoding.js'
import { SidebarSection } from './SidebarSection.jsx'
import { ContextMenu } from './ContextMenu.jsx'
import { useAppStore } from '../store/useAppStore.js'

export function ImageSidebar({ imageIndex, onImport, onImportImages, onDeleteImage, onRenameImage }) {
  const names = Object.keys(imageIndex).sort((a, b) => a.localeCompare(b, 'ko'))
  const [copiedName, setCopiedName] = useState(null)
  const [renamingName, setRenamingName] = useState(null)
  const [draft, setDraft] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [menu, setMenu] = useState(null)
  const [renameNotice, setRenameNotice] = useState('')
  // 편집창이 보이는 모드(듀얼·편집)에서 문서가 열려 있을 때만 "문서에 넣기"가 가능하다.
  const editorAvailable = useAppStore((s) => Boolean(s.openPath) && s.mode !== 'preview')
  const requestEditorInsert = useAppStore((s) => s.requestEditorInsert)

  async function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const allFiles = [...e.dataTransfer.files]
    const imageFiles = allFiles.filter((f) => IMPORTABLE_IMAGE_EXT.test(f.name))
    if (imageFiles.length === 0) {
      window.alert('이미지 파일만 여기에 등록할 수 있습니다. (.png/.jpg/.gif/.webp/.svg/.bmp)')
      return
    }
    const encoded = await Promise.all(
      imageFiles.map(async (file) => ({ name: file.name, base64: await readFileAsBase64(file) })),
    )
    await onImportImages(encoded)
    const skipped = allFiles.length - imageFiles.length
    if (skipped > 0) {
      window.alert(`이미지가 아니라서 ${skipped}개는 건너뛰었습니다.`)
    }
  }

  const handleCopy = async (name) => {
    try {
      await navigator.clipboard.writeText(`[[파일:${name}]]`)
      setCopiedName(name)
      setTimeout(() => setCopiedName((cur) => (cur === name ? null : cur)), 1200)
    } catch {
      /* clipboard unavailable — nothing to fall back to, just skip the feedback */
    }
  }

  // Same Windows focus-desync workaround as FileTree.jsx's beginRename:
  // refocus the window BEFORE the autofocused rename <input> mounts.
  const beginRename = async (name) => {
    await getApi().refocusWindow?.()
    setDraft(name)
    setRenamingName(name)
  }

  const commitRename = async () => {
    const name = renamingName
    setRenamingName(null)
    const trimmed = draft.trim()
    if (!trimmed || trimmed === name) return
    try {
      const changed = await onRenameImage(name, trimmed)
      // 문서 속 참조도 같이 바뀐 개수를 잠깐 알려 준다.
      if (changed > 0) {
        setRenameNotice(`문서 ${changed}개의 이미지 링크도 함께 바꿨습니다`)
        setTimeout(() => setRenameNotice(''), 3500)
      }
    } catch (err) {
      window.alert(`이름을 바꾸지 못했습니다.\n\n${err.message}`)
    }
  }

  function openImageMenu(e, name) {
    e.preventDefault()
    e.stopPropagation()
    const items = []
    if (editorAvailable) items.push({ label: '문서에 넣기', onClick: () => requestEditorInsert(`[[파일:${name}]]`) })
    items.push(
      { label: '문법 복사 ([[파일:이름]])', onClick: () => handleCopy(name) },
      { label: '이름 바꾸기', onClick: () => beginRename(name) },
      { label: '삭제', danger: true, onClick: () => onDeleteImage(name) },
    )
    setMenu({ x: e.clientX, y: e.clientY, items })
  }

  return (
    <div
      className={`image-sidebar ${dragOver ? 'image-sidebar-drag-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <SidebarSection
        id="image"
        title="이미지"
        actions={
          <button type="button" className="image-sidebar-add-btn" title="이미지 가져오기" onClick={onImport}>
            +
          </button>
        }
      >
        {dragOver && <div className="image-sidebar-drop-hint">여기에 놓으면 이미지로 등록됩니다</div>}
        {names.length === 0 ? (
          <p className="category-empty-hint image-sidebar-empty">등록된 이미지가 없습니다. (끌어다 놓아도 됩니다)</p>
        ) : (
          <div className="image-sidebar-grid">
            {names.map((name) => {
              const entry = imageIndex[name]
              const isRenaming = renamingName === name
              return (
                <div
                  key={name}
                  className="image-sidebar-item"
                  title={isRenaming ? undefined : '클릭: [[파일:이름]] 문법 복사 · 더블클릭: 이름 바꾸기 · 우클릭: 메뉴'}
                  onClick={() => !isRenaming && handleCopy(name)}
                  onContextMenu={(e) => !isRenaming && openImageMenu(e, name)}
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    if (!isRenaming) beginRename(name)
                  }}
                >
                  <img className="image-sidebar-thumb" src={entry.dataUrl} alt={name} />
                  {isRenaming ? (
                    <input
                      className="image-sidebar-rename-input"
                      autoFocus
                      value={draft}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur()
                        if (e.key === 'Escape') {
                          setDraft(name)
                          setRenamingName(null)
                        }
                      }}
                    />
                  ) : (
                    <span className="image-sidebar-label">{copiedName === name ? '복사됨' : name}</span>
                  )}
                  <button
                    type="button"
                    className="image-sidebar-delete-btn"
                    title="이미지 삭제 (휴지통으로 이동)"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteImage(name)
                    }}
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        )}
        {renameNotice && (
          <div className="image-sidebar-notice" role="status">
            {renameNotice}
          </div>
        )}
      </SidebarSection>
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}
    </div>
  )
}
