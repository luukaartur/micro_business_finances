/* ==========================================
   1. СТВОРЕННЯ ОВЕРЛЕЮ ДЛЯ ЗАКРИТТЯ ПО КЛІКУ
   ========================================== */
let backdrop = document.getElementById('modal-backdrop-overlay');
if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'modal-backdrop-overlay';
    document.body.appendChild(backdrop);
}

backdrop.addEventListener('click', function() {
    if (typeof goToScreen === 'function') {
        goToScreen('screen-main');
    }
});

/* Перехоплення переходу між екранами */
if (typeof window.goToScreen === 'function') {
    const originalGoToScreen = window.goToScreen;
    window.goToScreen = function(screenId) {
        originalGoToScreen(screenId);
        
        const bd = document.getElementById('modal-backdrop-overlay');
        if (bd) {
            if (screenId !== 'screen-main') {
                bd.classList.add('active');
            } else {
                bd.classList.remove('active');
            }
        }
    };
}

/* Закриття діалогових модальних вікон при кліку на їх тло */
document.addEventListener('DOMContentLoaded', function() {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
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
    const rawComps = original.composition || original.components || original.calcRows || [];
    
    const newProduct = {
        id: 'prod_' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        business: original.business || (typeof state !== 'undefined' ? state.currentBusiness : ''),
        name: original.name + ' (копія)',
        cost: original.cost || 0,
        imgUrl: original.imgUrl || original.img || '',
        composition: JSON.parse(JSON.stringify(rawComps)),
        components: JSON.parse(JSON.stringify(rawComps)),
        calcRows: JSON.parse(JSON.stringify(rawComps))
    };

    productsDatabase.push(newProduct);

    if (typeof renderProductsList === 'function') {
        renderProductsList();
    }

    if (typeof showToast === 'function') showToast("Товар успішно склоновано!");
};

/* Додавання кнопки Клонувати в список */
document.addEventListener('DOMContentLoaded', function() {
    if (typeof window.renderProductsList === 'function') {
        const baseRenderProductsList = window.renderProductsList;
        
        window.renderProductsList = function() {
            baseRenderProductsList();

            const container = document.getElementById('productsListContainer');
            if (!container) return;

            const items = container.querySelectorAll('.product-item');
            items.forEach((item, index) => {
                if (!item.querySelector('.btn-duplicate-prod')) {
                    let actionsDiv = item.querySelector('.product-item-actions');
                    if (!actionsDiv) {
                        actionsDiv = document.createElement('div');
                        actionsDiv.className = 'product-item-actions';
                        actionsDiv.style.display = 'flex';
                        actionsDiv.style.alignItems = 'center';
                        actionsDiv.style.gap = '8px';
                        
                        const costSpan = item.querySelector('.product-cost');
                        if (costSpan) actionsDiv.appendChild(costSpan);
                        item.appendChild(actionsDiv);
                    }

                    const dupBtn = document.createElement('button');
                    dupBtn.className = 'btn-duplicate-prod';
                    dupBtn.type = 'button';
                    dupBtn.style.padding = '4px 8px';
                    dupBtn.style.borderRadius = '8px';
                    dupBtn.style.border = '1px solid var(--border, #ccc)';
                    dupBtn.style.background = '#fff';
                    dupBtn.style.cursor = 'pointer';
                    dupBtn.style.fontSize = '12px';
                    dupBtn.style.fontWeight = '600';
                    dupBtn.innerText = '📋 Клонувати';
                    dupBtn.onclick = (e) => duplicateProduct(index, e);
                    
                    actionsDiv.appendChild(dupBtn);
                }
            });
        };
    }
});


/* ==========================================
   3. ОДИНИЦІ ВИМІРЮВАННЯ ТА КАЛЬКУЛЯЦІЯ
   ========================================== */
document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'calcItemName') {
        const selectedMaterial = e.target.value;
        if (!selectedMaterial) return;

        const savedParams = JSON.parse(localStorage.getItem('material_defaults') || '{}');
        if (savedParams[selectedMaterial]) {
            const priceInput = document.getElementById('calcItemPrice');
            const unitSelect = document.getElementById('calcItemUnit');
            
            if (priceInput && savedParams[selectedMaterial].price !== undefined) {
                priceInput.value = savedParams[selectedMaterial].price;
            }
            if (unitSelect && savedParams[selectedMaterial].unit) {
                unitSelect.value = savedParams[selectedMaterial].unit;
            }
        }
    }
});

/* ==========================================
   4. ІНТЕГРАЦІЯ З РІДНИМ ЕКРАНОМ ТОВАРУ
   ========================================== */

let activeProductRef = null;

// Перехоплюємо відкриття товару
const originalOpenProductProfile = window.openProductProfile;
window.openProductProfile = function(productId) {
    if (typeof originalOpenProductProfile === 'function') {
        originalOpenProductProfile(productId);
    }

    if (typeof productsDatabase === 'undefined') return;
    
    // Шукаємо товар за ID
    const prod = productsDatabase.find(p => p.id === productId || p.id == productId);
    if (!prod) return;

    activeProductRef = prod;

    // Перевіряємо та ініціалізуємо масив складників у товарі
    if (!activeProductRef.composition && !activeProductRef.calcRows && !activeProductRef.calc) {
        activeProductRef.composition = [];
    }

    // Даємо рідному інтерфейсу 50мс на рендер, після чого вставляємо наші складники
    setTimeout(() => {
        renderNativeCostComposition();
    }, 50);
};

function renderNativeCostComposition() {
    if (!activeProductRef) return;

    // Шукаємо блок, де написано "СКЛАД СОБІВАРТОСТІ" або "Калькуляція порожня"
    const allDivs = Array.from(document.querySelectorAll('div, section'));
    const container = allDivs.find(el => {
        const txt = el.innerText || '';
        return txt.includes('СКЛАД СОБІВАРТОСТІ') && (txt.includes('Калькуляція порожня') || txt.includes('Разом:'));
    });

    if (!container) return;

    // Отримуємо складники товару зі збережених полів
    const comps = activeProductRef.composition || activeProductRef.calcRows || activeProductRef.calc || [];

    let rowsHTML = '';
    let totalSum = 0;

    if (comps.length === 0) {
        rowsHTML = '<div style="text-align:center; color:#999; padding:12px; font-size:13px;">Калькуляція порожня</div>';
    } else {
        comps.forEach((item, idx) => {
            const qty = parseFloat(item.qty || item.quantity || item.count) || 1;
            const price = parseFloat(item.price || item.cost) || 0;
            const sum = qty * price;
            totalSum += sum;

            rowsHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #eee; font-size: 14px;">
                    <div style="flex: 2;">
                        <strong style="color: #222;">${item.name || item.title || 'Елемент'}</strong>
                        <div style="font-size: 11px; color: #888;">${qty} ${item.unit || 'шт'} × ${price} ₴</div>
                    </div>
                    <div style="font-weight: 700; color: #111; margin-right: 10px;">${sum.toLocaleString('uk-UA')} ₴</div>
                    <button type="button" onclick="removeProductComponent(${idx})" style="background: none; border: none; color: #ff3b30; font-size: 16px; cursor: pointer; padding: 2px 6px;">✕</button>
                </div>
            `;
        });
    }

    // Оновлюємо внутрішню себевартість об'єкта
    activeProductRef.cost = totalSum;

    // Перемальовуємо вміст контейнера "СКЛАД СОБІВАРТОСТІ"
    container.innerHTML = `
        <div style="font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Склад собівартості</div>
        <div style="margin-bottom: 10px;">${rowsHTML}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid #ddd; font-weight: 700; font-size: 15px;">
            <span>Разом:</span>
            <span>${totalSum.toLocaleString('uk-UA')} ₴</span>
        </div>
    `;

    // Також оновлюємо велику цифру Собівартості зверху біля фото
    const costDisplay = document.querySelector('.product-cost, [data-cost]');
    if (costDisplay) {
        costDisplay.innerText = `${totalSum.toLocaleString('uk-UA')} ₴`;
    }

    // Синхронізуємо зі списком товарів
    if (typeof renderProductsList === 'function') {
        renderProductsList();
    }
}

// Видалення складника зі списку
window.removeProductComponent = function(index) {
    if (!activeProductRef) return;

    const comps = activeProductRef.composition || activeProductRef.calcRows || activeProductRef.calc || [];
    comps.splice(index, 1);

    // Записуємо назад
    activeProductRef.composition = comps;
    activeProductRef.calcRows = comps;
    activeProductRef.calc = comps;

    renderNativeCostComposition();
};

// Перехоплення додавання нового складника через вашу форму нижче
document.addEventListener('click', function(e) {
    const btn = e.target.closest('button');
    if (!btn) return;

    // Перевіряємо, чи це кнопка "+" біля форми "Додати складову"
    const parentForm = btn.closest('.modal-card, .screen, body');
    if (!parentForm || !activeProductRef) return;

    // Якщо натиснули "+" для додавання елемента
    if (btn.innerText.trim() === '+' || btn.classList.contains('btn-add-calc')) {
        setTimeout(() => {
            // Зчитуємо значення з випадаючого списку та інпутів
            const selectMat = parentForm.querySelector('select');
            const qtyInput = parentForm.querySelector('input[type="number"]') || parentForm.querySelector('input');

            if (selectMat && selectMat.value) {
                const matName = selectMat.value;
            const qty = parseFloat(qtyInput ? qtyInput.value : 1) || 1;

            // Дістаємо ціну матеріалу з бази матеріалів/defaults
            const savedParams = JSON.parse(localStorage.getItem('material_defaults') || '{}');
            const matData = savedParams[matName] || {};
            const price = parseFloat(matData.price) || 0;
            const unit = matData.unit || 'шт';

            if (!activeProductRef.composition) activeProductRef.composition = [];
            
            activeProductRef.composition.push({
                name: matName,
                qty: qty,
                price: price,
                unit: unit
            });

            // Синхронізуємо ключі
            activeProductRef.calcRows = activeProductRef.composition;
            activeProductRef.calc = activeProductRef.composition;

            renderNativeCostComposition();
        }, 100);
    }
});
