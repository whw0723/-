// 五子棋游戏逻辑
document.addEventListener('DOMContentLoaded', () => {
    // 棋盘设置
    const BOARD_SIZE = 15; // 15x15的棋盘
    const CELL_SIZE = 40; // 每个格子的大小（像素）
    const WINNING_COUNT = 5; // 获胜所需的连子数

    // 音效设置
    const pieceSound = new Audio('sounds/piece.mp3');
    pieceSound.volume = 0.5; // 设置音量为50%

    // 游戏状态
    const gameState = {
        board: Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null)),
        currentPlayer: 'black', // 'black' 或 'white'
        gameOver: false,
        winner: null,
        isAIMode: false,
        difficulty: 'medium',
        playerColor: 'black', // 玩家选择的颜色
        soundEnabled: true, // 音效开关
    };

    // AI难度权重配置
    const DIFFICULTY_WEIGHTS = {
        easy: {
            win: 100000,
            block: 80000,  // 提高阻挡权重
            connect4: 10000,
            connect3: 5000,
            connect2: 1000,
            center: 100
        },
        medium: {
            win: 1000000,
            block: 900000,  // 大幅提高阻挡权重
            connect4: 100000,
            connect3: 50000,
            connect2: 10000,
            center: 500
        },
        hard: {
            win: 10000000,
            block: 9000000,  // 大幅提高阻挡权重
            connect4: 1000000,
            connect3: 500000,
            connect2: 100000,
            center: 1000,
            pattern: {
                live_four: 5000000,
                dead_four: 1000000,
                live_three: 500000,
                dead_three: 100000,
                live_two: 50000,
                dead_two: 10000,
                live_one: 5000,
                dead_one: 1000
            }
        }
    };

    // 棋型模式定义
    const PATTERNS = {
        LIVE_FOUR: 'LIVE_FOUR',           // 活四
        DEAD_FOUR: 'DEAD_FOUR',           // 死四
        LIVE_THREE: 'LIVE_THREE',         // 活三
        DEAD_THREE: 'DEAD_THREE',         // 死三
        LIVE_TWO: 'LIVE_TWO',            // 活二
        DEAD_TWO: 'DEAD_TWO',            // 死二
        LIVE_ONE: 'LIVE_ONE',            // 活一
        DEAD_ONE: 'DEAD_ONE'             // 死一
    };

    // 初始化棋盘
    function initializeBoard() {
        const gameBoard = document.getElementById('game-board');
        gameBoard.innerHTML = '';

        // 绘制横线
        for (let i = 0; i < BOARD_SIZE; i++) {
            const line = document.createElement('div');
            line.className = 'board-line horizontal-line';
            line.style.top = `${20 + i * CELL_SIZE}px`;  // 从20px开始，留出边距
            gameBoard.appendChild(line);
        }

        // 绘制竖线
        for (let i = 0; i < BOARD_SIZE; i++) {
            const line = document.createElement('div');
            line.className = 'board-line vertical-line';
            line.style.left = `${20 + i * CELL_SIZE}px`;  // 从20px开始，留出边距
            gameBoard.appendChild(line);
        }

        // 绘制棋盘上的标记点
        const markerPositions = [
            {x: 3, y: 3}, {x: 3, y: 11}, 
            {x: 7, y: 7}, 
            {x: 11, y: 3}, {x: 11, y: 11}
        ];

        markerPositions.forEach(pos => {
            const marker = document.createElement('div');
            marker.className = 'position-marker';
            marker.style.left = `${20 + pos.x * CELL_SIZE}px`;  // 从20px开始，留出边距
            marker.style.top = `${20 + pos.y * CELL_SIZE}px`;   // 从20px开始，留出边距
            gameBoard.appendChild(marker);
        });

        // 添加点击事件监听器
        gameBoard.addEventListener('click', handleBoardClick);
    }

    // 处理棋盘点击事件
    function handleBoardClick(event) {
        // 如果游戏已结束，不做任何处理
        if (gameState.gameOver) return;

        // 在AI模式下，如果不是玩家的回合，不做任何处理
        if (gameState.isAIMode && gameState.currentPlayer !== gameState.playerColor) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const x = Math.round((event.clientX - rect.left - 20) / CELL_SIZE);  // 从20px开始计算
        const y = Math.round((event.clientY - rect.top - 20) / CELL_SIZE);   // 从20px开始计算

        // 检查是否在有效范围内并且该位置为空
        if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE && !gameState.board[y][x]) {
            makeMove(x, y);
        }
    }

    // 执行移动
    function makeMove(x, y) {
        // 放置棋子
        placePiece(x, y);

        // 检查是否获胜
        if (checkWin(x, y)) {
            gameState.gameOver = true;
            gameState.winner = gameState.currentPlayer;
            showWinner();
            return;
        }

        // 切换玩家
        gameState.currentPlayer = gameState.currentPlayer === 'black' ? 'white' : 'black';
        updateCurrentPlayer();

        // 如果是AI模式且轮到AI
        if (gameState.isAIMode && gameState.currentPlayer !== gameState.playerColor && !gameState.gameOver) {
            setTimeout(() => {
                const aiMove = calculateAIMove();
                if (aiMove) {
                    makeMove(aiMove.x, aiMove.y);
                }
            }, 500);
        }
    }

    // 计算AI移动
    function calculateAIMove() {
        const weights = DIFFICULTY_WEIGHTS[gameState.difficulty];
        
        // 第一步下在中心位置
        if (gameState.board.every(row => row.every(cell => cell === null))) {
            return {x: 7, y: 7};
        }
        
        // 检查关键位置
        const criticalMoves = identifyCriticalMoves();
        if (criticalMoves.length > 0) {
            // 获取最高优先级的所有走法
            const topPriority = criticalMoves[0].priority;
            const topMoves = criticalMoves.filter(move => move.priority === topPriority);
            
            // 在最高优先级中随机选择一个走法
            return topMoves[Math.floor(Math.random() * topMoves.length)];
        }
        
        // 如果没有关键位置，使用评分系统
        let bestScore = -Infinity;
        let bestMoves = [];
        
        // 遍历所有可能的位置
        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                if (!gameState.board[y][x]) {
                    // 只考虑周围有棋子的位置
                    if (!hasAdjacentPiece(x, y)) continue;
                    
                    let score = evaluatePosition(x, y, weights);
                    
                    // 在困难模式下增加棋型识别
                    if (gameState.difficulty === 'hard') {
                        score += evaluatePattern(x, y, weights.pattern);
                    }
                    
                    if (score > bestScore) {
                        bestMoves = [{x, y}];
                        bestScore = score;
                    } else if (score === bestScore) {
                        bestMoves.push({x, y});
                    }
                }
            }
        }
        
        // 从最佳移动中随机选择一个
        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    // 新增：检查关键位置
    function identifyCriticalMoves() {
        const playerColor = gameState.playerColor;
        const aiColor = playerColor === 'black' ? 'white' : 'black';
        const criticalMoves = new Map(); // 使用Map存储位置及其优先级
        
        // 遍历棋盘找到空位
        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                if (!gameState.board[y][x] && hasAdjacentPiece(x, y)) {
                    let priority = 0;
                    
                    // 检查AI获胜
                    gameState.board[y][x] = aiColor;
                    if (checkWin(x, y)) {
                        priority = 100; // 最高优先级：直接获胜
                    }
                    gameState.board[y][x] = null;
                    
                    // 检查阻止玩家获胜
                    if (priority === 0) {
                        gameState.board[y][x] = playerColor;
                        if (checkWin(x, y)) {
                            priority = 90; // 次高优先级：阻止玩家获胜
                        }
                        gameState.board[y][x] = null;
                    }
                    
                    // 检查AI形成活四或活三
                    if (priority === 0) {
                        gameState.board[y][x] = aiColor;
                        const aiPatterns = checkPatterns(x, y, aiColor);
                        if (aiPatterns.live_four) {
                            priority = 80; // 形成活四
                        } else if (aiPatterns.live_three) {
                            priority = 70; // 形成活三
                        }
                        gameState.board[y][x] = null;
                    }
                    
                    // 检查阻止玩家形成活四或活三
                    if (priority === 0) {
                        gameState.board[y][x] = playerColor;
                        const playerPatterns = checkPatterns(x, y, playerColor);
                        if (playerPatterns.live_four) {
                            priority = 85; // 阻止活四比AI形成活四更重要
                        } else if (playerPatterns.live_three) {
                            priority = 75; // 阻止活三比AI形成活三更重要
                        }
                        gameState.board[y][x] = null;
                    }
                    
                    if (priority > 0) {
                        criticalMoves.set(`${x},${y}`, {x, y, priority});
                    }
                }
            }
        }
        
        // 按优先级排序
        return Array.from(criticalMoves.values())
            .sort((a, b) => b.priority - a.priority);
    }

    // 检查是否有相邻的棋子
    function hasAdjacentPiece(x, y) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
                    if (gameState.board[ny][nx] !== null) return true;
                }
            }
        }
        return false;
    }

    // 评估位置分数
    function evaluatePosition(x, y, weights) {
        let score = 0;
        const aiColor = gameState.playerColor === 'black' ? 'white' : 'black';

        // 临时在此位置放置一个棋子
        gameState.board[y][x] = aiColor;

        // 检查AI是否能赢
        if (checkWin(x, y)) {
            gameState.board[y][x] = null;
            return weights.win;
        }

        // 检查玩家是否能赢
        gameState.board[y][x] = gameState.playerColor;
        if (checkWin(x, y)) {
            gameState.board[y][x] = null;
            return weights.block;
        }

        // 检查玩家是否有威胁性棋型（如活四）
        const playerThreateningPatterns = checkThreateningPatterns(x, y, gameState.playerColor);
        if (playerThreateningPatterns) {
            gameState.board[y][x] = null;
            return weights.block * 0.9; // 稍微低于直接获胜的阻挡权重
        }

        // 恢复空位
        gameState.board[y][x] = null;

        // 评估连子情况
        score += evaluateConnection(x, y, aiColor, weights);
        
        // 评估防守情况（大幅提高防守权重）
        score += evaluateConnection(x, y, gameState.playerColor, weights) * 1.5;

        // 位置价值
        score += calculatePositionValue(x, y, weights);

        // 在困难模式下增加棋型识别
        if (gameState.difficulty === 'hard') {
            // 检查AI的棋型
            const aiPatterns = checkPatterns(x, y, aiColor);
            if (aiPatterns.live_four) score += weights.pattern.live_four;
            if (aiPatterns.dead_four) score += weights.pattern.dead_four;
            if (aiPatterns.live_three) score += weights.pattern.live_three;
            if (aiPatterns.dead_three) score += weights.pattern.dead_three;
            if (aiPatterns.live_two) score += weights.pattern.live_two;
            if (aiPatterns.dead_two) score += weights.pattern.dead_two;
            if (aiPatterns.live_one) score += weights.pattern.live_one;
            if (aiPatterns.dead_one) score += weights.pattern.dead_one;

            // 检查玩家的棋型（大幅提高防守权重）
            const playerPatterns = checkPatterns(x, y, gameState.playerColor);
            if (playerPatterns.live_four) score += weights.pattern.live_four * 1.8;
            if (playerPatterns.dead_four) score += weights.pattern.dead_four * 1.5;
            if (playerPatterns.live_three) score += weights.pattern.live_three * 1.8;
            if (playerPatterns.dead_three) score += weights.pattern.dead_three * 1.5;
            if (playerPatterns.live_two) score += weights.pattern.live_two * 1.2;
            if (playerPatterns.dead_two) score += weights.pattern.dead_two * 1.2;
            if (playerPatterns.live_one) score += weights.pattern.live_one * 1.1;
            if (playerPatterns.dead_one) score += weights.pattern.dead_one * 1.1;
        }

        return score;
    }

    // 评估连子情况
    function evaluateConnection(x, y, player, weights) {
        let score = 0;
        const directions = [
            [1, 0], // 水平
            [0, 1], // 垂直
            [1, 1], // 右下对角线
            [1, -1] // 右上对角线
        ];

        // 临时在此位置放置一个棋子
        gameState.board[y][x] = player;

        directions.forEach(([dx, dy]) => {
            let count = 1;
            let space = 0;
            let blocked = 0;

            // 向两个方向检查
            for (let dir = -1; dir <= 1; dir += 2) {
                let continuous = 0;
                let hasSpace = false;
                
                for (let i = 1; i < 5; i++) {
                    const nx = x + dx * i * dir;
                    const ny = y + dy * i * dir;
                    
                    if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE) {
                        blocked++;
                        break;
                    }
                    
                    if (gameState.board[ny][nx] === player) {
                        if (hasSpace) break;
                        continuous++;
                        count++;
                    } else if (gameState.board[ny][nx] === null) {
                        if (continuous > 0) {
                            hasSpace = true;
                            space++;
                        }
                        break;
                    } else {
                        blocked++;
                        break;
                    }
                }
            }

            // 根据连子数和开放度评分
            if (count >= 5) {
                score += weights.win;
            } else if (count === 4) {
                if (blocked === 0) score += weights.connect4;
                else if (blocked === 1) score += weights.connect4 * 0.8;
            } else if (count === 3) {
                if (blocked === 0) score += weights.connect3;
                else if (blocked === 1) score += weights.connect3 * 0.8;
            } else if (count === 2) {
                if (blocked === 0) score += weights.connect2;
                else if (blocked === 1) score += weights.connect2 * 0.8;
            }
        });

        // 移除临时放置的棋子
        gameState.board[y][x] = null;

        return score;
    }

    // 计算位置价值
    function calculatePositionValue(x, y, weights) {
        let score = 0;
        
        // 中心区域价值
        const centerWeight = 1 - (Math.abs(x - 7) + Math.abs(y - 7)) / 14;
        score += centerWeight * weights.center;

        // 靠近已有棋子的位置价值
        let adjacentScore = 0;
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
                    if (gameState.board[ny][nx] !== null) {
                        // 距离越近价值越高
                        adjacentScore += (3 - Math.max(Math.abs(dx), Math.abs(dy))) * 100;
                    }
                }
            }
        }
        score += adjacentScore;

        return score;
    }

    // 评估棋型
    function evaluatePattern(x, y, patternWeights) {
        let score = 0;
        const aiColor = gameState.playerColor === 'black' ? 'white' : 'black';
        
        // 临时在此位置放置一个棋子
        gameState.board[y][x] = aiColor;
        
        // 检查各种棋型
        const patterns = checkPatterns(x, y, aiColor);
        
        // 根据棋型评分
        if (patterns.live_four) score += patternWeights.live_four;
        if (patterns.dead_four) score += patternWeights.dead_four;
        if (patterns.live_three) score += patternWeights.live_three;
        if (patterns.dead_three) score += patternWeights.dead_three;
        if (patterns.live_two) score += patternWeights.live_two;
        if (patterns.dead_two) score += patternWeights.dead_two;
        if (patterns.live_one) score += patternWeights.live_one;
        if (patterns.dead_one) score += patternWeights.dead_one;
        
        // 移除临时放置的棋子
        gameState.board[y][x] = null;
        
        return score;
    }

    // 检查棋型
    function checkPatterns(x, y, player) {
        const patterns = {
            live_four: false,
            dead_four: false,
            live_three: false,
            dead_three: false,
            live_two: false,
            dead_two: false,
            live_one: false,
            dead_one: false
        };
        
        const directions = [
            [1, 0], // 水平
            [0, 1], // 垂直
            [1, 1], // 右下对角线
            [1, -1] // 右上对角线
        ];
        
        directions.forEach(([dx, dy]) => {
            const line = getLine(x, y, dx, dy, player);
            const pattern = analyzeLine(line);
            
            if (pattern.live_four) patterns.live_four = true;
            if (pattern.dead_four) patterns.dead_four = true;
            if (pattern.live_three) patterns.live_three = true;
            if (pattern.dead_three) patterns.dead_three = true;
            if (pattern.live_two) patterns.live_two = true;
            if (pattern.dead_two) patterns.dead_two = true;
            if (pattern.live_one) patterns.live_one = true;
            if (pattern.dead_one) patterns.dead_one = true;
        });
        
        return patterns;
    }

    // 获取某个方向的棋子序列
    function getLine(x, y, dx, dy, player) {
        const line = [];
        
        // 临时在此位置放置一个棋子
        gameState.board[y][x] = player;
        
        // 向两个方向检查
        for (let dir = -1; dir <= 1; dir += 2) {
            for (let i = 1; i < 5; i++) {
                const nx = x + dx * i * dir;
                const ny = y + dy * i * dir;
                
                if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE) {
                    line.push('b'); // 边界
                    break;
                }
                
                if (gameState.board[ny][nx] === player) {
                    line.push('p'); // 同色棋子
                } else if (gameState.board[ny][nx] === null) {
                    line.push('e'); // 空位
                } else {
                    line.push('o'); // 对手棋子
                    break;
                }
            }
        }
        
        // 移除临时棋子
        gameState.board[y][x] = null;
        
        return line;
    }

    // 分析棋子序列
    function analyzeLine(line) {
        const pattern = {
            live_four: false,
            dead_four: false,
            live_three: false,
            dead_three: false,
            live_two: false,
            dead_two: false,
            live_one: false,
            dead_one: false
        };
        
        // 将两侧的棋子整合成一个完整的图案
        const fullLine = ['e', 'p', ...line]; // 中心位置假设有一个己方棋子
        
        // 连续棋子计数
        const pieceCount = fullLine.filter(c => c === 'p').length;
        
        // 开端数量（用于判断活棋还是死棋）
        const openEnds = fullLine.filter(c => c === 'e').length;
        
        // 检查活四
        if (pieceCount === 5 && openEnds >= 1) {
            pattern.live_four = true;
        }
        
        // 检查死四
        if (pieceCount === 5 && openEnds === 0) {
            pattern.dead_four = true;
        }
        
        // 检查活三
        if (pieceCount === 4 && openEnds >= 2) {
            // 扩展活三检测：检查是否有两端且足够空间形成活三
            const emptySpaces = [];
            for (let i = 0; i < fullLine.length; i++) {
                if (fullLine[i] === 'e') {
                    emptySpaces.push(i);
                }
            }
            
            // 检查空位是否分布在两端
            if (emptySpaces.length >= 2) {
                // 检查是否能形成活三（即是否有足够的空间扩展）
                let hasSpace = false;
                for (let i = 0; i < emptySpaces.length - 1; i++) {
                    if (emptySpaces[i+1] - emptySpaces[i] <= 5) {
                        hasSpace = true;
                        break;
                    }
                }
                if (hasSpace) {
                    pattern.live_three = true;
                }
            }
        }
        
        // 检查死三
        if (pieceCount === 4 && openEnds === 1) {
            pattern.dead_three = true;
        }
        
        // 检查活二
        if (pieceCount === 3 && openEnds >= 2) {
            // 扩展活二检测
            let hasSpace = false;
            const emptyPositions = [];
            for (let i = 0; i < fullLine.length; i++) {
                if (fullLine[i] === 'e') {
                    emptyPositions.push(i);
                }
            }
            
            // 检查空位分布
            if (emptyPositions.length >= 2) {
                pattern.live_two = true;
            }
        }
        
        // 检查死二
        if (pieceCount === 3 && openEnds === 1) {
            pattern.dead_two = true;
        }
        
        // 检查活一
        if (pieceCount === 2 && openEnds >= 2) {
            pattern.live_one = true;
        }
        
        // 检查死一
        if (pieceCount === 2 && openEnds === 1) {
            pattern.dead_one = true;
        }
        
        return pattern;
    }

    // 放置棋子
    function placePiece(x, y) {
        const gameBoard = document.getElementById('game-board');
        const piece = document.createElement('div');
        piece.className = `piece ${gameState.currentPlayer}`;
        piece.style.left = `${20 + x * CELL_SIZE}px`;  // 从20px开始，留出边距
        piece.style.top = `${20 + y * CELL_SIZE}px`;   // 从20px开始，留出边距
        gameBoard.appendChild(piece);

        // 更新棋盘状态
        gameState.board[y][x] = gameState.currentPlayer;

        // 播放落子音效
        if (gameState.soundEnabled) {
            // 克隆音频对象以支持快速连续播放
            const sound = pieceSound.cloneNode();
            sound.volume = pieceSound.volume;
            sound.play().catch(error => {
                console.log('音效播放失败:', error);
            });
        }
    }

    // 检查是否获胜
    function checkWin(x, y) {
        const player = gameState.currentPlayer;
        const directions = [
            [1, 0], // 水平
            [0, 1], // 垂直
            [1, 1], // 右下对角线
            [1, -1] // 右上对角线
        ];

        return directions.some(([dx, dy]) => {
            let count = 1;

            // 正方向检查
            for (let i = 1; i < WINNING_COUNT; i++) {
                const nx = x + dx * i;
                const ny = y + dy * i;
                if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && gameState.board[ny][nx] === player) {
                    count++;
                } else {
                    break;
                }
            }

            // 反方向检查
            for (let i = 1; i < WINNING_COUNT; i++) {
                const nx = x - dx * i;
                const ny = y - dy * i;
                if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && gameState.board[ny][nx] === player) {
                    count++;
                } else {
                    break;
                }
            }

            return count >= WINNING_COUNT;
        });
    }

    // 显示获胜者
    function showWinner() {
        const modal = document.getElementById('game-over-modal');
        const winnerMessage = document.getElementById('winner-message');
        
        winnerMessage.textContent = gameState.winner === 'black' ? '黑方获胜！' : '白方获胜！';
        
        modal.style.display = 'flex';
    }

    // 更新当前玩家显示
    function updateCurrentPlayer() {
        const playerText = document.getElementById('current-player');
        let displayText;

        if (gameState.isAIMode) {
            if (gameState.currentPlayer === gameState.playerColor) {
                displayText = '轮到您下棋';
            } else {
                displayText = '电脑思考中...';
            }
        } else {
            displayText = `当前玩家: ${gameState.currentPlayer === 'black' ? '黑子' : '白子'}`;
        }

        playerText.textContent = displayText;
    }

    // 重置游戏
    function resetGame() {
        gameState.board = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null));
        gameState.currentPlayer = 'black';
        gameState.gameOver = false;
        gameState.winner = null;
        
        updateCurrentPlayer();
        
        const modal = document.getElementById('game-over-modal');
        modal.style.display = 'none';
        
        // 重新初始化棋盘
        initializeBoard();
    }

    // 切换游戏模式
    function toggleGameMode(mode) {
        const pvpBtn = document.getElementById('pvp-btn');
        const pveBtn = document.getElementById('pve-btn');
        const aiSettings = document.querySelector('.ai-settings');

        gameState.isAIMode = mode === 'pve';
        pvpBtn.classList.toggle('active', !gameState.isAIMode);
        pveBtn.classList.toggle('active', gameState.isAIMode);
        aiSettings.style.display = gameState.isAIMode ? 'block' : 'none';

        resetGame();
    }

    // 更新AI难度
    function updateDifficulty(value) {
        gameState.difficulty = value;
    }

    // 选择棋子颜色
    function selectPiece(color) {
        gameState.playerColor = color;
        document.getElementById('select-black').classList.toggle('active', color === 'black');
        document.getElementById('select-white').classList.toggle('active', color === 'white');

        // 如果选择白棋，且当前是开局，AI（黑棋）先行
        if (color === 'white' && gameState.board.every(row => row.every(cell => cell === null))) {
            setTimeout(() => {
                const aiMove = calculateAIMove();
                if (aiMove) {
                    makeMove(aiMove.x, aiMove.y);
                }
            }, 500);
        }

        resetGame();
    }

    // 切换音效
    function toggleSound() {
        gameState.soundEnabled = !gameState.soundEnabled;
        const soundBtn = document.getElementById('sound-btn');
        soundBtn.textContent = gameState.soundEnabled ? '关闭音效' : '开启音效';
        soundBtn.classList.toggle('active', gameState.soundEnabled);
    }

    // 新增：检查是否有威胁性的棋型
    function checkThreateningPatterns(x, y, player) {
        // 临时在此位置放置一个棋子
        gameState.board[y][x] = player;
        
        const directions = [
            [1, 0], // 水平
            [0, 1], // 垂直
            [1, 1], // 右下对角线
            [1, -1] // 右上对角线
        ];
        
        let hasThreat = false;
        
        directions.forEach(([dx, dy]) => {
            // 检查活四
            let count = 1;
            let openEnds = 2;
            
            // 向两个方向检查
            for (let dir = -1; dir <= 1; dir += 2) {
                for (let i = 1; i < 5; i++) {
                    const nx = x + dx * i * dir;
                    const ny = y + dy * i * dir;
                    
                    if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE) {
                        openEnds--;
                        break;
                    }
                    
                    if (gameState.board[ny][nx] === player) {
                        count++;
                    } else if (gameState.board[ny][nx] === null) {
                        break;
                    } else {
                        openEnds--;
                        break;
                    }
                }
            }
            
            // 活四或者死四
            if (count >= 4) {
                hasThreat = true;
            }
            
            // 活三
            if (count === 3 && openEnds === 2) {
                hasThreat = true;
            }
        });
        
        // 恢复空位
        gameState.board[y][x] = null;
        
        return hasThreat;
    }

    // 添加事件监听器
    document.getElementById('restart-btn').addEventListener('click', resetGame);
    document.getElementById('new-game-btn').addEventListener('click', resetGame);
    document.getElementById('pvp-btn').addEventListener('click', () => toggleGameMode('pvp'));
    document.getElementById('pve-btn').addEventListener('click', () => toggleGameMode('pve'));
    document.getElementById('difficulty').addEventListener('change', (e) => updateDifficulty(e.target.value));
    document.getElementById('select-black').addEventListener('click', () => selectPiece('black'));
    document.getElementById('select-white').addEventListener('click', () => selectPiece('white'));
    document.getElementById('sound-btn').addEventListener('click', toggleSound);

    // 初始化游戏
    initializeBoard();
}); 