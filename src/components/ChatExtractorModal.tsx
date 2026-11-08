import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  Folder as FolderIcon, 
  Tag as TagIcon, 
  Database,
  ArrowRight,
  Terminal,
  Cpu,
  Wand2,
  Check
} from 'lucide-react';
import { PlatformType, Folder, ChatTag, ChatThread } from '../types';
import { parseChatTranscript, ExtractedChatResult } from '../lib/parser';
import { PRESET_FEATURE_COVERS } from '../lib/storage';
import { suggestTagsForChat, SuggestedTagResult } from '../lib/aiLabeler';

interface ChatExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingThreads: ChatThread[];
  folders: Folder[];
  tags: ChatTag[];
  initialTargetThread?: ChatThread | null;
  onSaveExtraction: (params: {
    contactName: string;
    customAlias?: string;
    contactIdentifier?: string;
    platform: PlatformType;
    messages: any[];
    folderId?: string;
    tags?: string[];
    featureImage?: string;
    forceNewThread?: boolean;
  }) => Promise<void>;
}

const SAMPLE_TRANSCRIPTS: Record<string, { label: string; platform: PlatformType; text: string }> = {
  whatsapp: {
    label: 'WhatsApp Export',
    platform: 'whatsapp',
    text: `[11/08/26, 14:10:05] Sarah Chen: Hey team, I just pushed the zero-knowledge client encryption module.
[11/08/26, 14:11:20] You: Awesome, is it using AES-GCM 256 with PBKDF2 salt derivation?
[11/08/26, 14:12:45] Sarah Chen: Exactly. 100,000 iterations via native Web Crypto API.
[11/08/26, 14:15:10] Sarah Chen: Also verified the Supabase real-time broadcast channel. All tabs sync in under 5ms.
[11/08/26, 14:18:00] You: Perfect, let's run the end-to-end audit now.`,
  },
  chatgpt: {
    label: 'ChatGPT / AI Log',
    platform: 'chatgpt',
    text: `User: What is the optimal architecture for syncing encrypted local storage with Supabase real-time tables?
Assistant: An optimal architecture combines Web Crypto AES-256-GCM for at-rest disk safety, BroadcastChannel for zero-latency local tab communication, and Supabase Postgres CDC (Change Data Capture) via Realtime channels for cross-device synchronization.
User: How should contact deduplication work on export append?
Assistant: Store an invariant composite hash (sender + timestamp + content snippet) and perform a set intersection before appending new records.`,
  },
  telegram: {
    label: 'Telegram Chat',
    platform: 'telegram',
    text: `Elena Rostova, [08.11.2026 13:00]: The quantum optics team confirmed photon entanglement stability.
You, [08.11.2026 13:05]: Fantastic milestone! Are the error correction thresholds holding?
Elena Rostova, [08.11.2026 13:12]: Yes, bit error rate dropped below 0.12%. We are uploading telemetry now.`,
  },
};

export const ChatExtractorModal: React.FC<ChatExtractorModalProps> = ({
  isOpen,
  onClose,
  existingThreads,
  folders,
  tags,
  initialTargetThread,
  onSaveExtraction,
}) => {
  const [rawText, setRawText] = useState('');
  const [platform, setPlatform] = useState<PlatformType>('whatsapp');
  const [autoDetect, setAutoDetect] = useState(true);

  // Extracted preview state
  const [extractedData, setExtractedData] = useState<ExtractedChatResult | null>(null);
  const [customContactName, setCustomContactName] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [contactIdentifier, setContactIdentifier] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCover, setSelectedCover] = useState<string>(PRESET_FEATURE_COVERS[0].url);
  const [forceNewThread, setForceNewThread] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // AI Auto-Labeling state
  const [aiSuggestions, setAiSuggestions] = useState<SuggestedTagResult | null>(null);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);

  // If initial target thread was provided (Append mode)
  useEffect(() => {
    if (initialTargetThread) {
      setCustomContactName(initialTargetThread.contactName);
      setCustomAlias(initialTargetThread.customAlias || '');
      setContactIdentifier(initialTargetThread.contactIdentifier || '');
      setPlatform(initialTargetThread.platform);
      setSelectedFolderId(initialTargetThread.folderId || '');
      setSelectedTags(initialTargetThread.tags || []);
      if (initialTargetThread.featureImage) {
        setSelectedCover(initialTargetThread.featureImage);
      }
    }
  }, [initialTargetThread]);

  // Parse whenever rawText or platform changes
  useEffect(() => {
    if (!rawText.trim()) {
      setExtractedData(null);
      setAiSuggestions(null);
      return;
    }

    const result = parseChatTranscript(rawText, autoDetect ? undefined : platform);
    setExtractedData(result);

    if (!initialTargetThread) {
      setCustomContactName(result.contactName);
      setPlatform(result.detectedPlatform);
    }

    // Trigger AI Auto-Labeling on parsed messages
    if (result.messages.length > 0) {
      setIsAnalyzingAi(true);
      suggestTagsForChat(result.contactName, result.messages)
        .then(res => {
          setAiSuggestions(res);
          // Pre-select AI tags if none selected yet
          if (selectedTags.length === 0) {
            setSelectedTags(res.tags);
          }
        })
        .finally(() => {
          setIsAnalyzingAi(false);
        });
    }
  }, [rawText, platform, autoDetect, initialTargetThread]);

  // Check if contact already exists in database
  const matchingExistingThread = existingThreads.find(t => {
    if (!customContactName.trim()) return false;
    const nameMatch = t.contactName.toLowerCase() === customContactName.toLowerCase();
    const aliasMatch = t.customAlias && t.customAlias.toLowerCase() === customContactName.toLowerCase();
    const identMatch = contactIdentifier && t.contactIdentifier && t.contactIdentifier.toLowerCase() === contactIdentifier.toLowerCase();
    return nameMatch || aliasMatch || identMatch;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleToggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter(t => t !== tagName));
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  const handleApplyAiTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleApplyAllAiTags = () => {
    if (aiSuggestions) {
      const merged = Array.from(new Set([...selectedTags, ...aiSuggestions.tags]));
      setSelectedTags(merged);
    }
  };

  const handleSave = async () => {
    if (!extractedData || extractedData.messages.length === 0) return;
    setIsSaving(true);
    try {
      // If user hasn't selected tags, auto-generate via AI on the fly
      let finalTags = selectedTags;
      if (finalTags.length === 0) {
        const autoTags = await suggestTagsForChat(
          customContactName || extractedData.contactName,
          extractedData.messages
        );
        finalTags = autoTags.tags;
      }

      await onSaveExtraction({
        contactName: customContactName.trim() || extractedData.contactName,
        customAlias: customAlias.trim() || undefined,
        contactIdentifier: contactIdentifier.trim() || undefined,
        platform,
        messages: extractedData.messages,
        folderId: selectedFolderId || undefined,
        tags: finalTags,
        featureImage: selectedCover,
        forceNewThread,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save extraction:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[#09090c] border border-orange-500/30 shadow-2xl overflow-hidden font-mono text-neutral-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-orange-500/20 flex items-center justify-between bg-[#050507]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/30 glow-border">
              <span className="material-symbols-outlined text-xl">auto_awesome</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display tracking-wide flex items-center gap-2">
                <span>{initialTargetThread ? `APPEND TO: ${initialTargetThread.customAlias || initialTargetThread.contactName}` : 'CHAT_EXTRACTOR // SUPABASE_SYNC'}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-mono font-bold border border-orange-500/40">
                  AI_POWERED
                </span>
              </h3>
              <p className="text-xs text-neutral-400 font-mono">
                Auto-parser, AI semantic labeling, contact append, and AES-256 encryption.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Sample Selector & File Upload */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#0d0d12] border border-orange-500/20">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-orange-400 mr-1 flex items-center gap-1">
                <Terminal className="w-3 h-3" />
                LOAD_SAMPLE:
              </span>
              {Object.entries(SAMPLE_TRANSCRIPTS).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setRawText(item.text);
                    setPlatform(item.platform);
                    setAutoDetect(false);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-black text-neutral-300 hover:text-orange-400 hover:border-orange-500/50 border border-neutral-800 transition"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 border border-orange-500/40 cursor-pointer transition glow-border">
              <Upload className="w-3.5 h-3.5 text-orange-500" />
              <span>Import .txt / .json</span>
              <input
                type="file"
                accept=".txt,.json,.csv,.log"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Transcript Input Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5 font-mono">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="text-orange-500">&gt;</span>
                <span>PASTE_CHAT_TRANSCRIPT</span>
              </label>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-neutral-400 flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoDetect}
                    onChange={e => setAutoDetect(e.target.checked)}
                    className="rounded text-orange-500 focus:ring-orange-500"
                  />
                  <span>Auto-detect platform</span>
                </label>

                {!autoDetect && (
                  <select
                    value={platform}
                    onChange={e => setPlatform(e.target.value as PlatformType)}
                    className="text-[11px] font-mono py-1 px-2 rounded-lg border border-neutral-700 bg-black text-neutral-300"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="telegram">Telegram</option>
                    <option value="chatgpt">ChatGPT / AI</option>
                    <option value="slack">Slack</option>
                    <option value="imessage">iMessage</option>
                    <option value="custom">Custom / Other</option>
                  </select>
                )}
              </div>
            </div>

            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder="Paste WhatsApp export, Telegram chat, ChatGPT shared log, Slack export, or any dialog here..."
              rows={6}
              className="w-full text-xs font-mono p-3 rounded-xl border border-neutral-800 bg-[#0d0d10] text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500/50"
            />
          </div>

          {/* Extraction Result Banner & Deduplication Check */}
          {extractedData && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-orange-950/20 border border-orange-500/40 flex items-start gap-3 glow-border">
                <CheckCircle2 className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 font-mono">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-orange-400">
                      PARSED {extractedData.totalMessages} MESSAGES SUCCESSFULLY
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 uppercase border border-orange-500/30">
                      PLATFORM: {extractedData.detectedPlatform}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-300 mt-0.5">
                    Participants: {extractedData.participants.join(', ')}
                  </p>

                  {/* Matching Contact Check */}
                  {matchingExistingThread && (
                    <div className="mt-2 pt-2 border-t border-orange-500/20 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-orange-300">
                        <Database className="w-3.5 h-3.5 text-orange-400" />
                        <span>
                          <strong>Contact Match:</strong> Existing chat "{matchingExistingThread.customAlias || matchingExistingThread.contactName}" will be <strong>appended without duplicates</strong>.
                        </span>
                      </div>
                      <label className="flex items-center gap-1 text-[11px] text-neutral-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={forceNewThread}
                          onChange={e => setForceNewThread(e.target.checked)}
                          className="rounded text-orange-500"
                        />
                        <span>Force New Thread</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Auto-Labeling Feature Box */}
              <div className="p-3.5 rounded-xl bg-[#0f0f14] border border-orange-500/40 space-y-2.5 glow-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-orange-500 text-black glow-orange">
                      <Wand2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>AI-POWERED AUTO-LABELING</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                          GEMINI 3.8 FLASH
                        </span>
                      </h4>
                      <p className="text-[10px] text-neutral-400">
                        Analyzes transcript semantics to recommend accurate categorization tags.
                      </p>
                    </div>
                  </div>

                  {aiSuggestions && (
                    <button
                      type="button"
                      onClick={handleApplyAllAiTags}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-orange-500 hover:bg-orange-400 text-black glow-orange transition"
                    >
                      Apply All AI Tags
                    </button>
                  )}
                </div>

                {isAnalyzingAi ? (
                  <div className="flex items-center gap-2 text-xs text-orange-400 font-mono py-1">
                    <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                    <span>AI analyzing conversation topics & intent...</span>
                  </div>
                ) : aiSuggestions ? (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-neutral-500 uppercase">Suggested:</span>
                      {aiSuggestions.tags.map(tag => {
                        const isApplied = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleApplyAiTag(tag)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold transition border ${
                              isApplied
                                ? 'bg-orange-500 text-black border-orange-500 glow-orange'
                                : 'bg-black text-orange-400 border-orange-500/30 hover:border-orange-500'
                            }`}
                          >
                            <span>#{tag}</span>
                            {isApplied && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                    {aiSuggestions.reasoning && (
                      <p className="text-[10px] text-neutral-500 italic">
                        Insight: {aiSuggestions.reasoning}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Contact Customization & Alias Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={customContactName}
                    onChange={e => setCustomContactName(e.target.value)}
                    placeholder="e.g. Sarah Chen"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-800 bg-[#121216] text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">
                    Custom Name / Alias Change
                  </label>
                  <input
                    type="text"
                    value={customAlias}
                    onChange={e => setCustomAlias(e.target.value)}
                    placeholder="e.g. Lead Cloud Architect"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-800 bg-[#121216] text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">
                    Identifier (Phone, Handle, or Email)
                  </label>
                  <input
                    type="text"
                    value={contactIdentifier}
                    onChange={e => setContactIdentifier(e.target.value)}
                    placeholder="e.g. +1 415 555 0192 or @sarah_c"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-800 bg-[#121216] text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">
                    Category Folder
                  </label>
                  <select
                    value={selectedFolderId}
                    onChange={e => setSelectedFolderId(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-800 bg-[#121216] text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="">Uncategorized</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tags Selector */}
              <div>
                <label className="block text-xs font-mono font-semibold text-neutral-400 mb-1.5">
                  Assigned Labels & Tags ({selectedTags.length})
                </label>
                <div className="flex flex-wrap gap-1.5 font-mono">
                  {tags.map(t => {
                    const active = selectedTags.includes(t.name);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleToggleTag(t.name)}
                        className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold transition border ${
                          active
                            ? 'bg-orange-600 text-black border-orange-500 glow-orange'
                            : 'bg-black text-neutral-400 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        #{t.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Feature Image / Album Cover Selector */}
              <div>
                <label className="block text-xs font-mono font-semibold text-neutral-400 mb-1.5">
                  Select Feature Image / Album Cover
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PRESET_FEATURE_COVERS.map(cover => (
                    <div
                      key={cover.id}
                      onClick={() => setSelectedCover(cover.url)}
                      className={`relative h-16 rounded-xl overflow-hidden cursor-pointer border-2 transition ${
                        selectedCover === cover.url
                          ? 'border-orange-500 ring-2 ring-orange-500/50 scale-105'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={cover.url} alt={cover.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40" />
                      <span className="absolute bottom-1 left-1 text-[8px] font-mono font-bold text-white bg-black/80 px-1 rounded truncate max-w-[90%]">
                        {cover.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Preview of Parsed Messages */}
              <div>
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  Message Preview ({extractedData.messages.length} total)
                </p>
                <div className="max-h-40 overflow-y-auto rounded-xl border border-neutral-800 p-3 space-y-2 bg-black font-mono text-xs">
                  {extractedData.messages.slice(0, 5).map((m, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="font-bold text-orange-400 min-w-16 truncate">
                        {m.sender}:
                      </span>
                      <span className="text-neutral-300 line-clamp-1 flex-1">
                        {m.content}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                  {extractedData.messages.length > 5 && (
                    <p className="text-center text-[10px] text-neutral-400 italic pt-1">
                      + {extractedData.messages.length - 5} more messages will be encrypted at rest
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-orange-500/20 flex items-center justify-between bg-[#050507]">
          <div className="text-[11px] text-neutral-400 font-mono flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-orange-500">lock</span>
            <span>AES-256-GCM Zero-Knowledge Encrypted</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!extractedData || extractedData.messages.length === 0 || isSaving}
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-black glow-orange disabled:opacity-50 transition active:scale-95 flex items-center gap-2"
            >
              {isSaving ? 'ENCRYPTING & SYNCING...' : matchingExistingThread && !forceNewThread ? 'APPEND TO CONTACT' : 'SAVE & SYNC TO VAULT'}
              <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
