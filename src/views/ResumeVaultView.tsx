import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import {
  FileText,
  Upload,
  Check,
  Star,
  Trash2,
  Sparkles,
  Layers,
  Briefcase,
  GraduationCap,
  Plus,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export const ResumeVaultView: React.FC = () => {
  const { resumes, refreshState, showToast } = useApp();
  const [selectedResumeId, setSelectedResumeId] = useState<string>(
    resumes.find((r) => r.isPrimary)?.id || resumes[0]?.id || ''
  );
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualText, setManualText] = useState('');

  const activeResume = resumes.find((r) => r.id === selectedResumeId) || resumes[0];

  const handleFileUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      showToast('File size must be under 10MB', 'error');
      return;
    }

    setIsUploading(true);
    showToast(`Parsing ${file.name} with AI...`, 'info');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        try {
          await api.uploadResume({
            fileName: file.name,
            textContent: text,
            fileType: file.type || 'text/plain',
          });
          await refreshState();
          showToast('Resume parsed and added to your intelligence vault!', 'success');
        } catch (err: any) {
          showToast(err.message || 'Failed to parse resume', 'error');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsText(file);
    } catch (e: any) {
      setIsUploading(false);
      showToast('Error reading file', 'error');
    }
  };

  const handleManualUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim() || !manualText.trim()) return;

    setIsUploading(true);
    try {
      await api.uploadResume({
        fileName: manualTitle.endsWith('.pdf') ? manualTitle : `${manualTitle}.pdf`,
        textContent: manualText,
        fileType: 'text/plain',
      });
      await refreshState();
      setShowManualModal(false);
      setManualTitle('');
      setManualText('');
      showToast('Resume profile successfully generated!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      await api.setPrimaryResume(id);
      await refreshState();
      showToast('Updated primary resume profile', 'success');
    } catch (e) {
      showToast('Failed to set primary resume', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteResume(id);
      await refreshState();
      showToast('Resume removed from vault', 'info');
    } catch (e) {
      showToast('Failed to delete resume', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl border border-slate-800 bg-slate-900/80  ">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Resume Intelligence Vault</h1>
            <p className="text-xs text-slate-400">
              Grounds your real-time interview answers in your authentic career history
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Paste Resume Text</span>
          </button>
        </div>
      </div>

      {/* Upload Drag & Drop Box */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files?.[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
          }
        }}
        className={`relative p-8 rounded-xl border-2 border-dashed transition-all text-center space-y-3 ${
          dragActive
            ? 'border-emerald-500 bg-emerald-500/10'
            : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
        }`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mx-auto">
          <Upload className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white">
            {isUploading ? 'Extracting Resume Intelligence...' : 'Upload your Resume Document'}
          </h3>
          <p className="text-xs text-slate-400">
            Drag and drop your PDF, DOCX, or TXT resume (Max 10MB). Gemini AI will parse your work history and skills.
          </p>
        </div>

        <div>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer  transition-all">
            <Upload className="h-3.5 w-3.5" />
            <span>Browse Files</span>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
              }}
            />
          </label>
        </div>
      </div>

      {/* 2-Column Split: Resume Profiles List vs Extracted Profile Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Uploaded Profiles (4 cols) */}
        <div className="lg:col-span-4 rounded-xl border border-slate-800 bg-slate-900/70 p-5  space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Uploaded Profiles ({resumes.length})
          </h2>

          <div className="space-y-2">
            {resumes.map((r) => {
              const isSelected = selectedResumeId === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedResumeId(r.id)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-emerald-500/50 bg-emerald-950/20 '
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                        <span className="text-xs font-bold text-white line-clamp-1">{r.fileName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        {(r.fileSizeBytes / 1024).toFixed(0)} KB •{' '}
                        {new Date(r.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {r.isPrimary ? (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Star className="h-2.5 w-2.5 fill-amber-300" /> Primary
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetPrimary(r.id);
                          }}
                          className="text-[10px] text-slate-500 hover:text-amber-400 p-1"
                          title="Set as Primary Profile"
                        >
                          <Star className="h-3 w-3" />
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(r.id);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                        title="Delete Resume"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Profile Intelligence Deep-Dive (8 cols) */}
        <div className="lg:col-span-8 rounded-xl border border-slate-800 bg-slate-900/70 p-6  space-y-5">
          {activeResume ? (
            <>
              {/* Profile Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">
                      {activeResume.parsedProfile?.name || 'Candidate Profile'}
                    </h2>
                    {activeResume.isPrimary && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Primary Copilot Profile
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-emerald-400 font-medium mt-0.5">
                    {activeResume.parsedProfile?.headline || 'Software Professional'}
                  </p>
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>AI Verified</span>
                </div>
              </div>

              {/* Summary */}
              {activeResume.parsedProfile?.summary && (
                <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Professional Summary
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {activeResume.parsedProfile.summary}
                  </p>
                </div>
              )}

              {/* Skills Taxonomy */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-emerald-400" /> Extracted Skills Taxonomy (
                  {activeResume.parsedProfile?.skills.length || 0})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(activeResume.parsedProfile?.skills || []).map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-950 text-slate-200 border border-slate-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Work Experience */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-cyan-400" /> Career Milestones & Work History
                </span>
                <div className="space-y-3">
                  {(activeResume.parsedProfile?.experience || []).map((exp, idx) => (
                    <div key={idx} className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{exp.role}</span>
                        <span className="text-xs text-emerald-400 font-semibold">{exp.company}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono block">{exp.duration}</span>
                      <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                        {exp.highlights.map((h, hIdx) => (
                          <li key={hIdx}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Education */}
              {activeResume.parsedProfile?.education && activeResume.parsedProfile.education.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-purple-400" /> Education & Credentials
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeResume.parsedProfile.education.map((ed, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                        <span className="font-bold text-slate-200 block">{ed.degree}</span>
                        <span className="text-slate-400 text-[11px] block">{ed.institution} ({ed.year})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-24 text-center text-xs text-slate-500">
              No resume selected. Upload a resume above.
            </div>
          )}
        </div>
      </div>

      {/* Manual Paste Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80  animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl rounded-lg border border-slate-800 bg-slate-900 p-6  space-y-4">
            <h3 className="text-base font-bold text-white">Paste Resume Profile</h3>
            <form onSubmit={handleManualUpload} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Profile / Resume Title</label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. Staff Distributed Systems Engineer"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Resume Text Content</label>
                <textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  rows={8}
                  placeholder="Paste your work experience, skills, and accomplishments..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono leading-relaxed resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                >
                  {isUploading ? 'Parsing with AI...' : 'Save & Parse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
