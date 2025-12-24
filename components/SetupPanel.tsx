
import React, { useState, useRef } from 'react';
import { AppState, Medium, Standard, Stream } from '../types';
import { Trash2, Plus, CheckCircle2, GripVertical, Download, Upload, FileJson } from 'lucide-react';
import { exportDataAsJSON } from '../services/exportService';

interface Props {
  state: AppState;
  onChange: (updates: Partial<AppState>) => void;
}

const SetupPanel: React.FC<Props> = ({ state, onChange }) => {
  const [selectedDivision, setSelectedDivision] = useState<string>('A');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const divisions = ['A', 'B', 'C', 'D', 'E'];
  
  // --- Import / Export Logic ---
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        
        // Basic Validation to ensure it's a valid config file
        if (json.medium && Array.isArray(json.standards) && Array.isArray(json.globalSlots)) {
          // This update triggers the auto-save in App.tsx
          onChange(json);
          alert(`Configuration imported successfully!\nLoaded ${json.standards.length} standards and ${json.subjects?.length || 0} subjects.`);
        } else {
          alert("Invalid file format. Please upload a valid EasySched JSON file.");
        }
      } catch (err) {
        console.error(err);
        alert("Error parsing file. Please check if the file is valid JSON.");
      }
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const addStandard = (grade: number, stream: Stream = Stream.NONE) => {
    // Generate name like "10-A" or "12-Science-B"
    let name = `Std ${grade}`;
    if (stream !== Stream.NONE) name += ` ${stream}`;
    if (selectedDivision) name += `-${selectedDivision}`;

    // Check duplicate
    if (state.standards.some(s => s.grade === grade && s.stream === stream && s.division === selectedDivision)) {
      alert(`Standard ${name} already exists!`);
      return;
    }

    const newStd: Standard = {
      id: crypto.randomUUID(),
      grade,
      stream,
      medium: state.medium,
      division: selectedDivision,
      name
    };
    onChange({ standards: [...state.standards, newStd] });
  };

  const removeStandard = (id: string) => {
    onChange({ standards: state.standards.filter(s => s.id !== id) });
  };

  const setMedium = (m: Medium) => {
    const updatedStandards = state.standards.map(s => ({ ...s, medium: m }));
    onChange({ medium: m, standards: updatedStandards });
  };

  // -- Drag and Drop Handlers --
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    // Setting effectAllowed helps browsers show the right cursor
    e.dataTransfer.effectAllowed = "move";
    // Required for Firefox
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    if (draggedIndex === dropIndex) return;

    const newStandards = [...state.standards];
    const [movedItem] = newStandards.splice(draggedIndex, 1);
    newStandards.splice(dropIndex, 0, movedItem);

    onChange({ standards: newStandards });
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Import/Export Section */}
      <div className="glass-panel p-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gradient-to-r from-[#121212] to-[#1a1a1d]">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileJson size={20} className="text-brand-lime" /> Data Management
          </h2>
          <p className="text-xs text-brand-muted mt-1">Backup your configuration or import details to auto-fill.</p>
        </div>
        <div className="flex gap-3">
           <input 
             type="file" 
             accept=".json" 
             ref={fileInputRef} 
             className="hidden" 
             onChange={handleFileUpload}
           />
           <button 
            onClick={handleImportClick}
            className="flex items-center gap-2 px-4 py-2 bg-[#1f1f22] hover:bg-[#27272a] text-white border border-[#27272a] hover:border-brand-lime rounded-full text-sm font-medium transition-all"
           >
             <Upload size={16} /> Import Details
           </button>
           <button 
            onClick={() => exportDataAsJSON(state)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-lime hover:bg-brand-limeDark text-black rounded-full text-sm font-bold shadow-glow transition-all"
           >
             <Download size={16} /> Export Details
           </button>
        </div>
      </div>

      <div className="glass-panel p-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="w-1 h-6 bg-brand-lime rounded-full"></span>
          Medium Selection
        </h2>
        <div className="flex flex-wrap gap-4">
          {Object.values(Medium).map((m) => {
             const isSelected = state.medium === m;
             return (
              <button
                key={m}
                onClick={() => setMedium(m)}
                className={`relative px-8 py-4 rounded-2xl font-semibold hover-interactive border ${
                  isSelected
                    ? 'bg-brand-lime text-black border-brand-lime shadow-glow'
                    : 'bg-[#18181b] text-brand-muted border-[#27272a] hover:border-brand-lime/50 hover:text-white'
                }`}
              >
                {m}
                {isSelected && <div className="absolute top-2 right-2 w-2 h-2 bg-black rounded-full opacity-50"></div>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="glass-panel p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-1 h-6 bg-brand-lime rounded-full"></span>
            Standard Configuration
          </h2>

          <div className="flex items-center gap-2 bg-[#18181b] p-2 rounded-xl border border-[#27272a]">
            <span className="text-xs font-bold text-brand-muted uppercase ml-2">Division:</span>
            <div className="flex gap-1">
              {divisions.map(div => (
                <button
                  key={div}
                  onClick={() => setSelectedDivision(div)}
                  className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                    selectedDivision === div 
                    ? 'bg-brand-lime text-black shadow-glow' 
                    : 'bg-[#0a0a0a] text-brand-muted hover:text-white hover:bg-[#27272a]'
                  }`}
                >
                  {div}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <h3 className="text-sm font-medium text-brand-muted mb-4 uppercase tracking-wider">Primary & Secondary (1-10)</h3>
            <div className="grid grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(grade => {
                const exists = state.standards.some(s => s.grade === grade && s.division === selectedDivision && s.stream === Stream.NONE);
                return (
                  <button
                    key={grade}
                    onClick={() => exists 
                      ? onChange({ standards: state.standards.filter(s => !(s.grade === grade && s.division === selectedDivision)) })
                      : addStandard(grade)
                    }
                    className={`h-12 rounded-xl border font-medium hover-interactive ${
                      exists 
                      ? 'bg-brand-lime text-black border-brand-lime shadow-glow' 
                      : 'bg-[#18181b] border-[#27272a] text-brand-muted hover:text-white hover:border-brand-muted'
                    }`}
                  >
                    {grade}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-brand-muted mb-4 uppercase tracking-wider">Higher Secondary (11-12)</h3>
            <div className="space-y-3">
              {[11, 12].map(grade => (
                <div key={grade} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-[#18181b] p-3 rounded-2xl border border-[#27272a]">
                  <span className="w-10 h-10 flex items-center justify-center rounded-full bg-[#27272a] font-bold text-white shadow-inner">{grade}</span>
                  <div className="flex flex-wrap gap-2">
                  {[Stream.SCIENCE, Stream.COMMERCE, Stream.ARTS].map(stream => {
                    const exists = state.standards.some(s => s.grade === grade && s.stream === stream && s.division === selectedDivision);
                    return (
                      <button
                        key={stream}
                        onClick={() => exists
                          ? onChange({ standards: state.standards.filter(s => !(s.grade === grade && s.stream === stream && s.division === selectedDivision)) })
                          : addStandard(grade, stream)
                        }
                        className={`px-4 py-2 text-sm rounded-full border hover-interactive ${
                          exists
                          ? 'bg-white text-black border-white font-bold'
                          : 'bg-transparent border-[#3f3f46] text-brand-muted hover:border-white hover:text-white'
                        }`}
                      >
                        {stream}
                      </button>
                    )
                  })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {state.standards.length > 0 && (
          <div className="mt-8 pt-6 border-t border-[#27272a]">
            <h3 className="text-sm font-semibold text-brand-muted mb-4">Selected Classes (Drag to Reorder)</h3>
            <div className="flex flex-wrap gap-3">
              {state.standards.map((std, index) => (
                <div 
                  key={std.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 px-3 py-2 bg-[#1f1f22] rounded-full border border-[#27272a] text-white hover:border-brand-lime transition-colors cursor-move ${
                    draggedIndex === index ? 'opacity-50 ring-2 ring-brand-lime' : ''
                  }`}
                >
                  <GripVertical size={14} className="text-brand-muted cursor-grab active:cursor-grabbing" />
                  <CheckCircle2 size={14} className="text-brand-lime" />
                  <span>{std.name}</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeStandard(std.id); }} 
                    className="ml-2 text-brand-muted hover:text-red-400"
                    title="Remove Class"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SetupPanel;
