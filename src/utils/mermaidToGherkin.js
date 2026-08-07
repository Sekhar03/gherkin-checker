/**
 * Utility for Vice Versa Conversion:
 * 1. Converts Visual Builder State (Feature -> Scenarios -> Steps -> Examples) to clean Gherkin .feature code.
 * 2. Parses raw Mermaid flowchart text (graph TD) back into clean Gherkin syntax.
 */

export function buildGherkinFromNodes(builderState) {
  const { featureTitle, featureDescription, scenarios } = builderState;
  let codeLines = [];

  // Feature
  if (featureTitle && featureTitle.trim()) {
    codeLines.push(`Feature: ${featureTitle.trim()}`);
  } else {
    codeLines.push(`Feature: Automated User Feature`);
  }

  if (featureDescription && featureDescription.trim()) {
    const descLines = featureDescription.trim().split('\n');
    descLines.forEach(l => codeLines.push(`  ${l.trim()}`));
  }
  codeLines.push('');

  // Scenarios
  scenarios.forEach((sc, scIdx) => {
    const scType = sc.isOutline ? 'Scenario Outline' : 'Scenario';
    const scTitle = sc.title && sc.title.trim() ? sc.title.trim() : `Scenario ${scIdx + 1}`;
    
    // Tags
    if (sc.tags && sc.tags.trim()) {
      codeLines.push(`  ${sc.tags.trim()}`);
    }

    codeLines.push(`  ${scType}: ${scTitle}`);

    // Steps
    if (sc.steps && sc.steps.length > 0) {
      sc.steps.forEach(step => {
        const kw = step.keyword || 'Given';
        const txt = step.text || '';
        codeLines.push(`    ${kw} ${txt}`.trimEnd());
      });
    } else {
      codeLines.push('    Given the system is initialized');
      codeLines.push('    When an event occurs');
      codeLines.push('    Then the system state is updated');
    }

    // Examples table for Scenario Outlines
    if (sc.isOutline && sc.examples && sc.examples.headers && sc.examples.headers.length > 0) {
      codeLines.push('');
      codeLines.push('    Examples:');
      const headerRow = '| ' + sc.examples.headers.join(' | ') + ' |';
      codeLines.push(`      ${headerRow}`);
      
      if (sc.examples.rows && sc.examples.rows.length > 0) {
        sc.examples.rows.forEach(row => {
          const rowStr = '| ' + row.join(' | ') + ' |';
          codeLines.push(`      ${rowStr}`);
        });
      } else {
        const dummyRow = '| ' + sc.examples.headers.map(() => 'val').join(' | ') + ' |';
        codeLines.push(`      ${dummyRow}`);
      }
    }

    codeLines.push('');
  });

  return codeLines.join('\n').trim() + '\n';
}

/**
 * Parses raw Mermaid syntax (graph TD) back into clean Gherkin .feature code
 */
export function convertMermaidToGherkin(mermaidSyntax) {
  if (!mermaidSyntax || !mermaidSyntax.trim()) {
    return 'Feature: New Feature\n\n  Scenario: Sample Scenario\n    Given I start the workflow\n    When I execute the task\n    Then the result is successful';
  }

  const lines = mermaidSyntax.split(/\r?\n/);
  let featureTitle = 'Visual Flowchart Feature';
  let currentScenario = null;
  const scenarios = [];

  lines.forEach(rawLine => {
    const line = rawLine.trim();
    if (!line || line.startsWith('graph') || line.startsWith('style') || line.startsWith('subgraph') || line.startsWith('end')) {
      return;
    }

    // Look for node definitions like: node_1["📋 Feature: Title"] or node_2["🧪 Scenario Title"]
    const nodeMatch = line.match(/^\s*([A-Za-z0-9_]+)\["([^"]+)"\]/);
    if (nodeMatch) {
      let content = nodeMatch[2]
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#124;/g, '|');

      // Feature match
      if (content.includes('Feature:')) {
        featureTitle = content.replace(/.*Feature:/i, '').trim();
      }
      // Scenario match
      else if (content.includes('Scenario') || content.includes('🧪') || content.includes('🔄')) {
        const isOutline = content.includes('Scenario Outline') || content.includes('🔄');
        const title = content.replace(/^[🧪🔄]\s*/, '').replace(/.*Scenario (Outline|Template)?:?/i, '').trim() || 'Scenario';
        currentScenario = {
          title,
          isOutline,
          steps: [],
          examples: { headers: [], rows: [] }
        };
        scenarios.push(currentScenario);
      }
      // Step match (Given/When/Then/And/But)
      else if (/^(🟩|🟧|🟦|🟣|Given|When|Then|And|But)/.test(content)) {
        let cleanStep = content
          .replace(/^[🟩🟧🟦🟣]\s*/, '')
          .replace(/^(Given|When|Then|And|But):?/i, '$1')
          .trim();

        const kwMatch = cleanStep.match(/^(Given|When|Then|And|But)\s*(.*)/i);
        if (kwMatch && currentScenario) {
          currentScenario.steps.push({
            keyword: kwMatch[1],
            text: kwMatch[2]
          });
        }
      }
      // Table row match
      else if (content.startsWith('|')) {
        if (currentScenario) {
          const cells = content.split('|').map(c => c.trim()).filter(Boolean);
          if (currentScenario.examples.headers.length === 0) {
            currentScenario.examples.headers = cells;
          } else {
            currentScenario.examples.rows.push(cells);
          }
        }
      }
    }
  });

  if (scenarios.length === 0) {
    scenarios.push({
      title: 'Converted Flowchart Scenario',
      isOutline: false,
      steps: [
        { keyword: 'Given', text: 'the flowchart diagram is imported' },
        { keyword: 'When', text: 'it is converted to Gherkin syntax' },
        { keyword: 'Then', text: 'valid feature code is generated' }
      ]
    });
  }

  return buildGherkinFromNodes({
    featureTitle,
    featureDescription: 'Generated from Visual Flowchart Diagram',
    scenarios
  });
}
