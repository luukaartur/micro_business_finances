/* ==========================================
   ОНОВЛЕННЯ 2: ДОВІДНИК ПАРАМЕТРІВ КОМПОНЕНТІВ (Одиниці виміру + Ціна)
   ========================================== */

// Автоматичне підтягування параметрів матеріалу при його виборі
document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'calcItemName') {
        const selectedMaterial = e.target.value;
        const savedParams = JSON.parse(localStorage.getItem('material_defaults') || '{}');

        if (savedParams[selectedMaterial]) {
            const priceInput = document.getElementById('calcItemPrice');
            if (priceInput && savedParams[selectedMaterial].price) {
                priceInput.value = savedParams[selectedMaterial].price;
            }
        }
    }
});

// Перехоплюємо збереження складової у калькуляторі себевартості та запам'ятовуємо ціну
const originalAddCalcRow = window.handleAddCalcRow;
window.handleAddCalcRow = function(e) {
    if (e) e.preventDefault();
    
    const matName = document.getElementById('calcItemName').value;
    const matPrice = parseFloat(document.getElementById('calcItemPrice').value) || 0;

    if (matName) {
        let savedParams = JSON.parse(localStorage.getItem('material_defaults') || '{}');
        savedParams[matName] = {
            price: matPrice
        };
        localStorage.setItem('material_defaults', JSON.stringify(savedParams));
    }

    if (typeof originalAddCalcRow === 'function') {
        originalAddCalcRow(e);
    }
};

/* ==========================================
   ОНОВЛЕННЯ 1: ФУНКЦІЯ КЛОНУВАННЯ / КОПІЮВАННЯ ТОВАРІВ
   ========================================== */

window.duplicateProduct = function(productId, event) {
    if (event) event.stopPropagation(); // Зупиняємо відкриття деталки
    
    const prod = productsDatabase.find(p => p.id === productId || p.name === productId);
    if (!prod) return;

    // Створюємо новий об'єкт-копію
    const newProduct = {
        id: 'prod_' + Date.now(),
        name: prod.name + ' (копія)',
        img: prod.img || '',
        cost: prod.cost || 0,
        components: JSON.parse(JSON.stringify(prod.components || []))
    };

    productsDatabase.push(newProduct);
    
    // Якщо у вас є синхронізація з Гугл Таблицями – вона збереже це, або локально:
    if (typeof renderProductsList === 'function') {
        renderProductsList();
    }
    
    showToast("Товар успішно скомпільовано!");
};

// Модифікуємо відображення списку товарів, додаючи кнопку "Копіювати"
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
                const dupBtn = document.createElement('button');
                dupBtn.className = 'btn-duplicate-prod';
                dupBtn.innerText = '📋 Клонувати';
                dupBtn.onclick = (e) => duplicateProduct(prodData.id || prodData.name, e);
                item.appendChild(dupBtn);
            }
        }
    });
};

/* ==========================================
   КЕРУВАННЯ МАТРИЦЕЮ МОДАЛОК (Backdrop)
   ========================================== */
const originalGoToScreen = window.goToScreen;
window.goToScreen = function(screenId) {
    if (typeof originalGoToScreen === 'function') {
        originalGoToScreen(screenId);
    }
    if (screenId !== 'screen-main') {
        document.body.classList.add('has-open-modal');
    } else {
        document.body.classList.remove('has-open-modal');
    }
};
