#!/usr/bin/env npx tsx
/**
 * Run SQL migrations using Supabase service role
 *
 * Usage: npx tsx scripts/run-migration.ts <migration-file>
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function main() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error('Usage: npx tsx scripts/run-migration.ts <migration-file>');
    process.exit(1);
  }

  const filePath = path.resolve(migrationFile);

  if (!fs.existsSync(filePath)) {
    console.error(`Migration file not found: ${filePath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf-8');
  console.log(`🚀 Running migration: ${path.basename(filePath)}\n`);

  // Split by statements (simple approach - may need refinement for complex SQL)
  // For this migration, we'll run the whole thing via RPC
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    // If exec_sql doesn't exist, try direct fetch
    console.log('Note: exec_sql RPC not available, using REST API...');

    // Use the Supabase REST API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      console.log('\n⚠️  Cannot run SQL via API. Please run manually in Supabase SQL Editor:');
      console.log(`\nFile: ${filePath}`);
      console.log('\nGo to: https://supabase.com/dashboard/project/epjhlzqdyxjhyfxggerp/sql\n');
      console.log('Copy and paste the SQL from the migration file.');
      return;
    }
  }

  console.log('✅ Migration completed successfully!');
}

main().catch(console.error);
