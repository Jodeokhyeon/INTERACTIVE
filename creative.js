let foot = [];
let footprints = [];
let traceImages = [];
let footIndex = 0;

let scrollY = 0;
let scrollTargetY = 0;
let isScrollingY = false;

let scrollX = 0;
let scrollTargetX = 0;
let isScrollingX = false;

let currentDirection;
let stepCount = 0;
let firstStepDone = false;
let groupCounter = 0;

let stepSound;
let isEnded = false;
let hasSongEndedNaturally = false;
let zoom = 1.0;
let zoomTarget = 1.0;

function preload() {
  foot[0] = loadImage('foot 1.png');
  foot[1] = loadImage('foot 2.png');
  stepSound = loadSound('Billy Joel - Piano Man.mp3');
}

function setup() {
  createCanvas(windowWidth, windowHeight); // ✅ 아이패드 대응
  imageMode(CENTER);
  noStroke();
  smooth();

  currentDirection = createVector(0, -1);
  createFirstFoot();

  let btn = select('#resetButton');
  btn.mousePressed(resetJourney);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(0);

  if (!hasSongEndedNaturally && stepSound.isLoaded() && stepSound.duration() > 0 && stepSound.currentTime() >= stepSound.duration() - 0.5) {
    hasSongEndedNaturally = true;
    isEnded = true;
  }

  zoom += (zoomTarget - zoom) * 0.05;
  push();
  scale(zoom);

  if (isEnded && (footprints.length + traceImages.length) > 0) {
    let all = footprints.concat(traceImages);

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (let t of all) {
      minX = min(minX, t.x);
      maxX = max(maxX, t.x);
      minY = min(minY, t.y);
      maxY = max(maxY, t.y);
    }

    let centerX = (minX + maxX) / 2;
    let centerY = (minY + maxY) / 2;

    let traceWidth = maxX - minX;
    let traceHeight = maxY - minY;

    let margin = 200;
    let scaleX = (width - margin) / traceWidth;
    let scaleY = (height - margin) / traceHeight;
    zoomTarget = min(scaleX, scaleY, 1.0);

    translate((width / 2) / zoom - centerX, (height / 2) / zoom - centerY);
  } else {
    if (isScrollingY) {
      let diffY = scrollTargetY - scrollY;
      scrollY += diffY * 0.05;
      if (abs(diffY) < 0.5) {
        scrollY = scrollTargetY;
        isScrollingY = false;
      }
    }

    if (isScrollingX) {
      let diffX = scrollTargetX - scrollX;
      scrollX += diffX * 0.05;
      if (abs(diffX) < 0.5) {
        scrollX = scrollTargetX;
        isScrollingX = false;
      }
    }

    translate(-scrollX, -scrollY);
  }

  drawDreamyBackground();

  for (let i = footprints.length - 1; i >= 0; i--) {
    let fp = footprints[i];
    let now = millis();

    if (!fp.fadeOut) {
      let fadeInElapsed = now - fp.fadeInStart;
      fp.alpha = map(fadeInElapsed, 0, 1500, 0, 255, true);
    }

    if (fp.fadeOut) {
      let fadeOutElapsed = now - fp.fadeStart;
      fp.alpha = map(fadeOutElapsed, 0, 3000, 255, 0, true);

      if (fp.alpha <= 0) {
        traceImages.push({
          x: fp.x,
          y: fp.y,
          angle: fp.angle,
          img: fp.img,
          startTime: millis()
        });
        footprints.splice(i, 1);
        continue;
      }
    }

    drawDreamyEffect(fp.x, fp.y, fp.alpha);

    push();
    translate(fp.x, fp.y);
    rotate(fp.angle);
    tint(255, fp.alpha);
    image(fp.img, 0, 0, 70, 90);
    pop();
  }

  for (let i = traceImages.length - 1; i >= 0; i--) {
    let t = traceImages[i];
    let alpha = 80;

    push();
    translate(t.x, t.y);
    rotate(t.angle);
    scale(0.95);
    tint(255, alpha * 0.9);
    image(t.img, 0, 0, 70, 90);
    pop();
  }

  pop();

  if (isEnded) {
    drawEndingMessage();
  }
}

function touchStarted() {
  // ✅ iOS 오디오 재생 활성화
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume();
  }

  if (isEnded) return false;

  let adjustedX = mouseX + scrollX;
  let adjustedY = mouseY + scrollY;

  for (let i = 0; i < footprints.length; i++) {
    let fp = footprints[i];
    let d = dist(adjustedX, adjustedY, fp.x, fp.y);
    if (d < 40 && !fp.fadeOut) {
      let groupIdToFade = fp.groupId;

      for (let j = 0; j < footprints.length; j++) {
        let other = footprints[j];
        if (other.groupId === groupIdToFade && !other.fadeOut) {
          other.fadeOut = true;
          other.fadeStart = millis();
        }
      }

      if (fp.y - scrollY < 150) {
        scrollTargetY -= 300;
        isScrollingY = true;
      } else {
        scrollTargetY -= 60;
        isScrollingY = true;
      }

      if (fp.x - scrollX < 150) {
        scrollTargetX -= 300;
        isScrollingX = true;
      }

      if (fp.x - scrollX > width - 150) {
        scrollTargetX += 300;
        isScrollingX = true;
      }

      if (!stepSound.isPlaying()) {
        stepSound.play();
      }

      if (!firstStepDone) {
        setTimeout(() => {
          if (!isEnded) {
            createFirstStepSet();
            firstStepDone = true;
            stepSound.pause();
          }
        }, 2000);
      } else {
        setTimeout(() => {
          if (!isEnded) {
            createNextFootSet();
            stepSound.pause();
          }
        }, 2000);
      }

      break;
    }
  }

  return false;
}

function createFirstStepSet() {
  createFootSet(100, 35);
}

function createNextFootSet() {
  createFootSet(75, 35);
}

function createFootSet(stepSize, offsetX) {
  let prev = footprints.length > 0
    ? footprints[footprints.length - 1]
    : { x: width / 2, y: height - 45, angle: 0 };

  let thisGroupId = groupCounter++;

  for (let i = 0; i < 2; i++) {
    let isLeft = footIndex === 0;
    let success = false;
    let attempts = 0;
    let nextX, nextY, angle;

    while (!success && attempts < 15) {
      let angleChoice = random([-0.5, -0.25, 0, 0.25, 0.5]);
      currentDirection = createVector(sin(angleChoice), -cos(angleChoice)).normalize();

      let stepVec = p5.Vector.mult(currentDirection, stepSize);
      nextX = prev.x + (isLeft ? -offsetX : offsetX) + stepVec.x;
      nextY = prev.y + stepVec.y;

      let prevAngle = prev.angle || 0;
      angle = prevAngle + random(-0.1, 0.1);

      let overlapping = footprints.some(fp =>
        abs(nextX - fp.x) < 40 || abs(nextY - fp.y) < 40
      );

      if (!overlapping) success = true;
      attempts++;
    }

    footprints.push({
      x: nextX,
      y: nextY,
      angle: angle,
      img: foot[footIndex],
      fadeOut: false,
      fadeStart: null,
      fadeInStart: millis(),
      alpha: 0,
      groupId: thisGroupId
    });

    footIndex = (footIndex + 1) % foot.length;
    prev = { x: nextX, y: nextY, angle: angle };
    stepCount++;
  }
}

function drawDreamyBackground() {
  noStroke();
  let time = millis() * 0.0005;
  let startY = scrollY - height * 1.5;
  let endY = scrollY + height * 2;

  for (let y = startY; y < endY; y += 10) {
    let t = map(scrollY, 0, 3000, 0, 1);
    let colorA = lerpColor(color(255, 200, 250), color(200, 150, 255), sin(t + time + 0.5));
    let colorB = lerpColor(color(150, 250, 255), color(255, 255, 200), cos(t + time + 0.3));
    let colorC = lerpColor(color(255, 220, 150), color(200, 255, 200), sin(t + time + 1.0));
    let inter = map(y, startY, endY, 0, 1);
    let c1 = lerpColor(colorA, colorB, inter);
    let cFinal = lerpColor(c1, colorC, 0.5 + 0.5 * sin(y * 0.01 + time));
    fill(cFinal);
    rect(-width * 2, y, width * 4, 10);
  }
}

function drawDreamyEffect(x, y, alpha) {
  for (let r = 100; r > 0; r -= 10) {
    fill(255, 255, 255, alpha * (r / 100) * 0.3);
    ellipse(x, y, r);
  }
}

function drawEndingMessage() {
  push();
  resetMatrix();
  textAlign(CENTER, CENTER);
  textSize(36);
  fill(255, 240);
  text("여정이 끝났습니다", width / 2, height / 2);
  pop();
}

function keyPressed() {
  if (key === 'T') {
    isEnded = true;
    hasSongEndedNaturally = true;
  }
}

function resetJourney() {
  footprints = [];
  traceImages = [];
  scrollX = 0;
  scrollY = 0;
  scrollTargetX = 0;
  scrollTargetY = 0;
  isScrollingX = false;
  isScrollingY = false;
  footIndex = 0;
  stepCount = 0;
  groupCounter = 0;
  firstStepDone = false;
  zoom = 1.0;
  zoomTarget = 1.0;
  isEnded = false;
  hasSongEndedNaturally = false;

  if (stepSound.isPlaying()) {
    stepSound.stop();
  }

  createFirstFoot();
}

function createFirstFoot() {
  let x = width / 2;
  let y = height - 45;
  footprints.push({
    x: x,
    y: y,
    angle: 0,
    img: foot[footIndex],
    fadeOut: false,
    fadeStart: null,
    fadeInStart: millis(),
    alpha: 0,
    groupId: groupCounter++
  });
  footIndex = (footIndex + 1) % foot.length;
}
