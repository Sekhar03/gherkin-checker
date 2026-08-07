import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Download, Copy, Check, RefreshCw, Plus, Trash2, ArrowRightLeft, 
  Sparkles, Layers, FileCode, Play, Code2, ZoomIn, ZoomOut, Maximize2 
} from 'lucide-react';
import mermaid from 'mermaid';
import { convertGherkinToMermaid } from '../utils/gherkinToMermaid';
import { buildGherkinFromNodes, convertMermaidToGherkin } from '../utils/mermaidToGherkin';

// Initialize Mermaid with dark/light mode compatible theme
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis'
  }
});

export function FlowchartVisualizer({ isOpen, onClose, currentGherkinCode, onApplyGherkinCode }) {
  const [activeTab, setActiveTab] = useState('diagram'); // 'diagram' | 'builder' | 'pasteMermaid'
  const [mermaidCode, setMermaidCode] = useState('');
  const [renderError, setRenderError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const diagramContainerRef = useRef(null);

  // Paste Mermaid tab state
  const [pastedMermaid, setPastedMermaid] = useState('');
  const [convertedGherkinFromPaste, setConvertedGherkinFromPaste] = useState('');

  // Interactive Builder state for Flowchart -> Gherkin
  const [builderState, setBuilderState] = useState({
    featureTitle: 'User Checkout & Payment Flow',
    featureDescription: 'As a customer I want to add items to my cart and pay securely',
    scenarios: [
      {
        id: 1,
        title: 'Successful credit card purchase',
        isOutline: false,
        tags: '@smoke @payment',
        steps: [
          { id: 101, keyword: 'Given', text: 'I am logged in as a verified user' },
          { id: 102, keyword: 'And', text: 'I have a valid laptop in my shopping cart' },
          { id: 103, keyword: 'When', text: 'I proceed to checkout and enter credit card details' },
          { id: 104, keyword: 'Then', text: 'an order confirmation code is generated' },
          { id: 105, keyword: 'And', text: 'I receive an email receipt' }
        ],
        examples: { headers: [], rows: [] }
      },
      {
        id: 2,
        title: 'Payment failure with insufficient funds',
        isOutline: true,
        tags: '@regression',
        steps: [
          { id: 201, keyword: 'Given', text: 'the user account balance is <balance>' },
          { id: 202, keyword: 'When', text: 'the user attempts to pay <amount>' },
          { id: 203, keyword: 'Then', text: 'the payment is declined with error "<error>"' }
        ],
        examples: {
          headers: ['balance', 'amount', 'error'],
          rows: [
            ['$10', '$50', 'Insufficient Funds'],
            ['$0', '$100', 'Card Declined']
          ]
        }
      }
    ]
  });

  const [generatedGherkin, setGeneratedGherkin] = useState('');

  // Update Diagram whenever current Gherkin code changes or tab switches
  useEffect(() => {
    if (isOpen && activeTab === 'diagram') {
      const generatedMermaid = convertGherkinToMermaid(currentGherkinCode);
      setMermaidCode(generatedMermaid);
    }
  }, [isOpen, activeTab, currentGherkinCode]);

  // Re-render Mermaid SVG
  useEffect(() => {
    let isMounted = true;
    if (activeTab === 'diagram' && mermaidCode && diagramContainerRef.current) {
      setRenderError(null);
      const uniqueId = `mermaid_chart_${Date.now()}`;
      
      mermaid.render(uniqueId, mermaidCode)
        .then(({ svg }) => {
          if (isMounted && diagramContainerRef.current) {
            diagramContainerRef.current.innerHTML = svg;
          }
        })
        .catch(err => {
          console.error('Mermaid Render Error:', err);
          if (isMounted) {
            setRenderError('Flowchart rendering issue. Check Gherkin syntax.');
          }
        });
    }
    return () => { isMounted = false; };
  }, [mermaidCode, activeTab]);

  // Update live generated Gherkin code whenever builderState changes
  useEffect(() => {
    const code = buildGherkinFromNodes(builderState);
    setGeneratedGherkin(code);
  }, [builderState]);

  // Auto-convert pasted Mermaid code whenever it changes
  useEffect(() => {
    if (pastedMermaid && pastedMermaid.trim()) {
      const res = convertMermaidToGherkin(pastedMermaid);
      setConvertedGherkinFromPaste(res);
    }
  }, [pastedMermaid]);

  const handleCopyMermaid = () => {
    navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportSvg = () => {
    if (!diagramContainerRef.current) return;
    const svgContent = diagramContainerRef.current.innerHTML;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gherkin_scenario_flowchart.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Builder mutations
  const addScenario = () => {
    const newScId = Date.now();
    setBuilderState(prev => ({
      ...prev,
      scenarios: [
        ...prev.scenarios,
        {
          id: newScId,
          title: 'New User Journey Scenario',
          isOutline: false,
          tags: '@test',
          steps: [
            { id: Date.now() + 1, keyword: 'Given', text: 'the initial system state' },
            { id: Date.now() + 2, keyword: 'When', text: 'the user performs an action' },
            { id: Date.now() + 3, keyword: 'Then', text: 'the system verifies the outcome' }
          ],
          examples: { headers: [], rows: [] }
        }
      ]
    }));
  };

  const removeScenario = (scId) => {
    setBuilderState(prev => ({
      ...prev,
      scenarios: prev.scenarios.filter(s => s.id !== scId)
    }));
  };

  const updateScenario = (scId, key, value) => {
    setBuilderState(prev => ({
      ...prev,
      scenarios: prev.scenarios.map(s => s.id === scId ? { ...s, [key]: value } : s)
    }));
  };

  const addStep = (scId) => {
    setBuilderState(prev => ({
      ...prev,
      scenarios: prev.scenarios.map(s => {
        if (s.id !== scId) return s;
        return {
          ...s,
          steps: [
            ...s.steps,
            { id: Date.now(), keyword: 'And', text: 'another step condition' }
          ]
        };
      })
    }));
  };

  const removeStep = (scId, stepId) => {
    setBuilderState(prev => ({
      ...prev,
      scenarios: prev.scenarios.map(s => {
        if (s.id !== scId) return s;
        return {
          ...s,
          steps: s.steps.filter(st => st.id !== stepId)
        };
      })
    }));
  };

  const updateStep = (scId, stepId, key, value) => {
    setBuilderState(prev => ({
      ...prev,
      scenarios: prev.scenarios.map(s => {
        if (s.id !== scId) return s;
        return {
          ...s,
          steps: s.steps.map(st => st.id === stepId ? { ...st, [key]: value } : st)
        };
      })
    }));
  };

  const handleApplyGeneratedCode = (codeToApply) => {
    if (onApplyGherkinCode) {
      onApplyGherkinCode(codeToApply);
      onClose();
    }
  };

  const handleConvertPastedMermaid = () => {
    if (pastedMermaid && pastedMermaid.trim()) {
      const res = convertMermaidToGherkin(pastedMermaid);
      setConvertedGherkinFromPaste(res);
    }
  };

  const handleConvertCurrentDiagramToGherkin = () => {
    const res = convertMermaidToGherkin(mermaidCode);
    setPastedMermaid(mermaidCode);
    setConvertedGherkinFromPaste(res);
    setActiveTab('pasteMermaid');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="flowchart-modal-content">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="flowchart-icon-badge">
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <h2 className="modal-title">Bidirectional Visual Flowchart & Builder</h2>
              <p className="modal-subtitle">
                Gherkin ↔ Flowchart Diagram Generator & Interactive Vice Versa Scenario Builder
              </p>
            </div>
          </div>

          <div className="header-right-actions">
            {/* View Mode Tabs */}
            <div className="flowchart-tabs">
              <button
                className={`fc-tab-btn ${activeTab === 'diagram' ? 'active' : ''}`}
                onClick={() => setActiveTab('diagram')}
              >
                <Layers size={14} />
                <span>Gherkin ➔ Flowchart</span>
              </button>

              <button
                className={`fc-tab-btn ${activeTab === 'builder' ? 'active' : ''}`}
                onClick={() => setActiveTab('builder')}
              >
                <Sparkles size={14} />
                <span>Flowchart Builder ➔ Gherkin</span>
              </button>

              <button
                className={`fc-tab-btn ${activeTab === 'pasteMermaid' ? 'active' : ''}`}
                onClick={() => setActiveTab('pasteMermaid')}
              >
                <Code2 size={14} />
                <span>Mermaid Syntax ➔ Gherkin</span>
              </button>
            </div>

            <button onClick={onClose} className="modal-close-btn" title="Close Modal">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body flowchart-modal-body">
          {/* TAB 1: GHERKIN -> FLOWCHART DIAGRAM */}
          {activeTab === 'diagram' && (
            <div className="diagram-view-container">
              <div className="canvas-toolbar">
                <div className="canvas-info">
                  <span className="info-badge">Live Interactive Graph</span>
                  <span className="node-legend">
                    <span className="legend-dot green"></span> Given (State)
                    <span className="legend-dot orange"></span> When (Action)
                    <span className="legend-dot blue"></span> Then (Outcome)
                  </span>
                </div>

                <div className="canvas-controls">
                  <button onClick={() => setZoomLevel(prev => Math.min(prev + 0.2, 2.5))} className="fc-btn" title="Zoom In">
                    <ZoomIn size={14} />
                  </button>
                  <button onClick={() => setZoomLevel(1)} className="fc-btn" title="Reset Zoom">
                    <Maximize2 size={14} />
                  </button>
                  <button onClick={() => setZoomLevel(prev => Math.max(prev - 0.2, 0.4))} className="fc-btn" title="Zoom Out">
                    <ZoomOut size={14} />
                  </button>
                  <button onClick={handleCopyMermaid} className="fc-btn" title="Copy Mermaid Syntax">
                    {copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                    <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                  <button onClick={handleConvertCurrentDiagramToGherkin} className="fc-btn" title="Convert this Flowchart to Gherkin Code">
                    <ArrowRightLeft size={14} className="text-cyan" />
                    <span>Convert to Gherkin</span>
                  </button>
                  <button onClick={handleExportSvg} className="fc-btn primary" title="Download SVG Diagram">
                    <Download size={14} />
                    <span>Download SVG</span>
                  </button>
                </div>
              </div>

              {renderError ? (
                <div className="diagram-error-card">
                  <p>{renderError}</p>
                </div>
              ) : (
                <div className="diagram-canvas-scroll">
                  <div 
                    ref={diagramContainerRef} 
                    className="mermaid-svg-wrapper"
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FLOWCHART BUILDER -> GHERKIN (VICE VERSA) */}
          {activeTab === 'builder' && (
            <div className="builder-view-grid">
              {/* Left Column: Visual Flowchart Node Form */}
              <div className="builder-nodes-column">
                <div className="builder-section-header">
                  <h3>🎨 Visual Flowchart Scenario Builder</h3>
                  <button onClick={addScenario} className="btn-add-scenario">
                    <Plus size={14} />
                    <span>Add Scenario Node</span>
                  </button>
                </div>

                {/* Feature Metadata */}
                <div className="feature-input-card">
                  <div className="form-group">
                    <label>Feature Title</label>
                    <input
                      type="text"
                      className="fc-input"
                      value={builderState.featureTitle}
                      onChange={(e) => setBuilderState(prev => ({ ...prev, featureTitle: e.target.value }))}
                      placeholder="e.g. User Authentication & Login"
                    />
                  </div>
                  <div className="form-group">
                    <label>Feature Description / User Story</label>
                    <textarea
                      className="fc-textarea"
                      rows={2}
                      value={builderState.featureDescription}
                      onChange={(e) => setBuilderState(prev => ({ ...prev, featureDescription: e.target.value }))}
                      placeholder="e.g. As a registered user, I want to login so that I can access my dashboard."
                    />
                  </div>
                </div>

                {/* Scenarios List */}
                <div className="scenarios-builder-list">
                  {builderState.scenarios.map((sc, scIdx) => (
                    <div key={sc.id} className="scenario-node-card">
                      <div className="scenario-card-header">
                        <div className="scenario-title-input-row">
                          <span className="sc-number-badge">#{scIdx + 1}</span>
                          <input
                            type="text"
                            className="fc-input sc-title-field"
                            value={sc.title}
                            onChange={(e) => updateScenario(sc.id, 'title', e.target.value)}
                            placeholder="Scenario Title"
                          />
                        </div>

                        <div className="scenario-header-actions">
                          <label className="toggle-outline-label">
                            <input
                              type="checkbox"
                              checked={sc.isOutline}
                              onChange={(e) => updateScenario(sc.id, 'isOutline', e.target.checked)}
                            />
                            <span>Outline</span>
                          </label>

                          <button onClick={() => removeScenario(sc.id)} className="btn-delete-node" title="Delete Scenario">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Steps List */}
                      <div className="steps-builder-list">
                        {sc.steps.map(step => (
                          <div key={step.id} className="step-builder-row">
                            <select
                              className={`step-keyword-select kw-${step.keyword.toLowerCase()}`}
                              value={step.keyword}
                              onChange={(e) => updateStep(sc.id, step.id, 'keyword', e.target.value)}
                            >
                              <option value="Given">Given</option>
                              <option value="When">When</option>
                              <option value="Then">Then</option>
                              <option value="And">And</option>
                              <option value="But">But</option>
                            </select>

                            <input
                              type="text"
                              className="fc-input step-text-field"
                              value={step.text}
                              onChange={(e) => updateStep(sc.id, step.id, 'text', e.target.value)}
                              placeholder="Step statement text..."
                            />

                            <button onClick={() => removeStep(sc.id, step.id)} className="btn-remove-step">
                              <X size={12} />
                            </button>
                          </div>
                        ))}

                        <button onClick={() => addStep(sc.id)} className="btn-add-step">
                          <Plus size={12} />
                          <span>Add Step</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Real-Time Generated Gherkin Code Preview */}
              <div className="builder-code-column">
                <div className="code-preview-header">
                  <div className="preview-title">
                    <FileCode size={16} />
                    <span>Generated Gherkin Code</span>
                  </div>
                  <span className="live-pill">Live Code Engine</span>
                </div>

                <div className="generated-code-box">
                  <pre>{generatedGherkin}</pre>
                </div>

                <div className="builder-actions-footer">
                  <button
                    onClick={() => handleApplyGeneratedCode(generatedGherkin)}
                    className="btn-apply-gherkin"
                  >
                    <Play size={15} />
                    <span>Load Code Into Editor & Test</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PASTE MERMAID SYNTAX -> GHERKIN */}
          {activeTab === 'pasteMermaid' && (
            <div className="paste-mermaid-container">
              <div className="paste-header">
                <h3>Paste Raw Mermaid Syntax ➔ Generate Gherkin</h3>
                <p>Paste any Mermaid flowchart diagram (`graph TD`) to convert it into structured Gherkin feature code.</p>
              </div>

              <div className="paste-grid">
                <div className="paste-input-box">
                  <label>Mermaid Diagram Input (`graph TD`)</label>
                  <textarea
                    className="fc-textarea mermaid-textarea"
                    rows={14}
                    value={pastedMermaid}
                    onChange={(e) => setPastedMermaid(e.target.value)}
                    placeholder={`graph TD\n    feat["📋 Feature: User Login"]\n    sc1["🧪 Successful Login"]\n    feat --> sc1\n    step1["🟩 Given: I am on login page"]\n    sc1 --> step1\n    step2["🟧 When: I submit valid credentials"]\n    step1 --> step2\n    step3["🟦 Then: I see dashboard"]\n    step2 --> step3`}
                  />
                  <button onClick={handleConvertPastedMermaid} className="btn-convert-paste">
                    <RefreshCw size={14} />
                    <span>Convert to Gherkin</span>
                  </button>
                </div>

                <div className="paste-output-box">
                  <label>Converted Gherkin Result</label>
                  <div className="generated-code-box">
                    <pre>{convertedGherkinFromPaste || 'Click "Convert to Gherkin" above to view output...'}</pre>
                  </div>
                  {convertedGherkinFromPaste && (
                    <button
                      onClick={() => handleApplyGeneratedCode(convertedGherkinFromPaste)}
                      className="btn-apply-gherkin margin-top"
                    >
                      <Play size={15} />
                      <span>Load Code Into Editor & Test</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
