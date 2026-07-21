/* ==========================================
   1. ЗАКРИТТЯ ПО КЛІКУ ПОЗА МОДАЛКОЮ
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
   3. АВТОПІДСТАНОВКА ОДИНИЦІ ТА ЦІНИ ДЛЯ #calcItemName
   ========================================== */
document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'calcItemName') {
        const selectedMaterial = e.target.value;
        if (!selectedMaterial) return;

        const unitSelect = document.getElementById('calcItemUnit');
        const priceInput = document.getElementById('calcItemPrice');

        // Авто-перемикання одиниці
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

        // Авто-підстановка ціни
        const savedParams = JSON.parse(localStorage.getItem('material_defaults') || '{}');
        if (savedParams[selectedMaterial] && priceInput) {
            priceInput.value = savedParams[selectedMaterial].price || 0;
        }
    }
});


/* ==========================================
   4. ВІДОБРАЖЕННЯ ТА ДОДАВАННЯ СКЛАДНИКІВ
   ========================================== */
let activeProductRef = null;

// Перехоплюємо відкриття товару
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
        renderProductCalcRows();
    }, 100);
};

// Функція рендеру списку позицій у калькуляторі
function renderProductCalcRows() {
    const container = document.getElementById('calcRowsContainer');
    const totalElem = document.getElementById('calcTotalSum');
    
    if (!container || !activeProductRef) return;

    const comps = activeProductRef.composition || activeProductRef.calcRows || [];
    let totalSum = 0;

    if (comps.length === 0) {
        container.innerHTML = '<div style="color: #999; font-size: 13px; text-align: center; padding: 12px 0;">Калькуляція порожня</div>';
    } else {
        let html = '';
        comps.forEach((item, idx) => {
            const qty = parseFloat(item.qty || item.quantity) || 1;
            const price = parseFloat(item.price || item.cost) || 0;
            const sum = qty * price;
            totalSum += sum;

            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #e0e0e0; font-size: 13px;">
                    <div>
                        <strong style="color: #222;">${item.name || 'Матеріал'}</strong>
                        <div style="font-size: 11px; color: #777;">${qty} ${item.unit || 'шт'} × ${price} ₴</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-weight: 700; color: #111;">${sum.toLocaleString('uk-UA')} ₴</span>
                        <button type="button" onclick="removeCalcItem(${idx})" style="background: #ffe5e5; border: none; color: #ff3b30; width: 22px; height: 22px; border-radius: 50%; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">✕</button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    if (totalElem) {
        totalElem.innerText = `${totalSum.toLocaleString('uk-UA')} ₴`;
    }

    // Оновлюємо собівартість
    activeProductRef.cost = totalSum;

    // Оновлюємо верхню цифру Собівартості
    const topCost = document.querySelector('.product-cost, [data-cost]');
    if (topCost) topCost.innerText = `${totalSum.toLocaleString('uk-UA')} ₴`;
}

// Перехоплюємо натискання кнопки "Додати в калькулятор" (submit форми)
document.addEventListener('submit', function(e) {
    if (e.target && e.target.id === 'calcRowForm') {
        e.preventDefault();
        
        if (!activeProductRef) return;

        const nameSelect = document.getElementById('calcItemName');
        const unitSelect = document.getElementById('calcItemUnit');
        const qtyInput = document.getElementById('calcItemQty');
        const priceInput = document.getElementById('calcItemPrice');

        if (!nameSelect || !nameSelect.value) return;

        const newItem = {
            name: nameSelect.value,
            unit: unitSelect ? unitSelect.value : 'шт',
            qty: parseFloat(qtyInput ? qtyInput.value : 1) || 1,
            price: parseFloat(priceInput ? priceInput.value : 0) || 0
        };

        if (!activeProductRef.composition) activeProductRef.composition = [];
        
        activeProductRef.composition.push(newItem);
        activeProductRef.calcRows = activeProductRef.composition;
        activeProductRef.calc = activeProductRef.composition;

        // Очищаємо інпути після додавання
        if (priceInput) priceInput.value = '';
        if (qtyInput) qtyInput.value = '1';

        // Перемальовуємо список
        renderProductCalcRows();
    }
});

// Видалення складової зі списку
window.removeCalcItem = function(index) {
    if (!activeProductRef || !activeProductRef.composition) return;
    
    activeProductRef.composition.splice(index, 1);
    activeProductRef.calcRows = activeProductRef.composition;
    activeProductRef.calc = activeProductRef.composition;
    
    renderProductCalcRows();
};
