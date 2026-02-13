const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

function loadEnvFromFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return
  }
  const content = fs.readFileSync(filePath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const raw = line.slice(idx + 1).trim()
    if (!key || process.env[key] !== undefined) continue
    const val = raw.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
    process.env[key] = val
  }
}

async function main() {
  const envPath = path.join(process.cwd(), '.env.local')
  loadEnvFromFile(envPath)

  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
  if (!dbUrl) {
    console.error('Missing SUPABASE_DB_URL (or DATABASE_URL) in .env.local')
    process.exit(1)
  }

  const client = new Client({ connectionString: dbUrl })
  await client.connect()

  const sql = `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='orders' AND column_name='amount_gross'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN amount_gross numeric(10,2);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.orders_amount_sync()
RETURNS trigger AS $$
BEGIN
  IF NEW.amount_gross IS NULL THEN
    NEW.amount_gross := NEW.amount;
  END IF;
  IF NEW.amount IS NULL THEN
    NEW.amount := NEW.amount_gross;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_amount_sync ON public.orders;
CREATE TRIGGER orders_amount_sync
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_amount_sync();
`

  try {
    await client.query('BEGIN')
    await client.query(sql)
    await client.query('COMMIT')
    console.log('OK: orders amount_gross compatibility patch applied')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('FAILED:', err)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('FAILED:', err)
  process.exit(1)
})
