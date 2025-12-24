
import React, { useState, useEffect, useRef } from 'react';
import { AppState, User, SchoolGroup, UserRole } from './types';
import { INITIAL_STATE } from './constants';
import { loadState, saveState, getSession, logout, getGroup, getUserRoleInGroup } from './services/dataService';
import Sidebar from './components/Sidebar';
import SetupPanel from './components/SetupPanel';
import TimingsPanel from './components/TimingsPanel';
import DataEntryPanel from './components/DataEntryPanel';
import FacultyPanel from './components/FacultyPanel';
import ScheduleView from './components/ScheduleView';
import MembersPanel from './components/MembersPanel';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import { Bell, Lock, Cloud, Loader2, CheckCircle2, CloudOff } from 'lucide-react';

const App: React.FC = () => {
  // Routing State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeContext, setActiveContext] = useState<'auth' | 'dashboard' | 'workspace'>('auth');
  const [contextId, setContextId] = useState<string>('personal'); // 'personal' or groupID
  
  // Workspace State
  const [step, setStep] = useState(0);
  const [appState, setAppState] = useState<AppState>(INITIAL_STATE);
  const [currentGroup, setCurrentGroup] = useState<SchoolGroup | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.PRINCIPAL); // Default to full access for personal
  
  // Persistence UI State
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'offline'>('idle');
  const isFirstLoad = useRef(true); // Prevents overwriting data on initial mount
  
  // -- Initialization --
  useEffect(() => {
    const session = getSession();
    if (session) {
      setCurrentUser(session);
      setActiveContext('dashboard');
    } else {
      setActiveContext('auth');
    }
  }, []);

  // -- Load Data when Context Changes --
  useEffect(() => {
    if (activeContext === 'workspace') {
      const fetchData = async () => {
        setIsDataLoading(true);
        isFirstLoad.current = true; // Reset lock
        try {
          // Load state from Cloud or Local
          const data = await loadState(contextId, currentUser?.id);
          if (data) {
            setAppState(data);
          } else {
            // Only revert to initial if genuinely no data found
            setAppState(INITIAL_STATE);
          }
          
          if (contextId !== 'personal') {
            const group = getGroup(contextId);
            if (group && currentUser) {
              setCurrentGroup(group);
              setUserRole(getUserRoleInGroup(group, currentUser.id));
            }
          } else {
            setCurrentGroup(null);
            setUserRole(UserRole.PRINCIPAL); // Full access in personal mode
          }
        } catch (e) {
          console.error("Error loading data", e);
        } finally {
          setIsDataLoading(false);
          // Allow saves only after data has finished loading attempts
          setTimeout(() => { isFirstLoad.current = false; }, 500); 
        }
      };
      
      fetchData();
    }
  }, [activeContext, contextId, currentUser]);

  // -- Auto Save --
  useEffect(() => {
    if (activeContext === 'workspace' && !isDataLoading && !isFirstLoad.current) {
      setSaveStatus('saving');
      const timer = setTimeout(async () => {
        const cloudSuccess = await saveState(appState, contextId, currentUser?.id);
        setSaveStatus(cloudSuccess ? 'saved' : 'offline');
        
        // Return to idle after delay, unless offline warning needed
        setTimeout(() => setSaveStatus(prev => prev === 'offline' ? 'offline' : 'idle'), 2000);
      }, 1500); // Debounce save by 1.5s
      
      return () => clearTimeout(timer);
    }
  }, [appState, activeContext, contextId, currentUser, isDataLoading]);

  // -- Handlers --

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveContext('dashboard');
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setActiveContext('auth');
    setStep(0);
  };

  const handleSelectContext = (type: 'personal' | 'group', groupId?: string) => {
    setContextId(type === 'personal' ? 'personal' : groupId!);
    setActiveContext('workspace');
    setStep(0); // Reset step
  };

  const handleStateChange = (updates: Partial<AppState>) => {
    // Permission Check
    if (userRole === UserRole.TEACHER && contextId !== 'personal') {
      alert("Teachers have View-Only access to the schedule configuration.");
      return;
    }
    setAppState(prev => ({ ...prev, ...updates }));
  };

  const renderContent = () => {
    if (isDataLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-brand-muted">
           <Loader2 size={48} className="animate-spin text-brand-lime mb-4" />
           <p>Syncing your workspace...</p>
        </div>
      );
    }

    // Read-Only Banner for Teachers
    const isReadOnly = userRole === UserRole.TEACHER && contextId !== 'personal';

    const content = () => {
      switch (step) {
        case 0: return <SetupPanel state={appState} onChange={handleStateChange} />;
        case 1: return <TimingsPanel state={appState} onChange={handleStateChange} />;
        case 2: return <DataEntryPanel state={appState} onChange={handleStateChange} />;
        case 3: return <FacultyPanel state={appState} onChange={handleStateChange} />;
        case 4: return <ScheduleView state={appState} onChange={handleStateChange} />;
        case 5: return <MembersPanel group={currentGroup} currentUser={currentUser} />;
        default: return <SetupPanel state={appState} onChange={handleStateChange} />;
      }
    };

    return (
      <div className="relative">
        {isReadOnly && step !== 4 && step !== 5 && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-3xl border border-red-900/50">
             <Lock size={48} className="text-red-500 mb-4" />
             <h3 className="text-xl font-bold text-white">View Only Access</h3>
             <p className="text-brand-muted max-w-md text-center mt-2">
               You are logged in as a <strong>Teacher</strong>. You can view the generated schedule in the Schedule tab, but cannot modify the configuration.
             </p>
             <button 
               onClick={() => setStep(4)}
               className="mt-6 px-6 py-2 bg-brand-lime text-black font-bold rounded-full hover:bg-white transition-colors"
             >
               Go to Schedule View
             </button>
          </div>
        )}
        {content()}
      </div>
    );
  };

  // -- Render Logic based on Phase --

  if (activeContext === 'auth') {
    return <Auth onLogin={handleLogin} />;
  }

  if (activeContext === 'dashboard' && currentUser) {
    return <Dashboard user={currentUser} onSelectContext={handleSelectContext} onLogout={handleLogout} />;
  }

  // Workspace View
  return (
    <div className="min-h-screen bg-[#050505] text-brand-text font-sans">
      <Sidebar 
        currentStep={step} 
        setStep={setStep} 
        group={currentGroup} 
        role={userRole}
        onExit={() => setActiveContext('dashboard')}
      />
      
      <main className="pl-20 md:pl-64 transition-all duration-300">
        <header className="h-20 flex items-center justify-between px-8 sticky top-0 z-40 bg-[#050505]/80 backdrop-blur-md border-b border-[#1f1f22]">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {step === 0 && 'Configuration'}
              {step === 1 && 'Time Management'}
              {step === 2 && 'Subjects'}
              {step === 3 && 'Teacher Management'}
              {step === 4 && 'Schedule Overview'}
              {step === 5 && 'Member Management'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
               {currentGroup && <p className="text-xs text-brand-lime font-mono">GROUP: {currentGroup.name}</p>}
               
               {/* Saving Status Indicator */}
               {saveStatus === 'saving' && (
                  <span className="flex items-center gap-1 text-[10px] text-brand-muted animate-pulse">
                    <Cloud size={10} /> Saving...
                  </span>
               )}
               {saveStatus === 'saved' && (
                  <span className="flex items-center gap-1 text-[10px] text-green-500">
                    <CheckCircle2 size={10} /> Saved to Cloud
                  </span>
               )}
               {saveStatus === 'offline' && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-500" title="Cloud Sync Failed. Saving locally.">
                    <CloudOff size={10} /> Saved Locally (Cloud Error)
                  </span>
               )}
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative">
              <Bell size={20} className="text-brand-muted hover:text-white cursor-pointer" />
              <div className="absolute top-0 right-0 w-2 h-2 bg-brand-lime rounded-full shadow-glow"></div>
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-[#27272a]">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-white">{currentUser?.name}</p>
                <p className="text-xs text-brand-muted uppercase">{userRole}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#18181b] border border-[#27272a] flex items-center justify-center overflow-hidden font-bold text-brand-lime">
                 {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                 ) : (
                    currentUser?.name.charAt(0)
                 )}
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
