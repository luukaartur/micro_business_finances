/* ==========================================
   КРОК 1: УНІВЕРСАЛЬНЕ ЗАКРИТТЯ ВІКОН ПО КЛІКУ НА ФОН
   ========================================== */

// 1. Обробка кліку по фону для швидких модалок (Гроші, Виплати, Справочники)
document.addEventListener('click', function(e) {
    // Перевіряємо клік по модальному оверлею
    if (e.target.classList.contains('modal-overlay')) {
        e.preventDefault();
        e.stopPropagation();
        
        // Закриваємо поточне модальне вікно
        e.target.classList.remove('active');
    }
});

// 2. Обробка кліку по фону для екранів на ПК
document.addEventListener('click', function(e) {
    if (window.innerWidth >= 800 && document.body.classList.contains('has-active-screen')) {
        const activeScreen = document.querySelector('.content-panel .screen.active');
        
        if (activeScreen && !activeScreen.contains(e.target)) {
            // Перевіряємо, щоб клік не був по плитках дашборду чи кнопках
            const isClickInsideSidebar = e.target.closest('.sidebar-panel');
            const isClickInsideModal = e.target.closest('.modal-overlay');

            if (!isClickInsideSidebar && !isClickInsideModal) {
                if (typeof goToScreen === 'function') {
                    goToScreen('screen-main');
                }
            }
        }
    }
});

// 3. Синхронізація стану фону при переключенні екранів
const originalGoToScreen = window.goToScreen;
if (typeof originalGoToScreen === 'function') {
    window.goToScreen = function(screenId) {
        originalGoToScreen(screenId);
        
        if (screenId === 'screen-main' || !screenId) {
            document.body.classList.remove('has-active-screen');
        } else {
            document.body.classList.add('has-active-screen');
        }
    };
}

// База даних товарів (в пам'яті / можна синхронізувати з localStorage)
let productsData = JSON.parse(localStorage.getItem('my_products')) || [
    {
        id: 1,
        name: "Подарунковий бокс",
        image: "",
        ingredients: [
            { name: "Коробка", qty: 1, price: 50 },
            { name: "Стрічка", qty: 2, price: 10 }
        ]
    }
];

let currentActiveProductId = null;

// Збереження в LocalStorage
function saveProductsToStorage() {
    localStorage.setItem('my_products', JSON.stringify(productsData));
    renderProductsList();
}

// Допоміжні функції відкриття/закриття модалок
function openModal(id) {
    const m = document.getElementById(id);
    if(m) m.classList.add('active');
}
function closeModal(id) {
    const m = document.getElementById(id);
    if(m) m.classList.remove('active');
}

// 1. ВІДОБРАЖЕННЯ СПИСКУ ТОВАРІВ
function renderProductsList() {
    const container = document.getElementById('products-container'); // перевірте ID вашого контейнера товарів
    if (!container) return;

    container.innerHTML = '';
    productsData.forEach(prod => {
        const totalCost = prod.ingredients.reduce((sum, item) => sum + (item.qty * item.price), 0);
        
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => openDossier(prod.id);
        card.innerHTML = `
            <div class="product-title"><strong>${prod.name}</strong></div>
            <div class="product-cost">Собівартість: ${totalCost} грн</div>
        `;
        container.appendChild(card);
    });
}

// 2. ВІДКРИТТЯ ДОСЬЄ ТОВАРУ
function openDossier(id) {
    const prod = productsData.find(p => p.id === id);
    if (!prod) return;

    currentActiveProductId = id;

    document.getElementById('dossier-title').innerText = prod.name;
    
    const imgEl = document.getElementById('dossier-img');
    if (prod.image) {
        imgEl.src = prod.image;
        imgEl.style.display = 'block';
    } else {
        imgEl.style.display = 'none';
    }

    const listEl = document.getElementById('dossier-ingredients-list');
    listEl.innerHTML = '';

    let totalCost = 0;
    prod.ingredients.forEach(ing => {
        const cost = ing.qty * ing.price;
        totalCost += cost;
        listEl.innerHTML += `
            <li>
                <span>${ing.name} (${ing.qty} шт x ${ing.price} грн)</span>
                <strong>${cost} грн</strong>
            </li>
        `;
    });

    document.getElementById('dossier-total-cost').innerText = totalCost;
    openModal('modal-product-dossier');
}

// 3. РЕДАКТОР ТОВАРУ
function openProductEditor() {
    closeModal('modal-product-dossier');
    const prod = productsData.find(p => p.id === currentActiveProductId);
    if (!prod) return;

    document.getElementById('edit-product-id').value = prod.id;
    document.getElementById('edit-product-name').value = prod.name;
    document.getElementById('edit-product-image').value = prod.image || '';

    const container = document.getElementById('editor-ingredients-container');
    container.innerHTML = '';

    prod.ingredients.forEach(ing => {
        addIngredientRow(ing.name, ing.qty, ing.price);
    });

    calculateEditCost();
    openModal('modal-product-editor');
}

// Додавання рядка інгредієнта в редактор
function addIngredientRow(name = '', qty = 1, price = 0) {
    const container = document.getElementById('editor-ingredients-container');
    const row = document.createElement('div');
    row.className = 'ingredient-row';
    row.innerHTML = `
        <input type="text" class="ing-name" placeholder="Назва складової" value="${name}" required>
        <input type="number" class="ing-qty" placeholder="К-сть" value="${qty}" min="1" oninput="calculateEditCost()">
        <input type="number" class="ing-price" placeholder="Ціна" value="${price}" min="0" oninput="calculateEditCost()">
        <button type="button" class="btn-remove" onclick="this.parentElement.remove(); calculateEditCost();">✕</button>
    `;
    container.appendChild(row);
    calculateEditCost();
}

// Підрахунок суми в редакторі
function calculateEditCost() {
    let total = 0;
    const rows = document.querySelectorAll('.ingredient-row');
    rows.forEach(row => {
        const qty = parseFloat(row.querySelector('.ing-qty').value) || 0;
        const price = parseFloat(row.querySelector('.ing-price').value) || 0;
        total += qty * price;
    });
    document.getElementById('edit-calc-cost').innerText = total;
}

// Збереження відредагованого товару
document.getElementById('form-edit-product').onsubmit = function(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('edit-product-id').value);
    const prod = productsData.find(p => p.id === id);

    if (prod) {
        prod.name = document.getElementById('edit-product-name').value;
        prod.image = document.getElementById('edit-product-image').value;

        prod.ingredients = [];
        const rows = document.querySelectorAll('.ingredient-row');
        rows.forEach(row => {
            prod.ingredients.push({
                name: row.querySelector('.ing-name').value,
                qty: parseFloat(row.querySelector('.ing-qty').value) || 0,
                price: parseFloat(row.querySelector('.ing-price').value) || 0
            });
        });

        saveProductsToStorage();
        closeModal('modal-product-editor');
        openDossier(id); // Повертаємось у досьє з оновленими даними
    }
};

// 4. КЛОНУВАННЯ ТОВАРУ
function cloneCurrentProduct() {
    const prod = productsData.find(p => p.id === currentActiveProductId);
    if (!prod) return;

    // Створюємо копію об'єкта
    const newProduct = {
        id: Date.now(),
        name: prod.name + ' (Клонований)',
        image: prod.image,
        ingredients: JSON.parse(JSON.stringify(prod.ingredients)) // Глибока копія складових
    };

    productsData.push(newProduct);
    saveProductsToStorage();
    
    closeModal('modal-product-dossier');
    
    // Відразу відкриваємо новий товар у редакторі, щоб відкоригувати назву/складові
    currentActiveProductId = newProduct.id;
    openProductEditor();
}

// 5. ДОДАВАННЯ НОВОГО ТОВАРУ (Початкова форма)
document.getElementById('form-add-product').onsubmit = function(e) {
    e.preventDefault();
    const newProd = {
        id: Date.now(),
        name: document.getElementById('add-product-name').value,
        image: document.getElementById('add-product-image').value,
        ingredients: []
    };

    productsData.push(newProd);
    saveProductsToStorage();
    
    this.reset();
    closeModal('modal-add-product');

    // Відразу відкриваємо його редактор для додавання складових
    currentActiveProductId = newProd.id;
    openProductEditor();
};

// Ініціалізація при завантаженні
document.addEventListener('DOMContentLoaded', () => {
    renderProductsList();
});
