// Система отладки
const debugLog = [];
let debugPanelVisible = false;
let isLogging = false; // Флаг для предотвращения рекурсии

// Сохраняем оригинальные функции консоли ДО их переопределения
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

function addDebugLog(message, type = 'info') {
    if (isLogging) return; // Предотвращаем рекурсию
    
    try {
        isLogging = true;
        const timestamp = new Date().toLocaleTimeString();
        const entry = { time: timestamp, message: String(message), type };
        debugLog.push(entry);
        
        // Ограничиваем количество записей
        if (debugLog.length > 100) {
            debugLog.shift();
        }
        
        // Обновляем панель, если она видима (без вызова console.log)
        if (debugPanelVisible) {
            updateDebugPanel();
        }
    } catch (e) {
        // Игнорируем ошибки в системе отладки - не используем console здесь
    } finally {
        isLogging = false;
    }
}

function updateDebugPanel() {
    const panel = document.getElementById('debug-panel');
    const logDiv = document.getElementById('debug-log');
    
    if (!panel || !logDiv) return;
    
    logDiv.innerHTML = debugLog.map(entry => {
        const className = entry.type === 'error' ? 'error' : entry.type === 'warn' ? 'warn' : entry.type === 'success' ? 'success' : '';
        return `<div class="log-entry ${className}">[${entry.time}] ${escapeHtml(entry.message)}</div>`;
    }).join('');
    
    // Прокручиваем вниз
    logDiv.scrollTop = logDiv.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Глобальная функция для переключения панели отладки
window.toggleDebug = function() {
    debugPanelVisible = !debugPanelVisible;
    const panel = document.getElementById('debug-panel');
    const toggle = document.getElementById('debug-toggle');
    
    if (panel) {
        if (debugPanelVisible) {
            panel.classList.add('visible');
            if (toggle) toggle.textContent = 'Скрыть отладку';
            updateDebugPanel();
        } else {
            panel.classList.remove('visible');
            if (toggle) toggle.textContent = 'Показать отладку';
        }
    }
};

// Функция для переключения видимости панели управления отступом
let labelControlPanelVisible = false;
window.toggleLabelControl = function() {
    labelControlPanelVisible = !labelControlPanelVisible;
    const panel = document.getElementById('label-control-panel');
    const toggle = document.getElementById('label-control-toggle');
    
    if (panel) {
        if (labelControlPanelVisible) {
            panel.classList.add('visible');
            if (toggle) toggle.textContent = 'Скрыть управление отступом';
            // Показываем панель только если есть подпись
            if (currentLabelData && currentLabelData.marker) {
                initLabelControlPanel();
            }
        } else {
            panel.classList.remove('visible');
            if (toggle) toggle.textContent = 'Управление отступом';
        }
    }
};

// Переопределяем console.log, console.error, console.warn для отладки
// ВАЖНО: используем флаг, чтобы избежать рекурсии

console.log = function(...args) {
    originalLog.apply(console, args);
    if (!isLogging) {
        isLogging = true;
        addDebugLog(args.join(' '), 'info');
        isLogging = false;
    }
};

console.error = function(...args) {
    originalError.apply(console, args);
    if (!isLogging) {
        isLogging = true;
        addDebugLog(args.join(' '), 'error');
        isLogging = false;
    }
};

console.warn = function(...args) {
    originalWarn.apply(console, args);
    if (!isLogging) {
        isLogging = true;
        addDebugLog(args.join(' '), 'warn');
        isLogging = false;
    }
};

// Инициализация карты
const map = L.map('map').setView([55.7558, 37.6173], 6);
addDebugLog('Карта инициализирована', 'success');

// Добавление тайлов OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

// Обработчики событий для пересчета позиции подписи при изменении масштаба
map.on('zoomend', function() {
    updateZoomDisplay();
    if (currentLabelData) {
        updateLabelPosition();
    }
});

map.on('moveend', function() {
    if (currentLabelData) {
        updateLabelPosition();
    }
});

map.on('zoom', function() {
    updateZoomDisplay();
});

// Функция для обновления отображения масштаба
function updateZoomDisplay() {
    const zoomDisplay = document.getElementById('zoom-display');
    if (zoomDisplay) {
        const zoom = map.getZoom();
        zoomDisplay.textContent = zoom.toFixed(1);
    }
}

// Переменная для хранения таймера debounce
let offsetUpdateTimer = null;

// Инициализация панели управления отступом
function initLabelControlPanel() {
    const panel = document.getElementById('label-control-panel');
    const slider = document.getElementById('offset-slider');
    const offsetValue = document.getElementById('offset-value');
    const resetBtn = document.getElementById('reset-offset-btn');
    
    if (!panel || !slider || !offsetValue || !resetBtn) {
        return;
    }
    
    // Удаляем старые обработчики, если они есть (чтобы не дублировать)
    const newSlider = slider.cloneNode(true);
    slider.parentNode.replaceChild(newSlider, slider);
    const newResetBtn = resetBtn.cloneNode(true);
    resetBtn.parentNode.replaceChild(newResetBtn, resetBtn);
    
    // Получаем новые элементы
    const newSliderEl = document.getElementById('offset-slider');
    const newResetBtnEl = document.getElementById('reset-offset-btn');
    
    // Показываем панель только если она видима (открыта пользователем) и есть подпись
    if (labelControlPanelVisible && currentLabelData && currentLabelData.marker) {
        panel.classList.add('visible');
        updateZoomDisplay();
        
        // Устанавливаем значение ползунка
        if (manualLabelOffset !== null) {
            newSliderEl.value = manualLabelOffset.toFixed(3); // прямое значение в градусах
            offsetValue.textContent = manualLabelOffset.toFixed(4) + '°';
        } else {
            newSliderEl.value = 0;
            offsetValue.textContent = 'Авто';
        }
    } else {
        panel.classList.remove('visible');
    }
    
    // Обработчик изменения ползунка с debounce
    newSliderEl.addEventListener('input', function() {
        const value = parseFloat(newSliderEl.value);
        if (value === 0) {
            manualLabelOffset = null;
            offsetValue.textContent = 'Авто';
        } else {
            manualLabelOffset = value; // прямое значение в градусах (0-2)
            offsetValue.textContent = manualLabelOffset.toFixed(4) + '°';
        }
        
        // Очищаем предыдущий таймер
        if (offsetUpdateTimer) {
            clearTimeout(offsetUpdateTimer);
        }
        
        // Обновляем позицию подписи с задержкой (debounce)
        offsetUpdateTimer = setTimeout(function() {
            if (currentLabelData) {
                updateLabelPosition();
            }
            offsetUpdateTimer = null;
        }, 150); // 150ms задержка
    });
    
    // Обработчик кнопки сброса
    newResetBtnEl.addEventListener('click', function() {
        // Очищаем таймер, если он есть
        if (offsetUpdateTimer) {
            clearTimeout(offsetUpdateTimer);
            offsetUpdateTimer = null;
        }
        
        manualLabelOffset = null;
        newSliderEl.value = 0;
        offsetValue.textContent = 'Авто';
        if (currentLabelData) {
            updateLabelPosition();
        }
    });
}

// Вызываем инициализацию при загрузке
window.addEventListener('load', function() {
    setTimeout(initLabelControlPanel, 100);
});

// Функция для получения параметров из URL
function getUrlParams() {
    let search = window.location.search;
    
    // Если search пустой, пробуем получить из hash
    if (!search && window.location.hash) {
        const hashParts = window.location.hash.split('?');
        if (hashParts.length > 1) {
            search = '?' + hashParts[1];
        }
    }
    
    // Если search все еще пустой, пробуем получить из полного URL
    if (!search) {
        const fullUrl = window.location.href;
        const urlParts = fullUrl.split('?');
        if (urlParts.length > 1) {
            search = '?' + urlParts[1];
        }
    }
    
    const params = new URLSearchParams(search);
    
    // Пробуем декодировать параметры
    let country = params.get('country');
    let city = params.get('city');
    let region = params.get('region');
    let rda = params.get('rda');
    let qth = params.get('qth');
    
    // Если параметры не найдены, пробуем альтернативный способ
    if (!country && search) {
        const match = search.match(/country=([^&]*)/);
        if (match) {
            country = decodeURIComponent(match[1]);
        }
    }
    
    if (!city && search) {
        const match = search.match(/city=([^&]*)/);
        if (match) {
            city = decodeURIComponent(match[1]);
        }
    }
    
    if (!region && search) {
        const match = search.match(/region=([^&]*)/);
        if (match) {
            region = decodeURIComponent(match[1]);
        }
    }
    
    if (!rda && search) {
        const match = search.match(/rda=([^&]*)/);
        if (match) {
            rda = decodeURIComponent(match[1]);
        }
    }
    
    if (!qth && search) {
        const match = search.match(/qth=([^&]*)/);
        if (match) {
            qth = decodeURIComponent(match[1]);
        }
    }
    
    // Функция для очистки кавычек из параметра
    const cleanParam = (param) => {
        if (!param) return null;
        const decoded = decodeURIComponent(param);
        // Удаляем кавычки в начале и конце, если они есть
        return decoded.replace(/^["']|["']$/g, '').trim();
    };
    
    return {
        country: country ? cleanParam(country) : null,
        city: city ? cleanParam(city) : null,
        region: region ? cleanParam(region) : null,
        rda: rda ? cleanParam(rda) : null,
        qth: qth ? cleanParam(qth) : null
    };
}

// Функция для показа/скрытия загрузки
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

// Функция для безопасной установки вида карты с проверкой координат
function safeSetView(lat, lon, zoom = 6) {
    // Проверяем валидность координат
    if (isNaN(lat) || isNaN(lon) || !isFinite(lat) || !isFinite(lon)) {
        console.error('Некорректные координаты для setView:', lat, lon);
        return false;
    }
    
    // Проверяем диапазон координат
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        console.error('Координаты вне допустимого диапазона:', lat, lon);
        return false;
    }
    
    try {
        map.setView([lat, lon], zoom);
        return true;
    } catch (e) {
        console.error('Ошибка при установке вида карты:', e);
        return false;
    }
}

// Функция для показа ошибки
function showError(message) {
    const errorDiv = document.getElementById('error');
    const errorText = document.getElementById('error-text');
    if (errorText) {
        errorText.textContent = message;
    } else {
        errorDiv.textContent = message;
    }
    errorDiv.style.display = 'block';
    // Окно ошибки больше не скрывается автоматически
}

// Функция для геокодинга через Nominatim
async function geocode(query, country = 'Россия') {
    const fullQuery = country ? `${query}, ${country}` : query;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullQuery)}&format=json&limit=1&accept-language=ru`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'RadioMap/1.0'
            }
        });
        
        if (!response.ok) {
            console.error('Ошибка HTTP:', response.status, response.statusText);
            return null;
        }
        
        const data = await response.json();
        
        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            
            // Проверяем валидность координат
            if (isNaN(lat) || isNaN(lon) || !isFinite(lat) || !isFinite(lon)) {
                console.error('Некорректные координаты:', data[0].lat, data[0].lon);
                return null;
            }
            
            return {
                lat: lat,
                lon: lon,
                displayName: data[0].display_name,
                osmId: data[0].osm_id,
                osmType: data[0].osm_type
            };
        }
        return null;
    } catch (error) {
        console.error('Ошибка геокодинга:', error);
        // Если это CORS ошибка, пробуем альтернативный подход
        if (error.message && error.message.includes('CORS')) {
            console.error('CORS ошибка. Попробуйте запустить через локальный сервер.');
        }
        return null;
    }
}

// Функция для получения границ через Overpass API
async function getBoundary(osmId, osmType) {
    const typeMap = {
        'node': 'node',
        'way': 'way',
        'relation': 'relation'
    };
    
    const type = typeMap[osmType] || 'relation';
    
    console.log('Получение границ через OSM ID:', osmId, 'тип:', type);
    
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    const query = `
        [out:json][timeout:25];
        ${type}(${osmId});
        (._;>;);
        out geom;
    `;
    
    try {
        const response = await fetch(overpassUrl, {
            method: 'POST',
            body: query,
            headers: {
                'Content-Type': 'text/plain'
            }
        });
        
        if (!response.ok) {
            console.error('Overpass API ошибка:', response.status);
            return null;
        }
        
        const data = await response.json();
        
        console.log('Overpass ответ для OSM ID:', data);
        
        if (data.elements && data.elements.length > 0) {
            const element = data.elements[0];
            console.log('Элемент найден:', element.type, 'members:', element.members ? element.members.length : 0);
            
            // Для relation получаем members и строим полигон
            if (element.type === 'relation' && element.members) {
                // Собираем все координаты из outer ways
                const outerWays = element.members.filter(m => m.role === 'outer');
                console.log('Outer ways найдено:', outerWays.length);
                
                if (outerWays.length > 0) {
                    const coordinates = [];
                    for (const member of outerWays) {
                        if (member.geometry && member.geometry.length > 0) {
                            // Фильтруем и нормализуем координаты (для восточных частей)
                            const validCoords = member.geometry
                                .map(coord => {
                                    let lat = coord.lat;
                                    let lon = coord.lon;
                                    // Нормализуем долготу: если > 180, преобразуем в отрицательные
                                    if (lon > 180) {
                                        lon = lon - 360;
                                    }
                                    return [lat, lon];
                                })
                                .filter(coord => {
                                    const lat = coord[0];
                                    const lon = coord[1];
                                    return !isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon) &&
                                           lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
                                });
                            if (validCoords.length > 0) {
                                coordinates.push(validCoords);
                            }
                        }
                    }
                    console.log('Координаты собраны, полигонов:', coordinates.length);
                    return coordinates.length > 0 ? coordinates : null;
                }
            }
            
            // Для way получаем geometry напрямую
            if (element.type === 'way' && element.geometry) {
                // Фильтруем и нормализуем координаты (для восточных частей)
                const validCoords = element.geometry
                    .map(coord => {
                        let lat = coord.lat;
                        let lon = coord.lon;
                        // Нормализуем долготу: если > 180, преобразуем в отрицательные
                        if (lon > 180) {
                            lon = lon - 360;
                        }
                        return [lat, lon];
                    })
                    .filter(coord => {
                        const lat = coord[0];
                        const lon = coord[1];
                        return !isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon) &&
                               lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
                    });
                console.log('Way координаты собраны, точек:', validCoords.length);
                return validCoords.length > 0 ? [validCoords] : null;
            }
        }
        
        console.warn('Границы не найдены для OSM ID:', osmId);
        return null;
    } catch (error) {
        console.error('Ошибка получения границ:', error);
        return null;
    }
}

// Функция для получения альтернативных названий стран
function getAlternativeCountryNames(query) {
    const countryMap = {
        'Китай': ['China', '中国', 'CN', 'People\'s Republic of China'],
        'Китайская Народная Республика': ['China', '中国', 'CN', 'People\'s Republic of China', 'Китай'],
        'China': ['Китай', '中国', 'CN', 'People\'s Republic of China'],
        'россия': ['Russia', 'RU', 'Российская Федерация'],
        'Россия': ['Russia', 'RU', 'Российская Федерация'],
        'Russia': ['Россия', 'RU', 'Российская Федерация']
    };
    
    const normalized = query.trim();
    return countryMap[normalized] || [query];
}

// Функция для получения границ через альтернативный метод (используя Nominatim для получения OSM ID)
// Функции для кэширования границ стран в LocalStorage
const CACHE_VERSION = '1.0';
const CACHE_TTL_DAYS = 7; // Время жизни кэша в днях

function getCacheKey(query, isCountry = false) {
    // Создаем ключ кэша на основе запроса и типа (страна/город/регион)
    const prefix = isCountry ? 'country_boundary' : 'boundary';
    return `${prefix}_${CACHE_VERSION}_${query.toLowerCase().trim()}`;
}

function saveBoundaryToCache(query, boundary, isCountry = false) {
    try {
        const cacheKey = getCacheKey(query, isCountry);
        const cacheData = {
            boundary: boundary,
            timestamp: Date.now(),
            query: query
        };
        const dataStr = JSON.stringify(cacheData);
        
        // Проверяем размер данных (LocalStorage обычно ограничен 5-10MB)
        const sizeInMB = new Blob([dataStr]).size / (1024 * 1024);
        if (sizeInMB > 5) {
            addDebugLog(`Границы "${query}" слишком большие для кэша (${sizeInMB.toFixed(2)}MB), не сохраняем`, 'warn');
            return false;
        }
        
        localStorage.setItem(cacheKey, dataStr);
        addDebugLog(`Границы "${query}" сохранены в кэш (${sizeInMB.toFixed(2)}MB)`, 'success');
        return true;
    } catch (e) {
        // Если LocalStorage переполнен или недоступен, пытаемся очистить старые записи
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            addDebugLog('LocalStorage переполнен, очищаем старые записи кэша', 'warn');
            clearOldCache();
            // Пробуем еще раз
            try {
                const cacheKey = getCacheKey(query, isCountry);
                const cacheData = {
                    boundary: boundary,
                    timestamp: Date.now(),
                    query: query
                };
                localStorage.setItem(cacheKey, JSON.stringify(cacheData));
                addDebugLog(`Границы "${query}" сохранены в кэш после очистки`, 'success');
                return true;
            } catch (e2) {
                addDebugLog(`Не удалось сохранить в кэш: ${e2.message}`, 'warn');
                return false;
            }
        }
        addDebugLog(`Ошибка сохранения в кэш: ${e.message}`, 'warn');
        return false;
    }
}

function getBoundaryFromCache(query, isCountry = false) {
    try {
        const cacheKey = getCacheKey(query, isCountry);
        const cachedStr = localStorage.getItem(cacheKey);
        
        if (!cachedStr) {
            return null;
        }
        
        const cacheData = JSON.parse(cachedStr);
        const ageInDays = (Date.now() - cacheData.timestamp) / (1000 * 60 * 60 * 24);
        
        // Проверяем срок действия кэша
        if (ageInDays > CACHE_TTL_DAYS) {
            addDebugLog(`Кэш для "${query}" устарел (${ageInDays.toFixed(1)} дней), удаляем`, 'info');
            localStorage.removeItem(cacheKey);
            return null;
        }
        
        addDebugLog(`Границы "${query}" загружены из кэша (возраст: ${ageInDays.toFixed(1)} дней)`, 'success');
        return cacheData.boundary;
    } catch (e) {
        addDebugLog(`Ошибка загрузки из кэша: ${e.message}`, 'warn');
        return null;
    }
}

function clearOldCache() {
    try {
        const keysToRemove = [];
        const now = Date.now();
        
        // Проходим по всем ключам LocalStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('country_boundary_') || key.startsWith('boundary_'))) {
                try {
                    const cachedStr = localStorage.getItem(key);
                    if (cachedStr) {
                        const cacheData = JSON.parse(cachedStr);
                        const ageInDays = (now - cacheData.timestamp) / (1000 * 60 * 60 * 24);
                        if (ageInDays > CACHE_TTL_DAYS) {
                            keysToRemove.push(key);
                        }
                    }
                } catch (e) {
                    // Если не удалось распарсить, удаляем
                    keysToRemove.push(key);
                }
            }
        }
        
        // Удаляем устаревшие записи
        keysToRemove.forEach(key => localStorage.removeItem(key));
        if (keysToRemove.length > 0) {
            addDebugLog(`Очищено ${keysToRemove.length} устаревших записей кэша`, 'info');
        }
    } catch (e) {
        addDebugLog(`Ошибка очистки кэша: ${e.message}`, 'warn');
    }
}

async function getBoundaryByQuery(query, country = 'Россия') {
    // Для стран используем только query без country в запросе
    // Для городов добавляем страну в запрос для более точного поиска
    const fullQuery = country && country !== 'Россия' ? `${query}, ${country}` : query;
    
    addDebugLog(`getBoundaryByQuery: query="${query}", country="${country}", fullQuery="${fullQuery}"`, 'info');
    
    // Определяем, является ли запрос страной (если country не указан или равен query)
    const isCountry = !country || country === query || country === 'Россия' && query === 'Россия';
    
    // Сначала проверяем кэш (только для стран)
    if (isCountry) {
        const cachedBoundary = getBoundaryFromCache(query, true);
        if (cachedBoundary) {
            return cachedBoundary;
        }
    }
    
    // Сначала пробуем получить через Nominatim с polygon_geojson
    // Используем polygon_kml=1 для более детальных данных, или polygon_geojson=1
    // Для стран лучше использовать polygon_geojson=1 без упрощения
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullQuery)}&format=json&limit=5&accept-language=ru&polygon_geojson=1&addressdetails=1&extratags=1`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'RadioMap/1.0'
            }
        });
        
        if (!response.ok) {
            console.error('Ошибка HTTP при получении границ:', response.status);
            return null;
        }
        
        const data = await response.json();
        
        if (data && data.length > 0) {
            console.log('Данные от Nominatim:', data[0]);
            addDebugLog(`Nominatim вернул ${data.length} результатов`, 'info');
            addDebugLog(`Первый результат: type=${data[0].osm_type}, id=${data[0].osm_id}, display_name=${data[0].display_name}`, 'info');
            
            // Для городов проверяем все результаты и выбираем наиболее подходящий
            let selectedItem = data[0];
            if (country && country !== 'Россия') {
                // Ищем результат с place=city или place=town, или с координатами близкими к ожидаемым
                for (const item of data) {
                    const extratags = item.extratags || {};
                    const place = extratags.place || '';
                    if (place === 'city' || place === 'town') {
                        addDebugLog(`Найден результат с place=${place}: ${item.display_name}`, 'info');
                        selectedItem = item;
                        break;
                    }
                }
            }
            
            addDebugLog(`Используем результат: ${selectedItem.display_name}, OSM ID=${selectedItem.osm_id}`, 'info');
            
            // Если есть geojson напрямую
            if (selectedItem.geojson) {
                console.log('Найден GeoJSON в Nominatim');
                addDebugLog(`GeoJSON найден в Nominatim, тип: ${data[0].geojson.type}`, 'info');
                
                // Проверяем extratags для определения типа места
                const extratags = selectedItem.extratags || {};
                const place = extratags.place || selectedItem.type || '';
                addDebugLog(`Place type: ${place}, extratags: ${JSON.stringify(extratags)}`, 'info');
                
                // Если это Point, значит Nominatim вернул только точку, нужно искать границы через Overpass
                if (selectedItem.geojson.type === 'Point') {
                    addDebugLog('Nominatim вернул только точку (Point), ищем границы через Overpass', 'info');
                    const osmId = selectedItem.osm_id;
                    const osmType = selectedItem.osm_type;
                    
                    // Для node (Point) используем Overpass для поиска административных границ
                    if (osmType === 'node') {
                        addDebugLog('Ищем административные границы через Overpass для города', 'info');
                        const overpassResult = await getBoundaryByOverpassQuery(query, country, false); // false = это не страна
                        if (overpassResult) {
                            addDebugLog('Границы города найдены через Overpass', 'success');
                            return overpassResult;
                        }
                    }
                    
                    // Если Overpass не помог, пробуем получить через OSM ID
                    if (osmId && osmType) {
                        const boundary = await getBoundary(osmId, osmType);
                        if (boundary) {
                            console.log('Границы получены через OSM ID');
                            addDebugLog('Границы получены через OSM ID', 'success');
                            return boundary;
                        }
                    }
                    
                    // Если ничего не помогло, возвращаем null
                    addDebugLog('Не удалось найти границы для точки', 'warn');
                    return null;
                }
                
                // Если это Polygon или MultiPolygon, возвращаем его (даже если place=province, это может быть правильный результат для больших городов)
                if (selectedItem.geojson.type === 'MultiPolygon' || selectedItem.geojson.type === 'Polygon') {
                    if (selectedItem.geojson.type === 'MultiPolygon') {
                        const polygonCount = selectedItem.geojson.coordinates ? selectedItem.geojson.coordinates.length : 0;
                        addDebugLog(`MultiPolygon содержит ${polygonCount} полигонов`, 'info');
                        addDebugLog(`Проверка фильтрации: country="${country}", polygonCount=${polygonCount}`, 'info');
                        
                        // Для городов, если MultiPolygon содержит много полигонов, возможно это включает удаленные острова
                        // Фильтруем полигоны - оставляем только самый большой (основную часть города)
                        // Проверяем, что это не страна (country не пустой и не Россия) и есть несколько полигонов
                        const shouldFilter = country && country.trim() !== '' && country !== 'Россия' && polygonCount > 1;
                        addDebugLog(`Должна ли применяться фильтрация: ${shouldFilter}`, 'info');
                        
                        if (shouldFilter) {
                            const cityLat = parseFloat(selectedItem.lat);
                            const cityLon = parseFloat(selectedItem.lon);
                            
                            if (!isNaN(cityLat) && !isNaN(cityLon)) {
                                addDebugLog(`Фильтруем полигоны для города [${cityLat}, ${cityLon}]`, 'info');
                                const polygonInfo = [];
                                
                                // Собираем информацию о каждом полигоне
                                for (let i = 0; i < selectedItem.geojson.coordinates.length; i++) {
                                    const polygon = selectedItem.geojson.coordinates[i];
                                    // В MultiPolygon каждый элемент - это массив колец: [[[lon, lat], ...], ...]
                                    // polygon[0] - это внешнее кольцо
                                    if (polygon && Array.isArray(polygon) && polygon[0] && Array.isArray(polygon[0]) && polygon[0].length > 0) {
                                        // Находим границы и центр полигона
                                        let minLat = Infinity, maxLat = -Infinity;
                                        let minLon = Infinity, maxLon = -Infinity;
                                        
                                        for (const coord of polygon[0]) {
                                            // В GeoJSON координаты идут как [lon, lat]
                                            const lon = coord[0] > 180 ? coord[0] - 360 : coord[0];
                                            const lat = coord[1];
                                            if (lat < minLat) minLat = lat;
                                            if (lat > maxLat) maxLat = lat;
                                            if (lon < minLon) minLon = lon;
                                            if (lon > maxLon) maxLon = lon;
                                        }
                                        
                                        const centerLat = (minLat + maxLat) / 2;
                                        const centerLon = (minLon + maxLon) / 2;
                                        const latSize = maxLat - minLat;
                                        const lonSize = maxLon - minLon;
                                        const area = latSize * lonSize; // Примерная площадь
                                        
                                        // Вычисляем расстояние от центра города до центра полигона
                                        const latDiff = Math.abs(centerLat - cityLat);
                                        const lonDiff = Math.abs(centerLon - cityLon);
                                        const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
                                        
                                        polygonInfo.push({
                                            index: i,
                                            polygon: polygon,
                                            centerLat: centerLat,
                                            centerLon: centerLon,
                                            area: area,
                                            distance: distance
                                        });
                                        
                                        addDebugLog(`Полигон ${i}: центр [${centerLat.toFixed(2)}, ${centerLon.toFixed(2)}], размер [${latSize.toFixed(2)}, ${lonSize.toFixed(2)}], площадь ${area.toFixed(4)}, расстояние ${distance.toFixed(2)}°`, 'info');
                                    }
                                }
                                
                                // Для городов с MultiPolygon, содержащим много полигонов (например, Токио с островами),
                                // сохраняем информацию о центре города для фильтрации при отображении
                                // Пока возвращаем оригинальный MultiPolygon, фильтрация будет в displayBoundary
                                addDebugLog('MultiPolygon содержит несколько полигонов, фильтрация будет применена при отображении', 'info');
                                return selectedItem.geojson;
                                
                                // Исключаем все остальные полигоны
                                for (let i = 1; i < polygonInfo.length; i++) {
                                    const info = polygonInfo[i];
                                    addDebugLog(`Полигон ${info.index} исключен: расстояние ${info.distance.toFixed(2)}°, площадь ${info.area.toFixed(4)}`, 'warn');
                                }
                                
                                addDebugLog(`После фильтрации остался 1 из ${polygonCount} полигонов (основная часть города)`, 'info');
                                
                                // Создаем новый Polygon (не MultiPolygon) с основным полигоном
                                // В MultiPolygon координаты идут как [[[lon, lat], ...]], в Polygon как [[lon, lat], ...]
                                // mainPolygon.polygon уже в правильном формате для Polygon (это polygon из MultiPolygon, который является массивом колец)
                                let polygonCoords = mainPolygon.polygon;
                                
                                // Проверяем формат
                                if (!Array.isArray(polygonCoords)) {
                                    addDebugLog('ОШИБКА: polygonCoords не массив!', 'error');
                                    // Возвращаем оригинальный MultiPolygon, но только с одним полигоном
                                    return {
                                        type: 'MultiPolygon',
                                        coordinates: [mainPolygon.polygon]
                                    };
                                }
                                
                                if (!Array.isArray(polygonCoords[0])) {
                                    addDebugLog('ОШИБКА: polygonCoords[0] не массив!', 'error');
                                    // Возвращаем оригинальный MultiPolygon, но только с одним полигоном
                                    return {
                                        type: 'MultiPolygon',
                                        coordinates: [mainPolygon.polygon]
                                    };
                                }
                                
                                addDebugLog(`Формат координат проверен: OK, точек в первом кольце: ${polygonCoords[0] ? polygonCoords[0].length : 0}`, 'info');
                                
                                const filteredGeoJson = {
                                    type: 'Polygon',
                                    coordinates: polygonCoords
                                };
                                addDebugLog(`Создан Polygon, возвращаем его`, 'success');
                                return filteredGeoJson;
                            }
                        }
                    }
                    // Для городов проверяем, что это не слишком большая административная единица
                    // Если place=province, но это может быть правильный результат для больших городов типа Токио
                    if (place === 'province' && country) {
                        addDebugLog(`Найден результат с place=province, но это может быть правильный результат для большого города`, 'info');
                        // Проверяем, что это не слишком далеко от ожидаемых координат (для Токио это нормально)
                    }
                    addDebugLog(`Возвращаем GeoJSON от Nominatim: ${selectedItem.geojson.type}`, 'success');
                    const result = selectedItem.geojson;
                    // Сохраняем в кэш, если это страна
                    if (isCountry) {
                        saveBoundaryToCache(query, result, true);
                    }
                    return result;
                }
            }
            
            // Пробуем получить через OSM ID
            const osmId = selectedItem.osm_id;
            const osmType = selectedItem.osm_type;
            
            console.log('OSM ID:', osmId, 'OSM Type:', osmType);
            addDebugLog(`OSM ID: ${osmId}, OSM Type: ${osmType}`, 'info');
            
            // Если это node (Point), используем Overpass для поиска административных границ
            if (osmType === 'node') {
                addDebugLog('OSM Type = node, ищем административные границы через Overpass', 'info');
                const overpassResult = await getBoundaryByOverpassQuery(query, country, false); // false = это не страна
                if (overpassResult) {
                    addDebugLog('Границы найдены через Overpass для node', 'success');
                    return overpassResult;
                }
            }
            
            if (osmId && osmType) {
                // Для России (OSM ID 60199) используем Overpass напрямую для получения полных данных
                if (osmId === 60199 || (query === 'Россия' && osmType === 'relation')) {
                    addDebugLog('Для России используем Overpass для получения полных границ', 'info');
                    const overpassResult = await getBoundaryByOverpassQuery('Россия', null, true);
                    if (overpassResult) {
                        addDebugLog('Границы России получены через Overpass', 'success');
                        return overpassResult;
                    }
                }
                
                const boundary = await getBoundary(osmId, osmType);
                if (boundary) {
                    console.log('Границы получены через OSM ID');
                    addDebugLog('Границы получены через OSM ID', 'success');
                    // Сохраняем в кэш, если это страна
                    if (isCountry) {
                        saveBoundaryToCache(query, boundary, true);
                    }
                    return boundary;
                }
            }
            
            // Если это relation, пробуем получить через Overpass напрямую по имени
            if (osmType === 'relation') {
                console.log('Пробуем получить через Overpass по имени');
                addDebugLog('Пробуем получить через Overpass по имени', 'info');
                const overpassResult = await getBoundaryByOverpassQuery(query, country, false); // false = это не страна (может быть город или регион)
                if (overpassResult) {
                    return overpassResult;
                }
            }
            
            // Если ничего не помогло, пробуем напрямую через Overpass с разными вариантами названий
            console.log('Пробуем альтернативные варианты поиска через Overpass');
            addDebugLog('Пробуем альтернативные варианты поиска через Overpass', 'info');
            const alternativeNames = getAlternativeCountryNames(query);
            for (const altName of alternativeNames) {
                const result = await getBoundaryByOverpassQuery(altName, null, true);
                if (result) {
                    console.log('Границы найдены по альтернативному названию:', altName);
                    addDebugLog(`Границы найдены по альтернативному названию: ${altName}`, 'success');
                    return result;
                }
            }
        }
        
        console.warn('Границы не найдены через Nominatim');
        return null;
    } catch (error) {
        console.error('Ошибка получения границ:', error);
        // Не пробрасываем ошибку дальше, просто возвращаем null
        return null;
    }
}

// Функция для получения границ через Overpass по запросу
async function getBoundaryByOverpassQuery(query, country = 'Россия', isCountry = false) {
    // Сначала проверяем кэш для стран
    if (isCountry) {
        const cachedBoundary = getBoundaryFromCache(query, true);
        if (cachedBoundary) {
            return cachedBoundary;
        }
    }
    
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    
    try {
        // Для стран используем admin_level=2, для регионов/городов - 4-8
        const adminLevel = isCountry ? '2' : '^[4-8]$';
        const adminLevelPattern = isCountry ? '"admin_level"="2"' : '"admin_level"~"^[4-8]$"';
        
        // Пробуем найти административную единицу по имени
        // Для городов приоритет - поиск по place=city, place=town
        let simpleQuery = '';
        
        if (!isCountry) {
            // Для городов сначала ищем по place тегам (это более точно для городов)
            simpleQuery = `
            [out:json][timeout:25];
            (
              relation["name"="${query}"]["place"~"^(city|town)$"]["boundary"="administrative"];
              relation["name:ru"="${query}"]["place"~"^(city|town)$"]["boundary"="administrative"];
              relation["name:en"="${query}"]["place"~"^(city|town)$"]["boundary"="administrative"];
              relation["name:ja"="${query}"]["place"~"^(city|town)$"]["boundary"="administrative"];
              relation["name"="${query}"]["boundary"="administrative"][${adminLevelPattern}];
              relation["name:ru"="${query}"]["boundary"="administrative"][${adminLevelPattern}];
              relation["name:en"="${query}"]["boundary"="administrative"][${adminLevelPattern}];
              relation["name:ja"="${query}"]["boundary"="administrative"][${adminLevelPattern}];
              relation["alt_name"="${query}"]["boundary"="administrative"][${adminLevelPattern}];
        `;
        } else {
            // Для стран ищем только по boundary
            simpleQuery = `
            [out:json][timeout:25];
            (
              relation["name"="${query}"]["boundary"="administrative"][${adminLevelPattern}];
              relation["name:ru"="${query}"]["boundary"="administrative"][${adminLevelPattern}];
              relation["alt_name"="${query}"]["boundary"="administrative"][${adminLevelPattern}];
              relation["name:en"="${query}"]["boundary"="administrative"][${adminLevelPattern}];
        `;
        }
        
        // Добавляем поиск по названию на языке страны, если указана страна
        if (country && !isCountry) {
            // Для разных стран используем соответствующие языковые теги
            if (country === 'Швеция' || country === 'Sweden') {
                simpleQuery += `
              relation["name:sv"="${query}"]["place"~"^(city|town)$"]["boundary"="administrative"];
              relation["name:sv"="${query}"]["boundary"="administrative"][${adminLevelPattern}];
            `;
            } else if (country === 'Япония' || country === 'Japan') {
                simpleQuery += `
              relation["name:ja"="${query}"]["place"~"^(city|town)$"]["boundary"="administrative"];
              relation["name:ja"="${query}"]["boundary"="administrative"][${adminLevelPattern}];
            `;
            }
        }
        
        simpleQuery += `
            );
            (._;>;);
            out geom;
        `;
        
        console.log('Overpass запрос для:', query, 'isCountry:', isCountry);
        
        const response = await fetch(overpassUrl, {
            method: 'POST',
            body: simpleQuery,
            headers: {
                'Content-Type': 'text/plain'
            }
        });
        
        if (!response.ok) {
            console.error('Overpass API вернул ошибку:', response.status);
            return null;
        }
        
        const data = await response.json();
        
        console.log('Overpass ответ:', data);
        
        if (data.elements && data.elements.length > 0) {
            console.log('Найдено элементов:', data.elements.length);
            
            // Если это не страна, приоритет - relation с place=city или place=town
            let relation = null;
            if (!isCountry) {
                // Сначала ищем city
                relation = data.elements.find(el => 
                    el.type === 'relation' && 
                    el.tags && 
                    (el.tags.place === 'city' || el.tags.place === 'town')
                );
                // Если не нашли city, ищем town
                if (!relation) {
                    relation = data.elements.find(el => 
                        el.type === 'relation' && 
                        el.tags && 
                        el.tags.place === 'town'
                    );
                }
            }
            
            // Если не нашли по place, ищем любую relation
            if (!relation) {
                relation = data.elements.find(el => el.type === 'relation');
            }
            
            if (relation && relation.members) {
                // Собираем все outer ways
                const outerWays = relation.members.filter(m => 
                    (m.role === 'outer' || m.role === '') && m.geometry
                );
                
                if (outerWays.length > 0) {
                    const coordinates = [];
                    for (const member of outerWays) {
                        if (member.geometry && member.geometry.length > 0) {
                            // Фильтруем и нормализуем координаты (для восточных частей)
                            const validCoords = member.geometry
                                .map(coord => {
                                    let lat = coord.lat;
                                    let lon = coord.lon;
                                    // Нормализуем долготу: если > 180, преобразуем в отрицательные
                                    if (lon > 180) {
                                        lon = lon - 360;
                                    }
                                    return [lat, lon];
                                })
                                .filter(coord => {
                                    const lat = coord[0];
                                    const lon = coord[1];
                                    return !isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon) &&
                                           lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
                                });
                            if (validCoords.length > 0) {
                                coordinates.push(validCoords);
                            }
                        }
                    }
                    if (coordinates.length > 0) {
                        console.log('Границы получены из Overpass, полигонов:', coordinates.length);
                        // Сохраняем в кэш, если это страна
                        if (isCountry) {
                            saveBoundaryToCache(query, coordinates, true);
                        }
                        return coordinates;
                    }
                }
            }
            
            // Если не нашли relation, пробуем собрать из ways
            const ways = data.elements.filter(el => el.type === 'way' && el.geometry);
            if (ways.length > 0) {
                const coordinates = [];
                ways.forEach(way => {
                    if (way.geometry && way.geometry.length > 0) {
                        // Фильтруем и нормализуем координаты (для восточных частей)
                        const validCoords = way.geometry
                            .map(coord => {
                                let lat = coord.lat;
                                let lon = coord.lon;
                                // Нормализуем долготу: если > 180, преобразуем в отрицательные
                                if (lon > 180) {
                                    lon = lon - 360;
                                }
                                return [lat, lon];
                            })
                            .filter(coord => {
                                const lat = coord[0];
                                const lon = coord[1];
                                return !isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon) &&
                                       lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
                            });
                        // Проверяем, что это действительно полигон (минимум 3 точки)
                        if (validCoords.length >= 3) {
                            coordinates.push(validCoords);
                        } else {
                            addDebugLog(`Пропущен way с недостаточным количеством точек: ${validCoords.length}`, 'warn');
                        }
                    }
                });
                if (coordinates.length > 0) {
                    // Сохраняем в кэш, если это страна
                    if (isCountry) {
                        saveBoundaryToCache(query, coordinates, true);
                    }
                    return coordinates;
                }
                return null;
            }
            
            // Если не нашли relation или ways, но есть nodes - это не границы, пропускаем
            const nodes = data.elements.filter(el => el.type === 'node');
            if (nodes.length > 0 && !relation) {
                addDebugLog(`Найдены только nodes (${nodes.length}), но не границы. Пропускаем.`, 'warn');
            }
        }
        
        return null;
    } catch (error) {
        console.error('Ошибка Overpass запроса:', error);
        return null;
    }
}

// Функция для поиска границ города через Overpass с использованием координат
async function getBoundaryByOverpassWithCoords(lat, lon, cityName, country = 'Россия') {
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    
    try {
        // Ищем административные границы в радиусе 0.1 градуса от координат города
        // Приоритет - place=city, затем place=town
        const query = `
            [out:json][timeout:25];
            (
              relation(around:5000,${lat},${lon})["place"~"^(city|town)$"]["boundary"="administrative"];
              relation(around:10000,${lat},${lon})["name"="${cityName}"]["boundary"="administrative"]["admin_level"~"^[4-8]$"];
              relation(around:10000,${lat},${lon})["name:en"="${cityName}"]["boundary"="administrative"]["admin_level"~"^[4-8]$"];
              relation(around:10000,${lat},${lon})["name:ru"="${cityName}"]["boundary"="administrative"]["admin_level"~"^[4-8]$"];
            );
            (._;>;);
            out geom;
        `;
        
        addDebugLog(`Overpass запрос для города ${cityName} по координатам [${lat}, ${lon}]`, 'info');
        
        const response = await fetch(overpassUrl, {
            method: 'POST',
            body: query,
            headers: {
                'Content-Type': 'text/plain'
            }
        });
        
        if (!response.ok) {
            console.error('Overpass API вернул ошибку:', response.status);
            return null;
        }
        
        const data = await response.json();
        
        if (data.elements && data.elements.length > 0) {
            addDebugLog(`Найдено ${data.elements.length} элементов в радиусе от координат`, 'info');
            
            // Приоритет - relation с place=city или place=town
            let relation = data.elements.find(el => 
                el.type === 'relation' && 
                el.tags && 
                (el.tags.place === 'city' || el.tags.place === 'town')
            );
            
            // Если не нашли по place, ищем любую relation
            if (!relation) {
                relation = data.elements.find(el => el.type === 'relation');
            }
            
            if (relation && relation.members) {
                const outerWays = relation.members.filter(m => 
                    (m.role === 'outer' || m.role === '') && m.geometry
                );
                
                if (outerWays.length > 0) {
                    const coordinates = [];
                    for (const member of outerWays) {
                        if (member.geometry && member.geometry.length > 0) {
                            const validCoords = member.geometry
                                .map(coord => {
                                    let lat = coord.lat;
                                    let lon = coord.lon;
                                    if (lon > 180) {
                                        lon = lon - 360;
                                    }
                                    return [lat, lon];
                                })
                                .filter(coord => {
                                    const lat = coord[0];
                                    const lon = coord[1];
                                    return !isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon) &&
                                           lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
                                });
                            if (validCoords.length >= 3) {
                                coordinates.push(validCoords);
                            }
                        }
                    }
                    if (coordinates.length > 0) {
                        addDebugLog(`Границы города найдены через Overpass по координатам, полигонов: ${coordinates.length}`, 'success');
                        return coordinates;
                    }
                }
            }
        }
        
        return null;
    } catch (error) {
        console.error('Ошибка Overpass запроса по координатам:', error);
        return null;
    }
}

// Переменная для хранения текущих слоев границ
let boundaryLayers = [];

// Переменная для хранения слоев RDA
let rdaLayers = [];

// Переменная для хранения слоев QTH
let qthLayers = [];

// Переменная для хранения маркеров местоположений
let locationMarkers = [];

// Переменная для хранения данных о текущей подписи (для пересчета при изменении масштаба)
let currentLabelData = null; // { boundary, centerLat, centerLon, text, color, marker }

// Переменная для хранения значения отступа подписи (null = автоматический расчет)
let manualLabelOffset = null; // значение в градусах или null для авто

// Таблица отступов в зависимости от масштаба (zoom -> offset в градусах)
const zoomOffsetTable = {
    4.0: 2.300,
    5.0: 1.0600,
    6.0: 0.6,
    7.0: 0.2,
    8.0: 0.140,
    9.0: 0.088,
    10.0: 0.035,
    11.0: 0.018
};

// Функция для получения отступа из таблицы на основе текущего масштаба
function getOffsetFromTable(zoom) {
    if (!zoom || isNaN(zoom) || !isFinite(zoom)) {
        addDebugLog(`Некорректный zoom для getOffsetFromTable: ${zoom}`, 'error');
        return 0.2;
    }
    
    // Ищем ближайшие значения в таблице для интерполяции
    const zoomKeys = Object.keys(zoomOffsetTable).map(Number).sort((a, b) => a - b);
    
    // Если zoom меньше минимального, используем максимальный отступ
    if (zoom <= zoomKeys[0]) {
        return zoomOffsetTable[zoomKeys[0]];
    }
    
    // Если zoom больше максимального, используем минимальный отступ
    if (zoom >= zoomKeys[zoomKeys.length - 1]) {
        return zoomOffsetTable[zoomKeys[zoomKeys.length - 1]];
    }
    
    // Находим два ближайших значения для интерполяции
    for (let i = 0; i < zoomKeys.length - 1; i++) {
        const zoom1 = zoomKeys[i];
        const zoom2 = zoomKeys[i + 1];
        
        if (zoom >= zoom1 && zoom <= zoom2) {
            // Линейная интерполяция
            const offset1 = zoomOffsetTable[zoom1];
            const offset2 = zoomOffsetTable[zoom2];
            const ratio = (zoom - zoom1) / (zoom2 - zoom1);
            const interpolatedOffset = offset1 + (offset2 - offset1) * ratio;
            return interpolatedOffset;
        }
    }
    
    // Fallback (не должно произойти)
    addDebugLog(`Не удалось найти отступ для zoom=${zoom}`, 'error');
    return 0.2;
}

// Функция для отображения маркера местоположения
function displayLocationMarker(lat, lon, name, type = 'city', showLabel = true) {
    // Очищаем предыдущие маркеры
    locationMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
    locationMarkers = [];
    // Очищаем данные подписи
    currentLabelData = null;
    // Скрываем панель управления
    const panel = document.getElementById('label-control-panel');
    if (panel) {
        panel.classList.remove('visible');
    }
    
    // Определяем цвет и иконку в зависимости от типа
    let color = '#ff6b6b'; // красный для города
    let iconText = 'Город';
    if (type === 'region') {
        color = '#51cf66'; // зеленый для региона
        iconText = 'Регион';
    }
    
    // Создаем маркер
    const marker = L.marker([lat, lon], {
        icon: L.divIcon({
            className: 'location-marker',
            html: showLabel ? `<div style="background: ${color}; color: white; padding: 6px 10px; border-radius: 5px; font-size: 13px; font-weight: bold; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.4); border: 2px solid white; text-align: center; display: inline-block;">${name}</div>` : '',
            iconSize: showLabel ? [150, 35] : [0, 0],
            iconAnchor: showLabel ? [75, 17.5] : [0, 0],
            popupAnchor: [0, -17.5]
        })
    });
    
    marker.bindPopup(`
        <div style="font-weight: bold; margin-bottom: 5px; font-size: 14px;">${iconText}: ${name}</div>
        <div style="margin-top: 5px;">Координаты: ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E</div>
        <div style="margin-top: 5px; color: #666; font-size: 12px;">${showLabel ? 'Границы не найдены, показана точка местоположения' : 'Показана точка местоположения'}</div>
    `);
    
    marker.addTo(map);
    locationMarkers.push(marker);
    
    // Масштабируем карту на маркер только если showLabel=true и это не режим показа внутри страны
    // Если showLabel=false, значит показываем внутри страны и не меняем масштаб
    if (showLabel) {
        setTimeout(() => {
            map.setView([lat, lon], 12); // zoom 12 для города
            addDebugLog(`Маркер ${type} "${name}" отображен на карте`, 'info');
        }, 100);
    } else {
        // Если показываем внутри страны, не меняем масштаб
        addDebugLog(`Маркер ${type} "${name}" отображен на карте (без изменения масштаба)`, 'info');
    }
}

// Функция для вычисления максимальной верхней точки границ области
function getMaxLatitude(boundary) {
    let maxLat = -Infinity;
    
    // Находим максимальную широту (северную границу)
    if (boundary && boundary.type === 'Polygon' && boundary.coordinates && boundary.coordinates[0]) {
        const coords = boundary.coordinates[0];
        coords.forEach(coord => {
            const lat = coord[1]; // GeoJSON: [lon, lat]
            if (lat > maxLat) maxLat = lat;
        });
    } else if (boundary && boundary.type === 'MultiPolygon' && boundary.coordinates && boundary.coordinates.length > 0) {
        // Берем первый (основной) полигон
        const firstPolygon = boundary.coordinates[0];
        if (firstPolygon && firstPolygon[0]) {
            const coords = firstPolygon[0];
            coords.forEach(coord => {
                const lat = coord[1]; // GeoJSON: [lon, lat]
                if (lat > maxLat) maxLat = lat;
            });
        }
    } else if (Array.isArray(boundary) && boundary.length > 0) {
        // Массив координат (уже в формате Leaflet [lat, lon])
        const firstPolygon = boundary[0];
        if (firstPolygon && firstPolygon.length > 0) {
            firstPolygon.forEach(coord => {
                if (Array.isArray(coord) && coord.length >= 2) {
                    const lat = coord[0]; // Leaflet: [lat, lon]
                    if (lat > maxLat) maxLat = lat;
                }
            });
        }
    } else if (boundary && boundary.type === 'Point') {
        // Если это точка, используем её координаты
        if (boundary.coordinates && boundary.coordinates.length >= 2) {
            maxLat = boundary.coordinates[1]; // GeoJSON: [lon, lat]
        }
    }
    
    return maxLat;
}

// Функция для вычисления центральной долготы границ области
function getCenterLongitude(boundary, centerLon) {
    let maxLon = -Infinity;
    let minLon = Infinity;
    
    // Находим границы по долготе
    if (boundary && boundary.type === 'Polygon' && boundary.coordinates && boundary.coordinates[0]) {
        const coords = boundary.coordinates[0];
        coords.forEach(coord => {
            const lon = coord[0] > 180 ? coord[0] - 360 : coord[0]; // GeoJSON: [lon, lat]
            if (lon > maxLon) maxLon = lon;
            if (lon < minLon) minLon = lon;
        });
    } else if (boundary && boundary.type === 'MultiPolygon' && boundary.coordinates && boundary.coordinates.length > 0) {
        const firstPolygon = boundary.coordinates[0];
        if (firstPolygon && firstPolygon[0]) {
            const coords = firstPolygon[0];
            coords.forEach(coord => {
                const lon = coord[0] > 180 ? coord[0] - 360 : coord[0]; // GeoJSON: [lon, lat]
                if (lon > maxLon) maxLon = lon;
                if (lon < minLon) minLon = lon;
            });
        }
    } else if (Array.isArray(boundary) && boundary.length > 0) {
        const firstPolygon = boundary[0];
        if (firstPolygon && firstPolygon.length > 0) {
            firstPolygon.forEach(coord => {
                if (Array.isArray(coord) && coord.length >= 2) {
                    const lon = coord[1] > 180 ? coord[1] - 360 : coord[1]; // Leaflet: [lat, lon]
                    if (lon > maxLon) maxLon = lon;
                    if (lon < minLon) minLon = lon;
                }
            });
        }
    } else if (boundary && boundary.type === 'Point') {
        // Если это точка, используем её координаты
        if (boundary.coordinates && boundary.coordinates.length >= 2) {
            const lon = boundary.coordinates[0] > 180 ? boundary.coordinates[0] - 360 : boundary.coordinates[0]; // GeoJSON: [lon, lat]
            return lon;
        }
    }
    
    // Если не удалось найти границы, используем центр
    if (maxLon === -Infinity) {
        return centerLon;
    }
    
    return (minLon + maxLon) / 2;
}

// Функция для вычисления безопасной позиции подписи вне границ области с учетом масштаба
function calculateLabelPosition(boundary, centerLat, centerLon) {
    // Находим максимальную верхнюю точку (северную границу)
    const maxLat = getMaxLatitude(boundary);
    
    // Если не удалось найти границы, используем центр
    if (maxLat === -Infinity) {
        const offset = manualLabelOffset !== null ? manualLabelOffset : 0.2;
        return { lat: centerLat + offset, lon: centerLon };
    }
    
    // Находим центральную долготу
    const labelLon = getCenterLongitude(boundary, centerLon);
    
    // Если задан ручной отступ, используем его
    if (manualLabelOffset !== null) {
        const labelLat = maxLat + manualLabelOffset;
        addDebugLog(`Позиция подписи (ручной отступ): maxLat=${maxLat.toFixed(4)}, offset=${manualLabelOffset.toFixed(4)}°, итоговая lat=${labelLat.toFixed(4)}`, 'info');
        return { lat: labelLat, lon: labelLon };
    }
    
    // Автоматический расчет отступа на основе таблицы
    const currentZoom = map.getZoom();
    const finalOffset = getOffsetFromTable(currentZoom);
    
    // Размещаем подпись выше северной границы с рассчитанным отступом
    const labelLat = maxLat + finalOffset;
    
    addDebugLog(`Позиция подписи (авто): maxLat=${maxLat.toFixed(4)}, zoom=${currentZoom}, offset=${finalOffset.toFixed(4)}°, итоговая lat=${labelLat.toFixed(4)}`, 'info');
    
    return { lat: labelLat, lon: labelLon };
}

// Функция для обновления позиции подписи при изменении масштаба
function updateLabelPosition() {
    if (!currentLabelData || !currentLabelData.marker) {
        // Скрываем панель, если подписи нет
        const panel = document.getElementById('label-control-panel');
        if (panel) {
            panel.classList.remove('visible');
        }
        return;
    }
    
    try {
        const { boundary, centerLat, centerLon } = currentLabelData;
        const newPos = calculateLabelPosition(boundary, centerLat, centerLon);
        
        if (!newPos || isNaN(newPos.lat) || isNaN(newPos.lon)) {
            addDebugLog(`Ошибка: некорректная позиция при обновлении: ${JSON.stringify(newPos)}`, 'error');
            return;
        }
        
        // Обновляем позицию маркера
        currentLabelData.marker.setLatLng([newPos.lat, newPos.lon]);
        
        // Обновляем отображение панели (но не переинициализируем обработчики, чтобы избежать дублирования)
        const panel = document.getElementById('label-control-panel');
        const offsetValue = document.getElementById('offset-value');
        if (panel && currentLabelData && labelControlPanelVisible) {
            updateZoomDisplay();
            // Обновляем только значение отступа в UI, не переинициализируя обработчики
            if (offsetValue) {
                if (manualLabelOffset !== null) {
                    offsetValue.textContent = manualLabelOffset.toFixed(4) + '°';
                } else {
                    offsetValue.textContent = 'Авто';
                }
            }
        }
        
        addDebugLog(`Позиция подписи обновлена: [${newPos.lat.toFixed(4)}, ${newPos.lon.toFixed(4)}]`, 'info');
    } catch (error) {
        addDebugLog(`Ошибка при обновлении позиции подписи: ${error.message}`, 'error');
        console.error('Ошибка при обновлении позиции подписи:', error);
    }
}

// Функция для добавления текстовой метки на карту с автоматическим пересчетом при изменении масштаба
function addTextLabel(boundary, centerLat, centerLon, text, color = '#ff6b6b') {
    try {
        // Вычисляем начальную позицию
        const initialPos = calculateLabelPosition(boundary, centerLat, centerLon);
        
        if (!initialPos || isNaN(initialPos.lat) || isNaN(initialPos.lon)) {
            addDebugLog(`Ошибка: некорректная позиция для подписи: ${JSON.stringify(initialPos)}`, 'error');
            return null;
        }
        
        const label = L.marker([initialPos.lat, initialPos.lon], {
            icon: L.divIcon({
                className: 'text-label',
                html: `<div style="background: ${color}; color: white; padding: 8px 12px; border-radius: 5px; font-size: 14px; font-weight: bold; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.5); border: 2px solid white; text-align: center; display: inline-block;">${text}</div>`,
                iconSize: [200, 40],
                iconAnchor: [100, 20],
                popupAnchor: [0, -20]
            })
        });
        
        label.addTo(map);
        locationMarkers.push(label);
        
        // Сохраняем данные для пересчета при изменении масштаба
        currentLabelData = {
            boundary: boundary,
            centerLat: centerLat,
            centerLon: centerLon,
            text: text,
            color: color,
            marker: label
        };
        
        addDebugLog(`Подпись "${text}" добавлена на позицию [${initialPos.lat.toFixed(4)}, ${initialPos.lon.toFixed(4)}]`, 'success');
        
        // Инициализируем панель управления отступом (но не показываем автоматически)
        initLabelControlPanel();
        
        return label;
    } catch (error) {
        addDebugLog(`Ошибка при добавлении подписи: ${error.message}`, 'error');
        console.error('Ошибка при добавлении подписи:', error);
        return null;
    }
}

// Функция для отображения QTH квадрата на карте
function displayQTH(qth, centerLat, centerLon) {
    // Очищаем предыдущие слои QTH
    qthLayers.forEach(layer => {
        map.removeLayer(layer);
    });
    qthLayers = [];
    
    // Определяем размер квадрата в зависимости от точности QTH
    // QTH квадраты имеют соотношение сторон 2:1 (долгота:широта)
    let latSize = 0; // размер по широте (север-юг)
    let lonSize = 0; // размер по долготе (восток-запад)
    
    if (qth.length >= 10) {
        // Супер-расширенный: 3 секунды долготы x 1.5 секунды широты
        latSize = 1.5 / 3600; // 1.5 секунды = 0.000417 градуса
        lonSize = 3 / 3600;   // 3 секунды = 0.000833 градуса
    } else if (qth.length >= 8) {
        // Расширенный: 30 секунд долготы x 15 секунд широты
        latSize = 15 / 3600; // 15 секунд = 0.00417 градуса
        lonSize = 30 / 3600; // 30 секунд = 0.00833 градуса
    } else if (qth.length >= 6) {
        // Подквадрат: 5 минут долготы x 2.5 минуты широты
        latSize = 2.5 / 60; // 2.5 минуты = 0.0417 градуса
        lonSize = 5 / 60;   // 5 минут = 0.0833 градуса
    } else if (qth.length >= 4) {
        // Квадрат: 2° долготы x 1° широты
        latSize = 0.5; // половина градуса
        lonSize = 1.0; // один градус
    } else {
        // Поле: 20° долготы x 10° широты
        latSize = 5;  // 5 градусов
        lonSize = 10; // 10 градусов
    }
    
    // Вычисляем границы квадрата (центр минус/плюс половина размера)
    const swLat = centerLat - latSize;
    const swLon = centerLon - lonSize;
    const neLat = centerLat + latSize;
    const neLon = centerLon + lonSize;
    
    addDebugLog(`QTH ${qth}: центр [${centerLat.toFixed(4)}, ${centerLon.toFixed(4)}], размер [${latSize.toFixed(4)}, ${lonSize.toFixed(4)}]`, 'info');
    addDebugLog(`QTH ${qth}: границы SW=[${swLat.toFixed(4)}, ${swLon.toFixed(4)}], NE=[${neLat.toFixed(4)}, ${neLon.toFixed(4)}]`, 'info');
    
    // Создаем прямоугольник для QTH квадрата
    const bounds = L.latLngBounds(
        [swLat, swLon], // SW
        [neLat, neLon]  // NE
    );
    
    const qthRectangle = L.rectangle(bounds, {
        color: '#ff0000',
        fillColor: '#ff0000',
        fillOpacity: 0.15,
        weight: 3,
        dashArray: '10, 5'
    });
    
    qthRectangle.addTo(map);
    qthLayers.push(qthRectangle);
    
    // Добавляем маркер в центре с информацией
    // Создаем текст для маркера
    const markerText = `QTH: ${qth}`;
    // Вычисляем примерную ширину текста для правильного позиционирования
    const textWidth = markerText.length * 7 + 16; // примерная ширина
    const textHeight = 28; // примерная высота
    
    const marker = L.marker([centerLat, centerLon], {
        icon: L.divIcon({
            className: 'qth-marker',
            html: `<div style="background: #ff0000; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.3); border: 2px solid white; text-align: center; display: inline-block; pointer-events: none;">${markerText}</div>`,
            iconSize: [textWidth, textHeight],
            iconAnchor: [textWidth / 2, textHeight / 2], // Центрируем маркер
            popupAnchor: [0, -textHeight / 2]
        })
    });
    
    marker.bindPopup(`
        <div style="font-weight: bold; margin-bottom: 5px; font-size: 14px;">QTH: ${qth}</div>
        <div style="margin-top: 5px;">Координаты: ${centerLat.toFixed(4)}°N, ${centerLon.toFixed(4)}°E</div>
    `);
    
    marker.addTo(map);
    qthLayers.push(marker);
    
    addDebugLog(`QTH квадрат ${qth} отображен на карте`, 'success');
}

// Функция для конвертации координат в QTH локатор (Maidenhead Locator System)
function latLonToQTH(lat, lon, precision = 4) {
    // Нормализуем координаты
    lon = lon + 180;
    lat = lat + 90;
    
    // Первый уровень (поле) - 20° x 10°
    const fieldLon = Math.floor(lon / 20);
    const fieldLat = Math.floor(lat / 10);
    let qth = String.fromCharCode(65 + fieldLon) + String.fromCharCode(65 + fieldLat);
    
    if (precision >= 2) {
        // Второй уровень (квадрат) - 2° x 1°
        const squareLon = Math.floor((lon % 20) / 2);
        const squareLat = Math.floor(lat % 10);
        qth += squareLon.toString() + squareLat.toString();
    }
    
    if (precision >= 4) {
        // Третий уровень (подквадрат) - 5' x 2.5'
        const subSquareLon = Math.floor(((lon % 20) % 2) * 12);
        const subSquareLat = Math.floor((lat % 10) * 24);
        qth += String.fromCharCode(97 + subSquareLon) + String.fromCharCode(97 + subSquareLat);
    }
    
    if (precision >= 6) {
        // Четвертый уровень (расширенный) - 30" x 15"
        const extendedLon = Math.floor((((lon % 20) % 2) * 12) % 1 * 10);
        const extendedLat = Math.floor(((lat % 10) * 24) % 1 * 10);
        qth += extendedLon.toString() + extendedLat.toString();
    }
    
    if (precision >= 8) {
        // Пятый уровень (супер-расширенный) - 3" x 1.5"
        const superExtendedLon = Math.floor((((((lon % 20) % 2) * 12) % 1 * 10) % 1) * 10);
        const superExtendedLat = Math.floor(((((lat % 10) * 24) % 1 * 10) % 1) * 10);
        qth += String.fromCharCode(97 + superExtendedLon) + String.fromCharCode(97 + superExtendedLat);
    }
    
    return qth;
}

// Функция для конвертации QTH локатора в координаты (центр квадрата)
function qthToLatLon(qth) {
    if (!qth || qth.length < 2) return null;
    
    qth = qth.toUpperCase().trim();
    
    // Проверяем формат QTH (должен начинаться с двух букв)
    if (!/^[A-R]{2}/.test(qth)) {
        addDebugLog(`Неверный формат QTH: ${qth} (должен начинаться с двух букв A-R)`, 'error');
        return null;
    }
    
    // Первый уровень (поле) - 20° x 10°
    const fieldLon = qth.charCodeAt(0) - 65; // A=0, B=1, ..., R=17
    const fieldLat = qth.charCodeAt(1) - 65;
    
    let lon = fieldLon * 20 - 180;
    let lat = fieldLat * 10 - 90;
    
    if (qth.length >= 4) {
        // Второй уровень (квадрат) - 2° x 1°
        const squareLon = parseInt(qth[2]) || 0;
        const squareLat = parseInt(qth[3]) || 0;
        if (isNaN(squareLon) || isNaN(squareLat)) {
            addDebugLog(`Ошибка парсинга квадрата в QTH: ${qth}`, 'error');
            return null;
        }
        lon += squareLon * 2;
        lat += squareLat;
    }
    
    if (qth.length >= 6) {
        // Третий уровень (подквадрат) - 5 минут долготы x 2.5 минуты широты
        // Подквадрат может быть в верхнем или нижнем регистре (a-x или A-X)
        let subSquareLon = qth.charCodeAt(4);
        let subSquareLat = qth.charCodeAt(5);
        
        // Конвертируем в нижний регистр для расчета
        if (subSquareLon >= 65 && subSquareLon <= 88) { // A-X
            subSquareLon = subSquareLon - 65;
        } else if (subSquareLon >= 97 && subSquareLon <= 120) { // a-x
            subSquareLon = subSquareLon - 97;
        } else {
            addDebugLog(`Ошибка парсинга подквадрата долготы в QTH: ${qth}, символ: ${qth[4]}`, 'error');
            return null;
        }
        
        if (subSquareLat >= 65 && subSquareLat <= 88) { // A-X
            subSquareLat = subSquareLat - 65;
        } else if (subSquareLat >= 97 && subSquareLat <= 120) { // a-x
            subSquareLat = subSquareLat - 97;
        } else {
            addDebugLog(`Ошибка парсинга подквадрата широты в QTH: ${qth}, символ: ${qth[5]}`, 'error');
            return null;
        }
        
        if (subSquareLon < 0 || subSquareLon > 23 || subSquareLat < 0 || subSquareLat > 23) {
            addDebugLog(`Ошибка парсинга подквадрата в QTH: ${qth}`, 'error');
            return null;
        }
        
        // 5 минут = 5/60 = 0.0833 градуса долготы
        // 2.5 минуты = 2.5/60 = 0.0417 градуса широты
        lon += subSquareLon * (5 / 60); // 5 минут на подквадрат
        lat += subSquareLat * (2.5 / 60); // 2.5 минуты на подквадрат
    }
    
    if (qth.length >= 8) {
        // Четвертый уровень (расширенный) - 30 секунд долготы x 15 секунд широты
        const extendedLon = parseInt(qth[6]);
        const extendedLat = parseInt(qth[7]);
        if (isNaN(extendedLon) || isNaN(extendedLat) || extendedLon < 0 || extendedLon > 9 || extendedLat < 0 || extendedLat > 9) {
            addDebugLog(`Ошибка парсинга расширенного уровня в QTH: ${qth}`, 'error');
            return null;
        }
        // 30 секунд = 30/3600 = 0.00833 градуса долготы
        // 15 секунд = 15/3600 = 0.00417 градуса широты
        lon += extendedLon * (30 / 3600);
        lat += extendedLat * (15 / 3600);
    }
    
    if (qth.length >= 10) {
        // Пятый уровень (супер-расширенный) - 3 секунды долготы x 1.5 секунды широты
        let superExtendedLon = qth.charCodeAt(8);
        let superExtendedLat = qth.charCodeAt(9);
        
        // Конвертируем в нижний регистр для расчета
        if (superExtendedLon >= 65 && superExtendedLon <= 88) { // A-X
            superExtendedLon = superExtendedLon - 65;
        } else if (superExtendedLon >= 97 && superExtendedLon <= 120) { // a-x
            superExtendedLon = superExtendedLon - 97;
        } else {
            addDebugLog(`Ошибка парсинга супер-расширенного уровня долготы в QTH: ${qth}, символ: ${qth[8]}`, 'error');
            return null;
        }
        
        if (superExtendedLat >= 65 && superExtendedLat <= 88) { // A-X
            superExtendedLat = superExtendedLat - 65;
        } else if (superExtendedLat >= 97 && superExtendedLat <= 120) { // a-x
            superExtendedLat = superExtendedLat - 97;
        } else {
            addDebugLog(`Ошибка парсинга супер-расширенного уровня широты в QTH: ${qth}, символ: ${qth[9]}`, 'error');
            return null;
        }
        
        if (superExtendedLon < 0 || superExtendedLon > 23 || superExtendedLat < 0 || superExtendedLat > 23) {
            addDebugLog(`Ошибка парсинга супер-расширенного уровня в QTH: ${qth}`, 'error');
            return null;
        }
        
        // 3 секунды = 3/3600 = 0.000833 градуса долготы
        // 1.5 секунды = 1.5/3600 = 0.000417 градуса широты
        lon += superExtendedLon * (3 / 3600);
        lat += superExtendedLat * (1.5 / 3600);
    }
    
    // Возвращаем центр квадрата (добавляем половину размера квадрата)
    if (qth.length >= 10) {
        // Центр супер-расширенного квадрата: +1.5 секунды по долготе, +0.75 секунды по широте
        lon += 1.5 / 3600; // 1.5 секунды
        lat += 0.75 / 3600; // 0.75 секунды
    } else if (qth.length >= 8) {
        // Центр расширенного квадрата: +15 секунд по долготе, +7.5 секунд по широте
        lon += 15 / 3600; // 15 секунд
        lat += 7.5 / 3600; // 7.5 секунд
    } else if (qth.length >= 6) {
        // Центр подквадрата: +2.5 минуты по долготе, +1.25 минуты по широте
        lon += 2.5 / 60; // 2.5 минуты
        lat += 1.25 / 60; // 1.25 минуты
    } else if (qth.length >= 4) {
        // Центр квадрата: +1° по долготе, +0.5° по широте
        lon += 1;
        lat += 0.5;
    } else {
        // Центр поля: +10° по долготе, +5° по широте
        lon += 10;
        lat += 5;
    }
    
    // Проверяем валидность координат
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        addDebugLog(`Получены невалидные координаты из QTH ${qth}: lat=${lat}, lon=${lon}`, 'error');
        return null;
    }
    
    return { lat: lat, lon: lon };
}

// Функция для отображения границ на карте
function displayBoundary(geojson, color = '#3388ff', fillOpacity = 0.2, clearMarkers = true, clearPrevious = true) {
    addDebugLog(`displayBoundary вызвана, тип данных: ${typeof geojson}, isArray: ${Array.isArray(geojson)}, clearPrevious=${clearPrevious}`, 'info');
    
    // Очищаем предыдущие слои границ только если указано
    if (clearPrevious) {
        boundaryLayers.forEach(layer => map.removeLayer(layer));
        boundaryLayers = [];
    }
    
    // Очищаем маркеры местоположений только если явно указано (по умолчанию очищаем)
    if (clearMarkers) {
        locationMarkers.forEach(marker => {
            map.removeLayer(marker);
        });
        locationMarkers = [];
        // Очищаем данные подписи только если очищаем все маркеры
        currentLabelData = null;
        // Скрываем панель управления
        const panel = document.getElementById('label-control-panel');
        if (panel) {
            panel.classList.remove('visible');
        }
    }
    
    if (!geojson) {
        addDebugLog('displayBoundary: geojson пустой', 'warn');
        return;
    }
    
    // Если это массив координат
    if (Array.isArray(geojson)) {
        // Если массив содержит несколько полигонов и это может быть город с островами,
        // фильтруем полигоны по размеру и расстоянию от центра (если есть контекст)
        let polygonsToDisplay = geojson;
        
        if (geojson.length > 1) {
            addDebugLog(`Массив содержит ${geojson.length} полигонов, проверяем необходимость фильтрации`, 'info');
            // Пока оставляем все полигоны, фильтрация будет применена позже при необходимости
        }
        
        polygonsToDisplay.forEach((coords, index) => {
            if (coords && coords.length > 0) {
                // Фильтруем и нормализуем валидные координаты (для восточных частей)
                const validCoords = coords
                    .map(coord => {
                        if (!Array.isArray(coord) || coord.length < 2) return null;
                        let lat = coord[0];
                        let lon = coord[1];
                        // Нормализуем долготу: если > 180, преобразуем в отрицательные
                        if (lon > 180) {
                            lon = lon - 360;
                        }
                        return [lat, lon];
                    })
                    .filter(coord => {
                        if (!coord) return false;
                        const lat = coord[0];
                        const lon = coord[1];
                        return !isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon) &&
                               lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
                    });
                
                if (validCoords.length > 0) {
                    // Проверяем, что это действительно полигон (минимум 3 точки для замкнутого полигона)
                    if (validCoords.length < 3) {
                        addDebugLog(`Пропущены координаты полигона ${index}: недостаточно точек (${validCoords.length} < 3)`, 'warn');
                        return; // Пропускаем, если недостаточно точек
                    }
                    
                    try {
                        // Для городов используем более толстую линию и большую прозрачность для видимости
                        const isCity = color === '#ff6b6b'; // красный цвет = город
                        const polygon = L.polygon(validCoords, {
                            color: color,
                            fillColor: color,
                            fillOpacity: fillOpacity,
                            weight: isCity ? 4 : 3, // Более толстая линия для городов
                            opacity: isCity ? 0.8 : 0.6 // Более яркая линия для городов
                        });
                        polygon.addTo(map);
                        boundaryLayers.push(polygon);
                        addDebugLog(`Полигон ${index} добавлен, точек: ${validCoords.length}`, 'success');
                    } catch (e) {
                        addDebugLog(`Ошибка создания полигона ${index}: ${e.message}`, 'error');
                    }
                }
            }
        });
        addDebugLog(`Добавлено полигонов: ${boundaryLayers.length}`, 'info');
    } 
    // Если это GeoJSON объект
    else if (geojson.type) {
        addDebugLog(`GeoJSON объект, тип: ${geojson.type}`, 'info');
        try {
            // Для MultiPolygon обрабатываем каждый полигон отдельно, чтобы убедиться, что все отображаются
            if (geojson.type === 'MultiPolygon' && geojson.coordinates) {
                addDebugLog(`MultiPolygon с ${geojson.coordinates.length} полигонами, обрабатываем каждый отдельно`, 'info');
                
                // Если много полигонов (больше 3), возможно это город с удаленными островами
                // Находим центр самого большого полигона для фильтрации
                let mainCenterLat = null, mainCenterLon = null;
                if (geojson.coordinates.length > 3) {
                    let maxArea = 0;
                    geojson.coordinates.forEach(polygon => {
                        if (polygon && polygon[0] && polygon[0].length > 0) {
                            let minLat = Infinity, maxLat = -Infinity;
                            let minLon = Infinity, maxLon = -Infinity;
                            polygon[0].forEach(coord => {
                                const lon = coord[0] > 180 ? coord[0] - 360 : coord[0];
                                const lat = coord[1];
                                if (lat < minLat) minLat = lat;
                                if (lat > maxLat) maxLat = lat;
                                if (lon < minLon) minLon = lon;
                                if (lon > maxLon) maxLon = lon;
                            });
                            const area = (maxLat - minLat) * (maxLon - minLon);
                            if (area > maxArea) {
                                maxArea = area;
                                mainCenterLat = (minLat + maxLat) / 2;
                                mainCenterLon = (minLon + maxLon) / 2;
                            }
                        }
                    });
                    if (mainCenterLat !== null) {
                        addDebugLog(`Центр самого большого полигона: [${mainCenterLat.toFixed(2)}, ${mainCenterLon.toFixed(2)}]`, 'info');
                    }
                }
                
                geojson.coordinates.forEach((polygon, index) => {
                    if (polygon && polygon[0] && polygon[0].length > 0) {
                        try {
                            // Нормализуем координаты для восточных частей (переход через линию перемены дат)
                            // Если долгота > 180, преобразуем в отрицательные значения
                            const normalizedPolygon = polygon.map(ring => 
                                ring.map(coord => {
                                    let lng = coord[0];
                                    // Если долгота больше 180, преобразуем (например, 190° -> -170°)
                                    if (lng > 180) {
                                        lng = lng - 360;
                                    }
                                    return [lng, coord[1]]; // [lng, lat]
                                })
                            );
                            
                            // Если есть центр главного полигона и много полигонов, фильтруем по расстоянию
                            if (mainCenterLat !== null && mainCenterLon !== null && geojson.coordinates.length > 3) {
                                // Находим центр этого полигона
                                let minLat = Infinity, maxLat = -Infinity;
                                let minLon = Infinity, maxLon = -Infinity;
                                normalizedPolygon[0].forEach(coord => {
                                    const lat = coord[1];
                                    const lon = coord[0];
                                    if (lat < minLat) minLat = lat;
                                    if (lat > maxLat) maxLat = lat;
                                    if (lon < minLon) minLon = lon;
                                    if (lon > maxLon) maxLon = lon;
                                });
                                const polyCenterLat = (minLat + maxLat) / 2;
                                const polyCenterLon = (minLon + maxLon) / 2;
                                const latDiff = Math.abs(polyCenterLat - mainCenterLat);
                                const lonDiff = Math.abs(polyCenterLon - mainCenterLon);
                                const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
                                
                                // Пропускаем полигоны, которые слишком далеко от главного (больше 2 градусов)
                                if (distance > 2.0) {
                                    addDebugLog(`Полигон ${index} пропущен: слишком далеко от главного (${distance.toFixed(2)}°)`, 'warn');
                                    return;
                                }
                                addDebugLog(`Полигон ${index} включен: расстояние от главного ${distance.toFixed(2)}°`, 'info');
                            }
                            
                            // Создаем отдельный GeoJSON объект для каждого полигона
                            const singlePolygon = {
                                type: 'Polygon',
                                coordinates: normalizedPolygon
                            };
                            
                            // Для городов используем более толстую линию и большую прозрачность для видимости
                            const isCity = color === '#ff6b6b'; // красный цвет = город
                            const polygonLayer = L.geoJSON(singlePolygon, {
                                style: {
                                    color: color,
                                    fillColor: color,
                                    fillOpacity: fillOpacity,
                                    weight: isCity ? 4 : 3, // Более толстая линия для городов
                                    opacity: isCity ? 0.8 : 0.6 // Более яркая линия для городов
                                }
                            });
                            
                            polygonLayer.addTo(map);
                            boundaryLayers.push(polygonLayer);
                            
                            if (polygonLayer.getBounds) {
                                const bounds = polygonLayer.getBounds();
                                const sw = bounds.getSouthWest();
                                const ne = bounds.getNorthEast();
                                addDebugLog(`Полигон ${index} добавлен, границы: SW=[${sw.lat.toFixed(2)}, ${sw.lng.toFixed(2)}], NE=[${ne.lat.toFixed(2)}, ${ne.lng.toFixed(2)}]`, 'success');
                            }
                        } catch (e) {
                            addDebugLog(`Ошибка при добавлении полигона ${index}: ${e.message}`, 'error');
                        }
                    }
                });
                
                addDebugLog(`Всего добавлено полигонов: ${boundaryLayers.length}`, 'info');
            } else if (geojson.type === 'Polygon' && geojson.coordinates) {
                // Для обычного Polygon тоже нормализуем координаты
                try {
                    const normalizedPolygon = geojson.coordinates.map(ring => 
                        ring.map(coord => {
                            let lng = coord[0];
                            if (lng > 180) {
                                lng = lng - 360;
                            }
                            return [lng, coord[1]];
                        })
                    );
                    
                    const normalizedGeoJson = {
                        type: 'Polygon',
                        coordinates: normalizedPolygon
                    };
                    
                    const geoJsonLayer = L.geoJSON(normalizedGeoJson, {
                        style: {
                            color: color,
                            fillColor: color,
                            fillOpacity: fillOpacity,
                            weight: 3
                        }
                    });
                    geoJsonLayer.addTo(map);
                    boundaryLayers.push(geoJsonLayer);
                    
                    if (geoJsonLayer.getBounds) {
                        const layerBounds = geoJsonLayer.getBounds();
                        addDebugLog(`Polygon слой добавлен, границы: ${layerBounds.toBBoxString()}`, 'success');
                    }
                } catch (e) {
                    addDebugLog(`Ошибка создания Polygon слоя: ${e.message}`, 'error');
                }
            } else if (geojson.type === 'Point') {
                // Если это Point, не отображаем как границы - это только точка
                addDebugLog('Получен Point вместо границ, пропускаем отображение', 'warn');
            } else {
                // Для обычных Polygon и других типов используем стандартный метод
                // Проверяем, что это не Point
                if (geojson.type === 'Point') {
                    addDebugLog('Получен Point, пропускаем отображение границ', 'warn');
                    return;
                }
                
                // Для городов используем более толстую линию и большую прозрачность для видимости
                const isCity = color === '#ff6b6b'; // красный цвет = город
                const geoJsonLayer = L.geoJSON(geojson, {
                    style: {
                        color: color,
                        fillColor: color,
                        fillOpacity: fillOpacity,
                        weight: isCity ? 4 : 3, // Более толстая линия для городов
                        opacity: isCity ? 0.8 : 0.6 // Более яркая линия для городов
                    }
                });
                geoJsonLayer.addTo(map);
                boundaryLayers.push(geoJsonLayer);
                
                // Проверяем, что слой действительно добавлен и имеет границы
                if (geoJsonLayer.getBounds) {
                    const layerBounds = geoJsonLayer.getBounds();
                    addDebugLog(`GeoJSON слой добавлен, границы: ${layerBounds.toBBoxString()}`, 'success');
                } else {
                    addDebugLog('GeoJSON слой добавлен, но getBounds недоступен', 'warn');
                }
            }
        } catch (e) {
            addDebugLog(`Ошибка создания GeoJSON слоя: ${e.message}`, 'error');
            addDebugLog(`Стек ошибки: ${e.stack}`, 'error');
        }
    } else {
        addDebugLog(`Неизвестный формат данных границ: ${JSON.stringify(geojson).substring(0, 100)}`, 'warn');
    }
    
    addDebugLog(`Всего слоев границ после добавления: ${boundaryLayers.length}`, 'info');
}

// Функция для парсинга текстового файла RDA
function parseRDAText(text) {
    const districts = [];
    // Данные могут быть экранированы в JavaScript строке
    // Сначала пробуем декодировать экранированные символы
    let decodedText = text;
    if (text.includes('\\n')) {
        // Заменяем экранированные символы
        decodedText = text
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\');
    }
    
    // Разбиваем по строкам
    const lines = decodedText.split('\n');
    
    let currentRegion = null;
    let currentRegionCode = null;
    
    addDebugLog(`Парсинг RDA данных, всего строк: ${lines.length}`, 'info');
    if (lines.length > 0) {
        addDebugLog(`Первая строка (первые 100 символов): ${lines[0].substring(0, 100)}`, 'info');
        // Ищем пример строки с районом
        for (let j = 0; j < Math.min(50, lines.length); j++) {
            if (lines[j].match(/^[A-Z]{2}-\d+/)) {
                addDebugLog(`Пример строки с районом (строка ${j}): ${lines[j].substring(0, 80)}`, 'info');
                break;
            }
        }
    }
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        // Если строка содержит экранированные символы, декодируем их
        if (line.includes('\\n')) {
            line = line.replace(/\\n/g, '\n');
        }
        line = line.trim();
        
        // Пропускаем пустые строки и заголовки
        if (!line || line.startsWith('"RUSSIAN DISTRICTS AWARD"') || 
            (line.includes('LIST') && line.includes('RUSSIAN')) || 
            line.startsWith('____') || line.match(/^\d+\s+.*RDA$/)) {
            continue;
        }
        
        // Определяем регион (строка с кодом в скобках, например "(AL)   UA9Y")
        const regionMatch = line.match(/\(([A-Z]{2})\)/);
        if (regionMatch) {
            currentRegionCode = regionMatch[1];
            // Пытаемся извлечь название региона из предыдущих строк
            if (i > 0) {
                let prevLine = lines[i - 1];
                if (prevLine && prevLine.includes('\\n')) {
                    prevLine = prevLine.replace(/\\n/g, '\n');
                }
                prevLine = prevLine.trim();
                if (prevLine && !prevLine.match(/^[A-Z]{2}-\d+/)) {
                    currentRegion = prevLine;
                }
            }
            continue;
        }
        
        // Парсим строку с районом (формат: "CB-54	Название района" или "CB-54\tНазвание района")
        // Пробуем разные варианты разделителей: табуляция, пробелы
        // Регулярное выражение: код района, затем табуляция/пробелы, затем название
        const districtMatch = line.match(/^([A-Z]{2})-(\d+)[\t\s]+(.+?)(?:[\t\s]+deleted|[\t\s]*$|$)/);
        if (districtMatch) {
            const code = districtMatch[1] + '-' + districtMatch[2];
            let name = districtMatch[3].trim();
            
            // Убираем лишние символы и пробелы
            name = name.replace(/[\t\s]+/g, ' ').trim();
            
            // Пропускаем deleted районы
            if (line.toLowerCase().includes('deleted')) {
                continue;
            }
            
            if (name && name !== 'deleted' && name.length > 0) {
                districts.push({
                    code: code,
                    name: name,
                    region: currentRegion || currentRegionCode,
                    regionCode: currentRegionCode
                });
            }
        } else if (line.match(/^[A-Z]{2}-\d+/)) {
            // Если строка начинается с кода района, но не распарсилась, попробуем более простой способ
            const simpleMatch = line.match(/^([A-Z]{2})-(\d+)[\t\s]+(.+)/);
            if (simpleMatch) {
                const code = simpleMatch[1] + '-' + simpleMatch[2];
                let name = simpleMatch[3].trim();
                name = name.replace(/[\t\s]+/g, ' ').trim();
                
                if (!line.toLowerCase().includes('deleted') && name && name.length > 0) {
                    districts.push({
                        code: code,
                        name: name,
                        region: currentRegion || currentRegionCode,
                        regionCode: currentRegionCode
                    });
                }
            }
        }
    }
    
    addDebugLog(`Парсинг завершен, найдено районов: ${districts.length}`, 'info');
    if (districts.length > 0) {
        addDebugLog(`Примеры найденных районов: ${districts.slice(0, 3).map(d => d.code).join(', ')}`, 'info');
    }
    
    return districts;
}

// Функция для загрузки локального файла через XMLHttpRequest (работает с file:///)
function loadLocalFile(url) {
    return new Promise((resolve, reject) => {
        try {
            const xhr = new XMLHttpRequest();
            // Используем синхронный запрос для локальных файлов (работает с file:///)
            // ВНИМАНИЕ: синхронные запросы могут быть заблокированы в некоторых браузерах
            xhr.open('GET', url, false); // false = синхронный
            
            xhr.onerror = function() {
                reject(new Error('Network error'));
            };
            
            xhr.send(null);
            
            // Для file:/// статус может быть 0 или 200
            if (xhr.status === 0 || xhr.status === 200) {
                if (xhr.responseText) {
                    resolve(xhr.responseText);
                } else {
                    reject(new Error('Пустой ответ'));
                }
            } else {
                reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
            }
        } catch (e) {
            reject(new Error(`Ошибка загрузки: ${e.message}`));
        }
    });
}

// Функция для загрузки и отображения районов RDA
async function loadRDA(rdaCode = null) {
    addDebugLog(`Загрузка данных RDA районов${rdaCode ? `, код района: ${rdaCode}` : ''}`, 'info');
    
    try {
        // Сначала пробуем использовать встроенные данные (из rda_data.js)
        if (typeof RDA_DATA !== 'undefined' && RDA_DATA) {
            addDebugLog(`Используем встроенные данные RDA, размер: ${RDA_DATA.length} символов`, 'success');
            return await processRDAData(RDA_DATA, rdaCode);
        }
        
        addDebugLog('Встроенные данные RDA не найдены, пробуем загрузить локальный файл...', 'warn');
        
        // Если встроенные данные не найдены, пробуем загрузить локальный файл
        const localRdaUrls = ['rda_rus.txt', './rda_rus.txt'];
        
        let text;
        let localFileLoaded = false;
        
        // Пробуем загрузить из разных вариантов пути
        for (const localRdaUrl of localRdaUrls) {
            try {
                addDebugLog(`Пробуем путь: ${localRdaUrl}`, 'info');
                text = await loadLocalFile(localRdaUrl);
                addDebugLog(`Загружен локальный файл RDA, размер: ${text.length} символов`, 'success');
                localFileLoaded = true;
                break;
            } catch (localError) {
                addDebugLog(`Ошибка загрузки с пути ${localRdaUrl}: ${localError.message}`, 'warn');
            }
        }
        
        if (localFileLoaded) {
            return await processRDAData(text, rdaCode);
        }
        
        addDebugLog('Локальный файл не найден, пробуем загрузить с удаленного источника...', 'warn');
        
        // Если локальный файл не найден, пробуем удаленный источник
        const remoteRdaUrl = 'https://rdaward.org/rda_rus.txt';
        addDebugLog(`Пробуем загрузить данные с: ${remoteRdaUrl}`, 'info');
        
        try {
            const response = await fetch(remoteRdaUrl, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'User-Agent': 'RadioMap/1.0',
                    'Accept': 'text/plain, */*'
                }
            });
            
            if (!response.ok) {
                addDebugLog(`Ошибка HTTP при загрузке RDA: ${response.status} ${response.statusText}`, 'error');
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            text = await response.text();
            addDebugLog(`Загружен текстовый файл RDA с удаленного источника, размер: ${text.length} символов`, 'success');
            return await processRDAData(text, rdaCode);
        } catch (fetchError) {
            addDebugLog(`Ошибка fetch: ${fetchError.message}`, 'error');
            // Если CORS ошибка, пробуем через прокси
            if (fetchError.message.includes('CORS') || fetchError.message.includes('Failed to fetch')) {
                addDebugLog('CORS ошибка. Пробуем загрузить через прокси...', 'warn');
                try {
                    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(remoteRdaUrl)}`;
                    addDebugLog(`Пробуем загрузить через прокси: ${proxyUrl}`, 'info');
                    const proxyResponse = await fetch(proxyUrl);
                    if (proxyResponse.ok) {
                        const proxyData = await proxyResponse.json();
                        if (proxyData.contents) {
                            text = proxyData.contents;
                            addDebugLog(`Загружен текстовый файл RDA через прокси, размер: ${text.length} символов`, 'success');
                            return await processRDAData(text, rdaCode);
                        }
                    }
                } catch (proxyError) {
                    addDebugLog(`Ошибка загрузки через прокси: ${proxyError.message}`, 'error');
                }
            }
            
            // Если все методы не сработали
            showError(`Не удалось загрузить данные RDA. Убедитесь, что файл rda_rus.txt находится в той же папке, что и index.html`);
            return false;
        }
    } catch (error) {
        addDebugLog(`Ошибка загрузки RDA: ${error.message}`, 'error');
        addDebugLog(`Тип ошибки: ${error.name}`, 'error');
        showError(`Ошибка загрузки данных RDA: ${error.message}`);
        return false;
    }
}

// Вспомогательная функция для обработки данных RDA
async function processRDAData(text, rdaCode) {
    // Парсим текстовый файл
    const districts = parseRDAText(text);
    addDebugLog(`Распознано ${districts.length} районов RDA`, 'success');
    
    if (districts.length === 0) {
        addDebugLog('Не удалось распознать районы RDA из текстового файла', 'warn');
        return false;
    }
    
    // Если указан конкретный код района, фильтруем
    let districtsToShow = districts;
    if (rdaCode) {
        const codeUpper = rdaCode.toUpperCase().trim();
        districtsToShow = districts.filter(d => d.code.toUpperCase() === codeUpper);
        
        if (districtsToShow.length === 0) {
            addDebugLog(`Район RDA с кодом ${rdaCode} не найден`, 'warn');
            showError(`Район RDA "${rdaCode}" не найден`);
            return false;
        }
        
        addDebugLog(`Найден район RDA: ${districtsToShow[0].code} - ${districtsToShow[0].name}`, 'success');
    }
    
    // Отображаем районы на карте
    await displayRDADistricts(districtsToShow, rdaCode !== null);
    
    return true;
}

// Функция для отображения районов RDA на карте
async function displayRDADistricts(districts, singleDistrict = false) {
    addDebugLog(`Отображение ${districts.length} районов RDA на карте${singleDistrict ? ' (один район)' : ''}`, 'info');
    
    // Очищаем предыдущие слои RDA
    rdaLayers.forEach(layer => {
        map.removeLayer(layer);
    });
    rdaLayers = [];
    
    // Если показываем один район, обрабатываем все районы из списка (обычно один)
    // Если показываем все, ограничиваем количество для производительности
    const maxDistrictsToLoad = singleDistrict ? districts.length : 100;
    const districtsToProcess = districts.slice(0, maxDistrictsToLoad);
    
    let loadedCount = 0;
    
    for (let i = 0; i < districtsToProcess.length; i++) {
        const district = districtsToProcess[i];
        
        try {
            addDebugLog(`Обработка района ${district.code}: ${district.name}`, 'info');
            
            // Пробуем геокодировать район
            const query = `${district.name}, Россия`;
            const geoData = await geocode(query);
            
            if (geoData) {
                addDebugLog(`Найдены координаты для ${district.code}: lat=${geoData.lat}, lon=${geoData.lon}`, 'info');
                
                // Получаем границы района
                const boundary = await getBoundaryByQuery(district.name, 'Россия');
                
                if (boundary) {
                    addDebugLog(`Границы найдены для ${district.code}`, 'success');
                    const layer = L.geoJSON(boundary, {
                        style: {
                            color: '#ff6b6b',
                            fillColor: '#ff6b6b',
                            fillOpacity: 0.25,
                            weight: 3,
                            dashArray: '5, 5'
                        },
                        onEachFeature: function(feature, layer) {
                            // Вычисляем QTH для центра района
                            let qthInfo = '';
                            if (geoData && geoData.lat && geoData.lon) {
                                const qth = latLonToQTH(geoData.lat, geoData.lon, 4);
                                qthInfo = `<div style="margin-top: 5px;"><strong>QTH:</strong> ${qth}</div>`;
                            }
                            
                            const popupContent = `
                                <div style="font-weight: bold; margin-bottom: 5px; font-size: 14px;">${district.code}: ${district.name}</div>
                                <div style="margin-top: 5px;">Регион: ${district.region || district.regionCode}</div>
                                ${qthInfo}
                            `;
                            layer.bindPopup(popupContent);
                        }
                    });
                    layer.addTo(map);
                    rdaLayers.push(layer);
                    loadedCount++;
                } else {
                    // Если границы не найдены, добавляем маркер
                    addDebugLog(`Границы не найдены для ${district.code}, добавляем маркер`, 'warn');
                    if (geoData.lat && geoData.lon) {
                        const marker = L.marker([geoData.lat, geoData.lon], {
                            icon: L.divIcon({
                                className: 'rda-marker',
                                html: `<div style="background: #ff6b6b; color: white; padding: 3px 6px; border-radius: 3px; font-size: 11px; font-weight: bold; white-space: nowrap;">${district.code}</div>`,
                                iconSize: [60, 25]
                            })
                        });
                        // Вычисляем QTH для маркера
                        const qth = latLonToQTH(geoData.lat, geoData.lon, 4);
                        marker.bindPopup(`
                            <div style="font-weight: bold; margin-bottom: 5px; font-size: 14px;">${district.code}: ${district.name}</div>
                            <div style="margin-top: 5px;">Регион: ${district.region || district.regionCode}</div>
                            <div style="margin-top: 5px;"><strong>QTH:</strong> ${qth}</div>
                        `);
                        marker.addTo(map);
                        rdaLayers.push(marker);
                        loadedCount++;
                    }
                }
            } else {
                addDebugLog(`Не удалось найти координаты для ${district.code}: ${district.name}`, 'warn');
            }
            
            // Небольшая задержка между запросами, чтобы не перегружать API
            if (i < districtsToProcess.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        } catch (e) {
            addDebugLog(`Ошибка обработки района ${district.code}: ${e.message}`, 'error');
        }
    }
    
    addDebugLog(`Отображено ${loadedCount} из ${districts.length} районов RDA на карте`, 'success');
    
    // Масштабируем карту на отображенные районы
    if (loadedCount > 0 && rdaLayers.length > 0) {
        try {
            const group = new L.featureGroup(rdaLayers);
            const bounds = group.getBounds();
            if (bounds && bounds.isValid()) {
                // Для одного района используем больший padding и больший zoom
                const padding = singleDistrict ? [50, 50] : [20, 20];
                const maxZoom = singleDistrict ? 12 : 8;
                map.fitBounds(bounds, { padding: padding, maxZoom: maxZoom });
                addDebugLog(`Карта масштабирована на ${singleDistrict ? 'район' : 'районы'} RDA`, 'success');
            }
        } catch (e) {
            addDebugLog(`Ошибка масштабирования на RDA: ${e.message}`, 'warn');
        }
    }
}


// Функция для масштабирования карты
function fitToBounds(coordinates, padding = 0) {
    addDebugLog(`fitToBounds вызвана, padding: ${padding}, boundaryLayers: ${boundaryLayers.length}`, 'info');
    
    // Если координаты не переданы или пустые, используем границы слоев на карте
    if (!coordinates || (Array.isArray(coordinates) && coordinates.length === 0)) {
        addDebugLog('Координаты не переданы, используем границы слоев', 'info');
        addDebugLog(`Количество слоев: ${boundaryLayers.length}`, 'info');
        
        if (boundaryLayers.length > 0) {
            try {
                // Пробуем получить границы напрямую из первого слоя
                let bounds = null;
                
                if (boundaryLayers[0] && boundaryLayers[0].getBounds) {
                    bounds = boundaryLayers[0].getBounds();
                    addDebugLog(`Границы из первого слоя: ${bounds ? bounds.toBBoxString() : 'null'}`, 'info');
                }
                
                // Если не получилось, пробуем через featureGroup
                if (!bounds || !bounds.isValid()) {
                    addDebugLog('Пробуем получить границы через featureGroup', 'info');
                    const group = new L.featureGroup(boundaryLayers);
                    bounds = group.getBounds();
                    addDebugLog(`Границы из featureGroup: ${bounds ? bounds.toBBoxString() : 'null'}`, 'info');
                }
                
                if (bounds && bounds.isValid()) {
                    addDebugLog(`Границы валидны: ${bounds.isValid()}, SW: [${bounds.getSouthWest().lat}, ${bounds.getSouthWest().lng}], NE: [${bounds.getNorthEast().lat}, ${bounds.getNorthEast().lng}]`, 'info');
                    
                    // Проверяем, что координаты не NaN
                    const sw = bounds.getSouthWest();
                    const ne = bounds.getNorthEast();
                    if (isNaN(sw.lat) || isNaN(sw.lng) || isNaN(ne.lat) || isNaN(ne.lng)) {
                        addDebugLog('Обнаружены NaN в границах, пробуем альтернативный метод', 'warn');
                        // Пробуем создать bounds вручную из координат слоя
                        if (boundaryLayers[0] && boundaryLayers[0].getLatLngs) {
                            try {
                                const latlngs = boundaryLayers[0].getLatLngs();
                                if (latlngs && latlngs.length > 0) {
                                    // Собираем все координаты
                                    const allCoords = [];
                                    function collectCoords(arr) {
                                        arr.forEach(item => {
                                            if (Array.isArray(item)) {
                                                collectCoords(item);
                                            } else if (item && typeof item.lat === 'number' && typeof item.lng === 'number') {
                                                allCoords.push([item.lat, item.lng]);
                                            }
                                        });
                                    }
                                    collectCoords(latlngs);
                                    
                                    if (allCoords.length > 0) {
                                        bounds = L.latLngBounds(allCoords);
                                        addDebugLog(`Границы созданы вручную из ${allCoords.length} координат`, 'info');
                                    }
                                }
                            } catch (e) {
                                addDebugLog(`Ошибка при сборе координат: ${e.message}`, 'error');
                            }
                        }
                    }
                    
                    if (bounds && bounds.isValid()) {
                        const sw = bounds.getSouthWest();
                        const ne = bounds.getNorthEast();
                        if (!isNaN(sw.lat) && !isNaN(sw.lng) && !isNaN(ne.lat) && !isNaN(ne.lng)) {
                            addDebugLog(`Границы валидны: SW=[${sw.lat}, ${sw.lng}], NE=[${ne.lat}, ${ne.lng}]`, 'info');
                            
                            try {
                                // Если padding = 0, используем простой вызов без padding
                                if (padding === 0) {
                                    // Для больших стран (как Россия) используем меньший maxZoom
                                    const boundsSize = bounds.getNorthEast().lat - bounds.getSouthWest().lat;
                                    const maxZoomValue = boundsSize > 30 ? 5 : (boundsSize > 15 ? 6 : 12);
                                    addDebugLog(`Размер границ: ${boundsSize}°, используем maxZoom: ${maxZoomValue}`, 'info');
                                    
                                    map.fitBounds(bounds, {
                                        maxZoom: maxZoomValue
                                    });
                                    addDebugLog('Карта масштабирована без padding', 'success');
                                } else {
                                    // Вычисляем padding в пикселях
                                    const paddingTop = Math.floor((window.innerHeight * padding) / 2);
                                    const paddingBottom = Math.floor((window.innerHeight * padding) / 2);
                                    const paddingLeft = Math.floor((window.innerWidth * padding) / 2);
                                    const paddingRight = Math.floor((window.innerWidth * padding) / 2);
                                    
                                    // Проверяем, что padding не содержит NaN или Infinity
                                    if (isFinite(paddingTop) && isFinite(paddingBottom) && 
                                        isFinite(paddingLeft) && isFinite(paddingRight)) {
                                        addDebugLog(`Padding: top=${paddingTop}, bottom=${paddingBottom}, left=${paddingLeft}, right=${paddingRight}`, 'info');
                                        
                                        map.fitBounds(bounds, {
                                            paddingTopLeft: [paddingLeft, paddingTop],
                                            paddingBottomRight: [paddingRight, paddingBottom],
                                            maxZoom: 12
                                        });
                                        
                                        addDebugLog('Карта масштабирована с padding', 'success');
                                    } else {
                                        addDebugLog('Padding содержит невалидные значения, используем без padding', 'warn');
                                        map.fitBounds(bounds, {
                                            maxZoom: 12
                                        });
                                        addDebugLog('Карта масштабирована без padding (fallback)', 'success');
                                    }
                                }
                            } catch (e) {
                                addDebugLog(`Ошибка при вызове fitBounds: ${e.message}`, 'error');
                                // Пробуем без padding
                                try {
                                    map.fitBounds(bounds, {
                                        maxZoom: 12
                                    });
                                    addDebugLog('Карта масштабирована без padding (после ошибки)', 'success');
                                } catch (e2) {
                                    addDebugLog(`Критическая ошибка при масштабировании: ${e2.message}`, 'error');
                                }
                            }
                        } else {
                            addDebugLog('Границы содержат NaN, не можем масштабировать', 'error');
                        }
                    } else {
                        addDebugLog('Границы невалидны после всех попыток', 'error');
                    }
                } else {
                    addDebugLog('Не удалось получить валидные границы', 'warn');
                }
            } catch (e) {
                addDebugLog(`Ошибка при масштабировании по слоям: ${e.message}`, 'error');
                addDebugLog(`Стек ошибки: ${e.stack}`, 'error');
            }
        } else {
            addDebugLog('Нет слоев для масштабирования', 'warn');
        }
        return;
    }
    
    let allCoords = [];
    
    // Обработка разных форматов данных
    if (Array.isArray(coordinates)) {
        if (coordinates.length > 0) {
            // Проверяем первый элемент
            if (Array.isArray(coordinates[0])) {
                if (Array.isArray(coordinates[0][0])) {
                    // Массив массивов координат (множественные полигоны)
                    // Формат: [[[lat, lon], [lat, lon], ...], [[lat, lon], ...]]
                    coordinates.forEach(polygon => {
                        if (polygon && polygon.length > 0) {
                            // Фильтруем валидные координаты
                            const validCoords = polygon.filter(coord => {
                                if (!Array.isArray(coord) || coord.length < 2) return false;
                                const lat = coord[0];
                                const lon = coord[1];
                                return !isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon) &&
                                       lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
                            });
                            allCoords = allCoords.concat(validCoords);
                        }
                    });
                } else if (typeof coordinates[0][0] === 'number') {
                    // Один полигон [lat, lon][]
                    // Фильтруем валидные координаты
                    allCoords = coordinates.filter(coord => {
                        if (!Array.isArray(coord) || coord.length < 2) return false;
                        const lat = coord[0];
                        const lon = coord[1];
                        return !isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon) &&
                               lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
                    });
                }
            }
        }
    }
    // Если это GeoJSON объект
    else if (coordinates && typeof coordinates === 'object') {
        if (coordinates.type === 'FeatureCollection' && coordinates.features) {
            coordinates.features.forEach(feature => {
                if (feature.geometry && feature.geometry.coordinates) {
                    const coords = feature.geometry.coordinates;
                    if (feature.geometry.type === 'Polygon') {
                        const polygonCoords = coords[0]
                            .map(c => [c[1], c[0]])
                            .filter(coord => {
                                const lat = coord[0];
                                const lon = coord[1];
                                return !isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon) &&
                                       lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
                            });
                        allCoords = allCoords.concat(polygonCoords);
                    } else if (feature.geometry.type === 'MultiPolygon') {
                        coords.forEach(polygon => {
                            const polygonCoords = polygon[0]
                                .map(c => [c[1], c[0]])
                                .filter(coord => {
                                    const lat = coord[0];
                                    const lon = coord[1];
                                    return !isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon) &&
                                           lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
                                });
                            allCoords = allCoords.concat(polygonCoords);
                        });
                    }
                }
            });
        } else if (coordinates.type === 'Polygon' && coordinates.coordinates) {
            allCoords = coordinates.coordinates[0]
                .map(c => {
                    let lng = c[0];
                    // Нормализуем долготу: если > 180, преобразуем в отрицательные
                    if (lng > 180) {
                        lng = lng - 360;
                    }
                    return [c[1], lng]; // [lat, lng]
                })
                .filter(coord => {
                    const lat = coord[0];
                    const lon = coord[1];
                    return !isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon) &&
                           lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
                });
        } else if (coordinates.type === 'MultiPolygon' && coordinates.coordinates) {
            coordinates.coordinates.forEach(polygon => {
                const polygonCoords = polygon[0]
                    .map(c => {
                        let lng = c[0];
                        // Нормализуем долготу: если > 180, преобразуем в отрицательные
                        if (lng > 180) {
                            lng = lng - 360;
                        }
                        return [c[1], lng]; // [lat, lng]
                    })
                    .filter(coord => {
                        const lat = coord[0];
                        const lon = coord[1];
                        return !isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon) &&
                               lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
                    });
                allCoords = allCoords.concat(polygonCoords);
            });
        }
    }
    
    if (allCoords.length === 0) {
        // Если не удалось распарсить, используем границы слоев на карте
        if (boundaryLayers.length > 0) {
            try {
                const group = new L.featureGroup(boundaryLayers);
                const bounds = group.getBounds();
                if (bounds.isValid()) {
                    const paddingPixels = {
                        top: (window.innerHeight * padding) / 2,
                        bottom: (window.innerHeight * padding) / 2,
                        left: (window.innerWidth * padding) / 2,
                        right: (window.innerWidth * padding) / 2
                    };
                    map.fitBounds(bounds, {
                        padding: paddingPixels,
                        maxZoom: 12
                    });
                }
            } catch (e) {
                console.error('Ошибка при масштабировании по слоям:', e);
            }
        }
        return;
    }
    
    try {
        const bounds = L.latLngBounds(allCoords);
        
        // Проверяем, что bounds валидны
        if (!bounds.isValid()) {
            console.warn('Некорректные границы для масштабирования');
            return;
        }
        
        // Вычисляем padding в пикселях в зависимости от процента экрана
        const paddingPixels = {
            top: (window.innerHeight * padding) / 2,
            bottom: (window.innerHeight * padding) / 2,
            left: (window.innerWidth * padding) / 2,
            right: (window.innerWidth * padding) / 2
        };
        
        map.fitBounds(bounds, {
            padding: paddingPixels,
            maxZoom: 12
        });
    } catch (e) {
        console.error('Ошибка при масштабировании карты:', e);
    }
}

// Основная функция инициализации
async function init() {
    addDebugLog('Начало инициализации', 'info');
    
    // Очищаем устаревший кэш при запуске
    clearOldCache();
    
    const params = getUrlParams();
    
    // Отладочная информация
    addDebugLog(`Параметры URL: country=${params.country}, city=${params.city}, region=${params.region}, rda=${params.rda}, qth=${params.qth}`, 'info');
    addDebugLog(`Полный URL: ${window.location.href}`, 'info');
    
    // Если указан только rda, автоматически устанавливаем страну на Россию
    if (params.rda !== null && !params.country) {
        params.country = 'Россия';
        addDebugLog('Параметр rda указан, автоматически устанавливаем country=Россия', 'info');
    }
    
    if (!params.country) {
        // Если параметр не указан, показываем Россию по умолчанию
        console.log('Параметр country не указан, показываем Россию по умолчанию');
        params.country = 'Россия';
    }
    
    showLoading(true);
    
    try {
        // Проверяем, указан ли конкретный код RDA района или QTH
        const rdaValue = params.rda ? params.rda.trim() : null;
        const isRdaCode = rdaValue && /^[A-Z]{2}-\d+$/i.test(rdaValue);
        const hasQTH = params.qth !== null && params.qth.trim() !== '';
        
        // Если указан конкретный код RDA или QTH, не показываем границы страны
        if (isRdaCode || hasQTH) {
            if (isRdaCode) {
                addDebugLog(`Показываем только район RDA: ${rdaValue}, границы страны не отображаются`, 'info');
            }
            if (hasQTH) {
                addDebugLog(`Показываем только QTH: ${params.qth}, границы страны не отображаются`, 'info');
            }
            // Не загружаем границы страны, только район RDA или QTH будет загружен в finally
        } else {
            // Случай 1: Только country
            if (!params.city && !params.region) {
            // Для России используем фиксированные координаты и масштаб
            const countryLower = params.country ? params.country.toLowerCase().trim() : '';
            if (countryLower === 'россия' || countryLower === 'russia' || countryLower === 'россия') {
                addDebugLog('Обработка России', 'info');
                // Устанавливаем вид на Россию
                safeSetView(61.5240, 105.3188, 4);
                
                // Для России сначала пробуем Nominatim (быстрее), затем Overpass если нужно
                addDebugLog('Шаг 1: Пробуем получить границы России через Nominatim', 'info');
                let boundary = await getBoundaryByQuery('Россия');
                
                // Проверяем полноту данных от Nominatim
                let needsOverpass = false;
                if (boundary && boundary.type === 'MultiPolygon' && boundary.coordinates) {
                    addDebugLog(`Получен MultiPolygon с ${boundary.coordinates.length} полигонами`, 'info');
                    // Проверяем, есть ли восточные части (Чукотка)
                    let hasEasternParts = false;
                    boundary.coordinates.forEach((polygon, index) => {
                        if (polygon && polygon[0] && polygon[0].length > 0) {
                            const coords = polygon[0];
                            let minLng = Infinity, maxLng = -Infinity;
                            coords.forEach(coord => {
                                const lng = coord[0];
                                if (lng < minLng) minLng = lng;
                                if (lng > maxLng) maxLng = lng;
                            });
                            // Чукотка находится примерно на 169-180°E
                            if (minLng >= 165 || maxLng >= 165) {
                                hasEasternParts = true;
                                addDebugLog(`Полигон ${index} содержит восточные части (lng: ${minLng.toFixed(2)}-${maxLng.toFixed(2)})`, 'info');
                            }
                        }
                    });
                    if (!hasEasternParts) {
                        addDebugLog('Восточные части (Чукотка) не найдены в Nominatim, пробуем Overpass', 'warn');
                        needsOverpass = true;
                        boundary = null;
                    }
                } else if (!boundary) {
                    needsOverpass = true;
                }
                
                // Если нужно, пробуем Overpass
                if (needsOverpass) {
                    addDebugLog('Шаг 2: Пробуем получить границы России через Overpass API', 'info');
                    let errorOccurred = false;
                    
                    try {
                        // Используем OSM ID России напрямую (60199)
                        // Уменьшаем timeout до 20 секунд
                        const russiaQuery = `
                            [out:json][timeout:20];
                            relation(60199);
                            (._;>;);
                            out geom;
                        `;
                        addDebugLog('Отправляем запрос к Overpass API для России по OSM ID 60199', 'info');
                    
                    // Добавляем таймаут для запроса (15 секунд)
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => {
                        controller.abort();
                        addDebugLog('Запрос к Overpass API превысил таймаут', 'warn');
                    }, 15000);
                    
                    const response = await fetch('https://overpass-api.de/api/interpreter', {
                        method: 'POST',
                        body: russiaQuery,
                        headers: { 'Content-Type': 'text/plain' },
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);
                        
                        if (response.ok) {
                            const data = await response.json();
                            addDebugLog(`Overpass вернул ${data.elements ? data.elements.length : 0} элементов`, 'info');
                            
                            if (data.elements && data.elements.length > 0) {
                                const relation = data.elements.find(el => el.type === 'relation');
                                if (relation && relation.members) {
                                    addDebugLog(`Найдена relation с ${relation.members.length} members`, 'info');
                                    const outerWays = relation.members.filter(m => 
                                        (m.role === 'outer' || m.role === '') && m.geometry
                                    );
                                    addDebugLog(`Найдено ${outerWays.length} outer ways с геометрией`, 'info');
                                    
                                    if (outerWays.length > 0) {
                                        const coordinates = [];
                                        for (const member of outerWays) {
                                            if (member.geometry && member.geometry.length > 0) {
                                                // Фильтруем и нормализуем координаты (для восточных частей)
                                                const validCoords = member.geometry
                                                    .map(coord => {
                                                        let lat = coord.lat;
                                                        let lon = coord.lon;
                                                        // Нормализуем долготу: если > 180, преобразуем в отрицательные
                                                        if (lon > 180) {
                                                            lon = lon - 360;
                                                        }
                                                        return [lat, lon];
                                                    })
                                                    .filter(coord => {
                                                        const lat = coord[0];
                                                        const lon = coord[1];
                                                        return !isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon) &&
                                                               lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
                                                    });
                                                if (validCoords.length > 0) {
                                                    coordinates.push(validCoords);
                                                    
                                                    // Проверяем, есть ли восточные части в этом way
                                                    let minLng = Infinity, maxLng = -Infinity;
                                                    validCoords.forEach(coord => {
                                                        if (coord[1] < minLng) minLng = coord[1];
                                                        if (coord[1] > maxLng) maxLng = coord[1];
                                                    });
                                                    if (minLng >= 165 || maxLng >= 165) {
                                                        addDebugLog(`Way содержит восточные части (lng: ${minLng.toFixed(2)}-${maxLng.toFixed(2)})`, 'info');
                                                    }
                                                }
                                            }
                                        }
                                        addDebugLog(`Собрано ${coordinates.length} полигонов из Overpass`, 'info');
                                        boundary = coordinates.length > 0 ? coordinates : null;
                                    }
                                }
                            }
                        } else {
                            addDebugLog(`Overpass API вернул ошибку: ${response.status}`, 'warn');
                            errorOccurred = true;
                        }
                    } catch (e) {
                        clearTimeout(timeoutId);
                        addDebugLog(`Ошибка получения границ России: ${e.message}`, 'error');
                        errorOccurred = true;
                        // Если это таймаут или CORS ошибка
                        if (e.name === 'AbortError' || e.message.includes('timeout')) {
                            addDebugLog('Запрос к Overpass API превысил таймаут, переходим к Nominatim', 'warn');
                        } else if (e.message && (e.message.includes('CORS') || e.message.includes('Failed to fetch'))) {
                            addDebugLog('CORS ошибка. Для работы с API рекомендуется использовать локальный сервер.', 'warn');
                        }
                    }
                }
                
                // Если не получили через Overpass, пробуем через Nominatim
                if (!boundary) {
                    addDebugLog('Шаг 2: Пробуем получить границы России через Nominatim', 'info');
                    boundary = await getBoundaryByQuery('Россия');
                    
                    // Если получили через Nominatim, проверяем полноту данных
                    if (boundary) {
                        if (boundary.type === 'MultiPolygon' && boundary.coordinates) {
                            addDebugLog(`Получен MultiPolygon с ${boundary.coordinates.length} полигонами`, 'info');
                            // Проверяем, есть ли восточные части (Чукотка)
                            let hasEasternParts = false;
                            boundary.coordinates.forEach((polygon, index) => {
                                if (polygon && polygon[0] && polygon[0].length > 0) {
                                    const coords = polygon[0];
                                    let minLng = Infinity, maxLng = -Infinity;
                                    coords.forEach(coord => {
                                        const lng = coord[0];
                                        if (lng < minLng) minLng = lng;
                                        if (lng > maxLng) maxLng = lng;
                                    });
                                    // Чукотка находится примерно на 169-180°E
                                    if (minLng >= 165 || maxLng >= 165) {
                                        hasEasternParts = true;
                                        addDebugLog(`Полигон ${index} содержит восточные части (lng: ${minLng.toFixed(2)}-${maxLng.toFixed(2)})`, 'info');
                                    }
                                }
                            });
                            if (!hasEasternParts) {
                                addDebugLog('ВНИМАНИЕ: Восточные части (Чукотка) не найдены в данных Nominatim! Пробуем Overpass снова.', 'warn');
                                // Пробуем Overpass еще раз
                                boundary = null;
                            }
                        }
                    }
                }
                
                // Если получили границы, отображаем их
                if (boundary) {
                    addDebugLog('Границы России найдены, отображаем на карте', 'success');
                    
                    // Отображаем ВСЕ границы (включая Калининград и другие части)
                    displayBoundary(boundary, '#3388ff', 0.2);
                    
                    // Для масштабирования находим основной полигон (самый большой)
                    let mainBoundsForZoom = null;
                    if (boundary.type === 'MultiPolygon' && boundary.coordinates) {
                        addDebugLog(`MultiPolygon с ${boundary.coordinates.length} полигонами`, 'info');
                        
                        // Находим самый большой полигон (основную часть России) для масштабирования
                        let maxArea = 0;
                        let mainPolygon = null;
                        
                        boundary.coordinates.forEach((polygon, index) => {
                            if (polygon && polygon[0] && polygon[0].length > 0) {
                                // Вычисляем примерную площадь полигона
                                const coords = polygon[0];
                                let minLat = Infinity, maxLat = -Infinity;
                                let minLng = Infinity, maxLng = -Infinity;
                                
                                coords.forEach(coord => {
                                    const lat = coord[1];
                                    const lng = coord[0];
                                    if (lat < minLat) minLat = lat;
                                    if (lat > maxLat) maxLat = lat;
                                    if (lng < minLng) minLng = lng;
                                    if (lng > maxLng) maxLng = lng;
                                });
                                
                                const area = (maxLat - minLat) * (maxLng - minLng);
                                addDebugLog(`Полигон ${index}: площадь=${area.toFixed(2)}, SW=[${minLat.toFixed(2)}, ${minLng.toFixed(2)}], NE=[${maxLat.toFixed(2)}, ${maxLng.toFixed(2)}]`, 'info');
                                
                                // Игнорируем только Калининград (маленький полигон в западной Европе)
                                // Калининград: примерно 54.7°N, 20.5°E, очень маленький по площади
                                // Основная часть России начинается примерно с 19°E
                                // Чукотка находится на востоке (примерно 64-71°N, 169-180°E), не фильтруем её
                                if (minLng > 18 && maxLng < 25 && area < 1.0) {
                                    addDebugLog(`Полигон ${index} пропущен для масштабирования (вероятно Калининград, площадь=${area.toFixed(2)})`, 'info');
                                    return;
                                }
                                
                                if (area > maxArea) {
                                    maxArea = area;
                                    mainPolygon = polygon;
                                }
                            }
                        });
                        
                        if (mainPolygon) {
                            addDebugLog(`Выбран основной полигон для масштабирования с площадью ${maxArea.toFixed(2)}`, 'info');
                            // Создаем bounds из основного полигона для масштабирования
                            const coords = mainPolygon[0];
                            const allCoords = coords.map(coord => [coord[1], coord[0]]); // [lat, lng]
                            mainBoundsForZoom = L.latLngBounds(allCoords);
                        } else {
                            addDebugLog('Не удалось найти основной полигон для масштабирования', 'warn');
                        }
                    }
                    
                    // Небольшая задержка перед масштабированием, чтобы слои успели добавиться
                    setTimeout(() => {
                        addDebugLog('Вызываем масштабирование для России', 'info');
                        
                        if (mainBoundsForZoom && mainBoundsForZoom.isValid()) {
                            const sw = mainBoundsForZoom.getSouthWest();
                            const ne = mainBoundsForZoom.getNorthEast();
                            addDebugLog(`Масштабируем на основную часть: SW=[${sw.lat.toFixed(2)}, ${sw.lng.toFixed(2)}], NE=[${ne.lat.toFixed(2)}, ${ne.lng.toFixed(2)}]`, 'info');
                            
                            // Проверяем размер границ для определения подходящего zoom
                            const latDiff = ne.lat - sw.lat;
                            const lngDiff = ne.lng - sw.lng;
                            addDebugLog(`Размер: lat=${latDiff.toFixed(2)}°, lng=${lngDiff.toFixed(2)}°`, 'info');
                            
                            // Для больших стран как Россия используем меньший maxZoom
                            let maxZoomValue = 12;
                            if (latDiff > 30 || lngDiff > 60) {
                                maxZoomValue = 4;
                            } else if (latDiff > 15 || lngDiff > 30) {
                                maxZoomValue = 5;
                            } else if (latDiff > 8 || lngDiff > 15) {
                                maxZoomValue = 6;
                            }
                            
                            addDebugLog(`Используем maxZoom: ${maxZoomValue}`, 'info');
                            
                            try {
                                map.fitBounds(mainBoundsForZoom, {
                                    maxZoom: maxZoomValue,
                                    paddingTopLeft: [10, 10],
                                    paddingBottomRight: [10, 10]
                                });
                                addDebugLog('Карта России масштабирована на основную часть успешно', 'success');
                            } catch (e) {
                                addDebugLog(`Ошибка при fitBounds: ${e.message}, пробуем без padding`, 'warn');
                                map.fitBounds(mainBoundsForZoom, {
                                    maxZoom: maxZoomValue
                                });
                                addDebugLog('Карта России масштабирована без padding', 'success');
                            }
                        } else {
                            addDebugLog('Не удалось создать bounds для масштабирования, используем стандартный метод', 'warn');
                            fitToBounds(null, 0);
                        }
                    }, 500);
                } else {
                    addDebugLog('Границы России не получены, карта уже установлена на Россию', 'warn');
                }
            } else {
                // Для других стран используем геокодинг
                addDebugLog(`Обработка страны: ${params.country}`, 'info');
                const countryData = await geocode(params.country);
                if (countryData) {
                    addDebugLog(`Данные страны получены: lat=${countryData.lat}, lon=${countryData.lon}, OSM ID=${countryData.osmId}`, 'success');
                    
                    // Пробуем получить границы через Nominatim (это более надежно)
                    addDebugLog('Шаг 1: Пробуем получить границы через Nominatim', 'info');
                    let boundary = await getBoundaryByQuery(params.country);
                    
                    // Если не получили через Nominatim, пробуем через Overpass
                    if (!boundary) {
                        addDebugLog('Шаг 2: Пробуем получить границы через Overpass', 'info');
                        boundary = await getBoundaryByOverpassQuery(params.country, null, true);
                    }
                    
                    // Если все еще не получили, пробуем альтернативные названия
                    if (!boundary) {
                        addDebugLog('Шаг 3: Пробуем альтернативные названия', 'info');
                        const alternativeNames = getAlternativeCountryNames(params.country);
                        addDebugLog(`Альтернативные названия: ${alternativeNames.join(', ')}`, 'info');
                        for (const altName of alternativeNames) {
                            addDebugLog(`Пробуем название: ${altName}`, 'info');
                            boundary = await getBoundaryByOverpassQuery(altName, null, true);
                            if (boundary) {
                                addDebugLog(`Границы найдены по альтернативному названию: ${altName}`, 'success');
                                break;
                            }
                            // Также пробуем через Nominatim с альтернативным названием
                            boundary = await getBoundaryByQuery(altName);
                            if (boundary) {
                                addDebugLog(`Границы найдены через Nominatim с альтернативным названием: ${altName}`, 'success');
                                break;
                            }
                        }
                    }
                    
                    if (boundary) {
                        addDebugLog('Границы найдены, отображаем на карте', 'success');
                        displayBoundary(boundary, '#3388ff', 0.2);
                        // Небольшая задержка перед масштабированием, чтобы слои успели добавиться
                        setTimeout(() => {
                            addDebugLog('Вызываем fitToBounds для масштабирования', 'info');
                            fitToBounds(null, 0); // Передаем null, чтобы использовать границы слоев
                        }, 300);
                    } else {
                        addDebugLog('Границы не найдены, центрируем на стране', 'warn');
                        // Если границы не найдены, просто центрируем на стране
                        if (!safeSetView(countryData.lat, countryData.lon, 6)) {
                            // Если координаты невалидны, показываем Россию по умолчанию
                            safeSetView(61.5240, 105.3188, 4);
                        }
                    }
                } else {
                    addDebugLog(`Страна "${params.country}" не найдена`, 'error');
                    showError(`Страна "${params.country}" не найдена`);
                }
            }
        }
        // Случай 2: country + city
        else if (params.city) {
            addDebugLog(`Обработка города: ${params.city} в стране: ${params.country}`, 'info');
            
            // Сначала загружаем и показываем границы страны
            addDebugLog('Шаг 1: Загружаем границы страны', 'info');
            const countryData = await geocode(params.country);
            if (countryData) {
                const countryLower = params.country ? params.country.toLowerCase().trim() : '';
                let countryBoundary = null;
                
                if (countryLower === 'россия' || countryLower === 'russia') {
                    countryBoundary = await getBoundaryByQuery('Россия');
                } else {
                    countryBoundary = await getBoundaryByQuery(params.country);
                    if (!countryBoundary) {
                        countryBoundary = await getBoundaryByOverpassQuery(params.country, null, true);
                    }
                }
                
                if (countryBoundary) {
                    addDebugLog('Границы страны найдены, отображаем на карте', 'success');
                    // Отображаем границы страны (очищаем предыдущие слои)
                    displayBoundary(countryBoundary, '#3388ff', 0.2, false, true);
                    
                    // Масштабируем карту на страну
                    setTimeout(() => {
                        addDebugLog('Масштабируем карту на страну', 'info');
                        fitToBounds(null, 0);
                    }, 300);
                } else {
                    addDebugLog('Границы страны не найдены, центрируем на стране', 'warn');
                    safeSetView(countryData.lat, countryData.lon, 6);
                }
            }
            
            // Затем загружаем и показываем город
            addDebugLog('Шаг 2: Загружаем данные города', 'info');
            const cityData = await geocode(params.city, params.country);
            if (cityData) {
                addDebugLog(`Данные города получены: lat=${cityData.lat}, lon=${cityData.lon}, OSM ID=${cityData.osmId}, OSM Type=${cityData.osmType}`, 'info');
                
                let boundary = null;
                
                // Пробуем получить границы города
                addDebugLog('Пробуем получить границы города через Nominatim', 'info');
                boundary = await getBoundaryByQuery(params.city, params.country);
                
                // Проверяем, что получили валидный результат (не Point)
                if (boundary && typeof boundary === 'object' && boundary.type && boundary.type !== 'Point') {
                    addDebugLog(`Границы найдены через Nominatim, тип: ${boundary.type}`, 'success');
                } else if (boundary && Array.isArray(boundary) && boundary.length > 0) {
                    addDebugLog(`Границы найдены через Nominatim, массив с ${boundary.length} полигонами`, 'success');
                } else {
                    boundary = null;
                }
                
                // Если не нашли через Nominatim или получили Point, пробуем через Overpass с координатами
                if (!boundary && cityData.lat && cityData.lon) {
                    addDebugLog('Границы не найдены через Nominatim, пробуем через Overpass с координатами', 'info');
                    boundary = await getBoundaryByOverpassWithCoords(cityData.lat, cityData.lon, params.city, params.country);
                }
                
                // Если все еще не нашли, пробуем через Overpass по названию
                if (!boundary) {
                    addDebugLog('Границы не найдены через координаты, пробуем через Overpass по названию', 'info');
                    boundary = await getBoundaryByOverpassQuery(params.city, params.country, false);
                }
                
                if (boundary) {
                    addDebugLog('Границы города найдены, отображаем на карте с подписью', 'success');
                    // Ждем, пока страна отобразится и зазумится, затем добавляем город поверх
                    setTimeout(() => {
                        // Отображаем границы города поверх границ страны (не очищаем предыдущие слои)
                        // Используем более яркий цвет и большую прозрачность для видимости на фоне страны
                        displayBoundary(boundary, '#ff6b6b', 0.5, false, false);
                        
                        // Добавляем подпись названия города над городом (не перекрывая границы) после отображения границ
                        setTimeout(() => {
                            // Добавляем подпись с автоматическим пересчетом при изменении масштаба
                            addTextLabel(boundary, cityData.lat, cityData.lon, params.city, '#ff6b6b');
                            addDebugLog(`Подпись города "${params.city}" добавлена над городом с автоматическим пересчетом`, 'success');
                        }, 200);
                    }, 500);
                } else {
                    // Если границы не найдены, показываем маркер с подписью
                    addDebugLog('Границы города не найдены, показываем маркер с подписью', 'warn');
                    setTimeout(() => {
                        // Показываем маркер без подписи (showLabel=false), так как добавим подпись отдельно
                        displayLocationMarker(cityData.lat, cityData.lon, params.city, 'city', false);
                        // Добавляем подпись названия немного выше маркера, чтобы не перекрывать его
                        // Используем фиктивные границы (null) для расчета позиции на основе координат
                        const fakeBoundary = { type: 'Point', coordinates: [cityData.lon, cityData.lat] };
                        addTextLabel(fakeBoundary, cityData.lat, cityData.lon, params.city, '#ff6b6b');
                    }, 500);
                }
            } else {
                // Город не найден даже по координатам
                addDebugLog('Город не найден', 'error');
                showError(`Город "${params.city}" не найден`);
            }
        }
        // Случай 3: country + region
        else if (params.region) {
            addDebugLog(`Обработка региона: ${params.region} в стране: ${params.country}`, 'info');
            
            // Сначала загружаем и показываем границы страны
            addDebugLog('Шаг 1: Загружаем границы страны', 'info');
            const countryData = await geocode(params.country);
            if (countryData) {
                const countryLower = params.country ? params.country.toLowerCase().trim() : '';
                let countryBoundary = null;
                
                if (countryLower === 'россия' || countryLower === 'russia') {
                    countryBoundary = await getBoundaryByQuery('Россия');
                } else {
                    countryBoundary = await getBoundaryByQuery(params.country);
                    if (!countryBoundary) {
                        countryBoundary = await getBoundaryByOverpassQuery(params.country, null, true);
                    }
                }
                
                if (countryBoundary) {
                    addDebugLog('Границы страны найдены, отображаем на карте', 'success');
                    // Отображаем границы страны (очищаем предыдущие слои)
                    displayBoundary(countryBoundary, '#3388ff', 0.2, false, true);
                    
                    // Масштабируем карту на страну
                    setTimeout(() => {
                        addDebugLog('Масштабируем карту на страну', 'info');
                        fitToBounds(null, 0);
                    }, 300);
                } else {
                    addDebugLog('Границы страны не найдены, центрируем на стране', 'warn');
                    safeSetView(countryData.lat, countryData.lon, 6);
                }
            }
            
            // Затем загружаем и показываем регион с заливкой
            addDebugLog('Шаг 2: Загружаем данные региона', 'info');
            const regionData = await geocode(params.region, params.country);
            if (regionData) {
                addDebugLog(`Данные региона получены: lat=${regionData.lat}, lon=${regionData.lon}`, 'info');
                const boundary = await getBoundaryByQuery(params.region, params.country);
                
                // Если не нашли через Nominatim, пробуем через Overpass
                if (!boundary) {
                    addDebugLog('Границы не найдены через Nominatim, пробуем через Overpass', 'info');
                    const overpassBoundary = await getBoundaryByOverpassQuery(params.region, params.country, false);
                    if (overpassBoundary) {
                        addDebugLog('Границы региона найдены через Overpass', 'success');
                        // Ждем, пока страна отобразится и зазумится, затем добавляем регион поверх
                        setTimeout(() => {
                            // Отображаем границы региона с заливкой поверх границ страны (не очищаем предыдущие слои)
                            displayBoundary(overpassBoundary, '#51cf66', 0.4, false, false); // большая заливка для региона
                            
                            // Добавляем подпись с названием региона
                            addTextLabel(overpassBoundary, regionData.lat, regionData.lon, params.region, '#51cf66');
                            addDebugLog(`Подпись региона "${params.region}" добавлена над регионом с автоматическим пересчетом`, 'success');
                        }, 500);
                    } else {
                        // Если границы не найдены, показываем маркер
                        addDebugLog('Границы региона не найдены, показываем маркер', 'warn');
                        setTimeout(() => {
                            displayLocationMarker(regionData.lat, regionData.lon, params.region, 'region', false);
                        }, 500);
                    }
                } else {
                    addDebugLog('Границы региона найдены, отображаем на карте с заливкой', 'success');
                    // Ждем, пока страна отобразится и зазумится, затем добавляем регион поверх
                    setTimeout(() => {
                        // Отображаем границы региона с заливкой поверх границ страны (не очищаем предыдущие слои)
                        displayBoundary(boundary, '#51cf66', 0.4, false, false); // большая заливка для региона
                        
                        // Добавляем подпись с названием региона
                        addTextLabel(boundary, regionData.lat, regionData.lon, params.region, '#51cf66');
                        addDebugLog(`Подпись региона "${params.region}" добавлена над регионом с автоматическим пересчетом`, 'success');
                    }, 500);
                }
            } else {
                // Регион не найден даже по координатам
                addDebugLog('Регион не найден', 'error');
                showError(`Область "${params.region}" не найдена`);
            }
        }
        } // закрываем else блок для isRdaCode
    } catch (error) {
        addDebugLog(`Ошибка: ${error.message}`, 'error');
        addDebugLog(`Стек: ${error.stack}`, 'error');
        
        // Не показываем ошибку для CORS - просто показываем карту России
        if (error.message && (error.message.includes('CORS') || error.message.includes('Failed to fetch'))) {
            addDebugLog('CORS ошибка. Показываем карту России по умолчанию.', 'warn');
            // Устанавливаем вид на Россию
            safeSetView(61.5240, 105.3188, 4);
            // Не показываем ошибку пользователю, так как карта все равно работает
        } else {
            // Для других ошибок показываем сообщение
            showError('Произошла ошибка при загрузке карты: ' + (error.message || 'Неизвестная ошибка'));
        }
    } finally {
        const params = getUrlParams();
        
        // Обработка параметра QTH (если указан только QTH, не показываем границы страны)
        if (params.qth !== null && params.qth.trim() !== '') {
            const qthValue = params.qth.trim().toUpperCase();
            addDebugLog(`Обработка QTH локатора: ${qthValue}`, 'info');
            
            const coords = qthToLatLon(qthValue);
            if (coords) {
                addDebugLog(`QTH ${qthValue} преобразован в координаты: lat=${coords.lat.toFixed(4)}, lon=${coords.lon.toFixed(4)}`, 'success');
                
                // Отображаем QTH квадрат на карте
                displayQTH(qthValue, coords.lat, coords.lon);
                
                // Масштабируем карту на QTH квадрат
                setTimeout(() => {
                    // Используем границы QTH квадрата для масштабирования
                    if (qthLayers.length > 0) {
                        try {
                            const group = new L.featureGroup(qthLayers);
                            const bounds = group.getBounds();
                            if (bounds && bounds.isValid()) {
                                // Определяем zoom в зависимости от точности QTH
                                let maxZoom = 15;
                                if (qthValue.length >= 10) {
                                    maxZoom = 18; // Супер-расширенный - максимальный zoom
                                } else if (qthValue.length >= 8) {
                                    maxZoom = 16; // Расширенный - очень детальный zoom
                                } else if (qthValue.length >= 6) {
                                    maxZoom = 15; // Подквадрат - более детальный zoom
                                } else if (qthValue.length >= 4) {
                                    maxZoom = 10; // Квадрат - средний zoom
                                } else {
                                    maxZoom = 6; // Поле - общий вид
                                }
                                map.fitBounds(bounds, { padding: [20, 20], maxZoom: maxZoom });
                                addDebugLog(`Карта масштабирована на QTH ${qthValue} квадрат, maxZoom=${maxZoom}`, 'success');
                            } else {
                                // Если bounds невалидны, используем setView
                                let zoom = 8;
                                if (qthValue.length >= 10) {
                                    zoom = 16;
                                } else if (qthValue.length >= 8) {
                                    zoom = 14;
                                } else if (qthValue.length >= 6) {
                                    zoom = 12;
                                } else if (qthValue.length >= 4) {
                                    zoom = 8;
                                } else {
                                    zoom = 4;
                                }
                                map.setView([coords.lat, coords.lon], zoom);
                                addDebugLog(`Карта установлена на QTH ${qthValue}, zoom=${zoom}`, 'success');
                            }
                        } catch (e) {
                            addDebugLog(`Ошибка масштабирования на QTH: ${e.message}`, 'warn');
                            map.setView([coords.lat, coords.lon], 10);
                        }
                    } else {
                        map.setView([coords.lat, coords.lon], 10);
                    }
                }, 200);
            } else {
                addDebugLog(`Неверный формат QTH локатора: ${qthValue}`, 'error');
                showError(`Неверный формат QTH локатора: ${qthValue}`);
            }
        }
        
        // Если указан параметр rda (даже пустой), загружаем районы RDA
        if (params.rda !== null) {
            // Проверяем, указан ли конкретный код района (например, CB-54)
            const rdaValue = params.rda.trim();
            const isRdaCode = /^[A-Z]{2}-\d+$/i.test(rdaValue);
            
            if (isRdaCode) {
                addDebugLog(`Загрузка конкретного района RDA: ${rdaValue}`, 'info');
                // Если указан конкретный код, не показываем границы страны
                // Загружаем только этот район
                loadRDA(rdaValue).then(success => {
                    if (!success) {
                        addDebugLog('Не удалось загрузить район RDA', 'error');
                    }
                    showLoading(false);
                }).catch(err => {
                    addDebugLog(`Ошибка загрузки RDA: ${err.message}`, 'error');
                    showLoading(false);
                });
            } else {
                addDebugLog('Загрузка всех районов RDA', 'info');
                // Загружаем все районы (или показываем страну, если она уже загружена)
                loadRDA(null).then(success => {
                    if (!success) {
                        addDebugLog('Не удалось загрузить районы RDA', 'error');
                    }
                    showLoading(false);
                }).catch(err => {
                    addDebugLog(`Ошибка загрузки RDA: ${err.message}`, 'error');
                    showLoading(false);
                });
            }
        } else {
            showLoading(false);
        }
        
        addDebugLog('Инициализация завершена', 'info');
    }
}

// Запуск при загрузке страницы
window.addEventListener('load', init);
