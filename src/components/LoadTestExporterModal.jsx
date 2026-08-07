import React, { useState, useEffect } from 'react';
import { X, Download, Copy, Check, Gauge, Server, Clock, Users, Code2, Sparkles, FileCode } from 'lucide-react';
import { generateK6Script, generateJMeterScript, generateGatlingScript } from '../utils/loadTestGenerator';

export function LoadTestExporterModal({ isOpen, onClose, gherkinCode }) {
  const [targetHost, setTargetHost] = useState('https://api.example.com');
  const [vus, setVus] = useState(100);
  const [duration, setDuration] = useState('30s');
  const [activeTab, setActiveTab] = useState('k6'); // 'k6' | 'jmeter' | 'gatling'
  const [generatedScript, setGeneratedScript] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const config = { vus, duration, targetHost };
      if (activeTab === 'k6') {
        setGeneratedScript(generateK6Script(gherkinCode, config));
      } else if (activeTab === 'jmeter') {
        setGeneratedScript(generateJMeterScript(gherkinCode, config));
      } else if (activeTab === 'gatling') {
        setGeneratedScript(generateGatlingScript(gherkinCode, config));
      }
    }
  }, [isOpen, activeTab, vus, duration, targetHost, gherkinCode]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    let filename = 'k6_load_test.js';
    let mimeType = 'text/javascript';

    if (activeTab === 'jmeter') {
      filename = 'jmeter_test_plan.jmx';
      mimeType = 'application/xml';
    } else if (activeTab === 'gatling') {
      filename = 'GatlingSimulation.scala';
      mimeType = 'text/plain';
    }

    const blob = new Blob([generatedScript], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-backdrop">
      <div className="loadtest-modal-content">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="loadtest-icon-badge">
              <Gauge size={22} />
            </div>
            <div>
              <h2 className="modal-title">Performance & Load Test Generator</h2>
              <p className="modal-subtitle">
                Convert Gherkin scenarios into high-concurrency load testing scripts (k6, JMeter & Gatling)
              </p>
            </div>
          </div>

          <button onClick={onClose} className="modal-close-btn" title="Close Modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body loadtest-modal-body">
          {/* Controls Bar */}
          <div className="loadtest-config-card">
            <div className="config-grid">
              <div className="config-item">
                <label><Server size={14} /> Target Host URL</label>
                <input
                  type="text"
                  className="fc-input"
                  value={targetHost}
                  onChange={(e) => setTargetHost(e.target.value)}
                  placeholder="https://api.example.com"
                />
              </div>

              <div className="config-item">
                <label><Users size={14} /> Virtual Users (VUs): <span className="highlight-val">{vus} VUs</span></label>
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={vus}
                  onChange={(e) => setVus(Number(e.target.value))}
                  className="range-slider"
                />
              </div>

              <div className="config-item">
                <label><Clock size={14} /> Peak Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="fc-input"
                >
                  <option value="30s">30 Seconds</option>
                  <option value="1m">1 Minute</option>
                  <option value="5m">5 Minutes</option>
                  <option value="15m">15 Minutes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Code Tabs & Display */}
          <div className="loadtest-code-section">
            <div className="code-toolbar">
              <div className="framework-tabs">
                <button
                  className={`fw-tab-btn ${activeTab === 'k6' ? 'active' : ''}`}
                  onClick={() => setActiveTab('k6')}
                >
                  <Code2 size={14} /> k6 (JavaScript)
                </button>

                <button
                  className={`fw-tab-btn ${activeTab === 'jmeter' ? 'active' : ''}`}
                  onClick={() => setActiveTab('jmeter')}
                >
                  <FileCode size={14} /> JMeter (.jmx XML)
                </button>

                <button
                  className={`fw-tab-btn ${activeTab === 'gatling' ? 'active' : ''}`}
                  onClick={() => setActiveTab('gatling')}
                >
                  <Sparkles size={14} /> Gatling (Scala)
                </button>
              </div>

              <div className="code-actions">
                <button onClick={handleCopy} className="fc-btn" title="Copy Script">
                  {copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy Script'}</span>
                </button>
                <button onClick={handleDownload} className="fc-btn primary" title="Download Load Test File">
                  <Download size={14} />
                  <span>Download {activeTab.toUpperCase()} Script</span>
                </button>
              </div>
            </div>

            <div className="generated-code-box loadtest-code-box">
              <pre>{generatedScript}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
