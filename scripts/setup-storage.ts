/**
 * Setup Supabase Storage Buckets
 * Run with: npx tsx scripts/setup-storage.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BUCKETS = [
  { name: 'uploads', public: true },      // User uploaded images
  { name: 'generated', public: true },    // AI generated images
  { name: 'clean-refs', public: true },   // Processed product references
  { name: 'brands', public: true },       // Brand logos, assets
];

async function setupBuckets() {
  console.log('Setting up Supabase Storage buckets...\n');

  for (const bucket of BUCKETS) {
    console.log(`Creating bucket: ${bucket.name}`);

    const { data, error } = await supabase.storage.createBucket(bucket.name, {
      public: bucket.public,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    });

    if (error) {
      if (error.message.includes('already exists')) {
        console.log(`  ✓ Bucket "${bucket.name}" already exists`);
      } else {
        console.error(`  ✗ Failed to create "${bucket.name}":`, error.message);
      }
    } else {
      console.log(`  ✓ Created bucket "${bucket.name}"`);
    }
  }

  console.log('\nDone! Your Supabase Storage buckets are ready.');
  console.log('\nMake sure to set up Row Level Security (RLS) policies if needed.');
}

setupBuckets().catch(console.error);
