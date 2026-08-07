# 🥒 4-in-1 Gherkin Checker & Validator Suite — User Manual

A modern, high-performance web application designed to validate Gherkin `.feature` files simultaneously through **4 distinct Gherkin checkers and validators**.

---

## 🛠️ 1. Technologies & Tools Used

### The 4 Integrated Gherkin Validation Engines
1. **`@cucumber/gherkin`** ([cucumber/gherkin-javascript](https://github.com/cucumber/gherkin-javascript))
   - *Official Cucumber AST Parser*: Validates AST tokens, syntax correctness, tag syntax, tables, and document hierarchy.
2. **`gherkin-lint`** ([gherkin-lint/gherkin-lint](https://github.com/gherkin-lint/gherkin-lint))
   - *Code Quality Linter*: Enforces best practices including indentation rules, duplicate scenario names, empty files, repeated keywords (`Given`/`When`/`Then`), and logical step flow (`keywords-in-logical-order`).
3. **`Matriz88/gherkin-checker`** ([Matriz88/gherkin-checker](https://github.com/Matriz88/gherkin-checker))
   - *Consistency & Step Matcher*: Checks scenario step consistency, dangling step conjunctions (`And`/`But`), unclosed quote literals (`"` / `'`), and verifies Scenario Outline `<parameter>` references match `Examples:` table headers.
4. **`sistar/gherkin-validator`** ([sistar/gherkin-validator](https://github.com/sistar/gherkin-validator))
   - *Strict Lexer Scanner*: Performs token boundary validation, pipe alignments on table rows (`|`), multiline DocString fencing (`"""`), and header token rules.

### Frontend Application Stack
- **Framework**: React 19 + Vite 8
- **Icons**: Lucide React
- **Celebration Effects**: Canvas Confetti
- **UI Design System**: Vanilla CSS with Dark Mode Glassmorphism & Neon Status Indicators

---

## 📖 2. How to Use the Application (Step-by-Step)

### Step 1: Input Your Gherkin Code
- **Paste Directly**: Type or paste your Gherkin `.feature` file text into the **Gherkin Feature Editor** on the left.
- **Upload File**: Click the **Upload File** button to select a `.feature` or `.txt` file from your device.
- **Try Quick Presets**: Click any of the 4 pre-loaded preset buttons in the top bar to test instantly:
  - `✅ Valid Feature`: A clean feature file passing all 4 checkers.
  - `❌ Syntax & Lexing Errors`: Triggers syntax & lexer failures.
  - `⚠️ Linter Rule Violations`: Triggers quality warnings and duplicate name errors.
  - `🔍 Inconsistent Steps`: Triggers step flow mismatches and missing outline parameters.

### Step 2: Live Real-Time Analysis
- As you type or change presets, the app runs all 4 validation engines concurrently.
- No submit button needed — analysis happens live in under **5 milliseconds**.

### Step 3: Export Validation Reports
- Click **Download JSON Report** or **Download Markdown Report** at the bottom bar to export full analysis details.

---

## 🔍 3. How to Read Validations & Errors

### Overall Status Banner
- 🟢 **PASS**: Displayed in bright green when 0 errors are found across all 4 checkers. Celebratory confetti triggers automatically!
- 🔴 **FAIL**: Displayed in vibrant red when 1 or more errors are detected, showing total issue counts.

### Reading Detailed Failure Items
Each failed check expands into a detailed error card containing:

| Element | Description | Example |
|---|---|---|
| 📌 **Line Number** | Pinpoints the exact line in your `.feature` file | `Line 14` |
| 🏷️ **Category & Rule** | Categorizes the error & rule name | `[AST Syntax Error]` / `rule: parse-error` |
| 📝 **Line Snippet** | Shows the exact code text on that line | `| Laptop | 1000` |
| 💡 **Clear Failure Reason** | Plain-English explanation of why it failed | `Table row must end with a pipe character "|".` |
| 🛠️ **Suggested Fix** | Step-by-step guidance on how to fix it | `Add a trailing pipe "|" to close the table cell row on this line.` |

### Editor Line Annotations
- Lines with errors display a **Red Circle Marker** in the editor gutter.
- Lines with warnings display a **Yellow Warning Triangle** in the editor gutter.
- Clicking any error item in the dashboard highlights the corresponding line in the editor!

---

## 💻 4. Running Locally & Vercel Deployment

### Run Locally
```bash
npm install
npm run dev
```
Open `http://127.0.0.1:5173/` in your browser.

### Deploy to Vercel (1-Click)
1. Go to **[vercel.com/new](https://vercel.com/new)**.
2. Select repository **`Sekhar03/gherkin-checker`**.
3. Click **Deploy**. Vercel will automatically build and publish your app!

---

## 👨‍💻 Developer
**Sekhar Parida**  
🔗 LinkedIn: [https://www.linkedin.com/in/sekhar-parida/](https://www.linkedin.com/in/sekhar-parida/)

