const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ==================== 音效 ====================
const sounds = {
  bgm: new Audio("sounds/bgm.mp3"),
  hitPaddle: new Audio("sounds/hit_paddle.wav"),
  hitBrick: new Audio("sounds/hit_brick.wav"),
  powerUp: new Audio("sounds/powerup.wav"),
  loseLife: new Audio("sounds/lose_life.wav"),
  win: new Audio("sounds/win.wav"),
  gameOver: new Audio("sounds/gameover.wav"),
};

// ==================== 音量控制 ====================
const volumeSlider = document.getElementById("volumeSlider");
const volumeValue = document.getElementById("volumeValue");

// 設定所有音效音量
function setMasterVolume(v) {
  sounds.bgm.volume = v * 0.35;        // bgm 比較小
  sounds.hitPaddle.volume = v * 0.7;
  sounds.hitBrick.volume = v * 0.7;
  sounds.powerUp.volume = v * 0.8;
  sounds.loseLife.volume = v * 0.8;
  sounds.win.volume = v * 1.0;
  sounds.gameOver.volume = v * 1.0;
}

// 初始音量
setMasterVolume(0.5);

volumeSlider.addEventListener("input", () => {
  const v = volumeSlider.value / 100;
  volumeValue.textContent = volumeSlider.value;
  setMasterVolume(v);
});



// 防止音效播放卡住（重播）
function playSound(sound) {
  if (!sound) return;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

// BGM 必須玩家互動後才能播放
let bgmStarted = false;
function startBGM() {
  if (!bgmStarted) {
    bgmStarted = true;
    sounds.bgm.play().catch(() => {});
  }
}

function stopBGM() {
  sounds.bgm.pause();
  sounds.bgm.currentTime = 0;
  bgmStarted = false;
}

function stopEndSounds() {
  sounds.win.pause();
  sounds.win.currentTime = 0;

  sounds.gameOver.pause();
  sounds.gameOver.currentTime = 0;
}

// 避免 win/gameover 每幀一直播
let endSoundPlayed = false;

// ==================== 遊戲狀態 ====================
let gameRunning = true;

let level = 1;
const MAX_LEVEL = 5;

let score = 0;
let lives = 3;

// 過關倒數
let countdownActive = false;
let countdownValue = 0;
let countdownStartTime = 0;

// 發球等待狀態
let waitingForServe = false;

// ==================== Paddle ====================
const paddle = {
  width: 120,
  height: 15,
  x: canvas.width / 2 - 60,
  y: canvas.height - 40,

  speed: 0,
  maxSpeed: 20,
  accel: 2.0,
  friction: 0.90
};

let leftPressed = false;
let rightPressed = false;

// ==================== Ball（多顆球） ====================
let balls = [];

function normalizeBallSpeed(ball) {
  const mag = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
  if (mag === 0) return;

  ball.dx = (ball.dx / mag) * ball.speed;
  ball.dy = (ball.dy / mag) * ball.speed;
}

function createBall(x, y, dx, dy, speed, attached = false) {
  const ball = {
    x,
    y,
    radius: 10,
    dx,
    dy,
    speed,
    attached
  };

  if (!attached) normalizeBallSpeed(ball);
  return ball;
}

function resetBalls() {
  balls = [];

  const baseSpeed = 5.0;
  const speed = baseSpeed + (level - 1) * 0.3;

  balls.push(
    createBall(
      paddle.x + paddle.width / 2,
      paddle.y - 10,
      0,
      0,
      speed,
      true
    )
  );

  waitingForServe = true;
}

// ==================== Bricks ====================
const brickSetting = {
  rows: 5,
  cols: 10,
  width: 70,
  height: 20,
  padding: 10,
  offsetTop: 60,
  offsetLeft: 0
};

let bricks = [];

function updateBrickOffset() {
  const totalWidth =
    brickSetting.cols * brickSetting.width +
    (brickSetting.cols - 1) * brickSetting.padding;

  brickSetting.offsetLeft = (canvas.width - totalWidth) / 2;
}

function createBricks() {
  updateBrickOffset();
  bricks = [];

  for (let r = 0; r < brickSetting.rows; r++) {
    bricks[r] = [];
    for (let c = 0; c < brickSetting.cols; c++) {
      bricks[r][c] = { x: 0, y: 0, status: 1 };
    }
  }
}

// ==================== 道具系統 ====================
let powerUps = [];

const POWER_TYPES = {
  MULTIBALL: "MULTIBALL",
  EXPAND: "EXPAND",
  LIFE: "LIFE"
};

const POWER_DROP_RATE = 0.25;

function createPowerUp(x, y, type) {
  return {
    x,
    y,
    width: 28,
    height: 28,
    type,
    speed: 2.5,
    active: true
  };
}

function spawnPowerUp(x, y) {
  if (Math.random() > POWER_DROP_RATE) return;

  const types = [
    POWER_TYPES.MULTIBALL,
    POWER_TYPES.EXPAND,
    POWER_TYPES.LIFE
  ];

  const randomType = types[Math.floor(Math.random() * types.length)];
  powerUps.push(createPowerUp(x, y, randomType));
}

function applyPowerUp(type) {
  playSound(sounds.powerUp);

  if (type === POWER_TYPES.MULTIBALL) {
    const newBalls = [];

    for (const ball of balls) {
      if (ball.attached) continue;

      newBalls.push(
        createBall(ball.x, ball.y, -ball.dx, ball.dy, ball.speed, false)
      );
    }

    if (newBalls.length > 0) {
      balls = balls.concat(newBalls);
    }
  }

  if (type === POWER_TYPES.EXPAND) {
    paddle.width += 40;
    if (paddle.width > 240) paddle.width = 240;
  }

  if (type === POWER_TYPES.LIFE) {
    lives++;
  }
}

function updatePowerUps() {
  for (const p of powerUps) {
    if (!p.active) continue;

    p.y += p.speed;

    if (
      p.x < paddle.x + paddle.width &&
      p.x + p.width > paddle.x &&
      p.y < paddle.y + paddle.height &&
      p.y + p.height > paddle.y
    ) {
      p.active = false;
      applyPowerUp(p.type);
    }

    if (p.y > canvas.height) {
      p.active = false;
    }
  }

  powerUps = powerUps.filter(p => p.active);
}

// ==================== 關卡系統 ====================
function setupLevel(lv) {
  brickSetting.rows = 4 + lv;
  if (brickSetting.rows > 10) brickSetting.rows = 10;

  createBricks();
  resetBalls();
  powerUps = [];

  paddle.width = 120;
  paddle.x = canvas.width / 2 - paddle.width / 2;
  paddle.speed = 0;
}

function isLevelCleared() {
  for (let r = 0; r < brickSetting.rows; r++) {
    for (let c = 0; c < brickSetting.cols; c++) {
      if (bricks[r][c].status === 1) return false;
    }
  }
  return true;
}

function nextLevel() {
  if (level >= MAX_LEVEL) {
    gameRunning = false;
    return;
  }

  level++;
  setupLevel(level);

  // ⭐ 過關才倒數 3 秒
  startCountdown();
}

// ==================== 倒數系統 ====================
function startCountdown() {
  countdownActive = true;
  countdownValue = 3;
  countdownStartTime = Date.now();
}

function updateCountdown() {
  const elapsed = Math.floor((Date.now() - countdownStartTime) / 1000);
  countdownValue = 3 - elapsed;

  if (countdownValue < 0) {
    countdownActive = false;
  }
}

function drawCountdown() {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = "50px Arial";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText(
    "LEVEL " + level,
    canvas.width / 2 - 110,
    canvas.height / 2 - 60
  );

  ctx.font = "80px Arial";
  ctx.fillStyle = "white";

  if (countdownValue > 0) {
    ctx.fillText(
      countdownValue,
      canvas.width / 2 - 20,
      canvas.height / 2 + 50
    );
  } else {
    ctx.fillText(
      "GO!",
      canvas.width / 2 - 70,
      canvas.height / 2 + 50
    );
  }
}

// ==================== 控制 ====================
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") leftPressed = true;
  if (e.key === "ArrowRight") rightPressed = true;

  // ⭐ 空白鍵發球
  if (e.code === "Space" && waitingForServe && !countdownActive) {
    startBGM();

    for (const ball of balls) {
      if (ball.attached) {
        ball.dx = 3;
        ball.dy = -3;
        ball.attached = false;
        normalizeBallSpeed(ball);
      }
    }

    waitingForServe = false;
  }

  if (e.key === "Enter" && !gameRunning) {
    restartGame();
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") leftPressed = false;
  if (e.key === "ArrowRight") rightPressed = false;
});

// ==================== 繪圖 ====================
function drawPaddle() {
  ctx.beginPath();
  ctx.rect(paddle.x, paddle.y, paddle.width, paddle.height);
  ctx.fillStyle = "#38bdf8";
  ctx.fill();
  ctx.closePath();
}

function drawBalls() {
  for (const ball of balls) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#facc15";
    ctx.fill();
    ctx.closePath();
  }
}

function drawBricks() {
  for (let r = 0; r < brickSetting.rows; r++) {
    for (let c = 0; c < brickSetting.cols; c++) {
      if (bricks[r][c].status === 1) {
        const brickX =
          c * (brickSetting.width + brickSetting.padding) +
          brickSetting.offsetLeft;

        const brickY =
          r * (brickSetting.height + brickSetting.padding) +
          brickSetting.offsetTop;

        bricks[r][c].x = brickX;
        bricks[r][c].y = brickY;

        ctx.beginPath();
        ctx.rect(brickX, brickY, brickSetting.width, brickSetting.height);
        ctx.fillStyle = "#22c55e";
        ctx.fill();
        ctx.closePath();
      }
    }
  }
}

function drawPowerUps() {
  for (const p of powerUps) {
    if (!p.active) continue;

    ctx.beginPath();
    ctx.rect(p.x, p.y, p.width, p.height);

    if (p.type === POWER_TYPES.MULTIBALL) ctx.fillStyle = "#f97316";
    if (p.type === POWER_TYPES.EXPAND) ctx.fillStyle = "#a855f7";
    if (p.type === POWER_TYPES.LIFE) ctx.fillStyle = "#ef4444";

    ctx.fill();
    ctx.closePath();

    ctx.font = "14px Arial";
    ctx.fillStyle = "white";

    let label = "";
    if (p.type === POWER_TYPES.MULTIBALL) label = "2x";
    if (p.type === POWER_TYPES.EXPAND) label = "++";
    if (p.type === POWER_TYPES.LIFE) label = "+1";

    ctx.fillText(label, p.x + 6, p.y + 19);
  }
}

function drawText() {
  ctx.font = "18px Arial";
  ctx.fillStyle = "white";
  ctx.fillText("Score: " + score, 20, 30);
  ctx.fillText("Lives: " + lives, canvas.width - 100, 30);
  ctx.fillText("Level: " + level, canvas.width / 2 - 30, 30);

  if (waitingForServe && !countdownActive) {
    ctx.font = "20px Arial";
    ctx.fillStyle = "#facc15";
    ctx.fillText(
      "Press P to Serve",
      canvas.width / 2 - 110,
      canvas.height - 10
    );
  }
}

function drawGameOver() {
  ctx.font = "40px Arial";
  ctx.fillStyle = "red";
  ctx.fillText("GAME OVER", canvas.width / 2 - 120, canvas.height / 2);

  ctx.font = "20px Arial";
  ctx.fillStyle = "white";
  ctx.fillText(
    "Press Enter to Restart",
    canvas.width / 2 - 110,
    canvas.height / 2 + 40
  );
}

function drawWin() {
  ctx.font = "40px Arial";
  ctx.fillStyle = "#22c55e";
  ctx.fillText("YOU WIN!", canvas.width / 2 - 100, canvas.height / 2);

  ctx.font = "20px Arial";
  ctx.fillStyle = "white";
  ctx.fillText(
    "Press Enter to Restart",
    canvas.width / 2 - 110,
    canvas.height / 2 + 40
  );
}

// ==================== 更新 ====================
function updatePaddle() {
  if (leftPressed) paddle.speed -= paddle.accel;
  if (rightPressed) paddle.speed += paddle.accel;

  paddle.speed *= paddle.friction;

  if (paddle.speed > paddle.maxSpeed) paddle.speed = paddle.maxSpeed;
  if (paddle.speed < -paddle.maxSpeed) paddle.speed = -paddle.maxSpeed;

  paddle.x += paddle.speed;

  if (paddle.x < 0) {
    paddle.x = 0;
    paddle.speed = 0;
  }

  if (paddle.x + paddle.width > canvas.width) {
    paddle.x = canvas.width - paddle.width;
    paddle.speed = 0;
  }
}

function updateBalls() {
  for (const ball of balls) {
    if (ball.attached) {
      ball.x = paddle.x + paddle.width / 2;
      ball.y = paddle.y - 10;
      continue;
    }

    ball.x += ball.dx;
    ball.y += ball.dy;

    // 撞右牆（修正抖動）
    if (ball.x + ball.radius > canvas.width) {
      ball.x = canvas.width - ball.radius;
      ball.dx *= -1;
      normalizeBallSpeed(ball);
    }

    // 撞左牆（修正抖動）
    if (ball.x - ball.radius < 0) {
      ball.x = ball.radius;
      ball.dx *= -1;
      normalizeBallSpeed(ball);
    }

    // 撞上牆（修正抖動）
    if (ball.y - ball.radius < 0) {
      ball.y = ball.radius;
      ball.dy *= -1;
      normalizeBallSpeed(ball);
    }

    // 撞 paddle
    if (
      ball.x + ball.radius > paddle.x &&
      ball.x - ball.radius < paddle.x + paddle.width &&
      ball.y + ball.radius > paddle.y &&
      ball.y - ball.radius < paddle.y + paddle.height
    ) {
      ball.y = paddle.y - ball.radius;
      ball.dy = -Math.abs(ball.dy);

      const hitPos = (ball.x - paddle.x) / paddle.width - 0.5;
      ball.dx = hitPos * 10;

      normalizeBallSpeed(ball);

      playSound(sounds.hitPaddle);
    }
  }

  // 移除掉到底的球
  balls = balls.filter(ball => ball.y - ball.radius <= canvas.height);

  // 全部球掉了才扣命
  if (balls.length === 0) {
    lives--;
    playSound(sounds.loseLife);

    if (lives <= 0) {
      gameRunning = false;
    } else {
      resetBalls();
    }
  }
}

// ==================== 碰撞（球 vs 磚塊） ====================
function collisionDetection() {
  for (const ball of balls) {
    if (ball.attached) continue;

    for (let r = 0; r < brickSetting.rows; r++) {
      for (let c = 0; c < brickSetting.cols; c++) {
        const brick = bricks[r][c];
        if (brick.status !== 1) continue;

        const hit =
          ball.x + ball.radius > brick.x &&
          ball.x - ball.radius < brick.x + brickSetting.width &&
          ball.y + ball.radius > brick.y &&
          ball.y - ball.radius < brick.y + brickSetting.height;

        if (!hit) continue;

        // MTV 穿透距離判斷（穩定反彈）
        const overlapLeft = (ball.x + ball.radius) - brick.x;
        const overlapRight = (brick.x + brickSetting.width) - (ball.x - ball.radius);
        const overlapTop = (ball.y + ball.radius) - brick.y;
        const overlapBottom = (brick.y + brickSetting.height) - (ball.y - ball.radius);

        const minOverlap = Math.min(
          overlapLeft,
          overlapRight,
          overlapTop,
          overlapBottom
        );

        if (minOverlap === overlapLeft) {
          ball.x -= overlapLeft;
          ball.dx *= -1;
        } else if (minOverlap === overlapRight) {
          ball.x += overlapRight;
          ball.dx *= -1;
        } else if (minOverlap === overlapTop) {
          ball.y -= overlapTop;
          ball.dy *= -1;
        } else {
          ball.y += overlapBottom;
          ball.dy *= -1;
        }

        normalizeBallSpeed(ball);

        brick.status = 0;
        score++;

        playSound(sounds.hitBrick);

        spawnPowerUp(
          brick.x + brickSetting.width / 2,
          brick.y + brickSetting.height / 2
        );

        if (isLevelCleared()) {
          nextLevel();
        }
      }
    }
  }
}

function update() {
  updatePaddle();
  updateBalls();
  updatePowerUps();
  collisionDetection();
}

// ==================== 重開 ====================
function restartGame() {
  score = 0;
  lives = 3;
  level = 1;
  gameRunning = true;
  endSoundPlayed = false;

  setupLevel(level);
  startCountdown();

  stopEndSounds(); // ⭐ 新增
  startBGM();      // ⭐ 新增
}

// ==================== 主迴圈 ====================
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBricks();
  drawPaddle();
  drawBalls();
  drawPowerUps();
  drawText();

  if (gameRunning) {
    if (countdownActive) {
      updateCountdown();
      drawCountdown();
    } else {
      update();
    }
  } else {
    if (!endSoundPlayed) {
  endSoundPlayed = true;

  stopBGM(); // ⭐ 結束時關掉背景音樂

  if (lives <= 0) playSound(sounds.gameOver);
  else playSound(sounds.win);
}

    if (lives <= 0) drawGameOver();
    else drawWin();
  }

  requestAnimationFrame(gameLoop);
}

// ==================== 初始化 ====================
setupLevel(level);
startCountdown();
gameLoop();
