/* ==========================================
   1. ЗАКРИТТЯ МОДАЛЬНИХ ВІКОН ПО КЛІКУ ПОЗА НИМИ
   ========================================== */
document.addEventListener('click', function(e) {
    // Шукаємо відкриту модалку або картку
    const activeModal = document.querySelector('.modal-overlay.active, .modal.active, .modal-backdrop.active');
    
    if (activeModal && e.target === activeModal) {
        activeModal.classList.remove('active');
        if (typeof goToScreen === 'function') goToScreen('screen-main');
        return;
    }

    // Додатковий захист: клік по затемненому тлу (сірій зоні навколо модалки)
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
    // Шукаємо випадаючий список матеріалу
    if (e.target && e.target.tagName === 'SELECT') {
        const selectedMaterial = e.target.value;
        if (!selectedMaterial) return;

        const parentContainer = e.target.closest('.modal-card, .modal, body');
        if (!parentContainer) return;

        // Шукаємо поля одиниці та ціни
        const unitSelect = parentContainer.querySelector('select:not([id*="mat"]):not([name*="mat"])') || 
                           Array.from(parentContainer.querySelectorAll('select')).find(s => s !== e.target);
        const priceInput = parentContainer.querySelector('input[placeholder*="Ціна"], input[placeholder*="0"]') || 
                           Array.from(parentContainer.querySelectorAll('input')).find(i => {
                               const lab = i.previousElementSibling || i.parentElement;
                               return lab && lab.innerText.includes('ЦІНА');
                           });

        // Дістаємо збережені параметри з localStorage або дефолтів
        const savedParams = JSON.parse(localStorage.getItem('material_defaults') || '{}');
        const matInfo = savedParams[selectedMaterial];

        if (matInfo) {
            if (unitSelect && matInfo.unit) unitSelect.value = matInfo.unit;
            if (priceInput && matInfo.price !== undefined) priceInput.value = matInfo.price;
        } else {
            // Базові правила для автовизначення, якщо нема у localStorage
            if (unitSelect) {
                const lowerName = selectedMaterial.toLowerCase();
                if (lowerName.includes('тканина') || lowerName.includes('нитки') || lowerName.includes('наповнювач')) {
                    unitSelect.value = 'кг';
                } else if (lowerName.includes('стрічка') || lowerName.includes('блискавка')) {
                    unitSelect.value = 'м';
                }
            }
        }
    }
});


/* ==========================================
   4. ВІДОБРАЖЕННЯ ТА ДОДАВАННЯ СКЛАДНИКІВ
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

    // Синхронізуємо масиви
    if (!activeProductRef.composition) {
        activeProductRef.composition = activeProductRef.calcRows || activeProductRef.calc || [];
    }

    // Даємо інтерфейсу час сформувати DOM та рендеримо
    setTimeout(() => {
        renderNativeCostComposition();
    }, 100);
};

function renderNativeCostComposition() {
    if (!activeProductRef) return;

    // Шукаємо блок "СКЛАД СОБІВАРТОСТІ"
    const allElements = Array.from(document.querySelectorAll('div, section'));
    const container = allElements.find(el => {
        const txt = (el.innerText || '').toUpperCase();
        return txt.includes('СКЛАД СОБІВАРТОСТІ') && (txt.includes('КАЛЬКУЛЯЦІЯ ПОРОЖНЯ') || txt.includes('РАЗОМ:'));
    });

    if (!container) return;

    const comps = activeProductRef.composition || activeProductRef.calcRows || activeProductRef.calc || [];

    let rowsHTML = '';
    let totalSum = 0;

    if (comps.length === 0) {
        rowsHTML = '<div style="text-align:center; color:#999; padding:15px; font-size:13px;">Калькуляція порожня</div>';
    } else {
        comps.forEach((item, idx) => {
            const qty = parseFloat(item.qty || item.quantity) || 1;
            const price = parseFloat(item.price || item.cost) || 0;
            const sum = qty * price;
            totalSum += sum;

            rowsHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px dashed #e5e5e5; font-size: 14px;">
                    <div style="flex: 2;">
                        <div style="font-weight: 600; color: #111;">${item.name || 'Елемент'}</div>
                        <div style="font-size: 12px; color: #777;">${qty} ${item.unit || 'шт'} × ${price} ₴</div>
                    </div>
                    <div style="font-weight: 700; color: #000; margin-right: 12px;">${sum.toLocaleString('uk-UA')} ₴</div>
                    <button type="button" onclick="removeProductComponent(${idx})" style="background: #ffe5e5; border: none; color: #ff3b30; width: 26px; height: 26px; border-radius: 50%; font-weight: bold; cursor: pointer;">✕</button>
                </div>
            `;
        });
    }

    // Оновлюємо собівартість об'єкта
    activeProductRef.cost = totalSum;

    // Перемальовуємо вміст блоку
    container.innerHTML = `
        <div style="font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">Склад собівартості</div>
        <div>${rowsHTML}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 10px; border-top: 2px solid #f0f0f0; font-weight: 700; font-size: 15px;">
            <span>Разом:</span>
            <span>${totalSum.toLocaleString('uk-UA')} ₴</span>
        </div>
    `;

    // Оновлюємо верхню цифру Собівартості
    const topCostElem = Array.from(document.querySelectorAll('*')).find(el => {
        const p = el.parentElement;
        return p && (p.innerText || '').includes('СОБІВАРТОСТЬ') && el.children.length === 0;
    });
    if (topCostElem) {
        topCostElem.innerText = `${totalSum.toLocaleString('uk-UA')} ₴`;
    }

    if (typeof renderProductsList === 'function') {
        renderProductsList();
    }
}

// Видалення позиції
window.removeProductComponent = function(index) {
    if (!activeProductRef) return;

    const comps = activeProductRef.composition || [];
    comps.splice(index, 1);

    activeProductRef.composition = comps;
    activeProductRef.calcRows = comps;
    activeProductRef.calc = comps;

    renderNativeCostComposition();
};

// Перехоплення додавання складової через кнопку "+"
document.addEventListener('click', function(e) {
    const btn = e.target.closest('button');
    if (!btn || !activeProductRef) return;

    // Перевіряємо, чи це кнопка "+" у формі додавання
    const isAddBtn = btn.innerText.trim() === '+' || btn.classList.contains('btn-add');
    if (!isAddBtn) return;

    const parent = btn.closest('.modal-card, .modal, body');
    if (!parent) return;

    const selectMat = parent.querySelector('select');
    const inputs = parent.querySelectorAll('input');

    if (selectMat && selectMat.value) {
        const matName = selectMat.value;
        
        let qty = 1;
        let price = 0;
        let unit = 'шт';

        // Зчитуємо одиницю виміру
        const unitSelect = Array.from(parent.querySelectorAll('select')).find(s => s !== selectMat);
        if (unitSelect) unit = unitSelect.value;

        // Зчитуємо кількість та ціну з інпутів
        inputs.forEach(inp => {
            const val = parseFloat(inp.value);
            const parentTxt = (inp.parentElement ? inp.parentElement.innerText : '').toUpperCase();

            if (parentTxt.includes('КІЛЬКІСТЬ') || inp.type === 'number') {
                if (!isNaN(val)) qty = val;
            } else if (parentTxt.includes('ЦІНА') || parentTxt.includes('1 ОДИНИЦЮ')) {
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
    }
});
