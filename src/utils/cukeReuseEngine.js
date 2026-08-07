/**
 * CukeReuse Engine (JS Port of amughalbscs16/cukereuse-release)
 * Static detector for duplicate & near-duplicate step text in Gherkin feature files.
 * Uses Levenshtein similarity (threshold 0.80) & Canonical Phrasing Selection algorithm.
 */

/**
 * Normalizes text: collapses whitespace and trims edges
 */
export function normalizeStepText(text) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Calculate Levenshtein Edit Distance similarity ratio (0.0 to 1.0)
 */
export function levenshteinSimilarity(a, b) {
  const normA = normalizeStepText(a);
  const normB = normalizeStepText(b);

  if (normA === normB) return 1.0;
  if (!normA.length || !normB.length) return 0.0;

  const lenA = normA.length;
  const lenB = normB.length;

  const matrix = Array.from({ length: lenA + 1 }, () => new Int32Array(lenB + 1));

  for (let i = 0; i <= lenA; i++) matrix[i][0] = i;
  for (let j = 0; j <= lenB; j++) matrix[0][j] = j;

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = normA[i - 1] === normB[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,       // Deletion
        matrix[i][j - 1] + 1,       // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      );
    }
  }

  const distance = matrix[lenA][lenB];
  const maxLen = Math.max(lenA, lenB);
  return 1.0 - distance / maxLen;
}

/**
 * Counts quoted parameters ("admin", 'test') in step text
 */
function getQuotedParamCount(text) {
  const matches = text.match(/"[^"\\]*"|'[^'\\]*'/g);
  return matches ? matches.length : 0;
}

/**
 * Selects the optimal Canonical Phrasing from a cluster of near-duplicate steps.
 * Ranking Criteria (Ported directly from CukeReuse canonical.py):
 * 1. Higher Frequency (-count)
 * 2. Fewer Quoted Parameters (prefers generic reusable phrasings over hardcoded fixtures)
 * 3. Shorter String Length
 * 4. Alphabetical tie-breaking
 */
export function pickCanonicalText(texts) {
  if (!texts || texts.length === 0) return '';

  const frequencyMap = new Map();
  texts.forEach(t => {
    frequencyMap.set(t, (frequencyMap.get(t) || 0) + 1);
  });

  const uniqueTexts = Array.from(frequencyMap.keys());

  uniqueTexts.sort((a, b) => {
    // 1. Frequency (descending)
    const freqA = frequencyMap.get(a);
    const freqB = frequencyMap.get(b);
    if (freqA !== freqB) return freqB - freqA;

    // 2. Fewer quoted parameters (ascending)
    const paramA = getQuotedParamCount(a);
    const paramB = getQuotedParamCount(b);
    if (paramA !== paramB) return paramA - paramB;

    // 3. Shorter length (ascending)
    if (a.length !== b.length) return a.length - b.length;

    // 4. Alphabetical tiebreak
    return a.localeCompare(b);
  });

  return uniqueTexts[0] || '';
}

/**
 * Main Analysis Engine: Finds Exact & Near-Duplicate Step Clusters
 */
export function analyzeStepDuplication(gherkinCode, levThreshold = 0.80) {
  if (!gherkinCode || !gherkinCode.trim()) {
    return {
      totalSteps: 0,
      exactClusters: [],
      nearDuplicateClusters: [],
      duplicationRate: '0%',
      duplicationRateNum: 0
    };
  }

  const lines = gherkinCode.split(/\r?\n/);
  const steps = [];

  lines.forEach((l, idx) => {
    const lineNum = idx + 1;
    const trimmed = l.trim();
    const match = trimmed.match(/^(Given|When|Then|And|But|\*)\b\s*(.*)/i);
    if (match) {
      const keyword = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      const text = match[2].trim();
      steps.push({
        line: lineNum,
        keyword,
        text,
        normalized: normalizeStepText(text)
      });
    }
  });

  const totalSteps = steps.length;
  if (totalSteps === 0) {
    return {
      totalSteps: 0,
      exactClusters: [],
      nearDuplicateClusters: [],
      duplicationRate: '0%',
      duplicationRateNum: 0
    };
  }

  // Group Exact Duplicates
  const exactMap = new Map();
  steps.forEach(st => {
    const key = st.normalized.toLowerCase();
    if (!exactMap.has(key)) {
      exactMap.set(key, []);
    }
    exactMap.get(key).push(st);
  });

  const exactClusters = [];
  exactMap.forEach((members, key) => {
    if (members.length > 1) {
      const texts = members.map(m => m.text);
      const canonical = pickCanonicalText(texts);
      exactClusters.push({
        canonical,
        members,
        count: members.length
      });
    }
  });

  // Group Near-Duplicate Clusters (using Levenshtein similarity >= levThreshold)
  const visited = new Set();
  const nearDuplicateClusters = [];

  for (let i = 0; i < steps.length; i++) {
    if (visited.has(i)) continue;

    const clusterMembers = [steps[i]];
    visited.add(i);

    for (let j = i + 1; j < steps.length; j++) {
      if (visited.has(j)) continue;

      const sim = levenshteinSimilarity(steps[i].text, steps[j].text);
      if (sim >= levThreshold) {
        clusterMembers.push(steps[j]);
        visited.add(j);
      }
    }

    if (clusterMembers.length > 1) {
      const texts = clusterMembers.map(m => m.text);
      const canonical = pickCanonicalText(texts);
      nearDuplicateClusters.push({
        canonical,
        members: clusterMembers,
        count: clusterMembers.length
      });
    }
  }

  // Calculate CukeReuse Duplication Rate
  const duplicateStepsCount = nearDuplicateClusters.reduce((acc, cl) => acc + cl.count, 0);
  const duplicationRateNum = Math.round((duplicateStepsCount / totalSteps) * 100);
  const duplicationRate = `${duplicationRateNum}%`;

  return {
    totalSteps,
    exactClusters,
    nearDuplicateClusters,
    duplicationRate,
    duplicationRateNum
  };
}
