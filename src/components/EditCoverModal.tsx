import React, { useState } from 'react';
import { X, Image as ImageIcon, Check } from 'lucide-react';
import { ChatThread } from '../types';
import { PRESET_FEATURE_COVERS } from '../lib/storage';

interface EditCoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  thread: ChatThread;
  onSave: (threadId: string, updates: {
    customAlias?: string;
    contactIdentifier?: string;
    featureImage?: string;
    notes?: string;
  }) => void;
}

export const EditCoverModal: React.FC<EditCoverModalProps> = ({
  isOpen,
  onClose,
  thread,
  onSave,
}) => {
  const [alias, setAlias] = useState(thread.customAlias || '');
  const [identifier, setIdentifier] = useState(thread.contactIdentifier || '');
  const [featureImage, setFeatureImage] = useState(thread.featureImage || PRESET_FEATURE_COVERS[0].url);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [notes, setNotes] = useState(thread.notes || '');

  if (!isOpen) return null;

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (customImageUrl.trim()) {
      setFeatureImage(customImageUrl.trim());
      setCustomImageUrl('');
    }
  };

  const handleSave = () => {
    onSave(thread.id, {
      customAlias: alias.trim() || undefined,
      contactIdentifier: identifier.trim() || undefined,
      featureImage,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto font-mono text-neutral-200">
      <div className="w-full max-w-lg rounded-2xl bg-[#09090c] border border-orange-500/30 shadow-2xl overflow-hidden glow-border">
        {/* Header */}
        <div className="px-5 py-4 border-b border-orange-500/20 flex items-center justify-between bg-[#050507]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/30">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-display">
                CUSTOMIZE_FEATURE_COVER & ALIAS
              </h3>
              <p className="text-xs text-neutral-400">
                Personalize thread identifiers, album covers, and notes.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Live Preview Card */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-orange-400 mb-1.5">
              // LIVE_COVER_PREVIEW
            </label>
            <div className="relative h-32 w-full rounded-2xl overflow-hidden shadow-md border border-neutral-800">
              <img
                src={featureImage}
                alt="Feature cover preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-600/90 text-black backdrop-blur-xs font-mono">
                  {thread.platform}
                </span>
                <h4 className="text-sm font-bold mt-1 font-sans">
                  {alias || thread.contactName}
                </h4>
                <p className="text-[11px] text-neutral-400 font-mono">
                  {identifier || 'No identifier'} • {thread.messageCount} messages
                </p>
              </div>
            </div>
          </div>

          {/* Custom Name / Alias Input */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1">
              Custom Name / Alias
            </label>
            <input
              type="text"
              value={alias}
              onChange={e => setAlias(e.target.value)}
              placeholder="e.g. Lead Architect, Secret Project Alpha"
              className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-800 bg-[#121216] text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            <p className="text-[10px] text-neutral-400 mt-1">
              Original extracted name: <span className="font-semibold text-neutral-300">{thread.contactName}</span>
            </p>
          </div>

          {/* Identifier Input */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1">
              Contact Identifier (Phone / Handle / Email)
            </label>
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="e.g. +1 415 889 0192 or @sarah_c"
              className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-800 bg-[#121216] text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          {/* Presets Grid */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
              Curated Album & Feature Covers
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_FEATURE_COVERS.map(cover => (
                <div
                  key={cover.id}
                  onClick={() => setFeatureImage(cover.url)}
                  className={`relative h-20 rounded-xl overflow-hidden cursor-pointer border-2 transition ${
                    featureImage === cover.url
                      ? 'border-orange-500 ring-2 ring-orange-500/50 scale-[1.02]'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={cover.url} alt={cover.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30" />
                  <span className="absolute bottom-1.5 left-1.5 text-[9px] font-bold text-white bg-black/80 px-1 rounded truncate">
                    {cover.name}
                  </span>
                  {featureImage === cover.url && (
                    <div className="absolute top-1.5 right-1.5 p-0.5 rounded-full bg-orange-500 text-black">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Custom Image URL option */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1">
              Or Use Custom Image URL
            </label>
            <form onSubmit={handleApplyCustomUrl} className="flex gap-2">
              <input
                type="url"
                value={customImageUrl}
                onChange={e => setCustomImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="flex-1 text-xs px-3 py-2 rounded-xl border border-neutral-800 bg-[#121216] text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              <button
                type="submit"
                disabled={!customImageUrl.trim()}
                className="px-3 py-2 text-xs font-bold rounded-xl bg-neutral-800 text-orange-400 hover:bg-neutral-700 disabled:opacity-40"
              >
                Apply
              </button>
            </form>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1">
              Contact Notes / Description
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Private notes about this conversation or contact..."
              rows={2}
              className="w-full text-xs p-2.5 rounded-xl border border-neutral-800 bg-[#121216] text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-orange-500/20 flex items-center justify-end gap-2 bg-[#050507]">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-orange-600 hover:bg-orange-500 text-black glow-orange transition shadow-md"
          >
            Save Customizations
          </button>
        </div>
      </div>
    </div>
  );
};
