import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls'].includes(ext ?? '')) {
      return NextResponse.json({ error: 'Only .xlsx / .xls files are supported' }, { status: 400 })
    }

    // Record the import
    const { data: importRecord, error: importErr } = await supabaseAdmin
      .from('file_imports')
      .insert({ filename: file.name, status: 'processing' })
      .select()
      .single()

    if (importErr) {
      return NextResponse.json({ error: importErr.message }, { status: 500 })
    }

    // Parse Excel
    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null })

    const totalRows = rows.length
    let importedRows = 0
    let skippedRows = 0
    const errors: string[] = []

    // Process in batches of 100
    const BATCH_SIZE = 100
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)

      const agents = batch.map((row) => ({
        code:        String(row['CODE'] ?? row['code'] ?? '').trim(),
        name:        String(row['NAME'] ?? row['name'] ?? '').trim(),
        email:       row['EMAIL'] ? String(row['EMAIL']).trim().toLowerCase() : null,
        address1:    row['ADDRESS1'] ? String(row['ADDRESS1']).trim() : null,
        address2:    row['ADDRESS2'] ? String(row['ADDRESS2']).trim() : null,
        address3:    row['ADDRESS3'] ? String(row['ADDRESS3']).trim() : null,
        city:        row['City']    ? String(row['City']).trim()    : null,
        country:     row['Country'] ? String(row['Country']).trim() : null,
        postal_code: row['PCODE']   ? String(row['PCODE']).trim()   : null,
        int_access:  row['INT_ACCESS'] ? String(row['INT_ACCESS']).trim() : null,
      })).filter((a) => a.code && a.name)

      if (agents.length === 0) {
        skippedRows += batch.length
        continue
      }

      const { error: upsertErr } = await supabaseAdmin
        .from('agents')
        .upsert(agents, { onConflict: 'code', ignoreDuplicates: false })

      if (upsertErr) {
        errors.push(`Batch ${i}-${i + BATCH_SIZE}: ${upsertErr.message}`)
        skippedRows += batch.length
      } else {
        importedRows += agents.length
        skippedRows  += batch.length - agents.length
      }
    }

    // Update import record
    await supabaseAdmin
      .from('file_imports')
      .update({
        total_rows:    totalRows,
        imported_rows: importedRows,
        skipped_rows:  skippedRows,
        status:        errors.length === 0 ? 'completed' : 'failed',
        error_message: errors.length > 0 ? errors.join('; ') : null,
      })
      .eq('id', importRecord.id)

    return NextResponse.json({
      success: true,
      importId: importRecord.id,
      totalRows,
      importedRows,
      skippedRows,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
