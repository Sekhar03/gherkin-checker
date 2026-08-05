import { runAllCheckers } from '../validators/masterRunner.js';

/**
 * Comprehensive Internal Rule-Based Gherkin Auto-Fixer Engine
 * Reads errors and warnings from all 4 checkers (@cucumber/gherkin AST, gherkin-lint rules,
 * Matriz88 consistency, and sistar lexer) and repairs them deterministically without using AI.
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

  // Run up to 3 repair passes until all errors & warnings are cleared
  for (let pass = 1; pass <= 3; pass++) {
    const results = (pass === 1 && initialResults) ? initialResults : runAllCheckers(currentCode);

    // If completely clean (no errors & no warnings), stop early!
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

  // Final structural & indentation pass to ensure perfect formatting
  return formatAndStructureGherkin(currentCode);
}

/**
 * Single deterministic repair pass guided by actual error & warning objects
 */
function runSingleRepairPass(code, results) {
  const lines = code.split('\n');

  // Collect active error & warning rules
  const activeRules = new Set();
  if (results && results.checkers) {
    results.checkers.forEach(c => {
      [...(c.errors || []), ...(c.warnings || [])].forEach(issue => {
        if (issue.rule) activeRules.add(issue.rule);
      });
    });
  }

  // Pass 1: Targeted Line-Level Fixes
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let trimmed = line.trim();

    if (!trimmed) {
      lines[i] = '';
      continue;
    }

    // Fix trailing spaces
    if (/\s+$/.test(line)) {
      line = line.trimEnd();
    }

    // Fix unclosed quotes in step text (ignoring possessive apostrophes like merchant's, today's)
    const stepMatch = trimmed.match(/^(given|when|then|and|but)\b\s*(.*)/i);
    if (stepMatch) {
      let stepText = stepMatch[2];
      const dQuotes = (stepText.match(/"/g) || []).length;
      if (dQuotes % 2 !== 0) {
        line = line + '"';
        trimmed = line.trim();
      }

      const codeQuotesOnly = stepText.replace(/[a-zA-Z]'[a-zA-Z]/g, '');
      const sQuotes = (codeQuotesOnly.match(/'/g) || []).length;
      if (sQuotes % 2 !== 0) {
        line = line + "'";
        trimmed = line.trim();
      }
    }

    // Fix unclosed pipe tables
    if (trimmed.startsWith('|') && !trimmed.endsWith('|')) {
      line = line + ' |';
      trimmed = line.trim();
    }

    // Fix malformed tags e.g. @ alone or @tag#invalid
    if (trimmed.startsWith('@')) {
      const parts = trimmed.split(/\s+/);
      const cleaned = parts.map(tag => {
        if (tag === '@') return '@smoke';
        if (!tag.startsWith('@')) return tag;
        return '@' + tag.slice(1).replace(/[^a-zA-Z0-9_\-]/g, '_');
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
  return reconstructDocumentStructure(processedCode, activeRules);
}

/**
 * Reconstructs Gherkin Document Structure:
 * - Handles single & multi-feature documents (converts 2nd+ Features to Gherkin 6+ Rules)
 * - Preserves Feature & Rule description blocks (As a... I want to... So that...)
 * - Guarantees Feature at root before Background
 * - Resolves duplicate background blocks
 * - De-duplicates scenario names
 * - Fixes dangling conjunctions (And/But before Given)
 * - Converts repeated Given/When/Then to And
 * - Re-orders out-of-sequence steps (Given -> When -> Then)
 * - Generates & fixes Examples tables for Scenario Outlines
 * - Normalizes data tables & closes DocStrings
 */
function reconstructDocumentStructure(code, activeRules = new Set()) {
  const rawLines = code.split('\n');

  let mainFeatureTitle = null;
  let mainFeatureDescription = [];
  let backgroundBlock = null;
  let blocks = [];
  let currentBlock = null;
  let inDocString = false;
  let docStringDelimiter = '"""';

  let featureCount = 0;

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

    if (trimmed.startsWith('Scenario:') || trimmed.startsWith('Scenario Outline:') || trimmed.startsWith('Scenario Template:')) {
      let isOutline = trimmed.startsWith('Scenario Outline:') || trimmed.startsWith('Scenario Template:');
      let title = trimmed.replace(/^(Scenario Outline:|Scenario Template:|Scenario:)\s*/, '').trim();
      currentBlock = { type: isOutline ? 'outline' : 'scenario', title, lines: [], examples: null };
      blocks.push(currentBlock);
      continue;
    }

    if (trimmed.startsWith('Examples:') || trimmed.startsWith('Scenarios:')) {
      let title = trimmed.replace(/^(Examples:|Scenarios:)\s*/, '').trim();
      let examplesObj = { type: 'examples', title, header: [], rows: [] };
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
      if (!currentBlock || currentBlock.type === 'background') {
        currentBlock = { type: 'tags', lines: [trimmed] };
        blocks.push(currentBlock);
      } else {
        if (!currentBlock.tags) currentBlock.tags = [];
        currentBlock.tags.push(trimmed);
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
      } else if (currentBlock.type === 'rule' && (currentBlock.lines.length === 0 && !trimmed.startsWith('|') && !/^(given|when|then|and|but)\b/i.test(trimmed))) {
        // Description lines under Rule (e.g. As a... I want to... So that...)
        currentBlock.description.push(trimmed);
      } else if (currentBlock.examples && trimmed.startsWith('|')) {
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
        currentBlock.lines.push(line);
      }
    } else {
      // Unattached header comments before any Feature
      mainFeatureDescription.push(trimmed);
    }
  }

  // Close unclosed DocString if file ended abruptly
  if (inDocString && currentBlock) {
    currentBlock.lines.push(docStringDelimiter);
  }

  // Fallback main feature title if none existed
  if (!mainFeatureTitle) {
    mainFeatureTitle = 'Merchant Support Portal & Feature Specification';
  }

  // 2. Output Re-construction
  const outputLines = [];

  // Primary Feature Header
  outputLines.push(`Feature: ${mainFeatureTitle}`);
  mainFeatureDescription.forEach(l => {
    if (l.trim()) outputLines.push(`  ${l.trim()}`);
  });
  outputLines.push('');

  // Primary Background Block (must come under Feature before Rules/Scenarios)
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
        block.description.forEach(descLine => {
          outputLines.push(`    ${descLine}`);
        });
        outputLines.push('');
      }
      return;
    }

    if (block.type === 'scenario' || block.type === 'outline') {
      // Print scenario tags if attached
      if (block.tags && block.tags.length > 0) {
        block.tags.forEach(t => outputLines.push(`  ${t.trim()}`));
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
        let examples = block.examples || { header: [], rows: [] };
        const phList = Array.from(placeholders);

        let headerCols = [...examples.header];

        // Ensure all step placeholders exist in header
        phList.forEach(ph => {
          if (!headerCols.includes(ph)) {
            headerCols.push(ph);
          }
        });

        // Default headers if no placeholders and no headers existed
        if (headerCols.length === 0) {
          headerCols = ['param1', 'param2'];
        }

        outputLines.push('    Examples:');
        outputLines.push(`      | ${headerCols.join(' | ')} |`);

        // Format data rows
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
          // Generate default data row
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
 * - Formats table rows under steps
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
    const stepMatch = trimmed.match(/^(given|when|then|and|but)\b\s*(.*)/i);

    if (stepMatch) {
      let rawKw = stepMatch[1].toLowerCase();
      let kw = rawKw.charAt(0).toUpperCase() + rawKw.slice(1);
      let text = stepMatch[2].trim();

      // Rule: dangling-conjunction (And/But without preceding Given/When/Then)
      if ((kw === 'And' || kw === 'But') && !lastMainKw) {
        kw = 'Given';
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

      // Fix unclosed single quotes (ignoring possessive/contraction apostrophes like merchant's)
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
      const formattedRow = '| ' + cells.join(' | ') + ' |';

      if (currentStep) {
        currentStep.tables.push(formattedRow);
      } else {
        outputArr.push('      ' + formattedRow);
      }
      continue;
    }

    // DocString lines or comments
    if (currentStep) {
      currentStep.tables.push(rawLine);
    } else {
      outputArr.push(indent + trimmed);
    }
  }

  // Group & Order steps into logical flow: Given steps -> When steps -> Then steps
  const givenSteps = [];
  const whenSteps = [];
  const thenSteps = [];
  const otherSteps = [];

  let currentCategory = 'GIVEN';

  steps.forEach(step => {
    if (step.keyword === 'Given') {
      currentCategory = 'GIVEN';
    } else if (step.keyword === 'When') {
      currentCategory = 'WHEN';
    } else if (step.keyword === 'Then') {
      currentCategory = 'THEN';
    }

    if (currentCategory === 'GIVEN') givenSteps.push(step);
    else if (currentCategory === 'WHEN') whenSteps.push(step);
    else if (currentCategory === 'THEN') thenSteps.push(step);
    else otherSteps.push(step);
  });

  const orderedSteps = [...givenSteps, ...whenSteps, ...thenSteps, ...otherSteps];

  orderedSteps.forEach(step => {
    outputArr.push(`${indent}${step.keyword} ${step.text}`);
    if (step.tables && step.tables.length > 0) {
      step.tables.forEach(t => {
        if (t.startsWith('|')) {
          outputArr.push('      ' + t);
        } else {
          outputArr.push('      ' + t.trim());
        }
      });
    }
  });
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
    } else if (trimmed.startsWith('Background:') || trimmed.startsWith('Scenario:') || trimmed.startsWith('Scenario Outline:') || trimmed.startsWith('Scenario Template:')) {
      formatted.push('  ' + trimmed);
    } else if (trimmed.startsWith('Examples:') || trimmed.startsWith('Scenarios:')) {
      formatted.push('    ' + trimmed);
    } else if (/^(Given|When|Then|And|But)\b/i.test(trimmed)) {
      const stepMatch = trimmed.match(/^(Given|When|Then|And|But)\b\s*(.*)/i);
      const kw = stepMatch[1].charAt(0).toUpperCase() + stepMatch[1].slice(1).toLowerCase();
      formatted.push(`    ${kw} ${stepMatch[2]}`);
    } else if (trimmed.startsWith('|')) {
      const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
      formatted.push(`      | ${cells.join(' | ')} |`);
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

  // Rule 2: Unclosed double quotes
  if (errorDetail?.rule === 'unclosed-double-quote' || (trimmed.match(/"/g) || []).length % 2 !== 0) {
    lines[index] = line + '"';
    return lines.join('\n');
  }

  // Rule 3: Unclosed single quotes (ignoring possessive apostrophes like merchant's)
  const codeQuotesOnly = trimmed.replace(/[a-zA-Z]'[a-zA-Z]/g, '');
  if (errorDetail?.rule === 'unclosed-single-quote' || (codeQuotesOnly.match(/'/g) || []).length % 2 !== 0) {
    lines[index] = line + "'";
    return lines.join('\n');
  }

  // Rule 4: Table row pipe unclosed
  if (errorDetail?.rule === 'table-row-pipe-unclosed' || (trimmed.startsWith('|') && !trimmed.endsWith('|'))) {
    lines[index] = line + ' |';
    return lines.join('\n');
  }

  // Rule 5: Indentation warnings
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
    return lines.join('\n');
  }

  // Fallback to complete internal rule-based auto-fix
  return autoFixGherkin(code);
}
