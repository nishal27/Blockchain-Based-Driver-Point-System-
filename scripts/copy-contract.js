const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, '../build/contracts/DriverPointSystem.json');
const destPath = path.join(__dirname, '../frontend/public/build/contracts/DriverPointSystem.json');
const destDir = path.join(__dirname, '../frontend/public/build/contracts');

if (!fs.existsSync(sourcePath)) {
  console.log('Contract not compiled yet. Run: npm run compile');
  process.exit(0);
}

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.copyFileSync(sourcePath, destPath);
console.log('Contract ABI copied to frontend');

