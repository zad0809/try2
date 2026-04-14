const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ==================== 遊戲設定 ====================
let gameRunning = true;

const paddle = {
  width: 120,
  height: 15,
  x: canvas.width / 2 - 60,
  y: canvas.height - 40,
  speed: 8,
  dx: 0
};

const ball = {
  x: canvas.width / 2,
  y: canvas.height - 60,
  radius: 10,
  speed: 5,
  dx: 4,
  dy: -4
};

const brickSetting = {
  rows: 5,
  cols: 10,
  width: 70,
  height: 20,
  padding: 10,
  offsetTop: 60,
  offsetLeft: 35
};

let bricks = [];
let score = 0;
let lives = 3;

// ==================== 初始化磚塊 ====================
function createBricks() {
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

function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#facc15";
  ctx.fill();
  ctx.closePath();
}

function drawBricks() {
  for (let r = 0; r < brickSetting.rows; r++) {
    for (let c = 0; c < brickSetting.cols; c++) {
      if (bricks[r][c].status === 1) {
        const brickX = c * (brickSetting.width + brickSetting.padding) + brickSetting.offsetLeft;
        const brickY = r * (brickSetting.height + brickSetting.padding) + brickSetting.offsetTop;

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
}

function drawGameOver() {
  ctx.font = "40px Arial";
  ctx.fillStyle = "red";
  ctx.fillText("GAME OVER", canvas.width / 2 - 120, canvas.height / 2);

  ctx.font = "20px Arial";
  ctx.fillStyle = "white";
  ctx.fillText("Press Enter to Restart", canvas.width / 2 - 110, canvas.height / 2 + 40);
}

function drawWin() {
  ctx.font = "40px Arial";
  ctx.fillStyle = "#22c55e";
  ctx.fillText("YOU WIN!", canvas.width / 2 - 100, canvas.height / 2);

  ctx.font = "20px Arial";
  ctx.fillStyle = "white";
  ctx.fillText("Press Enter to Restart", canvas.width / 2 - 110, canvas.height / 2 + 40);
}

// ==================== 控制 ====================
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") paddle.dx = -paddle.speed;
  if (e.key === "ArrowRight") paddle.dx = paddle.speed;

  if (e.key === "Enter" && !gameRunning) {
    restartGame();
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    paddle.dx = 0;
  }
});

// ==================== 碰撞偵測 ====================
function collisionDetection() {
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

          if (score === brickSetting.rows * brickSetting.cols) {
            gameRunning = false;
          }
        }
      }
    }
  }
}

// ==================== 更新遊戲 ====================
function update() {
  // 板子移動
  paddle.x += paddle.dx;

  if (paddle.x < 0) paddle.x = 0;
  if (paddle.x + paddle.width > canvas.width) {
    paddle.x = canvas.width - paddle.width;
  }

  // 球移動
  ball.x += ball.dx;
  ball.y += ball.dy;

  // 撞牆反彈
  if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
    ball.dx *= -1;
  }

  if (ball.y - ball.radius < 0) {
    ball.dy *= -1;
  }

  // 撞板子反彈
  if (
    ball.x > paddle.x &&
    ball.x < paddle.x + paddle.width &&
    ball.y + ball.radius > paddle.y
  ) {
    ball.dy = -ball.speed;

    // 增加一點角度變化（更像遊戲）
    const hitPos = (ball.x - paddle.x) / paddle.width - 0.5;
    ball.dx = hitPos * 10;
  }

  // 掉到底
  if (ball.y + ball.radius > canvas.height) {
    lives--;

    if (lives <= 0) {
      gameRunning = false;
    } else {
      resetBall();
    }
  }

  collisionDetection();
}

// ==================== Reset ====================
function resetBall() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height - 60;
  ball.dx = 4;
  ball.dy = -4;
}

function restartGame() {
  score = 0;
  lives = 3;
  gameRunning = true;

  paddle.x = canvas.width / 2 - paddle.width / 2;
  paddle.dx = 0;

  resetBall();
  createBricks();
}

// ==================== 主迴圈 ====================
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBricks();
  drawPaddle();
  drawBall();
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