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
