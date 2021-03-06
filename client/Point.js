/*
 *  Ray Cloud Browser: interactively skim processed genomics data with energy
 *  Copyright (C) 2012, 2013 Sébastien Boisvert
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, version 3 of the License.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * This is a 2-dimension point in space.
 *
 * \author Sébastien Boisvert
 */
function Point(x,y){
	this.x=x;
	this.y=y;
}

/**
 * \see http://stackoverflow.com/questions/2259476/rotating-a-point-about-another-point-2d
 */
Point.prototype.rotate=function(pivot,angle){

	var cosValue=Math.cos(angle);
	var sinValue=Math.sin(angle);

	var x=this.getX()-pivot.getX();
	var y=this.getY()-pivot.getY();

	var newX=x*cosValue-y*sinValue;
	var newY=x*sinValue+y*cosValue;

	var point=new Point(newX+pivot.getX(),newY+pivot.getY());

	return point;
}

Point.prototype.getX=function(){
	return this.x;
}

Point.prototype.getY=function(){
	return this.y;
}

Point.prototype.setX=function(x){
	return this.x = x;
}

Point.prototype.setY=function(y){
	return this.y = y;
}
Point.prototype.add = function(point) {
	this.x += point.getX();
	this.y += point.getY();
	return this;
}

Point.prototype.substract = function(point) {
	this.x -= point.getX();
	this.y -= point.getY();
	return this;
}

Point.prototype.divideBy = function(value) {
	if(value == 0) {
		return;
	}
	this.x /= value;
	this.y /= value;
	return this;
}

Point.prototype.multiplyBy = function(value) {
	if(value == 0) {
		return;
	}
	this.x *= value;
	this.y *= value;
	return this;
}

Point.prototype.substractBy = function(value) {
	if(value == 0) {
		return;
	}
	this.x -= value;
	this.y -= value;
	return this;
}

Point.prototype.equals = function(point) {
	return this.getX() == point.getX() && this.getY() == point.getY();
}

Point.prototype.toString = function() {
	return "(" + this.getX() + ", " + this.getY() + ")";
}

Point.prototype.copy = function() {
	return new Point(this.getX(), this.getY());
}

Point.prototype.getNorm = function() {

	var x = this.getX();
	var y = this.getY();
	var vectorNorm = Math.sqrt(x*x + y*y);
	return vectorNorm;
}

Point.prototype.normalize = function(){
	this.divideBy(this.getNorm());
}
