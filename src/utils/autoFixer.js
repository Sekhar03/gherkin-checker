/**
 * Comprehensive Gherkin Auto-Fixer Engine
 * Automatically repairs all syntax errors, linter violations, step inconsistencies,
 * missing Examples tables/columns, unclosed quotes, and indentation for all 4 checkers.
 */

export function autoFixGherkin(code) {
  if (!code || !code.trim()) {
    return `Feature: User Feature Specification

  Scenario: Successful operation with valid input
    Given the user is on the main page
    When the user submits valid data
    Then the system should process the request successfully`;
  }

  // Pre-pass: Handle multiple Feature definitions & multiple Background sections
  let featureCount = 0;
  let backgroundCount = 0;
  let activeRuleBackgroundSteps = [];

  const preProcessedLines = [];
  const rawInputLines = code.split('\n');

  for (let i = 0; i < rawInputLines.length; i++) {
    let line = rawInputLines[i];
    let trimmed = line.trim();

    // Fix trailing unmatched single quote e.g. balance' -> balance
    if (trimmed.endsWith("'") && (trimmed.match(/'/g) || []).length % 2 !== 0) {
      line = line.slice(0, line.lastIndexOf("'"));
      trimmed = line.trim();
    }

    // Convert 2nd+ Feature: to Rule: (Gherkin 6+ standard for multi-domain feature files)
    if (/^feature\b/i.test(trimmed) || trimmed.startsWith('Feature:') || trimmed.startsWith('Feature')) {
      featureCount++;
      if (featureCount > 1) {
        let title = trimmed.replace(/^feature\s*:?\s*/i, '').trim() || 'Additional Feature Rules';
        preProcessedLines.push(`Rule: ${title}`);
        activeRuleBackgroundSteps = [];
        continue;
      }
    }

    // Handle secondary Background: blocks under Rules
    if (/^background\b/i.test(trimmed) || trimmed.startsWith('Background:') || trimmed.startsWith('Background')) {
      backgroundCount++;
      if (backgroundCount > 1) {
        activeRuleBackgroundSteps = [];
        i++;
        while (i < rawInputLines.length) {
          let bgLine = rawInputLines[i];
          let bgTrimmed = bgLine.trim();
          if (/^(scenario|scenario outline|rule|feature)\b/i.test(bgTrimmed) || bgTrimmed.startsWith('Scenario:') || bgTrimmed.startsWith('Rule:') || bgTrimmed.startsWith('Feature:')) {
            i--;
            break;
          }
          if (bgTrimmed && !bgTrimmed.startsWith('#')) {
            activeRuleBackgroundSteps.push(bgTrimmed);
          }
          i++;
        }
        continue;
      }
    }

    // Inject active Rule Background steps before first step of Scenario
    if (activeRuleBackgroundSteps.length > 0 && (/^(scenario|scenario outline)\b/i.test(trimmed) || trimmed.startsWith('Scenario:') || trimmed.startsWith('Scenario Outline:'))) {
      preProcessedLines.push(line);
      activeRuleBackgroundSteps.forEach(step => {
        preProcessedLines.push('    ' + step);
      });
      continue;
    }

    preProcessedLines.push(line);
  }

  let rawLines = preProcessedLines.map(l => l.trimEnd());

  // Step 1: Pre-process block structure (Feature, Scenarios, Backgrounds, Outlines, Examples, Rules)
  let hasFeature = false;
  const blocks = [];
  let currentBlock = null;

  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i];
    let trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      if (currentBlock) {
        currentBlock.lines.push(line);
      } else {
        blocks.push({ type: 'header', lines: [line] });
      }
      continue;
    }

    if (/^feature\b/i.test(trimmed) || trimmed.startsWith('Feature:') || trimmed.startsWith('Feature')) {
      hasFeature = true;
      let title = trimmed.replace(/^feature\s*:?\s*/i, '').trim() || 'User Feature Specification';
      currentBlock = { type: 'feature', title, lines: [] };
      blocks.push(currentBlock);
      continue;
    }

    if (/^rule\b/i.test(trimmed) || trimmed.startsWith('Rule:')) {
      let title = trimmed.replace(/^rule\s*:?\s*/i, '').trim() || 'Business Rule';
      currentBlock = { type: 'rule', title, lines: [] };
      blocks.push(currentBlock);
      continue;
    }

    if (trimmed.startsWith('@')) {
      if (currentBlock) {
        currentBlock.lines.push(line);
      } else {
        currentBlock = { type: 'tags', lines: [line] };
        blocks.push(currentBlock);
      }
      continue;
    }

    if (/^background\b/i.test(trimmed) || trimmed.startsWith('Background:') || trimmed.startsWith('Background')) {
      let title = trimmed.replace(/^background\s*:?\s*/i, '').trim();
      currentBlock = { type: 'background', title, lines: [] };
      blocks.push(currentBlock);
      continue;
    }

    if (
      /^scenario\s+outline\b/i.test(trimmed) ||
      /^scenario\s+template\b/i.test(trimmed) ||
      /^scenario\b/i.test(trimmed) ||
      trimmed.startsWith('Scenario:') ||
      trimmed.startsWith('Scenario Outline:') ||
      trimmed.startsWith('Scenario Template:')
    ) {
      let isOutline = /^scenario\s+(outline|template)\b/i.test(trimmed) || trimmed.startsWith('Scenario Outline:') || trimmed.startsWith('Scenario Template:');
      let title = trimmed.replace(/^scenario\s*(outline|template)?\s*:?\s*/i, '').trim();
      currentBlock = { type: isOutline ? 'outline' : 'scenario', title, lines: [] };
      blocks.push(currentBlock);
      continue;
    }

    if (/^examples\s*:?/i.test(trimmed) || trimmed.startsWith('Examples:')) {
      let title = trimmed.replace(/^examples\s*:?\s*/i, '').trim();
      currentBlock = { type: 'examples', title, lines: [] };
      blocks.push(currentBlock);
      continue;
    }

    if (currentBlock) {
      currentBlock.lines.push(line);
    } else {
      currentBlock = { type: 'generic', lines: [line] };
      blocks.push(currentBlock);
    }
  }

  // Step 2: Reconstruct clean Gherkin document with strict rule compliance
  const outputLines = [];
  if (!hasFeature) {
    outputLines.push('Feature: User Feature Specification', '');
  }

  const scenarioTitlesSeen = new Map();
  let inOutline = false;
  let outlinePlaceholders = new Set();
  let outlineHasExamples = false;
  let outlineExamplesHeader = [];
  let outlineExamplesRows = [];
  let lastKeyword = null;

  function flushOutlineExamples() {
    if (!inOutline) return;
    if (!outlineHasExamples) {
      outputLines.push('    Examples:');
      const phList = Array.from(outlinePlaceholders);
      if (phList.length > 0) {
        outputLines.push(`      | ${phList.join(' | ')} |`);
        outputLines.push(`      | ${phList.map(p => `${p}_val`).join(' | ')} |`);
      } else {
        outputLines.push('      | param1 | param2 |');
        outputLines.push('      | value1 | value2 |');
      }
      outputLines.push('');
    } else if (outlineExamplesHeader.length > 0) {
      const phList = Array.from(outlinePlaceholders);
      let updatedHeader = [...outlineExamplesHeader];

      phList.forEach(ph => {
        if (!updatedHeader.includes(ph)) {
          updatedHeader.push(ph);
        }
      });

      outputLines.push('    Examples:');
      outputLines.push(`      | ${updatedHeader.join(' | ')} |`);

      if (outlineExamplesRows.length > 0) {
        outlineExamplesRows.forEach(row => {
          let updatedRow = [...row];
          while (updatedRow.length < updatedHeader.length) {
            const addedColIndex = updatedRow.length;
            const colName = updatedHeader[addedColIndex] || 'val';
            updatedRow.push(`${colName}_1`);
          }
          outputLines.push(`      | ${updatedRow.join(' | ')} |`);
        });
      } else {
        outputLines.push(`      | ${updatedHeader.map(h => `${h}_val`).join(' | ')} |`);
      }
      outputLines.push('');
    }
    inOutline = false;
    outlineHasExamples = false;
    outlinePlaceholders.clear();
    outlineExamplesHeader = [];
    outlineExamplesRows = [];
  }

  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b];

    if (block.type === 'feature') {
      flushOutlineExamples();
      outputLines.push(`Feature: ${block.title}`);
      lastKeyword = null;
      continue;
    }

    if (block.type === 'rule') {
      flushOutlineExamples();
      outputLines.push(`\nRule: ${block.title}`);
      lastKeyword = null;
      continue;
    }

    if (block.type === 'background') {
      flushOutlineExamples();
      outputLines.push(`  ${block.title ? `Background: ${block.title}` : 'Background:'}`);
      lastKeyword = null;
      processBlockLines(block.lines, outputLines, '    ', (kw) => { lastKeyword = kw; }, lastKeyword);
      continue;
    }

    if (block.type === 'scenario') {
      flushOutlineExamples();
      let title = block.title || 'Standard User Operation';
      if (scenarioTitlesSeen.has(title)) {
        const count = scenarioTitlesSeen.get(title) + 1;
        scenarioTitlesSeen.set(title, count);
        title = `${title} (${count})`;
      } else {
        scenarioTitlesSeen.set(title, 1);
      }
      outputLines.push(`  Scenario: ${title}`);
      lastKeyword = null;
      processBlockLines(block.lines, outputLines, '    ', (kw) => { lastKeyword = kw; }, lastKeyword);
      continue;
    }

    if (block.type === 'outline') {
      flushOutlineExamples();
      inOutline = true;
      let title = block.title || 'Data Driven Operation';
      if (scenarioTitlesSeen.has(title)) {
        const count = scenarioTitlesSeen.get(title) + 1;
        scenarioTitlesSeen.set(title, count);
        title = `${title} (${count})`;
      } else {
        scenarioTitlesSeen.set(title, 1);
      }
      outputLines.push(`  Scenario Outline: ${title}`);
      lastKeyword = null;

      processBlockLines(block.lines, outputLines, '    ', (kw) => { lastKeyword = kw; }, lastKeyword, (ph) => {
        outlinePlaceholders.add(ph);
      });
      continue;
    }

    if (block.type === 'examples') {
      if (!inOutline) {
        outputLines.push('  Scenario Outline: Data Driven User Flow');
        inOutline = true;
      }
      outlineHasExamples = true;

      block.lines.forEach(line => {
        let trimmed = line.trim();
        if (trimmed.startsWith('|') || trimmed.includes('|')) {
          let tableRow = trimmed;
          if (!tableRow.startsWith('|')) tableRow = '| ' + tableRow;
          if (!tableRow.endsWith('|')) tableRow = tableRow + ' |';
          const cells = tableRow.split('|').slice(1, -1).map(c => c.trim());

          if (outlineExamplesHeader.length === 0) {
            outlineExamplesHeader = cells;
          } else {
            outlineExamplesRows.push(cells);
          }
        }
      });
      continue;
    }

    if (block.type === 'tags') {
      block.lines.forEach(line => {
        let trimmed = line.trim();
        if (trimmed) {
          outputLines.push('  ' + trimmed);
        }
      });
      continue;
    }

    if (block.lines.length > 0) {
      let isTableOnly = block.lines.every(l => {
        let t = l.trim();
        return !t || t.startsWith('#') || t.startsWith('|') || t.includes('|');
      });

      if (isTableOnly && inOutline && !outlineHasExamples) {
        outlineHasExamples = true;
        block.lines.forEach(line => {
          let trimmed = line.trim();
          if (trimmed.startsWith('|') || trimmed.includes('|')) {
            let tableRow = trimmed;
            if (!tableRow.startsWith('|')) tableRow = '| ' + tableRow;
            if (!tableRow.endsWith('|')) tableRow = tableRow + ' |';
            const cells = tableRow.split('|').slice(1, -1).map(c => c.trim());

            if (outlineExamplesHeader.length === 0) {
              outlineExamplesHeader = cells;
            } else {
              outlineExamplesRows.push(cells);
            }
          }
        });
      } else {
        processBlockLines(block.lines, outputLines, '    ', (kw) => { lastKeyword = kw; }, lastKeyword);
      }
    }
  }

  flushOutlineExamples();

  return outputLines.join('\n').replace(/\n{3,}/g, '\n\n');
}


function processBlockLines(lines, outputArr, indent, onKeywordChange, initialLastKeyword, onPlaceholderFound) {
  let lastKw = initialLastKeyword || null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      outputArr.push(trimmed);
      continue;
    }

    // Table rows inside steps
    if (trimmed.startsWith('|') || trimmed.includes('|')) {
      let tableRow = trimmed;
      if (!tableRow.startsWith('|')) tableRow = '| ' + tableRow;
      if (!tableRow.endsWith('|')) tableRow = tableRow + ' |';

      const cells = tableRow.split('|').slice(1, -1).map(c => c.trim());
      const formattedRow = '| ' + cells.join(' | ') + ' |';
      outputArr.push('      ' + formattedRow);
      continue;
    }

    // Step keywords (Given, When, Then, And, But)
    const stepMatch = trimmed.match(/^(given|when|then|and|but)\b/i);
    if (stepMatch) {
      let kw = stepMatch[1].toLowerCase();
      let capKw = kw.charAt(0).toUpperCase() + kw.slice(1);
      let stepText = trimmed.slice(stepMatch[0].length).trim();

      // Rule 1: Fix dangling And/But step before any Given/When/Then
      if ((capKw === 'And' || capKw === 'But') && !lastKw) {
        capKw = 'Given';
      }

      // Rule 2: Fix repeated consecutive keywords (Given...Given -> Given...And)
      if (capKw === 'Given' || capKw === 'When' || capKw === 'Then') {
        if (lastKw === capKw) {
          capKw = 'And';
        } else {
          lastKw = capKw;
        }
      }

      onKeywordChange?.(lastKw);

      // Rule 3: Fix unclosed double quotes
      const dQuotes = (stepText.match(/"/g) || []).length;
      if (dQuotes % 2 !== 0) {
        stepText += '"';
      }

      // Rule 4: Fix unclosed single quotes
      const sQuotes = (stepText.match(/'/g) || []).length;
      if (sQuotes % 2 !== 0) {
        stepText += "'";
      }

      // Extract placeholders e.g. <param>
      if (onPlaceholderFound) {
        const phMatches = stepText.match(/<([^>]+)>/g);
        if (phMatches) {
          phMatches.forEach(m => {
            onPlaceholderFound(m.replace(/[<>]/g, '').trim());
          });
        }
      }

      outputArr.push(`${indent}${capKw} ${stepText}`);
      continue;
    }

    // Fallback line
    outputArr.push(line);
  }
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

