window.Checker = {
  state: {
    selectedTeacherId: '',
    selectedClass: '',
    selectedDate: new Date().toISOString().split('T')[0],
    searchQuery: '',
    records: {} // Local temporary state for current check-in: { [studentId]: 'present' | ... }
  },

  render(container) {
    this.container = container;
    
    const teachers = DB.getTeachers();
    const classes = DB.getClassrooms();

    // If there is no data in system yet
    if (teachers.length === 0 && classes.length === 0) {
      this.renderEmptyState();
      return;
    }

    // Default select first teacher if not selected
    if (!this.state.selectedTeacherId && teachers.length > 0) {
      const defaultTeacher = teachers[0];
      this.state.selectedTeacherId = defaultTeacher.id;
      this.state.selectedClass = defaultTeacher.className;
    } else if (!this.state.selectedClass && classes.length > 0) {
      this.state.selectedClass = classes[0];
    }

    // Load existing attendance records for the selected date and class
    this.loadSavedRecords();

    const students = DB.getStudentsByClass(this.state.selectedClass);
    const stats = this.calculateLocalStats(students);

    // Build View HTML
    let html = `
      <div class="page-header">
        <div class="page-title">
          <h2>เช็คชื่อนักเรียนรายวัน</h2>
          <p>บันทึกการมาเรียน ขาด ลา สาย ของนักเรียนในวันนี้</p>
        </div>
        <div class="page-actions">
          <div class="form-group" style="flex-direction: row; align-items: center; gap: 8px;">
            <label for="checker-date" style="font-weight: 500; font-size: 0.95rem; white-space: nowrap;">วันที่เช็คชื่อ:</label>
            <input type="date" id="checker-date" class="form-input" value="${this.state.selectedDate}" max="${new Date().toISOString().split('T')[0]}" style="padding: 8px 12px; font-size: 0.9rem;">
          </div>
        </div>
      </div>

      <!-- Quick stats progress -->
      <div class="stats-grid">
        <div class="glass-card stat-card present">
          <div class="stat-icon">มา</div>
          <div class="stat-info">
            <span class="stat-value" id="stat-present-val">${stats.present}</span>
            <span class="stat-label">คน (มาเรียน)</span>
          </div>
        </div>
        <div class="glass-card stat-card late">
          <div class="stat-icon">สาย</div>
          <div class="stat-info">
            <span class="stat-value" id="stat-late-val">${stats.late}</span>
            <span class="stat-label">คน (สาย)</span>
          </div>
        </div>
        <div class="glass-card stat-card leave">
          <div class="stat-icon">ลา</div>
          <div class="stat-info">
            <span class="stat-value" id="stat-leave-val">${stats.leave}</span>
            <span class="stat-label">คน (ลา)</span>
          </div>
        </div>
        <div class="glass-card stat-card absent">
          <div class="stat-icon">ขาด</div>
          <div class="stat-info">
            <span class="stat-value" id="stat-absent-val">${stats.absent}</span>
            <span class="stat-label">คน (ขาดเรียน)</span>
          </div>
        </div>
      </div>

      <!-- Selectors & Controls Card -->
      <div class="glass-card controls-card">
        <div style="display: flex; gap: 12px; flex-wrap: wrap; flex: 1;">
          <!-- Select Teacher -->
          <div class="form-group" style="min-width: 180px;">
            <select id="select-teacher" class="form-select">
              <option value="" disabled ${!this.state.selectedTeacherId ? 'selected' : ''}>-- เลือกคุณครูผู้เช็ค --</option>
              ${teachers.map(t => `
                <option value="${t.id}" ${this.state.selectedTeacherId === t.id ? 'selected' : ''}>
                  ${t.name} (ห้องประจำชั้น: ${t.className})
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Select Class -->
          <div class="form-group" style="min-width: 140px;">
            <select id="select-class" class="form-select">
              ${classes.map(c => `
                <option value="${c}" ${this.state.selectedClass === c ? 'selected' : ''}>ห้อง ${c}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <div style="display: flex; gap: 12px; align-items: center;">
          <button id="btn-check-all-present" class="btn-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
            เช็คมาทั้งหมด
          </button>
          <button id="btn-save-attendance" class="btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            บันทึกข้อมูล
          </button>
        </div>
      </div>

      <!-- Search & Progress Tracker -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
        <div class="search-input-wrapper" style="max-width: 350px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="text" id="search-students" class="search-input" placeholder="ค้นหาชื่อหรือเลขที่นักเรียน..." value="${this.state.searchQuery}">
        </div>
        <div style="font-size: 0.95rem; color: var(--text-muted);">
          เช็คชื่อแล้ว <span id="progress-percent" style="font-weight: 600; color: var(--primary);">${stats.checkedPercent}%</span> 
          (<span id="progress-checked">${stats.total - stats.unchecked}</span>/${stats.total} คน)
        </div>
      </div>

      <!-- Students List Container -->
      <div id="checker-list" class="checker-list-container">
        ${this.renderStudentList(students)}
      </div>
    `;

    this.container.innerHTML = html;
    this.bindEvents();
  },

  renderEmptyState() {
    this.container.innerHTML = `
      <div class="glass-card empty-state" style="margin-top: 40px;">
        <div class="empty-state-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <h3>ยังไม่มีข้อมูลครูหรือนักเรียนในระบบ</h3>
        <p>กรุณาเพิ่มข้อมูลคุณครูประจำชั้นและนักเรียนเพื่อเริ่มต้นใช้งาน หรืออัปโหลดไฟล์รายชื่อรายบุคคล/ไฟล์กลุ่ม (CSV) ในหน้าจัดการข้อมูล</p>
        <button id="btn-go-to-manage" class="btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
          ไปที่หน้าจัดการข้อมูล
        </button>
      </div>
    `;
    
    const btnGo = this.container.querySelector('#btn-go-to-manage');
    if (btnGo) {
      btnGo.addEventListener('click', () => {
        window.location.hash = '#manage';
      });
    }
  },

  renderStudentList(students) {
    // Filter students by search query
    const filtered = students.filter(s => {
      const q = this.state.searchQuery.toLowerCase().trim();
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || String(s.rollNumber) === q;
    });

    if (filtered.length === 0) {
      return `
        <div class="empty-state">
          <p>ไม่พบรายชื่อนักเรียนที่ค้นหา</p>
        </div>
      `;
    }

    return filtered.map(student => {
      const status = this.state.records[student.id] || '';
      return `
        <div class="student-row" data-id="${student.id}">
          <div class="student-roll">เลขที่ ${student.rollNumber}</div>
          <div class="student-info-main">
            <span class="student-name">${student.name}</span>
            <span class="student-class-badge">ห้อง ${student.className}</span>
          </div>
          <div class="attendance-picker">
            <button class="btn-status present ${status === 'present' ? 'active' : ''}" data-status="present">มา</button>
            <button class="btn-status late ${status === 'late' ? 'active' : ''}" data-status="late">สาย</button>
            <button class="btn-status leave ${status === 'leave' ? 'active' : ''}" data-status="leave">ลา</button>
            <button class="btn-status absent ${status === 'absent' ? 'active' : ''}" data-status="absent">ขาด</button>
          </div>
        </div>
      `;
    }).join('');
  },

  loadSavedRecords() {
    const saved = DB.getAttendance(this.state.selectedDate, this.state.selectedClass);
    if (saved && saved.records) {
      this.state.records = { ...saved.records };
    } else {
      // Clear local temporary records if no saved record exists for this day/class combo
      this.state.records = {};
    }
  },

  calculateLocalStats(students) {
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

    students.forEach(student => {
      const status = this.state.records[student.id];
      if (status) {
        stats[status]++;
        stats.unchecked--;
      }
    });

    const checkedCount = stats.total - stats.unchecked;
    stats.checkedPercent = Math.round((checkedCount / stats.total) * 100);

    return stats;
  },

  updateStatsInUI() {
    const students = DB.getStudentsByClass(this.state.selectedClass);
    const stats = this.calculateLocalStats(students);

    document.getElementById('stat-present-val').textContent = stats.present;
    document.getElementById('stat-late-val').textContent = stats.late;
    document.getElementById('stat-leave-val').textContent = stats.leave;
    document.getElementById('stat-absent-val').textContent = stats.absent;

    document.getElementById('progress-percent').textContent = `${stats.checkedPercent}%`;
    document.getElementById('progress-checked').textContent = stats.total - stats.unchecked;
  },

  bindEvents() {
    const selectTeacher = this.container.querySelector('#select-teacher');
    const selectClass = this.container.querySelector('#select-class');
    const inputDate = this.container.querySelector('#checker-date');
    const inputSearch = this.container.querySelector('#search-students');
    const btnCheckAll = this.container.querySelector('#btn-check-all-present');
    const btnSave = this.container.querySelector('#btn-save-attendance');
    const checkerList = this.container.querySelector('#checker-list');

    // Date change handler
    if (inputDate) {
      inputDate.addEventListener('change', (e) => {
        this.state.selectedDate = e.target.value;
        this.loadSavedRecords();
        this.render(this.container);
      });
    }

    // Teacher select handler (auto switches class)
    if (selectTeacher) {
      selectTeacher.addEventListener('change', (e) => {
        this.state.selectedTeacherId = e.target.value;
        const teacher = DB.getTeachers().find(t => t.id === this.state.selectedTeacherId);
        if (teacher && teacher.className) {
          this.state.selectedClass = teacher.className;
        }
        this.loadSavedRecords();
        this.render(this.container);
      });
    }

    // Class select handler
    if (selectClass) {
      selectClass.addEventListener('change', (e) => {
        this.state.selectedClass = e.target.value;
        // Update teacher select selection to match if they are responsible for this classroom
        const matchingTeacher = DB.getTeachers().find(t => t.className === this.state.selectedClass);
        this.state.selectedTeacherId = matchingTeacher ? matchingTeacher.id : '';
        this.loadSavedRecords();
        this.render(this.container);
      });
    }

    // Search input handler
    if (inputSearch) {
      inputSearch.addEventListener('input', (e) => {
        this.state.searchQuery = e.target.value;
        const students = DB.getStudentsByClass(this.state.selectedClass);
        checkerList.innerHTML = this.renderStudentList(students);
      });
    }

    // Check all present action
    if (btnCheckAll) {
      btnCheckAll.addEventListener('click', () => {
        const students = DB.getStudentsByClass(this.state.selectedClass);
        if (students.length === 0) return;

        students.forEach(s => {
          this.state.records[s.id] = 'present';
        });

        // Re-render list & update stats
        this.render(this.container);
        
        // Dispatch custom global success notification
        window.dispatchEvent(new CustomEvent('app-toast', {
          detail: { type: 'success', message: `ทำเครื่องหมาย "มาเรียน" สำหรับนักเรียนทุกคนในห้อง ${this.state.selectedClass}` }
        }));
      });
    }

    // Save attendance button
    if (btnSave) {
      btnSave.addEventListener('click', () => {
        const students = DB.getStudentsByClass(this.state.selectedClass);
        if (students.length === 0) return;

        // Verify if all students checked
        const unchecked = students.filter(s => !this.state.records[s.id]);
        if (unchecked.length > 0) {
          if (!confirm(`ยังเช็คไม่ครบถ้วน (เหลืออีก ${unchecked.length} คน) ยืนยันบันทึกข้อมูลหรือไม่?`)) {
            return;
          }
        }

        // Identify current checkedBy teacher
        const currentTeacher = DB.getTeachers().find(t => t.id === this.state.selectedTeacherId);
        const checkedBy = currentTeacher ? currentTeacher.name : 'ไม่ได้เลือกคุณครูผู้บันทึก';

        DB.saveAttendance(
          this.state.selectedDate,
          this.state.selectedClass,
          this.state.records,
          checkedBy
        );

        window.dispatchEvent(new CustomEvent('app-toast', {
          detail: { type: 'success', message: `บันทึกข้อมูลการเช็คชื่อ ห้อง ${this.state.selectedClass} ประจำวันที่ ${this.state.selectedDate} เรียบร้อยแล้ว` }
        }));
      });
    }

    // Status button click interaction delegator
    if (checkerList) {
      checkerList.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-status');
        if (!btn) return;

        const row = btn.closest('.student-row');
        const studentId = row.dataset.id;
        const status = btn.dataset.status;

        // Toggle state: if clicked active status, keep it, otherwise set it
        const currentStatus = this.state.records[studentId];
        
        // Remove active class from siblings in UI
        const siblings = btn.parentElement.querySelectorAll('.btn-status');
        siblings.forEach(s => s.classList.remove('active'));

        if (currentStatus === status) {
          // If already selected, clear it (allow unchecking)
          delete this.state.records[studentId];
        } else {
          // Set new status
          this.state.records[studentId] = status;
          btn.classList.add('active');
        }

        // Live update stats on top bar
        this.updateStatsInUI();
      });
    }
  }
};
