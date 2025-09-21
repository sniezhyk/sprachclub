const slider = document.getElementById("event-slider");
const GAP = 20; 

function getChildren() {
  return Array.from(slider.children);
}

function computeTotalContentWidth() {
  const children = getChildren();
  return (
    children
      .map((child) => child.getBoundingClientRect().width)
      .reduce((a, b) => a + b, 0) +
    GAP * Math.max(0, children.length - 1)
  );
}

function computeOffsetToCenter(index) {
  const children = getChildren();   // 👈 gefixt
  if (children.length === 0) return 0;

  const clampedIndex = Math.min(Math.max(0, index), children.length - 1);

  const sum =
    new Array(clampedIndex)
      .fill(0)
      .map((_, i) => children[i].getBoundingClientRect().width)
      .reduce((a, b) => a + b, 0) +
    GAP * clampedIndex;

  const centerOfChild =
    sum + children[clampedIndex].getBoundingClientRect().width / 2;
  const viewportWidth = slider.getBoundingClientRect().width;
  let desiredOffset = centerOfChild - viewportWidth / 2;

  const totalContentWidth = computeTotalContentWidth();
  const maxOffset = Math.max(0, totalContentWidth - viewportWidth);
  if (desiredOffset < 0) desiredOffset = 0;
  if (desiredOffset > maxOffset) desiredOffset = maxOffset;

  return desiredOffset;
}

function moveToIndex(index) {
  const children = getChildren();   // 👈 gefixt
  if (children.length === 0) return;

  const clampedIndex = Math.min(Math.max(0, index), children.length - 1);
  const offset = computeOffsetToCenter(clampedIndex);

  slider.style.transform = `translateX(-${offset}px)`;
}

let currentIndex = 0;

document
  .getElementById("carousel-left-button")
  .addEventListener("click", () => {
    currentIndex = Math.max(0, currentIndex - 1);
    moveToIndex(currentIndex); 
  });

document
  .getElementById("carousel-right-button")
  .addEventListener("click", () => {
    const children = getChildren();   // 👈 gefixt
    currentIndex = Math.min(children.length - 1, currentIndex + 1);
    moveToIndex(currentIndex);
  });

window.addEventListener("resize", () => {
  moveToIndex(currentIndex);
});

window.addEventListener("load", () => {
  moveToIndex(currentIndex);
});

let direction = true;
setInterval(() => {
  const children = getChildren();   // 👈 gefixt
  currentIndex = direction ? currentIndex + 1 : currentIndex - 1;
  if (currentIndex >= children.length) {
    currentIndex = children.length - 2;
    direction = false;
  } else if (currentIndex < 0) {
    currentIndex = 0;
    direction = true;
  }
  moveToIndex(currentIndex);
}, 3000);
