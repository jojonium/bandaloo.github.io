var canvas = document.getElementById("klotskicanvas");
var context = canvas.getContext("2d");
var directionsLabel = document.getElementById("directionslabel");

var width = 4;
var height = 5;
var cellWidth = canvas.width / width;
var cellHeight = canvas.height / height;

var boardX, boardY;
var pieceX = 0, pieceY = 0;
var holdX, holdY;
var mouseX, mouseY;

var mouseDown = false;

var dirIndex;

var borderWidth = 1;
var borderHeight = 1;

var initialMove = [0, 0];
var freeRange = [0, 0];

var grid = [[2, 2, 4, 4, 7],
            [1, 1, 6, 8, 0],
            [1, 1, 6, 9, 0],
            [3, 3, 5, 5, 10]];

var dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];

var colors = ["#111111", "#FFFFFF", "#54E827", "#FFF338", "#E8A427",
              "#FF612B", "#FF4941", "#D46FEB", "#6933FF", "#2373E8",
              "#26FFEF"]

function clearCanvas() {
  context.fillStyle = colors[0];
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function onBoard(xn, yn) {
  return xn >= 0 && xn < width && yn >= 0 && yn < height;
}

function lineFromDir(dir) {
  line = [];
  line.push(replaceZero(dir, 1));
  line.push(replaceZero(dir, -1));
  return line;
}

function replaceZero(dir, r) {
  dirCopy = dir.slice(0);
  for (var i = 0; i < 2; i++) {
    if (dirCopy[i] == 0) {
      dirCopy[i] = r;
    }
  }
  return dirCopy;
}

function transformLine(i, j, line) {
  linePositions = [];
  for (k = 0; k < 2; k++) {
    linePositions.push([(line[k][0] / 2 + i + 0.5) * cellWidth, 
                       (line[k][1] / 2 + j + 0.5) * cellHeight]);
  }
  return linePositions;
}

function drawRect(i, j, offsetX, offsetY) {
  var blockNumber = grid[i][j];
  context.fillStyle = colors[blockNumber];
  if (blockNumber != 0) {
    context.fillRect(i * cellWidth + offsetX, j * cellHeight + offsetY, cellWidth, cellHeight);
  }
}

function drawDot(x, y) {
  context.lineWidth = 0;
  context.beginPath();
  context.arc(x, y, 2, 0, 2 * Math.PI);
  context.closePath();
  context.fill();
}

function drawOutline(i, j, offsetX, offsetY, dots) {
  var blockNumber = grid[i][j];
  for (var k = 0; k < 4; k++) {
    var line = lineFromDir(dirs[k]);
    var linePositions = transformLine(i, j, line);
    var nPosX = i + dirs[k][0];
    var nPosY = j + dirs[k][1];
    if ((!(onBoard(nPosX, nPosY)) || grid[nPosX][nPosY] != blockNumber) && blockNumber != 0) {
      context.beginPath();
      context.moveTo(linePositions[0][0] + offsetX, linePositions[0][1] + offsetY);
      context.lineTo(linePositions[1][0] + offsetX, linePositions[1][1] + offsetY);
      context.lineWidth = (dots ? 4 : 8);
      context.stroke();
      if (dots) {
        drawDot(linePositions[0][0] + offsetX, linePositions[0][1] + offsetY);
        drawDot(linePositions[1][0] + offsetX, linePositions[1][1] + offsetY);
      }
    }
  }
}

function determineOffsets(i, j, draggedPieceNum) {
  var offsetX = 0;
  var offsetY = 0;
  if (mouseDown && draggedPieceNum == grid[i][j]) {
    var offsetX = mouseX - i * cellWidth - holdX % cellWidth + (i - pieceX) * cellWidth;
    var offsetY = mouseY - j * cellHeight - holdY % cellHeight + (j - pieceY) * cellHeight;
  }

  if (offsetX > freeRange[0] * cellWidth) offsetX = freeRange[0] * cellWidth;
  else if (offsetX < -freeRange[1] * cellWidth) offsetX = -freeRange[1] * cellWidth;

  if (offsetY > freeRange[0] * cellHeight) offsetY = freeRange[0] * cellHeight;
  else if (offsetY < -freeRange[1] * cellHeight) offsetY = -freeRange[1] * cellHeight;

  offsetX *= initialMove[0];
  offsetY *= initialMove[1];
  return [offsetX, offsetY];
}

function outlineBoard(selected) {
  if (!selected) {
    context.strokeStyle = colors[0];
  } else {
    context.strokeStyle = "#DDDDDD";
    context.fillStyle = "#DDDDDD";
  }
  for (var i = 0; i < width; i++) {
    for (var j = 0; j < height; j++) {
      if (!selected || grid[i][j] == grid[pieceX][pieceY]) {
        var offsets = determineOffsets(i, j, grid[pieceX][pieceY]);
        var dots = (selected ? true : false);
        drawOutline(i, j, offsets[0], offsets[1], dots);
      }
    }
  }
}

function drawBoard() {
  clearCanvas();
  var draggedPieceNum = grid[pieceX][pieceY];
  for (var i = 0; i < width; i++) {
    for (var j = 0; j < height; j++) {
      var offsets = determineOffsets(i, j, draggedPieceNum);
      drawRect(i, j, offsets[0], offsets[1]);
    }
  }
  outlineBoard(false);
  outlineBoard(true);
}

function setFreeRange() {
  var blockNum = grid[pieceX][pieceY];
  var blockPositions = getBlockPositions(blockNum);
  var freeFront = freeAmount(blockNum, initialMove, blockPositions);
  var nInitialMove = [-initialMove[0], -initialMove[1]];
  var freeBack = freeAmount(blockNum, nInitialMove, blockPositions);
  freeRange = [freeFront, freeBack];
}

canvas.addEventListener('mousemove', function(e) {
  boardCoord = mouseToBoard(e);
  boardX = boardCoord[0];
  boardY = boardCoord[1];
  mouseX = boardCoord[2];
  mouseY = boardCoord[3];
  // drag piece
  if (mouseDown) {
    if (Math.abs(holdX - mouseX) > Math.abs(holdY - mouseY)) {
      initialMove = [1, 0];
      setFreeRange();
    } else if (Math.abs(holdX - mouseX) < Math.abs(holdY - mouseY)) {
      initialMove = [0, 1];
      setFreeRange();
    } else {
      initialMove = [0, 0];
    }
    drawBoard();
  }
});


function mouseToBoard(e) {
  var rect = canvas.getBoundingClientRect();
  var clickX = e.clientX - rect.left;
  var clickY = e.clientY - rect.top;
  var cellX = Math.floor(clickX / cellWidth);
  var cellY = Math.floor(clickY / cellHeight);
  if (cellX > width - 1) cellX = width - 1;
  if (cellY > height - 1) cellY = height - 1;
  return [cellX, cellY, clickX, clickY];
}

canvas.addEventListener('mousedown', function(e) {
  pieceCoord = mouseToBoard(e);
  pieceX = pieceCoord[0];
  pieceY = pieceCoord[1];
  holdX = pieceCoord[2];
  holdY = pieceCoord[3];
  mouseDown = true;
});

document.addEventListener('mouseup', function(e) {
  if (mouseDown) {
    var moveBoardX = -Math.round((holdX - mouseX) / cellWidth);
    var moveBoardY = -Math.round((holdY - mouseY) / cellHeight);

    if (moveBoardX > freeRange[0]) moveBoardX = freeRange[0];
    else if (moveBoardX < -freeRange[1]) moveBoardX = -freeRange[1];
    if (moveBoardY > freeRange[0]) moveBoardY = freeRange[0];
    else if (moveBoardY < -freeRange[1]) moveBoardY = -freeRange[1];

    moveBoardX *= initialMove[0];
    moveBoardY *= initialMove[1];

    var blockNum = grid[pieceX][pieceY];
    movePieces(blockNum, [moveBoardX, moveBoardY], getBlockPositions(blockNum));
    mouseDown = false;
    drawBoard();
  }
});

document.addEventListener('keydown', function(e) {
  var code = e.keyCode;
  var key = String.fromCharCode(code);
  var doPush= true;
  dirIndex = -1;
  if (key == 'A' || code == 37) {
    dirIndex = 2;
  } else if (key == 'S' || code == 40) {
    dirIndex = 1;
  } else if (key == 'W' || code == 38) {
    dirIndex = 3;
  } else if (key == 'D' || code == 39) {
    dirIndex = 0;
  }
  if (dirIndex != -1) {
    makeMove(grid[pieceX][pieceY], dirIndex);
  }
});

function getBlockPositions(blockNum) {
  var blockPositions = [];
  for (var i = 0; i < width; i++) {
    for (var j = 0; j < height; j++) {
      if (grid[i][j] == blockNum) {
        blockPositions.push([i, j]);
      }
    }
  }
  return blockPositions;
}

function freeAmount(blockNum, dir, blockPositions) {
  var count = 0;
  while (true) {
    for (var k = 0; k < blockPositions.length; k++) {
      var nPosX = blockPositions[k][0] + dir[0] + dir[0] * count;
      var nPosY = blockPositions[k][1] + dir[1] + dir[1] * count;
      // if not free
      if (!(onBoard(nPosX, nPosY) && 
        (grid[nPosX][nPosY] == blockNum || grid[nPosX][nPosY] == 0))) {
        return count;
      }
    }
    count++;
  }
}

function movePieces(blockNum, dir, blockPositions) {
  for (var k = 0; k < blockPositions.length; k++) {
    grid[blockPositions[k][0]][blockPositions[k][1]] = 0;
  }
  for (var k = 0; k < blockPositions.length; k++) {
    var nPosX = blockPositions[k][0] + dir[0];
    var nPosY = blockPositions[k][1] + dir[1];
    grid[nPosX][nPosY] = blockNum;
  }
  pieceX += dir[0];
  pieceY += dir[1];
  drawBoard();
  checkWin();
}

function makeMove(blockNum, dirIndex) {
  var blockPositions = getBlockPositions(blockNum);
  var free = (freeAmount(blockNum, dirs[dirIndex], blockPositions) != 0);
  if (free) {
    movePieces(blockNum, dirs[dirIndex], blockPositions);
  }
}

function checkWin() {
  if (grid[1][4] == 1 && grid[2][4] == 1
    && grid[1][3] == 1 && grid[2][3] == 1) {
    directionsLabel.innerHTML = "you won!";
  }
}

drawBoard();
