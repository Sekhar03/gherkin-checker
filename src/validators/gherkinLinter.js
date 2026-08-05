/**
 * gherkin-lint engine implementation
 * Extended with Gherkin Best Practices & Anti-Pattern Rules
 * https://github.com/gherkin-lint/gherkin-lint
 */

export function checkGherkinLint(gherkinText, _config = {}) {
  const result = {
    name: 'gherkin-lint',
    repo: 'https://github.com/gherkin-lint/gherkin-lint',
    description: 'Gherkin Best Practices & Code Quality Linter',
    pass: true,
    errors: [],
    warnings: []
  };

  if (!gherkinText || !gherkinText.trim()) {
    result.pass = false;
    result.errors.push({
      line: 1,
      text: '',
      category: 'Linter Error',
      rule: 'no-empty-file',
      reason: 'Gherkin file is empty. Linter requires feature content to validate quality rules.',
      fix: 'Add Feature and Scenario content to the file.',
      checker: 'gherkin-lint'
    });
    return result;
  }

  const lines = gherkinText.split('\n');
  const scenarioNames = new Set();
  let featureTitle = null;
  let featureCount = 0;
  let backgroundCount = 0;
  let scenarioCount = 0;
  let currentScenarioLine = null;
  let currentScenarioRawLine = null;
  let currentScenarioTitle = null;
  let currentScenarioType = null;
  let currentScenarioHasExamples = false;
  let currentScenarioStepCount = 0;
  let currentScenarioWhenCount = 0;
  let lastStepKeyword = null;
  let stepOrderState = 'INIT';
  let featureTags = new Set();

  const checkEndScenarioLimits = () => {
    if (currentScenarioLine !== null) {
      if (currentScenarioStepCount > 10) {
        result.warnings.push({
          line: currentScenarioLine,
          text: currentScenarioRawLine || '',
          category: 'Quality Warning',
          rule: 'scenario-step-limit',
          reason: `Scenario "${currentScenarioTitle}" has ${currentScenarioStepCount} steps (exceeds recommended max of 10 steps per scenario).`,
          fix: 'Shorten scenario by removing procedural setup steps or moving preconditions into Background.',
          checker: 'gherkin-lint'
        });
      }
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const rawLine = lines[i];
    const trimmedLine = rawLine.trim();

    if (!trimmedLine) continue;

    // Rule: no-trailing-spaces
    if (/\s+$/.test(rawLine)) {
      result.warnings.push({
        line: lineNum,
        text: rawLine,
        category: 'Formatting Warning',
        rule: 'no-trailing-spaces',
        reason: `Line ${lineNum} contains trailing whitespace characters at the end of the line.`,
        fix: 'Remove trailing spaces or tabs at the end of this line.',
        checker: 'gherkin-lint'
      });
    }

    // Tag check (@tag)
    if (trimmedLine.startsWith('@')) {
      const tags = trimmedLine.split(/\s+/);
      tags.forEach(tag => {
        if (!tag.startsWith('@')) return;
        
        // Rule: tag-convention (lowercase, hyphenated)
        if (tag !== tag.toLowerCase() || tag.includes('_')) {
          const suggestedTag = tag.toLowerCase().replace(/_/g, '-');
          result.warnings.push({
            line: lineNum,
            text: rawLine,
            category: 'Tag Warning',
            rule: 'tag-convention',
            reason: `Tag "${tag}" on line ${lineNum} violates naming conventions. Tags should be lowercase and hyphenated (e.g., @smoke-test).`,
            fix: `Rename tag "${tag}" to "${suggestedTag}".`,
            checker: 'gherkin-lint'
          });
        }

        if (featureCount === 1 && scenarioCount === 0) {
          featureTags.add(tag);
        } else if (scenarioCount > 0 && featureTags.has(tag)) {
          result.warnings.push({
            line: lineNum,
            text: rawLine,
            category: 'Tag Warning',
            rule: 'no-dupe-feature-scenario-tags',
            reason: `Tag "${tag}" is already applied at Feature level. Avoid repeating feature tags on individual scenarios.`,
            fix: `Remove duplicate tag "${tag}" from scenario level.`,
            checker: 'gherkin-lint'
          });
        }
      });
      continue;
    }

    if (trimmedLine.startsWith('#')) continue;

    // Feature check
    if (trimmedLine.startsWith('Feature:')) {
      featureCount++;
      const title = trimmedLine.replace(/^Feature:\s*/, '').trim();
      if (!title) {
        result.pass = false;
        result.errors.push({
          line: lineNum,
          text: rawLine,
          category: 'Naming Error',
          rule: 'no-unnamed-features',
          reason: 'Feature keyword is missing a descriptive name/title after "Feature:".',
          fix: 'Provide a clear feature title, e.g., "Feature: User Authentication System".',
          checker: 'gherkin-lint'
        });
      } else {
        featureTitle = title;
      }

      if (/^\s+Feature:/.test(rawLine)) {
        result.warnings.push({
          line: lineNum,
          text: rawLine,
          category: 'Indentation Warning',
          rule: 'indentation',
          reason: 'Feature keyword should start at column 0 (no leading spaces).',
          fix: 'Remove leading spaces before "Feature:".',
          checker: 'gherkin-lint'
        });
      }
      continue;
    }

    // Background check
    if (trimmedLine.startsWith('Background:')) {
      checkEndScenarioLimits();
      backgroundCount++;
      if (backgroundCount > 1) {
        result.pass = false;
        result.errors.push({
          line: lineNum,
          text: rawLine,
          category: 'Structure Error',
          rule: 'no-dupe-background',
          reason: 'Multiple "Background:" sections detected. A Feature can only have 1 Background block.',
          fix: 'Merge the steps into a single "Background:" block at the top of the feature.',
          checker: 'gherkin-lint'
        });
      }

      const indent = rawLine.match(/^\s*/)[0].length;
      if (indent !== 2) {
        result.warnings.push({
          line: lineNum,
          text: rawLine,
          category: 'Indentation Warning',
          rule: 'indentation',
          reason: `Background keyword is indented by ${indent} spaces. Expected exactly 2 spaces.`,
          fix: 'Indent "Background:" by exactly 2 spaces.',
          checker: 'gherkin-lint'
        });
      }
      continue;
    }

    // Scenario / Scenario Outline / Example check
    if (trimmedLine.startsWith('Scenario:') || trimmedLine.startsWith('Scenario Outline:') || trimmedLine.startsWith('Scenario Template:') || trimmedLine.startsWith('Example:')) {
      checkEndScenarioLimits();

      if (currentScenarioType === 'Scenario Outline' && !currentScenarioHasExamples) {
        result.pass = false;
        result.errors.push({
          line: currentScenarioLine,
          text: lines[currentScenarioLine - 1],
          category: 'Structure Error',
          rule: 'no-scenario-outlines-without-examples',
          reason: `Scenario Outline "${currentScenarioTitle}" on line ${currentScenarioLine} has no "Examples:" section defined.`,
          fix: 'Add an "Examples:" table with header columns and data rows under this Scenario Outline.',
          checker: 'gherkin-lint'
        });
      }

      scenarioCount++;
      currentScenarioLine = lineNum;
      currentScenarioRawLine = rawLine;
      currentScenarioType = trimmedLine.startsWith('Scenario Outline:') || trimmedLine.startsWith('Scenario Template:') ? 'Scenario Outline' : 'Scenario';
      currentScenarioHasExamples = false;
      currentScenarioStepCount = 0;
      currentScenarioWhenCount = 0;
      lastStepKeyword = null;
      stepOrderState = 'INIT';

      const title = trimmedLine.replace(/^(Scenario Outline:|Scenario Template:|Scenario:|Example:)\s*/, '').trim();
      currentScenarioTitle = title;

      if (!title) {
        result.pass = false;
        result.errors.push({
          line: lineNum,
          text: rawLine,
          category: 'Naming Error',
          rule: 'no-unnamed-scenarios',
          reason: `${currentScenarioType} is missing a descriptive title after "${currentScenarioType}:".`,
          fix: `Provide a descriptive name, e.g., "${currentScenarioType}: Successful Login".`,
          checker: 'gherkin-lint'
        });
      } else {
        if (scenarioNames.has(title)) {
          result.pass = false;
          result.errors.push({
            line: lineNum,
            text: rawLine,
            category: 'Duplicate Name Error',
            rule: 'no-dupe-scenario-names',
            reason: `Duplicate scenario title "${title}" detected. Every Scenario in a feature must have a unique title.`,
            fix: `Rename this scenario title so it is unique within the feature file.`,
            checker: 'gherkin-lint'
          });
        } else {
          scenarioNames.add(title);
        }
      }

      const indent = rawLine.match(/^\s*/)[0].length;
      if (indent !== 2) {
        result.warnings.push({
          line: lineNum,
          text: rawLine,
          category: 'Indentation Warning',
          rule: 'indentation',
          reason: `${currentScenarioType} keyword is indented by ${indent} spaces. Expected 2 spaces.`,
          fix: `Indent "${currentScenarioType}:" by 2 spaces.`,
          checker: 'gherkin-lint'
        });
      }
      continue;
    }

    // Examples section check
    if (trimmedLine.startsWith('Examples:') || trimmedLine.startsWith('Scenarios:')) {
      currentScenarioHasExamples = true;
      const indent = rawLine.match(/^\s*/)[0].length;
      if (indent !== 4 && indent !== 2) {
        result.warnings.push({
          line: lineNum,
          text: rawLine,
          category: 'Indentation Warning',
          rule: 'indentation',
          reason: `Examples section keyword is indented by ${indent} spaces. Recommended indentation is 4 spaces.`,
          fix: 'Indent "Examples:" by 4 spaces.',
          checker: 'gherkin-lint'
        });
      }
      continue;
    }

    // Step check (Given / When / Then / And / But / *)
    const stepMatch = trimmedLine.match(/^(Given|When|Then|And|But|\*)\b\s*(.*)/);
    if (stepMatch) {
      currentScenarioStepCount++;
      const keyword = stepMatch[1];
      const stepText = stepMatch[2].trim();
      const indent = rawLine.match(/^\s*/)[0].length;

      // Rule: indentation (steps should be 4 spaces)
      if (indent !== 4) {
        result.warnings.push({
          line: lineNum,
          text: rawLine,
          category: 'Indentation Warning',
          rule: 'indentation',
          reason: `Step "${keyword}" is indented by ${indent} spaces. Standard step indentation is 4 spaces.`,
          fix: `Indent step line by 4 spaces.`,
          checker: 'gherkin-lint'
        });
      }

      // Rule: no-ending-punctuation
      if (/[.,;:]$/.test(stepText)) {
        result.warnings.push({
          line: lineNum,
          text: rawLine,
          category: 'Style Warning',
          rule: 'no-ending-punctuation',
          reason: `Step line ${lineNum} ends with punctuation "${stepText.slice(-1)}". Gherkin style rules specify steps should not end with punctuation.`,
          fix: 'Remove trailing period or punctuation at the end of this step line.',
          checker: 'gherkin-lint'
        });
      }

      // Rule: imperative-steps-warning (imperative UI actions)
      if (/\b(clicks?|press(es)?|types?|enters? .* into (the|a)|opens? (a |the )?(web )?browser|navigates? to "http|on the keypad|the withdrawal button)\b/i.test(stepText)) {
        result.warnings.push({
          line: lineNum,
          text: rawLine,
          category: 'Anti-Pattern Warning',
          rule: 'imperative-steps-warning',
          reason: `Step describes low-level procedural/imperative UI detail ("${stepText}"). Prefer high-level declarative business language (describe what, not how).`,
          fix: 'Refactor step to express user intent (e.g. "When the user submits credentials").',
          checker: 'gherkin-lint'
        });
      }

      // Rule: no-first-person-perspective
      if (/\b(I|my)\b/.test(stepText) && !/\b(API|ID|IP)\b/.test(stepText)) {
        result.warnings.push({
          line: lineNum,
          text: rawLine,
          category: 'Style Warning',
          rule: 'no-first-person-perspective',
          reason: `Step uses first-person phrasing ("I" / "my"). Standard Gherkin guidelines prefer role-based actor phrasing.`,
          fix: 'Replace "I" / "my" with role/actor phrasing (e.g., "the customer", "the account balance").',
          checker: 'gherkin-lint'
        });
      }

      // Rule: conjunctive-step (combining multiple actions in one step)
      if (/\b\w+\s+and\s+\w+/i.test(stepText) && /\b(see|get|enter|click|press|submit|verify|check)\b/i.test(stepText)) {
        result.warnings.push({
          line: lineNum,
          text: rawLine,
          category: 'Anti-Pattern Warning',
          rule: 'conjunctive-step',
          reason: `Step contains conjunctive phrase "and" joining multiple actions or verifications into one step.`,
          fix: 'Split into two separate steps using "And" for improved modularity.',
          checker: 'gherkin-lint'
        });
      }

      // Rule: use-and (repeated consecutive Given/When/Then)
      if (lastStepKeyword === keyword && (keyword === 'Given' || keyword === 'When' || keyword === 'Then')) {
        result.warnings.push({
          line: lineNum,
          text: rawLine,
          category: 'Quality Warning',
          rule: 'use-and',
          reason: `Consecutive step repeats keyword "${keyword}". Standard Gherkin style recommends replacing consecutive ${keyword} steps with "And" or "But".`,
          fix: `Change "${keyword}" to "And" on line ${lineNum}.`,
          checker: 'gherkin-lint'
        });
      }
      if (keyword === 'Given' || keyword === 'When' || keyword === 'Then') {
        lastStepKeyword = keyword;
      }

      // Rule: keywords-in-logical-order & one-behavior-per-scenario
      if (keyword === 'Given') {
        if (stepOrderState === 'WHEN' || stepOrderState === 'THEN') {
          result.warnings.push({
            line: lineNum,
            text: rawLine,
            category: 'Flow Warning',
            rule: 'keywords-in-logical-order',
            reason: `"Given" step defined after "${stepOrderState}" step. Steps should follow logical Given ➔ When ➔ Then flow.`,
            fix: 'Move precondition "Given" steps above "When" and "Then" action steps.',
            checker: 'gherkin-lint'
          });
        } else {
          stepOrderState = 'GIVEN';
        }
      } else if (keyword === 'When') {
        currentScenarioWhenCount++;
        if (currentScenarioWhenCount > 1) {
          result.warnings.push({
            line: lineNum,
            text: rawLine,
            category: 'Anti-Pattern Warning',
            rule: 'one-behavior-per-scenario',
            reason: `Scenario contains multiple "When" actions (Line ${lineNum}). Each Scenario must cover exactly one unit of behavior.`,
            fix: 'Split into separate scenarios, each with one Given-When-Then sequence.',
            checker: 'gherkin-lint'
          });
        }
        if (stepOrderState === 'THEN') {
          result.warnings.push({
            line: lineNum,
            text: rawLine,
            category: 'Flow Warning',
            rule: 'keywords-in-logical-order',
            reason: `"When" action step defined after "THEN" assertion step. Steps should follow Given ➔ When ➔ Then flow.`,
            fix: 'Place "When" action steps before "Then" assertion steps.',
            checker: 'gherkin-lint'
          });
        } else {
          stepOrderState = 'WHEN';
        }
      } else if (keyword === 'Then') {
        stepOrderState = 'THEN';
      }
      continue;
    }

    if (trimmedLine.startsWith('|')) {
      const indent = rawLine.match(/^\s*/)[0].length;
      if (indent < 4) {
        result.warnings.push({
          line: lineNum,
          text: rawLine,
          category: 'Indentation Warning',
          rule: 'indentation',
          reason: `Table row is indented by ${indent} spaces. Recommended indentation is 6 spaces.`,
          fix: 'Indent table rows by 6 spaces under step or Examples.',
          checker: 'gherkin-lint'
        });
      }
    }
  }

  checkEndScenarioLimits();

  if (currentScenarioType === 'Scenario Outline' && !currentScenarioHasExamples) {
    result.pass = false;
    result.errors.push({
      line: currentScenarioLine,
      text: lines[currentScenarioLine - 1],
      category: 'Structure Error',
      rule: 'no-scenario-outlines-without-examples',
      reason: `Scenario Outline "${currentScenarioTitle}" on line ${currentScenarioLine} is missing an "Examples:" section.`,
      fix: 'Add an "Examples:" block with header columns and parameter data.',
      checker: 'gherkin-lint'
    });
  }

  if (backgroundCount > 0 && scenarioCount === 0) {
    result.pass = false;
    result.errors.push({
      line: 1,
      text: lines[0],
      category: 'Structure Error',
      rule: 'no-background-only-scenarios',
      reason: 'Feature defines a "Background:" section but contains zero Scenarios.',
      fix: 'Add at least 1 Scenario that uses the Background section.',
      checker: 'gherkin-lint'
    });
  }

  // Rule: feature-scenario-limit (>12 scenarios/file)
  if (scenarioCount > 12) {
    result.warnings.push({
      line: 1,
      text: featureTitle || 'Feature',
      category: 'Quality Warning',
      rule: 'feature-scenario-limit',
      reason: `Feature contains ${scenarioCount} scenarios (exceeds recommended limit of ~10–12 scenarios per feature file).`,
      fix: 'Split large feature file into smaller, focused feature files.',
      checker: 'gherkin-lint'
    });
  }

  if (result.errors.length > 0) {
    result.pass = false;
  }

  return result;
}
