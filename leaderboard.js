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
let currentScore = 0; // Store the current score value

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
  
  // Get DOM elements
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
  
  // Make sure email input is completely hidden/empty during gameplay
  if (emailInput) {
    emailInput.value = '';
    emailInput.classList.add('hidden-during-play');
  }
  
  if (nameInput) {
    nameInput.value = '';
    nameInput.classList.add('hidden-during-play');
  }
  
  // Add event listeners
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
});

// Show leaderboard form modal when game ends
function showLeaderboardForm(finalScore) {
  // Store the score globally to ensure it's available for submission
  currentScore = finalScore;
  
  // Update the displayed score
  if (finalScoreElement) {
    finalScoreElement.textContent = finalScore;
  }
  
  // Reset submission flag
  isSubmitting = false;
  
  // Ensure canvas doesn't capture events
  const canvas = document.querySelector('canvas');
  if (canvas) {
    canvas.style.pointerEvents = 'none';
  }
  
  // Add class to body to indicate game over is shown (for responsive styling)
  document.body.classList.add('gameover-shown');
  
  // Make modal interactive
  leaderboardFormModal.classList.add('active');
  
  // Remove hidden class from inputs
  if (emailInput) {
    emailInput.classList.remove('hidden-during-play');
  }
  
  if (nameInput) {
    nameInput.classList.remove('hidden-during-play');
  }
  
  // Try to load email from localStorage if available
  const savedEmail = localStorage.getItem('unicornGameEmail');
  if (savedEmail) {
    emailInput.value = savedEmail;
  }
  
  // Try to load name from localStorage if available
  const savedName = localStorage.getItem('unicornGameName');
  if (savedName) {
    nameInput.value = savedName;
  }
  
  // Force keyboard to appear on mobile - wait for modal to fully appear
  setTimeout(() => {
    // Try using our specialized keyboard helper
    if (window.forceShowKeyboard && emailInput) {
      window.forceShowKeyboard(emailInput);
    } else if (emailInput) {
      // Fallback to direct focus method
      emailInput.focus();
      
      // Second attempt: try to trigger native behavior
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        // For iOS/Android, try to force the keyboard
        emailInput.blur();  // First blur
        emailInput.click(); // Then click
        emailInput.focus(); // Then focus again

        // Create a temporary input if needed
        if (!document.activeElement || document.activeElement !== emailInput) {
          console.log("Attempting aggressive keyboard display technique");
          const tempInput = document.createElement('input');
          tempInput.style.position = 'absolute';
          tempInput.style.top = '0';
          tempInput.style.left = '0';
          tempInput.style.opacity = '0';
          tempInput.style.height = '0';
          tempInput.setAttribute('type', 'text');
          
          document.body.appendChild(tempInput);
          tempInput.focus();
          tempInput.click();
          
          setTimeout(() => {
            tempInput.remove();
            emailInput.focus();
            emailInput.click();
          }, 100);
        }
      }
    }
  }, 500);
}

// Make the function globally accessible
window.showLeaderboardForm = showLeaderboardForm;

// Handle score submission
async function handleScoreSubmit(event) {
  // Prevent double submissions
  if (isSubmitting) {
    console.log('Submission already in progress, preventing duplicate');
    return;
  }
  
  // Set the submission flag
  isSubmitting = true;
  
  // Prevent default form submission if event was passed
  if (event && event.preventDefault) {
    event.preventDefault();
  }
  
  // Clear any existing keyboard focus to hide keyboard
  if (document.activeElement && document.activeElement.blur) {
    document.activeElement.blur();
  }
  
  const email = emailInput.value.trim();
  const name = nameInput.value.trim() || 'Anonymous Unicorn';
  
  // Use the stored score value instead of reading from the element
  // This ensures we have the correct score even if the UI hasn't updated yet
  const score = currentScore;
  
  console.log('Submitting score:', score);
  
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
    console.log('Attempting to submit score:', { email, name, score });
    
    // Submit score to Supabase
    const { data, error } = await supabase
      .from('leaderboard')
      .insert([
        { email, name, score }
      ]);
    
    if (error) {
      console.error('Supabase error details:', JSON.stringify(error));
      throw error;
    }
    
    console.log('Score submitted successfully:', data);
    
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

// Handle share to X button click
function handleShareToX() {
  const score = finalScoreElement.textContent;
  const name = nameInput.value.trim() || 'Anonymous Unicorn';
  
  // Create share text
  const text = `I just scored ${score} points as ${name} in Unicorn Space Adventure! Can you beat my magical score? 🦄✨`;
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
  const text = `${entry.name || 'Anonymous Unicorn'} scored ${entry.score} points in Unicorn Space Adventure! Can you beat this magical score? 🦄✨`;
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
  }
}

// Handle play again button
function handlePlayAgain() {
  // Hide modals
  leaderboardFormModal.classList.remove('active');
  leaderboardDisplayModal.classList.remove('active');
  
  // Remove gameover class from body
  document.body.classList.remove('gameover-shown');
  
  // Re-hide email and name inputs
  if (emailInput) {
    emailInput.classList.add('hidden-during-play');
    emailInput.value = '';
  }
  
  if (nameInput) {
    nameInput.classList.add('hidden-during-play');
    nameInput.value = '';
  }
  
  // Re-enable canvas interaction
  const canvas = document.querySelector('canvas');
  if (canvas) {
    canvas.style.pointerEvents = 'auto';
  }
  
  // Reset game
  if (typeof resetGame === 'function') {
    resetGame();
  } else {
    console.error('resetGame function not available');
    // Fallback: reload the page
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