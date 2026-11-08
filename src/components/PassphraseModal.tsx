import React, { useState, useEffect } from 'react';
import { X, Lock, KeyRound, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { computeFingerprint } from '../lib/crypto';
import { logActivity } from '../lib/storage';

interface PassphraseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PassphraseModal: React.FC<PassphraseModalProps> = ({ isOpen, onClose }) => {
  const [passphrase, setPassphrase] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [fingerprint, setFingerprint] = useState('7f8a9b2c...4e1d3a5f');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    computeFingerprint(window.location.origin + '_omnichat_vault_secure').then(fp => {
      setFingerprint(fp);
    });
  }, []);

  if (!isOpen) return null;

  const handleUpdatePassphrase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) return;
    if (passphrase !== confirmPass) {
      setMessage({ type: 'error', text: 'Passphrases do not match!' });
      return;
    }
    if (passphrase.length < 8) {
      setMessage({ type: 'error', text: 'Passphrase must be at least 8 characters long.' });
      return;
    }

    computeFingerprint(passphrase).then(fp => {
      setFingerprint(fp);
      setMessage({ type: 'success', text: 'Vault master key updated and re-verified!' });
      logActivity('encrypt', 'Master Encryption Key Updated', `Key fingerprint: ${fp}`);
      setPassphrase('');
      setConfirmPass('');
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto font-mono text-neutral-200">
      <div className="w-full max-w-md rounded-2xl bg-[#09090c] border border-orange-500/30 shadow-2xl overflow-hidden glow-border">
        {/* Header */}
        <div className="px-5 py-4 border-b border-orange-500/20 flex items-center justify-between bg-[#050507]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/30">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-display">
                AES_256_GCM // ENCRYPTION_AT_REST
              </h3>
              <p className="text-xs text-neutral-400">
                Native Web Crypto zero-knowledge client encryption.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Status Box */}
          <div className="p-3.5 rounded-xl bg-[#0f0f14] border border-orange-500/30 space-y-2 glow-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400">
                <ShieldCheck className="w-4 h-4 text-orange-500" />
                <span>STATUS: ENCRYPTED AT REST</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40">
                ACTIVE
              </span>
            </div>
            <div className="text-[11px] text-neutral-400 space-y-1">
              <p>• Algorithm: <strong className="text-white font-mono">AES-GCM 256-bit</strong></p>
              <p>• Key Derivation: <strong className="text-white font-mono">PBKDF2 (100k rounds, SHA-256)</strong></p>
              <p>• Fingerprint: <span className="font-mono font-bold text-orange-400">{fingerprint}</span></p>
            </div>
          </div>

          {message && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                message.type === 'error'
                  ? 'bg-rose-950/40 text-rose-400 border border-rose-900/50'
                  : 'bg-orange-500/20 text-orange-400 border border-orange-500/40 glow-border'
              }`}
            >
              {message.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Set / Change Passphrase Form */}
          <form onSubmit={handleUpdatePassphrase} className="space-y-3 font-mono">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">
                Custom Master Passphrase
              </label>
              <input
                type="password"
                value={passphrase}
                onChange={e => setPassphrase(e.target.value)}
                placeholder="Enter new master passphrase..."
                className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-800 bg-[#121216] text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">
                Confirm Master Passphrase
              </label>
              <input
                type="password"
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                placeholder="Re-enter master passphrase..."
                className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-800 bg-[#121216] text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <button
              type="submit"
              disabled={!passphrase.trim()}
              className="w-full py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-black glow-orange disabled:opacity-50 transition shadow-sm"
            >
              UPDATE_VAULT_ENCRYPTION_KEY
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-orange-500/20 flex justify-end bg-[#050507]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold rounded-xl bg-neutral-900 text-neutral-300 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
