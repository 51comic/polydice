// 全局变量
let history = JSON.parse(localStorage.getItem('diceHistory')) || [];

// DOM元素
const diceTypes = document.querySelectorAll('.dice-type');
const rollButton = document.getElementById('roll-button');
const resultContainer = document.getElementById('result-container');
const totalResult = document.getElementById('total-result');
const historyContainer = document.getElementById('history-container');
const clearHistoryButton = document.getElementById('clear-history');
const reroll1Checkbox = document.getElementById('reroll-1');
const modifierInput = document.getElementById('modifier');

// 初始化事件监听器
function initEventListeners() {
    // 骰子数量控制
    diceTypes.forEach(diceType => {
        const decreaseBtn = diceType.querySelector('.decrease');
        const increaseBtn = diceType.querySelector('.increase');
        const countElement = diceType.querySelector('.count');

        decreaseBtn.addEventListener('click', () => {
            let count = parseInt(countElement.textContent);
            if (count > 0) {
                countElement.textContent = count - 1;
            }
        });

        increaseBtn.addEventListener('click', () => {
            let count = parseInt(countElement.textContent);
            if (count < 10) { // 限制最大数量为10
                countElement.textContent = count + 1;
            }
        });
    });

    // 投掷按钮
    rollButton.addEventListener('click', rollDice);

    // 清空历史记录
    clearHistoryButton.addEventListener('click', clearHistory);

    // 摇晃设备触发投掷（如果支持）
    if (window.DeviceMotionEvent) {
        let lastTime = 0;
        let shakeThreshold = 15;
        let lastX, lastY, lastZ;

        window.addEventListener('devicemotion', (e) => {
            const currentTime = new Date().getTime();
            if (currentTime - lastTime > 100) {
                const deltaTime = currentTime - lastTime;
                lastTime = currentTime;

                const acceleration = e.accelerationIncludingGravity;
                const currentX = acceleration.x;
                const currentY = acceleration.y;
                const currentZ = acceleration.z;

                if (lastX !== null) {
                    const deltaX = Math.abs(currentX - lastX);
                    const deltaY = Math.abs(currentY - lastY);
                    const deltaZ = Math.abs(currentZ - lastZ);

                    if (deltaX > shakeThreshold || deltaY > shakeThreshold || deltaZ > shakeThreshold) {
                        rollDice();
                    }
                }

                lastX = currentX;
                lastY = currentY;
                lastZ = currentZ;
            }
        });
    }

    // 初始化历史记录
    renderHistory();
}

// 投掷骰子
function rollDice() {
    const results = [];
    let total = 0;
    const reroll1 = reroll1Checkbox.checked;
    const modifier = parseInt(modifierInput.value) || 0;

    // 清空结果容器
    resultContainer.innerHTML = '';

    // 遍历每种骰子类型
    diceTypes.forEach(diceType => {
        const sides = parseInt(diceType.dataset.sides);
        const count = parseInt(diceType.querySelector('.count').textContent);

        if (count > 0) {
            for (let i = 0; i < count; i++) {
                let roll = rollSingleDice(sides, reroll1);
                results.push({ sides, value: roll });
                total += roll;

                // 创建结果元素
                const diceResult = document.createElement('div');
                diceResult.className = `dice-result d${sides}`;
                
                // 特殊处理d20的临界值
                if (sides === 20 && roll === 20) {
                    diceResult.classList.add('critical');
                }
                
                // 为6和9添加区分短线
                if (roll === 6 || roll === 9) {
                    diceResult.innerHTML = `${roll}<span class="dot"></span>`;
                } else {
                    diceResult.textContent = roll;
                }
                
                resultContainer.appendChild(diceResult);
            }
        }
    });

    // 应用修正值
    total += modifier;

    // 显示总结果
    totalResult.textContent = `总结果: ${total}`;

    // 保存到历史记录
    saveToHistory(results, modifier, total);

    // 播放投掷音效（如果支持）
    playRollSound();
}

// 投掷单个骰子
function rollSingleDice(sides, reroll1) {
    let roll = Math.floor(Math.random() * sides) + 1;
    
    // 重投1点规则
    if (reroll1 && roll === 1) {
        roll = Math.floor(Math.random() * sides) + 1;
    }
    
    return roll;
}

// 保存到历史记录
function saveToHistory(results, modifier, total) {
    const rollInfo = {
        timestamp: new Date().toLocaleString(),
        results: results,
        modifier: modifier,
        total: total
    };

    history.unshift(rollInfo); // 添加到历史记录开头
    
    // 限制历史记录数量为20条
    if (history.length > 20) {
        history = history.slice(0, 20);
    }

    // 保存到本地存储
    localStorage.setItem('diceHistory', JSON.stringify(history));

    // 更新历史记录显示
    renderHistory();
}

// 渲染历史记录
function renderHistory() {
    historyContainer.innerHTML = '';

    if (history.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.textContent = '暂无历史记录';
        emptyMessage.style.textAlign = 'center';
        emptyMessage.style.color = '#7f8c8d';
        historyContainer.appendChild(emptyMessage);
        return;
    }

    history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';

        // 构建骰子组合描述
        const diceCounts = {};
        item.results.forEach(result => {
            if (!diceCounts[result.sides]) {
                diceCounts[result.sides] = 0;
            }
            diceCounts[result.sides]++;
        });

        let diceDescription = '';
        Object.entries(diceCounts).forEach(([sides, count]) => {
            diceDescription += `${count}d${sides} `;
        });

        if (item.modifier !== 0) {
            diceDescription += item.modifier > 0 ? `+${item.modifier}` : `${item.modifier}`;
        }

        const rollInfo = document.createElement('div');
        rollInfo.className = 'roll-info';
        rollInfo.textContent = `${item.timestamp} - ${diceDescription} = ${item.total}`;

        const rollResults = document.createElement('div');
        rollResults.className = 'roll-results';
        rollResults.textContent = `结果: ${item.results.map(r => r.value).join(', ')}`;

        historyItem.appendChild(rollInfo);
        historyItem.appendChild(rollResults);
        historyContainer.appendChild(historyItem);
    });
}

// 清空历史记录
function clearHistory() {
    history = [];
    localStorage.removeItem('diceHistory');
    renderHistory();
}

// 播放投掷音效
function playRollSound() {
    // 创建简单的音效
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.5);

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        // 忽略音效错误
    }
}

// 初始化应用
function initApp() {
    initEventListeners();
}

// 启动应用
initApp();