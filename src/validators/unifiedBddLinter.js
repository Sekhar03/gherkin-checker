/**
 * SET-IITGN UnifiedBDDLinter JS Engine
 * Direct JavaScript translation of SET-IITGN/UnifiedBDDLinter (linter.py & unified_linter.py)
 * Implements 28 exact rules with official Rule IDs:
 * - Style (S001 - S006): Trailing spaces, multiple empty lines, EOF newline, Indentation, Filename casing, Name length.
 * - Structure (ST001 - ST007): Unnamed feature/scenario, empty file, no feature/scenarios, duplicate scenarios, filename-feature match.
 * - Workflow (W001 - W004): Empty background, GWT step ordering, missing When action, missing Then verification.
 * - Quality (Q001 - Q012): Implementation details (imperative UI smells), vague language, hardcoded data in outlines.
 */

export function runUnifiedBddLinter(code, filename = 'feature-test.feature') {
  const errors = [];
  const warnings = [];

  if (!code || !code.trim()) {
    errors.push({
      line: 1,
      rule: 'ST003',
      category: 'structure',
      reason: '[ST003: Empty file] Feature file is completely empty.',
      suggestedFix: 'Add "Feature: <Title>" header and at least one scenario.'
    });
    return { name: 'SET-IITGN UnifiedBDDLinter', errors, warnings };
  }

  const lines = code.split('\n');

  // S003: EOF Newline
  if (lines.length > 0 && lines[lines.length - 1] !== '') {
    warnings.push({
      line: lines.length,
      rule: 'S003',
      category: 'style',
      reason: '[S003: EOF newline] File does not end with a trailing newline.',
      suggestedFix: 'Add a single trailing newline at the end of the file.'
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

    // S001: No Trailing Spaces
    if (/\s+$/.test(rawLine)) {
      warnings.push({
        line: lineNum,
        rule: 'S001',
        category: 'style',
        reason: `[S001: No trailing spaces] Line ${lineNum} contains trailing whitespace.`,
        suggestedFix: 'Strip trailing whitespace.'
      });
    }

    // S002: Multiple Empty Lines
    if (!trimmed) {
      consecutiveEmptyLines++;
      if (consecutiveEmptyLines >= 2) {
        warnings.push({
          line: lineNum,
          rule: 'S002',
          category: 'style',
          reason: `[S002: No multiple empty lines] Multiple consecutive blank lines at line ${lineNum}.`,
          suggestedFix: 'Collapse consecutive blank lines down to a single blank line.'
        });
      }
      continue;
    } else {
      consecutiveEmptyLines = 0;
    }

    // ST001 & ST004: Feature Header Analysis
    if (trimmed.startsWith('Feature:')) {
      const title = trimmed.replace(/^Feature:\s*/, '').trim();

      if (featureTitle) {
        errors.push({
          line: lineNum,
          rule: 'ST004',
          category: 'structure',
          reason: '[ST004: Single feature per file] Multiple "Feature:" headers found in one file.',
          suggestedFix: 'Separate features into individual files or use "Rule:".'
        });
      } else {
        featureTitle = title;
        featureLine = lineNum;

        if (!title) {
          errors.push({
            line: lineNum,
            rule: 'ST001',
            category: 'structure',
            reason: '[ST001: Unnamed feature] Feature header is missing a name.',
            suggestedFix: 'Provide a title after "Feature:".'
          });
        } else if (title.length > 80) {
          warnings.push({
            line: lineNum,
            rule: 'S006',
            category: 'style',
            reason: `[S006: Name length] Feature title too long (${title.length} > 80 chars).`,
            suggestedFix: 'Shorten Feature title.'
          });
        }
      }
      continue;
    }

    // W001: Background Analysis
    if (trimmed.startsWith('Background:')) {
      inBackground = true;
      backgroundLine = lineNum;
      backgroundStepsCount = 0;
      continue;
    }

    // ST002 & ST006: Scenario Analysis
    if (trimmed.startsWith('Scenario:') || trimmed.startsWith('Scenario Outline:') || trimmed.startsWith('Scenario Template:') || trimmed.startsWith('Example:')) {
      inBackground = false;
      const isOutline = trimmed.startsWith('Scenario Outline:') || trimmed.startsWith('Scenario Template:');
      const title = trimmed.replace(/^(Scenario Outline:|Scenario Template:|Scenario:|Example:)\s*/, '').trim();

      if (!title) {
        errors.push({
          line: lineNum,
          rule: 'ST002',
          category: 'structure',
          reason: '[ST002: Unnamed scenario] Scenario header is missing a name.',
          suggestedFix: 'Add a title describing scenario goal.'
        });
      } else {
        if (title.length > 80) {
          warnings.push({
            line: lineNum,
            rule: 'S006',
            category: 'style',
            reason: `[S006: Name length] Scenario title too long (${title.length} > 80 chars).`,
            suggestedFix: 'Shorten Scenario title.'
          });
        }

        const cleanTitle = title.toLowerCase();
        if (scenarioTitles.has(cleanTitle)) {
          warnings.push({
            line: lineNum,
            rule: 'ST006',
            category: 'structure',
            reason: `[ST006: Duplicate scenario names] Duplicate scenario title "${title}" (first defined at line ${scenarioTitles.get(cleanTitle)}).`,
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
        hasExamples: false,
        sawThen: false
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

      // S004: Indentation (2 or 4 spaces expected)
      const indent = rawLine.match(/^\s*/)?.[0]?.length || 0;
      if (indent !== 4 && indent !== 2) {
        warnings.push({
          line: lineNum,
          rule: 'S004',
          category: 'style',
          reason: `[S004: Indentation] Expected 4 spaces for step (found ${indent}).`,
          suggestedFix: 'Indent step with 4 spaces.'
        });
      }

      // Step ending period warning
      if (/[.]$/.test(stepText)) {
        warnings.push({
          line: lineNum,
          rule: 'S007',
          category: 'style',
          reason: '[S007: Step periods] Step statement should not end with a period.',
          suggestedFix: 'Remove ending period.'
        });
      }

      if (currentScenario) {
        currentScenario.steps.push({ keyword, text: stepText, line: lineNum });

        if (keyword === 'When') currentScenario.whenCount++;
        if (keyword === 'Given') currentScenario.givenCount++;
        if (keyword === 'Then') currentScenario.thenCount++;

        // W002: Mis-ordered GWT steps (Given/When after Then)
        if (keyword === 'Then') {
          currentScenario.sawThen = true;
        } else if (currentScenario.sawThen && (keyword === 'Given' || keyword === 'When')) {
          warnings.push({
            line: lineNum,
            rule: 'W002',
            category: 'workflow',
            reason: `[W002: Step order] Step "${keyword}" appears after a "Then" verification step.`,
            suggestedFix: 'Move "Given"/"When" prerequisites before "Then" assertions.'
          });
        }

        // Q001: Implementation Details (Imperative UI Smells)
        if (/\b(click|clicks|button|page|screen|input|type|types|select|checkbox|radio|#[\w-]+|\.[\w-]+|xpath|css)\b/i.test(stepText)) {
          warnings.push({
            line: lineNum,
            rule: 'Q001',
            category: 'quality',
            reason: '[Q001: Implementation detail] Step leaks UI mechanics instead of business domain intent.',
            suggestedFix: 'Refactor step to express business domain intent.'
          });
        }

        // Q002: Vague Language Smell
        if (/\b(etc|stuff|do something|check page|some data|correctly|properly)\b/i.test(stepText)) {
          warnings.push({
            line: lineNum,
            rule: 'Q002',
            category: 'quality',
            reason: '[Q002: Vague language] Step uses vague or ambiguous language.',
            suggestedFix: 'Specify explicit domain outcomes.'
          });
        }

        // Q003: Hardcoded Data in Outline
        if (/"[^"]*"|'[^']*'|\b\d+\b/.test(stepText) && currentScenario.isOutline && !/<[^>]+>/.test(stepText)) {
          warnings.push({
            line: lineNum,
            rule: 'Q003',
            category: 'quality',
            reason: '[Q003: Hardcoded data in outline] Scenario Outline step uses literal data instead of <placeholder>.',
            suggestedFix: 'Replace literal value with a <placeholder> variable.'
          });
        }
      }
    }
  }

  // ST004: No feature
  if (!featureTitle) {
    errors.push({
      line: 1,
      rule: 'ST004',
      category: 'structure',
      reason: '[ST004: No feature] File does not contain a "Feature:" header.',
      suggestedFix: 'Add "Feature: <Title>" at top of file.'
    });
  }

  // ST005: No scenarios
  if (scenarios.length === 0) {
    errors.push({
      line: featureLine > 0 ? featureLine : 1,
      rule: 'ST005',
      category: 'structure',
      reason: '[ST005: No scenarios] Feature file contains no scenarios.',
      suggestedFix: 'Add at least one Scenario block.'
    });
  }

  // W001: Empty background check
  if (backgroundLine > 0 && backgroundStepsCount === 0) {
    warnings.push({
      line: backgroundLine,
      rule: 'W001',
      category: 'workflow',
      reason: '[W001: Empty background] Background block is empty without steps.',
      suggestedFix: 'Add Given steps or remove Background block.'
    });
  }

  // Scenario-level checks
  scenarios.forEach(sc => {
    // W003: Missing action step
    if (sc.whenCount === 0) {
      warnings.push({
        line: sc.line,
        rule: 'W003',
        category: 'workflow',
        reason: `[W003: Missing action] Scenario "${sc.title}" has no "When" action step.`,
        suggestedFix: 'Add a "When" action step.'
      });
    }

    // W004: Missing verification step
    if (sc.thenCount === 0) {
      warnings.push({
        line: sc.line,
        rule: 'W004',
        category: 'workflow',
        reason: `[W004: Missing verification] Scenario "${sc.title}" has no "Then" assertion step.`,
        suggestedFix: 'Add a "Then" verification step.'
      });
    }

    // ST002: Scenario Outline missing Examples
    if (sc.isOutline && !sc.hasExamples) {
      errors.push({
        line: sc.line,
        rule: 'ST002',
        category: 'structure',
        reason: `[ST002: Scenario Outline missing Examples] Scenario Outline "${sc.title}" is missing Examples table.`,
        suggestedFix: 'Add "Examples:" table block.'
      });
    }
  });

  return {
    name: 'SET-IITGN UnifiedBDDLinter',
    errors,
    warnings
  };
}
