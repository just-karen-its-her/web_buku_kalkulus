/* =====================================================================
   FILE: script.js
   FUNGSI UTAMA: Mengatur interaksi tombol, animasi membalik halaman, 
   dan menyuntikkan (inject) materi dari file JSON ke dalam HTML.
   ===================================================================== */

/* --- FUNGSI UTILITAS GLOBAL --- */
function refreshMathJax() {
    if (typeof MathJax !== 'undefined' && MathJax.typesetClear) {
        try {
            MathJax.typesetClear();
            MathJax.typesetPromise().catch(err => console.warn("MathJax Error:", err));
        } catch (e) {
            console.warn("MathJax Exec Error:", e);
        }
    }
}

/* =====================================================================
   BAGIAN 1: KONTROL TAMPILAN UI
   ===================================================================== */

// 1A. Tombol Hamburger
const toggleBtn = document.getElementById('toggle-btn');
const sidebar = document.getElementById('sidebar');

if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', e => {
        e.preventDefault();
        sidebar.classList.toggle('active');
    });
}

// 1B. Navbar Atas
const topNavbar = document.querySelector('.top-navbar');
if (topNavbar) {
    topNavbar.classList.add('visible');
    let isInitialShow = true;

    setTimeout(() => {
        topNavbar.classList.remove('visible');
        isInitialShow = false;
    }, 3000);

    document.addEventListener('mousemove', e => {
        if (!isInitialShow) {
            if (e.clientY <= 75) topNavbar.classList.add('visible');
            else topNavbar.classList.remove('visible');
        }
    });
}

// 1C. Kotak Pencarian di Sidebar
const searchBtn = document.getElementById('search-btn');
const searchBox = document.getElementById('sidebar-search-box');
const searchInput = document.getElementById('search-input');

if (searchBtn && searchBox) {
    searchBtn.addEventListener('click', e => {
        e.preventDefault();
        if (!sidebar.classList.contains('active')) sidebar.classList.add('active');

        searchBox.classList.toggle('show');
        if (searchBox.classList.contains('show')) {
            setTimeout(() => {
                if (searchInput) searchInput.focus();
            }, 400);
        }
    });
}

// 1D. Logika Pencarian Materi (Sistem Skoring & Relevansi)
if (searchInput && searchBox) {
    let searchResults = document.getElementById('search-results');
    if (!searchResults) {
        searchResults = document.createElement('div');
        searchResults.id = 'search-results';
        searchBox.appendChild(searchResults);
    }

    // FUNGSI UNTUK MENGHITUNG SKOR RELEVANSI
    function hitungSkorRelevansi(data, keyword) {
        let score = 0;

        // 1. Cek Judul Bab/Materi (Prioritas Tertinggi: Bobot 60%)
        if (data.material?.title?.toLowerCase().includes(keyword)) {
            score += 60;
        }

        // 2. Cek Tujuan Pembelajaran (Prioritas Menengah: Bobot 20%)
        if (data.tujuan?.title?.toLowerCase().includes(keyword) ||
            data.tujuan?.content?.toLowerCase().includes(keyword)) {
            score += 20;
        }

        // 3. Cek Isi Materi/Teori (Prioritas Menengah: Bobot 25%)
        if (data.material?.theoryContent) {
            const textContent = data.material.theoryContent.join(' ').toLowerCase();
            if (textContent.includes(keyword)) {
                score += 25;
            }
        }

        // 4. Cek Soal Evaluasi/Kuis (Prioritas Rendah: Bobot 15%)
        if (data.quiz?.questionsList) {
            // Ubah seluruh kuis jadi teks untuk pencarian cepat
            const quizText = JSON.stringify(data.quiz.questionsList).toLowerCase();
            if (quizText.includes(keyword)) {
                score += 15;
            }
        }

        // Maksimal skor adalah 100
        return Math.min(score, 100);
    }

    searchInput.addEventListener('input', function (e) {
        const keyword = e.target.value.toLowerCase().trim();
        searchResults.innerHTML = ''; // Bersihkan hasil sebelumnya

        if (keyword === '' || !groupDatabase) {
            searchResults.style.display = 'none';
            return;
        }

        let arrayHasil = [];

        // 1. Kumpulkan semua data yang memiliki skor > 0
        for (const key in groupDatabase) {
            const data = groupDatabase[key];
            const groupId = key.split('_')[1];

            const skor = hitungSkorRelevansi(data, keyword);

            if (skor > 0) {
                arrayHasil.push({
                    groupId: groupId,
                    title: data.material?.title || `Materi Kelompok ${groupId}`,
                    score: skor
                });
            }
        }

        // 2. Urutkan hasil dari skor tertinggi ke terendah (Paling Relevan di atas)
        arrayHasil.sort((a, b) => b.score - a.score);

        // 3. Tampilkan hasil ke layar
        if (arrayHasil.length > 0) {
            searchResults.style.display = 'block';

            arrayHasil.forEach(hasil => {
                const resultItem = document.createElement('div');
                resultItem.className = 'search-result-item';

                // Tentukan warna indikator berdasarkan skor
                let scoreColor = '#4caf50'; // Hijau (Sangat Relevan)
                if (hasil.score < 50) scoreColor = '#ff9800'; // Orange (Lumayan)
                if (hasil.score < 25) scoreColor = '#f44336'; // Merah (Kurang Relevan)

                // Render Judul dan Persentase Skor
                resultItem.innerHTML = `
                    <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                        <div>
                            <i class="fa-solid fa-book"></i> ${hasil.title} 
                            <span style="font-size: 0.8em; color: #aaa; margin-left:5px;">(Kel. ${hasil.groupId})</span>
                        </div>
                        <span style="font-size: 11px; background-color: ${scoreColor}; padding: 2px 6px; border-radius: 4px; font-weight: bold;">
                            ${hasil.score}%
                        </span>
                    </div>
                `;

                // Aksi klik untuk pindah halaman
                resultItem.addEventListener('click', function () {
                    const targetMenuLink = document.getElementById('link-material-examples-' + hasil.groupId);
                    if (targetMenuLink) targetMenuLink.click();

                    searchInput.value = '';
                    searchResults.innerHTML = '';
                    searchResults.style.display = 'none';
                    searchBox.classList.remove('show');

                    if (window.innerWidth <= 768 && sidebar) {
                        sidebar.classList.remove('active');
                    }
                });

                searchResults.appendChild(resultItem);
            });
        } else {
            // Jika tidak ada skor sama sekali
            searchResults.style.display = 'block';
            searchResults.innerHTML = '<div class="search-result-empty">Materi tidak ditemukan. Coba kata kunci lain.</div>';
        }
    });

    document.addEventListener('click', function (e) {
        if (!searchBox.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });
}

/* =====================================================================
   BAGIAN 2: MENU ACCORDION SIDEBAR
   ===================================================================== */

// 2A. Buka-Tutup "Menu Materi"
const materialToggles = document.querySelectorAll('[id^="toggle-material-"]');
materialToggles.forEach(button => {
    button.addEventListener('click', function (e) {
        e.preventDefault();
        const idNumber = this.id.split('-').pop();
        const materialDropdown = document.getElementById('dropdown-material-' + idNumber);

        if (materialDropdown) {
            const isNowClosed = materialDropdown.classList.toggle('collapsed');
            const caretIcon = this.querySelector('.caret-icon');
            if (caretIcon) caretIcon.classList.toggle('rotate');

            if (isNowClosed) {
                materialDropdown.querySelectorAll('.nested-menu').forEach(menu => menu.classList.add('collapsed'));
                materialDropdown.querySelectorAll('.caret-icon').forEach(icon => {
                    if (icon !== caretIcon) icon.classList.add('rotate');
                });
            }
        }

        document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
        this.classList.add('active');
    });
});

// 2B. Buka-Tutup "Menu Kelompok"
const groupToggles = document.querySelectorAll('[id^="toggle-group-"]');
groupToggles.forEach(button => {
    button.addEventListener('click', function (e) {
        e.stopPropagation();
        e.preventDefault();

        const idNumber = this.id.split('-').pop();
        const targetDropdown = document.getElementById('dropdown-group-' + idNumber);
        if (targetDropdown) targetDropdown.classList.toggle('collapsed');

        const caretIcon = this.querySelector('.caret-icon');
        if (caretIcon) caretIcon.classList.toggle('rotate');
    });
});

/* =====================================================================
   BAGIAN 3: SISTEM BUKU PINTAR (VARIABEL & FUNGSI INTI)
   ===================================================================== */

const materialView = document.getElementById('view-material-book');
const coverView = document.getElementById('view-cover');
const introView = document.getElementById('view-introduction');

const btnNextPage = document.getElementById('btn-next-page');
const btnPrevPage = document.getElementById('btn-prev-page');
const pageLeft = document.getElementById('page-left');
const pageRight = document.getElementById('page-right');

let currentPage = 1;
const totalPages = 5;
let isAnimating = false;
let activeGroup = "1";
let currentView = 'cover';
let currentQuizIndex = 0;
let currentQuizData = [];

const menuTypes = {
    'link-group-profile': 1,
    'link-material-examples': 2,
    'link-video': 3,
    'link-quiz': 4,
    'link-calculator': 5
};

function navigatePrev() {
    if (isAnimating) return;

    if (currentView === 'cover') {
        return;
    } else if (currentView === 'intro') {
        const linkCover = document.getElementById('link-cover');
        if (linkCover) linkCover.click();
    } else if (currentView === 'material') {
        if (currentPage > 1) {
            flipToPage(currentPage - 1, null);
        } else if (currentPage === 1) {
            if (parseInt(activeGroup) > 1) {
                const prevGroupId = parseInt(activeGroup) - 1;
                const prevMenuLink = document.getElementById('link-calculator-' + prevGroupId);
                if (prevMenuLink) prevMenuLink.click();
            } else {
                const linkIntro = document.getElementById('link-introduction');
                if (linkIntro) linkIntro.click();
            }
        }
    }
}

function navigateNext() {
    if (isAnimating) return;

    if (currentView === 'cover') {
        const linkIntro = document.getElementById('link-introduction');
        if (linkIntro) linkIntro.click();
    } else if (currentView === 'intro') {
        const linkGroup = document.getElementById('link-group-profile-' + activeGroup);
        if (linkGroup) linkGroup.click();
    } else if (currentView === 'material') {
        if (currentPage < totalPages) {
            flipToPage(currentPage + 1, null);
        } else if (currentPage === totalPages) {
            const nextGroupId = parseInt(activeGroup) + 1;
            const nextMenuLink = document.getElementById('link-group-profile-' + nextGroupId);
            if (nextMenuLink) nextMenuLink.click();
        }
    }
}

function flipToPage(targetPage, targetLinkId, isGroupChange = false, forceDirection = null, isViewChange = false) {
    if (isAnimating) return;
    if (targetPage === currentPage && !isGroupChange && !isViewChange) return;

    isAnimating = true;
    let isForward;

    if (isGroupChange && forceDirection !== null) {
        isForward = (forceDirection === 'next');
    } else if (isViewChange) {
        isForward = true;
    } else {
        isForward = targetPage > currentPage;
    }

    if (isForward && pageRight) pageRight.classList.add('turning-next');
    else if (!isForward && pageLeft) pageLeft.classList.add('turning-prev');

    setTimeout(() => {
        const oldLeft = document.getElementById('left-page-' + currentPage);
        const oldRight = document.getElementById('right-page-' + currentPage);
        if (oldLeft) oldLeft.classList.add('hidden');
        if (oldRight) oldRight.classList.add('hidden');

        currentPage = targetPage;

        const newLeft = document.getElementById('left-page-' + currentPage);
        const newRight = document.getElementById('right-page-' + currentPage);
        if (newLeft) newLeft.classList.remove('hidden');
        if (newRight) newRight.classList.remove('hidden');

        if (btnPrevPage) btnPrevPage.style.visibility = currentPage > 1 ? 'visible' : 'hidden';
        if (btnNextPage) btnNextPage.style.visibility = currentPage < totalPages ? 'visible' : 'hidden';

        let idToHighlight = targetLinkId;
        if (!idToHighlight) {
            const typePrefix = Object.keys(menuTypes).find(key => menuTypes[key] === targetPage);
            if (typePrefix) idToHighlight = `${typePrefix}-${activeGroup}`;
        }

        if (idToHighlight) {
            document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
            const activeMenuElement = document.getElementById(idToHighlight);
            if (activeMenuElement) activeMenuElement.classList.add('active');
        }

        if (isForward && pageRight) pageRight.classList.remove('turning-next');
        else if (!isForward && pageLeft) pageLeft.classList.remove('turning-prev');

        refreshMathJax();
        isAnimating = false;
    }, 500);
}

/* =====================================================================
   BAGIAN 4: EVENT LISTENER NAVIGASI
   ===================================================================== */

const ignoreClickTags = ['INPUT', 'LABEL', 'A', 'BUTTON', 'I', 'TEXTAREA', 'SELECT'];

if (pageLeft) {
    pageLeft.addEventListener('click', function (e) {
        if (ignoreClickTags.includes(e.target.tagName)) return;
        const rect = this.getBoundingClientRect();
        if ((e.clientX - rect.left) > (rect.width * 0.15)) return;
        navigatePrev();
    });
}
if (pageRight) {
    pageRight.addEventListener('click', function (e) {
        if (ignoreClickTags.includes(e.target.tagName)) return;
        const rect = this.getBoundingClientRect();
        if ((e.clientX - rect.left) < (rect.width * 0.85)) return;
        navigateNext();
    });
}

document.querySelectorAll('.nested-menu a').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();

        const linkId = this.id;
        const lastDashIndex = linkId.lastIndexOf('-');
        const type = linkId.substring(0, lastDashIndex);
        const groupId = linkId.substring(lastDashIndex + 1);

        if (menuTypes[type]) {
            const targetPage = menuTypes[type];
            const isGroupChange = (activeGroup !== groupId);
            const isViewChange = (currentView !== 'material');
            let forceDirection = null;

            currentView = 'material';

            if (isGroupChange) {
                if (parseInt(groupId) > parseInt(activeGroup)) forceDirection = 'next';
                else forceDirection = 'prev';

                const oldDropdown = document.getElementById('dropdown-group-' + activeGroup);
                const oldToggle = document.getElementById('toggle-group-' + activeGroup);
                if (oldDropdown) oldDropdown.classList.add('collapsed');
                if (oldToggle) {
                    const oldCaret = oldToggle.querySelector('.caret-icon');
                    if (oldCaret) oldCaret.classList.add('rotate');
                }

                const newDropdown = document.getElementById('dropdown-group-' + groupId);
                const newToggle = document.getElementById('toggle-group-' + groupId);
                if (newDropdown) newDropdown.classList.remove('collapsed');

                if (newToggle) {
                    const newCaret = newToggle.querySelector('.caret-icon');
                    if (newCaret) newCaret.classList.remove('rotate');

                    const parentMaterialMenu = newDropdown.closest('ul[id^="dropdown-material-"]');
                    if (parentMaterialMenu) {
                        parentMaterialMenu.classList.remove('collapsed');
                        const parentToggle = parentMaterialMenu.previousElementSibling;
                        if (parentToggle) {
                            const parentCaret = parentToggle.querySelector('.caret-icon');
                            if (parentCaret) parentCaret.classList.remove('rotate');
                        }
                    }
                }

                loadGroupData(groupId);
                activeGroup = groupId;
            }

            if (coverView) coverView.classList.add('hidden');
            if (introView) introView.classList.add('hidden');
            if (materialView) materialView.classList.remove('hidden');

            flipToPage(targetPage, linkId, isGroupChange, forceDirection, isViewChange);

            if (!isGroupChange && targetPage === currentPage) {
                document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
                this.classList.add('active');
            }
        }
    });
});

const linkCover = document.getElementById('link-cover');
if (linkCover) {
    linkCover.addEventListener('click', function (e) {
        e.preventDefault();
        if (isAnimating) return;

        currentView = 'cover';
        if (materialView) materialView.classList.add('hidden');
        if (introView) introView.classList.add('hidden');
        if (coverView) coverView.classList.remove('hidden');

        if (btnPrevPage) btnPrevPage.style.visibility = 'hidden';
        if (btnNextPage) btnNextPage.style.visibility = 'visible';

        document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
        this.classList.add('active');
    });
}

const linkIntro = document.getElementById('link-introduction');
if (linkIntro) {
    linkIntro.addEventListener('click', function (e) {
        e.preventDefault();
        if (isAnimating) return;

        currentView = 'intro';
        if (coverView) coverView.classList.add('hidden');
        if (materialView) materialView.classList.add('hidden');
        if (introView) introView.classList.remove('hidden');

        if (btnPrevPage) btnPrevPage.style.visibility = 'visible';
        if (btnNextPage) btnNextPage.style.visibility = 'visible';

        document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
        this.classList.add('active');
    });
}

const coverPages = document.querySelectorAll('#view-cover .book-page');
if (coverPages.length >= 2) {
    coverPages[1].addEventListener('click', function (e) {
        const rect = this.getBoundingClientRect();
        if ((e.clientX - rect.left) >= (rect.width * 0.85)) navigateNext();
    });
}

const introPages = document.querySelectorAll('#view-introduction .book-page');
if (introPages.length >= 2) {
    introPages[0].addEventListener('click', function (e) {
        const rect = this.getBoundingClientRect();
        if ((e.clientX - rect.left) <= (rect.width * 0.15)) navigatePrev();
    });
    introPages[1].addEventListener('click', function (e) {
        const rect = this.getBoundingClientRect();
        if ((e.clientX - rect.left) >= (rect.width * 0.85)) navigateNext();
    });
}

if (btnPrevPage) {
    btnPrevPage.addEventListener('click', function (e) {
        e.preventDefault();
        navigatePrev();
    });
}
if (btnNextPage) {
    btnNextPage.addEventListener('click', function (e) {
        e.preventDefault();
        navigateNext();
    });
}

document.addEventListener('keydown', function (e) {
    const targetTag = e.target.tagName;
    const isInputting = ['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag) || e.target.isContentEditable;
    if (isInputting) return;

    const sidebarObj = document.getElementById('sidebar');

    if (e.key.toLowerCase() === 'm') {
        if (sidebarObj) sidebarObj.classList.toggle('active');
    }
    if (e.key === 'Escape') {
        if (sidebarObj && sidebarObj.classList.contains('active')) {
            sidebarObj.classList.remove('active');
        }
    }

    if (!isAnimating) {
        if (e.key === 'ArrowLeft') navigatePrev();
        else if (e.key === 'ArrowRight') navigateNext();
    }
});

/* =====================================================================
   BAGIAN 5: DATA ENGINEERING
   ===================================================================== */

let groupDatabase = null;

const safeSetHTML = (id, content) => {
    const el = document.getElementById(id);
    if (el && content !== undefined) el.innerHTML = content;
};
const safeSetText = (id, content) => {
    const el = document.getElementById(id);
    if (el && content !== undefined) el.innerText = content;
};

function initializeData() {
    fetch('assets/data/group_data.json')
        .then(response => response.json())
        .then(data => {
            groupDatabase = data;
            loadGroupData("1");
        })
        .catch(error => console.error("Gagal memuat database JSON:", error));
}

function loadGroupData(groupId) {
    if (!groupDatabase) return;
    const data = groupDatabase['group_' + groupId];

    if (!data) {
        safeSetHTML('profile-title', 'Data Belum Tersedia');
        safeSetHTML('profile-description', '<p>Materi untuk kelompok ini sedang dalam tahap penyusunan.</p>');
        const teamContainer = document.getElementById('team-list-container');
        if (teamContainer) teamContainer.innerHTML = '';
        safeSetText('tujuan-title', 'Tujuan Belum Tersedia');
        safeSetHTML('tujuan-content', '<p>Belum ada data.</p>');
        safeSetText('material-title', 'Materi Kosong');
        safeSetHTML('material-text', '<p>Silakan pilih kelompok lain di menu sidebar.</p>');

        const exampleContainer = document.getElementById('examples-container');
        if (exampleContainer) exampleContainer.innerHTML = '<p class="page-text">Contoh soal belum tersedia.</p>';

        safeSetHTML('video-title', 'Video Belum Tersedia');
        const fallbackVideo = document.getElementById('iframe-video');
        if (fallbackVideo) fallbackVideo.src = '';

        safeSetText('catatan-title', 'Catatan');
        const catatanContainer = document.getElementById('catatan-container');
        if (catatanContainer) catatanContainer.innerHTML = '<p class="page-text">Tidak ada catatan.</p>';

        const quizContainer = document.getElementById('quiz-container');
        if (quizContainer) quizContainer.innerHTML = '<p class="page-text">Soal belum tersedia.</p>';
        return;
    }

    const quizResultContainer = document.getElementById('quiz-result-container');
    const submitBtn = document.getElementById('btn-submit-quiz');
    if (quizResultContainer) quizResultContainer.innerHTML = '';
    if (submitBtn) {
        submitBtn.innerHTML = 'Kirim Jawaban <i class="fa-solid fa-check"></i>';
        submitBtn.style.backgroundColor = 'var(--sidebar-bg)';
    }

    safeSetHTML('profile-title', data.profile?.pageTitle);
    safeSetHTML('profile-description', data.profile?.description);

    const teamContainer = document.getElementById('team-list-container');
    if (teamContainer && data.profile?.members) {
        teamContainer.innerHTML = '';
        data.profile.members.forEach((member) => {
            if (member.name.trim() !== "") {
                const photoSrc = member.photo ? member.photo : 'assets/img/default-avatar.png';
                teamContainer.innerHTML += `
                    <div class="team-member">
                        <div class="member-photo">
                            <img src="${photoSrc}" alt="Foto ${member.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=2b4e6d&color=fff'">
                        </div>
                        <div class="member-info">
                            <h4 class="member-name">${member.name}</h4>
                            <p class="member-nim">NIM: ${member.studentId}</p>
                            <p class="member-major">${member.major}</p>
                        </div>
                    </div>
                `;
            }
        });
    }

    safeSetHTML('tujuan-title', data.tujuan?.title);
    safeSetHTML('tujuan-content', data.tujuan?.content);

    safeSetText('material-title', data.material?.title);
    safeSetHTML('material-text', data.material?.theoryContent?.join(''));

    const exampleContainer = document.getElementById('examples-container');
    if (exampleContainer && data.material?.examples) {
        exampleContainer.innerHTML = '';
        data.material.examples.forEach((item) => {
            exampleContainer.innerHTML += `
                <div class="example-box">
                    <div class="example-box-header">${item.question}</div>
                    <div class="example-box-body">${item.discussion}</div>
                </div>
            `;
        });
    }

    // KODE BARU (PENYELESAIAN)
    safeSetHTML('video-title', 'Video Pembelajaran');
    safeSetHTML('video-description', ''); // Kosongkan deskripsi statis agar diganti oleh deskripsi dari JSON

    const videoContainer = document.getElementById('video-list-container');
    if (videoContainer) {
        videoContainer.innerHTML = '';
        if (data.videos && Array.isArray(data.videos) && data.videos.length > 0) {
            data.videos.forEach((vid) => {
                if (vid.youtubeUrl && vid.youtubeUrl.trim() !== "" && vid.youtubeUrl !== "-") {
                    // Menyuntikkan vid.title dan vid.description dari JSON ke HTML
                    videoContainer.innerHTML += `
                    <div class="video-item">
                        <h4 class="video-title" style="margin-bottom: 20px;">
                            <i class="fa-brands fa-youtube video-title-icon"></i> ${vid.title}
                        </h4>
                        <div class="video-description page-text" style="margin-bottom: 25px;">
                            ${vid.description}
                        </div>
                        <div class="video-wrapper">
                            <iframe 
                                class="video-iframe"
                                src="${vid.youtubeUrl}" 
                                title="${vid.title}" 
                                frameborder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowfullscreen>
                            </iframe>
                        </div>
                    </div>
                `;
                }
            });
        } else {
            videoContainer.innerHTML = '<p class="page-text">Video materi belum tersedia untuk kelompok ini.</p>';
        }
    }

    safeSetText('catatan-title', data.catatan?.title);
    const catatanContainer = document.getElementById('catatan-container');
    if (catatanContainer) {
        if (data.catatan && data.catatan.content && data.catatan.content.length > 0) {
            catatanContainer.innerHTML = data.catatan.content.join('');
        } else {
            catatanContainer.innerHTML = '<p class="page-text">Tidak ada catatan penting untuk bab ini.</p>';
        }
    }

    safeSetText('quiz-title', data.quiz?.title);
    safeSetText('quiz-description', data.quiz?.description);

    if (data.quiz && data.quiz.questionsList && data.quiz.questionsList.length > 0) {
        currentQuizData = data.quiz.questionsList;
        currentQuizIndex = 0;
        renderQuizQuestion();
    } else {
        const quizContainer = document.getElementById('quiz-container');
        if (quizContainer) quizContainer.innerHTML = '<p class="page-text">Soal evaluasi belum tersedia.</p>';
    }

    safeSetHTML('calculator-title', data.calculator?.title);
    safeSetHTML('calculator-description', data.calculator?.description);

    const calcIframe = document.getElementById('iframe-calculator');
    const calcEmptyState = document.getElementById('calc-empty-state');

    if (calcIframe && calcEmptyState) {
        if (data.calculator?.url && data.calculator.url.trim() !== '' && data.calculator.url !== "-") {
            calcEmptyState.classList.add('hidden');
            calcIframe.classList.remove('hidden');
            calcIframe.src = data.calculator.url;
        } else {
            calcIframe.classList.add('hidden');
            calcEmptyState.classList.remove('hidden');
            calcIframe.src = 'about:blank';
        }
    }

    setTimeout(() => {
        refreshMathJax();
    }, 300);
}

function renderQuizQuestion() {
    const quizContainer = document.getElementById('quiz-container');
    if (!quizContainer || !currentQuizData || currentQuizData.length === 0) return;

    if (currentQuizIndex < 0) currentQuizIndex = 0;
    if (currentQuizIndex >= currentQuizData.length) currentQuizIndex = currentQuizData.length - 1;

    const q = currentQuizData[currentQuizIndex];
    const totalQ = currentQuizData.length;

    const prevClass = currentQuizIndex === 0 ? 'btn-hidden' : '';
    const nextClass = currentQuizIndex === totalQ - 1 ? 'btn-hidden' : '';

    quizContainer.innerHTML = `
        <div class="quiz-question-single">
            <p class="quiz-progress-text">Soal ${currentQuizIndex + 1} dari ${totalQ}</p>
            <p><strong>${currentQuizIndex + 1}.</strong> ${q.questionText}</p>
            <label class="quiz-option"><input type="radio" name="q_current" value="A"> A. ${q.options.A}</label>
            <label class="quiz-option"><input type="radio" name="q_current" value="B"> B. ${q.options.B}</label>
            <label class="quiz-option"><input type="radio" name="q_current" value="C"> C. ${q.options.C}</label>
            <label class="quiz-option"><input type="radio" name="q_current" value="D"> D. ${q.options.D}</label>
        </div>
        
        <div class="quiz-nav-container">
            <button id="btn-prev-q" class="quiz-nav-btn ${prevClass}" title="Soal Sebelumnya">
                <i class="fa-solid fa-arrow-left"></i>
            </button>
            <button id="btn-next-q" class="quiz-nav-btn ${nextClass}" title="Soal Selanjutnya">
                <i class="fa-solid fa-arrow-right"></i>
            </button>
        </div>
    `;

    const quizResultContainer = document.getElementById('quiz-result-container');
    const submitBtnQuiz = document.getElementById('btn-submit-quiz');
    if (quizResultContainer) quizResultContainer.innerHTML = '';
    if (submitBtnQuiz) {
        submitBtnQuiz.innerHTML = 'Kirim Jawaban <i class="fa-solid fa-check"></i>';
        submitBtnQuiz.style.backgroundColor = 'var(--sidebar-bg)';
    }

    setTimeout(() => {
        refreshMathJax();
    }, 100);

    const btnPrevQ = document.getElementById('btn-prev-q');
    const btnNextQ = document.getElementById('btn-next-q');

    if (btnPrevQ) {
        btnPrevQ.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentQuizIndex > 0) {
                currentQuizIndex--;
                renderQuizQuestion();
            }
        });
    }

    if (btnNextQ) {
        btnNextQ.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentQuizIndex < totalQ - 1) {
                currentQuizIndex++;
                renderQuizQuestion();
            }
        });
    }
}

/* =====================================================================
   BAGIAN 6: SISTEM EVALUASI KUIS
   ===================================================================== */

const submitBtnQuiz = document.getElementById('btn-submit-quiz');
const quizResultContainer = document.getElementById('quiz-result-container');

if (submitBtnQuiz && quizResultContainer) {
    submitBtnQuiz.addEventListener('click', function (e) {
        e.preventDefault();

        if (quizResultContainer.innerHTML.trim() !== '') {
            quizResultContainer.innerHTML = '';
            submitBtnQuiz.innerHTML = 'Kirim Jawaban <i class="fa-solid fa-check"></i>';
            submitBtnQuiz.style.backgroundColor = 'var(--sidebar-bg)';
            return;
        }

        if (!currentQuizData || currentQuizData.length === 0) return;

        const q = currentQuizData[currentQuizIndex];
        if (!q) return;

        const selectedOption = document.querySelector(`input[name="q_current"]:checked`);
        const userAnswer = selectedOption ? selectedOption.value : null;

        if (!userAnswer) {
            alert("Silakan pilih jawaban (A/B/C/D) terlebih dahulu.");
            return;
        }

        const isCorrect = userAnswer === q.correctAnswer;
        const statusClass = isCorrect ? 'correct' : 'incorrect';
        const statusText = isCorrect
            ? `Benar <i class="fa-solid fa-check"></i>`
            : `Salah <i class="fa-solid fa-xmark"></i>`;

        let resultHTML = '<h3 class="quiz-result-header">Hasil & Pembahasan</h3>';
        resultHTML += `
            <div class="result-box ${statusClass}">
                <p class="result-text">
                    <strong>Soal ${currentQuizIndex + 1}:</strong> 
                    <span class="result-status ${statusClass}">${statusText}</span>
                </p>
                <p class="result-detail">
                    Jawaban Anda: <strong>${userAnswer}</strong> <br>
                    Kunci Jawaban: <strong>${q.correctAnswer}</strong>
                </p>
                <div class="result-explanation">
                    <strong>Pembahasan:</strong><br>
                    ${q.explanation ? q.explanation : 'Pembahasan belum tersedia.'}
                </div>
            </div>
        `;

        quizResultContainer.innerHTML = resultHTML;
        submitBtnQuiz.innerHTML = 'Sembunyikan Hasil <i class="fa-solid fa-eye-slash"></i>';
        submitBtnQuiz.style.backgroundColor = '#6c757d';

        setTimeout(() => {
            refreshMathJax();
        }, 300);
    });
}

document.addEventListener('DOMContentLoaded', initializeData);

document.addEventListener("DOMContentLoaded", function () {
    let daftarGrafikAjaib = {};

    const materialTextContainer = document.getElementById('material-text');
    const materialTitle = document.getElementById('material-title');

    const observer = new MutationObserver(() => {

        // 1. Cek apakah butuh render
        const semuaTempatGrafik = document.querySelectorAll('.tempat-grafik');
        let butuhRender = false;
        semuaTempatGrafik.forEach(wadah => {
            if (!wadah.querySelector('canvas')) {
                butuhRender = true;
            }
        });

        if (!butuhRender) return;

        // Matikan sensor sementara
        observer.disconnect();

        // 2. Bersihkan grafik lama
        Object.values(daftarGrafikAjaib).forEach(chart => chart.destroy());
        daftarGrafikAjaib = {};

        // 3. Gambar grafik yang lebih rapi
        if (semuaTempatGrafik.length > 0 && groupDatabase && materialTitle) {
            const judulSaatIni = materialTitle.innerText;
            let dataMateriSaatIni = null;

            for (const key in groupDatabase) {
                if (groupDatabase[key].material && groupDatabase[key].material.title === judulSaatIni) {
                    dataMateriSaatIni = groupDatabase[key].material;
                    break;
                }
            }

            if (dataMateriSaatIni && dataMateriSaatIni.grafikList) {
                semuaTempatGrafik.forEach(wadah => {
                    const idGrafik = wadah.getAttribute('data-id');
                    const dataGrafik = dataMateriSaatIni.grafikList.find(g => g.id === idGrafik);

                    if (dataGrafik) {
                        wadah.innerHTML = `<canvas id="canvas-${idGrafik}"></canvas>`;
                        const ctx = document.getElementById(`canvas-${idGrafik}`).getContext('2d');

                        daftarGrafikAjaib[idGrafik] = new Chart(ctx, {
                            type: 'scatter',
                            data: {
                                datasets: [{
                                    label: dataGrafik.label,
                                    data: dataGrafik.dataKoordinat,
                                    borderColor: dataGrafik.warna || '#2b4e6d',
                                    backgroundColor: dataGrafik.warna || '#2b4e6d',
                                    borderWidth: 3, // Garis dipertebal sedikit agar jelas
                                    pointRadius: 5,
                                    showLine: true,
                                    tension: 0 // Garis lurus kaku
                                }]
                            },
                            options: {
                                responsive: true,
                                // Bikin grafiknya simetris kotak 1:1 layaknya kertas milimeter blok
                                aspectRatio: 1,
                                scales: {
                                    x: {
                                        type: 'linear',
                                        // Memaksa sumbu bergeser agar persilangan 0,0 lebih ke tengah
                                        suggestedMin: -2,
                                        suggestedMax: 6,
                                        title: {
                                            display: true,
                                            text: 'X',
                                            align: 'end', // Tulisan ditaruh di paling kanan
                                            font: { weight: 'bold', size: 14 }
                                        },
                                        grid: {
                                            // Jika angkanya 0, garis jadi hitam tebal. Jika tidak, abu-abu tipis
                                            color: (context) => context.tick.value === 0 ? '#111827' : '#e5e7eb',
                                            lineWidth: (context) => context.tick.value === 0 ? 2 : 1
                                        },
                                        border: { display: false },
                                        ticks: {
                                            stepSize: 1 // Angka selalu loncat bulat 1, 2, 3...
                                        }
                                    },
                                    y: {
                                        type: 'linear',
                                        suggestedMin: -2,
                                        suggestedMax: 6,
                                        title: {
                                            display: true,
                                            text: 'Y = f(x)',
                                            align: 'end', // Tulisan ditaruh di paling atas
                                            font: { weight: 'bold', size: 14 }
                                        },
                                        grid: {
                                            color: (context) => context.tick.value === 0 ? '#111827' : '#e5e7eb',
                                            lineWidth: (context) => context.tick.value === 0 ? 2 : 1
                                        },
                                        border: { display: false },
                                        ticks: {
                                            stepSize: 1
                                        }
                                    }
                                },
                                plugins: {
                                    tooltip: {
                                        callbacks: {
                                            label: (context) => `Titik: (${context.parsed.x}, ${context.parsed.y})`
                                        }
                                    }
                                }
                            }
                        });
                    }
                });
            }
        }

        // Nyalakan sensor kembali
        if (materialTextContainer) {
            observer.observe(materialTextContainer, { childList: true });
        }
    });

    if (materialTextContainer) {
        observer.observe(materialTextContainer, { childList: true });
    }


});


document.addEventListener('DOMContentLoaded', () => {
    const fontBtn = document.getElementById('font-btn');
    const body = document.body;

    // Daftar class tema font. 
    // String kosong '' adalah tema default (:root)
    const fontThemes = ['', 'font-theme-2', 'font-theme-3'];
    let currentThemeIndex = 0;

    fontBtn.addEventListener('click', (e) => {
        // Mencegah halaman melompat ke atas karena href="#"
        e.preventDefault();

        // Hapus class tema yang sedang aktif (jika ada)
        if (fontThemes[currentThemeIndex]) {
            body.classList.remove(fontThemes[currentThemeIndex]);
        }

        // Pindah ke indeks tema berikutnya, kembali ke 0 jika sudah di akhir
        currentThemeIndex = (currentThemeIndex + 1) % fontThemes.length;

        // Tambahkan class tema yang baru
        if (fontThemes[currentThemeIndex]) {
            body.classList.add(fontThemes[currentThemeIndex]);
        }
    });
});