
import { AppState, DayOfWeek } from '../types';

// Declare globals loaded via CDN
declare global {
  interface Window {
    jspdf: any;
    XLSX: any;
  }
}

export const exportDataAsJSON = (state: AppState) => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", `easy_sched_backup_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};

export const exportToPDF = (state: AppState) => {
  if (!state.generatedSchedule || !window.jspdf) {
    alert("Export modules not loaded or no schedule available.");
    return;
  }

  const doc = new window.jspdf.jsPDF();
  let yPos = 10;

  state.generatedSchedule.schedules.forEach((stdSched, index) => {
    const standard = state.standards.find(s => s.id === stdSched.standardId);
    if (!standard) return;

    if (index > 0) {
      doc.addPage();
      yPos = 10;
    }

    doc.setFontSize(18);
    doc.text(`Time Table: ${standard.name} (${standard.stream !== 'None' ? standard.stream : ''}) - ${standard.medium} Medium`, 14, yPos);
    yPos += 10;

    const days = state.dayConfigs.filter(d => d.isActive).map(d => d.day);
    
    // Table Headers
    const headers = [['Time', ...days]];
    
    // Prepare rows based on slots
    const rows: any[] = [];
    state.globalSlots.forEach(slot => {
      const row = [`${slot.startTime} - ${slot.endTime}`];
      
      if (slot.isRecess) {
        row.push(...Array(days.length).fill('RECESS'));
      } else {
        days.forEach(day => {
          const cell = stdSched.days[day]?.[slot.index];
          if (cell) {
            const subj = state.subjects.find(s => s.id === cell.subjectId)?.name || 'Unknown';
            const fac = state.faculties.find(f => f.id === cell.facultyId)?.name || 'Unknown';
            row.push(`${subj}\n(${fac})`);
          } else {
            row.push('-');
          }
        });
      }
      rows.push(row);
    });

    doc.autoTable({
      head: headers,
      body: rows,
      startY: yPos,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [6, 182, 212] }, // Cyan-500
    });
  });

  doc.save('lecture_schedule.pdf');
};

export const exportToExcel = (state: AppState) => {
  if (!state.generatedSchedule || !window.XLSX) {
    alert("Export modules not loaded or no schedule available.");
    return;
  }

  const wb = window.XLSX.utils.book_new();

  state.generatedSchedule.schedules.forEach(stdSched => {
    const standard = state.standards.find(s => s.id === stdSched.standardId);
    if (!standard) return;

    const sheetName = `${standard.name.replace(/\s/g,'')} ${standard.stream.substring(0,3)}`;
    const wsData = [];
    
    // Headers
    const days = state.dayConfigs.filter(d => d.isActive).map(d => d.day);
    wsData.push(['Time Slot', ...days]);

    // Rows
    state.globalSlots.forEach(slot => {
      const row = [`${slot.startTime} - ${slot.endTime}`];
      if (slot.isRecess) {
        days.forEach(() => row.push('RECESS'));
      } else {
        days.forEach(day => {
          const cell = stdSched.days[day]?.[slot.index];
          if (cell) {
             const subj = state.subjects.find(s => s.id === cell.subjectId)?.name || '';
            const fac = state.faculties.find(f => f.id === cell.facultyId)?.name || '';
            row.push(`${subj} (${fac})`);
          } else {
            row.push('');
          }
        });
      }
      wsData.push(row);
    });

    const ws = window.XLSX.utils.aoa_to_sheet(wsData);
    window.XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31)); // Excel sheet name limit
  });

  window.XLSX.writeFile(wb, 'lecture_schedule.xlsx');
};
