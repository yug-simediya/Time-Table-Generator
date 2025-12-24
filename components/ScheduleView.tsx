
import React, { useState, useEffect } from 'react';
import { AppState, FullSchedule, DayOfWeek } from '../types';
import { Download, Calendar, RefreshCcw, Sparkles, Clock, Trash2, Edit2, Check, Copy, X, Save, ChevronRight } from 'lucide-react';
import { generateSchedule } from '../services/generatorService';
import { exportToPDF, exportToExcel } from '../services/exportService';

interface Props {
  state: AppState;
  onChange: (updates: Partial<AppState>) => void;
}

const ScheduleView: React.FC<Props> = ({ state, onChange }) => {
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  // Editing state
  const [editingCell, setEditingCell] = useState<{stdId: string, day: DayOfWeek, slotIndex: number} | null>(null);
  const [editSubjectId, setEditSubjectId] = useState('');
  const [editFacultyId, setEditFacultyId] = useState('');

  // Mobile View State
  const activeDays = state.dayConfigs.filter(d => d.isActive);
  const [mobileDay, setMobileDay] = useState<DayOfWeek>(activeDays[0]?.day || DayOfWeek.MONDAY);

  // Update mobile day if configuration changes
  useEffect(() => {
    if (activeDays.length > 0 && !activeDays.find(d => d.day === mobileDay)) {
      setMobileDay(activeDays[0].day);
    }
  }, [state.dayConfigs]);

  const handleGenerate = () => {
    // Basic validation
    if (state.subjects.length === 0) {
      alert("Please add subjects first!");
      return;
    }
    
    const newSchedule = generateSchedule(state);
    const versionNumber = (state.savedSchedules?.length || 0) + 1;
    newSchedule.name = `Version ${versionNumber}`;

    // Add to saved schedules list
    const updatedHistory = [newSchedule, ...(state.savedSchedules || [])];

    onChange({ 
      generatedSchedule: newSchedule,
      savedSchedules: updatedHistory
    });
  };

  const handleSelectVersion = (schedule: FullSchedule) => {
    onChange({ generatedSchedule: schedule });
  };

  const handleDeleteVersion = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updatedHistory = state.savedSchedules.filter(s => s.id !== id);
    
    // If we deleted the currently active one
    let newActive = state.generatedSchedule;
    if (state.generatedSchedule?.id === id) {
      newActive = updatedHistory.length > 0 ? updatedHistory[0] : null;
    }

    onChange({
      savedSchedules: updatedHistory,
      generatedSchedule: newActive
    });
  };

  const startRename = (e: React.MouseEvent, schedule: FullSchedule) => {
    e.stopPropagation();
    setIsRenaming(schedule.id);
    setRenameValue(schedule.name);
  };

  const saveRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isRenaming) return;

    const updatedHistory = state.savedSchedules.map(s => 
      s.id === isRenaming ? { ...s, name: renameValue } : s
    );
    
    // Update active if it was the one renamed
    let updatedActive = state.generatedSchedule;
    if (updatedActive?.id === isRenaming) {
        updatedActive = { ...updatedActive, name: renameValue };
    }

    onChange({
      savedSchedules: updatedHistory,
      generatedSchedule: updatedActive
    });

    setIsRenaming(null);
  };

  const handleCellClick = (stdId: string, day: DayOfWeek, slotIndex: number, currentSubjectId?: string, currentFacultyId?: string) => {
    if (!state.generatedSchedule) return;
    setEditingCell({ stdId, day, slotIndex });
    setEditSubjectId(currentSubjectId || '');
    setEditFacultyId(currentFacultyId || '');
  };

  const saveCellEdit = () => {
    if (!editingCell || !state.generatedSchedule) return;

    const newSchedule = { ...state.generatedSchedule };
    const stdScheduleIndex = newSchedule.schedules.findIndex(s => s.standardId === editingCell.stdId);
    
    if (stdScheduleIndex === -1) return;

    const stdSched = newSchedule.schedules[stdScheduleIndex];
    if (!stdSched.days[editingCell.day]) {
      stdSched.days[editingCell.day] = {};
    }

    // If both empty, clear the cell (free slot)
    if (!editSubjectId && !editFacultyId) {
       stdSched.days[editingCell.day]![editingCell.slotIndex] = null;
    } else {
       // Update cell
       stdSched.days[editingCell.day]![editingCell.slotIndex] = {
         subjectId: editSubjectId,
         facultyId: editFacultyId
       };
    }

    onChange({ generatedSchedule: newSchedule });
    setEditingCell(null);
  };

  if (!state.generatedSchedule && (!state.savedSchedules || state.savedSchedules.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] glass-panel rounded-3xl text-center p-12 hover-interactive">
        <div className="w-20 h-20 bg-[#18181b] rounded-full flex items-center justify-center mb-6 shadow-glow border border-[#3f3f46] animate-pulse">
          <Calendar size={40} className="text-brand-lime" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">Ready to Generate?</h2>
        <p className="text-brand-muted mb-8 max-w-md text-lg">
          AI-powered scheduling ready to deploy.
        </p>
        <button 
          onClick={handleGenerate}
          className="bg-brand-lime text-black font-bold py-4 px-10 rounded-full shadow-glow transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 text-lg"
        >
          <Sparkles size={20} /> Generate Schedule
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      
      {/* Top Control Bar */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
           <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="w-1.5 h-8 bg-brand-lime rounded-full"></span>
            Schedule Overview
          </h2>
          {state.generatedSchedule && (
            <p className="text-brand-muted mt-1 ml-5">
              Viewing: <span className="text-white font-medium">{state.generatedSchedule.name}</span>
            </p>
          )}
        </div>
        
        <div className="flex flex-wrap gap-3">
           <button 
            onClick={handleGenerate}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-lime hover:bg-brand-limeDark text-black font-bold rounded-full shadow-glow transition-colors hover:scale-105"
          >
            <RefreshCcw size={16} /> Generate New
          </button>
          <button 
            onClick={() => exportToPDF(state)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#18181b] hover:bg-[#27272a] text-white rounded-full border border-[#27272a] transition-colors hover:border-white"
          >
            <Download size={16} /> PDF
          </button>
          <button 
            onClick={() => exportToExcel(state)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#18181b] hover:bg-[#27272a] text-white rounded-full border border-[#27272a] transition-colors hover:border-white"
          >
            <Download size={16} /> Excel
          </button>
        </div>
      </div>

      {/* Version History / Saved Schedules */}
      <div className="glass-panel p-6">
        <h3 className="text-sm font-bold text-brand-muted uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock size={14} /> Version History
        </h3>
        
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
          {state.savedSchedules?.map(sched => {
            const isActive = state.generatedSchedule?.id === sched.id;
            return (
              <div 
                key={sched.id}
                onClick={() => handleSelectVersion(sched)}
                className={`min-w-[200px] p-4 rounded-xl border cursor-pointer hover-interactive relative group flex flex-col justify-between h-28 ${
                  isActive 
                    ? 'bg-[#18181b] border-brand-lime shadow-[0_0_15px_rgba(204,255,0,0.1)]' 
                    : 'bg-[#0a0a0a] border-[#27272a] hover:border-[#3f3f46]'
                }`}
              >
                <div>
                  {isRenaming === sched.id ? (
                    <div className="flex items-center gap-2 mb-1">
                      <input 
                        type="text" 
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#050505] text-white text-sm border border-[#3f3f46] rounded px-1 w-full outline-none focus:border-brand-lime"
                        autoFocus
                      />
                      <button onClick={saveRename} className="text-brand-lime hover:text-white p-1">
                        <Check size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <h4 className={`font-bold text-sm truncate pr-6 ${isActive ? 'text-white' : 'text-brand-muted group-hover:text-white'}`}>
                        {sched.name}
                      </h4>
                      <button 
                        onClick={(e) => startRename(e, sched)} 
                        className="text-[#3f3f46] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4"
                      >
                        <Edit2 size={12} />
                      </button>
                    </div>
                  )}
                  <p className="text-[10px] text-[#52525b] mt-1">
                    {new Date(sched.createdAt).toLocaleString(undefined, {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>

                <div className="flex justify-between items-end mt-2">
                   {isActive && <span className="text-[10px] bg-brand-lime/10 text-brand-lime px-2 py-0.5 rounded border border-brand-lime/20 font-bold">ACTIVE</span>}
                   {!isActive && <span></span>} {/* Spacer */}
                   
                   <button 
                     onClick={(e) => handleDeleteVersion(e, sched.id)}
                     className="text-[#3f3f46] hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                   >
                     <Trash2 size={14} />
                   </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actual Schedule Display */}
      {state.generatedSchedule && (
        <div className="space-y-8">
          
          {/* Mobile Day Selector Sticky Header */}
          <div className="lg:hidden sticky top-20 z-30 bg-[#050505]/95 backdrop-blur-md py-3 -mx-4 px-4 border-b border-[#27272a] flex items-center gap-2 overflow-x-auto scrollbar-hide">
             {activeDays.map(d => (
               <button
                 key={d.day}
                 onClick={() => setMobileDay(d.day)}
                 className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                   mobileDay === d.day
                     ? 'bg-brand-lime text-black border-brand-lime shadow-glow'
                     : 'bg-[#18181b] text-brand-muted border-[#27272a]'
                 }`}
               >
                 {d.day}
               </button>
             ))}
          </div>

          {state.generatedSchedule.schedules.map(stdSched => {
            const standard = state.standards.find(s => s.id === stdSched.standardId);
            if (!standard) return null;

            return (
              <div key={stdSched.standardId} className="glass-panel p-6 rounded-3xl">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                   {standard.name}
                   <span className="text-sm font-medium text-brand-lime bg-brand-lime/10 px-3 py-1 rounded-full border border-brand-lime/20">{standard.medium} Medium</span>
                </h3>
                
                {/* --- MOBILE VIEW (< lg) --- */}
                <div className="lg:hidden">
                    <div className="space-y-3">
                      {state.globalSlots.map((slot, idx) => {
                         const cell = stdSched.days[mobileDay]?.[slot.index];
                         const subject = cell ? state.subjects.find(s => s.id === cell.subjectId) : null;
                         const faculty = cell ? state.faculties.find(f => f.id === cell.facultyId) : null;
                         
                         const isRecess = slot.isRecess;
                         const isEmpty = !cell && !isRecess;
                         
                         // Card Style
                         const borderColor = subject?.color ? subject.color : (isRecess ? '#27272a' : '#27272a');
                         const bgColor = subject?.color ? `${subject.color}10` : (isRecess ? '#1f1f22' : '#0a0a0a');

                         return (
                           <div 
                             key={slot.id}
                             onClick={() => !isRecess && handleCellClick(stdSched.standardId, mobileDay, slot.index, cell?.subjectId, cell?.facultyId)}
                             className="flex rounded-xl overflow-hidden border transition-all"
                             style={{ 
                                borderColor: isRecess ? '#27272a' : '#3f3f46',
                                backgroundColor: isRecess ? '#18181b' : '#0a0a0a'
                              }}
                           >
                             {/* Time Column */}
                             <div className="w-20 bg-[#18181b] border-r border-[#27272a] p-3 flex flex-col justify-center items-center text-center">
                               <span className="text-xs text-brand-muted font-mono">{slot.startTime}</span>
                               <div className="h-4 w-px bg-[#27272a] my-1"></div>
                               <span className="text-xs text-brand-muted font-mono">{slot.endTime}</span>
                             </div>

                             {/* Content */}
                             <div 
                               className="flex-1 p-3 flex flex-col justify-center relative group"
                               style={{ backgroundColor: bgColor }}
                             >
                                {isRecess ? (
                                   <div className="text-brand-lime font-bold text-sm tracking-widest uppercase flex items-center gap-2">
                                     <span className="w-1.5 h-1.5 rounded-full bg-brand-lime"></span>
                                     {slot.name || 'RECESS'}
                                   </div>
                                ) : isEmpty ? (
                                   <span className="text-brand-muted/40 text-sm italic">Free Slot</span>
                                ) : (
                                   <>
                                     <div className="font-bold text-white text-base" style={{ color: subject?.color }}>{subject?.name}</div>
                                     <div className="text-xs text-brand-muted flex items-center gap-1 mt-1">
                                       <span className="w-4 h-4 rounded-full bg-[#18181b] flex items-center justify-center text-[8px] border border-[#27272a]">
                                         {faculty?.name.charAt(0)}
                                       </span>
                                       {faculty?.name || 'TBA'}
                                     </div>
                                   </>
                                )}
                                
                                {!isRecess && (
                                   <div className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted opacity-0 group-hover:opacity-100 lg:opacity-0">
                                      <Edit2 size={14} />
                                   </div>
                                )}
                             </div>
                             
                             {/* Color Strip */}
                             {!isRecess && subject?.color && (
                                <div className="w-1.5" style={{ backgroundColor: subject.color }}></div>
                             )}
                           </div>
                         );
                      })}
                    </div>
                </div>

                {/* --- DESKTOP VIEW (>= lg) --- */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full min-w-[800px] border-collapse">
                    <thead>
                      <tr>
                        <th className="p-4 text-left bg-[#18181b] text-brand-muted rounded-tl-xl text-xs uppercase tracking-wider font-bold">Time Slot</th>
                        {activeDays.map(d => (
                          <th key={d.day} className="p-4 text-left bg-[#18181b] text-white font-semibold">{d.day}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {state.globalSlots.map((slot, idx) => (
                        <tr key={slot.id} className="border-b border-[#1f1f22] last:border-0 hover:bg-[#18181b]/50 transition-colors">
                          <td className="p-4 text-brand-muted font-mono text-sm whitespace-nowrap border-r border-[#1f1f22]">
                            {slot.startTime} - {slot.endTime}
                            {slot.isRecess && <div className="text-[10px] text-brand-lime font-bold uppercase mt-1 tracking-widest">{slot.name || 'BREAK'}</div>}
                          </td>
                          
                          {slot.isRecess ? (
                            <td colSpan={activeDays.length} className="p-4 text-center bg-[#1f1f22] text-brand-lime/70 font-bold tracking-[0.2em] text-sm">
                              RECESS
                            </td>
                          ) : (
                            activeDays.map(d => {
                              const cell = stdSched.days[d.day]?.[slot.index];
                              const subject = cell ? state.subjects.find(s => s.id === cell.subjectId) : null;
                              const faculty = cell ? state.faculties.find(f => f.id === cell.facultyId) : null;

                              // Apply Subject Color Style
                              const cellStyle = subject?.color ? {
                                backgroundColor: `${subject.color}1A`, // 1A is ~10% opacity
                                borderLeft: `3px solid ${subject.color}`
                              } : {};

                              return (
                                <td 
                                  key={d.day} 
                                  className="p-4 relative cursor-pointer hover:bg-white/5 transition-colors group"
                                  style={cellStyle}
                                  onClick={() => handleCellClick(stdSched.standardId, d.day, slot.index, cell?.subjectId, cell?.facultyId)}
                                >
                                  {cell ? (
                                    <div>
                                      <div className="font-bold text-white text-base">{subject?.name}</div>
                                      <div className="text-xs text-brand-muted mt-1">{faculty?.name || 'TBA'}</div>
                                    </div>
                                  ) : (
                                    <span className="text-[#3f3f46] text-xl font-light">·</span>
                                  )}
                                  {/* Edit Hint */}
                                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-brand-muted">
                                     <Edit2 size={12} />
                                  </div>
                                </td>
                              );
                            })
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Cell Modal */}
      {editingCell && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
           <div className="glass-panel w-full max-w-sm p-6 animate-fade-in relative">
              <button onClick={() => setEditingCell(null)} className="absolute top-4 right-4 text-brand-muted hover:text-white"><X size={24} /></button>
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                 <Edit2 size={20} className="text-brand-lime" /> Edit Slot
              </h3>
              
              <div className="text-xs text-brand-muted mb-4 p-2 bg-[#18181b] rounded border border-[#27272a] flex justify-between">
                 <span>{editingCell.day}</span>
                 <span className="text-white font-mono">Slot {editingCell.slotIndex + 1}</span>
              </div>

              <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-brand-muted mb-1 uppercase">Subject</label>
                    <select 
                      value={editSubjectId} 
                      onChange={(e) => setEditSubjectId(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-white focus:border-brand-lime outline-none"
                    >
                      <option value="">-- Free Slot --</option>
                      {state.subjects.filter(s => s.standardId === editingCell.stdId).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                 </div>
                 
                 <div>
                    <label className="block text-xs font-bold text-brand-muted mb-1 uppercase">Teacher</label>
                    <select 
                      value={editFacultyId} 
                      onChange={(e) => setEditFacultyId(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-white focus:border-brand-lime outline-none"
                    >
                      <option value="">-- None --</option>
                      {state.faculties.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                 </div>
              </div>

              <div className="flex gap-3 mt-8">
                 <button onClick={() => setEditingCell(null)} className="flex-1 py-3 bg-[#18181b] text-white rounded-xl border border-[#27272a] hover:bg-[#27272a]">
                   Cancel
                 </button>
                 <button onClick={saveCellEdit} className="flex-1 py-3 bg-brand-lime text-black font-bold rounded-xl hover:bg-brand-limeDark shadow-glow flex items-center justify-center gap-2">
                   <Save size={16} /> Save
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default ScheduleView;
