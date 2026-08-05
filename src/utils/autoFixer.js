/**
 * Intelligent Gherkin Auto-Fixer Engine
 * Reads Gherkin code and detected errors/warnings, and repairs formatting, keywords,
 * missing headers, indentation, and step consistency automatically.
 */

export function autoFixGherkin(code) {
  if (!code || !code.trim()) {
    return `Feature: User Feature Specification

  Scenario: Successful operation with valid input
    Given the user is on the main page
    When the user submits valid data
    Then the system should process the request successfully`;
  }

  let lines = code.split('\n');

  // Pass 1: Trim trailing spaces on every line
  lines = lines.map(line => line.trimEnd());

  let hasFeature = false;
  let scenarioNamesSeen = new Map();
  let currentScenarioType = null;
  let currentScenarioHasExamples = false;

  const fixedLines = [];
  let inExamplesTable = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let trimmed = line.trim();

    // Preserve blank lines & comments
    if (!trimmed || trimmed.startsWith('#')) {
      fixedLines.push(trimmed);
      continue;
    }

    // Check Tags
    if (trimmed.startsWith('@')) {
      const tagIndent = hasFeature ? '  ' : '';
      fixedLines.push(tagIndent + trimmed);
      continue;
    }

    // Feature Keyword Fix (case insensitive, missing colon/name)
    if (/^feature\b/i.test(trimmed) || trimmed.startsWith('Feature:') || trimmed.startsWith('Feature')) {
      hasFeature = true;
      let title = trimmed.replace(/^feature\s*:?\s*/i, '').trim();
      if (!title) title = 'User Feature Specification';
      fixedLines.push(`Feature: ${title}`);
      continue;
    }

    // Background Keyword Fix
    if (/^background\b/i.test(trimmed) || trimmed.startsWith('Background:') || trimmed.startsWith('Background')) {
      let title = trimmed.replace(/^background\s*:?\s*/i, '').trim();
      const bgHeader = title ? `Background: ${title}` : 'Background:';
      fixedLines.push(`  ${bgHeader}`);
      continue;
    }

    // Scenario Outline / Scenario Template / Scenario Keyword Fix
    if (
      /^scenario\s+outline\b/i.test(trimmed) ||
      /^scenario\s+template\b/i.test(trimmed) ||
      /^scenario\b/i.test(trimmed) ||
      trimmed.startsWith('Scenario:') ||
      trimmed.startsWith('Scenario Outline:') ||
      trimmed.startsWith('Scenario Template:')
    ) {
      // If previous Scenario Outline was missing Examples, append Examples block first
      if (currentScenarioType === 'Scenario Outline' && !currentScenarioHasExamples) {
        fixedLines.push('    Examples:');
        fixedLines.push('      | param1 | param2 |');
        fixedLines.push('      | value1 | value2 |');
        fixedLines.push('');
      }

      let isOutline = /^scenario\s+(outline|template)\b/i.test(trimmed) || trimmed.startsWith('Scenario Outline:') || trimmed.startsWith('Scenario Template:');
      let keyword = isOutline ? 'Scenario Outline:' : 'Scenario:';
      let title = trimmed.replace(/^scenario\s*(outline|template)?\s*:?\s*/i, '').trim();

      if (!title) {
        title = isOutline ? 'Data Driven Operation' : 'Standard Operation Flow';
      }

      // De-duplicate scenario titles
      if (scenarioNamesSeen.has(title)) {
        const count = scenarioNamesSeen.get(title) + 1;
        scenarioNamesSeen.set(title, count);
        title = `${title} (${count})`;
      } else {
        scenarioNamesSeen.set(title, 1);
      }

      currentScenarioType = isOutline ? 'Scenario Outline' : 'Scenario';
      currentScenarioHasExamples = false;
      inExamplesTable = false;

      fixedLines.push(`  ${keyword} ${title}`);
      continue;
    }

    // Examples Keyword Fix
    if (/^examples\s*:?/i.test(trimmed) || trimmed.startsWith('Examples:')) {
      currentScenarioHasExamples = true;
      inExamplesTable = true;
      let title = trimmed.replace(/^examples\s*:?\s*/i, '').trim();
      const exHeader = title ? `Examples: ${title}` : 'Examples:';
      fixedLines.push(`    ${exHeader}`);
      continue;
    }

    // Table Row Fix
    if (trimmed.startsWith('|') || (inExamplesTable && trimmed.includes('|'))) {
      let tableRow = trimmed;
      if (!tableRow.startsWith('|')) tableRow = '| ' + tableRow;
      if (!tableRow.endsWith('|')) tableRow = tableRow + ' |';

      // Clean table cell spacing
      const cells = tableRow.split('|').slice(1, -1).map(c => c.trim());
      const formattedRow = '| ' + cells.join(' | ') + ' |';

      const tableIndent = inExamplesTable ? '      ' : '    ';
      fixedLines.push(tableIndent + formattedRow);
      continue;
    }

    // Step Keywords Fix: Given, When, Then, And, But (case-insensitive keyword matching)
    const stepMatch = trimmed.match(/^(given|when|then|and|but)\b/i);
    if (stepMatch) {
      const matchedKw = stepMatch[1].toLowerCase();
      const capitalizedKw = matchedKw.charAt(0).toUpperCase() + matchedKw.slice(1);
      const stepText = trimmed.slice(stepMatch[0].length).trim();

      fixedLines.push(`    ${capitalizedKw} ${stepText}`);
      continue;
    }

    // Generic line fallback
    fixedLines.push(line);
  }

  // Ensure Feature header exists
  if (!hasFeature) {
    fixedLines.unshift('Feature: User Feature Specification', '');
  }

  // If last Scenario Outline was missing Examples, append Examples table
  if (currentScenarioType === 'Scenario Outline' && !currentScenarioHasExamples) {
    fixedLines.push('    Examples:');
    fixedLines.push('      | param1 | param2 |');
    fixedLines.push('      | value1 | value2 |');
  }

  return fixedLines.join('\n');
}

/**
 * Fix a single line in Gherkin text given line number and error detail.
 */
export function fixSingleLine(code, lineNum, errorDetail) {
  if (!code) return code;
  const lines = code.split('\n');
  const index = lineNum - 1;

  if (index < 0 || index >= lines.length) return code;

  let line = lines[index];
  let trimmed = line.trim();

  if (errorDetail?.rule === 'indentation' || errorDetail?.category?.includes('Indentation')) {
    if (trimmed.startsWith('Feature:')) {
      lines[index] = trimmed;
    } else if (trimmed.startsWith('Scenario:') || trimmed.startsWith('Scenario Outline:') || trimmed.startsWith('Background:')) {
      lines[index] = '  ' + trimmed;
    } else if (/^(Given|When|Then|And|But)\b/i.test(trimmed)) {
      lines[index] = '    ' + trimmed;
    } else if (trimmed.startsWith('Examples:')) {
      lines[index] = '    ' + trimmed;
    } else if (trimmed.startsWith('|')) {
      lines[index] = '      ' + trimmed;
    }
  } else if (errorDetail?.rule === 'no-trailing-spaces' || /\s+$/.test(line)) {
    lines[index] = line.trimEnd();
  } else if (/^(given|when|then|and|but)\b/i.test(trimmed)) {
    const stepMatch = trimmed.match(/^(given|when|then|and|but)\b/i);
    if (stepMatch) {
      const matchedKw = stepMatch[1].toLowerCase();
      const capitalizedKw = matchedKw.charAt(0).toUpperCase() + matchedKw.slice(1);
      const stepText = trimmed.slice(stepMatch[0].length).trim();
      lines[index] = `    ${capitalizedKw} ${stepText}`;
    }
  } else {
    return autoFixGherkin(code);
  }

  return lines.join('\n');
}
