class ModelService {
    constructor() {
        this.isDemoMode = true;
        this.imageModel = null;
        this.audioModel = null;
        this.token = null;
        this.tokenExpireTime = 0;
    }

    setDemoMode(isDemo) {
        this.isDemoMode = isDemo;
    }

    async predictImage(imageData) {
        if (this.isDemoMode) {
            return this.generateMockResult();
        }

        if (CONFIG.platform === 'easydl') {
            return this.callEasyDLImageAPI(imageData);
        } else if (CONFIG.platform === 'tensorflow') {
            return this.callTensorFlowImageModel(imageData);
        }

        return this.generateMockResult();
    }

    async predictAudio(audioData) {
        if (this.isDemoMode) {
            return this.generateMockResult();
        }

        if (CONFIG.platform === 'easydl') {
            return this.callEasyDLAudioAPI(audioData);
        } else if (CONFIG.platform === 'tensorflow') {
            return this.callTensorFlowAudioModel(audioData);
        }

        return this.generateMockResult();
    }

    generateMockResult() {
        return new Promise((resolve) => {
            setTimeout(() => {
                const probabilities = this.generateProbabilities();
                const maxIdx = probabilities.indexOf(Math.max(...probabilities));
                resolve({
                    success: true,
                    stateId: maxIdx + 1,
                    probabilities: probabilities
                });
            }, CONFIG.demo.delay);
        });
    }

    generateProbabilities() {
        const range = CONFIG.demo.probabilityRange;
        const probabilities = [];
        let total = 0;

        for (let i = 0; i < 5; i++) {
            const prob = Math.random() * (range[1] - range[0]) + range[0];
            probabilities.push(prob);
            total += prob;
        }

        return probabilities.map(p => p / total);
    }

    async callEasyDLImageAPI(imageData) {
        try {
            if (!this.validateEasyDLConfig()) {
                console.warn('EasyDL配置不完整，使用演示模式');
                return this.generateMockResult();
            }

            const token = await this.getEasyDLToken();
            const base64Image = imageData.split(',')[1];
            
            const response = await fetch('https://aip.baidubce.com/rpc/2.0/ai_custom/v1/classification/cat_emotion_image', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image: base64Image
                })
            });

            const result = await response.json();
            return this.parseEasyDLResult(result);
        } catch (error) {
            console.error('EasyDL Image API error:', error);
            return this.generateMockResult();
        }
    }

    async callEasyDLAudioAPI(audioData) {
        try {
            if (!this.validateEasyDLConfig()) {
                console.warn('EasyDL配置不完整，使用演示模式');
                return this.generateMockResult();
            }

            const token = await this.getEasyDLToken();
            const base64Audio = await this.blobToBase64(audioData);

            const response = await fetch('https://aip.baidubce.com/rpc/2.0/ai_custom/v1/sound/cat_emotion_audio', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sound: base64Audio
                })
            });

            const result = await response.json();
            return this.parseEasyDLResult(result);
        } catch (error) {
            console.error('EasyDL Audio API error:', error);
            return this.generateMockResult();
        }
    }

    validateEasyDLConfig() {
        return CONFIG.easyDL.apiKey && CONFIG.easyDL.secretKey;
    }

    async getEasyDLToken() {
        const now = Date.now();
        if (this.token && now < this.tokenExpireTime) {
            return this.token;
        }

        const response = await fetch('https://aip.baidubce.com/oauth/2.0/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `grant_type=client_credentials&client_id=${CONFIG.easyDL.apiKey}&client_secret=${CONFIG.easyDL.secretKey}`
        });

        const result = await response.json();
        
        if (result.access_token) {
            this.token = result.access_token;
            this.tokenExpireTime = now + (result.expires_in || 3600) * 1000 - 60000;
            return this.token;
        }

        throw new Error('获取Token失败: ' + JSON.stringify(result));
    }

    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    parseEasyDLResult(result) {
        if (result && result.results) {
            const probabilities = [0, 0, 0, 0, 0];
            result.results.forEach(item => {
                const label = item.name || item.label;
                const score = item.score || 0;
                
                const labelMap = {
                    '饥饿乞食': 0,
                    '警惕警告': 1,
                    '心情愉悦': 2,
                    '无聊求玩': 3,
                    '标记领地': 4,
                    '1': 0,
                    '2': 1,
                    '3': 2,
                    '4': 3,
                    '5': 4
                };

                const idx = labelMap[label];
                if (idx !== undefined && idx >= 0 && idx < 5) {
                    probabilities[idx] = score;
                }
            });

            const total = probabilities.reduce((sum, p) => sum + p, 0);
            const normalized = total > 0 ? probabilities.map(p => p / total) : [0.2, 0.2, 0.2, 0.2, 0.2];

            const maxIdx = normalized.indexOf(Math.max(...normalized));
            return {
                success: true,
                stateId: maxIdx + 1,
                probabilities: normalized
            };
        }

        return this.generateMockResult();
    }

    async loadTensorFlowModels() {
        if (typeof tf === 'undefined') {
            console.error('TensorFlow.js not loaded');
            return false;
        }

        try {
            this.imageModel = await tf.loadLayersModel(CONFIG.tensorflow.imageModelPath);
            this.audioModel = await tf.loadLayersModel(CONFIG.tensorflow.audioModelPath);
            return true;
        } catch (error) {
            console.error('Model loading error:', error);
            return false;
        }
    }

    async callTensorFlowImageModel(imageData) {
        if (!this.imageModel) {
            await this.loadTensorFlowModels();
        }

        if (!this.imageModel) {
            return this.generateMockResult();
        }

        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = imageData;

            await new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
            });

            const tensor = tf.browser.fromPixels(img)
                .resizeNearestNeighbor([224, 224])
                .toFloat()
                .div(tf.scalar(255))
                .expandDims();

            const prediction = this.imageModel.predict(tensor);
            const probabilities = await prediction.data();

            tf.dispose([tensor, prediction]);

            const maxIdx = Array.from(probabilities).indexOf(Math.max(...probabilities));
            return {
                success: true,
                stateId: maxIdx + 1,
                probabilities: Array.from(probabilities)
            };
        } catch (error) {
            console.error('TensorFlow prediction error:', error);
            return this.generateMockResult();
        }
    }

    async callTensorFlowAudioModel(audioData) {
        if (!this.audioModel) {
            await this.loadTensorFlowModels();
        }

        if (!this.audioModel) {
            return this.generateMockResult();
        }

        try {
            const audioBuffer = await this.decodeAudioData(audioData);
            const features = this.extractAudioFeatures(audioBuffer);

            const tensor = tf.tensor2d(features, [1, features.length]);
            const prediction = this.audioModel.predict(tensor);
            const probabilities = await prediction.data();

            tf.dispose([tensor, prediction]);

            const maxIdx = Array.from(probabilities).indexOf(Math.max(...probabilities));
            return {
                success: true,
                stateId: maxIdx + 1,
                probabilities: Array.from(probabilities)
            };
        } catch (error) {
            console.error('Audio prediction error:', error);
            return this.generateMockResult();
        }
    }

    async decodeAudioData(audioBlob) {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        return audioContext.decodeAudioData(arrayBuffer);
    }

    extractAudioFeatures(audioBuffer) {
        const rawData = audioBuffer.getChannelData(0);
        const samples = 4096;
        const blockSize = Math.floor(rawData.length / samples);
        const features = [];

        for (let i = 0; i < samples; i++) {
            const start = i * blockSize;
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
                sum += Math.abs(rawData[start + j]);
            }
            features.push(sum / blockSize);
        }

        return features;
    }
}

const modelService = new ModelService();