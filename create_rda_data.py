#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import codecs

# Пробуем разные кодировки
encodings = ['utf-8', 'cp1251', 'windows-1251', 'latin-1']
content = None

for encoding in encodings:
    try:
        with open('rda_rus.txt', 'r', encoding=encoding) as f:
            content = f.read()
        print(f"Файл прочитан с кодировкой: {encoding}")
        break
    except (UnicodeDecodeError, LookupError):
        continue

if content is None:
    # Последняя попытка - читаем как бинарный и декодируем с ошибками
    with open('rda_rus.txt', 'rb') as f:
        raw = f.read()
    content = raw.decode('cp1251', errors='ignore')
    print("Файл прочитан с кодировкой cp1251 (с игнорированием ошибок)")

# Экранируем для JavaScript строки
escaped = content.replace('\\', '\\\\').replace('\n', '\\n').replace('\r', '').replace("'", "\\'").replace('"', '\\"')

# Создаем JS файл
js_content = f"// Данные RDA районов (автоматически сгенерировано)\nconst RDA_DATA = '{escaped}';\n"

with open('rda_data.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"Создан файл rda_data.js, размер: {len(js_content)} символов")
