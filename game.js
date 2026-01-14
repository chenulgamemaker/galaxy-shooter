// --- Global Variables ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const mainMenu = document.getElementById("mainMenu");
const pauseMenu = document.getElementById("pauseMenu");
const gameOverMenu = document.getElementById("gameOverMenu");
const weaponSelectMenu = document.getElementById("weaponSelectMenu");

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

let gameState = "mainMenu"; // mainMenu, playing, paused, gameOver

// --- Game Objects ---
let player = {
    x: 50,
    y: 300,
    width: 30,
    height: 40,
    color: "white",
    speed: 3,
    health: 5,
    currentWeapon: "weapon1", // Default weapon
    draw: function() {
        // More detailed player sprite (example)
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = "lightgray";
        ctx.fillRect(this.x + 5, this.y + 10, this.width - 10, this.height - 20);
    },
    move: function(direction) {
        switch (direction) {
            case "up":
                this.y -= this.speed;
                break;
            case "down":
                this.y += this.speed;
                break;
        }
        this.y = Math.max(0, Math.min(this.y, canvas.height - this.height));
    }
};

let rockets = [];
let enemies = [];
let enemyBullets = [];
let score = 0;
let level = 1;
let boss = null;
let bossSpawned = false;

// --- Input Handling ---
const keys = {};
document.addEventListener("keydown", function(e) {
    keys[e.key] = true;
});
document.addEventListener("keyup", function(e) {
    keys[e.key] = false;
});

// --- Weapon Definitions ---
const weapons = {
    weapon1: { // Basic Blaster
        speed: 5,
        color: "yellow",
        damage: 1,
        fireRate: 0.2
    },
    weapon2: { // Dual Laser
        cost: 50,
        speed: 7,
        color: "cyan",
        damage: 1,
        fireRate: 0.15
    },
    weapon3: { // Scatter Shot
        cost: 100,
        speed: 4,
        color: "orange",
        damage: 0.5,
        fireRate: 0.3,
        scatter: true
    },
    weapon4: { // Plasma Cannon
        cost: 150,
        speed: 6,
        color: "lime",
        damage: 2,
        fireRate: 0.25
    },
    weapon5: { // Omega Beam
        cost: 200,
        speed: 8,
        color: "magenta",
        damage: 3,
        fireRate: 0.35
    }
};

// --- Functions ---
function generateTone(frequency, duration) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
}

function spawnEnemy() {
    const enemyType = Math.random() < 0.8 ? "normal" : "shooter";
    const enemy = {
        x: 800,
        y: Math.random() * (canvas.height - 30),
        width: 40,
        height: 30,
        color: enemyType === "normal" ? "red" : "purple",
        speed: enemyType === "normal" ? 1 : 0.8,
        type: enemyType,
        draw: function() {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = this.color === "red" ? "darkred" : "darkpurple";
            ctx.fillRect(this.x + 5, this.y + 5, this.width - 10, this.height - 10);
        },
        shoot: function() {
            if (enemyType === "shooter" && Math.random() < 0.02) {
                const bullet = {
                    x: this.x,
                    y: this.y + this.height / 2,
                    width: 5,
                    height: 5,
                    color: "white",
                    speed: -3
                };
                enemyBullets.push(bullet);
                generateTone(330, 0.1)
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
            if (Math.random() < 0.01) {
                const bullet = {
                    x: this.x,
                    y: this.y + this.height / 2,
                    width: 10,
                    height: 10,
                    color: "yellow",
                    speed: -2
                };
                enemyBullets.push(bullet);
                generateTone(110, 0.3)
            }
        }
    };
    bossSpawned = true;
}

let lastFireTime = 0;

function fireRocket() {
    const now = Date.now();
    const currentWeapon = weapons[player.currentWeapon];

    if (now - lastFireTime > (1000 * currentWeapon.fireRate)) {
        lastFireTime = now;

        const baseRocket = {
            x: player.x + player.width,
            y: player.y + player.height / 2 - 2.5,
            width: 10,
            height: 5,
            color: currentWeapon.color,
            speed: currentWeapon.speed,
            damage: currentWeapon.damage,
            glitch: Math.random() < 0.1 // 10% chance of glitching
        };

        if (currentWeapon.scatter) {
            for (let i = -1; i <= 1; i++) {
                const rocket = { ...baseRocket };
                rocket.y += i * 5;
                rockets.push(rocket);
            }
        } else {
            rockets.push(baseRocket);
        }

        generateTone(440, 0.1);
    }
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
            player.health--;
            enemies.splice(i, 1);
            generateTone(220, 0.2)
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
                rockets.splice(j, 1);
                updateScore();
                generateTone(880, 0.2);
                i--;
                break;
            }
        }
    }

    // Check Enemy Bullets colission with the Player

    for (let i = 0; i < enemyBullets.length; i++) {
        if (player.x < enemyBullets[i].x + enemyBullets[i].width &&
            player.x + player.width > enemyBullets[i].x &&
            player.y < enemyBullets[i].y + enemyBullets[i].height &&
            player.y + player.height > enemyBullets[i].y) {
            // Collision detected!
            player.health--;
            enemyBullets.splice(i, 1);
            generateTone(220, 0.2)
            console.log("Player hit! Health: " + player.health);
            if (player.health <= 0) {
                gameState = "gameOver";
                showGameOverMenu();
            }
            break;
        }
    }

    // Check for boss collision
    if (boss) {
        if (player.x < boss.x + boss.width &&
            player.x + player.width > boss.x &&
            player.y < boss.y + boss.height &&
            player.y + player.height > boss.y) {
            // Player hit Boss.
            player.health--;
            if (player.health <= 0) {
                gameState = "gameOver";
                showGameOverMenu();
            }
        }
    }

    // Check boss and rockects colisions
    if (boss) {
        for (let j = 0; j < rockets.length; j++) {
            if (rockets[j].x < boss.x + boss.width &&
                rockets[j].x + rockets[j].width > boss.x &&
                rockets[j].y < boss.y + boss.height &&
                rockets[j].height + rockets[j].y > boss.y) {
                // Rocket hits the boss!
                boss.health--;
                rockets.splice(j, 1); //Remove Rocket as well.
                if (boss.health <= 0) {
                    boss = null;
                    bossSpawned = false;
                    updateScore();
                }
                generateTone(880, 0.2);
                break;
            }
        }
    }

}

function drawHearts() {
    for (let i = 0; i < player.health; i++) {
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.moveTo(700 + (i * 25), 30);
        ctx.lineTo(705 + (i * 25), 25);
        ctx.lineTo(710 + (i * 25), 30);
        ctx.lineTo(700 + (i * 25), 40);
        ctx.lineTo(690 + (i * 25), 30);
        ctx.closePath();
        ctx.fill();
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
        enemy.draw();
    });

    if (boss) {
        boss.draw();
    }

    ctx.fillStyle = "white";
    ctx.font = "20px sans-serif";
    ctx.fillText("Score: " + score, 20, 30);
    ctx.fillText("Level: " + level, 20, 60);

    drawHearts();

}

function resetGame() {
    score = 0;
    level = 1;
    player.health = 5;
    player.x = 50;
    player.y = 300;
    player.currentWeapon = "weapon1";
    rockets = [];
    enemies = [];
    enemyBullets = [];
    boss = null;
    bossSpawned = false;
    lastFireTime = 0; //Reset last firetime.
}

function showMainMenu() {
    mainMenu.style.display = "flex";
}

function showGameOverMenu() {
    document.getElementById("finalScore").textContent = score;
    gameOverMenu.style.display = "flex";
}

function hideGameOverMenu() {
    gameOverMenu.style.display = "none";
}

// --- Menu Button Event Listeners ---
document.getElementById("playButton").addEventListener("click", function() {
    gameState = "playing";
    mainMenu.style.display = "none";
    resetGame();
    hideGameOverMenu();
});

document.getElementById("creditsButton").addEventListener("click", function() {
    alert("Created by You!");
});

document.getElementById("settingsButton").addEventListener("click", function() {
    showWeaponSelectMenu();
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
    gameState = "playing"; //Restart the game
    resetGame();
    pauseMenu.style.display = "none";
});

document.getElementById("weapon1Button").addEventListener("click", function() {
    buyWeapon("weapon1");
});

document.getElementById("weapon2Button").addEventListener("click", function() {
    buyWeapon("weapon2");
});

document.getElementById("weapon3Button").addEventListener("click", function() {
    buyWeapon("weapon3");
});

document.getElementById("weapon4Button").addEventListener("click", function() {
    buyWeapon("weapon4");
});

document.getElementById("weapon5Button").addEventListener("click", function() {
    buyWeapon("weapon5");
});

document.getElementById("backToMenu").addEventListener("click", function() {
    gameState = "mainMenu";
    resetGame();
    hideGameOverMenu();
    showMainMenu();
});

document.getElementById("tryAgain").addEventListener("click", function() {
    gameState = "playing";
    resetGame();
    hideGameOverMenu();
});

function showWeaponSelectMenu() {
    weaponSelectMenu.style.display = "flex";
    mainMenu.style.display = "none"; //Hide the main menu when is weapon select
}

function hideWeaponSelectMenu() {
    weaponSelectMenu.style.display = "none";
    mainMenu.style.display = "flex"; //Return to the main menu
}

function buyWeapon(weaponName) {
    const weapon = weapons[weaponName];
    if (score >= weapon.cost) {
        score -= weapon.cost;
        player.currentWeapon = weaponName;
        weaponSelectMenu.style.display = "none";
        mainMenu.style.display = "flex";
    } else {
        alert("Not enough points!");
    }
}

// --- Game Loop ---
function update() {
    if (gameState === "playing") {
        // Player movement
        if (keys["w"] || keys["ArrowUp"]) player.move("up");
        if (keys["s"] || keys["ArrowDown"]) player.move("down");

        // Rocket firing
        if (keys[" "] && !keys.spacebarHeld) {
            fireRocket();
            keys.spacebarHeld = true;
        } else if (!keys[" "]) {
            keys.spacebarHeld = false;
        }

        // Enemy movement and shooting
        enemies.forEach(enemy => {
            enemy.x -= enemy.speed;
            enemy.shoot();
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
        if (!bossSpawned && score >= 100) {
            spawnBoss();
            level++;
        }

        //Spawn new enemies if there is no boss
        if (!boss) {
            if (Math.random() < 0.01) {
                spawnEnemy();
            }
        }

        // Update rocket positions (with glitch)
        rockets.forEach(rocket => {
            if (!rocket.glitch) {
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
        if (keys["Escape"]) {
            gameState = "paused";
            pauseMenu.style.display = "flex";
        }

    } else if (gameState === "gameOver") {
        // Game Over menu is now handled separately
    }
    draw();
    requestAnimationFrame(update);
}

// --- Initial Setup ---

// Add event listeners for weapon selection buttons
const weaponButtons = ["weapon1Button", "weapon2Button", "weapon3Button", "weapon4Button", "weapon5Button"];
weaponButtons.forEach(buttonId => {
    document.getElementById(buttonId).addEventListener("click", () => {
        buyWeapon(buttonId.replace("Button", "")); // Extract weapon name
    });
