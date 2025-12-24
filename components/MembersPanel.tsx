
import React, { useEffect, useState } from 'react';
import { SchoolGroup, User, UserRole } from '../types';
import { getGroupMembersDetails } from '../services/dataService';
import { User as UserIcon, Calendar, Mail } from 'lucide-react';

interface Props {
  group: SchoolGroup | null;
  currentUser: User | null;
}

const MembersPanel: React.FC<Props> = ({ group, currentUser }) => {
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (group) {
      const details = getGroupMembersDetails(group.id);
      setMembers(details);
    }
  }, [group]);

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

  return (
    <div className="animate-fade-in space-y-6">
       <div className="glass-panel p-8">
         <div className="flex items-center justify-between mb-8">
           <div>
             <h2 className="text-2xl font-bold text-white flex items-center gap-3">
               <span className="w-1.5 h-8 bg-brand-lime rounded-full"></span>
               Group Members
             </h2>
             <p className="text-brand-muted mt-2 ml-5">
               People with access to <span className="text-white font-medium">{group.name}</span>
             </p>
           </div>
           <div className="bg-[#18181b] px-4 py-2 rounded-full border border-[#27272a] text-xs font-mono text-brand-lime">
             ID: {group.id}
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
                  <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${
                    member.role === UserRole.PRINCIPAL ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' :
                    member.role === UserRole.SUPERVISOR ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                    'bg-[#27272a] border-[#3f3f46] text-brand-muted'
                  }`}>
                    {member.role}
                  </span>
                </div>
                
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  {member.name}
                  {currentUser?.id === member.id && <span className="text-[10px] bg-brand-lime text-black px-1.5 rounded font-bold">YOU</span>}
                </h3>
                
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-brand-muted">
                    <Mail size={14} /> {member.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-brand-muted">
                    <Calendar size={14} /> Joined {new Date(member.joinedAt).toLocaleDateString()}
                  </div>
                </div>
             </div>
           ))}
         </div>
       </div>
    </div>
  );
};

export default MembersPanel;
