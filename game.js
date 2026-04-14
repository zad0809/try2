const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ==================== 遊戲狀態 ====================
let gameRunning = true;

// ==================== Paddle ====================
const paddle = {
  width: 120,
  height: 15,
  x: canvas.width / 2 - 60,
  y: canvas.height - 40,
  speed: 0,
  maxSpeed: 10,
  accel: 0.7,
  friction: 0.85
};

let leftPressed = false;
let rightPressed = false;

// ==================== Ball（支援多顆球） ====================
let balls = [];

function createBall(x, y, dx, dy) {
  return {
    x,
    y,
    radius: 10,
    dx,
    dy
  };
}

// 初始球
balls.push(createBall(canvas.width / 2, canvas.height - 60, 4, -4));

// ==================== Bricks ====================
const brickSetting = {
  rows: 5,
  cols: 10,
  width: 70,
  height: 20,
  padding: 10,
  offsetTop: 60,
  offsetLeft: 0 // 之後自動算
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

// 掉落機率 (0~1)
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

createBricks();

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
  ctx.fillText("Balls: " + balls.length, canvas.width / 2 - 30, 30);
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

// ==================== 畫道具 ====================
function drawPowerUps() {
  for (const p of powerUps) {
    if (!p.active) continue;

    ctx.beginPath();
    ctx.rect(p.x, p.y, p.width, p.height);

    if (p.type === POWER_TYPES.MULTIBALL) ctx.fillStyle = "#f97316"; // 橘色
    if (p.type === POWER_TYPES.EXPAND) ctx.fillStyle = "#a855f7"; // 紫色
    if (p.type === POWER_TYPES.LIFE) ctx.fillStyle = "#ef4444"; // 紅色

    ctx.fill();
    ctx.closePath();

    // 字
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

// ==================== 磚塊擊破掉落道具 ====================
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
    // 每顆球都再生成一顆（反方向）
    const newBalls = [];

    for (const ball of balls) {
      newBalls.push(
        createBall(ball.x, ball.y, -ball.dx, ball.dy)
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

// ==================== 碰撞偵測（球 vs 磚塊） ====================
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
            brick.status = 0;
            score++;

            // 生成道具（掉落點在磚塊中央）
            spawnPowerUp(
              brick.x + brickSetting.width / 2,
              brick.y + brickSetting.height / 2
            );

            if (score === brickSetting.rows * brickSetting.cols) {
              gameRunning = false;
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

    // 撞到 paddle
    if (
      p.x < paddle.x + paddle.width &&
      p.x + p.width > paddle.x &&
      p.y < paddle.y + paddle.height &&
      p.y + p.height > paddle.y
    ) {
      p.active = false;
      applyPowerUp(p.type);
    }

    // 掉出畫面
    if (p.y > canvas.height) {
      p.active = false;
    }
  }

  // 清掉失效道具
  powerUps = powerUps.filter(p => p.active);
}

// ==================== 更新遊戲 ====================
function updatePaddle() {
  if (leftPressed) paddle.speed -= paddle.accel;
  if (rightPressed) paddle.speed += paddle.accel;

  // 摩擦力
  paddle.speed *= paddle.friction;

  // 限制最大速度
  if (paddle.speed > paddle.maxSpeed) paddle.speed = paddle.maxSpeed;
  if (paddle.speed < -paddle.maxSpeed) paddle.speed = -paddle.maxSpeed;

  paddle.x += paddle.speed;

  // 邊界限制
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
    ball.x += ball.dx;
    ball.y += ball.dy;

    // 撞左右牆
    if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
      ball.dx *= -1;
    }

    // 撞上牆
    if (ball.y - ball.radius < 0) {
      ball.dy *= -1;
    }

    // 撞 paddle
    if (
      ball.x > paddle.x &&
      ball.x < paddle.x + paddle.width &&
      ball.y + ball.radius > paddle.y &&
      ball.y + ball.radius < paddle.y + paddle.height + 10
    ) {
      ball.dy = -Math.abs(ball.dy);

      // 根據撞擊位置改變 dx
      const hitPos = (ball.x - paddle.x) / paddle.width - 0.5;
      ball.dx = hitPos * 10;
    }
  }

  // 移除掉出底部的球
  balls = balls.filter(ball => ball.y - ball.radius <= canvas.height);

  // 如果所有球都掉了 => 扣命
  if (balls.length === 0) {
    lives--;

    if (lives <= 0) {
      gameRunning = false;
    } else {
      resetBalls();
    }
  }
}

function update() {
  updatePaddle();
  updateBalls();
  updatePowerUps();
  collisionDetection();
}

// ==================== Reset ====================
function resetBalls() {
  balls = [];
  balls.push(createBall(canvas.width / 2, canvas.height - 60, 4, -4));
}

function restartGame() {
  score = 0;
  lives = 3;
  gameRunning = true;

  paddle.width = 120;
  paddle.x = canvas.width / 2 - paddle.width / 2;
  paddle.speed = 0;

  resetBalls();
  createBricks();

  powerUps = [];
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
    } else {
      drawWin();
    }
  }

  requestAnimationFrame(gameLoop);
}

gameLoop();
