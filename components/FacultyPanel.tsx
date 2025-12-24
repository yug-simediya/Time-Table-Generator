import React, { useState } from 'react';
import { AppState, Faculty, DayOfWeek } from '../types';
import { User, Plus, Trash2, Check, X, GraduationCap, Clock, CheckSquare } from 'lucide-react';

interface Props {
  state: AppState;
  onChange: (updates: Partial<AppState>) => void;
}

const FacultyPanel: React.FC<Props> = ({ state, onChange }) => {
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const [newFacultyName, setNewFacultyName] = useState('');

  // Derived state
  const selectedFaculty = state.faculties.find(f => f.id === selectedFacultyId);

  const addFaculty = () => {
    if (!newFacultyName) return;
    const newFac: Faculty = {
      id: crypto.randomUUID(),
      name: newFacultyName,
      subjectIds: [],
      standardIds: [],
      unavailableSlots: []
    };
    onChange({ faculties: [...state.faculties, newFac] });
    setNewFacultyName('');
    setSelectedFacultyId(newFac.id);
  };

  const removeFaculty = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onChange({ faculties: state.faculties.filter(f => f.id !== id) });
    if (selectedFacultyId === id) setSelectedFacultyId(null);
  };

  const updateFaculty = (id: string, updates: Partial<Faculty>) => {
    onChange({
      faculties: state.faculties.map(f => f.id === id ? { ...f, ...updates } : f)
    });
  };

  const toggleSubject = (subjectId: string) => {
    if (!selectedFaculty) return;
    const currentSubjects = selectedFaculty.subjectIds;
    const newSubjects = currentSubjects.includes(subjectId)
      ? currentSubjects.filter(id => id !== subjectId)
      : [...currentSubjects, subjectId];
    
    updateFacultySubjects(selectedFaculty.id, newSubjects);
  };

  const toggleStandardGroup = (stdId: string, select: boolean) => {
    if (!selectedFaculty) return;
    const stdSubjects = state.subjects.filter(s => s.standardId === stdId).map(s => s.id);
    let newSubjects = [...selectedFaculty.subjectIds];

    if (select) {
        // Add all that aren't there
        stdSubjects.forEach(id => {
            if (!newSubjects.includes(id)) newSubjects.push(id);
        });
    } else {
        // Remove all
        newSubjects = newSubjects.filter(id => !stdSubjects.includes(id));
    }
    
    updateFacultySubjects(selectedFaculty.id, newSubjects);
  };

  const updateFacultySubjects = (facultyId: string, newSubjects: string[]) => {
    // Auto-update standards based on selected subjects
    const newStandards = Array.from(new Set(
      state.subjects
        .filter(s => newSubjects.includes(s.id))
        .map(s => s.standardId)
    )) as string[];

    updateFaculty(facultyId, { 
      subjectIds: newSubjects,
      standardIds: newStandards
    });
  }

  const toggleAvailability = (day: DayOfWeek, slotIndex: number) => {
    if (!selectedFaculty) return;
    const isUnavailable = selectedFaculty.unavailableSlots.some(s => s.day === day && s.slotIndex === slotIndex);
    
    let newUnavailable;
    if (isUnavailable) {
      newUnavailable = selectedFaculty.unavailableSlots.filter(s => !(s.day === day && s.slotIndex === slotIndex));
    } else {
      newUnavailable = [...selectedFaculty.unavailableSlots, { day, slotIndex }];
    }

    updateFaculty(selectedFaculty.id, { unavailableSlots: newUnavailable });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fade-in h-[calc(100vh-140px)]">
      {/* LEFT COLUMN: List */}
      <div className="w-full lg:w-1/3 flex flex-col gap-4">
        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-brand-lime rounded-full"></span>
            Teachers List
          </h2>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              value={newFacultyName}
              onChange={(e) => setNewFacultyName(e.target.value)}
              placeholder="New Teacher Name"
              className="flex-1 bg-[#050505] border border-[#3f3f46] rounded-xl px-4 py-2 text-white focus:border-brand-lime outline-none"
              onKeyDown={(e) => e.key === 'Enter' && addFaculty()}
            />
            <button 
              onClick={addFaculty}
              disabled={!newFacultyName}
              className="bg-brand-lime hover:bg-brand-limeDark disabled:opacity-50 text-black p-3 rounded-xl font-bold shadow-glow transition-all"
            >
              <Plus size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[60vh]">
            {state.faculties.map(fac => (
              <div 
                key={fac.id}
                onClick={() => setSelectedFacultyId(fac.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
                  selectedFacultyId === fac.id
                  ? 'bg-[#18181b] border-brand-lime shadow-[0_0_15px_rgba(204,255,0,0.1)]'
                  : 'bg-[#0a0a0a] border-[#27272a] hover:border-[#3f3f46]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border ${
                    selectedFacultyId === fac.id ? 'bg-brand-lime text-black border-brand-lime' : 'bg-[#18181b] text-brand-muted border-[#3f3f46]'
                  }`}>
                    {fac.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className={`font-bold ${selectedFacultyId === fac.id ? 'text-white' : 'text-brand-text'}`}>{fac.name}</h3>
                    <p className="text-[10px] text-brand-muted">{fac.subjectIds.length} Subjects</p>
                  </div>
                </div>
                <button 
                  onClick={(e) => removeFaculty(e, fac.id)}
                  className="text-[#3f3f46] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {state.faculties.length === 0 && (
              <div className="text-center py-10 text-brand-muted text-sm">
                No teachers added yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Details */}
      <div className="w-full lg:w-2/3">
        {selectedFaculty ? (
          <div className="glass-panel p-8 h-full overflow-y-auto">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-full bg-[#18181b] border-2 border-brand-lime flex items-center justify-center">
                <GraduationCap size={32} className="text-brand-lime" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">{selectedFaculty.name}</h2>
                <p className="text-brand-muted">Configure subjects and timing availability.</p>
              </div>
            </div>

            {/* Subjects Selection */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-brand-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                <User size={16} /> Assign Subjects
              </h3>
              
              <div className="space-y-4 pr-1">
                {state.subjects.length === 0 && <span className="text-brand-muted italic">No subjects available. Add subjects in the previous step.</span>}
                
                {state.standards.map(std => {
                   const stdSubjects = state.subjects.filter(s => s.standardId === std.id);
                   if (stdSubjects.length === 0) return null;
                   
                   const allSelected = stdSubjects.every(s => selectedFaculty.subjectIds.includes(s.id));

                   return (
                     <div key={std.id} className="bg-[#121212] border border-[#27272a] rounded-xl overflow-hidden">
                       <div className="flex items-center justify-between px-4 py-2 bg-[#18181b] border-b border-[#27272a]">
                          <span className="font-bold text-white text-sm">{std.name}</span>
                          <button 
                            onClick={() => toggleStandardGroup(std.id, !allSelected)}
                            className="flex items-center gap-1 text-[10px] text-brand-lime hover:underline font-bold uppercase tracking-wider"
                          >
                            <CheckSquare size={12} /> {allSelected ? 'Unselect All' : 'Select All'}
                          </button>
                       </div>
                       <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                         {stdSubjects.map(sub => {
                            const isSelected = selectedFaculty.subjectIds.includes(sub.id);
                            return (
                              <div 
                                key={sub.id}
                                onClick={() => toggleSubject(sub.id)}
                                className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${
                                  isSelected 
                                  ? 'bg-brand-lime/10 border-brand-lime' 
                                  : 'bg-[#0a0a0a] border-[#27272a] hover:border-[#3f3f46]'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                  isSelected ? 'bg-brand-lime border-brand-lime' : 'border-[#52525b]'
                                }`}>
                                   {isSelected && <Check size={10} className="text-black" />}
                                </div>
                                <div className="min-w-0">
                                  <p className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-brand-muted'}`}>{sub.name}</p>
                                </div>
                              </div>
                            )
                         })}
                       </div>
                     </div>
                   );
                })}
              </div>
            </div>

            {/* Timing Grid */}
            <div>
              <h3 className="text-sm font-bold text-brand-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock size={16} /> School Availability
              </h3>
              <p className="text-xs text-brand-muted mb-4">Click on slots to mark them as <span className="text-red-400 font-bold">Unavailable</span> (Busy).</p>
              
              <div className="overflow-x-auto pb-2">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="p-2 bg-[#18181b] text-brand-muted border border-[#27272a] rounded-tl-lg">Slot</th>
                      {state.dayConfigs.filter(d => d.isActive).map(d => (
                        <th key={d.day} className="p-2 bg-[#18181b] text-white border border-[#27272a] min-w-[80px]">{d.day.slice(0,3)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.globalSlots.map(slot => (
                      <tr key={slot.id}>
                        <td className="p-2 bg-[#121212] text-brand-muted border border-[#27272a] font-mono whitespace-nowrap">
                          {slot.startTime} - {slot.endTime}
                          {slot.isRecess && <span className="block text-[8px] text-brand-lime uppercase">Recess</span>}
                        </td>
                        {state.dayConfigs.filter(d => d.isActive).map(d => {
                           const isUnavailable = selectedFaculty.unavailableSlots.some(us => us.day === d.day && us.slotIndex === slot.index);
                           const isRecess = slot.isRecess;
                           
                           return (
                             <td 
                              key={`${d.day}-${slot.id}`} 
                              onClick={() => !isRecess && toggleAvailability(d.day, slot.index)}
                              className={`border border-[#27272a] text-center cursor-pointer transition-all ${
                                isRecess ? 'bg-[#18181b]/50 cursor-default' : 
                                isUnavailable 
                                  ? 'bg-red-900/20 hover:bg-red-900/30' 
                                  : 'bg-green-900/10 hover:bg-green-900/20'
                              }`}
                             >
                               {!isRecess && (
                                 <div className="flex flex-col items-center justify-center py-2">
                                   {isUnavailable ? (
                                      <X size={14} className="text-red-500 mb-1" />
                                   ) : (
                                      <Check size={14} className="text-green-500/50 mb-1" />
                                   )}
                                   <span className={isUnavailable ? 'text-red-400 font-bold' : 'text-green-600/50'}>
                                     {isUnavailable ? 'BUSY' : 'FREE'}
                                   </span>
                                 </div>
                               )}
                             </td>
                           );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ) : (
          <div className="glass-panel h-full flex flex-col items-center justify-center text-center p-12">
            <div className="w-20 h-20 bg-[#18181b] rounded-full flex items-center justify-center mb-6 border border-[#27272a]">
              <User size={40} className="text-brand-muted" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Select a Teacher</h3>
            <p className="text-brand-muted">Select or create a teacher profile from the left list to configure their subjects and availability.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyPanel;