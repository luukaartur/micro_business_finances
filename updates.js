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
const originalGoToScreen = window.goToScreen;
window.goToScreen = function(screenId) {
    if (typeof originalGoToScreen === 'function') {
        originalGoToScreen(screenId);
    }
    
    const bd = document.getElementById('modal-backdrop-overlay');
    if (bd) {
        if (screenId !== 'screen-main') {
            bd.classList.add('active');
        } else {
            bd.classList.remove('active');
        }
    }
};

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
   2. КЛОНУВАННЯ ТОВАРУ (З ЗБЕРЕЖЕННЯМ В GOOGLE)
   ========================================== */
window.duplicateProduct = async function(productId, event) {
    if (event) event.stopPropagation();
    
    const prod = productsDatabase.find(p => p.id === productId || p.name === productId);
    if (!prod) return;

    const newProduct = {
        id: 'prod_' + Date.now(),
        name: prod.name + ' (копія)',
        img: prod.img || '',
        cost: prod.cost || 0,
        components: JSON.parse(JSON.stringify(prod.components || []))
    };

    productsDatabase.push(newProduct);

    if (typeof renderProductsList === 'function') {
        renderProductsList();
    }
    
    if (typeof showToast === 'function') showToast("Дублювання товару...");

    if (typeof appendRowToGoogle === 'function') {
        await appendRowToGoogle(['PRODUCT', newProduct.id, newProduct.name, newProduct.cost, JSON.stringify(newProduct.components), newProduct.img]);
        if (typeof showToast === 'function') showToast("Товар успішно склоновано!");
    }
};

/* Перехоплення відображення списку товарів для виводу кнопки клонування */
const originalRenderProductsList = window.renderProductsList;
window.renderProductsList = function() {
    if (typeof originalRenderProductsList === 'function') {
        originalRenderProductsList();
    }

    const container = document.getElementById('productsListContainer');
    if (!container) return;

    const items = container.querySelectorAll('.product-item');
    items.forEach((item, index) => {
        if (!item.querySelector('.btn-duplicate-prod')) {
            const prodData = productsDatabase[index];
            if (prodData) {
                let actionsDiv = item.querySelector('.product-item-actions');
                if (!actionsDiv) {
                    actionsDiv = document.createElement('div');
                    actionsDiv.className = 'product-item-actions';
                    const costSpan = item.querySelector('.product-cost');
                    if (costSpan) actionsDiv.appendChild(costSpan);
                    item.appendChild(actionsDiv);
                }

                const dupBtn = document.createElement('button');
                dupBtn.className = 'btn-duplicate-prod';
                dupBtn.innerText = '📋 Клонувати';
                dupBtn.onclick = (e) => duplicateProduct(prodData.id || prodData.name, e);
                actionsDiv.appendChild(dupBtn);
            }
        }
    });
};


/* ==========================================
   3. ОДИНИЦІ ВИМІРЮВАННЯ ТА ПОРОЖНЄ ПОЛЕ В КАЛЬКУЛЯЦІЇ
   ========================================== */

/* Перевизначення випадаючого списку матеріалів з можливістю порожнього значення */
const originalPopulateDropdown = window.populateDropdown;
window.populateDropdown = function(elemId, arrayList) {
    if (typeof originalPopulateDropdown === 'function') {
        originalPopulateDropdown(elemId, arrayList);
    }

    if (elemId === 'calcItemName') {
        const sel = document.getElementById(elemId);
        if (sel) {
            const defaultOpt = document.createElement('option');
            defaultOpt.value = "";
            defaultOpt.innerText = "-- Оберіть складову --";
            defaultOpt.selected = true;
            sel.insertBefore(defaultOpt, sel.firstChild);
        }
    }
};

/* Вбудовування вибору одиниць вимірювання у форму */
function injectUnitSelector() {
    const calcForm = document.getElementById('calcRowForm');
    if (!calcForm || document.getElementById('calcItemUnit')) return;

    const qtyGroup = document.getElementById('calcItemQty')?.closest('.form-group');
    if (qtyGroup) {
        const unitDiv = document.createElement('div');
        unitDiv.className = 'form-group';
        unitDiv.innerHTML = `
            <label>Од. вим.</label>
            <select id="calcItemUnit" class="standard-select">
                <option value="шт">шт</option>
                <option value="м">м</option>
                <option value="см">см</option>
                <option value="м²">м²</option>
                <option value="кг">кг</option>
                <option value="г">г</option>
                <option value="л">л</option>
                <option value="мл">мл</option>
            </select>
        `;
        
        const parentGrid = qtyGroup.parentElement;
        if (parentGrid) {
            parentGrid.style.gridTemplateColumns = '1fr 1fr 1.2fr';
            parentGrid.appendChild(unitDiv);
        }
    }
}

document.addEventListener('DOMContentLoaded', injectUnitSelector);
setTimeout(injectUnitSelector, 500);

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

/* Збереження матеріалу + додавання складової + очищення форми */
const originalAddCalcRow = window.handleAddCalcRow;
window.handleAddCalcRow = function(e) {
    if (e) e.preventDefault();
    
    const nameElem = document.getElementById('calcItemName');
    const matName = nameElem ? nameElem.value : '';
    
    if (!matName) {
        if (typeof showToast === 'function') showToast("Оберіть складову зі списку!");
        return;
    }

    const qty = parseFloat(document.getElementById('calcItemQty').value) || 1;
    const matPrice = parseFloat(document.getElementById('calcItemPrice').value) || 0;
    const unitSelect = document.getElementById('calcItemUnit');
    const unit = unitSelect ? unitSelect.value : 'шт';

    // Запам'ятовуємо характеристики для цього матеріалу
    let savedParams = JSON.parse(localStorage.getItem('material_defaults') || '{}');
    savedParams[matName] = { price: matPrice, unit: unit };
    localStorage.setItem('material_defaults', JSON.stringify(savedParams));

    // Додаємо в поточний список калькуляції
    if (typeof currentCalculatorRows !== 'undefined') {
        currentCalculatorRows.push({ name: matName, qty: qty, price: matPrice, unit: unit, total: qty * matPrice });
        if (typeof renderCalculatorRows === 'function') renderCalculatorRows();
    }

    // Очищаємо форму після додавання
    if (nameElem) nameElem.value = "";
    document.getElementById('calcItemQty').value = "1";
    document.getElementById('calcItemPrice').value = "";
};

/* Перевизначення відображення рядків калькуляції для виведення одиниць вимірювання */
const originalRenderCalculatorRows = window.renderCalculatorRows;
window.renderCalculatorRows = function() {
    const container = document.getElementById('calcRowsContainer');
    if (!container || typeof currentCalculatorRows === 'undefined') {
        if (typeof originalRenderCalculatorRows === 'function') originalRenderCalculatorRows();
        return;
    }

    container.innerHTML = '';
    let grandTotal = 0;

    currentCalculatorRows.forEach((row, idx) => {
        const rowTotal = row.qty * row.price;
        grandTotal += rowTotal;
        const unitStr = row.unit || 'шт';

        const div = document.createElement('div');
        div.className = 'calc-row-item';
        div.innerHTML = `
            <span>${row.name}</span>
            <span>${row.qty} ${unitStr}</span>
            <span>${rowTotal.toLocaleString('uk-UA')} ₴</span>
            <button type="button" class="btn-delete-row" onclick="deleteCalcRow(${idx})">✕</button>
        `;
        container.appendChild(div);
    });

    const totalElem = document.getElementById('calcTotalSum');
    if (totalElem) totalElem.innerText = grandTotal.toLocaleString('uk-UA') + ' ₴';
};
