/**
 * sistar/gherkin-validator engine implementation
 * https://github.com/sistar/gherkin-validator
 * Lexer & Token Structure Validator
 */

export function checkSistarLexer(gherkinText) {
  const result = {
    name: 'sistar/gherkin-validator',
    repo: 'https://github.com/sistar/gherkin-validator',
    description: 'Strict Gherkin Lexer & Token Structure Validator',
    pass: true,
    errors: [],
    warnings: []
  };

  if (!gherkinText || !gherkinText.trim()) {
    result.pass = false;
    result.errors.push({
      line: 1,
      text: '',
      category: 'Lexer Error',
      rule: 'token-stream-empty',
      reason: 'Lexing error on line 1: Unexpected end of file. Token stream is empty.',
      fix: 'Add Feature and Scenario statements to produce valid tokens.',
      checker: 'sistar/gherkin-validator'
    });
    return result;
  }

  const lines = gherkinText.split('\n');
  let inDocString = false;
  let docStringStartLine = null;
  let currentTableColumnCount = null;
  let inTable = false;

  const validKeywordPrefixes = [
    'Feature:', 'Background:', 'Scenario:', 'Scenario Outline:', 'Scenario Template:', 'Example:',
    'Examples:', 'Scenarios:', 'Given', 'When', 'Then', 'And', 'But', '*',
    '#', '@', '|', '"""', "'''"
  ];

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const rawLine = lines[i];
    const trimmedLine = rawLine.trim();

    if (!trimmedLine) {
      if (inTable) {
        inTable = false;
        currentTableColumnCount = null;
      }
      continue;
    }

    // Toggle DocString state
    if (trimmedLine.startsWith('"""') || trimmedLine.startsWith("'''")) {
      if (inDocString) {
        inDocString = false;
        docStringStartLine = null;
      } else {
        inDocString = true;
        docStringStartLine = lineNum;
      }
      continue;
    }

    if (inDocString) continue;

    // Check Table Row
    if (trimmedLine.startsWith('|')) {
      if (!trimmedLine.endsWith('|')) {
        result.pass = false;
        result.errors.push({
          line: lineNum,
          text: rawLine,
          category: 'Lexer Token Error',
          rule: 'table-row-pipe-unclosed',
          reason: `Lexing error on line ${lineNum}: Table row must end with a pipe character "|".`,
          fix: 'Add a trailing pipe "|" to close the table cell row on this line.',
          checker: 'sistar/gherkin-validator'
        });
      }

      const columns = trimmedLine.split('|').map(c => c.trim());
      const count = columns.length - 2;

      if (!inTable) {
        inTable = true;
        currentTableColumnCount = count;
      } else if (currentTableColumnCount !== null && count !== currentTableColumnCount) {
        result.pass = false;
        result.errors.push({
          line: lineNum,
          text: rawLine,
          category: 'Table Structure Mismatch',
          rule: 'table-column-count-mismatch',
          reason: `Lexing error on line ${lineNum}: Table row column count mismatch. Expected ${currentTableColumnCount} columns, but found ${count} columns.`,
          fix: `Adjust table cells on line ${lineNum} to have exactly ${currentTableColumnCount} pipe-separated columns.`,
          checker: 'sistar/gherkin-validator'
        });
      }
      continue;
    } else {
      if (inTable) {
        inTable = false;
        currentTableColumnCount = null;
      }
    }

    const matchesKeyword = validKeywordPrefixes.some(prefix => trimmedLine.startsWith(prefix));

    if (!matchesKeyword) {
      if (i === 0) {
        result.pass = false;
        result.errors.push({
          line: lineNum,
          text: rawLine,
          category: 'Invalid Starting Token',
          rule: 'invalid-header-token',
          reason: `Lexing error on line ${lineNum}: Unrecognized token "${trimmedLine.split(' ')[0]}". Gherkin document must start with "Feature:" or tags (@tag).`,
          fix: 'Ensure line 1 starts with "Feature: <Title>" or a valid "@tag".',
          checker: 'sistar/gherkin-validator'
        });
      }
    }
  }

  if (inDocString) {
    result.pass = false;
    result.errors.push({
      line: docStringStartLine || lines.length,
      text: lines[(docStringStartLine || lines.length) - 1] || '"""',
      category: 'Unclosed DocString Token',
      rule: 'unclosed-docstring',
      reason: `Lexing error on line ${docStringStartLine}: Unclosed DocString block starting with """ on line ${docStringStartLine}.`,
      fix: 'Add closing """ delimiters to terminate the multiline DocString block.',
      checker: 'sistar/gherkin-validator'
    });
  }

  if (result.errors.length > 0) {
    result.pass = false;
  }

  return result;
}
