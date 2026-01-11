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
    
    return {
        country: country ? decodeURIComponent(country) : null,
        city: city ? decodeURIComponent(city) : null,
        region: region ? decodeURIComponent(region) : null
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
async function getBoundaryByQuery(query, country = 'Россия') {
    // Для стран используем только query без country в запросе
    const fullQuery = query;
    
    // Сначала пробуем получить через Nominatim с polygon_geojson
    // Используем polygon_kml=1 для более детальных данных, или polygon_geojson=1
    // Для стран лучше использовать polygon_geojson=1 без упрощения
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullQuery)}&format=json&limit=1&accept-language=ru&polygon_geojson=1&addressdetails=1&extratags=1`;
    
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
            addDebugLog(`Nominatim вернул данные: type=${data[0].osm_type}, id=${data[0].osm_id}`, 'info');
            
            // Если есть geojson напрямую
            if (data[0].geojson) {
                console.log('Найден GeoJSON в Nominatim');
                addDebugLog(`GeoJSON найден в Nominatim, тип: ${data[0].geojson.type}`, 'info');
                if (data[0].geojson.type === 'MultiPolygon') {
                    addDebugLog(`MultiPolygon содержит ${data[0].geojson.coordinates ? data[0].geojson.coordinates.length : 0} полигонов`, 'info');
                }
                return data[0].geojson;
            }
            
            // Пробуем получить через OSM ID
            const osmId = data[0].osm_id;
            const osmType = data[0].osm_type;
            
            console.log('OSM ID:', osmId, 'OSM Type:', osmType);
            addDebugLog(`OSM ID: ${osmId}, OSM Type: ${osmType}`, 'info');
            
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
                    return boundary;
                }
            }
            
            // Если это relation, пробуем получить через Overpass напрямую по имени
            if (osmType === 'relation') {
                console.log('Пробуем получить через Overpass по имени');
                addDebugLog('Пробуем получить через Overpass по имени', 'info');
                const overpassResult = await getBoundaryByOverpassQuery(query, null, true); // true = это страна
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
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    
    try {
        // Для стран используем admin_level=2, для регионов/городов - 4-8
        const adminLevel = isCountry ? '2' : '^[4-8]$';
        const adminLevelPattern = isCountry ? '"admin_level"="2"' : '"admin_level"~"^[4-8]$"';
        
        // Пробуем найти административную единицу по имени
        const simpleQuery = `
            [out:json][timeout:25];
            (
              relation["name"="${query}"]["boundary"="administrative"][${adminLevelPattern}];
              relation["name:ru"="${query}"]["boundary"="administrative"][${adminLevelPattern}];
              relation["alt_name"="${query}"]["boundary"="administrative"][${adminLevelPattern}];
              relation["name:en"="${query}"]["boundary"="administrative"][${adminLevelPattern}];
              relation["name:zh"="${query}"]["boundary"="administrative"][${adminLevelPattern}];
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
            // Ищем relation с границами
            const relation = data.elements.find(el => el.type === 'relation');
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
                        if (validCoords.length > 0) {
                            coordinates.push(validCoords);
                        }
                    }
                });
                return coordinates.length > 0 ? coordinates : null;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Ошибка Overpass запроса:', error);
        return null;
    }
}

// Переменная для хранения текущих слоев границ
let boundaryLayers = [];

// Функция для отображения границ на карте
function displayBoundary(geojson, color = '#3388ff', fillOpacity = 0.2) {
    addDebugLog(`displayBoundary вызвана, тип данных: ${typeof geojson}, isArray: ${Array.isArray(geojson)}`, 'info');
    
    // Очищаем предыдущие слои границ
    boundaryLayers.forEach(layer => map.removeLayer(layer));
    boundaryLayers = [];
    
    if (!geojson) {
        addDebugLog('displayBoundary: geojson пустой', 'warn');
        return;
    }
    
    // Если это массив координат
    if (Array.isArray(geojson)) {
        geojson.forEach((coords) => {
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
                    try {
                        const polygon = L.polygon(validCoords, {
                            color: color,
                            fillColor: color,
                            fillOpacity: fillOpacity,
                            weight: 3
                        });
                        polygon.addTo(map);
                        boundaryLayers.push(polygon);
                        addDebugLog(`Полигон добавлен, точек: ${validCoords.length}`, 'success');
                    } catch (e) {
                        addDebugLog(`Ошибка создания полигона: ${e.message}`, 'error');
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
                            
                            // Создаем отдельный GeoJSON объект для каждого полигона
                            const singlePolygon = {
                                type: 'Polygon',
                                coordinates: normalizedPolygon
                            };
                            
                            const polygonLayer = L.geoJSON(singlePolygon, {
                                style: {
                                    color: color,
                                    fillColor: color,
                                    fillOpacity: fillOpacity,
                                    weight: 3
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
            } else {
                // Для обычных Polygon и других типов используем стандартный метод
                const geoJsonLayer = L.geoJSON(geojson, {
                    style: {
                        color: color,
                        fillColor: color,
                        fillOpacity: fillOpacity,
                        weight: 3
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
    const params = getUrlParams();
    
    // Отладочная информация
    addDebugLog(`Параметры URL: country=${params.country}, city=${params.city}, region=${params.region}`, 'info');
    addDebugLog(`Полный URL: ${window.location.href}`, 'info');
    
    if (!params.country) {
        // Если параметр не указан, показываем Россию по умолчанию
        console.log('Параметр country не указан, показываем Россию по умолчанию');
        params.country = 'Россия';
    }
    
    showLoading(true);
    
    try {
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
            addDebugLog(`Обработка города: ${params.city}`, 'info');
            const cityData = await geocode(params.city, params.country);
            if (cityData) {
                addDebugLog(`Данные города получены: lat=${cityData.lat}, lon=${cityData.lon}`, 'info');
                const boundary = await getBoundaryByQuery(params.city, params.country);
                if (boundary) {
                    addDebugLog('Границы города найдены, отображаем на карте', 'success');
                    displayBoundary(boundary, '#ff6b6b', 0.3);
                    // Ждем немного, чтобы слои успели добавиться, затем масштабируем
                    setTimeout(() => {
                        addDebugLog('Вызываем fitToBounds для города', 'info');
                        fitToBounds(null, 0.5); // 50% padding, используем границы слоев
                    }, 200);
                } else {
                    // Если границы не найдены, показываем страну и ошибку
                    const countryData = await geocode(params.country);
                    if (countryData) {
                        const countryBoundary = await getBoundaryByQuery(params.country);
                        if (countryBoundary) {
                            displayBoundary(countryBoundary, '#3388ff', 0.2);
                            fitToBounds(countryBoundary, 0);
                        } else {
                            if (!safeSetView(countryData.lat, countryData.lon, 6)) {
                                safeSetView(61.5240, 105.3188, 4);
                            }
                        }
                    }
                    showError(`Город "${params.city}" не найден`);
                }
            } else {
                // Показываем страну и ошибку
                const countryData = await geocode(params.country);
                if (countryData) {
                    const countryBoundary = await getBoundaryByQuery(params.country);
                    if (countryBoundary) {
                        displayBoundary(countryBoundary, '#3388ff', 0.2);
                        fitToBounds(countryBoundary, 0);
                    } else {
                        map.setView([countryData.lat, countryData.lon], 6);
                    }
                }
                showError(`Город "${params.city}" не найден`);
            }
        }
        // Случай 3: country + region
        else if (params.region) {
            addDebugLog(`Обработка региона: ${params.region}`, 'info');
            const regionData = await geocode(params.region, params.country);
            if (regionData) {
                addDebugLog(`Данные региона получены: lat=${regionData.lat}, lon=${regionData.lon}`, 'info');
                const boundary = await getBoundaryByQuery(params.region, params.country);
                if (boundary) {
                    addDebugLog('Границы региона найдены, отображаем на карте', 'success');
                    displayBoundary(boundary, '#51cf66', 0.25);
                    // Ждем немного, чтобы слои успели добавиться, затем масштабируем
                    setTimeout(() => {
                        addDebugLog('Вызываем fitToBounds для региона', 'info');
                        fitToBounds(null, 0.6); // 60% padding, используем границы слоев
                    }, 200);
                } else {
                    // Если границы не найдены, показываем страну и ошибку
                    const countryData = await geocode(params.country);
                    if (countryData) {
                        const countryBoundary = await getBoundaryByQuery(params.country);
                        if (countryBoundary) {
                            displayBoundary(countryBoundary, '#3388ff', 0.2);
                            fitToBounds(countryBoundary, 0);
                        } else {
                            if (!safeSetView(countryData.lat, countryData.lon, 6)) {
                                safeSetView(61.5240, 105.3188, 4);
                            }
                        }
                    }
                    showError(`Область "${params.region}" не найдена`);
                }
            } else {
                // Показываем страну и ошибку
                const countryData = await geocode(params.country);
                if (countryData) {
                    const countryBoundary = await getBoundaryByQuery(params.country);
                    if (countryBoundary) {
                        displayBoundary(countryBoundary, '#3388ff', 0.2);
                        fitToBounds(countryBoundary, 0);
                    } else {
                        map.setView([countryData.lat, countryData.lon], 6);
                    }
                }
                showError(`Область "${params.region}" не найдена`);
            }
        }
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
        showLoading(false);
        addDebugLog('Инициализация завершена', 'info');
    }
}

// Запуск при загрузке страницы
window.addEventListener('load', init);
