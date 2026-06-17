/**
 * Application Entry & Router - Student Attendance Web App
 */


// SVG Icons for Theme Toggle
const ICONS = {
  SUN: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
  MOON: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`
};

const App = {
  views: {
    checker: Checker,
    daily: Daily,
    manage: Manage
  },
  
  contentContainer: null,
  sidebar: null,

  init() {
    this.contentContainer = document.getElementById('app-content');
    this.sidebar = document.getElementById('app-sidebar');

    // 1. Setup Theme Manager
    this.initTheme();

    // 2. Setup Routing
    this.initRouter();

    // 3. Setup Navigation Event Listeners
    this.initSidebarNavigation();

    // 4. Setup Mobile Navigation drawer
    this.initMobileNavigation();

    // 5. Setup Toast Notification Listener
    this.initToastListener();
  },

  // ==========================================
  // ROUTING & VIEW CONTROLLER
  // ==========================================
  initRouter() {
    const handleRoute = () => {
      // Get current hash, stripping the '#' character. Default to 'checker'
      const hash = window.location.hash.slice(1) || 'checker';
      
      // Load relevant view
      const view = this.views[hash];
      if (view) {
        // Update sidebar visual active item class
        this.updateActiveNavLink(hash);
        
        // Render view
        try {
          view.render(this.contentContainer);
        } catch (error) {
          console.error(`Error rendering view: ${hash}`, error);
          this.contentContainer.innerHTML = `
            <div class="glass-card" style="padding: 40px; text-align: center; color: var(--text-muted);">
              <h3>เกิดข้อผิดพลาดในการโหลดหน้านี้</h3>
              <p>${error.message}</p>
            </div>
          `;
        }
      } else {
        // Fallback for invalid route
        window.location.hash = '#checker';
      }
    };

    // Listen to hash changes or refresh page
    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('DOMContentLoaded', handleRoute);
  },

  updateActiveNavLink(activeView) {
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-item');
    navLinks.forEach(link => {
      if (link.dataset.view === activeView) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // On mobile, update title in top bar
    const mobileTitle = document.querySelector('.mobile-title');
    if (mobileTitle) {
      const activeLink = document.querySelector(`.sidebar-nav .nav-item[data-view="${activeView}"]`);
      if (activeLink) {
        mobileTitle.textContent = activeLink.querySelector('.nav-label').textContent;
      }
    }
  },

  initSidebarNavigation() {
    // Add click listener to links to automatically close the mobile sidebar drawer
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-item');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          this.sidebar.classList.remove('active');
        }
      });
    });
  },

  initMobileNavigation() {
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const menuClose = document.getElementById('mobile-menu-close');

    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        this.sidebar.classList.add('active');
      });
    }

    if (menuClose) {
      menuClose.addEventListener('click', () => {
        this.sidebar.classList.remove('active');
      });
    }

    // Close mobile drawer when clicking main content overlaying
    const mainContent = document.querySelector('.app-main');
    if (mainContent) {
      mainContent.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && this.sidebar.classList.contains('active')) {
          // Verify we aren't clicking the toggle button
          if (!e.target.closest('#mobile-menu-toggle')) {
            this.sidebar.classList.remove('active');
          }
        }
      });
    }
  },

  // ==========================================
  // THEME MANAGEMENT (Dark / Light Mode)
  // ==========================================
  initTheme() {
    const themeToggleDesktop = document.getElementById('theme-toggle');
    const themeToggleMobile = document.getElementById('theme-toggle-mobile');
    
    // Read saved theme from LocalStorage or default to system dark mode
    let theme = localStorage.getItem('attendance_theme');
    if (!theme) {
      theme = 'dark'; // Default premium look is dark mode
    }

    // Apply active theme to HTML tag
    document.documentElement.setAttribute('data-theme', theme);
    this.updateThemeUI(theme);

    const toggleThemeAction = () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('attendance_theme', newTheme);
      this.updateThemeUI(newTheme);

      // Toast notification for feedback
      this.showToast({
        type: 'success',
        message: `สลับเข้าสู่โหมด ${newTheme === 'dark' ? 'มืด' : 'สว่าง'} เรียบร้อยแล้ว`
      });
    };

    if (themeToggleDesktop) {
      themeToggleDesktop.addEventListener('click', toggleThemeAction);
    }
    
    if (themeToggleMobile) {
      themeToggleMobile.addEventListener('click', toggleThemeAction);
    }
  },

  updateThemeUI(theme) {
    const toggleDesktop = document.getElementById('theme-toggle');
    const toggleMobile = document.getElementById('theme-toggle-mobile');

    const iconHtml = theme === 'dark' ? ICONS.SUN : ICONS.MOON;
    const labelText = theme === 'dark' ? 'โหมดสว่าง' : 'โหมดมืด';

    if (toggleDesktop) {
      const iconSpan = toggleDesktop.querySelector('.theme-icon');
      const labelSpan = toggleDesktop.querySelector('.theme-label');
      if (iconSpan) iconSpan.innerHTML = iconHtml;
      if (labelSpan) labelSpan.textContent = labelText;
    }

    if (toggleMobile) {
      toggleMobile.innerHTML = iconHtml;
    }
  },

  // ==========================================
  // TOAST SYSTEM (Event Driven)
  // ==========================================
  initToastListener() {
    // Listen to custom global events dispatched from views
    window.addEventListener('app-toast', (e) => {
      if (e.detail) {
        this.showToast(e.detail);
      }
    });
  },

  showToast({ type = 'success', message = '', duration = 3000 }) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // SVG icons depending on type
    const icon = type === 'success' 
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>`;

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Fadeout and remove toast
    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
      toast.addEventListener('animationend', () => {
        toast.remove();
      });
    }, duration);
  }
};

// Start application
App.init();
