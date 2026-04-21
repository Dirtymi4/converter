let selectedFile = null;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const convertBtn = document.getElementById('convertBtn');
const status = document.getElementById('status');

uploadArea.addEventListener('click', function() {
    fileInput.click();
});

uploadArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    uploadArea.style.borderColor = '#2C6BFF';
    uploadArea.style.background = 'rgba(44, 107, 255, 0.05)';
});

uploadArea.addEventListener('dragleave', function() {
    uploadArea.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    uploadArea.style.background = '#0A0C0F';
});

uploadArea.addEventListener('drop', function(e) {
    e.preventDefault();
    uploadArea.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    uploadArea.style.background = '#0A0C0F';
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
});

fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) handleFile(file);
});

function handleFile(file) {
    if (!file.name.endsWith('.tex')) {
        showStatus('❌ Пожалуйста, выберите файл .tex', 'error');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        showStatus('❌ Файл слишком большой (макс. 10 MB)', 'error');
        return;
    }
    
    selectedFile = file;
    fileInfo.innerHTML = '<strong>✅ Выбран файл:</strong><br>📄 ' + file.name + '<br>📊 Размер: ' + (file.size / 1024).toFixed(2) + ' KB';
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
    const docMatch = text.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
    let content = docMatch ? docMatch[1] : text;
    
    content = content.replace(/\\maketitle\s*/g, '');
    content = content.replace(/\\section\*?\{(.*?)\}/g, '\n\n$1\n\n');
    content = content.replace(/\\subsection\*?\{(.*?)\}/g, '\n\n$1\n\n');
    content = content.replace(/\\subsubsection\*?\{(.*?)\}/g, '\n\n$1\n\n');
    content = content.replace(/\\textbf\{((?:[^{}]|\{[^{}]*\})*)\}/g, '$1');
    content = content.replace(/\\textit\{((?:[^{}]|\{[^{}]*\})*)\}/g, '$1');
    content = content.replace(/\\underline\{((?:[^{}]|\{[^{}]*\})*)\}/g, '$1');
    content = content.replace(/\\emph\{((?:[^{}]|\{[^{}]*\})*)\}/g, '$1');
    content = content.replace(/\\texttt\{((?:[^{}]|\{[^{}]*\})*)\}/g, '$1');
    
    content = content.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, function(match, items) {
        return items.split('\\item').filter(function(item) {
            return item.trim();
        }).map(function(item) {
            return '• ' + item.trim();
        }).join('\n');
    });
    
    content = content.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, function(match, items) {
        let counter = 1;
        return items.split('\\item').filter(function(item) {
            return item.trim();
        }).map(function(item) {
            return (counter++) + '. ' + item.trim();
        }).join('\n');
    });
    
    content = content.replace(/\$\$([\s\S]*?)\$\$/g, '[$1]');
    content = content.replace(/\$([^$]+)\$/g, '[$1]');
    content = content.replace(/\\\[([\s\S]*?)\\\]/g, '[$1]');
    content = content.replace(/\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g, '[$1]');
    content = content.replace(/\\begin\{table\}[\s\S]*?\\end\{table\}/g, '[Таблица]');
    content = content.replace(/\\begin\{figure\}[\s\S]*?\\end\{figure\}/g, '[Рисунок]');
    content = content.replace(/\\[a-zA-Z]+(\{[^}]*\})?/g, '');
    content = content.replace(/[{}&]/g, '');
    content = content.replace(/\\\\/g, '\n');
    content = content.replace(/\\hline/g, '');
    content = content.replace(/\n{3,}/g, '\n\n');
    content = content.trim();
    
    return content || 'Документ пуст';
}

convertBtn.addEventListener('click', function() {
    if (!selectedFile) return;
    
    convertBtn.disabled = true;
    const originalText = convertBtn.textContent;
    convertBtn.innerHTML = '<span class="spinner"></span>Конвертация...';
    showStatus('⏳ Обработка файла...', 'info');
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const text = e.target.result;
            
            let title = selectedFile.name.replace('.tex', '');
            const titleMatch = text.match(/\\title\{((?:[^{}]|\{[^{}]*\})*)\}/);
            if (titleMatch) title = titleMatch[1].replace(/[{}]/g, '');
            
            let author = 'СФЕРА';
            const authorMatch = text.match(/\\author\{((?:[^{}]|\{[^{}]*\})*)\}/);
            if (authorMatch) author = authorMatch[1].replace(/[{}]/g, '');
            
            const cleanedText = cleanLatexText(text);
            const date = new Date().toLocaleDateString('ru-RU');
            
            const wordHtml = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + title + '</title><style>body{font-family:"Times New Roman",Times,serif;font-size:14pt;line-height:1.5;margin:2cm 2cm 2cm 2cm;color:#000;}h1{font-size:24pt;font-weight:bold;text-align:center;margin-bottom:10pt;}.subtitle{text-align:center;color:#666;border-bottom:1px solid #ccc;padding-bottom:15pt;margin-bottom:20pt;}h2{font-size:18pt;font-weight:bold;margin-top:20pt;margin-bottom:10pt;}p{margin:0 0 10pt 0;text-align:justify;text-indent:1.25cm;}.footer{margin-top:30pt;text-align:center;color:#999;font-size:10pt;border-top:1px solid #ccc;padding-top:10pt;}</style></head><body><h1>' + title + '</h1><div class="subtitle">' + author + ' • ' + date + '</div>' + cleanedText.split('\n\n').map(function(para) { return '<p>' + para.replace(/\n/g, '<br>') + '</p>'; }).join('\n') + '<div class="footer">Создано в СФЕРА - Российский LaTeX редактор</div></body></html>';
            
            const blob = new Blob([wordHtml], { type: 'application/msword;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = title.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_') + '.doc';
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
            convertBtn.textContent = originalText;
        }
    };
    
    reader.onerror = function() {
        showStatus('❌ Ошибка чтения файла', 'error');
        convertBtn.disabled = false;
        convertBtn.textContent = originalText;
    };
    
    reader.readAsText(selectedFile);
});