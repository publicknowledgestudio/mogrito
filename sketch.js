// P5.js SKETCH - Copy this into your P5 editor

// Configuration
let config = {
  rows: 4,
  cols: 3,
  aspectRatio: '3:4',
  staggerOffset: 0,
  bgColor: null,
  fgColor: null,
  strokeColor: null,
  useGradient: false,
  gradientColor: null,
  gradientType: 'linear',
  availableShapes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  colorPalette: [],
  useColorPalette: false,
  randomSeed: 0,
  lockAspect: false,
  invertPixels: false,
  customSVGs: [],
  strokeMode: false,
  extractPalette: false
};

const aspectRatios = {
  '1:1': [600, 600],
  '3:4': [600, 800],
  '4:3': [800, 600],
  '16:9': [800, 450],
  '9:16': [450, 800]
};

// Grid state
let shapeGrid, blockGrid, frameTrack, colorGrid;
let cycleDelay = 4;
let canvasWidth, canvasHeight;
let uploadedImage = null;
let canvasElement;
let shapeBuffer;

function setup() {
  const dimensions = aspectRatios[config.aspectRatio];
  canvasWidth = dimensions[0];
  canvasHeight = dimensions[1];
  canvasElement = createCanvas(canvasWidth, canvasHeight);
  canvasElement.parent('canvas-container');
  canvasElement.drop(handleFileDrop);
  pixelDensity(displayDensity());

  config.bgColor = color(0);
  config.fgColor = color(220);
  config.strokeColor = color(0, 220, 0);
  config.gradientColor = color(255, 107, 107);

  initGrid();
}

function initGrid() {
  // Preserve existing data when resizing
  let oldShapeGrid = shapeGrid || [];
  let oldColorGrid = colorGrid || [];
  let oldBlockGrid = blockGrid || [];

  shapeGrid = [];
  blockGrid = [];
  frameTrack = [];
  colorGrid = [];

  for (let i = 0; i < config.cols; i++) {
    shapeGrid[i] = [];
    blockGrid[i] = [];
    frameTrack[i] = [];
    colorGrid[i] = [];
    for (let j = 0; j < config.rows; j++) {
      // Copy old data if it exists
      if (oldShapeGrid[i] && oldShapeGrid[i][j] !== undefined) {
        shapeGrid[i][j] = oldShapeGrid[i][j];
        colorGrid[i][j] = oldColorGrid[i] && oldColorGrid[i][j] !== undefined ? oldColorGrid[i][j] : 0;
        blockGrid[i][j] = oldBlockGrid[i] && oldBlockGrid[i][j] !== undefined ? oldBlockGrid[i][j] : false;
      } else {
        // New cell: Fill randomly if shapes are available
        if (config.availableShapes.length > 0) {
          const randShapeIdx = floor(random(config.availableShapes.length));
          shapeGrid[i][j] = config.availableShapes[randShapeIdx];
        } else {
          shapeGrid[i][j] = -1;
        }

        if (config.useColorPalette && config.colorPalette.length > 0) {
          colorGrid[i][j] = floor(random(config.colorPalette.length));
        } else {
          colorGrid[i][j] = 0;
        }

        blockGrid[i][j] = false;
      }
      frameTrack[i][j] = 0;
    }
  }
}

function handleFileDrop(file) {
  if (file.type === 'image') {
    if (file.subtype === 'svg+xml' || file.name.endsWith('.svg')) {
      loadImage(file.data, function (img) {
        loadSVG(img);
      });
    } else {
      loadImage(file.data, function (img) {
        uploadedImage = img;
        processImageToShapes();
      });
    }
  }
}

function loadSVG(svgImg) {
  // Add SVG to custom shapes
  const svgIndex = config.availableShapes.length + config.customSVGs.length; // This logic is a bit flawed if we remove shapes, but okay for append-only custom
  // Better: Use a unique ID or just append to customSVGs and give it a special index range
  // Current logic: 0-10 are built-in. 11+ are custom.

  // We need to ensure we don't conflict with availableShapes indices if they are just numbers.
  // Let's assume custom shapes start at 100 to be safe, or just continue from 11.
  // The current code assumes continuous indices.

  config.customSVGs.push(svgImg);
  // The index for this new shape
  const newShapeIndex = 10 + config.customSVGs.length;

  config.availableShapes.push(newShapeIndex);

  // Notify HTML to update checkboxes
  if (typeof onSVGAdded === 'function') {
    onSVGAdded(newShapeIndex);
  }
}

function processImageToShapes() {
  if (!uploadedImage) return;

  const tileW = canvasWidth / config.cols;
  const tileH = canvasHeight / config.rows;

  uploadedImage.loadPixels();

  // Extract palette if requested
  if (config.extractPalette) {
    // Simple palette extraction: Take 4 pixels from different quadrants or random?
    // Better: K-means or just frequency. For speed, let's just sample.
    config.colorPalette = [];
    config.useColorPalette = true;

    // Sample 4 distinct colors
    for (let k = 0; k < 4; k++) {
      const x = floor(random(uploadedImage.width));
      const y = floor(random(uploadedImage.height));
      const c = uploadedImage.get(x, y);
      config.colorPalette.push(color(c));
    }

    // Notify UI to update
    if (typeof updatePaletteDisplay === 'function') {
      updatePaletteDisplay();
    }
  }

  for (let i = 0; i < config.cols; i++) {
    for (let j = 0; j < config.rows; j++) {
      const imgX = floor(map(i, 0, config.cols, 0, uploadedImage.width));
      const imgY = floor(map(j, 0, config.rows, 0, uploadedImage.height));

      const pixelIndex = (imgY * uploadedImage.width + imgX) * 4;
      const r = uploadedImage.pixels[pixelIndex];
      const g = uploadedImage.pixels[pixelIndex + 1];
      const b = uploadedImage.pixels[pixelIndex + 2];

      let brightness = (r + g + b) / 3;

      // Invert if option is enabled
      if (config.invertPixels) {
        brightness = 255 - brightness;
      }

      if (brightness < 50) {
        shapeGrid[i][j] = -1;
      } else {
        const shapeIndex = floor(map(brightness, 50, 255, 0, config.availableShapes.length));
        shapeGrid[i][j] = config.availableShapes[constrain(shapeIndex, 0, config.availableShapes.length - 1)];

        if (config.useColorPalette && config.colorPalette.length > 0) {
          colorGrid[i][j] = floor(random(config.colorPalette.length));
        }
      }
    }
  }

  uploadedImage = null;
}

function toggleStrokeMode(enabled) {
  config.strokeMode = enabled;
}

function toggleExtractPalette(enabled) {
  config.extractPalette = enabled;
}

function draw() {
  background(config.bgColor);

  const tileW = canvasWidth / config.cols;
  const tileH = canvasHeight / config.rows;

  // Initialize or resize shape buffer if needed
  // Use ceil to ensure we cover the whole tile (avoid subpixel gaps or clipping)
  const bufW = Math.ceil(tileW);
  const bufH = Math.ceil(tileH);
  if (!shapeBuffer || shapeBuffer.width !== bufW || shapeBuffer.height !== bufH) {
    shapeBuffer = createGraphics(bufW, bufH);
  }

  for (let i = 0; i < config.cols; i++) {
    for (let j = 0; j < config.rows; j++) {
      const stagger = (j % 2 === 0) ? config.staggerOffset : -config.staggerOffset;
      const posX = i * tileW + stagger;
      const posY = j * tileH;

      push();
      translate(posX, posY);

      if (mouseOverCell(i, j, tileW, tileH, stagger)) {
        push();
        stroke(config.strokeColor);
        noFill();
        strokeWeight(2);
        rect(0, 0, tileW, tileH);
        pop();
      }

      if (!blockGrid[i][j] && shapeGrid[i][j] !== -1) {
        if (mouseOverCell(i, j, tileW, tileH, stagger) &&
          keyIsPressed && keyCode === CONTROL) {
          if (frameCount - frameTrack[i][j] > cycleDelay) {
            const currentIdx = config.availableShapes.indexOf(shapeGrid[i][j]);
            const nextIdx = (currentIdx + 1) % config.availableShapes.length;
            shapeGrid[i][j] = config.availableShapes[nextIdx];
            frameTrack[i][j] = frameCount;
          }
        }
        drawShape(shapeGrid[i][j], tileW, tileH, i, j);
      }
      pop();
    }
  }
}

function drawShape(index, tileW, tileH, i, j) {
  let fillColor;
  let svgColor;

  if (config.strokeMode) {
    noFill();
    stroke(config.strokeColor);
    strokeWeight(2);
    svgColor = config.strokeColor;

    // If using palette in stroke mode, use palette color for stroke
    if (config.useColorPalette && config.colorPalette.length > 0) {
      const palColor = config.colorPalette[colorGrid[i][j] % config.colorPalette.length];
      stroke(palColor);
      svgColor = palColor;
    }
    drawShapeGeometry(index, tileW, tileH, svgColor);
    return;
  }

  if (config.useColorPalette && config.colorPalette.length > 0) {
    fillColor = config.colorPalette[colorGrid[i][j] % config.colorPalette.length];
    svgColor = fillColor;
  } else if (config.useGradient) {
    let gradient;
    if (config.gradientType === 'radial') {
      gradient = drawingContext.createRadialGradient(tileW / 2, tileH / 2, 0, tileW / 2, tileH / 2, Math.max(tileW, tileH) / 2);
    } else if (config.gradientType === 'diagonal') {
      gradient = drawingContext.createLinearGradient(0, 0, tileW, tileH);
    } else { // 'linear' (default)
      gradient = drawingContext.createLinearGradient(0, 0, 0, tileH);
    }
    gradient.addColorStop(0, config.fgColor.toString('#rrggbb'));
    gradient.addColorStop(1, config.gradientColor.toString('#rrggbb'));
    drawingContext.fillStyle = gradient;
    noStroke();
    // For gradient, we can't easily tint SVG with a gradient. 
    // We'll use the mid-point color or just fgColor for tint? 
    // Or just don't tint (keep original SVG colors) if gradient is on?
    // User said "custom SVG's fill should also be mapped to the shape fill".
    // If gradient is complex, tinting with one color is approximation.
    // Let's use fgColor for tint in gradient mode as a fallback, or gradientColor?
    // Let's use fgColor.
    svgColor = config.fgColor;

    drawShapeGeometry(index, tileW, tileH, svgColor);
    return;
  } else {
    fillColor = config.fgColor;
    svgColor = fillColor;
  }

  fill(fillColor);
  noStroke();
  drawShapeGeometry(index, tileW, tileH, svgColor);
}

function drawShapeGeometry(index, tileW, tileH, tintColor) {
  // Check if it's a custom SVG
  // Built-in shapes are 0-10. Custom start at 11.
  if (index > 10) {
    const customIndex = index - 11;
    if (customIndex >= 0 && customIndex < config.customSVGs.length) {
      const img = config.customSVGs[customIndex];

      if (tintColor && shapeBuffer) {
        // Use masking to force the color
        shapeBuffer.clear();
        // Draw SVG to buffer
        shapeBuffer.image(img, 0, 0, tileW, tileH);

        // Apply mask
        shapeBuffer.drawingContext.globalCompositeOperation = 'source-in';
        shapeBuffer.fill(tintColor);
        shapeBuffer.noStroke();
        shapeBuffer.rect(0, 0, tileW, tileH);

        // Reset composite for next time
        shapeBuffer.drawingContext.globalCompositeOperation = 'source-over';

        // Draw buffer to main canvas
        image(shapeBuffer, 0, 0, tileW, tileH);
      } else {
        image(img, 0, 0, tileW, tileH);
      }
      return;
    }
  }

  switch (index) {
    case 0: // Circle
      translate(tileW / 2, tileH / 2);
      ellipse(0, 0, tileW, tileH);
      break;
    case 1: // Half Rect Bottom
      translate(0, tileH / 2);
      rect(0, 0, tileW, tileH * 0.5);
      break;
    case 2: // Half Rect Top
      rect(0, 0, tileW, tileH * 0.5);
      break;
    case 3: // Trapezoid Left
      beginShape();
      vertex(0, 0);
      vertex(tileW / 2, 0);
      vertex(tileW, tileH);
      vertex(tileW / 2, tileH);
      endShape(CLOSE);
      break;
    case 4: // Trapezoid Right
      beginShape();
      vertex(tileW, 0);
      vertex(tileW / 2, 0);
      vertex(0, tileH);
      vertex(tileW / 2, tileH);
      endShape(CLOSE);
      break;
    case 5: // Half Left
      beginShape();
      vertex(0, 0);
      vertex(tileW / 2, 0);
      vertex(tileW / 2, tileH);
      vertex(0, tileH);
      endShape(CLOSE);
      break;
    case 6: // Half Right
      beginShape();
      vertex(tileW, 0);
      vertex(tileW / 2, 0);
      vertex(tileW / 2, tileH);
      vertex(tileW, tileH);
      endShape(CLOSE);
      break;
    case 7: // Quarter Circle Top-Left
      arc(0, 0, tileW * 2, tileH * 2, 0, HALF_PI);
      break;
    case 8: // Quarter Circle Top-Right
      arc(tileW, 0, tileW * 2, tileH * 2, HALF_PI, PI);
      break;
    case 9: // Quarter Circle Bottom-Right
      arc(tileW, tileH, tileW * 2, tileH * 2, PI, PI + HALF_PI);
      break;
    case 10: // Quarter Circle Bottom-Left
      arc(0, tileH, tileW * 2, tileH * 2, PI + HALF_PI, TWO_PI);
      break;
  }
}

function mouseOverCell(i, j, tileW, tileH, stagger) {
  const cellX = i * tileW + stagger;
  const cellY = j * tileH;
  return mouseX >= cellX && mouseX < cellX + tileW &&
    mouseY >= cellY && mouseY < cellY + tileH;
}

let isDragging = false;
let startX, startY;

function mousePressed() {
  startX = mouseX;
  startY = mouseY;
  isDragging = false;

  // Initial check to see if we clicked on canvas
  if (mouseX >= 0 && mouseX < canvasWidth && mouseY >= 0 && mouseY < canvasHeight) {
    // Don't do anything yet, wait for release or drag
  }
}

function mouseDragged() {
  if (keyIsPressed && keyCode === ALT) {
    clearCell(mouseX, mouseY);
    return;
  }

  const distMoved = dist(startX, startY, mouseX, mouseY);
  if (distMoved > 5) {
    isDragging = true;
    paintCell(mouseX, mouseY);
  }
}

function mouseReleased() {
  if (!isDragging && mouseX >= 0 && mouseX < canvasWidth && mouseY >= 0 && mouseY < canvasHeight) {
    cycleCell(mouseX, mouseY);
  }
  isDragging = false;
}

function paintCell(x, y) {
  const tileW = canvasWidth / config.cols;
  const tileH = canvasHeight / config.rows;

  for (let i = 0; i < config.cols; i++) {
    for (let j = 0; j < config.rows; j++) {
      const stagger = (j % 2 === 0) ? config.staggerOffset : -config.staggerOffset;
      const cellX = i * tileW + stagger;
      const cellY = j * tileH;

      if (x >= cellX && x < cellX + tileW && y >= cellY && y < cellY + tileH) {
        if (!blockGrid[i][j]) {
          // Paint with a random available shape if current is empty or just replace?
          // User said "mouse dragged - but the cycling of shapes can happen through click still"
          // Usually drag paints a specific shape. Let's paint the FIRST available shape or random?
          // "When increasing row & column, the shapes should randomly fill... Instead of mouse click to add a shape it should be mouse dragged"
          // Let's assume drag adds a random shape from available list if empty, or changes it?
          // A common pattern is "Paint with selected brush". We don't have a brush.
          // Let's just add a random shape if empty.
          if (shapeGrid[i][j] === -1 && config.availableShapes.length > 0) {
            const randShapeIdx = floor(random(config.availableShapes.length));
            shapeGrid[i][j] = config.availableShapes[randShapeIdx];
            if (config.useColorPalette && config.colorPalette.length > 0) {
              colorGrid[i][j] = floor(random(config.colorPalette.length));
            }
          }
        }
        return;
      }
    }
  }
}

function cycleCell(x, y) {
  const tileW = canvasWidth / config.cols;
  const tileH = canvasHeight / config.rows;

  for (let i = 0; i < config.cols; i++) {
    for (let j = 0; j < config.rows; j++) {
      const stagger = (j % 2 === 0) ? config.staggerOffset : -config.staggerOffset;
      const cellX = i * tileW + stagger;
      const cellY = j * tileH;

      if (x >= cellX && x < cellX + tileW && y >= cellY && y < cellY + tileH) {
        if (!blockGrid[i][j]) {
          if (shapeGrid[i][j] === -1) {
            if (config.availableShapes.length > 0) {
              shapeGrid[i][j] = config.availableShapes[0];
            }
          } else {
            const currentIdx = config.availableShapes.indexOf(shapeGrid[i][j]);
            if (currentIdx !== -1) {
              const nextIdx = (currentIdx + 1) % config.availableShapes.length;
              shapeGrid[i][j] = config.availableShapes[nextIdx];
            } else if (config.availableShapes.length > 0) {
              shapeGrid[i][j] = config.availableShapes[0];
            }
          }

          if (config.useColorPalette && config.colorPalette.length > 0) {
            colorGrid[i][j] = (colorGrid[i][j] + 1) % config.colorPalette.length;
          }
        }
        return;
      }
    }
  }
}

function clearCell(x, y) {
  const tileW = canvasWidth / config.cols;
  const tileH = canvasHeight / config.rows;

  for (let i = 0; i < config.cols; i++) {
    for (let j = 0; j < config.rows; j++) {
      const stagger = (j % 2 === 0) ? config.staggerOffset : -config.staggerOffset;
      const cellX = i * tileW + stagger;
      const cellY = j * tileH;

      if (x >= cellX && x < cellX + tileW && y >= cellY && y < cellY + tileH) {
        shapeGrid[i][j] = -1;
        blockGrid[i][j] = false;
        return;
      }
    }
  }
}

// GUI CONTROL FUNCTIONS
function updateCols(value) {
  config.cols = value;
  if (config.lockAspect) {
    // Maintain square cells: tileW = tileH
    // tileW = width / cols
    // tileH = height / rows
    // width / cols = height / rows => rows = cols * (height / width)
    config.rows = Math.max(1, Math.round(value * (canvasHeight / canvasWidth)));
    if (typeof updateRowsDisplay === 'function') {
      updateRowsDisplay(config.rows);
    }
  }
  initGrid();
}

function updateRows(value) {
  config.rows = value;
  if (config.lockAspect) {
    // cols = rows * (width / height)
    config.cols = Math.max(1, Math.round(value * (canvasWidth / canvasHeight)));
    if (typeof updateColsDisplay === 'function') {
      updateColsDisplay(config.cols);
    }
  }
  initGrid();
}

function updateAspectRatio(ratio) {
  config.aspectRatio = ratio;
  const dimensions = aspectRatios[ratio];
  canvasWidth = dimensions[0];
  canvasHeight = dimensions[1];
  resizeCanvas(canvasWidth, canvasHeight);
  initGrid();
}

function updateStaggerOffset(value) {
  config.staggerOffset = value;
}

function updateBgColor(hexColor) {
  config.bgColor = color(hexColor);
}

function updateFgColor(hexColor) {
  config.fgColor = color(hexColor);
}

function updateStrokeColor(hexColor) {
  config.strokeColor = color(hexColor);
}

function updateGradient(enabled) {
  config.useGradient = enabled;
}

function updateGradientColor(hexColor) {
  config.gradientColor = color(hexColor);
}

function updateGradientType(type) {
  config.gradientType = type;
}

function toggleShape(shapeIndex, enabled) {
  const idx = config.availableShapes.indexOf(shapeIndex);
  if (enabled && idx === -1) {
    config.availableShapes.push(shapeIndex);
    config.availableShapes.sort(function (a, b) { return a - b; });

    // Re-introduce this shape to the grid randomly
    // "when checked in, the shape should come back in the canvas"
    // We'll replace some existing shapes with this new one to make it visible immediately.
    // Probability: 1 / availableShapes.length (fair share)
    const chance = 1.0 / config.availableShapes.length;

    for (let i = 0; i < config.cols; i++) {
      for (let j = 0; j < config.rows; j++) {
        // Only replace if it's not empty (or maybe even if it is empty? User said "come back in canvas")
        // Let's replace non-empty cells to maintain the "mask" if image was used.
        // If we replace empty cells, we break the image mask.
        if (shapeGrid[i][j] !== -1) {
          if (random(1) < chance) {
            shapeGrid[i][j] = shapeIndex;
            // Keep color as is
          }
        }
      }
    }

  } else if (!enabled && idx > -1) {
    config.availableShapes.splice(idx, 1);
    // Remove this shape from the grid
    for (let i = 0; i < config.cols; i++) {
      for (let j = 0; j < config.rows; j++) {
        if (shapeGrid[i][j] === shapeIndex) {
          // Replace with another available shape or -1 if none
          if (config.availableShapes.length > 0) {
            const randShapeIdx = floor(random(config.availableShapes.length));
            shapeGrid[i][j] = config.availableShapes[randShapeIdx];
          } else {
            shapeGrid[i][j] = -1;
          }
        }
      }
    }
  }
}

function addColorToPalette(hexColor) {
  if (config.colorPalette.length < 4) {
    config.colorPalette.push(color(hexColor));
    config.useColorPalette = true;
    redistributePalette();
  }
}

function removeColorFromPalette(index) {
  if (index >= 0 && index < config.colorPalette.length) {
    config.colorPalette.splice(index, 1);
    if (config.colorPalette.length === 0) {
      config.useColorPalette = false;
    }
    redistributePalette();
  }
}

function redistributePalette() {
  if (config.colorPalette.length === 0) return;

  for (let i = 0; i < config.cols; i++) {
    for (let j = 0; j < config.rows; j++) {
      if (shapeGrid[i][j] !== -1) {
        // Assign a random color index from the new palette size
        colorGrid[i][j] = floor(random(config.colorPalette.length));
      }
    }
  }
}

function clearColorPalette() {
  config.colorPalette = [];
  config.useColorPalette = false;
}

function fillRandomly() {
  // Shuffle existing pixels based on random seed
  randomSeed(config.randomSeed);

  // Collect all non-empty cells (or all cells if we want to shuffle everything)
  // User request: "When an image is put, & random seed should only work in cells which has a shape, if not then the should be left empty"
  // This implies we should only shuffle the CONTENT of filled cells, but keep their positions?
  // OR shuffle the positions of filled cells amongst themselves?
  // "random seed should only work in cells which has a shape" -> The cells that HAVE a shape should change. The cells that DON'T should stay empty.
  // This sounds like we iterate over all cells. If shape != -1, we assign a NEW random shape/color.

  for (let i = 0; i < config.cols; i++) {
    for (let j = 0; j < config.rows; j++) {
      if (shapeGrid[i][j] !== -1) {
        if (config.availableShapes.length > 0) {
          const randShapeIdx = floor(random(config.availableShapes.length));
          shapeGrid[i][j] = config.availableShapes[randShapeIdx];
        }

        if (config.useColorPalette && config.colorPalette.length > 0) {
          colorGrid[i][j] = floor(random(config.colorPalette.length));
        }
      }
    }
  }
}

function clearCanvas() {
  for (let i = 0; i < config.cols; i++) {
    for (let j = 0; j < config.rows; j++) {
      shapeGrid[i][j] = -1;
      blockGrid[i][j] = false;
      colorGrid[i][j] = 0;
    }
  }
}

function updateRandomSeed(value) {
  config.randomSeed = value;
}

function toggleLockAspect(locked) {
  config.lockAspect = locked;
  if (locked) {
    config.rows = config.cols;
    if (typeof updateRowsDisplay === 'function') {
      updateRowsDisplay(config.cols);
    }
    initGrid();
  }
}

function toggleInvertPixels(invert) {
  config.invertPixels = invert;
}

function savePNG(scale) {
  const scaledWidth = canvasWidth * scale;
  const scaledHeight = canvasHeight * scale;

  const tempCanvas = createGraphics(scaledWidth, scaledHeight);
  tempCanvas.background(config.bgColor);

  const tileW = scaledWidth / config.cols;
  const tileH = scaledHeight / config.rows;

  for (let i = 0; i < config.cols; i++) {
    for (let j = 0; j < config.rows; j++) {
      if (shapeGrid[i][j] !== -1) {
        const stagger = (j % 2 === 0) ? config.staggerOffset * scale : -config.staggerOffset * scale;
        const posX = i * tileW + stagger;
        const posY = j * tileH;

        tempCanvas.push();
        tempCanvas.translate(posX, posY);

        // Handle gradient, color palette, or single color
        if (config.useColorPalette && config.colorPalette.length > 0) {
          tempCanvas.fill(config.colorPalette[colorGrid[i][j] % config.colorPalette.length]);
          tempCanvas.noStroke();
          drawShapeOnGraphics(tempCanvas, shapeGrid[i][j], tileW, tileH, i, j);
        } else if (config.useGradient) {
          let gradient;
          if (config.gradientType === 'radial') {
            gradient = tempCanvas.drawingContext.createRadialGradient(tileW / 2, tileH / 2, 0, tileW / 2, tileH / 2, Math.max(tileW, tileH) / 2);
          } else if (config.gradientType === 'diagonal') {
            gradient = tempCanvas.drawingContext.createLinearGradient(0, 0, tileW, tileH);
          } else {
            gradient = tempCanvas.drawingContext.createLinearGradient(0, 0, 0, tileH);
          }
          gradient.addColorStop(0, config.fgColor.toString('#rrggbb'));
          gradient.addColorStop(1, config.gradientColor.toString('#rrggbb'));
          tempCanvas.drawingContext.fillStyle = gradient;
          tempCanvas.noStroke();
          drawShapeOnGraphics(tempCanvas, shapeGrid[i][j], tileW, tileH, i, j);
        } else {
          tempCanvas.fill(config.fgColor);
          tempCanvas.noStroke();
          drawShapeOnGraphics(tempCanvas, shapeGrid[i][j], tileW, tileH, i, j);
        }

        tempCanvas.pop();
      }
    }
  }

  save(tempCanvas, 'shape-grid-' + scale + 'x.png');
}

function drawShapeOnGraphics(g, index, tileW, tileH, i, j) {
  // Check if it's a custom SVG
  const customIndex = index - 11;
  if (customIndex >= 0 && customIndex < config.customSVGs.length) {
    // Draw custom SVG (simplified - you'd need proper SVG parsing)
    g.rect(0, 0, tileW, tileH);
    return;
  }

  switch (index) {
    case 0:
      g.translate(tileW / 2, tileH / 2);
      g.ellipse(0, 0, tileW, tileH);
      break;
    case 1:
      g.translate(0, tileH / 2);
      g.rect(0, 0, tileW, tileH * 0.5);
      break;
    case 2:
      g.rect(0, 0, tileW, tileH * 0.5);
      break;
    case 3:
      g.beginShape();
      g.vertex(0, 0);
      g.vertex(tileW / 2, 0);
      g.vertex(tileW, tileH);
      g.vertex(tileW / 2, tileH);
      g.endShape(CLOSE);
      break;
    case 4:
      g.beginShape();
      g.vertex(tileW, 0);
      g.vertex(tileW / 2, 0);
      g.vertex(0, tileH);
      g.vertex(tileW / 2, tileH);
      g.endShape(CLOSE);
      break;
    case 5:
      g.beginShape();
      g.vertex(0, 0);
      g.vertex(tileW / 2, 0);
      g.vertex(tileW / 2, tileH);
      g.vertex(0, tileH);
      g.endShape(CLOSE);
      break;
    case 6:
      g.beginShape();
      g.vertex(tileW, 0);
      g.vertex(tileW / 2, 0);
      g.vertex(tileW / 2, tileH);
      g.vertex(tileW, tileH);
      g.endShape(CLOSE);
      break;
    case 7:
      g.arc(0, 0, tileW * 2, tileH * 2, 0, HALF_PI);
      break;
    case 8:
      g.arc(tileW, 0, tileW * 2, tileH * 2, HALF_PI, PI);
      break;
    case 9:
      g.arc(tileW, tileH, tileW * 2, tileH * 2, PI, PI + HALF_PI);
      break;
    case 10:
      g.arc(0, tileH, tileW * 2, tileH * 2, PI + HALF_PI, TWO_PI);
      break;
  }
}
