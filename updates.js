/* ==========================================
   1. ЗАКРИТТЯ ПО КЛІКУ ПОЗА КАРТКОЮ
   ========================================== */
document.addEventListener('click', function(e) {
    const activeModal = document.querySelector('.modal-overlay.active, .modal.active, .modal-backdrop.active');
    
    if (activeModal && e.target === activeModal) {
        activeModal.classList.remove('active');
        if (typeof goToScreen === 'function') goToScreen('screen-main');
        return;
    }

    if (e.target.classList.contains('modal-overlay') || 
        e.target.classList.contains('modal-backdrop') || 
        e.target.id === 'modal-backdrop-overlay') {
        
        document.querySelectorAll('.modal-overlay, .modal, .modal-backdrop').forEach(m => m.classList.remove('active'));
        if (typeof goToScreen === 'function') goToScreen('screen-main');
    }
});


/* ==========================================
   2. КЛОНУВАННЯ ТОВАРУ
   ========================================== */
window.duplicateProduct = function(index, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    if (typeof productsDatabase === 'undefined' || !productsDatabase[index]) {
        if (typeof showToast === 'function') showToast("Помилка: товар не знайдено");
        return;
    }

    const original = productsDatabase[index];
    const rawComps = original.composition || original.calcRows || original.calc || [];
    
    const newProduct = {
        id: 'prod_' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        business: original.business || (typeof state !== 'undefined' ? state.currentBusiness : ''),
        name: original.name + ' (копія)',
        cost: original.cost || 0,
        imgUrl: original.imgUrl || original.img || '',
        composition: JSON.parse(JSON.stringify(rawComps)),
        calcRows: JSON.parse(JSON.stringify(rawComps)),
        calc: JSON.parse(JSON.stringify(rawComps))
    };

    productsDatabase.push(newProduct);

    try {
        if (typeof renderProductsList === 'function') renderProductsList();
    } catch(err) {
        console.warn("Помилка при оновленні списку товарів:", err);
    }

    if (typeof showToast === 'function') showToast("Товар успішно склоновано!");
};


/* ==========================================
   3. АВТОПІДСТАНОВКА ОДИНИЦІ ТА ЦІНИ ПРИ ЗМІНІ МАТЕРІАЛУ
   ========================================== */
document.addEventListener('change', function(e) {
    if (e.target && e.target.tagName === 'SELECT') {
        const selectedMaterial = e.target.value;
        if (!selectedMaterial) return;

        const parentContainer = e.target.closest('.modal-card, .modal, body') || document.body;
        
        // Знаходимо селект одиниці виміру
        const selects = Array.from(parentContainer.querySelectorAll('select'));
        const unitSelect = selects.find(s => s !== e.target);
        
        // Знаходимо інпут ціни
        const inputs = parentContainer.querySelectorAll('input');
        let priceInput = null;

        inputs.forEach(inp => {
            const labelText = (inp.parentElement ? inp.parentElement.innerText : '').toUpperCase();
            if (labelText.includes('ЦІНА') || labelText.includes('ОДИНИЦЮ')) {
                priceInput = inp;
            }
        });

        // Визначаємо одиницю
        if (unitSelect) {
            const lowerName = selectedMaterial.toLowerCase();
            if (lowerName.includes('тканина') || lowerName.includes('нитки') || lowerName.includes('секонд') || lowerName.includes('наповнювач')) {
                unitSelect.value = 'кг';
            } else if (lowerName.includes('стрічка') || lowerName.includes('блискавка') || lowerName.includes('мереживо')) {
                unitSelect.value = 'м';
            } else {
                unitSelect.value = 'шт';
            }
        }

        // Визначаємо ціну
        const savedParams = JSON.parse(localStorage.getItem('material_defaults') || '{}');
        if (savedParams[selectedMaterial] && priceInput) {
            priceInput.value = savedParams[selectedMaterial].price || 0;
        }
    }
});


/* ==========================================
   4. ІНТЕГРАЦІЯ З РІДНОЮ КАЛЬКУЛЯЦІЄЮ ТОВАРУ
   ========================================== */
let activeProductRef = null;

const originalOpenProductProfile = window.openProductProfile;
window.openProductProfile = function(productId) {
    if (typeof originalOpenProductProfile === 'function') {
        originalOpenProductProfile(productId);
    }

    if (typeof productsDatabase === 'undefined') return;
    
    const prod = productsDatabase.find(p => p.id === productId || p.id == productId);
    if (!prod) return;

    activeProductRef = prod;

    if (!activeProductRef.composition) {
        activeProductRef.composition = activeProductRef.calcRows || activeProductRef.calc || [];
    }

    setTimeout(() => {
        updateProductUI();
    }, 100);
};

function updateProductUI() {
    if (!activeProductRef) return;

    const comps = activeProductRef.composition || activeProductRef.calcRows || activeProductRef.calc || [];
    
    // Перераховуємо суму собівартості
    let totalSum = 0;
    comps.forEach(item => {
        const qty = parseFloat(item.qty || item.quantity) || 1;
        const price = parseFloat(item.price || item.cost) || 0;
        totalSum += (qty * price);
    });

    activeProductRef.cost = totalSum;

    // Безпечно викликаємо родний рендер списку, якщо він є
    try {
        if (typeof renderProductsList === 'function') renderProductsList();
    } catch(e) {
        console.warn("Помилка рендеру головного списку:", e);
    }
}

// Додавання нової складової при натисканні на кнопку "+"
document.addEventListener('click', function(e) {
    const btn = e.target.closest('button');
    if (!btn || !activeProductRef) return;

    const btnText = btn.innerText.trim();
    if (btnText !== '+' && !btn.classList.contains('btn-add')) return;

    const parent = btn.closest('.modal-card, .modal, body') || document.body;
    const selectMat = parent.querySelector('select');
    if (!selectMat || !selectMat.value) return;

    const matName = selectMat.value;
    let qty = 1;
    let price = 0;
    let unit = 'шт';

    // Одиниця виміру
    const selects = Array.from(parent.querySelectorAll('select'));
    const unitSelect = selects.find(s => s !== selectMat);
    if (unitSelect) unit = unitSelect.value;

    // Кількість та Ціна
    const inputs = parent.querySelectorAll('input');
    inputs.forEach(inp => {
        const val = parseFloat(inp.value);
        const parentTxt = (inp.parentElement ? inp.parentElement.innerText : '').toUpperCase();

        if (parentTxt.includes('КІЛЬКІСТЬ') || inp.type === 'number') {
            if (!isNaN(val)) qty = val;
        } else if (parentTxt.includes('ЦІНА') || parentTxt.includes('ОДИНИЦЮ')) {
            if (!isNaN(val)) price = val;
        }
    });

    if (!activeProductRef.composition) activeProductRef.composition = [];

    activeProductRef.composition.push({
        name: matName,
        qty: qty,
        price: price,
        unit: unit
    });

    activeProductRef.calcRows = activeProductRef.composition;
    activeProductRef.calc = activeProductRef.composition;

    updateProductUI();
});
