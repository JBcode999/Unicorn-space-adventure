let player;
let gems = [];
let asteroids = [];
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

// Timing for special effects
let nextShootingStarTime = 0;

// NO SOUND FUNCTIONALITY

function preload() {
  // No sound preloading
}

function setup() {
  // Create a responsive canvas based on device size
  let canvasWidth = min(windowWidth - 40, 800);
  let canvasHeight = min(windowHeight - 200, 600);
  
  // Create canvas with responsive dimensions
  let canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent('game-container');
  
  // Initialize game
  player = new Player();
  
  // Create starfield with 150 stars spread throughout the game area
  for (let i = 0; i < 150; i++) {
    starfield.push({
      x: random(0, width),
      y: random(-height, height * 2),
      size: random(1, 3),
      speed: random(0.5, 2) // Different stars move at different speeds
    });
  }
  
  // Set up initial timing for effects
  nextShootingStarTime = random(60, 180); // First shooting star in 1-3 seconds
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
  
  if (gameState === "playing") {
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
    
    // Update and display player
    player.update();
    player.show();
    
    // Update and manage gems
    for (let i = gems.length - 1; i >= 0; i--) {
      gems[i].show();
      let isOffScreen = gems[i].update();
      
      // Check for collision with player
      if (player.hits(gems[i])) {
        // Add to score
        score += gems[i].value;
        
        // Create sparkle effect at gem position
        createSparkleEffect(gems[i].pos.x, gems[i].pos.y, gems[i].color);
        
        // Add floating score text
        addFloatingScore(gems[i].pos.x, gems[i].pos.y, gems[i].value);
        
        // Remove the collected gem
        gems.splice(i, 1);
      } 
      // Remove if off screen
      else if (isOffScreen) {
        gems.splice(i, 1);
      }
    }
    
    // Update and manage asteroids
    for (let i = asteroids.length - 1; i >= 0; i--) {
      asteroids[i].show();
      let isOffScreen = asteroids[i].update();
      
      // Check for collision with player
      if (player.hits(asteroids[i])) {
        gameState = "gameover";
        // Create explosion effect when player hits asteroid
        createExplosionEffect(player.pos.x, player.pos.y);
        
        // Show leaderboard form after a short delay
        setTimeout(() => {
          if (window.showLeaderboardForm) {
            window.showLeaderboardForm(score);
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
              this.pos.y + this.size * 0.6 // From bottom of unicorn
            )
          );
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
                  this.pos.y + this.size * 0.6 + random(-2, 2)
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
                  this.pos.y + this.size * 0.6 + sparkleSpacing * i
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
  }
  
  show() {
    push();
    translate(this.pos.x, this.pos.y);
    
    // Body color - light pink
    let bodyColor = color(255, 230, 250);
    
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
  gems.push(new Gem());
}

function spawnAsteroid() {
  asteroids.push(new Asteroid());
}

// Handle restart and sound toggle
function keyPressed() {
  if (key === 'r' && gameState === "gameover") {
    resetGame();
  }
}

function resetGame() {
  player = new Player();
  gems = [];
  asteroids = [];
  score = 0;
  distanceTraveled = 0;
  level = 1;
  scrollSpeed = 2;
  gameState = "playing";
  rainbowTrail = [];
  sparkles = [];
  messages = [];
}

function updateGameDifficulty() {
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
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(random(-0.7, 0.7), random(0.5, 2.0));
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
  // Only prevent default if inside canvas
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
      
      // Ensure rainbow trail is created on mobile too
      if (frameCount % 2 === 0) {
        rainbowTrail.push(new RainbowParticle(player.pos.x, player.pos.y));
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
  // Only prevent default if inside canvas
  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    // Restart game if game over and screen is tapped
    if (gameState === "gameover") {
      resetGame();
    }
    
    return false; // Prevent default action only for canvas area
  }
  // Return true to allow default behavior (like scrolling) outside the canvas
  return true;
}