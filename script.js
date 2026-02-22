// Элементы DOM
const openingHeightInput = document.getElementById('openingHeight');
const numBoxesInput = document.getElementById('numBoxes');
const container = document.getElementById('boxHeightsContainer');
const form = document.getElementById('calcForm');
const resultDiv = document.getElementById('result');
const resultBody = document.getElementById('resultBody');
const facadeBody = document.getElementById('facadeBody');
const warningDiv = document.getElementById('warning');
const infoDiv = document.getElementById('info');

// Константы
const BOTTOM_OFFSET = 20;            // отступ нижнего ящика от дна (мм)
const FACADE_BOTTOM_OVERLAP = 14;    // нижний фасад ниже дна (мм)
const FACADE_TOP_OVERLAP = 11;       // верхний фасад выше верха (мм)
const FACADE_GAP = 3;                 // зазор между фасадами (мм)

// Создание полей для ввода высот ящиков
function createHeightInputs(count) {
    container.innerHTML = '';
    if (count < 1) return;

    for (let i = 1; i <= count; i++) {
        const wrapper = document.createElement('div');
        wrapper.className = 'box-height-wrapper';

        const label = document.createElement('label');
        label.textContent = `Высота ящика ${i} (мм):`;
        label.htmlFor = `boxHeight${i}`;

        const input = document.createElement('input');
        input.type = 'number';
        input.id = `boxHeight${i}`;
        input.name = `boxHeight${i}`;
        input.step = '0.1';
        input.min = '0.1';
        input.required = true;
        input.classList.add('box-height-input');

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        container.appendChild(wrapper);
    }
}

// Обработчик изменения количества ящиков
numBoxesInput.addEventListener('input', function() {
    const count = parseInt(this.value);
    if (!isNaN(count) && count > 0) {
        createHeightInputs(count);
    } else {
        container.innerHTML = '';
    }
});

// Обработчик отправки формы
form.addEventListener('submit', function(e) {
    e.preventDefault();

    // Основные параметры
    const openingHeight = parseFloat(openingHeightInput.value);
    const numBoxes = parseInt(numBoxesInput.value);

    if (isNaN(openingHeight) || openingHeight <= 0) {
        alert('Введите корректную высоту проёма.');
        return;
    }

    if (isNaN(numBoxes) || numBoxes < 1) {
        alert('Введите корректное количество ящиков.');
        return;
    }

    // Сбор высот ящиков
    const boxHeights = [];
    for (let i = 1; i <= numBoxes; i++) {
        const input = document.getElementById(`boxHeight${i}`);
        if (!input) {
            alert(`Сначала укажите высоту для ящика ${i}`);
            return;
        }
        const h = parseFloat(input.value);
        if (isNaN(h) || h <= 0) {
            alert(`Высота ящика ${i} должна быть положительным числом.`);
            return;
        }
        boxHeights.push(h);
    }

    // --- РАСЧЁТ НАПРАВЛЯЮЩИХ (ящики) ---
    const sumBoxHeights = boxHeights.reduce((a, b) => a + b, 0);
    const availableForGaps = openingHeight - BOTTOM_OFFSET - sumBoxHeights;
    const gapCount = numBoxes; // количество зазоров (между ящиками и сверху)
    const gap = availableForGaps / gapCount;

    // Проверка на отрицательный зазор
    if (gap < 0) {
        resultDiv.classList.remove('hidden');
        warningDiv.innerHTML = `
            ⚠️ Ящики не помещаются в проём! 
            Необходимо увеличить высоту проёма или уменьшить высоту ящиков/их количество.<br>
            Минимальная требуемая высота (с нулевыми зазорами): ${(BOTTOM_OFFSET + sumBoxHeights).toFixed(2)} мм.
        `;
        infoDiv.innerHTML = '';
        resultBody.innerHTML = '';
        facadeBody.innerHTML = '';
        return;
    }

    // Расчёт позиций направляющих
    const positions = [];
    let cumulativeHeight = BOTTOM_OFFSET;

    for (let i = 0; i < numBoxes; i++) {
        const pos = cumulativeHeight + boxHeights[i] / 2;
        positions.push(pos.toFixed(2));
        cumulativeHeight += boxHeights[i];
        if (i < numBoxes - 1) {
            cumulativeHeight += gap;
        }
    }

    // Отображение таблицы направляющих
    resultBody.innerHTML = '';
    positions.forEach((pos, index) => {
        const row = `<tr><td>${index + 1}</td><td>${pos}</td></tr>`;
        resultBody.innerHTML += row;
    });

    // Информация о ящиках
    const topLastBox = BOTTOM_OFFSET + sumBoxHeights + (numBoxes - 1) * gap;
    const freeSpace = openingHeight - topLastBox;

    warningDiv.innerHTML = '';
    infoDiv.innerHTML = `
        ✅ Ящики помещаются.<br>
        Равномерный зазор (между ящиками и сверху): <strong>${gap.toFixed(2)} мм</strong>.<br>
        Верхняя грань последнего ящика: ${topLastBox.toFixed(2)} мм от дна.<br>
        Свободно сверху: ${freeSpace.toFixed(2)} мм.
    `;

    // --- РАСЧЁТ ФАСАДОВ ---
    // Общая высота зоны фасадов (от нижнего края нижнего до верхнего края верхнего)
    const facadeZoneHeight = openingHeight + FACADE_BOTTOM_OVERLAP + FACADE_TOP_OVERLAP; // H + 14 + 11
    // Суммарная высота всех фасадов (без зазоров)
    const totalFacadeHeight = facadeZoneHeight - FACADE_GAP * (numBoxes - 1);

    if (totalFacadeHeight <= 0) {
        // Фасады не помещаются даже с нулевой высотой
        facadeBody.innerHTML = `<tr><td colspan="4" style="color:red;">Невозможно рассчитать фасады: слишком маленький проём или большие зазоры.</td></tr>`;
    } else {
        // Пропорциональное распределение высот фасадов
        const sumBox = sumBoxHeights; // уже есть
        const facadeHeights = boxHeights.map(h => (h / sumBox) * totalFacadeHeight);

        // Вычисление координат фасадов
        let bottomEdge = -FACADE_BOTTOM_OVERLAP; // нижний край первого фасада (от дна проёма)
        const facadeRows = [];

        for (let i = 0; i < numBoxes; i++) {
            const fh = facadeHeights[i];
            const topEdge = bottomEdge + fh;
            facadeRows.push({
                index: i + 1,
                height: fh.toFixed(2),
                bottom: bottomEdge.toFixed(2),
                top: topEdge.toFixed(2)
            });
            // Добавляем зазор для следующего (кроме последнего)
            if (i < numBoxes - 1) {
                bottomEdge = topEdge + FACADE_GAP;
            }
        }

        // Заполнение таблицы фасадов
        facadeBody.innerHTML = '';
        facadeRows.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${row.index}</td><td>${row.height}</td><td>${row.bottom}</td><td>${row.top}</td>`;
            facadeBody.appendChild(tr);
        });

        // Проверка: верхний край последнего должен быть openingHeight + 11
        // (можно добавить с округлением)
    }

    resultDiv.classList.remove('hidden');
});

// При загрузке страницы создаём поля для начального количества ящиков (если указано)
window.addEventListener('load', function() {
    const initialCount = parseInt(numBoxesInput.value);
    if (!isNaN(initialCount) && initialCount > 0) {
        createHeightInputs(initialCount);
    }
});