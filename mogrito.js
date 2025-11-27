const originalLayout = [
  'M', 'O', '',
  'G', 'R', 'I',
  'T', 'O', ''
];

let isJumbled = false;
let isAnimating = false;

document.addEventListener('DOMContentLoaded', () => {
  const gridContainer = document.getElementById('mogrito-grid');
  // Initial render
  renderGrid(gridContainer, originalLayout);

  // Interaction
  gridContainer.addEventListener('click', handleInteraction);
  gridContainer.addEventListener('touchstart', handleInteraction);
});

function handleInteraction(e) {
  e.preventDefault(); // Prevent double firing on touch devices

  if (isAnimating || isJumbled) return;

  startJumbleSequence();
}

function renderGrid(container, layout) {
  // If empty, create cells
  if (container.children.length === 0) {
    layout.forEach((letter, index) => {
      const cell = document.createElement('div');
      cell.classList.add('grid-cell');
      updateCell(cell, letter);
      container.appendChild(cell);
    });
  } else {
    // Update existing
    Array.from(container.children).forEach((cell, index) => {
      updateCell(cell, layout[index]);
    });
  }
}

function updateCell(cell, letter) {
  cell.textContent = letter;
  if (!letter) {
    cell.classList.add('empty');
  } else {
    cell.classList.remove('empty');
  }
}

function startJumbleSequence() {
  isAnimating = true;
  isJumbled = true;

  // 1. Determine Target (Jumbled) Layout
  const letters = originalLayout.filter(l => l !== '');
  const shuffledLetters = shuffleArray([...letters]);
  const targetLayout = originalLayout.map(char => {
    if (char === '') return '';
    return shuffledLetters.pop();
  });

  // 2. Spin to Jumbled
  spinTo(targetLayout, () => {
    // 3. Wait
    setTimeout(() => {
      // 4. Spin to Original
      spinTo(originalLayout, () => {
        isJumbled = false;
        isAnimating = false;
      });
    }, 1500);
  });
}

function spinTo(targetLayout, callback) {
  const gridContainer = document.getElementById('mogrito-grid');
  const cells = Array.from(gridContainer.children);
  const baseDuration = 300; // Minimum spin time
  const intervalTime = 50; // Speed of letter change

  let completed = 0;
  const totalCells = cells.length;

  cells.forEach((cell, index) => {
    const targetChar = targetLayout[index];

    // Skip empty slots (assuming they stay empty)
    if (targetChar === '') {
      updateCell(cell, '');
      completed++;
      if (completed === totalCells && callback) callback();
      return;
    }

    // Start spinning
    const interval = setInterval(() => {
      const randomChar = getRandomChar();
      cell.textContent = randomChar;
      cell.classList.remove('empty');
    }, intervalTime);

    // Stop sequentially (left-to-right, top-to-bottom)
    const stopDelay = baseDuration + (index * 150);

    setTimeout(() => {
      clearInterval(interval);
      updateCell(cell, targetChar);
      completed++;
      if (completed === totalCells && callback) callback();
    }, stopDelay);
  });
}

function getRandomChar() {
  const chars = 'MOGRITO';
  return chars[Math.floor(Math.random() * chars.length)];
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
