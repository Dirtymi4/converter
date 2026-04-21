let selectedFile = null;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const convertBtn = document.getElementById('convertBtn');
const status = document.getElementById('status');

// Обработчики событий
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
});

function handleFile(file) {
    const validExtensions = ['.tex', '.txt'];
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.includes(extension)) {
        showStatus('❌ Пожалуйста, выберите файл .tex или .txt', 'error');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        showStatus('❌ Файл слишком большой (макс. 10 MB)', 'error');
        return;
    }
    
    selectedFile = file;
    fileInfo.innerHTML = `
        <strong>✅ Выбран файл:</strong><br>
        📄 ${file.name}<br>
        📊 Размер: ${(file.size / 1024).toFixed(2)} KB
    `;
    fileInfo.classList.add('show');
    convertBtn.disabled = false;
    hideStatus();
}

function showStatus(message, type) {
    status.textContent = message;
    status.className = 'status show ' + type;
}

function hideStatus() {
    status.classList.remove('show');
}

function cleanLatexText(text) {
    // Извлекаем содержимое document
    const docMatch = text.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
    let content = docMatch ? docMatch[1] : text;
    
    // Удаляем maketitle
    content = content.replace(/\\maketitle\s*/gi, '');
    
    // Заголовки
    content = content.replace(/\\section\*?\{([^}]*)\}/gi, '\n\n$1\n\n');
    content = content.replace(/\\subsection\*?\{([^}]*)\}/gi, '\n\n$1\n\n');
    content = content.replace(/\\subsubsection\*?\{([^}]*)\}/gi, '\n\n$1\n\n');
    
    // Форматирование текста
    content = content.replace(/\\(textbf|textit|underline|emph|texttt)\{([^}]*)\}/gi, '$2');
    
    // Списки itemize
    content = content.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/gi, (match, items) => {
        const listItems = items.split('\\item')
            .filter(item => item.trim())
            .map(item => '• ' + item.trim());
        return '\n' + listItems.join('\n') + '\n';
    });
    
    // Списки enumerate
    content = content.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/gi, (match, items) => {
        let counter = 1;
        const listItems = items.split('\\item')
            .filter(item => item.trim())
            .map(item => (counter++) + '. ' + item.trim());
        return '\n' + listItems.join('\n') + '\n';
    });
    
    // Математика
    content = content.replace(/\$\$([\s\S]*?)\$\$/g, '[$1]');
    content = content.replace(/\$([^$]+)\$/g, '[$1]');
    content = content.replace(/\\\[([\s\S]*?)\\\]/g, '[$1]');
    content = content.replace(/\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/gi, '[$1]');
    
    // Таблицы и рисунки
    content = content.replace(/\\begin\{table\}[\s\S]*?\\end\{table\}/gi, '[Таблица]');
    content = content.replace(/\\begin\{figure\}[\s\S]*?\\end\{figure\}/gi, '[Рисунок]');
    content = content.replace(/\\includegraphics(?:\[[^\]]*\])?\{([^}]*)\}/gi, '[Рисунок: $1]');
    
    // Удаление оставшихся команд
    content = content.replace(/\\[a-zA-Z]+(\{[^}]*\})?/g, '');
    content = content.replace(/[{}&]/g, '');
    content = content.replace(/\\\\/g, '\n');
    content = content.replace(/\\hline/gi, '');
    content = content.replace(/\\centering/gi, '');
    content = content.replace(/\\caption\{([^}]*)\}/gi, '($1)');
    
    // Чистка пробелов
    content = content.replace(/\n{3,}/g, '\n\n');
    content = content.replace(/^\s+|\s+$/g, '');
    
    return content || 'Документ пуст';
}

convertBtn.addEventListener('click', () => {
    if (!selectedFile) return;
    
    convertBtn.disabled = true;
    const originalHTML = convertBtn.innerHTML;
    convertBtn.innerHTML = '<span class="spinner"></span>Конвертация...';
    showStatus('⏳ Обработка файла...', 'info');
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const text = e.target.result;
            
            // Извлекаем заголовок
            let title = selectedFile.name.replace(/\.(tex|txt)$/, '');
            const titleMatch = text.match(/\\title\{([^}]*)\}/);
            if (titleMatch) title = titleMatch[1].replace(/[{}]/g, '').trim();
            
            // Извлекаем автора
            let author = 'СФЕРА';
            const authorMatch = text.match(/\\author\{([^}]*)\}/);
            if (authorMatch) author = authorMatch[1].replace(/[{}]/g, '').trim();
            
            // Очищаем текст
            const cleanedText = cleanLatexText(text);
            const date = new Date().toLocaleDateString('ru-RU');
            
            // Формируем HTML для Word
            const paragraphs = cleanedText.split('\n\n').map(para => {
                para = para.trim();
                if (!para) return '';
                
                // Проверка на список
                if (para.includes('• ') && para.split('\n').every(l => l.trim().startsWith('• '))) {
                    const items = para.split('\n').map(l => l.replace(/^• /, '').trim());
                    return '<ul>' + items.map(i => '<li>' + i + '</li>').join('') + '</ul>';
                }
                
                // Нумерованный список
                if (para.match(/^\d+\. /) && para.split('\n').every(l => l.trim().match(/^\d+\. /))) {
                    const items = para.split('\n').map(l => l.replace(/^\d+\. /, '').trim());
                    return '<ol>' + items.map(i => '<li>' + i + '</li>').join('') + '</ol>';
                }
                
                return '<p style="text-indent: 1.25cm; text-align: justify;">' + para.replace(/\n/g, '<br>') + '</p>';
            }).join('\n');
            
            const wordHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 14pt;
            line-height: 1.5;
            margin: 2.54cm 2cm 2cm 2cm;
            color: #000000;
        }
        h1 {
            font-size: 24pt;
            font-weight: bold;
            text-align: center;
            margin-bottom: 10pt;
        }
        .subtitle {
            text-align: center;
            color: #666666;
            border-bottom: 1px solid #cccccc;
            padding-bottom: 15pt;
            margin-bottom: 20pt;
            font-size: 12pt;
        }
        h2 {
            font-size: 18pt;
            font-weight: bold;
            margin-top: 20pt;
            margin-bottom: 10pt;
        }
        h3 {
            font-size: 16pt;
            font-weight: bold;
            margin-top: 16pt;
            margin-bottom: 8pt;
        }
        p {
            margin: 0 0 10pt 0;
        }
        ul, ol {
            margin: 10pt 0;
            padding-left: 30pt;
        }
        li {
            margin: 4pt 0;
        }
        .footer {
            margin-top: 30pt;
            text-align: center;
            color: #999999;
            font-size: 10pt;
            border-top: 1px solid #cccccc;
            padding-top: 10pt;
        }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <div class="subtitle">${author} • ${date}</div>
    ${paragraphs}
    <div class="footer">
        Создано в СФЕРА - Российский LaTeX редактор<br>
        Курсовой проект • Саакова В.А • 2026
    </div>
</body>
</html>`;
            
            // Создаём и скачиваем DOCX (на самом деле .doc, но Word открывает)
            const blob = new Blob([wordHtml], { type: 'application/msword;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = title.replace(/[^a-zA-Zа-яА-Я0-9\s]/g, '_') + '.doc';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showStatus('✅ Конвертация завершена! Файл скачан.', 'success');
            
        } catch (error) {
            console.error('Ошибка:', error);
            showStatus('❌ Ошибка: ' + error.message, 'error');
        } finally {
            convertBtn.disabled = false;
            convertBtn.innerHTML = originalHTML;
        }
    };
    
    reader.onerror = () => {
        showStatus('❌ Ошибка чтения файла', 'error');
        convertBtn.disabled = false;
        convertBtn.innerHTML = originalHTML;
    };
    
    reader.readAsText(selectedFile, 'UTF-8');
});