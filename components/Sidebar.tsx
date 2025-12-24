
import React from 'react';
import { Clock, Users, Calendar, Settings, Box, LogOut, BookOpen, GraduationCap, CalendarCheck } from 'lucide-react';
import { SchoolGroup, UserRole } from '../types';

interface Props {
  currentStep: number;
  setStep: (step: number) => void;
  group: SchoolGroup | null;
  role?: UserRole;
  onExit: () => void;
}

const Sidebar: React.FC<Props> = ({ currentStep, setStep, group, role, onExit }) => {
  const menu = [
    { icon: Settings, label: 'Configuration', step: 0 },
    { icon: Clock, label: 'Timings', step: 1 },
    { icon: BookOpen, label: 'Subjects', step: 2 },
    { icon: GraduationCap, label: 'Teachers', step: 3 },
    { icon: Calendar, label: 'Schedule', step: 4 },
    { icon: Users, label: 'Members', step: 5 },
  ];

  return (
    <aside className="w-20 md:w-64 bg-[#050505] border-r border-[#1f1f22] h-screen fixed left-0 top-0 z-50 flex flex-col pt-8">
      {/* Logo Area */}
      <div className="px-6 mb-10 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-brand-lime/10 border border-brand-lime flex items-center justify-center">
             <CalendarCheck size={18} className="text-brand-lime" />
        </div>
        <span className="text-xl font-bold text-white hidden md:block tracking-wide">
          Easy<span className="text-brand-lime">Sched</span>
        </span>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        <div className="px-2 mb-2 text-xs font-semibold text-brand-muted uppercase tracking-wider hidden md:block">
          Menu
        </div>
        {menu.map((item) => {
          const isActive = currentStep === item.step;
          return (
            <button
              key={item.label}
              onClick={() => setStep(item.step)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-300 group ${
                isActive 
                  ? 'bg-brand-lime text-black font-bold shadow-glow' 
                  : 'text-brand-muted hover:text-white hover:bg-[#1f1f22]'
              }`}
            >
              <item.icon size={20} className={isActive ? 'text-black' : 'text-current'} />
              <span className="hidden md:block">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Group Info or Plan Info */}
      <div className="p-6 hidden md:block">
        <div className="bg-[#121212] rounded-2xl p-4 border border-[#27272a]">
          {group ? (
            <div>
               <div className="flex justify-between items-start">
                 <p className="text-xs text-brand-muted uppercase">Current Group</p>
                 <span className={`text-[10px] px-1.5 py-0.5 rounded ${role === UserRole.TEACHER ? 'bg-gray-800' : 'bg-purple-900 text-purple-200'}`}>{role}</span>
               </div>
               <p className="text-sm font-bold text-white mt-1 truncate">{group.name}</p>
               <div className="mt-2 p-2 bg-[#050505] rounded border border-[#27272a] text-center">
                  <p className="text-[10px] text-brand-muted">GROUP ID</p>
                  <p className="text-brand-lime font-mono tracking-widest font-bold text-lg select-all">{group.id}</p>
               </div>
               <button onClick={onExit} className="mt-3 flex items-center gap-2 text-xs text-red-400 hover:text-red-300 w-full justify-center">
                 <LogOut size={12} /> Exit to Dashboard
               </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-surfaceHighlight flex items-center justify-center text-brand-lime">
                <Box size={16} />
              </div>
              <div>
                <p className="text-xs text-brand-muted">Mode</p>
                <p className="text-sm font-semibold text-white">Personal</p>
                <button onClick={onExit} className="text-[10px] text-brand-muted underline hover:text-white">Switch Mode</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
