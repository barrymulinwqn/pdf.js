# Complete Workflow Example

This document shows a complete end-to-end workflow for building, encrypting, and distributing PDF.js.

## Scenario
You want to build PDF.js, encrypt the files, and publish to npm for authorized users only.

---

## Part 1: Publisher Workflow (Building & Publishing)

### Step 1: Prepare Your Environment

```bash
# Clone or navigate to PDF.js directory
cd c:\proj_src\fork_pdfjs\pdf.js

# Install dependencies (if not already done)
npm install
```

### Step 2: Set a Strong Encryption Key

**Windows PowerShell:**
```powershell
# Set encryption key for this session
$env:PDFJS_ENCRYPTION_KEY="MySecureKey2024!@#$%"

# Verify it's set
echo $env:PDFJS_ENCRYPTION_KEY
```

**Windows CMD:**
```cmd
# Set encryption key for this session
set PDFJS_ENCRYPTION_KEY=MySecureKey2024!@#$%

# Verify it's set
echo %PDFJS_ENCRYPTION_KEY%
```

**Linux/Mac:**
```bash
# Set encryption key for this session
export PDFJS_ENCRYPTION_KEY="MySecureKey2024!@#$%"

# Verify it's set
echo $PDFJS_ENCRYPTION_KEY
```

### Step 3: Build the Encrypted Distribution

```bash
# Build everything with encryption
npx gulp dist-encrypted
```

This command will:
1. ✅ Build version.json with build number
2. ✅ Build locale files
3. ✅ Build generic viewer
4. ✅ Encrypt generic build files
5. ✅ Build generic-legacy viewer
6. ✅ Encrypt generic-legacy build files
7. ✅ Build components, minified, types, etc.
8. ✅ Create complete npm package with decrypt.mjs
9. ✅ Output everything to `build/dist-encrypted/`

**Expected Output Structure:**
```
build/dist-encrypted/
├── package.json
├── decrypt.mjs          ← Decryption script for users
├── build/
│   ├── pdf.mjs.encrypted
│   ├── pdf.worker.mjs.encrypted
│   ├── pdf.sandbox.mjs.encrypted
│   ├── *.map.encrypted
│   └── *.min.mjs        (minified, unencrypted)
├── legacy/
│   └── build/
│       ├── *.mjs.encrypted
│       └── *.map.encrypted
├── web/
│   ├── *.js.encrypted
│   ├── *.css.encrypted
│   ├── *.html.encrypted
│   └── (images, fonts remain unencrypted)
├── cmaps/              (unencrypted)
├── iccs/               (unencrypted)
├── standard_fonts/     (unencrypted)
├── wasm/               (unencrypted)
└── types/              (TypeScript definitions)
```

### Step 4: Test the Package Locally (Optional but Recommended)

```bash
# Navigate to the dist directory
cd build/dist-encrypted

# Create a test tarball
npm pack

# This creates pdfjs-dist-X.X.X.tgz
```

### Step 5: Publish to npm

```bash
# Still in build/dist-encrypted/
npm publish

# Or if you want to publish with a tag
npm publish --tag encrypted

# Or for a dry-run first
npm publish --dry-run
```

### Step 6: Share the Encryption Key Securely

Send the encryption key to authorized users via:
- ✅ Secure messaging (Signal, encrypted email)
- ✅ Password manager shared vault
- ✅ Secure document sharing
- ❌ NOT via plain email
- ❌ NOT via public channels
- ❌ NOT committed to Git

**Example secure message:**
```
The PDF.js package has been published to npm.

Encryption Key: MySecureKey2024!@#$%

Please keep this key secure and do not share it publicly.
After installing the package, run:
  node decrypt.mjs MySecureKey2024!@#$%

Full instructions: [link to your docs]
```

---

## Part 2: User Workflow (Installing & Decrypting)

### Step 1: Install the Package

```bash
# Create a new project or navigate to existing one
mkdir my-pdf-viewer
cd my-pdf-viewer
npm init -y

# Install the encrypted PDF.js package
npm install pdfjs-dist
```

### Step 2: Decrypt the Files

```bash
# Navigate to the installed package
cd node_modules/pdfjs-dist

# Option 1: Pass key as argument
node decrypt.mjs MySecureKey2024!@#$%

# Option 2: Use environment variable (PowerShell)
$env:PDFJS_ENCRYPTION_KEY="MySecureKey2024!@#$%"
node decrypt.mjs

# Option 2: Use environment variable (CMD)
set PDFJS_ENCRYPTION_KEY=MySecureKey2024!@#$%
node decrypt.mjs

# Option 2: Use environment variable (Linux/Mac)
PDFJS_ENCRYPTION_KEY="MySecureKey2024!@#$%" node decrypt.mjs
```

**Expected Console Output:**
```
PDF.js Encrypted Files Decryption
==================================

Decrypting files...
Decrypted: build/pdf.mjs
Decrypted: build/pdf.worker.mjs
Decrypted: build/pdf.sandbox.mjs
Decrypted: build/pdf.mjs.map
Decrypted: build/pdf.worker.mjs.map
Decrypted: build/pdf.sandbox.mjs.map
Decrypted: web/viewer.js
Decrypted: web/viewer.css
Decrypted: web/viewer.html
... (and all other encrypted files)

Decryption complete!

Note: Encrypted files have been removed after successful decryption.
```

### Step 3: Use PDF.js in Your Application

```bash
# Return to your project root
cd ../..

# Create your app file
```

**Example `app.js`:**
```javascript
// Import PDF.js
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  'pdfjs-dist/build/pdf.worker.mjs';

// Load a PDF
async function loadPDF() {
  const loadingTask = pdfjsLib.getDocument('sample.pdf');
  const pdf = await loadingTask.promise;
  
  console.log(`PDF loaded! Pages: ${pdf.numPages}`);
  
  // Get first page
  const page = await pdf.getPage(1);
  console.log('Page loaded!');
  
  // Render page...
}

loadPDF().catch(console.error);
```

### Step 4: Run Your Application

```bash
# If using Node.js
node app.js

# If using a bundler (webpack, vite, etc.)
npm run dev
```

---

## Part 3: Automation & CI/CD

### For Publishers: Automated Builds

**GitHub Actions Example:**
```yaml
name: Build and Publish Encrypted PDF.js

on:
  push:
    tags:
      - 'v*'

jobs:
  build-publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build encrypted distribution
        env:
          PDFJS_ENCRYPTION_KEY: ${{ secrets.PDFJS_ENCRYPTION_KEY }}
        run: npx gulp dist-encrypted
      
      - name: Publish to npm
        working-directory: ./build/dist-encrypted
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npm publish
```

**Note:** Store `PDFJS_ENCRYPTION_KEY` in GitHub Secrets!

### For Users: Post-Install Script

Add to your `package.json`:

```json
{
  "scripts": {
    "postinstall": "node scripts/decrypt-pdfjs.js"
  }
}
```

**Create `scripts/decrypt-pdfjs.js`:**
```javascript
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

const pdfjsPath = 'node_modules/pdfjs-dist';
const decryptScript = path.join(pdfjsPath, 'decrypt.mjs');

// Check if package exists and has decrypt script
if (existsSync(decryptScript)) {
  const key = process.env.PDFJS_ENCRYPTION_KEY;
  
  if (!key) {
    console.error('❌ PDFJS_ENCRYPTION_KEY not set!');
    console.log('Set it with: export PDFJS_ENCRYPTION_KEY="your-key"');
    process.exit(1);
  }
  
  console.log('🔓 Decrypting PDF.js files...');
  execSync(`node ${decryptScript} ${key}`, { stdio: 'inherit' });
  console.log('✅ PDF.js decryption complete!');
}
```

---

## Troubleshooting

### Problem: Decryption Fails

**Symptoms:**
```
Error: error:1C800064:Provider routines::bad decrypt
```

**Solution:**
- ✅ Verify you're using the correct encryption key
- ✅ Check for typos in the key
- ✅ Ensure no extra spaces in environment variable

### Problem: Files Not Found

**Symptoms:**
```
Error: ENOENT: no such file or directory
```

**Solution:**
- ✅ Run decryption from the correct directory (`node_modules/pdfjs-dist`)
- ✅ Ensure package was installed correctly
- ✅ Try reinstalling: `npm install --force pdfjs-dist`

### Problem: Permission Denied

**Symptoms:**
```
Error: EACCES: permission denied
```

**Solution:**
- ✅ Check file permissions
- ✅ Don't use `sudo` (not recommended for npm install)
- ✅ Fix npm permissions: https://docs.npmjs.com/resolving-eacces-permissions-errors

---

## Summary Checklist

### For Publishers:
- [ ] Set strong encryption key via environment variable
- [ ] Build with `npx gulp dist-encrypted`
- [ ] Test package locally with `npm pack`
- [ ] Publish to npm with `npm publish`
- [ ] Share encryption key securely with authorized users
- [ ] Document the decryption process
- [ ] Store keys in CI/CD secrets, not in code

### For Users:
- [ ] Install package: `npm install pdfjs-dist`
- [ ] Navigate to package: `cd node_modules/pdfjs-dist`
- [ ] Decrypt files: `node decrypt.mjs <key>`
- [ ] Verify decryption completed successfully
- [ ] Use PDF.js normally in your application

---

## Next Steps

1. **Test in Development:** Try the complete workflow with a test key
2. **Generate Production Key:** Create a strong, unique key for production
3. **Document for Your Team:** Share this workflow with your team
4. **Set Up CI/CD:** Automate builds and publishing
5. **Monitor Usage:** Track who has access to the encryption key
