// --- Global Variables ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const mainMenu = document.getElementById("mainMenu");
const pauseMenu = document.getElementById("pauseMenu");

// --- Audio Context ---
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

let gameState = "mainMenu"; // mainMenu, playing, paused, gameOver

// --- Game Objects ---
let player = {
  x: 100,
  y: 300,
  width: 20,
  height: 20,
  color: "white",
  speed: 3,
  draw: function() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  },
  move: function(direction) {
    switch (direction) {
      case "up": this.y -= this.speed; break;
      case "down": this.y += this.speed; break;
      case "left": this.x -= this.speed; break;
      case "right": this.x += this.speed; break;
    }
    //Keep within bounds
    this.x = Math.max(0, Math.min(this.x, canvas.width - this.width));
    this.y = Math.max(0, Math.min(this.y, canvas.height - this.height));

  }
};

let rockets = [];
let enemies = [];
let score = 0;

// --- Input Handling ---
const keys = {};
document.addEventListener("keydown", function(e) { keys[e.key] = true; });
document.addEventListener("keyup", function(e) { keys[e.key] = false; });

// --- Functions ---

function generateTone(frequency, duration) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'square'; // Try 'sine', 'triangle', 'sawtooth'
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime); // value in hertz
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
}

function spawnEnemy() {
  const enemy = {
    x: 800,
    y: Math.random() * (canvas.height - 20),
    width: 20,
    height: 20,
    color: "red",
    speed: 2
  };
  enemies.push(enemy);
}

function fireRocket() {
  const rocket = {
    x: player.x + player.width,
    y: player.y + player.height / 2 - 2.5,
    width: 10,
    height: 5,
    color: "yellow",
    speed: 5
  };
  rockets.push(rocket);
  generateTone(440, 0.1); // Play a sound when firing
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
            gameState = "gameOver";  // Or handle health/lives
            console.log("Player hit!");
            break;
        }

        for (let j = 0; j < rockets.length; j++) {
            if (rockets[j].x < enemies[i].x + enemies[i].width &&
                rockets[j].x + rockets[j].width > enemies[i].x &&
                rockets[j].y < enemies[i].y + enemies[i].height &&
                rockets[j].y + rockets[j].height > enemies[i].y) {
                // Rocket hits enemy
                enemies.splice(i, 1);
                rockets.splice(j, 1);
                updateScore();
                generateTone(880, 0.2); // Play a different sound
                i--; // Adjust index after removing enemy
                break;
            }
        }
    }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas

  player.draw();

  rockets.forEach(rocket => {
    ctx.fillStyle = rocket.color;
    ctx.fillRect(rocket.x, rocket.y, rocket.width, rocket.height);
  });

  enemies.forEach(enemy => {
    ctx.fillStyle = enemy.color;
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
  });

  ctx.fillStyle = "white";
  ctx.font = "20px sans-serif";
  ctx.fillText("Score: " + score, 20, 30);
}

function update() {
  if (gameState === "playing") {
    // Player movement
    if (keys["w"] || keys["ArrowUp"]) player.move("up");
    if (keys["s"] || keys["ArrowDown"]) player.move("down");
    if (keys["a"] || keys["ArrowLeft"]) player.move("left");
    if (keys["d"] || keys["ArrowRight"]) player.move("right");

    // Rocket firing
    if (keys[" "] && !keys.spacebarHeld) { //Make it single shot.
      fireRocket();
      keys.spacebarHeld = true;
    } else if (!keys[" "]){
      keys.spacebarHeld = false;
    }


    // Enemy movement and spawning
    enemies.forEach(enemy => {
      enemy.x -= enemy.speed;
    });

    if (Math.random() < 0.01) { // Adjust probability for desired spawn rate
      spawnEnemy();
    }

    // Remove off-screen rockets and enemies
    rockets = rockets.filter(rocket => rocket.x < canvas.width);
    enemies = enemies.filter(enemy => enemy.x > 0);

    // Collision detection
    checkCollisions();

    //Pause menu
    if (keys["Escape"]){
      gameState = "paused";
      pauseMenu.style.display = "flex";
    }

  } else if (gameState === "gameOver") {
    // Handle game over logic here (e.g., display a message, restart the game)
    console.log("Game Over!");
  }
  draw();  //Draw the game in every state
  requestAnimationFrame(update);
}

// --- Menu Button Event Listeners ---
document.getElementById("playButton").addEventListener("click", function() {
  gameState = "playing";
  mainMenu.style.display = "none";
  score = 0;
  enemies = []; // Clear existing enemies
  rockets = []; // Clear existing rockets
  player.x = 100;
  player.y = 300;

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
