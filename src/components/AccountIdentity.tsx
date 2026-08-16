import React, { useState } from "react";
import {
  User as UserIcon,
  ShieldAlert,
  History,
  FileText,
  FileSpreadsheet,
  BookOpen,
  Pin,
  Trash2,
  Sparkles,
  Plus,
  Save,
  Image,
  Loader2,
  CheckCircle,
  ExternalLink,
  Wifi,
  CloudUpload,
  RefreshCw
} from "lucide-react";
import { User } from "firebase/auth";
import { KeepNote, UserProfile, DriveFile, SubscriptionState } from "../types";

interface AccountIdentityProps {
  user: User | null;
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  onSaveProfile: () => Promise<void>;
  notes: KeepNote[];
  onSaveNote: (note: KeepNote) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
  onGenerateNoteImage: (noteId: string, prompt: string) => Promise<string>;
  driveFiles: DriveFile[];
  sheetsSyncLogs: any[];
  isGeneratingImage: boolean;
  onLogin: () => void;
  /** Live subscription state (Pro plan, Stripe status) for the Account page. */
  subscription?: SubscriptionState | null;
  subLoading?: boolean;
  onRefreshSubscription?: () => Promise<void>;
}

export default function AccountIdentity({
  user,
  profile,
  setProfile,
  onSaveProfile,
  notes,
  onSaveNote,
  onDeleteNote,
  onGenerateNoteImage,
  driveFiles,
  sheetsSyncLogs,
  isGeneratingImage,
  onLogin,
  subscription,
  subLoading = false,
  onRefreshSubscription,
}: AccountIdentityProps) {
  // New Note State
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteCategory, setNoteCategory] = useState("Research");

  // Image prompt state for each note
  const [activeNotePromptId, setActiveNotePromptId] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (noteTitle.trim() || noteContent.trim()) {
      const newNote: KeepNote = {
        id: "note_" + Date.now(),
        title: noteTitle.trim() || "Untitled Research",
        content: noteContent.trim(),
        category: noteCategory,
        isPinned: false,
        timestamp: new Date().toISOString(),
      };
      onSaveNote(newNote);
      setNoteTitle("");
      setNoteContent("");
    }
  };

  const handleTogglePin = (note: KeepNote) => {
    onSaveNote({
      ...note,
      isPinned: !note.isPinned,
    });
  };

  const handleTriggerImageGeneration = async (noteId: string) => {
    if (!imagePrompt.trim()) return;
    try {
      await onGenerateNoteImage(noteId, imagePrompt.trim());
      setImagePrompt("");
      setActiveNotePromptId(null);
    } catch (err) {
      console.error("Failed to generate image:", err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto h-screen bg-slate-50 p-8 space-y-8 font-sans scrollbar">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-slate-900 tracking-tight">
              Account, Identity & Workspace Sync
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Manage profiles, bias alerts, and keep-synced research anchors
            </p>
          </div>
        </div>
      </div>

      {/* Subscription / Pro status card */}
      <div className="prism-card p-6 border-slate-200 bg-white shadow-sm rounded-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                subscription?.isPro
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-slate-100 border-slate-200 text-slate-500"
              }`}
            >
              {subscription?.isPro ? <CheckCircle className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-display font-bold text-slate-900 tracking-tight">
                  Subscription
                </h3>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    subscription?.isPro
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}
                >
                  {subLoading ? "…" : subscription?.plan === "Pro" ? "PRO" : "FREE"}
                </span>
                {subscription?.demo && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    DEMO MODE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                {subLoading
                  ? "Loading subscription state…"
                  : subscription?.isPro
                  ? `Pro access active — status: ${subscription.status}` +
                    (subscription.proSince
                      ? `, since ${new Date(subscription.proSince).toLocaleDateString()}`
                      : "")
                  : "You are on the free plan. Upgrade to Pro for deep verification, the multi-agent debate, and the content agent."}
              </p>
              {subscription?.status && subscription.status !== "none" && subscription.status !== "active" && subscription.status !== "trialing" && (
                <p className="text-[11px] font-semibold text-amber-700 font-sans mt-1">
                  ⚠ Subscription status: {subscription.status.replace("_", " ")}. Check your payment method or renew to keep Pro features.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {subscription?.isPro ? (
              <span className="text-[11px] font-mono text-slate-400">All Pro features unlocked ✓</span>
            ) : (
              <a
                href="/upgrade"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-all shadow-sm flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" /> Upgrade to Pro
              </a>
            )}
            {onRefreshSubscription && (
              <button
                onClick={() => onRefreshSubscription()}
                disabled={subLoading}
                title="Refresh subscription state"
                className="p-2 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${subLoading ? "animate-spin" : ""}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {!user && (
        <div className="prism-card p-5 bg-amber-50/50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 border border-amber-200">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">Local Sandbox Mode Active</p>
              <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
                Your notes, profiles, and logs will be saved to your local browser cache. Connect Google Auth to unlock cloud sync with Google Drive, Sheets, and Firestore.
              </p>
            </div>
          </div>
          <button
            onClick={onLogin}
            className="gsi-material-button shadow-xs shrink-0"
          >
            <div className="gsi-material-button-icon">
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }}>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
            </div>
            <span className="gsi-material-button-contents text-xs">Sign In with Google</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {/* Left Column: Profile & Bias Settings */}
          <div className="xl:col-span-1 space-y-6">
            {/* Profile Management Form */}
            <div className="prism-card p-6 border-slate-200 space-y-4 bg-white shadow-sm">
              <h3 className="text-xs font-mono tracking-wider text-slate-500 uppercase border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>Profile Management</span>
                <span className="text-[10px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                  {subLoading ? "…" : subscription?.plan === "Pro" ? "Pro" : profile.subscriptionStatus}
                </span>
              </h3>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Full Name</label>
                  <input
                    type="text"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-slate-400 text-slate-900 font-sans shadow-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Email Address</label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded text-slate-500 font-sans cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Organization</label>
                  <input
                    type="text"
                    value={profile.organization}
                    onChange={(e) => setProfile({ ...profile, organization: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-slate-400 text-slate-900 font-sans shadow-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Location Coordinate</label>
                  <input
                    type="text"
                    value={profile.location}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-slate-400 text-slate-900 font-sans shadow-sm"
                  />
                </div>
              </div>

              <button
                onClick={onSaveProfile}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" /> Save Profile Details
              </button>
            </div>

            {/* Bias Alert Toggles */}
            <div className="prism-card p-6 border-slate-200 space-y-4 bg-white shadow-sm">
              <h3 className="text-xs font-mono tracking-wider text-slate-500 uppercase border-b border-slate-100 pb-2">
                Verification Bias Alerts
              </h3>

              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5 max-w-[80%]">
                    <span className="text-xs font-semibold text-slate-800">High Bias Detection</span>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                      Flags articles with publishers indexed above 60% left-wing or right-wing bias ratings.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.biasAlerts.highBias}
                    onChange={(e) => setProfile({
                      ...profile,
                      biasAlerts: { ...profile.biasAlerts, highBias: e.target.checked }
                    })}
                    className="w-4 h-4 rounded border-slate-300 text-slate-700 focus:ring-slate-500 bg-white"
                  />
                </div>

                <div className="flex items-start justify-between">
                  <div className="space-y-0.5 max-w-[80%]">
                    <span className="text-xs font-semibold text-slate-800">Conflict of Interest Watch</span>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                      Alerts if research contains companies backed by sovereign wealth funds or state subsidies.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.biasAlerts.conflictOfInterest}
                    onChange={(e) => setProfile({
                      ...profile,
                      biasAlerts: { ...profile.biasAlerts, conflictOfInterest: e.target.checked }
                    })}
                    className="w-4 h-4 rounded border-slate-300 text-slate-700 focus:ring-slate-500 bg-white"
                  />
                </div>

                <div className="flex items-start justify-between">
                  <div className="space-y-0.5 max-w-[80%]">
                    <span className="text-xs font-semibold text-slate-800">Source Volatility Indexer</span>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                      Triggers extra secondary review steps if the claim has under 3 verifying news citations.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.biasAlerts.sourceVolatility}
                    onChange={(e) => setProfile({
                      ...profile,
                      biasAlerts: { ...profile.biasAlerts, sourceVolatility: e.target.checked }
                    })}
                    className="w-4 h-4 rounded border-slate-300 text-slate-700 focus:ring-slate-500 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Columns: Google Keep Notes Sync Sandbox */}
          <div className="xl:col-span-2 space-y-6">
            {/* Note creation */}
            <div className="prism-card p-6 border-slate-200 space-y-4 bg-white shadow-sm">
              <h3 className="text-xs font-mono tracking-wider text-slate-500 uppercase border-b border-slate-100 pb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-700" /> Google Keep Sync Sandbox
              </h3>

              <form onSubmit={handleAddNote} className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Research Title (e.g. EU Carbon Credit Claim)..."
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    className="col-span-2 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900 font-sans shadow-sm"
                  />
                  <select
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value)}
                    className="px-2 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none text-slate-700 font-sans shadow-sm"
                  >
                    <option value="Research">Research</option>
                    <option value="Fact Check">Fact Check</option>
                    <option value="Supply Chain">Supply Chain</option>
                    <option value="Personal">Personal</option>
                  </select>
                </div>
                <textarea
                  placeholder="Record fact check notes, findings, and publisher citations..."
                  rows={3}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900 font-sans resize-none shadow-sm"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Save Keep Note
                </button>
              </form>
            </div>

            {/* Note Grid */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">
                YOUR RESEARCH NOTES
              </span>

              {notes.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs bg-white shadow-xs">
                  No notes saved yet. Jot down your research observations above.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="prism-card p-4 border-slate-200 flex flex-col justify-between gap-4 relative bg-white shadow-sm"
                    >
                      {/* Pinned Indicator */}
                      <button
                        onClick={() => handleTogglePin(note)}
                        className={`absolute top-3 right-3 p-1 rounded hover:bg-slate-50 transition-all ${
                          note.isPinned ? "text-slate-800" : "text-slate-400"
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {note.category}
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono">
                              {new Date(note.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 pr-6">{note.title}</h4>
                        </div>

                        {note.imageUrl ? (
                          <div className="relative rounded overflow-hidden border border-slate-200 bg-slate-50">
                            <img
                              src={note.imageUrl}
                              alt="Note Illustration"
                              className="w-full h-32 object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : activeNotePromptId === note.id ? (
                          <div className="p-2.5 rounded bg-slate-50 border border-slate-200 space-y-2">
                            <input
                              type="text"
                              placeholder="Describe image (e.g. green grid datacenter)..."
                              value={imagePrompt}
                              onChange={(e) => setImagePrompt(e.target.value)}
                              className="w-full px-2 py-1.5 text-[11px] bg-white border border-slate-200 rounded text-slate-900 outline-none focus:border-slate-400 font-sans"
                            />
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleTriggerImageGeneration(note.id)}
                                disabled={isGeneratingImage}
                                className="px-2 py-1 bg-slate-900 text-white rounded text-[10px] font-semibold transition-all flex items-center gap-1 shadow-xs"
                              >
                                {isGeneratingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                Generate
                              </button>
                              <button
                                onClick={() => setActiveNotePromptId(null)}
                                className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setActiveNotePromptId(note.id);
                              setImagePrompt("");
                            }}
                            className="w-full py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-600 font-semibold transition-all flex items-center justify-center gap-1.5"
                          >
                            <Image className="w-3.5 h-3.5" /> Generate Visual Anchor Card
                          </button>
                        )}

                        <p className="text-xs text-slate-600 leading-relaxed font-sans whitespace-pre-wrap">
                          {note.content}
                        </p>
                      </div>

                      <div className="flex justify-end border-t border-slate-100 pt-3">
                        <button
                          onClick={() => onDeleteNote(note.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Document history section: Drive files and Sheets list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Drive list */}
              <div className="prism-card p-5 border-slate-200 space-y-4 bg-white shadow-sm">
                <h3 className="text-xs font-mono tracking-wider text-slate-500 uppercase border-b border-slate-100 pb-2 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-700" /> Google Drive Synced Reports
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto scrollbar pr-1">
                  {driveFiles.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs font-sans bg-slate-50 rounded border border-dashed border-slate-200">
                      No reports uploaded in this session. Send reports to drive using the feed actions!
                    </div>
                  ) : (
                    driveFiles.map((file) => (
                      <div key={file.id} className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-200/60 text-xs shadow-xs">
                        <div className="truncate max-w-[80%] font-medium text-slate-700 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{file.name}</span>
                        </div>
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-slate-900 transition-all"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Sheets sync logs */}
              <div className="prism-card p-5 border-slate-200 space-y-4 bg-white shadow-sm">
                <h3 className="text-xs font-mono tracking-wider text-slate-500 uppercase border-b border-slate-100 pb-2 flex items-center gap-2">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-700" /> Google Sheets Sync Audit Logs
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto scrollbar pr-1">
                  {sheetsSyncLogs.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs font-sans bg-slate-50 rounded border border-dashed border-slate-200">
                      No sheets synchronized yet. Push reports using "Sync Sheet" actions.
                    </div>
                  ) : (
                    sheetsSyncLogs.map((log, i) => (
                      <div key={i} className="p-2.5 rounded bg-slate-50 border border-slate-200/60 text-[11px] font-sans space-y-1 shadow-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-slate-700 truncate max-w-[70%]">{log.title}</span>
                          <span className="text-[9px] font-mono text-slate-700 flex items-center gap-0.5 bg-slate-100 px-1.5 rounded border border-slate-200">
                            <CloudUpload className="w-3 h-3 text-slate-500" /> Sync OK
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex justify-between">
                          <span>Verified: {log.status}</span>
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
