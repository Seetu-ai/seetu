const fs = require('fs');
const path = require('path');

const copyRecursiveSync = (src, dest) => {
  if (!fs.existsSync(src)) {
    console.log(`Source does not exist: ${src}`);
    return;
  }

  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
};

console.log('Post-build: Copying files for standalone deployment...');

const standaloneDir = '.next/standalone';

// 1. Copy public folder
console.log('Copying public/ to standalone...');
copyRecursiveSync('public', path.join(standaloneDir, 'public'));

// 2. Copy static files
console.log('Copying .next/static/ to standalone...');
copyRecursiveSync('.next/static', path.join(standaloneDir, '.next/static'));

// 3. Copy cache (needed for Next.js 15 RSC manifests)
console.log('Copying .next/cache/ to standalone...');
copyRecursiveSync('.next/cache', path.join(standaloneDir, '.next/cache'));

console.log('Post-build complete!');
