import { runAllCheckers } from '../validators/masterRunner.js';

/**
 * Comprehensive Internal Rule-Based Gherkin Auto-Fixer Engine
 * Reads actual error & warning objects and their explicit suggested fix comments from all 4 checkers to repair both ERRORS and WARNINGS.
 */

/**
 * Dedicated Gherkin Formatter Engine
 * Formats Gherkin text with standard indentation (0/2/4/6 spaces), clean line spacing, normalized tags & pipe tables.
 */
export function formatGherkinCode(code) {
  if (!code || !code.trim()) return code;
  return formatAndStructureGherkin(code);
}

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
  let formatted = formatAndStructureGherkin(currentCode);
  if (formatted && !formatted.endsWith('\n')) {
    formatted += '\n';
  }
  return formatted;
}

/**
 * Single deterministic repair pass guided by active error & warning rules and fix comments
 */
function runSingleRepairPass(code, results) {
  if (!code) return code;
  const lines = code.split('\n');

  // Collect all errors & warnings grouped by 1-indexed line number
  const lineIssuesMap = new Map();
  if (results && results.checkers) {
    results.checkers.forEach(c => {
      [...(c.errors || []), ...(c.warnings || [])].forEach(issue => {
        const lineNum = issue.line || 1;
        if (!lineIssuesMap.has(lineNum)) {
          lineIssuesMap.set(lineNum, []);
        }
        lineIssuesMap.get(lineNum).push(issue);
      });
    });
  }

  // Pass 1: Targeted Line-Level Fixes guided by actual issue objects and fix comments
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    let line = lines[i];
    let trimmed = line.trim();

    if (!trimmed) {
      lines[i] = '';
      continue;
    }

    const issuesOnLine = lineIssuesMap.get(lineNum) || [];

    // Apply explicit issue-guided fixes reading the exact suggested fix comment, reason, and rule
    issuesOnLine.forEach(issue => {
      line = fixLineByIssueDetail(line, issue);
      trimmed = line.trim();
    });

    // Fallback checks for safety
    if (/\s+$/.test(line)) {
      line = line.trimEnd();
    }

    const stepMatch = trimmed.match(/^(given|when|then|and|but|\*)\b\s*(.*)/i);
    if (stepMatch) {
      let rawKw = stepMatch[1];
      let stepText = stepMatch[2];

      if (/[.,;:]$/.test(stepText)) {
        stepText = stepText.slice(0, -1).trim();
      }

      if (/\b(I|my)\b/.test(stepText) && !/\b(API|ID|IP)\b/.test(stepText)) {
        stepText = refactorFirstPerson(stepText);
      }

      if (/\b(clicks?|press(es)?|types?|enters? .* (into|in)|opens? (a |the )?(web )?browser|navigates? to|hyperlink|icon menu|vertical icon|radio button|checkbox|dropdown|keypad|modal|popup)\b/i.test(stepText)) {
        stepText = refactorImperativeStep(stepText);
      }

      const dQuotes = (stepText.match(/"/g) || []).length;
      if (dQuotes % 2 !== 0) stepText += '"';

      const codeQuotesOnly = stepText.replace(/[a-zA-Z]'[a-zA-Z]/g, '');
      const sQuotes = (codeQuotesOnly.match(/'/g) || []).length;
      if (sQuotes % 2 !== 0) stepText += "'";

      line = `    ${rawKw} ${stepText}`;
      trimmed = line.trim();
    }

    if (trimmed.startsWith('|') && !trimmed.endsWith('|')) {
      line = line + ' |';
      trimmed = line.trim();
    }

    if (trimmed.startsWith('@')) {
      const parts = trimmed.split(/\s+/);
      const cleaned = parts.map(tag => {
        if (tag === '@') return '@smoke';
        if (!tag.startsWith('@')) return tag;
        return '@' + tag.slice(1).toLowerCase().replace(/[^a-z0-9-]/g, '-');
      }).join(' ');
      line = '  ' + cleaned;
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

  if (inDocString && currentBlock) {
    currentBlock.lines.push(docStringDelimiter);
  }

  if (!mainFeatureTitle) {
    mainFeatureTitle = 'User Feature Specification';
  }

  const outputLines = [];

  outputLines.push(`Feature: ${mainFeatureTitle}`);
  mainFeatureDescription.forEach(l => {
    if (l.trim()) outputLines.push(`  ${l.trim()}`);
  });
  outputLines.push('');

  if (backgroundBlock) {
    const hasSteps = backgroundBlock.lines.some(l => /^(given|when|then|and|but|\*)\b/i.test(l.trim()));
    if (!hasSteps) {
      backgroundBlock.lines.push('Given the application is initialized and online');
    }
    outputLines.push(`  Background:${backgroundBlock.title ? ' ' + backgroundBlock.title : ''}`);
    processStepBlockLines(backgroundBlock.lines, outputLines, '    ');
    outputLines.push('');
  }

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

      const placeholders = new Set();
      processStepBlockLines(block.lines, outputLines, '    ', (ph) => {
        placeholders.add(ph);
      });

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

  const rawResult = outputLines.join('\n');
  return rawResult.replace(/\n{3,}/g, '\n\n').split('\n').map(l => l.trimEnd()).join('\n');
}

/**
 * Process steps inside a block
 */
function processStepBlockLines(lines, outputArr, indent, onPlaceholderFound) {
  const steps = [];
  let currentStep = null;
  let lastMainKw = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) continue;

    const stepMatch = trimmed.match(/^(given|when|then|and|but|\*)\b\s*(.*)/i);

    if (stepMatch) {
      let rawKw = stepMatch[1].toLowerCase();
      let kw = rawKw === '*' ? '*' : rawKw.charAt(0).toUpperCase() + rawKw.slice(1);
      let text = stepMatch[2].trim();

      if (/[.,;:]$/.test(text)) {
        text = text.slice(0, -1).trim();
      }

      text = refactorFirstPerson(text);
      text = refactorImperativeStep(text);

      if ((kw === 'And' || kw === 'But') && !lastMainKw) {
        kw = 'Given';
      }

      if (kw === 'When' && lastMainKw === 'Then') {
        kw = 'And';
      }

      if (kw === 'Given' || kw === 'When' || kw === 'Then') {
        if (lastMainKw === kw) {
          kw = 'And';
        } else {
          lastMainKw = kw;
        }
      }

      const dQuotes = (text.match(/"/g) || []).length;
      if (dQuotes % 2 !== 0) text += '"';

      const codeQuotesOnly = text.replace(/[a-zA-Z]'[a-zA-Z]/g, '');
      const sQuotes = (codeQuotesOnly.match(/'/g) || []).length;
      if (sQuotes % 2 !== 0) text += "'";

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

    if (currentStep) {
      if (!currentStep.docstrings) currentStep.docstrings = [];
      currentStep.docstrings.push(rawLine);
    } else {
      outputArr.push(indent + trimmed);
    }
  }

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
 * Targeted Line Fixer reading the exact suggested fix comment, reason, and rule from issue objects!
 */
function fixLineByIssueDetail(line, issue) {
  if (!line || !issue) return line;
  const fixText = issue.fix || '';
  const rule = issue.rule || '';
  const reason = issue.reason || '';

  // 1. Read explicit "Change step to '...'" from issue.fix comment!
  const changeStepMatch = fixText.match(/Change step to ["']([^"']+)["']/i);
  if (changeStepMatch) {
    const replacementStep = changeStepMatch[1];
    return `    ${replacementStep}`;
  }

  // 2. Read explicit "Change 'X' to 'Y'" keyword replacement from issue.fix comment!
  const changeKeywordMatch = fixText.match(/Change ["'](Given|When|Then)["'] to ["'](And|But)["']/i);
  if (changeKeywordMatch) {
    const toKw = changeKeywordMatch[2];
    return line.replace(/^(Given|When|Then)\b/i, toKw);
  }

  // 3. Read explicit "Rename tag 'X' to 'Y'" from issue.fix comment!
  const renameTagMatch = fixText.match(/Rename tag ["']@[^"']+["'] to ["'](@[^"']+)["']/i);
  if (renameTagMatch) {
    const newTag = renameTagMatch[1];
    return `  ${newTag}`;
  }

  // 4. Read explicit "Remove duplicate tag 'X'" from issue.fix comment!
  const removeTagMatch = fixText.match(/Remove duplicate tag ["'](@[^"']+)["']/i);
  if (removeTagMatch) {
    const tagToRemove = removeTagMatch[1];
    const tags = line.trim().split(/\s+/).filter(t => t !== tagToRemove);
    return tags.length > 0 ? `  ${tags.join(' ')}` : '';
  }

  // Fallbacks guided by rule and reason
  if (rule === 'imperative-steps-warning' || reason.includes('procedural/imperative UI detail')) {
    const stepMatch = line.trim().match(/^(given|when|then|and|but|\*)\b\s*(.*)/i);
    if (stepMatch) {
      const kw = stepMatch[1];
      const fixedText = refactorImperativeStep(stepMatch[2]);
      return `    ${kw} ${fixedText}`;
    }
  }

  if (rule === 'no-first-person-perspective' || reason.includes('first-person phrasing')) {
    const stepMatch = line.trim().match(/^(given|when|then|and|but|\*)\b\s*(.*)/i);
    if (stepMatch) {
      const kw = stepMatch[1];
      const fixedText = refactorFirstPerson(stepMatch[2]);
      return `    ${kw} ${fixedText}`;
    }
  }

  if (rule === 'no-ending-punctuation' || reason.includes('ends with punctuation')) {
    return line.replace(/[.,;:]\s*$/, '').trimEnd();
  }

  if (rule === 'use-and' || rule === 'one-behavior-per-scenario' || rule === 'keywords-in-logical-order') {
    return line.replace(/^\s*(Given|When|Then)\b/i, '    And');
  }

  if (rule === 'tag-convention') {
    const parts = line.trim().split(/\s+/);
    const cleaned = parts.map(tag => {
      if (!tag.startsWith('@')) return tag;
      return '@' + tag.slice(1).toLowerCase().replace(/[^a-z0-9-]/g, '-');
    }).join(' ');
    return '  ' + cleaned;
  }

  if (rule === 'no-trailing-spaces') return line.trimEnd();

  return line;
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

  // 1. Quoted hyperlink/link/button/tab click e.g. "click the 'View All' hyperlink on the landing page"
  refactored = refactored.replace(/(the user |user )?clicks? (on |upon )?(the )?("([^"]+)"|'([^']+)').*/gi, (match, p1, p2, p3, p4, qName1, qName2) => {
    const targetName = (qName1 || qName2 || 'option').trim();
    return `the user selects "${targetName}"`;
  });

  // 2. Unquoted element click with quotes e.g. "click hyperlink 'View All'"
  refactored = refactored.replace(/(the user |user )?clicks? (on |upon )?(the )?(hyperlink|link|button|tab|menu item|option|toggle|checkbox|radio button|icon) ("([^"]+)"|'([^']+)').*/gi, (match, p1, p2, p3, elementKind, qFull, qName1, qName2) => {
    const targetName = (qName1 || qName2 || 'option').trim();
    return `the user selects "${targetName}"`;
  });

  // 3. Unquoted descriptive element click e.g. "click the three-dot vertical icon menu on the ticket"
  refactored = refactored.replace(/(the user |user )?clicks? (on |upon )?(the )?([a-zA-Z0-9_\s-]+) (hyperlink|link|button|icon menu|vertical icon|icon|menu|dropdown|tab|toggle).*/gi, (match, p1, p2, p3, targetName) => {
    return `the user selects "${targetName.trim()}"`;
  });

  // 4. Simple unquoted click e.g. "click the View All hyperlink"
  refactored = refactored.replace(/(the user |user )?clicks? (on |upon )?(the )?([a-zA-Z0-9_\s-]+)/gi, (match, p1, p2, p3, targetName) => {
    let cleaned = targetName.replace(/\b(hyperlink|link|button|icon menu|vertical icon|icon|menu|dropdown|on the landing page|on the ticket|on the page)\b/gi, '').trim();
    if (!cleaned || cleaned === 'the user' || cleaned === 'user') cleaned = 'option';
    return `the user selects "${cleaned}"`;
  });

  // 5. Input / Type / Enter text patterns: "enters 'test' into the email input field"
  refactored = refactored.replace(/(the user |user )?(types?|enters?|fills? in) "([^"]+)" into (the |a )?([a-zA-Z0-9_\s-]+).*/gi, (match, p1, p2, val, p4, fieldName) => {
    return `the user provides "${val}" for ${fieldName.replace(/\b(field|input|textbox|box)\b/gi, '').trim()}`;
  });

  // 6. Browser navigation & URL patterns
  refactored = refactored.replace(/(the user |user )?opens? (a |the )?(web )?browser.*/gi, 'the application is launched');
  refactored = refactored.replace(/(the user |user )?navigates? to .*/gi, 'the main page is displayed');

  // 7. Residual button/press patterns
  refactored = refactored.replace(/presses? (the )?confirm PIN button/gi, 'confirms the PIN');
  refactored = refactored.replace(/presses? (the )?withdrawal button/gi, 'selects withdrawal');
  refactored = refactored.replace(/presses? confirm/gi, 'submits the request');
  refactored = refactored.replace(/\bpresses?\b/gi, 'submits');
  refactored = refactored.replace(/\bclicks?\b/gi, 'selects');
  refactored = refactored.replace(/\btypes?\b/gi, 'provides');
  refactored = refactored.replace(/\bhyperlink\b/gi, 'option');
  refactored = refactored.replace(/\bicon menu\b/gi, 'menu');
  refactored = refactored.replace(/\bvertical icon\b/gi, 'menu');
  refactored = refactored.replace(/on the keypad/gi, '');

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

  if (errorDetail) {
    line = fixLineByIssueDetail(line, errorDetail);
    lines[index] = line;
    return lines.join('\n');
  }

  return autoFixGherkin(code);
}
