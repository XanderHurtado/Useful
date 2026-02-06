class Vector2d {
	constructor(x,y) {
		this.x=x;
		this.y=y;
	}
	static fromPolar(length,theta) {
		return new Vector2d(length*Math.cos(theta),length*Math.sin(theta));
	}
	length() {
		return Math.hypot(this.x,this.y);
	}
	lengthSq() {
		return this.x*this.x+this.y*this.y;
	}
	angle() {
		return Math.atan2(this.y,this.x);
	}
	copy() {
		return new Vector2d(this.x,this.y);
	}
	add(vector) {
		this.x+=vector.x;
		this.y+=vector.y;
	}
	subtract(vector) {
		this.x-=vector.x;
		this.y-=vector.y;
	}
	multiply(vector) {
		this.x*=vector.x;
		this.y*=vector.y;
	}
	divide(vector) {
		this.x/=vector.x;
		this.y/=vector.y;
	}
	scalar(scale) {
		this.x*=scale;
		this.y*=scale;
	}
	dot(vector) {
		return this.x*vector.x+this.y*vector.y;
	}
	static add(v1,v2) {
		return new Vector(v1.x+v2.x,v1.y+v2.y);
	}
	static subtract(v1,v2) {
		return new Vector(v1.x-v2.x,v1.y-v2.y);
	}
	static multiply(v1,v2) {
		return new Vector(v1.x*v2.x,v1.y*v2.y);
	}
	static divide(v1,v2) {
		return new Vector(v1.x/v2.x,v1.y/v2.y);
	}
	static scalar(v,n) {
		return new Vector(v.x*n,v.y*n);
	}
}
