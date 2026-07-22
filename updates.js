/* ==========================================
   ОБРОБКА ВЗАЄМОДІЇ З ІНТЕРФЕЙСОМ ТА ФОНОМ
   ========================================== */

// 1. Закриття швидких модальних вікон при кліку на затемнений фон
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.preventDefault();
        e.stopPropagation();
        
        // Якщо в HTML є своя функція closeModal, викликаємо її
        if (typeof window.closeModal === 'function') {
            window.closeModal();
        } else {
            e.target.classList.remove('active');
        }
        
        // Закриваємо додаткові модалки
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
    if (window.innerWidth >= 800 && document.body.classList.contains('has-active-screen')) {
        const activeScreen = document.querySelector('.content-panel .screen.active');
        
        if (activeScreen && !activeScreen.contains(e.target)) {
            // Ігноруємо кліки по лівій панелі, модалкам та кнопках
            const isClickInsideSidebar = e.target.closest('.sidebar-panel');
            const isClickInsideModal = e.target.closest('.modal-overlay');
            const isClickOnButton = e.target.closest('button, .btn, [onclick]');

            if (!isClickInsideSidebar && !isClickInsideModal && !isClickOnButton) {
                if (typeof window.goToScreen === 'function') {
                    window.goToScreen('screen-main');
                }
            }
        }
    }
});

// 3. Синхронізація класу фону для body при переключенні екранів
document.addEventListener('DOMContentLoaded', () => {
    const originalGoToScreen = window.goToScreen;
    
    if (typeof originalGoToScreen === 'function') {
        window.goToScreen = function(screenId) {
            originalGoToScreen(screenId);
            
            if (screenId === 'screen-main' || !screenId) {
                document.body.classList.remove('has-active-screen');
            } else {
                document.body.classList.add('has-active-screen');
            }
        };
    }
});
