---
name: Хранить память в working directory
description: Память проекта должна храниться внутри /workspaces/edu-tools/.claude/memory/, а не в домашней директории
type: feedback
---

Сохранять файлы памяти в `/workspaces/edu-tools/.claude/memory/`, а не в `/home/codespace/.claude/projects/`.

**Why:** Проект работает в GitHub Codespace, которое может быть перезагружено. Домашняя директория не сохраняется между перезапусками, а working directory — сохраняется.

**How to apply:** При создании/обновлении файлов памяти всегда использовать путь `/workspaces/edu-tools/.claude/memory/`.
