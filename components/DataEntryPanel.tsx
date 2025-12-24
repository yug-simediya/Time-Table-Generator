import React, { useState, useEffect } from 'react';
import { AppState, Subject } from '../types';
import { BookOpen, Plus, Trash2, Layers, Edit2, X, Save, Palette, Check } from 'lucide-react';

interface Props {
  state: AppState;
  onChange: (updates: Partial<AppState>) => void;
}

// Helper: HSL to Hex
function hslToHex(h: number, s: number, l: number) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// --- Custom Color Picker Component ---
// Defined OUTSIDE the main component to preserve state and focus during re-renders
const ColorWheelPicker = ({ 
  color, 
  onChange 
}: { 
  color: string, 
  onChange: (c: string) => void 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hue, setHue] = useState(180); // Default middle

  // Presets suited for Dark Neon Theme
  const presets = [
    '#ccff00', // Brand Lime
    '#ef4444', // Red
    '#f97316', // Orange
    '#facc15', // Yellow
    '#22c55e', // Green
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#8b5cf6', // Violet
    '#d946ef', // Fuchsia
    '#f43f5e', // Rose
    '#ffffff', // White
    '#94a3b8', // Slate
  ];

  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const h = parseInt(e.target.value);
    setHue(h);
    onChange(hslToHex(h, 100, 50));
  };

  return (
    <div className="relative">
      {/* Backdrop for closing */}
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>}

      <div className="flex items-center gap-3 bg-[#0a0a0a] border border-[#27272a] rounded-xl px-3 py-2">
         {/* Trigger Wheel */}
         <button 
           type="button"
           onClick={() => setIsOpen(!isOpen)}
           className="relative w-8 h-8 rounded-full shadow-sm overflow-hidden border border-white/20 hover:scale-105 transition-transform cursor-pointer group focus:outline-none focus:ring-2 focus:ring-brand-lime"
           title="Open Color Picker"
         >
            <div 
              className="absolute inset-0" 
              style={{ 
                background: 'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' 
              }} 
            />
         </button>
         
         {/* Preview */}
         <div className="flex flex-col">
            <span className="text-[10px] text-brand-muted uppercase font-bold tracking-wider">Selected</span>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full border border-white/30" 
                style={{ backgroundColor: color }} 
              />
              <span className="text-xs font-mono text-white uppercase">{color}</span>
            </div>
         </div>
      </div>

      {/* Popover */}
      {isOpen && (
         <div className="absolute top-full left-0 mt-2 z-50 w-72 bg-[#18181b] border border-[#3f3f46] rounded-xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Hue Slider */}
            <div className="mb-5">
               <div className="flex justify-between mb-2">
                  <label className="text-xs text-brand-muted font-bold uppercase">Custom Hue</label>
                  <span className="text-xs text-brand-muted font-mono">{hue}°</span>
               </div>
               <input 
                 type="range" 
                 min="0" 
                 max="360" 
                 value={hue}
                 onChange={handleHueChange}
                 className="w-full h-4 rounded-full appearance-none cursor-pointer border border-white/10"
                 style={{
                   background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
                 }}
               />
            </div>

            {/* Presets Grid */}
            <div className="mb-5">
               <label className="text-xs text-brand-muted font-bold uppercase mb-2 block">Quick Presets</label>
               <div className="grid grid-cols-6 gap-2">
                  {presets.map(c => (
                     <button
                       key={c}
                       type="button"
                       onClick={() => onChange(c)}
                       className="w-8 h-8 rounded-full cursor-pointer border border-white/10 hover:scale-110 transition-transform relative flex items-center justify-center"
                       style={{ backgroundColor: c }}
                       title={c}
                     >
                       {color.toLowerCase() === c && <Check size={14} className={c === '#ffffff' ? 'text-black' : 'text-white drop-shadow-md'} />}
                     </button>
                  ))}
               </div>
            </div>
            
            {/* Manual Input & Done */}
            <div className="flex items-center gap-3 pt-4 border-t border-[#27272a]">
               <div className="flex-1 flex items-center gap-2 bg-[#050505] rounded-lg px-2 py-1.5 border border-[#27272a]">
                  <span className="text-brand-muted text-xs">#</span>
                  <input 
                    type="text" 
                    value={color.replace('#', '')} 
                    onChange={(e) => onChange(`#${e.target.value}`)}
                    className="w-full bg-transparent text-white text-xs font-mono focus:outline-none uppercase"
                  />
               </div>
               <button 
                 type="button"
                 onClick={() => setIsOpen(false)}
                 className="bg-brand-lime hover:bg-brand-limeDark text-black text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-glow"
               >
                 Done
               </button>
            </div>
         </div>
      )}
    </div>
  );
};

const DataEntryPanel: React.FC<Props> = ({ state, onChange }) => {
  // -- Subject Logic --
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCount, setNewSubjectCount] = useState(5);
  // Changed from single ID to array of IDs
  const [selectedStdIds, setSelectedStdIds] = useState<string[]>([]);
  const [newSubjectColor, setNewSubjectColor] = useState('#ccff00'); // Default Brand Lime

  // -- Edit State --
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const toggleStandard = (id: string) => {
    if (selectedStdIds.includes(id)) {
      setSelectedStdIds(selectedStdIds.filter(s => s !== id));
    } else {
      setSelectedStdIds([...selectedStdIds, id]);
    }
  };

  const toggleAllStandards = () => {
    if (selectedStdIds.length === state.standards.length) {
      setSelectedStdIds([]);
    } else {
      setSelectedStdIds(state.standards.map(s => s.id));
    }
  };

  const addSubject = () => {
    if (!newSubjectName || selectedStdIds.length === 0) return;
    
    // Create a subject entry for EACH selected standard
    const newSubjects: Subject[] = selectedStdIds.map(stdId => ({
      id: crypto.randomUUID(),
      name: newSubjectName,
      lecturesPerWeek: newSubjectCount,
      standardId: stdId,
      color: newSubjectColor
    }));

    onChange({ subjects: [...state.subjects, ...newSubjects] });
    setNewSubjectName('');
    // Keep color as is for user convenience or randomise it if you prefer
    // setNewSubjectColor('#ccff00');
  };

  const removeSubject = (id: string) => {
    onChange({ subjects: state.subjects.filter(s => s.id !== id) });
  };

  const openEditModal = (subject: Subject) => {
    setEditingSubject({ ...subject });
  };

  const saveEditedSubject = () => {
    if (!editingSubject) return;
    
    const updatedSubjects = state.subjects.map(s => 
      s.id === editingSubject.id ? editingSubject : s
    );
    
    onChange({ subjects: updatedSubjects });
    setEditingSubject(null);
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex items-center gap-3 mb-2">
         <div className="w-10 h-10 bg-brand-lime/10 rounded-full flex items-center justify-center border border-brand-lime/20">
            <BookOpen size={20} className="text-brand-lime" />
         </div>
         <h2 className="text-2xl font-bold text-white">Subject Configuration</h2>
      </div>

      <section className="glass-panel p-8">
        
        {/* Input Area */}
        <div className="bg-[#18181b] p-6 rounded-2xl border border-[#27272a] mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            
            {/* Left: Standard Selection */}
            <div>
              <div className="flex justify-between items-center mb-3">
                 <label className="text-xs font-bold text-brand-muted uppercase tracking-wide">Select Standards</label>
                 <button 
                   onClick={toggleAllStandards}
                   className="text-[10px] text-brand-lime font-bold hover:underline"
                 >
                   {selectedStdIds.length === state.standards.length ? 'DESELECT ALL' : 'SELECT ALL'}
                 </button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                {state.standards.length === 0 && <span className="text-brand-muted text-sm italic">No standards configured. Go to Setup.</span>}
                {state.standards.map(s => {
                  const isSelected = selectedStdIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleStandard(s.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        isSelected 
                          ? 'bg-brand-lime text-black border-brand-lime shadow-[0_0_10px_rgba(204,255,0,0.2)]' 
                          : 'bg-[#050505] text-brand-muted border-[#3f3f46] hover:border-white hover:text-white'
                      }`}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Subject Details */}
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-brand-muted mb-2 uppercase tracking-wide">Subject Name</label>
                <input 
                  type="text" 
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="e.g. Maths"
                  className="w-full bg-[#050505] border border-[#3f3f46] rounded-xl px-4 py-3 text-white focus:border-brand-lime outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && addSubject()}
                />
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-brand-muted mb-2 uppercase tracking-wide">Lectures/Week</label>
                    <input 
                    type="number" 
                    value={newSubjectCount}
                    onChange={(e) => setNewSubjectCount(parseInt(e.target.value))}
                    min={1}
                    max={10}
                    className="w-full bg-[#050505] border border-[#3f3f46] rounded-xl px-4 py-3 text-white focus:border-brand-lime outline-none"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-brand-muted mb-2 uppercase tracking-wide">Subject Color</label>
                    <ColorWheelPicker 
                      color={newSubjectColor} 
                      onChange={setNewSubjectColor} 
                    />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-[#27272a]">
            <button 
              onClick={addSubject} 
              disabled={!newSubjectName || selectedStdIds.length === 0}
              className="w-full md:w-auto bg-brand-lime hover:bg-brand-limeDark disabled:opacity-50 disabled:cursor-not-allowed text-black px-8 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-glow"
            >
              <Plus size={20} /> 
              Add to {selectedStdIds.length > 0 ? `${selectedStdIds.length} Classes` : 'Selected Classes'}
            </button>
          </div>
        </div>

        {/* Subjects List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {state.standards.map(std => {
            const subjects = state.subjects.filter(s => s.standardId === std.id);
            if (subjects.length === 0) return null;
            return (
              <div key={std.id} className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 hover:border-[#3f3f46] transition-colors">
                <h3 className="font-bold text-white text-lg border-b border-[#27272a] pb-3 mb-4">{std.name}</h3>
                <ul className="space-y-3">
                  {subjects.map(sub => (
                    <li 
                      key={sub.id} 
                      className="flex justify-between items-center text-sm bg-[#050505] p-3 rounded-xl border border-[#27272a] overflow-hidden relative group"
                    >
                      {/* Color Indicator Strip */}
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-2" 
                        style={{ backgroundColor: sub.color || '#3f3f46' }} 
                      />
                      
                      <div className="pl-4 flex-1">
                        <span className="font-medium text-brand-text">{sub.name} <span className="text-brand-muted text-xs ml-1">({sub.lecturesPerWeek})</span></span>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => openEditModal(sub)} 
                            className="text-[#52525b] hover:text-white p-1.5 rounded hover:bg-[#27272a]"
                            title="Edit"
                        >
                            <Edit2 size={14} />
                        </button>
                        <button 
                            onClick={() => removeSubject(sub.id)} 
                            className="text-[#52525b] hover:text-red-400 p-1.5 rounded hover:bg-[#27272a]"
                            title="Remove"
                        >
                            <Trash2 size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {state.subjects.length === 0 && (
             <div className="col-span-full text-center py-12 text-brand-muted flex flex-col items-center">
               <Layers size={48} className="mb-4 opacity-20" />
               <p>No subjects added yet.</p>
               <p className="text-sm opacity-60">Select classes above and add subjects to build the curriculum.</p>
             </div>
          )}
        </div>
      </section>

      {/* Edit Modal */}
      {editingSubject && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
           <div className="glass-panel w-full max-w-md p-6 animate-fade-in relative">
              <button 
                onClick={() => setEditingSubject(null)} 
                className="absolute top-4 right-4 text-brand-muted hover:text-white"
              >
                <X size={24} />
              </button>
              
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                 <Edit2 size={20} className="text-brand-lime" /> Edit Subject
              </h3>

              <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-brand-muted mb-2 uppercase tracking-wide">Subject Name</label>
                    <input 
                      type="text" 
                      value={editingSubject.name}
                      onChange={(e) => setEditingSubject({...editingSubject, name: e.target.value})}
                      className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-white focus:border-brand-lime outline-none"
                    />
                 </div>
                 
                 <div className="flex gap-4">
                     <div className="flex-1">
                        <label className="block text-xs font-bold text-brand-muted mb-2 uppercase tracking-wide">Lectures/Week</label>
                        <input 
                        type="number" 
                        value={editingSubject.lecturesPerWeek}
                        onChange={(e) => setEditingSubject({...editingSubject, lecturesPerWeek: parseInt(e.target.value) || 0})}
                        min={1}
                        max={10}
                        className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-white focus:border-brand-lime outline-none"
                        />
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-brand-muted mb-2 uppercase tracking-wide">Color</label>
                        <ColorWheelPicker 
                          color={editingSubject.color || '#ccff00'}
                          onChange={(c) => setEditingSubject({...editingSubject, color: c})}
                        />
                     </div>
                 </div>
              </div>

              <div className="flex gap-3 mt-8">
                 <button 
                    onClick={() => setEditingSubject(null)} 
                    className="flex-1 py-3 bg-[#18181b] text-white rounded-xl border border-[#27272a] hover:bg-[#27272a]"
                 >
                   Cancel
                 </button>
                 <button 
                    onClick={saveEditedSubject} 
                    className="flex-1 py-3 bg-brand-lime text-black font-bold rounded-xl hover:bg-brand-limeDark shadow-glow flex items-center justify-center gap-2"
                 >
                   <Save size={16} /> Save Changes
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default DataEntryPanel;