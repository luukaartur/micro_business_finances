/* ==========================================
   КРОК 1: УНІВЕРСАЛЬНЕ ЗАКРИТТЯ ВІКОН ПО КЛІКУ НА ФОН
   ========================================== */

// 1. Обробка кліку по фону для швидких модалок
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.preventDefault();
        e.stopPropagation();
        e.target.classList.remove('active');
    }
});

// 2. Обробка кліку по фону для екранів на ПК (ВИПРАВЛЕНО КОНФЛІКТ)
document.addEventListener('click', function(e) {
    if (window.innerWidth >= 800 && document.body.classList.contains('has-active-screen')) {
        const activeScreen = document.querySelector('.content-panel .screen.active');
        
        if (activeScreen && !activeScreen.contains(e.target)) {
            // Ігноруємо кліки по сайдбару, модалкам та КНОПКАХ
            const isClickInsideSidebar = e.target.closest('.sidebar-panel');
            const isClickInsideModal = e.target.closest('.modal-overlay');
            const isClickOnButton = e.target.closest('button, .btn, [onclick]');

            if (!isClickInsideSidebar && !isClickInsideModal && !isClickOnButton) {
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

/* ==========================================
   БАЗА ДАНИХ ТА ЛОГІКА ТОВАРІВ
   ========================================== */

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

function saveProductsToStorage() {
    localStorage.setItem('my_products', JSON.stringify(productsData));
    renderProductsList();
}

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
    const container = document.getElementById('products-container');
    if (!container) return;

    container.innerHTML = '';
    productsData.forEach(prod => {
        const totalCost = prod.ingredients ? prod.ingredients.reduce((sum, item) => sum + (item.qty * item.price), 0) : 0;
        
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

    const titleEl = document.getElementById('dossier-title');
    if(titleEl) titleEl.innerText = prod.name;
    
    const imgEl = document.getElementById('dossier-img');
    if (imgEl) {
        if (prod.image) {
            imgEl.src = prod.image;
            imgEl.style.display = 'block';
        } else {
            imgEl.style.display = 'none';
        }
    }

    const listEl = document.getElementById('dossier-ingredients-list');
    let totalCost = 0;

    if (listEl) {
        listEl.innerHTML = '';
        if (prod.ingredients) {
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
        }
    }

    const totalEl = document.getElementById('dossier-total-cost');
    if (totalEl) totalEl.innerText = totalCost;

    openModal('modal-product-dossier');
}

// 3. РЕДАКТОР ТОВАРУ
function openProductEditor() {
    closeModal('modal-product-dossier');
    const prod = productsData.find(p => p.id === currentActiveProductId);
    if (!prod) return;

    const idInput = document.getElementById('edit-product-id');
    const nameInput = document.getElementById('edit-product-name');
    const imgInput = document.getElementById('edit-product-image');

    if (idInput) idInput.value = prod.id;
    if (nameInput) nameInput.value = prod.name;
    if (imgInput) imgInput.value = prod.image || '';

    const container = document.getElementById('editor-ingredients-container');
    if (container) {
        container.innerHTML = '';
        if (prod.ingredients) {
            prod.ingredients.forEach(ing => {
                addIngredientRow(ing.name, ing.qty, ing.price);
            });
        }
    }

    calculateEditCost();
    openModal('modal-product-editor');
}

function addIngredientRow(name = '', qty = 1, price = 0) {
    const container = document.getElementById('editor-ingredients-container');
    if (!container) return;

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

function calculateEditCost() {
    let total = 0;
    const rows = document.querySelectorAll('.ingredient-row');
    rows.forEach(row => {
        const qty = parseFloat(row.querySelector('.ing-qty').value) || 0;
        const price = parseFloat(row.querySelector('.ing-price').value) || 0;
        total += qty * price;
    });
    
    const costEl = document.getElementById('edit-calc-cost');
    if (costEl) costEl.innerText = total;
}

// 4. КЛОНУВАННЯ ТОВАРУ
function cloneCurrentProduct() {
    const prod = productsData.find(p => p.id === currentActiveProductId);
    if (!prod) return;

    const newProduct = {
        id: Date.now(),
        name: prod.name + ' (Клонований)',
        image: prod.image,
        ingredients: JSON.parse(JSON.stringify(prod.ingredients || []))
    };

    productsData.push(newProduct);
    saveProductsToStorage();
    
    closeModal('modal-product-dossier');
    
    currentActiveProductId = newProduct.id;
    openProductEditor();
}

/* ==========================================
   БЕЗПЕЧНА ІНІЦІАЛІЗАЦІЯ ФОРМ ТА ПОДІЙ
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    renderProductsList();

    // Форма редагування товару
    const formEdit = document.getElementById('form-edit-product');
    if (formEdit) {
        formEdit.onsubmit = function(e) {
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
                openDossier(id);
            }
        };
    }

    // Форма додавання товару
    const formAdd = document.getElementById('form-add-product');
    if (formAdd) {
        formAdd.onsubmit = function(e) {
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

            currentActiveProductId = newProd.id;
            openProductEditor();
        };
    }
});
