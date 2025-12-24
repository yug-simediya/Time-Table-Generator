
import { AppState, DayOfWeek, FullSchedule, StandardSchedule, Subject, TimeSlot, Faculty } from '../types';

/**
 * Advanced Greedy Algorithm with Weighted Heuristics
 * Prioritizes:
 * 1. Faculty Availability (Hard Constraint)
 * 2. Consecutive Slots: MAX 2 consecutive slots for same subject (Hard Constraint)
 * 3. Daily Limit: MAX 2 lectures of same subject per day (Hard Constraint)
 * 4. Even distribution across the week
 */
export const generateSchedule = (state: AppState): FullSchedule => {
  const scheduleData: StandardSchedule[] = [];
  
  // Initialize empty structure for all standards
  state.standards.forEach(std => {
    scheduleData.push({
      standardId: std.id,
      days: {}
    });
  });

  // Helper: Track Faculty Occupancy
  // Map<FacultyID, Set<"Day-SlotIndex">>
  const facultyOccupancy = new Map<string, Set<string>>();
  
  const isFacultyAvailable = (facultyId: string, day: DayOfWeek, slotIndex: number): boolean => {
    const key = `${day}-${slotIndex}`;
    
    // 1. Check Global Unavailability (Teacher's personal constraints)
    const faculty = state.faculties.find(f => f.id === facultyId);
    if (!faculty) return false; // Should not happen
    
    const isUnavailable = faculty.unavailableSlots.some(us => us.day === day && us.slotIndex === slotIndex);
    if (isUnavailable) return false;

    // 2. Check Occupancy (Already teaching another class at this time)
    if (facultyOccupancy.get(facultyId)?.has(key)) return false;
    
    return true;
  };

  const bookFaculty = (facultyId: string, day: DayOfWeek, slotIndex: number) => {
    const key = `${day}-${slotIndex}`;
    if (!facultyOccupancy.has(facultyId)) {
      facultyOccupancy.set(facultyId, new Set());
    }
    facultyOccupancy.get(facultyId)?.add(key);
  };

  // We iterate through standards. 
  
  for (const stdSched of scheduleData) {
    // Initialize days for this standard to ensure structure exists
    state.dayConfigs.filter(d => d.isActive).forEach(dayConfig => {
      if (!stdSched.days[dayConfig.day]) {
        stdSched.days[dayConfig.day] = {};
      }
    });

    // Sort subjects: Allocate subjects with HIGHER frequency first (harder to fit)
    const stdSubjects = state.subjects.filter(s => s.standardId === stdSched.standardId);
    const neededAllocations: { subject: Subject; count: number }[] = stdSubjects.map(s => ({
      subject: s,
      count: s.lecturesPerWeek
    })).sort((a, b) => b.count - a.count);

    // Allocation Loop
    for (const alloc of neededAllocations) {
      let allocated = 0;
      let retries = 0;
      
      while (allocated < alloc.count && retries < 50) {
        
        // 1. Find ALL valid slots across the week for this specific allocation
        // We calculate a "Score" for each valid slot to decide the best placement
        const candidateSlots: { 
          day: DayOfWeek; 
          slotIndex: number; 
          facultyId: string; 
          score: number 
        }[] = [];

        state.dayConfigs.filter(d => d.isActive).forEach(dayConfig => {
          // Check how many lectures of this subject are ALREADY on this day
          const lecturesOnDay = Object.values(stdSched.days[dayConfig.day] || {})
            .filter(c => c && c.subjectId === alloc.subject.id).length;

          // STRICT CONSTRAINT: Maximum 2 lectures of the same subject per day.
          if (lecturesOnDay >= 2) return; 

          // Iterate through slots allowed for this day
          const slotsToCheck = state.globalSlots.slice(0, dayConfig.lectureCount);

          slotsToCheck.forEach(slot => {
            if (slot.isRecess) return;

            // Check if slot is empty for this standard
            if (stdSched.days[dayConfig.day]?.[slot.index]) return; // Occupied

            // --- STRICT CONSTRAINT: NO TRIPLE BLOCKS ---
            // If slot i-1 is Subject X, and slot i-2 is Subject X, we CANNOT place Subject X at slot i.
            // (Note: With the daily limit of 2, triple blocks are impossible anyway, but this logic 
            // helps keep consecutive logic clean if we relax the daily limit later).
            const prevSlot = stdSched.days[dayConfig.day]?.[slot.index - 1];
            if (prevSlot && prevSlot.subjectId === alloc.subject.id) {
               const prevPrevSlot = stdSched.days[dayConfig.day]?.[slot.index - 2];
               if (prevPrevSlot && prevPrevSlot.subjectId === alloc.subject.id) {
                 return; // Prevent 3rd consecutive
               }
            }

            // Also check next slot (if we are filling a gap)
            const nextSlot = stdSched.days[dayConfig.day]?.[slot.index + 1];
            if (prevSlot && prevSlot.subjectId === alloc.subject.id && nextSlot && nextSlot.subjectId === alloc.subject.id) {
               return; // Sandwich case [S, (Current), S] -> Forbidden
            }

            // Find a valid faculty
            const potentialFaculty = state.faculties.find(f => 
              f.subjectIds.includes(alloc.subject.id) && 
              f.standardIds.includes(stdSched.standardId) &&
              isFacultyAvailable(f.id, dayConfig.day, slot.index)
            );

            if (potentialFaculty) {
              // --- SCORING HEURISTICS ---
              let score = Math.random() * 10; 

              // Rule 1: PREFER DOUBLE LECTURES
              // If previous slot is same subject, give high bonus
              if (prevSlot && prevSlot.subjectId === alloc.subject.id) {
                score += 1000; 
              }
              if (nextSlot && nextSlot.subjectId === alloc.subject.id) {
                score += 1000;
              }

              // Rule 2: EVEN DISTRIBUTION
              if (lecturesOnDay === 0) {
                score += 100;
              }

              candidateSlots.push({
                day: dayConfig.day,
                slotIndex: slot.index,
                facultyId: potentialFaculty.id,
                score
              });
            }
          });
        });

        // 2. Pick the Best Slot
        if (candidateSlots.length > 0) {
          // Sort by score descending
          candidateSlots.sort((a, b) => b.score - a.score);
          
          const bestSlot = candidateSlots[0];
          
          // Assign
          stdSched.days[bestSlot.day]![bestSlot.slotIndex] = {
            subjectId: alloc.subject.id,
            facultyId: bestSlot.facultyId
          };

          bookFaculty(bestSlot.facultyId, bestSlot.day, bestSlot.slotIndex);
          allocated++;
        } else {
          retries++;
        }
      }
      
      if (allocated < alloc.count) {
        console.warn(`Could not fully allocate subject ${alloc.subject.name} for standard ${stdSched.standardId}. Allocated: ${allocated}/${alloc.count}`);
      }
    }
  }

  return {
    id: crypto.randomUUID(),
    name: 'Generated Schedule',
    createdAt: Date.now(),
    schedules: scheduleData
  };
};
