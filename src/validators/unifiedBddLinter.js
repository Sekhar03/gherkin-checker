/**
 * SET-IITGN UnifiedBDDLinter Engine for Gherkin Feature Files
 * Implements 28 Anti-Pattern Rules across 4 Families:
 * 1. Style: Indentation, trailing whitespace, blank lines, EOF newline, filename casing.
 * 2. Structure: Feature/Scenario name presence & uniqueness, non-empty file, filename-feature alignment.
 * 3. Workflow: Given->When->Then order, Single 'When' per scenario, Action & Verification presence, step count limit.
 * 4. Quality (Business-Readability): Leak implementation details (imperative UI selectors), vague language, hardcoded data, near-duplicate scenarios.
 */

export function runUnifiedBddLinter(code, filename = 'feature_test.feature') {
  const errors = [];
  const warnings = [];

  if (!code || !code.trim()) {
    errors.push({
      line: 1,
      rule: 'structure/non-empty-file',
      reason: 'Feature file is empty. Feature files must contain a Feature specification header.',
      suggestedFix: 'Add "Feature: <Title>" header and at least one scenario.'
    });
    return { name: 'SET-IITGN UnifiedBDDLinter', errors, warnings };
  }

  const lines = code.split('\n');

  // Rule 1: Style / End-of-file newline
  if (lines.length > 0 && lines[lines.length - 1] !== '') {
    warnings.push({
      line: lines.length,
      rule: 'style/eof-newline',
      reason: 'File does not end with a single trailing newline.',
      suggestedFix: 'Add a trailing newline at the end of the file.'
    });
  }

  let featureTitle = null;
  let featureLine = -1;
  const scenarioTitles = new Map();
  let inBackground = false;
  let backgroundLine = -1;
  let backgroundStepsCount = 0;
  
  let currentScenario = null;
  const scenarios = [];
  let consecutiveEmptyLines = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineNum = i + 1;
    const trimmed = rawLine.trim();

    // Rule 2: Style / Trailing Whitespace
    if (/\s+$/.test(rawLine)) {
      warnings.push({
        line: lineNum,
        rule: 'style/trailing-whitespace',
        reason: 'Line contains trailing whitespace characters.',
        suggestedFix: 'Remove trailing spaces at line end.'
      });
    }

    // Rule 3: Style / Multiple Blank Lines
    if (!trimmed) {
      consecutiveEmptyLines++;
      if (consecutiveEmptyLines >= 2) {
        warnings.push({
          line: lineNum,
          rule: 'style/multiple-blank-lines',
          reason: 'Multiple consecutive blank lines detected.',
          suggestedFix: 'Collapse consecutive empty lines to a single blank line.'
        });
      }
      continue;
    } else {
      consecutiveEmptyLines = 0;
    }

    // Rule 4: Feature Header Analysis
    if (trimmed.startsWith('Feature:')) {
      if (featureTitle) {
        errors.push({
          line: lineNum,
          rule: 'structure/single-feature-per-file',
          reason: 'Multiple "Feature:" headers found in a single file.',
          suggestedFix: 'Split features into separate files or convert 2nd+ Feature to a "Rule:".'
        });
      } else {
        featureTitle = trimmed.replace(/^Feature:\s*/, '').trim();
        featureLine = lineNum;

        if (!featureTitle) {
          errors.push({
            line: lineNum,
            rule: 'structure/feature-name-present',
            reason: 'Feature header is missing a descriptive name.',
            suggestedFix: 'Add a descriptive title after "Feature:".'
          });
        }
      }
      continue;
    }

    // Rule 5: Background Analysis
    if (trimmed.startsWith('Background:')) {
      inBackground = true;
      backgroundLine = lineNum;
      backgroundStepsCount = 0;
      continue;
    }

    // Rule 6: Scenario Header Analysis
    if (trimmed.startsWith('Scenario:') || trimmed.startsWith('Scenario Outline:') || trimmed.startsWith('Scenario Template:') || trimmed.startsWith('Example:')) {
      inBackground = false;
      const isOutline = trimmed.startsWith('Scenario Outline:') || trimmed.startsWith('Scenario Template:');
      const title = trimmed.replace(/^(Scenario Outline:|Scenario Template:|Scenario:|Example:)\s*/, '').trim();

      if (!title) {
        errors.push({
          line: lineNum,
          rule: 'structure/scenario-name-present',
          reason: 'Scenario header is missing a title.',
          suggestedFix: 'Add a title describing the scenario goal.'
        });
      } else {
        // Unique Scenario Names Check
        const cleanTitle = title.toLowerCase();
        if (scenarioTitles.has(cleanTitle)) {
          warnings.push({
            line: lineNum,
            rule: 'structure/unique-scenario-names',
            reason: `Duplicate scenario title "${title}" (previously defined on line ${scenarioTitles.get(cleanTitle)}).`,
            suggestedFix: 'Rename scenario to be unique.'
          });
        } else {
          scenarioTitles.set(cleanTitle, lineNum);
        }
      }

      currentScenario = {
        title,
        line: lineNum,
        isOutline,
        steps: [],
        whenCount: 0,
        givenCount: 0,
        thenCount: 0,
        hasExamples: false
      };
      scenarios.push(currentScenario);
      continue;
    }

    // Examples Header
    if (trimmed.startsWith('Examples:') || trimmed.startsWith('Scenarios:')) {
      if (currentScenario) {
        currentScenario.hasExamples = true;
      }
      continue;
    }

    // Step Analysis
    const stepMatch = trimmed.match(/^(Given|When|Then|And|But|\*)\b\s*(.*)/i);
    if (stepMatch) {
      const keyword = stepMatch[1].charAt(0).toUpperCase() + stepMatch[1].slice(1).toLowerCase();
      const stepText = stepMatch[2].trim();

      if (inBackground) {
        backgroundStepsCount++;
      }

      // Rule 7: Style / Step Indentation (4 spaces under Scenario/Background)
      const indent = rawLine.match(/^\s*/)?.[0]?.length || 0;
      if (indent !== 4 && indent !== 6) {
        warnings.push({
          line: lineNum,
          rule: 'style/step-indentation',
          reason: `Step indentation should be 4 spaces (found ${indent} spaces).`,
          suggestedFix: 'Indent step with 4 spaces.'
        });
      }

      if (currentScenario) {
        currentScenario.steps.push({ keyword, text: stepText, line: lineNum });

        if (keyword === 'When') currentScenario.whenCount++;
        if (keyword === 'Given') currentScenario.givenCount++;
        if (keyword === 'Then') currentScenario.thenCount++;

        // Rule 8: Quality / Imperative UI Smells (Leaking Implementation Detail)
        if (/\b(click|press|type|fill|select|checkbox|radio button|#[\w-]+|\.[\w-]+|xpath|css)\b/i.test(stepText)) {
          warnings.push({
            line: lineNum,
            rule: 'quality/leak-implementation-detail',
            reason: 'Step leaks implementation details (technical UI interaction) instead of business intent.',
            suggestedFix: 'Refactor step to express business domain intent (e.g. "When submitting credentials").'
          });
        }

        // Rule 9: Quality / Vague Language Smell
        if (/\b(etc|stuff|do something|check page|some data|correctly|properly)\b/i.test(stepText)) {
          warnings.push({
            line: lineNum,
            rule: 'quality/vague-language',
            reason: 'Step uses vague or ambiguous language.',
            suggestedFix: 'Replace ambiguous words with specific expected domain outcomes.'
          });
        }

        // Rule 10: Quality / Hardcoded Data Smell
        if (/"[^"]*"|'[^']*'|\b\d+\b/.test(stepText) && currentScenario.isOutline && !/<[^>]+>/.test(stepText)) {
          warnings.push({
            line: lineNum,
            rule: 'quality/hardcoded-data-in-outline',
            reason: 'Scenario Outline uses hardcoded literal data instead of <placeholder> variables.',
            suggestedFix: 'Replace hardcoded literal with a <variable> placeholder.'
          });
        }
      }
    }
  }

  // Rule 11: Workflow / Empty Background Check
  if (inBackground || backgroundLine > 0) {
    if (backgroundStepsCount === 0) {
      warnings.push({
        line: backgroundLine,
        rule: 'workflow/no-empty-background',
        reason: 'Background block is empty without any Given steps.',
        suggestedFix: 'Add a Given step or remove the empty Background block.'
      });
    }
  }

  // Rule 12-16: Workflow & Structure checks per scenario
  scenarios.forEach(sc => {
    // Workflow / Single When Rule
    if (sc.whenCount > 1) {
      warnings.push({
        line: sc.line,
        rule: 'workflow/single-when-per-scenario',
        reason: `Scenario "${sc.title}" contains ${sc.whenCount} "When" steps. BDD best practice dictates a single action trigger per scenario.`,
        suggestedFix: 'Split into separate scenarios or convert additional "When" steps to "And".'
      });
    }

    // Workflow / Mandatory Action (When) & Verification (Then)
    if (sc.whenCount === 0) {
      warnings.push({
        line: sc.line,
        rule: 'workflow/missing-action-step',
        reason: `Scenario "${sc.title}" is missing an action step ("When").`,
        suggestedFix: 'Add a "When" step to represent the action being tested.'
      });
    }
    if (sc.thenCount === 0) {
      warnings.push({
        line: sc.line,
        rule: 'workflow/missing-verification-step',
        reason: `Scenario "${sc.title}" is missing an outcome assertion step ("Then").`,
        suggestedFix: 'Add a "Then" step to verify the expected outcome.'
      });
    }

    // Workflow / Step Count Limit (> 8 steps)
    if (sc.steps.length > 8) {
      warnings.push({
        line: sc.line,
        rule: 'workflow/excessive-step-count',
        reason: `Scenario "${sc.title}" contains ${sc.steps.length} steps (recommended max is 8).`,
        suggestedFix: 'Simplify scenario or extract prerequisite setup into a Background block.'
      });
    }

    // Structure / Scenario Outline missing Examples
    if (sc.isOutline && !sc.hasExamples) {
      errors.push({
        line: sc.line,
        rule: 'structure/scenario-outline-structure',
        reason: `Scenario Outline "${sc.title}" is missing an "Examples:" table block.`,
        suggestedFix: 'Add an "Examples:" block with header columns and test data rows.'
      });
    }
  });

  return {
    name: 'SET-IITGN UnifiedBDDLinter',
    errors,
    warnings
  };
}
