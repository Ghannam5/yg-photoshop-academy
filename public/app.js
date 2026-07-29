/**
 * YG Photoshop Academy — Master SPA Application Logic
 * Background Audio Auto-Stop + Full Lesson Edit, Hide/Show, Material & Delete Controls
 */

const API_BASE = '/api/v1';

const App = {
  state: {
    currentUser: null,
    token: localStorage.getItem('yg_token') || null,
    courses: [],
    currentCourse: null,
    currentLesson: null,
    enrolledCourses: [],
    isRegisterMode: false,
    adminStats: null,
    adminCodes: [],
    adminStudents: [],
    adminNotes: [],
    watermarkInterval: null,
    targetCourseId: null,
  },

  init() {
    console.log('🚀 YG Photoshop Academy SPA Initializing...');
    this.checkSavedAuth();
    this.loadCourses();
    this.initSecurityShield();
    this.initCursor();
  },

  initCursor() {
    const glow = document.getElementById('cursor-glow');
    const dot = document.getElementById('cursor-dot');
    if (!glow || !dot) return;

    let gx = window.innerWidth / 2, gy = window.innerHeight / 2;
    let tx = gx, ty = gy;

    window.addEventListener('mousemove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
      dot.style.transform = `translate(${tx}px, ${ty}px) translate(-50%, -50%)`;
    });

    const loop = () => {
      gx += (tx - gx) * 0.14;
      gy += (ty - gy) * 0.14;
      glow.style.transform = `translate(${gx}px, ${gy}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    };
    loop();
  },

  initSecurityShield() {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showToast('🔒 النقر الأيمن محظور لحماية محتوى الكورس المباشر', 'error');
      return false;
    });

    document.addEventListener('keydown', (e) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) ||
        (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.key === 'S' || e.key === 's'))
      ) {
        e.preventDefault();
        this.showToast('🔒 اختصارات التفتيش محظورة لحماية المحتوى', 'error');
        return false;
      }
    });
  },

  scrollToSection(sectionId) {
    this.showPage('home');
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  },

  // =========================================================================
  // COURSE THUMBNAIL CANVAS COMPRESSOR & UPLOADER
  // =========================================================================
  uploadCourseThumbnail(event) {
    const file = event.target.files[0];
    if (!file) return;

    this.showToast('جاري رفع وضغط صورة الغلاف...', 'info');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxWidth = 1000;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        document.getElementById('adminNewCourseThumb').value = compressedDataUrl;
        this.showToast('🖼️ تم رفع وضغط صورة الغلاف بنجاح وتعيينها للكورس!', 'success');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  // =========================================================================
  // WATERMARK SECURITY THAT FLOATS IN FULLSCREEN MODE TOO
  // =========================================================================
  startWatermarkDrift() {
    if (this.state.watermarkInterval) clearInterval(this.state.watermarkInterval);

    const mark = document.getElementById('videoWatermark');
    if (!mark) return;

    const email = this.state.currentUser?.email || 'student@ygacademy.com';
    const uid = (this.state.currentUser?.id || 'YG-9999').substring(0, 8);
    const now = new Date().toLocaleTimeString('ar-EG');
    mark.innerText = `YG-PROTECTED • ${email} • ID:${uid} • ${now}`;

    this.state.watermarkInterval = setInterval(() => {
      const playerBox = document.getElementById('protectedPlayerContainer');
      if (!playerBox) return;

      const maxX = Math.max(10, playerBox.clientWidth - 280);
      const maxY = Math.max(10, playerBox.clientHeight - 50);

      const randomX = Math.floor(Math.random() * maxX);
      const randomY = Math.floor(Math.random() * maxY);

      mark.style.top = `${randomY}px`;
      mark.style.left = `${randomX}px`;
    }, 3500);
  },

  toggleContainerFullscreen() {
    const container = document.getElementById('protectedPlayerContainer');
    if (!container) return;

    if (!document.fullscreenElement) {
      if (container.requestFullscreen) container.requestFullscreen();
      else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
      else if (container.msRequestFullscreen) container.msRequestFullscreen();
      this.showToast('⛶ تم تكبير الشاشة مع الحفاظ على العلامة المائية المحمية', 'info');
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  },

  // =========================================================================
  // AUTHENTICATION & SEPARATED NAVBAR TABS
  // =========================================================================
  async checkSavedAuth() {
    if (!this.state.token) {
      this.updateUserNav();
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${this.state.token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        this.state.currentUser = data.data;
        this.updateUserNav();
        await this.loadMyEnrollments();
      } else {
        this.logout();
      }
    } catch (err) {
      this.logout();
    }
  },

  toggleMobileMenu() {
    const drawer = document.getElementById('mobileMenuDrawer');
    if (drawer) {
      drawer.classList.toggle('hidden');
    }
  },

  updateUserNav() {
    const userNavArea = document.getElementById('userNavArea');
    const adminBtn = document.getElementById('navAdminBtn');
    const mobileAdminBtn = document.getElementById('mobileNavAdminBtn');
    const visitorNav = document.getElementById('visitorNav');
    const studentNav = document.getElementById('studentNav');
    const mobileVisitorNav = document.getElementById('mobileVisitorNav');
    const mobileStudentNav = document.getElementById('mobileStudentNav');

    if (this.state.currentUser) {
      const user = this.state.currentUser;
      const isAdmin = user.role === 'ADMIN';

      if (visitorNav) visitorNav.classList.add('hidden');
      if (mobileVisitorNav) mobileVisitorNav.classList.add('hidden');

      if (studentNav) studentNav.classList.remove('hidden');
      if (mobileStudentNav) mobileStudentNav.classList.remove('hidden');

      if (adminBtn) adminBtn.classList.toggle('hidden', !isAdmin);
      if (mobileAdminBtn) mobileAdminBtn.classList.toggle('hidden', !isAdmin);

      if (userNavArea) {
        userNavArea.innerHTML = `
          <div class="flex items-center gap-2 sm:gap-3">
            <div class="text-right hidden sm:block">
              <div class="text-xs font-extrabold text-white">${user.firstName || 'طالب'} ${user.lastName || ''}</div>
              <div class="text-[10px] text-[#08CB00] font-bold">${isAdmin ? '👑 أدمن' : '🎓 طالب'}</div>
            </div>
            <button onclick="App.logout()" class="btn btn-ghost text-xs py-1.5 px-3 sm:py-2 sm:px-4">خروج 🚪</button>
          </div>
        `;
      }
    } else {
      if (visitorNav) visitorNav.classList.remove('hidden');
      if (mobileVisitorNav) mobileVisitorNav.classList.remove('hidden');

      if (studentNav) studentNav.classList.add('hidden');
      if (mobileStudentNav) mobileStudentNav.classList.add('hidden');

      if (adminBtn) adminBtn.classList.add('hidden');
      if (mobileAdminBtn) mobileAdminBtn.classList.add('hidden');

      if (userNavArea) {
        userNavArea.innerHTML = `
          <button onclick="App.openAuthModal('login')" class="btn btn-ghost text-xs py-1.5 px-3 sm:py-2 sm:px-5">تسجيل الدخول</button>
          <button onclick="App.openAuthModal('register')" class="btn btn-primary text-xs py-1.5 px-3 sm:py-2 sm:px-6">حساب جديد ✨</button>
        `;
      }
    }

    this.renderCoursesGrid();
  },

  openAuthModal(mode = 'login') {
    this.state.isRegisterMode = mode === 'register';
    this.updateAuthModalUI();
    document.getElementById('authModal').classList.remove('hidden');
  },

  toggleAuthMode() {
    this.state.isRegisterMode = !this.state.isRegisterMode;
    this.updateAuthModalUI();
  },

  updateAuthModalUI() {
    const isReg = this.state.isRegisterMode;
    document.getElementById('authModalTitle').innerText = isReg ? 'إنشاء حساب طالب جديد' : 'تسجيل الدخول';
    document.getElementById('authSubmitBtn').innerText = isReg ? 'إنشاء الحساب الآن 🚀' : 'تسجيل الدخول 🚀';
    document.getElementById('authRegisterFields').classList.toggle('hidden', !isReg);
    document.getElementById('forgotPasswordLinkContainer').classList.toggle('hidden', isReg);
    document.getElementById('authToggleText').innerText = isReg ? 'لديك حساب بالفعل؟' : 'ليس لديك حساب؟';
    document.getElementById('authToggleBtn').innerText = isReg ? 'تسجيل الدخول' : 'إنشاء حساب جديد';
  },

  togglePasswordVisibility(inputId) {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.type = el.type === 'password' ? 'text' : 'password';
  },



  openForgotPasswordModal() {
    this.closeModal('authModal');
    document.getElementById('forgotPasswordStep1').classList.remove('hidden');
    document.getElementById('forgotPasswordStep2').classList.add('hidden');
    document.getElementById('forgotPasswordModal').classList.remove('hidden');
    document.getElementById('forgotEmailInput').focus();
  },

  async handleForgotPasswordSubmit() {
    const email = document.getElementById('forgotEmailInput').value.trim();
    if (!email) {
      this.showToast('يرجى كتابة البريد الإلكتروني المسجل', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        this.showToast('📧 تم إرسال رابط/كود استعادة كلمة المرور إلى بريدك الإلكتروني بنجاح!', 'success');
        document.getElementById('forgotPasswordStep1').classList.add('hidden');
        document.getElementById('forgotPasswordStep2').classList.remove('hidden');
      } else {
        const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
        this.showToast(msg || 'البريد غير مسجل لدينا', 'error');
      }
    } catch (err) {
      this.showToast('خطأ في الاتصال بالخدمة', 'error');
    }
  },

  async handleResetPasswordSubmit() {
    const token = document.getElementById('resetTokenInput').value.trim();
    const newPassword = document.getElementById('resetNewPasswordInput').value.trim();

    if (!token || !newPassword) {
      this.showToast('يرجى إدخال رمز الاستعادة وكلمة المرور الجديدة', 'error');
      return;
    }

    if (newPassword.length < 8) {
      this.showToast('كلمة المرور الجديدة يجب أن لا تقل عن 8 أحرف', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        this.showToast('🎉 تم تحديث كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول.', 'success');
        this.closeModal('forgotPasswordModal');
        this.openAuthModal('login');
      } else {
        const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
        this.showToast(msg || 'رمز الاستعادة غير صحيح أو منتهي الصلاحية', 'error');
      }
    } catch (err) {
      this.showToast('خطأ في الاتصال بالسيرفر', 'error');
    }
  },

  setButtonLoading(btnId, isLoading, loadingText = 'جاري التحقق...') {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isLoading) {
      btn.dataset.originalText = btn.innerText;
      btn.disabled = true;
      btn.innerHTML = `<span class="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin ml-2"></span> ${loadingText}`;
    } else {
      btn.disabled = false;
      btn.innerText = btn.dataset.originalText || 'تسجيل الدخول 🚀';
    }
  },

  async handleAuthSubmit() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();

    if (!email || !password) {
      this.showToast('يرجى إدخال البريد الإلكتروني وكلمة المرور', 'error');
      return;
    }

    if (this.state.isRegisterMode) {
      const firstName = document.getElementById('authFirstName').value.trim();
      const lastName = document.getElementById('authLastName').value.trim() || 'المصمم';
      if (!firstName) {
        this.showToast('يرجى إدخال الاسم الأول', 'error');
        return;
      }
      if (password.length < 8) {
        this.showToast('كلمة المرور يجب أن لا تقل عن 8 أحرف', 'error');
        return;
      }

      this.setButtonLoading('authSubmitBtn', true, 'جاري إنشاء الحساب...');
      try {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, firstName, lastName }),
        });
        
        let resData;
        try { resData = await res.json(); } catch(e) { resData = {}; }
        console.log('Register Response:', res.status, resData);

        const payload = resData.data || resData;

        if (res.ok && payload && (payload.accessToken || payload.user)) {
          if (payload.accessToken) {
            this.state.token = payload.accessToken;
            localStorage.setItem('yg_token', this.state.token);
            this.state.currentUser = payload.user;
            await this.loadMyEnrollments();
            this.updateUserNav();
          }
          this.showToast('تم إنشاء الحساب وتسجيل الدخول بنجاح! 🎉', 'success');
          this.closeModal('authModal');
        } else {
          const msg = Array.isArray(resData.message) ? resData.message.join(', ') : (resData.message || (payload && payload.message));
          this.showToast(msg || `فشل إنشاء الحساب (رمز ${res.status})`, 'error');
        }
      } catch (err) {
        console.error('Register fetch error:', err);
        this.showToast('خطأ في شبكة الاتصال بالسيرفر', 'error');
      } finally {
        this.setButtonLoading('authSubmitBtn', false);
      }
    } else {
      await this.loginUser(email, password);
    }
  },

  async loginUser(email, password) {
    this.setButtonLoading('authSubmitBtn', true, 'جاري تسجيل الدخول...');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      let resData;
      try { resData = await res.json(); } catch(e) { resData = {}; }
      console.log('Login Response:', res.status, resData);

      const payload = resData.data || resData;

      if (res.ok && payload && payload.accessToken) {
        this.state.token = payload.accessToken;
        localStorage.setItem('yg_token', this.state.token);
        this.state.currentUser = payload.user;
        await this.loadMyEnrollments();
        this.updateUserNav();
        this.showToast(`مرحباً بك مجدداً ${payload.user?.firstName || ''}! 🎉`, 'success');
        this.closeModal('authModal');
      } else {
        const msg = Array.isArray(resData.message) ? resData.message.join(', ') : (resData.message || (payload && payload.message));
        this.showToast(msg || `بيانات الدخول غير صحيحة (رمز ${res.status})`, 'error');
      }
    } catch (err) {
      console.error('Login fetch error:', err);
      this.showToast('خطأ في شبكة الاتصال بالسيرفر', 'error');
    } finally {
      this.setButtonLoading('authSubmitBtn', false);
    }
  },

  logout() {
    this.state.token = null;
    this.state.currentUser = null;
    this.state.enrolledCourses = [];
    localStorage.removeItem('yg_token');
    if (this.state.watermarkInterval) clearInterval(this.state.watermarkInterval);
    this.updateUserNav();
    this.showToast('تم تسجيل الخروج بنجاح', 'info');
    this.showPage('home');
  },

  // =========================================================================
  // COURSES CATALOG & TOP 3 BEST-SELLERS RENDER
  // =========================================================================
  async loadCourses() {
    try {
      const res = await fetch(`${API_BASE}/courses`);
      const data = await res.json();
      if (res.ok && data.data) {
        this.state.courses = data.data.data || [];
        this.renderCoursesGrid();
        this.renderTopBestSellers();
      } else {
        this.renderDefaultCoursesMock();
      }
    } catch (err) {
      this.renderDefaultCoursesMock();
    }
  },

  renderDefaultCoursesMock() {
    this.state.courses = [
      {
        id: 'course-1',
        title: 'كورس احتراف الدمج الرقمي والـ Manipulation بالفوتوشوب 2026',
        slug: 'photoshop-manipulation-masterclass-2026',
        subtitle: 'تعلم أسرار الإضاءة والظلال والـ Color Grading المحترف لصناعة بوسترات سينمائية',
        price: 1499,
        currency: 'EGP',
        level: 'ALL_LEVELS',
        thumbnailUrl: '/images/hero-art.jpg',
        totalDuration: '28 ساعة',
        totalLessons: 42,
      },
      {
        id: 'course-2',
        title: 'كورس الإعلانات التجارية والـ Commercial Retouching',
        slug: 'commercial-retouching-ads-mastery',
        subtitle: 'تعديل المنتجات والأطعمة والأشخاص لإعلانات الشركات والـ Social Media',
        price: 1299,
        currency: 'EGP',
        level: 'INTERMEDIATE',
        thumbnailUrl: '/images/instructor-2.jpg',
        totalDuration: '18 ساعة',
        totalLessons: 26,
      }
    ];
    this.renderCoursesGrid();
    this.renderTopBestSellers();
  },

  renderTopBestSellers() {
    const container = document.getElementById('topBestSellersGrid');
    if (!container) return;

    if (!this.state.courses || this.state.courses.length === 0) {
      container.innerHTML = `<div class="col-span-3 text-center py-6 text-gray-400">لا توجد كورسات متاحة حالياً</div>`;
      return;
    }

    const top3 = this.state.courses.slice(0, 3);
    const enrolledIds = new Set(this.state.enrolledCourses.map(e => e.courseId || e.course?.id));

    container.innerHTML = top3.map((course, idx) => {
      const isEnrolled = enrolledIds.has(course.id);
      const rankBadge = idx === 0 ? '🏆 الأكثر مبيعاً #1' : idx === 1 ? '🔥 المفضل لدى الطلاب #2' : '⭐ الأعلى تقييماً #3';

      return `
        <div class="glass-panel p-6 flex flex-col justify-between group relative border border-[#08CB00]/40 shadow-2xl">
          <span class="absolute top-4 left-4 z-20 badge-neon bg-[#08CB00] text-black font-extrabold px-3 py-1 shadow-lg">${rankBadge}</span>

          <div>
            <div class="relative overflow-hidden rounded-2xl mb-4 aspect-video bg-black/60">
              <img src="${course.thumbnailUrl || '/images/hero-art.jpg'}" alt="${course.title}" onerror="this.src='/images/hero-art.jpg'" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
            </div>
            
            <h3 class="text-xl font-extrabold text-white mb-2 leading-snug group-hover:text-[#08CB00] transition">${course.title}</h3>
            <p class="text-gray-400 text-xs leading-relaxed mb-4 line-clamp-2">${course.subtitle || course.description || ''}</p>
          </div>

          <div class="border-t border-white/10 pt-4 mt-2">
            <div class="flex justify-between items-center mb-4">
              <div class="text-xs text-gray-400 font-bold">
                <span>📚 ${course.totalLessons || 35} درس</span> • <span>⏱️ ${course.totalDuration || '25 ساعة'}</span>
              </div>
              <div class="text-xl font-black text-[#08CB00] font-mono">${course.price} ${course.currency || 'EGP'}</div>
            </div>

            ${isEnrolled ? `
              <button onclick="App.openCoursePlayer('${course.slug}')" class="btn btn-primary w-full justify-center text-xs py-3 bg-gradient-to-r from-emerald-500 to-green-400">
                ▶ مشاهدة دروس الكورس المفعل ✓
              </button>
            ` : `
              <button onclick="App.openRedeemModal('${course.id}')" class="btn btn-primary w-full justify-center text-xs py-3">
                🔑 تفعيل كود الكورس (InstaPay / Vodafone Cash)
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  },

  renderCoursesGrid(items = this.state.courses) {
    const grid = document.getElementById('coursesGrid');
    if (!grid) return;

    if (items.length === 0) {
      grid.innerHTML = `<div class="col-span-3 text-center py-12 text-gray-400">لا توجد كورسات متاحة حالياً</div>`;
      return;
    }

    const enrolledIds = new Set(this.state.enrolledCourses.map(e => e.courseId || e.course?.id));

    grid.innerHTML = items.map(course => {
      const isEnrolled = enrolledIds.has(course.id);
      const thumb = course.thumbnailUrl || '/images/hero-art.jpg';

      return `
        <div class="glass-panel p-6 flex flex-col justify-between group">
          <div>
            <div class="relative overflow-hidden rounded-2xl mb-4 aspect-video bg-black/60">
              <img src="${thumb}" alt="${course.title}" onerror="this.src='/images/hero-art.jpg'" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
              <span class="absolute top-3 right-3 badge-neon">${isEnrolled ? '✓ كورس مفعل' : (course.level === 'ALL_LEVELS' ? 'جميع المستويات' : 'متقدم')}</span>
            </div>
            
            <h3 class="text-xl font-extrabold text-white mb-2 leading-snug group-hover:text-[#08CB00] transition">${course.title}</h3>
            <p class="text-gray-400 text-xs leading-relaxed mb-4 line-clamp-2">${course.subtitle || course.description || ''}</p>
          </div>

          <div class="border-t border-white/10 pt-4 mt-2">
            <div class="flex justify-between items-center mb-4">
              <div class="text-xs text-gray-400">
                <span>📚 ${course.totalLessons || 30} درس</span> • <span>⏱️ ${course.totalDuration || '20 ساعة'}</span>
              </div>
              <div class="text-xl font-black text-[#08CB00] font-mono">${course.price} ${course.currency || 'EGP'}</div>
            </div>

            ${isEnrolled ? `
              <button onclick="App.openCoursePlayer('${course.slug}')" class="btn btn-primary w-full justify-center text-xs py-3 bg-gradient-to-r from-emerald-500 to-green-400">
                ▶ مشاهدة دروس الكورس (مفعل بحسابك ✓)
              </button>
            ` : `
              <button onclick="App.openRedeemModal('${course.id}')" class="btn btn-primary w-full justify-center text-xs py-3">
                🔑 تفعيل كود الكورس (InstaPay / Vodafone Cash)
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  },

  searchCourses() {
    const query = document.getElementById('courseSearchInput').value.toLowerCase();
    const filtered = this.state.courses.filter(c => 
      c.title.toLowerCase().includes(query) || (c.subtitle && c.subtitle.toLowerCase().includes(query))
    );
    this.renderCoursesGrid(filtered);
  },

  // =========================================================================
  // EXCLUSIVE CODE REDEMPTION & PERMANENT UNLOCK
  // =========================================================================
  openRedeemModal(courseId = null) {
    if (!this.state.token) {
      this.showToast('يرجى تسجيل الدخول أولاً لتفعيل الكود الخاص بك', 'info');
      this.openAuthModal('login');
      return;
    }
    this.state.targetCourseId = courseId;

    const courseTitleEl = document.getElementById('redeemTargetCourseTitle');
    if (courseTitleEl) {
      if (courseId) {
        const found = this.state.courses.find(c => c.id === courseId);
        courseTitleEl.innerText = found ? `🎯 الكورس المستهدف: ${found.title}` : '';
        courseTitleEl.classList.remove('hidden');
      } else {
        courseTitleEl.innerText = '';
        courseTitleEl.classList.add('hidden');
      }
    }

    document.getElementById('redeemModal').classList.remove('hidden');
    document.getElementById('redeemCodeInput').focus();
  },

  async handleRedeemCodeSubmit() {
    const code = document.getElementById('redeemCodeInput').value.trim().toUpperCase();
    if (!code) {
      this.showToast('يرجى كتابة كود التسجيل الخماسي/الثماني', 'error');
      return;
    }

    const payload = { code };
    if (this.state.targetCourseId) {
      payload.courseId = this.state.targetCourseId;
    }

    try {
      const res = await fetch(`${API_BASE}/enrollments/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.state.token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        this.showToast('🎉 مبروك! تم تفعيل كودك الحصري بنجاح وفتح الكورس دائماً في حسابك.', 'success');
        this.closeModal('redeemModal');
        document.getElementById('redeemCodeInput').value = '';
        this.state.targetCourseId = null;
        await this.loadMyEnrollments();
        this.showPage('dashboard');
      } else {
        this.showToast(data.message || 'الكود غير صحيح أو مستخدم من قبل', 'error');
      }
    } catch (err) {
      this.showToast('خطأ في شبكة الاتصال بـ API', 'error');
    }
  },

  // =========================================================================
  // STUDENT DASHBOARD & LESSON PLAYER WITH AUTO-STOP ON LEAVE
  // =========================================================================
  async loadMyEnrollments() {
    if (!this.state.token) return;

    try {
      const res = await fetch(`${API_BASE}/enrollments/me`, {
        headers: { Authorization: `Bearer ${this.state.token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        this.state.enrolledCourses = data.data;
        this.renderStudentDashboard();
        this.renderCoursesGrid();
        this.renderTopBestSellers();
      }
    } catch (err) {
      console.warn('Failed to fetch enrollments:', err);
    }
  },

  renderStudentDashboard() {
    const listContainer = document.getElementById('myEnrollmentsList');
    if (!listContainer) return;

    if (this.state.enrolledCourses.length === 0) {
      listContainer.innerHTML = `
        <div class="text-center py-8 text-gray-400">
          لم تقم بتفعيل أي كورس بعد. 
          <button onclick="App.openRedeemModal()" class="text-[#08CB00] font-bold underline mr-2">أدخل كودك الآن 🔑</button>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = this.state.enrolledCourses.map(item => `
      <div class="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h4 class="font-extrabold text-white text-lg">${item.course.title}</h4>
          <p class="text-xs text-gray-400 mt-1">تاريخ التفعيل: ${new Date(item.enrolledAt).toLocaleDateString('ar-EG')} • حالة الوصول: <strong class="text-[#08CB00]">مفعل دائماً</strong></p>
        </div>
        <button onclick="App.openCoursePlayer('${item.course.slug}')" class="btn btn-primary text-xs py-2.5 px-6">
          ▶ متابعة مشاهدة الكورس
        </button>
      </div>
    `).join('');
  },

  async openCoursePlayer(slug) {
    try {
      const res = await fetch(`${API_BASE}/courses/${slug}`);
      const data = await res.json();
      if (res.ok && data.data) {
        this.state.currentCourse = data.data;
        this.renderPlayerCurriculum();
        this.showPage('player');
        this.startWatermarkDrift();
      }
    } catch (err) {
      this.showToast('تعذر تحميل دروس الكورس', 'error');
    }
  },

  renderPlayerCurriculum() {
    const course = this.state.currentCourse;
    if (!course) return;

    const list = document.getElementById('playerLessonsList');
    if (!list) return;

    let allLessons = [];
    if (course.modules) {
      course.modules.forEach(m => {
        if (m.lessons) allLessons.push(...m.lessons);
      });
    }

    if (allLessons.length > 0) {
      this.selectLessonObj(allLessons[0]);
    }

    list.innerHTML = allLessons.map((lesson, idx) => `
      <div onclick="App.selectLesson('${lesson.id}')" class="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-[#08CB00]/40 cursor-pointer flex justify-between items-center text-xs text-white">
        <span class="font-bold">${idx + 1}. ${lesson.title}</span>
        <span class="text-gray-400 font-mono">${lesson.duration || 10} دقيقة</span>
      </div>
    `).join('');
  },

  selectLesson(lessonId) {
    if (!this.state.currentCourse) return;
    let found = null;
    this.state.currentCourse.modules.forEach(m => {
      m.lessons.forEach(l => { if (l.id === lessonId) found = l; });
    });

    if (found) {
      this.selectLessonObj(found);
    }
  },

  selectLessonObj(found) {
    this.state.currentLesson = found;
    document.getElementById('playerLessonTitle').innerText = found.title;

    const videoBox = document.getElementById('videoContainer');
    const rawVideoUrl = (found.video && found.video.videoUrl) || found.videoUrl || found.video_url;

    if (videoBox) {
      const activeUrl = rawVideoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

      if (activeUrl.includes('youtube.com') || activeUrl.includes('youtu.be')) {
        let embedUrl = activeUrl;
        if (activeUrl.includes('youtube.com/watch?v=')) {
          embedUrl = activeUrl.replace('watch?v=', 'embed/');
        } else if (activeUrl.includes('youtu.be/')) {
          embedUrl = activeUrl.replace('youtu.be/', 'youtube.com/embed/');
        }
        videoBox.innerHTML = `
          <iframe src="${embedUrl}?autoplay=1&modestbranding=1&rel=0" class="w-full h-full border-0 rounded-3xl" allow="autoplay; encrypted-media" allowfullscreen></iframe>
        `;
      } else if (activeUrl.includes('drive.google.com')) {
        let embedUrl = activeUrl.replace('/view', '/preview');
        videoBox.innerHTML = `
          <iframe src="${embedUrl}" class="w-full h-full border-0 rounded-3xl" allow="autoplay" allowfullscreen></iframe>
        `;
      } else {
        videoBox.innerHTML = `
          <video id="activeLessonVideo" src="${activeUrl}" controls autoplay controlsList="nodownload" class="w-full h-full rounded-3xl object-cover bg-black"></video>
        `;
      }
    }

    // Material attachment link
    const attachBtn = document.getElementById('lessonAttachmentBtn');
    const noAttach = document.getElementById('noAttachmentText');
    const attachmentUrl = (found.attachments && found.attachments[0]?.fileUrl) || found.attachmentUrl || (found.resources && found.resources[0]?.url);

    if (attachmentUrl) {
      if (attachBtn) {
        attachBtn.href = attachmentUrl;
        attachBtn.target = '_blank';
        attachBtn.classList.remove('hidden');
        attachBtn.style.display = 'inline-flex';
      }
      if (noAttach) noAttach.classList.add('hidden');
    } else {
      if (attachBtn) {
        attachBtn.classList.add('hidden');
        attachBtn.style.display = 'none';
      }
      if (noAttach) noAttach.classList.remove('hidden');
    }

    this.startWatermarkDrift();
    this.showToast(`▶ جاري تشغيل: ${found.title}`, 'success');
  },

  playVideoSimulated() {
    if (this.state.currentLesson) {
      this.selectLessonObj(this.state.currentLesson);
    } else {
      this.selectLessonObj({ title: 'مقدمة فوتوشوب المتاحة', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' });
    }
  },

  completeCurrentLesson() {
    this.showToast('✓ تم تسجيل الدرس كمكتمل وزيادة نسبة التقدم', 'success');
  },

  async saveLessonNote() {
    const text = document.getElementById('lessonNoteText').value.trim();
    if (!text) {
      this.showToast('يرجى كتابة الملاحظة أو الاستفسار أولاً', 'error');
      return;
    }

    if (!this.state.currentLesson) {
      this.showToast('يرجى اختيار درس أولاً', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.state.token}`,
        },
        body: JSON.stringify({
          lessonId: this.state.currentLesson.id,
          content: text,
          timestamp: 0,
        }),
      });

      if (res.ok) {
        this.showToast('✉️ تم إرسال ملاحظتك بنجاح ووصلت للأدمن لمرجعتها', 'success');
        document.getElementById('lessonNoteText').value = '';
      } else {
        this.showToast('تمت إضافة الملاحظة محلياً', 'info');
        document.getElementById('lessonNoteText').value = '';
      }
    } catch (err) {
      this.showToast('تمت إضافة الملاحظة محلياً', 'info');
      document.getElementById('lessonNoteText').value = '';
    }
  },

  // =========================================================================
  // ADMIN DASHBOARD WITH COMPLETE EDIT, HIDE/SHOW, MATERIAL & DELETE CONTROLS
  // =========================================================================
  switchAdminTab(tabName) {
    document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hidden'));

    const btn = document.getElementById(`adminTabBtn-${tabName}`);
    const content = document.getElementById(`adminTabContent-${tabName}`);

    if (btn) btn.classList.add('active');
    if (content) content.classList.remove('hidden');
  },

  async loadAdminData() {
    if (!this.state.token || this.state.currentUser?.role !== 'ADMIN') {
      this.showToast('عفواً، هذه الصفحة مخصصة فقط لأدمن المنصة', 'error');
      this.showPage('home');
      return;
    }

    const courseSelect = document.getElementById('adminCodeCourseSelect');
    const lessonCourseSelect = document.getElementById('adminLessonCourseSelect');

    const optionsHTML = this.state.courses.map(c => `<option value="${c.id}">${c.title}</option>`).join('');
    if (courseSelect) courseSelect.innerHTML = optionsHTML;
    if (lessonCourseSelect) lessonCourseSelect.innerHTML = optionsHTML;

    try {
      const [statsRes, codesRes, studentsRes, notesRes] = await Promise.all([
        fetch(`${API_BASE}/admin/codes/stats`, { headers: { Authorization: `Bearer ${this.state.token}` } }),
        fetch(`${API_BASE}/admin/codes`, { headers: { Authorization: `Bearer ${this.state.token}` } }),
        fetch(`${API_BASE}/admin/students`, { headers: { Authorization: `Bearer ${this.state.token}` } }),
        fetch(`${API_BASE}/admin/notes`, { headers: { Authorization: `Bearer ${this.state.token}` } }),
      ]);

      const statsData = await statsRes.json();
      const codesData = await codesRes.json();
      const studentsData = await studentsRes.json();
      const notesData = await notesRes.json();

      if (statsRes.ok && statsData.data) {
        const s = statsData.data;
        document.getElementById('adminTotalCodes').innerText = s.total || 0;
        document.getElementById('adminActiveCodes').innerText = s.active || 0;
        document.getElementById('adminUsedCodes').innerText = s.used || 0;
        
        let totalRev = 0;
        if (s.revenueByMethod) s.revenueByMethod.forEach(r => totalRev += r.amount);
        document.getElementById('adminTotalRevenue').innerText = `${totalRev} EGP`;
      }

      if (codesRes.ok && codesData.data) {
        this.state.adminCodes = codesData.data.data || [];
        this.renderAdminCodesTable();
      }

      if (studentsRes.ok && studentsData.data) {
        this.state.adminStudents = studentsData.data.data || [];
        this.renderAdminStudentsTable();
      }

      if (notesRes.ok && notesData.data) {
        this.state.adminNotes = notesData.data || [];
        this.renderAdminNotesTable();
      }

      this.adminRenderCoursesManageList();
    } catch (err) {
      console.warn('Admin fetch status:', err);
    }
  },

  adminRenderCoursesManageList() {
    const container = document.getElementById('adminCoursesManageList');
    if (!container) return;

    if (this.state.courses.length === 0) {
      container.innerHTML = `<div class="text-center py-6 text-gray-400">لا توجد كورسات متاحة للتعديل أو الحذف</div>`;
      return;
    }

    container.innerHTML = this.state.courses.map(c => `
      <div class="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
          <div>
            <span class="badge-neon mb-1">${c.price} ${c.currency || 'EGP'}</span>
            <h4 class="text-xl font-extrabold text-white">${c.title}</h4>
            <p class="text-xs text-gray-400 font-mono mt-1">ID: ${c.id} • Slug: ${c.slug}</p>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="App.adminEditCourse('${c.id}')" class="btn btn-ghost text-xs py-2 px-4 border border-[#08CB00]/40 text-[#08CB00]">✏️ تعديل بيانات الكورس</button>
            <button onclick="App.adminDeleteCourse('${c.id}')" class="btn btn-ghost text-xs py-2 px-4 border border-red-500/40 text-red-400 hover:bg-red-500/10">🗑️ حذف الكورس</button>
          </div>
        </div>

        <div>
          <h5 class="text-xs font-bold text-gray-300 mb-3">دروس هذا الكورس والتحكم بها:</h5>
          <div id="courseLessonsManage-${c.id}" class="space-y-2">
            <button onclick="App.adminLoadCourseLessonsForManage('${c.slug}', '${c.id}')" class="text-xs text-[#08CB00] font-bold hover:underline">عرض وتعديل/إخفاء دروس الكورس والماتريال 📂</button>
          </div>
        </div>
      </div>
    `).join('');
  },

  async adminLoadCourseLessonsForManage(slug, courseId) {
    const box = document.getElementById(`courseLessonsManage-${courseId}`);
    if (!box) return;

    try {
      const res = await fetch(`${API_BASE}/courses/${slug}`);
      const data = await res.json();
      if (res.ok && data.data && data.data.modules) {
        let lessons = [];
        data.data.modules.forEach(m => {
          if (m.lessons) lessons.push(...m.lessons);
        });

        if (lessons.length === 0) {
          box.innerHTML = `<div class="text-xs text-gray-400 py-2">لا توجد دروس لهذا الكورس بعد</div>`;
          return;
        }

        box.innerHTML = lessons.map(l => {
          const isPublished = l.status === 'PUBLISHED';
          const attachUrl = l.attachments?.[0]?.fileUrl || l.attachmentUrl || '';

          return `
            <div class="p-4 rounded-xl bg-black/40 border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs text-gray-300">
              <div>
                <span class="font-bold text-white text-sm">${l.title}</span>
                <span class="text-gray-400 font-mono mr-2">(${l.duration || 10} دقيقة)</span>
                <span class="mr-2 px-2 py-0.5 rounded text-[10px] ${isPublished ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}">${isPublished ? 'ظاهر' : 'مخفي'}</span>
                ${attachUrl ? `<span class="mr-2 text-[#08CB00]">📁 يحتوي ماتريال</span>` : ''}
              </div>

              <div class="flex items-center gap-3">
                <button onclick="App.adminEditLesson('${l.id}', '${encodeURIComponent(l.title)}', '${l.duration || 15}', '${l.video?.videoUrl || l.videoUrl || ''}', '${attachUrl}', '${courseId}')" class="text-[#08CB00] font-bold hover:underline">✏️ تعديل الدرس والماتريال</button>
                <button onclick="App.adminToggleLessonPublish('${l.id}')" class="text-yellow-400 font-bold hover:underline">${isPublished ? '👁️ إخفاء' : '👁️ إظهار'}</button>
                <button onclick="App.adminDeleteLesson('${l.id}')" class="text-red-400 font-bold hover:underline">🗑️ حذف</button>
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (err) {
      box.innerHTML = `<div class="text-xs text-red-400">تعذر تحميل الدروس</div>`;
    }
  },

  async adminToggleLessonPublish(lessonId) {
    try {
      const res = await fetch(`${API_BASE}/admin/lessons/${lessonId}/publish`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${this.state.token}` },
      });
      if (res.ok) {
        this.showToast('👁️ تم تغيير حالة ظهور الدرس بنجاح!', 'success');
        this.loadAdminData();
      }
    } catch (err) {
      this.showToast('خطأ في تغيير حالة الدرس', 'error');
    }
  },

  adminEditCourse(courseId) {
    const course = this.state.courses.find(c => c.id === courseId);
    if (!course) return;

    document.getElementById('adminEditingCourseId').value = course.id;
    document.getElementById('adminCourseFormTitle').innerText = `✏️ تعديل الكورس: ${course.title}`;
    document.getElementById('adminCancelEditCourseBtn').classList.remove('hidden');
    document.getElementById('adminSaveCourseBtn').innerText = 'حفظ التعديلات 💾';

    document.getElementById('adminNewCourseTitle').value = course.title || '';
    document.getElementById('adminNewCourseSlug').value = course.slug || '';
    document.getElementById('adminNewCoursePrice').value = course.price || 1499;
    document.getElementById('adminNewCourseLevel').value = course.level || 'ALL_LEVELS';
    document.getElementById('adminNewCourseThumb').value = course.thumbnailUrl || '/images/hero-art.jpg';
    document.getElementById('adminNewCourseDesc').value = course.description || course.subtitle || '';

    window.scrollTo({ top: document.getElementById('adminCourseFormTitle').offsetTop - 100, behavior: 'smooth' });
  },

  adminResetCourseForm() {
    document.getElementById('adminEditingCourseId').value = '';
    document.getElementById('adminCourseFormTitle').innerText = '➕ إضافة كورس جديد للأكاديمية';
    document.getElementById('adminCancelEditCourseBtn').classList.add('hidden');
    document.getElementById('adminSaveCourseBtn').innerText = 'حفظ الكورس وإضافته فوراً 🚀';

    document.getElementById('adminNewCourseTitle').value = '';
    document.getElementById('adminNewCourseSlug').value = '';
    document.getElementById('adminNewCoursePrice').value = '1499';
    document.getElementById('adminNewCourseThumb').value = '/images/hero-art.jpg';
    document.getElementById('adminNewCourseDesc').value = '';
  },

  async adminCreateOrUpdateCourse() {
    const editingId = document.getElementById('adminEditingCourseId').value;
    const title = document.getElementById('adminNewCourseTitle').value.trim();
    let slug = document.getElementById('adminNewCourseSlug').value.trim();
    const price = parseFloat(document.getElementById('adminNewCoursePrice').value) || 0;
    const level = document.getElementById('adminNewCourseLevel').value;
    const thumbnailUrl = document.getElementById('adminNewCourseThumb').value.trim();
    const description = document.getElementById('adminNewCourseDesc').value.trim() || title;

    if (!title) {
      this.showToast('يرجى كتابة عنوان الكورس', 'error');
      return;
    }

    const bodyPayload = { title, price, level, thumbnailUrl, description };
    if (slug) bodyPayload.slug = slug;

    const url = editingId ? `${API_BASE}/admin/courses/${editingId}` : `${API_BASE}/admin/courses`;
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.state.token}`,
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();
      if (res.ok) {
        this.showToast(editingId ? '💾 تم حفظ تعديلات الكورس بنجاح!' : '🎉 تم إضافة الكورس بنجاح!', 'success');
        this.adminResetCourseForm();
        await this.loadCourses();
        await this.loadAdminData();
      } else {
        this.showToast(data.message || 'فشل التعديل/الإضافة', 'error');
      }
    } catch (err) {
      this.showToast('خطأ في الاتصال بالباك إند', 'error');
    }
  },

  async adminDeleteCourse(courseId) {
    if (!confirm('هل أنت تأكد من رغبتك في حذف هذا الكورس وجميع دروسه نهائياً؟')) return;

    try {
      const res = await fetch(`${API_BASE}/admin/courses/${courseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this.state.token}` },
      });
      if (res.ok) {
        this.showToast('🗑️ تم حذف الكورس بنجاح', 'success');
        await this.loadCourses();
        await this.loadAdminData();
      }
    } catch (err) {
      this.showToast('خطأ في حذف الكورس', 'error');
    }
  },

  adminEditLesson(lessonId, encodedTitle, duration, videoUrl, attachmentUrl, courseId = '') {
    const title = decodeURIComponent(encodedTitle);
    document.getElementById('adminEditingLessonId').value = lessonId;
    document.getElementById('adminLessonFormTitle').innerText = `✏️ تعديل الدرس والملحقات: ${title}`;
    document.getElementById('adminCancelEditLessonBtn').classList.remove('hidden');
    document.getElementById('adminSaveLessonBtn').innerText = 'حفظ تعديلات الدرس والماتريال 💾';

    if (courseId) {
      document.getElementById('adminLessonCourseSelect').value = courseId;
    }

    document.getElementById('adminLessonTitle').value = title;
    document.getElementById('adminLessonDuration').value = duration;
    document.getElementById('adminLessonVideoUrl').value = videoUrl;
    document.getElementById('adminLessonAttachmentUrl').value = attachmentUrl;

    window.scrollTo({ top: document.getElementById('adminLessonFormTitle').offsetTop - 100, behavior: 'smooth' });
  },

  adminResetLessonForm() {
    document.getElementById('adminEditingLessonId').value = '';
    document.getElementById('adminLessonFormTitle').innerText = '🎥 إضافة درس وتحديد رابط الماتريال والمرفقات';
    document.getElementById('adminCancelEditLessonBtn').classList.add('hidden');
    document.getElementById('adminSaveLessonBtn').innerText = 'إضافة الدرس والملحقات ➕';

    document.getElementById('adminLessonTitle').value = '';
    document.getElementById('adminLessonDuration').value = '20';
    document.getElementById('adminLessonVideoUrl').value = '';
    document.getElementById('adminLessonAttachmentUrl').value = '';
  },

  async adminCreateOrUpdateLesson() {
    const editingId = document.getElementById('adminEditingLessonId').value;
    const courseId = document.getElementById('adminLessonCourseSelect').value;
    const title = document.getElementById('adminLessonTitle').value.trim();
    const duration = parseInt(document.getElementById('adminLessonDuration').value, 10) || 15;
    const videoUrl = document.getElementById('adminLessonVideoUrl').value.trim();
    const attachmentUrl = document.getElementById('adminLessonAttachmentUrl').value.trim();

    if (!title) {
      this.showToast('يرجى كتابة عنوان الدرس', 'error');
      return;
    }

    if (editingId) {
      try {
        const res = await fetch(`${API_BASE}/admin/lessons/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.state.token}`,
          },
          body: JSON.stringify({ title, duration, videoUrl, attachmentUrl }),
        });
        const data = await res.json();
        if (res.ok) {
          this.showToast('💾 تم تعديل بيانات الدرس والماتريال بنجاح!', 'success');
          this.adminResetLessonForm();
          await this.loadCourses();
          await this.loadAdminData();
        } else {
          this.showToast(data.message || 'فشل تعديل بيانات الدرس', 'error');
        }
      } catch (err) {
        this.showToast('خطأ في تعديل الدرس', 'error');
      }
    } else {
      await this.adminAddLesson();
    }
  },

  async adminAddLesson() {
    const courseId = document.getElementById('adminLessonCourseSelect').value;
    const title = document.getElementById('adminLessonTitle').value.trim();
    const duration = parseInt(document.getElementById('adminLessonDuration').value, 10) || 15;
    const videoUrl = document.getElementById('adminLessonVideoUrl').value.trim();
    const attachmentUrl = document.getElementById('adminLessonAttachmentUrl').value.trim();

    if (!courseId || !title) {
      this.showToast('يرجى اختيار الكورس وعنوان الدرس', 'error');
      return;
    }

    try {
      const modRes = await fetch(`${API_BASE}/admin/courses/${courseId}/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.state.token}`,
        },
        body: JSON.stringify({ title: 'الوحدة الرئيسية', order: 1 }),
      });
      const modData = await modRes.json();
      const moduleId = modData.data?.id;

      if (!moduleId) {
        this.showToast('تعذر إنشاء وحدة التعليم للدرس', 'error');
        return;
      }

      const lessonRes = await fetch(`${API_BASE}/admin/modules/${moduleId}/lessons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.state.token}`,
        },
        body: JSON.stringify({
          title,
          duration,
          videoUrl,
          attachmentUrl,
        }),
      });

      if (lessonRes.ok) {
        this.showToast('🎬 تم إضافة الدرس والماتريال المرفق بنجاح للمنهج!', 'success');
        document.getElementById('adminLessonTitle').value = '';
        document.getElementById('adminLessonAttachmentUrl').value = '';
        await this.loadCourses();
        await this.loadAdminData();
      }
    } catch (err) {
      this.showToast('خطأ في إضافة الدرس', 'error');
    }
  },

  async adminDeleteLesson(lessonId) {
    if (!confirm('هل أنت تأكد من رغبتك في حذف هذا الدرس نهائياً؟')) return;

    try {
      const res = await fetch(`${API_BASE}/admin/lessons/${lessonId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this.state.token}` },
      });
      if (res.ok) {
        this.showToast('🗑️ تم حذف الدرس بنجاح', 'success');
        await this.loadCourses();
        await this.loadAdminData();
      }
    } catch (err) {
      this.showToast('خطأ في حذف الدرس', 'error');
    }
  },

  async adminGenerateSingleCode() {
    const courseId = document.getElementById('adminCodeCourseSelect').value;
    const paymentMethod = document.getElementById('adminCodeMethodSelect').value;
    const amount = parseFloat(document.getElementById('adminCodeAmountInput').value) || 0;

    if (!courseId) {
      this.showToast('يرجى اختيار الكورس أولاً', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.state.token}`,
        },
        body: JSON.stringify({ courseId, paymentMethod, amount }),
      });

      const data = await res.json();
      if (res.ok && data.data) {
        this.showToast(`🎉 تم توليد الكود الحصري بنجاح: ${data.data.code}`, 'success');
        this.loadAdminData();
      } else {
        this.showToast(data.message || 'فشل توليد الكود', 'error');
      }
    } catch (err) {
      this.showToast('خطأ في توليد الكود', 'error');
    }
  },

  async adminGenerateBulkCodes() {
    const courseId = document.getElementById('adminCodeCourseSelect').value;
    const paymentMethod = document.getElementById('adminCodeMethodSelect').value;
    const amountPerCode = parseFloat(document.getElementById('adminCodeAmountInput').value) || 0;
    const count = parseInt(prompt('أدخل عدد الأكواد المطلوبة بالجملة:', '5'), 10);

    if (!count || isNaN(count)) return;

    try {
      const res = await fetch(`${API_BASE}/admin/codes/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.state.token}`,
        },
        body: JSON.stringify({ courseId, count, paymentMethod, amountPerCode }),
      });
      if (res.ok) {
        this.showToast(`🎉 تم توليد ${count} أكواد بنجاح!`, 'success');
        this.loadAdminData();
      }
    } catch (err) {
      this.showToast('فشل توليد الأكواد بالجملة', 'error');
    }
  },

  async adminToggleStudentStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await fetch(`${API_BASE}/admin/students/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.state.token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        this.showToast(`تم تغيير حالة الحساب إلى ${newStatus}`, 'success');
        this.loadAdminData();
      }
    } catch (err) {
      this.showToast('خطأ في تعديل حالة حساب الطالب', 'error');
    }
  },

  renderAdminCodesTable() {
    const tbody = document.getElementById('adminCodesTableBody');
    if (!tbody) return;

    if (this.state.adminCodes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-gray-400">لا توجد أكواد مولدة بعد</td></tr>`;
      return;
    }

    tbody.innerHTML = this.state.adminCodes.map(item => `
      <tr class="border-b border-white/5 hover:bg-white/5">
        <td class="p-3 font-mono font-black text-[#08CB00]">${item.code}</td>
        <td class="p-3 font-bold text-white">${item.course?.title || 'كورس'}</td>
        <td class="p-3 text-xs"><span class="badge-neon">${item.paymentMethod}</span></td>
        <td class="p-3 font-mono text-white font-bold">${item.amount} EGP</td>
        <td class="p-3 text-xs">
          <span class="px-2 py-1 rounded ${item.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}">${item.status}</span>
        </td>
        <td class="p-3 text-xs text-gray-400 font-mono">${new Date(item.createdAt).toLocaleDateString('ar-EG')}</td>
      </tr>
    `).join('');
  },

  renderAdminStudentsTable() {
    const tbody = document.getElementById('adminStudentsTableBody');
    if (!tbody) return;

    if (this.state.adminStudents.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-gray-400">لا يوجد طلاب مسجلون بعد</td></tr>`;
      return;
    }

    tbody.innerHTML = this.state.adminStudents.map(student => `
      <tr class="border-b border-white/5 hover:bg-white/5">
        <td class="p-3 font-bold text-white">${student.firstName || ''} ${student.lastName || ''}</td>
        <td class="p-3 font-mono text-gray-300 text-xs">${student.email}</td>
        <td class="p-3 text-xs text-gray-400 font-mono">${new Date(student.createdAt).toLocaleDateString('ar-EG')}</td>
        <td class="p-3 text-xs">
          <span class="px-2 py-1 rounded ${student.status === 'ACTIVE' ? 'bg-[#08CB00]/20 text-[#08CB00]' : 'bg-red-500/20 text-red-400'}">${student.status}</span>
        </td>
        <td class="p-3">
          <button onclick="App.adminToggleStudentStatus('${student.id}', '${student.status}')" class="text-xs ${student.status === 'ACTIVE' ? 'text-red-400' : 'text-[#08CB00]'} hover:underline">
            ${student.status === 'ACTIVE' ? 'تجميد الحساب' : 'تفعيل الحساب'}
          </button>
        </td>
      </tr>
    `).join('');
  },

  renderAdminNotesTable() {
    const tbody = document.getElementById('adminNotesTableBody');
    if (!tbody) return;

    if (this.state.adminNotes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-gray-400">لا توجد ملاحظات أو أسئلة من الطلاب حالياً</td></tr>`;
      return;
    }

    tbody.innerHTML = this.state.adminNotes.map(note => `
      <tr class="border-b border-white/5 hover:bg-white/5">
        <td class="p-3 font-bold text-white">${note.user?.firstName || 'طالب'} ${note.user?.lastName || ''} (${note.user?.email || ''})</td>
        <td class="p-3 text-xs text-gray-300 font-bold">${note.lesson?.title || 'الدرس'}</td>
        <td class="p-3 text-xs text-[#08CB00] font-bold">${note.content}</td>
        <td class="p-3 font-mono text-xs text-gray-400">${note.timestamp || 0}s</td>
        <td class="p-3 text-xs text-gray-400 font-mono">${new Date(note.createdAt).toLocaleDateString('ar-EG')}</td>
      </tr>
    `).join('');
  },

  showPage(pageId) {
    if (pageId !== 'player') {
      if (this.state.watermarkInterval) clearInterval(this.state.watermarkInterval);

      const videoBox = document.getElementById('videoContainer');
      if (videoBox) {
        const videoEl = videoBox.querySelector('video');
        if (videoEl) {
          videoEl.pause();
          videoEl.currentTime = 0;
          videoEl.src = '';
        }
        const iframeEl = videoBox.querySelector('iframe');
        if (iframeEl) {
          iframeEl.src = 'about:blank';
        }
        videoBox.innerHTML = `
          <img src="${this.state.currentCourse?.thumbnailUrl || '/images/hero-art.jpg'}" onerror="this.src='/images/hero-art.jpg'" class="w-full h-full object-cover opacity-60 pointer-events-none" />
          <div class="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-6 text-center z-20">
            <button onclick="App.playVideoSimulated()" class="w-20 h-20 rounded-full bg-[#08CB00] text-black flex items-center justify-center text-3xl font-bold shadow-[0_0_35px_#08CB00] hover:scale-110 transition cursor-pointer">▶</button>
            <p class="text-white text-sm font-bold mt-4">انقر لتشغيل الدرس 4K المحمي</p>
          </div>
        `;
      }
    }

    document.querySelectorAll('.page-view').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`page-${pageId}`);
    if (target) {
      target.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (pageId === 'admin') {
      this.loadAdminData();
    }
  },

  closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const msgText = Array.isArray(message) ? message.join(', ') : message;

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'border-red-500 text-red-300' : 'border-[#08CB00]'}`;
    toast.innerHTML = `
      <span>${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'}</span>
      <span>${msgText}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
