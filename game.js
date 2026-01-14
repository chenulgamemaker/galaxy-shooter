// --- Global Variables ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const mainMenu = document.getElementById("mainMenu");
const pauseMenu = document.getElementById("pauseMenu");
const gameOverMenu = createGameOverMenu();

document.body.appendChild(gameOverMenu);

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

let gameState = "mainMenu"; // mainMenu, playing, paused, gameOver

// --- Game Objects ---
let player = {
  x: 50,  // Start on the left
  y: 300,
  width: 30,
  height: 40,
  color: "white",
  speed: 3,
  health: 5,  // Start with 5 health
  draw: function() {
    // More detailed player sprite (example)
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = "lightgray";  // Example detail
    ctx.fillRect(this.x + 5, this.y + 10, this.width - 10, this.height - 20);
  },
  move: function(direction) {
    switch (direction) {
      case "up": this.y -= this.speed; break;
      case "down": this.y += this.speed; break;
      //No left/right movement in this version
    }
    this.y = Math.max(0, Math.min(this.y, canvas.height - this.height)); // Keep within bounds
  }
};

let rockets = [];
let enemies = [];
let enemyBullets = []; // Array to hold enemy bullets
let score = 0;
let level = 1;
let boss = null; // Boss enemy
let bossSpawned = false;

// --- Input Handling ---
const keys = {};
document.addEventListener("keydown", function(e) { keys[e.key] = true; });
document.addEventListener("keyup", function(e) { keys[e.key] = false; });

// --- Functions ---

function generateTone(frequency, duration) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'square'; // Try 'sine', 'triangle', 'sawtooth'
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
}

function spawnEnemy() {
    const enemyType = Math.random() < 0.8 ? "normal" : "shooter"; // 80% normal, 20% shooter
    const enemy = {
        x: 800,
        y: Math.random() * (canvas.height - 30), // Slightly larger enemy
        width: 40,
        height: 30,
        color: enemyType === "normal" ? "red" : "purple",
        speed: enemyType === "normal" ? 1 : 0.8,
        type: enemyType,
        draw: function() {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = this.color === "red" ? "darkred" : "darkpurple";  // Example detail
            ctx.fillRect(this.x + 5, this.y + 5, this.width - 10, this.height - 10);
        },
        shoot: function() {
            if (enemyType === "shooter" && Math.random() < 0.02) { // Reduced rate to make it manageable
                const bullet = {
                    x: this.x,
                    y: this.y + this.height / 2,
                    width: 5,
                    height: 5,
                    color: "white",
                    speed: -3
                };
                enemyBullets.push(bullet);
                generateTone(330,0.1)
            }
        }
    };
    enemies.push(enemy);
}

function spawnBoss() {
    boss = {
        x: 800,
        y: canvas.height / 2,
        width: 80,
        height: 60,
        color: "blue",
        speed: 0.5,
        health: 20,
        draw: function() {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = "darkblue";
            ctx.fillRect(this.x + 10, this.y + 10, this.width - 20, this.height - 20);
        },
        shoot: function() {
            if (Math.random() < 0.01) { // Reduced boss shooting rate even further
                const bullet = {
                    x: this.x,
                    y: this.y + this.height / 2,
                    width: 10,
                    height: 10,
                    color: "yellow",
                    speed: -2
                };
                enemyBullets.push(bullet);
                generateTone(110,0.3)
            }
        }
    };
    bossSpawned = true;
}


function fireRocket() {
  const rocket = {
    x: player.x + player.width,
    y: player.y + player.height / 2 - 2.5,
    width: 10,
    height: 5,
    color: "yellow",
    speed: 5,
    glitch: Math.random() < 0.1 // 10% chance of getting stuck
  };
  rockets.push(rocket);
  generateTone(440, 0.1);
}

function updateScore() {
  score += 10;
}

function checkCollisions() {
    for (let i = 0; i < enemies.length; i++) {
        if (player.x < enemies[i].x + enemies[i].width &&
            player.x + player.width > enemies[i].x &&
            player.y < enemies[i].y + enemies[i].height &&
            player.y + player.height > enemies[i].y) {
            // Collision detected!
            player.health--; //Reduce Health
            enemies.splice(i, 1); //Remove Enemy
            generateTone(220,0.2) //Hurt sound
            console.log("Player hit! Health: " + player.health);
            if (player.health <= 0) {
              gameState = "gameOver";
              showGameOverMenu();
            }
            break;
        }

        for (let j = 0; j < rockets.length; j++) {
            if (rockets[j].x < enemies[i].x + enemies[i].width &&
                rockets[j].x + rockets[j].width > enemies[i].x &&
                rockets[j].y < enemies[i].y + enemies[i].height &&
                rockets[j].y + rockets[j].height > enemies[i].y) {
                // Rocket hits enemy
                enemies.splice(i, 1);
                rockets.splice(j, 1); //Remove Rocket as well.
                updateScore();
                generateTone(880, 0.2);
                i--;
                break;
            }
        }
    }

    //Check Enemy Bullets colission with the Player

    for (let i = 0; i < enemyBullets.length; i++) {
        if (player.x < enemyBullets[i].x + enemyBullets[i].width &&
            player.x + player.width > enemyBullets[i].x &&
            player.y < enemyBullets[i].y + enemyBullets[i].height &&
            player.y + player.height > enemyBullets[i].y) {
            // Collision detected!
            player.health--; //Reduce Health
            enemyBullets.splice(i, 1); //Remove Enemy Bullet
            generateTone(220,0.2) //Hurt sound
            console.log("Player hit! Health: " + player.health);
            if (player.health <= 0) {
              gameState = "gameOver";
              showGameOverMenu();
            }
            break;
        }
    }
}

function drawHearts() {
    for (let i = 0; i < player.health; i++) {
        ctx.fillStyle = "red"; // Heart color
        ctx.beginPath(); // Start drawing a heart shape
        ctx.moveTo(700 + (i * 25), 30); // Start position for the heart
        ctx.lineTo(705 + (i * 25), 25); // Top left curve
        ctx.lineTo(710 + (i * 25), 30); // Top right curve
        ctx.lineTo(700 + (i * 25), 40); // Bottom point of the heart
        ctx.lineTo(690 + (i * 25), 30); // Back to the start point to close the shape
        ctx.closePath(); // Close the path
        ctx.fill(); // Fill the heart
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    player.draw();

    // Draw rockets
    rockets.forEach(rocket => {
      ctx.fillStyle = rocket.color;
      ctx.fillRect(rocket.x, rocket.y, rocket.width, rocket.height);
    });

    //Draw enemy bullets.
    enemyBullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });

    // Draw enemies
    enemies.forEach(enemy => {
        enemy.draw(); // Use the enemy's draw method
    });

    if (boss) {
        boss.draw();
    }

    ctx.fillStyle = "white";
    ctx.font = "20px sans-serif";
    ctx.fillText("Score: " + score, 20, 30);
    ctx.fillText("Level: " + level, 20, 60);

    drawHearts(); // Draw health indicator

}

function createGameOverMenu() {
    const menu = document.createElement("div");
    menu.id = "gameOverMenu";
    menu.style.position = "absolute";
    menu.style.top = "0";
    menu.style.left = "0";
    menu.style.width = "100%";
    menu.style.height = "100%";
    menu.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    menu.style.color = "white";
    menu.style.textAlign = "center";
    menu.style.fontFamily = "sans-serif";
    menu.style.display = "none"; // Hidden by default
    menu.style.flexDirection = "column";
    menu.style.justifyContent = "center";
    menu.style.alignItems = "center";
    menu.innerHTML = `
        <h1>Game Over!</h1>
        <p>Score: <span id="finalScore">0</span></p>
        <button id="backToMenu">Back to Menu</button>
        <button id="tryAgain">Try Again</button>
    `;

    // Event listeners for buttons
    menu.querySelector("#backToMenu").addEventListener("click", () => {
        gameState = "mainMenu";
        resetGame();
        showMainMenu();
    });

    menu.querySelector("#tryAgain").addEventListener("click", () => {
        gameState = "playing";
        resetGame();
        hideGameOverMenu();
    });

    return menu;
}

function showGameOverMenu() {
    document.getElementById("finalScore").textContent = score;
    gameOverMenu.style.display = "flex";
}

function hideGameOverMenu() {
    gameOverMenu.style.display = "none";
}

function resetGame() {
    score = 0;
    level = 1;
    player.health = 5;
    player.x = 50;
    player.y = 300;
    rockets = [];
    enemies = [];
    enemyBullets = [];
    boss = null;
    bossSpawned = false;
}

function showMainMenu() {
    mainMenu.style.display = "flex";
}

function update() {
    if (gameState === "playing") {
        // Player movement (up/down only)
        if (keys["w"] || keys["ArrowUp"]) player.move("up");
        if (keys["s"] || keys["ArrowDown"]) player.move("down");

        // Rocket firing
        if (keys[" "] && !keys.spacebarHeld) {
          fireRocket();
          keys.spacebarHeld = true;
        } else if (!keys[" "]){
          keys.spacebarHeld = false;
        }

        // Enemy movement and spawning
        enemies.forEach(enemy => {
            enemy.x -= enemy.speed;
            enemy.shoot(); // Enemies can shoot bullets
        });

        // Enemy bullet movement
        enemyBullets.forEach(bullet => {
            bullet.x += bullet.speed;
        });

        // Boss movement and shooting
        if (boss) {
            boss.x -= boss.speed;
            boss.shoot();
            if (boss.x < 100) boss.speed = 0; // Stop the boss at a certain point

        }
        //Level Up, when reach score can set the boss true.
        if (!bossSpawned && score >= 100){
          spawnBoss();
          level++;
        }

        //Spawn new enemies if there is no boss
        if (!boss){
          if (Math.random() < 0.01) {
              spawnEnemy();
          }
        }

        //Check boss and rockects colisions
        if(boss){
          for (let j = 0; j < rockets.length; j++) {
              if (rockets[j].x < boss.x + boss.width &&
                  rockets[j].x + rockets[j].width > boss.x &&
                  rockets[j].y < boss.y + boss.height &&
                  rockets[j].y + rockets[j].height > boss.y) {
                  // Rocket hits the boss!
                  boss.health--;
                  rockets.splice(j, 1); //Remove Rocket as well.
                  if (boss.health <= 0){
                    boss = null;
                    bossSpawned = false;
                    updateScore();
                  }
                  generateTone(880, 0.2);
                  break;
              }
          }
        }

        // Update rocket positions (with glitch)
        rockets.forEach(rocket => {
          if (!rocket.glitch) { // If it's not glitched, move it
              rocket.x += rocket.speed;
          }
        });

        // Remove off-screen elements
        enemies = enemies.filter(enemy => enemy.x > 0);
        rockets = rockets.filter(rocket => rocket.x < canvas.width);
        enemyBullets = enemyBullets.filter(bullet => bullet.x > 0 && bullet.x < canvas.width);

        // Collision detection
        checkCollisions();

        //Pause menu
        if (keys["Escape"]){
          gameState = "paused";
          pauseMenu.style.display = "flex";
        }


    } else if (gameState === "gameOver") {
        // Game Over menu is now handled separately
    }
    draw();  //Draw the game in every state
    requestAnimationFrame(update);
}

// --- Menu Button Event Listeners ---
document.getElementById("playButton").addEventListener("click", function() {
  gameState = "playing";
  mainMenu.style.display = "none";
  resetGame();
  hideGameOverMenu();

});

document.getElementById("creditsButton").addEventListener("click", function() {
  alert("Created by You!"); // Replace with a more elaborate credits display
});

document.getElementById("settingsButton").addEventListener("click", function() {
  alert("Settings are not implemented yet!");
});

document.getElementById("continueButton").addEventListener("click", function() {
  gameState = "playing";
  pauseMenu.style.display = "none";
});

document.getElementById("quitButton").addEventListener("click", function() {
  gameState = "mainMenu";
  pauseMenu.style.display = "none";
  mainMenu.style.display = "flex";
});

document.getElementById("restartButton").addEventListener("click", function() {
  document.getElementById("playButton").click();
  pauseMenu.style.display = "none";
});


// --- Start the Game ---
update(); // Start the game loop
