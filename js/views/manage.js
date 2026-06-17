window.Manage = {
  state: {
    activeTab: 'students', // 'students' | 'teachers'
    selectedClassFilter: '',
    editingStudent: null, // If not null, we are editing this student object
    editingTeacher: null  // If not null, we are editing this teacher object
  },

  render(container) {
    this.container = container;
    const classes = DB.getClassrooms();

    // Default select class filter if not set
    if (!this.state.selectedClassFilter && classes.length > 0) {
      this.state.selectedClassFilter = classes[0];
    }

    let html = `
      <div class="page-header">
        <div class="page-title">
          <h2>จัดการข้อมูลระบบ</h2>
          <p>จัดการข้อมูลคุณครูประจำชั้น รายชื่อนักเรียน หรือนำเข้ารายชื่อผ่านไฟล์ CSV</p>
        </div>
        <div class="page-actions">
          <!-- Tab selectors -->
          <div style="background: var(--border-color); padding: 4px; border-radius: var(--radius-md); display: flex; gap: 4px;">
            <button id="tab-students" class="btn-primary" style="${this.state.activeTab === 'students' ? '' : 'background: transparent; color: var(--text-main); box-shadow: none;'} padding: 8px 16px;">นักเรียน</button>
            <button id="tab-teachers" class="btn-primary" style="${this.state.activeTab === 'teachers' ? '' : 'background: transparent; color: var(--text-main); box-shadow: none;'} padding: 8px 16px;">คุณครู</button>
          </div>
        </div>
      </div>

      ${this.state.activeTab === 'students' ? this.renderStudentsSection(classes) : this.renderTeachersSection(classes)}
      
      <!-- Modals will be appended here dynamically on trigger -->
      <div id="modal-wrapper"></div>
    `;

    this.container.innerHTML = html;
    this.bindEvents();
  },

  renderStudentsSection(classes) {
    const students = DB.getStudentsByClass(this.state.selectedClassFilter);
    
    // Generate BOM UTF-8 CSV template
    const csvContent = "เลขที่,ชื่อ-นามสกุล\n1,นายสมชาย ใจดี\n2,เด็กหญิงสมศรี รักเรียน\n3,นายสมศักดิ์ รักสงบ\n";
    const csvDataUri = 'data:text/csv;charset=utf-8,%EF%BB%BF' + encodeURIComponent(csvContent);

    return `
      <div class="manage-grid">
        <!-- Left panel: CSV Upload Zone and Quick Add Student -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <!-- CSV Upload Zone -->
          <div class="glass-card">
            <h3 style="font-size: 1.15rem; font-weight: 600; margin-bottom: 8px;">นำเข้ารายชื่อด้วยไฟล์ CSV</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 20px;">
              อัปโหลดรายชื่อนักเรียนสำหรับห้องเรียนที่เลือกอย่างรวดเร็ว (รองรับภาษาไทย)
            </p>
            
            <div class="form-group" style="margin-bottom: 16px;">
              <label for="csv-target-class" style="font-weight: 500;">ห้องเรียนที่จะนำเข้า:</label>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="csv-target-class" class="form-input" placeholder="เช่น ม.3/1" value="${this.state.selectedClassFilter}" style="flex: 1;">
                <span style="font-size: 0.85rem; color: var(--text-muted); align-self: center;">(ระบุห้องเรียน)</span>
              </div>
            </div>

            <div id="csv-dropzone" class="csv-upload-zone">
              <div class="csv-upload-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              </div>
              <p style="font-weight: 500;">ลากไฟล์ CSV มาวางที่นี่ หรือคลิกเพื่ออัปโหลด</p>
              <span style="font-size: 0.8rem; color: var(--text-muted);">ต้องระบุ เลขที่ และ ชื่อ-นามสกุล คั่นด้วยเครื่องหมายจุลภาค (,)</span>
              <a href="${csvDataUri}" download="ตัวอย่างรายชื่อนักเรียน.csv" class="csv-template-link" id="link-download-csv">ดาวน์โหลดตัวอย่างไฟล์ CSV</a>
              <input type="file" id="csv-file-input" accept=".csv,text/csv" style="display: none;">
            </div>
          </div>

          <!-- Quick Add Manual Form -->
          <div class="glass-card">
            <h3 style="font-size: 1.15rem; font-weight: 600; margin-bottom: 16px;">เพิ่มนักเรียนด้วยตนเอง</h3>
            <form id="form-quick-add-student" style="display: flex; flex-direction: column; gap: 14px;">
              <div class="form-group">
                <label for="student-new-name">ชื่อ - นามสกุล นักเรียน:</label>
                <input type="text" id="student-new-name" class="form-input" placeholder="สมชาย ใจดี" required>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                  <label for="student-new-class">ชั้น/ห้อง:</label>
                  <input type="text" id="student-new-class" class="form-input" placeholder="ม.3/1" value="${this.state.selectedClassFilter}" required>
                </div>
                <div class="form-group">
                  <label for="student-new-roll">เลขที่:</label>
                  <input type="number" id="student-new-roll" class="form-input" placeholder="เช่น 1" min="1">
                </div>
              </div>
              <button type="submit" class="btn-primary" style="justify-content: center; margin-top: 8px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                เพิ่มนักเรียนรายคน
              </button>
            </form>
          </div>
        </div>

        <!-- Right panel: Student List table with filter -->
        <div class="glass-card" style="display: flex; flex-direction: column; gap: 16px;">
          <div class="manage-section-header">
            <h3 class="manage-section-title">รายชื่อนักเรียน</h3>
            <!-- Class Selector Filter -->
            <div class="form-group" style="flex-direction: row; align-items: center; gap: 8px; margin-bottom: 0;">
              <label for="filter-class" style="font-weight: 500; font-size: 0.9rem; white-space: nowrap;">ห้องเรียน:</label>
              <select id="filter-class" class="form-select" style="padding: 6px 32px 6px 12px; font-size: 0.85rem;">
                <option value="" disabled ${!this.state.selectedClassFilter ? 'selected' : ''}>-- เลือกห้อง --</option>
                ${classes.map(c => `
                  <option value="${c}" ${this.state.selectedClassFilter === c ? 'selected' : ''}>ห้อง ${c}</option>
                `).join('')}
              </select>
            </div>
          </div>

          ${students.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
              </div>
              <h3>ยังไม่มีนักเรียนในห้องนี้</h3>
              <p>กรุณากรอกฟอร์มทางด้านซ้ายเพื่อเพิ่ม หรือลากไฟล์รายชื่อ (CSV) เพื่อนำเข้าข้อมูล</p>
            </div>
          ` : `
            <div class="data-table-wrapper" style="max-height: 480px; overflow-y: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th width="80">เลขที่</th>
                    <th>ชื่อ - นามสกุล</th>
                    <th width="100">ชั้น/ห้อง</th>
                    <th width="100" style="text-align: right;">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  ${students.map(s => `
                    <tr data-id="${s.id}">
                      <td style="font-weight: 600; color: var(--text-muted);">เลขที่ ${s.rollNumber}</td>
                      <td style="font-weight: 500;">${s.name}</td>
                      <td>ห้อง ${s.className}</td>
                      <td align="right">
                        <div class="actions-cell">
                          <button class="btn-table-action edit-student" title="แก้ไข">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                          </button>
                          <button class="btn-table-action delete delete-student" title="ลบ">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;
  },

  renderTeachersSection(classes) {
    const teachers = DB.getTeachers();

    return `
      <div class="manage-grid">
        <!-- Left Panel: Add Teacher -->
        <div class="glass-card" style="height: fit-content;">
          <h3 style="font-size: 1.15rem; font-weight: 600; margin-bottom: 16px;">เพิ่มคุณครูประจำชั้น</h3>
          <form id="form-quick-add-teacher" style="display: flex; flex-direction: column; gap: 14px;">
            <div class="form-group">
              <label for="teacher-new-name">ชื่อ - นามสกุล คุณครู:</label>
              <input type="text" id="teacher-new-name" class="form-input" placeholder="คุณครูใจดี มีสุข" required>
            </div>
            <div class="form-group">
              <label for="teacher-new-class">ห้องเรียนที่รับผิดชอบ (ห้องประจำชั้น):</label>
              <input type="text" id="teacher-new-class" class="form-input" placeholder="ม.3/1" required>
              <span style="font-size: 0.8rem; color: var(--text-muted);">
                *คุณครู 1 ท่านสามารถเป็นครูประจำชั้นได้ 1 ห้องเรียน
              </span>
            </div>
            <button type="submit" class="btn-primary" style="justify-content: center; margin-top: 8px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
              เพิ่มข้อมูลคุณครู
            </button>
          </form>
        </div>

        <!-- Right Panel: Teacher List table -->
        <div class="glass-card" style="display: flex; flex-direction: column; gap: 16px;">
          <h3 class="manage-section-title" style="margin-bottom: 4px;">รายชื่อคุณครูประจำชั้น</h3>
          
          ${teachers.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
              </div>
              <h3>ยังไม่มีข้อมูลคุณครูในระบบ</h3>
              <p>กรุณากรอกฟอร์มทางด้านซ้ายเพื่อเพิ่มข้อมูลคุณครู</p>
            </div>
          ` : `
            <div class="data-table-wrapper" style="max-height: 480px; overflow-y: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>ชื่อ - นามสกุล คุณครู</th>
                    <th>ห้องเรียนประจำชั้น</th>
                    <th width="100" style="text-align: right;">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  ${teachers.map(t => `
                    <tr data-id="${t.id}">
                      <td style="font-weight: 500;">${t.name}</td>
                      <td style="font-weight: 600; color: var(--primary);">ห้อง ${t.className}</td>
                      <td align="right">
                        <div class="actions-cell">
                          <button class="btn-table-action edit-teacher" title="แก้ไข">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                          </button>
                          <button class="btn-table-action delete delete-teacher" title="ลบ">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;
  },

  showEditStudentModal(student) {
    this.state.editingStudent = student;
    const modalWrapper = this.container.querySelector('#modal-wrapper');

    modalWrapper.innerHTML = `
      <div class="modal-overlay active" id="edit-student-modal-overlay">
        <div class="modal-container">
          <div class="modal-header">
            <h3>แก้ไขข้อมูลนักเรียน</h3>
            <button class="btn-icon" id="btn-close-student-modal">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="edit-student-name">ชื่อ - นามสกุล:</label>
              <input type="text" id="edit-student-name" class="form-input" value="${student.name}" required>
            </div>
            <div class="form-group">
              <label for="edit-student-class">ชั้น/ห้อง:</label>
              <input type="text" id="edit-student-class" class="form-input" value="${student.className}" required>
            </div>
            <div class="form-group">
              <label for="edit-student-roll">เลขที่:</label>
              <input type="number" id="edit-student-roll" class="form-input" value="${student.rollNumber}" required>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" id="btn-cancel-student-modal">ยกเลิก</button>
            <button class="btn-primary" id="btn-submit-student-modal">บันทึกการแก้ไข</button>
          </div>
        </div>
      </div>
    `;

    // Modal Events
    const overlay = modalWrapper.querySelector('#edit-student-modal-overlay');
    const btnClose = modalWrapper.querySelector('#btn-close-student-modal');
    const btnCancel = modalWrapper.querySelector('#btn-cancel-student-modal');
    const btnSubmit = modalWrapper.querySelector('#btn-submit-student-modal');

    const closeModal = () => {
      overlay.classList.remove('active');
      this.state.editingStudent = null;
      modalWrapper.innerHTML = '';
    };

    btnClose.addEventListener('click', closeModal);
    btnCancel.addEventListener('click', closeModal);
    
    // Close modal when clicking background
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    btnSubmit.addEventListener('click', () => {
      const name = modalWrapper.querySelector('#edit-student-name').value.trim();
      const className = modalWrapper.querySelector('#edit-student-class').value.trim();
      const rollNumber = modalWrapper.querySelector('#edit-student-roll').value.trim();

      if (!name || !className || !rollNumber) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
      }

      const updated = DB.updateStudent(student.id, name, className, rollNumber);
      if (updated) {
        // If the classroom filter changes, we might need to adjust filter class selection
        this.state.selectedClassFilter = className;
        closeModal();
        this.render(this.container);
        
        window.dispatchEvent(new CustomEvent('app-toast', {
          detail: { type: 'success', message: `แก้ไขข้อมูลนักเรียน "${name}" เรียบร้อยแล้ว` }
        }));
      }
    });
  },

  showEditTeacherModal(teacher) {
    this.state.editingTeacher = teacher;
    const modalWrapper = this.container.querySelector('#modal-wrapper');

    modalWrapper.innerHTML = `
      <div class="modal-overlay active" id="edit-teacher-modal-overlay">
        <div class="modal-container">
          <div class="modal-header">
            <h3>แก้ไขข้อมูลคุณครูประจำชั้น</h3>
            <button class="btn-icon" id="btn-close-teacher-modal">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="edit-teacher-name">ชื่อ - นามสกุล:</label>
              <input type="text" id="edit-teacher-name" class="form-input" value="${teacher.name}" required>
            </div>
            <div class="form-group">
              <label for="edit-teacher-class">ห้องเรียนที่รับผิดชอบ (ห้องประจำชั้น):</label>
              <input type="text" id="edit-teacher-class" class="form-input" value="${teacher.className}" required>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" id="btn-cancel-teacher-modal">ยกเลิก</button>
            <button class="btn-primary" id="btn-submit-teacher-modal">บันทึกการแก้ไข</button>
          </div>
        </div>
      </div>
    `;

    // Modal Events
    const overlay = modalWrapper.querySelector('#edit-teacher-modal-overlay');
    const btnClose = modalWrapper.querySelector('#btn-close-teacher-modal');
    const btnCancel = modalWrapper.querySelector('#btn-cancel-teacher-modal');
    const btnSubmit = modalWrapper.querySelector('#btn-submit-teacher-modal');

    const closeModal = () => {
      overlay.classList.remove('active');
      this.state.editingTeacher = null;
      modalWrapper.innerHTML = '';
    };

    btnClose.addEventListener('click', closeModal);
    btnCancel.addEventListener('click', closeModal);
    
    // Close modal when clicking background
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    btnSubmit.addEventListener('click', () => {
      const name = modalWrapper.querySelector('#edit-teacher-name').value.trim();
      const className = modalWrapper.querySelector('#edit-teacher-class').value.trim();

      if (!name || !className) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
      }

      const updated = DB.updateTeacher(teacher.id, name, className);
      if (updated) {
        closeModal();
        this.render(this.container);
        
        window.dispatchEvent(new CustomEvent('app-toast', {
          detail: { type: 'success', message: `แก้ไขข้อมูลคุณครู "${name}" เรียบร้อยแล้ว` }
        }));
      }
    });
  },

  handleCSVFile(file, className) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const result = DB.importStudentsFromCSV(text, className);
      
      if (result.success) {
        this.state.selectedClassFilter = className;
        this.render(this.container);
        
        window.dispatchEvent(new CustomEvent('app-toast', {
          detail: { type: 'success', message: result.message }
        }));
      } else {
        window.dispatchEvent(new CustomEvent('app-toast', {
          detail: { type: 'error', message: result.message }
        }));
      }
    };
    reader.readAsText(file, 'UTF-8');
  },

  bindEvents() {
    // Tab switching buttons
    const tabStudents = this.container.querySelector('#tab-students');
    const tabTeachers = this.container.querySelector('#tab-teachers');

    if (tabStudents) {
      tabStudents.addEventListener('click', () => {
        this.state.activeTab = 'students';
        this.render(this.container);
      });
    }

    if (tabTeachers) {
      tabTeachers.addEventListener('click', () => {
        this.state.activeTab = 'teachers';
        this.render(this.container);
      });
    }

    // ==========================================
    // STUDENTS TAB EVENT HANDLERS
    // ==========================================
    if (this.state.activeTab === 'students') {
      const selectFilterClass = this.container.querySelector('#filter-class');
      const formAddStudent = this.container.querySelector('#form-quick-add-student');
      const dropzone = this.container.querySelector('#csv-dropzone');
      const fileInput = this.container.querySelector('#csv-file-input');
      const targetClassInput = this.container.querySelector('#csv-target-class');

      // Dropdown filter change
      if (selectFilterClass) {
        selectFilterClass.addEventListener('change', (e) => {
          this.state.selectedClassFilter = e.target.value;
          this.render(this.container);
        });
      }

      // Add manual student
      if (formAddStudent) {
        formAddStudent.addEventListener('submit', (e) => {
          e.preventDefault();
          const name = this.container.querySelector('#student-new-name').value;
          const className = this.container.querySelector('#student-new-class').value;
          const rollNumber = this.container.querySelector('#student-new-roll').value;

          const newStudent = DB.addStudent(name, className, rollNumber);
          if (newStudent) {
            this.state.selectedClassFilter = className;
            this.render(this.container);
            
            window.dispatchEvent(new CustomEvent('app-toast', {
              detail: { type: 'success', message: `เพิ่มข้อมูลของ ${name} (เลขที่ ${newStudent.rollNumber}) ลงในห้อง ${className} สำเร็จ` }
            }));
          }
        });
      }

      // CSV file input trigger
      if (dropzone && fileInput && targetClassInput) {
        dropzone.addEventListener('click', (e) => {
          // Prevent trigger if they click the template download link
          if (e.target.id === 'link-download-csv') return;
          fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          const className = targetClassInput.value.trim();
          if (!className) {
            alert('กรุณาระบุชั้นเรียนที่จะนำเข้าก่อนอัปโหลดไฟล์');
            fileInput.value = '';
            return;
          }
          this.handleCSVFile(file, className);
        });

        // Drag & drop handlers
        dropzone.addEventListener('dragover', (e) => {
          e.preventDefault();
          dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => {
          dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (e) => {
          e.preventDefault();
          dropzone.classList.remove('dragover');
          const file = e.dataTransfer.files[0];
          const className = targetClassInput.value.trim();
          if (!className) {
            alert('กรุณาระบุชั้นเรียนที่จะนำเข้าก่อนอัปโหลดไฟล์');
            return;
          }
          this.handleCSVFile(file, className);
        });
      }

      // Edit / Delete student handlers inside list table
      const studentTable = this.container.querySelector('.data-table');
      if (studentTable) {
        studentTable.addEventListener('click', (e) => {
          const row = e.target.closest('tr');
          if (!row) return;

          const studentId = row.dataset.id;
          const student = DB.getStudents().find(s => s.id === studentId);
          if (!student) return;

          if (e.target.closest('.edit-student')) {
            this.showEditStudentModal(student);
          } else if (e.target.closest('.delete-student')) {
            if (confirm(`คุณต้องการลบข้อมูลของ "${student.name}" (ห้อง ${student.className}) หรือไม่? ข้อมูลการเช็คชื่อเดิมจะยังอยู่แต่รายชื่อจะถูกนำออกจากห้องเรียน`)) {
              DB.deleteStudent(studentId);
              this.render(this.container);
              window.dispatchEvent(new CustomEvent('app-toast', {
                detail: { type: 'success', message: `ลบรายชื่อนักเรียนเรียบร้อยแล้ว` }
              }));
            }
          }
        });
      }
    }

    // ==========================================
    // TEACHERS TAB EVENT HANDLERS
    // ==========================================
    if (this.state.activeTab === 'teachers') {
      const formAddTeacher = this.container.querySelector('#form-quick-add-teacher');

      // Add teacher form submit
      if (formAddTeacher) {
        formAddTeacher.addEventListener('submit', (e) => {
          e.preventDefault();
          const name = this.container.querySelector('#teacher-new-name').value;
          const className = this.container.querySelector('#teacher-new-class').value;

          // Check if classroom is already managed by someone else
          const duplicate = DB.getTeachers().find(t => t.className === className.trim());
          if (duplicate) {
            if (!confirm(`ห้องเรียน ${className} มีคุณครู "${duplicate.name}" เป็นผู้ดูแลอยู่แล้ว ยืนยันที่จะตั้งคุณครูประจำชั้นซ้ำหรือไม่?`)) {
              return;
            }
          }

          const newTeacher = DB.addTeacher(name, className);
          if (newTeacher) {
            this.render(this.container);
            window.dispatchEvent(new CustomEvent('app-toast', {
              detail: { type: 'success', message: `เพิ่มรายชื่อคุณครู "${name}" ผู้ดูแลห้อง ${className} เรียบร้อยแล้ว` }
            }));
          }
        });
      }

      // Edit / Delete teacher handlers
      const teacherTable = this.container.querySelector('.data-table');
      if (teacherTable) {
        teacherTable.addEventListener('click', (e) => {
          const row = e.target.closest('tr');
          if (!row) return;

          const teacherId = row.dataset.id;
          const teacher = DB.getTeachers().find(t => t.id === teacherId);
          if (!teacher) return;

          if (e.target.closest('.edit-teacher')) {
            this.showEditTeacherModal(teacher);
          } else if (e.target.closest('.delete-teacher')) {
            if (confirm(`คุณต้องการลบข้อมูลคุณครูประจำชั้น "${teacher.name}" หรือไม่?`)) {
              DB.deleteTeacher(teacherId);
              this.render(this.container);
              window.dispatchEvent(new CustomEvent('app-toast', {
                detail: { type: 'success', message: `ลบรายชื่อคุณครูเรียบร้อยแล้ว` }
              }));
            }
          }
        });
      }
    }
  }
};
