const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ==================== 遊戲狀態 ====================
let gameRunning = true;
let level = 1;
const MAX_LEVEL = 5;

// ==================== Paddle ====================
const paddle = {
  width: 120,
  height: 15,
  x: canvas.width / 2 - 60,
  y: canvas.height - 40,
  speed: 0,
  maxSpeed: 20,
  accel: 2,
  friction: 0.8
};

let leftPressed = false;
let rightPressed = false;

// ==================== Ball（支援多顆球） ====================
let balls = [];

function normalizeBallSpeed(ball) {
  const mag = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
  if (mag === 0) return;

  ball.dx = (ball.dx / mag) * ball.speed;
  ball.dy = (ball.dy / mag) * ball.speed;
}

function createBall(x, y, dx, dy, speed) {
  const ball = {
    x,
    y,
    radius: 10,
    dx,
    dy,
    speed
  };

  normalizeBallSpeed(ball);
  return ball;
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
let score = 0;
let lives = 3;

// ==================== 道具 ====================
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

// ==================== 初始化磚塊 ====================
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

// ==================== 關卡設定 ====================
function setupLevel(lv) {
  // 每關磚塊增加
  brickSetting.rows = 4 + lv; // lv1=5排, lv2=6排...
  if (brickSetting.rows > 10) brickSetting.rows = 10;

  createBricks();
  resetBalls();
  powerUps = [];
}

// ==================== 初始化遊戲 ====================
setupLevel(level);

// ==================== 畫面繪製 ====================
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

function drawText() {
  ctx.font = "18px Arial";
  ctx.fillStyle = "white";
  ctx.fillText("Score: " + score, 20, 30);
  ctx.fillText("Lives: " + lives, canvas.width - 100, 30);
  ctx.fillText("Level: " + level, canvas.width / 2 - 30, 30);
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

function drawNextLevel() {
  ctx.font = "40px Arial";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText(
    "LEVEL " + level,
    canvas.width / 2 - 90,
    canvas.height / 2
  );

  ctx.font = "20px Arial";
  ctx.fillStyle = "white";
  ctx.fillText(
    "Get Ready...",
    canvas.width / 2 - 60,
    canvas.height / 2 + 40
  );
}

// ==================== 畫道具 ====================
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

// ==================== 控制 ====================
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") leftPressed = true;
  if (e.key === "ArrowRight") rightPressed = true;

  if (e.key === "Enter" && !gameRunning) {
    restartGame();
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") leftPressed = false;
  if (e.key === "ArrowRight") rightPressed = false;
});

// ==================== 道具掉落 ====================
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

// ==================== 道具效果 ====================
function applyPowerUp(type) {
  if (type === POWER_TYPES.MULTIBALL) {
    const newBalls = [];
    for (const ball of balls) {
      newBalls.push(
        createBall(ball.x, ball.y, -ball.dx, ball.dy, ball.speed)
      );
    }
    balls = balls.concat(newBalls);
  }

  if (type === POWER_TYPES.EXPAND) {
    paddle.width += 40;
    if (paddle.width > 220) paddle.width = 220;
  }

  if (type === POWER_TYPES.LIFE) {
    lives++;
  }
}

// ==================== 碰撞偵測 ====================
function collisionDetection() {
  for (const ball of balls) {
    for (let r = 0; r < brickSetting.rows; r++) {
      for (let c = 0; c < brickSetting.cols; c++) {
        const brick = bricks[r][c];

        if (brick.status === 1) {
          if (
            ball.x > brick.x &&
            ball.x < brick.x + brickSetting.width &&
            ball.y > brick.y &&
            ball.y < brick.y + brickSetting.height
          ) {
            ball.dy *= -1;
            normalizeBallSpeed(ball);

            brick.status = 0;
            score++;

            spawnPowerUp(
              brick.x + brickSetting.width / 2,
              brick.y + brickSetting.height / 2
            );

            const totalBricks = brickSetting.rows * brickSetting.cols;
            const bricksDestroyed = score % totalBricks;

            // 如果這關清完
            if (bricksDestroyed === 0) {
              nextLevel();
            }
          }
        }
      }
    }
  }
}

// ==================== 道具更新 ====================
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

// ==================== Paddle 更新 ====================
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

// ==================== Ball 更新 ====================
function updateBalls() {
  for (const ball of balls) {
    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
      ball.dx *= -1;
      normalizeBallSpeed(ball);
    }

    if (ball.y - ball.radius < 0) {
      ball.dy *= -1;
      normalizeBallSpeed(ball);
    }

    // paddle碰撞
    if (
      ball.x > paddle.x &&
      ball.x < paddle.x + paddle.width &&
      ball.y + ball.radius > paddle.y &&
      ball.y + ball.radius < paddle.y + paddle.height + 10
    ) {
      ball.dy = -Math.abs(ball.dy);

      const hitPos = (ball.x - paddle.x) / paddle.width - 0.5;
      ball.dx = hitPos * 10;

      normalizeBallSpeed(ball);
    }
  }

  balls = balls.filter(ball => ball.y - ball.radius <= canvas.height);

  if (balls.length === 0) {
    lives--;

    if (lives <= 0) {
      gameRunning = false;
    } else {
      resetBalls();
    }
  }
}

// ==================== 更新 ====================
function update() {
  updatePaddle();
  updateBalls();
  updatePowerUps();
  collisionDetection();
}

// ==================== Reset ====================
function resetBalls() {
  balls = [];

  // speed 改成 3.0（並隨關卡增加）
  const baseSpeed = 3.0;
  const speed = baseSpeed + (level - 1) * 0.3;

  balls.push(
    createBall(canvas.width / 2, canvas.height - 60, 3, -3, speed)
  );
}

function restartGame() {
  score = 0;
  lives = 3;
  level = 1;
  gameRunning = true;

  paddle.width = 120;
  paddle.x = canvas.width / 2 - paddle.width / 2;
  paddle.speed = 0;

  setupLevel(level);
}

// ==================== 下一關 ====================
function nextLevel() {
  if (level >= MAX_LEVEL) {
    gameRunning = false;
    return;
  }

  level++;
  setupLevel(level);
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
    update();
  } else {
    if (lives <= 0) {
      drawGameOver();
    } else if (level >= MAX_LEVEL) {
      drawWin();
    } else {
      drawWin();
    }
  }

  requestAnimationFrame(gameLoop);
}

gameLoop();
