import { useState, useCallback } from 'react'
import Papa from 'papaparse'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { Upload, FileText } from 'lucide-react'

function mapRow(row) {
  const assetTag = row['Instrument ID']?.trim() || null
  const name = [row['Manufacturer'], row['Model']].filter(Boolean).join(' ').trim() || null
  const location = row['Room']?.trim() || null
  const floor = row['Floor']?.trim() || ''
  const building = row['Building']?.trim() || ''
  const floorBuilding = [floor ? 'Floor ' + floor : '', building].filter(Boolean).join(' — ') || null
  const owner = row['Owner']?.trim() || null
  const category = row['Instrument type']?.trim() || row['Instrument class']?.trim() || null

  const notesParts = []
  if (row['Serial Number']?.trim()) notesParts.push('Serial: ' + row['Serial Number'].trim())
  if (row['System']?.trim()) notesParts.push('System: ' + row['System'].trim())
  if (row['Instrument Service Group']?.trim()) notesParts.push('Service Group: ' + row['Instrument Service Group'].trim())
  if (row['Site']?.trim()) notesParts.push('Site: ' + row['Site'].trim())
  if (row['Department']?.trim()) notesParts.push('Dept: ' + row['Department'].trim())
  if (row['Local name']?.trim()) notesParts.push('Local name: ' + row['Local name'].trim())
  const notes = notesParts.join(' | ') || null

  return { asset_tag: assetTag, name, location, floor_building: floorBuilding, category, owner, notes, training_required: false, approval_required: false, is_active: true }
}

export default function CSVImport() {
  const toast = useToast()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState([])
  const [headers, setHeaders] = useState([])
  const [parsedData, setParsedData] = useState([])
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
        setHeaders(meta.fields)
        setParsedData(data)
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
    const rows = parsedData.map(mapRow).filter(r => r.name || r.asset_tag)
    let inserted = 0, errors = 0

    const CHUNK = 100
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK)
      const { error } = await supabase.from('equipment')
        .upsert(chunk, { onConflict: 'asset_tag', ignoreDuplicates: false })
      if (error) { errors += chunk.length; console.error(error) }
      else { inserted += chunk.length }
    }

    setResult({ total: rows.length, inserted, errors })
    setLoading(false)
    toast('Import complete: ' + rows.length + ' rows processed', errors > 0 ? 'error' : 'success')
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">CSV Import</h1>
        <p className="page-subtitle">Upload your instrument CSV. Existing records update automatically based on Instrument ID.</p>
      </div>

      <div className="grid-2" style={{ gap: 24 }}>
        <div>
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
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{parsedData.length > 0 ? parsedData.length + ' rows ready' : 'Parsing...'}</span>
            </div>
          )}

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>How your columns are mapped</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                ['Instrument ID', 'Asset Tag'],
                ['Manufacturer + Model', 'Equipment Name'],
                ['Room', 'Location'],
                ['Floor + Building', 'Floor / Building'],
                ['Instrument type', 'Category'],
                ['Owner', 'Owner'],
                ['Serial, System, Dept...', 'Notes'],
              ].map(([csv, db]) => (
                <div key={csv} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                  <span style={{ fontFamily: 'Space Mono', fontSize: 11, background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 4, color: 'var(--accent)', minWidth: 160 }}>{csv}</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>→ {db}</span>
                </div>
              ))}
            </div>
          </div>

          {preview.length > 0 && (
            <button className="btn btn-primary w-full btn-lg" onClick={handleImport} disabled={loading} style={{ justifyContent: 'center' }}>
              {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Importing {parsedData.length} rows...</> : 'Import ' + parsedData.length + ' Instruments'}
            </button>
          )}
        </div>

        <div>
          {result && (
            <div className="card" style={{ marginBottom: 16, borderColor: result.errors > 0 ? 'rgba(255,181,71,0.4)' : 'rgba(0,214,143,0.4)' }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Import Results</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total rows</span>
                  <span style={{ fontFamily: 'Space Mono', fontWeight: 600 }}>{result.total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Imported / Updated</span>
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
