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
const sceneCanvas = document.createElement("canvas");
const sceneCtx = sceneCanvas.getContext("2d");

ctx.imageSmoothingEnabled = false;
sceneCtx.imageSmoothingEnabled = false;

const SOURCE_TILE_SIZE = 16;
const RENDER_SCALE = 2;
const TILE_SIZE = SOURCE_TILE_SIZE * RENDER_SCALE;

const WALL = 1;
const FLOOR = 0;

const MAZE_CELL_COLS = 60;
const MAZE_CELL_ROWS = 60;

const FOG_RADIUS_BASE = 250;
const FOG_RADIUS_MASK = 750;
const FOG_BLUR_PX = 8;
const FOG_DARKNESS_BASE = 0.95;
const FOG_DARKNESS_MASK = 0.75;
const FOG_FALLOFF_PX = 50;

const MASK_DURATION = 15;
const MASK_ITEM_COUNT = 100;
const MASK_ITEM_RADIUS = 0.35;
const PLAYER_SPEED = 6;

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

const yellowMaskItem = loadImage("assets/items/yellow_mask.png");

const assetsReady = Promise.all([
  wallTiles.ready,
  characterImages.down.ready,
  characterImages.up.ready,
  characterImages.side.ready,
  yellowCharacterImages.down.ready,
  yellowCharacterImages.up.ready,
  yellowCharacterImages.side.ready,
  yellowMaskItem.ready,
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
let fogRadiusCurrent = FOG_RADIUS_BASE;
let fogRadiusVelocity = 0;
let fogDarknessCurrent = FOG_DARKNESS_BASE;
let fogDarknessVelocity = 0;

const camera = { x: 0, y: 0 };

const player = {
  x: 0,
  y: 0,
  radius: 0.32,
  speed: PLAYER_SPEED,
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

function setGameState(active) {
  body.classList.toggle("game-active", active);
  splash.setAttribute("aria-hidden", active ? "true" : "false");
  game.setAttribute("aria-hidden", active ? "false" : "true");
}

function syncSceneSize() {
  sceneCanvas.width = canvas.width;
  sceneCanvas.height = canvas.height;
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
  const lowGrid = generateMazePrim(MAZE_CELL_COLS, MAZE_CELL_ROWS);
  const { entry, exit } = carveEntrances(lowGrid);
  const highGrid = upscaleGrid(lowGrid, 2);

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

  return { grid: highGrid, entry: entryHigh, exit: exitHigh };
}

function spawnYellowMasks(grid, entry, exit, count) {
  const rows = grid.length;
  const cols = grid[0].length;
  const candidates = [];

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
      candidates.push({ x, y });
    }
  }

  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  return candidates.slice(0, count).map((point) => ({
    x: point.x,
    y: point.y,
    collected: false,
  }));
}

function isWall(grid, x, y) {
  if (!grid) return true;
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) {
    return true;
  }
  return grid[y][x] === WALL;
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function updateCamera() {
  if (!currentMaze) return;
  const worldWidth = currentMaze[0].length * TILE_SIZE;
  const worldHeight = currentMaze.length * TILE_SIZE;
  camera.x = player.x * TILE_SIZE - canvas.width / 2;
  camera.y = player.y * TILE_SIZE - canvas.height / 2;
  camera.x = clamp(camera.x, 0, Math.max(0, worldWidth - canvas.width));
  camera.y = clamp(camera.y, 0, Math.max(0, worldHeight - canvas.height));
}

function canMoveTo(x, y) {
  if (!currentMaze) return false;
  const r = player.radius;
  const minX = Math.floor(x - r);
  const maxX = Math.floor(x + r);
  const minY = Math.floor(y - r);
  const maxY = Math.floor(y + r);

  for (let ty = minY; ty <= maxY; ty += 1) {
    for (let tx = minX; tx <= maxX; tx += 1) {
      if (isWall(currentMaze, tx, ty)) {
        return false;
      }
    }
  }

  return true;
}

function movePlayer(dx, dy, delta) {
  if (!currentMaze) return;
  const step = player.speed * delta;

  if (dx !== 0) {
    const nextX = player.x + dx * step;
    if (canMoveTo(nextX, player.y)) {
      player.x = nextX;
    }
  }

  if (dy !== 0) {
    const nextY = player.y + dy * step;
    if (canMoveTo(player.x, nextY)) {
      player.y = nextY;
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
    movePlayer(dx, 0, delta);
    movePlayer(0, dy, delta);
  } else {
    movePlayer(dx, dy, delta);
  }
}

function updateMaskTimer(delta) {
  if (yellowMaskTimer > 0) {
    yellowMaskTimer = Math.max(0, yellowMaskTimer - delta);
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

function getPlayerFrame() {
  const activeSprites = yellowMaskTimer > 0 ? playerYellowSprites : playerSprites;
  const sprite = activeSprites[player.direction] || activeSprites.down;
  const frame = player.moving
    ? sprite.moveFrames[Math.floor(player.animTime * 6) % sprite.moveFrames.length]
    : sprite.idleFrame;
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

function renderMaskItems(startCol, endCol, startRow, endRow) {
  if (!maskItems.length) return;

  for (const item of maskItems) {
    if (item.collected) continue;
    if (item.x < startCol - 1 || item.x > endCol + 1) continue;
    if (item.y < startRow - 1 || item.y > endRow + 1) continue;

    const cx = (item.x + 0.5) * TILE_SIZE - camera.x;
    const cy = (item.y + 0.5) * TILE_SIZE - camera.y;
    if (!yellowMaskItem.image.complete) {
      continue;
    }

    sceneCtx.drawImage(
      yellowMaskItem.image,
      0,
      0,
      SOURCE_TILE_SIZE,
      SOURCE_TILE_SIZE,
      cx - TILE_SIZE / 2,
      cy - TILE_SIZE / 2,
      TILE_SIZE,
      TILE_SIZE
    );
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

  sceneCtx.fillStyle = "#141210";
  for (let y = startRow; y <= endRow; y += 1) {
    for (let x = startCol; x <= endCol; x += 1) {
      if (grid[y][x] !== FLOOR) {
        continue;
      }
      const dx = x * TILE_SIZE - camera.x;
      const dy = y * TILE_SIZE - camera.y;
      sceneCtx.fillRect(dx, dy, TILE_SIZE, TILE_SIZE);
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

function gameLoop(timestamp) {
  const delta = Math.min(0.05, (timestamp - lastFrameTime) / 1000 || 0);
  lastFrameTime = timestamp;
  updatePlayer(delta);
  checkMaskPickup();
  updateMaskTimer(delta);
  updateFog(delta);
  updateCamera();
  if (currentMaze) {
    renderMaze(currentMaze);
  }
  animationId = window.requestAnimationFrame(gameLoop);
}

async function generateAndRenderMaze() {
  await assetsReady;
  const { grid, entry, exit } = buildMaze();
  currentMaze = grid;
  currentEntry = entry;
  currentExit = exit;
  maskItems = spawnYellowMasks(grid, entry, exit, MASK_ITEM_COUNT);
  yellowMaskTimer = 0;
  fogRadiusCurrent = FOG_RADIUS_BASE;
  fogRadiusVelocity = 0;
  fogDarknessCurrent = FOG_DARKNESS_BASE;
  fogDarknessVelocity = 0;
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
  const key = event.key.toLowerCase();
  if (key === "control" && !event.repeat) {
    setControlsOpen(!controlsOpen);
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
  syncSceneSize();
});
