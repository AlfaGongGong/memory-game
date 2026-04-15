// ===========================
// Card data (emoji animals)
// ===========================
const ALL_CARDS = [
  { id: 1,  emoji: "🦁", name: "Lav"       },
  { id: 2,  emoji: "🐘", name: "Slon"      },
  { id: 3,  emoji: "🦊", name: "Lisica"    },
  { id: 4,  emoji: "🐧", name: "Pingvin"   },
  { id: 5,  emoji: "🦋", name: "Leptir"    },
  { id: 6,  emoji: "🐬", name: "Delfin"    },
  { id: 7,  emoji: "🦄", name: "Jednorog"  },
  { id: 8,  emoji: "🐉", name: "Zmaj"      },
  { id: 9,  emoji: "🐸", name: "Žaba"      },
  { id: 10, emoji: "🦀", name: "Rak"       },
  { id: 11, emoji: "🦚", name: "Paun"      },
  { id: 12, emoji: "🐙", name: "Hobotnica" },
];

const DIFFICULTY_CONFIG = {
  easy:   { pairs: 4  },
  medium: { pairs: 8  },
  hard:   { pairs: 12 },
};

// Moves thresholds for [3 stars, 2 stars]; anything above = 1 star
const STAR_THRESHOLDS = {
  easy:   [6,  10],
  medium: [16, 24],
  hard:   [28, 40],
};

// ===========================
// Game state
// ===========================
let currentDifficulty = "easy";
let currentCards      = [];
let isPaused          = false;
let isGameOver        = false;
let moves             = 0;
let matchedPairs      = 0;
let timerInterval     = null;
let seconds           = 0;
let timerStarted      = false;

// ===========================
// DOM refs
// ===========================
const cardContainer = document.getElementById("card-container");
const movesCount    = document.getElementById("moves-count");
const timerDisplay  = document.getElementById("timer");
const overlay       = document.getElementById("overlay");
const resultEmoji   = document.getElementById("result-emoji");
const resultTitle   = document.getElementById("result-title");
const resultStars   = document.getElementById("result-stars");
const resultInfo    = document.getElementById("result-info");

// ===========================
// Audio (Web Audio API)
// ===========================
let audioCtx = null;

function getAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playNotes(notes, type = "sine", vol = 0.25) {
  try {
    const ctx = getAudio();
    notes.forEach(({ freq, t, dur }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + t);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + dur + 0.01);
    });
  } catch (_) { /* audio not available */ }
}

function playFlip() {
  playNotes([
    { freq: 440, t: 0,    dur: 0.08 },
    { freq: 660, t: 0.05, dur: 0.10 },
  ], "sine", 0.18);
}

function playMatch() {
  playNotes([
    { freq: 523.25, t: 0,    dur: 0.3 },
    { freq: 659.25, t: 0.1,  dur: 0.3 },
    { freq: 783.99, t: 0.2,  dur: 0.4 },
  ], "triangle", 0.22);
}

function playMismatch() {
  playNotes([
    { freq: 220, t: 0,    dur: 0.14 },
    { freq: 175, t: 0.14, dur: 0.20 },
  ], "sawtooth", 0.10);
}

function playWin() {
  playNotes([
    { freq: 523.25, t: 0,    dur: 0.22 },
    { freq: 659.25, t: 0.16, dur: 0.22 },
    { freq: 783.99, t: 0.32, dur: 0.22 },
    { freq: 1046.5, t: 0.48, dur: 0.55 },
  ], "sine", 0.28);
}

// ===========================
// Background decorations
// ===========================
function createBgDecorations() {
  const container = document.getElementById("bg-decorations");
  container.innerHTML = "";
  const items = ["⭐", "✨", "🌟", "💫", "🎈", "🎀", "🌈", "🍭", "🎊", "🌸"];
  for (let i = 0; i < 18; i++) {
    const el = document.createElement("span");
    el.className = "bg-deco";
    el.textContent = items[Math.floor(Math.random() * items.length)];
    el.style.cssText = [
      `left: ${Math.random() * 100}vw`,
      `animation-delay: ${-(Math.random() * 18)}s`,
      `animation-duration: ${Math.random() * 10 + 12}s`,
      `font-size: ${Math.random() * 16 + 12}px`,
    ].join(";");
    container.appendChild(el);
  }
}

// ===========================
// Timer
// ===========================
function startTimer() {
  if (timerStarted) return;
  timerStarted = true;
  timerInterval = setInterval(() => {
    seconds++;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    timerDisplay.textContent = `${m}:${s.toString().padStart(2, "0")}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimer() {
  stopTimer();
  seconds = 0;
  timerStarted = false;
  timerDisplay.textContent = "0:00";
}

// ===========================
// Shuffle (Fisher-Yates)
// ===========================
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ===========================
// Stars & result helpers
// ===========================
function calcStars(difficulty, moveCount) {
  const [great, ok] = STAR_THRESHOLDS[difficulty];
  if (moveCount <= great) return 3;
  if (moveCount <= ok)    return 2;
  return 1;
}

function renderStars(count) {
  return "⭐".repeat(count) + "🌑".repeat(3 - count);
}

// ===========================
// Confetti
// ===========================
function launchConfetti() {
  const canvas = document.getElementById("confetti-canvas");
  const ctx    = canvas.getContext("2d");
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = "block";

  const colors = [
    "#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff",
    "#ff6bff", "#ff9f43", "#54a0ff", "#ff6348",
  ];
  const particles = Array.from({ length: 200 }, () => ({
    x:      Math.random() * canvas.width,
    y:      Math.random() * -canvas.height,
    color:  colors[Math.floor(Math.random() * colors.length)],
    size:   Math.random() * 10 + 5,
    speedY: Math.random() * 3.5 + 2,
    speedX: (Math.random() - 0.5) * 4,
    angle:  Math.random() * 360,
    spin:   (Math.random() - 0.5) * 9,
    shape:  Math.random() > 0.5 ? "rect" : "circle",
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach((p) => {
      p.y     += p.speedY;
      p.x     += p.speedX;
      p.angle += p.spin;
      if (p.y < canvas.height) alive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.angle * Math.PI) / 180);
      ctx.fillStyle   = p.color;
      ctx.globalAlpha = Math.max(0, 1 - p.y / canvas.height);
      if (p.shape === "rect") {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    if (alive) {
      requestAnimationFrame(draw);
    } else {
      canvas.style.display = "none";
    }
  }
  draw();
}

// ===========================
// Show win result
// ===========================
function showWin() {
  stopTimer();
  isGameOver = true;
  const stars = calcStars(currentDifficulty, moves);
  playWin();
  setTimeout(launchConfetti, 350);
  resultEmoji.textContent = "🎉";
  resultTitle.textContent = "Bravo! Pobijedio si! 🏆";
  resultStars.textContent = renderStars(stars);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  resultInfo.textContent = `Potezi: ${moves} | Vrijeme: ${m}:${s.toString().padStart(2, "0")}`;
  overlay.classList.add("open");
}

// ===========================
// Card click handler
// ===========================
function handleClick(e) {
  const card = e.currentTarget;
  if (
    isPaused ||
    isGameOver ||
    card.classList.contains("card--guessed") ||
    card.classList.contains("card--picked")
  ) return;

  startTimer();
  playFlip();
  card.classList.add("card--picked");

  const allPicked = cardContainer.querySelectorAll(".card--picked");
  if (allPicked.length < 2) return; // waiting for second card

  isPaused = true;
  moves++;
  movesCount.textContent = moves;

  const [first, second] = allPicked;

  if (first.dataset.id === second.dataset.id) {
    // ---- Match ----
    playMatch();
    first.classList.remove("card--picked");
    second.classList.remove("card--picked");
    first.classList.add("card--guessed", "card--bounce");
    second.classList.add("card--guessed", "card--bounce");
    setTimeout(() => {
      first.classList.remove("card--bounce");
      second.classList.remove("card--bounce");
    }, 650);
    matchedPairs++;
    isPaused = false;
    if (matchedPairs === currentCards.length / 2) {
      setTimeout(showWin, 500);
    }
  } else {
    // ---- Mismatch ----
    playMismatch();
    setTimeout(() => {
      first.classList.add("card--shake");
      second.classList.add("card--shake");
      setTimeout(() => {
        first.classList.remove("card--picked", "card--shake");
        second.classList.remove("card--picked", "card--shake");
        isPaused = false;
      }, 500);
    }, 900);
  }
}

// ===========================
// Draw cards
// ===========================
function drawCards() {
  const config      = DIFFICULTY_CONFIG[currentDifficulty];
  const picked      = shuffle(ALL_CARDS).slice(0, config.pairs);
  currentCards      = shuffle([...picked, ...picked]);

  cardContainer.className = `card-container ${currentDifficulty}`;
  cardContainer.innerHTML = "";

  currentCards.forEach((data) => {
    const card = document.createElement("div");
    card.className  = "card";
    card.dataset.id = data.id;
    card.innerHTML  = `
      <div class="card__face card__back">
        <span class="card__back-icon">✨</span>
      </div>
      <div class="card__face card__front">
        <span class="card__emoji">${data.emoji}</span>
        <span class="card__name">${data.name}</span>
      </div>`;
    card.addEventListener("click", handleClick);
    cardContainer.appendChild(card);
  });
}

// ===========================
// Reset / new game
// ===========================
function resetGame() {
  resetTimer();
  isPaused     = false;
  isGameOver   = false;
  moves        = 0;
  matchedPairs = 0;
  movesCount.textContent = "0";
  overlay.classList.remove("open");
  drawCards();
}

// ===========================
// Event listeners
// ===========================
document.getElementById("play-again-btn").addEventListener("click", resetGame);
document.getElementById("start-btn").addEventListener("click", resetGame);

document.querySelectorAll(".diff-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".diff-btn").forEach((b) => b.classList.remove("active"));
    this.classList.add("active");
    currentDifficulty = this.dataset.difficulty;
    resetGame();
  });
});

// ===========================
// Init
// ===========================
createBgDecorations();
drawCards();
