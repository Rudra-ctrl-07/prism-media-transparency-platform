import React from "react";
import {
  Compass,
  Briefcase,
  Search,
  User as UserIcon,
  LogOut,
  Database,
  Wifi,
  CloudLightning,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  MessageSquare,
  Network
} from "lucide-react";
import { User } from "firebase/auth";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isCloudActive: boolean;
  isLoggingIn: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  user,
  onLogin,
  onLogout,
  isCloudActive,
  isLoggingIn,
  isOpen,
  onClose,
}: SidebarProps) {
  const menuItems = [
    { id: "feed", label: "Transparency Feed", icon: Compass },
    { id: "bias-mapping", label: "Bias Mapping Canvas", icon: Network },
    { id: "polling", label: "Auditor Polling", icon: ShieldCheck },
    { id: "business", label: "Market Intelligence", icon: Briefcase },
    { id: "directory", label: "Source Directory", icon: Search },
    { id: "chat", label: "PRISM Chatbot", icon: MessageSquare },
    { id: "account", label: "Account & Notes", icon: UserIcon },
  ];

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    onClose();
  };

  return (
    <div className={`fixed lg:static inset-y-0 left-0 z-50 w-80 h-screen bg-white border-r border-slate-200 flex flex-col justify-between p-6 shrink-0 font-sans transition-transform duration-200 lg:translate-x-0 ${
      isOpen ? "translate-x-0" : "-translate-x-full"
    }`}>
      <div className="flex flex-col gap-8 relative">
        {/* Close Button on Mobile */}
        <button 
          onClick={onClose} 
          className="lg:hidden absolute top-0 right-0 p-1 text-slate-400 hover:text-slate-650 focus:outline-none"
          title="Close Navigation Menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {/* Logo */}
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 100 100" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="12" fill="black"/>
            <path d="M37.5 33.5 H55.5 C61.5 33.5 66.5 38.5 66.5 44.5 C66.5 50.5 61.5 53.5 53 53.5 Z" fill="white"/>
            <rect x="37.5" y="53.5" width="15.5" height="15.5" fill="white"/>
            <text x="64" y="38" fill="white" fontFamily="sans-serif" fontSize="6.5" fontWeight="900">TM</text>
          </svg>
          <div>
            <span className="font-display font-bold text-xl tracking-wide text-slate-900">
              PRISM
            </span>
            <div className="text-[9px] font-mono tracking-widest text-slate-500 uppercase font-semibold">
              Transparency AI
            </div>
          </div>
        </div>

        {/* Database Status Indicator (Anti-AI-Slop, elegant and genuine) */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
          <div className="relative">
            <span className={`flex h-2.5 w-2.5 rounded-full ${isCloudActive ? "bg-emerald-500" : "bg-amber-500"}`} />
            <span className={`absolute top-0 left-0 inline-flex h-2.5 w-2.5 rounded-full animate-ping ${isCloudActive ? "bg-emerald-400/70" : "bg-amber-400/70"}`} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-800">
              {isCloudActive ? "Cloud Vault Connected" : "Sandbox Cache Storage"}
            </span>
            <span className="text-[10px] text-slate-450 font-mono">
              {isCloudActive ? "Real-time Firestore active" : "Auto-fallback to local memory"}
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-slate-100 text-slate-900 border-l-2 border-slate-700 font-semibold"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-850"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-slate-800" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User block / Footer login */}
      <div className="border-t border-slate-100 pt-5">
        {user ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User Profile"}
                  className="w-10 h-10 rounded-full border border-slate-200"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-slate-500" />
                </div>
              )}
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-semibold text-slate-800 truncate">
                  {user.displayName || "Verified Analyst"}
                </span>
                <span className="text-xs text-slate-500 truncate">{user.email}</span>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Disconnect Session</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 p-1">
            <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
              Authenticate via Google Auth to activate workspace pipelines (Drive, Sheets).
            </p>
            <button
              id="google-signin-btn"
              onClick={onLogin}
              disabled={isLoggingIn}
              className="gsi-material-button w-full shadow-sm border border-slate-200 disabled:opacity-50"
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
              <span className="gsi-material-button-contents text-xs">
                {isLoggingIn ? "Connecting..." : "Google Sign-In"}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
