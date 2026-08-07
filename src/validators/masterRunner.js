import { checkCucumberGherkin } from './cucumberParser.js';
import { checkGherkinLint } from './gherkinLinter.js';
import { checkMatrizConsistency } from './matrizChecker.js';
import { checkSistarLexer } from './sistarValidator.js';
import { runUnifiedBddLinter } from './unifiedBddLinter.js';

export function runAllCheckers(gherkinText) {
  const startTime = performance.now();

  const cucumberRes = checkCucumberGherkin(gherkinText);
  const lintRes = checkGherkinLint(gherkinText);
  const matrizRes = checkMatrizConsistency(gherkinText);
  const sistarRes = checkSistarLexer(gherkinText);
  const unifiedBddRes = runUnifiedBddLinter(gherkinText);

  const checkers = [cucumberRes, lintRes, matrizRes, sistarRes, unifiedBddRes];

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

  // Calculate Quantitative Gherkin Quality Metrics
  const metrics = calculateMetrics(gherkinText, checkers, totalErrors, totalWarnings);

  return {
    overallPass,
    totalErrors,
    totalWarnings,
    executionTimeMs,
    checkers,
    errorsByLine,
    metrics
  };
}

function calculateMetrics(text, checkers, totalErrors, totalWarnings) {
  if (!text || !text.trim()) {
    return {
      featureCount: 0,
      scenarioCount: 0,
      totalStepCount: 0,
      avgStepsPerScenario: '0.0',
      uniqueStepsCount: 0,
      stepReuseRatio: '0%',
      antiPatternCount: 0,
      qualityScore: 0,
      checklist: []
    };
  }

  const lines = text.split('\n');
  let featureCount = 0;
  let scenarioCount = 0;
  const stepTexts = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('Feature:')) featureCount++;
    if (trimmed.startsWith('Scenario:') || trimmed.startsWith('Scenario Outline:') || trimmed.startsWith('Scenario Template:') || trimmed.startsWith('Example:')) {
      scenarioCount++;
    }
    const stepMatch = trimmed.match(/^(Given|When|Then|And|But|\*)\b\s*(.*)/i);
    if (stepMatch) {
      stepTexts.push(stepMatch[2].trim().toLowerCase());
    }
  });

  const totalStepCount = stepTexts.length;
  const avgStepsPerScenario = scenarioCount > 0 ? (totalStepCount / scenarioCount).toFixed(1) : '0.0';

  const uniqueStepsSet = new Set(stepTexts);
  const uniqueStepsCount = uniqueStepsSet.size;
  const reusedStepsCount = Math.max(0, totalStepCount - uniqueStepsCount);
  const stepReuseRatioNum = totalStepCount > 0 ? Math.round((reusedStepsCount / totalStepCount) * 100) : 0;
  const stepReuseRatio = `${stepReuseRatioNum}%`;

  // Count Anti-Patterns from warnings & errors
  let antiPatternCount = 0;
  checkers.forEach(c => {
    [...(c.errors || []), ...(c.warnings || [])].forEach(issue => {
      if (issue.category?.includes('Anti-Pattern') || ['imperative-steps-warning', 'one-behavior-per-scenario', 'conjunctive-step', 'no-first-person-perspective'].includes(issue.rule)) {
        antiPatternCount++;
      }
    });
  });

  // Calculate Gherkin Quality Score (0-100)
  let score = 100;
  score -= totalErrors * 15;
  score -= totalWarnings * 3;
  if (parseFloat(avgStepsPerScenario) > 10) score -= 10;
  if (antiPatternCount > 0) score -= antiPatternCount * 5;
  if (stepReuseRatioNum > 20) score += 5; // Bonus for high step reuse
  score = Math.max(0, Math.min(100, Math.round(score)));

  // BDD Review Checklist Items
  const hasSyntaxErrors = checkers.some(c => c.errors.length > 0);
  const hasImperativeWarnings = checkers.some(c => c.warnings.some(w => w.rule === 'imperative-steps-warning'));
  const hasFlowWarnings = checkers.some(c => c.warnings.some(w => w.rule === 'keywords-in-logical-order'));
  const hasMultiBehaviorWarnings = checkers.some(c => c.warnings.some(w => w.rule === 'one-behavior-per-scenario'));
  const hasTagWarnings = checkers.some(c => c.warnings.some(w => w.category?.includes('Tag')));

  const checklist = [
    {
      title: '1. Readability & Grammar',
      description: 'Capitalized keywords, clean indentation, no ending punctuation on steps.',
      pass: !hasSyntaxErrors && !checkers.some(c => c.warnings.some(w => w.rule === 'no-ending-punctuation')),
      details: 'Follows official Gherkin formatting, proper spacing, and capitalization.'
    },
    {
      title: '2. Behavior-Focused (What vs How)',
      description: 'Declarative steps describing user intent rather than low-level UI button clicks.',
      pass: !hasImperativeWarnings,
      details: hasImperativeWarnings ? 'Contains imperative UI step details (clicks/presses).' : 'Focuses on domain business outcomes.'
    },
    {
      title: '3. Given-When-Then Flow',
      description: 'Strict Given (state) ➔ When (action) ➔ Then (outcome) order.',
      pass: !hasFlowWarnings,
      details: hasFlowWarnings ? 'Keywords out of order (Given/When after Then).' : 'Strict GWT sequence maintained.'
    },
    {
      title: '4. Single Behavior per Scenario',
      description: 'Max 1 Given-When-Then sequence and 1 When action per scenario.',
      pass: !hasMultiBehaviorWarnings,
      details: hasMultiBehaviorWarnings ? 'Multiple behaviors detected in single scenario.' : 'Each scenario tests exactly 1 unit of behavior.'
    },
    {
      title: '5. DRY & Parameterization',
      description: 'Uses Background, Data Tables, and Scenario Outlines to avoid repetition.',
      pass: totalStepCount > 0 && parseFloat(avgStepsPerScenario) <= 10,
      details: `Avg ${avgStepsPerScenario} steps/scenario with ${stepReuseRatio} step reuse.`
    },
    {
      title: '6. Tagging & Taxonomy',
      description: 'Lowercase, hyphenated tags without duplication between Feature & Scenario.',
      pass: !hasTagWarnings,
      details: hasTagWarnings ? 'Tag format or duplication warnings present.' : 'Clean tag taxonomy.'
    }
  ];

  return {
    featureCount,
    scenarioCount,
    totalStepCount,
    avgStepsPerScenario,
    uniqueStepsCount,
    stepReuseRatio,
    antiPatternCount,
    qualityScore: score,
    checklist
  };
}
