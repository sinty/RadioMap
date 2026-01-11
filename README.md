# RadioMap - Интерактивная карта для радиолюбителей

Веб-приложение на основе OpenStreetMap для отображения географических границ стран, регионов, городов, RDA районов и QTH локаторов.

## Возможности

- **Отображение стран** - показ границ стран с автоматическим масштабированием
- **Отображение городов** - показ границ городов (50% экрана)
- **Отображение регионов** - показ границ регионов/областей (60% экрана)
- **RDA районы** - отображение районов Russian District Award (RDA)
- **QTH локаторы** - отображение квадратов Maidenhead Locator System (до 10 знаков)
- **Маркеры местоположений** - показ точки, если границы не найдены

## Использование

### Параметры URL

#### Страна
```
?country=Россия
```

**Примеры:**
- [Россия](https://sinty.github.io/RadioMap/?country=Россия)
- [Япония](https://sinty.github.io/RadioMap/?country=Япония)
- [Китай](https://sinty.github.io/RadioMap/?country=Китай)
- [США](https://sinty.github.io/RadioMap/?country=США)
- [Германия](https://sinty.github.io/RadioMap/?country=Германия)

#### Страна + Город
```
?country=Россия&city=Москва
```

**Примеры:**
- [Москва, Россия](https://sinty.github.io/RadioMap/?country=Россия&city=Москва)
- [Санкт-Петербург, Россия](https://sinty.github.io/RadioMap/?country=Россия&city=Санкт-Петербург)
- [Токио, Япония](https://sinty.github.io/RadioMap/?country=Япония&city=Токио)
- [Владивосток, Россия](https://sinty.github.io/RadioMap/?country=Россия&city=Владивосток)
- [Новосибирск, Россия](https://sinty.github.io/RadioMap/?country=Россия&city=Новосибирск)
- [Нижний Новгород, Россия](https://sinty.github.io/RadioMap/?country=Россия&city=Нижний%20Новгород)
- [Ростов-на-Дону, Россия](https://sinty.github.io/RadioMap/?country=Россия&city=Ростов-на-Дону)

#### Страна + Регион
```
?country=Россия&region=Московская область
```

**Примеры:**
- [Московская область, Россия](https://sinty.github.io/RadioMap/?country=Россия&region=Московская%20область)
- [Ленинградская область, Россия](https://sinty.github.io/RadioMap/?country=Россия&region=Ленинградская%20область)
- [Краснодарский край, Россия](https://sinty.github.io/RadioMap/?country=Россия&region=Краснодарский%20край)
- [Свердловская область, Россия](https://sinty.github.io/RadioMap/?country=Россия&region=Свердловская%20область)

#### RDA район
```
?rda=CB-54
```

**Примеры:**
- [CB-54 (Москва)](https://sinty.github.io/RadioMap/?rda=CB-54)
- [SP-01 (Санкт-Петербург)](https://sinty.github.io/RadioMap/?rda=SP-01)
- [KL-01 (Калининград)](https://sinty.github.io/RadioMap/?rda=KL-01)
- [NO-01 (Новосибирск)](https://sinty.github.io/RadioMap/?rda=NO-01)

#### QTH локатор
```
?qth=KO85SP
```

**Примеры:**
- [KO85SP (Москва, 6 символов)](https://sinty.github.io/RadioMap/?qth=KO85SP)
- [KO85SP47IR (Москва, 10 символов)](https://sinty.github.io/RadioMap/?qth=KO85SP47IR)
- [KO85 (Москва, 4 символа)](https://sinty.github.io/RadioMap/?qth=KO85)
- [KO85SP12 (Москва, 8 символов)](https://sinty.github.io/RadioMap/?qth=KO85SP12)
- [UN78 (Новосибирск)](https://sinty.github.io/RadioMap/?qth=UN78)
- [KN29 (Санкт-Петербург)](https://sinty.github.io/RadioMap/?qth=KN29)

#### Комбинации
```
?country=Швеция&city=Гетеборг
?qth=KO85SP47IR
```

**Примеры:**
- [Гетеборг, Швеция](https://sinty.github.io/RadioMap/?country=Швеция&city=Гетеборг)
- [Стокгольм, Швеция](https://sinty.github.io/RadioMap/?country=Швеция&city=Стокгольм)

## Технологии

- **OpenStreetMap** - картографические данные
- **Leaflet.js** - библиотека для интерактивных карт
- **Nominatim API** - геокодинг и поиск границ
- **Overpass API** - запросы к данным OpenStreetMap

## Установка

### Использование с GitHub

После загрузки репозитория на GitHub, страницу можно открыть через:

1. **GitHub Pages** (рекомендуется):
   - Перейдите в Settings → Pages
   - Выберите источник: Deploy from a branch
   - Выберите ветку: `master` (или `main`)
   - Выберите папку: `/ (root)`
   - Сохраните и откройте `https://ваш-username.github.io/RadioMap/`

2. **Прямая ссылка через raw.githack.com**:
   ```
   https://raw.githack.com/ваш-username/RadioMap/master/index.html
   ```

3. **Локальный запуск**:
   Для работы с `file:///` протоколом рекомендуется использовать локальный сервер:

   ```bash
   # Python 3
   python -m http.server 8000

   # Node.js (http-server)
   npx http-server
   ```

   Затем откройте `http://localhost:8000/index.html`

## Структура проекта

```
RadioMap/
├── index.html          # Главная HTML страница
├── app.js              # Основная логика приложения
├── rda_data.js         # Встроенные данные RDA районов
├── rda_rus.txt         # Исходные данные RDA районов
├── create_rda_data.py  # Скрипт для генерации rda_data.js
└── README.md           # Этот файл
```

## Особенности

- **Работа без сервера** - все данные RDA встроены в JavaScript
- **Поддержка кириллицы** - корректная обработка русских названий
- **Нормализация координат** - правильное отображение областей, пересекающих 180° меридиан
- **Обработка ошибок** - информативные сообщения об ошибках
- **Панель отладки** - встроенная система логирования

## Форматы QTH локаторов

- **2 символа** (поле): 20° × 10°
- **4 символа** (квадрат): 2° × 1°
- **6 символов** (подквадрат): 5' × 2.5'
- **8 символов** (расширенный): 30" × 15"
- **10 символов** (супер-расширенный): 3" × 1.5"

## Лицензия

Проект использует данные OpenStreetMap, которые распространяются под лицензией ODbL.

## Автор

Разработано для радиолюбительского сообщества.
