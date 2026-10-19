/**
 * YumRush - Arcade Game Engine
 * 
 * Handles the complete game loop, food spawning, basket physics,
 * accurate collision detection, timer tracking, and UI state transitions.
 */

(() => {
    'use strict';

    // ==========================================
    // CONFIGURATION & CONSTANTS
    // ==========================================
    const GAME_CONFIG = {
        DURATION_SECONDS: 120, // Exactly 120 seconds (2:00)
        INITIAL_LIVES: 3,
        CANVAS_WIDTH: 800,
        CANVAS_HEIGHT: 600,
        BASKET_WIDTH: 110,
        BASKET_HEIGHT: 40,
        BASKET_SPEED: 650, // Pixels per second
        
        // Food item definitions
        FOOD_TYPES: [
            { id: 'apple', name: 'Fresh Apple', emoji: '🍎', points: 10, weight: 30, speedMult: 1.0, radius: 24 },
            { id: 'fries', name: 'Crispy Fries', emoji: '🍟', points: 15, weight: 25, speedMult: 1.08, radius: 25 },
            { id: 'burger', name: 'Mega Burger', emoji: '🍔', points: 20, weight: 20, speedMult: 1.15, radius: 27 },
            { id: 'pizza', name: 'Cheesy Pizza', emoji: '🍕', points: 25, weight: 15, speedMult: 1.22, radius: 26 },
            { id: 'taco', name: 'Spicy Taco', emoji: '🌮', points: 30, weight: 12, speedMult: 1.28, radius: 26 },
            { id: 'cupcake', name: 'Chef Special', emoji: '🧁', points: 50, weight: 8, speedMult: 1.35, radius: 28, isBonus: true }
        ],

        // Score thresholds to reach each level
        LEVEL_THRESHOLDS: [
            { level: 1, minScore: 0, spawnInterval: 1.25, baseSpeed: 190 },
            { level: 2, minScore: 100, spawnInterval: 1.05, baseSpeed: 235 },
            { level: 3, minScore: 250, spawnInterval: 0.90, baseSpeed: 280 },
            { level: 4, minScore: 450, spawnInterval: 0.78, baseSpeed: 330 },
            { level: 5, minScore: 700, spawnInterval: 0.68, baseSpeed: 385 },
            { level: 6, minScore: 1000, spawnInterval: 0.58, baseSpeed: 440 }
        ]
    };

    // ==========================================
    // GAME STATE & CONTROLLER
    // ==========================================
    class YumRushGame {
        constructor() {
            // DOM Elements
            this.canvas = document.getElementById('gameCanvas');
            this.ctx = this.canvas.getContext('2d');
            this.gameBoard = document.querySelector('.game-board');
            
            // HUD Elements
            this.hudScore = document.getElementById('hudScore');
            this.hudTimer = document.getElementById('hudTimer');
            this.hudLives = document.getElementById('hudLives');
            this.hudLevel = document.getElementById('hudLevel');
            this.levelNotification = document.getElementById('levelNotification');
            this.levelNotifText = document.getElementById('levelNotifText');
            
            // Screens / Overlays
            this.screenStart = document.getElementById('screenStart');
            this.screenPause = document.getElementById('screenPause');
            this.screenGameOver = document.getElementById('screenGameOver');
            this.modalHowToPlay = document.getElementById('modalHowToPlay');
            
            // Game Over Elements
            this.goReasonBadge = document.getElementById('goReasonBadge');
            this.goFinalScore = document.getElementById('goFinalScore');
            this.goFinalLevel = document.getElementById('goFinalLevel');
            this.goBestScore = document.getElementById('goBestScore');
            this.goHighScoreBadge = document.getElementById('goHighScoreBadge');
            
            // Start Screen Stats
            this.startBestScore = document.getElementById('startBestScore');
            this.startHighestLevel = document.getElementById('startHighestLevel');

            // Sound Toggle Buttons
            this.soundButtons = document.querySelectorAll('.btn-sound-toggle');

            // Internal Game Variables
            this.gameState = 'start'; // 'start', 'playing', 'paused', 'gameover'
            this.animationFrameId = null;
            this.lastFrameTime = 0;
            
            // Timer state
            this.gameStartTime = 0;
            this.totalPausedDuration = 0;
            this.pauseStartTime = 0;
            this.remainingTime = GAME_CONFIG.DURATION_SECONDS;
            
            // Gameplay state
            this.score = 0;
            this.lives = GAME_CONFIG.INITIAL_LIVES;
            this.currentLevel = 1;
            this.highestLevel = 1;
            this.bestScore = 0;

            // Basket state
            this.basket = {
                x: GAME_CONFIG.CANVAS_WIDTH / 2 - GAME_CONFIG.BASKET_WIDTH / 2,
                y: GAME_CONFIG.CANVAS_HEIGHT - 65,
                width: GAME_CONFIG.BASKET_WIDTH,
                height: GAME_CONFIG.BASKET_HEIGHT
            };

            // Entity pools
            this.fallingFoods = [];
            this.particles = [];
            this.floatingTexts = [];
            this.spawnTimer = 0;
            
            // Input state
            this.keys = {
                left: false,
                right: false
            };
            this.pointerDragging = false;

            // Setup
            this.loadSavedStats();
            this.setupCanvasDPI();
            this.bindEvents();
            this.updateSoundIcons();
            this.updateStartScreenStats();
            this.renderIdleScene();
        }

        // ==========================================
        // STORAGE & STATS
        // ==========================================
        loadSavedStats() {
            try {
                const savedBest = localStorage.getItem('yumrush_best_score');
                this.bestScore = savedBest ? Math.max(0, parseInt(savedBest, 10) || 0) : 0;
                
                const savedLevel = localStorage.getItem('yumrush_highest_level');
                this.highestLevel = savedLevel ? Math.max(1, parseInt(savedLevel, 10) || 1) : 1;
            } catch (e) {
                console.warn('LocalStorage unavailable:', e);
                this.bestScore = 0;
                this.highestLevel = 1;
            }
        }

        saveStats() {
            try {
                // Never allow a saved best score to be lower than the previous best
                const currentBest = localStorage.getItem('yumrush_best_score');
                const previousBest = currentBest ? parseInt(currentBest, 10) : 0;
                if (this.score > previousBest) {
                    localStorage.setItem('yumrush_best_score', this.score.toString());
                    this.bestScore = this.score;
                }

                const currentHighest = localStorage.getItem('yumrush_highest_level');
                const prevHighest = currentHighest ? parseInt(currentHighest, 10) : 1;
                if (this.currentLevel > prevHighest) {
                    localStorage.setItem('yumrush_highest_level', this.currentLevel.toString());
                    this.highestLevel = this.currentLevel;
                }
            } catch (e) {
                console.warn('Could not save stats to LocalStorage:', e);
            }
        }

        updateStartScreenStats() {
            if (this.startBestScore) {
                this.startBestScore.textContent = this.bestScore.toLocaleString();
            }
            if (this.startHighestLevel) {
                this.startHighestLevel.textContent = `Level ${this.highestLevel}`;
            }
        }

        // ==========================================
        // CANVAS & RESPONSIVENESS
        // ==========================================
        setupCanvasDPI() {
            const dpr = window.devicePixelRatio || 1;
            this.canvas.width = GAME_CONFIG.CANVAS_WIDTH * dpr;
            this.canvas.height = GAME_CONFIG.CANVAS_HEIGHT * dpr;
            
            // Smooth crisp 2D context
            this.ctx.resetTransform?.();
            this.ctx.scale(dpr, dpr);
            this.ctx.imageSmoothingEnabled = true;
        }

        // ==========================================
        // EVENT LISTENERS
        // ==========================================
        bindEvents() {
            // Keyboard controls
            window.addEventListener('keydown', (e) => this.handleKeyDown(e));
            window.addEventListener('keyup', (e) => this.handleKeyUp(e));

            // Window resize for DPI adjustments
            window.addEventListener('resize', () => {
                this.setupCanvasDPI();
                if (this.gameState !== 'playing') {
                    this.renderIdleScene();
                }
            });

            // Pointer / Mouse / Touch controls on canvas and game board
            const handlePointerMove = (e) => {
                if (this.gameState !== 'playing') return;
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = GAME_CONFIG.CANVAS_WIDTH / rect.width;
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const canvasX = (clientX - rect.left) * scaleX;
                
                // Position basket centered on pointer
                this.basket.x = Math.max(0, Math.min(GAME_CONFIG.CANVAS_WIDTH - this.basket.width, canvasX - this.basket.width / 2));
            };

            this.canvas.addEventListener('mousemove', handlePointerMove);
            this.canvas.addEventListener('touchmove', handlePointerMove, { passive: true });
            this.canvas.addEventListener('touchstart', (e) => {
                if (window.sounds) window.sounds.init();
                handlePointerMove(e);
            }, { passive: true });

            // Button bindings
            document.getElementById('btnStartPlay').addEventListener('click', () => {
                if (window.sounds) window.sounds.playClick();
                this.startGame();
            });

            document.getElementById('btnHowToPlay').addEventListener('click', () => {
                if (window.sounds) window.sounds.playClick();
                this.openHowToPlay();
            });

            document.getElementById('btnCloseHowToPlay').addEventListener('click', () => {
                if (window.sounds) window.sounds.playClick();
                this.closeHowToPlay();
            });

            const btnCloseModal = document.getElementById('btnCloseModalBtn');
            if (btnCloseModal) {
                btnCloseModal.addEventListener('click', () => {
                    if (window.sounds) window.sounds.playClick();
                    this.closeHowToPlay();
                });
            }

            // Close modal when clicking on backdrop outside card
            if (this.modalHowToPlay) {
                this.modalHowToPlay.addEventListener('click', (e) => {
                    if (e.target === this.modalHowToPlay) {
                        this.closeHowToPlay();
                    }
                });
            }

            document.getElementById('btnPause').addEventListener('click', () => {
                if (window.sounds) window.sounds.playClick();
                this.togglePause();
            });

            document.getElementById('btnResume').addEventListener('click', () => {
                if (window.sounds) window.sounds.playClick();
                this.resumeGame();
            });

            document.getElementById('btnRestartPause').addEventListener('click', () => {
                if (window.sounds) window.sounds.playClick();
                this.restartGame();
            });

            document.getElementById('btnHomePause').addEventListener('click', () => {
                if (window.sounds) window.sounds.playClick();
                this.returnToHome();
            });

            document.getElementById('btnPlayAgain').addEventListener('click', () => {
                if (window.sounds) window.sounds.playClick();
                this.restartGame();
            });

            document.getElementById('btnHomeGameOver').addEventListener('click', () => {
                if (window.sounds) window.sounds.playClick();
                this.returnToHome();
            });

            // Mobile directional touch controls
            const btnLeft = document.getElementById('btnTouchLeft');
            const btnRight = document.getElementById('btnTouchRight');
            if (btnLeft && btnRight) {
                const setTouchKey = (key, state) => {
                    this.keys[key] = state;
                    if (window.sounds) window.sounds.init();
                };

                btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); setTouchKey('left', true); });
                btnLeft.addEventListener('touchend', (e) => { e.preventDefault(); setTouchKey('left', false); });
                btnLeft.addEventListener('mousedown', () => setTouchKey('left', true));
                btnLeft.addEventListener('mouseup', () => setTouchKey('left', false));
                btnLeft.addEventListener('mouseleave', () => setTouchKey('left', false));

                btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); setTouchKey('right', true); });
                btnRight.addEventListener('touchend', (e) => { e.preventDefault(); setTouchKey('right', false); });
                btnRight.addEventListener('mousedown', () => setTouchKey('right', true));
                btnRight.addEventListener('mouseup', () => setTouchKey('right', false));
                btnRight.addEventListener('mouseleave', () => setTouchKey('right', false));
            }

            // Sound toggles
            this.soundButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    if (window.sounds) {
                        const isMuted = window.sounds.toggleMute();
                        this.updateSoundIcons();
                    }
                });
            });
        }

        updateSoundIcons() {
            const isMuted = window.sounds ? window.sounds.isMuted : false;
            this.soundButtons.forEach(btn => {
                btn.innerHTML = isMuted 
                    ? '<span class="icon">🔇</span> Sound: OFF' 
                    : '<span class="icon">🔊</span> Sound: ON';
                btn.setAttribute('aria-label', isMuted ? 'Unmute game audio' : 'Mute game audio');
                btn.classList.toggle('muted', isMuted);
            });
        }

        handleKeyDown(e) {
            // Unlock audio on any keyboard press
            if (window.sounds) window.sounds.init();

            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                this.keys.left = true;
            } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                this.keys.right = true;
            } else if (e.code === 'Escape') {
                e.preventDefault();
                // Close modal if open, else toggle pause
                if (this.modalHowToPlay && this.modalHowToPlay.classList.contains('active')) {
                    this.closeHowToPlay();
                } else if (this.gameState === 'playing') {
                    this.pauseGame();
                } else if (this.gameState === 'paused') {
                    this.resumeGame();
                }
            }
        }

        handleKeyUp(e) {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                this.keys.left = false;
            } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                this.keys.right = false;
            }
        }

        // ==========================================
        // UI & OVERLAYS
        // ==========================================
        openHowToPlay() {
            this.modalHowToPlay.classList.add('active');
        }

        closeHowToPlay() {
            this.modalHowToPlay.classList.remove('active');
        }

        showScreen(screenName) {
            this.screenStart.classList.remove('active');
            this.screenPause.classList.remove('active');
            this.screenGameOver.classList.remove('active');

            if (screenName === 'start') this.screenStart.classList.add('active');
            if (screenName === 'pause') this.screenPause.classList.add('active');
            if (screenName === 'gameover') this.screenGameOver.classList.add('active');
        }

        // ==========================================
        // GAME LIFECYCLE
        // ==========================================
        startGame() {
            // Cancel any prior loop to avoid duplicate timers
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }

            // Reset game variables
            this.score = 0;
            this.lives = GAME_CONFIG.INITIAL_LIVES;
            this.currentLevel = 1;
            this.fallingFoods = [];
            this.particles = [];
            this.floatingTexts = [];
            this.spawnTimer = 0;
            this.keys.left = false;
            this.keys.right = false;

            // Reset basket position to center
            this.basket.x = (GAME_CONFIG.CANVAS_WIDTH - this.basket.width) / 2;

            // Setup 120s timer using actual system timestamp
            const now = Date.now();
            this.gameStartTime = now;
            this.totalPausedDuration = 0;
            this.pauseStartTime = 0;
            this.remainingTime = GAME_CONFIG.DURATION_SECONDS;

            // Set state and UI
            this.gameState = 'playing';
            this.showScreen('none');
            if (this.levelNotification) this.levelNotification.classList.remove('show');
            this.updateHUD();

            // Start animation loop
            this.lastFrameTime = performance.now();
            this.animationFrameId = requestAnimationFrame((ts) => this.gameLoop(ts));
        }

        pauseGame() {
            if (this.gameState !== 'playing') return;
            this.gameState = 'paused';
            this.pauseStartTime = Date.now();
            this.showScreen('pause');
        }

        resumeGame() {
            if (this.gameState !== 'paused') return;
            // Accurately accumulate paused duration to prevent timer drift
            if (this.pauseStartTime > 0) {
                this.totalPausedDuration += (Date.now() - this.pauseStartTime);
                this.pauseStartTime = 0;
            }
            this.gameState = 'playing';
            this.showScreen('none');
            this.lastFrameTime = performance.now();
            this.animationFrameId = requestAnimationFrame((ts) => this.gameLoop(ts));
        }

        togglePause() {
            if (this.gameState === 'playing') {
                this.pauseGame();
            } else if (this.gameState === 'paused') {
                this.resumeGame();
            }
        }

        restartGame() {
            // Stop prior loop cleanly
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
            this.startGame();
        }

        returnToHome() {
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
            this.gameState = 'start';
            this.updateStartScreenStats();
            this.showScreen('start');
            this.renderIdleScene();
        }

        endGame(reason) {
            if (this.gameState === 'gameover') return;
            this.gameState = 'gameover';

            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }

            if (this.levelNotification) {
                this.levelNotification.classList.remove('show');
            }

            // Check if achieved new best score
            const isNewBest = this.score > this.bestScore;
            this.saveStats();

            // Audio cues
            if (window.sounds) {
                window.sounds.playGameOver(isNewBest);
            }

            // Populate Game Over Screen with exact reason labels
            if (reason === 'TIME OUT') {
                this.goReasonBadge.textContent = "⏰ TIME OUT";
                this.goReasonBadge.className = 'reason-badge reason-timeout';
            } else {
                this.goReasonBadge.textContent = "💔 NO LIVES LEFT";
                this.goReasonBadge.className = 'reason-badge reason-lives';
            }
            
            this.goFinalScore.textContent = this.score.toLocaleString();
            this.goFinalLevel.textContent = `Level ${this.currentLevel}`;
            this.goBestScore.textContent = this.bestScore.toLocaleString();

            if (isNewBest && this.score > 0) {
                this.goHighScoreBadge.classList.remove('hidden');
                this.spawnConfetti();
            } else {
                this.goHighScoreBadge.classList.add('hidden');
            }

            this.showScreen('gameover');
        }

        // ==========================================
        // MAIN GAME LOOP
        // ==========================================
        gameLoop(timestamp) {
            if (this.gameState !== 'playing') {
                return;
            }

            // Delta time calculation in seconds
            const dt = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1);
            this.lastFrameTime = timestamp;

            // 1. Update Timer
            this.updateTimer();
            if (this.gameState !== 'playing') return;

            // 2. Update Basket & Physics
            this.updateBasket(dt);

            // 3. Spawn & Update Falling Foods
            this.updateFoods(dt);

            // 4. Update Effects (Particles, Floating Texts)
            this.updateEffects(dt);

            // 5. Render Everything
            this.render();

            // Next frame
            this.animationFrameId = requestAnimationFrame((ts) => this.gameLoop(ts));
        }

        // ==========================================
        // TIMER CALCULATION
        // ==========================================
        updateTimer() {
            const now = Date.now();
            const elapsedSeconds = (now - this.gameStartTime - this.totalPausedDuration) / 1000;
            this.remainingTime = Math.max(0, GAME_CONFIG.DURATION_SECONDS - elapsedSeconds);

            // Format as MM:SS
            const minutes = Math.floor(this.remainingTime / 60);
            const seconds = Math.floor(this.remainingTime % 60);
            const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            
            if (this.hudTimer) {
                this.hudTimer.textContent = formatted;
                
                // Urgent styling when under 20 seconds
                if (this.remainingTime <= 20) {
                    this.hudTimer.classList.add('timer-urgent');
                } else {
                    this.hudTimer.classList.remove('timer-urgent');
                }
            }

            // Time out condition
            if (this.remainingTime <= 0) {
                this.endGame('TIME OUT');
            }
        }

        // ==========================================
        // BASKET PHYSICS & MOVEMENT
        // ==========================================
        updateBasket(dt) {
            let moveDir = 0;
            if (this.keys.left) moveDir -= 1;
            if (this.keys.right) moveDir += 1;

            if (moveDir !== 0) {
                this.basket.x += moveDir * GAME_CONFIG.BASKET_SPEED * dt;
            }

            // Keep basket inside canvas boundaries
            if (this.basket.x < 0) this.basket.x = 0;
            if (this.basket.x > GAME_CONFIG.CANVAS_WIDTH - this.basket.width) {
                this.basket.x = GAME_CONFIG.CANVAS_WIDTH - this.basket.width;
            }
        }

        // ==========================================
        // FOOD SPAWNING & FALLING
        // ==========================================
        getCurrentLevelConfig() {
            let config = GAME_CONFIG.LEVEL_THRESHOLDS[0];
            for (let i = GAME_CONFIG.LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
                if (this.score >= GAME_CONFIG.LEVEL_THRESHOLDS[i].minScore) {
                    config = GAME_CONFIG.LEVEL_THRESHOLDS[i];
                    break;
                }
            }
            return config;
        }

        checkLevelProgression() {
            const config = this.getCurrentLevelConfig();
            if (config.level > this.currentLevel) {
                this.currentLevel = config.level;
                
                // Show notification banner
                this.showLevelUpNotification(this.currentLevel);

                // Celebratory sound and particles
                if (window.sounds) window.sounds.playLevelUp();
                this.spawnLevelUpParticles();

                // Update HUD
                this.updateHUD();
            }
        }

        showLevelUpNotification(level) {
            if (!this.levelNotification) return;
            this.levelNotifText.textContent = `LEVEL ${level}! SPEED RUSH!`;
            this.levelNotification.classList.add('show');
            setTimeout(() => {
                if (this.levelNotification) {
                    this.levelNotification.classList.remove('show');
                }
            }, 2200);
        }

        spawnFood() {
            // Weighted random selection
            const totalWeight = GAME_CONFIG.FOOD_TYPES.reduce((sum, item) => sum + item.weight, 0);
            let randomNum = Math.random() * totalWeight;
            let selectedType = GAME_CONFIG.FOOD_TYPES[0];

            for (const item of GAME_CONFIG.FOOD_TYPES) {
                if (randomNum < item.weight) {
                    selectedType = item;
                    break;
                }
                randomNum -= item.weight;
            }

            const levelConfig = this.getCurrentLevelConfig();
            const padding = selectedType.radius + 15;
            const spawnX = padding + Math.random() * (GAME_CONFIG.CANVAS_WIDTH - padding * 2);
            
            // Speed calculated from base speed and item speed multiplier with slight variance
            const speedVariance = 0.9 + Math.random() * 0.2;
            const vy = levelConfig.baseSpeed * selectedType.speedMult * speedVariance;

            this.fallingFoods.push({
                x: spawnX,
                y: -selectedType.radius - 10,
                radius: selectedType.radius,
                type: selectedType.id,
                name: selectedType.name,
                emoji: selectedType.emoji,
                points: selectedType.points,
                isBonus: !!selectedType.isBonus,
                vy: vy,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 2.5,
                collected: false
            });
        }

        updateFoods(dt) {
            // 1. Spawning check
            const levelConfig = this.getCurrentLevelConfig();
            this.spawnTimer += dt;
            if (this.spawnTimer >= levelConfig.spawnInterval) {
                this.spawnFood();
                this.spawnTimer = 0;
            }

            // 2. Basket Catch Boundary Definition
            const basketCatchY = this.basket.y;
            const basketLeft = this.basket.x - 5;
            const basketRight = this.basket.x + this.basket.width + 5;

            // 3. Move and test collisions
            for (let i = this.fallingFoods.length - 1; i >= 0; i--) {
                const food = this.fallingFoods[i];
                const prevY = food.y;
                food.y += food.vy * dt;
                food.rotation += food.rotSpeed * dt;

                // Check collision with basket catch zone
                // Ensure food cannot be collected multiple times
                const reachedRim = (food.y + food.radius >= basketCatchY) && (prevY - food.radius <= basketCatchY + 28);
                if (!food.collected && reachedRim) {
                    if (food.x + food.radius * 0.6 >= basketLeft && food.x - food.radius * 0.6 <= basketRight) {
                        food.collected = true; // Mark as collected instantly to prevent double scoring

                        // Increase score
                        this.score += food.points;
                        this.hudScore.textContent = this.score.toLocaleString();

                        // Visual & sound feedback
                        if (window.sounds) {
                            window.sounds.playCatch(food.isBonus ? 'bonus' : food.type);
                        }

                        // Spawn catch burst particles and floating points
                        this.spawnCatchParticles(food.x, food.y, food.isBonus);
                        this.addFloatingText(`+${food.points}${food.isBonus ? ' BONUS!' : ''}`, food.x, food.y - 15, food.isBonus ? '#ffea00' : '#48bb78');

                        // Check level up threshold
                        this.checkLevelProgression();

                        // Remove from active falling items
                        this.fallingFoods.splice(i, 1);
                        continue;
                    }
                }

                // Check if food reached bottom without being caught (MISSED)
                if (food.y - food.radius > GAME_CONFIG.CANVAS_HEIGHT) {
                    // Missed food!
                    this.fallingFoods.splice(i, 1);
                    this.handleMissedFood(food);
                }
            }
        }

        handleMissedFood(food) {
            // Lose one life each time a food item is missed
            this.lives -= 1;
            this.updateHUD();

            // Sound and visual splash
            if (window.sounds) window.sounds.playMiss();
            this.spawnMissParticles(food.x, GAME_CONFIG.CANVAS_HEIGHT - 10);
            this.addFloatingText('💔 MISSED!', food.x, GAME_CONFIG.CANVAS_HEIGHT - 40, '#f56565');

            // Screen shake
            this.triggerScreenShake();

            // End game immediately if lives reach zero
            if (this.lives <= 0) {
                this.endGame('NO LIVES LEFT');
            }
        }

        triggerScreenShake() {
            if (this.gameBoard) {
                this.gameBoard.classList.remove('shake');
                void this.gameBoard.offsetWidth; // force reflow
                this.gameBoard.classList.add('shake');
                setTimeout(() => {
                    if (this.gameBoard) this.gameBoard.classList.remove('shake');
                }, 380);
            }
        }

        // ==========================================
        // EFFECTS & PARTICLES
        // ==========================================
        spawnCatchParticles(x, y, isBonus) {
            const count = isBonus ? 24 : 14;
            const colors = isBonus 
                ? ['#ffd700', '#ff007f', '#00ffff', '#ffffff', '#ff9a00']
                : ['#48bb78', '#38b2ac', '#ecc94b', '#ffffff'];

            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 60 + Math.random() * (isBonus ? 240 : 160);
                this.particles.push({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - (isBonus ? 90 : 40),
                    color: colors[Math.floor(Math.random() * colors.length)],
                    radius: isBonus ? 3 + Math.random() * 4 : 2 + Math.random() * 3,
                    alpha: 1.0,
                    decay: 1.6 + Math.random() * 1.5,
                    shape: isBonus && Math.random() > 0.5 ? 'star' : 'circle'
                });
            }
        }

        spawnMissParticles(x, y) {
            for (let i = 0; i < 12; i++) {
                const angle = Math.PI + (Math.random() - 0.5) * Math.PI; // Upwards fan
                const speed = 40 + Math.random() * 120;
                this.particles.push({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    color: '#e53e3e',
                    radius: 2 + Math.random() * 3,
                    alpha: 0.9,
                    decay: 2.2 + Math.random() * 1.5,
                    shape: 'circle'
                });
            }
        }

        spawnLevelUpParticles() {
            for (let i = 0; i < 40; i++) {
                const x = Math.random() * GAME_CONFIG.CANVAS_WIDTH;
                const y = Math.random() * (GAME_CONFIG.CANVAS_HEIGHT / 2);
                this.particles.push({
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 150,
                    vy: -50 - Math.random() * 150,
                    color: ['#f6ad55', '#4fd1c5', '#f687b3', '#faf089'][Math.floor(Math.random() * 4)],
                    radius: 4 + Math.random() * 4,
                    alpha: 1.0,
                    decay: 1.0 + Math.random() * 0.8,
                    shape: 'star'
                });
            }
        }

        spawnConfetti() {
            for (let i = 0; i < 60; i++) {
                this.particles.push({
                    x: GAME_CONFIG.CANVAS_WIDTH / 2,
                    y: GAME_CONFIG.CANVAS_HEIGHT / 2,
                    vx: (Math.random() - 0.5) * 400,
                    vy: -150 - Math.random() * 350,
                    color: ['#ffd700', '#ff4081', '#00e5ff', '#76ff03', '#ff9100'][Math.floor(Math.random() * 5)],
                    radius: 4 + Math.random() * 4,
                    alpha: 1.0,
                    decay: 0.7 + Math.random() * 0.5,
                    shape: 'rect'
                });
            }
        }

        addFloatingText(text, x, y, color) {
            this.floatingTexts.push({
                text: text,
                x: x,
                y: y,
                color: color,
                alpha: 1.0,
                vy: -55
            });
        }

        updateEffects(dt) {
            // Update particles
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vy += 180 * dt; // gravity
                p.alpha -= p.decay * dt;

                if (p.alpha <= 0) {
                    this.particles.splice(i, 1);
                }
            }

            // Update floating texts
            for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
                const ft = this.floatingTexts[i];
                ft.y += ft.vy * dt;
                ft.alpha -= 1.1 * dt;

                if (ft.alpha <= 0) {
                    this.floatingTexts.splice(i, 1);
                }
            }
        }

        // ==========================================
        // HUD UPDATES
        // ==========================================
        updateHUD() {
            if (this.hudScore) this.hudScore.textContent = this.score.toLocaleString();
            if (this.hudLevel) this.hudLevel.textContent = `Level ${this.currentLevel}`;
            
            // Lives indicators (3 hearts)
            if (this.hudLives) {
                let heartsHtml = '';
                for (let i = 0; i < GAME_CONFIG.INITIAL_LIVES; i++) {
                    if (i < this.lives) {
                        heartsHtml += '<span class="heart active">❤️</span> ';
                    } else {
                        heartsHtml += '<span class="heart lost">🖤</span> ';
                    }
                }
                this.hudLives.innerHTML = heartsHtml.trim();
            }
        }

        // ==========================================
        // RENDERING
        // ==========================================
        render() {
            const ctx = this.ctx;
            const w = GAME_CONFIG.CANVAS_WIDTH;
            const h = GAME_CONFIG.CANVAS_HEIGHT;

            // Clear frame
            ctx.clearRect(0, 0, w, h);

            // Draw subtle background pattern / grid
            this.renderBackgroundGrid();

            // Draw falling foods
            for (const food of this.fallingFoods) {
                this.renderFoodItem(food);
            }

            // Draw basket
            this.renderBasket();

            // Draw particles
            this.renderParticles();

            // Draw floating texts
            this.renderFloatingTexts();
        }

        renderBackgroundGrid() {
            const ctx = this.ctx;
            // Floor guideline
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, GAME_CONFIG.CANVAS_HEIGHT - 20);
            ctx.lineTo(GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT - 20);
            ctx.stroke();
            ctx.restore();
        }

        renderFoodItem(food) {
            const ctx = this.ctx;
            ctx.save();
            ctx.translate(food.x, food.y);
            ctx.rotate(food.rotation);

            // Bonus glow effect
            if (food.isBonus) {
                ctx.save();
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 18;
                ctx.beginPath();
                ctx.arc(0, 0, food.radius + 4, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
                ctx.fill();
                ctx.restore();
            }

            // Draw food emoji
            ctx.font = `${food.radius * 1.85}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(food.emoji, 0, 0);

            ctx.restore();
        }

        renderBasket() {
            const ctx = this.ctx;
            const b = this.basket;

            ctx.save();

            // Drop shadow for depth
            ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
            ctx.shadowBlur = 12;
            ctx.shadowOffsetY = 6;

            // Basket Main Body Gradient (Warm golden wicker texture)
            const basketGradient = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.height);
            basketGradient.addColorStop(0, '#f6ad55');
            basketGradient.addColorStop(0.5, '#dd6b20');
            basketGradient.addColorStop(1, '#9c4221');

            // Draw curved basket bowl
            ctx.fillStyle = basketGradient;
            ctx.beginPath();
            ctx.moveTo(b.x + 8, b.y + 10);
            ctx.lineTo(b.x + b.width - 8, b.y + 10);
            ctx.quadraticCurveTo(b.x + b.width - 4, b.y + b.height, b.x + b.width - 24, b.y + b.height);
            ctx.lineTo(b.x + 24, b.y + b.height);
            ctx.quadraticCurveTo(b.x + 4, b.y + b.height, b.x + 8, b.y + 10);
            ctx.closePath();
            ctx.fill();

            // Basket Rim (Catch opening)
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fed7aa';
            ctx.strokeStyle = '#c05621';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(b.x, b.y, b.width, 14, [7]);
            } else {
                ctx.rect(b.x, b.y, b.width, 14);
            }
            ctx.fill();
            ctx.stroke();

            // Wicker weave decorative lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let wx = b.x + 20; wx < b.x + b.width - 15; wx += 16) {
                ctx.moveTo(wx, b.y + 14);
                ctx.lineTo(wx - 4, b.y + b.height - 4);
            }
            ctx.stroke();

            // Chef badge in center of basket
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('👨‍🍳', b.x + b.width / 2, b.y + b.height / 2 + 5);

            ctx.restore();
        }

        renderParticles() {
            const ctx = this.ctx;
            for (const p of this.particles) {
                ctx.save();
                ctx.globalAlpha = Math.max(0, p.alpha);
                ctx.fillStyle = p.color;

                if (p.shape === 'star') {
                    // Quick 4-point sparkle star
                    ctx.translate(p.x, p.y);
                    ctx.beginPath();
                    ctx.moveTo(0, -p.radius * 1.5);
                    ctx.lineTo(p.radius * 0.4, -p.radius * 0.4);
                    ctx.lineTo(p.radius * 1.5, 0);
                    ctx.lineTo(p.radius * 0.4, p.radius * 0.4);
                    ctx.lineTo(0, p.radius * 1.5);
                    ctx.lineTo(-p.radius * 0.4, p.radius * 0.4);
                    ctx.lineTo(-p.radius * 1.5, 0);
                    ctx.lineTo(-p.radius * 0.4, -p.radius * 0.4);
                    ctx.closePath();
                    ctx.fill();
                } else if (p.shape === 'rect') {
                    ctx.translate(p.x, p.y);
                    ctx.fillRect(-p.radius, -p.radius / 2, p.radius * 2, p.radius);
                } else {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            }
        }

        renderFloatingTexts() {
            const ctx = this.ctx;
            for (const ft of this.floatingTexts) {
                ctx.save();
                ctx.globalAlpha = Math.max(0, ft.alpha);
                ctx.font = 'bold 20px "Fredoka", "Quicksand", system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = ft.color;
                ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
                ctx.shadowBlur = 4;
                ctx.fillText(ft.text, ft.x, ft.y);
                ctx.restore();
            }
        }

        renderIdleScene() {
            const ctx = this.ctx;
            const w = GAME_CONFIG.CANVAS_WIDTH;
            const h = GAME_CONFIG.CANVAS_HEIGHT;
            ctx.clearRect(0, 0, w, h);
            this.renderBackgroundGrid();
            this.basket.x = (w - this.basket.width) / 2;
            this.renderBasket();
        }
    }

    // Initialize game when DOM is loaded
    window.addEventListener('DOMContentLoaded', () => {
        window.yumRushGame = new YumRushGame();
    });
})();
