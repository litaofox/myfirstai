document.addEventListener('DOMContentLoaded', () => {
    initCatSelector();
    initImageUpload();
    initAudioRecording();
    initResultSection();
    initCatsSection();
    initHistorySection();
    initDemoMode();
});

let imageData = null;
let audioData = null;
let imageResult = null;
let audioResult = null;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let audioBlob = null;
let audioUrl = null;
let currentCat = 'cola';

const CAT_INFO = {
    cola: { name: '可乐', emoji: '🥤' },
    caocao: { name: '草草', emoji: '🌿' },
    other: { name: '其他猫咪', emoji: '❓' }
};

function initCatSelector() {
    const catTabs = document.querySelectorAll('.cat-tab');
    console.log('Found cat tabs:', catTabs.length);
    
    catTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            catTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCat = tab.dataset.cat;
            
            console.log('Selected cat:', currentCat);
            
            updateCatIndicator();
        });
    });
    
    updateCatIndicator();
}

function updateCatIndicator() {
    const catInfo = CAT_INFO[currentCat];
    const indicator = document.getElementById('catIndicator');
    if (indicator) {
        indicator.textContent = `${catInfo.emoji} ${catInfo.name}`;
    }
}

function initImageUpload() {
    const uploadArea = document.getElementById('imageUploadArea');
    const fileInput = document.getElementById('imageFileInput');
    const uploadBtn = document.getElementById('imageUploadBtn');
    const previewArea = document.getElementById('imagePreviewArea');
    const previewImg = document.getElementById('imagePreview');
    const removeBtn = document.getElementById('removeImageBtn');
    const predictBtn = document.getElementById('imagePredictBtn');

    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        handleImageFile(e.target.files[0]);
    });

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
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file);
        }
    });

    removeBtn.addEventListener('click', () => {
        imageData = null;
        imageResult = null;
        previewArea.style.display = 'none';
        previewImg.src = '';
        fileInput.value = '';
        predictBtn.disabled = true;
        updateFusionResult();
    });

    predictBtn.addEventListener('click', async () => {
        if (!imageData) return;
        showLoading(true);
        try {
            imageResult = await modelService.predictImage(imageData);
            updateFusionResult();
        } catch (error) {
            console.error('Image prediction error:', error);
        } finally {
            showLoading(false);
        }
    });

    function handleImageFile(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            imageData = e.target.result;
            previewImg.src = imageData;
            previewArea.style.display = 'block';
            predictBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }
}

function initAudioRecording() {
    const recordBtn = document.getElementById('recordBtn');
    const audioUploadBtn = document.getElementById('audioUploadBtn');
    const audioFileInput = document.getElementById('audioFileInput');
    const waveformArea = document.getElementById('waveformArea');
    const playBtn = document.getElementById('playAudioBtn');
    const removeBtn = document.getElementById('removeAudioBtn');
    const predictBtn = document.getElementById('audioPredictBtn');

    recordBtn.addEventListener('click', toggleRecording);
    audioUploadBtn.addEventListener('click', () => audioFileInput.click());

    audioFileInput.addEventListener('change', (e) => {
        handleAudioFile(e.target.files[0]);
    });

    playBtn.addEventListener('click', playAudio);

    removeBtn.addEventListener('click', () => {
        audioData = null;
        audioBlob = null;
        audioUrl = null;
        audioResult = null;
        waveformArea.style.display = 'none';
        playBtn.disabled = true;
        predictBtn.disabled = true;
        audioFileInput.value = '';
        recordBtn.textContent = '🎤 开始录音';
        recordBtn.classList.remove('recording');
        updateFusionResult();
    });

    predictBtn.addEventListener('click', async () => {
        if (!audioData) return;
        showLoading(true);
        try {
            audioResult = await modelService.predictAudio(audioData);
            updateFusionResult();
        } catch (error) {
            console.error('Audio prediction error:', error);
        } finally {
            showLoading(false);
        }
    });

    async function toggleRecording() {
        if (isRecording) {
            stopRecording();
        } else {
            await startRecording();
        }
    }

    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (e) => {
                audioChunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                audioUrl = URL.createObjectURL(audioBlob);
                audioData = audioBlob;
                waveformArea.style.display = 'block';
                playBtn.disabled = false;
                predictBtn.disabled = false;
                drawWaveform();
            };

            mediaRecorder.start();
            isRecording = true;
            recordBtn.textContent = '⏹️ 停止录音';
            recordBtn.classList.add('recording');
        } catch (error) {
            console.error('Recording error:', error);
            alert('无法访问麦克风，请检查权限设置');
        }
    }

    function stopRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            isRecording = false;
            recordBtn.textContent = '🎤 开始录音';
            recordBtn.classList.remove('recording');
        }
    }

    function handleAudioFile(file) {
        if (!file) return;

        audioBlob = file;
        audioUrl = URL.createObjectURL(file);
        audioData = file;
        waveformArea.style.display = 'block';
        playBtn.disabled = false;
        predictBtn.disabled = false;
        updateAudioDuration(file);
        drawWaveform();
    }

    function playAudio() {
        if (!audioUrl) return;
        const audio = new Audio(audioUrl);
        audio.play();
    }

    function updateAudioDuration(file) {
        const audio = new Audio();
        audio.preload = 'metadata';
        audio.onloadedmetadata = () => {
            const duration = audio.duration;
            const minutes = Math.floor(duration / 60);
            const seconds = Math.floor(duration % 60);
            document.getElementById('audioDuration').textContent =
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };
        audio.src = URL.createObjectURL(file);
    }

    function drawWaveform() {
        const canvas = document.getElementById('waveformCanvas');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#00D4FF';

        for (let i = 0; i < width; i++) {
            const barHeight = Math.random() * height * 0.8 + height * 0.1;
            const x = i;
            const y = (height - barHeight) / 2;
            ctx.fillRect(x, y, 2, barHeight);
        }
    }
}

function initResultSection() {
    const resetBtn = document.getElementById('resetBtn');
    resetBtn.addEventListener('click', () => {
        imageData = null;
        audioData = null;
        imageResult = null;
        audioResult = null;
        document.getElementById('imagePreviewArea').style.display = 'none';
        document.getElementById('waveformArea').style.display = 'none';
        document.getElementById('imagePredictBtn').disabled = true;
        document.getElementById('audioPredictBtn').disabled = true;
        document.getElementById('imageFileInput').value = '';
        document.getElementById('audioFileInput').value = '';
        document.getElementById('playAudioBtn').disabled = true;
        document.getElementById('recordBtn').textContent = '🎤 开始录音';
        document.getElementById('recordBtn').classList.remove('recording');
        updateFusionResult();
    });
}

function updateFusionResult() {
    const result = fuseResults(imageResult, audioResult);
    const catInfo = CAT_INFO[currentCat];

    document.getElementById('resultSource').textContent = `${catInfo.emoji} ${catInfo.name} · ${result.source}`;
    document.getElementById('resultIcon').textContent = result.stateIcon;
    document.getElementById('resultState').textContent = result.stateName;
    document.getElementById('resultSuggestion').textContent = result.suggestion;

    const confidencePercent = Math.round(result.confidence * 100);
    document.querySelector('#confidenceBar .confidence-fill').style.width = `${confidencePercent}%`;
    document.getElementById('confidenceText').textContent = `${confidencePercent}%`;

    const probItems = document.querySelectorAll('.prob-item');
    probItems.forEach((item, idx) => {
        const percent = Math.round(result.scores[idx] * 100);
        item.querySelector('.prob-fill').style.width = `${percent}%`;
        item.querySelector('.prob-value').textContent = `${percent}%`;
    });

    if (imageResult || audioResult) {
        saveToHistory(result);
    }
}

function initCatsSection() {
    const catBtns = document.querySelectorAll('.cat-action-btn');
    catBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const catId = e.target.dataset.cat;
            const catTabs = document.querySelectorAll('.cat-tab');
            catTabs.forEach(tab => {
                if (tab.dataset.cat === catId) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
            currentCat = catId;

            const imgSrc = catId === 'cola' ? 'assets/可乐.jpg' : 'assets/草草.jpg';

            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                imageData = canvas.toDataURL('image/jpeg');

                document.getElementById('imagePreview').src = imageData;
                document.getElementById('imagePreviewArea').style.display = 'block';
                document.getElementById('imagePredictBtn').disabled = false;

                showLoading(true);
                modelService.predictImage(imageData).then(result => {
                    imageResult = result;
                    updateFusionResult();
                    showLoading(false);
                });
            };
            img.src = imgSrc;
        });
    });
}

function initHistorySection() {
    const clearBtn = document.getElementById('clearHistoryBtn');
    clearBtn.addEventListener('click', () => {
        localStorage.removeItem('catEmotionHistory');
        renderHistory();
    });

    renderHistory();
}

function saveToHistory(result) {
    const catInfo = CAT_INFO[currentCat];
    const history = JSON.parse(localStorage.getItem('catEmotionHistory') || '[]');
    const newItem = {
        id: Date.now(),
        catId: currentCat,
        catName: catInfo.name,
        catEmoji: catInfo.emoji,
        stateId: result.stateId,
        stateName: result.stateName,
        stateIcon: result.stateIcon,
        confidence: result.confidence,
        source: result.source,
        timestamp: Date.now()
    };

    history.unshift(newItem);

    if (history.length > 10) {
        history.pop();
    }

    localStorage.setItem('catEmotionHistory', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const history = JSON.parse(localStorage.getItem('catEmotionHistory') || '[]');
    const historyList = document.getElementById('historyList');

    if (history.length === 0) {
        historyList.innerHTML = '<p class="empty-history">暂无识别记录</p>';
        return;
    }

    historyList.innerHTML = history.map(item => {
        const date = new Date(item.timestamp);
        const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        return `
            <div class="history-item">
                <span class="history-cat">${item.catEmoji}</span>
                <span class="history-icon">${item.stateIcon}</span>
                <div class="history-content">
                    <h4>${item.catName} · ${item.stateName}</h4>
                    <p>${item.source} · 置信度 ${Math.round(item.confidence * 100)}%</p>
                </div>
                <span class="history-time">${timeStr}</span>
            </div>
        `;
    }).join('');
}

function initDemoMode() {
    const demoSwitch = document.getElementById('demoMode');
    demoSwitch.addEventListener('change', (e) => {
        modelService.setDemoMode(e.target.checked);
        if (e.target.checked) {
            alert('演示模式已开启，识别结果为模拟数据');
        } else {
            alert('演示模式已关闭，请确保已配置API或加载模型');
        }
    });

    modelService.setDemoMode(demoSwitch.checked);
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
}