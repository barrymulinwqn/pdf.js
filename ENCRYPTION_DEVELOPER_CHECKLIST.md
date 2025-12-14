# Developer Checklist: PDF.js Encryption Feature

## Pre-Build Checklist

### Environment Setup
- [ ] Node.js version >= 20.16.0 or >= 22.3.0 installed
- [ ] All dependencies installed (`npm install`)
- [ ] Git repository is clean (no uncommitted changes)
- [ ] Currently on correct branch/tag for release

### Security Preparation
- [ ] Strong encryption key generated (minimum 32 characters recommended)
- [ ] Encryption key stored in secure location (password manager, vault)
- [ ] Encryption key added to environment variables
- [ ] Encryption key NOT committed to version control
- [ ] `.gitignore` updated to ignore key files (if storing locally)

### Key Management
**Generate a strong key (example methods):**
```bash
# Method 1: Using openssl
openssl rand -base64 32

# Method 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Method 3: Using PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Min 0 -Max 256 }))
```

**Set the key:**
```bash
# Windows PowerShell
$env:PDFJS_ENCRYPTION_KEY="<generated-key-here>"

# Linux/Mac
export PDFJS_ENCRYPTION_KEY="<generated-key-here>"
```

---

## Build Process Checklist

### Step 1: Verify Environment
```bash
# Check Node.js version
node --version

# Check if encryption key is set
# PowerShell:
echo $env:PDFJS_ENCRYPTION_KEY
# Bash:
echo $PDFJS_ENCRYPTION_KEY
```
- [ ] Correct Node.js version confirmed
- [ ] Encryption key is set and displayed

### Step 2: Clean Previous Builds
```bash
# Remove old build directories
rm -rf build/
```
- [ ] Old build directories cleaned

### Step 3: Run Encrypted Build
```bash
# Build encrypted distribution
npx gulp dist-encrypted
```
- [ ] Build completed without errors
- [ ] No TypeScript errors
- [ ] No JavaScript errors
- [ ] No gulp task failures

### Step 4: Verify Build Output
Check that `build/dist-encrypted/` contains:
- [ ] `package.json` (with correct version)
- [ ] `decrypt.mjs` (decryption script)
- [ ] `build/` directory with `*.encrypted` files
- [ ] `legacy/build/` directory with `*.encrypted` files
- [ ] `web/` directory with encrypted JS/CSS/HTML files
- [ ] `cmaps/`, `iccs/`, `standard_fonts/`, `wasm/` (unencrypted)
- [ ] `types/` directory with TypeScript definitions
- [ ] `LICENSE` file

**Verification script:**
```bash
cd build/dist-encrypted

# Check for essential files
test -f package.json && echo "✅ package.json exists" || echo "❌ Missing package.json"
test -f decrypt.mjs && echo "✅ decrypt.mjs exists" || echo "❌ Missing decrypt.mjs"
test -f LICENSE && echo "✅ LICENSE exists" || echo "❌ Missing LICENSE"

# Count encrypted files
find . -name "*.encrypted" | wc -l
# Should show multiple encrypted files (exact number varies)

cd ../..
```

### Step 5: Test Decryption Locally
```bash
# Navigate to dist
cd build/dist-encrypted

# Test decryption
node decrypt.mjs "$PDFJS_ENCRYPTION_KEY"

# Verify decrypted files exist
test -f build/pdf.mjs && echo "✅ Decryption successful" || echo "❌ Decryption failed"

# Clean up for fresh publish
cd ../..
rm -rf build/dist-encrypted
npx gulp dist-encrypted
```
- [ ] Decryption script runs without errors
- [ ] All `.encrypted` files are decrypted
- [ ] Decrypted files have correct extensions
- [ ] Original `.encrypted` files are removed
- [ ] Rebuilt for clean publish

---

## Publishing Checklist

### Pre-Publish Verification
```bash
cd build/dist-encrypted

# Check package.json version
cat package.json | grep version

# Run npm pack for dry-run
npm pack

# Inspect the tarball
tar -tzf pdfjs-dist-*.tgz | head -20
```
- [ ] Version number is correct
- [ ] Package tarball created successfully
- [ ] Tarball contains expected files

### npm Registry Setup
- [ ] Logged into npm (`npm whoami` shows correct user)
- [ ] Have publish permissions for `pdfjs-dist` package
- [ ] 2FA/MFA configured for npm account (recommended)

### Publish to npm
```bash
# Option 1: Standard publish
npm publish

# Option 2: With specific tag
npm publish --tag encrypted

# Option 3: Dry run first (recommended)
npm publish --dry-run
# Review output, then:
npm publish
```
- [ ] Publish completed successfully
- [ ] Package appears on npmjs.com
- [ ] Version number is correct on npm
- [ ] Package is not marked as deprecated

### Post-Publish Verification
```bash
# In a separate test directory
mkdir test-install
cd test-install
npm init -y
npm install pdfjs-dist@latest

# Verify package installed
cd node_modules/pdfjs-dist
ls -la

# Test decryption
node decrypt.mjs "$PDFJS_ENCRYPTION_KEY"

# Verify files are usable
node -e "import('./build/pdf.mjs').then(m => console.log('✅ Module loads successfully'))"
```
- [ ] Package installs correctly
- [ ] Decryption works with published package
- [ ] Modules load without errors

---

## Documentation & Communication Checklist

### Update Documentation
- [ ] Update CHANGELOG.md with new version
- [ ] Update README.md if needed
- [ ] Tag release in Git
- [ ] Create GitHub release with notes

### Communicate to Users
- [ ] Send encryption key to authorized users via secure channel
- [ ] Provide decryption instructions
- [ ] Update internal documentation
- [ ] Notify team of new release

**Example user notification:**
```
Subject: PDF.js v4.X.X Released (Encrypted)

A new encrypted version of PDF.js has been published to npm.

Package: pdfjs-dist@4.X.X
Encryption: AES-256-CBC

Installation:
  npm install pdfjs-dist@4.X.X

Decryption:
  cd node_modules/pdfjs-dist
  node decrypt.mjs <encryption-key>

The encryption key will be provided separately via [secure channel].

For questions or issues, please contact [support contact].
```

### Secure Key Distribution
- [ ] Key sent via encrypted email/message
- [ ] Key stored in team password manager
- [ ] Key documented in secure internal wiki
- [ ] Key NOT sent via plain email
- [ ] Key NOT posted in public channels

---

## Troubleshooting Checklist

### If Build Fails
- [ ] Check Node.js version compatibility
- [ ] Verify all dependencies are installed
- [ ] Check for disk space issues
- [ ] Review error messages in console
- [ ] Try cleaning and rebuilding: `rm -rf build/ && npx gulp dist-encrypted`

### If Encryption Fails
- [ ] Verify `PDFJS_ENCRYPTION_KEY` is set
- [ ] Check for special characters in key (escape if needed)
- [ ] Ensure crypto module is available (`node -e "console.log(require('crypto'))"`)

### If Decryption Fails
- [ ] Verify using exact same key that was used for encryption
- [ ] Check for key encoding issues (UTF-8)
- [ ] Ensure `.encrypted` files exist before decryption
- [ ] Try with a fresh install

### If Publish Fails
- [ ] Verify npm login: `npm whoami`
- [ ] Check package name availability
- [ ] Verify version number not already published
- [ ] Check npm registry status: https://status.npmjs.org/
- [ ] Review npm publish logs for specific errors

---

## Security Audit Checklist

### Before Each Release
- [ ] Review who has access to encryption keys
- [ ] Check if any keys need rotation
- [ ] Audit recent access to build systems
- [ ] Verify CI/CD secrets are up to date
- [ ] Review .gitignore for sensitive files

### After Each Release
- [ ] Confirm package published successfully
- [ ] Verify no secrets exposed in published package
- [ ] Test decryption with shared key
- [ ] Monitor for unauthorized access attempts
- [ ] Document release in security log

---

## Maintenance Checklist

### Monthly
- [ ] Review encryption key rotation schedule
- [ ] Check for security updates to dependencies
- [ ] Verify CI/CD pipelines still working
- [ ] Update documentation if needed

### Quarterly
- [ ] Audit list of authorized users
- [ ] Review and update encryption keys
- [ ] Test disaster recovery process
- [ ] Update security documentation

### Annually
- [ ] Full security audit of encryption process
- [ ] Review and update encryption algorithm if needed
- [ ] Comprehensive testing of entire workflow
- [ ] Update team training on encryption process

---

## Quick Command Reference

```bash
# Set key (PowerShell)
$env:PDFJS_ENCRYPTION_KEY="your-key"

# Set key (Bash)
export PDFJS_ENCRYPTION_KEY="your-key"

# Build encrypted
npx gulp dist-encrypted

# Test decryption
cd build/dist-encrypted && node decrypt.mjs "$PDFJS_ENCRYPTION_KEY" && cd ../..

# Publish
cd build/dist-encrypted && npm publish && cd ../..

# Full workflow
export PDFJS_ENCRYPTION_KEY="your-key" && \
npx gulp dist-encrypted && \
cd build/dist-encrypted && \
npm publish && \
cd ../..
```

---

## Emergency Contacts

In case of issues, contact:
- **Build Issues:** [Build team contact]
- **Security Issues:** [Security team contact]
- **npm Publishing Issues:** [DevOps team contact]
- **Key Management:** [Key custodian contact]

---

## Sign-Off

Before publishing, the following must be verified and signed off:

- [ ] **Developer:** Build completed successfully - [Name/Date]
- [ ] **QA:** Decryption tested and verified - [Name/Date]  
- [ ] **Security:** Encryption implementation reviewed - [Name/Date]
- [ ] **Release Manager:** Approved for publishing - [Name/Date]

---

**Last Updated:** [Date]
**Version:** 1.0
**Maintained by:** [Team Name]
