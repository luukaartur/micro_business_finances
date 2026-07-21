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
   4. ІНТЕГРАЦІЯ З РІДНИМ МОДАЛЬНИМ ВІКНОМ
   ========================================== */

let activeProductRef = null;
let activeComponentsList = [];

// Прив'язуємось до рідної функції відкриття товару
const originalOpenProductProfile = window.openProductProfile;
window.openProductProfile = function(productId) {
    // Викликаємо рідний відкривач з index.html
    if (typeof originalOpenProductProfile === 'function') {
        originalOpenProductProfile(productId);
    }

    if (typeof productsDatabase === 'undefined') return;
    const prod = productsDatabase.find(p => p.id === productId || p.id == productId);
    if (!prod) return;

    activeProductRef = prod;
    
    // Дістаємо складники з будь-якого збереженого ключа
    const rawComps = prod.composition || prod.components || prod.calcRows || [];
    activeComponentsList = JSON.parse(JSON.stringify(rawComps));

    // Налаштовуємо кнопки і події у рідному вікні
    setupNativeModalEvents();
    renderNativeComponentsList();
};

function renderNativeComponentsList() {
    // Знаходимо контейнер складників у рідній модалці
    const modal = document.querySelector('.modal-overlay.active') || document.querySelector('.modal-card')?.parentElement;
    if (!modal) return;

    // Шукаємо блок, куди виводяться складники
    let listContainer = modal.querySelector('#modalComponentsList') || modal.querySelector('.components-list');
    
    if (!listContainer) {
        // Якщо контейнера немає, шукаємо текст "Складники відсутні" і беремо його батька
        const placeholder = Array.from(modal.querySelectorAll('*')).find(el => el.children.length === 0 && el.textContent.includes('Складники відсутні'));
        if (placeholder) {
            listContainer = placeholder.parentElement;
            listContainer.id = 'modalComponentsList';
        }
    }

    if (!listContainer) return;

    listContainer.innerHTML = '';
    let grandTotal = 0;

    if (!activeComponentsList || activeComponentsList.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center; color:#a0a0a0; padding:15px; font-size:13px;">Складники відсутні</div>';
    } else {
        activeComponentsList.forEach((comp, idx) => {
            const qty = parseFloat(comp.qty || comp.quantity || comp.count) || 1;
            const price = parseFloat(comp.price || comp.cost) || 0;
            const rowTotal = qty * price;
            grandTotal += rowTotal;

            const row = document.createElement('div');
            row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px;';
            row.innerHTML = `
                <span style="font-weight: 500; color: #333; flex: 2;">${comp.name || comp.title || 'Складова'}</span>
                <span style="color: #777; font-size: 12px; flex: 1; text-align: center;">${qty} ${comp.unit || 'шт'} × ${price}₴</span>
                <span style="font-weight: 600; color: #111; flex: 1; text-align: right;">${rowTotal.toLocaleString('uk-UA')} ₴</span>
                <button type="button" onclick="removeNativeComponent(${idx})" style="background:none; border:none; color:#ff3b30; cursor:pointer; font-weight:bold; margin-left:10px;">✕</button>
            `;
            listContainer.appendChild(row);
        });
    }

    // Оновлюємо відображення загальної собівартості
    const totalElem = Array.from(modal.querySelectorAll('*')).find(el => el.textContent.includes('Собівартість:') || el.id === 'modalProductTotalCost');
    if (totalElem) {
        const strong = totalElem.querySelector('strong') || totalElem;
        strong.innerHTML = `Собівартість: <strong>${grandTotal.toLocaleString('uk-UA')} ₴</strong>`;
    }
}

window.removeNativeComponent = function(index) {
    activeComponentsList.splice(index, 1);
    renderNativeComponentsList();
};

function setupNativeModalEvents() {
    const modal = document.querySelector('.modal-overlay.active') || document.body;

    // Перехоплюємо кнопку "+" (додавання нового складника)
    const addBtn = modal.querySelector('button.btn-add-comp, button[onclick*="addComponent"]') || 
                   Array.from(modal.querySelectorAll('button')).find(b => b.textContent.trim() === '+');

    if (addBtn) {
        addBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();

            const inputs = modal.querySelectorAll('input');
            let nameInput, qtyInput, priceInput;

            inputs.forEach(inp => {
                const ph = (inp.placeholder || '').toLowerCase();
                if (ph.includes('назва') || ph.includes('складник')) nameInput = inp;
                else if (ph.includes('ціна') || ph.includes('₴')) priceInput = inp;
                else if (inp.type === 'number' || ph.includes('к-сть')) qtyInput = inp;
            });

            const name = nameInput ? nameInput.value.trim() : '';
            const qty = qtyInput ? parseFloat(qtyInput.value) || 1 : 1;
            const price = priceInput ? parseFloat(priceInput.value) || 0 : 0;

            if (!name) {
                if (typeof showToast === 'function') showToast("Введіть назву складника");
                return;
            }

            activeComponentsList.push({ name, qty, price, unit: 'шт', total: qty * price });

            if (nameInput) nameInput.value = '';
            if (qtyInput) qtyInput.value = '1';
            if (priceInput) priceInput.value = '';

            renderNativeComponentsList();
        };
    }

    // Перехоплюємо кнопку "Зберегти"
    const saveBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent.includes('Зберегти'));
    if (saveBtn) {
        saveBtn.onclick = function(e) {
            e.preventDefault();
            if (!activeProductRef) return;

            // Зчитуємо нову назву, якщо її міняли
            const titleInput = modal.querySelector('input[type="text"]:not([placeholder*="складник"])');
            if (titleInput && titleInput.value.trim()) {
                activeProductRef.name = titleInput.value.trim();
            }

            const newTotalCost = activeComponentsList.reduce((sum, c) => {
                const q = parseFloat(c.qty || c.quantity) || 1;
                const p = parseFloat(c.price || c.cost) || 0;
                return sum + (q * p);
            }, 0);

            // Оновлюємо дані об'єкта
            activeProductRef.cost = newTotalCost;
            activeProductRef.composition = activeComponentsList;
            activeProductRef.components = activeComponentsList;
            activeProductRef.calcRows = activeComponentsList;

            if (typeof renderProductsList === 'function') {
                renderProductsList();
            }

            if (typeof showToast === 'function') {
                showToast("Товар збережено!");
            }

            // Закриваємо модалку
            modal.classList.remove('active');
        };
    }
}
