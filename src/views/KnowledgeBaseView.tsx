import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import {
  BookOpen,
  Plus,
  Trash2,
  Search,
  Sparkles,
  FileText,
  Building2,
  Bookmark,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { DocumentCategory } from '../types';

export const KnowledgeBaseView: React.FC = () => {
  const { documents, refreshState, showToast } = useApp();
  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id || '');
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('company_research');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // RAG Search test simulator
  const [searchQuery, setSearchQuery] = useState('');
  const [simulatedMatches, setSimulatedMatches] = useState<string[]>([]);

  const activeDoc = documents.find((d) => d.id === selectedDocId) || documents[0];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      await api.uploadDocument({ title, category, content });
      await refreshState();
      setShowAddModal(false);
      setTitle('');
      setContent('');
      showToast('Document chunked and added to Knowledge Base', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to add document', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteDocument(id);
      await refreshState();
      showToast('Document removed', 'info');
    } catch (e) {
      showToast('Delete failed', 'error');
    }
  };

  const handleTestRAG = () => {
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase();
    const hits: string[] = [];

    documents.forEach((d) => {
      const sentences = d.content.split('\n');
      sentences.forEach((s) => {
        if (s.toLowerCase().includes(q) || q.split(' ').some((word) => word.length > 3 && s.toLowerCase().includes(word))) {
          hits.push(`[${d.title}]: ${s.trim()}`);
        }
      });
    });

    if (hits.length === 0) {
      hits.push(`No exact sentence matches for "${searchQuery}". Whole document semantics will be considered during live answering.`);
    }
    setSimulatedMatches(hits.slice(0, 4));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl border border-slate-800 bg-slate-900/80  ">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Knowledge Base & RAG Vault</h1>
            <p className="text-xs text-slate-400">
              Upload company research, job descriptions, and technical cheat sheets to ground your answers
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors "
        >
          <Plus className="h-4 w-4" />
          <span>Add Document</span>
        </button>
      </div>

      {/* RAG Retrieval Simulator */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/70  space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-emerald-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">Semantic RAG Test Sandbox</h2>
          </div>
          <span className="text-[11px] text-slate-400">Tests what knowledge chunks will be retrieved during questions</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTestRAG()}
            placeholder="Type sample question or topic (e.g. 'circuit breaker', 'Google leadership', 'idempotency')..."
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={handleTestRAG}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-400 transition-colors"
          >
            Test Retrieval
          </button>
        </div>

        {simulatedMatches.length > 0 && (
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
              Retrieved Semantic Chunks ({simulatedMatches.length}):
            </span>
            <div className="space-y-1.5">
              {simulatedMatches.map((m, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-slate-300 font-mono text-[11px]">
                  {m}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2-Column Split: Documents Library vs Document Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Document list (4 cols) */}
        <div className="lg:col-span-4 rounded-xl border border-slate-800 bg-slate-900/70 p-5  space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Documents ({documents.length})
          </h2>

          <div className="space-y-2">
            {documents.map((d) => {
              const isSelected = selectedDocId === d.id;
              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedDocId(d.id)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-emerald-500/50 bg-emerald-950/20 '
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-white line-clamp-1">{d.title}</span>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="capitalize px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {d.category.replace('_', ' ')}
                        </span>
                        <span>{d.chunkCount} chunks</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(d.id);
                      }}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      title="Delete Document"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Document Preview (8 cols) */}
        <div className="lg:col-span-8 rounded-xl border border-slate-800 bg-slate-900/70 p-6  space-y-4">
          {activeDoc ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-bold text-white">{activeDoc.title}</h2>
                  <span className="text-xs text-emerald-400 capitalize">
                    {activeDoc.category.replace('_', ' ')} • {activeDoc.chunkCount} Indexed Chunks
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  {(activeDoc.fileSizeBytes / 1024).toFixed(1)} KB
                </span>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800/90 text-xs text-slate-200 leading-relaxed font-mono whitespace-pre-line max-h-96 overflow-y-auto">
                {activeDoc.content}
              </div>
            </>
          ) : (
            <div className="py-24 text-center text-xs text-slate-500">
              No document selected. Add one using the button above.
            </div>
          )}
        </div>
      </div>

      {/* Add Document Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80  animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl rounded-lg border border-slate-800 bg-slate-900 p-6  space-y-4">
            <h3 className="text-base font-bold text-white">Add Knowledge Document</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Document Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Meta Production Engineering Guidelines"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="company_research">Company Research</option>
                  <option value="job_description">Job Description</option>
                  <option value="technical_notes">Technical Notes</option>
                  <option value="brag_sheet">Brag Sheet / Project Metrics</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Document Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  placeholder="Paste company research, technical concepts, or metrics..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 leading-relaxed resize-none font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                >
                  {isSubmitting ? 'Chunking & Indexing...' : 'Save & Index'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
