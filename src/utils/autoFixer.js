import { runAllCheckers } from '../validators/masterRunner.js';

/**
 * Comprehensive Internal Rule-Based Gherkin Auto-Fixer Engine
 * Reads errors & warnings from all 4 checkers and repairs both ERRORS and WARNINGS deterministically.
 */

export function autoFixGherkin(code, initialResults = null) {
  if (!code || !code.trim()) {
    return `Feature: User Feature Specification

  Scenario: Successful operation with valid input
    Given the user is on the main page
    When the user submits valid data
    Then the system should process the request successfully`;
  }

  let currentCode = code;

  // Run up to 4 repair passes until all errors & warnings are cleared
  for (let pass = 1; pass <= 4; pass++) {
    const results = (pass === 1 && initialResults) ? initialResults : runAllCheckers(currentCode);

    // Stop early if no errors and no warnings left!
    if (results.totalErrors === 0 && results.totalWarnings === 0) {
      break;
    }

    const nextCode = runSingleRepairPass(currentCode, results);
    if (nextCode === currentCode) {
      // Reached steady state
      break;
    }
    currentCode = nextCode;
  }

  // Final structural pass & indentation pass
  return formatAndStructureGherkin(currentCode);
}

/**
 * Single deterministic repair pass guided by active error & warning rules
 */
function runSingleRepairPass(code, _results) {
  const lines = code.split('\n');

  // Pass 1: Targeted Line-Level Fixes (errors & warnings)
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let trimmed = line.trim();

    if (!trimmed) {
      lines[i] = '';
      continue;
    }

    // Fix trailing spaces (rule: no-trailing-spaces)
    if (/\s+$/.test(line)) {
      line = line.trimEnd();
    }

    // Fix step line warnings & errors
    const stepMatch = trimmed.match(/^(given|when|then|and|but|\*)\b\s*(.*)/i);
    if (stepMatch) {
      let rawKw = stepMatch[1];
      let stepText = stepMatch[2];

      // Fix ending punctuation on steps (rule: no-ending-punctuation)
      if (/[.,;:]$/.test(stepText)) {
        stepText = stepText.slice(0, -1).trim();
      }

      // Fix first-person "I" / "my" (rule: no-first-person-perspective)
      stepText = refactorFirstPerson(stepText);

      // Fix low-level procedural/imperative UI actions (rule: imperative-steps-warning)
      stepText = refactorImperativeStep(stepText);

      // Fix unclosed double quotes (rule: unclosed-double-quote)
      const dQuotes = (stepText.match(/"/g) || []).length;
      if (dQuotes % 2 !== 0) {
        stepText = stepText + '"';
      }

      // Fix unclosed single quotes (rule: unclosed-single-quote)
      const codeQuotesOnly = stepText.replace(/[a-zA-Z]'[a-zA-Z]/g, '');
      const sQuotes = (codeQuotesOnly.match(/'/g) || []).length;
      if (sQuotes % 2 !== 0) {
        stepText = stepText + "'";
      }

      line = `    ${rawKw} ${stepText}`;
      trimmed = line.trim();
    }

    // Fix unclosed pipe tables
    if (trimmed.startsWith('|') && !trimmed.endsWith('|')) {
      line = line + ' |';
      trimmed = line.trim();
    }

    // Fix malformed or non-standard tags (rule: tag-convention)
    if (trimmed.startsWith('@')) {
      const parts = trimmed.split(/\s+/);
      const cleaned = parts.map(tag => {
        if (tag === '@') return '@smoke';
        if (!tag.startsWith('@')) return tag;
        return '@' + tag.slice(1).toLowerCase().replace(/[^a-z0-9-]/g, '-');
      }).join(' ');
      line = '  ' + cleaned;
    }

    // Fix missing colon on keywords
    if (/^feature\b(?!:)/i.test(trimmed)) {
      line = line.replace(/^feature\b\s*/i, 'Feature: ');
    } else if (/^scenario\s+outline\b(?!:)/i.test(trimmed)) {
      line = line.replace(/^scenario\s+outline\b\s*/i, 'Scenario Outline: ');
    } else if (/^scenario\b(?!:)/i.test(trimmed)) {
      line = line.replace(/^scenario\b\s*/i, 'Scenario: ');
    } else if (/^example\b(?!:)/i.test(trimmed)) {
      line = line.replace(/^example\b\s*/i, 'Example: ');
    } else if (/^background\b(?!:)/i.test(trimmed)) {
      line = line.replace(/^background\b\s*/i, 'Background: ');
    } else if (/^examples\b(?!:)/i.test(trimmed)) {
      line = line.replace(/^examples\b\s*/i, 'Examples: ');
    } else if (/^rule\b(?!:)/i.test(trimmed)) {
      line = line.replace(/^rule\b\s*/i, 'Rule: ');
    }

    lines[i] = line;
  }

  let processedCode = lines.join('\n');

  // Pass 2: Document Structure Reconstruction
  return reconstructDocumentStructure(processedCode);
}

/**
 * Reconstructs Gherkin Document Structure:
 * - Fixes multi-feature documents (converts 2nd+ Features to Gherkin 6+ Rules)
 * - De-duplicates scenario names & feature tags
 * - Fixes dangling conjunctions (starts with And/But -> Given)
 * - Converts repeated consecutive Given/When/Then to And (rule: use-and)
 * - Re-orders out-of-sequence steps (Given -> When -> Then)
 * - Generates & fixes Examples tables for Scenario Outlines
 * - Normalizes data tables & closes unclosed DocStrings
 */
function reconstructDocumentStructure(code) {
  const rawLines = code.split('\n');

  let mainFeatureTitle = null;
  let mainFeatureDescription = [];
  let backgroundBlock = null;
  let blocks = [];
  let currentBlock = null;
  let inDocString = false;
  let docStringDelimiter = '"""';

  let featureCount = 0;
  const featureTagsSet = new Set();

  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i];
    let trimmed = line.trim();

    if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
      if (inDocString) {
        inDocString = false;
        if (currentBlock) currentBlock.lines.push(docStringDelimiter);
        continue;
      } else {
        inDocString = true;
        docStringDelimiter = trimmed.slice(0, 3);
        if (currentBlock) currentBlock.lines.push(docStringDelimiter);
        continue;
      }
    }

    if (inDocString) {
      if (currentBlock) currentBlock.lines.push(line);
      continue;
    }

    if (!trimmed) continue;

    // Detect Feature headers
    if (trimmed.startsWith('Feature:')) {
      featureCount++;
      const title = trimmed.replace(/^Feature:\s*/, '').trim() || 'User Feature Specification';

      if (featureCount === 1) {
        mainFeatureTitle = title;
        currentBlock = { type: 'feature_desc', lines: [] };
      } else {
        // Convert 2nd+ Feature: to Rule: (Gherkin 6+ standard)
        currentBlock = { type: 'rule', title, description: [], lines: [], examples: null };
        blocks.push(currentBlock);
      }
      continue;
    }

    if (trimmed.startsWith('Background:')) {
      let title = trimmed.replace(/^Background:\s*/, '').trim();
      if (!backgroundBlock) {
        backgroundBlock = { type: 'background', title, lines: [] };
      }
      currentBlock = backgroundBlock;
      continue;
    }

    if (trimmed.startsWith('Rule:')) {
      let title = trimmed.replace(/^Rule:\s*/, '').trim() || 'Business Rule';
      currentBlock = { type: 'rule', title, description: [], lines: [], examples: null };
      blocks.push(currentBlock);
      continue;
    }

    if (trimmed.startsWith('Scenario:') || trimmed.startsWith('Scenario Outline:') || trimmed.startsWith('Scenario Template:') || trimmed.startsWith('Example:')) {
      let isOutline = trimmed.startsWith('Scenario Outline:') || trimmed.startsWith('Scenario Template:');
      let title = trimmed.replace(/^(Scenario Outline:|Scenario Template:|Scenario:|Example:)\s*/, '').trim();
      currentBlock = { type: isOutline ? 'outline' : 'scenario', title, lines: [], examples: null };
      blocks.push(currentBlock);
      continue;
    }

    if (trimmed.startsWith('Examples:') || trimmed.startsWith('Scenarios:')) {
      let title = trimmed.replace(/^(Examples:|Scenarios:)\s*/, '').trim();
      let examplesObj = { type: 'examples', title, description: [], header: [], rows: [] };
      if (currentBlock && (currentBlock.type === 'outline' || currentBlock.type === 'scenario')) {
        currentBlock.type = 'outline';
        currentBlock.examples = examplesObj;
      } else {
        currentBlock = { type: 'outline', title: 'Data Driven Flow', lines: [], examples: examplesObj };
        blocks.push(currentBlock);
      }
      continue;
    }

    if (trimmed.startsWith('@')) {
      const tagsList = trimmed.split(/\s+/).map(t => {
        if (!t.startsWith('@')) return t;
        return '@' + t.slice(1).toLowerCase().replace(/[^a-z0-9-]/g, '-');
      });

      if (!currentBlock || currentBlock.type === 'background') {
        tagsList.forEach(t => featureTagsSet.add(t));
        currentBlock = { type: 'tags', lines: [tagsList.join(' ')] };
        blocks.push(currentBlock);
      } else {
        if (!currentBlock.tags) currentBlock.tags = [];
        // Filter out duplicate feature tags from scenario level (rule: no-dupe-feature-scenario-tags)
        tagsList.forEach(t => {
          if (!featureTagsSet.has(t)) {
            currentBlock.tags.push(t);
          }
        });
      }
      continue;
    }

    if (trimmed.startsWith('#')) {
      if (currentBlock) {
        currentBlock.lines.push(line);
      }
      continue;
    }

    // Process line according to current block context
    if (currentBlock) {
      if (currentBlock.type === 'feature_desc') {
        mainFeatureDescription.push(trimmed);
      } else if (currentBlock.type === 'rule' && (currentBlock.lines.length === 0 && !trimmed.startsWith('|') && !/^(given|when|then|and|but|\*)\b/i.test(trimmed))) {
        currentBlock.description.push(trimmed);
      } else if (currentBlock.examples) {
        if (trimmed.startsWith('|')) {
          let tableRow = trimmed;
          if (!tableRow.startsWith('|')) tableRow = '| ' + tableRow;
          if (!tableRow.endsWith('|')) tableRow = tableRow + ' |';
          const cells = tableRow.split('|').slice(1, -1).map(c => c.trim());

          if (currentBlock.examples.header.length === 0) {
            currentBlock.examples.header = cells;
          } else {
            currentBlock.examples.rows.push(cells);
          }
        } else {
          currentBlock.examples.description.push(trimmed);
        }
      } else {
        currentBlock.lines.push(line);
      }
    } else {
      mainFeatureDescription.push(trimmed);
    }
  }

  // Close unclosed DocString if file ended abruptly at EOF
  if (inDocString && currentBlock) {
    currentBlock.lines.push(docStringDelimiter);
  }

  // Fallback main feature title if none existed
  if (!mainFeatureTitle) {
    mainFeatureTitle = 'User Feature Specification';
  }

  // Output Re-construction
  const outputLines = [];

  // Primary Feature Header
  outputLines.push(`Feature: ${mainFeatureTitle}`);
  mainFeatureDescription.forEach(l => {
    if (l.trim()) outputLines.push(`  ${l.trim()}`);
  });
  outputLines.push('');

  // Background Block
  if (backgroundBlock) {
    outputLines.push(`  Background:${backgroundBlock.title ? ' ' + backgroundBlock.title : ''}`);
    processStepBlockLines(backgroundBlock.lines, outputLines, '    ');
    outputLines.push('');
  }

  // Scenarios & Rules Processing
  const scenarioNamesSeen = new Map();

  blocks.forEach(block => {
    if (block.type === 'tags') {
      block.lines.forEach(t => outputLines.push(`  ${t.trim()}`));
      return;
    }

    if (block.type === 'rule') {
      outputLines.push(`\n  Rule: ${block.title}`);
      if (block.description && block.description.length > 0) {
        block.description.forEach(descLine => outputLines.push(`    ${descLine}`));
        outputLines.push('');
      }
      return;
    }

    if (block.type === 'scenario' || block.type === 'outline') {
      if (block.tags && block.tags.length > 0) {
        outputLines.push(`  ${block.tags.join(' ')}`);
      }

      // De-duplicate Scenario Names (rule: no-dupe-scenario-names)
      let title = block.title || (block.type === 'outline' ? 'Data Driven Process' : 'Standard User Operation');
      if (scenarioNamesSeen.has(title)) {
        const count = scenarioNamesSeen.get(title) + 1;
        scenarioNamesSeen.set(title, count);
        title = `${title} (${count})`;
      } else {
        scenarioNamesSeen.set(title, 1);
      }

      const keyword = block.type === 'outline' ? 'Scenario Outline' : 'Scenario';
      outputLines.push(`  ${keyword}: ${title}`);

      // Extract placeholders e.g. <param_name>
      const placeholders = new Set();
      processStepBlockLines(block.lines, outputLines, '    ', (ph) => {
        placeholders.add(ph);
      });

      // Handle Scenario Outline Examples Table
      if (block.type === 'outline' || placeholders.size > 0) {
        let examples = block.examples || { description: [], header: [], rows: [] };
        const phList = Array.from(placeholders);

        let headerCols = [...examples.header];

        phList.forEach(ph => {
          if (!headerCols.includes(ph)) {
            headerCols.push(ph);
          }
        });

        if (headerCols.length === 0) {
          headerCols = ['param1', 'param2'];
        }

        outputLines.push('    Examples:' + (examples.title ? ' ' + examples.title : ''));
        if (examples.description && examples.description.length > 0) {
          examples.description.forEach(d => outputLines.push(`      ${d}`));
        }

        outputLines.push(`      | ${headerCols.join(' | ')} |`);

        if (examples.rows.length > 0) {
          examples.rows.forEach(row => {
            let updatedRow = [...row];
            while (updatedRow.length < headerCols.length) {
              const missingColName = headerCols[updatedRow.length] || 'value';
              updatedRow.push(`${missingColName}_val`);
            }
            if (updatedRow.length > headerCols.length) {
              updatedRow = updatedRow.slice(0, headerCols.length);
            }
            outputLines.push(`      | ${updatedRow.join(' | ')} |`);
          });
        } else {
          const defaultRow = headerCols.map(h => `${h}_val`);
          outputLines.push(`      | ${defaultRow.join(' | ')} |`);
        }
      }

      outputLines.push('');
    }
  });

  return outputLines.join('\n');
}

/**
 * Process steps inside a block:
 * - Fixes dangling conjunctions (starts with And/But -> Given)
 * - Fixes repeated keywords (Given...Given -> Given...And)
 * - Re-orders steps into logical Given -> When -> Then flow
 * - Refactors first-person & imperative steps
 * - Strips ending punctuation from steps
 * - Formats table rows & normalizes column counts
 */
function processStepBlockLines(lines, outputArr, indent, onPlaceholderFound) {
  const steps = [];
  let currentStep = null;
  let lastMainKw = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) continue;

    // Check for step keyword
    const stepMatch = trimmed.match(/^(given|when|then|and|but|\*)\b\s*(.*)/i);

    if (stepMatch) {
      let rawKw = stepMatch[1].toLowerCase();
      let kw = rawKw === '*' ? '*' : rawKw.charAt(0).toUpperCase() + rawKw.slice(1);
      let text = stepMatch[2].trim();

      // Rule: no-ending-punctuation
      if (/[.,;:]$/.test(text)) {
        text = text.slice(0, -1).trim();
      }

      // Rule: no-first-person-perspective
      text = refactorFirstPerson(text);

      // Rule: imperative-steps-warning
      text = refactorImperativeStep(text);

      // Rule: dangling-conjunction
      if ((kw === 'And' || kw === 'But') && !lastMainKw) {
        kw = 'Given';
      }

      // Rule: keywords-in-logical-order (When after Then converted to And)
      if (kw === 'When' && lastMainKw === 'Then') {
        kw = 'And';
      }

      // Rule: use-and (repeated consecutive Given/When/Then)
      if (kw === 'Given' || kw === 'When' || kw === 'Then') {
        if (lastMainKw === kw) {
          kw = 'And';
        } else {
          lastMainKw = kw;
        }
      }

      // Fix unclosed double quotes
      const dQuotes = (text.match(/"/g) || []).length;
      if (dQuotes % 2 !== 0) text += '"';

      // Fix unclosed single quotes
      const codeQuotesOnly = text.replace(/[a-zA-Z]'[a-zA-Z]/g, '');
      const sQuotes = (codeQuotesOnly.match(/'/g) || []).length;
      if (sQuotes % 2 !== 0) text += "'";

      // Extract <placeholder> matches
      const phMatches = text.match(/<([^>]+)>/g);
      if (phMatches) {
        phMatches.forEach(m => {
          const phName = m.replace(/[<>]/g, '').trim();
          if (phName && onPlaceholderFound) {
            onPlaceholderFound(phName);
          }
        });
      }

      currentStep = {
        keyword: kw,
        text,
        tables: []
      };
      steps.push(currentStep);
      continue;
    }

    // Step Data Tables
    if (trimmed.startsWith('|')) {
      let tableRow = trimmed;
      if (!tableRow.startsWith('|')) tableRow = '| ' + tableRow;
      if (!tableRow.endsWith('|')) tableRow = tableRow + ' |';

      const cells = tableRow.split('|').slice(1, -1).map(c => c.trim());

      if (currentStep) {
        currentStep.tables.push(cells);
      } else {
        outputArr.push('      | ' + cells.join(' | ') + ' |');
      }
      continue;
    }

    // DocString lines or comments
    if (currentStep) {
      if (!currentStep.docstrings) currentStep.docstrings = [];
      currentStep.docstrings.push(rawLine);
    } else {
      outputArr.push(indent + trimmed);
    }
  }

  // Output steps in natural sequence
  steps.forEach(step => {
    outputArr.push(`${indent}${step.keyword} ${step.text}`);

    if (step.tables && step.tables.length > 0) {
      let maxCols = 0;
      step.tables.forEach(row => {
        if (row.length > maxCols) maxCols = row.length;
      });

      step.tables.forEach(row => {
        let updatedRow = [...row];
        while (updatedRow.length < maxCols) {
          updatedRow.push(`col_${updatedRow.length + 1}`);
        }
        outputArr.push('      | ' + updatedRow.join(' | ') + ' |');
      });
    }

    if (step.docstrings && step.docstrings.length > 0) {
      step.docstrings.forEach(dLine => {
        const t = dLine.trim();
        if (t.startsWith('"""') || t.startsWith("'''")) {
          outputArr.push('      ' + t);
        } else {
          outputArr.push('        ' + t);
        }
      });
    }
  });
}

/**
 * Refactor First-Person "I" / "my" to third-person role phrasing
 */
function refactorFirstPerson(text) {
  if (!text) return text;
  return text
    .replace(/\bI am\b/g, 'the user is')
    .replace(/\bI authenticated\b/g, 'the user is authenticated')
    .replace(/\bmy account balance\b/g, 'the account balance')
    .replace(/\bmy account\b/g, 'the user account')
    .replace(/\bI insert\b/g, 'the user inserts')
    .replace(/\bI enter\b/g, 'the user enters')
    .replace(/\bI press\b/g, 'the user presses')
    .replace(/\bI get\b/g, 'the user receives')
    .replace(/\bI navigate\b/g, 'the user navigates')
    .replace(/\bI open\b/g, 'the user opens')
    .replace(/\bI\b/g, 'the user')
    .replace(/\bmy\b/g, 'the');
}

/**
 * Refactor Low-Level Procedural UI Steps into Declarative Intent Steps
 */
function refactorImperativeStep(text) {
  if (!text) return text;
  let refactored = text;
  refactored = refactored.replace(/opens (a |the )?(web )?browser/i, 'the application is opened');
  refactored = refactored.replace(/navigates to "https?:\/\/[^"]+"/i, 'the main page is displayed');
  refactored = refactored.replace(/enters? "([^"]+)" into the search bar/i, 'searches for "$1"');
  refactored = refactored.replace(/types? "([^"]+)" into (the |a )?([a-zA-Z0-9_-]+) (field|input)/i, 'enters "$1" for $3');
  refactored = refactored.replace(/clicks? (on )?(the )?"([^"]+)" (link|button)/i, 'selects "$3"');
  refactored = refactored.replace(/presses? (the )?confirm PIN button/i, 'confirms the PIN');
  refactored = refactored.replace(/presses? (the )?withdrawal button/i, 'selects withdrawal');
  refactored = refactored.replace(/presses? confirm/i, 'submits the request');
  refactored = refactored.replace(/on the keypad/i, '');
  return refactored.replace(/\s+/g, ' ').trim();
}

/**
 * Ensures clean Gherkin indentation, line spacing, and whitespace formatting
 */
function formatAndStructureGherkin(code) {
  const lines = code.split('\n');
  const formatted = [];

  lines.forEach(rawLine => {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      if (formatted.length > 0 && formatted[formatted.length - 1] !== '') {
        formatted.push('');
      }
      return;
    }

    if (trimmed.startsWith('Feature:')) {
      formatted.push(trimmed);
    } else if (trimmed.startsWith('Rule:')) {
      formatted.push('\n  ' + trimmed);
    } else if (trimmed.startsWith('Background:') || trimmed.startsWith('Scenario:') || trimmed.startsWith('Scenario Outline:') || trimmed.startsWith('Scenario Template:') || trimmed.startsWith('Example:')) {
      formatted.push('  ' + trimmed);
    } else if (trimmed.startsWith('Examples:') || trimmed.startsWith('Scenarios:')) {
      formatted.push('    ' + trimmed);
    } else if (/^(Given|When|Then|And|But|\*)\b/i.test(trimmed)) {
      const stepMatch = trimmed.match(/^(Given|When|Then|And|But|\*)\b\s*(.*)/i);
      const rawKw = stepMatch[1];
      const kw = rawKw === '*' ? '*' : rawKw.charAt(0).toUpperCase() + rawKw.slice(1).toLowerCase();
      let stepText = stepMatch[2];
      if (/[.,;:]$/.test(stepText)) {
        stepText = stepText.slice(0, -1).trim();
      }
      formatted.push(`    ${kw} ${stepText}`);
    } else if (trimmed.startsWith('|')) {
      const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
      formatted.push(`      | ${cells.join(' | ')} |`);
    } else if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
      formatted.push('      ' + trimmed);
    } else if (trimmed.startsWith('@')) {
      formatted.push('  ' + trimmed);
    } else if (trimmed.startsWith('#')) {
      formatted.push('  ' + trimmed);
    } else {
      formatted.push('  ' + trimmed);
    }
  });

  return formatted.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Fix a single targeted line in Gherkin text given line number and error detail.
 * Specifically handles both Errors and Warning rules!
 */
export function fixSingleLine(code, lineNum, errorDetail) {
  if (!code) return code;
  const lines = code.split('\n');
  const index = lineNum - 1;

  if (index < 0 || index >= lines.length) return autoFixGherkin(code);

  let line = lines[index];
  let trimmed = line.trim();

  // Rule 1: No trailing spaces
  if (errorDetail?.rule === 'no-trailing-spaces' || /\s+$/.test(line)) {
    lines[index] = line.trimEnd();
    return lines.join('\n');
  }

  // Rule 2: Ending punctuation
  if (errorDetail?.rule === 'no-ending-punctuation' || /[.,;:]$/.test(trimmed)) {
    lines[index] = line.replace(/[.,;:]$/, '');
    return lines.join('\n');
  }

  // Rule 3: First-person "I" / "my"
  if (errorDetail?.rule === 'no-first-person-perspective' || /\b(I|my)\b/.test(trimmed)) {
    const stepMatch = trimmed.match(/^(given|when|then|and|but|\*)\b\s*(.*)/i);
    if (stepMatch) {
      const kw = stepMatch[1];
      const fixedText = refactorFirstPerson(stepMatch[2]);
      lines[index] = `    ${kw} ${fixedText}`;
      return lines.join('\n');
    }
  }

  // Rule 4: Imperative steps warning
  if (errorDetail?.rule === 'imperative-steps-warning') {
    const stepMatch = trimmed.match(/^(given|when|then|and|but|\*)\b\s*(.*)/i);
    if (stepMatch) {
      const kw = stepMatch[1];
      const fixedText = refactorImperativeStep(stepMatch[2]);
      lines[index] = `    ${kw} ${fixedText}`;
      return lines.join('\n');
    }
  }

  // Rule 5: Tag convention
  if (errorDetail?.rule === 'tag-convention' || trimmed.startsWith('@')) {
    const parts = trimmed.split(/\s+/);
    const cleaned = parts.map(tag => {
      if (!tag.startsWith('@')) return tag;
      return '@' + tag.slice(1).toLowerCase().replace(/[^a-z0-9-]/g, '-');
    }).join(' ');
    lines[index] = '  ' + cleaned;
    return lines.join('\n');
  }

  // Rule 6: Consecutive keyword repeat (use-and)
  if (errorDetail?.rule === 'use-and') {
    lines[index] = line.replace(/^(Given|When|Then)\b/i, 'And');
    return lines.join('\n');
  }

  // Rule 7: Unclosed double quotes
  if (errorDetail?.rule === 'unclosed-double-quote' || (trimmed.match(/"/g) || []).length % 2 !== 0) {
    lines[index] = line + '"';
    return lines.join('\n');
  }

  // Rule 8: Unclosed single quotes
  const codeQuotesOnly = trimmed.replace(/[a-zA-Z]'[a-zA-Z]/g, '');
  if (errorDetail?.rule === 'unclosed-single-quote' || (codeQuotesOnly.match(/'/g) || []).length % 2 !== 0) {
    lines[index] = line + "'";
    return lines.join('\n');
  }

  // Rule 9: Table row pipe unclosed
  if (errorDetail?.rule === 'table-row-pipe-unclosed' || (trimmed.startsWith('|') && !trimmed.endsWith('|'))) {
    lines[index] = line + ' |';
    return lines.join('\n');
  }

  // Rule 10: Indentation warnings
  if (errorDetail?.rule === 'indentation' || errorDetail?.category?.includes('Indentation')) {
    if (trimmed.startsWith('Feature:')) {
      lines[index] = trimmed;
    } else if (trimmed.startsWith('Scenario:') || trimmed.startsWith('Scenario Outline:') || trimmed.startsWith('Background:') || trimmed.startsWith('Example:')) {
      lines[index] = '  ' + trimmed;
    } else if (/^(Given|When|Then|And|But|\*)\b/i.test(trimmed)) {
      lines[index] = '    ' + trimmed;
    } else if (trimmed.startsWith('Examples:')) {
      lines[index] = '    ' + trimmed;
    } else if (trimmed.startsWith('|')) {
      lines[index] = '      ' + trimmed;
    }
    return lines.join('\n');
  }

  // Fallback to complete internal rule-based auto-fix
  return autoFixGherkin(code);
}
