
import React from 'react';
import { AppState, DayOfWeek, TimeSlot } from '../types';
import { Clock, Plus, Trash2, Link as LinkIcon } from 'lucide-react';

interface Props {
  state: AppState;
  onChange: (updates: Partial<AppState>) => void;
}

const TimingsPanel: React.FC<Props> = ({ state, onChange }) => {
  
  const updateSlot = (index: number, field: keyof TimeSlot, value: any) => {
    const newSlots = [...state.globalSlots];
    newSlots[index] = { ...newSlots[index], [field]: value };

    // Auto-timing Logic:
    // If we changed the 'endTime', automatically set the 'startTime' of the NEXT slot to match.
    if (field === 'endTime' && index < newSlots.length - 1) {
      newSlots[index + 1] = {
        ...newSlots[index + 1],
        startTime: value
      };
    }

    onChange({ globalSlots: newSlots });
  };

  const addSlot = () => {
    const last = state.globalSlots[state.globalSlots.length - 1];
    
    // Calculate new times
    const nextStart = last ? last.endTime : '08:00';
    
    // Default duration helper (add 50 mins)
    const addMinutes = (time: string, mins: number) => {
      const [h, m] = time.split(':').map(Number);
      const date = new Date();
      date.setHours(h, m + mins);
      return date.toTimeString().slice(0, 5);
    };

    const nextEnd = addMinutes(nextStart, 50);

    const newSlot: TimeSlot = {
      id: crypto.randomUUID(),
      index: state.globalSlots.length,
      startTime: nextStart,
      endTime: nextEnd,
      isRecess: false
    };
    onChange({ globalSlots: [...state.globalSlots, newSlot] });
  };

  const removeSlot = (index: number) => {
    const newSlots = state.globalSlots.filter((_, i) => i !== index).map((s, i) => ({ ...s, index: i }));
    onChange({ globalSlots: newSlots });
  };

  const toggleDay = (day: DayOfWeek) => {
    const newDays = state.dayConfigs.map(d => 
      d.day === day ? { ...d, isActive: !d.isActive } : d
    );
    onChange({ dayConfigs: newDays });
  };

  const updateDayLectureCount = (day: DayOfWeek, count: number) => {
    const newDays = state.dayConfigs.map(d => 
      d.day === day ? { ...d, lectureCount: count } : d
    );
    onChange({ dayConfigs: newDays });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-panel p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-1 h-6 bg-brand-lime rounded-full"></span>
            Lecture Timings
          </h2>
          <button onClick={addSlot} className="flex items-center gap-2 px-4 py-2 bg-brand-lime hover:bg-brand-limeDark text-black rounded-full font-bold transition-colors shadow-glow">
            <Plus size={18} /> Add Slot
          </button>
        </div>
        
        <div className="space-y-2">
          {state.globalSlots.map((slot, idx) => (
            <div key={slot.id} className="relative flex flex-col md:flex-row gap-4 items-center bg-[#18181b] p-4 rounded-2xl border border-[#27272a] hover:border-[#3f3f46] transition-colors group">
              
              {/* Connector Line Visual */}
              {idx < state.globalSlots.length - 1 && (
                 <div className="absolute left-8 -bottom-4 h-4 w-0.5 bg-[#27272a] z-0 hidden md:block"></div>
              )}

              <span className="text-brand-muted font-mono w-8 text-center z-10 bg-[#18181b]">{idx + 1}</span>
              
              <div className="flex items-center gap-2 bg-[#050505] px-3 py-2 rounded-lg border border-[#27272a]">
                <Clock size={16} className="text-brand-muted" />
                <input 
                  type="time" 
                  value={slot.startTime} 
                  onChange={(e) => updateSlot(idx, 'startTime', e.target.value)}
                  className="bg-transparent text-white focus:outline-none w-24 text-center font-mono"
                />
                <span className="text-brand-muted">-</span>
                <input 
                  type="time" 
                  value={slot.endTime} 
                  onChange={(e) => updateSlot(idx, 'endTime', e.target.value)}
                  className="bg-transparent text-white focus:outline-none w-24 text-center font-mono"
                />
              </div>

              {idx < state.globalSlots.length - 1 && (
                 <div className="hidden md:flex items-center text-[#27272a]" title="Next slot will auto-start at this time">
                   <LinkIcon size={14} />
                 </div>
              )}

              <div className="flex items-center gap-3 ml-4 bg-[#050505] px-3 py-2 rounded-lg border border-[#27272a]">
                <div 
                  className={`w-10 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors ${slot.isRecess ? 'bg-brand-lime' : 'bg-[#27272a]'}`}
                  onClick={() => updateSlot(idx, 'isRecess', !slot.isRecess)}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${slot.isRecess ? 'translate-x-4' : 'translate-x-0'}`}></div>
                </div>
                <label className={`text-sm select-none ${slot.isRecess ? 'text-brand-lime font-bold' : 'text-brand-muted'}`}>
                  Recess
                </label>
              </div>

              {slot.isRecess && (
                <input
                  type="text"
                  placeholder="Break Name"
                  value={slot.name || ''}
                  onChange={(e) => updateSlot(idx, 'name', e.target.value)}
                  className="bg-[#050505] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-white focus:border-brand-lime outline-none placeholder:text-[#3f3f46] w-full md:w-auto flex-1"
                />
              )}

              <button onClick={() => removeSlot(idx)} className="ml-auto text-brand-muted hover:text-red-400 p-2">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel p-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
           <span className="w-1 h-6 bg-brand-lime rounded-full"></span>
           Days & Lectures
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.dayConfigs.map(config => (
            <div key={config.day} className={`p-5 rounded-2xl border transition-all ${
              config.isActive ? 'bg-[#18181b] border-brand-lime/50 shadow-[0_0_15px_rgba(204,255,0,0.05)]' : 'bg-[#0a0a0a] border-[#27272a] opacity-50'
            }`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-white">{config.day}</h3>
                 <div 
                  className={`w-10 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors ${config.isActive ? 'bg-brand-lime' : 'bg-[#27272a]'}`}
                  onClick={() => toggleDay(config.day)}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${config.isActive ? 'translate-x-4' : 'translate-x-0'}`}></div>
                </div>
              </div>
              
              {config.isActive && (
                 <div className="flex items-center justify-between text-sm bg-[#050505] p-2 rounded-lg border border-[#27272a]">
                   <span className="text-brand-muted pl-2">Daily Lectures</span>
                   <select 
                     value={config.lectureCount}
                     onChange={(e) => updateDayLectureCount(config.day, parseInt(e.target.value))}
                     className="bg-[#1f1f22] text-white rounded-md px-3 py-1 outline-none font-mono border border-[#3f3f46] focus:border-brand-lime"
                   >
                     {state.globalSlots.map((_, i) => (
                       <option key={i} value={i + 1}>{i + 1}</option>
                     ))}
                   </select>
                 </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimingsPanel;
