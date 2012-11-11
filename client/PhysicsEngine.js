/*
 *  Ray Cloud Browser: interactively skim processed genomics data with energy
 *  Copyright (C) 2012  Sébastien Boisvert
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

/* yet another force-directed graph viewer */
/* the code is GPL */
/* author: Sébastien Boisvert */

function PhysicsEngine(screen){

/*
 * Simulate DNA annealing.
 * The annealing code is buggy.
 */
	this.simulatedAnnealing=false;

	this.maximumRawForce=40;

	this.screen=screen;

/*
 * We can not use the grid along with
 * active objects.
 */
	this.useGrid=false;
	this.useProximity=false;
	this.useFullMap=true;

	this.range=50;

/* 
 * Coulomb's law
 * This is for the repulsion.
 */
	this.forceStep=0.05;
	this.charge=128;
	this.labelCharge=96;
	this.forceConstant=0.15;

/* 
 * Hooke's law 
 * This is for the springs, they keep everything together.
 * if it is too weak, the repulsion may win.
 */
	this.sprintStep=0.5;
	this.springConstant=0.35;
	this.springLength=20;

	/* velocity update */
	this.timeStep=1;
	this.damping=0.5;

	this.grid=new Grid(100);

	if(this.simulatedAnnealing)
		this.charge=300;
}

/**
 * \see http://en.wikipedia.org/wiki/Force-based_algorithms_(graph_drawing)
 */
PhysicsEngine.prototype.applyForces=function(vertices){

	var i=0;

/*
 * Build an index.
 */
	var index=new Object();

	while(i<vertices.length){
		var vertex1=vertices[i];
		vertex1.getSequence();
		index[vertex1.getSequence()]=vertex1;
		i++;
	}

	i=0;
	while(i<vertices.length){

		if(this.forceConstant==0)
			break;

		var vertex1=vertices[i];
		i++;

		if(this.screen.isOutside(vertex1,100))
			continue;

		var force=[0,0];

/*
 * Actually, hits should be obtained with the grid.
 */
		var hits=new Array();

		var vertexRadius=vertex1.getRadius();
		var boxSize=this.range;

		if(this.useGrid){
			var keys=this.grid.getEntries(vertex1.getX(),vertex1.getY(),boxSize,boxSize);
			
			var keyNumber=0;
			while(keyNumber<keys.length){
				var keyValue=keys[keyNumber];
				keyNumber++;
				var vertex2=index[keyValue];
				hits.push(vertex2);
			}
		}else if(this.useProximity){

			hits=vertex1.getLinkedObjects();

		}else if(this.useFullMap){
			hits=vertices;
		}

		//console.log("Hits= "+hits.length);

		var hitNumber=0;
		//console.log("Self= "+i);
		while(hitNumber<hits.length){

			var vertex2=hits[hitNumber];

			//console.log(vertex2);

			hitNumber++;
/*
 * We don't want to compute forces against the same
 * object.
 */
			if(vertex1.getSequence()==
				vertex2.getSequence())
				continue;
/*
			if(vertex1.isColored() && !vertex2.isColored())
				continue;
*/
/*
			if(this.screen.isOutside(vertex2))
				continue;
*/
			var force2=this.getRepulsionForce(vertex1,vertex2);

			force=this.addForces(force,force2);
		}

		var arcs=vertex1.getLinkedObjects();

		for(j in arcs){

			var vertex2=arcs[j];

			var force2=this.getAttractionForce(vertex1,vertex2);

			force=this.addForces(force,force2);
		}

		vertex1.updateVelocity(this.timeStep*force[0],this.timeStep*force[1]);
	}

/*
 * Apply damping on every object,
 * not just those on the screen.
 */
	var i=0;
	while(i<vertices.length){
		var vertex1=vertices[i];
		vertex1.applyDamping(this.damping);
		i++;
	}
}

/**
 * \see http://en.wikipedia.org/wiki/Hooke%27s_law
 */
PhysicsEngine.prototype.getAttractionForce=function(vertex1,vertex2){


	var dx=vertex2.getX()-vertex1.getX();
	var dy=vertex2.getY()-vertex1.getY();

	var distance=Math.sqrt(dx*dx+dy*dy);

	var displacement=distance-this.springLength;

	var force=this.springConstant*displacement;

	if(force>this.maximumRawForce)
		force=this.maximumRawForce;

	// get a unit vector 
	dx=dx/distance;
	dy=dy/distance;

	dx=dx*force;
	dy=dy*force;

	return [dx,dy];
}

/**
 * \see http://en.wikipedia.org/wiki/Coulomb's_law
 */
PhysicsEngine.prototype.getRepulsionForce=function(vertex1,vertex2){

	var dx=(vertex1.getX() - vertex2.getX());
	var dy=(vertex1.getY() - vertex2.getY());
	
	var length=Math.sqrt(dx*dx+dy*dy);

	dx=dx/length;
	dy=dy/length;

	var charge1=this.charge;
	var charge2=this.charge;

/*
 * Annotation are less charged with energy.
 */
	if(!vertex1.isColored() || !vertex2.isColored()){
		charge1=this.labelCharge;
		charge2=this.labelCharge;
	}

	var force=(this.forceConstant*charge1*charge2)/(length*length);

	if(force>this.maximumRawForce)
		force=this.maximumRawForce;

	if(this.simulatedAnnealing && vertex1.isColored() && vertex2.isColored()){
		var nucleotide1=vertex1.getLabel();
		var nucleotide2=vertex2.getLabel();

		var force2=force;
		force=0;

		if(nucleotide1=="A" && nucleotide2=="T")
			force=-force2;

		if(nucleotide1=="T" && nucleotide2=="A")
			force=-force2;

		if(nucleotide1=="G" && nucleotide2=="C")
			force=-force2;

		if(nucleotide1=="C" && nucleotide2=="G")
			force=-force2;
	}

	dx=dx*force;
	dy=dy*force;

	return [dx,dy];
}



PhysicsEngine.prototype.addForces=function(force,force2){
	return [force[0]+force2[0], force[1]+force2[1]]
}

PhysicsEngine.prototype.moveObjects=function(vertices){
	// move objects

	var i=0;
	while(i<vertices.length){
		var vertex=vertices[i];
		
		vertex.update(this.timeStep,true);

		var boxSize=this.range;

		if(this.useGrid){
			var objectKey=vertex.getSequence();
			this.grid.removeEntry(objectKey);

			//console.log("vertices "+this.vertices.length+" i= "+i+" name= "+vertex.getName());
			this.grid.addEntry(objectKey,vertex.getX(),vertex.getY(),boxSize,boxSize);
		}

		i++;
	}
}


