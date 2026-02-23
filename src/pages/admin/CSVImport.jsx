import { useState, useCallback } from 'react'
import Papa from 'papaparse'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { CSV_COLUMNS } from '../../lib/constants'
import { Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react'

function normalizeHeader(h) {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').trim('_')
}

function mapRow(row, headerMap) {
  const mapped = {}
  for (const [field, aliases] of Object.entries(CSV_COLUMNS)) {
    const match = aliases.find(a => headerMap[a])
    if (match && headerMap[match]) {
      const val = row[headerMap[match]]?.trim()
      if (field === 'training_required' || field === 'approval_required') {
        mapped[field] = ['true', '1', 'yes', 'y'].includes((val || '').toLowerCase())
      } else {
        mapped[field] = val || null
      }
    }
  }
  mapped.is_active = true
  return mapped
}

export default function CSVImport() {
  const toast = useToast()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState([])
  const [headers, setHeaders] = useState([])
  const [headerMap, setHeaderMap] = useState({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [dragging, setDragging] = useState(false)

  function processFile(f) {
    setFile(f)
    setResult(null)
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        const normalized = {}
        meta.fields.forEach(h => { normalized[normalizeHeader(h)] = h })
        setHeaders(meta.fields)
        setHeaderMap(normalized)
        setPreview(data.slice(0, 5))
      }
    })
  }

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.name.endsWith('.csv')) processFile(f)
    else toast('Please upload a CSV file', 'error')
  }, [])

  async function handleImport() {
    setLoading(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async ({ data }) => {
        const rows = data.map(r => mapRow(r, headerMap)).filter(r => r.name || r.asset_tag)
        let inserted = 0, updated = 0, errors = 0

        const CHUNK = 100
        for (let i = 0; i < rows.length; i += CHUNK) {
          const chunk = rows.slice(i, i + CHUNK)
          const { data: res, error } = await supabase.from('equipment')
            .upsert(chunk, { onConflict: 'asset_tag', ignoreDuplicates: false })
          if (error) { errors += chunk.length; console.error(error) }
          else { inserted += chunk.length }
        }

        setResult({ total: rows.length, inserted, errors })
        setLoading(false)
        toast(`Import complete: ${rows.length} rows processed`, 'success')
      }
    })
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">CSV Import</h1>
        <p className="page-subtitle">Upload equipment data. Existing records will be updated based on asset tag.</p>
      </div>

      <div className="grid-2" style={{ gap: 24 }}>
        <div>
          {/* Drop zone */}
          <div onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
            style={{ border: '2px dashed ' + (dragging ? 'var(--accent)' : 'var(--border)'), borderRadius: 12, padding: 40, textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: dragging ? 'var(--accent-glow)' : 'var(--bg-elevated)', marginBottom: 16 }}
            onClick={() => document.getElementById('csv-input').click()}>
            <Upload size={32} color={dragging ? 'var(--accent)' : 'var(--text-dim)'} style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Drop CSV file here</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>or click to browse</div>
            <input id="csv-input" type="file" accept=".csv" style={{ display: 'none' }} onChange={e => e.target.files[0] && processFile(e.target.files[0])} />
          </div>

          {file && (
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
              <FileText size={16} color="var(--accent)" />
              <span style={{ fontSize: 13, flex: 1 }}>{file.name}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{preview.length > 0 ? 'Ready' : 'Parsing...'}</span>
            </div>
          )}

          {/* Column mapping info */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Expected CSV Columns</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(CSV_COLUMNS).map(([field, aliases]) => (
                <div key={field} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                  <span style={{ fontFamily: 'Space Mono', fontSize: 11, background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 4, color: 'var(--accent)', minWidth: 140 }}>{field}</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>or: {aliases.slice(1, 3).join(', ')}</span>
                </div>
              ))}
            </div>
          </div>

          {preview.length > 0 && (
            <button className="btn btn-primary w-full btn-lg" onClick={handleImport} disabled={loading} style={{ justifyContent: 'center' }}>
              {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Importing...</> : 'Import Equipment'}
            </button>
          )}
        </div>

        <div>
          {/* Result */}
          {result && (
            <div className="card" style={{ marginBottom: 16, borderColor: result.errors > 0 ? 'rgba(255,181,71,0.4)' : 'rgba(0,214,143,0.4)' }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Import Results</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total rows</span>
                  <span style={{ fontFamily: 'Space Mono', fontWeight: 600 }}>{result.total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Imported/Updated</span>
                  <span style={{ fontFamily: 'Space Mono', color: 'var(--success)', fontWeight: 600 }}>{result.inserted}</span>
                </div>
                {result.errors > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Errors</span>
                    <span style={{ fontFamily: 'Space Mono', color: 'var(--danger)', fontWeight: 600 }}>{result.errors}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Preview table */}
          {preview.length > 0 && (
            <div className="card">
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Preview (first 5 rows)</div>
              <div className="table-wrap">
                <table>
                  <thead><tr>{headers.slice(0, 5).map(h => <th key={h}>{h}</th>)}{headers.length > 5 && <th>+{headers.length - 5} more</th>}</tr></thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i}>
                        {headers.slice(0, 5).map(h => <td key={h} style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row[h] || '—'}</td>)}
                        {headers.length > 5 && <td style={{ color: 'var(--text-dim)' }}>...</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
