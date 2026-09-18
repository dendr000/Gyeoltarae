import { useState } from 'react'
import { ContextMenu } from './ContextMenu.jsx'
import { getApi } from '../lib/api.js'
import { splitLeadingNumber } from '../lib/displayName.js'
import { readFileAsBase64, IMPORTABLE_IMAGE_EXT } from '../lib/fileEncoding.js'

// Which folders the user collapsed, by path — everything defaults to
// expanded, so this only needs to remember the exceptions. Plain per-device
// UI state (not document data), so localStorage is enough; a folder no one
// touched stays expanded across restarts same as before, but one the user
// explicitly collapsed stays collapsed instead of silently re-expanding.
const COLLAPSED_STORAGE_KEY = 'wikidesk-collapsed-folders'

function loadCollapsedPaths() {
  try {
    return new Set(JSON.parse(localStorage.getItem(COLLAPSED_STORAGE_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

function setFolderCollapsed(path, collapsed) {
  try {
    const paths = loadCollapsedPaths()
    if (collapsed) paths.add(path)
    else paths.delete(path)
    localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify([...paths]))
  } catch {
    /* localStorage unavailable — collapse state just won't persist */
  }
}

function TreeNode({ node, depth, onOpenFile, onCreateDoc, onCreateFolder, onDelete, onRename, onContextMenu, openPath }) {
  const [expanded, setExpanded] = useState(() => !loadCollapsedPaths().has(node.path))
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(node.name)

  // Windows-only Electron bug: an autofocused input can look focused while
  // the OS never actually routes keyboard input to the window. Fixing it
  // needs a window-level blur()+focus() (see refocusMainWindow in
  // electron/main.js) — but that blur() also blurs whatever's currently
  // DOM-focused, so it MUST finish before the rename <input> (which cancels
  // itself onBlur, below) ever mounts and grabs focus. Awaiting it here,
  // before setRenaming(true), keeps the two from racing.
  async function beginRename() {
    await getApi().refocusWindow?.()
    setRenaming(true)
  }

  function handleKeyDown(e) {
    if (e.key === 'F2') {
      e.preventDefault()
      beginRename()
    }
  }

  if (node.type === 'dir') {
    return (
      <div className="tree-node">
        {renaming ? (
          <div className="tree-row tree-row-dir" style={{ paddingLeft: depth * 14 + 8 }}>
            <input
              className="tree-rename-input"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                setRenaming(false)
                if (draft.trim() && draft !== node.name) onRename(node.path, draft.trim(), node.type)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'Escape') {
                  setDraft(node.name)
                  setRenaming(false)
                }
              }}
            />
          </div>
        ) : (
          <div
            className="tree-row tree-row-dir"
            style={{ paddingLeft: depth * 14 + 8 }}
            title="더블클릭 또는 F2로 이름 변경, 우클릭으로 메뉴"
            tabIndex={0}
            onClick={() => {
              getApi().refocusWindow?.()
              setExpanded((v) => {
                const next = !v
                setFolderCollapsed(node.path, !next)
                return next
              })
            }}
            onDoubleClick={(e) => {
              e.stopPropagation()
              beginRename()
            }}
            onKeyDown={handleKeyDown}
            onContextMenu={(e) => onContextMenu(e, node, beginRename)}
          >
            <span className={`tree-caret ${expanded ? 'open' : ''}`}>▶</span>
            <span className="tree-label">{node.name}</span>
            <span className="tree-actions">
              <button
                title="새 문서"
                onClick={(e) => {
                  e.stopPropagation()
                  onCreateDoc(node.path)
                }}
              >
                +문서
              </button>
              <button
                title="새 폴더"
                onClick={(e) => {
                  e.stopPropagation()
                  onCreateFolder(node.path)
                }}
              >
                +폴더
              </button>
            </span>
          </div>
        )}
        {expanded && (
          <div>
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                onOpenFile={onOpenFile}
                onCreateDoc={onCreateDoc}
                onCreateFolder={onCreateFolder}
                onDelete={onDelete}
                onRename={onRename}
                onContextMenu={onContextMenu}
                openPath={openPath}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const isActive = node.path === openPath

  if (renaming) {
    return (
      <div
        className="tree-row tree-row-file"
        style={{ paddingLeft: depth * 14 + 8 }}
      >
        <input
          className="tree-rename-input"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setRenaming(false)
            if (draft.trim() && draft !== node.name) onRename(node.path, draft.trim(), node.type)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              setDraft(node.name)
              setRenaming(false)
            }
          }}
        />
      </div>
    )
  }

  return (
    <div
      className={`tree-row tree-row-file ${isActive ? 'active' : ''}`}
      style={{ paddingLeft: depth * 14 + 8 }}
      title="더블클릭 또는 F2로 이름 변경, 우클릭으로 메뉴"
      tabIndex={0}
      onClick={() => {
        getApi().refocusWindow?.()
        onOpenFile(node.path, node.name)
      }}
      onDoubleClick={() => beginRename()}
      onKeyDown={handleKeyDown}
      onContextMenu={(e) => onContextMenu(e, node, beginRename)}
    >
      <span className="tree-file-icon">📄</span>
      {(() => {
        const split = splitLeadingNumber(node.name)
        return split ? (
          <>
            <span className="tree-number-badge">{split.number}</span>
            <span className="tree-label">{split.rest}</span>
          </>
        ) : (
          <span className="tree-label">{node.name}</span>
        )
      })()}
      <button
        className="tree-delete-btn"
        title="삭제 (휴지통으로 이동)"
        onClick={(e) => {
          e.stopPropagation()
          onDelete(node.path, node.type)
        }}
      >
        ×
      </button>
    </div>
  )
}

const IMPORTABLE_EXT = /\.(md|markdown|txt)$/i

export function FileTree({
  tree,
  workspacePath,
  openPath,
  onOpenFile,
  onCreateDoc,
  onCreateFolder,
  onDelete,
  onRename,
  onImportFiles,
  onImportImages,
}) {
  const [dragOver, setDragOver] = useState(false)
  const [menu, setMenu] = useState(null)

  if (!workspacePath) return null

  function openContextMenu(e, node, startRenaming) {
    e.preventDefault()
    const items =
      node.type === 'dir'
        ? [
            { label: '새 문서', onClick: () => onCreateDoc(node.path) },
            { label: '새 폴더', onClick: () => onCreateFolder(node.path) },
            { label: '이름 바꾸기 (F2)', onClick: startRenaming },
            { label: '삭제', danger: true, onClick: () => onDelete(node.path, node.type) },
          ]
        : [
            { label: '이름 바꾸기 (F2)', onClick: startRenaming },
            { label: '삭제', danger: true, onClick: () => onDelete(node.path, node.type) },
          ]
    setMenu({ x: e.clientX, y: e.clientY, items })
  }

  // Images always go to the dedicated .wikidesk-images space regardless of
  // which folder they land on in the tree — same reasoning as 자료/틀/분류
  // never being created in-place: dropping a batch of screenshots onto
  // whatever folder happens to be showing shouldn't scatter them across the
  // workspace tree. Docs (.md/.txt) still import at the drop target as before.
  async function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const allFiles = [...e.dataTransfer.files]
    const docFiles = allFiles.filter((f) => IMPORTABLE_EXT.test(f.name))
    const imageFiles = allFiles.filter((f) => IMPORTABLE_IMAGE_EXT.test(f.name))
    const skipped = allFiles.length - docFiles.length - imageFiles.length

    if (docFiles.length === 0 && imageFiles.length === 0) {
      window.alert('.md / .txt 텍스트 파일이나 이미지 파일만 불러올 수 있습니다. (.hwp, .docx 등은 지원하지 않습니다)')
      return
    }
    if (imageFiles.length > 0) {
      const encoded = await Promise.all(
        imageFiles.map(async (file) => ({ name: file.name, base64: await readFileAsBase64(file) })),
      )
      await onImportImages(encoded)
    }
    if (docFiles.length > 0) {
      const imported = await Promise.all(
        docFiles.map(async (file) => ({
          name: file.name.replace(IMPORTABLE_EXT, ''),
          content: await file.text(),
        })),
      )
      onImportFiles(workspacePath, imported)
    }
    if (skipped > 0) {
      window.alert(`지원하지 않는 형식이라 ${skipped}개는 건너뛰었습니다.`)
    }
  }

  return (
    <div
      className={`file-tree ${dragOver ? 'file-tree-drag-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="file-tree-root-actions">
        <button onClick={() => onCreateDoc(workspacePath)}>+ 새 문서</button>
        <button onClick={() => onCreateFolder(workspacePath)}>+ 새 폴더</button>
      </div>
      {dragOver && (
        <div className="file-tree-drop-hint">
          여기에 놓으면 .md/.txt는 새 문서로, 이미지는 "이미지" 공간으로 불러옵니다
        </div>
      )}
      {tree.length === 0 && (
        <div className="file-tree-empty">문서가 없습니다. (텍스트 파일이나 이미지를 끌어다 놓아도 됩니다)</div>
      )}
      {tree.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          depth={0}
          onOpenFile={onOpenFile}
          onCreateDoc={onCreateDoc}
          onCreateFolder={onCreateFolder}
          onDelete={onDelete}
          onRename={onRename}
          onContextMenu={openContextMenu}
          openPath={openPath}
        />
      ))}
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}
    </div>
  )
}
