import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Star, 
  Search, 
  Download, 
  Trash2, 
  Image as ImageIcon, 
  Folder as FolderIcon, 
  Tag as TagIcon, 
  Send, 
  Lock, 
  Copy, 
  Check, 
  PlusCircle, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Wand2,
  Terminal,
  Cpu,
  Edit2,
  RefreshCw,
  Zap
} from 'lucide-react';
import { ChatThread, ChatMessage, Folder, ChatTag } from '../types';
import { suggestTagsForChat, generateQuickPeekSummary } from '../lib/aiLabeler';

interface ChatDetailProps {
  thread: ChatThread;
  folders: Folder[];
  tags: ChatTag[];
  onOpenEditCover: (thread: ChatThread) => void;
  onOpenExport: (thread: ChatThread) => void;
  onOpenAppendExtractor: (thread: ChatThread) => void;
  onToggleStar: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
  onUpdateThreadFolder: (threadId: string, folderId: string | undefined) => void;
  onToggleThreadTag: (threadId: string, tagName: string) => void;
  onAppendManualMessage: (threadId: string, message: Omit<ChatMessage, 'id'>) => void;
  onAutoLabelThread?: (threadId: string, newTags: string[]) => void;
  onRenameThread: (threadId: string, newName: string) => void;
  onUpdateThreadSummary: (threadId: string, summary: string) => void;
}

export const ChatDetail: React.FC<ChatDetailProps> = ({
  thread,
  folders,
  tags,
  onOpenEditCover,
  onOpenExport,
  onOpenAppendExtractor,
  onToggleStar,
  onDeleteThread,
  onUpdateThreadFolder,
  onToggleThreadTag,
  onAppendManualMessage,
  onAutoLabelThread,
  onRenameThread,
  onUpdateThreadSummary,
}) => {
  const [inChatSearch, setInChatSearch] = useState('');
  const [manualText, setManualText] = useState('');
  const [manualSenderRole, setManualSenderRole] = useState<'me' | 'contact' | 'assistant'>('me');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [isAiLabeling, setIsAiLabeling] = useState(false);
  const [aiNotification, setAiNotification] = useState<string | null>(null);

  // Direct Inline Rename State
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(thread.customAlias || thread.contactName);

  // Quick Peek State
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Match navigation state
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRenameValue(thread.customAlias || thread.contactName);
    setIsRenaming(false);
  }, [thread.id, thread.customAlias, thread.contactName]);

  const currentFolder = folders.find(f => f.id === thread.folderId);

  // Count total matches in messages for search indicator
  const totalMatchesCount = useMemo(() => {
    if (!inChatSearch.trim()) return 0;
    const q = inChatSearch.toLowerCase();
    let count = 0;
    thread.messages.forEach(m => {
      const text = m.content.toLowerCase();
      let pos = 0;
      while ((pos = text.indexOf(q, pos)) !== -1) {
        count++;
        pos += q.length;
      }
    });
    return count;
  }, [thread.messages, inChatSearch]);

  // Filter messages based on in-chat search
  const filteredMessages = useMemo(() => {
    if (!inChatSearch.trim()) return thread.messages;
    const q = inChatSearch.toLowerCase();
    return thread.messages.filter(
      m => m.content.toLowerCase().includes(q) || m.sender.toLowerCase().includes(q)
    );
  }, [thread.messages, inChatSearch]);

  const handleCopyMessage = (msg: ChatMessage) => {
    navigator.clipboard.writeText(`${msg.sender} (${new Date(msg.timestamp).toLocaleString()}):\n${msg.content}`);
    setCopiedMsgId(msg.id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleSaveRename = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!renameValue.trim()) return;
    onRenameThread(thread.id, renameValue.trim());
    setIsRenaming(false);
  };

  const handleSendManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;

    const senderName = manualSenderRole === 'me' ? 'You' : thread.contactName;

    onAppendManualMessage(thread.id, {
      sender: senderName,
      senderRole: manualSenderRole,
      content: manualText.trim(),
      timestamp: new Date().toISOString(),
    });

    setManualText('');
  };

  const handleTriggerAiLabeling = async () => {
    setIsAiLabeling(true);
    setAiNotification(null);
    try {
      const res = await suggestTagsForChat(thread.contactName, thread.messages);
      if (res.tags && res.tags.length > 0) {
        onAutoLabelThread?.(thread.id, res.tags);
        setAiNotification(`AI applied: ${res.tags.join(', ')}`);
        setTimeout(() => setAiNotification(null), 3500);
      }
    } catch {
      setAiNotification('Failed to auto-label');
      setTimeout(() => setAiNotification(null), 3000);
    } finally {
      setIsAiLabeling(false);
    }
  };

  // Generate / Regenerate Gemini Quick Peek One-Sentence Summary
  const handleGenerateQuickPeek = async () => {
    setIsSummarizing(true);
    try {
      const summaryText = await generateQuickPeekSummary(
        thread.customAlias || thread.contactName,
        thread.messages
      );
      onUpdateThreadSummary(thread.id, summaryText);
    } catch (err) {
      console.warn('Failed to generate quick peek:', err);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleCopySummary = () => {
    if (!thread.summary) return;
    navigator.clipboard.writeText(thread.summary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  // Highlight matches with glowing orange background
  const highlightMatchWithGlow = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark
          key={i}
          className="bg-orange-500/35 text-orange-200 border border-orange-500/80 shadow-[0_0_12px_rgba(255,107,0,0.6)] rounded px-1 py-0.5 font-bold glow-orange transition-all"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-[#050507] overflow-hidden">
      {/* Top Banner / Feature Image Header */}
      <div className="relative border-b border-orange-500/20 bg-[#09090c] shadow-xs">
        {thread.featureImage ? (
          <div className="relative h-32 md:h-40 w-full overflow-hidden bg-black">
            <img
              src={thread.featureImage}
              alt="Feature Album Cover"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            
            {/* Quick Action to change cover */}
            <button
              onClick={() => onOpenEditCover(thread)}
              className="absolute top-3 right-3 px-3 py-1 rounded-xl text-xs font-mono font-bold bg-black/80 hover:bg-black text-orange-400 backdrop-blur-md border border-orange-500/40 flex items-center gap-1.5 transition glow-border"
            >
              <ImageIcon className="w-3.5 h-3.5 text-orange-400" />
              <span>EDIT_COVER & ALIAS</span>
            </button>
          </div>
        ) : (
          <div className="p-4 flex items-center justify-end">
            <button
              onClick={() => onOpenEditCover(thread)}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-neutral-900 hover:bg-neutral-800 text-orange-400 border border-orange-500/30 flex items-center gap-1.5 transition"
            >
              <ImageIcon className="w-3.5 h-3.5 text-orange-500" />
              <span>ADD_ALBUM_COVER</span>
            </button>
          </div>
        )}

        {/* Contact Info & Toolbar */}
        <div className="px-4 py-3 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            {thread.avatar ? (
              <img
                src={thread.avatar}
                alt={thread.contactName}
                className="w-12 h-12 rounded-2xl object-cover ring-2 ring-orange-500/40 flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 flex items-center justify-center text-black text-lg font-bold font-mono flex-shrink-0 shadow-lg glow-orange">
                {thread.contactName.charAt(0)}
              </div>
            )}

            <div>
              {/* Title with Instant Rename Feature */}
              <div className="flex items-center gap-2 flex-wrap font-sans">
                {isRenaming ? (
                  <form onSubmit={handleSaveRename} className="flex items-center gap-1.5 font-mono">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      className="text-sm font-bold bg-black border border-orange-500 text-white rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500 glow-border"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="p-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-black glow-orange transition"
                      title="Save name"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRenaming(false)}
                      className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-white font-display tracking-tight">
                      {thread.customAlias || thread.contactName}
                    </h2>
                    <button
                      onClick={() => setIsRenaming(true)}
                      className="p-1 rounded-md text-neutral-400 hover:text-orange-400 hover:bg-neutral-900 border border-transparent hover:border-orange-500/30 transition"
                      title="Rename this chat"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-orange-500" />
                    </button>
                  </div>
                )}

                {thread.customAlias && !isRenaming && (
                  <span className="text-xs text-neutral-400 font-mono">
                    [{thread.contactName}]
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-orange-500/15 text-orange-400 border border-orange-500/30">
                  {thread.platform}
                </span>
                {thread.syncedToSupabase && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    SUPABASE_SYNCED
                  </span>
                )}
              </div>

              {/* Meta details & Custom Folder / Tag Chips */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs font-mono">
                {thread.contactIdentifier && (
                  <span className="text-neutral-400 text-[11px] font-mono">
                    {thread.contactIdentifier}
                  </span>
                )}

                {/* Folder pill selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-[#141418] text-neutral-300 hover:text-orange-400 border border-neutral-800 transition"
                  >
                    <FolderIcon className="w-3 h-3 text-orange-500" />
                    <span>{currentFolder ? currentFolder.name : 'No Folder'}</span>
                    <ChevronDown className="w-3 h-3 text-neutral-400" />
                  </button>

                  {showFolderDropdown && (
                    <div className="absolute left-0 mt-1 w-48 rounded-xl bg-[#0d0d12] border border-orange-500/40 shadow-2xl py-1 z-40 text-xs font-mono">
                      <button
                        onClick={() => {
                          onUpdateThreadFolder(thread.id, undefined);
                          setShowFolderDropdown(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-neutral-400 hover:bg-neutral-800"
                      >
                        None (Uncategorized)
                      </button>
                      {folders.map(f => (
                        <button
                          key={f.id}
                          onClick={() => {
                            onUpdateThreadFolder(thread.id, f.id);
                            setShowFolderDropdown(false);
                          }}
                          className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-neutral-200 hover:bg-neutral-800"
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                          <span>{f.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tag Pills */}
                {thread.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30"
                  >
                    #{tag}
                    <button
                      onClick={() => onToggleThreadTag(thread.id, tag)}
                      className="hover:text-rose-400"
                    >
                      ×
                    </button>
                  </span>
                ))}

                {/* Add Tag toggle */}
                <div className="relative">
                  <button
                    onClick={() => setShowTagDropdown(!showTagDropdown)}
                    className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-orange-400 font-mono"
                  >
                    <PlusCircle className="w-3 h-3" />
                    <span>+Tag</span>
                  </button>

                  {showTagDropdown && (
                    <div className="absolute left-0 mt-1 w-48 rounded-xl bg-[#0d0d12] border border-orange-500/40 shadow-2xl p-1 z-40 text-xs font-mono">
                      {tags.map(t => {
                        const hasTag = thread.tags.includes(t.name);
                        return (
                          <button
                            key={t.id}
                            onClick={() => {
                              onToggleThreadTag(thread.id, t.name);
                              setShowTagDropdown(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
                              hasTag ? 'bg-orange-500/20 text-orange-400 font-bold' : 'text-neutral-300 hover:bg-neutral-800'
                            }`}
                          >
                            <span>#{t.name}</span>
                            {hasTag && <Check className="w-3.5 h-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* AI Auto-Label Button */}
                <button
                  onClick={handleTriggerAiLabeling}
                  disabled={isAiLabeling}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#141418] hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 transition disabled:opacity-50"
                  title="Run AI content analysis to auto-suggest tags"
                >
                  <Wand2 className={`w-3 h-3 ${isAiLabeling ? 'animate-spin text-orange-400' : 'text-orange-500'}`} />
                  <span>{isAiLabeling ? 'ANALYZING...' : 'AI AUTO-LABEL'}</span>
                </button>

                {aiNotification && (
                  <span className="text-[10px] font-mono text-orange-400 font-bold animate-pulse">
                    {aiNotification}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap font-mono">
            {/* Quick Rename Chat Button */}
            <button
              onClick={() => setIsRenaming(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-[#121216] hover:bg-neutral-800 text-orange-400 border border-orange-500/30 transition"
              title="Rename this chat thread"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>RENAME</span>
            </button>

            {/* Append Data Button */}
            <button
              onClick={() => onOpenAppendExtractor(thread)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-orange-600 hover:bg-orange-500 text-black shadow-md glow-orange transition active:scale-95"
              title="Append new exported messages into this contact"
            >
              <PlusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>APPEND_CHAT</span>
            </button>

            {/* Export Button */}
            <button
              onClick={() => onOpenExport(thread)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-[#121216] hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition"
              title="Export thread as JSON, CSV or PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT</span>
            </button>

            {/* Star toggle */}
            <button
              onClick={() => onToggleStar(thread.id)}
              className="p-2 rounded-xl text-neutral-400 hover:text-amber-400 bg-[#121216] hover:bg-neutral-800 border border-neutral-800 transition"
              title={thread.isStarred ? 'Unstar' : 'Star chat'}
            >
              <Star
                className={`w-4 h-4 ${thread.isStarred ? 'text-amber-400 fill-amber-400' : ''}`}
              />
            </button>

            {/* Delete Chat */}
            <button
              onClick={() => {
                if (confirm(`Delete this chat thread with ${thread.customAlias || thread.contactName}?`)) {
                  onDeleteThread(thread.id);
                }
              }}
              className="p-2 rounded-xl text-neutral-400 hover:text-rose-500 bg-[#121216] hover:bg-rose-950/40 border border-neutral-800 transition"
              title="Delete thread"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* In-Chat Search Bar with Match Counter & Glowing Results */}
        <div className="px-4 py-2 bg-[#050507] border-t border-neutral-800 flex items-center justify-between gap-3 font-mono">
          <div className="relative flex-1 max-w-md flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-orange-500" />
            <input
              type="text"
              value={inChatSearch}
              onChange={e => setInChatSearch(e.target.value)}
              placeholder="Search & highlight text across this conversation..."
              className="w-full text-xs pl-8 pr-28 py-1.5 rounded-lg border border-neutral-800 bg-[#0d0d12] text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            {inChatSearch && (
              <div className="absolute right-2 flex items-center gap-1.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  totalMatchesCount > 0
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 glow-border'
                    : 'bg-neutral-800 text-neutral-500'
                }`}>
                  {totalMatchesCount > 0 ? `${totalMatchesCount} MATCH${totalMatchesCount === 1 ? '' : 'ES'}` : '0 MATCHES'}
                </span>
                <button
                  onClick={() => setInChatSearch('')}
                  className="text-neutral-400 hover:text-white p-0.5"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div className="text-[11px] font-mono text-neutral-400 flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-orange-500" />
            <span>[AES_256_GCM_ENCRYPTED]</span>
          </div>
        </div>
      </div>

      {/* GEMINI QUICK PEEK: One-Sentence Summary Banner */}
      <div className="px-4 py-2.5 sm:px-6 bg-[#08080b] border-b border-orange-500/20 font-mono">
        <div className="p-3 rounded-xl bg-[#0f0f14] border border-orange-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 glow-border">
          <div className="flex items-start sm:items-center gap-2.5 flex-1">
            <div className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/40 glow-orange flex-shrink-0">
              <Zap className="w-4 h-4 fill-orange-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1">
                  <span>QUICK_PEEK</span>
                  <span className="text-neutral-500">•</span>
                  <span className="text-neutral-400">GEMINI 3.8 FLASH</span>
                </span>
              </div>
              {thread.summary ? (
                <p className="text-xs sm:text-sm text-neutral-200 mt-0.5 font-sans leading-snug">
                  "{thread.summary}"
                </p>
              ) : (
                <p className="text-xs text-neutral-400 italic mt-0.5 font-sans">
                  No Quick Peek generated yet. Click to generate a 1-sentence AI summary of this conversation.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-center flex-shrink-0">
            {thread.summary && (
              <button
                onClick={handleCopySummary}
                className="p-1.5 rounded-lg bg-black/60 hover:bg-neutral-800 text-neutral-400 hover:text-orange-400 border border-neutral-800 transition"
                title="Copy Quick Peek summary"
              >
                {copiedSummary ? <Check className="w-3.5 h-3.5 text-orange-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              onClick={handleGenerateQuickPeek}
              disabled={isSummarizing}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-orange-600 hover:bg-orange-500 text-black glow-orange disabled:opacity-50 transition active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSummarizing ? 'animate-spin' : ''}`} />
              <span>{isSummarizing ? 'ANALYZING...' : thread.summary ? 'REGENERATE' : 'GENERATE QUICK PEEK'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div 
        ref={messagesScrollRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 font-sans"
      >
        {filteredMessages.length === 0 ? (
          <div className="text-center py-12 text-neutral-500 text-xs font-mono">
            {inChatSearch ? 'No messages match your search filter.' : 'No messages in this chat.'}
          </div>
        ) : (
          filteredMessages.map((msg, index) => {
            const isMe = msg.senderRole === 'me';
            const isAssistant = msg.senderRole === 'assistant';

            return (
              <div
                key={msg.id || index}
                className={`group flex flex-col ${isMe ? 'items-end' : 'items-start'} transition`}
              >
                {/* Sender & Timestamp Header */}
                <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-neutral-400 font-mono">
                  <span className={`font-bold ${isMe ? 'text-orange-400' : 'text-neutral-300'}`}>
                    {msg.sender}
                  </span>
                  <span>•</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <button
                    onClick={() => handleCopyMessage(msg)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-orange-400 transition"
                    title="Copy text"
                  >
                    {copiedMsgId === msg.id ? <Check className="w-3 h-3 text-orange-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                {/* Message Bubble with Glowing Text Highlighting */}
                <div
                  className={`relative max-w-xl rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                    isMe
                      ? 'bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 text-black font-medium rounded-br-xs glow-orange'
                      : isAssistant
                      ? 'bg-[#101016] text-amber-200 border border-orange-500/30 rounded-bl-xs'
                      : 'bg-[#101014] text-neutral-100 border border-neutral-800 rounded-bl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">
                    {highlightMatchWithGlow(msg.content, inChatSearch)}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {/* Security watermark footer */}
        <div className="pt-6 pb-2 text-center font-mono">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] text-neutral-400 bg-[#0d0d10] border border-orange-500/20">
            <Lock className="w-3 h-3 text-orange-500" />
            <span>Zero-Knowledge AES-256-GCM Verified • Realtime Cross-Device Sync</span>
          </div>
        </div>
      </div>

      {/* Manual Quick Message Input */}
      <div className="p-3 bg-[#09090b] border-t border-orange-500/20 font-mono">
        <form onSubmit={handleSendManual} className="flex items-center gap-2">
          {/* Sender Role Toggle */}
          <div className="relative">
            <select
              value={manualSenderRole}
              onChange={e => setManualSenderRole(e.target.value as any)}
              className="text-xs py-2 px-2.5 rounded-xl border border-neutral-800 bg-[#121216] text-orange-400 focus:outline-none"
            >
              <option value="me">You</option>
              <option value="contact">{thread.contactName}</option>
              <option value="assistant">AI Note</option>
            </select>
          </div>

          <input
            type="text"
            value={manualText}
            onChange={e => setManualText(e.target.value)}
            placeholder={`Append message/note to ${thread.customAlias || thread.contactName}...`}
            className="flex-1 text-xs py-2 px-3 rounded-xl border border-neutral-800 bg-[#121216] text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500/50"
          />

          <button
            type="submit"
            disabled={!manualText.trim()}
            className="p-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-black font-bold disabled:opacity-40 transition shadow-sm glow-orange"
            title="Append message"
          >
            <Send className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>
      </div>
    </div>
  );
};
