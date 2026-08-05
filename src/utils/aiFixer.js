import { autoFixGherkin } from './autoFixer.js';

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
      const fixed = autoFixGherkin(code);
      return { fixedCode: fixed, usedApi: false, apiError: err.message };
    }
  }

  // Fallback / Built-in Smart AI Engine (Simulates AI processing delay)
  await new Promise(resolve => setTimeout(resolve, 400));
  const fixed = autoFixGherkin(code);
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
  return autoFixGherkin(code);
}

