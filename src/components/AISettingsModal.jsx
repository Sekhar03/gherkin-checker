import React, { useState, useEffect } from 'react';
import { Bot, Key, Sparkles, X, Check, ExternalLink, Cpu } from 'lucide-react';

export function AISettingsModal({ isOpen, onClose, apiKey, onSaveApiKey, apiProvider, onSaveProvider }) {
  const [tempKey, setTempKey] = useState(apiKey || '');
  const [provider, setProvider] = useState(apiProvider || 'anthropic');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTempKey(apiKey || '');
      setProvider(apiProvider || 'anthropic');
    }
  }, [isOpen, apiKey, apiProvider]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    onSaveApiKey(tempKey);
    onSaveProvider(provider);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Bot size={22} className="icon-claude" />
            <span>Claude AI Auto-Fix Settings</span>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="modal-body">
          <p className="modal-desc">
            Connect Anthropic Claude API or OpenRouter to read all validation errors from the 4 checkers and automatically generate optimal Gherkin fixes using Claude 3.5 Sonnet.
          </p>

          <div className="form-group">
            <label className="form-label">
              <Cpu size={14} /> AI Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="form-select"
            >
              <option value="anthropic">Anthropic API (Claude 3.5 Sonnet)</option>
              <option value="openrouter">OpenRouter API (Claude 3.5 Sonnet)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              <Key size={14} /> {provider === 'anthropic' ? 'Anthropic Claude API Key' : 'OpenRouter API Key'} (Optional)
            </label>
            <input
              type="password"
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              placeholder={provider === 'anthropic' ? 'sk-ant-api...' : 'sk-or-v1...'}
              className="form-input"
            />
            <span className="input-hint">
              Leave blank to use the built-in Intelligent AI Gherkin Fixer engine automatically.
            </span>
          </div>

          <div className="modal-footer">
            <a
              href={provider === 'anthropic' ? 'https://console.anthropic.com/settings/keys' : 'https://openrouter.ai/keys'}
              target="_blank"
              rel="noreferrer"
              className="btn-get-key"
            >
              <ExternalLink size={13} /> Get {provider === 'anthropic' ? 'Anthropic' : 'OpenRouter'} Key
            </a>

            <div className="modal-actions">
              {tempKey && (
                <button
                  type="button"
                  onClick={() => {
                    setTempKey('');
                    onSaveApiKey('');
                  }}
                  className="btn-cancel"
                  title="Remove saved API key and use built-in engine"
                >
                  Clear Key
                </button>
              )}
              <button type="button" onClick={onClose} className="btn-cancel">
                Cancel
              </button>
              <button type="submit" className="btn-save-key">
                {savedSuccess ? <Check size={16} /> : <Sparkles size={16} />}
                <span>{savedSuccess ? 'Saved!' : 'Save & Connect'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
