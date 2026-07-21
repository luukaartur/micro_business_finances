/* ==========================================
   КРОК 1: УНІВЕРСАЛЬНЕ ЗАКРИТТЯ ВІКОН ПО КЛІКУ НА ФОН
   ========================================== */

// 1. Обробка кліку по фону для швидких модалок (Гроші, Виплати, Справочники)
document.addEventListener('click', function(e) {
    // Перевіряємо клік по модальному оверлею
    if (e.target.classList.contains('modal-overlay')) {
        e.preventDefault();
        e.stopPropagation();
        
        // Закриваємо поточне модальне вікно
        e.target.classList.remove('active');
    }
});

// 2. Обробка кліку по фону для екранів на ПК
document.addEventListener('click', function(e) {
    if (window.innerWidth >= 800 && document.body.classList.contains('has-active-screen')) {
        const activeScreen = document.querySelector('.content-panel .screen.active');
        
        if (activeScreen && !activeScreen.contains(e.target)) {
            // Перевіряємо, щоб клік не був по плитках дашборду чи кнопках
            const isClickInsideSidebar = e.target.closest('.sidebar-panel');
            const isClickInsideModal = e.target.closest('.modal-overlay');

            if (!isClickInsideSidebar && !isClickInsideModal) {
                if (typeof goToScreen === 'function') {
                    goToScreen('screen-main');
                }
            }
        }
    }
});

// 3. Синхронізація стану фону при переключенні екранів
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
