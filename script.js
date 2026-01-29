const body = document.body;
const splash = document.getElementById("splash");
const game = document.getElementById("game");
const playButton = document.getElementById("play-btn");
const regenButton = document.getElementById("regen-btn");
const loadingOverlay = document.getElementById("loading-overlay");
const tutorialOverlay = document.getElementById("tutorial-overlay");
const tutorialBubble = document.getElementById("tutorial-bubble");
const tutorialText = document.getElementById("tutorial-text");
const nextTutorial = document.getElementById("next-tutorial");
const skipTutorial = document.getElementById("skip-tutorial");
const controlsPanel = document.getElementById("controls-panel");
const closeControls = document.getElementById("close-controls");

let controlsOpen = false;
let tutorialIndex = 0;
let tutorialActive = false;

const tutorialSteps = [
  {
    target: ".dashboard",
    text: "Track vitality, timers, and masks here.",
  },
  {
    target: ".player-marker",
    text: "Your marker anchors the maze center.",
  },
  {
    target: ".controls-zone",
    text: "Press Ctrl to reveal the controls panel.",
  },
];

const storage = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      // Ignore storage failures (private mode).
    }
  },
};

function setGameState(active) {
  body.classList.toggle("game-active", active);
  splash.setAttribute("aria-hidden", active ? "true" : "false");
  game.setAttribute("aria-hidden", active ? "false" : "true");
}

function showLoading(show) {
  loadingOverlay.classList.toggle("is-visible", show);
  loadingOverlay.setAttribute("aria-hidden", show ? "false" : "true");
}

function simulateGeneration() {
  showLoading(true);
  window.setTimeout(() => {
    showLoading(false);
    const seen = storage.get("mos_tutorial_seen") === "1";
    if (!seen) {
      startTutorial();
    }
  }, 1400);
}

function startTutorial() {
  tutorialActive = true;
  tutorialIndex = 0;
  tutorialOverlay.classList.add("is-visible");
  tutorialOverlay.setAttribute("aria-hidden", "false");
  updateTutorialStep();
}

function endTutorial() {
  tutorialActive = false;
  tutorialOverlay.classList.remove("is-visible");
  tutorialOverlay.setAttribute("aria-hidden", "true");
  storage.set("mos_tutorial_seen", "1");
}

function updateTutorialStep() {
  const step = tutorialSteps[tutorialIndex];
  if (!step) {
    endTutorial();
    return;
  }
  tutorialText.textContent = step.text;
  positionTutorial(step.target);
}

function positionTutorial(targetSelector) {
  const target = document.querySelector(targetSelector);
  if (!target) {
    return;
  }
  const rect = target.getBoundingClientRect();
  const bubbleRect = tutorialBubble.getBoundingClientRect();
  const spacing = 16;

  let top = rect.top - bubbleRect.height - spacing;
  let arrow = "down";

  if (top < 24) {
    top = rect.bottom + spacing;
    arrow = "up";
  }

  let left = rect.left + rect.width / 2 - bubbleRect.width / 2;
  const minLeft = 16;
  const maxLeft = window.innerWidth - bubbleRect.width - 16;
  left = Math.max(minLeft, Math.min(left, maxLeft));

  const arrowLeft = Math.max(
    18,
    Math.min(rect.left + rect.width / 2 - left, bubbleRect.width - 18)
  );

  tutorialBubble.style.top = `${top}px`;
  tutorialBubble.style.left = `${left}px`;
  tutorialBubble.style.setProperty("--arrow-left", `${arrowLeft}px`);
  tutorialBubble.setAttribute("data-arrow", arrow);
}

function setControlsOpen(open) {
  controlsOpen = open;
  body.classList.toggle("controls-open", open);
  controlsPanel.setAttribute("aria-hidden", open ? "false" : "true");
}

playButton.addEventListener("click", () => {
  setGameState(true);
  simulateGeneration();
});

regenButton.addEventListener("click", () => {
  simulateGeneration();
});

nextTutorial.addEventListener("click", () => {
  tutorialIndex += 1;
  updateTutorialStep();
});

skipTutorial.addEventListener("click", () => {
  endTutorial();
});

closeControls.addEventListener("click", () => {
  setControlsOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Control" && !event.repeat) {
    setControlsOpen(!controlsOpen);
  }
});

window.addEventListener("resize", () => {
  if (tutorialActive) {
    positionTutorial(tutorialSteps[tutorialIndex].target);
  }
});

window.addEventListener("load", () => {
  body.classList.add("is-ready");
});
