window.Daily = {
  state: {
    selectedClass: '',
    selectedDate: new Date().toISOString().split('T')[0]
  },

  render(container) {
    this.container = container;
    
    const classes = DB.getClassrooms();
    const teachers = DB.getTeachers();

    // If there is no data in system yet
    if (classes.length === 0) {
      this.renderEmptyState();
      return;
    }

    if (!this.state.selectedClass && classes.length > 0) {
      this.state.selectedClass = classes[0];
    }

    const students = DB.getStudentsByClass(this.state.selectedClass);
    const attendanceRecord = DB.getAttendance(this.state.selectedDate, this.state.selectedClass);
    const stats = DB.getDailyStats(this.state.selectedDate, this.state.selectedClass);

    // Calculate rates
    const presentRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
    const lateRate = stats.total > 0 ? Math.round((stats.late / stats.total) * 100) : 0;
    const leaveRate = stats.total > 0 ? Math.round((stats.leave / stats.total) * 100) : 0;
    const absentRate = stats.total > 0 ? Math.round((stats.absent / stats.total) * 100) : 0;
    const checkStatusText = attendanceRecord ? `เช็คข้อมูลแล้วโดย ${attendanceRecord.checkedBy}` : 'ยังไม่ได้บันทึกข้อมูลสำหรับวันนี้';

    let html = `
      <div class="page-header">
        <div class="page-title">
          <h2>รายงานสรุปรายวัน</h2>
          <p>ดูสถิติและสถานะการเช็คชื่อรายวันแยกตามชั้นเรียน</p>
        </div>
        <div class="page-actions">
          <button id="btn-print-report" class="btn-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
            พิมพ์รายงาน
          </button>
        </div>
      </div>

      <!-- Selectors Controls -->
      <div class="glass-card controls-card">
        <div style="display: flex; gap: 12px; flex-wrap: wrap; flex: 1; align-items: center;">
          <div class="form-group" style="min-width: 140px;">
            <select id="daily-select-class" class="form-select">
              ${classes.map(c => `
                <option value="${c}" ${this.state.selectedClass === c ? 'selected' : ''}>ห้อง ${c}</option>
              `).join('')}
            </select>
          </div>
          
          <div class="form-group" style="flex-direction: row; align-items: center; gap: 8px;">
            <label for="daily-date" style="font-weight: 500; font-size: 0.95rem; white-space: nowrap;">วันที่รายงาน:</label>
            <input type="date" id="daily-date" class="form-input" value="${this.state.selectedDate}" max="${new Date().toISOString().split('T')[0]}" style="padding: 8px 12px; font-size: 0.9rem;">
          </div>
        </div>

        <div style="font-size: 0.9rem; color: var(--text-muted); text-align: right;">
          <span style="font-weight: 500; display: block;">ห้อง ${this.state.selectedClass}</span>
          <span>${checkStatusText}</span>
        </div>
      </div>

      <!-- Stats Summary Panel -->
      <div class="stats-grid">
        <div class="glass-card stat-card present">
          <div class="stat-icon">มา</div>
          <div class="stat-info">
            <span class="stat-value">${stats.present}</span>
            <span class="stat-label">คน (${presentRate}%)</span>
          </div>
        </div>
        <div class="glass-card stat-card late">
          <div class="stat-icon">สาย</div>
          <div class="stat-info">
            <span class="stat-value">${stats.late}</span>
            <span class="stat-label">คน (${lateRate}%)</span>
          </div>
        </div>
        <div class="glass-card stat-card leave">
          <div class="stat-icon">ลา</div>
          <div class="stat-info">
            <span class="stat-value">${stats.leave}</span>
            <span class="stat-label">คน (${leaveRate}%)</span>
          </div>
        </div>
        <div class="glass-card stat-card absent">
          <div class="stat-icon">ขาด</div>
          <div class="stat-info">
            <span class="stat-value">${stats.absent}</span>
            <span class="stat-label">คน (${absentRate}%)</span>
          </div>
        </div>
      </div>

      <!-- Dashboard grid with stats progress bars and individual student list -->
      <div class="dashboard-layout">
        <!-- Student Daily Record List -->
        <div class="glass-card" style="display: flex; flex-direction: column; gap: 16px;">
          <h3 style="font-size: 1.15rem; font-weight: 600;">รายละเอียดสถานะนักเรียนรายบุคคล</h3>
          
          ${students.length === 0 ? `
            <div class="empty-state">
              <p>ไม่มีรายชื่อนักเรียนในห้องนี้</p>
            </div>
          ` : `
            <div class="data-table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th width="90">เลขที่</th>
                    <th>ชื่อ - นามสกุล</th>
                    <th width="150" style="text-align: center;">สถานะการมาเรียน</th>
                  </tr>
                </thead>
                <tbody>
                  ${students.map(student => {
                    const status = attendanceRecord?.records[student.id];
                    let statusLabel = '<span style="color: var(--text-muted)">ยังไม่ได้เช็ค</span>';
                    
                    if (status === 'present') {
                      statusLabel = `<span style="color: hsl(var(--color-present)); font-weight: 500;">✓ มาเรียน</span>`;
                    } else if (status === 'late') {
                      statusLabel = `<span style="color: hsl(var(--color-late)); font-weight: 500;">⏰ สาย</span>`;
                    } else if (status === 'leave') {
                      statusLabel = `<span style="color: hsl(var(--color-leave)); font-weight: 500;">✉ ลา</span>`;
                    } else if (status === 'absent') {
                      statusLabel = `<span style="color: hsl(var(--color-absent)); font-weight: 500; text-decoration: underline;">✗ ขาดเรียน</span>`;
                    }

                    return `
                      <tr>
                        <td style="font-weight: 600; color: var(--text-muted);">เลขที่ ${student.rollNumber}</td>
                        <td style="font-weight: 500;">${student.name}</td>
                        <td align="center">${statusLabel}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- Custom visual charts card -->
        <div class="glass-card chart-card">
          <h3 class="chart-header">สัดส่วนการเข้าเรียน</h3>
          
          <div class="progress-list">
            <div class="progress-item">
              <div class="progress-item-header">
                <span>มาเรียน (${stats.present}/${stats.total})</span>
                <span style="font-weight: 600; color: hsl(var(--color-present));">${presentRate}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill present" style="width: ${presentRate}%;"></div>
              </div>
            </div>
            
            <div class="progress-item">
              <div class="progress-item-header">
                <span>สาย (${stats.late}/${stats.total})</span>
                <span style="font-weight: 600; color: hsl(var(--color-late));">${lateRate}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill late" style="width: ${lateRate}%;"></div>
              </div>
            </div>
            
            <div class="progress-item">
              <div class="progress-item-header">
                <span>ลา (${stats.leave}/${stats.total})</span>
                <span style="font-weight: 600; color: hsl(var(--color-leave));">${leaveRate}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill leave" style="width: ${leaveRate}%;"></div>
              </div>
            </div>
            
            <div class="progress-item">
              <div class="progress-item-header">
                <span>ขาดเรียน (${stats.absent}/${stats.total})</span>
                <span style="font-weight: 600; color: hsl(var(--color-absent));">${absentRate}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill absent" style="width: ${absentRate}%;"></div>
              </div>
            </div>
          </div>

          <div style="margin-top: 32px; border-top: 1px solid var(--border-color); padding-top: 20px; font-size: 0.9rem; color: var(--text-muted);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>นักเรียนทั้งหมด:</span>
              <span style="font-weight: 600; color: var(--text-main);">${stats.total} คน</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>เช็คชื่อแล้ว:</span>
              <span style="font-weight: 600; color: var(--text-main);">${stats.total - stats.unchecked} คน</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>คิดเป็นเปอร์เซ็นต์:</span>
              <span style="font-weight: 600; color: var(--primary);">${stats.checkedPercent}%</span>
            </div>
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.bindEvents();
  },

  renderEmptyState() {
    this.container.innerHTML = `
      <div class="glass-card empty-state" style="margin-top: 40px;">
        <div class="empty-state-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M17 14h-6v6"/></svg>
        </div>
        <h3>ไม่พบข้อมูลสรุปรายวัน</h3>
        <p>ยังไม่มีการระบุห้องเรียน หรือไม่มีนักเรียนในระบบ กรุณาจัดการเพิ่มข้อมูลในระบบก่อนดูรายงาน</p>
        <button id="btn-go-to-manage-daily" class="btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
          ไปที่หน้าจัดการข้อมูล
        </button>
      </div>
    `;

    const btnGo = this.container.querySelector('#btn-go-to-manage-daily');
    if (btnGo) {
      btnGo.addEventListener('click', () => {
        window.location.hash = '#manage';
      });
    }
  },

  bindEvents() {
    const selectClass = this.container.querySelector('#daily-select-class');
    const inputDate = this.container.querySelector('#daily-date');
    const btnPrint = this.container.querySelector('#btn-print-report');

    if (selectClass) {
      selectClass.addEventListener('change', (e) => {
        this.state.selectedClass = e.target.value;
        this.render(this.container);
      });
    }

    if (inputDate) {
      inputDate.addEventListener('change', (e) => {
        this.state.selectedDate = e.target.value;
        this.render(this.container);
      });
    }

    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        window.print();
      });
    }
  }
};
