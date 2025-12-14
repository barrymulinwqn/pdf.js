# Quick Start: Encrypted PDF.js Build

## Step 1: Set Encryption Key

**Windows PowerShell:**
```powershell
$env:PDFJS_ENCRYPTION_KEY="your-secret-key-here"
```

**Windows CMD:**
```cmd
set PDFJS_ENCRYPTION_KEY=your-secret-key-here
```

**Linux/Mac:**
```bash
export PDFJS_ENCRYPTION_KEY="your-secret-key-here"
```

## Step 2: Build with Encryption

### Option A: Quick Encrypted Build (Generic Only)
```bash
npx gulp encrypt-generic
```

### Option B: Full Encrypted Distribution for npm
```bash
npx gulp dist-encrypted
```

This builds everything needed for npm including:
- Encrypted generic build
- Encrypted generic-legacy build
- All components and minified versions
- TypeScript definitions
- Decryption script for users

## Step 3: Publish to npm

```bash
cd build/dist-encrypted
npm publish
```

## For Users Installing from npm

After `npm install pdfjs-dist`:

```bash
cd node_modules/pdfjs-dist
node decrypt.mjs your-secret-key-here
```

Or with environment variable:
```bash
PDFJS_ENCRYPTION_KEY="your-secret-key-here" node decrypt.mjs
```

---

## Available Gulp Tasks

| Task | Description |
|------|-------------|
| `encrypt-generic` | Encrypts generic build files |
| `encrypt-generic-legacy` | Encrypts generic-legacy build files |
| `dist-encrypted` | Creates complete encrypted npm package |

## What Gets Encrypted?

✅ JavaScript/Module files (`.js`, `.mjs`)  
✅ CSS files (`.css`)  
✅ HTML files (`.html`)  
✅ Source maps (`.map`)  

❌ Images, fonts, PDFs (remain unencrypted)  
❌ CMaps, ICCs, WASM files (remain unencrypted)

## Security Best Practices

1. ⚠️ **Never commit encryption keys to Git**
2. 🔐 Use strong, unique keys for production
3. 🔄 Rotate keys periodically
4. 📧 Share keys securely with authorized users only
5. 🌍 Use environment variables, not hardcoded values
