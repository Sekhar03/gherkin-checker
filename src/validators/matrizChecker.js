/**
 * Matriz88/gherkin-checker engine implementation
 * https://github.com/Matriz88/gherkin-checker
 * Consistency & Step Definition Validator
 */

export function checkMatrizConsistency(gherkinText) {
  const result = {
    name: 'Matriz88/gherkin-checker',
    repo: 'https://github.com/Matriz88/gherkin-checker',
    description: 'Scenario Consistency & Step Definition Structure Matcher',
    pass: true,
    errors: [],
    warnings: []
  };

  if (!gherkinText || !gherkinText.trim()) {
    result.pass = false;
    result.errors.push({
      line: 1,
      text: '',
      category: 'Consistency Error',
      rule: 'empty-input',
      reason: 'Empty Gherkin input document. Cannot validate scenario step patterns.',
      fix: 'Provide valid Gherkin text with Feature and Scenario step definitions.',
      checker: 'Matriz88/gherkin-checker'
    });
    return result;
  }

  const lines = gherkinText.split('\n');
  let currentScenarioName = null;
  let currentScenarioLine = null;
  let inScenarioOutline = false;
  let scenarioOutlinePlaceholders = new Set();
  let exampleColumns = new Set();
  let inExamples = false;
  let lastMainKeyword = null;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const rawLine = lines[i];
    const trimmedLine = rawLine.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) continue;

    // Detect Scenario / Scenario Outline
    if (trimmedLine.startsWith('Scenario:') || trimmedLine.startsWith('Scenario Outline:') || trimmedLine.startsWith('Scenario Template:')) {
      currentScenarioName = trimmedLine;
      currentScenarioLine = lineNum;
      inScenarioOutline = trimmedLine.startsWith('Scenario Outline:') || trimmedLine.startsWith('Scenario Template:');
      scenarioOutlinePlaceholders.clear();
      exampleColumns.clear();
      inExamples = false;
      lastMainKeyword = null;
      continue;
    }

    // Detect Examples header
    if (trimmedLine.startsWith('Examples:') || trimmedLine.startsWith('Scenarios:')) {
      inExamples = true;
      continue;
    }

    // Process Examples table rows
    if (inExamples && trimmedLine.startsWith('|')) {
      if (exampleColumns.size === 0) {
        const cols = trimmedLine.split('|').map(c => c.trim()).filter(c => c.length > 0);
        cols.forEach(col => exampleColumns.add(col));
      }
      continue;
    }

    // Step verification (Given, When, Then, And, But)
    const stepMatch = trimmedLine.match(/^(Given|When|Then|And|But)\b\s*(.*)/);
    if (stepMatch) {
      const keyword = stepMatch[1];
      const stepText = stepMatch[2];

      if (keyword === 'Given' || keyword === 'When' || keyword === 'Then') {
        lastMainKeyword = keyword;
      }

      // Check dangling And/But
      if ((keyword === 'And' || keyword === 'But') && !lastMainKeyword) {
        result.pass = false;
        result.errors.push({
          line: lineNum,
          text: rawLine,
          category: 'Dangling Step Context',
          rule: 'dangling-conjunction',
          reason: `"${keyword}" conjunction step defined without any preceding Given, When, or Then context.`,
          fix: `Precede this step with a "Given", "When", or "Then" step before using "${keyword}".`,
          checker: 'Matriz88/gherkin-checker'
        });
      }

      // Check unclosed double quotes
      const doubleQuotesCount = (stepText.match(/"/g) || []).length;
      if (doubleQuotesCount % 2 !== 0) {
        result.pass = false;
        result.errors.push({
          line: lineNum,
          text: rawLine,
          category: 'String Literal Error',
          rule: 'unclosed-double-quote',
          reason: 'Step text contains an unclosed double quote (") parameter.',
          fix: 'Close the open double quote in the step string literal.',
          checker: 'Matriz88/gherkin-checker'
        });
      }

      // Check unclosed single quotes (ignoring possessive/contraction apostrophes like merchant's, today's)
      const codeQuotesOnly = stepText.replace(/[a-zA-Z]'[a-zA-Z]/g, '');
      const singleQuotesCount = (codeQuotesOnly.match(/'/g) || []).length;
      if (singleQuotesCount % 2 !== 0) {
        result.pass = false;
        result.errors.push({
          line: lineNum,
          text: rawLine,
          category: 'String Literal Error',
          rule: 'unclosed-single-quote',
          reason: "Step text contains an unclosed single quote (') parameter.",
          fix: "Close the open single quote in the step string literal.",
          checker: 'Matriz88/gherkin-checker'
        });
      }

      // Collect Scenario Outline placeholders e.g. <var_name>
      if (inScenarioOutline) {
        const matches = stepText.match(/<([^>]+)>/g);
        if (matches) {
          matches.forEach(m => {
            const varName = m.replace(/[<>]/g, '').trim();
            scenarioOutlinePlaceholders.add(varName);
          });
        }
      }
    }

    // Check tag format
    if (trimmedLine.startsWith('@')) {
      const tags = trimmedLine.split(/\s+/);
      tags.forEach(tag => {
        if (tag === '@' || /^@[^a-zA-Z0-9_\-]/.test(tag)) {
          result.pass = false;
          result.errors.push({
            line: lineNum,
            text: rawLine,
            category: 'Tag Format Error',
            rule: 'malformed-tag',
            reason: `Tag "${tag}" on line ${lineNum} is malformed or contains invalid special characters.`,
            fix: 'Tags should start with @ followed by alphanumeric characters, e.g., @smoke or @user_test.',
            checker: 'Matriz88/gherkin-checker'
          });
        }
      });
    }
  }

  // Post-scenario validation: check if all placeholders in Scenario Outline exist in Examples table
  if (inScenarioOutline && scenarioOutlinePlaceholders.size > 0) {
    scenarioOutlinePlaceholders.forEach(ph => {
      if (!exampleColumns.has(ph)) {
        result.pass = false;
        result.errors.push({
          line: currentScenarioLine || 1,
          text: lines[(currentScenarioLine || 1) - 1] || '',
          category: 'Undefined Placeholder Parameter',
          rule: 'missing-example-column',
          reason: `Scenario Outline step uses parameter "<${ph}>", but "<${ph}>" column is missing from the Examples table headers (${Array.from(exampleColumns).join(', ') || 'no columns found'}).`,
          fix: `Add a "| ${ph} |" column header to the Examples table under this Scenario Outline.`,
          checker: 'Matriz88/gherkin-checker'
        });
      }
    });
  }

  if (result.errors.length > 0) {
    result.pass = false;
  }

  return result;
}
