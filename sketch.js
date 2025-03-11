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

// Scale factor for responsive design
let SCALE_FACTOR = 1;

// Touch controls
let touchIsActive = false;
let touchX = 0;
let touchY = 0;
let lastTouchX = 0;
let lastTouchY = 0;

// Timing for special effects
let nextShootingStarTime = 0;

// NO SOUND FUNCTIONALITY

function preload() {
  // No sound preloading
}

function setup() {
  // Create a responsive canvas that fills most of the screen but maintains aspect ratio
  let canvasWidth, canvasHeight;
  
  // Target aspect ratio is 4:3 (800:600)
  const targetRatio = 800 / 600;
  
  // Determine size based on window dimensions
  if (windowWidth / windowHeight > targetRatio) {
    // Window is wider than our target ratio
    canvasHeight = min(windowHeight * 0.9, 600); // 90% of window height, max 600px
    canvasWidth = canvasHeight * targetRatio;
  } else {
    // Window is taller than our target ratio
    canvasWidth = min(windowWidth * 0.9, 800); // 90% of window width, max 800px
    canvasHeight = canvasWidth / targetRatio;
  }
  
  // Create the canvas with calculated dimensions
  let canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent('game-container');
  
  // Scale game elements based on canvas size
  scaleGameElements(canvasWidth, canvasHeight);
  
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
  
  if (gameState === "playing") {
    // Update starfield for parallax scrolling effect
    updateStarfield();
    
    // Add occasional background effects like shooting stars
    updateBackgroundEffects();
    
    // Update the player's position
    player.update();
    
    // Spawn new gems and asteroids
    spawnGem();
    spawnAsteroid();
    
    // Draw player
    player.show();
    
    // Update and draw rainbow trail
    for (let i = rainbowTrail.length - 1; i >= 0; i--) {
      rainbowTrail[i].show();
      let isGone = rainbowTrail[i].update();
      if (isGone) {
        rainbowTrail.splice(i, 1);
      }
    }
    
    // Update and manage gems
    for (let i = gems.length - 1; i >= 0; i--) {
      gems[i].show();
      let isOffScreen = gems[i].update();
      
      // Check for collision with player
      if (player.hits(gems[i])) {
        // Add score
        score += gems[i].value;
        
        // Create sparkle effect at collection point
        createSparkleEffect(gems[i].pos.x, gems[i].pos.y);
        
        // Show floating score
        addFloatingScore(gems[i].pos.x, gems[i].pos.y, "+" + gems[i].value);
        
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
    
    // Show game instructions at the beginning
    showInstructions();
  } else if (gameState === "gameover") {
    // Still display player, gems and asteroids
    player.show();
    for (let gem of gems) gem.show();
    for (let asteroid of asteroids) asteroid.show();
    
    // Enhanced Game over screen with score highlight
    textAlign(CENTER);
    textSize(40 * SCALE_FACTOR);
    fill(255, 0, 0);
    text("GAME OVER", width / 2, height / 2 - 40 * SCALE_FACTOR);
    
    // Highlight score with pulsing effect
    let pulseAmount = sin(frameCount * 0.1) * 20 + 200; // Pulsing value between 180-220
    textSize(38 * SCALE_FACTOR);
    fill(255, pulseAmount, 0); // Pulsing yellow-orange
    text(`SCORE: ${score}`, width / 2, height / 2 + 10 * SCALE_FACTOR);
    
    // Add a glow effect around score
    for (let i = 6; i > 0; i--) {
      fill(255, pulseAmount, 0, 20 - i * 3);
      textSize((38 + i * 1.5) * SCALE_FACTOR);
      text(`SCORE: ${score}`, width / 2, height / 2 + 10 * SCALE_FACTOR);
    }
    
    // Show restart instructions for desktop/mobile
    textSize(20 * SCALE_FACTOR);
    fill(255);
    
    // Check if on mobile or desktop and show appropriate instruction
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      text("Tap Screen to Try Again", width / 2, height / 2 + 70 * SCALE_FACTOR);
    } else {
      text("Press R to Try Again", width / 2, height / 2 + 70 * SCALE_FACTOR);
    }
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

// Player class with support for both mouse and touch controls
class Player {
  constructor() {
    this.pos = createVector(width / 2, height - 100 * SCALE_FACTOR);
    this.vel = createVector(0, 0);
    this.size = 25 * SCALE_FACTOR;
    this.speed = 5 * SCALE_FACTOR;
    this.hitRadius = this.size * 0.8;
    this.lastPos = this.pos.copy();
  }
  
  update() {
    // Store last position for trail effect
    this.lastPos = this.pos.copy();
    
    // Handle mouse input for desktop
    if (mouseIsPressed && !touchIsActive) {
      // Calculate vector pointing from player to mouse
      let target = createVector(mouseX, mouseY);
      let direction = p5.Vector.sub(target, this.pos);
      
      // Only move if mouse is a certain distance away
      if (direction.mag() > this.size / 2) {
        direction.normalize();
        direction.mult(this.speed);
        this.vel.lerp(direction, 0.2); // Smooth movement
      } else {
        this.vel.mult(0.8); // Slow down when close to target
      }
    } 
    // Handle touch input for mobile
    else if (touchIsActive) {
      // Calculate touch movement direction
      let touchDirection = createVector(touchX - lastTouchX, touchY - lastTouchY);
      
      // Apply movement if touch has moved enough
      if (touchDirection.mag() > 1) {
        touchDirection.normalize();
        touchDirection.mult(this.speed);
        this.vel.lerp(touchDirection, 0.2); // Smooth movement
      } else {
        this.vel.mult(0.8); // Slow down when no movement
      }
      
      // Update last touch position
      lastTouchX = touchX;
      lastTouchY = touchY;
    } 
    // When no input, gradually slow down
    else {
      this.vel.mult(0.95);
    }
    
    // Apply velocity
    this.pos.add(this.vel);
    
    // Add rainbow trail effect when moving
    if (this.vel.mag() > 0.5) {
      let trailCount = floor(map(this.vel.mag(), 0, this.speed*2, 1, 3));
      for (let i = 0; i < trailCount; i++) {
        rainbowTrail.push(new RainbowParticle(
          this.pos.x - this.vel.x * random(0.5, 2), 
          this.pos.y - this.vel.y * random(0.5, 2)
        ));
      }
    }
    
    // Constrain player position to canvas
    this.pos.x = constrain(this.pos.x, this.size, width - this.size);
    this.pos.y = constrain(this.pos.y, this.size, height - this.size);
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
    this.size = 15 * SCALE_FACTOR;
    this.hitRadius = this.size * 0.8;
    this.randomPosition();
    this.determineDirection();
    
    // Randomly select a gemstone color from predefined choices
    this.colorIndex = floor(random(0, 6));
    this.colors = [
      color(255, 0, 255),  // Magenta
      color(0, 255, 255),  // Cyan
      color(255, 255, 0),  // Yellow
      color(0, 255, 0),    // Green
      color(255, 0, 127),  // Pink
      color(127, 0, 255)   // Purple
    ];
    
    // Value based on color
    this.value = floor(random(5, 15)); // Base score value
    
    // Add some visual variety
    this.rotationSpeed = random(-0.05, 0.05);
    this.rotation = random(TWO_PI);
    this.pulseSpeed = random(0.03, 0.06);
    this.pulseOffset = random(TWO_PI);
    this.glowSize = 0;
  }
  
  // Randomly position the gem on the screen
  randomPosition() {
    // Choose a random edge of the screen
    const edge = floor(random(4));
    
    switch(edge) {
      case 0: // Top
        this.pos = createVector(random(width), -this.size);
        break;
      case 1: // Right
        this.pos = createVector(width + this.size, random(height));
        break;
      case 2: // Bottom
        this.pos = createVector(random(width), height + this.size);
        break;
      case 3: // Left
        this.pos = createVector(-this.size, random(height));
        break;
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
      this.rotation += this.rotationSpeed;
      
      // Update pulse animation
      this.glowSize = sin(frameCount * this.pulseSpeed) * 0.2;
      
      // Occasional sparkle
      if (frameCount % 10 < 2 && random() > 0.7) {
        // Add a small sparkle
        let sparkle = {
          x: this.pos.x + random(-this.size/2, this.size/2),
          y: this.pos.y + random(-this.size/3, this.size/3),
          size: random(2, 4),
          alpha: 255,
          color: this.colors[this.colorIndex],
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
    rotate(this.rotation);
    
    // Draw glow effect if jellybean is glowing
    if (this.glowSize > 0) {
      for (let i = 3; i > 0; i--) {
        noStroke();
        fill(red(this.colors[this.colorIndex]), green(this.colors[this.colorIndex]), blue(this.colors[this.colorIndex]), 100 - i * 20);
        // Pulse the size for magical effect
        let pulseSize = 1 + this.glowSize + i * 0.1;
        
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
    fill(this.colors[this.colorIndex]);
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
    this.size = 30 * SCALE_FACTOR;
    this.hitRadius = this.size * 0.8;
    this.randomPosition();
    this.determineDirection();
    
    // Visual properties for asteroid
    this.rotation = random(TWO_PI);
    this.rotationSpeed = random(-0.05, 0.05);
    this.shapeSeed = random(1000); // Seed for generating the same rough shape
    this.numVertices = floor(random(7, 12)); // Number of vertices for the asteroid shape
    this.roughness = []; // Array to store roughness values for each vertex
    
    // Generate the roughness values for consistent shape
    for (let i = 0; i < this.numVertices; i++) {
      this.roughness.push(random(0.7, 1.3)); // How much each point extends from center
    }
    
    // Color with some variation
    this.baseColor = color(150, 150, 150);
    this.hueVariation = random(-20, 20);
  }
  
  // Randomly position the asteroid outside the screen
  randomPosition() {
    // Choose a random edge of the screen
    const edge = floor(random(4));
    
    switch(edge) {
      case 0: // Top
        this.pos = createVector(random(width), -this.size);
        break;
      case 1: // Right
        this.pos = createVector(width + this.size, random(height));
        break;
      case 2: // Bottom
        this.pos = createVector(random(width), height + this.size);
        break;
      case 3: // Left
        this.pos = createVector(-this.size, random(height));
        break;
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
      this.rotation += this.rotationSpeed;
    }
    
    // Check if asteroid is off-screen on the opposite side
    return (this.pos.y > height + this.size || 
            this.pos.x < -this.size || 
            this.pos.x > width + this.size);
  }
  
  show() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.rotation);
    fill(this.baseColor);
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
  if (random() < 0.05 + (level * 0.005)) { // Slightly more gems at higher levels
    gems.push(new Gem());
  }
}

function spawnAsteroid() {
  if (random() < 0.02 + (level * 0.002)) { // Slightly more asteroids at higher levels
    asteroids.push(new Asteroid());
  }
}

// Handle restart with both keyboard and touch
function keyPressed() {
  if ((key === 'r' || key === 'R') && gameState === "gameover") {
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
  scrollSpeed = 2 * SCALE_FACTOR;
  gameState = "playing";
  rainbowTrail = [];
  sparkles = [];
  messages = [];
  
  // Reset touch control variables
  touchIsActive = false;
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
    this.vel = createVector(random(-0.5, 0.5), random(0.5, 1.5));
    this.size = random(5, 15) * SCALE_FACTOR;
    this.alpha = 255;
    this.color = color(
      random(200, 255), 
      random(100, 255), 
      random(150, 255)
    );
  }
  
  update() {
    this.pos.add(this.vel);
    this.alpha -= 5;
    this.size *= 0.97;
    return this.alpha <= 0;
  }
  
  show() {
    noStroke();
    let c = this.color;
    fill(red(c), green(c), blue(c), this.alpha);
    ellipse(this.pos.x, this.pos.y, this.size, this.size);
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

// Function to handle window resizing
function windowResized() {
  // Recalculate canvas size
  let canvasWidth, canvasHeight;
  const targetRatio = 800 / 600;
  
  if (windowWidth / windowHeight > targetRatio) {
    canvasHeight = min(windowHeight * 0.9, 600);
    canvasWidth = canvasHeight * targetRatio;
  } else {
    canvasWidth = min(windowWidth * 0.9, 800);
    canvasHeight = canvasWidth / targetRatio;
  }
  
  // Resize the canvas
  resizeCanvas(canvasWidth, canvasHeight);
  
  // Scale game elements based on new canvas size
  scaleGameElements(canvasWidth, canvasHeight);
  
  // Position the canvas element
  let canvasElt = document.getElementById('defaultCanvas0');
  if (canvasElt) {
    canvasElt.style.left = '50%';
    canvasElt.style.top = '50%';
  }
}

// Scale game elements based on canvas size
function scaleGameElements(canvasWidth, canvasHeight) {
  // Base scale factor on original 800x600 design
  SCALE_FACTOR = min(canvasWidth / 800, canvasHeight / 600);
  
  // Player size and speed adjustments
  if (player) {
    player.size = 25 * SCALE_FACTOR;
    player.speed = 5 * SCALE_FACTOR;
    player.hitRadius = player.size * 0.8;
  }
  
  // Adjust global game settings
  scrollSpeed = 2 * SCALE_FACTOR; // Base scroll speed
  
  // Update existing gems with new scale
  for (let gem of gems) {
    gem.size = 15 * SCALE_FACTOR;
    gem.hitRadius = gem.size * 0.8;
  }
  
  // Update existing asteroids with new scale
  for (let asteroid of asteroids) {
    asteroid.size = 30 * SCALE_FACTOR;
    asteroid.hitRadius = asteroid.size * 0.8;
  }
}

// Touch started event
function touchStarted() {
  // Don't process touch events in game over state
  if (gameState !== "playing") return;
  
  touchIsActive = true;
  touchX = mouseX;
  touchY = mouseY;
  lastTouchX = touchX;
  lastTouchY = touchY;
  
  // Prevent default behavior to avoid scrolling on mobile
  return false;
}

// Touch moved event
function touchMoved() {
  if (gameState !== "playing") return;
  
  touchX = mouseX;
  touchY = mouseY;
  
  // Prevent default behavior to avoid scrolling on mobile
  return false;
}

// Touch ended event
function touchEnded() {
  touchIsActive = false;
  
  // If game is over, touching the screen will restart
  if (gameState === "gameover") {
    resetGame();
  }
  
  // Prevent default behavior
  return false;
}

// Show instructions at game start
function showInstructions() {
  if (frameCount < 180) { // Show for first 3 seconds
    textAlign(CENTER);
    textSize(20 * SCALE_FACTOR);
    fill(255);
    
    let yPos = height - 100 * SCALE_FACTOR;
    
    // Detect if on mobile or desktop
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      text("Touch and drag to move the unicorn", width/2, yPos);
    } else {
      text("Click and move mouse to control the unicorn", width/2, yPos);
    }
    
    // Add a second line of instructions
    text("Collect gems and avoid asteroids!", width/2, yPos + 30 * SCALE_FACTOR);
    
    // Fade out instructions
    if (frameCount > 120) {
      let alpha = map(frameCount, 120, 180, 255, 0);
      fill(255, alpha);
    }
  }
}