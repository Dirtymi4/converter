let selectedFile = null;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const convertBtn = document.getElementById('convertBtn');
const status = document.getElementById('status');
const btnText = convertBtn.querySelector('.btn-text') || convertBtn;

const API_URL = 'http://localhost:5000/convert';

uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#2C6BFF';
    uploadArea.style.background = 'rgba(44, 107, 255, 0.05)';
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    uploadArea.style.background = '#0A0C0F';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    uploadArea.style.background = '#0A0C0F';
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
});

function handleFile(file) {
    if (!file.name.endsWith('.tex')) {
        showStatus('❌ Пожалуйста, выберите файл .tex', 'error');
        return;
    }
    
    if (file.size > 20 * 1024 * 1024) {
        showStatus('❌ Файл слишком большой (макс. 20 MB)', 'error');
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

convertBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    
    const useReferences = document.getElementById('useReferences')?.checked || true;
    
    convertBtn.disabled = true;
    const originalHTML = convertBtn.innerHTML;
    convertBtn.innerHTML = '<span class="spinner"></span>Конвертация через Pandoc...';
    showStatus('⏳ Профессиональная конвертация с формулами...', 'info');
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('references', useReferences);
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Ошибка сервера');
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = selectedFile.name.replace('.tex', '.docx');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showStatus('✅ Конвертация завершена! Файл DOCX с редактируемыми формулами скачан.', 'success');
        
    } catch (error) {
        console.error('Ошибка:', error);
        
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showStatus('❌ Сервер не запущен. Запустите: python converter.py', 'error');
        } else {
            showStatus('❌ Ошибка: ' + error.message, 'error');
        }
    } finally {
        convertBtn.disabled = false;
        convertBtn.innerHTML = originalHTML;
    }
});