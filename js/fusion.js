const STATE_LABELS = {
    1: '饥饿乞食',
    2: '警惕警告',
    3: '心情愉悦',
    4: '无聊求玩',
    5: '标记领地'
};

const STATE_ICONS = {
    1: '🍚',
    2: '⚠️',
    3: '😊',
    4: '🎾',
    5: '🏠'
};

const STATE_SUGGESTIONS = {
    1: '🍚 快去给猫咪准备食物吧！',
    2: '⚠️ 保持距离，让猫咪安静一下',
    3: '😊 猫咪很开心，继续保持！',
    4: '🎾 陪猫咪玩一会儿游戏吧！',
    5: '🏠 猫咪在标记领地，这是正常行为'
};

const STATE_COLORS = {
    1: '#FFE4B5',
    2: '#FF6B6B',
    3: '#77DD77',
    4: '#F0E68C',
    5: '#DDA0DD'
};

function fuseResults(imageResult, audioResult) {
    const weights = {
        image: imageResult ? 0.5 : 0,
        audio: audioResult ? 0.5 : 0
    };

    const scores = [0, 0, 0, 0, 0];

    if (imageResult && imageResult.probabilities) {
        imageResult.probabilities.forEach((prob, idx) => {
            scores[idx] += prob * weights.image;
        });
    }

    if (audioResult && audioResult.probabilities) {
        audioResult.probabilities.forEach((prob, idx) => {
            scores[idx] += prob * weights.audio;
        });
    }

    const maxIdx = scores.indexOf(Math.max(...scores));
    return {
        stateId: maxIdx + 1,
        stateName: STATE_LABELS[maxIdx + 1],
        stateIcon: STATE_ICONS[maxIdx + 1],
        suggestion: STATE_SUGGESTIONS[maxIdx + 1],
        color: STATE_COLORS[maxIdx + 1],
        confidence: scores[maxIdx],
        scores: scores,
        source: getSourceLabel(imageResult, audioResult)
    };
}

function getSourceLabel(imageResult, audioResult) {
    if (imageResult && audioResult) {
        return '融合识别';
    } else if (imageResult) {
        return '图片识别';
    } else if (audioResult) {
        return '音频识别';
    }
    return '未知';
}

function getStateInfo(stateId) {
    return {
        name: STATE_LABELS[stateId],
        icon: STATE_ICONS[stateId],
        suggestion: STATE_SUGGESTIONS[stateId],
        color: STATE_COLORS[stateId]
    };
}