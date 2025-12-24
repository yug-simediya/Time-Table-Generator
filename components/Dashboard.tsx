import React, { useState, useEffect } from 'react';
import { User, SchoolGroup, UserRole } from '../types';
import { createGroup, joinGroup, getUserGroups, updateUserPassword, syncUserGroups, deleteGroup } from '../services/dataService';
import { Users, User as UserIcon, Plus, ArrowRight, School, Briefcase, LogOut, Crown, ShieldAlert, X, KeyRound, Loader2, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  user: User;
  onSelectContext: (type: 'personal' | 'group', groupId?: string) => void;
  onLogout: () => void;
}

const Dashboard: React.FC<Props> = ({ user, onSelectContext, onLogout }) => {
  const isGuest = user.id === 'guest_user';
  const [groups, setGroups] = useState<SchoolGroup[]>([]);
  const [showJoin, setShowJoin] = useState(false);
  const [joinId, setJoinId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [showAuthRequired, setShowAuthRequired] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState({ type: '', text: '' });
  const [isPwdLoading, setIsPwdLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  useEffect(() => {
    const loadGroups = async () => {
      setIsLoadingGroups(true);
      // 1. Load local immediately
      setGroups(getUserGroups(user.id));
      
      // 2. Sync cloud if not guest
      if (!isGuest) {
        setIsSyncing(true);
        await syncUserGroups(user.id);
        // 3. Reload from local after sync
        setGroups(getUserGroups(user.id));
        setIsSyncing(false);
      }
      setIsLoadingGroups(false);
    };
    loadGroups();
  }, [user.id, isGuest]);

  const handleCreateRequest = () => {
    if (isGuest) {
      setShowAuthRequired(true);
      return;
    }
    setShowCreate(true);
  };

  const handleJoinRequest = () => {
    if (isGuest) {
      setShowAuthRequired(true);
      return;
    }
    setShowJoin(true);
  };

  const handleCreate = async () => {
    if (!createName) return;
    setIsLoadingGroups(true);
    try {
      const newGroup = await createGroup(createName, user.id);
      setGroups([...groups, newGroup]);
      setShowCreate(false);
      setCreateName('');
      onSelectContext('group', newGroup.id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const handleJoin = async () => {
    if (!joinId) return;
    setMsg('');
    setIsLoadingGroups(true);
    try {
      const group = await joinGroup(joinId, user.id);
      setGroups(getUserGroups(user.id)); // Reload to get full list
      setShowJoin(false);
      setJoinId('');
      onSelectContext('group', group.id);
    } catch (e: any) {
      setMsg(e.message || 'Group not found');
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the group "${groupName}"? This action cannot be undone.`)) {
      return;
    }

    setIsLoadingGroups(true);
    try {
      await deleteGroup(groupId, user.id);
      setGroups(groups.filter(g => g.id !== groupId));
    } catch (e: any) {
      alert(e.message || "Failed to delete group");
    } finally {
      setIsLoadingGroups(false);
    }
  };
  
  const handleChangePassword = async () => {
    if (!newPassword) return;
    setIsPwdLoading(true);
    setPwdMsg({ type: '', text: '' });
    try {
      await updateUserPassword(newPassword);
      setPwdMsg({ type: 'success', text: 'Password updated successfully!' });
      setTimeout(() => {
        setShowChangePassword(false);
        setNewPassword('');
        setPwdMsg({type: '', text: ''});
      }, 2000);
    } catch (e: any) {
      setPwdMsg({ type: 'error', text: e.message });
    } finally {
      setIsPwdLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] p-6 md:p-12 animate-fade-in relative overflow-hidden">
        {/* Background ambient glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-lime/5 rounded-full blur-[120px] pointer-events-none"></div>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 max-w-7xl mx-auto relative z-10">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
            <div 
              onClick={() => !isGuest && user.provider !== 'google' && setShowChangePassword(true)}
              className={`w-12 h-12 rounded-full overflow-hidden border border-[#27272a] hidden sm:block ${!isGuest && user.provider !== 'google' ? 'cursor-pointer hover:border-brand-lime transition-colors' : ''}`}
              title="Click to change password"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#18181b] flex items-center justify-center text-brand-lime font-bold text-xl">
                  {user.name.charAt(0)}
                </div>
              )}
            </div>
            <div>
              Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-lime to-brand-limeDark">{user.name}</span>
            </div>
            {isGuest && <span className="text-xs bg-[#18181b] border border-brand-lime/20 text-brand-lime px-2 py-1 rounded font-mono uppercase">Guest Mode</span>}
          </h1>
          <p className="text-brand-muted mt-2 text-lg sm:ml-16">Manage your schedules and academic groups.</p>
        </div>
        <button 
          onClick={onLogout} 
          className="mt-4 md:mt-0 flex items-center gap-2 text-sm font-medium text-brand-muted hover:text-white border border-[#27272a] hover:border-white px-5 py-2.5 rounded-full transition-all"
        >
          <LogOut size={16} /> Logout
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto relative z-10">
        
        {/* LEFT COLUMN: Personal Workspace (4 cols) */}
        <div className="lg:col-span-4">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Briefcase size={20} className="text-brand-lime" /> Personal
            </h2>
            <div 
            onClick={() => onSelectContext('personal')}
            className="group cursor-pointer glass-panel p-8 h-[400px] flex flex-col justify-between hover-interactive relative overflow-hidden"
            >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity duration-500 transform group-hover:scale-110 origin-top-right">
                <UserIcon size={200} />
            </div>
            
            <div>
                <div className="w-16 h-16 bg-[#18181b] rounded-2xl flex items-center justify-center mb-6 border border-[#27272a] shadow-card group-hover:shadow-[0_0_20px_rgba(204,255,0,0.15)] transition-shadow overflow-hidden">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon size={32} className="text-brand-lime" />
                    )}
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Private Workspace</h3>
                <p className="text-brand-muted leading-relaxed">
                    Designed for individual tutors and personal planning. Data is stored locally on this device.
                </p>
            </div>

            <div className="flex items-center text-brand-lime font-bold text-sm tracking-wide group-hover:translate-x-1 transition-transform">
                ENTER WORKSPACE <ArrowRight size={16} className="ml-2" />
            </div>
            </div>
        </div>

        {/* RIGHT COLUMN: School Groups (8 cols) */}
        <div className="lg:col-span-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <School size={20} className="text-brand-lime" /> School Groups
                    {isSyncing && <RefreshCw size={14} className="animate-spin text-brand-muted" />}
                </h2>
                <div className="flex gap-3">
                    <button 
                        onClick={handleJoinRequest}
                        className="px-5 py-2 bg-[#121212] hover:bg-[#18181b] border border-[#27272a] rounded-full text-white text-sm font-medium transition-all"
                    >
                        Join Group
                    </button>
                    <button 
                        onClick={handleCreateRequest}
                        className="px-5 py-2 bg-brand-lime hover:bg-brand-limeDark text-black rounded-full text-sm font-bold shadow-glow transition-all flex items-center gap-2"
                    >
                        <Plus size={16} /> New Group
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groups.length === 0 ? (
                    <div className="col-span-2 glass-panel p-12 flex flex-col items-center justify-center text-center border-dashed border-[#27272a]">
                        <div className="w-16 h-16 bg-[#18181b] rounded-full flex items-center justify-center mb-4 text-brand-muted">
                            <Users size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">No Groups Yet</h3>
                        <p className="text-brand-muted max-w-sm mb-6">Join your school's group using an ID or create a new one to start collaborating.</p>
                        {isGuest && (
                          <div className="mt-4 p-4 bg-brand-lime/5 rounded-2xl border border-brand-lime/20 flex items-center gap-3 text-left">
                            <ShieldAlert size={20} className="text-brand-lime shrink-0" />
                            <p className="text-xs text-brand-muted leading-relaxed">
                              Groups require a registered account for cloud sync and member permissions. <span className="text-brand-lime font-bold">Sign up</span> to use this feature.
                            </p>
                          </div>
                        )}
                    </div>
                ) : (
                    groups.map(group => {
                        const myRole = group.members.find(m => m.userId === user.id)?.role;
                        const isPrincipal = myRole === UserRole.PRINCIPAL;
                        const isSupervisor = myRole === UserRole.SUPERVISOR;

                        return (
                            <div 
                                key={group.id} 
                                onClick={() => onSelectContext('group', group.id)}
                                className="glass-panel p-6 hover-interactive cursor-pointer relative group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                                        isPrincipal ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 
                                        'bg-[#18181b] border-[#27272a] text-brand-muted'
                                    }`}>
                                        <School size={24} />
                                    </div>
                                    <div className="flex gap-2">
                                       <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${
                                          isPrincipal ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' :
                                          isSupervisor ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                                          'bg-[#27272a] border-[#3f3f46] text-brand-muted'
                                       }`}>
                                          {myRole}
                                       </span>
                                       
                                       {isPrincipal && (
                                         <button 
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             handleDeleteGroup(group.id, group.name);
                                           }}
                                           className="p-1 rounded bg-[#27272a] hover:bg-red-900/50 hover:text-red-400 text-brand-muted transition-colors border border-transparent hover:border-red-900/50"
                                           title="Delete Group"
                                         >
                                            <Trash2 size={14} />
                                         </button>
                                       )}
                                    </div>
                                </div>
                                
                                <h3 className="font-bold text-white text-lg mb-1">{group.name}</h3>
                                <p className="text-xs text-brand-muted font-mono mb-4">ID: {group.id}</p>
                                
                                <div className="flex items-center gap-4 text-xs text-brand-muted border-t border-[#27272a] pt-4">
                                    <div className="flex items-center gap-1">
                                        <Users size={14} /> {group.members.length} Members
                                    </div>
                                    {isPrincipal && (
                                        <div className="flex items-center gap-1 text-purple-400">
                                            <Crown size={14} /> Admin
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
      </div>

      {/* Auth Required Modal */}
      {showAuthRequired && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="glass-panel w-full max-w-md p-8 animate-fade-in relative text-center">
             <button onClick={() => setShowAuthRequired(false)} className="absolute top-4 right-4 text-brand-muted hover:text-white transition-colors">
               <X size={24} />
             </button>
             <div className="w-20 h-20 bg-brand-lime/10 rounded-full flex items-center justify-center mb-6 mx-auto border border-brand-lime/20 shadow-glow">
                <ShieldAlert size={40} className="text-brand-lime" />
             </div>
             <h3 className="text-2xl font-bold text-white mb-2">Authentication Required</h3>
             <p className="text-brand-muted mb-8">
               Collaborative groups require a verified account. Please Login or Sign Up to create or join groups and sync your schedules across devices.
             </p>
             <div className="flex flex-col gap-3">
               <button 
                 onClick={onLogout}
                 className="w-full py-4 bg-brand-lime text-black font-bold rounded-xl hover:bg-brand-limeDark transition-colors shadow-glow"
               >
                 Go to Login / Sign Up
               </button>
               <button 
                 onClick={() => setShowAuthRequired(false)}
                 className="w-full py-4 bg-[#18181b] text-white font-medium rounded-xl hover:bg-[#27272a] transition-colors border border-[#27272a]"
               >
                 Stay as Guest
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {showJoin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel w-full max-w-md p-8 animate-fade-in relative">
             <button onClick={() => setShowJoin(false)} className="absolute top-4 right-4 text-brand-muted hover:text-white"><Plus size={24} className="rotate-45" /></button>
             <div className="mb-6">
                 <div className="w-12 h-12 bg-[#18181b] rounded-full flex items-center justify-center mb-4 border border-[#27272a]">
                     <Users size={24} className="text-brand-lime" />
                 </div>
                 <h3 className="text-2xl font-bold text-white">Join Group</h3>
                 <p className="text-brand-muted">Enter the 6-character code provided by your admin.</p>
             </div>
             
             <input 
               type="text" 
               placeholder="XYZ123" 
               className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-4 text-white mb-2 uppercase tracking-[0.5em] text-center font-mono text-xl focus:border-brand-lime outline-none transition-colors"
               value={joinId}
               onChange={(e) => setJoinId(e.target.value.toUpperCase())}
               maxLength={6}
               disabled={isLoadingGroups}
             />
             {msg && <p className="text-red-400 text-sm text-center mt-2 bg-red-900/10 py-2 rounded">{msg}</p>}
             
             <button onClick={handleJoin} disabled={isLoadingGroups} className="w-full mt-6 py-4 bg-brand-lime text-black font-bold rounded-xl hover:bg-brand-limeDark transition-colors shadow-glow flex items-center justify-center">
                 {isLoadingGroups ? <Loader2 className="animate-spin" /> : 'Join Group'}
             </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel w-full max-w-md p-8 animate-fade-in relative">
             <button onClick={() => setShowCreate(false)} className="absolute top-4 right-4 text-brand-muted hover:text-white"><Plus size={24} className="rotate-45" /></button>
             <div className="mb-6">
                 <div className="w-12 h-12 bg-[#18181b] rounded-full flex items-center justify-center mb-4 border border-[#27272a]">
                     <School size={24} className="text-brand-lime" />
                 </div>
                 <h3 className="text-2xl font-bold text-white">Create Group</h3>
                 <p className="text-brand-muted">Setup a new school organization. You will be the admin.</p>
             </div>

             <label className="block text-xs font-bold text-brand-muted mb-2 uppercase tracking-wider">School / Organization Name</label>
             <input 
               type="text" 
               placeholder="e.g. St. Xavier's High School" 
               className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-white focus:border-brand-lime outline-none transition-colors"
               value={createName}
               onChange={(e) => setCreateName(e.target.value)}
               disabled={isLoadingGroups}
             />
             
             <button onClick={handleCreate} disabled={isLoadingGroups} className="w-full mt-6 py-4 bg-brand-lime text-black font-bold rounded-xl hover:bg-brand-limeDark transition-colors shadow-glow flex items-center justify-center">
                 {isLoadingGroups ? <Loader2 className="animate-spin" /> : 'Create & Enter'}
             </button>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel w-full max-w-md p-8 animate-fade-in relative">
             <button onClick={() => setShowChangePassword(false)} className="absolute top-4 right-4 text-brand-muted hover:text-white"><X size={24} /></button>
             <div className="mb-6">
                 <div className="w-12 h-12 bg-[#18181b] rounded-full flex items-center justify-center mb-4 border border-[#27272a]">
                     <KeyRound size={24} className="text-brand-lime" />
                 </div>
                 <h3 className="text-2xl font-bold text-white">Change Password</h3>
                 <p className="text-brand-muted">Enter a new secure password.</p>
             </div>

             <input 
               type="password" 
               placeholder="New Password" 
               className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-white focus:border-brand-lime outline-none transition-colors"
               value={newPassword}
               onChange={(e) => setNewPassword(e.target.value)}
             />
             
             {pwdMsg.text && (
               <div className={`mt-3 p-2 rounded text-sm text-center ${pwdMsg.type === 'error' ? 'text-red-400 bg-red-900/20' : 'text-green-400 bg-green-900/20'}`}>
                 {pwdMsg.text}
               </div>
             )}
             
             <button 
              onClick={handleChangePassword} 
              disabled={isPwdLoading}
              className="w-full mt-6 py-4 bg-brand-lime text-black font-bold rounded-xl hover:bg-brand-limeDark transition-colors shadow-glow flex items-center justify-center gap-2"
             >
                 {isPwdLoading ? <Loader2 className="animate-spin" size={20}/> : 'Update Password'}
             </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;