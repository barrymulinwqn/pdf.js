# PDF.js Encrypted Build Guide

This document explains how to build and distribute encrypted PDF.js files to npm.

## Overview

The PDF.js project now supports encrypting build artifacts before publishing to npm. This adds a layer of security to the distributed files, requiring users to decrypt them after installation.

## Building Encrypted Files

### Prerequisites

- Node.js >= 20.16.0 or >= 22.3.0
- All standard PDF.js build dependencies

### Setting the Encryption Key

You should set a custom encryption key via environment variable:

```bash
# Windows (PowerShell)
$env:PDFJS_ENCRYPTION_KEY="your-secure-encryption-key-here"

# Windows (CMD)
set PDFJS_ENCRYPTION_KEY=your-secure-encryption-key-here

# Linux/Mac
export PDFJS_ENCRYPTION_KEY="your-secure-encryption-key-here"
```

**Important:** Never use the default encryption key in production! Always set a strong, unique encryption key.

### Build Commands

#### 1. Build and Encrypt Generic Build

```bash
npx gulp encrypt-generic
```

This will:
- Run the standard `generic` build task
- Encrypt JavaScript/CSS/HTML files in `build/generic/`
- Output encrypted files to `build/encrypted/generic/`

#### 2. Build and Encrypt Generic Legacy Build

```bash
npx gulp encrypt-generic-legacy
```

This will:
- Run the standard `generic-legacy` build task
- Encrypt files for legacy browser support
- Output encrypted files to `build/encrypted/generic-legacy/`

#### 3. Create Encrypted Distribution for npm

```bash
npx gulp dist-encrypted
```

This will:
- Build and encrypt both generic and generic-legacy
- Build all other components (minified, types, etc.)
- Create a complete npm package in `build/dist-encrypted/`
- Include a `decrypt.mjs` script for end users

## Publishing to npm

After building the encrypted distribution:

```bash
cd build/dist-encrypted
npm publish
```

## For npm Package Users

### Installation

```bash
npm install pdfjs-dist
```

### Decryption

After installation, users must decrypt the files:

```bash
# Navigate to the installed package
cd node_modules/pdfjs-dist

# Decrypt with the encryption key
node decrypt.mjs your-encryption-key-here

# Or use environment variable
PDFJS_ENCRYPTION_KEY="your-encryption-key-here" node decrypt.mjs
```

The decryption script will:
- Find all `.encrypted` files in the package
- Decrypt them using the provided key
- Save decrypted files with their original names
- Remove the `.encrypted` files

### Usage After Decryption

After decryption, use PDF.js normally:

```javascript
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.mjs';

// Use PDF.js as usual
const loadingTask = pdfjsLib.getDocument('path/to/file.pdf');
// ... rest of your code
```

## Security Considerations

1. **Key Management:** Store encryption keys securely, never commit them to version control
2. **Distribution:** Share the encryption key securely with authorized users only
3. **Key Rotation:** Consider rotating encryption keys periodically
4. **Environment Variables:** Use environment variables for keys, not hardcoded values

## File Encryption Details

### What Gets Encrypted

- **JavaScript/Module files:** `*.js`, `*.mjs`
- **CSS files:** `*.css`
- **HTML files:** `*.html`
- **Source maps:** `*.map`

### What Stays Unencrypted

- Images (`*.png`, `*.svg`, `*.gif`)
- Font files
- PDF files (like the sample PDF)
- CMaps, ICCs, standard fonts
- WASM files
- LICENSE and README files

### Encryption Method

- **Algorithm:** AES-256-CBC
- **Key Derivation:** SHA-256 hash of the provided key
- **IV:** Random 16-byte initialization vector (prepended to encrypted data)

## Troubleshooting

### Decryption Fails

- Verify you're using the correct encryption key
- Ensure the key matches the one used during build

### Files Not Found After Decryption

- Check that decryption completed successfully
- Look for error messages during decryption

### Build Errors

- Ensure `PDFJS_ENCRYPTION_KEY` is set
- Verify all dependencies are installed
- Check Node.js version compatibility

## Example Workflow

```bash
# 1. Set encryption key
export PDFJS_ENCRYPTION_KEY="my-super-secret-key-2024"

# 2. Build encrypted distribution
npx gulp dist-encrypted

# 3. Navigate to dist directory
cd build/dist-encrypted

# 4. Test locally (optional)
npm pack

# 5. Publish to npm
npm publish

# 6. Users install and decrypt
npm install pdfjs-dist
cd node_modules/pdfjs-dist
PDFJS_ENCRYPTION_KEY="my-super-secret-key-2024" node decrypt.mjs
```

## Notes

- The encryption adds minimal overhead to file size (16 bytes IV per file)
- Decryption is a one-time operation after installation
- Original unencrypted files are automatically removed after successful decryption
- The `decrypt.mjs` script is standalone and requires only Node.js built-in modules
