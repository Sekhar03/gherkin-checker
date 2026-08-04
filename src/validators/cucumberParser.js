import { Parser, AstBuilder, GherkinClassicTokenMatcher } from '@cucumber/gherkin';
import * as IdGenerator from '@cucumber/messages';

export function checkCucumberGherkin(gherkinText) {
  const result = {
    name: '@cucumber/gherkin',
    repo: 'https://github.com/cucumber/gherkin-javascript',
    description: 'Official Cucumber Gherkin AST Parser & Syntax Validator',
    pass: true,
    errors: [],
    warnings: [],
    ast: null
  };

  if (!gherkinText || !gherkinText.trim()) {
    result.pass = false;
    result.errors.push({
      line: 1,
      text: '',
      category: 'AST Parse Error',
      rule: 'empty-document',
      reason: 'The Gherkin document is completely empty. The official Cucumber parser requires a valid "Feature:" section at root level.',
      fix: 'Add a "Feature: <Title>" header at the top of your file.',
      checker: '@cucumber/gherkin'
    });
    return result;
  }

  const lines = gherkinText.split('\n');

  try {
    const newId = IdGenerator.IdGenerator.uuid();
    const builder = new AstBuilder(newId);
    const matcher = new GherkinClassicTokenMatcher();
    const parser = new Parser(builder, matcher);

    const gherkinDocument = parser.parse(gherkinText);
    result.ast = gherkinDocument;

    if (!gherkinDocument || !gherkinDocument.feature) {
      result.pass = false;
      result.errors.push({
        line: 1,
        text: lines[0] || '',
        category: 'AST Syntax Error',
        rule: 'missing-feature',
        reason: 'No "Feature:" keyword definition was detected in the document AST.',
        fix: 'Ensure your file starts with "Feature: <Feature Name>" (comments and tags above Feature are allowed).',
        checker: '@cucumber/gherkin'
      });
    }
  } catch (err) {
    result.pass = false;

    if (err.errors && Array.isArray(err.errors)) {
      err.errors.forEach(e => {
        const lineNum = e.location?.line || 1;
        const colNum = e.location?.column || 1;
        const lineContent = lines[lineNum - 1] !== undefined ? lines[lineNum - 1] : '';

        result.errors.push({
          line: lineNum,
          column: colNum,
          text: lineContent,
          category: 'Cucumber Syntax Error',
          rule: 'parse-error',
          reason: `Syntax Parse Failure on Line ${lineNum}, Column ${colNum}: ${e.message}`,
          fix: `Inspect Line ${lineNum} around Column ${colNum} and fix Gherkin keyword formatting.`,
          checker: '@cucumber/gherkin'
        });
      });
    } else {
      const lineMatch = err.message ? err.message.match(/\((\d+):(\d+)\)/) : null;
      const lineNum = lineMatch ? parseInt(lineMatch[1], 10) : 1;
      const lineContent = lines[lineNum - 1] !== undefined ? lines[lineNum - 1] : '';

      result.errors.push({
        line: lineNum,
        text: lineContent,
        category: 'Cucumber Exception',
        rule: 'parser-exception',
        reason: `Gherkin Parser Error: ${err.message || 'Syntax parse exception occurred.'}`,
        fix: 'Verify correct usage of Feature, Scenario, Scenario Outline, Examples, and Step keywords.',
        checker: '@cucumber/gherkin'
      });
    }
  }

  return result;
}
