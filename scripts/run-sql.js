#!/usr/bin/env node
/**
 * Run a SQL file against the Supabase Postgres database.
 * Uses DATABASE_URL from .env.local (Supabase → Project Settings → Database → Connection string URI).
 *
 * Usage: node scripts/run-sql.js [path/to/file.sql]
 *    or: npm run db:run -- scripts/022-appointments-backfill-doctor-id.sql
 */

const path = require('path')
const fs = require('fs')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const { Client } = require('pg')

function getProjectRef() {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!u) return null
  try {
    const h = new URL(u).hostname
    const m = h.match(/^([a-z]+)\.supabase\.co$/)
    return m ? m[1] : null
  } catch { return null }
}

async function main() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.error('Missing DATABASE_URL. Add it to .env.local from Supabase → Project Settings → Database → Connection string (URI).')
    process.exit(1)
  }

  const isDirect = /supabase\.co:5432/.test(dbUrl)
  if (isDirect) {
    console.error('DATABASE_URL uses direct connection (port 5432), which often times out from local.')
    const ref = getProjectRef()
    if (ref) {
      console.error(`Use the Connection pooler (port 6543) instead: Supabase → Project Settings → Database → Connection string → URI → "Connection pooler" (Transaction).`)
      console.error(`Format: postgresql://postgres.${ref}:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`)
    }
    console.error('')
  }

  const fileArg = process.argv[2]
  let sql
  if (fileArg) {
    const fp = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg)
    if (!fs.existsSync(fp)) {
      console.error('File not found:', fp)
      process.exit(1)
    }
    sql = fs.readFileSync(fp, 'utf8').trim()
  } else {
    console.error('Usage: node scripts/run-sql.js <path/to/file.sql>')
    process.exit(1)
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes('supabase') ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 15_000,
  })
  try {
    await client.connect()
    const res = await client.query(sql)
    await client.end()
    if (res.rows && res.rows.length > 0) {
      console.log(JSON.stringify(res.rows, null, 2))
    } else if (res.rowCount != null && res.rowCount > 0) {
      console.log(`Success. ${res.rowCount} row(s) affected.`)
    } else {
      console.log('Success. No rows returned.')
    }
  } catch (err) {
    const msg = err && (err.message || err.toString())
    console.error('Error:', msg || err)
    if (err && err.stack) console.error(err.stack)
    if (msg && /ETIMEDOUT|ECONNREFUSED|ENOTFOUND/.test(msg)) {
      console.error('\nTip: Use the Connection pooler URI (port 6543) from Supabase → Database → Connection string → URI.')
    }
    process.exit(1)
  }
}

main()
