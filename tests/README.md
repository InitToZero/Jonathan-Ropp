
## Run layout tests

From the repository root, the Playwright tests open the recipe page locally, reveal the editor without signing in, and verify that its fields do not overlap on desktop or mobile.

```powershell
Set-Location .\tests
npm install
npx playwright install chromium
npm test
```