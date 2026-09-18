// Reads a File's bytes as base64 (just the payload after the data URL's
// comma) — used wherever a dropped/picked file's raw content needs to cross
// the IPC boundary to the main process (see electron/main.js's
// images:importData). Shared by FileTree.jsx and ImageSidebar.jsx, which
// both accept image drops.
export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// Matches electron/fileSystem.js's IMAGE_EXTENSIONS.
export const IMPORTABLE_IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp)$/i
