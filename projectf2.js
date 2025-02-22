// Cole Granof
// 2/23/18
// Computer Graphics: Final Project Part II
// Extra Credit Features from Part I:
// - Press 'r' to randomize all the shapes and colors of items on the mobile
// - Press 'R' to give the mobile a whirl and randomize the rotations
// - Press 's' to speed up the animation
// - Press 'S' to slow down the animation
// - The bars that hold up items are 3D shaded objects instead of 2D lines

const numCubeVertices  = 36; // Number of vertices in cube

var shifted = false; // Whether shift key is being pressed
var randomizeColor = false; // Whether to change color of objects in next traversal
var randomizeRotations = false; // Whether to randomize the rotations mobile in next traversal
var speedScalar = 1; // What number to multiply the change in angle by

var numTimesToSubdivide = 4;

// Arrays for points and vertex normals of cube
var cubePoints = [];
var cubeVertexNormals = [];

// Arrays for points and vertex normals of sphere
var spherePoints = [];
var sphereVertexNormals = [];

// Arrays for points and vertex normals of cube and sphere combined, as well as texture coordinates
var pointsArray = [];
var normalsArray = [];
var texCoordsArray = [];
var curNormals;

// Array for face normals of cube and sphere compbined
var faceNormals = [];

// Variables used to set up rendering
var gl;
var program;
var program2;

var fovy = 45.0;  // Field of view in y direction in degrees
var aspect;  // Viewport aspect ratio

// Stack used to push and pop model view matrices
var stack = [];

// Model view and projection matrices and locations
var mvMatrix, pMatrix;
var modelView, projection;

// Shadow projection matrix
var sMatrix;

// Variable used for keeping track of height during traversal for shadows
var height;

// Constants to set up projection matrix
const eye = vec3(0, 3, 15);
const at = vec3(0.0, -5.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

// Constants used to generate points for sphere through subdivision
const va = vec4(0.0, 0.0, -1.0,1);
const vb = vec4(0.0, 0.942809, 0.333333, 1);
const vc = vec4(-0.816497, -0.471405, 0.333333, 1);
const vd = vec4(0.816497, -0.471405, 0.333333,1);

// Vectors used to define lighting
var lightPosition = vec4(10.0, 10.0, 5.0, 0.0);
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

// Vectors used to define material properties of how light effects color
var materialAmbient = vec4(1.0, 1.0, 1.0, 1.0);
var materialDiffuse = vec4(1.0, 0.8, 0.0, 1.0);
var materialSpecular = vec4(1.0, 1.0, 1.0, 1.0);
var materialShininess = 20.0;

// Angle used for spotlight
var phi = 0.9;

// Multiply light matrices by material matrices
var ambientProduct = mult(lightAmbient, materialAmbient);
var specularProduct = mult(lightSpecular, materialSpecular);

// Arrays to store images
var envImages = [];
var roomImages = [];

var lightMode = 1;
var drawShadows = true;

// Texture coordinates for quad
var texCoords = [vec2(0.0, 0.0), vec2(0.0, 1.0), vec2(1.0, 1.0), vec2(1.0, 0.0)];

// Constructor for an object that hangs on mobile
function Item(leftItem, rightItem, distance, angle, speed, color, drawFunc) {
	this.leftItem = leftItem; // Item hanging off of left
	this.rightItem = rightItem; // Item hanging off of right
	this.distance = distance; // How far away the object rotates from the center of the previous level
	this.angle = angle; // Current angle of object
	this.speed = speed; // How fast the rotation is
	this.color = color; // Color of object
	this.drawFunc = drawFunc; // The draw function that is passed into constructor
}

// Textures to use when image hasn't been loaded
var red = new Uint8Array([255, 0, 0, 255]);
var green = new Uint8Array([0, 255, 0, 255]);
var blue = new Uint8Array([0, 0, 255, 255]);
var cyan = new Uint8Array([0, 255, 255, 255]);
var magenta = new Uint8Array([255, 0, 255, 255]);
var yellow = new Uint8Array([255, 255, 0, 255]);

// Construct the tree
var itemR = new Item(null, null, -1, 0, 2, vec4(1, 0, 0, 1), drawCube);
var itemG = new Item(null, null, 1, 0, 2, vec4(0, 1, 0, 1), drawSphere);
var itemB = new Item(itemR, itemG, 3, 0, -1, vec4(0, 0, 1, 1), drawCube);

var itemO = new Item(null, null, -1, 0, 2, vec4(1.0, 0.4, 0.0, 1.0), drawCube);
var itemC = new Item(null, null, 1, 0, 2, vec4(0.0, 1.0, 1.0, 1.0), drawSphere);
var itemY = new Item(itemO, itemC, -3, 0, -1, vec4(1.0, 1.0, 0.0, 1.0), drawSphere);

// Top of the mobile
var itemM = new Item(itemB, itemY, 0, 0, 0.5, vec4(1, 0, 1, 1), drawCube);

// Called to change shading by switching the normals stored in the buffer
function setLighting(normals) {
	var nBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
}

// Zeros out all lighting vectors for drawing shadows
function darkenLight() {
	gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(vec4(0, 0, 0, 0)));
	gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(vec4(0, 0, 0, 0)));
	gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(vec4(0, 0, 0, 0)));
}

// Resets all lighting vectors for drawing objects
function resetLight() {
	gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct));
	gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct));
}

// Draws the crossbar for an item
function drawBar(item) {
	if (item != null) {
		// scale then rotate a cube to form a bar
		mvMatrix = mult(mvMatrix, translate(0, -1.1, item.distance / 2))
		mvMatrix = mult(mvMatrix, scalem(0.1, 0.1, item.distance))
		gl.uniformMatrix4fv(modelView, false, flatten(mvMatrix));
		drawCube(vec4(0.2, 0.2, 0.2, 1.0));

		// Restore model view matrix
		mvMatrix = stack.pop();
		stack.push(mvMatrix);
	}
}

function drawRoom() {
	gl.useProgram(program2);
	//wallShaderInit();
	stack.push(mvMatrix);

	//mvMatrix = mult(mvMatrix, translate(-4, 0, 0));
	mvMatrix = mult(mvMatrix, scalem(30, 30, 30));
	mvMatrix = mult(mvMatrix, rotateY(45));
	drawWalls();
	mvMatrix = mult(translate(0, 4.9, 0), mvMatrix);
	drawWalls();

	// Restore model view matrix
	mvMatrix = stack.pop();
	gl.useProgram(program);
	drawInit();
}

// Draws shadow of item
function drawShadow(item) {
	var lightTransformed = mult(inverse4(mvMatrix), lightPosition);
	mvMatrix = mult(mvMatrix, translate(lightTransformed[0], lightTransformed[1], lightTransformed[2]));
	// Set the shadow matrix based on the current lighting position
	sMatrix = mat4();
	sMatrix[3][3] = 0.0;
	sMatrix[3][1] = -1.0 / lightTransformed[1];
	mvMatrix = mult(mvMatrix, sMatrix);
	mvMatrix = mult(mvMatrix, translate(-lightTransformed[0], -lightTransformed[1], -lightTransformed[2]));
	var scalar = -(10 + height) * 0.1;
	// Multiply in reverse order so it happens first
	mvMatrix = mult(translate(scalar * lightPosition[0], scalar * lightPosition[1], scalar * lightPosition[2]), mvMatrix);
	darkenLight();
	item.drawFunc(vec4(0, 0, 0, 1.0));
	resetLight();
	mvMatrix = stack.pop();
	stack.push(mvMatrix);
}

// Traverses the tree structure and draws objects and crossbars
function traverse(item) {
	if (item == null) return;
	item.angle += item.speed * speedScalar;

	// Does randomization if either of the randomize booleans are set
	if (randomizeColor) {
		item.color = vec4(Math.random(), Math.random(), Math.random());
		var drawFuncs = [drawCube, drawSphere];
		var index = Math.floor(Math.random() * 2);
		item.drawFunc = drawFuncs[index];
	}
	if (randomizeRotations) {
		item.speed = (Math.random() - 0.5) * 4;
	}

	// Performs rotations and translations to be used for drawing current level of mobile
	mvMatrix = mult(mvMatrix, translate(0, -2.5, item.distance));
	mvMatrix = mult(mvMatrix, rotateY(item.angle));
	stack.push(mvMatrix);
	height -= 2.5;

	// Draws item
	item.drawFunc(item.color);

	mvMatrix = stack.pop()
	stack.push(mvMatrix)

	// Draw shadow
	if (drawShadows)
		drawShadow(item);

	// Draws both bars below
	drawBar(item.leftItem);
	drawBar(item.rightItem);

	// Traverse left item, restores model view matrix by popping before traversing right item
	traverse(item.leftItem);
	mvMatrix = stack.pop();
	traverse(item.rightItem);
	height += 2.5;
	return;
}

// Bind buffers and get pointers needed for drawing
function drawInit() {
	var pBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

	var vPosition = gl.getAttribLocation(program,  "vPosition");
	gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition);

	var nBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(curNormals), gl.STATIC_DRAW );

	var vNormal = gl.getAttribLocation(program, "vNormal");
	gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vNormal);

	//textureInit();

	//createATexture(); //TODO check if this should have been removed
}

function wallShaderInit() {
	gl.useProgram(program2);

	var pBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

	var vPosition = gl.getAttribLocation(program,  "t_vPosition");
	gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition);

	var tBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);

	var vTexCoord = gl.getAttribLocation(program2, "vTexCoord");
	gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vTexCoord);

	gl.useProgram(program);
	//drawInit();
}

// Resets the diffuse product in the shader to change the color of an object
function setDiffuse(color) {
	var diffuseProduct = mult(lightDiffuse, color);
	gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct));
}

// Function that is repeatedly called to render entire scene
function render() {
	// Set the projection matrix
	pMatrix = perspective(fovy, aspect, .1, 100);
	gl.uniformMatrix4fv(projection, false, flatten(pMatrix));

	gl.useProgram(program2);
	//wallShaderInit();
	gl.uniformMatrix4fv(projection2, false, flatten(pMatrix));
	gl.useProgram(program);
	drawInit();

	// Set the model view matrix to the regular matrix and light direction
	mvMatrix = lookAt(eye, at , up);

	height = 0;

	drawRoom();
	// Start tree traversal starting from root
	traverse(itemM);

	// Sets randomize booleans back to false so the mobile isn't constantly changing after key press
	if (randomizeColor) {
		randomizeColor = false;
	}

	if (randomizeRotations) {
		randomizeRotations = false;
	}

	// Render again
	requestAnimFrame(render)
}

// Sets the diffuse lighting color and draws the points corresponding to the cube in the buffer
function drawCube(color, program = null) {
	gl.uniformMatrix4fv(modelView, false, flatten(mvMatrix));
	setDiffuse(color);
	gl.drawArrays(gl.TRIANGLES, 0, cubePoints.length);
}

function drawWalls() {
	gl.uniformMatrix4fv(modelView2, false, flatten(mvMatrix));
	gl.drawArrays(gl.TRIANGLES, 0, cubePoints.length);
}

// Sets the vertex normals and points for the cube
function setCube() {
  var verts = [];
  verts = verts.concat(quad(1, 0, 3, 2));
  verts = verts.concat(quad(2, 3, 7, 6));
  verts = verts.concat(quad(3, 0, 4, 7));
  verts = verts.concat(quad(6, 5, 1, 2));
  verts = verts.concat(quad(4, 5, 6, 7));
  verts = verts.concat(quad(5, 4, 0, 1));
	for (var i = 0; i < numCubeVertices; i++) {
		cubeVertexNormals.push(verts[i][0], verts[i][1], verts[i][2], 0.0);
	}
  cubePoints = verts;
}

// Generate vertices for two triangles that make up face of cube
function quad(a, b, c, d)
{
  var verts = [];

  var vertices = [
    vec4(-0.5, -0.5,  0.5, 1.0),
    vec4(-0.5,  0.5,  0.5, 1.0),
    vec4(0.5,  0.5,  0.5, 1.0),
    vec4(0.5, -0.5,  0.5, 1.0),
    vec4(-0.5, -0.5, -0.5, 1.0),
    vec4(-0.5,  0.5, -0.5, 1.0),
    vec4(0.5,  0.5, -0.5, 1.0),
    vec4(0.5, -0.5, -0.5, 1.0)
  ];

  var indices = [a, b, c, a, c, d];
	var texIndices = [0, 1, 2, 0, 2, 3];

  for (var i = 0; i < indices.length; ++i) {
    verts.push(vertices[indices[i]]);
		texCoordsArray.push(texCoords[texIndices[i]]);
  }

  return verts;
}

// Function used in creating sphere that pushes points and normals for sphere
function triangle(a, b, c)
{
	spherePoints.push(c);
 	spherePoints.push(b);
	spherePoints.push(a);

 	sphereVertexNormals.push(c[0],c[1], c[2], 0.0);
	sphereVertexNormals.push(b[0],b[1], b[2], 0.0);
	sphereVertexNormals.push(a[0],a[1], a[2], 0.0);

	texCoordsArray.push(texCoords[0]);
	texCoordsArray.push(texCoords[1]);
	texCoordsArray.push(texCoords[2]);
}

// Function that is called recursively to subdivide faces to create sphere
function divideTriangle(a, b, c, count) {
  if ( count > 0 ) {
    var ab = mix(a, b, 0.5);
    var ac = mix(a, c, 0.5);
    var bc = mix(b, c, 0.5);

    ab = normalize(ab, true);
    ac = normalize(ac, true);
    bc = normalize(bc, true);

    divideTriangle(a, ab, ac, count - 1);
    divideTriangle(ab, b, bc, count - 1);
    divideTriangle(bc, c, ac, count - 1);
    divideTriangle(ab, bc, ac, count - 1);
  }
  else {
    triangle( a, b, c );
  }
}

// Sets the vertex normals and points for the cube
function setSphere() {
	tetrahedron(va, vb, vc, vd, numTimesToSubdivide);
}

function tetrahedron(a, b, c, d, n) {
  divideTriangle(a, b, c, n);
  divideTriangle(d, c, b, n);
  divideTriangle(a, d, b, n);
  divideTriangle(a, c, d, n);
}

// Sets the diffuse lighting color and draws the points corresponding to the sphere in the buffer
function drawSphere(color) {
	mvMatrix = mult(mvMatrix, scalem(0.75, 0.75, 0.75)); // Scale the sphere since it is a little big
	gl.uniformMatrix4fv(modelView, false, flatten(mvMatrix));
	setDiffuse(color);
  for (var i = cubePoints.length; i < cubePoints.length + spherePoints.length; i += 3) {
    gl.drawArrays(gl.TRIANGLES, i, 3);
	}
}

// Takes three points and returns the normal to the face corresponding to the plane of those points
function normalNewell(p0, p1, p2) {
	var verts = [p0, p1, p2, p0];
	var normal = vec4(0, 0, 0, 0);
	for (var i = 0; i < 3; i++) {
		normal[0] += (verts[i][1] - verts[i + 1][1]) * (verts[i][2] + verts[i + 1][2]);
		normal[1] += (verts[i][2] - verts[i + 1][2]) * (verts[i][0] + verts[i + 1][0]);
		normal[2] += (verts[i][0] - verts[i + 1][0]) * (verts[i][1] + verts[i + 1][1]);
	}
	return normalize(normal);
}

// Sets the normals corresponding to the face of the sphere and the cube, which is used for flat shading
function setFaceNormals() {
	for (var i = 0; i < pointsArray.length; i += 3) {
		var normal = normalNewell(pointsArray[i], pointsArray[i + 1], pointsArray[i + 2]);
		for (var j = 0; j < 3; j++) {
			faceNormals.push(normal);
		}
	}
}

// Configures a cube map based on an image
function configureCubeMap() {
  cubeMap = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);

  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, red);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, green);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, blue);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, cyan);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, yellow);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, magenta);
}

// Configures a cube map based on an image
function configureCubeMapImages(images) {
  cubeMap = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);

  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MAG_FILTER,gl.NEAREST);

  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, images[0]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, images[1]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, images[2]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, images[3]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, images[4]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, images[5]);

  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
}

// Function to set both images and blank textures, adapted from example
function configureTextureImage(def, ind, image) {
	gl.useProgram(program2);
	//wallShaderInit();
  //Create a texture object
  var texture = gl.createTexture();

  //Bind it as the current two-dimensional texture
	if(ind == 0) {
		gl.activeTexture(gl.TEXTURE0);
	}
	else {
		gl.activeTexture(gl.TEXTURE1);
	}
  gl.bindTexture(gl.TEXTURE_2D, texture);

  //Specify the array of the two-dimensional texture elements
	if (def) {
  	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
	} else {
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE,
			new Uint8Array([0, 0, 255, 255, 255, 0, 0, 255, 0, 0, 255, 255, 0, 0, 255, 255]));
	}

  // How do we interpret a value of s or t outside of the range (0.0, 1.0)?
  // gl.REPEAT only works if width and height of texture are a power of 2
  // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	// Set filtering
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  // Link the texture to sampler in the fragment shader
  gl.uniform1i(gl.getUniformLocation(program2, "tex" + ind), ind);
	gl.useProgram(program);
	//wallShaderInit();
}

// This function is for making sure all of the images are loaded before they are applied to the cubeMap
function loadImages(sources, images, i) {
	if (i == sources.length) {
		configureCubeMapImages(images);
		return;
	}
	var image = new Image();
	image.crossOrigin = "";
	image.src = sources[i];
	image.onload = function() {
		images.push(image);
		console.log(image.src);
		loadImages(sources, images, i + 1);
		return;
	}
}

function main() {
	// Keyboard controls
	window.onkeydown = function() {
		shifted = event.shiftKey;
		var key = String.fromCharCode(event.keyCode);
		switch (key) {
			case 'M': // Change lighting style
			if (shifted) {
				curNormals = faceNormals;
			}
			else {
				curNormals = normalsArray;
			}
			drawInit()
			break;
			case 'P': // Change spotlight angle
			if (shifted) {
				phi -= 0.01
			}
			else {
				phi += 0.01
			}
			gl.uniform1f(gl.getUniformLocation(program, "phi"), phi);
			break;
			case 'R': // Randomize
			if (shifted) {
				randomizeRotations = true;
			}
			else {
				randomizeColor = true;
			}
			break;
			case 'S': // Change speed
			if (shifted) {
				speedScalar -= 0.1;
			}
			else {
				speedScalar += 0.1;
			}
			if (speedScalar < 0) {
				speedScalar = 0;
			}
			case 'A': // Toggle shadows
			drawShadows = !drawShadows;
			break;
			case 'C': // Toggle reflection
			if (lightMode == 1)
				lightMode = 0;
			else
				lightMode = 1;
			gl.uniform1i(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), "mode"), lightMode);
			break;
			case 'D': // Toggle refraction
			if (lightMode == 2)
				lightMode = 0;
			else
				lightMode = 2;
			gl.uniform1i(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), "mode"), lightMode);
			break;
		}
	};

	// When shift key is released shifted is changed
	window.onkeyup = function() {
		shifted = event.shiftKey;
	}

	// Retrieve canvas element
	var canvas = document.getElementById('webgl');

	// Get the rendering context for WebGL
  gl = WebGLUtils.setupWebGL(canvas);

	// Check that the return value is not null.
	if (!gl) {
		console.log('Failed to get the rendering context for WebGL');
		return;
	}

	// Initialize shaders
	program = initShaders(gl, "vshader", "fshader");
	program2 = initShaders(gl, "wshader", "tshader");
	gl.useProgram(program);
	//drawInit();

	// Set up the viewport
  gl.viewport(0, 0, canvas.width, canvas.height);

  aspect =  canvas.width/canvas.height;
  // Set clear color
  gl.clearColor(1.0, 1.0, 1.0, 1.0);

  // Clear canvas by clearing the color buffer
  gl.enable(gl.DEPTH_TEST);

  projection = gl.getUniformLocation(program, "projectionMatrix");
  modelView = gl.getUniformLocation(program, "modelMatrix");

	projection2 = gl.getUniformLocation(program2, "projectionMatrix");
  modelView2 = gl.getUniformLocation(program2, "modelMatrix");

	// Sources to load environment map
	var envSources = [
		"http://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvposx.bmp",
		"http://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvnegx.bmp",
		"http://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvposy.bmp",
		"http://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvnegy.bmp",
		"http://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvposz.bmp",
		"http://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvnegz.bmp"];

	configureCubeMap();
	loadImages(envSources, envImages, 0);

	// Set the stone and wall texture to blank textures until they are loaded
	configureTextureImage(false, 0);
	configureTextureImage(false, 1);
	// Load the grass texture to tex1
	var image1 = new Image();
	image1.crossOrigin = "";
	image1.src = "";
	image1.onload = function() {
		configureTextureImage(true, 0, image1);
	}
	// For some reason, my access is being blocked to the stone texture, but not the grass texture. This is why I left this code out.
	// It might have to do with with the fact that I am connecting from home. I really have no idea. It wasn't always like this.
	// var image2 = new Image();
	// image2.crossOrigin = "";
	// image2.src = "http://web.cs.wpi.edu/~jmcuneo/stone.bmp";
	// image2.onload = function() {
	// 	configureTextureImage(true, 0, image2);
	// }
	gl.uniform1i(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), "texMap"), 0);
	gl.uniform1i(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), "mode"), lightMode);
	// These uniforms are left over from when I was using flags to draw the textures.
	gl.uniform1f(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), "reflectOn"), false);
	gl.uniform1f(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), "refractOn"), false);
	gl.uniform1f(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), "nothingOn"), false);
	gl.uniform1f(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), "texturesOn"), true);

	gl.uniform4fv(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), "ambientProduct"), flatten(ambientProduct));
	gl.uniform4fv(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), "specularProduct"), flatten(specularProduct));
	gl.uniform4fv(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), "lightPosition"), flatten(lightPosition));
	gl.uniform1f(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), "shininess"), materialShininess);
	gl.uniform1f(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), "phi"), phi);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Set vertex normals and points for cubes
	setSphere();
	setCube();

	// Combine cube and sphere points and normals to push into buffer all at once
	pointsArray = cubePoints.concat(spherePoints);
	normalsArray = cubeVertexNormals.concat(sphereVertexNormals);

	setFaceNormals();
	// Initializes drawing with Gouraud shading
	curNormals = normalsArray;
	drawInit();

	render();
}
