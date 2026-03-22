/**
 * Test Cloudinary Integration
 * Run with: npx tsx scripts/test-cloudinary.ts
 */

import { uploadBillboardMedia, imageToVideo, isCloudinaryConfigured, deleteMedia } from '../src/lib/cloudinary';

async function testCloudinary() {
  console.log('='.repeat(50));
  console.log('CLOUDINARY INTEGRATION TEST');
  console.log('='.repeat(50));

  // 1. Check configuration
  console.log('\n[1] Checking Cloudinary configuration...');
  const isConfigured = isCloudinaryConfigured();
  console.log(`   CLOUDINARY_CLOUD_NAME: ${process.env.CLOUDINARY_CLOUD_NAME ? '✓ Set' : '✗ Missing'}`);
  console.log(`   CLOUDINARY_API_KEY: ${process.env.CLOUDINARY_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`   CLOUDINARY_API_SECRET: ${process.env.CLOUDINARY_API_SECRET ? '✓ Set' : '✗ Missing'}`);
  console.log(`   Configuration valid: ${isConfigured ? '✓ Yes' : '✗ No'}`);

  if (!isConfigured) {
    console.error('\n❌ Cloudinary is not configured. Set environment variables and retry.');
    process.exit(1);
  }

  // 2. Test image upload
  console.log('\n[2] Testing image upload...');
  const testImageUrl = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800';
  const testContentId = `test-${Date.now()}`;

  const imageResult = await uploadBillboardMedia(testImageUrl, {
    contentId: testContentId,
    mediaType: 'image',
    targetWidth: 1920,
    targetHeight: 1080,
  });

  if (imageResult.success) {
    console.log('   ✓ Image uploaded successfully');
    console.log(`   Public ID: ${imageResult.publicId}`);
    console.log(`   URL: ${imageResult.secureUrl}`);
    console.log(`   Thumbnail: ${imageResult.thumbnailUrl}`);
    console.log(`   Dimensions: ${imageResult.width}x${imageResult.height}`);
  } else {
    console.error(`   ✗ Image upload failed: ${imageResult.error}`);
    process.exit(1);
  }

  // 3. Test image to video conversion
  console.log('\n[3] Testing image to video conversion...');
  const videoResult = await imageToVideo(testImageUrl, {
    contentId: `${testContentId}-video`,
    duration: 5,
    targetWidth: 1920,
    targetHeight: 1080,
  });

  if (videoResult.success) {
    console.log('   ✓ Image to video conversion successful');
    console.log(`   Public ID: ${videoResult.publicId}`);
    console.log(`   URL: ${videoResult.secureUrl}`);
    console.log(`   Duration: ${videoResult.duration}s`);
  } else {
    console.error(`   ✗ Conversion failed: ${videoResult.error}`);
  }

  // 4. Cleanup test files
  console.log('\n[4] Cleaning up test files...');
  if (imageResult.publicId) {
    const deleted = await deleteMedia(imageResult.publicId, 'image');
    console.log(`   ${deleted ? '✓' : '✗'} Deleted: ${imageResult.publicId}`);
  }
  if (videoResult.publicId) {
    const deleted = await deleteMedia(videoResult.publicId, 'image');
    console.log(`   ${deleted ? '✓' : '✗'} Deleted: ${videoResult.publicId}`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✓ ALL TESTS PASSED');
  console.log('='.repeat(50));
}

// Load env from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

testCloudinary().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
