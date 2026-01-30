const body = document.body;
const splash = document.getElementById("splash");
const splashConfig = document.getElementById("splash-config");
const game = document.getElementById("game");
const playButton = document.getElementById("play-btn");
const startGameButton = document.getElementById("start-game-btn");
const backButton = document.getElementById("back-btn");
const regenButton = document.getElementById("regen-btn");
const loadingOverlay = document.getElementById("loading-overlay");
const tutorialOverlay = document.getElementById("tutorial-overlay");
const tutorialBubble = document.getElementById("tutorial-bubble");
const tutorialText = document.getElementById("tutorial-text");
const nextTutorial = document.getElementById("next-tutorial");
const skipTutorial = document.getElementById("skip-tutorial");
const controlsPanel = document.getElementById("controls-panel");
const closeControls = document.getElementById("close-controls");
const eventYellowMask = document.getElementById("event-yellow-mask");
const eventBlueMask = document.getElementById("event-blue-mask");
const inventoryFlaskCount = document.getElementById("inventory-flask-count");
const deathOverlay = document.getElementById("death-overlay");
const winOverlay = document.getElementById("win-overlay");
const pauseOverlay = document.getElementById("pause-overlay");
const pauseContinueButton = document.getElementById("pause-continue");
const pauseResumeButton = document.getElementById("pause-resume");
const pauseQuitButton = document.getElementById("pause-quit");
const retryButton = document.getElementById("retry-btn");
const playAgainButton = document.getElementById("play-again-btn");
const healthFill = document.getElementById("health-fill");
const healthValue = document.getElementById("health-value");
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const sceneCanvas = document.createElement("canvas");
const sceneCtx = sceneCanvas.getContext("2d");

const difficultyCards = Array.from(
  document.querySelectorAll("[data-difficulty]")
);
const sizeCards = Array.from(document.querySelectorAll("[data-size]"));

ctx.imageSmoothingEnabled = false;
sceneCtx.imageSmoothingEnabled = false;

const SOURCE_TILE_SIZE = 16;
const RENDER_SCALE = 3;
const TILE_SIZE = SOURCE_TILE_SIZE * RENDER_SCALE;

const FLOOR = 0;
const WALL = 1;
const WATER = 2;
const TREE = 3;

let MAZE_CELL_COLS = 80;
let MAZE_CELL_ROWS = 80;

const FOG_RADIUS_BASE = 400;
const FOG_RADIUS_MASK = 750;
const FOG_BLUR_PX = 8;
const FOG_DARKNESS_BASE = 0.99;
const FOG_DARKNESS_MASK = 0.75;
const FOG_FALLOFF_PX = 50;

const MASK_DURATION = 15;
let MASK_ITEM_COUNT = 30;
const MASK_ITEM_RADIUS = 0.35;
const MASK_ITEM_DRAW_SCALE = 1;
const BLUE_MASK_DURATION = 15;
let BLUE_MASK_ITEM_COUNT = 30;
const PLAYER_SPEED = 6;
const PLAYER_MAX_HEALTH = 100;
let LIFE_FLASK_COUNT = 20;
const LIFE_FLASK_HEAL_RATIO = 0.25;
const ITEM_NEAR_PATH_RATIO = 0.2;
const ITEM_NEAR_PATH_DISTANCE = 2;
const FOREST_DENSITY = 0.14;
const FOREST_W = 0.46;
const FOREST_H = 0.5;
const FOREST_JITTER = 6;
const FOREST_HEDGE_CHANCE = 0.6;
const FOREST_HEDGE_MIN = 2;
const LAKE_COUNT = 6;
const LAKE_STAMPS_MIN = 6;
const LAKE_STAMPS_MAX = 16;
const LAKE_ENTRY_BUFFER = 6;
const LAKE_SMOOTH_PASSES = 1;
const LAKE_MIN_COMPONENT_TILES = 80;
const LAKE_BLOCK_BUFFER = 0;
const KNIFE_COOLDOWN = 0.25;
const KNIFE_RANGE_TILES = 5;
const KNIFE_SPEED = 15;
let SKELETON_MAX_HEALTH = 5;

const SKELETON_COUNT = 50;
const SKELETON_SPEED = 3.2;
const SKELETON_RADIUS = 0.5;
const SKELETON_CHASE_RANGE = 12;
const SKELETON_WANDER_TIME = 1.1;
let SKELETON_CONTACT_DPS = 22;
const SKELETON_CONTACT_COOLDOWN = 0.5;
const SKELETON_PATH_INTERVAL = 0.35;
const SKELETON_PATH_RADIUS = 22;
const SKELETON_WALL_BUFFER = 0;
const SKELETON_LOS_STEP = 0.25;
const SKELETON_ENTRY_MIN_DIST = 6;
const SKELETON_EXIT_MIN_DIST = 8;
const SKELETON_NEAR_MAX_DIST = 18;
const SKELETON_NEAR_COUNT = 12;
let SKELETON_PROGRESSIVE_START = 18;
let SKELETON_PROGRESSIVE_MAX = 50;
const SKELETON_PROGRESSIVE_BATCH = 3;
const SKELETON_PROGRESSIVE_INTERVAL = 1.6;
const SKELETON_SPAWN_MIN_DIST = 4;
const SKELETON_SPAWN_MAX_DIST = 20;
const SKELETON_AMBIENT_CHANCE = 0.45;
const SKELETON_DEATH_FRAMES = 4;
const SKELETON_DEATH_FPS = 8;

const FOG_SPRING_STIFFNESS = 40;
const FOG_SPRING_DAMPING = 8;

function loadImage(path) {
  const image = new Image();
  const ready = new Promise((resolve) => {
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
  });
  image.src = path;
  return { image, ready };
}

function loadImageWithFallback(primary, fallback) {
  const image = new Image();
  let triedFallback = false;
  const ready = new Promise((resolve) => {
    image.onload = () => resolve(true);
    image.onerror = () => {
      if (fallback && !triedFallback) {
        triedFallback = true;
        image.src = fallback;
      } else {
        resolve(false);
      }
    };
  });
  image.src = primary;
  return { image, ready };
}

const wallTiles = loadImage("assets/walls/Mountains_001_tiles.png");
const wallTilesImage = wallTiles.image;

const characterImages = {
  down: loadImage("assets/characters/human_001_face.png"),
  up: loadImage("assets/characters/human_001_back.png"),
  side: loadImage("assets/characters/human_001_side.png"),
};

const yellowCharacterImages = {
  down: loadImageWithFallback(
    "assets/characters/human_001_face_yellow_mask.png",
    "assets/characters/human_001_face_yellow_mask_sheet.png"
  ),
  up: loadImageWithFallback(
    "assets/characters/human_001_back_yellow_mask.png",
    "assets/characters/human_001_back_yellow_mask_sheet.png"
  ),
  side: loadImageWithFallback(
    "assets/characters/human_001_side_yellow_mask.png",
    "assets/characters/human_001_side_yellow_mask_sheet.png"
  ),
};

const blueCharacterImages = {
  down: loadImageWithFallback(
    "assets/characters/human_001_face_blue_mask.png",
    "assets/characters/human_001_face_blue_mask_sheet.png"
  ),
  up: loadImageWithFallback(
    "assets/characters/human_001_back_blue_mask.png",
    "assets/characters/human_001_back_blue_mask_sheet.png"
  ),
  side: loadImageWithFallback(
    "assets/characters/human_001_side_blue_mask.png",
    "assets/characters/human_001_side_blue_mask_sheet.png"
  ),
};

const yellowMaskItem = loadImage("assets/items/yellow_mask.png");
const blueMaskItem = loadImage("assets/items/blue_mask.png");
const knifeItem = loadImage("assets/items/knife_001.png");
const roadGuideItem = loadImage("assets/items/road-guide_001.png");
const lifeFlaskItem = loadImage("assets/items/live_flask_001.png");
const lakeTiles = loadImage("assets/lakes/lake_001_tiles.png");
const lakeTilesImage = lakeTiles.image;
const groundTiles = loadImage("assets/grounds/tiles_beige_soil_001.png");
const groundTilesImage = groundTiles.image;
const forestGroundTiles = loadImage("assets/grounds/tiles_green_herb_001.png");
const forestGroundTilesImage = forestGroundTiles.image;
const treeSprite = loadImage("assets/nature/tree_16x16_001.png");

const skeletonImages = {
  down: loadImage("assets/characters/skeleton_001_face.png"),
  up: loadImage("assets/characters/skeleton_001_back.png"),
  side: loadImage("assets/characters/skeleton_001_side.png"),
};
const skeletonDeathImage = loadImage("assets/characters/skeleton_001_death.png");

const assetsReady = Promise.all([
  wallTiles.ready,
  characterImages.down.ready,
  characterImages.up.ready,
  characterImages.side.ready,
  yellowCharacterImages.down.ready,
  yellowCharacterImages.up.ready,
  yellowCharacterImages.side.ready,
  blueCharacterImages.down.ready,
  blueCharacterImages.up.ready,
  blueCharacterImages.side.ready,
  yellowMaskItem.ready,
  blueMaskItem.ready,
  knifeItem.ready,
  roadGuideItem.ready,
  lifeFlaskItem.ready,
  lakeTiles.ready,
  groundTiles.ready,
  forestGroundTiles.ready,
  treeSprite.ready,
  skeletonImages.down.ready,
  skeletonImages.up.ready,
  skeletonImages.side.ready,
  skeletonDeathImage.ready,
]);

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

const LAKE_TILE_SOURCES = WALL_TILE_SOURCES;

const GROUND_TILE_SOURCES = [
  { x: 0, y: 0 },
  { x: 16, y: 0 },
  { x: 0, y: 16 },
  { x: 16, y: 16 },
];

const ROAD_GUIDE_TILES = {
  straight: { x: 0, y: 0, w: 8, h: 8 },
  corner: { x: 8, y: 0, w: 8, h: 8 },
  end: { x: 0, y: 8, w: 8, h: 8 },
};

const GUIDE_CORNER_ROTATION = {
  LD: 0,
  RD: -Math.PI / 2,
  RU: Math.PI,
  LU: Math.PI / 2,
};

function buildPlayerSprites(imageSet) {
  return {
    down: {
      image: imageSet.down.image,
      idleFrame: 2,
      moveFrames: [0, 1],
      flip: false,
    },
    up: {
      image: imageSet.up.image,
      idleFrame: 2,
      moveFrames: [0, 1],
      flip: false,
    },
    right: {
      image: imageSet.side.image,
      idleFrame: 0,
      moveFrames: [0, 1],
      flip: false,
    },
    left: {
      image: imageSet.side.image,
      idleFrame: 0,
      moveFrames: [0, 1],
      flip: true,
    },
  };
}

const playerSprites = buildPlayerSprites(characterImages);
const playerYellowSprites = buildPlayerSprites(yellowCharacterImages);
const playerBlueSprites = buildPlayerSprites(blueCharacterImages);
const skeletonSprites = buildPlayerSprites(skeletonImages);

let controlsOpen = false;
let tutorialIndex = 0;
let tutorialActive = false;
let generating = false;
let currentMaze = null;
let currentEntry = null;
let currentExit = null;
let animationId = null;
let lastFrameTime = 0;
let maskItems = [];
let yellowMaskTimer = 0;
let blueMaskItems = [];
let blueMaskTimer = 0;
let lifeFlaskItems = [];
let lifeFlaskCount = 0;
let guidePath = null;
let guidePathMap = null;
let guideLastCell = { x: -1, y: -1 };
let guideRecalcTimer = 0;
let mainPathCells = null;
let skeletonSpawnTimer = 0;
let entryExitDist = 1;
let fogRadiusCurrent = FOG_RADIUS_BASE;
let fogRadiusVelocity = 0;
let fogDarknessCurrent = FOG_DARKNESS_BASE;
let fogDarknessVelocity = 0;
let skeletons = [];
let contactCooldown = 0;
let knives = [];
let knifeCooldown = 0;
let lastArrowDir = { x: 0, y: -1 };
let commandBuffer = "";
let commandBufferTimer = 0;
let groundVariantMap = null;
let forestMask = null;
let gameOver = false;
let paused = false;

const camera = { x: 0, y: 0 };

const player = {
  x: 0,
  y: 0,
  radius: 0.32,
  speed: PLAYER_SPEED,
  health: PLAYER_MAX_HEALTH,
  direction: "down",
  moving: false,
  animTime: 0,
};

const keys = new Set();

const tutorialSteps = [
  {
    target: ".dashboard",
    text: "Track vitality, timers, and masks here.",
  },
  {
    target: "#game-canvas",
    text: "The maze extends beyond the frame. Move to explore.",
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

const DIFFICULTY_PRESETS = {
  easy: {
    mask: 50,
    blue: 50,
    flask: 35,
    skeletonMax: 50,
    skeletonStart: 18,
    skeletonHp: 2,
    skeletonDps: 20,
  },
  medium: {
    mask: 35,
    blue: 35,
    flask: 25,
    skeletonMax: 65,
    skeletonStart: 22,
    skeletonHp: 5,
    skeletonDps: 35,
  },
  hard: {
    mask: 20,
    blue: 20,
    flask: 17,
    skeletonMax: 85,
    skeletonStart: 28,
    skeletonHp: 5,
    skeletonDps: 60,
  },
  survivor: {
    mask: 10,
    blue: 10,
    flask: 10,
    skeletonMax: 120,
    skeletonStart: 36,
    skeletonHp: 8,
    skeletonDps: 100,
  },
};

const SIZE_PRESETS = {
  little: { cols: 20, rows: 20 },
  medium: { cols: 40, rows: 40 },
  big: { cols: 80, rows: 80 },
  enormous: { cols: 160, rows: 160 },
};

let currentDifficulty = "easy";
let currentSize = "big";

function applyDifficultyPreset(name) {
  const preset = DIFFICULTY_PRESETS[name] || DIFFICULTY_PRESETS.medium;
  MASK_ITEM_COUNT = preset.mask;
  BLUE_MASK_ITEM_COUNT = preset.blue;
  LIFE_FLASK_COUNT = preset.flask;
  SKELETON_PROGRESSIVE_MAX = preset.skeletonMax;
  SKELETON_PROGRESSIVE_START = preset.skeletonStart;
  SKELETON_MAX_HEALTH = preset.skeletonHp;
  SKELETON_CONTACT_DPS = preset.skeletonDps;
}

function applySizePreset(name) {
  const preset = SIZE_PRESETS[name] || SIZE_PRESETS.big;
  MAZE_CELL_COLS = preset.cols;
  MAZE_CELL_ROWS = preset.rows;
}

function setScreen(state) {
  const showGame = state === "game";
  const showConfig = state === "config";
  body.classList.toggle("game-active", showGame);
  body.classList.toggle("config-active", showConfig);
  body.classList.toggle("splash-active", state === "splash");
  splash.setAttribute("aria-hidden", showGame || showConfig ? "true" : "false");
  if (splashConfig) {
    splashConfig.setAttribute("aria-hidden", showConfig ? "false" : "true");
  }
  game.setAttribute("aria-hidden", showGame ? "false" : "true");
  setPaused(false);
  setEndOverlay(deathOverlay, false);
  setEndOverlay(winOverlay, false);
  if (!showGame) {
    gameOver = false;
  }
}

function syncSceneSize() {
  sceneCanvas.width = canvas.width;
  sceneCanvas.height = canvas.height;
}

function showLoading(show) {
  loadingOverlay.classList.toggle("is-visible", show);
  loadingOverlay.setAttribute("aria-hidden", show ? "false" : "true");
}

function setEndOverlay(overlay, show) {
  overlay.classList.toggle("is-visible", show);
  overlay.setAttribute("aria-hidden", show ? "false" : "true");
}

function setPaused(show) {
  paused = show;
  if (pauseOverlay) {
    pauseOverlay.classList.toggle("is-visible", show);
    pauseOverlay.setAttribute("aria-hidden", show ? "false" : "true");
  }
  if (show) {
    keys.clear();
  }
}

function returnToSplash() {
  setPaused(false);
  gameOver = false;
  setEndOverlay(deathOverlay, false);
  setEndOverlay(winOverlay, false);
  setScreen("splash");
}

function endGame(state) {
  gameOver = true;
  if (state === "win") {
    setEndOverlay(winOverlay, true);
    setEndOverlay(deathOverlay, false);
  } else {
    setEndOverlay(deathOverlay, true);
    setEndOverlay(winOverlay, false);
  }
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

function generateMazePrim(cellCols, cellRows, blockedCells = null) {
  const cols = cellCols * 2 + 1;
  const rows = cellRows * 2 + 1;
  const grid = createGrid(rows, cols, WALL);
  const visited = createGrid(cellRows, cellCols, false);
  const frontier = [];

  const candidates = [];
  for (let y = 0; y < cellRows; y += 1) {
    for (let x = 0; x < cellCols; x += 1) {
      if (blockedCells && blockedCells[y] && blockedCells[y][x]) {
        continue;
      }
      candidates.push({ x, y });
    }
  }

  if (!candidates.length) {
    return grid;
  }

  const start = candidates[Math.floor(Math.random() * candidates.length)];
  const startX = start.x;
  const startY = start.y;

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
      if (blockedCells && blockedCells[ny] && blockedCells[ny][nx]) {
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
    if (blockedCells && blockedCells[toY] && blockedCells[toY][toX]) {
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
        candidates.push({ x, y: 0, insideX: x, insideY: 1, side });
      }
    }
  }
  if (side === "bottom") {
    for (let x = 1; x < cols - 1; x += 1) {
      if (grid[rows - 2][x] === FLOOR) {
        candidates.push({ x, y: rows - 1, insideX: x, insideY: rows - 2, side });
      }
    }
  }
  if (side === "left") {
    for (let y = 1; y < rows - 1; y += 1) {
      if (grid[y][1] === FLOOR) {
        candidates.push({ x: 0, y, insideX: 1, insideY: y, side });
      }
    }
  }
  if (side === "right") {
    for (let y = 1; y < rows - 1; y += 1) {
      if (grid[y][cols - 2] === FLOOR) {
        candidates.push({ x: cols - 1, y, insideX: cols - 2, insideY: y, side });
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
  const lowCols = MAZE_CELL_COLS * 2 + 1;
  const lowRows = MAZE_CELL_ROWS * 2 + 1;
  const highCols = lowCols * 2;
  const highRows = lowRows * 2;

  const lakeMask = generateLakeMask(highCols, highRows);
  const blockedCells = buildLakeBlockMap(lakeMask);
  const lowGrid = generateMazePrim(MAZE_CELL_COLS, MAZE_CELL_ROWS, blockedCells);
  const { entry, exit } = carveEntrances(lowGrid);
  const highGrid = upscaleGrid(lowGrid, 2);
  applyLakes(highGrid, lakeMask);
  openLakeEdgesEven(highGrid);
  const forest = generateForestMask(highGrid, lakeMask);
  applyForest(highGrid, forest);
  removeDiagonalWallContacts(highGrid);
  normalizeTreeBlocks(highGrid, forest);
  const groundVariants = generateGroundVariants(highGrid);

  const entryHigh = entry
    ? {
        x: entry.insideX * 2 + 1,
        y: entry.insideY * 2 + 1,
        side: entry.side,
      }
    : { x: 1, y: 1, side: "top" };

  const exitHigh = exit
    ? {
        x: exit.insideX * 2 + 1,
        y: exit.insideY * 2 + 1,
        side: exit.side,
      }
    : { x: highGrid[0].length - 2, y: highGrid.length - 2, side: "bottom" };

  return {
    grid: highGrid,
    entry: entryHigh,
    exit: exitHigh,
    groundVariants,
    forestMask: forest,
  };
}

function generateForestMask(highGrid, lakeMask) {
  const rows = highGrid.length;
  const cols = highGrid[0].length;
  const mask = new Array(rows).fill(null).map(() => new Array(cols).fill(false));

  const maxW = Math.floor(cols * FOREST_W);
  const maxH = Math.floor(rows * FOREST_H);
  const w = Math.max(16, maxW);
  const h = Math.max(16, maxH);

  const notchW = Math.floor(w * 0.45);
  const notchH = Math.floor(h * 0.45);

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (x >= w - notchW && y >= h - notchH) continue;
      mask[y][x] = true;
    }
  }

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!mask[y][x]) continue;
      const edge =
        x < FOREST_JITTER ||
        y < FOREST_JITTER ||
        x > w - FOREST_JITTER ||
        y > h - FOREST_JITTER;
      if (edge && Math.random() < 0.25) {
        mask[y][x] = false;
      }
      if (!edge && Math.random() < 0.02) {
        mask[y][x] = false;
      }
    }
  }

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!mask[y][x]) continue;
      if (lakeMask && lakeMask[y] && lakeMask[y][x]) {
        mask[y][x] = false;
      }
    }
  }

  enforceForestContinuity(mask);
  const expanded = expandForestMask(mask, 1);
  const evened = enforceEvenMask(expanded);
  return evened;
}

function enforceForestContinuity(mask) {
  const rows = mask.length;
  const cols = mask[0].length;
  for (let y = 1; y < rows - 1; y += 1) {
    for (let x = 1; x < cols - 1; x += 1) {
      if (!mask[y][x]) continue;
      let neighbors = 0;
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          if (ox === 0 && oy === 0) continue;
          if (mask[y + oy][x + ox]) neighbors += 1;
        }
      }
      if (neighbors <= 2 && Math.random() < 0.6) {
        mask[y][x] = false;
      }
    }
  }
}

function expandForestMask(mask, passes) {
  const rows = mask.length;
  const cols = mask[0].length;
  let current = mask.map((row) => row.slice());

  for (let pass = 0; pass < passes; pass += 1) {
    const next = current.map((row) => row.slice());
    for (let y = 1; y < rows - 1; y += 1) {
      for (let x = 1; x < cols - 1; x += 1) {
        let neighbors = 0;
        for (let oy = -1; oy <= 1; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) {
            if (ox === 0 && oy === 0) continue;
            if (current[y + oy][x + ox]) neighbors += 1;
          }
        }
        if (!current[y][x] && neighbors >= 5) {
          next[y][x] = true;
        }
        if (current[y][x] && neighbors <= 1) {
          next[y][x] = false;
        }
      }
    }
    current = next;
  }

  return current;
}

function enforceEvenMask(mask) {
  const rows = mask.length;
  const cols = mask[0].length;
  const out = mask.map((row) => row.slice());
  for (let y = 0; y < rows; y += 2) {
    for (let x = 0; x < cols; x += 2) {
      let has = false;
      for (let dy = 0; dy < 2; dy += 1) {
        for (let dx = 0; dx < 2; dx += 1) {
          if (out[y + dy]?.[x + dx]) {
            has = true;
            break;
          }
        }
        if (has) break;
      }
      if (has) {
        for (let dy = 0; dy < 2; dy += 1) {
          for (let dx = 0; dx < 2; dx += 1) {
            if (out[y + dy]) {
              out[y + dy][x + dx] = true;
            }
          }
        }
      }
    }
  }
  return out;
}

function applyForest(highGrid, forest) {
  if (!forest) return;
  const rows = highGrid.length;
  const cols = highGrid[0].length;

  // Apply forest ground (grass) only on walkable floor within the forest mask.
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (!forest[y] || !forest[y][x]) continue;
      if (highGrid[y][x] === FLOOR) {
        highGrid[y][x] = FLOOR;
      }
    }
  }

  // Build hedge lines on 2x2 wall blocks for continuous tree lines.
  const blockRows = Math.floor((rows - 1) / 2);
  const blockCols = Math.floor((cols - 1) / 2);
  const wallBlocks = new Array(blockRows)
    .fill(null)
    .map(() => new Array(blockCols).fill(false));

  for (let by = 0; by < blockRows; by += 1) {
    for (let bx = 0; bx < blockCols; bx += 1) {
      const y = by * 2;
      const x = bx * 2;
      const inForest =
        forest[y]?.[x] &&
        forest[y]?.[x + 1] &&
        forest[y + 1]?.[x] &&
        forest[y + 1]?.[x + 1];
      if (!inForest) continue;
      const allWalls =
        highGrid[y][x] === WALL &&
        highGrid[y][x + 1] === WALL &&
        highGrid[y + 1][x] === WALL &&
        highGrid[y + 1][x + 1] === WALL;
      if (allWalls) {
        wallBlocks[by][bx] = true;
      }
    }
  }

  const toTreeBlock = (bx, by) => {
    const y = by * 2;
    const x = bx * 2;
    highGrid[y][x] = TREE;
    highGrid[y][x + 1] = TREE;
    highGrid[y + 1][x] = TREE;
    highGrid[y + 1][x + 1] = TREE;
  };

  for (let by = 0; by < blockRows; by += 1) {
    let bx = 0;
    while (bx < blockCols) {
      if (!wallBlocks[by][bx]) {
        bx += 1;
        continue;
      }
      let length = 1;
      while (bx + length < blockCols && wallBlocks[by][bx + length]) {
        length += 1;
      }
      if (length >= FOREST_HEDGE_MIN && Math.random() < FOREST_HEDGE_CHANCE) {
        for (let i = 0; i < length; i += 1) {
          toTreeBlock(bx + i, by);
        }
      } else if (Math.random() < FOREST_DENSITY) {
        toTreeBlock(bx, by);
      }
      bx += length;
    }
  }

  for (let bx = 0; bx < blockCols; bx += 1) {
    let by = 0;
    while (by < blockRows) {
      if (!wallBlocks[by][bx]) {
        by += 1;
        continue;
      }
      let length = 1;
      while (by + length < blockRows && wallBlocks[by + length][bx]) {
        length += 1;
      }
      if (length >= FOREST_HEDGE_MIN && Math.random() < FOREST_HEDGE_CHANCE) {
        for (let i = 0; i < length; i += 1) {
          toTreeBlock(bx, by + i);
        }
      } else if (Math.random() < FOREST_DENSITY) {
        toTreeBlock(bx, by);
      }
      by += length;
    }
  }
}

function removeDiagonalWallContacts(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const passes = 3;
  const countOrth = (x, y) =>
    (grid[y - 1]?.[x] === WALL ? 1 : 0) +
    (grid[y + 1]?.[x] === WALL ? 1 : 0) +
    (grid[y]?.[x - 1] === WALL ? 1 : 0) +
    (grid[y]?.[x + 1] === WALL ? 1 : 0);

  for (let pass = 0; pass < passes; pass += 1) {
    const toClear = [];
    for (let y = 0; y < rows - 1; y += 1) {
      for (let x = 0; x < cols - 1; x += 1) {
        const a = grid[y][x] === WALL;
        const b = grid[y][x + 1] === WALL;
        const c = grid[y + 1][x] === WALL;
        const d = grid[y + 1][x + 1] === WALL;

        if (a && d && !b && !c) {
          const aScore = countOrth(x, y);
          const dScore = countOrth(x + 1, y + 1);
          toClear.push(aScore <= dScore ? [x, y] : [x + 1, y + 1]);
        } else if (b && c && !a && !d) {
          const bScore = countOrth(x + 1, y);
          const cScore = countOrth(x, y + 1);
          toClear.push(bScore <= cScore ? [x + 1, y] : [x, y + 1]);
        }
      }
    }
    for (const [x, y] of toClear) {
      if (grid[y]?.[x] === WALL) {
        grid[y][x] = FLOOR;
      }
    }
  }
}

function normalizeTreeBlocks(grid, forest) {
  const rows = grid.length;
  const cols = grid[0].length;
  for (let y = 0; y < rows - 1; y += 2) {
    for (let x = 0; x < cols - 1; x += 2) {
      const inForest =
        forest?.[y]?.[x] &&
        forest?.[y]?.[x + 1] &&
        forest?.[y + 1]?.[x] &&
        forest?.[y + 1]?.[x + 1];
      if (!inForest) {
        if (grid[y][x] === TREE) grid[y][x] = WALL;
        if (grid[y][x + 1] === TREE) grid[y][x + 1] = WALL;
        if (grid[y + 1][x] === TREE) grid[y + 1][x] = WALL;
        if (grid[y + 1][x + 1] === TREE) grid[y + 1][x + 1] = WALL;
        continue;
      }

      const treeCount =
        (grid[y][x] === TREE ? 1 : 0) +
        (grid[y][x + 1] === TREE ? 1 : 0) +
        (grid[y + 1][x] === TREE ? 1 : 0) +
        (grid[y + 1][x + 1] === TREE ? 1 : 0);

      if (treeCount > 0 && treeCount < 4) {
        grid[y][x] = TREE;
        grid[y][x + 1] = TREE;
        grid[y + 1][x] = TREE;
        grid[y + 1][x + 1] = TREE;
      }
    }
  }
}

function generateGroundVariants(highGrid) {
  const rows = highGrid.length;
  const cols = highGrid[0].length;
  const variants = new Array(rows).fill(null).map(() => new Array(cols).fill(0));
  for (let y = 0; y < rows; y += 2) {
    for (let x = 0; x < cols; x += 2) {
      const variant = Math.floor(Math.random() * 4);
      for (let dy = 0; dy < 2; dy += 1) {
        for (let dx = 0; dx < 2; dx += 1) {
          const ty = y + dy;
          const tx = x + dx;
          if (!highGrid[ty]) continue;
          if (isGroundCell(highGrid[ty][tx])) {
            variants[ty][tx] = variant;
          }
        }
      }
    }
  }
  return variants;
}

function generateLakeMask(cols, rows) {
  const lakeMask = new Array(rows).fill(null).map(() => new Array(cols).fill(false));

  const inBorderBuffer = (x, y) =>
    x < LAKE_ENTRY_BUFFER ||
    y < LAKE_ENTRY_BUFFER ||
    x >= cols - LAKE_ENTRY_BUFFER ||
    y >= rows - LAKE_ENTRY_BUFFER;

  const stampRect = (seedX, seedY, width, height) => {
    for (let y = seedY; y < seedY + height; y += 1) {
      for (let x = seedX; x < seedX + width; x += 1) {
        if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
        if (inBorderBuffer(x, y)) continue;
        lakeMask[y][x] = true;
      }
    }
  };

  const pickChunkSize = () => {
    const tileSizes = [
      [6, 8],
      [2, 10],
      [4, 6],
      [8, 8],
      [6, 12],
      [10, 6],
      [12, 16],
    ];
    const [tw, th] = tileSizes[Math.floor(Math.random() * tileSizes.length)];
    return [tw, th];
  };

  const addBlob = (seedX, seedY) => {
    const stamps = Math.floor(
      LAKE_STAMPS_MIN + Math.random() * (LAKE_STAMPS_MAX - LAKE_STAMPS_MIN + 1)
    );
    for (let i = 0; i < stamps; i += 1) {
      const [w, h] = pickChunkSize();
      const offsetX = Math.floor((Math.random() - 0.5) * 12);
      const offsetY = Math.floor((Math.random() - 0.5) * 12);
      stampRect(seedX + offsetX, seedY + offsetY, w, h);
    }
  };

  const smoothLakes = () => {
    for (let pass = 0; pass < LAKE_SMOOTH_PASSES; pass += 1) {
      const next = lakeMask.map((row) => row.slice());
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          if (inBorderBuffer(x, y)) continue;
          let neighbors = 0;
          for (let oy = -1; oy <= 1; oy += 1) {
            for (let ox = -1; ox <= 1; ox += 1) {
              if (ox === 0 && oy === 0) continue;
              const nx = x + ox;
              const ny = y + oy;
              if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
              if (lakeMask[ny][nx]) neighbors += 1;
            }
          }
          if (lakeMask[y][x]) {
            if (neighbors <= 2) next[y][x] = false;
          } else if (neighbors >= 5) {
            next[y][x] = true;
          }
        }
      }
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          lakeMask[y][x] = next[y][x];
        }
      }
    }
  };

  const attempts = LAKE_COUNT * 6;
  let placed = 0;
  for (let i = 0; i < attempts; i += 1) {
    if (placed >= LAKE_COUNT) break;
    const x = Math.floor(Math.random() * cols);
    const y = Math.floor(Math.random() * rows);
    if (inBorderBuffer(x, y)) continue;
    addBlob(x, y);
    placed += 1;
  }

  smoothLakes();
  enforceEvenLakeMask(lakeMask, cols, rows);
  removeSmallLakeComponents(lakeMask, cols, rows);
  return lakeMask;
}

function enforceEvenLakeMask(lakeMask, cols, rows) {
  for (let y = 0; y < rows; y += 2) {
    for (let x = 0; x < cols; x += 2) {
      let hasLake = false;
      for (let dy = 0; dy < 2; dy += 1) {
        for (let dx = 0; dx < 2; dx += 1) {
          if (lakeMask[y + dy] && lakeMask[y + dy][x + dx]) {
            hasLake = true;
            break;
          }
        }
        if (hasLake) break;
      }
      if (hasLake) {
        for (let dy = 0; dy < 2; dy += 1) {
          for (let dx = 0; dx < 2; dx += 1) {
            if (lakeMask[y + dy]) {
              lakeMask[y + dy][x + dx] = true;
            }
          }
        }
      }
    }
  }
}

function removeSmallLakeComponents(lakeMask, cols, rows) {
  const visited = new Array(rows).fill(null).map(() => new Array(cols).fill(false));
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (!lakeMask[y][x] || visited[y][x]) continue;
      const stack = [[x, y]];
      const component = [];
      visited[y][x] = true;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        component.push([cx, cy]);
        for (const [dx, dy] of dirs) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
          if (!lakeMask[ny][nx] || visited[ny][nx]) continue;
          visited[ny][nx] = true;
          stack.push([nx, ny]);
        }
      }
      if (component.length < LAKE_MIN_COMPONENT_TILES) {
        for (const [cx, cy] of component) {
          lakeMask[cy][cx] = false;
        }
      }
    }
  }
}

function buildLakeBlockMap(lakeMask) {
  const cellRows = MAZE_CELL_ROWS;
  const cellCols = MAZE_CELL_COLS;
  const blocked = new Array(cellRows).fill(null).map(() => new Array(cellCols).fill(false));

  for (let y = 0; y < cellRows; y += 1) {
    for (let x = 0; x < cellCols; x += 1) {
      const baseY = (y * 2 + 1) * 2;
      const baseX = (x * 2 + 1) * 2;
      let hasLake = false;
      for (let dy = -LAKE_BLOCK_BUFFER; dy < 2 + LAKE_BLOCK_BUFFER; dy += 1) {
        for (let dx = -LAKE_BLOCK_BUFFER; dx < 2 + LAKE_BLOCK_BUFFER; dx += 1) {
          const ty = baseY + dy;
          const tx = baseX + dx;
          if (lakeMask[ty] && lakeMask[ty][tx]) {
            hasLake = true;
            break;
          }
        }
        if (hasLake) break;
      }
      blocked[y][x] = hasLake;
    }
  }

  return blocked;
}

function applyLakes(highGrid, lakeMask) {
  if (!lakeMask) return;
  const rows = lakeMask.length;
  const cols = lakeMask[0].length;

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (!lakeMask[y][x]) continue;
      highGrid[y][x] = WATER;
    }
  }
}

function openLakeEdgesEven(highGrid) {
  const rows = highGrid.length;
  const cols = highGrid[0].length;

  for (let y = 0; y < rows; y += 2) {
    for (let x = 0; x < cols; x += 2) {
      let hasWall = false;
      let touchesWater = false;

      for (let dy = 0; dy < 2; dy += 1) {
        for (let dx = 0; dx < 2; dx += 1) {
          const ty = y + dy;
          const tx = x + dx;
          if (ty >= rows || tx >= cols) continue;
          if (highGrid[ty][tx] === WALL) {
            hasWall = true;
          }
          if (highGrid[ty][tx] === WATER) {
            touchesWater = true;
          } else {
            const up = highGrid[ty - 1]?.[tx] === WATER;
            const down = highGrid[ty + 1]?.[tx] === WATER;
            const left = highGrid[ty]?.[tx - 1] === WATER;
            const right = highGrid[ty]?.[tx + 1] === WATER;
            if (up || down || left || right) {
              touchesWater = true;
            }
          }
        }
      }

      if (!hasWall || !touchesWater) continue;

      for (let dy = 0; dy < 2; dy += 1) {
        for (let dx = 0; dx < 2; dx += 1) {
          const ty = y + dy;
          const tx = x + dx;
          if (ty >= rows || tx >= cols) continue;
          if (highGrid[ty][tx] === WALL) {
            highGrid[ty][tx] = FLOOR;
          }
        }
      }
    }
  }
}


function spawnYellowMasks(grid, entry, exit, count) {
  const rows = grid.length;
  const cols = grid[0].length;
  const candidates = [];
  const nearCandidates = [];
  const pathSet = mainPathCells;

  for (let y = 1; y < rows - 1; y += 1) {
    for (let x = 1; x < cols - 1; x += 1) {
      if (grid[y][x] !== FLOOR) {
        continue;
      }
      const distEntry = entry
        ? Math.abs(x - entry.x) + Math.abs(y - entry.y)
        : 9999;
      const distExit = exit
        ? Math.abs(x - exit.x) + Math.abs(y - exit.y)
        : 9999;
      if (distEntry < 6 || distExit < 6) {
        continue;
      }
      const point = { x, y };
      candidates.push(point);
      if (pathSet) {
        let near = false;
        for (let oy = -ITEM_NEAR_PATH_DISTANCE; oy <= ITEM_NEAR_PATH_DISTANCE; oy += 1) {
          for (let ox = -ITEM_NEAR_PATH_DISTANCE; ox <= ITEM_NEAR_PATH_DISTANCE; ox += 1) {
            if (pathSet.has(`${x + ox},${y + oy}`)) {
              near = true;
              break;
            }
          }
          if (near) break;
        }
        if (near) nearCandidates.push(point);
      }
    }
  }

  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (let i = nearCandidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [nearCandidates[i], nearCandidates[j]] = [nearCandidates[j], nearCandidates[i]];
  }

  const selected = [];
  const nearCount = Math.min(
    Math.floor(count * ITEM_NEAR_PATH_RATIO),
    nearCandidates.length
  );
  for (let i = 0; i < nearCount; i += 1) {
    selected.push(nearCandidates[i]);
  }
  for (const point of candidates) {
    if (selected.length >= count) break;
    if (selected.includes(point)) continue;
    selected.push(point);
  }

  return selected.slice(0, count).map((point) => ({
    x: point.x,
    y: point.y,
    collected: false,
  }));
}

function spawnBlueMasks(grid, entry, exit, count) {
  return spawnYellowMasks(grid, entry, exit, count);
}

function spawnLifeFlasks(grid, entry, exit, count) {
  return spawnYellowMasks(grid, entry, exit, count);
}

function spawnSkeletons(grid, entry, exit, count) {
  const rows = grid.length;
  const cols = grid[0].length;
  const candidates = [];
  const nearCandidates = [];

  for (let y = 1; y < rows - 1; y += 1) {
    for (let x = 1; x < cols - 1; x += 1) {
      if (grid[y][x] !== FLOOR) continue;
      const distEntry = entry
        ? Math.abs(x - entry.x) + Math.abs(y - entry.y)
        : 9999;
      const distExit = exit
        ? Math.abs(x - exit.x) + Math.abs(y - exit.y)
        : 9999;
      if (distEntry < SKELETON_ENTRY_MIN_DIST || distExit < SKELETON_EXIT_MIN_DIST) {
        continue;
      }
      const point = { x, y };
      candidates.push(point);
      if (distEntry <= SKELETON_NEAR_MAX_DIST) {
        nearCandidates.push(point);
      }
    }
  }

  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (let i = nearCandidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [nearCandidates[i], nearCandidates[j]] = [nearCandidates[j], nearCandidates[i]];
  }

  const selected = [];
  const nearCount = Math.min(SKELETON_NEAR_COUNT, count, nearCandidates.length);
  for (let i = 0; i < nearCount; i += 1) {
    selected.push(nearCandidates[i]);
  }
  for (const point of candidates) {
    if (selected.length >= count) break;
    if (selected.includes(point)) continue;
    selected.push(point);
  }

  return selected.map((point) => ({
    x: point.x + 0.5,
    y: point.y + 0.5,
    radius: SKELETON_RADIUS,
    speed: SKELETON_SPEED,
    health: SKELETON_MAX_HEALTH,
    dead: false,
    deathTime: 0,
    direction: "down",
    moving: false,
    animTime: 0,
    wanderTimer: Math.random() * SKELETON_WANDER_TIME,
    wanderDir: { x: 0, y: 0 },
    pathTimer: Math.random() * SKELETON_PATH_INTERVAL,
  }));
}

function isWall(grid, x, y) {
  if (!grid) return true;
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) {
    return true;
  }
  return grid[y][x] === WALL;
}

function isWater(grid, x, y) {
  if (!grid) return false;
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) {
    return false;
  }
  return grid[y][x] === WATER;
}

function isBlocked(grid, x, y) {
  if (!grid) return true;
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) {
    return true;
  }
  return grid[y][x] !== FLOOR;
}

function isGroundCell(value) {
  return value === FLOOR;
}

function highGridValueIsTree(grid, x, y) {
  if (!grid || !grid[y]) return false;
  return grid[y][x] === TREE;
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

function selectLakeTile(x, y, grid = currentMaze) {
  if (!grid || !isWater(grid, x, y)) {
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

  const n = isWater(grid, x, y - 1);
  const s = isWater(grid, x, y + 1);
  const w = isWater(grid, x - 1, y);
  const e = isWater(grid, x + 1, y);
  const nw = isWater(grid, x - 1, y - 1);
  const ne = isWater(grid, x + 1, y - 1);
  const sw = isWater(grid, x - 1, y + 1);
  const se = isWater(grid, x + 1, y + 1);

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

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function updateHealthUI() {
  if (!healthFill || !healthValue) return;
  const clamped = clamp(player.health, 0, PLAYER_MAX_HEALTH);
  const percent = Math.round((clamped / PLAYER_MAX_HEALTH) * 100);
  healthFill.style.width = `${percent}%`;
  healthValue.textContent = `${percent}%`;
}

function updateEventsUI() {
  if (!eventYellowMask) return;
  if (yellowMaskTimer > 0) {
    eventYellowMask.textContent = formatTime(yellowMaskTimer);
  } else {
    eventYellowMask.textContent = "Inactive";
  }
  if (eventBlueMask) {
    eventBlueMask.textContent =
      blueMaskTimer > 0 ? formatTime(blueMaskTimer) : "Inactive";
  }
  if (inventoryFlaskCount) {
    inventoryFlaskCount.textContent = String(lifeFlaskCount);
  }
}

function updateCamera() {
  if (!currentMaze) return;
  const worldWidth = currentMaze[0].length * TILE_SIZE;
  const worldHeight = currentMaze.length * TILE_SIZE;
  camera.x = player.x * TILE_SIZE - canvas.width / 2;
  camera.y = player.y * TILE_SIZE - canvas.height / 2;
  camera.x = clamp(camera.x, 0, Math.max(0, worldWidth - canvas.width));
  camera.y = clamp(camera.y, 0, Math.max(0, worldHeight - canvas.height));
  camera.x = Math.round(camera.x);
  camera.y = Math.round(camera.y);
}

function isPlayerAtExit() {
  if (!currentExit || !currentMaze) return false;
  const rows = currentMaze.length;
  const cols = currentMaze[0].length;
  const tileX = Math.floor(player.x);
  const tileY = Math.floor(player.y);
  if (tileX < 0 || tileX >= cols || tileY < 0 || tileY >= rows) return false;
  if (currentMaze[tileY][tileX] !== FLOOR) return false;

  const dx = Math.abs(tileX - Math.floor(currentExit.x));
  const dy = Math.abs(tileY - Math.floor(currentExit.y));

  switch (currentExit.side) {
    case "top":
      return tileY <= 1 && dx <= 1;
    case "bottom":
      return tileY >= rows - 2 && dx <= 1;
    case "left":
      return tileX <= 1 && dy <= 1;
    case "right":
      return tileX >= cols - 2 && dy <= 1;
    default:
      return false;
  }
}
function canMoveEntity(x, y, radius) {
  if (!currentMaze) return false;
  const minX = Math.floor(x - radius);
  const maxX = Math.floor(x + radius);
  const minY = Math.floor(y - radius);
  const maxY = Math.floor(y + radius);

  for (let ty = minY; ty <= maxY; ty += 1) {
    for (let tx = minX; tx <= maxX; tx += 1) {
      if (isBlocked(currentMaze, tx, ty)) {
        return false;
      }
    }
  }

  return true;
}

function moveEntity(entity, dx, dy, delta) {
  const step = entity.speed * delta;
  if (dx !== 0) {
    const nextX = entity.x + dx * step;
    if (canMoveEntity(nextX, entity.y, entity.radius)) {
      entity.x = nextX;
    }
  }
  if (dy !== 0) {
    const nextY = entity.y + dy * step;
    if (canMoveEntity(entity.x, nextY, entity.radius)) {
      entity.y = nextY;
    }
  }
}

function updatePlayer(delta) {
  let dx = 0;
  let dy = 0;

  if (keys.has("w") || keys.has("arrowup")) dy -= 1;
  if (keys.has("s") || keys.has("arrowdown")) dy += 1;
  if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
  if (keys.has("d") || keys.has("arrowright")) dx += 1;

  player.moving = dx !== 0 || dy !== 0;

  if (player.moving) {
    if (dy < 0) player.direction = "up";
    else if (dy > 0) player.direction = "down";
    else if (dx < 0) player.direction = "left";
    else if (dx > 0) player.direction = "right";
    player.animTime += delta;
  } else {
    player.animTime = 0;
  }

  if (dx !== 0 && dy !== 0) {
    moveEntity(player, dx, 0, delta);
    moveEntity(player, 0, dy, delta);
  } else {
    moveEntity(player, dx, dy, delta);
  }
}

function updateMaskTimer(delta) {
  if (yellowMaskTimer > 0) {
    yellowMaskTimer = Math.max(0, yellowMaskTimer - delta);
  }
  if (blueMaskTimer > 0) {
    blueMaskTimer = Math.max(0, blueMaskTimer - delta);
  }
}

function spawnKnife() {
  if (knifeCooldown > 0) return;
  const dir = lastArrowDir;
  if (dir.x === 0 && dir.y === 0) return;

  knives.push({
    x: player.x,
    y: player.y,
    dx: dir.x,
    dy: dir.y,
    traveled: 0,
  });
  knifeCooldown = KNIFE_COOLDOWN;
}

function updateKnives(delta) {
  if (knifeCooldown > 0) {
    knifeCooldown = Math.max(0, knifeCooldown - delta);
  }
  if (!knives.length) return;

  const speed = KNIFE_SPEED;
  for (const knife of knives) {
    const step = speed * delta;
    const nextX = knife.x + knife.dx * step;
    const nextY = knife.y + knife.dy * step;

    if (isBlocked(currentMaze, Math.floor(nextX), Math.floor(nextY))) {
      knife.traveled = KNIFE_RANGE_TILES + 1;
      continue;
    }

    knife.x = nextX;
    knife.y = nextY;
    knife.traveled += step;
  }

  if (skeletons.length) {
    const hitRadius = SKELETON_RADIUS + 0.12;
    const hitRadiusSq = hitRadius * hitRadius;
    for (const knife of knives) {
      if (knife.traveled > KNIFE_RANGE_TILES) continue;
      for (const skeleton of skeletons) {
        if (skeleton.dead) continue;
        const dx = skeleton.x - knife.x;
        const dy = skeleton.y - knife.y;
        if (dx * dx + dy * dy <= hitRadiusSq) {
          skeleton.health -= 1;
          if (skeleton.health <= 0) {
            skeleton.dead = true;
            skeleton.deathTime = 0;
            skeleton.moving = false;
          }
          knife.traveled = KNIFE_RANGE_TILES + 1;
          break;
        }
      }
    }
  }

  knives = knives.filter((knife) => knife.traveled <= KNIFE_RANGE_TILES);
}

function applySkeletonContact(delta) {
  if (!skeletons.length || player.health <= 0) return;
  contactCooldown = Math.max(0, contactCooldown - delta);
  if (contactCooldown > 0) return;

  const hitRadius = player.radius + SKELETON_RADIUS;
  const hitRadiusSq = hitRadius * hitRadius;

  for (const skeleton of skeletons) {
    if (skeleton.dead) continue;
    const dx = player.x - skeleton.x;
    const dy = player.y - skeleton.y;
    if (dx * dx + dy * dy <= hitRadiusSq) {
      player.health = Math.max(
        0,
        player.health - SKELETON_CONTACT_DPS * delta
      );
      contactCooldown = SKELETON_CONTACT_COOLDOWN;
      break;
    }
  }
}

function checkMaskPickup() {
  if (!maskItems.length) return;
  const pickupRadius = player.radius + MASK_ITEM_RADIUS;
  const pickupRadiusSq = pickupRadius * pickupRadius;

  for (const item of maskItems) {
    if (item.collected) continue;
    const cx = item.x + 0.5;
    const cy = item.y + 0.5;
    const dx = player.x - cx;
    const dy = player.y - cy;
    if (dx * dx + dy * dy <= pickupRadiusSq) {
      item.collected = true;
      yellowMaskTimer = MASK_DURATION;
    }
  }
}

function checkBlueMaskPickup() {
  if (!blueMaskItems.length) return;
  const pickupRadius = player.radius + MASK_ITEM_RADIUS;
  const pickupRadiusSq = pickupRadius * pickupRadius;

  for (const item of blueMaskItems) {
    if (item.collected) continue;
    const cx = item.x + 0.5;
    const cy = item.y + 0.5;
    const dx = player.x - cx;
    const dy = player.y - cy;
    if (dx * dx + dy * dy <= pickupRadiusSq) {
      item.collected = true;
      blueMaskTimer = BLUE_MASK_DURATION;
      guideRecalcTimer = 0;
    }
  }
}

function checkLifeFlaskPickup() {
  if (!lifeFlaskItems.length) return;
  const pickupRadius = player.radius + MASK_ITEM_RADIUS;
  const pickupRadiusSq = pickupRadius * pickupRadius;

  for (const item of lifeFlaskItems) {
    if (item.collected) continue;
    const cx = item.x + 0.5;
    const cy = item.y + 0.5;
    const dx = player.x - cx;
    const dy = player.y - cy;
    if (dx * dx + dy * dy <= pickupRadiusSq) {
      item.collected = true;
      lifeFlaskCount += 1;
      player.health = Math.min(
        PLAYER_MAX_HEALTH,
        player.health + PLAYER_MAX_HEALTH * LIFE_FLASK_HEAL_RATIO
      );
    }
  }
}

function applySpring(current, velocity, target, delta, stiffness, damping) {
  const accel = (target - current) * stiffness;
  const damp = Math.exp(-damping * delta);
  const nextVelocity = (velocity + accel * delta) * damp;
  const nextValue = current + nextVelocity * delta;
  return { value: nextValue, velocity: nextVelocity };
}

function updateFog(delta) {
  const targetRadius = yellowMaskTimer > 0 ? FOG_RADIUS_MASK : FOG_RADIUS_BASE;
  const targetDarkness =
    yellowMaskTimer > 0 ? FOG_DARKNESS_MASK : FOG_DARKNESS_BASE;

  const radiusSpring = applySpring(
    fogRadiusCurrent,
    fogRadiusVelocity,
    targetRadius,
    delta,
    FOG_SPRING_STIFFNESS,
    FOG_SPRING_DAMPING
  );
  fogRadiusCurrent = clamp(radiusSpring.value, 0, FOG_RADIUS_MASK * 1.2);
  fogRadiusVelocity = radiusSpring.velocity;

  const darknessSpring = applySpring(
    fogDarknessCurrent,
    fogDarknessVelocity,
    targetDarkness,
    delta,
    FOG_SPRING_STIFFNESS,
    FOG_SPRING_DAMPING
  );
  fogDarknessCurrent = clamp(darknessSpring.value, 0, 1);
  fogDarknessVelocity = darknessSpring.velocity;
}

function isWalkableCell(x, y, buffer) {
  if (isBlocked(currentMaze, x, y)) return false;
  if (buffer <= 0) return true;
  for (let oy = -buffer; oy <= buffer; oy += 1) {
    for (let ox = -buffer; ox <= buffer; ox += 1) {
      if (isBlocked(currentMaze, x + ox, y + oy)) return false;
    }
  }
  return true;
}

function hasLineOfSight(ax, ay, bx, by) {
  if (!currentMaze) return false;
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return true;
  const steps = Math.ceil(dist / SKELETON_LOS_STEP);
  const stepX = dx / steps;
  const stepY = dy / steps;

  let x = ax;
  let y = ay;
  for (let i = 0; i <= steps; i += 1) {
    if (isBlocked(currentMaze, Math.floor(x), Math.floor(y))) {
      return false;
    }
    x += stepX;
    y += stepY;
  }
  return true;
}

function findPathDirection(startX, startY, goalX, goalY, radius) {
  if (!currentMaze) return { x: 0, y: 0 };
  const rows = currentMaze.length;
  const cols = currentMaze[0].length;
  const sx = clamp(startX, 0, cols - 1);
  const sy = clamp(startY, 0, rows - 1);
  const gx = clamp(goalX, 0, cols - 1);
  const gy = clamp(goalY, 0, rows - 1);

  if (sx === gx && sy === gy) return { x: 0, y: 0 };

  const minX = clamp(sx - radius, 0, cols - 1);
  const maxX = clamp(sx + radius, 0, cols - 1);
  const minY = clamp(sy - radius, 0, rows - 1);
  const maxY = clamp(sy + radius, 0, rows - 1);

  const queue = [];
  const cameFrom = new Map();
  const key = (x, y) => `${x},${y}`;

  queue.push([sx, sy]);
  cameFrom.set(key(sx, sy), null);

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (queue.length) {
    const [cx, cy] = queue.shift();
    if (cx === gx && cy === gy) break;

    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;
      if (!isWalkableCell(nx, ny, SKELETON_WALL_BUFFER)) continue;
      const nk = key(nx, ny);
      if (cameFrom.has(nk)) continue;
      cameFrom.set(nk, [cx, cy]);
      queue.push([nx, ny]);
    }
  }

  const goalKey = key(gx, gy);
  if (!cameFrom.has(goalKey)) {
    return { x: 0, y: 0 };
  }

  let step = [gx, gy];
  let prev = cameFrom.get(goalKey);
  while (prev && !(prev[0] === sx && prev[1] === sy)) {
    step = prev;
    prev = cameFrom.get(key(prev[0], prev[1]));
  }

  const dirX = step[0] - sx;
  const dirY = step[1] - sy;
  return { x: Math.sign(dirX), y: Math.sign(dirY) };
}

function updateSkeletons(delta) {
  if (!skeletons.length) return;

  for (const skeleton of skeletons) {
    if (skeleton.dead) {
      skeleton.deathTime += delta;
      continue;
    }
    const toPlayerX = player.x - skeleton.x;
    const toPlayerY = player.y - skeleton.y;
    const distSq = toPlayerX * toPlayerX + toPlayerY * toPlayerY;
    const chaseRangeSq = SKELETON_CHASE_RANGE * SKELETON_CHASE_RANGE;

    let dx = 0;
    let dy = 0;

    if (distSq < chaseRangeSq && hasLineOfSight(skeleton.x, skeleton.y, player.x, player.y)) {
      skeleton.pathTimer -= delta;
      if (skeleton.pathTimer <= 0) {
        skeleton.pathTimer = SKELETON_PATH_INTERVAL;
        let dir = findPathDirection(
          Math.floor(skeleton.x),
          Math.floor(skeleton.y),
          Math.floor(player.x),
          Math.floor(player.y),
          SKELETON_PATH_RADIUS
        );
        if (dir.x === 0 && dir.y === 0) {
          if (Math.abs(toPlayerX) > Math.abs(toPlayerY)) {
            dir = { x: Math.sign(toPlayerX), y: 0 };
          } else {
            dir = { x: 0, y: Math.sign(toPlayerY) };
          }
        }
        skeleton.wanderDir = dir;
      }
      dx = skeleton.wanderDir.x;
      dy = skeleton.wanderDir.y;
    } else {
      skeleton.wanderTimer -= delta;
      if (skeleton.wanderTimer <= 0) {
        skeleton.wanderTimer = SKELETON_WANDER_TIME + Math.random();
        const dirIndex = Math.floor(Math.random() * 5);
        if (dirIndex === 0) skeleton.wanderDir = { x: 1, y: 0 };
        else if (dirIndex === 1) skeleton.wanderDir = { x: -1, y: 0 };
        else if (dirIndex === 2) skeleton.wanderDir = { x: 0, y: 1 };
        else if (dirIndex === 3) skeleton.wanderDir = { x: 0, y: -1 };
        else skeleton.wanderDir = { x: 0, y: 0 };
      }
      dx = skeleton.wanderDir.x;
      dy = skeleton.wanderDir.y;
    }

    skeleton.moving = dx !== 0 || dy !== 0;
    if (skeleton.moving) {
      if (Math.abs(dx) > Math.abs(dy)) {
        skeleton.direction = dx > 0 ? "right" : "left";
      } else if (dy !== 0) {
        skeleton.direction = dy > 0 ? "down" : "up";
      }
      skeleton.animTime += delta;
    } else {
      skeleton.animTime = 0;
    }

    if (dx !== 0 && dy !== 0) {
      moveEntity(skeleton, dx, 0, delta);
      moveEntity(skeleton, 0, dy, delta);
    } else {
      moveEntity(skeleton, dx, dy, delta);
    }
  }

  skeletons = skeletons.filter(
    (skeleton) =>
      !skeleton.dead ||
      skeleton.deathTime < SKELETON_DEATH_FRAMES / SKELETON_DEATH_FPS
  );
}

function getPlayerFrame() {
  const activeSprites =
    blueMaskTimer > 0
      ? playerBlueSprites
      : yellowMaskTimer > 0
        ? playerYellowSprites
        : playerSprites;
  const sprite = activeSprites[player.direction] || activeSprites.down;
  const frame = player.moving
    ? sprite.moveFrames[Math.floor(player.animTime * 6) % sprite.moveFrames.length]
    : sprite.idleFrame;
  return { sprite, frame };
}

function getSkeletonFrame(skeleton) {
  const sprite = skeletonSprites[skeleton.direction] || skeletonSprites.down;
  const frame = skeleton.moving
    ? sprite.moveFrames[Math.floor(skeleton.animTime * 6) % sprite.moveFrames.length]
    : 0;
  return { sprite, frame };
}

function renderPlayer() {
  const { sprite, frame } = getPlayerFrame();
  if (!sprite || !sprite.image.complete) {
    sceneCtx.fillStyle = "#d5cdc0";
    sceneCtx.beginPath();
    sceneCtx.arc(
      player.x * TILE_SIZE - camera.x,
      player.y * TILE_SIZE - camera.y,
      player.radius * TILE_SIZE,
      0,
      Math.PI * 2
    );
    sceneCtx.fill();
    return;
  }

  const dx = player.x * TILE_SIZE - camera.x - TILE_SIZE / 2;
  const dy = player.y * TILE_SIZE - camera.y - TILE_SIZE / 2;

  sceneCtx.save();
  if (sprite.flip) {
    sceneCtx.scale(-1, 1);
    sceneCtx.drawImage(
      sprite.image,
      frame * SOURCE_TILE_SIZE,
      0,
      SOURCE_TILE_SIZE,
      SOURCE_TILE_SIZE,
      -(dx + TILE_SIZE),
      dy,
      TILE_SIZE,
      TILE_SIZE
    );
  } else {
    sceneCtx.drawImage(
      sprite.image,
      frame * SOURCE_TILE_SIZE,
      0,
      SOURCE_TILE_SIZE,
      SOURCE_TILE_SIZE,
      dx,
      dy,
      TILE_SIZE,
      TILE_SIZE
    );
  }
  sceneCtx.restore();
}

function renderSkeletons(startCol, endCol, startRow, endRow) {
  for (const skeleton of skeletons) {
    const sx = Math.floor(skeleton.x);
    const sy = Math.floor(skeleton.y);
    if (sx < startCol - 2 || sx > endCol + 2) continue;
    if (sy < startRow - 2 || sy > endRow + 2) continue;

    const dx = skeleton.x * TILE_SIZE - camera.x - TILE_SIZE / 2;
    const dy = skeleton.y * TILE_SIZE - camera.y - TILE_SIZE / 2;

    if (skeleton.dead) {
      if (!skeletonDeathImage.image.complete) continue;
      const frame = Math.min(
        SKELETON_DEATH_FRAMES - 1,
        Math.floor(skeleton.deathTime * SKELETON_DEATH_FPS)
      );
      sceneCtx.drawImage(
        skeletonDeathImage.image,
        frame * SOURCE_TILE_SIZE,
        0,
        SOURCE_TILE_SIZE,
        SOURCE_TILE_SIZE,
        dx,
        dy,
        TILE_SIZE,
        TILE_SIZE
      );
      continue;
    }

    const { sprite, frame } = getSkeletonFrame(skeleton);
    if (!sprite || !sprite.image.complete) {
      sceneCtx.fillStyle = "#bdb3a3";
      sceneCtx.beginPath();
      sceneCtx.arc(
        skeleton.x * TILE_SIZE - camera.x,
        skeleton.y * TILE_SIZE - camera.y,
        skeleton.radius * TILE_SIZE,
        0,
        Math.PI * 2
      );
      sceneCtx.fill();
      continue;
    }

    sceneCtx.save();
    if (sprite.flip) {
      sceneCtx.scale(-1, 1);
      sceneCtx.drawImage(
        sprite.image,
        frame * SOURCE_TILE_SIZE,
        0,
        SOURCE_TILE_SIZE,
        SOURCE_TILE_SIZE,
        -(dx + TILE_SIZE),
        dy,
        TILE_SIZE,
        TILE_SIZE
      );
    } else {
      sceneCtx.drawImage(
        sprite.image,
        frame * SOURCE_TILE_SIZE,
        0,
        SOURCE_TILE_SIZE,
        SOURCE_TILE_SIZE,
        dx,
        dy,
        TILE_SIZE,
        TILE_SIZE
      );
    }
    sceneCtx.restore();
  }
}

function renderMaskItems(startCol, endCol, startRow, endRow) {
  if (!maskItems.length) return;

  for (const item of maskItems) {
    if (item.collected) continue;
    if (item.x < startCol - 1 || item.x > endCol + 1) continue;
    if (item.y < startRow - 1 || item.y > endRow + 1) continue;
    if (!yellowMaskItem.image.complete) continue;

    const cx = (item.x + 0.5) * TILE_SIZE - camera.x;
    const cy = (item.y + 0.5) * TILE_SIZE - camera.y;

    const imgW = yellowMaskItem.image.width || SOURCE_TILE_SIZE;
    const imgH = yellowMaskItem.image.height || SOURCE_TILE_SIZE;
    const maxSize = TILE_SIZE * MASK_ITEM_DRAW_SCALE;
    const scale = maxSize / Math.max(imgW, imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;

    sceneCtx.drawImage(
      yellowMaskItem.image,
      0,
      0,
      imgW,
      imgH,
      cx - drawW / 2,
      cy - drawH / 2,
      drawW,
      drawH
    );
  }
}

function renderTrees(startCol, endCol, startRow, endRow) {
  if (!treeSprite.image.complete) return;
  for (let y = startRow; y <= endRow; y += 1) {
    for (let x = startCol; x <= endCol; x += 1) {
      if (currentMaze[y][x] !== TREE) continue;
      const dx = x * TILE_SIZE - camera.x;
      const dy = y * TILE_SIZE - camera.y;
      sceneCtx.drawImage(
        treeSprite.image,
        0,
        0,
        SOURCE_TILE_SIZE,
        SOURCE_TILE_SIZE,
        dx,
        dy,
        TILE_SIZE,
        TILE_SIZE
      );
    }
  }
}

function renderBlueMaskItems(startCol, endCol, startRow, endRow) {
  if (!blueMaskItems.length || !blueMaskItem.image.complete) return;

  for (const item of blueMaskItems) {
    if (item.collected) continue;
    if (item.x < startCol - 1 || item.x > endCol + 1) continue;
    if (item.y < startRow - 1 || item.y > endRow + 1) continue;

    const cx = (item.x + 0.5) * TILE_SIZE - camera.x;
    const cy = (item.y + 0.5) * TILE_SIZE - camera.y;

    const imgW = blueMaskItem.image.width || SOURCE_TILE_SIZE;
    const imgH = blueMaskItem.image.height || SOURCE_TILE_SIZE;
    const maxSize = TILE_SIZE * MASK_ITEM_DRAW_SCALE;
    const scale = maxSize / Math.max(imgW, imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;

    sceneCtx.drawImage(
      blueMaskItem.image,
      0,
      0,
      imgW,
      imgH,
      cx - drawW / 2,
      cy - drawH / 2,
      drawW,
      drawH
    );
  }
}

function renderLifeFlaskItems(startCol, endCol, startRow, endRow) {
  if (!lifeFlaskItems.length || !lifeFlaskItem.image.complete) return;

  for (const item of lifeFlaskItems) {
    if (item.collected) continue;
    if (item.x < startCol - 1 || item.x > endCol + 1) continue;
    if (item.y < startRow - 1 || item.y > endRow + 1) continue;

    const cx = (item.x + 0.5) * TILE_SIZE - camera.x;
    const cy = (item.y + 0.5) * TILE_SIZE - camera.y;

    const imgW = lifeFlaskItem.image.width || SOURCE_TILE_SIZE;
    const imgH = lifeFlaskItem.image.height || SOURCE_TILE_SIZE;
    const maxSize = TILE_SIZE * MASK_ITEM_DRAW_SCALE;
    const scale = maxSize / Math.max(imgW, imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;

    sceneCtx.drawImage(
      lifeFlaskItem.image,
      0,
      0,
      imgW,
      imgH,
      cx - drawW / 2,
      cy - drawH / 2,
      drawW,
      drawH
    );
  }
}

function renderKnives(startCol, endCol, startRow, endRow) {
  if (!knives.length || !knifeItem.image.complete) return;

  for (const knife of knives) {
    const kx = Math.floor(knife.x);
    const ky = Math.floor(knife.y);
    if (kx < startCol - 2 || kx > endCol + 2) continue;
    if (ky < startRow - 2 || ky > endRow + 2) continue;

    const screenX = knife.x * TILE_SIZE - camera.x;
    const screenY = knife.y * TILE_SIZE - camera.y;

    let rotation = 0;
    if (knife.dx === 1) rotation = Math.PI / 2;
    else if (knife.dx === -1) rotation = -Math.PI / 2;
    else if (knife.dy === 1) rotation = Math.PI;
    else rotation = 0;

    sceneCtx.save();
    sceneCtx.translate(screenX, screenY);
    sceneCtx.rotate(rotation);
    sceneCtx.drawImage(
      knifeItem.image,
      0,
      0,
      SOURCE_TILE_SIZE,
      SOURCE_TILE_SIZE,
      -TILE_SIZE / 2,
      -TILE_SIZE / 2,
      TILE_SIZE,
      TILE_SIZE
    );
    sceneCtx.restore();
  }
}

function updateGuidePath(delta) {
  if (blueMaskTimer <= 0 || !currentMaze || !currentExit) {
    guidePath = null;
    guidePathMap = null;
    return;
  }

  guideRecalcTimer = Math.max(0, guideRecalcTimer - delta);
  const playerCellX = Math.floor(player.x);
  const playerCellY = Math.floor(player.y);
  if (
    guideRecalcTimer > 0 &&
    playerCellX === guideLastCell.x &&
    playerCellY === guideLastCell.y
  ) {
    return;
  }

  guideLastCell = { x: playerCellX, y: playerCellY };
  guideRecalcTimer = 0.5;

  const path = findPathOnGrid(
    playerCellX,
    playerCellY,
    Math.floor(currentExit.x),
    Math.floor(currentExit.y)
  );
  guidePath = path;
  guidePathMap = new Map();
  if (path) {
    path.forEach((node, index) => {
      guidePathMap.set(`${node.x},${node.y}`, index);
    });
  }
}

function updateSkeletonProgressive(delta) {
  if (!currentExit || !currentMaze) return;
  skeletonSpawnTimer = Math.max(0, skeletonSpawnTimer - delta);
  if (skeletonSpawnTimer > 0) return;

  const dx = Math.abs(player.x - currentExit.x);
  const dy = Math.abs(player.y - currentExit.y);
  const dist = dx + dy;
  const progress = clamp(1 - dist / entryExitDist, 0, 1);
  const target = Math.round(
    SKELETON_PROGRESSIVE_START +
      (SKELETON_PROGRESSIVE_MAX - SKELETON_PROGRESSIVE_START) * progress
  );

  if (skeletons.length < target) {
    const toSpawn = Math.min(SKELETON_PROGRESSIVE_BATCH, target - skeletons.length);
    const spawned = spawnSkeletonsNearPlayer(toSpawn);
    skeletons.push(...spawned);
  } else if (skeletons.length < SKELETON_PROGRESSIVE_MAX) {
    const rampedChance = SKELETON_AMBIENT_CHANCE * (0.35 + 0.65 * progress);
    if (Math.random() < rampedChance) {
      const count = progress > 0.7 ? 2 : 1;
      const spawned = spawnSkeletonsNearPlayer(count);
      skeletons.push(...spawned);
    } else {
      skeletonSpawnTimer = SKELETON_PROGRESSIVE_INTERVAL;
      return;
    }
  } else {
    skeletonSpawnTimer = SKELETON_PROGRESSIVE_INTERVAL;
    return;
  }
  skeletonSpawnTimer = SKELETON_PROGRESSIVE_INTERVAL;
}

function spawnSkeletonsNearPlayer(count) {
  const rows = currentMaze.length;
  const cols = currentMaze[0].length;
  const candidates = [];

  for (let y = 1; y < rows - 1; y += 1) {
    for (let x = 1; x < cols - 1; x += 1) {
      if (currentMaze[y][x] !== FLOOR) continue;
      const distPlayer = Math.abs(x - player.x) + Math.abs(y - player.y);
      if (distPlayer < SKELETON_SPAWN_MIN_DIST) continue;
      if (distPlayer > SKELETON_SPAWN_MAX_DIST) continue;
      candidates.push({ x, y });
    }
  }

  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  return candidates.slice(0, count).map((point) => ({
    x: point.x + 0.5,
    y: point.y + 0.5,
    radius: SKELETON_RADIUS,
    speed: SKELETON_SPEED,
    health: SKELETON_MAX_HEALTH,
    dead: false,
    deathTime: 0,
    direction: "down",
    moving: false,
    animTime: 0,
    wanderTimer: Math.random() * SKELETON_WANDER_TIME,
    wanderDir: { x: 0, y: 0 },
    pathTimer: Math.random() * SKELETON_PATH_INTERVAL,
  }));
}

function findPathOnGrid(startX, startY, goalX, goalY) {
  const rows = currentMaze.length;
  const cols = currentMaze[0].length;
  const sx = clamp(startX, 0, cols - 1);
  const sy = clamp(startY, 0, rows - 1);
  const gx = clamp(goalX, 0, cols - 1);
  const gy = clamp(goalY, 0, rows - 1);
  if (isBlocked(currentMaze, sx, sy) || isBlocked(currentMaze, gx, gy)) {
    return null;
  }

  const queue = [[sx, sy]];
  const cameFrom = new Map();
  const key = (x, y) => `${x},${y}`;
  cameFrom.set(key(sx, sy), null);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (queue.length) {
    const [cx, cy] = queue.shift();
    if (cx === gx && cy === gy) break;
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
      if (isBlocked(currentMaze, nx, ny)) continue;
      const nk = key(nx, ny);
      if (cameFrom.has(nk)) continue;
      cameFrom.set(nk, [cx, cy]);
      queue.push([nx, ny]);
    }
  }

  const goalKey = key(gx, gy);
  if (!cameFrom.has(goalKey)) return null;

  const path = [];
  let current = [gx, gy];
  while (current) {
    path.push({ x: current[0], y: current[1] });
    current = cameFrom.get(key(current[0], current[1]));
  }
  path.reverse();
  return path;
}

function renderGuidePath(startCol, endCol, startRow, endRow) {
  if (!guidePath || !roadGuideItem.image.complete) return;

  const guideSize = TILE_SIZE / 2;
  const drawGuide = (gx, gy, type, rotation) => {
    const centerX = gx * TILE_SIZE - camera.x;
    const centerY = gy * TILE_SIZE - camera.y;
    sceneCtx.save();
    sceneCtx.translate(Math.round(centerX), Math.round(centerY));
    sceneCtx.rotate(rotation);
    sceneCtx.drawImage(
      roadGuideItem.image,
      type.x,
      type.y,
      type.w,
      type.h,
      -guideSize / 2,
      -guideSize / 2,
      guideSize,
      guideSize
    );
    sceneCtx.restore();
  };

  const inView = (gx, gy) => {
    const tileX = Math.floor(gx);
    const tileY = Math.floor(gy);
    return tileX >= startCol - 2 && tileX <= endCol + 2 && tileY >= startRow - 2 && tileY <= endRow + 2;
  };

  const path = guidePath;
  if (path.length < 2) return;

  // Draw straight segments between nodes (midpoints).
  for (let i = 0; i < path.length - 1; i += 1) {
    const a = path[i];
    const b = path[i + 1];
    const midX = (a.x + b.x) / 2 + 0.5;
    const midY = (a.y + b.y) / 2 + 0.5;
    if (!inView(midX, midY)) continue;
    const horizontal = a.y === b.y;
    drawGuide(midX, midY, ROAD_GUIDE_TILES.straight, horizontal ? 0 : Math.PI / 2);
  }

  // Draw corners and ends on nodes.
  for (let i = 0; i < path.length; i += 1) {
    const node = path[i];
    const cx = node.x + 0.5;
    const cy = node.y + 0.5;
    if (!inView(cx, cy)) continue;

    const prev = path[i - 1];
    const next = path[i + 1];
    let type = ROAD_GUIDE_TILES.end;
    let rotation = 0;

    const connUp = (prev && prev.x === node.x && prev.y === node.y - 1) ||
      (next && next.x === node.x && next.y === node.y - 1);
    const connDown = (prev && prev.x === node.x && prev.y === node.y + 1) ||
      (next && next.x === node.x && next.y === node.y + 1);
    const connLeft = (prev && prev.x === node.x - 1 && prev.y === node.y) ||
      (next && next.x === node.x - 1 && next.y === node.y);
    const connRight = (prev && prev.x === node.x + 1 && prev.y === node.y) ||
      (next && next.x === node.x + 1 && next.y === node.y);

    const connections = [connUp, connRight, connDown, connLeft].filter(Boolean).length;

    if (connections >= 2) {
      if ((connLeft && connRight) || (connUp && connDown)) {
        type = ROAD_GUIDE_TILES.straight;
        rotation = connLeft && connRight ? 0 : Math.PI / 2;
      } else {
        type = ROAD_GUIDE_TILES.corner;
        // Base corner connects left + down (jointures left & bottom).
        if (connLeft && connDown) rotation = GUIDE_CORNER_ROTATION.LD;
        else if (connRight && connDown) rotation = GUIDE_CORNER_ROTATION.RD;
        else if (connRight && connUp) rotation = GUIDE_CORNER_ROTATION.RU;
        else if (connLeft && connUp) rotation = GUIDE_CORNER_ROTATION.LU;
      }
    } else if (connections === 1) {
      type = ROAD_GUIDE_TILES.end;
      // Base end connects to the right.
      if (connRight) rotation = 0;
      else if (connDown) rotation = Math.PI / 2;
      else if (connLeft) rotation = Math.PI;
      else if (connUp) rotation = -Math.PI / 2;
    }

    drawGuide(cx, cy, type, rotation);
  }
}
function renderMaze(grid) {
  sceneCtx.clearRect(0, 0, canvas.width, canvas.height);
  sceneCtx.fillStyle = "#0b0a08";
  sceneCtx.fillRect(0, 0, canvas.width, canvas.height);

  const cols = grid[0].length;
  const rows = grid.length;
  const startCol = clamp(Math.floor(camera.x / TILE_SIZE), 0, cols - 1);
  const endCol = clamp(
    Math.ceil((camera.x + canvas.width) / TILE_SIZE),
    0,
    cols - 1
  );
  const startRow = clamp(Math.floor(camera.y / TILE_SIZE), 0, rows - 1);
  const endRow = clamp(
    Math.ceil((camera.y + canvas.height) / TILE_SIZE),
    0,
    rows - 1
  );

  for (let y = startRow; y <= endRow; y += 1) {
    for (let x = startCol; x <= endCol; x += 1) {
      if (!isGroundCell(grid[y][x])) {
        continue;
      }
      const variant =
        groundVariantMap && groundVariantMap[y]
          ? groundVariantMap[y][x] ?? 0
          : 0;
      const source = GROUND_TILE_SOURCES[variant] || GROUND_TILE_SOURCES[0];
      const dx = x * TILE_SIZE - camera.x;
      const dy = y * TILE_SIZE - camera.y;
      const useForest =
        (forestMask && forestMask[y] && forestMask[y][x]) ||
        highGridValueIsTree(currentMaze, x, y);
      const groundImage = useForest ? forestGroundTilesImage : groundTilesImage;
      if (groundImage.complete) {
        sceneCtx.drawImage(
          groundImage,
          source.x,
          source.y,
          SOURCE_TILE_SIZE,
          SOURCE_TILE_SIZE,
          dx,
          dy,
          TILE_SIZE,
          TILE_SIZE
        );
      } else {
        sceneCtx.fillStyle = "#141210";
        sceneCtx.fillRect(dx, dy, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  for (let y = startRow; y <= endRow; y += 1) {
    for (let x = startCol; x <= endCol; x += 1) {
      if (grid[y][x] !== WATER) {
        continue;
      }
      const tileIndex = selectLakeTile(x, y, grid);
      const source = LAKE_TILE_SOURCES[tileIndex];
      if (!source || !lakeTilesImage.complete) {
        continue;
      }
      const dx = x * TILE_SIZE - camera.x;
      const dy = y * TILE_SIZE - camera.y;
      sceneCtx.drawImage(
        lakeTilesImage,
        source.x,
        source.y,
        SOURCE_TILE_SIZE,
        SOURCE_TILE_SIZE,
        dx,
        dy,
        TILE_SIZE,
        TILE_SIZE
      );
    }
  }

  for (let y = startRow; y <= endRow; y += 1) {
    for (let x = startCol; x <= endCol; x += 1) {
      if (grid[y][x] !== WALL) {
        continue;
      }
      const tileIndex = selectWallTile(x, y, grid);
      const source = WALL_TILE_SOURCES[tileIndex];
      if (!source || !wallTilesImage.complete) {
        continue;
      }
      const dx = x * TILE_SIZE - camera.x;
      const dy = y * TILE_SIZE - camera.y;
      sceneCtx.drawImage(
        wallTilesImage,
        source.x,
        source.y,
        SOURCE_TILE_SIZE,
        SOURCE_TILE_SIZE,
        dx,
        dy,
        TILE_SIZE,
        TILE_SIZE
      );
    }
  }

  renderMaskItems(startCol, endCol, startRow, endRow);
  renderBlueMaskItems(startCol, endCol, startRow, endRow);
  renderLifeFlaskItems(startCol, endCol, startRow, endRow);
  renderGuidePath(startCol, endCol, startRow, endRow);
  renderKnives(startCol, endCol, startRow, endRow);
  renderTrees(startCol, endCol, startRow, endRow);
  renderSkeletons(startCol, endCol, startRow, endRow);
  renderPlayer();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.filter = `blur(${FOG_BLUR_PX}px)`;
  ctx.drawImage(sceneCanvas, 0, 0);
  ctx.restore();

  const playerScreenX = player.x * TILE_SIZE - camera.x;
  const playerScreenY = player.y * TILE_SIZE - camera.y;

  ctx.save();
  ctx.beginPath();
  const fogRadius = fogRadiusCurrent;
  const fogDarkness = fogDarknessCurrent;

  ctx.arc(playerScreenX, playerScreenY, fogRadius, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(sceneCanvas, 0, 0);
  ctx.restore();

  const gradient = ctx.createRadialGradient(
    playerScreenX,
    playerScreenY,
    Math.max(0, fogRadius - FOG_FALLOFF_PX),
    playerScreenX,
    playerScreenY,
    fogRadius
  );
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(1, `rgba(0, 0, 0, ${fogDarkness})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function renderFullMapToCanvas(grid) {
  const cols = grid[0].length;
  const rows = grid.length;
  const mapCanvas = document.createElement("canvas");
  mapCanvas.width = cols * TILE_SIZE;
  mapCanvas.height = rows * TILE_SIZE;
  const mapCtx = mapCanvas.getContext("2d");
  mapCtx.imageSmoothingEnabled = false;

  mapCtx.fillStyle = "#0b0a08";
  mapCtx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (!isGroundCell(grid[y][x])) continue;
      const variant =
        groundVariantMap && groundVariantMap[y]
          ? groundVariantMap[y][x] ?? 0
          : 0;
      const source = GROUND_TILE_SOURCES[variant] || GROUND_TILE_SOURCES[0];
      const useForest =
        (forestMask && forestMask[y] && forestMask[y][x]) ||
        highGridValueIsTree(currentMaze, x, y);
      const groundImage = useForest ? forestGroundTilesImage : groundTilesImage;
      if (groundImage.complete) {
        mapCtx.drawImage(
          groundImage,
          source.x,
          source.y,
          SOURCE_TILE_SIZE,
          SOURCE_TILE_SIZE,
          x * TILE_SIZE,
          y * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE
        );
      } else {
        mapCtx.fillStyle = "#141210";
        mapCtx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  if (lakeTilesImage.complete) {
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (grid[y][x] !== WATER) continue;
        const tileIndex = selectLakeTile(x, y, grid);
        const source = LAKE_TILE_SOURCES[tileIndex];
        if (!source) continue;
        mapCtx.drawImage(
          lakeTilesImage,
          source.x,
          source.y,
          SOURCE_TILE_SIZE,
          SOURCE_TILE_SIZE,
          x * TILE_SIZE,
          y * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE
        );
      }
    }
  }

  if (wallTilesImage.complete) {
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (grid[y][x] !== WALL) continue;
        const tileIndex = selectWallTile(x, y, grid);
        const source = WALL_TILE_SOURCES[tileIndex];
        if (!source) continue;
        mapCtx.drawImage(
          wallTilesImage,
          source.x,
          source.y,
          SOURCE_TILE_SIZE,
          SOURCE_TILE_SIZE,
          x * TILE_SIZE,
          y * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE
        );
      }
    }
  }

  const drawItemSprites = (items, image) => {
    if (!items || !items.length || !image?.complete) return;
    for (const item of items) {
      if (item.collected) continue;
      const cx = (item.x + 0.5) * TILE_SIZE;
      const cy = (item.y + 0.5) * TILE_SIZE;
      const imgW = image.width || SOURCE_TILE_SIZE;
      const imgH = image.height || SOURCE_TILE_SIZE;
      const maxSize = TILE_SIZE * MASK_ITEM_DRAW_SCALE;
      const scale = maxSize / Math.max(imgW, imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      mapCtx.drawImage(
        image,
        0,
        0,
        imgW,
        imgH,
        cx - drawW / 2,
        cy - drawH / 2,
        drawW,
        drawH
      );
    }
  };

  drawItemSprites(maskItems, yellowMaskItem.image);
  drawItemSprites(blueMaskItems, blueMaskItem.image);
  drawItemSprites(lifeFlaskItems, lifeFlaskItem.image);

  if (guidePath && roadGuideItem.image.complete) {
    const guideSize = TILE_SIZE / 2;
    const drawGuide = (gx, gy, type, rotation) => {
      const centerX = gx * TILE_SIZE;
      const centerY = gy * TILE_SIZE;
      mapCtx.save();
      mapCtx.translate(Math.round(centerX), Math.round(centerY));
      mapCtx.rotate(rotation);
      mapCtx.drawImage(
        roadGuideItem.image,
        type.x,
        type.y,
        type.w,
        type.h,
        -guideSize / 2,
        -guideSize / 2,
        guideSize,
        guideSize
      );
      mapCtx.restore();
    };

    if (guidePath.length >= 2) {
      for (let i = 0; i < guidePath.length - 1; i += 1) {
        const a = guidePath[i];
        const b = guidePath[i + 1];
        const midX = (a.x + b.x) / 2 + 0.5;
        const midY = (a.y + b.y) / 2 + 0.5;
        const horizontal = a.y === b.y;
        drawGuide(
          midX,
          midY,
          ROAD_GUIDE_TILES.straight,
          horizontal ? 0 : Math.PI / 2
        );
      }

      for (let i = 0; i < guidePath.length; i += 1) {
        const node = guidePath[i];
        const cx = node.x + 0.5;
        const cy = node.y + 0.5;
        const prev = guidePath[i - 1];
        const next = guidePath[i + 1];
        let type = ROAD_GUIDE_TILES.end;
        let rotation = 0;

        const connUp =
          (prev && prev.x === node.x && prev.y === node.y - 1) ||
          (next && next.x === node.x && next.y === node.y - 1);
        const connDown =
          (prev && prev.x === node.x && prev.y === node.y + 1) ||
          (next && next.x === node.x && next.y === node.y + 1);
        const connLeft =
          (prev && prev.x === node.x - 1 && prev.y === node.y) ||
          (next && next.x === node.x - 1 && next.y === node.y);
        const connRight =
          (prev && prev.x === node.x + 1 && prev.y === node.y) ||
          (next && next.x === node.x + 1 && next.y === node.y);

        const connections = [connUp, connRight, connDown, connLeft].filter(Boolean).length;

        if (connections >= 2) {
          if ((connLeft && connRight) || (connUp && connDown)) {
            type = ROAD_GUIDE_TILES.straight;
            rotation = connLeft && connRight ? 0 : Math.PI / 2;
          } else {
            type = ROAD_GUIDE_TILES.corner;
            if (connLeft && connDown) rotation = GUIDE_CORNER_ROTATION.LD;
            else if (connRight && connDown) rotation = GUIDE_CORNER_ROTATION.RD;
            else if (connRight && connUp) rotation = GUIDE_CORNER_ROTATION.RU;
            else if (connLeft && connUp) rotation = GUIDE_CORNER_ROTATION.LU;
          }
        } else if (connections === 1) {
          type = ROAD_GUIDE_TILES.end;
          if (connRight) rotation = 0;
          else if (connDown) rotation = Math.PI / 2;
          else if (connLeft) rotation = Math.PI;
          else if (connUp) rotation = -Math.PI / 2;
        }

        drawGuide(cx, cy, type, rotation);
      }
    }
  }

  if (knifeItem.image.complete) {
    for (const knife of knives) {
      const screenX = knife.x * TILE_SIZE;
      const screenY = knife.y * TILE_SIZE;
      let rotation = 0;
      if (knife.dx === 1) rotation = Math.PI / 2;
      else if (knife.dx === -1) rotation = -Math.PI / 2;
      else if (knife.dy === 1) rotation = Math.PI;
      else rotation = 0;

      mapCtx.save();
      mapCtx.translate(screenX, screenY);
      mapCtx.rotate(rotation);
      mapCtx.drawImage(
        knifeItem.image,
        0,
        0,
        SOURCE_TILE_SIZE,
        SOURCE_TILE_SIZE,
        -TILE_SIZE / 2,
        -TILE_SIZE / 2,
        TILE_SIZE,
        TILE_SIZE
      );
      mapCtx.restore();
    }
  }

  if (treeSprite.image.complete) {
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (grid[y][x] !== TREE) continue;
        mapCtx.drawImage(
          treeSprite.image,
          0,
          0,
          SOURCE_TILE_SIZE,
          SOURCE_TILE_SIZE,
          x * TILE_SIZE,
          y * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE
        );
      }
    }
  }

  for (const skeleton of skeletons) {
    const dx = skeleton.x * TILE_SIZE - TILE_SIZE / 2;
    const dy = skeleton.y * TILE_SIZE - TILE_SIZE / 2;
    if (skeleton.dead) {
      if (!skeletonDeathImage.image.complete) continue;
      const frame = Math.min(
        SKELETON_DEATH_FRAMES - 1,
        Math.floor(skeleton.deathTime * SKELETON_DEATH_FPS)
      );
      mapCtx.drawImage(
        skeletonDeathImage.image,
        frame * SOURCE_TILE_SIZE,
        0,
        SOURCE_TILE_SIZE,
        SOURCE_TILE_SIZE,
        dx,
        dy,
        TILE_SIZE,
        TILE_SIZE
      );
      continue;
    }

    const { sprite, frame } = getSkeletonFrame(skeleton);
    if (!sprite || !sprite.image.complete) {
      mapCtx.fillStyle = "#bdb3a3";
      mapCtx.beginPath();
      mapCtx.arc(
        skeleton.x * TILE_SIZE,
        skeleton.y * TILE_SIZE,
        skeleton.radius * TILE_SIZE,
        0,
        Math.PI * 2
      );
      mapCtx.fill();
      continue;
    }

    mapCtx.save();
    if (sprite.flip) {
      mapCtx.scale(-1, 1);
      mapCtx.drawImage(
        sprite.image,
        frame * SOURCE_TILE_SIZE,
        0,
        SOURCE_TILE_SIZE,
        SOURCE_TILE_SIZE,
        -(dx + TILE_SIZE),
        dy,
        TILE_SIZE,
        TILE_SIZE
      );
    } else {
      mapCtx.drawImage(
        sprite.image,
        frame * SOURCE_TILE_SIZE,
        0,
        SOURCE_TILE_SIZE,
        SOURCE_TILE_SIZE,
        dx,
        dy,
        TILE_SIZE,
        TILE_SIZE
      );
    }
    mapCtx.restore();
  }

  const { sprite, frame } = getPlayerFrame();
  if (!sprite || !sprite.image.complete) {
    mapCtx.fillStyle = "#d5cdc0";
    mapCtx.beginPath();
    mapCtx.arc(
      player.x * TILE_SIZE,
      player.y * TILE_SIZE,
      player.radius * TILE_SIZE,
      0,
      Math.PI * 2
    );
    mapCtx.fill();
  } else {
    const dx = player.x * TILE_SIZE - TILE_SIZE / 2;
    const dy = player.y * TILE_SIZE - TILE_SIZE / 2;
    mapCtx.save();
    if (sprite.flip) {
      mapCtx.scale(-1, 1);
      mapCtx.drawImage(
        sprite.image,
        frame * SOURCE_TILE_SIZE,
        0,
        SOURCE_TILE_SIZE,
        SOURCE_TILE_SIZE,
        -(dx + TILE_SIZE),
        dy,
        TILE_SIZE,
        TILE_SIZE
      );
    } else {
      mapCtx.drawImage(
        sprite.image,
        frame * SOURCE_TILE_SIZE,
        0,
        SOURCE_TILE_SIZE,
        SOURCE_TILE_SIZE,
        dx,
        dy,
        TILE_SIZE,
        TILE_SIZE
      );
    }
    mapCtx.restore();
  }

  return mapCanvas;
}

async function exportMapPng() {
  if (!currentMaze) return;
  await assetsReady;
  const mapCanvas = renderFullMapToCanvas(currentMaze);
  const link = document.createElement("a");
  link.download = `masks_of_shadow_map_${Date.now()}.png`;
  link.href = mapCanvas.toDataURL("image/png");
  link.click();
}

function gameLoop(timestamp) {
  const delta = Math.min(0.05, (timestamp - lastFrameTime) / 1000 || 0);
  lastFrameTime = timestamp;
  if (gameOver) {
    renderMaze(currentMaze);
    animationId = window.requestAnimationFrame(gameLoop);
    return;
  }
  if (paused) {
    renderMaze(currentMaze);
    animationId = window.requestAnimationFrame(gameLoop);
    return;
  }
  updatePlayer(delta);
  updateSkeletons(delta);
  updateSkeletonProgressive(delta);
  applySkeletonContact(delta);
  updateKnives(delta);
  checkMaskPickup();
  checkBlueMaskPickup();
  checkLifeFlaskPickup();
  updateMaskTimer(delta);
  updateGuidePath(delta);
  updateFog(delta);
  updateEventsUI();
  updateHealthUI();
  updateCamera();
  if (commandBufferTimer > 0) {
    commandBufferTimer = Math.max(0, commandBufferTimer - delta);
    if (commandBufferTimer === 0) {
      commandBuffer = "";
    }
  }
  if (currentMaze) {
    renderMaze(currentMaze);
  }

  if (player.health <= 0) {
    endGame("death");
  } else if (isPlayerAtExit()) {
    endGame("win");
  }
  animationId = window.requestAnimationFrame(gameLoop);
}

async function generateAndRenderMaze() {
  await assetsReady;
  const { grid, entry, exit, groundVariants, forestMask: forest } = buildMaze();
  currentMaze = grid;
  currentEntry = entry;
  currentExit = exit;
  groundVariantMap = groundVariants;
  forestMask = forest;
  const path = findPathOnGrid(
    Math.floor(entry.x),
    Math.floor(entry.y),
    Math.floor(exit.x),
    Math.floor(exit.y)
  );
  mainPathCells = new Set();
  if (path) {
    path.forEach((node) => {
      mainPathCells.add(`${node.x},${node.y}`);
    });
  }
  entryExitDist = Math.max(1, Math.abs(entry.x - exit.x) + Math.abs(entry.y - exit.y));
  gameOver = false;
  setEndOverlay(deathOverlay, false);
  setEndOverlay(winOverlay, false);
  maskItems = spawnYellowMasks(grid, entry, exit, MASK_ITEM_COUNT);
  blueMaskItems = spawnBlueMasks(grid, entry, exit, BLUE_MASK_ITEM_COUNT);
  lifeFlaskItems = spawnLifeFlasks(grid, entry, exit, LIFE_FLASK_COUNT);
  skeletons = spawnSkeletons(grid, entry, exit, SKELETON_PROGRESSIVE_START);
  knives = [];
  knifeCooldown = 0;
  yellowMaskTimer = 0;
  blueMaskTimer = 0;
  lifeFlaskCount = 0;
  guidePath = null;
  guidePathMap = null;
  guideLastCell = { x: -1, y: -1 };
  fogRadiusCurrent = FOG_RADIUS_BASE;
  fogRadiusVelocity = 0;
  fogDarknessCurrent = FOG_DARKNESS_BASE;
  fogDarknessVelocity = 0;
  player.health = PLAYER_MAX_HEALTH;
  player.x = entry.x + 0.5;
  player.y = entry.y + 0.5;
  player.moving = false;
  player.animTime = 0;

  if (entry.side === "top") player.direction = "down";
  if (entry.side === "bottom") player.direction = "up";
  if (entry.side === "left") player.direction = "right";
  if (entry.side === "right") player.direction = "left";

  updateCamera();
  syncSceneSize();
  updateEventsUI();
  updateHealthUI();
  renderMaze(grid);
  if (!animationId) {
    lastFrameTime = performance.now();
    animationId = window.requestAnimationFrame(gameLoop);
  }
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

function setSelected(cards, activeCard) {
  cards.forEach((card) => {
    card.classList.toggle("is-selected", card === activeCard);
  });
}

function applySelections() {
  applyDifficultyPreset(currentDifficulty);
  applySizePreset(currentSize);
}

if (difficultyCards.length) {
  difficultyCards.forEach((card) => {
    card.addEventListener("click", () => {
      currentDifficulty = card.dataset.difficulty || "medium";
      setSelected(difficultyCards, card);
    });
  });
}

if (sizeCards.length) {
  sizeCards.forEach((card) => {
    card.addEventListener("click", () => {
      currentSize = card.dataset.size || "big";
      setSelected(sizeCards, card);
    });
  });
}

playButton.addEventListener("click", () => {
  setScreen("config");
});

if (backButton) {
  backButton.addEventListener("click", () => {
    setScreen("splash");
  });
}

if (startGameButton) {
  startGameButton.addEventListener("click", () => {
    applySelections();
    setScreen("game");
    setPaused(false);
    simulateGeneration();
  });
}

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

if (pauseContinueButton) {
  pauseContinueButton.addEventListener("click", () => {
    setPaused(false);
  });
}

if (pauseResumeButton) {
  pauseResumeButton.addEventListener("click", () => {
    setPaused(false);
  });
}

if (pauseQuitButton) {
  pauseQuitButton.addEventListener("click", () => {
    returnToSplash();
  });
}

retryButton.addEventListener("click", () => {
  returnToSplash();
});

playAgainButton.addEventListener("click", () => {
  returnToSplash();
});

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key === "p" && !event.repeat) {
    if (body.classList.contains("game-active") && !gameOver) {
      setPaused(!paused);
    }
    return;
  }
  if (paused || gameOver) {
    return;
  }
  if (key === "control" && !event.repeat) {
    setControlsOpen(!controlsOpen);
    return;
  }
  if (key.length === 1 && key >= "a" && key <= "z") {
    commandBuffer += key;
    commandBufferTimer = 1.2;
    if (commandBuffer.endsWith("level")) {
      commandBuffer = "";
      exportMapPng();
      return;
    }
  }
  if (key === "k" && !event.repeat) {
    spawnKnife();
    return;
  }
  if (
    [
      "w",
      "a",
      "s",
      "d",
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
    ].includes(key)
  ) {
    keys.add(key);
  }

  if (key === "arrowup") lastArrowDir = { x: 0, y: -1 };
  if (key === "arrowdown") lastArrowDir = { x: 0, y: 1 };
  if (key === "arrowleft") lastArrowDir = { x: -1, y: 0 };
  if (key === "arrowright") lastArrowDir = { x: 1, y: 0 };
});

document.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  keys.delete(key);
});

window.addEventListener("resize", () => {
  if (tutorialActive) {
    positionTutorial(tutorialSteps[tutorialIndex].target);
  }
  syncSceneSize();
  updateCamera();
  if (currentMaze) {
    renderMaze(currentMaze);
  }
});

window.addEventListener("load", () => {
  body.classList.add("is-ready");
  setScreen("splash");
  syncSceneSize();
});
