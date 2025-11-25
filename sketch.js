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
  customSVGs: []
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
        shapeGrid[i][j] = -1;
        colorGrid[i][j] = 0;
        blockGrid[i][j] = false;
      }
      frameTrack[i][j] = 0;
    }
  }
}

function handleFileDrop(file) {
  if (file.type === 'image') {
    if (file.subtype === 'svg+xml') {
      // Read SVG file as text
      const reader = new FileReader();
      reader.onload = function (e) {
        loadSVG(e.target.result);
      };
      reader.readAsText(file.file);
    } else {
      loadImage(file.data, function (img) {
        uploadedImage = img;
        processImageToShapes();
      });
    }
  }
}

function loadSVG(svgData) {
  // Add SVG to custom shapes
  const svgIndex = config.availableShapes.length + config.customSVGs.length;
  config.customSVGs.push(svgData);
  config.availableShapes.push(svgIndex);

  // Notify HTML to update checkboxes
  if (typeof onSVGAdded === 'function') {
    onSVGAdded(svgIndex);
  }
}

function processImageToShapes() {
  if (!uploadedImage) return;

  const tileW = canvasWidth / config.cols;
  const tileH = canvasHeight / config.rows;

  uploadedImage.loadPixels();

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
          colorGrid[i][j] = floor(map(brightness, 50, 255, 0, config.colorPalette.length));
          colorGrid[i][j] = constrain(colorGrid[i][j], 0, config.colorPalette.length - 1);
        }
      }
    }
  }

  uploadedImage = null;
}

function draw() {
  background(config.bgColor);

  const tileW = canvasWidth / config.cols;
  const tileH = canvasHeight / config.rows;

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

  if (config.useColorPalette && config.colorPalette.length > 0) {
    fillColor = config.colorPalette[colorGrid[i][j] % config.colorPalette.length];
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
    drawShapeGeometry(index, tileW, tileH);
    return;
  } else {
    fillColor = config.fgColor;
  }

  fill(fillColor);
  noStroke();
  drawShapeGeometry(index, tileW, tileH);
}

function drawShapeGeometry(index, tileW, tileH) {
  // Check if it's a custom SVG
  const customIndex = index - 11;
  if (customIndex >= 0 && customIndex < config.customSVGs.length) {
    // Draw custom SVG (simplified - you'd need proper SVG parsing)
    rect(0, 0, tileW, tileH);
    return;
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

function mousePressed() {
  const tileW = canvasWidth / config.cols;
  const tileH = canvasHeight / config.rows;

  for (let i = 0; i < config.cols; i++) {
    for (let j = 0; j < config.rows; j++) {
      const stagger = (j % 2 === 0) ? config.staggerOffset : -config.staggerOffset;
      const cellX = i * tileW + stagger;
      const cellY = j * tileH;

      if (mouseX >= cellX && mouseX < cellX + tileW &&
        mouseY >= cellY && mouseY < cellY + tileH) {
        if (!blockGrid[i][j]) {
          if (shapeGrid[i][j] === -1) {
            shapeGrid[i][j] = config.availableShapes[0];
          } else {
            const currentIdx = config.availableShapes.indexOf(shapeGrid[i][j]);
            const nextIdx = (currentIdx + 1) % config.availableShapes.length;
            shapeGrid[i][j] = config.availableShapes[nextIdx];
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

function mouseDragged() {
  if (keyIsPressed && keyCode === ALT) {
    clearCell(mouseX, mouseY);
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
    config.rows = value;
    if (typeof updateRowsDisplay === 'function') {
      updateRowsDisplay(value);
    }
  }
  initGrid();
}

function updateRows(value) {
  config.rows = value;
  if (config.lockAspect) {
    config.cols = value;
    if (typeof updateColsDisplay === 'function') {
      updateColsDisplay(value);
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
  } else if (!enabled && idx > -1 && config.availableShapes.length > 1) {
    config.availableShapes.splice(idx, 1);
  }
}

function addColorToPalette(hexColor) {
  if (config.colorPalette.length < 4) {
    config.colorPalette.push(color(hexColor));
    config.useColorPalette = true;
  }
}

function removeColorFromPalette(index) {
  if (index >= 0 && index < config.colorPalette.length) {
    config.colorPalette.splice(index, 1);
    if (config.colorPalette.length === 0) {
      config.useColorPalette = false;
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

  // Collect all non-empty cells
  let cells = [];
  for (let i = 0; i < config.cols; i++) {
    for (let j = 0; j < config.rows; j++) {
      if (shapeGrid[i][j] !== -1) {
        cells.push({
          shape: shapeGrid[i][j],
          color: colorGrid[i][j]
        });
      }
    }
  }

  // If no cells exist, create random ones
  if (cells.length === 0) {
    for (let i = 0; i < config.cols; i++) {
      for (let j = 0; j < config.rows; j++) {
        if (random(1) > 0.3) {
          const randShapeIdx = floor(random(config.availableShapes.length));
          shapeGrid[i][j] = config.availableShapes[randShapeIdx];

          if (config.useColorPalette && config.colorPalette.length > 0) {
            colorGrid[i][j] = floor(random(config.colorPalette.length));
          }
        } else {
          shapeGrid[i][j] = -1;
        }
      }
    }
    return;
  }

  // Shuffle the cells array
  for (let i = cells.length - 1; i > 0; i--) {
    const j = floor(random(i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  // Clear grid first
  for (let i = 0; i < config.cols; i++) {
    for (let j = 0; j < config.rows; j++) {
      shapeGrid[i][j] = -1;
      colorGrid[i][j] = 0;
    }
  }

  // Redistribute shuffled cells
  let cellIndex = 0;
  for (let i = 0; i < config.cols && cellIndex < cells.length; i++) {
    for (let j = 0; j < config.rows && cellIndex < cells.length; j++) {
      shapeGrid[i][j] = cells[cellIndex].shape;
      colorGrid[i][j] = cells[cellIndex].color;
      cellIndex++;
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