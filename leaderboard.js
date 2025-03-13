// Supabase configuration
// IMPORTANT: You must replace these placeholder values with your actual Supabase credentials
// To find these values:
// 1. Go to your Supabase project dashboard (https://app.supabase.com)
// 2. Click on the Settings icon in the left sidebar
// 3. Go to "API" in the settings menu
// 4. Copy the "Project URL" and paste it below as SUPABASE_URL
// 5. Copy the "anon public" key and paste it below as SUPABASE_ANON_KEY
const SUPABASE_URL = 'https://yvohvehemgccnxmjgrsy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2b2h2ZWhlbWdjY254bWpncnN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0NjcyNzEsImV4cCI6MjA1NzA0MzI3MX0.E9NKF0Pq4WybufHZ3SKei6I1D4d8c2x7hiX-M4LPOok';

// Initialize Supabase client
let supabase;

// Game state and UI elements
let leaderboardFormModal;
let leaderboardDisplayModal;
let finalScoreElement;
let emailInput;
let nameInput;
let formStatusElement;
let leaderboardTable;
let leaderboardBody;
let leaderboardLoading;
let leaderboardError;
let isSubmitting = false; // Flag to prevent double submissions

// COMPLETELY ISOLATED SCORE MANAGER - Cannot be accessed or modified from outside
// This uses a module pattern with privileged methods to prevent any external tampering
const SecureScoreManager = (function() {
  // Private variables that can't be accessed directly from outside
  let _finalScore = 0;
  let _hasScoreBeenSet = false;
  let _scoreTimestamp = 0;
  let _isScoreSubmitted = false;
  let _isGameRestarted = false;
  
  // Create multiple internal copies for redundancy
  let _scoreBackup1 = 0;
  let _scoreBackup2 = 0;
  let _scoreBackup3 = 0;
  
  // Additional object-sealed backup that can't be modified
  const _sealedBackups = Object.seal({
    score1: 0,
    score2: 0,
    score3: 0,
    timestamp: 0
  });
  
  // Create a score proxy that prevents all modifications
  let _scoreProxy = null;
  
  // Return only the interface methods, keeping all variables private
  return {
    // Set the final score only once - can never be changed again
    setFinalScore: function(score) {
      // Only allow setting once to prevent tampering
      if (!_hasScoreBeenSet) {
        const parsedScore = parseInt(score, 10);
        if (!isNaN(parsedScore)) {
          _finalScore = parsedScore;
          _scoreBackup1 = parsedScore;
          _scoreBackup2 = parsedScore;
          _scoreBackup3 = parsedScore;
          _scoreTimestamp = Date.now();
          _hasScoreBeenSet = true;
          
          // Set sealed backups
          _sealedBackups.score1 = parsedScore;
          _sealedBackups.score2 = parsedScore;
          _sealedBackups.score3 = parsedScore;
          _sealedBackups.timestamp = _scoreTimestamp;
          
          // Create a frozen proxy for absolute protection
          _scoreProxy = Object.freeze({
            value: parsedScore,
            timestamp: _scoreTimestamp
          });
          
          // Create global immutable property
          try {
            Object.defineProperty(window, '_IMMUTABLE_FINAL_SCORE', {
              value: parsedScore,
              writable: false,
              configurable: false,
              enumerable: false
            });
          } catch(e) {
            console.warn('Could not create immutable global property:', e);
          }
          
          console.log('🔒 SecureScoreManager: Score permanently locked at', parsedScore);
          
          // Override global score variables as an extra precaution
          this.overrideGlobalScores(parsedScore);
        }
      } else {
        console.warn('🛑 SecureScoreManager: Attempted to modify locked score - rejected');
      }
    },
    
    // Override any global score variables
    overrideGlobalScores: function(secureScore) {
      // Common score variable names
      const scoreVarNames = ['score', 'currentScore', 'gameScore', 'playerScore', 'finalScore'];
      
      // For each possible score variable, replace with getter that returns our secure score
      scoreVarNames.forEach(varName => {
        if (typeof window[varName] !== 'undefined') {
          try {
            const originalValue = window[varName];
            Object.defineProperty(window, varName, {
              get: function() { return secureScore; },
              configurable: false
            });
            console.log(`Protected global score variable: ${varName} (was ${originalValue})`);
          } catch(e) {
            console.warn(`Could not override ${varName}:`, e);
          }
        }
      });
    },
    
    // Mark the score as submitted - it's now safe to unlock
    markScoreAsSubmitted: function() {
      _isScoreSubmitted = true;
      console.log('🏆 Score marked as successfully submitted');
    },
    
    // Mark the game as restarted - it's now safe to unlock
    markGameAsRestarted: function() {
      _isGameRestarted = true; 
      console.log('🔄 Game marked as restarted, score lock can be released');
    },
    
    // Check if score can be unlocked
    canScoreBeUnlocked: function() {
      return _isScoreSubmitted || _isGameRestarted;
    },
    
    // Get the final score - guaranteed to be the original value
    getFinalScore: function() {
      // First check the frozen proxy
      if (_scoreProxy && _scoreProxy.value !== undefined) {
        return _scoreProxy.value;
      }
      
      // Try immutable global property
      if (window._IMMUTABLE_FINAL_SCORE !== undefined) {
        return window._IMMUTABLE_FINAL_SCORE;
      }
      
      // Check if any backups disagree with the main value (tampering detection)
      if (_finalScore !== _scoreBackup1 || _finalScore !== _scoreBackup2 || _finalScore !== _scoreBackup3 ||
          _sealedBackups.score1 !== _sealedBackups.score2 || _sealedBackups.score1 !== _sealedBackups.score3) {
        
        console.warn('⚠️ SecureScoreManager: Score integrity compromised, using consensus value');
        
        // Find consensus among all copies
        const scores = [
          _finalScore, _scoreBackup1, _scoreBackup2, _scoreBackup3,
          _sealedBackups.score1, _sealedBackups.score2, _sealedBackups.score3
        ];
        
        const scoreCounts = {};
        let maxCount = 0;
        let consensusScore = _finalScore;
        
        scores.forEach(score => {
          scoreCounts[score] = (scoreCounts[score] || 0) + 1;
          if (scoreCounts[score] > maxCount) {
            maxCount = scoreCounts[score];
            consensusScore = score;
          }
        });
        
        // Restore all copies to the consensus value
        _finalScore = consensusScore;
        _scoreBackup1 = consensusScore;
        _scoreBackup2 = consensusScore;
        _scoreBackup3 = consensusScore;
        
        try {
          _sealedBackups.score1 = consensusScore;
          _sealedBackups.score2 = consensusScore;
          _sealedBackups.score3 = consensusScore;
        } catch(e) {}
      }
      
      return _finalScore;
    },
    
    // Check if score has been set
    isScoreSet: function() {
      return _hasScoreBeenSet;
    },
    
    // Get when the score was set
    getScoreTimestamp: function() {
      return _scoreTimestamp;
    }
  };
})();

// Legacy variable kept for backward compatibility
// But we'll never use it for actual score storage
let currentScore = 0;

// Function to get game state from sketch.js
function getGameState() {
  // Try to access the gameState variable from the global scope
  if (typeof window.gameState !== 'undefined') {
    return window.gameState;
  }
  // Fallback to assuming game over if we're showing leaderboard
  return 'gameover';
}

// Initialize leaderboard functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Supabase client if keys are provided
  initializeSupabase();
  
  // Get DOM elements
  initializeDOMElements();
  
  // Set up event listeners
  setupEventListeners();
  
  // Add clear data button
  setTimeout(addClearDataButton, 500);
});

// Initialize Supabase client
function initializeSupabase() {
  try {
    // Use the global supabase object provided by the CDN
    if (!window.supabase) {
      console.error('Supabase client library not loaded correctly. Make sure the CDN script is included before leaderboard.js');
      throw new Error('Supabase library not loaded');
    }
    
    console.log('Creating Supabase client with:', {
      url: SUPABASE_URL,
      keyLength: SUPABASE_ANON_KEY.length,
      // Don't log full key for security reasons
    });
    
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    });
    
    console.log('Supabase client initialized');
    
    // Check if the leaderboard table exists
    checkSupabaseSetup();
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
  }
}

// Initialize DOM elements
function initializeDOMElements() {
  leaderboardFormModal = document.getElementById('leaderboard-form-modal');
  leaderboardDisplayModal = document.getElementById('leaderboard-display-modal');
  finalScoreElement = document.getElementById('final-score');
  emailInput = document.getElementById('email-input');
  nameInput = document.getElementById('name-input');
  formStatusElement = document.getElementById('form-status');
  leaderboardTable = document.getElementById('leaderboard-table');
  leaderboardBody = document.getElementById('leaderboard-body');
  leaderboardLoading = document.getElementById('leaderboard-loading');
  leaderboardError = document.getElementById('leaderboard-error');
  
  // Debug log to check if elements were found
  console.log('Leaderboard elements found:', {
    formModal: !!leaderboardFormModal,
    displayModal: !!leaderboardDisplayModal,
    finalScore: !!finalScoreElement,
    email: !!emailInput,
    name: !!nameInput
  });
  
  // Initialize input fields
  if (emailInput) {
    emailInput.value = '';
    emailInput.classList.add('hidden-during-play');
    
    // Try to load email from localStorage if available
    const savedEmail = localStorage.getItem('unicornGameEmail');
    if (savedEmail) {
      emailInput.value = savedEmail;
    }
  }
  
  if (nameInput) {
    // Always start with empty name
    nameInput.value = '';
    nameInput.classList.add('hidden-during-play');
    
    // Add event listeners to protect score during input events
    nameInput.addEventListener('input', function() {
      protectScoreDisplay();
      window._userManuallyEnteredName = true;
    });
    nameInput.addEventListener('change', protectScoreDisplay);
    nameInput.addEventListener('focus', protectScoreDisplay);
    nameInput.addEventListener('blur', protectScoreDisplay);
    nameInput.addEventListener('animationstart', protectScoreDisplay);
    
    // Add saved name helper if available
    const savedName = localStorage.getItem('unicornGameName');
    if (savedName) {
      addSavedNameHelper(savedName);
    }
  }
}

// Add helper for saved name
function addSavedNameHelper(savedName) {
  if (!nameInput || !savedName) return;
  
  const nameHelperLink = document.createElement('div');
  nameHelperLink.innerHTML = `<button id="restore-name-btn" class="text-button">Use saved name</button>`;
  nameHelperLink.style.fontSize = '12px';
  nameHelperLink.style.marginTop = '4px';
  nameHelperLink.style.textAlign = 'right';
  
  // Insert after name input
  if (nameInput.parentNode) {
    nameInput.parentNode.insertBefore(nameHelperLink, nameInput.nextSibling);
    
    // Add click event to restore name
    document.getElementById('restore-name-btn').addEventListener('click', function(e) {
      e.preventDefault();
      nameInput.value = savedName;
      window._userManuallyEnteredName = true;
      nameHelperLink.style.display = 'none';
    });
  }
}

// Set up event listeners
function setupEventListeners() {
  document.getElementById('leaderboard-form').addEventListener('submit', function(event) {
    // Prevent default form submission behavior
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    // Call our score submission function
    handleScoreSubmit(event);
  });
  
  document.getElementById('share-to-x').addEventListener('click', handleShareToX);
  document.getElementById('view-leaderboard').addEventListener('click', showLeaderboard);
  document.getElementById('play-again').addEventListener('click', handlePlayAgain);
  document.getElementById('close-leaderboard').addEventListener('click', closeLeaderboard);
  
  // Fix for mobile submit button
  document.getElementById('submit-score').addEventListener('click', function() {
    handleScoreSubmit(new Event('submit'));
  });
  
  // Set up autofill detection
  setupAutofillDetection();
}

// Set up autofill detection
function setupAutofillDetection() {
  // Intercept autofill-specific browser animations (Chrome's -webkit-autofill animation)
  const autofillStyle = document.createElement('style');
  autofillStyle.innerHTML = `
    @keyframes nodeInserted {
      from { opacity: 0.99; }
      to { opacity: 1; }
    }
    
    input:-webkit-autofill {
      animation-name: nodeInserted;
      animation-duration: 0.001s;
    }
  `;
  document.head.appendChild(autofillStyle);
  
  // Listen for the animation we created to detect autofill
  document.addEventListener('animationstart', function(e) {
    if (e.animationName === 'nodeInserted') {
      console.log('🔒 Autofill detected via animation - reinforcing game freeze');
      autofillProtection();
      // Keep checking for a moment to ensure stability
      for (let i = 1; i <= 5; i++) {
        setTimeout(autofillProtection, i * 100);
      }
    }
  }, true);
  
  // Set up delayed check for autofilled fields
  setTimeout(checkAndClearAutofill, 100);
}

// Check for and clear autofilled name
function checkAndClearAutofill() {
  if (nameInput && nameInput.value !== '' && !window._userManuallyEnteredName) {
    // Store the autofilled value
    const autofilled = nameInput.value;
    console.log('Detected autofilled name:', autofilled);
    
    // Clear it
    nameInput.value = '';
    
    // Show a helper to use it if desired
    const existingHelper = nameInput.parentNode.querySelector('.autofill-helper');
    if (!existingHelper) {
      const autofillHelper = document.createElement('div');
      autofillHelper.className = 'autofill-helper';
      autofillHelper.innerHTML = `<small>Browser autofilled: <button class="text-button">"${autofilled}"</button></small>`;
      autofillHelper.style.fontSize = '12px';
      autofillHelper.style.marginTop = '4px';
      
      if (nameInput.parentNode) {
        nameInput.parentNode.insertBefore(autofillHelper, nameInput.nextSibling);
        
        // Add click handler
        autofillHelper.querySelector('button').addEventListener('click', function() {
          nameInput.value = autofilled;
          window._userManuallyEnteredName = true; // Mark as user-approved
          autofillHelper.style.display = 'none';
        });
      }
    }
  }
}

// Show leaderboard form modal when game ends
function showLeaderboardForm(finalScore) {
  // -------------------- CRITICAL SCORE CAPTURE --------------------
  // MOST IMPORTANT: First action is to immediately capture the score in our secure manager
  console.log('🏁 Game over with reported score:', finalScore);
  
  // Store final score in our completely isolated SecureScoreManager
  SecureScoreManager.setFinalScore(finalScore);
  
  // Confirm the score was securely stored
  const securedScore = SecureScoreManager.getFinalScore();
  console.log('✅ Score securely locked at:', securedScore);
  
  // For backward compatibility, also set the legacy variable
  currentScore = securedScore;
  
  // Create a local constant that's used only in this function scope
  const TRUE_FINAL_SCORE = securedScore;
  
  // -------------------- ULTRA-AGGRESSIVE GAME FREEZE --------------------
  console.log('🛑 INITIATING COMPLETE GAME SHUTDOWN');
  
  // Set global flag that game is in frozen state
  window._GAME_IS_COMPLETELY_FROZEN = true;
  
  // Try EVERYTHING possible to completely freeze the game, with maximum aggression
  freezeGameCompletely();
  
  // SET UP CONTINUOUS MONITORING - to catch any game that tries to restart itself
  setupContinuousMonitoring();
  
  // -------------- SCORE PROTECTION MECHANISM ---------------
  // Store the score in a frozen object to prevent modifications
  window.GAME_OVER_DATA = Object.freeze({
    finalScore: TRUE_FINAL_SCORE,
    timestamp: Date.now(),
    gameState: "gameover",
    // Add multiple copies for redundancy
    scoreSnapshot1: TRUE_FINAL_SCORE,
    scoreSnapshot2: TRUE_FINAL_SCORE
  });
  
  // Set a global property with Object.defineProperty to make it difficult to override
  Object.defineProperty(window, 'FINAL_GAME_SCORE', {
    value: TRUE_FINAL_SCORE,
    writable: false,
    configurable: false
  });
  
  // Store the score globally to ensure it's available for submission
  currentScore = TRUE_FINAL_SCORE;
  
  console.log('Game over - Final Score permanently locked at:', TRUE_FINAL_SCORE);
  
  // Update the displayed score and set up protection
  updateAndProtectScoreDisplay(TRUE_FINAL_SCORE);
  
  // Ensure canvas doesn't capture events
  const canvas = document.querySelector('canvas');
  if (canvas) {
    canvas.style.pointerEvents = 'none';
  }
  
  // Add class to body to indicate game over is shown (for responsive styling)
  document.body.classList.add('gameover-shown');
  
  // Make modal interactive
  leaderboardFormModal.classList.add('active');
  
  // Make input fields visible by removing the hidden-during-play class
  if (emailInput) {
    emailInput.classList.remove('hidden-during-play');
    emailInput.style.display = 'block'; // Ensure it's visible
  }
  
  if (nameInput) {
    nameInput.classList.remove('hidden-during-play');
    nameInput.style.display = 'block'; // Ensure it's visible
  }
  
  // Set up autofill defense
  setupAutofillDefense();
  
  // Set up mobile keyboard handling
  setupMobileKeyboard();
}

// Update and protect the score display
function updateAndProtectScoreDisplay(scoreValue) {
  if (!finalScoreElement) return;
  
  // First clear any existing content
  while (finalScoreElement.firstChild) {
    finalScoreElement.removeChild(finalScoreElement.firstChild);
  }
  
  // Set score display
  finalScoreElement.textContent = scoreValue;
  
  // Store score as data attributes using multiple formats
  finalScoreElement.dataset.originalScore = scoreValue;
  finalScoreElement.dataset.scoreString = String(scoreValue);
  finalScoreElement.dataset.scoreTimestamp = Date.now();
  
  // Define a function to forcefully reset the score display if needed
  const forceScoreReset = () => {
    if (finalScoreElement.textContent != scoreValue) {
      console.log('Score display corrupted, resetting to:', scoreValue);
      finalScoreElement.textContent = scoreValue;
    }
  };
  
  // Set up a MutationObserver to ensure the score doesn't change
  const scoreObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData' || mutation.type === 'childList') {
        // If the score has changed from what we set, fix it immediately
        forceScoreReset();
      }
    }
  });
  
  // Start observing the score element for changes
  scoreObserver.observe(finalScoreElement, { 
    childList: true,
    characterData: true,
    subtree: true 
  });
  
  // Additional safeguard - aggressive checking to reset score if changed
  const scoreCheckerInterval = setInterval(forceScoreReset, 100);
  
  // After 5 seconds, reduce check frequency to conserve resources
  setTimeout(() => {
    clearInterval(scoreCheckerInterval);
    // Continue with occasional checks
    setInterval(forceScoreReset, 1000);
  }, 5000);
}

// Freeze the game completely
function freezeGameCompletely() {
  try {
    console.log("🔒 APPLYING MAXIMUM-SECURITY GAME FREEZE PROTOCOL");
    
    // STEP 1: DETECT ALL CANVASES - the game might have multiple canvases
    const allCanvases = document.querySelectorAll('canvas');
    console.log(`Found ${allCanvases.length} canvas elements to terminate`);
    
    // Store them all for restoration
    window._ALL_STORED_CANVASES = [];
    
    // Process each canvas to completely terminate it
    allCanvases.forEach((canvas, index) => {
      try {
        console.log(`Processing canvas #${index} for complete termination`);
        
        // Store for later restoration
        const canvasData = {
          element: canvas,
          parent: canvas.parentNode,
          nextSibling: canvas.nextSibling,
          width: canvas.width,
          height: canvas.height
        };
        window._ALL_STORED_CANVASES.push(canvasData);
        
        // First, terminate any WebGL context
        try {
          ['webgl', 'experimental-webgl', 'webgl2', '2d'].forEach(contextType => {
            try {
              const ctx = canvas.getContext(contextType);
              if (ctx && contextType.includes('webgl')) {
                const loseExt = ctx.getExtension('WEBGL_lose_context');
                if (loseExt) {
                  loseExt.loseContext();
                  console.log(`WebGL context ${contextType} forcefully terminated`);
                }
              } else if (ctx && contextType === '2d') {
                // Clear 2D contexts
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                // Attempt to break the context
                ctx.canvas.width = 1;
                ctx.canvas.height = 1;
              }
            } catch (e) {}
          });
        } catch (e) {}
        
        // Next, remove all event listeners by cloning and replacing
        const clone = canvas.cloneNode(false);
        canvas.getAttributeNames().forEach(attr => {
          if (attr.startsWith('on')) {
            canvas.removeAttribute(attr);
          }
        });
        
        // Set attributes that will prevent interaction
        canvas.setAttribute('aria-hidden', 'true');
        canvas.setAttribute('tabindex', '-1');
        canvas.style.pointerEvents = 'none';
        canvas.style.opacity = '0.5';
        canvas.width = 1;  // Resize to basically nothing
        canvas.height = 1;
        
        // Finally, actually remove from DOM 
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
          console.log(`Canvas #${index} physically removed from DOM`);
        }
      } catch(e) {
        console.error(`Error processing canvas #${index}:`, e);
      }
    });
    
    // STEP 2: CREATE INTERCEPTION LAYER - to catch any events that might restart the game
    createInterceptionLayer();
    
    // STEP 3: OVERRIDE KEY EVENT HANDLERS - prevent key events from reaching the game
    overrideEventHandlers();
    
    // STEP 4-8: Apply remaining freeze techniques
    blockAllAnimations();
    killAllTimers();
    freezeTimeAPIs();
    terminateGameObjects();
    terminateP5();
    
    console.log("🧊 Game completely frozen - all animation and event sources terminated");
  } catch (e) {
    console.error('Error during extreme game freeze:', e);
  }
}

// Create interception layer to block events
function createInterceptionLayer() {
  const interceptionLayer = document.createElement('div');
  interceptionLayer.id = 'game-interception-layer';
  interceptionLayer.style.position = 'fixed';
  interceptionLayer.style.top = '0';
  interceptionLayer.style.left = '0';
  interceptionLayer.style.width = '100%';
  interceptionLayer.style.height = '100%';
  interceptionLayer.style.zIndex = '9999';
  interceptionLayer.style.pointerEvents = 'none'; // Allow clicks through to form
  interceptionLayer.style.backgroundColor = 'transparent';
  document.body.appendChild(interceptionLayer);
  window._INTERCEPTION_LAYER = interceptionLayer;
  
  console.log("🛡️ Created interception layer to block game events");
}

// Override event handlers to block game events
function overrideEventHandlers() {
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
  
  // Save originals
  window._originalAddEventListener = originalAddEventListener;
  window._originalRemoveEventListener = originalRemoveEventListener;
  
  // Override addEventListener to block game-related events
  EventTarget.prototype.addEventListener = function(type, listener, options) {
    // Allow events on form elements
    if (this.tagName === 'INPUT' || this.tagName === 'BUTTON' || 
        this.id === 'leaderboard-form' || 
        this.closest && this.closest('#leaderboard-form-modal')) {
      return originalAddEventListener.call(this, type, listener, options);
    }
    
    // For all other elements, block game-related events
    if (['keydown', 'keyup', 'keypress', 'mousedown', 'mouseup', 'mousemove', 
         'click', 'dblclick', 'contextmenu', 'wheel', 'touchstart', 
         'touchmove', 'touchend'].includes(type)) {
      console.log(`🛑 Blocked attempt to add ${type} event listener`);
      return;
    }
    
    return originalAddEventListener.call(this, type, listener, options);
  };
  
  console.log("🔒 Protected event system from game reactivation");
}

// Block all animations
function blockAllAnimations() {
  // STEP 4: PREVENT JAVASCRIPT ANIMATION - kill all possible animation methods
  if (window.requestAnimationFrame) {
    window._originalRequestAnimationFrame = window.requestAnimationFrame;
    window.requestAnimationFrame = function() {
      console.log("⛔ Animation frame requested but blocked by freeze");
      return -1;
    };
    
    // Cancel all existing animation frames
    for (let i = 0; i < 1000; i++) {
      if (window.cancelAnimationFrame) {
        try { window.cancelAnimationFrame(i); } catch(e) {}
      }
    }
  }
}

// Kill all timers (intervals and timeouts)
function killAllTimers() {
  // STEP 5: KILL ALL SETINTERVAL/SETTIMEOUT THAT MIGHT BE ANIMATING
  console.log("🔪 Attempting to terminate all active intervals and timeouts");
  
  // Save our critical intervals
  const ourIntervals = [
    window._freezeGuardian,
    window._secondFreezeGuardian, 
    window._scoreFreezingInterval
  ].filter(id => id);
  
  // Clear every possible interval ID
  for (let i = 1; i < 10000; i++) {
    if (!ourIntervals.includes(i)) {
      try { window.clearInterval(i); } catch(e) {}
      try { window.clearTimeout(i); } catch(e) {}
    }
  }
}

// Freeze time APIs
function freezeTimeAPIs() {
  // STEP 6: FREEZE TIME ITSELF - prevent time-based animations 
  if (window.performance && window.performance.now) {
    window._originalPerformanceNow = window.performance.now;
    window._gameFreezeMoment = window.performance.now();
    
    window.performance.now = function() {
      return window._gameFreezeMoment; // Always return the same timestamp
    };
  }
  
  // Also freeze Date.now()
  if (Date.now) {
    window._originalDateNow = Date.now;
    window._gameFreezeDate = Date.now();
    
    Date.now = function() {
      return window._gameFreezeDate; // Always return the same timestamp
    };
  }
}

// Terminate game objects
function terminateGameObjects() {
  // Step 7: KILL THE GAME OBJECT - find and terminate any game object
  // Look for common game object names and freeze them
  ['game', 'engine', 'app', 'application', 'renderer', 'world', 'physics', 'stage'].forEach(name => {
    if (window[name] && typeof window[name] === 'object') {
      try {
        console.log(`Found possible game object: window.${name} - freezing it`);
        // Try to call stop/pause methods first
        if (typeof window[name].stop === 'function') window[name].stop();
        if (typeof window[name].pause === 'function') window[name].pause();
        if (typeof window[name].destroy === 'function') window[name].destroy();
        
        // Then freeze the object to prevent any changes
        Object.freeze(window[name]);
      } catch(e) {}
    }
  });
}

// Terminate p5.js
function terminateP5() {
  // STEP 8: ULTRA-EXTREME P5.JS TERMINATION
  console.log("🔫 Executing p5.js termination protocol");
  try {
    // 1. If p5 exists, attempt most extreme shutdown techniques
    if (window.p5) {
      // Save a reference to draw function for later restoration
      if (window.p5.instance && window.p5.instance.draw) {
        window._p5_original_draw = window.p5.instance.draw;
        
        // Replace with completely empty function
        window.p5.instance.draw = function() {
          // Do absolutely nothing
          return;
        };
      }
      
      // Attempt to remove the p5 instance completely in extreme cases
      if (window.p5.instance) {
        try {
          // Call any available stop methods
          if (window.p5.instance.noLoop) window.p5.instance.noLoop();
          if (window.p5.instance.remove) {
            console.log("🧨 Calling p5.remove() to completely terminate sketch");
            window._p5_instance_backup = window.p5.instance;
            window.p5.instance.remove();
          }
        } catch (e) {
          console.warn("Error during p5 instance termination:", e);
        }
      }
      
      // Try to directly disable the _loop flag in case noLoop() was bypassed
      if (window.p5.instance) {
        window.p5.instance._loop = false;
      }
      
      // Check for hidden or non-standard p5 instances
      if (window._p5) window._p5._loop = false;
      if (window.p) window.p._loop = false;
      
      // For very stubborn p5 instances, replace core functions
      const p5CoreFunctions = [
        'draw', 'setup', 'preload', 'updatePixels', 'redraw',
        'frameRate', 'loop', 'noLoop', 'push', 'pop'
      ];
      
      p5CoreFunctions.forEach(funcName => {
        try {
          if (window.p5 && window.p5.prototype && typeof window.p5.prototype[funcName] === 'function') {
            window._p5_core_functions = window._p5_core_functions || {};
            window._p5_core_functions[funcName] = window.p5.prototype[funcName];
            
            window.p5.prototype[funcName] = function() {
              if (window._GAME_IS_COMPLETELY_FROZEN) {
                return;
              }
              return window._p5_core_functions[funcName].apply(this, arguments);
            };
          }
        } catch (e) {}
      });
    }
  } catch (e) {
    console.error("Error during p5.js termination:", e);
  }
}

// Set up continuous monitoring
function setupContinuousMonitoring() {
  console.log("🔍 Setting up continuous anti-resurrection monitoring");
  
  // This is a final safeguard that continuously checks and kills any attempts
  // by the game to restart itself through any means
  const continuousMonitoring = () => {
    // Skip if the game is no longer frozen
    if (!window._GAME_IS_COMPLETELY_FROZEN) return;
    
    // Check for canvases that might have been re-added
    const newCanvases = document.querySelectorAll('canvas');
    if (newCanvases.length > 0) {
      console.log(`🚨 Detected ${newCanvases.length} new canvas(es) - terminating them`);
      
      newCanvases.forEach(canvas => {
        try {
          if (canvas.parentNode) {
            // Try to take screenshot first if it's visible
            try {
              const screenshot = canvas.toDataURL('image/png');
              const img = document.createElement('img');
              img.src = screenshot;
              img.style.position = 'absolute';
              img.style.top = canvas.offsetTop + 'px';
              img.style.left = canvas.offsetLeft + 'px';
              img.style.width = canvas.offsetWidth + 'px';
              img.style.height = canvas.offsetHeight + 'px';
              img.style.zIndex = '999';
              document.body.appendChild(img);
            } catch(e) {}
            
            // Kill the canvas
            canvas.width = 1;
            canvas.height = 1;
            canvas.style.position = 'absolute';
            canvas.style.top = '-9999px';
            canvas.style.pointerEvents = 'none';
            
            // Try to remove WebGL context
            try {
              const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
              if (gl && gl.getExtension) {
                gl.getExtension('WEBGL_lose_context')?.loseContext();
              }
            } catch(e) {}
          }
        } catch(e) {
          console.error("Error terminating new canvas:", e);
        }
      });
    }
    
    // Check if p5 has somehow been restarted
    if (window.p5 && window.p5.instance && window.p5.instance._loop === true) {
      console.log("🚨 p5 instance trying to run - forcing stop");
      if (typeof window.p5.instance.noLoop === 'function') {
        window.p5.instance.noLoop();
      }
      window.p5.instance._loop = false;
      
      // Replace draw function if it was restored
      if (typeof window.p5.instance.draw === 'function' && 
          window.p5.instance.draw !== window._blockedDrawFunction) {
        window._originalDrawFunction = window.p5.instance.draw;
        window.p5.instance.draw = function() {
          console.log("Blocked draw function call");
          return;
        };
        window._blockedDrawFunction = window.p5.instance.draw;
      }
    }
    
    // Check for animation frames that got through
    if (window.requestAnimationFrame !== window._blockedRAF && 
        window._originalRequestAnimationFrame) {
      console.log("🚨 requestAnimationFrame has been restored - blocking again");
      window.requestAnimationFrame = window._blockedRAF || function() {
        return -1;
      };
    }
    
    // Check for any game state variables that might indicate running
    ['running', 'active', 'playing', 'started', 'gameplay'].forEach(state => {
      if (window.gameState === state) {
        console.log(`🚨 Game tried to set state to "${state}" - forcing back to "gameover"`);
        window.gameState = 'gameover';
      }
    });
  };
  
  // Run continuously while in gameover state to catch any resurrection attempts
  window._continuousMonitorInterval = setInterval(continuousMonitoring, 500);
  
  // Also create a super-monitor that checks if the monitoring itself got disabled
  window._superMonitor = setInterval(() => {
    if (window._GAME_IS_COMPLETELY_FROZEN && !window._continuousMonitorInterval) {
      console.log("🚨 Continuous monitoring was disabled - restoring it");
      window._continuousMonitorInterval = setInterval(continuousMonitoring, 500);
    }
  }, 2000);
}

// Set up autofill defense
function setupAutofillDefense() {
  // AUTOFILL DEFENSE: Special handling for autofill events
  const handleAutofill = function(e) {
    // Stop propagation but don't preventDefault (let autofill work)
    e.stopPropagation();
    
    // Extra protection to ensure the game stays frozen
    if (window._freezeGuardian) {
      clearInterval(window._freezeGuardian);
    }
    
    // Re-establish freeze guardian immediately and after a delay
    enforceGameFreeze();
    setTimeout(enforceGameFreeze, 100);
    setTimeout(enforceGameFreeze, 500);
    
    // Also run our score protection
    autofillProtection();
  };
  
  // Add listeners for autofill-related events
  ['autocomplete', 'autocompleteerror', 'animationstart', 'animationend'].forEach(eventType => {
    document.addEventListener(eventType, handleAutofill, true);
    
    // Also add to specific form elements
    if (emailInput) emailInput.addEventListener(eventType, handleAutofill, true);
    if (nameInput) nameInput.addEventListener(eventType, handleAutofill, true);
  });
  
  // Add special event listeners to catch autofill events on our form fields
  if (emailInput) {
    // These are the specific events that might be triggered by autofill
    ['input', 'change', 'focus', 'blur'].forEach(eventType => {
      emailInput.addEventListener(eventType, function(e) {
        console.log(`Caught ${eventType} event on email input - ensuring game remains frozen`);
        // Don't prevent default here - let autofill work
        // But make sure the game stays frozen
        autofillProtection();
        // Re-check again after a delay in case browser events continue
        setTimeout(autofillProtection, 100);
      }, true);
    });
  }
  
  if (nameInput) {
    ['input', 'change', 'focus', 'blur'].forEach(eventType => {
      nameInput.addEventListener(eventType, function(e) {
        console.log(`Caught ${eventType} event on name input - ensuring game remains frozen`);
        autofillProtection();
        setTimeout(autofillProtection, 100);
      }, true);
    });
  }
  
  // Schedule multiple checks to ensure the game stays frozen and score is protected
  const protectionTimes = [50, 100, 200, 300, 500, 1000, 2000, 3000, 5000];
  protectionTimes.forEach(time => {
    setTimeout(autofillProtection, time);
  });
  
  // Add defensive score freezing mechanism that runs continuously
  const scoreFreezingInterval = setInterval(() => {
    // Only keep running if score is still locked (not submitted/restarted)
    if (!SecureScoreManager.canScoreBeUnlocked()) {
      autofillProtection();
    } else {
      // Score has been submitted or game restarted, we can stop the interval
      clearInterval(scoreFreezingInterval);
    }
  }, 100);
  
  // Store the interval ID to clear it later if needed
  window._scoreFreezingInterval = scoreFreezingInterval;
}

// Set up mobile keyboard handling
function setupMobileKeyboard() {
  // Force keyboard to appear on mobile - wait for modal to fully appear
  // But make sure it doesn't interfere with our game freeze
  setTimeout(() => {
    // Make double-sure the game is frozen before showing keyboard
    enforceGameFreeze();
    
    // Try using our specialized keyboard helper
    if (window.forceShowKeyboard && emailInput) {
      window.forceShowKeyboard(emailInput);
    } else if (emailInput) {
      // Fallback to direct focus method - be careful not to trigger game events
      try {
        emailInput.focus();
        
        // Re-enforce freeze after focus
        setTimeout(enforceGameFreeze, 10);
        
        // Second attempt: try to trigger native behavior on mobile
        if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
          // For iOS/Android, try to force the keyboard safely
          setTimeout(() => {
            // Re-enforce freeze first
            enforceGameFreeze();
            
            emailInput.blur();  // First blur
            setTimeout(enforceGameFreeze, 10);
            
            emailInput.click(); // Then click
            setTimeout(enforceGameFreeze, 10);
            
            emailInput.focus(); // Then focus again
            setTimeout(enforceGameFreeze, 10);
            
            // Create a temporary input if needed
            if (!document.activeElement || document.activeElement !== emailInput) {
              console.log("Attempting safe keyboard display technique with freeze protection");
              enforceGameFreeze();
              
              const tempInput = document.createElement('input');
              tempInput.style.position = 'absolute';
              tempInput.style.top = '0';
              tempInput.style.left = '0';
              tempInput.style.opacity = '0';
              tempInput.style.height = '0';
              tempInput.setAttribute('type', 'text');
              
              document.body.appendChild(tempInput);
              enforceGameFreeze();
              
              tempInput.focus();
              enforceGameFreeze();
              
              tempInput.click();
              enforceGameFreeze();
              
              setTimeout(() => {
                enforceGameFreeze();
                tempInput.remove();
                enforceGameFreeze();
                emailInput.focus();
                enforceGameFreeze();
              }, 100);
            }
          }, 50);
        }
      } catch(e) {
        console.warn('Error showing keyboard:', e);
      }
    }
    
    // Final freeze check after keyboard shown
    setTimeout(enforceGameFreeze, 600);
  }, 500);
}

// Handle score submission
async function handleScoreSubmit(event) {
  // Prevent double submissions
  if (isSubmitting) return;
  isSubmitting = true;

  // Prevent default form submission
  event.preventDefault();

  // Clear keyboard focus
  document.activeElement.blur();

  // ------ SCORE RETRIEVAL: ULTRA-SECURE ------
  // Primary source: Get score from our secure manager
  let submissionScore = SecureScoreManager.getFinalScore();
  console.log('📊 Retrieving locked score from SecureScoreManager:', submissionScore);

  // If for some reason the primary source fails (extremely unlikely)
  // we have a simple fallback to the highest known score
  if (submissionScore === 0) {
    // Try the immutable global property
    if (window._IMMUTABLE_FINAL_SCORE !== undefined) {
      submissionScore = window._IMMUTABLE_FINAL_SCORE;
      console.log('Using immutable global property for score:', submissionScore);
    } 
    // Last resort: try currentScore as fallback
    else if (currentScore > 0) {
      console.warn('⚠️ Had to use fallback score mechanism:', currentScore);
      submissionScore = currentScore;
    }
  }

  // Final score validation
  submissionScore = Math.max(0, Math.min(submissionScore, 100000));
  console.log('✅ Final verified score for submission:', submissionScore);

  const email = emailInput.value.trim();
  const name = nameInput.value.trim() || 'Anonymous Unicorn';
  
  // Email validation
  if (!validateEmail(email)) {
    showFormStatus('Please enter a valid email address', 'error');
    isSubmitting = false; // Reset submission flag
    return;
  }
  
  // Save email and name to localStorage for convenience
  localStorage.setItem('unicornGameEmail', email);
  if (name !== 'Anonymous Unicorn') {
    localStorage.setItem('unicornGameName', name);
  }
  
  // Disable submit button and show loading state
  const submitButton = document.getElementById('submit-score');
  submitButton.disabled = true;
  submitButton.textContent = 'Submitting...';
  
  try {
    // Check if Supabase client is initialized
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }
    
    // Log before submission for debugging
    console.log('Attempting to submit score:', { email, name, score: submissionScore });
    
    // Submit score to Supabase
    const { data, error } = await supabase
      .from('leaderboard')
      .insert([
        { email, name, score: submissionScore }
      ]);
    
    if (error) {
      console.error('Supabase error details:', JSON.stringify(error));
      throw error;
    }
    
    console.log('Score submitted successfully:', data);
    
    // Mark score as successfully submitted in the SecureScoreManager
    SecureScoreManager.markScoreAsSubmitted();
    
    // Show success message
    showFormStatus('Score submitted successfully!', 'success');
    
    // Show leaderboard after a brief delay
    setTimeout(() => {
      showLeaderboard();
    }, 1500);
    
  } catch (error) {
    console.error('Error submitting score:', error);
    showFormStatus('Failed to submit score. Please try again.', 'error');
  } finally {
    // Reset submission flag
    isSubmitting = false;
    
    // Reset button state
    submitButton.disabled = false;
    submitButton.textContent = 'Submit Score';
  }
}

// Handle sharing score to X (Twitter)
function handleShareToX() {
  // Use our secure score manager for score retrieval
  const shareScore = SecureScoreManager.getFinalScore();
  console.log('🐦 Sharing score from SecureScoreManager:', shareScore);
  
  // Simplified tweet text to avoid URL-encoding issues
  const tweetText = `I scored ${shareScore} points in Space Unicorn! Can you beat my score? Play now:`;
  
  const name = nameInput.value.trim() || 'Anonymous Unicorn';
  const score = shareScore;
  
  console.log('📢 Sharing final verified score:', score);
  
  // Create share text
  const text = `${tweetText} ${name} in Unicorn Space Adventure! 🦄✨`;
  const hashtags = 'UnicornGame,p5js,GameDev';
  const url = window.location.href; // Use current page URL
  
  // Create share URL for X
  const shareURL = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&hashtags=${encodeURIComponent(hashtags)}&url=${encodeURIComponent(url)}`;
  
  // Open X share dialog
  window.open(shareURL, '_blank', 'width=550,height=420');
}

// Show the leaderboard
async function showLeaderboard() {
  // Hide leaderboard form modal
  leaderboardFormModal.classList.remove('active');
  
  // Ensure canvas doesn't capture events
  const canvas = document.querySelector('canvas');
  if (canvas) {
    canvas.style.pointerEvents = 'none';
  }
  
  // Show leaderboard display modal
  leaderboardDisplayModal.classList.add('active');
  
  // Show loading spinner
  leaderboardLoading.style.display = 'block';
  leaderboardTable.style.display = 'none';
  leaderboardError.style.display = 'none';
  
  try {
    // Check if Supabase client is initialized
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }
    
    // Fetch top 10 scores from Supabase
    const { data, error } = await supabase
      .from('leaderboard')
      .select('id, name, email, score, created_at')
      .order('score', { ascending: false })
      .limit(10);
    
    if (error) {
      throw error;
    }
    
    // Render leaderboard data
    renderLeaderboard(data);
    
    // Hide loading spinner and show table
    leaderboardLoading.style.display = 'none';
    leaderboardTable.style.display = 'table';
    
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    leaderboardLoading.style.display = 'none';
    leaderboardError.style.display = 'block';
    leaderboardError.textContent = 'Failed to load leaderboard. Please try again.';
  }
}

// Render leaderboard with data
function renderLeaderboard(data) {
  // Clear existing entries
  leaderboardBody.innerHTML = '';
  
  // Create table rows for each entry
  data.forEach((entry, index) => {
    const row = document.createElement('tr');
    
    // Rank cell
    const rankCell = document.createElement('td');
    rankCell.className = 'rank-cell';
    rankCell.textContent = index + 1;
    
    // Name cell with partially masked email
    const nameCell = document.createElement('td');
    const maskedEmail = maskEmail(entry.email);
    nameCell.textContent = entry.name ? `${entry.name} (${maskedEmail})` : maskedEmail;
    
    // Score cell
    const scoreCell = document.createElement('td');
    scoreCell.className = 'score-cell';
    scoreCell.textContent = entry.score;
    
    // Action cell with share button
    const actionCell = document.createElement('td');
    const shareButton = document.createElement('button');
    shareButton.className = 'magical-button share-button';
    shareButton.style.padding = '5px 10px';
    shareButton.style.minWidth = '80px';
    shareButton.style.fontSize = '12px';
    shareButton.innerHTML = '<svg class="x-logo" viewBox="0 0 24 24" style="width:12px;height:12px" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="white"/></svg> Share';
    shareButton.addEventListener('click', () => shareLeaderboardEntry(entry));
    actionCell.appendChild(shareButton);
    
    // Add cells to row
    row.appendChild(rankCell);
    row.appendChild(nameCell);
    row.appendChild(scoreCell);
    row.appendChild(actionCell);
    
    // Add row to table
    leaderboardBody.appendChild(row);
  });
  
  // Show empty state if no entries
  if (data.length === 0) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 4;
    emptyCell.textContent = 'No scores yet. Be the first!';
    emptyCell.style.textAlign = 'center';
    emptyCell.style.padding = '30px';
    emptyRow.appendChild(emptyCell);
    leaderboardBody.appendChild(emptyRow);
  }
}

// Share a specific leaderboard entry
function shareLeaderboardEntry(entry) {
  // Ensure score is a number
  const scoreValue = parseInt(entry.score, 10) || 0;
  
  console.log('Sharing leaderboard entry with score:', scoreValue);
  
  const text = `${entry.name || 'Anonymous Unicorn'} scored ${scoreValue} points in Unicorn Space Adventure! Can you beat this magical score? 🦄✨`;
  const hashtags = 'UnicornGame,p5js,GameDev';
  const url = window.location.href;
  
  const shareURL = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&hashtags=${encodeURIComponent(hashtags)}&url=${encodeURIComponent(url)}`;
  window.open(shareURL, '_blank', 'width=550,height=420');
}

// Close the leaderboard modal
function closeLeaderboard() {
  leaderboardDisplayModal.classList.remove('active');
  
  // Re-hide email and name inputs
  if (emailInput) {
    emailInput.classList.add('hidden-during-play');
    emailInput.value = '';
  }
  
  if (nameInput) {
    nameInput.classList.add('hidden-during-play');
    nameInput.value = '';
  }
  
  // Re-enable canvas interaction if game is not over
  if (getGameState() !== "gameover") {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.style.pointerEvents = 'auto';
    }
  } else {
    // If the game is over, restart it
    console.log('Restarting game after closing leaderboard');
    handlePlayAgain();
  }
}

// Handle play again button
function handlePlayAgain() {
  console.log('🔄 Play again clicked');
  
  // 1. Signal that the score can now be unlocked
  SecureScoreManager.markGameAsRestarted();
  
  // Reset the manual name entry flag so name field starts fresh next time
  window._userManuallyEnteredName = false;
  
  // 2. Signal that the game is not frozen anymore
  window._GAME_IS_COMPLETELY_FROZEN = false;
  
  // 3. Clear the score freezing interval if it exists
  if (window._scoreFreezingInterval) {
    clearInterval(window._scoreFreezingInterval);
    window._scoreFreezingInterval = null;
  }
  
  // 4. Hide modals and reset UI
  const leaderboardModal = document.getElementById('leaderboard-modal');
  if (leaderboardModal) {
    leaderboardModal.style.display = 'none';
  }
  
  // Remove gameover class from body
  document.body.classList.remove('gameover');
  
  // 5. Hide form elements and reset their values
  const emailInput = document.getElementById('email-input');
  const nameInput = document.getElementById('name-input');
  
  if (emailInput) {
    emailInput.style.display = 'none';
    emailInput.value = '';
  }
  
  if (nameInput) {
    nameInput.style.display = 'none';
    nameInput.value = '';
  }
  
  // 6. Restore the canvas that was removed
  restoreOriginalCanvas();
  
  // 6. Restore all canvases that were removed
  restoreAllCanvases();
  
  // Remove the interception layer if it exists
  if (window._INTERCEPTION_LAYER) {
    if (window._INTERCEPTION_LAYER.parentNode) {
      window._INTERCEPTION_LAYER.parentNode.removeChild(window._INTERCEPTION_LAYER);
    }
    window._INTERCEPTION_LAYER = null;
    console.log("Removed game interception layer");
  }
  
  // 7. Clear all freeze guardians and monitoring intervals
  if (window._freezeGuardian) {
    clearInterval(window._freezeGuardian);
    window._freezeGuardian = null;
  }
  
  if (window._secondFreezeGuardian) {
    clearInterval(window._secondFreezeGuardian);
    window._secondFreezeGuardian = null;
  }
  
  // Clear RAF monitor if it exists
  if (window._rafMonitor) {
    clearInterval(window._rafMonitor);
    window._rafMonitor = null;
  }
  
  // Disconnect canvas blocker mutation observer
  if (window._canvasBlocker && typeof window._canvasBlocker.disconnect === 'function') {
    window._canvasBlocker.disconnect();
    window._canvasBlocker = null;
    console.log('Canvas blocker disconnected');
  }
  
  // 8. Restore all original browser and game functions
  
  // Restore RequestAnimationFrame
  if (window._originalRequestAnimationFrame) {
    window.requestAnimationFrame = window._originalRequestAnimationFrame;
    window._originalRequestAnimationFrame = null;
    console.log('Restored original requestAnimationFrame');
  }
  
  // Restore CancelAnimationFrame
  if (window._originalCancelAnimationFrame) {
    window.cancelAnimationFrame = window._originalCancelAnimationFrame;
    window._originalCancelAnimationFrame = null;
  }
  
  // Restore performance.now
  if (window._originalPerformanceNow) {
    window.performance.now = window._originalPerformanceNow;
    window._originalPerformanceNow = null;
    window._GAME_FREEZE_TIMESTAMP = null;
    console.log('Restored original performance.now()');
  }
  
  // Restore Date.now
  if (window._originalDateNow) {
    Date.now = window._originalDateNow;
    window._originalDateNow = null;
    window._GAME_FREEZE_DATE = null;
    console.log('Restored original Date.now()');
  }
  
  // Restore all game functions
  if (window._originalGameFunctions) {
    Object.keys(window._originalGameFunctions).forEach(funcName => {
      // Handle p5 global functions specially
      if (funcName.startsWith('p5_global_')) {
        const globalName = funcName.replace('p5_global_', '');
        window[globalName] = window._originalGameFunctions[funcName];
      } else {
        window[funcName] = window._originalGameFunctions[funcName];
      }
    });
    window._originalGameFunctions = null;
    console.log('Restored all original game functions');
  }
  
  // Restore p5 instance functions
  if (window.p5) {
    console.log('🔄 Restoring p5.js instance and functions');
    
    // Restore all possible versions of draw function
    if (window._originalP5Draw && window.p5.instance) {
      window.p5.instance.draw = window._originalP5Draw;
      window._originalP5Draw = null;
    }
    
    if (window._p5_original_draw && window.p5.instance) {
      window.p5.instance.draw = window._p5_original_draw;
      window._p5_original_draw = null;
    }
    
    if (window._original_p5_draw && window.p5.instance) {
      window.p5.instance._draw = window._original_p5_draw;
      window._original_p5_draw = null;
    }
    
    // Restore p5 instance if it was completely removed
    if (!window.p5.instance && window._p5_instance_backup) {
      window.p5.instance = window._p5_instance_backup;
      window._p5_instance_backup = null;
      console.log("Restored p5 instance that was completely removed");
    }
    
    // Restore core p5 prototype functions if they were replaced
    if (window._p5_core_functions) {
      Object.keys(window._p5_core_functions).forEach(funcName => {
        if (window.p5 && window.p5.prototype) {
          window.p5.prototype[funcName] = window._p5_core_functions[funcName];
        }
      });
      window._p5_core_functions = null;
      console.log("Restored p5 core prototype functions");
    }
    
    // Restore frameRate if it was changed
    if (window._original_frameRate && window.p5.instance) {
      window.p5.instance.frameRate = window._original_frameRate;
      // Call with a reasonable default
      try { window.p5.instance.frameRate(60); } catch(e) {}
      window._original_frameRate = null;
    }
  }
  
  // Restore the original event system
  if (window._originalAddEventListener) {
    EventTarget.prototype.addEventListener = window._originalAddEventListener;
    window._originalAddEventListener = null;
    console.log('Restored original addEventListener');
  }
  
  if (window._originalRemoveEventListener) {
    EventTarget.prototype.removeEventListener = window._originalRemoveEventListener;
    window._originalRemoveEventListener = null;
  }
  
  // Stop continuous game monitoring
  if (window._continuousMonitorInterval) {
    clearInterval(window._continuousMonitorInterval);
    window._continuousMonitorInterval = null;
    console.log("Stopped continuous game monitoring");
  }
  
  if (window._superMonitor) {
    clearInterval(window._superMonitor);
    window._superMonitor = null;
  }
  
  // Call the restartGame function to handle the actual game restart
  restartGame();
}

// Restart the game
function restartGame() {
  // Reset game state to playing
  window.gameState = 'playing';
  
  // Try to restart the p5 loop
  if (window.p5 && window.p5.instance) {
    // Attempt full p5.js sketch restart
    console.log("⚡ Attempting full p5.js sketch restart");
    
    // Make sure loop is enabled
    window.p5.instance._loop = true;
    
    // Try multiple restart approaches
    if (typeof window.p5.instance.loop === 'function') {
      try { window.p5.instance.loop(); } catch(e) {}
    }
    
    if (typeof window.p5.instance.setup === 'function') {
      try { window.p5.instance.setup(); } catch(e) {}
    }
    
    if (typeof window.p5.instance.draw === 'function') {
      try { 
        // Force a single draw call to refresh the display
        window.p5.instance.redraw(); 
      } catch(e) {}
    }
  }
  
  // Try to trigger the resetGame function if it exists
  if (typeof window.resetGame === 'function') {
    try {
      window.resetGame();
    } catch(e) {
      console.warn('Error in resetGame:', e);
      
      // Fallback: Reload the page if reset failed
      window.location.reload();
    }
  } else {
    // If no reset function exists, just reload the page
    window.location.reload();
  }
}

// Helper function to show form status messages
function showFormStatus(message, type) {
  formStatusElement.innerHTML = '';
  
  const statusDiv = document.createElement('div');
  statusDiv.className = `status-message ${type}-message`;
  statusDiv.textContent = message;
  
  formStatusElement.appendChild(statusDiv);
}

// Helper function to validate email
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Helper function to mask email for privacy
function maskEmail(email) {
  if (!email) return 'Unknown';
  
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  
  const namePart = parts[0];
  const domainPart = parts[1];
  
  let maskedName = '';
  if (namePart.length <= 2) {
    maskedName = namePart[0] + '*';
  } else {
    maskedName = namePart[0] + '*'.repeat(Math.min(5, namePart.length - 2)) + namePart[namePart.length - 1];
  }
  
  return `${maskedName}@${domainPart}`;
}

// Function to check if Supabase is set up correctly
async function checkSupabaseSetup() {
  try {
    console.log('Checking Supabase setup...');
    
    // First check if we can connect to Supabase at all
    const { data: health, error: healthError } = await supabase.rpc('pg_health_check').select();
    
    if (healthError) {
      console.error('Cannot connect to Supabase:', healthError);
      
      // Check if it's a CORS error (will show in the browser console)
      if (healthError.message && healthError.message.includes('NetworkError')) {
        console.error('Possible CORS issue detected. Make sure http://localhost:8000 is added to the allowed origins in Supabase settings.');
        showCorsInstructions();
        return;
      }
    }
    
    // Now check if the leaderboard table exists
    console.log('Checking leaderboard table...');
    const { data, error } = await supabase
      .from('leaderboard')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase setup issue - Table check failed:', error);
      
      // Check specific error codes
      if (error.code === '42P01') { // PostgreSQL code for undefined_table
        console.error('The leaderboard table does not exist. Please create it according to the README instructions.');
        showSetupInstructions();
      } else if (error.code === 'PGRST301') { // RLS policy error
        console.error('Row Level Security policy issue. Please check your RLS policies.');
        showRlsInstructions();
      } else {
        // Generic error
        showFormStatus(`Database error: ${error.message}`, 'error');
      }
    } else {
      console.log('Supabase leaderboard table exists and is accessible:', data);
    }
  } catch (error) {
    console.error('Failed to check Supabase setup:', error);
    showFormStatus('Failed to connect to database. See console for details.', 'error');
  }
}

// Display CORS instructions
function showCorsInstructions() {
  if (formStatusElement) {
    formStatusElement.innerHTML = `
      <div class="status-message error-message">
        <p><strong>CORS Issue Detected!</strong></p>
        <p>Your browser cannot connect to Supabase due to Cross-Origin Resource Sharing (CORS) restrictions.</p>
        <p>To fix this:</p>
        <ol>
          <li>Go to your Supabase project dashboard</li>
          <li>Click on "Settings" in the left sidebar</li>
          <li>Select "API" in the settings menu</li>
          <li>Scroll down to the "CORS" section</li>
          <li>Add <code>http://localhost:8000</code> to the allowed origins</li>
          <li>Save your changes and refresh this page</li>
        </ol>
      </div>
    `;
  }
}

// Display RLS instructions
function showRlsInstructions() {
  if (formStatusElement) {
    formStatusElement.innerHTML = `
      <div class="status-message error-message">
        <p><strong>Row Level Security Issue!</strong></p>
        <p>Your table exists but the security policies are preventing access.</p>
        <p>To fix this:</p>
        <ol>
          <li>Go to your Supabase project dashboard</li>
          <li>Click on "Table Editor" in the left sidebar</li>
          <li>Select the "leaderboard" table</li>
          <li>Click on "Policies" tab</li>
          <li>Create two policies:</li>
          <ul>
            <li>"Allow anonymous insert" with <code>true</code> check expression</li>
            <li>"Allow anonymous read" with <code>true</code> check expression</li>
          </ul>
        </ol>
      </div>
    `;
  }
}

// Display setup instructions in the form status if needed
function showSetupInstructions() {
  if (formStatusElement) {
    formStatusElement.innerHTML = `
      <div class="status-message error-message">
        <p><strong>Supabase setup issue detected!</strong></p>
        <p>Please follow these steps:</p>
        <ol>
          <li>Create a table named 'leaderboard' in your Supabase project</li>
          <li>Add columns: id (uuid, PK), created_at (timestamp), email (text), name (text), score (integer)</li>
          <li>Enable Row Level Security (RLS)</li>
          <li>Add RLS policies for anonymous inserts and reads</li>
        </ol>
        <p>See README.md for detailed instructions.</p>
      </div>
    `;
  }
}

// Function to clear saved credentials from localStorage
function clearSavedCredentials() {
  // Clear the saved values from localStorage
  localStorage.removeItem('unicornGameEmail');
  localStorage.removeItem('unicornGameName');
  
  // Clear the input fields
  if (emailInput) emailInput.value = '';
  if (nameInput) nameInput.value = '';
  
  // Focus on the email input
  if (emailInput) emailInput.focus();
  
  // Show a brief confirmation message
  if (formStatusElement) {
    formStatusElement.textContent = 'Saved information cleared!';
    formStatusElement.style.color = '#90ff90';
    
    // Clear the message after 2 seconds
    setTimeout(() => {
      formStatusElement.textContent = '';
    }, 2000);
  }
}

// Expose the function globally
window.clearSavedCredentials = clearSavedCredentials;

// Helper function to restore the original canvas
function restoreOriginalCanvas() {
  try {
    // Remove the placeholder if it exists
    if (window._CANVAS_PLACEHOLDER) {
      const placeholder = window._CANVAS_PLACEHOLDER;
      if (placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
      }
      window._CANVAS_PLACEHOLDER = null;
    }
    
    // Restore the original canvas if it was stored
    if (window._STORED_CANVAS && window._CANVAS_PARENT) {
      const canvas = window._STORED_CANVAS;
      const parent = window._CANVAS_PARENT;
      const nextSibling = window._CANVAS_NEXT_SIBLING;
      
      // Re-insert the canvas at its original position
      if (nextSibling) {
        parent.insertBefore(canvas, nextSibling);
      } else {
        parent.appendChild(canvas);
      }
      
      // Reset properties
      canvas.style.pointerEvents = 'auto';
      canvas.style.zIndex = 'auto';
      canvas.classList.remove('game-frozen');
      if (canvas.hasAttribute('tabindex')) canvas.removeAttribute('tabindex');
      if (canvas.hasAttribute('aria-hidden')) canvas.removeAttribute('aria-hidden');
      
      console.log('🔄 Original canvas restored to DOM');
      
      // Clear references
      window._STORED_CANVAS = null;
      window._CANVAS_PARENT = null;
      window._CANVAS_NEXT_SIBLING = null;
    }
  } catch (e) {
    console.error('Error restoring canvas:', e);
  }
}

// Helper function to restore all canvases that were removed
function restoreAllCanvases() {
  try {
    // Restore all canvases that were stored in _ALL_STORED_CANVASES
    window._ALL_STORED_CANVASES.forEach((canvasData) => {
      const { element, parent, nextSibling, width, height } = canvasData;
      
      // Re-insert the canvas at its original position
      if (nextSibling) {
        parent.insertBefore(element, nextSibling);
      } else {
        parent.appendChild(element);
      }
      
      // Reset properties
      element.style.pointerEvents = 'auto';
      element.style.zIndex = 'auto';
      element.classList.remove('game-frozen');
      if (element.hasAttribute('tabindex')) element.removeAttribute('tabindex');
      if (element.hasAttribute('aria-hidden')) element.removeAttribute('aria-hidden');
      
      // Restore dimensions
      element.width = width;
      element.height = height;
      
      console.log(`🔄 Canvas #${canvasData.index} restored to DOM`);
    });
    
    // Clear the stored canvases
    window._ALL_STORED_CANVASES = [];
  } catch (e) {
    console.error('Error restoring all canvases:', e);
  }
}

// Add a new function to clear all saved data
function addClearDataButton() {
  // Create the clear data button container
  const clearDataContainer = document.createElement('div');
  clearDataContainer.className = 'clear-data-container';
  clearDataContainer.style.marginTop = '20px';
  clearDataContainer.style.textAlign = 'center';
  clearDataContainer.style.fontSize = '12px';
  clearDataContainer.style.opacity = '0.7';
  
  // Create the button
  const clearDataButton = document.createElement('button');
  clearDataButton.className = 'text-button';
  clearDataButton.textContent = '🧹 Clear All Saved Game Data';
  clearDataButton.style.fontSize = '12px';
  clearDataButton.style.color = '#ffcccc';
  
  // Add click handler
  clearDataButton.addEventListener('click', function(e) {
    e.preventDefault();
    
    // Clear all localStorage related to the game
    localStorage.removeItem('unicornGameEmail');
    localStorage.removeItem('unicornGameName');
    
    // Clear any other potential game data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('unicorn') || key.includes('game') || key.includes('score'))) {
        localStorage.removeItem(key);
      }
    }
    
    // Clear session storage too
    sessionStorage.clear();
    
    // Reset any name/email fields
    if (nameInput) nameInput.value = '';
    if (emailInput) emailInput.value = '';
    
    // Remove any helper elements
    const helpers = document.querySelectorAll('.name-helper, .autofill-helper, .autofill-message');
    helpers.forEach(el => el.parentNode.removeChild(el));
    
    // Show confirmation
    const confirmMsg = document.createElement('div');
    confirmMsg.textContent = '✅ All saved game data has been cleared!';
    confirmMsg.style.color = '#90ff90';
    confirmMsg.style.marginTop = '10px';
    
    clearDataContainer.innerHTML = '';
    clearDataContainer.appendChild(confirmMsg);
    
    // Reset flag for manual name entry
    window._userManuallyEnteredName = false;
    
    // Log the action
    console.log('All saved game data has been cleared by user request');
    
    // Restore button after 3 seconds
    setTimeout(() => {
      clearDataContainer.innerHTML = '';
      clearDataContainer.appendChild(clearDataButton);
    }, 3000);
  });
  
  // Add button to container
  clearDataContainer.appendChild(clearDataButton);
  
  // Find a good place to insert it
  const leaderboardForm = document.getElementById('leaderboard-form');
  const submitButton = document.getElementById('submit-score');
  
  if (leaderboardForm && submitButton) {
    const buttonContainer = submitButton.parentNode;
    if (buttonContainer) {
      buttonContainer.parentNode.insertBefore(clearDataContainer, buttonContainer.nextSibling);
    } else {
      leaderboardForm.appendChild(clearDataContainer);
    }
  }
}

// -------------------- HELPER FUNCTIONS --------------------
// These functions are used throughout the code for game freezing and protection

// Helper function to ensure the game is completely frozen
function enforceGameFreeze() {
  // Set global flag that game is in frozen state
  window._GAME_IS_COMPLETELY_FROZEN = true;
  
  // Stop the p5 instance if it exists
  if (window.p5 && window.p5.instance) {
    if (typeof window.p5.instance.noLoop === 'function') {
      try { window.p5.instance.noLoop(); } catch(e) {}
    }
    
    // Force _loop to false
    try { window.p5.instance._loop = false; } catch(e) {}
  }
  
  // Cancel any animation frames
  if (window.cancelAnimationFrame) {
    for (let i = 0; i < 100; i++) {
      try { window.cancelAnimationFrame(i); } catch(e) {}
    }
  }
  
  // Block any new animation frames
  if (window.requestAnimationFrame && window._originalRequestAnimationFrame) {
    window.requestAnimationFrame = function() {
      console.log("⛔ Animation frame blocked by freeze");
      return -1;
    };
  }
  
  console.log("🧊 Game freeze enforced");
}

// Helper function to protect against autofill events
function autofillProtection() {
  // Ensure game is frozen
  enforceGameFreeze();
  
  // Protect the score display
  protectScoreDisplay();
  
  // Check for any canvases that might have been restored
  const canvases = document.querySelectorAll('canvas');
  if (canvases.length > 0) {
    console.log(`Found ${canvases.length} canvas(es) - ensuring they're disabled`);
    canvases.forEach(canvas => {
      canvas.style.pointerEvents = 'none';
      canvas.style.opacity = '0.5';
    });
  }
  
  // Make sure game state is still marked as over
  if (window.gameState !== 'gameover') {
    window.gameState = 'gameover';
  }
  
  console.log("🛡️ Autofill protection applied");
}

// Helper function to ensure score value is not changed
function protectScoreDisplay() {
  if (finalScoreElement && finalScoreElement.dataset.originalScore) {
    const originalScore = finalScoreElement.dataset.originalScore;
    if (finalScoreElement.textContent != originalScore) {
      console.log('Score protection: resetting to', originalScore);
      finalScoreElement.textContent = originalScore;
    }
  }
}