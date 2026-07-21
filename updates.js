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
    
    // Створюємо копію товару
    const newProduct = {
        id: 'prod_' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        business: original.business || (typeof state !== 'undefined' ? state.currentBusiness : ''),
        name: original.name + ' (копія)',
        cost: original.cost || 0,
        imgUrl: original.imgUrl || original.img || '',
        composition: Array.isArray(original.composition) 
            ? JSON.parse(JSON.stringify(original.composition)) 
            : (Array.isArray(original.components) ? JSON.parse(JSON.stringify(original.components)) : [])
    };

    // Додаємо в локальний масив товарів
    productsDatabase.push(newProduct);

    // Оновлюємо список товарів на екрані
    if (typeof renderProductsList === 'function') {
        renderProductsList();
    }

    if (typeof showToast === 'function') showToast("Товар успішно склоновано!");
};

/* Безпечне розширення рендеру списку товарів (додавання кнопки Клонувати) */
document.addEventListener('DOMContentLoaded', function() {
    if (typeof window.renderProductsList === 'function') {
        const baseRenderProductsList = window.renderProductsList;
        
        window.renderProductsList = function() {
            // Викликаємо оригінальний рендер з index.html
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
                    dupBtn.style.border = '1px solid var(--border)';
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

/* Автопідстановка збереженої ціни та одиниці вимірювання при виборі матеріалу */
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

/* Збереження замовчувань для матеріалів при додаванні рядка */
document.addEventListener('submit', function(e) {
    if (e.target && e.target.id === 'calcRowForm') {
        const nameElem = document.getElementById('calcItemName');
        const matName = nameElem ? nameElem.value : '';
        const matPrice = parseFloat(document.getElementById('calcItemPrice')?.value) || 0;
        const unitSelect = document.getElementById('calcItemUnit');
        const unit = unitSelect ? unitSelect.value : 'шт';

        if (matName) {
            let savedParams = JSON.parse(localStorage.getItem('material_defaults') || '{}');
            savedParams[matName] = { price: matPrice, unit: unit };
            localStorage.setItem('material_defaults', JSON.stringify(savedParams));
        }
    }
});

/* ==========================================
   4. МОДАЛЬНЕ ВІКНО ПЕРЕГЛЯДУ ТА РЕДАГУВАННЯ ТОВАРУ
   ========================================== */

// Створюємо HTML-структуру модального вікна, якщо її ще немає в DOM
function injectProductModalHTML() {
    if (document.getElementById('editProductModal')) return;

    const modalHTML = `
    <div id="editProductModal" class="modal-overlay">
        <div class="modal-card" style="max-width: 500px; width: 90%; background: #fff; padding: 20px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); margin: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 id="modalProductName" style="margin: 0; font-size: 18px;">Редагування товару</h3>
                <button type="button" onclick="closeProductModal()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: var(--gray-text, #888);">&times;</button>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; font-size: 12px; color: #666; margin-bottom: 4px;">Назва товару</label>
                <input type="text" id="modalProductTitleInput" style="width: 100%; padding: 8px 12px; border: 1px solid #ccc; border-radius: 8px; box-sizing: border-box;">
            </div>

            <h4 style="margin: 15px 0 10px 0; font-size: 14px; color: #444;">Складники (компоненти):</h4>
            <div id="modalComponentsList" style="max-height: 200px; overflow-y: auto; margin-bottom: 15px; border: 1px solid #eee; border-radius: 8px; padding: 8px;">
                <!-- Складники завантажуються динамічно -->
            </div>

            <!-- Додавання нового компонента прямо у модалці -->
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 6px; margin-bottom: 15px; align-items: center;">
                <input type="text" id="newCompName" placeholder="Назва складника" style="padding: 6px; border: 1px solid #ccc; border-radius: 6px; font-size: 12px;">
                <input type="number" id="newCompQty" placeholder="К-сть" value="1" step="any" style="padding: 6px; border: 1px solid #ccc; border-radius: 6px; font-size: 12px;">
                <input type="number" id="newCompPrice" placeholder="Ціна ₴" step="any" style="padding: 6px; border: 1px solid #ccc; border-radius: 6px; font-size: 12px;">
                <button type="button" onclick="addComponentToEditingProduct()" style="padding: 6px 10px; background: #007aff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">+</button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid #eee;">
                <div>
                    <span style="font-size: 12px; color: #666;">Собівартість: </span>
                    <strong id="modalProductTotalCost" style="font-size: 16px; color: #000;">0 ₴</strong>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button type="button" onclick="closeProductModal()" style="padding: 8px 14px; border: 1px solid #ccc; background: #fff; border-radius: 8px; cursor: pointer;">Скасувати</button>
                    <button type="button" onclick="saveProductChanges()" style="padding: 8px 14px; background: #007aff; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Зберегти</button>
                </div>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

document.addEventListener('DOMContentLoaded', injectProductModalHTML);
setTimeout(injectProductModalHTML, 300);

// Глобальний стан для редагованого товару
let currentEditingProduct = null;
let currentEditingComponents = [];

// Відкриття детальної інформації про товар
window.openProductProfile = function(productId) {
    if (typeof productsDatabase === 'undefined') return;

    const prod = productsDatabase.find(p => p.id === productId || p.id == productId);
    if (!prod) return;

    currentEditingProduct = prod;
    // Глибоке копіювання компонентів, щоб можна було скасувати зміни
    const rawComps = prod.composition || prod.components || [];
    currentEditingComponents = JSON.parse(JSON.stringify(rawComps));

    document.getElementById('modalProductName').innerText = prod.name;
    document.getElementById('modalProductTitleInput').value = prod.name;

    renderModalComponents();

    const modal = document.getElementById('editProductModal');
    if (modal) modal.classList.add('active');
};

// Відображення компонентів усередині модалки
function renderModalComponents() {
    const container = document.getElementById('modalComponentsList');
    if (!container) return;

    container.innerHTML = '';
    let totalCost = 0;

    if (currentEditingComponents.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#999; font-size:12px; padding:10px;">Складники відсутні</div>';
    } else {
        currentEditingComponents.forEach((comp, idx) => {
            const qty = parseFloat(comp.qty) || 1;
            const price = parseFloat(comp.price) || 0;
            const itemTotal = qty * price;
            totalCost += itemTotal;

            const row = document.createElement('div');
            row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #fafafa; font-size: 13px;';
            row.innerHTML = `
                <div style="flex: 2; font-weight: 500;">${comp.name}</div>
                <div style="flex: 1.5; color: #666; font-size: 12px;">${qty} ${comp.unit || 'шт'} × ${price}₴</div>
                <div style="flex: 1; text-align: right; font-weight: 600;">${itemTotal.toLocaleString('uk-UA')} ₴</div>
                <button type="button" onclick="removeComponentFromEditingProduct(${idx})" style="background: none; border: none; color: #ff3b30; cursor: pointer; font-size: 14px; margin-left: 8px;">✕</button>
            `;
            container.appendChild(row);
        });
    }

    const totalElem = document.getElementById('modalProductTotalCost');
    if (totalElem) totalElem.innerText = totalCost.toLocaleString('uk-UA') + ' ₴';
}

// Додавання нового компонента в процесі редагування
window.addComponentToEditingProduct = function() {
    const nameInput = document.getElementById('newCompName');
    const qtyInput = document.getElementById('newCompQty');
    const priceInput = document.getElementById('newCompPrice');

    const name = nameInput.value.trim();
    const qty = parseFloat(qtyInput.value) || 1;
    const price = parseFloat(priceInput.value) || 0;

    if (!name) {
        if (typeof showToast === 'function') showToast("Введіть назву складника");
        return;
    }

    currentEditingComponents.push({ name, qty, price, unit: 'шт', total: qty * price });

    nameInput.value = '';
    qtyInput.value = '1';
    priceInput.value = '';

    renderModalComponents();
};

// Видалення компонента
window.removeComponentFromEditingProduct = function(index) {
    currentEditingComponents.splice(index, 1);
    renderModalComponents();
};

// Закриття модального вікна
window.closeProductModal = function() {
    const modal = document.getElementById('editProductModal');
    if (modal) modal.classList.remove('active');
    currentEditingProduct = null;
    currentEditingComponents = [];
};

// Збереження змін у товарі
window.saveProductChanges = function() {
    if (!currentEditingProduct) return;

    const newTitle = document.getElementById('modalProductTitleInput').value.trim();
    if (newTitle) {
        currentEditingProduct.name = newTitle;
    }

    // Розраховуємо нову собівартість
    const newTotalCost = currentEditingComponents.reduce((sum, c) => sum + ((parseFloat(c.qty) || 1) * (parseFloat(c.price) || 0)), 0);

    // Оновлюємо дані об'єкта
    currentEditingProduct.cost = newTotalCost;
    currentEditingProduct.composition = currentEditingComponents;
    currentEditingProduct.components = currentEditingComponents;

    // Перемальовуємо список товарів на головному екрані
    if (typeof renderProductsList === 'function') {
        renderProductsList();
    }

    if (typeof showToast === 'function') {
        showToast("Товар успішно оновлено!");
    }

    closeProductModal();
};
