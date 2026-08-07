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

  const prompt = `You are an elite Cucumber & Gherkin QA Principal Automation Engineer trained on official Cucumber specifications, gherkin-lint rulesets, and BDD domain-driven design principles.

--- OFFICIAL BDD REFACTORING & TRAINING RULES ---
1. OFFICIAL SPECIFICATION: Feature, Background, Scenario, Scenario Outline, Examples, Given, When, Then, And, But, Rule.
2. SYNTAX REPAIR:
   - Always capitalize keywords properly (Feature:, Scenario:, Given, When, Then, And, But).
   - Indent steps with 4 spaces under Scenarios/Background. Indent Scenarios with 2 spaces under Feature.
   - Close all unclosed quotes (") and single quotes (').
3. WARNING & HYGIENE ELIMINATION:
   - Empty Background: Add a prerequisite Given step (e.g. "Given the system is online and ready").
   - Scenario Outline missing Examples: Create an Examples: table with columns matching all <placeholder> variables.
   - Duplicate Tags: If @tag is on Feature, strip it from Scenario.
   - Repeated Keywords: Convert repeated Given/Given or When/When to 'And'.
   - Empty Lines: Collapse multiple consecutive blank lines down to a single blank line.
4. DECLARATIVE DOMAIN REFACTORING:
   - Refactor first-person phrasing ("I click", "I type") into declarative steps ("When submitting login credentials").

--- FEW-SHOT TRAINING EXAMPLES ---

EXAMPLE 1 (Fixing Empty Background, Missing Examples, & Bad Indentation):
[INPUT CODE]:
feature: login
background:
scenario outline: test user login <username>
given I click login button
when I type "<username>"
then I see dashboard

[EXPECTED FIXED CODE]:
Feature: User Login System

  Background:
    Given the authentication service is operational

  Scenario Outline: Test user login
    Given navigating to the login page
    When submitting username "<username>"
    Then the user should see the dashboard

    Examples:
      | username |
      | user_admin |

--- CURRENT USER GHERKIN CODE TO FIX ---
${code}

--- VALIDATION ERRORS REPORTED ---
${errorsList.length > 0 ? errorsList.join('\n') : 'No hard errors reported.'}

--- QUALITY WARNINGS REPORTED ---
${warningsList.length > 0 ? warningsList.join('\n') : 'No warnings reported.'}

CRITICAL TASK:
Output ONLY the final, 100% error-free and warning-free fixed Gherkin code inside a markdown code block tagged with gherkin, e.g. \`\`\`gherkin ... \`\`\`. Do NOT include preamble, markdown headers, or explanations.`;

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

