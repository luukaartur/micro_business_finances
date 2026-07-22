/* ==========================================
   ОБРОБКА ВЗАЄМОДІЇ З ІНТЕРФЕЙСОМ ТА ФОНОМ
   ========================================== */

// Прапор для запобігання миттєвому закриттю під час переходу
let isScreenTransitioning = false;

// 1. Закриття швидких модальних вікон при кліку на затемнений фон
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.preventDefault();
        e.stopPropagation();
        
        if (typeof window.closeModal === 'function') {
            window.closeModal();
        } else {
            e.target.classList.remove('active');
        }
        
        const fastFin = document.getElementById('fastFinanceModal');
        const payout = document.getElementById('payoutModal');
        const deletion = document.getElementById('deletionModal');
        
        if (fastFin) fastFin.classList.remove('active');
        if (payout) payout.classList.remove('active');
        if (deletion) deletion.classList.remove('active');
    }
});

// 2. Закриття активних екранів на ПК при кліку поза їх межами
document.addEventListener('click', function(e) {
    // Якщо йде процес переключення екрана — ігноруємо клік
    if (isScreenTransitioning) return;

    if (window.innerWidth >= 800 && document.body.classList.contains('has-active-screen')) {
        const activeScreen = document.querySelector('.content-panel .screen.active');
        
        if (activeScreen && !activeScreen.contains(e.target)) {
            // Ігноруємо кліки по лівій панелі, модалкам, кнопкам ТА елементах списків (товарах/працівницях)
            const isClickInsideSidebar = e.target.closest('.sidebar-panel');
            const isClickInsideModal = e.target.closest('.modal-overlay');
            const isClickOnButton = e.target.closest('button, .btn, [onclick]');
            const isClickOnListItem = e.target.closest('.product-item, .staff-item, .widget-task-item');

            if (!isClickInsideSidebar && !isClickInsideModal && !isClickOnButton && !isClickOnListItem) {
                if (typeof window.goToScreen === 'function') {
                    window.goToScreen('screen-main');
                }
            }
        }
    }
});

// 3. Синхронізація стану фону та захист від випадкового закриття при переходу
document.addEventListener('DOMContentLoaded', () => {
    const originalGoToScreen = window.goToScreen;
    
    if (typeof originalGoToScreen === 'function') {
        window.goToScreen = function(screenId) {
            // Встановлюємо прапор переходу
            isScreenTransitioning = true;
            
            originalGoToScreen(screenId);
            
            if (screenId === 'screen-main' || !screenId) {
                document.body.classList.remove('has-active-screen');
            } else {
                document.body.classList.add('has-active-screen');
            }

            // Знімаємо прапор після завершення події кліку
            setTimeout(() => {
                isScreenTransitioning = false;
            }, 100);
        };
    }
});
