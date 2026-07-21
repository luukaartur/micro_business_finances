/* ==========================================
   1. БЕЗПЕЧНЕ ЗАКРИТТЯ ПО КЛІКУ ПОЗА МОДАЛКОЮ
   ========================================== */
document.addEventListener('click', function(e) {
    // Реагуємо ТІЛЬКИ якщо клікнули ПРЯМО по затемненому оверлею (фона)
    const isOverlayClick = e.target.classList.contains('modal-overlay') || 
                           e.target.classList.contains('modal-backdrop') || 
                           e.target.id === 'modal-backdrop-overlay';

    if (isOverlayClick) {
        e.preventDefault();
        
        // Закриваємо тільки активну модалку
        const activeModal = e.target;
        activeModal.classList.remove('active');

        // Зберігаємо зміни при закритті
        saveDataToLocalStorage();

        const remainingModals = document.querySelectorAll('.modal-overlay.active, .modal.active, .modal-backdrop.active');
        if (remainingModals.length === 0 && typeof goToScreen === 'function') {
            goToScreen('screen-main');
        }
    }
});


/* ==========================================
   ФУНКЦІЯ ПРИМУСОВОГО ЗБЕРЕЖЕННЯ В ЛОКАЛЬНУ БАЗУ
   ========================================== */
function saveDataToLocalStorage() {
    if (typeof productsDatabase !== 'undefined') {
        localStorage.setItem('productsDatabase', JSON.stringify(productsDatabase));
        localStorage.setItem('products', JSON.stringify(productsDatabase));
    }
}


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
    saveDataToLocalStorage();

    try {
        if (typeof renderProductsList === 'function') renderProductsList();
    } catch(err) {
        console.warn("Помилка при оновленні списку товарів:", err);
    }

    if (typeof showToast === 'function') showToast("Товар успішно склоновано!");
};


/* ==========================================
   3. АВТОПІДСТАНОВКА ТА ЗБЕРЕЖЕННЯ ОДИНИЦІ І ЦІНИ
   ========================================== */
document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'calcItemName') {
        const selectedMaterial = e.target.value;
        if (!selectedMaterial) return;

        const unitSelect = document.getElementById('calcItemUnit');
        const priceInput = document.getElementById('calcItemPrice');

        const savedParams = JSON.parse(localStorage.getItem('material_defaults') || '{}');
        
        if (savedParams[selectedMaterial]) {
            if (unitSelect && savedParams[selectedMaterial].unit) {
                unitSelect.value = savedParams[selectedMaterial].unit;
            }
            if (priceInput && savedParams[selectedMaterial].price !== undefined) {
                priceInput.value = savedParams[selectedMaterial].price;
            }
        } else {
            if (unitSelect) {
                const lowerName = selectedMaterial.toLowerCase();
                if (lowerName.includes('тканина') || lowerName.includes('нитки') || lowerName.includes('секонд') || lowerName.includes('наповнювач')) {
                    unitSelect.value = 'кг';
                } else if (lowerName.includes('стрічка') || lowerName.includes('блискавка') || lowerName.includes('мереживо') || lowerName.includes('мотузка') || lowerName.includes('шнур')) {
                    unitSelect.value = 'м';
                } else {
                    unitSelect.value = 'шт';
                }
            }
        }
    }
});


/* ==========================================
   4. ДВОХРЕЖИМНИЙ ПЕРЕГЛЯД ТА РЕДАГУВАННЯ ТОВАРУ
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
        setupProductViewMode();
    }, 50);
};

function setupProductViewMode() {
    const calcBox = document.querySelector('.cost-calculator-box');
    const formGroup = document.getElementById('calcRowForm');
    
    if (!calcBox || !activeProductRef) return;

    if (formGroup) formGroup.style.display = 'none';

    renderProductCalcRows(false);

    let editBtn = document.getElementById('toggleEditProductBtn');
    if (!editBtn) {
        editBtn = document.createElement('button');
        editBtn.id = 'toggleEditProductBtn';
        editBtn.className = 'btn-main btn-outline';
        editBtn.style.marginTop = '15px';
        editBtn.style.width = '100%';
        editBtn.innerHTML = '✏️ Редагувати складові';
        editBtn.onclick = enableEditMode;

        calcBox.parentElement.insertBefore(editBtn, formGroup);
    } else {
        editBtn.style.display = 'block';
    }
}

window.enableEditMode = function() {
    const formGroup = document.getElementById('calcRowForm');
    const editBtn = document.getElementById('toggleEditProductBtn');

    if (formGroup) formGroup.style.display = 'block';
    if (editBtn) editBtn.style.display = 'none';

    renderProductCalcRows(true);
};

function renderProductCalcRows(isEditMode = false) {
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
                        ${isEditMode ? `<button type="button" onclick="removeCalcItem(${idx})" style="background: #ffe5e5; border: none; color: #ff3b30; width: 22px; height: 22px; border-radius: 50%; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">✕</button>` : ''}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    if (totalElem) {
        totalElem.innerText = `${totalSum.toLocaleString('uk-UA')} ₴`;
    }

    activeProductRef.cost = totalSum;

    const topCost = document.querySelector('.product-cost, [data-cost]');
    if (topCost) topCost.innerText = `${totalSum.toLocaleString('uk-UA')} ₴`;

    saveDataToLocalStorage();
}

// ДОДАВАННЯ СКЛАДОВОЇ
document.addEventListener('submit', function(e) {
    if (e.target && e.target.id === 'calcRowForm') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        if (!activeProductRef) return;

        const nameSelect = document.getElementById('calcItemName');
        const unitSelect = document.getElementById('calcItemUnit');
        const qtyInput = document.getElementById('calcItemQty');
        const priceInput = document.getElementById('calcItemPrice');

        if (!nameSelect || !nameSelect.value) return;

        const matName = nameSelect.value;
        const matUnit = unitSelect ? unitSelect.value : 'шт';
        const matQty = parseFloat(qtyInput ? qtyInput.value : 1) || 1;
        const matPrice = parseFloat(priceInput ? priceInput.value : 0) || 0;

        const savedParams = JSON.parse(localStorage.getItem('material_defaults') || '{}');
        savedParams[matName] = { unit: matUnit, price: matPrice };
        localStorage.setItem('material_defaults', JSON.stringify(savedParams));

        const newItem = { name: matName, unit: matUnit, qty: matQty, price: matPrice };

        if (!activeProductRef.composition) activeProductRef.composition = [];
        
        activeProductRef.composition.push(newItem);
        activeProductRef.calcRows = activeProductRef.composition;
        activeProductRef.calc = activeProductRef.composition;

        if (priceInput) priceInput.value = '';
        if (qtyInput) qtyInput.value = '1';

        renderProductCalcRows(true);
    }
}, true);

window.removeCalcItem = function(index) {
    if (!activeProductRef || !activeProductRef.composition) return;
    
    activeProductRef.composition.splice(index, 1);
    activeProductRef.calcRows = activeProductRef.composition;
    activeProductRef.calc = activeProductRef.composition;
    
    renderProductCalcRows(true);
};


/* ==========================================
   5. СТВОРЕННЯ НОВОГО ТОВАРУ (#newProductForm)
   ========================================== */
window.handleCreateProduct = function(event) {
    if (event) event.preventDefault();

    const nameInput = document.getElementById('newProdName');
    const imgInput = document.getElementById('newProdImg');

    if (!nameInput || !nameInput.value.trim()) return;

    const newProd = {
        id: 'prod_' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        business: typeof state !== 'undefined' ? state.currentBusiness : '',
        name: nameInput.value.trim(),
        cost: 0,
        imgUrl: imgInput ? imgInput.value.trim() : '',
        composition: [],
        calcRows: [],
        calc: []
    };

    if (typeof productsDatabase !== 'undefined') {
        productsDatabase.push(newProd);
        saveDataToLocalStorage(); // Обов'язкове збереження
    }

    nameInput.value = '';
    if (imgInput) imgInput.value = '';

    try {
        if (typeof renderProductsList === 'function') renderProductsList();
    } catch(err) {
        console.warn(err);
    }

    if (typeof showToast === 'function') showToast("Новий виріб створено!");

    if (typeof openProductProfile === 'function') {
        openProductProfile(newProd.id);
    }
};
