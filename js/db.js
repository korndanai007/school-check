/**
 * LocalStorage Database Manager for Student Attendance Web App
 */

// Generate a robust unique ID that works in non-secure (file://) contexts
const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

// Initialize DB keys
const KEYS = {
  TEACHERS: 'attendance_teachers',
  STUDENTS: 'attendance_students',
  ATTENDANCE: 'attendance_records'
};

// Helper: Get data from LocalStorage
const getFromStorage = (key, defaultValue = []) => {
  const data = localStorage.getItem(key);
  try {
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.error(`Error reading key "${key}" from localStorage`, e);
    return defaultValue;
  }
};

// Helper: Save data to LocalStorage
const saveToStorage = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

window.DB = {
  // ==========================================
  // TEACHERS CRUD
  // ==========================================
  getTeachers() {
    return getFromStorage(KEYS.TEACHERS, []);
  },

  saveTeachers(teachers) {
    saveToStorage(KEYS.TEACHERS, teachers);
    return teachers;
  },

  addTeacher(name, className) {
    const teachers = this.getTeachers();
    const newTeacher = {
      id: generateId(),
      name: name.trim(),
      className: className.trim()
    };
    teachers.push(newTeacher);
    this.saveTeachers(teachers);
    return newTeacher;
  },

  updateTeacher(id, name, className) {
    const teachers = this.getTeachers();
    const idx = teachers.findIndex(t => t.id === id);
    if (idx !== -1) {
      teachers[idx] = { ...teachers[idx], name: name.trim(), className: className.trim() };
      this.saveTeachers(teachers);
      return teachers[idx];
    }
    return null;
  },

  deleteTeacher(id) {
    let teachers = this.getTeachers();
    teachers = teachers.filter(t => t.id !== id);
    this.saveTeachers(teachers);
    return true;
  },

  // ==========================================
  // STUDENTS CRUD
  // ==========================================
  getStudents() {
    return getFromStorage(KEYS.STUDENTS, []);
  },

  getStudentsByClass(className) {
    const students = this.getStudents();
    return students
      .filter(s => s.className === className)
      .sort((a, b) => Number(a.rollNumber) - Number(b.rollNumber));
  },

  saveStudents(students) {
    saveToStorage(KEYS.STUDENTS, students);
    return students;
  },

  addStudent(name, className, rollNumber) {
    const students = this.getStudents();
    const newStudent = {
      id: generateId(),
      name: name.trim(),
      className: className.trim(),
      rollNumber: parseInt(rollNumber, 10) || (students.filter(s => s.className === className).length + 1)
    };
    students.push(newStudent);
    this.saveStudents(students);
    return newStudent;
  },

  updateStudent(id, name, className, rollNumber) {
    const students = this.getStudents();
    const idx = students.findIndex(s => s.id === id);
    if (idx !== -1) {
      students[idx] = { 
        ...students[idx], 
        name: name.trim(), 
        className: className.trim(),
        rollNumber: parseInt(rollNumber, 10) || 1
      };
      this.saveStudents(students);
      return students[idx];
    }
    return null;
  },

  deleteStudent(id) {
    let students = this.getStudents();
    students = students.filter(s => s.id !== id);
    this.saveStudents(students);
    return true;
  },

  // ==========================================
  // CSV IMPORT
  // ==========================================
  importStudentsFromCSV(csvText, className) {
    if (!csvText || !className) return { success: false, message: 'ข้อมูลไม่ครบถ้วน' };
    
    // Split lines and clean
    const lines = csvText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return { success: false, message: 'ไฟล์ว่างเปล่าหรือไม่มีข้อมูล' };

    const importedStudents = [];
    let skippedCount = 0;
    
    // Read list of existing students in target class to verify duplicate roll numbers
    const currentStudents = this.getStudents();
    let currentMaxRoll = currentStudents.filter(s => s.className === className)
      .reduce((max, s) => Math.max(max, s.rollNumber), 0);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Split by comma or semicolon
      const parts = line.split(/[,;\t]/).map(p => p.trim());
      
      // Skip headers (if they contain columns description)
      if (i === 0 && (parts.some(p => p.includes('เลขที่') || p.includes('ชื่อ') || p.includes('name') || p.includes('no.')))) {
        skippedCount++;
        continue;
      }

      let rollNumber = null;
      let name = '';

      if (parts.length >= 2) {
        // Formats: 
        // 1. RollNumber, FullName (e.g., "1, สมชาย ดีใจ")
        // 2. RollNumber, FirstName, LastName (e.g., "1, สมชาย, ดีใจ")
        const parsedRoll = parseInt(parts[0], 10);
        if (!isNaN(parsedRoll)) {
          rollNumber = parsedRoll;
          name = parts.slice(1).join(' ').replace(/\s+/g, ' '); // Join first & last name
        } else {
          // If first item is not a number, maybe there's no roll number: "สมชาย ดีใจ"
          name = parts.join(' ').replace(/\s+/g, ' ');
        }
      } else if (parts.length === 1) {
        // Format: FullName only (e.g., "สมชาย ดีใจ")
        name = parts[0];
      }

      if (!name || name === '') {
        skippedCount++;
        continue;
      }

      // If no roll number parsed, auto-increment
      if (rollNumber === null) {
        currentMaxRoll++;
        rollNumber = currentMaxRoll;
      }

      importedStudents.push({
        id: generateId(),
        name: name,
        className: className.trim(),
        rollNumber: rollNumber
      });
    }

    if (importedStudents.length === 0) {
      return { success: false, message: 'ไม่สามารถนำเข้าข้อมูลได้ กรุณาตรวจสอบรูปแบบไฟล์' };
    }

    // Merge into storage
    const allStudents = [...currentStudents, ...importedStudents];
    this.saveStudents(allStudents);

    return {
      success: true,
      count: importedStudents.length,
      skipped: skippedCount,
      message: `นำเข้าข้อมูลนักเรียนห้อง ${className} สำเร็จ ${importedStudents.length} คน`
    };
  },

  // ==========================================
  // ATTENDANCE RECORDS MANAGEMENT
  // ==========================================
  /**
   * Retrieves attendance records for a specific date and class
   * Date format: YYYY-MM-DD
   */
  getAttendance(date, className) {
    const allRecords = getFromStorage(KEYS.ATTENDANCE, {});
    const key = `${date}_${className}`;
    return allRecords[key] || null;
  },

  /**
   * Saves attendance records
   * records format: { [studentId]: 'present' | 'late' | 'leave' | 'absent' }
   */
  saveAttendance(date, className, records, checkedBy) {
    const allRecords = getFromStorage(KEYS.ATTENDANCE, {});
    const key = `${date}_${className}`;
    
    allRecords[key] = {
      date,
      className,
      checkedBy: checkedBy || 'ไม่ระบุตัวตน',
      updatedAt: new Date().toISOString(),
      records
    };
    
    saveToStorage(KEYS.ATTENDANCE, allRecords);
    return allRecords[key];
  },

  /**
   * Calculates statistics for a given class on a specific date
   */
  getDailyStats(date, className) {
    const students = this.getStudentsByClass(className);
    const attendanceData = this.getAttendance(date, className);
    
    const stats = {
      total: students.length,
      present: 0,
      late: 0,
      leave: 0,
      absent: 0,
      unchecked: students.length,
      checkedPercent: 0
    };

    if (students.length === 0) return stats;

    if (attendanceData && attendanceData.records) {
      const records = attendanceData.records;
      students.forEach(student => {
        const status = records[student.id];
        if (status) {
          stats[status]++;
          stats.unchecked--;
        }
      });
    }

    const checkedCount = stats.total - stats.unchecked;
    stats.checkedPercent = Math.round((checkedCount / stats.total) * 100);

    return stats;
  },

  /**
   * Helper to retrieve all classrooms currently registered in system
   */
  getClassrooms() {
    const teachers = this.getTeachers();
    const students = this.getStudents();
    
    const classes = new Set();
    teachers.forEach(t => { if (t.className) classes.add(t.className); });
    students.forEach(s => { if (s.className) classes.add(s.className); });
    
    return Array.from(classes).sort();
  },

  // Reset all data (for debugging/re-testing)
  clearAllData() {
    localStorage.removeItem(KEYS.TEACHERS);
    localStorage.removeItem(KEYS.STUDENTS);
    localStorage.removeItem(KEYS.ATTENDANCE);
  }
};
