import React, { useEffect, useState } from 'react';
import { SchoolGroup, User, UserRole } from '../types';
import { getGroupMembersDetails, updateGroupMemberRole, leaveGroup, addMemberByEmail } from '../services/dataService';
import { User as UserIcon, Calendar, Mail, Shield, LogOut, UserPlus, X, Loader2 } from 'lucide-react';

interface Props {
  group: SchoolGroup | null;
  currentUser: User | null;
  onLeave?: () => void;
}

const MembersPanel: React.FC<Props> = ({ group, currentUser, onLeave }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (group) {
      const details = getGroupMembersDetails(group.id);
      setMembers(details);
    }
  }, [group, members.length, showAddMember]); 

  const handleRoleChange = async (targetUserId: string, newRole: UserRole) => {
    if (!group || !currentUser) return;
    try {
      const updatedGroup = await updateGroupMemberRole(group.id, targetUserId, newRole, currentUser.id);
      // Refresh local list
      const details = getGroupMembersDetails(updatedGroup.id);
      setMembers(details);
    } catch (e: any) {
      alert(e.message || "Failed to update role");
    }
  };

  const handleLeaveGroup = async () => {
    if (!group || !currentUser) return;
    
    const isPrincipal = group.adminId === currentUser.id;
    const msg = isPrincipal 
        ? "As you are the Principal, leaving the group will automatically promote a Supervisor or the next senior Teacher to Principal. Are you sure you want to leave?"
        : "Are you sure you want to leave this group?";

    if (window.confirm(msg)) {
        try {
            await leaveGroup(group.id, currentUser.id);
            if (onLeave) onLeave();
        } catch (e: any) {
            alert(e.message || "Failed to leave group");
        }
    }
  };

  const handleAddMember = async () => {
      if (!group || !currentUser || !addEmail) return;
      setIsAdding(true);
      try {
          await addMemberByEmail(group.id, addEmail.trim(), currentUser.id);
          alert("Member added successfully!");
          setAddEmail('');
          setShowAddMember(false);
          // Refresh list immediately
          const details = getGroupMembersDetails(group.id);
          setMembers(details);
      } catch (e: any) {
          alert(e.message);
      } finally {
          setIsAdding(false);
      }
  };

  if (!group) {
    return (
      <div className="glass-panel p-12 text-center flex flex-col items-center justify-center h-[50vh]">
        <div className="w-20 h-20 bg-[#18181b] rounded-full flex items-center justify-center mb-6 border border-[#27272a]">
          <UserIcon size={40} className="text-brand-lime" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Personal Workspace</h2>
        <p className="text-brand-muted max-w-md">
          You are working in your private local space. Create or join a group to collaborate with other members.
        </p>
      </div>
    );
  }

  const isCurrentUserAdmin = group.adminId === currentUser?.id;
  const currentUserRole = members.find(m => m.id === currentUser?.id)?.role;
  const canAddMembers = currentUserRole === UserRole.PRINCIPAL || currentUserRole === UserRole.SUPERVISOR;

  return (
    <div className="animate-fade-in space-y-6">
       <div className="glass-panel p-8">
         <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
           <div>
             <h2 className="text-2xl font-bold text-white flex items-center gap-3">
               <span className="w-1.5 h-8 bg-brand-lime rounded-full"></span>
               Group Members
             </h2>
             <p className="text-brand-muted mt-2 ml-5">
               People with access to <span className="text-white font-medium">{group.name}</span>
             </p>
           </div>
           
           <div className="flex flex-wrap items-center gap-3 self-end md:self-auto">
             <div className="bg-[#18181b] px-4 py-2 rounded-full border border-[#27272a] text-xs font-mono text-brand-lime">
               ID: {group.id}
             </div>
             
             {canAddMembers && (
                <button 
                  onClick={() => setShowAddMember(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-lime text-black font-bold rounded-full text-xs hover:bg-brand-limeDark transition-all shadow-glow"
                >
                  <UserPlus size={14} /> Add Member
                </button>
             )}

             {currentUser && (
               <button 
                 onClick={handleLeaveGroup}
                 className="flex items-center gap-2 px-4 py-2 bg-red-900/10 hover:bg-red-900/30 text-red-400 border border-red-900/30 rounded-full text-xs font-bold transition-all"
               >
                 <LogOut size={14} /> Leave Group
               </button>
             )}
           </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {members.map(member => (
             <div key={member.id} className="bg-[#18181b] border border-[#27272a] p-5 rounded-2xl hover:border-brand-lime/30 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#050505] border border-[#27272a] flex items-center justify-center font-bold text-lg text-white overflow-hidden">
                    {member.photoURL ? (
                      <img src={member.photoURL} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      member.name.charAt(0)
                    )}
                  </div>
                  
                  {/* Role Badge or Selector */}
                  {isCurrentUserAdmin && member.id !== currentUser?.id ? (
                     <div className="relative">
                        <select 
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as UserRole)}
                          className="appearance-none bg-[#27272a] border border-[#3f3f46] text-xs font-bold px-3 py-1.5 rounded-lg text-white outline-none focus:border-brand-lime pr-6 cursor-pointer"
                        >
                          <option value={UserRole.TEACHER}>Teacher</option>
                          <option value={UserRole.SUPERVISOR}>Supervisor</option>
                          <option value={UserRole.PRINCIPAL}>Principal</option>
                        </select>
                        <Shield size={10} className="absolute right-2 top-2 text-brand-muted pointer-events-none" />
                     </div>
                  ) : (
                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${
                        member.role === UserRole.PRINCIPAL ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' :
                        member.role === UserRole.SUPERVISOR ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                        'bg-[#27272a] border-[#3f3f46] text-brand-muted'
                    }`}>
                        {member.role}
                    </span>
                  )}
                </div>
                
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  {member.name}
                  {currentUser?.id === member.id && <span className="text-[10px] bg-brand-lime text-black px-1.5 rounded font-bold">YOU</span>}
                </h3>
                
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-brand-muted break-all">
                    <Mail size={14} className="shrink-0" /> {member.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-brand-muted">
                    <Calendar size={14} /> Joined {new Date(member.joinedAt).toLocaleDateString()}
                  </div>
                </div>
             </div>
           ))}
         </div>
       </div>

       {/* Add Member Modal */}
       {showAddMember && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
           <div className="glass-panel w-full max-w-sm p-6 animate-fade-in relative">
              <button onClick={() => setShowAddMember(false)} className="absolute top-4 right-4 text-brand-muted hover:text-white"><X size={24} /></button>
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                 <UserPlus size={20} className="text-brand-lime" /> Add Member
              </h3>
              
              <p className="text-sm text-brand-muted mb-4">
                 Add a registered user to this group. They will gain immediate access.
              </p>

              <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-brand-muted mb-1 uppercase">User Email</label>
                    <input 
                      type="email" 
                      value={addEmail} 
                      onChange={(e) => setAddEmail(e.target.value)}
                      placeholder="teacher@school.edu"
                      className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-white focus:border-brand-lime outline-none"
                    />
                 </div>
              </div>

              <div className="flex gap-3 mt-8">
                 <button onClick={() => setShowAddMember(false)} className="flex-1 py-3 bg-[#18181b] text-white rounded-xl border border-[#27272a] hover:bg-[#27272a]">
                   Cancel
                 </button>
                 <button 
                   onClick={handleAddMember} 
                   disabled={isAdding}
                   className="flex-1 py-3 bg-brand-lime text-black font-bold rounded-xl hover:bg-brand-limeDark shadow-glow flex items-center justify-center gap-2"
                 >
                   {isAdding ? <Loader2 className="animate-spin" size={16} /> : <><UserPlus size={16} /> Add User</>}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default MembersPanel;