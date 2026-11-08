import React, { useState } from 'react';
import { 
  Search, 
  Star, 
  SlidersHorizontal, 
  X, 
  CheckSquare, 
  Square, 
  Tag as TagIcon, 
  Folder as FolderIcon, 
  Trash2, 
  Check, 
  Plus,
  Terminal,
  ChevronDown,
  Layers,
  Sparkles
} from 'lucide-react';
import { ChatThread, PlatformType, Folder, ChatTag } from '../types';

interface ChatListProps {
  threads: ChatThread[];
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onToggleStar: (threadId: string, e: React.MouseEvent) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedPlatform: PlatformType | 'all';
  setSelectedPlatform: (platform: PlatformType | 'all') => void;
  sortBy: 'recent' | 'count' | 'name';
  setSortBy: (sort: 'recent' | 'count' | 'name') => void;
  // Multi-select props
  folders: Folder[];
  tags: ChatTag[];
  selectedThreadIds: string[];
  onToggleSelectThread: (threadId: string) => void;
  onSelectAllThreads: () => void;
  onClearSelectedThreads: () => void;
  onBulkApplyTag: (threadIds: string[], tagName: string) => void;
  onBulkMoveFolder: (threadIds: string[], folderId: string | undefined) => void;
  onBulkStar: (threadIds: string[], star: boolean) => void;
  onBulkDelete: (threadIds: string[]) => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  threads,
  selectedThreadId,
  onSelectThread,
  onToggleStar,
  searchQuery,
  setSearchQuery,
  selectedPlatform,
  setSelectedPlatform,
  sortBy,
  setSortBy,
  folders,
  tags,
  selectedThreadIds,
  onToggleSelectThread,
  onSelectAllThreads,
  onClearSelectedThreads,
  onBulkApplyTag,
  onBulkMoveFolder,
  onBulkStar,
  onBulkDelete,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showBulkTagMenu, setShowBulkTagMenu] = useState(false);
  const [showBulkFolderMenu, setShowBulkFolderMenu] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');

  const getPlatformBadge = (platform: PlatformType) => {
    switch (platform) {
      case 'whatsapp':
        return { label: 'WhatsApp', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'telegram':
        return { label: 'Telegram', bg: 'bg-sky-500/15 text-sky-400 border-sky-500/30' };
      case 'chatgpt':
        return { label: 'ChatGPT / AI', bg: 'bg-orange-500/15 text-orange-400 border-orange-500/30' };
      case 'slack':
        return { label: 'Slack', bg: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
      case 'imessage':
        return { label: 'iMessage', bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
      default:
        return { label: 'Custom Chat', bg: 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30' };
    }
  };

  const formatTimestamp = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 60) return `${diffMins || 1}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
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

  const isAllSelected = threads.length > 0 && selectedThreadIds.length === threads.length;

  const handleApplyCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTagInput.trim()) return;
    onBulkApplyTag(selectedThreadIds, customTagInput.trim());
    setCustomTagInput('');
    setShowBulkTagMenu(false);
  };

  return (
    <div className="w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col h-[calc(100vh-4rem)] border-r border-orange-500/20 bg-[#09090b] select-none relative">
      {/* Search Header */}
      <div className="p-3 border-b border-orange-500/20 bg-[#050507] space-y-2">
        <div className="relative">
          <Terminal className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-orange-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search transcripts, contacts, tags..."
            className="w-full text-xs font-mono pl-9 pr-8 py-2 rounded-xl border border-neutral-800 bg-[#121216] text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Toolbar: Multi-select toggle, filter toggle, count */}
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                if (isSelectMode) onClearSelectedThreads();
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                isSelectMode || selectedThreadIds.length > 0
                  ? 'bg-orange-500/20 text-orange-400 border-orange-500/50 glow-border'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
              title="Toggle multi-select mode"
            >
              <CheckSquare className="w-3 h-3 text-orange-500" />
              <span>{isSelectMode ? 'SELECTING' : 'MULTI_SELECT'}</span>
            </button>

            <span className="text-[10px] text-neutral-400">
              {threads.length} {threads.length === 1 ? 'thread' : 'threads'}
            </span>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-mono transition border ${
              showFilters || selectedPlatform !== 'all' || sortBy !== 'recent'
                ? 'bg-orange-500/15 text-orange-400 border-orange-500/40'
                : 'text-neutral-400 border-neutral-800 hover:bg-neutral-900'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3 text-orange-500" />
            <span>FILTER</span>
          </button>
        </div>

        {/* Filter Dropdown Bar */}
        {showFilters && (
          <div className="pt-2 border-t border-neutral-800/80 space-y-2 text-xs font-mono">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                Filter by Platform
              </label>
              <div className="flex flex-wrap gap-1">
                {(['all', 'whatsapp', 'telegram', 'chatgpt', 'slack'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setSelectedPlatform(p)}
                    className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold transition ${
                      selectedPlatform === p
                        ? 'bg-orange-600 text-black glow-orange font-extrabold'
                        : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:bg-neutral-800'
                    }`}
                  >
                    {p === 'all' ? 'All' : p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                Sort Order
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'recent', label: 'Recent' },
                  { id: 'count', label: 'Volume' },
                  { id: 'name', label: 'Name' },
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSortBy(s.id as any)}
                    className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold text-center transition ${
                      sortBy === s.id
                        ? 'bg-orange-500 text-black glow-orange'
                        : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cyber Bulk Action Bar (when 1 or more threads are selected) */}
      {(selectedThreadIds.length > 0 || isSelectMode) && (
        <div className="p-2.5 bg-[#0f0f14] border-b border-orange-500/40 shadow-lg glow-border space-y-2 z-20 font-mono text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 font-extrabold text-[11px] border border-orange-500/40">
                {selectedThreadIds.length} SELECTED
              </span>
              <button
                onClick={isAllSelected ? onClearSelectedThreads : onSelectAllThreads}
                className="text-[10px] text-neutral-400 hover:text-white underline"
              >
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <button
              onClick={onClearSelectedThreads}
              className="text-[10px] text-neutral-400 hover:text-rose-400 p-0.5"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {selectedThreadIds.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Bulk Apply Tag Button */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowBulkTagMenu(!showBulkTagMenu);
                    setShowBulkFolderMenu(false);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900 text-orange-400 hover:bg-neutral-800 border border-orange-500/30 text-[10px] font-bold"
                >
                  <TagIcon className="w-3 h-3 text-orange-500" />
                  <span>Apply Tag</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showBulkTagMenu && (
                  <div className="absolute left-0 mt-1 w-52 rounded-xl bg-[#0d0d12] border border-orange-500/40 shadow-2xl p-2 z-50 space-y-2">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase">Select tag to apply to all:</p>
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {tags.map(t => (
                        <button
                          key={t.id}
                          onClick={() => {
                            onBulkApplyTag(selectedThreadIds, t.name);
                            setShowBulkTagMenu(false);
                          }}
                          className="w-full text-left px-2 py-1 rounded-lg text-[10px] hover:bg-neutral-800 text-neutral-200 flex items-center justify-between"
                        >
                          <span>#{t.name}</span>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                        </button>
                      ))}
                    </div>

                    <form onSubmit={handleApplyCustomTag} className="pt-1 border-t border-neutral-800 flex gap-1">
                      <input
                        type="text"
                        value={customTagInput}
                        onChange={e => setCustomTagInput(e.target.value)}
                        placeholder="New tag..."
                        className="flex-1 text-[10px] px-2 py-1 rounded bg-black border border-neutral-700 text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                      <button
                        type="submit"
                        className="px-2 py-1 text-[10px] font-bold bg-orange-600 text-black rounded glow-orange"
                      >
                        Add
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Bulk Move to Folder Button */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowBulkFolderMenu(!showBulkFolderMenu);
                    setShowBulkTagMenu(false);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900 text-orange-400 hover:bg-neutral-800 border border-orange-500/30 text-[10px] font-bold"
                >
                  <FolderIcon className="w-3 h-3 text-orange-500" />
                  <span>Move Folder</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showBulkFolderMenu && (
                  <div className="absolute left-0 mt-1 w-48 rounded-xl bg-[#0d0d12] border border-orange-500/40 shadow-2xl p-2 z-50 space-y-1">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase">Move all to folder:</p>
                    <button
                      onClick={() => {
                        onBulkMoveFolder(selectedThreadIds, undefined);
                        setShowBulkFolderMenu(false);
                      }}
                      className="w-full text-left px-2 py-1 rounded-lg text-[10px] hover:bg-neutral-800 text-neutral-400 italic"
                    >
                      None (Remove from folder)
                    </button>
                    {folders.map(f => (
                      <button
                        key={f.id}
                        onClick={() => {
                          onBulkMoveFolder(selectedThreadIds, f.id);
                          setShowBulkFolderMenu(false);
                        }}
                        className="w-full text-left px-2 py-1 rounded-lg text-[10px] hover:bg-neutral-800 text-neutral-200 flex items-center gap-2"
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                        <span>{f.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Bulk Star */}
              <button
                onClick={() => onBulkStar(selectedThreadIds, true)}
                className="p-1 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-amber-400 border border-neutral-800 text-[10px] flex items-center gap-1"
                title="Star selected"
              >
                <Star className="w-3 h-3 fill-amber-400" />
                <span>Star</span>
              </button>

              {/* Bulk Delete */}
              <button
                onClick={() => {
                  if (confirm(`Delete ${selectedThreadIds.length} selected chat threads?`)) {
                    onBulkDelete(selectedThreadIds);
                  }
                }}
                className="p-1 px-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-900/50 text-[10px] flex items-center gap-1 ml-auto"
                title="Delete selected"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Chat Thread Cards List */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-900">
        {threads.length === 0 ? (
          <div className="p-8 text-center font-mono">
            <div className="w-12 h-12 mx-auto rounded-xl bg-[#121216] border border-orange-500/20 flex items-center justify-center text-orange-500 mb-3 glow-border">
              <span className="material-symbols-outlined text-2xl">chat_bubble</span>
            </div>
            <p className="text-xs font-bold text-white uppercase">[NO_RECORDS_FOUND]</p>
            <p className="text-[11px] text-neutral-500 mt-1">
              Extract a WhatsApp, Telegram, or ChatGPT transcript to start syncing!
            </p>
          </div>
        ) : (
          threads.map(thread => {
            const isSelected = selectedThreadId === thread.id;
            const isChecked = selectedThreadIds.includes(thread.id);
            const badge = getPlatformBadge(thread.platform);
            const lastMsg = thread.messages[thread.messages.length - 1];

            return (
              <div
                key={thread.id}
                onClick={() => {
                  if (isSelectMode) {
                    onToggleSelectThread(thread.id);
                  } else {
                    onSelectThread(thread.id);
                  }
                }}
                className={`group relative p-3 transition cursor-pointer hover:bg-[#121218] ${
                  isSelected && !isChecked
                    ? 'bg-[#15120e] border-l-4 border-orange-500 glow-border'
                    : isChecked
                    ? 'bg-orange-950/20 border-l-4 border-orange-400'
                    : ''
                }`}
              >
                {/* Feature Image / Album Cover Preview Banner */}
                {thread.featureImage && (
                  <div className="relative w-full h-16 rounded-xl overflow-hidden mb-2.5 shadow-xs border border-neutral-800 group-hover:border-orange-500/30 transition">
                    <img
                      src={thread.featureImage}
                      alt={thread.customAlias || thread.contactName}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                    
                    {/* Platform Tag Badge on Feature Image */}
                    <div className="absolute bottom-1.5 left-2 flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wide uppercase border backdrop-blur-md ${badge.bg}`}>
                        {badge.label}
                      </span>
                      <span className="text-[9px] font-mono text-neutral-300 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded">
                        {thread.messageCount} msgs
                      </span>
                    </div>

                    {/* Star Button overlay */}
                    <button
                      onClick={e => onToggleStar(thread.id, e)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 backdrop-blur-md text-neutral-400 hover:text-amber-400 transition"
                      title={thread.isStarred ? 'Unstar' : 'Star chat'}
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          thread.isStarred ? 'text-amber-400 fill-amber-400' : 'text-neutral-400'
                        }`}
                      />
                    </button>
                  </div>
                )}

                {/* Contact Header + Multi-Select Checkbox */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 truncate">
                    {/* Multi-Select Checkbox */}
                    {(isSelectMode || selectedThreadIds.length > 0) && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onToggleSelectThread(thread.id);
                        }}
                        className="text-orange-500 hover:scale-110 transition p-0.5"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-orange-500 fill-orange-500/20" />
                        ) : (
                          <Square className="w-4 h-4 text-neutral-500 hover:text-orange-400" />
                        )}
                      </button>
                    )}

                    {/* Avatar if no feature cover */}
                    {!thread.featureImage && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-black text-xs font-bold font-mono flex-shrink-0 shadow-sm">
                        {thread.contactName.charAt(0)}
                      </div>
                    )}

                    <div className="truncate">
                      <h4 className="text-xs font-bold text-white truncate font-sans group-hover:text-orange-400 transition">
                        {highlightMatch(thread.customAlias || thread.contactName, searchQuery)}
                      </h4>
                      {thread.customAlias && (
                        <p className="text-[10px] text-neutral-400 truncate font-mono">
                          {thread.contactName}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] text-neutral-400 font-mono flex-shrink-0">
                    {formatTimestamp(thread.lastMessageTimestamp)}
                  </span>
                </div>

                {/* Last Message Snippet */}
                {lastMsg && (
                  <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1 leading-snug font-sans">
                    <span className="font-semibold text-neutral-300 font-mono">
                      {lastMsg.senderRole === 'me' ? 'You: ' : `${lastMsg.sender.split(' ')[0]}: `}
                    </span>
                    {highlightMatch(lastMsg.content, searchQuery)}
                  </p>
                )}

                {/* Tags row */}
                {thread.tags && thread.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 mt-2">
                    {thread.tags.slice(0, 3).map((tag, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-neutral-900 border border-neutral-800 text-orange-400/90"
                      >
                        #{tag}
                      </span>
                    ))}
                    {thread.tags.length > 3 && (
                      <span className="text-[9px] font-mono text-neutral-400">+{thread.tags.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
