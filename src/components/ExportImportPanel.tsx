import { useRef, useState } from 'react'
import { exportWorkspace, importWorkspaceData, type WorkspaceExport } from '../domain/export'

function download(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function ExportImportPanel({ workspaceId }: { workspaceId: string }) {
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleExport() {
    setError(null)
    const payload = await exportWorkspace(workspaceId)
    download(
      `workspace-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
    )
  }

  async function handleImportFile(file: File) {
    setError(null)
    try {
      const text = await file.text()
      const payload = JSON.parse(text) as WorkspaceExport
      await importWorkspaceData(payload, workspaceId)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Import invalide')
    }
  }

  return (
    <div className="export-import-panel">
      <button type="button" onClick={() => void handleExport()}>
        Exporter (JSON)
      </button>
      <button type="button" onClick={() => fileInputRef.current?.click()}>
        Importer (JSON)
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void handleImportFile(file)
        }}
      />
      {error && <p className="auth-panel__error">{error}</p>}
    </div>
  )
}
