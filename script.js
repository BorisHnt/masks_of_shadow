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
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

ctx.imageSmoothingEnabled = false;

const TILE_SIZE = 16;
const WALL = 1;
const FLOOR = 0;

const wallTilesImage = new Image();
wallTilesImage.src = "assets/walls/Mountains_001_tiles.png";
const wallTilesReady = new Promise((resolve) => {
  wallTilesImage.onload = () => resolve(true);
  wallTilesImage.onerror = () => resolve(false);
});

const WALL_TILE_SOURCES = [
  { x: 0, y: 0 },
  { x: 16, y: 0 },
  { x: 32, y: 0 },
  { x: 48, y: 0 },
  { x: 0, y: 16 },
  { x: 16, y: 16 },
  { x: 32, y: 16 },
  { x: 48, y: 16 },
  { x: 0, y: 32 },
  { x: 16, y: 32 },
  { x: 32, y: 32 },
  { x: 48, y: 32 },
  { x: 0, y: 48 },
];

let controlsOpen = false;
let tutorialIndex = 0;
let tutorialActive = false;
let generating = false;
let currentMaze = null;
let currentOffsets = { x: 0, y: 0 };

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

function createGrid(rows, cols, fillValue) {
  const grid = new Array(rows);
  for (let y = 0; y < rows; y += 1) {
    const row = new Array(cols);
    row.fill(fillValue);
    grid[y] = row;
  }
  return grid;
}

function generateMazePrim(cellCols, cellRows) {
  const cols = cellCols * 2 + 1;
  const rows = cellRows * 2 + 1;
  const grid = createGrid(rows, cols, WALL);
  const visited = createGrid(cellRows, cellCols, false);
  const frontier = [];

  const startX = Math.floor(Math.random() * cellCols);
  const startY = Math.floor(Math.random() * cellRows);

  visited[startY][startX] = true;
  grid[startY * 2 + 1][startX * 2 + 1] = FLOOR;

  const addFrontier = (cx, cy) => {
    const directions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];

    directions.forEach(({ dx, dy }) => {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= cellCols || ny >= cellRows) {
        return;
      }
      if (visited[ny][nx]) {
        return;
      }
      frontier.push({
        fromX: cx,
        fromY: cy,
        toX: nx,
        toY: ny,
        wallX: cx * 2 + 1 + dx,
        wallY: cy * 2 + 1 + dy,
      });
    });
  };

  addFrontier(startX, startY);

  while (frontier.length > 0) {
    const index = Math.floor(Math.random() * frontier.length);
    const { toX, toY, wallX, wallY } = frontier.splice(index, 1)[0];
    if (visited[toY][toX]) {
      continue;
    }
    visited[toY][toX] = true;
    grid[wallY][wallX] = FLOOR;
    grid[toY * 2 + 1][toX * 2 + 1] = FLOOR;
    addFrontier(toX, toY);
  }

  return grid;
}

function carveOpening(grid, side) {
  const rows = grid.length;
  const cols = grid[0].length;
  const candidates = [];

  if (side === "top") {
    for (let x = 1; x < cols - 1; x += 1) {
      if (grid[1][x] === FLOOR) {
        candidates.push({ x, y: 0, insideX: x, insideY: 1 });
      }
    }
  }
  if (side === "bottom") {
    for (let x = 1; x < cols - 1; x += 1) {
      if (grid[rows - 2][x] === FLOOR) {
        candidates.push({ x, y: rows - 1, insideX: x, insideY: rows - 2 });
      }
    }
  }
  if (side === "left") {
    for (let y = 1; y < rows - 1; y += 1) {
      if (grid[y][1] === FLOOR) {
        candidates.push({ x: 0, y, insideX: 1, insideY: y });
      }
    }
  }
  if (side === "right") {
    for (let y = 1; y < rows - 1; y += 1) {
      if (grid[y][cols - 2] === FLOOR) {
        candidates.push({ x: cols - 1, y, insideX: cols - 2, insideY: y });
      }
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  grid[pick.y][pick.x] = FLOOR;
  grid[pick.insideY][pick.insideX] = FLOOR;
  return pick;
}

function carveEntrances(grid) {
  const sides = ["top", "right", "bottom", "left"];
  const entryIndex = Math.floor(Math.random() * sides.length);
  const exitIndex = (entryIndex + 2) % sides.length;
  const entry = carveOpening(grid, sides[entryIndex]);
  const exit = carveOpening(grid, sides[exitIndex]);
  return { entry, exit };
}

function upscaleGrid(grid, scale) {
  const rows = grid.length;
  const cols = grid[0].length;
  const upRows = rows * scale;
  const upCols = cols * scale;
  const upscaled = createGrid(upRows, upCols, WALL);

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const value = grid[y][x];
      for (let dy = 0; dy < scale; dy += 1) {
        for (let dx = 0; dx < scale; dx += 1) {
          upscaled[y * scale + dy][x * scale + dx] = value;
        }
      }
    }
  }

  return upscaled;
}

function buildMaze() {
  const maxCols = Math.floor(canvas.width / TILE_SIZE);
  const maxRows = Math.floor(canvas.height / TILE_SIZE);
  const cellCols = Math.max(2, Math.floor((maxCols - 2) / 4));
  const cellRows = Math.max(2, Math.floor((maxRows - 2) / 4));

  const lowGrid = generateMazePrim(cellCols, cellRows);
  carveEntrances(lowGrid);
  const highGrid = upscaleGrid(lowGrid, 2);

  const offsetX = Math.floor(
    (canvas.width - highGrid[0].length * TILE_SIZE) / 2
  );
  const offsetY = Math.floor(
    (canvas.height - highGrid.length * TILE_SIZE) / 2
  );

  return { grid: highGrid, offsetX, offsetY };
}

function isWall(grid, x, y) {
  return grid[y] && grid[y][x] === WALL;
}

function selectWallTile(x, y, grid = currentMaze) {
  if (!grid || !isWall(grid, x, y)) {
    return 0;
  }

  const rows = grid.length;
  const cols = grid[0].length;

  if (x === 0 && y === 0) return 8;
  if (x === cols - 1 && y === 0) return 7;
  if (x === 0 && y === rows - 1) return 6;
  if (x === cols - 1 && y === rows - 1) return 5;
  if (y === 0) return 2;
  if (y === rows - 1) return 1;
  if (x === 0) return 4;
  if (x === cols - 1) return 3;

  const n = isWall(grid, x, y - 1);
  const s = isWall(grid, x, y + 1);
  const w = isWall(grid, x - 1, y);
  const e = isWall(grid, x + 1, y);
  const nw = isWall(grid, x - 1, y - 1);
  const ne = isWall(grid, x + 1, y - 1);
  const sw = isWall(grid, x - 1, y + 1);
  const se = isWall(grid, x + 1, y + 1);

  if (!nw && n && w && e && s) return 12;
  if (!ne && n && w && e && s) return 11;
  if (!sw && n && w && e && s) return 10;
  if (!se && n && w && e && s) return 9;

  if (!nw && !n && !w && e && s && se) return 8;
  if (!ne && !n && !e && w && s && sw) return 7;
  if (!sw && !s && !w && n && e && ne) return 6;
  if (!se && !s && !e && n && w && nw) return 5;

  if (!nw && !n && !ne && w && e && sw && s && se) return 1;
  if (nw && n && ne && w && e && !sw && !s && !se) return 2;
  if (!nw && !w && !sw && n && e && s && ne && se) return 3;
  if (!ne && !e && !se && n && w && s && nw && sw) return 4;

  if (!n && w && e) return 1;
  if (!s && w && e) return 2;
  if (!w && n && s) return 3;
  if (!e && n && s) return 4;

  if (n && s && w && e && nw && ne && sw && se) return 0;

  return 0;
}

function renderMaze(grid, offsetX, offsetY) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0b0a08";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < grid[0].length; x += 1) {
      if (grid[y][x] !== WALL) {
        continue;
      }
      const tileIndex = selectWallTile(x, y, grid);
      const source = WALL_TILE_SOURCES[tileIndex];
      if (!source) {
        continue;
      }
      const dx = offsetX + x * TILE_SIZE;
      const dy = offsetY + y * TILE_SIZE;
      ctx.drawImage(
        wallTilesImage,
        source.x,
        source.y,
        TILE_SIZE,
        TILE_SIZE,
        dx,
        dy,
        TILE_SIZE,
        TILE_SIZE
      );
    }
  }
}

async function generateAndRenderMaze() {
  await wallTilesReady;
  const { grid, offsetX, offsetY } = buildMaze();
  currentMaze = grid;
  currentOffsets = { x: offsetX, y: offsetY };
  renderMaze(grid, offsetX, offsetY);
}

function simulateGeneration() {
  if (generating) {
    return;
  }
  generating = true;
  showLoading(true);

  window.setTimeout(async () => {
    await generateAndRenderMaze();
    showLoading(false);
    generating = false;
    const seen = storage.get("mos_tutorial_seen") === "1";
    if (!seen) {
      startTutorial();
    }
  }, 500);
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
  if (currentMaze) {
    const offsetX = Math.floor(
      (canvas.width - currentMaze[0].length * TILE_SIZE) / 2
    );
    const offsetY = Math.floor(
      (canvas.height - currentMaze.length * TILE_SIZE) / 2
    );
    currentOffsets = { x: offsetX, y: offsetY };
    renderMaze(currentMaze, offsetX, offsetY);
  }
});

window.addEventListener("load", () => {
  body.classList.add("is-ready");
});
