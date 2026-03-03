class GL3DObject {
	constructor() {
		this.vertices = [];
		this.colors = [];
		this.normals = [];
		this.faceVertices = [];
		this.faceColors = [];
		this.faceNormals = [];
		this.transform = {
			position:glMatrix.vec3.create(),
			scale:1,
			rotationAxis:glMatrix.vec3.create(),
			rotationAngle:0,
		}
		this.vao = null;
		this.indicesLength = 0;
	}
	addVertices() {
		this.vertices.push(...arguments);
	}
	addColors() {
		this.colors.push(...arguments);
	}
	addNormals() {
		this.normals.push(...arguments);
	}
	addFaceVertices() {
		this.faceVertices.push([...arguments]);
	}
	addFaceColors() {
		this.faceColors.push(...arguments);
	}
	addFaceNormals() {
		this.faceNormals.push(...arguments);
	}
	findVertex(vertex) {
		var exact = -1;
		var approx = -1;
		this.vertices.forEach((v,i) => {exact = glMatrix.vec3.exactEquals(vertex,v)?i:exact;approx = glMatrix.vec3.equals(vertex,v)?i:approx;});
		if (exact < 0) {
			return approx;
		}else{
			return exact;
		}
	}
	correctForCulling(ccw=true) {
		var viewMat = glMatrix.mat4.create();
		for (var i = 0;i < this.faceVertices.length;i++) {
			if ((glMatrix.vec3.dot(this.normals[this.faceNormals[i]],glMatrix.vec3.cross(glMatrix.vec3.create(),glMatrix.vec3.sub(glMatrix.vec3.create(),this.vertices[this.faceVertices[i][1]],this.vertices[this.faceVertices[i][0]]),glMatrix.vec3.sub(glMatrix.vec3.create(),this.vertices[this.faceVertices[i][2]],this.vertices[this.faceVertices[i][0]])))<0)^(!ccw)) {
				this.faceVertices[i].reverse();
			}
		}
	}
	createBuffers() {
		var vertexDataBuffer = [];
		var indexBuffer = [];
		var index = 0;
		for (var i = 0;i < this.faceVertices.length;i++) {
			var startIndex = index;
			for (var j = 0;j < this.faceVertices[i].length;j++) {
				glMatrix.vec3.normalize(this.normals[this.faceNormals[i]],this.normals[this.faceNormals[i]]);
				//this.normals[this.faceNormals[i]].set(1,0,1);
				vertexDataBuffer.push(...this.vertices[this.faceVertices[i][j]],...this.normals[this.faceNormals[i]],...this.colors[this.faceColors[i]]);
				if (j >= 2) {
					indexBuffer.push(startIndex,index-1,index);
				}
				index++;
			}
		}
		return {
			vertices:new Float32Array(vertexDataBuffer),
			indices:new Uint16Array(indexBuffer)
		}
	}
	getWorldMat4() {
		var rotation = glMatrix.quat.create();
		var scale = glMatrix.vec3.create();
		var ret = glMatrix.mat4.create();
		glMatrix.vec3.normalize(this.transform.rotationAxis, this.transform.rotationAxis);
		glMatrix.quat.setAxisAngle(rotation,this.transform.rotationAxis,this.transform.rotationAngle);
		glMatrix.vec3.set(scale,this.transform.scale,this.transform.scale,this.transform.scale);
		glMatrix.mat4.fromRotationTranslationScale(
			ret,
			rotation,
			this.transform.position,
			scale
		);
		return ret;
	}
}
class GL3D {
	constructor() {
		if (window.glMatrix === undefined) throw new Error('Please include glMatrix: https://cdn.jsdelivr.net/gh/toji/gl-matrix/dist/gl-matrix-min.js\n\nLicense:\n\nCopyright (c) 2015-2025, Brandon Jones, Colin MacKenzie IV.\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.');

		this.gl = null;
		var inputOptions = {};
		if (arguments.length === 1) {
			this.gl = this.createGL(arguments[0]);
		}else if (arguments.length === 2 && typeof arguments[1] === "object" && arguments[1] !== null) {
			this.gl = this.createGL(arguments[0]);
			inputOptions = arguments[1];
		}else if (arguments.length === 2) {
			this.gl = this.createGL(arguments[0],arguments[1]);
		}else if (arguments.length === 3 && typeof arguments[2] === "object" && arguments[2] !== null) {
			this.gl = this.createGL(arguments[0],arguments[1]);
			inputOptions = arguments[2];
		}
		if (this.gl === null) throw new Error("Failed to create GL3D instance: could not find/create webgl2 context");
		this.options = {
			depthTest:true,
			cullFace:true,
			cullMode:-1,//-1:Back, 0:Front and Back, 1:Front
			cullFrontCCW:true,
			width:this.gl.canvas.width,
			height:this.gl.canvas.height,
			cameraPosition:glMatrix.vec3.fromValues(0,0,0),
			cameraLookAt:glMatrix.vec3.fromValues(1,0,0),
			cameraUp:glMatrix.vec3.fromValues(0,0,1),
			cameraFOVy:80,
			cameraNear:0.1,
			cameraFar:100,
			lightDirection:glMatrix.vec3.fromValues(0,1,0)
		};
		Object.assign(this.options,inputOptions);
		this.cameraMat4 = {
			world:glMatrix.mat4.create(),
			view:glMatrix.mat4.create(),
			proj:glMatrix.mat4.create(),
			viewProj:glMatrix.mat4.create()
		}
		this.setupProgram();
		this.setOptions(this.options);
	}
	createGL() {
		var gl = null;
		if (arguments.length === 1) {
			if (arguments[0] instanceof HTMLCanvasElement || arguments[0] instanceof OffscreenCanvas) {
				gl = arguments[0].getContext("webgl2");
			}else if (arguments[0] instanceof WebGL2RenderingContext) {
				gl = arguments[0];
			}else {
				gl = undefined;
			}
		}else if (arguments.length === 2 && typeof arguments[0] === "number" && typeof arguments[1] === "number") {
			gl = (new OffscreenCanvas(...arguments)).getContext("webgl2");
		}else {
			gl = undefined;
		}
		if (gl === undefined) return null;
		if (gl === null) {
			console.error("Could not create webgl2 context");
			return null;
		}
		return gl;
	}
	setupProgram() {
		const vertexSource = `#version 300 es
		precision mediump float;

		in vec3 vertexPosition;
		in vec3 vertexColor;
		in vec3 normalVector;

		out vec3 fragmentColor;

		uniform mat4 matWorld;
		uniform mat4 matViewProj;
		uniform vec3 lightDirection;


		void main() {
			fragmentColor = vertexColor * mix(0.5,1.0,dot(normalVector,lightDirection)/2.0+0.5);
			gl_Position = matViewProj * matWorld * vec4(vertexPosition, 1);
		}`;

		const fragmentSource = `#version 300 es
		precision mediump float;

		in vec3 fragmentColor;
		out vec4 outputColor; 

		void main() {
			outputColor = vec4(fragmentColor,1);
		}`;
		this.program = this.gl.createProgram();
		const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
		this.gl.shaderSource(vertexShader, vertexSource);
		this.gl.compileShader(vertexShader);
		if (!this.gl.getShaderParameter(vertexShader, this.gl.COMPILE_STATUS)) {
			const compileError = this.gl.getShaderInfoLog(vertexShader);
			throw new Error("Shader Compile Error: "+compileError);
		}
	
		const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
		this.gl.shaderSource(fragmentShader, fragmentSource);
		this.gl.compileShader(fragmentShader);
		if (!this.gl.getShaderParameter(fragmentShader, this.gl.COMPILE_STATUS)) {
			const compileError = this.gl.getShaderInfoLog(fragmentShader);
			throw new Error("Fragment Compile Error: "+compileError);
		}
	
		this.gl.attachShader(this.program, vertexShader);
		this.gl.attachShader(this.program, fragmentShader);
		this.gl.linkProgram(this.program);
		if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
			const linkError = this.gl.getProgramInfoLog(this.program);
			throw new Error("Program Link Error: "+linkError);
		}
	
		this.attribLocations = {};
		this.attribLocations.vertexPosition = this.gl.getAttribLocation(this.program,"vertexPosition");
		this.attribLocations.vertexColor = this.gl.getAttribLocation(this.program,"vertexColor");
		this.attribLocations.normalVector = this.gl.getAttribLocation(this.program,"normalVector");


		this.uniformLocations = {};
		this.uniformLocations.matWorld = this.gl.getUniformLocation(this.program,"matWorld");
		this.uniformLocations.matViewProj = this.gl.getUniformLocation(this.program,"matViewProj");
		this.uniformLocations.lightDirection = this.gl.getUniformLocation(this.program,"lightDirection");

		this.gl.clearColor(0,0,0,1);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
		this.gl.useProgram(this.program);
	}
	setOptions(options) {
		Object.assign(this.options,options);
		this.options.depthTest ? this.gl.enable(this.gl.DEPTH_TEST) : this.gl.disable(this.gl.DEPTH_TEST);
		this.options.cullFace ? this.gl.enable(this.gl.CULL_FACE) : this.gl.disable(this.gl.CULL_FACE);
		this.gl.cullFace(this.options.cullMode < 0? this.gl.BACK: this.options.cullMode > 0? this.gl.FRONT: this.gl.FRONT_AND_BACK);
		this.gl.frontFace(this.options.cullFrontCCW? this.gl.CCW: this.gl.CW);
		this.gl.viewport(0,0,this.options.width,this.options.height);
		glMatrix.mat4.lookAt(
			this.cameraMat4.view,
			this.options.cameraPosition,//position
			this.options.cameraLookAt,//look at
			this.options.cameraUp,//up
		);
		glMatrix.mat4.perspective(
			this.cameraMat4.proj,
			glMatrix.glMatrix.toRadian(this.options.cameraFOVy),
			this.options.width/this.options.height,
			this.options.cameraNear,
			this.options.cameraFar
		);
		glMatrix.mat4.multiply(this.cameraMat4.viewProj,this.cameraMat4.proj,this.cameraMat4.view);
		this.gl.uniformMatrix4fv(this.uniformLocations.matWorld,false, this.cameraMat4.world);
		this.gl.uniformMatrix4fv(this.uniformLocations.matViewProj,false, this.cameraMat4.viewProj);
		glMatrix.vec3.normalize(this.options.lightDirection, this.options.lightDirection);
		this.gl.uniform3fv(this.uniformLocations.lightDirection,this.options.lightDirection);
		
	}
	configureObject(obj) {
		var buffers = obj.createBuffers();
		var vertices = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER,vertices);
		this.gl.bufferData(this.gl.ARRAY_BUFFER,buffers.vertices,this.gl.STATIC_DRAW);
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER,null);

		var indices = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER,indices);
		this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER,buffers.indices,this.gl.STATIC_DRAW);
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER,null);
	
		var vao = this.gl.createVertexArray();
		this.gl.bindVertexArray(vao);
		this.gl.enableVertexAttribArray(this.attribLocations.vertexPosition);
		this.gl.enableVertexAttribArray(this.attribLocations.normalVector);
		this.gl.enableVertexAttribArray(this.attribLocations.vertexColor);
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER,vertices);
		this.gl.vertexAttribPointer(this.attribLocations.vertexPosition,3,this.gl.FLOAT,false,9 * Float32Array.BYTES_PER_ELEMENT,0);
		this.gl.vertexAttribPointer(this.attribLocations.normalVector,3,this.gl.FLOAT,false,9 * Float32Array.BYTES_PER_ELEMENT,3 * Float32Array.BYTES_PER_ELEMENT);
		this.gl.vertexAttribPointer(this.attribLocations.vertexColor,3,this.gl.FLOAT,false,9 * Float32Array.BYTES_PER_ELEMENT,6 * Float32Array.BYTES_PER_ELEMENT);
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER,null);
		
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indices);
		this.gl.bindVertexArray(null);
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER,null);
		obj.vao = vao;
		obj.indicesLength = buffers.indices.length;
	}
	drawObject(obj) {
		if (obj.vao === null) throw new Error("Object not configured for drawing");
		this.gl.uniformMatrix4fv(this.uniformLocations.matWorld,false, obj.getWorldMat4());
		this.gl.bindVertexArray(obj.vao);
		this.gl.drawElements(this.gl.TRIANGLES, obj.indicesLength, this.gl.UNSIGNED_SHORT, 0);
		this.gl.bindVertexArray(null);
	}
}
