'use client'

import { useState, useCallback } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface UploadResult {
  importedRows: number
  skippedRows: number
  totalRows: number
  errors?: string[]
}

export default function UploadPage() {
  const [dragging, setDragging]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult]       = useState<UploadResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) setSelectedFile(file)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setResult(null)

    const fd = new FormData()
    fd.append('file', selectedFile)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Upload failed')
      } else {
        setResult(data)
        toast.success(`Imported ${data.importedRows.toLocaleString()} agents`)
      }
    } catch {
      toast.error('Network error during upload')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Import Agents</h1>
        <p className="text-slate-500 text-sm mt-1">
          Upload an Excel file (.xlsx / .xls) to import or update agent records.
          Agents are matched by their CODE column.
        </p>
      </div>

      {/* Expected columns */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Expected Excel columns
        </p>
        <div className="grid grid-cols-3 gap-1">
          {['CODE*', 'NAME*', 'EMAIL', 'ADDRESS1', 'ADDRESS2', 'ADDRESS3', 'City', 'Country', 'PCODE', 'INT_ACCESS'].map((col) => (
            <span key={col} className="text-xs bg-white border border-blue-100 rounded px-2 py-1 font-mono text-blue-700">
              {col}
            </span>
          ))}
        </div>
        <p className="text-xs text-blue-600 mt-2">* Required. EMAIL column is optional — add it to enable sending.</p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
          dragging
            ? 'border-indigo-400 bg-indigo-50'
            : selectedFile
            ? 'border-green-400 bg-green-50'
            : 'border-slate-300 hover:border-indigo-300 hover:bg-slate-50'
        }`}
      >
        {selectedFile ? (
          <div className="space-y-2">
            <FileSpreadsheet className="w-10 h-10 text-green-500 mx-auto" />
            <p className="font-medium text-slate-800">{selectedFile.name}</p>
            <p className="text-sm text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-xs text-slate-400 hover:text-red-500 underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="w-10 h-10 text-slate-300 mx-auto" />
            <div>
              <p className="font-medium text-slate-600">Drag & drop your Excel file here</p>
              <p className="text-sm text-slate-400">or click to browse</p>
            </div>
            <label className="inline-block cursor-pointer px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors">
              Browse Files
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>
        )}
      </div>

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={!selectedFile || uploading}
        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {uploading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Upload & Import
          </>
        )}
      </button>

      {/* Result */}
      {result && (
        <div className={`rounded-xl border p-5 space-y-3 ${
          result.errors?.length ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'
        }`}>
          <div className="flex items-center gap-2">
            {result.errors?.length ? (
              <XCircle className="w-5 h-5 text-amber-500" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            <p className="font-semibold text-slate-800">
              {result.errors?.length ? 'Imported with warnings' : 'Import successful'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Rows', value: result.totalRows },
              { label: 'Imported', value: result.importedRows },
              { label: 'Skipped', value: result.skippedRows },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-slate-900">{value.toLocaleString()}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          {result.errors && result.errors.length > 0 && (
            <div className="text-xs text-amber-700 bg-amber-100 rounded-lg p-3 space-y-1">
              {result.errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}

          <Link
            href="/agents"
            className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View imported agents <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  )
}
