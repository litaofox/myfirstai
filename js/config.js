const CONFIG = {
    platform: 'demo',
    easyDL: {
        apiKey: '',
        secretKey: '',
        imageApiUrl: '',
        audioApiUrl: ''
    },
    tensorflow: {
        imageModelPath: 'models/image-model/model.json',
        audioModelPath: 'models/audio-model/model.json'
    },
    demo: {
        delay: 1500,
        probabilityRange: [0.6, 0.95]
    }
};