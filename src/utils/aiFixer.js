/**
 * Claude AI Powered Gherkin Fixer Engine
 * Integrates directly with Anthropic Claude API (claude-3-5-sonnet) / OpenRouter API
 * to read errors & warnings from all 4 checkers and generate optimal Gherkin code.
 */

export async function fixGherkinWithClaudeAI({ code, results, apiKey, apiProvider = 'anthropic' }) {
  const errorsList = [];
  const warningsList = [];

  if (results && results.checkers) {
    results.checkers.forEach(c => {
      c.errors.forEach(e => {
        errorsList.push(`[${c.name}] Line ${e.line}: ${e.reason || ''} (Rule: ${e.rule || 'syntax'}). Snippet: "${e.text || ''}"`);
      });
      c.warnings.forEach(w => {
        warningsList.push(`[${c.name}] Line ${w.line}: ${w.reason || ''} (Rule: ${w.rule || 'warning'}). Snippet: "${w.text || ''}"`);
      });
    });
  }

  const prompt = `You are a world-class Cucumber & Gherkin QA Automation Engineer.
I have a Gherkin .feature file that failed validation across 4 checkers (@cucumber/gherkin AST, gherkin-lint rules, Matriz88 consistency, and sistar lexer tokens).

--- ORIGINAL GHERKIN CODE ---
${code}

--- VALIDATION ERRORS DETECTED ---
${errorsList.length > 0 ? errorsList.join('\n') : 'No hard errors reported.'}

--- QUALITY WARNINGS DETECTED ---
${warningsList.length > 0 ? warningsList.join('\n') : 'No warnings reported.'}

CRITICAL TASK:
1. Carefully read all original Gherkin code and all 4 checker errors/warnings listed above.
2. Fix all syntax errors, keyword capitalization (Given, When, Then, Scenario, Feature), line indentations, step consistency, and unclosed quotes.
3. If a Scenario Outline is missing an Examples table or header columns, add/update the Examples table with all required <placeholder> columns.
4. Output ONLY the fixed Gherkin code inside a markdown code block tagged with gherkin, e.g. \`\`\`gherkin ... \`\`\`. Do not include any conversational preamble or explanation.`;

  // Filter placeholder / invalid template keys
  const cleanKey = apiKey ? apiKey.trim() : '';
  const isPlaceholderKey = cleanKey.endsWith('...') || cleanKey === 'sk-ant-api' || cleanKey === 'sk-or-v1' || cleanKey.length < 10;

  // Execute direct HTTP API request if valid key present
  if (cleanKey && !isPlaceholderKey) {
    // Auto-detect provider based on key prefix
    let effectiveProvider = apiProvider;
    if (cleanKey.startsWith('sk-or-')) {
      effectiveProvider = 'openrouter';
    } else if (cleanKey.startsWith('sk-ant-')) {
      effectiveProvider = 'anthropic';
    }

    try {
      if (effectiveProvider === 'openrouter') {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cleanKey}`,
            'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
            'X-Title': 'Gherkin Checker Suite'
          },
          body: JSON.stringify({
            model: 'anthropic/claude-3.5-sonnet',
            messages: [
              { role: 'system', content: 'You are an expert Gherkin QA Engineer.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.2
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const msg = errData.error?.message || `OpenRouter HTTP ${response.status}`;
          throw new Error(msg);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const extracted = extractCodeFromMarkdown(content);
        if (extracted) {
          return { fixedCode: extracted, usedApi: true };
        }
      } else {
        // Direct Anthropic Claude API call
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': cleanKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2048,
            temperature: 0.2,
            messages: [
              { role: 'user', content: prompt }
            ]
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const msg = errData.error?.message || `Anthropic HTTP ${response.status}`;
          throw new Error(msg);
        }

        const data = await response.json();
        const content = data.content?.[0]?.text || '';
        const extracted = extractCodeFromMarkdown(content);
        if (extracted) {
          return { fixedCode: extracted, usedApi: true };
        }
      }
    } catch (err) {
      console.warn('API Call failed, using built-in Smart AI Fixer:', err.message);
      // Fallback to built-in Smart AI engine
      const fixed = fallbackAISmartFix(code);
      return { fixedCode: fixed, usedApi: false, apiError: err.message };
    }
  }

  // Fallback / Built-in Smart AI Engine (Simulates AI processing delay)
  await new Promise(resolve => setTimeout(resolve, 500));
  const fixed = fallbackAISmartFix(code);
  return { fixedCode: fixed, usedApi: false };
}


function extractCodeFromMarkdown(markdownText) {
  if (!markdownText) return null;
  const match = markdownText.match(/```(?:gherkin|feature)?\s*([\s\S]*?)```/i);
  if (match && match[1] && match[1].trim()) {
    return match[1].trim();
  }
  const clean = markdownText.trim();
  if (clean.includes('Feature:')) {
    return clean;
  }
  return null;
}

export function fallbackAISmartFix(code) {
  if (!code || !code.trim()) {
    return `Feature: User Authentication System

  Scenario: Successful login with valid credentials
    Given the user is on the login page
    When the user enters valid credentials
    Then the user should be redirected to dashboard`;
  }

  let lines = code.split('\n').map(l => l.trimEnd());
  let hasFeature = false;
  let scenarioNames = new Map();
  let currentScenarioType = null;
  let currentScenarioHasExamples = false;
  let currentOutlinePlaceholders = new Set();
  let currentOutlineExamplesHeaderIndex = -1;

  const fixed = [];
  let lastMainStepKeyword = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let trimmed = line.trim();

    // Preserve comments & empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      fixed.push(trimmed);
      continue;
    }

    // Fix Tags
    if (trimmed.startsWith('@')) {
      // Fix malformed tags like @#$ -> @tag
      let cleanTag = trimmed.replace(/@[^a-zA-Z0-9_\-\s]/g, '@tag_');
      fixed.push((hasFeature ? '  ' : '') + cleanTag);
      continue;
    }

    // Feature keyword fix
    if (/^feature\b/i.test(trimmed) || trimmed.startsWith('Feature:') || trimmed.startsWith('Feature')) {
      hasFeature = true;
      let title = trimmed.replace(/^feature\s*:?\s*/i, '').trim() || 'User Feature Specification';
      fixed.push(`Feature: ${title}`);
      continue;
    }

    // Background keyword fix
    if (/^background\b/i.test(trimmed) || trimmed.startsWith('Background:') || trimmed.startsWith('Background')) {
      let title = trimmed.replace(/^background\s*:?\s*/i, '').trim();
      fixed.push(`  ${title ? `Background: ${title}` : 'Background:'}`);
      lastMainStepKeyword = null;
      continue;
    }

    // Scenario / Scenario Outline Keyword Fix
    if (
      /^scenario\s+outline\b/i.test(trimmed) ||
      /^scenario\s+template\b/i.test(trimmed) ||
      /^scenario\b/i.test(trimmed) ||
      trimmed.startsWith('Scenario:') ||
      trimmed.startsWith('Scenario Outline:') ||
      trimmed.startsWith('Scenario Template:')
    ) {
      // If previous outline had missing Examples or missing placeholders, handle them
      if (currentScenarioType === 'Scenario Outline' && !currentScenarioHasExamples) {
        fixed.push('    Examples:');
        const phArray = Array.from(currentOutlinePlaceholders);
        if (phArray.length > 0) {
          fixed.push(`      | ${phArray.join(' | ')} |`);
          fixed.push(`      | ${phArray.map(p => `${p}_value`).join(' | ')} |`);
        } else {
          fixed.push('      | username | password |');
          fixed.push('      | admin    | secret   |');
        }
        fixed.push('');
      }

      let isOutline = /^scenario\s+(outline|template)\b/i.test(trimmed) || trimmed.startsWith('Scenario Outline:') || trimmed.startsWith('Scenario Template:');
      let title = trimmed.replace(/^scenario\s*(outline|template)?\s*:?\s*/i, '').trim() || (isOutline ? 'Data Driven User Flow' : 'Standard User Operation');

      if (scenarioNames.has(title)) {
        const count = scenarioNames.get(title) + 1;
        scenarioNames.set(title, count);
        title = `${title} (${count})`;
      } else {
        scenarioNames.set(title, 1);
      }

      currentScenarioType = isOutline ? 'Scenario Outline' : 'Scenario';
      currentScenarioHasExamples = false;
      currentOutlinePlaceholders.clear();
      currentOutlineExamplesHeaderIndex = -1;
      lastMainStepKeyword = null;

      fixed.push(`  ${isOutline ? 'Scenario Outline:' : 'Scenario:'} ${title}`);
      continue;
    }

    // Examples Keyword Fix
    if (/^examples\s*:?/i.test(trimmed) || trimmed.startsWith('Examples:')) {
      currentScenarioHasExamples = true;
      let title = trimmed.replace(/^examples\s*:?\s*/i, '').trim();
      fixed.push(`    ${title ? `Examples: ${title}` : 'Examples:'}`);
      currentOutlineExamplesHeaderIndex = fixed.length;
      continue;
    }

    // Data Table Rows
    if (trimmed.startsWith('|')) {
      const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
      fixed.push(`      | ${cells.join(' | ')} |`);
      continue;
    }

    // Steps Verification (Given, When, Then, And, But)
    const stepMatch = trimmed.match(/^(given|when|then|and|but)\b/i);
    if (stepMatch) {
      let kw = stepMatch[1].toLowerCase();
      let capKw = kw.charAt(0).toUpperCase() + kw.slice(1);
      let stepText = trimmed.slice(stepMatch[0].length).trim();

      // Fix dangling And / But step before any Given/When/Then
      if ((capKw === 'And' || capKw === 'But') && !lastMainStepKeyword) {
        capKw = 'Given';
      }

      if (capKw === 'Given' || capKw === 'When' || capKw === 'Then') {
        lastMainStepKeyword = capKw;
      }

      // Fix unclosed double quotes e.g. "param -> "param"
      const dQuotes = (stepText.match(/"/g) || []).length;
      if (dQuotes % 2 !== 0) {
        stepText += '"';
      }

      // Fix unclosed single quotes e.g. 'param -> 'param'
      const sQuotes = (stepText.match(/'/g) || []).length;
      if (sQuotes % 2 !== 0) {
        stepText += "'";
      }

      // Track placeholders in Scenario Outline steps <param>
      if (currentScenarioType === 'Scenario Outline') {
        const phMatches = stepText.match(/<([^>]+)>/g);
        if (phMatches) {
          phMatches.forEach(m => {
            currentOutlinePlaceholders.add(m.replace(/[<>]/g, '').trim());
          });
        }
      }

      fixed.push(`    ${capKw} ${stepText}`);
      continue;
    }

    // Fallback line
    fixed.push(line);
  }

  // If file missing Feature header
  if (!hasFeature) {
    fixed.unshift('Feature: User Feature Specification', '');
  }

  // Handle trailing Scenario Outline missing Examples block
  if (currentScenarioType === 'Scenario Outline' && !currentScenarioHasExamples) {
    fixed.push('    Examples:');
    const phArray = Array.from(currentOutlinePlaceholders);
    if (phArray.length > 0) {
      fixed.push(`      | ${phArray.join(' | ')} |`);
      fixed.push(`      | ${phArray.map(p => `${p}_val`).join(' | ')} |`);
    } else {
      fixed.push('      | username | password |');
      fixed.push('      | admin    | secret   |');
    }
  }

  return fixed.join('\n');
}
