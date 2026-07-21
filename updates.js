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
    
    // Створюємо копію товару
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

/* Безпечне розширення рендеру списку товарів (додавання кнопки Клонувати) */
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

/* Збереження матеріалу при відправці форми калькуляції */
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

function injectProductModalHTML() {
    if (document.getElementById('editProductModal')) return;

    const modalHTML = `
    <div id="editProductModal" class="modal-overlay" style="z-index: 999999; display: none;">
        <div class="modal-card" style="max-width: 500px; width: 90%; background: #fff; padding: 24px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.25); position: relative; margin: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 id="modalProductName" style="margin: 0; font-size: 18px; font-weight: 700;">Редагування товару</h3>
                <button type="button" onclick="closeProductModal()" style="background: none; border: none; font-size: 22px; cursor: pointer; color: #888;">&times;</button>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; font-size: 12px; color: #666; margin-bottom: 4px;">Назва товару</label>
                <input type="text" id="modalProductTitleInput" style="width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; font-size: 14px;">
            </div>

            <h4 style="margin: 15px 0 8px 0; font-size: 14px; color: #333;">Складники (компоненти):</h4>
            <div id="modalComponentsList" style="max-height: 200px; overflow-y: auto; margin-bottom: 15px; border: 1px solid #eee; border-radius: 8px; padding: 8px; background: #fafafa;">
                <!-- Складники підвантажуються тут -->
            </div>

            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 6px; margin-bottom: 20px; align-items: center;">
                <input type="text" id="newCompName" placeholder="Назва складника" style="padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 12px;">
                <input type="number" id="newCompQty" placeholder="К-сть" value="1" step="any" style="padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 12px;">
                <input type="number" id="newCompPrice" placeholder="Ціна ₴" step="any" style="padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 12px;">
                <button type="button" onclick="addComponentToEditingProduct()" style="padding: 8px 12px; background: #007aff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold;">+</button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 15px; border-top: 1px solid #eee;">
                <div>
                    <span style="font-size: 13px; color: #666;">Собівартість: </span>
                    <strong id="modalProductTotalCost" style="font-size: 18px; color: #000;">0 ₴</strong>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button type="button" onclick="closeProductModal()" style="padding: 10px 16px; border: 1px solid #ccc; background: #fff; border-radius: 8px; cursor: pointer; font-size: 14px;">Скасувати</button>
                    <button type="button" onclick="saveProductChanges()" style="padding: 10px 16px; background: #007aff; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">Зберегти</button>
                </div>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

document.addEventListener('DOMContentLoaded', injectProductModalHTML);
setTimeout(injectProductModalHTML, 300);

let currentEditingProduct = null;
let currentEditingComponents = [];

// Перехоплюємо відкриття товару
window.openProductProfile = function(productId) {
    if (typeof productsDatabase === 'undefined') return;

    const prod = productsDatabase.find(p => p.id === productId || p.id == productId);
    if (!prod) return;

    // Приховуємо інші стандартні модалки, щоб уникнути накладання
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));

    currentEditingProduct = prod;
    
    // Універсальний пошук компонентів
    const rawComps = prod.composition || prod.components || prod.calcRows || prod.items || [];
    currentEditingComponents = JSON.parse(JSON.stringify(rawComps));

    document.getElementById('modalProductName').innerText = prod.name;
    document.getElementById('modalProductTitleInput').value = prod.name;

    renderModalComponents();

    const modal = document.getElementById('editProductModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
};

function renderModalComponents() {
    const container = document.getElementById('modalComponentsList');
    if (!container) return;

    container.innerHTML = '';
    let totalCost = 0;

    if (!currentEditingComponents || currentEditingComponents.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#999; font-size:13px; padding:12px;">Складники відсутні</div>';
    } else {
        currentEditingComponents.forEach((comp, idx) => {
            const qty = parseFloat(comp.qty || comp.quantity || comp.count) || 1;
            const price = parseFloat(comp.price || comp.cost) || 0;
            const itemTotal = qty * price;
            totalCost += itemTotal;

            const row = document.createElement('div');
            row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 6px 4px; border-bottom: 1px solid #eee; font-size: 13px;';
            row.innerHTML = `
                <div style="flex: 2; font-weight: 500; color: #333;">${comp.name || comp.title || 'Складова'}</div>
                <div style="flex: 1.5; color: #666; font-size: 12px; text-align: center;">${qty} ${comp.unit || 'шт'} × ${price}₴</div>
                <div style="flex: 1; text-align: right; font-weight: 600; color: #111;">${itemTotal.toLocaleString('uk-UA')} ₴</div>
                <button type="button" onclick="removeComponentFromEditingProduct(${idx})" style="background: none; border: none; color: #ff3b30; cursor: pointer; font-size: 14px; margin-left: 10px; font-weight: bold;">✕</button>
            `;
            container.appendChild(row);
        });
    }

    const totalElem = document.getElementById('modalProductTotalCost');
    if (totalElem) totalElem.innerText = totalCost.toLocaleString('uk-UA') + ' ₴';
}

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

window.removeComponentFromEditingProduct = function(index) {
    currentEditingComponents.splice(index, 1);
    renderModalComponents();
};

window.closeProductModal = function() {
    const modal = document.getElementById('editProductModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    currentEditingProduct = null;
    currentEditingComponents = [];
};

window.saveProductChanges = function() {
    if (!currentEditingProduct) return;

    const newTitle = document.getElementById('modalProductTitleInput').value.trim();
    if (newTitle) {
        currentEditingProduct.name = newTitle;
    }

    const newTotalCost = currentEditingComponents.reduce((sum, c) => {
        const q = parseFloat(c.qty || c.quantity) || 1;
        const p = parseFloat(c.price || c.cost) || 0;
        return sum + (q * p);
    }, 0);

    // Записуємо оновлені дані в усі поля об'єкта для повної сумісності
    currentEditingProduct.cost = newTotalCost;
    currentEditingProduct.composition = currentEditingComponents;
    currentEditingProduct.components = currentEditingComponents;
    currentEditingProduct.calcRows = currentEditingComponents;

    if (typeof renderProductsList === 'function') {
        renderProductsList();
    }

    if (typeof showToast === 'function') {
        showToast("Товар успішно оновлено!");
    }

    closeProductModal();
};
