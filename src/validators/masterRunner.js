import { checkCucumberGherkin } from './cucumberParser.js';
import { checkGherkinLint } from './gherkinLinter.js';
import { checkMatrizConsistency } from './matrizChecker.js';
import { checkSistarLexer } from './sistarValidator.js';

export function runAllCheckers(gherkinText) {
  const startTime = performance.now();

  const cucumberRes = checkCucumberGherkin(gherkinText);
  const lintRes = checkGherkinLint(gherkinText);
  const matrizRes = checkMatrizConsistency(gherkinText);
  const sistarRes = checkSistarLexer(gherkinText);

  const checkers = [cucumberRes, lintRes, matrizRes, sistarRes];

  const totalErrors = checkers.reduce((acc, c) => acc + c.errors.length, 0);
  const totalWarnings = checkers.reduce((acc, c) => acc + c.warnings.length, 0);

  const overallPass = totalErrors === 0;

  const executionTimeMs = (performance.now() - startTime).toFixed(2);

  // Group errors by line number for inline editor markers
  const errorsByLine = {};
  checkers.forEach(c => {
    c.errors.forEach(err => {
      if (!errorsByLine[err.line]) {
        errorsByLine[err.line] = [];
      }
      errorsByLine[err.line].push(err);
    });
  });

  return {
    overallPass,
    totalErrors,
    totalWarnings,
    executionTimeMs,
    checkers,
    errorsByLine
  };
}
