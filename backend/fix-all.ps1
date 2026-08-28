# PowerShell Script to fix all issues on Windows
Write-Host "🔧 Fixing all backend issues on Windows..." -ForegroundColor Cyan
Write-Host ""

# 1. Install cross-env
Write-Host "1. Installing cross-env..." -ForegroundColor Yellow
npm install --save-dev cross-env
Write-Host "✅ cross-env installed" -ForegroundColor Green
Write-Host ""

# 2. Fix package.json scripts
Write-Host "2. Updating package.json scripts..." -ForegroundColor Yellow
npm pkg set scripts.dev="cross-env NODE_ENV=development nodemon --exec ts-node -r tsconfig-paths/register src/server.ts"
npm pkg set scripts.test="cross-env NODE_ENV=test jest --coverage --verbose"
npm pkg set scripts.build="tsc --project tsconfig.build.json && tsc-alias -p tsconfig.build.json"
npm pkg set scripts.start="cross-env NODE_ENV=production node dist/server.js"
Write-Host "✅ Scripts updated" -ForegroundColor Green
Write-Host ""

# 3. Create ESLint config
Write-Host "3. Creating ESLint config..." -ForegroundColor Yellow
@"
{
  "root": true,
  "env": {
    "node": true,
    "es2022": true,
    "jest": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "warn",
    "no-console": "off"
  },
  "ignorePatterns": ["dist/", "node_modules/", "coverage/", "tests/"]
}
"@ | Out-File -FilePath ../.eslintrc.json -Encoding UTF8
Write-Host "✅ ESLint config created" -ForegroundColor Green
Write-Host ""

# 4. Fix Task.ts syntax error
Write-Host "4. Fixing Task.ts syntax error..." -ForegroundColor Yellow
$taskFile = "src/models/Task.ts"
if (Test-Path $taskFile) {
    (Get-Content $taskFile -Raw) -replace 'percentage = \(percentage \+ subtaskPercentage\) /', 'percentage = (percentage + subtaskPercentage) / 2;' | Set-Content $taskFile -NoNewline
    Write-Host "✅ Task.ts fixed" -ForegroundColor Green
} else {
    Write-Host "⚠️ Task.ts not found" -ForegroundColor Yellow
}
Write-Host ""

# 5. Rebuild
Write-Host "5. Rebuilding project..." -ForegroundColor Yellow
npm run build
Write-Host ""

# 6. Verification
Write-Host "6. Verification complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the backend, run: npm run dev" -ForegroundColor Cyan
Write-Host "To run tests, run: npm test" -ForegroundColor Cyan