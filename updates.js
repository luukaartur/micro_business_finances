/* ==========================================
   1. ЗАКРИТТЯ МОДАЛЬНИХ ВІКОН ПО КЛІКУ ПОЗА НИМИ
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

    if (typeof renderProductsList === 'function') {
        renderProductsList();
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

        const parentContainer = e.target.closest('.modal-card, .modal, body');
        if (!parentContainer) return;

        const selects = Array.from(parentContainer.querySelectorAll('select'));
        const unitSelect = selects.find(s => s !== e.target);
        
        const inputs = parentContainer.querySelectorAll('input');
        let priceInput = null;

        inputs.forEach(inp => {
            const labelText = (inp.parentElement ? inp.parentElement.innerText : '').toUpperCase();
            if (labelText.includes('ЦІНА') || labelText.includes('ОДИНИЦЮ')) {
                priceInput = inp;
            }
        });

        // Авто-визначення одиниці виміру за назвою
        if (unitSelect) {
            const lowerName = selectedMaterial.toLowerCase();
            if (lowerName.includes('тканина') || lowerName.includes('нитки') || lowerName.includes('наповнювач') || lowerName.includes('секонд')) {
                unitSelect.value = 'кг';
            } else if (lowerName.includes('стрічка') || lowerName.includes('блискавка') || lowerName.includes('мереживо')) {
                unitSelect.value = 'м';
            } else {
                unitSelect.value = 'шт';
            }
        }

        // Авто-підстановка ціни з пам'яті/бази
        const savedParams = JSON.parse(localStorage.getItem('material_defaults') || '{}');
        if (savedParams[selectedMaterial] && priceInput) {
            priceInput.value = savedParams[selectedMaterial].price || 0;
        }
    }
});


/* ==========================================
   4. БЕЗПЕЧНЕ ОНОВЛЕННЯ СКЛАДУ СОБІВАРТОСТІ (БЕЗ ЗЛАМУ ВЕРСТКИ)
   ========================================== */
let activeProductRef = null;

// Перехоплюємо відкриття картки товару
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

    // Точкове оновлення даних у картці
    setTimeout(() => {
        renderNativeCostComposition();
    }, 50);
};

function renderNativeCostComposition() {
    if (!activeProductRef) return;

    const comps = activeProductRef.composition || activeProductRef.calcRows || activeProductRef.calc || [];
    let totalSum = 0;

    // Шукаємо місце, де написані слова "Калькуляція порожня" або виводиться сума
    const allDivs = Array.from(document.querySelectorAll('div, span, p'));
    
    // 1. Шукаємо елемент порожньої калькуляції
    const emptyPlaceholder = allDivs.find(el => el.children.length === 0 && (el.innerText || '').trim() === 'Калькуляція порожня');
    
    // 2. Шукаємо елемент з підсумковою сумою (Разом:)
    const totalElem = allDivs.find(el => (el.innerText || '').includes('Разом:'));

    if (comps.length > 0) {
        let rowsHTML = '';
        comps.forEach((item, idx) => {
            const qty = parseFloat(item.qty || item.quantity) || 1;
            const price = parseFloat(item.price || item.cost) || 0;
            const sum = qty * price;
            totalSum += sum;

            rowsHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #e0e0e0; font-size: 13px;">
                    <div style="flex: 2;">
                        <strong style="color: #222;">${item.name || 'Елемент'}</strong>
                        <div style="font-size: 11px; color: #777;">${qty} ${item.unit || 'шт'} × ${price} ₴</div>
                    </div>
                    <div style="font-weight: 700; color: #111; margin-right: 10px;">${sum.toLocaleString('uk-UA')} ₴</div>
                    <button type="button" onclick="removeProductComponent(${idx})" style="background: #fff0f0; border: none; color: #ff3b30; width: 22px; height: 22px; border-radius: 50%; font-weight: bold; cursor: pointer;">✕</button>
                </div>
            `;
        });

        // Замінюємо "Калькуляція порожня" на наш список
        if (emptyPlaceholder) {
            emptyPlaceholder.outerHTML = `<div id="native-calc-list" style="margin: 10px 0;">${rowsHTML}</div>`;
        } else {
            const existingList = document.getElementById('native-calc-list');
            if (existingList) existingList.innerHTML = rowsHTML;
        }
    } else {
        totalSum = 0;
        const existingList = document.getElementById('native-calc-list');
        if (existingList) {
            existingList.outerHTML = '<div class="empty-calc-msg" style="text-align:center; color:#999; padding:10px; font-size:13px;">Калькуляція порожня</div>';
        }
    }

    // Оновлюємо значення "Разом: X ₴"
    if (totalElem) {
        totalElem.innerHTML = `<span>Разом:</span> <strong style="margin-left:auto;">${totalSum.toLocaleString('uk-UA')} ₴</strong>`;
        totalElem.style.display = 'flex';
        totalElem.style.justifyContent = 'space-between';
    }

    // Зберігаємо собівартість
    activeProductRef.cost = totalSum;

    // Оновлюємо верхню собівартість у картці
    const topCost = document.querySelector('.product-cost') || allDivs.find(el => el.innerText && el.innerText.includes('50 ₴'));
    if (topCost) {
        topCost.innerText = `${totalSum.toLocaleString('uk-UA')} ₴`;
    }

    if (typeof renderProductsList === 'function') {
        renderProductsList();
    }
}

// Видалення складової
window.removeProductComponent = function(index) {
    if (!activeProductRef) return;

    const comps = activeProductRef.composition || [];
    comps.splice(index, 1);

    activeProductRef.composition = comps;
    activeProductRef.calcRows = comps;
    activeProductRef.calc = comps;

    renderNativeCostComposition();
};

// Додавання складової за кнопкою "+"
document.addEventListener('click', function(e) {
    const btn = e.target.closest('button');
    if (!btn || !activeProductRef) return;

    const btnText = btn.innerText.trim();
    if (btnText !== '+' && !btn.classList.contains('btn-add')) return;

    const parent = btn.closest('.modal-card, .modal, body');
    if (!parent) return;

    const selectMat = parent.querySelector('select');
    if (!selectMat || !selectMat.value) return;

    const matName = selectMat.value;
    let qty = 1;
    let price = 0;
    let unit = 'шт';

    // Одиниця
    const selects = Array.from(parent.querySelectorAll('select'));
    const unitSelect = selects.find(s => s !== selectMat);
    if (unitSelect) unit = unitSelect.value;

    // Інпути кількості та ціни
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

    renderNativeCostComposition();
});
