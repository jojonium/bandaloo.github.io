"use strict"
var canvas = document.getElementById("lifecanvas");
var context = canvas.getContext("2d");

var board = [];
var ageGrid = [];

const DEAD = 0;
const ALIVE = 1;
const WRAP = 2;

var edge = WRAP;

const DIE = 0;
const STAY = 1;
const BOTH = 2;
const BIRTH = 3;

const ruleStrings = ['Die', 'Stay', 'Both', 'Birth'];

const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

// cave rules
//var rules = [DIE, DIE, DIE, STAY, STAY, BOTH, BOTH, BOTH, BOTH];
var rules = [DIE, DIE, STAY, BOTH, DIE, DIE, DIE, DIE, DIE]

var prevTime = 0;

var isClicked = true;

var delay = 400;
var animTime = 0;

var prevBoard = [];

const boardWidth = 52;
const boardHeight = 32;

const cellWidth = canvas.width / boardWidth;
const cellHeight = canvas.height / boardHeight;

const ruleColors = ["#FC1817", "#3B6CFF", "#36EB41", "#FFDD3D"];

var gamePaused = false;

var clicked = false;

//var cellColor = rgba(255, 112, 1);
const buttonColor = rgba(255, 112, 1);

const playColor = rgba(0);
const pausedColor = rgba(30, 30, 30);

var backgroundColor = playColor;

var ruleButtons = [];
var speedButtons = [];
//var edgeButtons = [];

var pauseButton = document.getElementById("pausebutton");
var randomizeButton = document.getElementById("randomizebutton");
var shareTextArea = document.getElementById("sharetextarea");

// TODO put these into a corners object
var currentX1;
var currentY1;
var currentX2;
var currentY2;

var paintVal;

Array.prototype.createNumberGrid = function(width, height, number) {
  for (let i = 0; i < width; i++) {
    this.push([]);
    for (let j = 0; j < height; j++) {
      this[i].push(number);
    }
  }
}

Number.prototype.mod = function(n) {
  return ((this + n) % n);
}

prevBoard.createNumberGrid(boardWidth, boardHeight, 0);

function getSpeedButtons() {
  let names = ["slowbutton", "mediumbutton", "fastbutton"];
  for (let i = 0; i < names.length; i++)
    speedButtons.push(document.getElementById(names[i]));
  speedButtons[1].style.background = buttonColor;
}

function getRuleButtons() {
  for (let i = 0; i < 9; i++) {
    ruleButtons.push(document.getElementById("button" + i));
  }
}

function changeSpeed(i, speedDelay) {
  for (let i = 0; i < speedButtons.length; i++) {
    speedButtons[i].style.background = "#4c4c4c";
  }
  delay = speedDelay;
  speedButtons[i].style.background = buttonColor;
}

function setRuleButton(i) {
  ruleButtons[i].innerHTML = "<strong>" + i + ":</strong> " + ruleStrings[rules[i]];
  ruleButtons[i].style.background = ruleColors[rules[i]];
}

function setRuleButtons() {
  for (let i = 0; i < ruleButtons.length; i++) {
    setRuleButton(i);
  }
}

function posInbounds(i, j) {
  return i >= 0 && i < boardWidth && j >= 0 && j < boardHeight;
}

function changeRules(i) {
  rules[i]++;
  rules[i] %= 4;
  setRuleButton(i);
  setTextArea();
}

function countNeighbors(iCurrent, jCurrent) {
  let count = 0;
  for (let k = 0; k < 8; k++) {
    let iNeighbor = iCurrent + dirs[k][0];
    let jNeighbor = jCurrent + dirs[k][1];
    if (edge == WRAP) {
      iNeighbor = iNeighbor.mod(boardWidth);
      jNeighbor = jNeighbor.mod(boardHeight);
    }
    if (posInbounds(iNeighbor, jNeighbor)) {
      if (board[iNeighbor][jNeighbor])
        count++;
    } else {
      if (edge == ALIVE)
        count++
    }
  }
  return count;
}

function setTextArea() {
  //let boardChars = binToChars(boardToBinary());
  setCorners();
  let boardChars = encodeBoard();

  let rulesStr = ""; // binary string of bits representing rules
  for (let i = 0; i < rules.length; i++) {
    rulesStr += rules[i].toString(2).padStart(2, '0');
  }
  let posChars = "";
  if (currentX1 != 0 && currentY1 != 0 && currentX2 != boardWidth - 1 && currentY2 != boardHeight - 1) {
    posChars = encodeNum(currentX1) + encodeNum(currentY1) + encodeNum(currentX2) + encodeNum(currentY2) + ".";
  }
  let boardText = "?b=" + posChars + boardChars;
  let ruleText = "&r=" + binToB64(rulesStr);
  shareTextArea.innerHTML = window.location.href.split('?')[0] + boardText + ruleText;
}

function stepBoard() {
  let tempBoard = [];
  tempBoard.createNumberGrid(boardWidth, boardHeight, 0);
  prevBoard = board;
  for (let i = 0; i < boardWidth; i++) {
    for (let j = 0; j < boardHeight; j++) {
      switch(rules[countNeighbors(i, j)]) {
      case STAY:
        tempBoard[i][j] = board[i][j]
        ageGrid[i][j]++;
        break;
      case BOTH:
        tempBoard[i][j] = 1;
        if (board[i][j] == 0)
          ageGrid[i][j] = 1;
        else
          ageGrid[i][j]++;
        break;
      case BIRTH:
        if (board[i][j] == 0) {
          tempBoard[i][j] = 1;
          ageGrid[i][j] = 1;
          ageGrid[i][j]++;
        }
        break;
      }
    }
  }
  board = tempBoard;
  setTextArea();
}

function setCorners() {
  currentX1 = undefined;
  currentY1 = undefined;
  currentX2 = undefined;
  currentY2 = undefined;

  // TODO there is definitely a more clever way to do this
  for (let i = 0; i < boardWidth; i++) {
    for (let j = 0; j < boardHeight; j++) {
      if (board[i][j]) {
        if (currentX1 === undefined || currentX1 > i) {
          currentX1 = i;
        }
        if (currentY1 === undefined || currentY1 > j) {
          currentY1 = j;
        }
        if (currentX2 === undefined || currentX2 < i) {
          currentX2 = i;
        }
        if (currentY2 === undefined || currentY2 < j) {
          currentY2 = j;
        }
      }
    }
  }

  if (currentX1 === undefined) {
    currentX1 = 0;
    currentY1 = 0;
    currentX2 = 0;
    currentY2 = 0;
  }
}

function update(currTime) {
  let deltaTime = currTime - prevTime;
  prevTime = currTime;

  drawBoard();
  animTime += deltaTime;
  if (!gamePaused) {
    if (animTime >= delay) {
      stepBoard();
      animTime = 0;
    }
  }
  requestAnimationFrame(update);
}

function clearScreen() {
  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function clearBoard() {
  board = []
  board.createNumberGrid(boardWidth, boardHeight, 0);
  setTextArea();
}

function pause() {
  gamePaused = !gamePaused;
  backgroundColor = gamePaused? pausedColor : playColor;
  pauseButton.innerHTML = gamePaused ? "Play" : "Pause";
}

function randomize() {
  for (let i = 0; i < boardWidth; i++) {
    for (let j = 0; j < boardHeight; j++) {
      board[i][j] = Math.floor(2 * Math.random());
      ageGrid[i][j] = 0;
    }
  }
  setTextArea();
}

document.addEventListener('keydown', function(e) {
  var code = e.keyCode;
  var key = String.fromCharCode(code);
  if (key == 'P') {
    pause();
  } else if (key == 'Z') {
    randomize();
  }
});

// TODO group clicks and board positions into objects
function clickToBoard(e) {
  let rect = canvas.getBoundingClientRect();
  let clickX = e.clientX - rect.left;
  let clickY = e.clientY - rect.top;
  let boardX = Math.floor(clickX / cellWidth);
  let boardY = Math.floor(clickY / cellHeight);
  if (boardX > canvas.width - 1) boardX = canvas.width - 1;
  if (boardY > canvas.height - 1) boardY = canvas.height - 1;
  return {x: boardX, y: boardY};
}

function placeCell({x: boardX, y: boardY}) {
  board[boardX][boardY] = paintVal;
  ageGrid[boardX][boardY] = 0;
  setTextArea();
}

canvas.addEventListener('mousedown', function(e) {
  clicked = true;
  /*
  if (!gamePaused) // TODO might be fun to to paint while board is moving
    pause();
  */
  let pos = clickToBoard(e);
  paintVal = !board[pos.x][pos.y] | 0;
  placeCell(clickToBoard(e));
});

canvas.addEventListener('mousemove', function(e) {
  let pos = clickToBoard(e);
  if (clicked)
    placeCell(clickToBoard(e));
});

canvas.addEventListener('mouseup', function(e) {
  clicked = false;
});

board.createNumberGrid(boardWidth, boardHeight, 0);
ageGrid.createNumberGrid(boardWidth, boardHeight, 0);

var initialBoard = getVariable('b'); // TODO this leaks into global scope forever
//var initialX1 = 0;
//var initialY1 = 0;
//var initialWidth = boardWidth;
//var initialHeight = boardHeight;

if (initialBoard) {
  let boardArgs = initialBoard.split('.');
  initialBoard = boardArgs[boardArgs.length - 1];
  if (boardArgs.length > 1) {
    let cornerStr = boardArgs[0];
    currentX1 = decodeChar(cornerStr.charAt(0));
    currentY1 = decodeChar(cornerStr.charAt(1));
    currentX2 = decodeChar(cornerStr.charAt(2));
    currentY2 = decodeChar(cornerStr.charAt(3));
  } else {
    currentX1 = 0;
    currentY1 = 0;
    currentX2 = boardWidth - 1;
    currentY2 = boardHeight - 1;
  }
  decodeBoard(initialBoard);
  pause();
} else {
  randomize();
}

var initialRules = getVariable('r');
if (initialRules) {
  initialRules = b64ToBin(initialRules);

  for (let i = 0; i < 9; ++i) {
    rules[i] = parseInt(initialRules.substring(i * 2, (i * 2) + 2), 2);
  }
}

getRuleButtons();
setRuleButtons();
getSpeedButtons();

setTextArea();

update(0);
