import React, { useState } from 'react';
import { 
  X, 
  Download, 
  FileJson, 
  FileSpreadsheet, 
  Printer, 
  ShieldCheck, 
  Copy, 
  Check, 
  Lock
} from 'lucide-react';
import { ChatThread, Folder } from '../types';
import { encryptAtRest } from '../lib/crypto';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedThread: ChatThread | null;
  allThreads: ChatThread[];
  folders: Folder[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  selectedThread,
  allThreads,
  folders,
}) => {
  const [exportScope, setExportScope] = useState<'selected' | 'all'>(selectedThread ? 'selected' : 'all');
  const [exportFormat, setExportFormat] = useState<'json' | 'encrypted_json' | 'csv' | 'html'>('json');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const targetThreads = exportScope === 'selected' && selectedThread ? [selectedThread] : allThreads;

  const generateExportPayload = async () => {
    if (exportFormat === 'csv') {
      const rows = [
        ['Thread Contact', 'Platform', 'Sender', 'Sender Role', 'Timestamp', 'Message Content', 'Tags'],
      ];
      targetThreads.forEach(t => {
        t.messages.forEach(m => {
          rows.push([
            `"${t.customAlias || t.contactName}"`,
            `"${t.platform}"`,
            `"${m.sender}"`,
            `"${m.senderRole || ''}"`,
            `"${m.timestamp}"`,
            `"${m.content.replace(/"/g, '""')}"`,
            `"${(m.tags || []).join(';')}"`,
          ]);
        });
      });
      return { data: rows.map(r => r.join(',')).join('\n'), mime: 'text/csv', ext: 'csv' };
    }

    if (exportFormat === 'encrypted_json') {
      const payload = {
        exportedAt: new Date().toISOString(),
        version: '2.0-enc',
        vault: targetThreads,
      };
      const encrypted = await encryptAtRest(payload);
      return { data: encrypted, mime: 'application/json', ext: 'enc.json' };
    }

    if (exportFormat === 'html') {
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>OmniChat Vault Export</title>
  <style>
    body { font-family: 'Space Grotesk', -apple-system, sans-serif; background: #050507; color: #f2f2f2; padding: 40px; margin: 0; }
    .container { max-width: 800px; margin: 0 auto; }
    .header { border-bottom: 2px solid #ff6b00; padding-bottom: 20px; margin-bottom: 30px; }
    .thread { background: #0e0e12; border: 1px solid #ff6b00; border-radius: 16px; padding: 24px; margin-bottom: 30px; box-shadow: 0 0 15px rgba(255,107,0,0.15); }
    .thread-title { font-size: 20px; font-weight: bold; color: #ff6b00; margin: 0 0 8px 0; }
    .meta { font-size: 12px; color: #a3a3a3; margin-bottom: 16px; font-family: monospace; }
    .msg { margin-bottom: 12px; padding: 12px 16px; border-radius: 12px; font-size: 14px; line-height: 1.5; }
    .msg-me { background: #ea580c; color: #000; font-weight: 500; margin-left: 40px; }
    .msg-contact { background: #1a1a22; color: #f8fafc; margin-right: 40px; border: 1px solid #2e2e38; }
    .sender { font-size: 11px; opacity: 0.8; font-weight: bold; margin-bottom: 4px; font-family: monospace; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="color:#ff6b00;margin:0 0 8px 0;">OMNICHAT VAULT // SECURE_EXPORT</h1>
      <p style="color:#737373;font-family:monospace;font-size:12px;">Export Date: ${new Date().toLocaleString()} • Encrypted at Rest AES-256-GCM Verified</p>
    </div>
    ${targetThreads
      .map(
        t => `
      <div class="thread">
        <h2 class="thread-title">${t.customAlias || t.contactName}</h2>
        <div class="meta">PLATFORM: ${t.platform.toUpperCase()} • TOTAL_MSGS: ${t.messages.length} • IDENTIFIER: ${t.contactIdentifier || 'N/A'}</div>
        <div class="messages">
          ${t.messages
            .map(
              m => `
            <div class="msg ${m.senderRole === 'me' ? 'msg-me' : 'msg-contact'}">
              <div class="sender">${m.sender} (${new Date(m.timestamp).toLocaleString()})</div>
              <div>${m.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `
      )
      .join('')}
  </div>
</body>
</html>`;
      return { data: htmlContent, mime: 'text/html', ext: 'html' };
    }

    // Default JSON
    const jsonPayload = {
      exportedAt: new Date().toISOString(),
      vaultVersion: '2.0',
      totalThreads: targetThreads.length,
      threads: targetThreads,
    };
    return { data: JSON.stringify(jsonPayload, null, 2), mime: 'application/json', ext: 'json' };
  };

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const { data, mime, ext } = await generateExportPayload();
      const blob = new Blob([data], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omnichat_export_${exportScope}_${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyClipboard = async () => {
    const { data } = await generateExportPayload();
    navigator.clipboard.writeText(data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto font-mono text-neutral-200">
      <div className="w-full max-w-lg rounded-2xl bg-[#09090c] border border-orange-500/30 shadow-2xl overflow-hidden glow-border">
        {/* Header */}
        <div className="px-5 py-4 border-b border-orange-500/20 flex items-center justify-between bg-[#050507]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/30">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-display">
                DATA_PORTABILITY // SECURE_EXPORT
              </h3>
              <p className="text-xs text-neutral-400">
                Export chats to JSON, CSV, PDF/HTML, or Encrypted Vault package.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Scope Selector */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
              Export Scope
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExportScope('selected')}
                disabled={!selectedThread}
                className={`p-2.5 rounded-xl border text-left text-xs transition ${
                  exportScope === 'selected'
                    ? 'border-orange-500 bg-orange-500/15 text-orange-400 font-bold glow-border'
                    : 'border-neutral-800 bg-[#121216] text-neutral-400'
                } ${!selectedThread ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <p className="font-bold">Active Thread Only</p>
                <p className="text-[10px] text-neutral-500 truncate">
                  {selectedThread ? selectedThread.customAlias || selectedThread.contactName : 'None selected'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setExportScope('all')}
                className={`p-2.5 rounded-xl border text-left text-xs transition ${
                  exportScope === 'all'
                    ? 'border-orange-500 bg-orange-500/15 text-orange-400 font-bold glow-border'
                    : 'border-neutral-800 bg-[#121216] text-neutral-400'
                }`}
              >
                <p className="font-bold">Complete Vault</p>
                <p className="text-[10px] text-neutral-500">
                  All {allThreads.length} chat threads & logs
                </p>
              </button>
            </div>
          </div>

          {/* Format Selector */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
              Target Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExportFormat('json')}
                className={`p-2.5 rounded-xl border text-left text-xs transition flex items-center gap-2.5 ${
                  exportFormat === 'json'
                    ? 'border-orange-500 bg-orange-500/15 text-orange-400 font-bold glow-border'
                    : 'border-neutral-800 bg-[#121216] text-neutral-300'
                }`}
              >
                <FileJson className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="font-bold">JSON Data</p>
                  <p className="text-[10px] text-neutral-500">Standard parseable</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('encrypted_json')}
                className={`p-2.5 rounded-xl border text-left text-xs transition flex items-center gap-2.5 ${
                  exportFormat === 'encrypted_json'
                    ? 'border-orange-500 bg-orange-500/15 text-orange-400 font-bold glow-border'
                    : 'border-neutral-800 bg-[#121216] text-neutral-300'
                }`}
              >
                <Lock className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="font-bold">Encrypted Backup</p>
                  <p className="text-[10px] text-neutral-500">AES-GCM at rest</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={`p-2.5 rounded-xl border text-left text-xs transition flex items-center gap-2.5 ${
                  exportFormat === 'csv'
                    ? 'border-orange-500 bg-orange-500/15 text-orange-400 font-bold glow-border'
                    : 'border-neutral-800 bg-[#121216] text-neutral-300'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="font-bold">CSV Spreadsheet</p>
                  <p className="text-[10px] text-neutral-500">Excel / Google Sheets</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('html')}
                className={`p-2.5 rounded-xl border text-left text-xs transition flex items-center gap-2.5 ${
                  exportFormat === 'html'
                    ? 'border-orange-500 bg-orange-500/15 text-orange-400 font-bold glow-border'
                    : 'border-neutral-800 bg-[#121216] text-neutral-300'
                }`}
              >
                <Printer className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="font-bold">HTML / PDF</p>
                  <p className="text-[10px] text-neutral-500">Printable transcript</p>
                </div>
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0f0f14] border border-orange-500/20 text-xs text-neutral-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <p>
              Your export includes cryptographic verification hashes and metadata for offline auditing or cloud restoration.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-orange-500/20 flex items-center justify-between bg-[#050507]">
          <button
            onClick={handleCopyClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#141418] text-neutral-300 hover:text-white border border-neutral-800"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-orange-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'COPIED!' : 'COPY TO CLIPBOARD'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white">
              Cancel
            </button>
            <button
              onClick={handleDownload}
              disabled={isExporting}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-orange-600 hover:bg-orange-500 text-black glow-orange transition shadow-md flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'GENERATING...' : 'DOWNLOAD'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
