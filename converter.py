#!/usr/bin/env python3
"""
СФЕРА - Профессиональный конвертер LaTeX в DOCX
Использует Pandoc для качественной конвертации с OMML формулами
"""

from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import os
import tempfile
import subprocess
import shutil
from pathlib import Path
import uuid

app = Flask(__name__)
CORS(app)

TEMP_DIR = Path(tempfile.gettempdir()) / 'sfera_converter'
TEMP_DIR.mkdir(exist_ok=True)

def check_pandoc():
    """Проверяет наличие Pandoc"""
    return shutil.which('pandoc') is not None

def get_pandoc_version():
    """Получает версию Pandoc"""
    try:
        result = subprocess.run(['pandoc', '--version'], capture_output=True, text=True, timeout=5)
        return result.stdout.split('\n')[0]
    except:
        return "неизвестно"

def convert_latex_to_docx(tex_path, docx_path, use_references=True):
    """
    Конвертирует LaTeX в DOCX через Pandoc с поддержкой OMML формул
    """
    cmd = [
        'pandoc',
        str(tex_path),
        '-o', str(docx_path),
        '--from=latex',
        '--to=docx',
        '--pdf-engine=xelatex',
        '--mathml',  # MathML для формул
        '--standalone',
        '--wrap=preserve',
        '--columns=80'
    ]
    
    if use_references:
        cmd.extend(['--citeproc', '--bibliography=bibliography.bib'])
    
    # Добавляем фильтры для лучшей конвертации
    cmd.extend([
        '--filter', 'pandoc-crossref',
        '--metadata', 'crossrefYaml=crossref.yaml'
    ])
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60,
            cwd=TEMP_DIR
        )
        
        if result.returncode != 0:
            # Пробуем базовую конвертацию без дополнительных фильтров
            basic_cmd = [
                'pandoc',
                str(tex_path),
                '-o', str(docx_path),
                '--from=latex',
                '--to=docx',
                '--mathml',
                '--standalone'
            ]
            
            result = subprocess.run(
                basic_cmd,
                capture_output=True,
                text=True,
                timeout=60,
                cwd=TEMP_DIR
            )
            
            if result.returncode != 0:
                raise Exception(f"Pandoc error: {result.stderr}")
        
        return True
        
    except subprocess.TimeoutExpired:
        raise Exception("Конвертация заняла более 60 секунд")
    except Exception as e:
        raise Exception(f"Ошибка Pandoc: {str(e)}")

@app.route('/convert', methods=['POST'])
def convert():
    """Эндпоинт для конвертации файла"""
    
    if not check_pandoc():
        return jsonify({
            'error': 'Pandoc не установлен. Установите: https://pandoc.org/installing.html'
        }), 500
    
    if 'file' not in request.files:
        return jsonify({'error': 'Файл не загружен'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'Файл не выбран'}), 400
    
    if not file.filename.endswith('.tex'):
        return jsonify({'error': 'Только .tex файлы поддерживаются'}), 400
    
    use_references = request.form.get('references', 'true').lower() == 'true'
    
    try:
        # Создаём уникальную папку для этого запроса
        job_id = str(uuid.uuid4())
        job_dir = TEMP_DIR / job_id
        job_dir.mkdir(exist_ok=True)
        
        tex_path = job_dir / f"document.tex"
        docx_path = job_dir / f"document.docx"
        
        # Сохраняем файл
        file.save(str(tex_path))
        
        # Конвертируем
        convert_latex_to_docx(tex_path, docx_path, use_references)
        
        if not docx_path.exists():
            raise Exception("Файл DOCX не был создан")
        
        # Отправляем файл
        return send_file(
            str(docx_path),
            as_attachment=True,
            download_name=file.filename.replace('.tex', '.docx'),
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        
    finally:
        # Очищаем временные файлы
        try:
            if job_dir.exists():
                shutil.rmtree(job_dir)
        except:
            pass

@app.route('/health', methods=['GET'])
def health():
    """Проверка работоспособности"""
    pandoc_available = check_pandoc()
    return jsonify({
        'status': 'ok',
        'pandoc': {
            'available': pandoc_available,
            'version': get_pandoc_version() if pandoc_available else None
        },
        'server': 'running'
    })

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'service': 'СФЕРА LaTeX to DOCX Converter',
        'version': '2.0',
        'endpoints': {
            '/convert': 'POST - конвертация .tex в .docx',
            '/health': 'GET - проверка состояния'
        }
    })

if __name__ == '__main__':
    print("=" * 60)
    print("СФЕРА - Профессиональный конвертер LaTeX → DOCX")
    print("=" * 60)
    
    if check_pandoc():
        print(f"✅ Pandoc установлен: {get_pandoc_version()}")
        print("   Формулы будут сконвертированы в редактируемый OMML формат")
    else:
        print("❌ Pandoc не установлен!")
        print("   Скачайте: https://pandoc.org/installing.html")
        print("   Или: winget install --id JohnMacFarlane.Pandoc")
    
    print(f"📁 Временные файлы: {TEMP_DIR}")
    print("🚀 Сервер запущен: http://localhost:5000")
    print("=" * 60)
    print("\nНажмите Ctrl+C для остановки\n")
    
    app.run(host='0.0.0.0', port=5000, debug=True)