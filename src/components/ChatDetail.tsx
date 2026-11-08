import React, { useState, useMemo } from 'react';
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
  X,
  Wand2,
  Terminal,
  Cpu
} from 'lucide-react';
import { ChatThread, ChatMessage, Folder, ChatTag } from '../types';
import { suggestTagsForChat } from '../lib/aiLabeler';

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
}) => {
  const [inChatSearch, setInChatSearch] = useState('');
  const [manualText, setManualText] = useState('');
  const [manualSenderRole, setManualSenderRole] = useState<'me' | 'contact' | 'assistant'>('me');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [isAiLabeling, setIsAiLabeling] = useState(false);
  const [aiNotification, setAiNotification] = useState<string | null>(null);

  const currentFolder = folders.find(f => f.id === thread.folderId);

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

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-orange-500/40 text-orange-200 rounded px-0.5 font-bold">
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
              <div className="flex items-center gap-2 flex-wrap font-sans">
                <h2 className="text-base sm:text-lg font-black text-white font-display tracking-tight">
                  {thread.customAlias || thread.contactName}
                </h2>
                {thread.customAlias && (
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

        {/* In-Chat Search Bar */}
        <div className="px-4 py-2 bg-[#050507] border-t border-neutral-800 flex items-center justify-between gap-3 font-mono">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-orange-500" />
            <input
              type="text"
              value={inChatSearch}
              onChange={e => setInChatSearch(e.target.value)}
              placeholder="Filter words inside transcript..."
              className="w-full text-xs pl-8 pr-7 py-1.5 rounded-lg border border-neutral-800 bg-[#0d0d12] text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            {inChatSearch && (
              <button
                onClick={() => setInChatSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="text-[11px] font-mono text-neutral-400 flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-orange-500" />
            <span>[AES_256_GCM_ENCRYPTED]</span>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 font-sans">
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

                {/* Message Bubble */}
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
                    {highlightMatch(msg.content, inChatSearch)}
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
