let player;
let gems = [];
let asteroids = [];
let powerUps = []; // New array to store power-ups
let score = 0;
let gameState = "playing";
let starfield = [];
let scrollSpeed = 2; // Base scroll speed
let distanceTraveled = 0; // Track how far the player has traveled
let level = 1; // Game level
let rainbowTrail = []; // Array to store rainbow trail particles
let messages = []; // Array for temporary on-screen messages
let sparkles = []; // Array for sparkle effects
let shootingStars = []; // Array for shooting stars
let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Shield power-up variables
let hasShield = false;
let shieldTimer = 0;
let shieldDuration = 400; // Duration in frames (about 6-7 seconds at 60fps)

// Timing for special effects
let nextShootingStarTime = 0;

// Viral game features
// 1. Daily Challenges
let dailyChallenges = [
  { description: "Collect 30 gems", type: "gems", target: 30, reward: "Rainbow Trail" },
  { description: "Destroy 5 asteroids with shield", type: "asteroidDestroy", target: 5, reward: "Star Burst" },
  { description: "Travel 1000 distance", type: "distance", target: 1000, reward: "Golden Horn" }
];
let currentChallenge = null;
let challengeProgress = 0;
let challengeCompleted = false;
let gemsCollected = 0;
let asteroidsDestroyed = 0;

// 2. Unlockable Unicorn Skins
let unicornSkins = [
  { name: "Classic", cost: 0, unlocked: true, bodyColor: [255, 230, 250] },
  { name: "Galaxy", cost: 500, unlocked: false, bodyColor: [80, 50, 120] },
  { name: "Rainbow", cost: 1000, unlocked: false, bodyColor: [255, 150, 200] },
  { name: "Robot", cost: 2000, unlocked: false, bodyColor: [180, 180, 200] }
];
let currentSkinIndex = 0;
let totalCoins = 0;

// 3. Combo System
let comboCounter = 0;
let comboTimer = 0;
let comboMultiplier = 1;
const comboTimeout = 60; // frames (1 second at 60fps)

// 5. Weekly Special Events
let isSpecialEvent = false;
let specialEventMultiplier = 1;
let specialEventType = "none";

// 6. Secret Rare Collectibles
let specialGemChance = 0.01; // 1% chance

// Expose gameState to window for access from leaderboard.js
Object.defineProperty(window, 'gameState', {
  get: function() { return gameState; }
});

// Variables for the game
let audioContext; // Add audio context for sound effects
// Background music variables
let backgroundMusic = {
  isPlaying: false,
  oscillators: [],
  gainNodes: [],
  noteIndex: 0,
  nextNoteTime: 0,
  tempo: 120, // Beats per minute
  sequence: [
    { note: 'C4', duration: 0.5 },
    { note: 'E4', duration: 0.5 },
    { note: 'G4', duration: 0.5 },
    { note: 'C5', duration: 0.5 },
    { note: 'G4', duration: 0.5 },
    { note: 'E4', duration: 0.5 },
    { note: 'A4', duration: 0.5 },
    { note: 'F4', duration: 0.5 },
    { note: 'D4', duration: 0.5 },
    { note: 'F4', duration: 0.5 },
    { note: 'A4', duration: 0.5 },
    { note: 'F4', duration: 0.5 },
    { note: 'G4', duration: 1.0 },
    { note: 'E4', duration: 1.0 }
  ],
  timer: null
};

// Audio initialization flag
let audioInitialized = false;
let showAudioPrompt = false;

// Add global variables for lasers
let lasers = [];

// NO SOUND FUNCTIONALITY

function preload() {
  // No sound preloading
}

// Function to verify game data integrity
function verifyGameData() {
  console.log("Verifying game data integrity...");
  
  // Check totalCoins
  if (isNaN(totalCoins) || totalCoins < 0) {
    console.error(`Invalid totalCoins: ${totalCoins}, resetting to 0`);
    totalCoins = 0;
  }
  
  // Check skin data
  let skinDataValid = true;
  unicornSkins.forEach((skin, index) => {
    // Check if cost is valid
    if (isNaN(skin.cost) || skin.cost < 0) {
      console.error(`Invalid cost for skin ${skin.name}: ${skin.cost}`);
      skin.cost = index * 500; // Reset to default cost
      skinDataValid = false;
    }
    
    // Ensure first skin is always unlocked
    if (index === 0 && !skin.unlocked) {
      console.warn("First skin should be unlocked by default, fixing...");
      skin.unlocked = true;
      skinDataValid = false;
    }
  });
  
  // Check currentSkinIndex
  if (currentSkinIndex < 0 || currentSkinIndex >= unicornSkins.length || !unicornSkins[currentSkinIndex].unlocked) {
    console.error(`Invalid currentSkinIndex: ${currentSkinIndex}, resetting to 0`);
    currentSkinIndex = 0;
    skinDataValid = false;
  }
  
  // If any issues were found, save the corrected data
  if (!skinDataValid) {
    console.log("Fixed skin data issues, saving corrected data...");
    saveGameData();
  }
  
  console.log("Game data verification complete");
  console.log(`Verified state - Coins: ${totalCoins}, Current Skin: ${currentSkinIndex}`);
  
  // Log all skins status
  console.log("Skin status:");
  unicornSkins.forEach((skin, index) => {
    console.log(`${index}: ${skin.name} - Cost: ${skin.cost}, Unlocked: ${skin.unlocked}`);
  });
}

function setup() {
  // Create a responsive canvas based on device size
  let canvasWidth = min(windowWidth - 40, 800);
  let canvasHeight = min(windowHeight - 200, 600);
  
  // Create canvas with responsive dimensions
  let canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent('game-container');
  
  // Initialize audio context for sound effects
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Check if we're on mobile
    if (isMobile) {
      // On mobile, show a prompt to tap for audio
      showAudioPrompt = true;
      
      // Add touch listener to the whole document for first interaction
      document.addEventListener('touchstart', initAudioOnFirstTouch, { once: true });
    } else {
      // On desktop, try to start audio after a short delay
      setTimeout(() => {
        initAudio();
      }, 1000);
    }
  } catch(e) {
    console.warn('Web Audio API not supported in this browser');
    audioContext = null;
  }
  
  // Initialize game
  player = new Player();
  
  // Create starfield with 150 stars spread throughout the game area
  for (let i = 0; i < 150; i++) {
    starfield.push({
      x: random(0, width),
      y: random(-height, height * 2),
      size: random(1, 3), // Different stars move at different speeds
      speed: random(0.5, 2)
    });
  }
  
  // Set up initial timing for effects
  nextShootingStarTime = random(60, 180); // First shooting star in 1-3 seconds
  
  // Load saved game data
  loadGameData();
  
  // Verify game data integrity
  verifyGameData();
  
  // Set up daily challenge
  setupDailyChallenge();
  
  // Check for special events
  checkForSpecialEvent();
}

function draw() {
  background(10, 15, 25); // Dark space background
  
  // Update game difficulty based on distance traveled
  updateGameDifficulty();
  
  // Draw and update starfield with vertical scrolling
  updateStarfield();
  
  // Check if it's time for a shooting star
  if (frameCount >= nextShootingStarTime && random() > 0.7) {
    createShootingStar();
    nextShootingStarTime = frameCount + random(180, 360); // Next one in 3-6 seconds
  }
  
  // Update and draw background effects
  updateBackgroundEffects();
  
  // Handle skin menu state
  if (gameState === "skinMenu") {
    showSkinMenu();
    return; // Don't process the rest of the game loop
  }
  
  if (gameState === "playing") {
    // Show audio prompt for mobile if needed
    if (showAudioPrompt) {
      drawAudioPrompt();
    }
    
    // Update shield timer if active
    if (hasShield) {
      shieldTimer--;
      if (shieldTimer <= 0) {
        hasShield = false;
      }
    }
    
    // Update combo timer
    if (comboTimer > 0) {
      comboTimer--;
      if (comboTimer === 0) {
        comboCounter = 0;
        comboMultiplier = 1;
      }
    }
    
    // Update and draw rainbow trail
    for (let i = rainbowTrail.length - 1; i >= 0; i--) {
      rainbowTrail[i].show();
      if (rainbowTrail[i].update()) {
        rainbowTrail.splice(i, 1); // Remove faded particles
      }
    }
    
    // Spawn gems and asteroids with rates that increase with level
    // More asteroids and fewer gems at higher levels
    if (frameCount % max(5, 60 - level/2) === 0 && random() > 0.3 - level/200) spawnGem();
    if (frameCount % max(3, 45 - level/2) === 0 && random() > 0.2 - level/200) spawnAsteroid();
    
    // Spawn power-ups more frequently (about once every 8-10 seconds)
    // Increase spawn rate during special events
    let powerUpChance = 0.5; // Lower value = higher chance (was 0.7)
    if (isSpecialEvent && specialEventType === 'moreShields') {
      powerUpChance = 0.3; // Much higher chance during shield event
    }
    // Spawn power-ups more frequently (every 480 frames instead of 900)
    if (frameCount % 480 === 0 && random() > powerUpChance) spawnPowerUp();
    
    // Update and display player
    const newLaser = player.update();
    player.show();
    
    // Add laser if player shot one automatically
    if (newLaser) {
      lasers.push(newLaser);
    }
    
    // Update laser timer if active
    if (player.hasLaser) {
      player.laserTimer--;
      if (player.laserTimer <= 0) {
        player.hasLaser = false;
        addFloatingText(player.pos.x, player.pos.y - 50, "Laser Depleted!");
      }
    }
    
    // Update and show lasers
    for (let i = lasers.length - 1; i >= 0; i--) {
      lasers[i].update();
      lasers[i].show();
      
      // Check for laser hits on asteroids
      for (let j = asteroids.length - 1; j >= 0; j--) {
        if (lasers[i].hits(asteroids[j])) {
          // Create explosion effect
          createExplosionEffect(asteroids[j].pos.x, asteroids[j].pos.y);
          
          // Play asteroid destroy sound
          playAsteroidDestroySound();
          
          // Add score
          score += 50;
          addFloatingScore(asteroids[j].pos.x, asteroids[j].pos.y, 50);
          
          // Remove asteroid
          asteroids.splice(j, 1);
          
          // Update challenge progress
          updateChallengeProgress("asteroids", 1);
          
          // Reduce penetration count
          lasers[i].penetration--;
          
          // Deactivate laser if it has no more penetration
          if (lasers[i].penetration <= 0) {
            lasers[i].active = false;
            break;
          }
        }
      }
      
      // Remove inactive lasers
      if (!lasers[i].active) {
        lasers.splice(i, 1);
      }
    }
    
    // Update and manage gems
    for (let i = gems.length - 1; i >= 0; i--) {
      gems[i].show();
      let isOffScreen = gems[i].update();
      
      // Check for collision with player
      if (player.hits(gems[i])) {
        // Add to score with combo multiplier
        let baseValue = gems[i].value;
        let finalValue = baseValue * comboMultiplier;
        
        // Apply special event multiplier for double gems
        if (isSpecialEvent && specialEventType === 'doubleGems') {
          finalValue *= specialEventMultiplier;
        }
        
        score += finalValue;
        
        // Add coins (1 per gem, more for special gems)
        let coinValue = gems[i].isSpecial ? 5 : 1;
        totalCoins += coinValue;
        
        // Update combo
        comboCounter++;
        comboTimer = comboTimeout;
        
        // Calculate combo multiplier (max 5x)
        // Apply special event multiplier for double combos
        let maxCombo = 5;
        if (isSpecialEvent && specialEventType === 'doubleCombos') {
          maxCombo = 10; // Higher max combo during combo event
        }
        comboMultiplier = Math.min(maxCombo, 1 + Math.floor(comboCounter/3));
        
        // Play collect sound
        playCollectSound();
        
        // Create sparkle effect at gem position
        createSparkleEffect(gems[i].pos.x, gems[i].pos.y, gems[i].color);
        
        // Add floating score text
        addFloatingScore(gems[i].pos.x, gems[i].pos.y, finalValue);
        
        // Update challenge progress
        updateChallengeProgress('gems');
        
        // Remove the collected gem
        gems.splice(i, 1);
      } 
      // Remove if off screen
      else if (isOffScreen) {
        gems.splice(i, 1);
      }
    }
    
    // Update and manage power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
      let isOffScreen = powerUps[i].update();
      powerUps[i].show();
      
      // Check for collision with player
      if (player.hits(powerUps[i])) {
        // Apply power-up effect based on type
        if (powerUps[i].type === "shield") {
          // Shield power-up
          hasShield = true;
          shieldTimer = shieldDuration;
          addFloatingText(player.pos.x, player.pos.y - 50, "Shield Activated!");
          playShieldSound();
        } else if (powerUps[i].type === "laser") {
          // Laser power-up
          player.hasLaser = true;
          player.laserTimer = player.laserDuration;
          addFloatingText(player.pos.x, player.pos.y - 50, "Rainbow Lasers!");
          playLaserSound();
        }
        
        // Remove power-up
        powerUps.splice(i, 1);
        continue;
      }
      
      // Remove if off-screen
      if (isOffScreen) {
        powerUps.splice(i, 1);
      }
    }
    
    // Update and manage asteroids
    for (let i = asteroids.length - 1; i >= 0; i--) {
      asteroids[i].show();
      let isOffScreen = asteroids[i].update();
      
      // Check for collision with player
      if (player.hits(asteroids[i])) {
        // If player has shield, destroy asteroid instead of game over
        if (hasShield) {
          // Create explosion effect for asteroid
          createExplosionEffect(asteroids[i].pos.x, asteroids[i].pos.y);
          
          // Play asteroid destruction sound
          playAsteroidDestroySound();
          
          // Add points for destroying asteroid with shield
          score += 25;
          
          // Add coins for destroying asteroid
          totalCoins += 3;
          
          // Add floating score text
          addFloatingScore(asteroids[i].pos.x, asteroids[i].pos.y, 25);
          
          // Update challenge progress
          updateChallengeProgress('asteroidDestroy');
          
          // Remove the asteroid
          asteroids.splice(i, 1);
          
          // Create a burst from the shield
          createShieldBurst(player.pos.x, player.pos.y);
          
          continue; // Skip to next asteroid
        }
        
        // Normal game over if no shield
        gameState = "gameover";
        // Play game over sound
        playGameOverSound();
        // Create explosion effect when player hits asteroid
        createExplosionEffect(player.pos.x, player.pos.y);
        
        // Save game data
        saveGameData();
        
        // Cache the final score to ensure it doesn't change
        const finalScore = score;
        
        // Show leaderboard form after a short delay
        setTimeout(() => {
          if (window.showLeaderboardForm) {
            window.showLeaderboardForm(finalScore);
          } else {
            console.error('Leaderboard functionality not loaded. Please check the browser console for errors.');
          }
        }, 1500); // 1.5 seconds delay to show the game over screen first
      } 
      // Remove if off screen
      else if (isOffScreen) {
        asteroids.splice(i, 1);
      }
    }
    
    // Display challenge and coins
    displayChallenge();
    
    // Display combo counter
    displayCombo();
    
    // Display skin menu hint
    displaySkinMenuHint();
    
  } else if (gameState === "gameover") {
    // Still display player, gems and asteroids
    player.show();
    for (let gem of gems) gem.show();
    for (let asteroid of asteroids) asteroid.show();
    
    // Enhanced Game over screen with score highlight
    textAlign(CENTER);
    textSize(40);
    fill(255, 0, 0);
    text("GAME OVER", width / 2, height / 2 - 40);
    
    // Highlight score with pulsing effect
    let pulseAmount = sin(frameCount * 0.1) * 20 + 200; // Pulsing value between 180-220
    textSize(38);
    fill(255, pulseAmount, 0); // Pulsing yellow-orange
    text(`SCORE: ${score}`, width / 2, height / 2 + 10);
    
    // Add a glow effect around score
    for (let i = 6; i > 0; i--) {
      fill(255, pulseAmount, 0, 20 - i * 3);
      textSize(38 + i * 1.5);
      text(`SCORE: ${score}`, width / 2, height / 2 + 10);
    }
    
    // Show coins earned this run
    textSize(24);
    fill(255, 215, 0); // Gold color
    text(`Coins: ${totalCoins}`, width / 2, height / 2 + 50);
    
    // Just show restart instruction
    textSize(20);
    fill(255);
    text("Press R to Try Again", width / 2, height / 2 + 70);
  }
  
  // Update and display sparkle effects
  for (let i = sparkles.length - 1; i >= 0; i--) {
    sparkles[i].display();
    if (sparkles[i].alpha <= 0) {
      sparkles.splice(i, 1);
    }
  }
  
  // Display and update temporary messages
  for (let i = messages.length - 1; i >= 0; i--) {
    messages[i].display();
    // Remove faded messages
    if (messages[i].alpha <= 0) {
      messages.splice(i, 1);
    }
  }
}

// Function to create sparkle effect when collecting gems
function createSparkleEffect(x, y, gemColor) {
  // Create fewer sparkles (10-15 instead of 20-30)
  let sparkleCount = floor(random(10, 15));
  for (let i = 0; i < sparkleCount; i++) {
    let sparkle = {
      x: x,
      y: y,
      size: random(3, 6), // Slightly smaller sparkles
      xSpeed: random(-3, 3),
      ySpeed: random(-3, 3),
      alpha: 255,
      color: gemColor || color(
        random(200, 255), 
        random(200, 255), 
        random(200, 255)
      ),
      display: function() {
        noStroke();
        fill(red(this.color), green(this.color), blue(this.color), this.alpha);
        
        // Simpler sparkle rendering - just use circles for better performance
        ellipse(this.x, this.y, this.size, this.size);
        
        // Update position
        this.x += this.xSpeed;
        this.xSpeed *= 0.95; // Slow down
        this.y += this.ySpeed;
        this.ySpeed *= 0.95; // Slow down
        
        // Fade out faster
        this.alpha -= 12; // Fade out faster (8 → 12)
      }
    };
    sparkles.push(sparkle);
  }
  
  // Limit the maximum number of sparkles
  if (sparkles.length > 100) {
    // Remove oldest sparkles if we exceed the limit
    sparkles.splice(0, sparkles.length - 100);
  }
}

// Function to add floating score text
function addFloatingScore(x, y, value) {
  let scoreText = {
    x: x,
    y: y,
    value: value,
    alpha: 255,
    ySpeed: -2,
    display: function() {
      textAlign(CENTER);
      textSize(16);
      fill(255, 255, 100, this.alpha);
      // Add glow
      for (let i = 3; i > 0; i--) {
        fill(255, 255, 100, this.alpha * 0.3);
        text(`+${this.value}`, this.x, this.y + i);
      }
      fill(255, 255, 100, this.alpha);
      text(`+${this.value}`, this.x, this.y);
      this.y += this.ySpeed;
      this.alpha -= 5; // Fade out
    }
  };
  messages.push(scoreText);
}

// Function to create an explosion effect
function createExplosionEffect(x, y) {
  // Create fewer explosion particles (20-30 instead of 40-60)
  let particleCount = floor(random(20, 30));
  for (let i = 0; i < particleCount; i++) {
    let angle = random(TWO_PI);
    let speed = random(2, 5);
    let particle = {
      x: x,
      y: y,
      size: random(3, 8), // Slightly smaller explosion particles
      xSpeed: cos(angle) * speed,
      ySpeed: sin(angle) * speed,
      alpha: 255,
      color: color(
        random(200, 255), 
        random(50, 150), 
        random(0, 50)
      ),
      display: function() {
        noStroke();
        fill(red(this.color), green(this.color), blue(this.color), this.alpha);
        circle(this.x, this.y, this.size);
        
        // Update position
        this.x += this.xSpeed;
        this.xSpeed *= 0.95; // Slow down
        this.y += this.ySpeed;
        this.ySpeed *= 0.95; // Slow down
        
        // Fade out faster
        this.alpha -= 8; // Slightly faster fade (5 → 8)
      }
    };
    sparkles.push(particle); // Reuse sparkles array for explosion particles
  }
}

// Player class: A triangular spaceship
class Player {
  constructor() {
    this.pos = createVector(width / 2, height - 100); // Start near bottom
    this.vel = createVector(0, 0);
    this.size = 25; // Larger size for the unicorn
    this.speed = 5; // Movement speed
    this.hitRadius = this.size * 0.8; // Collision radius
    this.lastPos = this.pos.copy(); // Store last position for movement detection
    this.trailTimer = 0; // Add timer for controlling trail frequency
    
    // Laser power-up properties
    this.hasLaser = false;
    this.laserTimer = 0;
    this.laserDuration = 900; // 15 seconds at 60fps (was 600 = 10 seconds)
    this.lastShotTime = 0;
    this.shootCooldown = 15; // Frames between shots
    this.autoShootTimer = 0; // Timer for automatic shooting
  }
  
  update() {
    // Store last position to check if moved
    this.lastPos = this.pos.copy();
    
    // Allow movement in all four directions
    this.vel.x = 0;
    this.vel.y = 0;
    
    if (keyIsDown(LEFT_ARROW)) this.vel.x = -this.speed;
    if (keyIsDown(RIGHT_ARROW)) this.vel.x = this.speed;
    if (keyIsDown(UP_ARROW)) this.vel.y = -this.speed;
    if (keyIsDown(DOWN_ARROW)) this.vel.y = this.speed;
    
    // Apply velocity
    this.pos.add(this.vel);
    
    // Keep player within screen bounds
    this.pos.x = constrain(this.pos.x, this.size, width - this.size);
    this.pos.y = constrain(this.pos.y, this.size, height - this.size);
    
    // Automatic shooting when laser power-up is active
    if (this.hasLaser) {
      this.autoShootTimer++;
      if (this.autoShootTimer >= this.shootCooldown) {
        this.autoShootTimer = 0;
        return this.shootLaser(true); // true indicates automatic shooting
      }
    }
    
    // Generate rainbow trail particles if moved, but with more magical patterns
    if (dist(this.pos.x, this.pos.y, this.lastPos.x, this.lastPos.y) > 0.5) {
      // Increment timer and only add particles on certain frames
      this.trailTimer++;
      
      // Create particles in a pattern based on movement
      if (this.trailTimer % 2 === 0) { // Every other frame
        // Basic movement trail
        let particleCount = floor(random(1, 3)); // 1-2 particles
        for (let i = 0; i < particleCount; i++) {
          rainbowTrail.push(
            new RainbowParticle(
              this.pos.x + random(-this.size * 0.2, this.size * 0.2), 
              this.pos.y + this.size * 0.9 // Positioned at very bottom (fart position)
            )
          );
        }
        
        // Add occasional burst for more visibility
        if (this.trailTimer % 15 === 0) {
          createRainbowBurst(this.pos.x, this.pos.y + this.size * 0.9);
        }
        
        // Add special trail effects occasionally without affecting performance
        if (this.trailTimer % 8 === 0) { // Every 8 frames, create a special pattern
          // Choose a pattern based on direction of movement
          if (abs(this.vel.x) > abs(this.vel.y)) {
            // Horizontal movement - create horizontal sparkle pattern
            let sparkleSpacing = this.vel.x > 0 ? -4 : 4; // Space based on direction
            for (let i = 0; i < 3; i++) { // 3 particles in a row
              rainbowTrail.push(
                new RainbowParticle(
                  this.pos.x + sparkleSpacing * i, 
                  this.pos.y + this.size * 0.9 + random(-2, 2) // Moved from 0.6 to 0.9 (fart position)
                )
              );
            }
          } else {
            // Vertical movement - create vertical sparkle pattern
            let sparkleSpacing = this.vel.y > 0 ? -4 : 4; // Space based on direction
            for (let i = 0; i < 3; i++) { // 3 particles in a column
              rainbowTrail.push(
                new RainbowParticle(
                  this.pos.x + random(-2, 2), 
                  this.pos.y + this.size * 0.9 + sparkleSpacing * i // Moved from 0.6 to 0.9 (fart position)
                )
              );
            }
          }
        }
      }
    }
    
    // Limit the maximum number of trail particles
    if (rainbowTrail.length > 60) { // Increased slightly from 50 to allow for more magic
      // Remove oldest particles if we exceed the limit
      rainbowTrail.splice(0, rainbowTrail.length - 60);
    }
    
    // Ensure rainbow trail is created on mobile too
    if (frameCount % 2 === 0) {
      rainbowTrail.push(
        new RainbowParticle(
          this.pos.x + random(-this.size * 0.2, this.size * 0.2), 
          this.pos.y + this.size * 0.9 // Position at bottom of unicorn (fart position)
        )
      );
      if (rainbowTrail.length > 25) {
        rainbowTrail.shift();
      }
    }
    
    return null; // No laser shot this frame
  }
  
  shootLaser(isAutomatic = false) {
    if (!this.hasLaser) return null;
    
    // Check cooldown (skip for automatic shooting since it's handled by the timer)
    if (!isAutomatic && frameCount - this.lastShotTime < this.shootCooldown) return null;
    
    // Update last shot time
    this.lastShotTime = frameCount;
    
    // Play laser sound (less frequently for automatic shooting to avoid sound overload)
    if (!isAutomatic || frameCount % 30 === 0) {
      playLaserSound();
    }
    
    // Create new laser
    return new Laser(this.pos.x, this.pos.y - this.size/2);
  }
  
  show() {
    push();
    translate(this.pos.x, this.pos.y);
    
    // Draw laser power-up effect if active
    if (this.hasLaser) {
      // Rainbow laser aura
      let pulseAmount = map(sin(frameCount * 0.2), -1, 1, 0.8, 1.2);
      let opacity = map(this.laserTimer, 0, this.laserDuration, 50, 180);
      if (this.laserTimer < 100) {
        // Make laser aura flash when about to expire
        opacity = map(sin(frameCount * 0.5), -1, 1, 40, 180);
      }
      
      // Draw rainbow laser aura
      noFill();
      for (let i = 0; i < 7; i++) {
        let auraSize = this.size * 2.2 * pulseAmount;
        let hue = (frameCount * 5 + i * 30) % 360;
        
        colorMode(HSB, 360, 100, 100, 255);
        stroke(hue, 90, 100, opacity);
        strokeWeight(2);
        
        // Draw zigzag pattern around unicorn
        beginShape();
        for (let a = 0; a < TWO_PI; a += PI/8) {
          let r = auraSize/2 * (1 + sin(a * 8 + frameCount * 0.1) * 0.1);
          vertex(cos(a) * r, sin(a) * r);
        }
        endShape(CLOSE);
        colorMode(RGB, 255, 255, 255, 255);
      }
      
      // Draw small laser beams coming from horn
      if (frameCount % 10 < 5) { // Blink effect
        colorMode(HSB, 360, 100, 100, 255);
        let hue = (frameCount * 10) % 360;
        stroke(hue, 90, 100, 200);
        strokeWeight(2);
        line(0, -this.size * 0.8, random(-10, 10), -this.size * 1.2);
        colorMode(RGB, 255, 255, 255, 255);
      }
    }
    
    // Draw shield if active
    if (hasShield) {
      // Shield pulse effect based on remaining time
      let pulseAmount = map(sin(frameCount * 0.2), -1, 1, 0.8, 1.2);
      let opacity = map(shieldTimer, 0, shieldDuration, 50, 180);
      if (shieldTimer < 100) {
        // Make shield flash when about to expire
        opacity = map(sin(frameCount * 0.5), -1, 1, 40, 180);
      }
      
      // Draw rainbow shield aura
      noFill();
      for (let i = 0; i < 7; i++) {
        let shieldSize = this.size * 2.2 * pulseAmount;
        let hue = (frameCount * 2 + i * 30) % 360;
        
        colorMode(HSB, 360, 100, 100, 255);
        stroke(hue, 90, 100, opacity);
        strokeWeight(3);
        ellipse(0, 0, shieldSize, shieldSize);
        colorMode(RGB, 255, 255, 255, 255);
      }
    }
    
    // Get the current skin color
    let bodyColor = color(
      unicornSkins[currentSkinIndex].bodyColor[0],
      unicornSkins[currentSkinIndex].bodyColor[1],
      unicornSkins[currentSkinIndex].bodyColor[2]
    );
    
    // Draw legs (same color as body)
    stroke(bodyColor);
    strokeWeight(this.size * 0.2);
    
    // Upper side legs - extending sideways from upper body
    line(-this.size * 0.5, -this.size * 0.3, -this.size * 0.9, -this.size * 0.3); // Upper left leg
    line(this.size * 0.5, -this.size * 0.3, this.size * 0.9, -this.size * 0.3);   // Upper right leg
    
    // Bottom legs - extending downward
    line(-this.size * 0.3, this.size * 0.4, -this.size * 0.3, this.size * 0.8);   // Bottom left leg
    line(this.size * 0.3, this.size * 0.4, this.size * 0.3, this.size * 0.8);     // Bottom right leg
    
    // Main body - chubby oval shape like the original
    noStroke();
    fill(bodyColor);
    ellipse(0, 0, this.size * 1.5, this.size * 1.7); // Slightly taller than wide
    
    // Head at the top
    ellipse(0, -this.size * 0.7, this.size * 0.8, this.size * 0.8);
    
    // Ears (similar to original)
    fill(bodyColor);
    ellipse(-this.size * 0.3, -this.size * 1.0, this.size * 0.3, this.size * 0.4);
    ellipse(this.size * 0.3, -this.size * 1.0, this.size * 0.3, this.size * 0.4);
    
    // Big magical gold horn
    fill(255, 215, 0); // Gold
    stroke(255, 240, 200);
    strokeWeight(2);
    beginShape();
    vertex(-this.size * 0.15, -this.size * 0.9);
    vertex(0, -this.size * 1.4);
    vertex(this.size * 0.15, -this.size * 0.9);
    endShape(CLOSE);
    
    // Add sparkly detail to horn
    noStroke();
    fill(255, 255, 200);
    ellipse(0, -this.size * 1.2, this.size * 0.06, this.size * 0.06);
    ellipse(0, -this.size * 1.0, this.size * 0.04, this.size * 0.04);
    
    // Eyes - simple like original
    fill(0);
    ellipse(-this.size * 0.2, -this.size * 0.7, this.size * 0.08, this.size * 0.1);
    ellipse(this.size * 0.2, -this.size * 0.7, this.size * 0.08, this.size * 0.1);
    
    // Small white highlight in eyes for magical look
    fill(255);
    ellipse(-this.size * 0.18, -this.size * 0.68, this.size * 0.03, this.size * 0.03);
    ellipse(this.size * 0.18, -this.size * 0.68, this.size * 0.03, this.size * 0.03);
    
    pop();
  }
  
  hits(obj) {
    let d = dist(this.pos.x, this.pos.y, obj.pos.x, obj.pos.y);
    return d < this.hitRadius + obj.size / 2; // Adjusted collision detection
  }
}

// Gem class: Collectible circles
class Gem {
  constructor() {
    this.size = random(15, 25);
    // Scale gem value with level - higher levels give more valuable gems
    let levelMultiplier = 1 + (level * 0.1); // 10% more points per level
    this.value = floor(map(this.size, 15, 25, 5, 15) * levelMultiplier);
    
    // Create vibrant, magical colors
    let hue = random(360); // Random hue around color wheel
    colorMode(HSB, 360, 100, 100, 255);
    this.color = color(
      hue, 
      random(70, 100), // High saturation 
      random(80, 100)  // High brightness
    );
    this.glowColor = color(
      (hue + 30) % 360, // Complementary color for glow
      80, 
      100
    );
    colorMode(RGB, 255, 255, 255, 255); // Switch back to RGB
    
    this.pos = this.randomPosition();
    this.direction = this.determineDirection();
    this.rotationSpeed = random(-0.05, 0.05);
    this.angle = random(TWO_PI);
    this.pulseAmount = 0;
    this.pulseSpeed = random(0.03, 0.08);
    this.glowing = true; // All jellybeans glow
    this.sparkleTime = random(20, 60); // Add occasional sparkle
  }
  
  randomPosition() {
    // Randomly choose to spawn from any of the four sides
    let spawnSide = floor(random(4)); // 0 = top, 1 = right, 2 = bottom, 3 = left
    
    switch(spawnSide) {
      case 0: // Top
    return createVector(
          random(0, width),
          -this.size
        );
      case 1: // Right
        return createVector(
          width + this.size,
          random(0, height)
        );
      case 2: // Bottom
        return createVector(
          random(0, width),
          height + this.size
        );
      case 3: // Left
    return createVector(
          -this.size,
          random(0, height)
        );
    }
  }
  
  determineDirection() {
    // Calculate direction vector toward a random point near the center
    let targetX = width/2 + random(-width/4, width/4);
    let targetY = height/2 + random(-height/4, height/4);
    let target = createVector(targetX, targetY);
    
    let dir = p5.Vector.sub(target, this.pos);
    dir.normalize();
    dir.mult(random(1, 3)); // Random speed between 1 and 3
    return dir;
  }
  
  update() {
    // Only move if game is playing
    if (gameState === "playing") {
      // Move in the determined direction
      this.pos.add(this.direction);
      
      // Rotate the jellybean
      this.angle += this.rotationSpeed;
      
      // Update pulse animation
      this.pulseAmount = sin(frameCount * this.pulseSpeed) * 0.2;
      
      // Occasional sparkle
      if (frameCount % this.sparkleTime < 2 && random() > 0.7) {
        // Add a small sparkle
        let sparkle = {
          x: this.pos.x + random(-this.size/2, this.size/2),
          y: this.pos.y + random(-this.size/3, this.size/3),
          size: random(2, 4),
          alpha: 255,
          color: this.glowColor,
          display: function() {
            noStroke();
            fill(red(this.color), green(this.color), blue(this.color), this.alpha);
            // Simple star
            push();
            translate(this.x, this.y);
            rotate(frameCount * 0.1);
            beginShape();
            for (let i = 0; i < 5; i++) {
              let angle = map(i, 0, 5, 0, TWO_PI);
              let sx = cos(angle) * this.size;
              let sy = sin(angle) * this.size;
              vertex(sx, sy);
              
              // Inner points
              let innerAngle = angle + TWO_PI/10;
              let innerSize = this.size * 0.4;
              let ix = cos(innerAngle) * innerSize;
              let iy = sin(innerAngle) * innerSize;
              vertex(ix, iy);
            }
            endShape(CLOSE);
            pop();
            
            // Fade out
            this.alpha -= 25;
          }
        };
        sparkles.push(sparkle);
      }
    }
    
    // Check if gem is off-screen on the opposite side
    return (this.pos.y > height + this.size || 
            this.pos.x < -this.size || 
            this.pos.x > width + this.size);
  }
  
  show() {
    push();
    translate(this.pos.x, this.pos.y);
    // Rotate jelly beans by calculated angle
    rotate(this.angle);
    
    // Draw glow effect if jellybean is glowing
    if (this.glowing) {
      for (let i = 3; i > 0; i--) {
    noStroke();
        fill(red(this.glowColor), green(this.glowColor), blue(this.glowColor), 100 - i * 20);
        // Pulse the size for magical effect
        let pulseSize = 1 + this.pulseAmount + i * 0.1;
        
        // Outer glow - jellybean shape
        ellipseMode(CENTER);
        ellipse(0, 0, this.size * 1.8 * pulseSize, this.size * 0.8 * pulseSize);
        
        // Rounded ends glow
        ellipse(this.size * 0.7, 0, this.size * 0.6 * pulseSize, this.size * 0.7 * pulseSize);
        ellipse(-this.size * 0.7, 0, this.size * 0.6 * pulseSize, this.size * 0.7 * pulseSize);
      }
    }
    
    // Draw main jellybean body (elongated rounded rect)
    noStroke();
    fill(this.color);
    ellipseMode(CENTER);
    ellipse(0, 0, this.size * 1.8, this.size * 0.8);
    
    // Rounded ends to give it that jellybean shape
    ellipse(this.size * 0.7, 0, this.size * 0.6, this.size * 0.7);
    ellipse(-this.size * 0.7, 0, this.size * 0.6, this.size * 0.7);
    
    // Add shine highlight for candy look
    fill(255, 255, 255, 120);
    ellipse(-this.size * 0.2, -this.size * 0.1, this.size * 0.4, this.size * 0.15);
    
    // Add sugar crystal texture
    for (let i = 0; i < 6; i++) {
      fill(255, 255, 255, random(80, 150));
      let px = random(-this.size * 0.7, this.size * 0.7);
      let py = random(-this.size * 0.3, this.size * 0.3);
      let dotSize = random(1, 3);
      ellipse(px, py, dotSize, dotSize);
    }
    
    pop();
  }
}

// Asteroid class: Irregular obstacles
class Asteroid {
  constructor() {
    this.pos = this.randomPosition();
    // Make asteroids faster and more unpredictable at higher levels
    let baseSpeed = 0.8 + (level/30); // Speed increases with level
    this.size = random(20, 40);
    this.rotation = random(-0.05, 0.05);
    this.angle = 0;
    this.direction = this.determineDirection();
    
    // Apply level-based speed multiplier
    this.direction.mult(baseSpeed);
  }
  
  randomPosition() {
    // Randomly choose to spawn from any of the four sides
    let spawnSide = floor(random(4)); // 0 = top, 1 = right, 2 = bottom, 3 = left
    
    switch(spawnSide) {
      case 0: // Top
    return createVector(
          random(0, width),
          -this.size * 2
        );
      case 1: // Right
        return createVector(
          width + this.size * 2,
          random(0, height)
        );
      case 2: // Bottom
        return createVector(
          random(0, width),
          height + this.size * 2
        );
      case 3: // Left
    return createVector(
          -this.size * 2,
          random(0, height)
        );
    }
  }
  
  determineDirection() {
    // Calculate direction vector toward a random point in the screen
    let targetX = random(width * 0.2, width * 0.8);
    let targetY = random(height * 0.2, height * 0.8);
    let target = createVector(targetX, targetY);
    
    let dir = p5.Vector.sub(target, this.pos);
    dir.normalize();
    dir.mult(random(0.8, 2.5)); // Random speed
    return dir;
  }
  
  update() {
    // Only move if game is playing
    if (gameState === "playing") {
      // Move in the determined direction
      this.pos.add(this.direction);
      
      // Rotate asteroid
      this.angle += this.rotation;
    }
    
    // Check if asteroid is off-screen on the opposite side
    return (this.pos.y > height + this.size || 
            this.pos.x < -this.size || 
            this.pos.x > width + this.size);
  }
  
  show() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);
    fill(100, 80, 60); // Grayish-brown
    noStroke();
    beginShape();
    for (let i = 0; i < TWO_PI; i += PI / 6) {
      let r = this.size / 2 + random(-5, 5); // Irregular shape
      vertex(cos(i) * r, sin(i) * r);
    }
    endShape(CLOSE);
    pop();
  }
}

// Spawn functions
function spawnGem() {
  // Check for special gem (1% chance)
  if (random() < specialGemChance) {
    let specialGem = new Gem();
    specialGem.isSpecial = true;
    specialGem.value = 50; // 5-10x normal value
    specialGem.size *= 1.5; // Bigger
    
    // Special rainbow color
    colorMode(HSB, 360, 100, 100, 255);
    specialGem.color = color(
      (frameCount * 2) % 360, // Rainbow hue that changes over time
      100, 
      100
    );
    specialGem.glowColor = color(
      ((frameCount * 2) + 180) % 360, // Complementary color
      100, 
      100
    );
    colorMode(RGB, 255, 255, 255, 255);
    
    gems.push(specialGem);
    
    // Add notification for special gem
    addFloatingText(width/2, height/2 - 100, "SPECIAL GEM APPEARED!");
  } else {
    // Normal gem
  gems.push(new Gem());
  }
}

function spawnAsteroid() {
  asteroids.push(new Asteroid());
}

// Handle restart and sound toggle
function keyPressed() {
  // Don't process key events if an input field is focused
  if (window.inputFocused) return;
  
  // Check for the 'R' key to reset the game
  if (key === 'r' || key === 'R') {
    resetGame();
  }
  
  // Check for the 'M' key to toggle music
  if (key === 'm' || key === 'M') {
    if (backgroundMusic.isPlaying) {
      stopBackgroundMusic();
    } else {
      startBackgroundMusic();
    }
  }
  
  // Check for the 'S' key to open skin menu
  if (key === 's' || key === 'S') {
    if (gameState === "playing") {
      gameState = "skinMenu";
    } else if (gameState === "skinMenu") {
      gameState = "playing";
    }
  }
  
  // Check for the 'D' key to reset game data (debug)
  if (key === 'd' || key === 'D') {
    if (keyIsDown(SHIFT)) {
      resetGameData();
    }
  }
  
  // Check for ESC key to exit skin menu
  if (keyCode === ESCAPE && gameState === "skinMenu") {
    gameState = "playing";
  }
}

function resetGame() {
  player = new Player();
  gems = [];
  asteroids = [];
  powerUps = []; // Clear power-ups
  lasers = []; // Clear lasers
  score = 0;
  distanceTraveled = 0;
  level = 1;
  scrollSpeed = 2;
  gameState = "playing";
  rainbowTrail = [];
  sparkles = [];
  messages = [];
  
  // Reset shield state
  hasShield = false;
  shieldTimer = 0;
  
  // Reset combo
  comboCounter = 0;
  comboTimer = 0;
  comboMultiplier = 1;
  
  // Save game data
  saveGameData();
  
  // Restart background music if it was stopped
  if (!backgroundMusic.isPlaying && audioContext) {
    startBackgroundMusic();
  }
}

function updateGameDifficulty() {
  // Get previous level to check for level up
  let previousLevel = level;
  
  // Increase level more gradually but with no cap (internal tracking only)
  // Every 500 distance = 1 level
  level = floor(distanceTraveled / 500) + 1;
  
  // Progressive difficulty scaling with level
  // - Scroll speed increases with level (capped at a reasonable maximum)
  scrollSpeed = min(2 + level * 0.2, 15); // Starts at 2.2, max 15
  
  // No win condition - game continues until player dies
  
  // Game gets harder as level increases:
  // 1. Asteroid speed increases
  // 2. More frequent obstacles
  // 3. Gems worth more points at higher levels
  
  // Display ONLY score (no level display)
  fill(255);
  textSize(20);
  textAlign(LEFT);
  text(`Score: ${score}`, 20, 30);
  
  // Removed all level display from UI
}

function updateStarfield() {
  // Only update distance and scroll if game is still playing
  if (gameState === "playing") {
    // Increase distance traveled
    distanceTraveled += scrollSpeed;
  }
  
  // Draw and update stars with vertical scrolling
  for (let i = 0; i < starfield.length; i++) {
    let star = starfield[i];
    
    // Move stars downward to create upward scrolling effect
    // Only move stars if game is still playing
    if (gameState === "playing") {
      star.y += star.speed * scrollSpeed;
    }
    
    // Reset stars that go off-screen
    if (star.y > height) {
      star.y = -10;
      star.x = random(0, width);
    }
    
    // Draw the star
    fill(255, random(200, 255)); // Flickering white stars
    noStroke();
    circle(star.x, star.y, star.size);
  }
}

// Function to create a shooting star
function createShootingStar() {
  let shootingStar = {
    x: random(-100, width + 100),
    y: random(-50, height/3),
    length: random(100, 200),
    speed: random(10, 20),
    angle: random(PI/6, PI/3), // Mostly downward angles
    thickness: random(2, 4),
    trail: [],
    maxTrail: 10,
    update: function() {
      // Move the shooting star
      this.x += cos(this.angle) * this.speed;
      this.y += sin(this.angle) * this.speed;
      
      // Add position to trail
      this.trail.push({x: this.x, y: this.y});
      
      // Trim trail to max length
      if (this.trail.length > this.maxTrail) {
        this.trail.shift();
      }
      
      // Check if off screen
      return (this.x < -this.length || this.x > width + this.length || 
              this.y < -this.length || this.y > height + this.length);
    },
    display: function() {
      // Draw the trail with gradient
      if (this.trail.length >= 2) {
        for (let i = 1; i < this.trail.length; i++) {
          let alpha = map(i, 0, this.trail.length-1, 50, 255);
          strokeWeight(this.thickness * (i / this.trail.length));
          stroke(255, 255, 255, alpha);
          line(this.trail[i-1].x, this.trail[i-1].y, this.trail[i].x, this.trail[i].y);
        }
      }
      
      // Draw the bright head
      noStroke();
      fill(255);
      ellipse(this.x, this.y, this.thickness * 3, this.thickness * 3);
      
      // Draw glow around head
      for (let i = 3; i > 0; i--) {
        fill(255, 255, 255, 255 / (i * 2));
        ellipse(this.x, this.y, this.thickness * 3 + i * 4, this.thickness * 3 + i * 4);
      }
    }
  };
  
  shootingStars.push(shootingStar);
}

// Function to update background effects
function updateBackgroundEffects() {
  // Update and draw shooting stars
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    shootingStars[i].display();
    if (shootingStars[i].update()) {
      shootingStars.splice(i, 1);
    }
  }
}

// Rainbow Particle class for the unicorn's trail
class RainbowParticle {
  constructor(x, y, isBurst = false) {
    this.pos = createVector(x, y);
    this.vel = createVector(random(-0.7, 0.7), random(0.5, 2.0));
    
    // Add stronger velocity for burst particles
    if (isBurst) {
      this.vel = createVector(random(-2, 2), random(-1, 3));
    }
    
    this.size = random(5, 15); // Slightly smaller particles
    this.alpha = 255; // Start fully opaque
    
    // More magical color selection - true rainbow colors
    let colorChoice = floor(random(7)); // Choose one of 7 rainbow colors
    switch(colorChoice) {
      case 0: this.color = color(255, 50, 50); break;   // Red
      case 1: this.color = color(255, 150, 50); break;  // Orange
      case 2: this.color = color(255, 255, 50); break;  // Yellow
      case 3: this.color = color(50, 255, 50); break;   // Green
      case 4: this.color = color(50, 150, 255); break;  // Blue
      case 5: this.color = color(150, 50, 255); break;  // Indigo
      case 6: this.color = color(255, 100, 255); break; // Pink/Violet
    }
    
    this.glowing = random() > 0.7; // 30% chance to be a glowing particle - increased from 10% for more magic
    this.spin = random(-0.05, 0.05); // Reduced spin speed
    this.angle = random(TWO_PI);
    this.shape = random() > 0.5 ? floor(random(2)) + 1 : 0; // More stars/hearts (50% chance), rest circles
    
    // Special magical properties
    this.twinkle = random() > 0.8; // 20% chance to twinkle
    this.twinkleRate = random(0.05, 0.15); // How fast it twinkles
    this.specialTrail = random() > 0.9; // 10% chance to have tiny trailing particles
    this.birthTime = frameCount; // Remember when particle was created
    
    // Pre-calculate heart shape if needed
    if (this.shape === 2) {
      this.heartPoints = [];
      for (let a = 0; a < TWO_PI; a += 0.2) {
        let r = (16 * pow(sin(a), 3)) * this.size * 0.04;
        this.heartPoints.push({
          x: r * cos(a),
          y: -r * sin(a)
        });
      }
    }
  }
  
  update() {
    this.pos.add(this.vel);
    this.alpha -= 6; // Fade out at medium rate (between 4 and 8)
    this.size *= 0.96; // Shrink at medium rate (between 0.95 and 0.97)
    this.angle += this.spin;
    
    // Add subtle magical movement - gentle swaying
    if (frameCount % 2 === 0) { // Only do every other frame for performance
      this.vel.x += sin((frameCount - this.birthTime) * 0.1) * 0.02;
    }
    
    // Create mini trailing particles for special particles
    if (this.specialTrail && frameCount % 4 === 0 && random() > 0.5) { // Limit frequency
      sparkles.push({
        x: this.pos.x + random(-3, 3),
        y: this.pos.y + random(-3, 3),
        size: random(1, 2),
        xSpeed: random(-0.5, 0.5),
        ySpeed: random(-0.5, 0.5),
        alpha: 150,
        color: this.color,
        display: function() {
          noStroke();
          fill(red(this.color), green(this.color), blue(this.color), this.alpha);
          ellipse(this.x, this.y, this.size, this.size);
          this.x += this.xSpeed;
          this.y += this.ySpeed;
          this.alpha -= 15; // Fade quickly
        }
      });
    }
    
    return this.alpha <= 0; // Return true if particle should be removed
  }
  
  show() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);
    
    noStroke();
    // Add twinkle effect for twinkling particles
    let brightnessMultiplier = 1;
    if (this.twinkle) {
      brightnessMultiplier = 0.7 + sin((frameCount - this.birthTime) * this.twinkleRate) * 0.3;
    }
    
    // Set the color with transparency and brightness variation
    let c = this.color;
    let displayAlpha = this.alpha * brightnessMultiplier;
    
    // Draw glow effect for glowing particles
    if (this.glowing) {
      for (let i = 2; i > 0; i--) { // Two layers of glow
        fill(red(c), green(c), blue(c), displayAlpha * 0.3);
        let glowSize = this.size + i * 5;
        
        if (this.shape === 0) {
          // Circle with glow
          ellipse(0, 0, glowSize, glowSize);
        } else if (this.shape === 1) {
          // Star with glow
          drawStar(0, 0, glowSize, glowSize/2, 5);
        } else {
          // Heart with glow
          drawHeartOptimized(0, 0, glowSize, this.heartPoints);
        }
      }
    }
    
    // Draw the main particle
    fill(red(c), green(c), blue(c), displayAlpha);
    
    if (this.shape === 0) {
      // Circle
      ellipse(0, 0, this.size, this.size);
    } else if (this.shape === 1) {
      // Star
      drawStar(0, 0, this.size, this.size/2, 5);
    } else {
      // Heart
      drawHeartOptimized(0, 0, this.size, this.heartPoints);
    }
    
    pop();
  }
}

// Helper function to draw a star
function drawStar(x, y, outerRadius, innerRadius, points) {
  let angleStep = TWO_PI / points / 2;
  beginShape();
  for (let i = 0; i < points * 2; i++) {
    let radius = i % 2 === 0 ? outerRadius : innerRadius;
    let px = x + cos(i * angleStep) * radius;
    let py = y + sin(i * angleStep) * radius;
    vertex(px, py);
  }
  endShape(CLOSE);
}

// Optimized version of drawHeart using pre-calculated points
function drawHeartOptimized(x, y, size, points) {
  if (!points || points.length === 0) return; // Skip if no points
  
  beginShape();
  for (let pt of points) {
    vertex(pt.x, pt.y);
  }
  endShape(CLOSE);
}

// Function to center the canvas when window is resized
function windowResized() {
  // Resize canvas based on new window dimensions
  let canvasWidth = min(windowWidth - 40, 800);
  let canvasHeight = min(windowHeight - 200, 600);
  resizeCanvas(canvasWidth, canvasHeight);
  
  // Update canvas positioning
  let canvasElt = document.getElementById('defaultCanvas0');
  if (canvasElt) {
    // Center the canvas in the window
    canvasElt.style.margin = '0 auto';
  }
}

// Function to handle touch controls
function touchMoved() {
  // Don't handle touch events when game is over or modals are active
  if (gameState === "gameover") {
    return true; // Allow default behavior when game is over
  }
  
  // Only prevent default if inside canvas and game is active
  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    // Update player position for touch movement
    if (gameState === "playing") {
      const touchFactor = isMobile ? 1.5 : 1; // Faster movement on mobile
      
      // Calculate delta from previous position
      const deltaX = mouseX - pmouseX;
      const deltaY = mouseY - pmouseY;
      
      // Add smoothing for touch movements
      const smoothingFactor = 0.7;
      const smoothDeltaX = deltaX * smoothingFactor * touchFactor;
      const smoothDeltaY = deltaY * smoothingFactor * touchFactor;
      
      // Update player position
      player.pos.x += smoothDeltaX;
      player.pos.y += smoothDeltaY;
      
      // Keep player within bounds
      player.pos.x = constrain(player.pos.x, player.size, width - player.size);
      player.pos.y = constrain(player.pos.y, player.size, height - player.size);
      
      // Create rainbow trail with stronger burst effect for mobile
      if (frameCount % 2 === 0) {
        // Regular trail particles
        rainbowTrail.push(
          new RainbowParticle(
            player.pos.x + random(-player.size * 0.2, player.size * 0.2), 
            player.pos.y + player.size * 0.9 // Position at bottom of unicorn (fart position)
          )
        );
        
        // Occasional rainbow burst for more visibility (fart burst)
        if (frameCount % 10 === 0 && (abs(deltaX) > 1 || abs(deltaY) > 1)) {
          createRainbowBurst(player.pos.x, player.pos.y + player.size * 0.9);
        }
        
        if (rainbowTrail.length > 25) {
          rainbowTrail.shift();
        }
      }
    }
    
    return false; // Prevent default action only for canvas area
  }
  // Return true to allow default behavior (like scrolling) outside the canvas
  return true;
}

// Function to handle touch on screen
function touchStarted() {
  // Don't handle touch events when modals are active
  if (gameState === "gameover") {
    // Check if touch is inside canvas
    if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
      // Only restart game if touch is on canvas and not on modal elements
      // This will be further managed by the pointerEvents handling in the HTML
      resetGame();
      return false;
    }
    return true; // Allow default behavior outside canvas
  }
  
  // Check if the return button was tapped in skin menu
  if (gameState === "skinMenu" && window.returnButtonArea) {
    const btn = window.returnButtonArea;
    if (mouseX >= btn.x && mouseX <= btn.x + btn.width &&
        mouseY >= btn.y && mouseY <= btn.y + btn.height) {
      // Return to game
      gameState = "playing";
      // Play a sound for feedback
      playCollectSound();
      return false; // Prevent default
    }
  }
  
  // Check if the skin hint was tapped (for mobile users)
  if (gameState === "playing" && window.skinHintArea) {
    const hint = window.skinHintArea;
    if (mouseX >= hint.x && mouseX <= hint.x + hint.width &&
        mouseY >= hint.y && mouseY <= hint.y + hint.height) {
      // Open skin menu
      gameState = "skinMenu";
      // Play a sound for feedback
      playCollectSound();
      return false; // Prevent default
    }
  }
  
  // If audio hasn't been initialized yet, do it now
  if (!audioInitialized && audioContext) {
    initAudio();
  }
  
  // Only prevent default if inside canvas
  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    return false; // Prevent default action only for canvas area
  }
  // Return true to allow default behavior (like scrolling) outside the canvas
  return true;
}

// Function to create a burst of rainbow particles (fart burst)
function createRainbowBurst(x, y) {
  // Create a burst of 5-10 particles
  let burstCount = floor(random(5, 10));
  for (let i = 0; i < burstCount; i++) {
    rainbowTrail.push(
      new RainbowParticle(
        x + random(-10, 10),
        y,
        true // Mark as burst particle for stronger velocity
      )
    );
  }
}

// PowerUp class for shield power-up
class PowerUp {
  constructor() {
    this.size = 30;
    this.pos = this.randomPosition();
    this.direction = this.determineDirection();
    this.angle = 0;
    this.rotationSpeed = 0.04;
    this.glowAmount = 0;
    this.glowSpeed = 0.1;
    this.type = "shield"; // Default type is shield
  }
  
  randomPosition() {
    // Randomly spawn from one of the four sides, similar to gems
    let spawnSide = floor(random(4)); // 0 = top, 1 = right, 2 = bottom, 3 = left
    
    switch(spawnSide) {
      case 0: // Top
        return createVector(
          random(0, width),
          -this.size
        );
      case 1: // Right
        return createVector(
          width + this.size,
          random(0, height)
        );
      case 2: // Bottom
        return createVector(
          random(0, width),
          height + this.size
        );
      case 3: // Left
        return createVector(
          -this.size,
          random(0, height)
        );
    }
  }
  
  determineDirection() {
    // Calculate direction vector toward center with some randomness
    let targetX = width/2 + random(-width/6, width/6);
    let targetY = height/2 + random(-height/6, height/6);
    let target = createVector(targetX, targetY);
    
    let dir = p5.Vector.sub(target, this.pos);
    dir.normalize();
    dir.mult(random(0.8, 1.5)); // Slower than gems for better visibility
    return dir;
  }
  
  update() {
    // Only move if game is playing
    if (gameState === "playing") {
      // Move in the determined direction
      this.pos.add(this.direction);
      
      // Rotate the power-up
      this.angle += this.rotationSpeed;
      
      // Update glow pulse
      this.glowAmount = sin(frameCount * this.glowSpeed) * 0.5;
    }
    
    // Check if power-up is off-screen
    return (this.pos.y > height + this.size || 
            this.pos.x < -this.size || 
            this.pos.x > width + this.size);
  }
  
  show() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);
    
    // Draw glow effect
    for (let i = 3; i > 0; i--) {
      let glowSize = this.size * (1 + this.glowAmount) + i * 5;
      let alpha = map(i, 3, 1, 50, 150);
      
      // Rainbow color based on frame
      colorMode(HSB, 360, 100, 100, 255);
      let hue = (frameCount * 2) % 360;
      fill(hue, 90, 100, alpha);
      noStroke();
      ellipse(0, 0, glowSize, glowSize);
      colorMode(RGB, 255, 255, 255, 255);
    }
    
    // Draw main shield icon
    fill(220, 220, 255);
    stroke(100, 200, 255);
    strokeWeight(2);
    ellipse(0, 0, this.size, this.size);
    
    // Draw shield symbol inside
    noFill();
    stroke(50, 100, 255);
    strokeWeight(3);
    arc(0, 0, this.size * 0.6, this.size * 0.6, PI * 0.25, PI * 0.75);
    line(-this.size * 0.2, this.size * 0.1, 0, -this.size * 0.2);
    line(this.size * 0.2, this.size * 0.1, 0, -this.size * 0.2);
    
    pop();
  }
}

// Function to spawn a shield power-up
function spawnPowerUp() {
  // Increase the chance of laser power-ups to 70% (was 50%)
  if (random() < 0.3) {
    powerUps.push(new PowerUp()); // Shield power-up (30% chance)
  } else {
    powerUps.push(new LaserPowerUp()); // Laser power-up (70% chance)
  }
}

// Laser Power-Up class
class LaserPowerUp extends PowerUp {
  constructor() {
    super(); // Call parent constructor
    this.type = "laser"; // Set type to laser
  }
  
  show() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);
    
    // Draw glow effect
    for (let i = 3; i > 0; i--) {
      let glowSize = this.size * (1 + this.glowAmount) + i * 5;
      let alpha = map(i, 3, 1, 50, 150);
      
      // Rainbow color based on frame
      colorMode(HSB, 360, 100, 100, 255);
      let hue = (frameCount * 2) % 360;
      fill(hue, 90, 100, alpha);
      noStroke();
      ellipse(0, 0, glowSize, glowSize);
      colorMode(RGB, 255, 255, 255, 255);
    }
    
    // Draw main laser icon
    fill(255, 100, 100);
    stroke(255, 200, 200);
    strokeWeight(2);
    ellipse(0, 0, this.size, this.size);
    
    // Draw laser symbol inside
    stroke(255, 50, 50);
    strokeWeight(3);
    
    // Draw a lightning bolt or laser beam symbol
    beginShape();
    vertex(-this.size * 0.2, -this.size * 0.3);
    vertex(0, 0);
    vertex(-this.size * 0.2, this.size * 0.3);
    endShape();
    
    beginShape();
    vertex(this.size * 0.2, -this.size * 0.3);
    vertex(0, 0);
    vertex(this.size * 0.2, this.size * 0.3);
    endShape();
    
    pop();
  }
}

// Function to add floating text (general version of addFloatingScore)
function addFloatingText(x, y, message) {
  let floatingText = {
    x: x,
    y: y,
    message: message,
    alpha: 255,
    ySpeed: -2,
    display: function() {
      textAlign(CENTER);
      textSize(20);
      fill(100, 200, 255, this.alpha);
      // Add glow
      for (let i = 3; i > 0; i--) {
        fill(100, 200, 255, this.alpha * 0.3);
        text(this.message, this.x, this.y + i);
      }
      fill(200, 230, 255, this.alpha);
      text(this.message, this.x, this.y);
      this.y += this.ySpeed;
      this.alpha -= 5; // Fade out
    }
  };
  messages.push(floatingText);
}

// Function to create shield burst effect when an asteroid hits the shield
function createShieldBurst(x, y) {
  // Create a burst of 20-30 particles
  let burstCount = floor(random(20, 30));
  
  for (let i = 0; i < burstCount; i++) {
    let angle = random(TWO_PI);
    let distance = random(30, 60);
    let speed = random(3, 8);
    
    sparkles.push({
      x: x,
      y: y,
      size: random(3, 8),
      xSpeed: cos(angle) * speed,
      ySpeed: sin(angle) * speed,
      alpha: 255,
      color: color(
        random(100, 200), 
        random(200, 255), 
        random(200, 255)
      ),
      display: function() {
        noStroke();
        fill(red(this.color), green(this.color), blue(this.color), this.alpha);
        circle(this.x, this.y, this.size);
        
        // Update position
        this.x += this.xSpeed;
        this.xSpeed *= 0.95; // Slow down
        this.y += this.ySpeed;
        this.ySpeed *= 0.95; // Slow down
        
        // Fade out
        this.alpha -= 8;
      }
    });
  }
  
  // Create rainbow burst effect
  for (let i = 0; i < 10; i++) {
    createRainbowBurst(
      x + random(-20, 20),
      y + random(-20, 20)
    );
  }
}

// Function to play a simple sound when collecting a gem
function playCollectSound() {
  if (!audioContext) return; // Skip if audio context not available
  
  try {
    // Create an oscillator
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connect oscillator to gain node and gain node to destination
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Set oscillator properties
    oscillator.type = 'sine'; // 'sine', 'square', 'sawtooth', 'triangle'
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
    oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.1); // Slide down to A4
    
    // Set gain (volume) to avoid clipping
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    // Start and stop the oscillator
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch(e) {
    console.warn('Error playing sound:', e);
  }
}

// Function to play shield activation sound
function playShieldSound() {
  if (!audioContext) return; // Skip if audio context not available
  
  try {
    // Create oscillator and gain nodes
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Set oscillator properties - upward sweep for shield activation
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(220, audioContext.currentTime); // Start at A3
    oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.3); // Sweep up to A5
    
    // Set gain with a longer sustain for shield sound
    gainNode.gain.setValueAtTime(0.01, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1); // Quick ramp up
    gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.2); // Sustain
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4); // Fade out
    
    // Start and stop the oscillator
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.4);
  } catch(e) {
    console.warn('Error playing shield sound:', e);
  }
}

// Function to play game over sound
function playGameOverSound() {
  if (!audioContext) return; // Skip if audio context not available
  
  try {
    // Create oscillator and gain nodes
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Set oscillator properties - downward sweep for game over
    oscillator.type = 'sawtooth'; // More harsh sound for game over
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // Start at A4
    oscillator.frequency.linearRampToValueAtTime(110, audioContext.currentTime + 0.5); // Sweep down to A2
    
    // Set gain with a longer decay for dramatic effect
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
    
    // Start and stop the oscillator
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.8);
  } catch(e) {
    console.warn('Error playing game over sound:', e);
  }
}

// Function to play a sound when destroying an asteroid with shield
function playAsteroidDestroySound() {
  if (!audioContext) return; // Skip if audio context not available
  
  try {
    // Create oscillators for a more complex sound
    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connect nodes
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Set oscillator properties - explosive sound
    osc1.type = 'square'; // More harsh sound for explosion
    osc2.type = 'sawtooth'; // Add some grit
    
    // First oscillator - higher pitch descending
    osc1.frequency.setValueAtTime(220, audioContext.currentTime); // A3
    osc1.frequency.exponentialRampToValueAtTime(110, audioContext.currentTime + 0.2); // Down to A2
    
    // Second oscillator - lower rumble
    osc2.frequency.setValueAtTime(110, audioContext.currentTime); // A2
    osc2.frequency.exponentialRampToValueAtTime(55, audioContext.currentTime + 0.3); // Down to A1
    
    // Set gain with quick attack and medium decay
    gainNode.gain.setValueAtTime(0.01, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05); // Quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3); // Medium decay
    
    // Start and stop the oscillators
    osc1.start();
    osc2.start();
    osc1.stop(audioContext.currentTime + 0.3);
    osc2.stop(audioContext.currentTime + 0.3);
  } catch(e) {
    console.warn('Error playing asteroid destroy sound:', e);
  }
}

// Function to start background music
function startBackgroundMusic() {
  if (!audioContext || backgroundMusic.isPlaying) return;
  
  // Resume audio context if it was suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  
  backgroundMusic.isPlaying = true;
  backgroundMusic.noteIndex = 0;
  backgroundMusic.nextNoteTime = audioContext.currentTime;
  
  // Schedule the first note
  scheduleNextNote();
}

// Function to stop background music
function stopBackgroundMusic() {
  if (!backgroundMusic.isPlaying) return;
  
  // Clear any pending timers
  if (backgroundMusic.timer) {
    clearTimeout(backgroundMusic.timer);
    backgroundMusic.timer = null;
  }
  
  // Stop any currently playing oscillators
  backgroundMusic.oscillators.forEach(osc => {
    try {
      osc.stop();
      osc.disconnect();
    } catch (e) {
      // Ignore errors if oscillator was already stopped
    }
  });
  
  backgroundMusic.oscillators = [];
  backgroundMusic.gainNodes = [];
  backgroundMusic.isPlaying = false;
}

// Function to schedule the next note in the sequence
function scheduleNextNote() {
  if (!backgroundMusic.isPlaying || !audioContext) return;
  
  const currentNote = backgroundMusic.sequence[backgroundMusic.noteIndex];
  const noteDuration = 60 / backgroundMusic.tempo * currentNote.duration;
  
  // Play the current note
  playNote(currentNote.note, noteDuration);
  
  // Advance to next note
  backgroundMusic.noteIndex = (backgroundMusic.noteIndex + 1) % backgroundMusic.sequence.length;
  backgroundMusic.nextNoteTime += noteDuration;
  
  // Schedule the next note
  const nextNoteDelay = (backgroundMusic.nextNoteTime - audioContext.currentTime) * 1000;
  backgroundMusic.timer = setTimeout(scheduleNextNote, nextNoteDelay);
}

// Function to play a single note
function playNote(noteName, duration) {
  if (!audioContext) return;
  
  try {
    // Convert note name to frequency
    const frequency = noteToFrequency(noteName);
    
    // Create oscillator and gain node
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Set oscillator properties
    oscillator.type = 'triangle'; // Softer sound for background music
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    
    // Set gain with envelope
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.05); // Attack
    gainNode.gain.linearRampToValueAtTime(0.08, audioContext.currentTime + duration * 0.5); // Sustain
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration); // Release
    
    // Start and stop the oscillator
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
    
    // Store references to clean up later
    backgroundMusic.oscillators.push(oscillator);
    backgroundMusic.gainNodes.push(gainNode);
    
    // Clean up after the note is done
    setTimeout(() => {
      const index = backgroundMusic.oscillators.indexOf(oscillator);
      if (index !== -1) {
        backgroundMusic.oscillators.splice(index, 1);
        backgroundMusic.gainNodes.splice(index, 1);
      }
    }, duration * 1000 + 100);
  } catch(e) {
    console.warn('Error playing background music note:', e);
  }
}

// Helper function to convert note names to frequencies
function noteToFrequency(note) {
  const notes = { 'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11 };
  const noteName = note.slice(0, -1);
  const octave = parseInt(note.slice(-1));
  
  // A4 is 440Hz
  const semitoneFromA4 = (octave - 4) * 12 + notes[noteName] - notes['A'];
  return 440 * Math.pow(2, semitoneFromA4 / 12);
}

// Function to draw a prompt for mobile users to tap for audio
function drawAudioPrompt() {
  // Semi-transparent overlay
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);
  
  // White text
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(24);
  text("TAP ANYWHERE TO START AUDIO", width/2, height/2);
  
  // Pulsing border
  noFill();
  stroke(255, 255, 255, 128 + 127 * sin(frameCount * 0.05));
  strokeWeight(4);
  rect(width/2 - 180, height/2 - 30, 360, 60, 10);
  noStroke();
}

// Function to initialize audio on first touch (for mobile)
function initAudioOnFirstTouch() {
  // Hide the prompt
  showAudioPrompt = false;
  
  // Initialize audio
  initAudio();
  
  // Remove the event listener since we only need it once
  document.removeEventListener('touchstart', initAudioOnFirstTouch);
}

// Function to initialize audio
function initAudio() {
  if (audioInitialized || !audioContext) return;
  
  // Resume audio context if it was suspended
  if (audioContext.state === 'suspended') {
    audioContext.resume().then(() => {
      console.log('AudioContext resumed successfully');
      startBackgroundMusic();
    }).catch(error => {
      console.error('Failed to resume AudioContext:', error);
    });
  } else {
    startBackgroundMusic();
  }
  
  audioInitialized = true;
}

// VIRAL GAME FEATURES

// Function to load saved game data from localStorage
function loadGameData() {
  console.log("Loading game data from localStorage...");
  
  try {
    // Load total coins
    const savedCoins = localStorage.getItem('unicornGame_totalCoins');
    if (savedCoins !== null) {
      const parsedCoins = parseInt(savedCoins);
      if (!isNaN(parsedCoins) && parsedCoins >= 0) {
        totalCoins = parsedCoins;
        console.log(`Loaded coins: ${totalCoins}`);
      } else {
        console.warn(`Invalid saved coins value: ${savedCoins}, using default value`);
        totalCoins = 0;
      }
    } else {
      console.log("No saved coins found, using default value");
      totalCoins = 0;
    }
    
    // Load unlocked skins
    const savedSkins = localStorage.getItem('unicornGame_skins');
    if (savedSkins !== null) {
      try {
        const unlockedSkins = JSON.parse(savedSkins);
        console.log(`Loaded skin data: ${savedSkins}`);
        
        // Ensure we have the right number of skins
        if (unlockedSkins.length === unicornSkins.length) {
          for (let i = 0; i < unicornSkins.length; i++) {
            unicornSkins[i].unlocked = unlockedSkins[i] === true;
            console.log(`Skin ${i} (${unicornSkins[i].name}): unlocked = ${unicornSkins[i].unlocked}`);
          }
        } else {
          console.warn(`Mismatch in saved skins length: expected ${unicornSkins.length}, got ${unlockedSkins.length}`);
          // Handle the case where saved data doesn't match current skins
          // Only update the skins we have data for
          for (let i = 0; i < Math.min(unicornSkins.length, unlockedSkins.length); i++) {
            unicornSkins[i].unlocked = unlockedSkins[i] === true;
          }
          
          // Ensure first skin is always unlocked
          unicornSkins[0].unlocked = true;
        }
      } catch (e) {
        console.error("Error parsing saved skin data:", e);
        // Reset to default - first skin unlocked
        unicornSkins.forEach((skin, index) => {
          skin.unlocked = index === 0;
        });
      }
    } else {
      console.log("No saved skin data found, using default values");
      // Reset to default - first skin unlocked
      unicornSkins.forEach((skin, index) => {
        skin.unlocked = index === 0;
      });
    }
    
    // Load current skin
    const savedSkinIndex = localStorage.getItem('unicornGame_currentSkin');
    if (savedSkinIndex !== null) {
      const index = parseInt(savedSkinIndex);
      // Validate the index
      if (index >= 0 && index < unicornSkins.length && unicornSkins[index].unlocked) {
        currentSkinIndex = index;
        console.log(`Loaded current skin index: ${currentSkinIndex} (${unicornSkins[currentSkinIndex].name})`);
      } else {
        console.warn(`Invalid saved skin index: ${index}, using default`);
        currentSkinIndex = 0; // Reset to first skin
      }
    } else {
      console.log("No saved current skin found, using default value");
      currentSkinIndex = 0;
    }
    
    // Load challenge progress
    const savedChallengeProgress = localStorage.getItem('unicornGame_challengeProgress');
    if (savedChallengeProgress !== null) {
      try {
        const challengeData = JSON.parse(savedChallengeProgress);
        
        // Only use saved challenge if it's from today
        const today = new Date().toDateString();
        if (challengeData.date === today) {
          challengeProgress = challengeData.progress || 0;
          challengeCompleted = challengeData.completed || false;
          gemsCollected = challengeData.gemsCollected || 0;
          asteroidsDestroyed = challengeData.asteroidsDestroyed || 0;
        }
      } catch (e) {
        console.error("Error parsing saved challenge data:", e);
      }
    }
    
    console.log('Game data loaded successfully');
    console.log(`Final loaded state - Coins: ${totalCoins}, Current Skin: ${currentSkinIndex}`);
    
    // Validate final state
    if (isNaN(totalCoins)) {
      console.error("totalCoins is NaN after loading, resetting to 0");
      totalCoins = 0;
    }
  } catch (e) {
    console.warn('Error loading game data:', e);
    // Reset to safe defaults
    totalCoins = 0;
    currentSkinIndex = 0;
    unicornSkins.forEach((skin, index) => {
      skin.unlocked = index === 0;
    });
  }
}

// Function to save game data to localStorage
function saveGameData() {
  try {
    // Save total coins
    localStorage.setItem('unicornGame_totalCoins', totalCoins);
    
    // Save unlocked skins
    const unlockedSkins = unicornSkins.map(skin => skin.unlocked);
    localStorage.setItem('unicornGame_skins', JSON.stringify(unlockedSkins));
    
    // Save current skin
    localStorage.setItem('unicornGame_currentSkin', currentSkinIndex);
    
    // Save challenge progress
    const challengeData = {
      date: new Date().toDateString(),
      progress: challengeProgress,
      completed: challengeCompleted,
      gemsCollected: gemsCollected,
      asteroidsDestroyed: asteroidsDestroyed
    };
    localStorage.setItem('unicornGame_challengeProgress', JSON.stringify(challengeData));
    
    console.log('Game data saved successfully');
  } catch (e) {
    console.warn('Error saving game data:', e);
  }
}

// Function to set up the daily challenge
function setupDailyChallenge() {
  // Get today's date
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  
  // Select challenge based on day of year
  currentChallenge = dailyChallenges[dayOfYear % dailyChallenges.length];
  
  // Reset progress if we don't have saved progress for today
  const savedChallengeProgress = localStorage.getItem('unicornGame_challengeProgress');
  if (savedChallengeProgress === null) {
    challengeProgress = 0;
    challengeCompleted = false;
    gemsCollected = 0;
    asteroidsDestroyed = 0;
  } else {
    const challengeData = JSON.parse(savedChallengeProgress);
    if (challengeData.date !== today.toDateString()) {
      challengeProgress = 0;
      challengeCompleted = false;
      gemsCollected = 0;
      asteroidsDestroyed = 0;
    }
  }
  
  console.log('Daily challenge set up:', currentChallenge.description);
}

// Function to update challenge progress
function updateChallengeProgress(type, amount = 1) {
  if (challengeCompleted || !currentChallenge) return;
  
  if (currentChallenge.type === type) {
    challengeProgress += amount;
    
    // Check if challenge is completed
    if (challengeProgress >= currentChallenge.target && !challengeCompleted) {
      challengeCompleted = true;
      
      // Add reward notification
      addFloatingText(width/2, height/2 - 100, "CHALLENGE COMPLETE!");
      addFloatingText(width/2, height/2 - 70, `Reward: ${currentChallenge.reward}`);
      
      // Save progress
      saveGameData();
    }
  }
  
  // Update specific counters
  if (type === 'gems') {
    gemsCollected += amount;
  } else if (type === 'asteroidDestroy') {
    asteroidsDestroyed += amount;
  }
}

// Function to check for special events
function checkForSpecialEvent() {
  const date = new Date();
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  
  if (isWeekend) {
    isSpecialEvent = true;
    
    // Randomly choose a special event type for the weekend
    const eventTypes = ['doubleGems', 'doubleCombos', 'moreShields'];
    specialEventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    
    switch (specialEventType) {
      case 'doubleGems':
        specialEventMultiplier = 2;
        console.log('Special weekend event: Double Gems!');
        break;
      case 'doubleCombos':
        specialEventMultiplier = 2;
        console.log('Special weekend event: Double Combos!');
        break;
      case 'moreShields':
        specialEventMultiplier = 3;
        console.log('Special weekend event: More Shields!');
        break;
    }
  } else {
    isSpecialEvent = false;
    specialEventMultiplier = 1;
    specialEventType = 'none';
  }
}

// Function to display the current challenge
function displayChallenge() {
  if (!currentChallenge) return;
  
  // Display challenge in top right corner
  fill(255);
  textAlign(RIGHT);
  textSize(14);
  text("DAILY CHALLENGE:", width - 20, 30);
  
  // Show challenge description and progress
  let progressText = `${challengeProgress}/${currentChallenge.target}`;
  
  if (challengeCompleted) {
    fill(100, 255, 100); // Green for completed
    text(`${currentChallenge.description} - COMPLETE!`, width - 20, 50);
  } else {
    fill(255, 255, 100); // Yellow for in progress
    text(`${currentChallenge.description} - ${progressText}`, width - 20, 50);
  }
  
  // Display coins
  fill(255, 215, 0); // Gold color
  textAlign(RIGHT);
  text(`Coins: ${totalCoins}`, width - 20, 70);
  
  // Display special event if active
  if (isSpecialEvent) {
    fill(255, 100, 255); // Pink for special events
    let eventText = '';
    switch (specialEventType) {
      case 'doubleGems':
        eventText = 'WEEKEND EVENT: DOUBLE GEMS!';
        break;
      case 'doubleCombos':
        eventText = 'WEEKEND EVENT: DOUBLE COMBOS!';
        break;
      case 'moreShields':
        eventText = 'WEEKEND EVENT: MORE SHIELDS!';
        break;
    }
    text(eventText, width - 20, 90);
  }
}

// Function to display combo counter
function displayCombo() {
  if (comboCounter > 1) {
    // Calculate position - centered at bottom of screen
    let x = width / 2;
    let y = height - 50;
    
    // Calculate size based on combo (bigger for higher combos)
    let size = 16 + min(comboCounter, 10);
    
    // Calculate opacity based on combo timer
    let opacity = map(comboTimer, 0, comboTimeout, 100, 255);
    
    // Display combo text with glow effect
    textAlign(CENTER);
    textSize(size);
    
    // Glow effect
    for (let i = 3; i > 0; i--) {
      fill(255, 255, 0, opacity * 0.3);
      text(`COMBO x${comboMultiplier}`, x, y + i);
    }
    
    // Main text
    fill(255, 255, 0, opacity);
    text(`COMBO x${comboMultiplier}`, x, y);
  }
}

// Function to display skin menu hint
function displaySkinMenuHint() {
  // Only show in playing state
  if (gameState !== "playing") return;
  
  // Position in bottom left
  let x = 120;
  let y = height - 20;
  
  // Store the hint area for click detection
  window.skinHintArea = {
    x: x - 10,
    y: y - 15,
    width: 16 * 8 + 20, // Approximate width of text plus padding
    height: 20
  };
  
  // Rainbow text effect
  textAlign(LEFT);
  textSize(14);
  
  // Switch to HSB color mode for rainbow effect
  colorMode(HSB, 360, 100, 100, 255);
  
  // Draw the text with rainbow colors
  let message = isMobile ? "Tap for Skins" : "Press 'S' for Skins";
  for (let i = 0; i < message.length; i++) {
    // Calculate hue based on character position and time
    let hue = (frameCount * 2 + i * 15) % 360;
    fill(hue, 90, 100);
    text(message.charAt(i), x + i * 8, y);
  }
  
  // Add subtle pulsing glow behind text
  let pulseAmount = sin(frameCount * 0.05) * 0.5 + 0.5; // Value between 0 and 1
  noStroke();
  fill(0, 0, 100, 20 * pulseAmount);
  rect(x - 10, y - 15, message.length * 8 + 20, 20, 5);
  
  // For mobile, add a small finger tap icon
  if (isMobile) {
    // Draw a simple finger tap icon
    push();
    translate(x - 20, y - 5);
    
    // Finger
    fill(255);
    noStroke();
    ellipse(0, 0, 8, 8); // Fingertip
    rect(-1, 0, 2, 6);   // Finger
    
    // Tap animation
    let tapPulse = sin(frameCount * 0.2) * 0.5 + 0.5;
    noFill();
    stroke(255, 150 * tapPulse);
    strokeWeight(1);
    ellipse(0, 0, 12 + tapPulse * 4, 12 + tapPulse * 4);
    
    pop();
  }
  
  // Show laser active message if player has laser power-up
  if (player.hasLaser) {
    let laserY = height - 40;
    let laserMessage = "Rainbow Lasers Active!";
    
    // Draw the text with rainbow colors
    textAlign(LEFT);
    for (let i = 0; i < laserMessage.length; i++) {
      // Calculate hue based on character position and time
      let hue = (frameCount * 5 + i * 15) % 360;
      fill(hue, 90, 100);
      text(laserMessage.charAt(i), x + i * 8, laserY);
    }
    
    // Add subtle pulsing glow behind text
    noStroke();
    fill(0, 0, 100, 20 * pulseAmount);
    rect(x - 10, laserY - 15, laserMessage.length * 8 + 20, 20, 5);
  }
  
  // Switch back to RGB color mode
  colorMode(RGB, 255, 255, 255, 255);
}

// Function to unlock a skin
function unlockSkin(index) {
  if (index < 0 || index >= unicornSkins.length) {
    console.error(`Invalid skin index: ${index}`);
    return false;
  }
  
  if (unicornSkins[index].unlocked) {
    console.log(`Skin ${unicornSkins[index].name} is already unlocked`);
    return true; // Already unlocked
  }
  
  const cost = unicornSkins[index].cost;
  console.log(`Attempting to unlock ${unicornSkins[index].name} skin. Cost: ${cost}, Available coins: ${totalCoins}`);
  
  // Validate that totalCoins is a number
  if (isNaN(totalCoins)) {
    console.error(`Invalid totalCoins value: ${totalCoins}`);
    totalCoins = 0; // Reset to prevent further issues
  }
  
  // Validate that cost is a number
  if (isNaN(cost)) {
    console.error(`Invalid cost for skin ${unicornSkins[index].name}: ${cost}`);
    return false;
  }
  
  if (totalCoins >= cost) {
    // Deduct coins
    totalCoins -= cost;
    unicornSkins[index].unlocked = true;
    
    // Force update localStorage immediately
    try {
      localStorage.setItem('unicornGame_totalCoins', totalCoins);
      
      // Save unlocked skins explicitly
      const unlockedSkins = unicornSkins.map(skin => skin.unlocked);
      localStorage.setItem('unicornGame_skins', JSON.stringify(unlockedSkins));
      
      console.log(`Successfully unlocked ${unicornSkins[index].name} skin. Remaining coins: ${totalCoins}`);
      console.log(`Saved skins state: ${JSON.stringify(unlockedSkins)}`);
      
      // Add floating text notification
      addFloatingText(width/2, height/2 - 150, `${unicornSkins[index].name} Skin Unlocked!`);
      
      // Play a sound effect
      playShieldSound();
    } catch (e) {
      console.error('Error saving skin unlock state:', e);
      // Try to recover by forcing a full save
      try {
        saveGameData();
      } catch (e2) {
        console.error('Failed to recover from save error:', e2);
      }
    }
    
    // Call the full save function
    saveGameData();
    return true;
  }
  
  console.log(`Not enough coins to unlock ${unicornSkins[index].name} skin. Need ${cost}, have ${totalCoins}`);
  return false; // Not enough coins
}

// Function to select a skin
function selectSkin(index) {
  if (index < 0 || index >= unicornSkins.length) return false;
  if (!unicornSkins[index].unlocked) return false;
  
  currentSkinIndex = index;
  saveGameData();
  return true;
}

// Function to show the skin selection menu
function showSkinMenu() {
  // Debug information
  console.log("=== Skin Menu Debug ===");
  console.log(`Total Coins: ${totalCoins}`);
  console.log("Available Skins:");
  unicornSkins.forEach((skin, index) => {
    console.log(`${index}: ${skin.name} - Cost: ${skin.cost}, Unlocked: ${skin.unlocked}`);
  });
  console.log("Current Skin Index:", currentSkinIndex);
  console.log("=======================");

  // Semi-transparent overlay
  fill(0, 0, 0, 200);
  rect(0, 0, width, height);
  
  // Title
  fill(255);
  textAlign(CENTER);
  textSize(30);
  text("UNICORN SKINS", width/2, 80);
  
  // Display coins
  fill(255, 215, 0); // Gold color
  textSize(20);
  text(`Coins: ${totalCoins}`, width/2, 120);
  
  // Calculate skin dimensions based on screen size and number of skins
  // For mobile, make skins smaller to fit all on screen
  let skinWidth, skinHeight, padding;
  
  if (isMobile) {
    // Calculate how many skins we can fit horizontally with reasonable size
    const availableWidth = width * 0.9; // Use 90% of screen width
    padding = 10; // Smaller padding for mobile
    
    // Calculate the maximum possible width for each skin
    skinWidth = Math.min(100, (availableWidth - (padding * (unicornSkins.length - 1))) / unicornSkins.length);
    skinHeight = skinWidth * 1.25; // Maintain aspect ratio
  } else {
    // Desktop sizes
    skinWidth = 120;
    skinHeight = 150;
    padding = 20;
  }
  
  const startX = width/2 - ((skinWidth + padding) * unicornSkins.length) / 2 + skinWidth/2;
  
  // Store skin positions for click detection
  window.skinPositions = [];
  
  for (let i = 0; i < unicornSkins.length; i++) {
    const skin = unicornSkins[i];
    const x = startX + i * (skinWidth + padding);
    const y = height/2;
    
    // Store position for click detection
    window.skinPositions.push({
      index: i,
      x: x,
      y: y,
      width: skinWidth,
      height: skinHeight
    });
    
    // Draw skin box
    if (currentSkinIndex === i) {
      // Highlight selected skin
      stroke(255, 215, 0); // Gold
      strokeWeight(4);
    } else if (skin.unlocked) {
      stroke(255);
      strokeWeight(2);
    } else if (totalCoins >= skin.cost) {
      // Highlight skins that can be unlocked
      stroke(100, 255, 100); // Green
      strokeWeight(3);
    } else {
      stroke(150);
      strokeWeight(1);
    }
    
    // Box background
    if (skin.unlocked) {
      fill(50, 50, 70);
    } else if (totalCoins >= skin.cost) {
      // Different background for skins that can be unlocked
      fill(40, 60, 40);
    } else {
      fill(30, 30, 40);
    }
    rect(x - skinWidth/2, y - skinHeight/2, skinWidth, skinHeight, 10);
    
    // Draw unicorn preview (simplified)
    const previewScale = skinWidth / 120; // Scale based on original size
    
    if (skin.unlocked) {
      noStroke();
      fill(skin.bodyColor[0], skin.bodyColor[1], skin.bodyColor[2]);
      ellipse(x, y - 20 * previewScale, 50 * previewScale, 60 * previewScale); // Body
      ellipse(x, y - 50 * previewScale, 30 * previewScale, 30 * previewScale); // Head
    } else {
      // Locked icon
      noStroke();
      fill(150);
      ellipse(x, y - 20 * previewScale, 50 * previewScale, 60 * previewScale); // Body (grayed out)
      ellipse(x, y - 50 * previewScale, 30 * previewScale, 30 * previewScale); // Head (grayed out)
      
      // Lock icon
      fill(200);
      rect(x - 10 * previewScale, y - 30 * previewScale, 20 * previewScale, 25 * previewScale, 5);
      ellipse(x, y - 35 * previewScale, 20 * previewScale, 20 * previewScale);
    }
    
    // Skin name
    noStroke();
    fill(255);
    textSize(Math.max(12, 16 * previewScale)); // Minimum text size for readability
    text(skin.name, x, y + 40 * previewScale);
    
    // Price or status
    textSize(Math.max(10, 14 * previewScale)); // Minimum text size for readability
    if (skin.unlocked) {
      fill(100, 255, 100);
      text("Unlocked", x, y + 60 * previewScale);
    } else if (totalCoins >= skin.cost) {
      // Highlight price when player has enough coins
      fill(100, 255, 100); // Green
      text(`Tap to Buy: ${skin.cost} coins`, x, y + 60 * previewScale);
    } else {
      fill(255, 215, 0);
      text(`${skin.cost} coins`, x, y + 60 * previewScale);
    }
  }
  
  // Instructions
  fill(255);
  textSize(16);
  text("Click on a skin to select or unlock it", width/2, height - 80);
  
  // Return to game button - make it more visible and touchable on mobile
  const returnText = isMobile ? "Tap here to return to game" : "Press ESC to return to the game";
  const returnY = height - 50;
  
  // Store the return button area for click detection
  window.returnButtonArea = {
    x: width/2 - textWidth(returnText)/2 - 10,
    y: returnY - 15,
    width: textWidth(returnText) + 20,
    height: 30
  };
  
  // Draw button background with pulsing effect for mobile
  if (isMobile) {
    let pulseAmount = sin(frameCount * 0.05) * 0.5 + 0.5; // Value between 0 and 1
    noStroke();
    fill(70, 70, 100, 150 + 50 * pulseAmount);
    rect(window.returnButtonArea.x, window.returnButtonArea.y, 
         window.returnButtonArea.width, window.returnButtonArea.height, 15);
  }
  
  // Draw return text
  fill(255);
  text(returnText, width/2, returnY);
}

// Function to handle skin menu clicks
function handleSkinMenuClick() {
  if (gameState !== "skinMenu") return;
  
  // Check if the return button was clicked
  if (window.returnButtonArea) {
    const btn = window.returnButtonArea;
    if (mouseX >= btn.x && mouseX <= btn.x + btn.width &&
        mouseY >= btn.y && mouseY <= btn.y + btn.height) {
      // Return to game
      gameState = "playing";
      // Play a sound for feedback
      playCollectSound();
      return;
    }
  }
  
  // Use stored skin positions for click detection
  if (window.skinPositions) {
    for (let i = 0; i < window.skinPositions.length; i++) {
      const skin = window.skinPositions[i];
      
      // Check if click is within this skin's box
      if (mouseX >= skin.x - skin.width/2 && mouseX <= skin.x + skin.width/2 &&
          mouseY >= skin.y - skin.height/2 && mouseY <= skin.y + skin.height/2) {
        
        const skinIndex = skin.index;
        console.log(`Clicked on skin ${skinIndex}: ${unicornSkins[skinIndex].name}`);
        
        // If skin is unlocked, select it
        if (unicornSkins[skinIndex].unlocked) {
          console.log(`Selecting already unlocked skin: ${unicornSkins[skinIndex].name}`);
          if (selectSkin(skinIndex)) {
            // Play selection sound
            playCollectSound();
            // Add notification
            addFloatingText(width/2, height/2 - 100, `${unicornSkins[skinIndex].name} Selected!`);
          }
        } else {
          // Try to unlock it
          console.log(`Attempting to unlock skin: ${unicornSkins[skinIndex].name}, Cost: ${unicornSkins[skinIndex].cost}, Available coins: ${totalCoins}`);
          
          // Debug info
          console.log(`Total coins type: ${typeof totalCoins}, value: ${totalCoins}`);
          console.log(`Skin cost type: ${typeof unicornSkins[skinIndex].cost}, value: ${unicornSkins[skinIndex].cost}`);
          console.log(`Comparison result: ${totalCoins >= unicornSkins[skinIndex].cost}`);
          
          if (unlockSkin(skinIndex)) {
            console.log(`Successfully unlocked skin: ${unicornSkins[skinIndex].name}`);
            // Play unlock sound
            playShieldSound();
            // Add notification
            addFloatingText(width/2, height/2 - 100, `${unicornSkins[skinIndex].name} Skin Unlocked!`);
            
            // Automatically select the newly unlocked skin
            selectSkin(skinIndex);
          } else {
            console.log(`Failed to unlock skin: ${unicornSkins[skinIndex].name} - Not enough coins`);
            // Not enough coins
            addFloatingText(width/2, height/2 - 100, "Not enough coins!");
            // Play error sound
            playGameOverSound();
          }
        }
        
        break;
      }
    }
  }
}

// Handle mouse clicks for skin selection
function mousePressed() {
  // Handle skin menu clicks
  if (gameState === "skinMenu") {
    handleSkinMenuClick();
    return false; // Prevent default
  }
  
  // Check if the skin hint was clicked (for mobile users)
  if (gameState === "playing" && window.skinHintArea) {
    const hint = window.skinHintArea;
    if (mouseX >= hint.x && mouseX <= hint.x + hint.width &&
        mouseY >= hint.y && mouseY <= hint.y + hint.height) {
      // Open skin menu
      gameState = "skinMenu";
      // Play a sound for feedback
      playCollectSound();
      return false; // Prevent default
    }
  }
  
  return true; // Allow default behavior otherwise
}

// Laser class for projectiles
class Laser {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, -10); // Move upward
    this.width = 8; // Increased from 5
    this.height = 25; // Increased from 20
    this.active = true;
    this.hue = random(360); // Random starting hue
    this.penetration = 2; // Number of asteroids it can destroy before disappearing
    this.trail = []; // Array to store trail positions
    this.maxTrailLength = 5; // Maximum number of trail segments
  }
  
  update() {
    // Add current position to trail
    this.trail.push(this.pos.copy());
    
    // Limit trail length
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }
    
    // Move the laser
    this.pos.add(this.vel);
    
    // Deactivate if off screen
    if (this.pos.y < -this.height) {
      this.active = false;
    }
    
    // Update hue for rainbow effect
    this.hue = (this.hue + 10) % 360;
  }
  
  show() {
    push();
    colorMode(HSB, 360, 100, 100, 255);
    
    // Draw trail
    for (let i = 0; i < this.trail.length; i++) {
      let pos = this.trail[i];
      let alpha = map(i, 0, this.trail.length - 1, 50, 200);
      let size = map(i, 0, this.trail.length - 1, this.width * 0.5, this.width);
      
      // Draw trail segment
      noStroke();
      fill((this.hue + i * 20) % 360, 90, 100, alpha);
      ellipse(pos.x, pos.y - this.height/2, size, size);
    }
    
    // Draw rainbow laser beam
    noStroke();
    
    // Draw glow effect
    for (let i = 3; i > 0; i--) {
      let glowWidth = this.width + i * 3;
      let glowHeight = this.height + i * 5;
      let alpha = map(i, 3, 1, 50, 200);
      
      fill((this.hue + i * 30) % 360, 90, 100, alpha);
      ellipse(this.pos.x, this.pos.y - this.height/2, glowWidth, glowHeight);
    }
    
    // Draw main beam
    fill(this.hue, 90, 100);
    ellipse(this.pos.x, this.pos.y - this.height/2, this.width, this.height);
    
    colorMode(RGB, 255, 255, 255, 255);
    pop();
  }
  
  // Check if laser hits an asteroid
  hits(asteroid) {
    let d = dist(this.pos.x, this.pos.y, asteroid.pos.x, asteroid.pos.y);
    return d < asteroid.size/2 + this.width/2;
  }
}

// Function to play laser sound
function playLaserSound() {
  if (!audioContext) return;
  
  // Create oscillator
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  // Connect nodes
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Set oscillator type and frequency
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(1760, audioContext.currentTime + 0.1);
  
  // Set volume envelope
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
  
  // Start and stop
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.2);
}

// Function to reset all game data in localStorage
function resetGameData() {
  console.log("Resetting all game data...");
  
  try {
    // Clear all game-related localStorage items
    localStorage.removeItem('unicornGame_totalCoins');
    localStorage.removeItem('unicornGame_skins');
    localStorage.removeItem('unicornGame_currentSkin');
    localStorage.removeItem('unicornGame_challengeProgress');
    
    // Reset in-memory values
    totalCoins = 0;
    currentSkinIndex = 0;
    
    // Reset skins to default state
    unicornSkins.forEach((skin, index) => {
      // Only the first skin (Classic) is unlocked by default
      skin.unlocked = index === 0;
    });
    
    console.log("Game data reset complete");
    
    // Show notification
    addFloatingText(width/2, height/2, "Game Data Reset!");
  } catch (e) {
    console.error("Error resetting game data:", e);
  }
}