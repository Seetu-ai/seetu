#!/usr/bin/env npx tsx
/**
 * Setup script for Print-on-Demand feature
 * Creates the print-designs storage bucket if it doesn't exist
 *
 * Usage: npx tsx scripts/setup-print-storage.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

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
  console.log('🚀 Setting up Print-on-Demand storage...\n');

  // Check if bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error('Failed to list buckets:', listError.message);
    process.exit(1);
  }

  const bucketExists = buckets?.some(b => b.name === 'print-designs');

  if (bucketExists) {
    console.log('✅ print-designs bucket already exists');
  } else {
    // Create the bucket
    const { error: createError } = await supabase.storage.createBucket('print-designs', {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    });

    if (createError) {
      console.error('Failed to create bucket:', createError.message);
      process.exit(1);
    }

    console.log('✅ Created print-designs bucket');
  }

  // Also check/create other print-related buckets
  const otherBuckets = ['print-uploads', 'print-mockups'];

  for (const bucketName of otherBuckets) {
    const exists = buckets?.some(b => b.name === bucketName);
    if (!exists) {
      const { error } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 50 * 1024 * 1024, // 50MB for uploads
      });
      if (error) {
        console.log(`⚠️  Could not create ${bucketName}: ${error.message}`);
      } else {
        console.log(`✅ Created ${bucketName} bucket`);
      }
    } else {
      console.log(`✅ ${bucketName} bucket already exists`);
    }
  }

  console.log('\n✨ Storage setup complete!');
}

main().catch(console.error);
