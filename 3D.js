class Color {
	constructor(r,g,b,a) {
		this.r=r;
		this.g=g;
		this.b=b;
		this.a=a;
		this.correct();
	}
	copy() {
		return new Color(this.r,this.g,this.b,this.a);
	}
	correct() {
		this.r=Math.max(0,Math.min(255,Math.round(this.r)));
		this.g=Math.max(0,Math.min(255,Math.round(this.g)));
		this.b=Math.max(0,Math.min(255,Math.round(this.b)));
		this.a=Math.max(0,Math.min(1,this.a));
	}
	mult(n) {
		this.r*=n;
		this.b*=n;
		this.g*=n;
		this.a*=n;
		this.correct();
	}
	add(c) {
		this.r+=c.r;
		this.b+=c.b;
		this.g+=c.g;
		this.a+=c.a;
		this.correct();
	}
	stringify() {
		if (this.a) {
			return "rgba("+this.r+","+this.g+","+this.b+","+this.a+")";
		}
		return "rgb("+this.r+","+this.g+","+this.b+")";
	}
}
class Point {
	constructor(x=0,y=0,z=0) {
		this.x=x;
		this.y=y;
		this.z=z;
	}
	copy() {
		return new Point(this.x,this.y,this.z);
	}
	sub(p) {
		this.x-=p.x;
		this.y-=p.y;
		this.z-=p.z;
	}
	add(p) {
		this.x+=p.x;
		this.y+=p.y;
		this.z+=p.z;
	}
	div(n) {
		this.x/=n;
		this.y/=n;
		this.z/=n;
	}
	mult(n) {
		this.x*=n;
		this.y*=n;
		this.z*=n;
	}
	dot(p) {
		return this.x*p.x+this.y*p.y+this.z*p.z;
	}
	length() {
		return Math.sqrt(this.x**2+this.y**2+this.z**2);
	}
	rotate2d(x,y,theta) {
		return {x:x*Math.cos(theta)-y*Math.sin(theta),y:y*Math.cos(theta)+x*Math.sin(theta)}
	}
	rotateX(theta) {
		var r = this.rotate2d(this.y,this.z,theta);
		this.y=r.x;
		this.z=r.y;
	}
	rotateY(theta) {
		var r = this.rotate2d(this.x,this.z,theta);
		this.x=r.x;
		this.z=r.y;
	}
	rotateZ(theta) {
		var r = this.rotate2d(this.x,this.y,theta);
		this.x=r.x;
		this.y=r.y;
	}
	rotate(theta,order="xyz",reverse=false) {
		var change = reverse?-1:1;
		var step = reverse?2:0;
		var end = reverse?-1:3;
		if (order[step]==="x") {
			this.rotateX(theta.x);
			step+=change;
		}
		if (order[step]==="y") {
			this.rotateY(theta.y);
			step+=change;
		}
		if (order[step]==="z") {
			this.rotateZ(theta.z);
			step+=change;
		}
		if (step === end) return;
		if (order[step]==="x") {
			this.rotateX(theta.x);
			step+=change;
		}
		if (step === end) return;
		if (order[step]==="y") {
			this.rotateY(theta.y);
			step+=change;
		}
		if (step === end) return;
		if (order[step]==="z") {
			this.rotateZ(theta.z);
		}else if (order[step]==="x") {
			this.rotateX(theta.x);
		}
		
	}
	normalize() {
		this.div(this.length());
	}
	project(camera) {
		var p = this.copy();
		p.sub(camera.pos);
		p.rotate(camera.rot,camera.order);
		var l = p.length();
		p.div(p.z);
		p.z=l;
		p.mult(camera.size);
		return p;
	}
}
class OBJ {
	constructor() {
		this.vertices=[];
		this.vTextures=[];
		this.vNormals=[];
		this.faces = [];
		this.materials = [];
		this.materialNames = [];
		this.maps = [];
		this.mapNames = [];
		this.translate = new Point(0,0,0);
		this.scale = new Point(1,1,1);
		this.rotate = new Point(0,0,0);
		this.rotateOrder = "xzy";
		this.dummyCanvas = new OffscreenCanvas(1,1);
		this.dummyCtx = this.dummyCanvas.getContext("2d");
	}
	static readMTL(file,obj) {
		return new Promise((resolve,reject) => {
			var done = false;
			var asyncDone = [];
			const lines = file.split("\n");
			const l = lines.length;
			var materials = [];
			var materialNames = [];
			var materialIndex = -1;
			for (var i = 0;i < l;i++) {
				const s = lines[i].split(" ");
				if (s[0] === "newmtl") {
					materialIndex++;
					materials[materialIndex]={};
					materialNames[materialIndex]=s[1];
				}
				if (s[0] === "Ns") {
					materials[materialIndex].Ns = parseFloat(s[1]);
				}
				if (s[0] === "Ka") {
					materials[materialIndex].Ka = new Color(parseFloat(s[1])*255,parseFloat(s[2])*255,parseFloat(s[3])*255);
				}
				if (s[0] === "Ks") {
					materials[materialIndex].Ks = new Color(parseFloat(s[1])*255,parseFloat(s[2])*255,parseFloat(s[3])*255);
				}
				if (s[0] === "map_Kd") {
					var name = s.slice(1,s.length).join(" ");
					var k = obj.mapNames.indexOf(name);
					if (k===-1) {
						var img = document.createElement("img");
						img.src = name;
						var j = asyncDone.length;
						asyncDone[j]=false;
						img.onload = () => {
							obj.dummyCanvas.width=img.naturalWidth;
							obj.dummyCanvas.height=img.naturalHeight;
							obj.dummyCtx.drawImage(img,0,0);
							var data = obj.dummyCtx.getImageData(0,0,img.naturalWidth,img.naturalHeight);
							obj.maps.push(data);
							obj.mapNames.push(name);
							materials[materialIndex].map_Kd = obj.maps.length-1;
							asyncDone[j]=true;
							if (!asyncDone.includes(false) && done) resolve();
						}
					}else{
						materials[materialIndex].map_Kd = k;
					}
				}
				if (s[0] === "Kd") {
					materials[materialIndex].Kd = new Color(parseFloat(s[1])*255,parseFloat(s[2])*255,parseFloat(s[3])*255);
				}
				if (s[0] === "Ke") {
					materials[materialIndex].Ke = new Color(parseFloat(s[1])*255,parseFloat(s[2])*255,parseFloat(s[3])*255);
				}
				if (s[0] === "Ni") {
					materials[materialIndex].Ni = parseFloat(s[1]);
				}
				if (s[0] === "d") {
					materials[materialIndex].d = parseFloat(s[1]);
				}
				if (s[0] === "illum") {
					materials[materialIndex].illum = parseFloat(s[1]);
				}
			}
			obj.materials = materials;
			obj.materialNames = materialNames;
			done=true;
			if (!asyncDone.includes(false)) resolve();
		});
	}
	static readOBJ(file,obj) {
		return new Promise((resolve,reject) => {
			var done = false;
			var asyncDone = false;
			const lines = file.split("\n");
			const l = lines.length;
			var currentMtl = "";
			for (var i = 0;i < l;i++) {
				const s = lines[i].split(" ");
				if (s[0] === "mtllib") {
					fetch(s.slice(1,s.length).join(" "))
					.then(res => res.text())
					.then((text) => {
						OBJ.readMTL(text,obj)
						.then(()=> {
							asyncDone = true;
							if (done) resolve()
						});
					})
					.catch(err => reject(err));
				}
				if (s[0] === "usemtl") {
					currentMtl = s[1];
				}
				if (s[0] === "v") {
					obj.vertices.push(new Point(parseFloat(s[1]),parseFloat(s[2]),parseFloat(s[3])));
				}
				if (s[0] === "vn") {
					var p = new Point(parseFloat(s[1]),parseFloat(s[2]),parseFloat(s[3]))
					p.normalize();
					obj.vNormals.push(p);
				}
				if (s[0] === "vt") {
					var p = {x:parseFloat(s[1]),y:1-parseFloat(s[2])};
					obj.vTextures.push(p);
				}
				if (s[0] === "f") {
					const list = [];
					for (var j = 1;j < s.length;j++) {
						const vites = s[j].split("/");
						const ver = {
							v:parseFloat(vites[0])-1,
							vt:parseFloat(vites[1])-1,
							vn:parseFloat(vites[2])-1
						}
						list.push(ver);
					}
					obj.faces.push({vertices:list,mtl:currentMtl});
				}
			}
			done=true;
			if (asyncDone) resolve();
		});
	}
}
class Engine {
	constructor(canvas,ctx) {
		this.canvas = canvas;
		this.ctx = ctx;
		if (this.ctx === undefined) {
			this.ctx = canvas.getContext("2d");
		}
		this.camera = {
			size:400,
			pos:new Point(0,0,-10),
			rot:new Point(0,0,0),
			order:"xyz"
		};
		this.styling = {
			lightDirection:new Point(1,1,1),
			minLight:0.3,
			maxLight:1
		}
		this.result = ctx.createImageData(canvas.width,canvas.height);
		this.depthField = [];
		this.resetDepthField();
		this.quality = 1;
		this.objects = [];
	}
	resetDepthField() {
		for (var i = 0;i < this.result.width*this.result.height;i++) {
			this.depthField[i]=Infinity;
		}
	}
	static findBarycentric(px,py,a,b,c) {
		var BAx = b.x-a.x;
		if (BAx === 0) {
			var _px = px;
			px=py;
			py=_px;
			a=a.copy();
			var _ax = a.x;
			a.x = a.y;
			a.y=_ax;
			b=b.copy();
			var _bx = b.x;
			b.x = b.y;
			b.y=_bx;
			c=c.copy();
			var _cx = c.x;
			c.x = c.y;
			c.y=_cx;
			BAx = b.x-a.x;
		}
		var PAx = px-a.x;
		var APy = a.y-py;
		var BAy = b.y-a.y;
		var CAx = c.x-a.x;
		var CAy = c.y-a.y;
		var w = (PAx*BAy+BAx*APy)/(BAy*CAx-CAy*BAx);
		var v = (PAx-w*CAx)/BAx;
		return {u:1-v-w,v:v,w:w};
	}
	static calculateBarycentric(coeff,a,b,c) {
		return a*coeff.u+b*coeff.v+c*coeff.w;
	}
	static withinBarycentric(coeff) {
		return coeff.u>=0&&coeff.v>=0&&coeff.w>=0
	}
	static triangulate(face) {
		var subfaces = [];
		for (var i = 1;i < face.vertices.length-1;i++) {
			subfaces.push([face.vertices[0],face.vertices[i],face.vertices[i+1]]);
		}
		return subfaces;
	}
	addObject(o) {
		this.objects.push(o);
		return this.objects.length-1;
	}
	fullProject(obj,point) {
		if (!(obj instanceof OBJ)) {
			obj=this.objects[obj];
		}
		var p = point.copy();
		p.add(obj.translate);
		p.mult(obj.scale);
		p.rotate(obj.rotate,obj.rotateOrder);
		return p.project(this.camera);
	}
	draw(ctx) {
		this.result = ctx.createImageData(this.result);
		this.resetDepthField();
		this.styling.lightDirection.normalize();
		var white = new Color(0,255,255);
		var maxDepth = -Infinity;
		var minDepth = Infinity;
		for (var obj of this.objects) {
			var projected = [];
			for (var v of obj.vertices) {
				projected.push(this.fullProject(obj,v));
			}
			for (var f of obj.faces) {
				var normalCamera = obj.vNormals[f.vertices[0].vn].copy();
				normalCamera.rotate(obj.rotate,obj.rotateOrder);
				if (normalCamera.z > 0) continue;
				var useMap = false;
				var subfaces = Engine.triangulate(f);
				var color = obj.materials[obj.materialNames.indexOf(f.mtl)] || white;
				if (color.map_Kd !== undefined) {
					useMap = true;
					color = color.map_Kd;
				}
				if (color.Kd !== undefined) color = color.Kd;
				var colMult = (this.styling.lightDirection.dot(obj.vNormals[f.vertices[0].vn])+1)/2*(this.styling.maxLight-this.styling.minLight)+this.styling.minLight;
				for (var sf of subfaces) {
					var min = [this.result.width,this.result.height];
					var max = [0,0];
					for (var p of sf) {
						if (projected[p.v].x<min[0]) min[0]=projected[p.v].x;
						if (projected[p.v].y<min[1]) min[1]=projected[p.v].y;
						if (projected[p.v].x>max[0]) max[0]=projected[p.v].x;
						if (projected[p.v].y>max[1]) max[1]=projected[p.v].y;
					}
					min = [Math.max(Math.floor(min[0]+this.result.width/2),0),Math.max(Math.floor(min[1]+this.result.height/2),0)];
					max = [Math.min(Math.ceil(max[0]+this.result.width/2),this.result.width),Math.min(Math.ceil(max[1]+this.result.height/2),this.result.height)];
					for (var x = min[0];x <= max[0];x++) {	
						for (var y = min[1];y <= max[1];y++) {
							var res = Engine.findBarycentric(x-this.result.width/2,y-this.result.height/2,projected[sf[0].v],projected[sf[1].v],projected[sf[2].v]);
							var depth = Engine.calculateBarycentric(res,projected[sf[0].v].z,projected[sf[1].v].z,projected[sf[2].v].z);
							if (Engine.withinBarycentric(res) && depth < this.depthField[x+this.result.width*y]) {
								if (depth < minDepth) minDepth=depth;
								if (depth > maxDepth) maxDepth=depth;
								this.depthField[x+this.result.width*y]=depth;
								if (useMap) {
									var tx = Engine.calculateBarycentric(res,obj.vTextures[sf[0].vt].x,obj.vTextures[sf[1].vt].x,obj.vTextures[sf[2].vt].x);
									var ty = Engine.calculateBarycentric(res,obj.vTextures[sf[0].vt].y,obj.vTextures[sf[1].vt].y,obj.vTextures[sf[2].vt].y);
									tx*=obj.maps[color].width;
									ty*=obj.maps[color].height;
									tx=Math.round(tx);
									ty=Math.round(ty);
									var w = obj.maps[color].width;
									this.result.data[(x+this.result.width*y)*4+0]=obj.maps[color].data[(tx+w*ty)*4+0]*colMult;
									this.result.data[(x+this.result.width*y)*4+1]=obj.maps[color].data[(tx+w*ty)*4+1]*colMult;
									this.result.data[(x+this.result.width*y)*4+2]=obj.maps[color].data[(tx+w*ty)*4+2]*colMult;
									this.result.data[(x+this.result.width*y)*4+3]=obj.maps[color].data[(tx+w*ty)*4+3];												}else{
									this.result.data[(x+this.result.width*y)*4+0]=color.r*colMult;
									this.result.data[(x+this.result.width*y)*4+1]=color.g*colMult;
									this.result.data[(x+this.result.width*y)*4+2]=color.b*colMult;
									this.result.data[(x+this.result.width*y)*4+3]=255;
								}
							}
						}
					}
				}
			}
		}
		ctx.putImageData(this.result,0,0);
	}
}
