/*
 *  Ray Cloud Browser: interactively skim processed genomics data with energy
 *  Copyright (C) 2012, 2013 Sébastien Boisvert
 *  Copyright (C) 2013  Jean-François Erdelyi
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

/**
 * This class manages the screen, and calls the physics
 * engine and the rendering engine.
 *
 * \author Sébastien Boisvert
 */
function Screen(gameFrequency,renderingFrequency) {
	this.listOfSelectedVertex = new Array();
	this.mode = MODE_MOVE;
	this.canControlScreen=false;
	this.periodForControl=1000;
	this.numberOfSelection = 0;
	this.selection = "";

	this.debugMode = 0;
/*
 * Turn on the physics engine.
 */
	this.enableEngine=true;

	this.selectedVertex=null;

	this.activeObjects=new Array();
	this.activeIndex=0;
	this.nextActiveObjects=new Array();

	this.originXSpeed=0;
	this.originYSpeed=0;
	this.originDamping=0.90;
	this.originMoveSlices=1;
	this.originMoveInProgress=false;

	this.zoomDamping=0.90;
	this.zoomSlices=1;
	this.zoomValue=1;
	this.zoomValueSpeed=0;

	this.graphOperator=new GraphOperator(this);

	var message=new Message(RAY_MESSAGE_TAG_GET_KMER_LENGTH,this,this.graphOperator,null);
	this.graphOperator.receiveMessage(message);

	this.gameFrequency=gameFrequency;
	this.renderingFrequency=renderingFrequency;

	this.gameFrameLength=this.roundNumber(1000/this.gameFrequency,2);
	this.renderingFrameLength=this.roundNumber(1000/this.renderingFrequency,2);

	this.webDocument=new WebDocument();
	this.canvas=this.webDocument.getCanvas();
	this.renderingCanvas=this.webDocument.getRenderingCanvas();

	this.graph=new Graph(this.getWidth(),this.getHeight());


/*
 * Resolution.
 *
 */

/*
	var physicalScreenWidth=window.screen.width;
	var physicalScreenHeight=window.screen.height;

	var availableWidth=window.screen.availWidth;
	var availableHeight=window.screen.availHeight;
*/

	var availableWidth=window.innerWidth;
	var availableHeight=window.innerHeight;

// fix the screen size
	this.width=availableWidth;
	this.height=availableHeight;

/*
	this.width=physicalScreenWidth;
	this.height=physicalScreenHeight;
*/

	//this.width=virtualWindowWidth;
	//this.height=virtualWindowHeight-40;

	this.canvas.width=this.width;
	this.canvas.height=this.height;
	this.renderingCanvas.width=this.width;
	this.renderingCanvas.height=this.height;

	this.humanInterface=new HumanInterface(this,this.graphOperator.getDataStore());
	this.pathOperator=new PathOperator(this.graphOperator.getDataStore(),this.graphOperator);
	this.renderer=new Renderer(this);
	this.renderer.setPathOperator(this.pathOperator);
	this.graphOperator.setPathOperator(this.pathOperator);
	this.humanInterface.getInventory().setPathOperator(this.pathOperator);

	this.engine=new PhysicsEngine(this);
	this.renderer.setQuadTree(this.engine.getQuadTree());

	/* number of vertices */
	this.n=16;
	this.degree=2;
	this.typeIndex=0;
	this.types=["linear","random","star"];
	this.type=this.types[this.typeIndex];

	this.context=this.canvas.getContext("2d");
	this.renderingContext=this.renderingCanvas.getContext("2d");

	var screenObject=this;

/**
 * \see http://stackoverflow.com/questions/3558537/preventdefault-not-working-in-google-chrome-5
 * \see http://stackoverflow.com/questions/8838635/event-preventdefault-working-in-chrome-not-firefox-for-a-submit-button
 * \see http://stackoverflow.com/questions/7059039/how-to-prevent-accidental-select-drag-highlight-on-webpage-when-drawing-off-html
 * \see https://developer.mozilla.org/en-US/docs/Web/API/event.preventDefault
 */
	function handleMouseDown(e){
		screenObject.handleMouseDown.call(screenObject,e);

		return false;
	}

	function handleMouseUp(e){
		screenObject.handleMouseUp.call(screenObject,e);

		return false;
	}

	function handleMouseMove(e){
		screenObject.handleMouseMove.call(screenObject,e);

		return false;
	}

	function handleMouseDoubleClick(e){
		screenObject.handleMouseDoubleClick.call(screenObject,e);

		return false;
	}

	this.canvas.addEventListener("mousedown",handleMouseDown,false);
	this.canvas.addEventListener("mouseup",handleMouseUp,false);
	this.canvas.addEventListener("mousemove",handleMouseMove,false);
	this.canvas.addEventListener("dblclick",handleMouseDoubleClick,false);

	/*
	 * fixes a problem where double clicking causes text to get selected on the canvas
	 * \see http://css.dzone.com/articles/gentle-introduction-making
	 */

	function handleStart(e) {
		e.preventDefault();

		return false;
	}

	this.canvas.addEventListener('selectstart', handleStart, false);

	//this.createButtons();

	this.loadingAnimation=new LoadingAnimation(this);
	this.start();
}

Screen.prototype.receiveMessage=function(message){
	if(message.getTag()==RAY_MESSAGE_TAG_GET_KMER_LENGTH_REPLY){
		var graphOperator=message.getSource();
		this.kmerLength=graphOperator.getKmerLength();
	}
}

Screen.prototype.getOriginX=function(){
	return this.originX;
}

Screen.prototype.getOriginY=function(){
	return this.originY;
}

Screen.prototype.getOriginXSpeed=function(){
	return this.originXSpeed;
}

Screen.prototype.getOriginYSpeed=function(){
	return this.originYSpeed;
}

Screen.prototype.start=function(){


	this.vertexSelected=null;
	this.lastUpdate=this.getMilliseconds();
	this.lastUpdateForControl=this.getMilliseconds();
	this.identifier=0;

	this.moveOrigin=false;

	this.clear();

	this.lastOriginX=this.originX;
	this.lastOriginY=this.originY;
	this.lastMouseX=0;
	this.lastMouseY=0;

	this.graphOperator.createGraph(this.graph);

	this.gameMilliseconds=0;
	this.gameFrameNumber=0;
	this.globalGameFrameNumber=0;
	this.actualGameFrequency=0;
	this.actualGameFrameLength=0;

	this.drawingMilliseconds=0;
	this.drawingFrames=0;
	this.actualRenderingFrequency=0;
	this.actualRenderingFrameLength=0;
}

Screen.prototype.handleMouseMove=function(eventObject){
	var position=this.getMousePosition(eventObject);

	if(this.mode == MODE_SELECT && !this.humanInterface.getInventory().getTextWidgetClicked()) {
		if(this.renderer.getSelectionBeginning()) {
			this.renderer.setSelectionEnd(new Point(position[0], position[1]));
			this.selection = "";
			var end = this.translatePoint(new Point(position[0], position[1]));
			var begin = this.translatePoint(this.renderer.getBeginPoint());
			if(end.getX() < begin.getX()) {
				var buffer = begin.getX();
				begin.setX(end.getX());
				end.setX(buffer);
			}
			if(end.getY() < begin.getY()) {
				var buffer = begin.getY();
				begin.setY(end.getY());
				end.setY(buffer);
			}
			var width = end.getX() - begin.getX();
			var height = end.getY() - begin.getY();
			var quadTreePoint = new Point(begin.getX() + width / 2, begin.getY() + height / 2)
			var result = this.engine.getQuadTree().query(quadTreePoint, width, height);
			var subGraph = new Object();
			this.listOfSelectedVertex = [];
			for(var i = 0; i < result.length; i++) {
				var vertex = this.graph.getVertex(result[i]);
				if(this.pathOperator.getSelectedRegion().getVertexPosition(result[i]) != -1) {
					this.listOfSelectedVertex.push(vertex);
					subGraph[this.pathOperator.getSelectedRegion().getVertexPosition(result[i])] = result[i];
				}
			}
			var first = true;
			for(var i in subGraph) {
				if(first) {
					this.selection = this.selection + subGraph[i];
					first = false;
				} else {
					this.selection = this.selection + subGraph[i][this.graphOperator.getDataStore().getKmerLength() - 1];
				}
			}
		}
	}
	this.humanInterface.handleMouseMove(position[0],position[1]);

	this.selectedVertex=null;
/*
 * Highlight the equipment.
 */
	if(this.mode == MODE_MOVE) {
		for(i in this.graph.getVertices()){
			var vertexToCheck=this.graph.getVertices()[i];
			if(vertexToCheck.isFollower() ||
				vertexToCheck.isInside(this.translateX(position[0]),
				this.translateY(position[1]))){

				this.selectedVertex=vertexToCheck;
			}
		}

		for(i in this.graph.getVertices()){
			if(this.graph.getVertices()[i].handleMouseMove(this.translateX(position[0]),
				this.translateY(position[1]))){
	/*
	* If we handle a object, we can not move the screen too.
	*/
				return;
			}
		}

	// This computes the force with which the slide will happen
		if(this.moveOrigin){

			var dx=this.lastMouseX-position[0];
			var dy=this.lastMouseY-position[1];

			var softModifier=0.3;

			dx*=softModifier;
			dy*=softModifier;

			dx/=this.zoomValue;
			dy/=this.zoomValue;

			if(dx!=0 || dy!=0){
				this.lastMouseGameFrame=this.globalGameFrameNumber;
				//console.log("Last move: "+this.lastMouseGameFrame);
			}

			this.originXSpeed=dx;
			this.originYSpeed=dy;

			this.originX=this.lastOriginX+dx;
			this.originY=this.lastOriginY+dy;
		}
	}
}

Screen.prototype.handleMouseDown=function(eventObject){
	var position=this.getMousePosition(eventObject);
	if(this.humanInterface.handleMouseDown(position[0],position[1])){
		return true;
	}

	if(!this.humanInterface.getInventory().getTextWidgetClicked()) {
		if(this.mode == MODE_SELECT) {
			this.renderer.setSelectionBeginning(new Point(position[0], position[1]));
		}
	}



	for(i in this.buttons){
		var candidate=this.buttons[i];
		if(candidate.handleMouseDown(position[0],position[1])){


			this.vertexSelected=null;

			// only one of them can be active
			if(candidate.getState()){
				this.addArcButton.resetState();
				this.addVertexButton.resetState();
				this.removeArcButton.resetState();
				this.removeVertexButton.resetState();
				candidate.activateState();
			}

			//this.processButtons();

			return;
		}
	}

/*
	if(false && this.addVertexButton.getState()){
		var vertex=new Vertex(position[0]+this.originX,position[1]+this.originY,this.identifier);
		this.vertices.push(vertex);

		this.identifier++;
		return;
	}
*/

	if(false && this.removeVertexButton.getState()){
		for(i in this.vertices){
			var vertexToCheck=this.vertices[i];
			if(vertexToCheck.isInside(position[0]+this.originX,position[1]+this.originY,this.vertexRadius)){

				var newTable=new Array();

				for(j in this.vertices){
/*
					if(!this.useGrid){
						break;
					}
*/
					//this.grid.removeEntry(j);
				}

				for(j in this.vertices){
					if(vertexToCheck.getName()!=this.vertices[j].getName()){
						newTable.push(this.vertices[j]);
					}
				}

				this.vertices=newTable;

				//var scale=this.range*this.vertexRadius;

				for(j in this.vertices){
					var vertex=this.vertices[i];

					//if(this.useGrid){
						//this.grid.addEntry(i,vertex.getX(),vertex.getY(),scale,scale);
					//}
				}


				for(j in this.vertices){
					this.vertices[j].removeArc(vertexToCheck);
				}

				return;
			}
		}
	}


	if(false && this.addArcButton.getState()){
		for(i in this.vertices){
			if(this.vertices[i].isInside(position[0]+this.originX,position[1]+this.originY,this.vertexRadius)){
				if(this.vertexSelected==null){
					this.vertexSelected=i;
				}else{
					if(i!=this.vertexSelected){
						this.createArcs(this.vertices[i],this.vertices[this.vertexSelected]);
					}
					this.vertexSelected=null;
				}

				return;
			}
		}
	}

	if(false && this.removeArcButton.getState()){
		for(i in this.vertices){
			var vertexToCheck=this.vertices[i];
			if(vertexToCheck.isInside(position[0]+this.originX,position[1]+this.originY,this.vertexRadius)){
				if(this.vertexSelected==null){
					this.vertexSelected=i;
				}else{
					if(i!=this.vertexSelected){
						var otherVertex=this.vertices[this.vertexSelected];
						vertexToCheck.removeArc(otherVertex);
						otherVertex.removeArc(vertexToCheck);
					}
					this.vertexSelected=null;
				}

				return;
			}
		}
	}

	if(this.mode == MODE_MOVE) {
		for(var i in this.graph.getVertices()){

			var vertex=this.graph.getVertices()[i];
			if(vertex.handleMouseDown(this.translateX(position[0]),
				this.translateY(position[1]))){

				// select this vertex
				this.pathOperator.setCurrentVertex(vertex.getSequence());

				return;
			}
		}
	}

	this.moveOrigin=true;
	this.lastMouseX=position[0];
	this.lastMouseY=position[1];
	this.lastOriginX=this.originX;
	this.lastOriginY=this.originY;

	this.originMoveInProgress=false;

	//eventObject.target.style.cursor="default";
}

Screen.prototype.getMousePosition=function(e){

	var eventObject=e || window.event;

	var mouseX;
	var mouseY;

	if(eventObject.offsetX) {
		mouseX = eventObject.offsetX;
		mouseY = eventObject.offsetY;
	}else if(eventObject.layerX) {
		mouseX = eventObject.layerX;
		mouseY = eventObject.layerY;
	}

	return [mouseX,mouseY];
}

Screen.prototype.handleMouseUp=function(eventObject){
	var position=this.getMousePosition(eventObject);

	if(this.mode == MODE_SELECT && !this.humanInterface.getInventory().getTextWidgetClicked()) {
		this.renderer.stopSelection();
		if(this.selection != "") {
			this.numberOfSelection++;
			this.humanInterface.getInventory().pushTextWidget(position[0] - 150, position[1] - 20, 300, 300, "Selection #" + this.numberOfSelection, true, this.selection);
			this.selection = "";
			this.listOfSelectedVertex = [];
		}
	}

	if(this.humanInterface.handleMouseUp(position[0],position[1]))
		return;

	for(i in this.graph.getVertices()){
		if(this.graph.getVertices()[i].handleMouseUp(this.translateX(position[0]),this.translateY(position[1]))){
			return;
		}
	}

	this.moveOrigin=false;
}

Screen.prototype.printGraph=function(){
	for(i in this.graph.getVertices()){
		this.graph.getVertices()[i].printArcs();
	}
}

Screen.prototype.roundNumber=function(number,precision){
	var multiplier=1;
	var i=0;
	while(i<precision){
		multiplier*=10;
		i++;
	}

	return Math.round(number*multiplier)/multiplier;
}

Screen.prototype.iterate=function(){

// show a loading icon
	if(this.graphOperator.getDataStore().hasPendingQueries()){
		this.loadingAnimation.setLoadingState();
	}

	this.loadingAnimation.iterate();
	this.graphOperator.iterate();
	this.humanInterface.iterate();
	this.pathOperator.iterate();

	if(this.humanInterface.getInventory().getSelectMode()) {
		this.mode = MODE_SELECT;
	} else {
		this.mode = MODE_MOVE;
	}

	if(this.pathOperator.hasVertex()){

		var sequence=this.pathOperator.getVertex();
		var vertex=this.graph.getVertex(sequence);

// try the reverse complement
		if(vertex==null){
			//console.log("VAlue: "+sequence);
			var object2=this.graphOperator.getReverseComplement(sequence);
			vertex=this.graph.getVertex(object2);
		}

		if(vertex!=null && !this.pathOperator.isCentered()){

			this.centerOnObject(vertex);
			this.pathOperator.setCenteredState();

/*
		}else if(vertex==null){
			if(this.pathOperator.getSelectedRegion().getRegionLength()==55611){
				console.log("Has object, but not found in graph");

				this.pathOperator.getSelectedRegion().print();
			}
*/
		}

		if(vertex!=null && this.canControlScreen){

			if(this.humanInterface.goNext()){
				this.centerOnObject(vertex);
				this.pathOperator.next();
				this.canControlScreen=false;
			}else if(this.humanInterface.goPrevious()){
				this.centerOnObject(vertex);
				this.pathOperator.previous();
				this.canControlScreen=false;
			}
		}
	}

	var start=this.getMilliseconds();

/*
 *
 * == TODO ==
 * This system of control (canControlScreen) does not work at scale because
 * at 256 obj. / 1000 iterations, the period is around ~4 iterations.
 * For at least 1000 obj. / 1000 iterations, that's ~1 iteration and anything above
 * is the same.
 *
 */
	if(start>=this.lastUpdateForControl+this.periodForControl){
		this.canControlScreen=true;
		this.lastUpdateForControl=start;
	}

	if(start>= this.lastUpdate+1000){
		this.actualGameFrequency=this.roundNumber(this.gameFrameNumber*1000/(start-this.lastUpdate),2);
		this.actualGameFrameLength=this.roundNumber(this.gameMilliseconds/this.gameFrameNumber,2);
		this.gameMilliseconds=0;
		this.gameFrameNumber=0;

		this.actualRenderingFrequency=this.roundNumber(this.drawingFrames*1000/(start-this.lastUpdate),2);
		this.actualRenderingFrameLength=this.roundNumber(this.drawingMilliseconds/this.drawingFrames,2);
		this.drawingMilliseconds=0;
		this.drawingFrames=0;

		this.lastUpdate=start;

		this.periodForControl=this.humanInterface.getMoviePeriod();
	}

	var activeObjects=this.getActiveObjects();
	this.engine.applyForces(activeObjects);

/**
 * Pull annotations independently.
 */
	this.graphOperator.pullAnnotations(activeObjects);

	if(this.enableEngine){
		this.engine.moveObjects(this.getActiveObjects());
	}

	var mouseFadeDelay=this.gameFrequency/4;

/*
 * Cancel sliding events.
 */
	if(this.globalGameFrameNumber>=this.lastMouseGameFrame+mouseFadeDelay
		&& !this.originMoveInProgress){

		this.originXSpeed=0;
		this.originYSpeed=0;

		this.lastMouseGameFrame=this.globalGameFrameNumber;
	}

	var epsilon=0.01;

/*
 * To the crazy sliding thing.
 */
	if(!this.moveOrigin){

		this.originX=this.originX+this.originXSpeed/this.originMoveSlices;
		this.originY=this.originY+this.originYSpeed/this.originMoveSlices;

		this.originXSpeed*=this.originDamping;
		this.originYSpeed*=this.originDamping;

		this.originMoveInProgress=true;

/*
 * TODO: the epsilon case is buggy.
 */
		if(this.originXSpeed< epsilon && this.originYSpeed< epsilon){
			//this.originMoveInProgress=false;
		}
	}

	this.performZoomOperations();

	var end=this.getMilliseconds();
	this.gameMilliseconds+=(end-start);

	this.gameFrameNumber++;
	this.globalGameFrameNumber++;

// process human controls

	this.processHumanControls();

// Pull data from the network

	this.graphOperator.pullObjects();
}

Screen.prototype.processHumanControls=function(){
	if(this.humanInterface.getInventory().getSelector().hasChoices()){

		var locationData=this.humanInterface.getInventory().getSelector().getLocationData();

		this.humanInterface.getInventory().getSelector().markAsConsumed();

		this.kmerLength=locationData["sequenceLength"];
		this.graphOperator.getDataStore().setMapIndex(locationData["map"]);
		this.graphOperator.getDataStore().setKmerLength(this.kmerLength);
		this.clear();

		this.pathOperator.startOnPath(locationData["map"],locationData["mapName"],
			locationData["section"],locationData["sectionName"],
			locationData["region"],locationData["regionName"],
			locationData["location"],locationData["locationName"],
			locationData["regionLength"],true);

		this.humanInterface.getInventory().createRegionSelector();
		this.humanInterface.getInventory().getWarpButton().resetState();
	}

	this.graphOperator.setMinimumCoverage(this.humanInterface.getMinimumCoverage());
}

Screen.prototype.checkScreenSize=function(){
	return(this.width==window.innerWidth && this.height==window.innerHeight &&
	this.canvas.width==this.width && this.canvas.heidth==this.height &&
	this.renderingCanvas.width==this.width && this.renderingCanvas.height==this.height);
}

Screen.prototype.performScreenSizeChange=function(){
	var availableWidth=window.innerWidth;
	var availableHeight=window.innerHeight;
	this.width=availableWidth;
	this.height=availableHeight;
	this.canvas.width=this.width;
	this.canvas.height=this.height;
	this.renderingCanvas.width=this.width;
	this.renderingCanvas.height=this.height;
}

Screen.prototype.getMilliseconds=function(){
	return new Date()*1;
}

Screen.prototype.performZoomOperations=function(){

	var epsilon=0.0000001;

	if(this.zoomValueSpeed!=0){

		//console.log("Old zoom value: "+this.zoomValue);

		var oldWidth=this.getWidth()/this.zoomValue;
		var oldHeight=this.getHeight()/this.zoomValue;

		//console.log("Speed: "+this.zoomValueSpeed);

		this.zoomValue+=(this.zoomValueSpeed/this.zoomSlices);

		var minimum=0.001;
		if(this.zoomValue<minimum)
			this.zoomValue=minimum;

		//console.log("New zoom value: "+this.zoomValue);

		var newWidth=this.getWidth()/this.zoomValue;
		var newHeight=this.getHeight()/this.zoomValue;

		//console.log("Old width: "+oldWidth+" new width: "+newWidth);

		var widthDifference=newWidth-oldWidth;
		var heightDifference=newHeight-oldHeight;
		//console.log("Width difference: "+widthDifference);

		this.originX-=widthDifference/2;
		this.originY-=heightDifference/2;

		this.zoomValueSpeed*=this.zoomDamping;

		if(-epsilon <= this.zoomValueSpeed && this.zoomValueSpeed <= epsilon){
			this.zoomValueSpeed=0;
		}
	}
}

Screen.prototype.drawControlPanel=function(){

	var context=this.getContext();

	if(this.selectedVertex!=null){
		var sequence=this.selectedVertex.getSequence();
		var toPrint=sequence.substr(0,sequence.length-1)+"["+sequence[sequence.length-1]+"]";

		var width=sequence.length*10+100;
		context.beginPath();
		context.lineWidth=1;
		context.strokeStyle = "rgb(0,0,0)";
		context.fillStyle = '#FFF8F9';
		context.rect(10, this.canvas.height-50,width, 35);
		context.fill();
		context.stroke();

		context.fillStyle    = '#000000';

		context.textAlign="left";
		context.font         = 'bold 12px Arial';
		context.fillText("sequence: ", 20, this.canvas.height-25);
		context.font         = '12px Arial';
		context.fillText(toPrint, 90, this.canvas.height-25);
	}

	var offsetX=10;
	var offsetY=115;
	var stepping=15;

	context.textAlign="left";
	context.fillStyle    = '#000000';
	context.font         = 'bold 12px Arial';

	if(this.debugMode == CONFIG_DEBUG_FPS_SIMPLE) {
		context.fillText(this.actualRenderingFrequency + " FPS (Game : " + this.actualGameFrameLength + " ms; Rendering : "
			+ this.actualRenderingFrameLength + " ms)", 100, 25);

	} else if(this.debugMode == CONFIG_DEBUG_FPS_FULL) {
		context.fillText("Registered objects: "+this.graph.getVertices().length+" active: "+this.activeObjects.length,
			offsetX,this.canvas.height-offsetY);
		offsetY-=stepping;

		context.fillText("HTTP GET requests: "+this.graphOperator.getDataStore().getHTTPRequests(),
			offsetX,this.canvas.height-offsetY);
		offsetY-=stepping;

		var printableZoom=this.roundNumber(this.zoomValue,4);

		context.fillText("Display: resolution: "+this.canvas.width+"x"+this.canvas.height+" origin: ("+
			this.roundNumber(this.originX,2)+","+this.roundNumber(this.originY,2)+") "+
			"zoom: "+printableZoom,
			offsetX,this.canvas.height-offsetY);
		offsetY-=stepping;

		context.fillText("Game (expected): frequency: "+this.gameFrequency+" Hz, frame length: "+this.gameFrameLength+" ms",
			offsetX,this.canvas.height-offsetY);
		offsetY-=stepping;

		var warning="";

		if(this.actualGameFrameLength>this.gameFrameLength)
			warning=" EXCEEDED!";

		context.fillText("Game (actual): frequency: "+this.actualGameFrequency+" Hz, frame length: "+this.actualGameFrameLength+
			" ms"+warning,offsetX, this.canvas.height-offsetY);
		offsetY-=stepping;

		context.fillText("Rendering (expected): frequency: "+this.renderingFrequency+" Hz, frame length: "
			+ this.renderingFrameLength+" ms", offsetX,this.canvas.height-offsetY);
		offsetY-=stepping;

		warning="";

		if(this.actualRenderingFrameLength>this.renderingFrameLength)
			warning=" EXCEEDED!";

		context.fillText("Rendering (actual): frequency: "+this.actualRenderingFrequency+" Hz, frame length: "
			+ this.actualRenderingFrameLength + " ms"+warning,offsetX, this.canvas.height-offsetY);
		offsetY-=stepping;
	}
}

/*
 * TODO: move this in HumanInterface or in Renderer
 */
Screen.prototype.draw=function(){

	var context=this.getContext();
/*
 * Setting dimensions clear the content.
 * 2012-11-13: IE9 does not support that.
 */

	if(!this.checkScreenSize()){
		this.performScreenSizeChange();
	}

	var start=this.getMilliseconds();

	this.renderer.draw(this.getActiveObjects());

/*
 * \see http://www.w3schools.com/tags/canvas_drawimage.asp
 */


	this.humanInterface.draw();

// draw a second round or buffered operations for not-transformed operations

	this.renderer.drawBufferedOperations(context);

	this.drawControlPanel();
/*
 * Everything below won't be processed because
 * of double-buffering
 */

	this.loadingAnimation.draw(context);

	this.context.clearRect(0,0,this.width,this.height);

	this.context.drawImage(this.renderingCanvas,
		0,0,this.width,this.height,
		0,0,this.width,this.height);


	var end=this.getMilliseconds();
	this.drawingMilliseconds+=(end-start);
	this.drawingFrames++;
}

Screen.prototype.getRandomX=function(){
	return Math.random()*(this.canvas.width-1);
}

Screen.prototype.getRandomY=function(){
	return Math.random()*(this.canvas.height-1);
}

Screen.prototype.getContext=function(){
	return this.renderingContext;
}

Screen.prototype.getWidth=function(){
	return this.canvas.width;
}

Screen.prototype.getHeight=function(){
	return this.canvas.height;
}

/**
 * We need to normalize any geometrical object.
 * Points are discrete and don't need to be normalized -- it
 * is just display view port that matters.
 */
Screen.prototype.isPointOutside=function(x,y,buffer){

	x-=this.originX;
	y-=this.originY;

	var width=this.width;
	var height=this.height;

	buffer/=this.zoomValue;
	width/=this.zoomValue;
	height/=this.zoomValue;

/*
 * The buffer region around the screen.
 */
	if(x<(0-buffer))
		return true;

	if(x>=(width+buffer))
		return true;

	if(y<(0-buffer))
		return true;

	if(y>=(height+buffer))
		return true;

	return false;
}

/**
 * Reports if an object is outside.
 *
 * Coordinates are native, not the the one displayed.
 */
Screen.prototype.isOutside=function(vertex,buffer){

	var x=vertex.getX();
	var y=vertex.getY();

	return this.isPointOutside(x,y,buffer);
}


Screen.prototype.getActiveObjects=function(){

/*
 * Quantum value of the machine.
 */
	var quantum=8192;
	var vertices=this.graph.getVertices();

/*
 * Size of buffer for active objects within the
 * activation engine.
 */
	var bufferForActiveObjects=512;

	var i=0;
	while(i<quantum && this.activeIndex<vertices.length){
		var vertex=vertices[this.activeIndex];

		if(vertex.isColored()){
			if(vertex.getCoverageValue()<this.humanInterface.getMinimumCoverage()){
				vertex.disable();
			}else{
				vertex.enable();
			}
		}

		if(vertex.isEnabled() && !this.isOutside(vertex,bufferForActiveObjects)){
			this.nextActiveObjects.push(vertex);
		}

		i++;
		this.activeIndex++;
	}

/*
 * We tested all objects.
 */
	if(this.activeIndex>=vertices.length){
		this.activeObjects=this.nextActiveObjects;
		this.nextActiveObjects=new Array();
		this.activeIndex=0;
		//this.engine.resetActiveIndex();
	}

	return this.activeObjects;
}

Screen.prototype.translateX=function(x){
	var result=(x/this.zoomValue+this.originX);
	//console.log("x= "+x+" originX= "+this.originX+" zoom: "+this.zoomValue+" translated= "+result);
	return result;
}

Screen.prototype.translateY=function(y){
	return (y/this.zoomValue+this.originY);
}

Screen.prototype.translatePoint = function(point) {
	var x = point.getX();
	var y = point.getY();

	//return new Point(x, y);
	return (new Point(this.translateX(x), this.translateY(y)));
}

Screen.prototype.getZoomValue=function(){
	return this.zoomValue;
}

Screen.prototype.getZoomValueSpeed=function(){
	return this.zoomValueSpeed;
}

Screen.prototype.processKeyboardEvent=function(e){
	this.humanInterface.processKeyboardEvent(e);
}

Screen.prototype.handleMouseDoubleClick=function(e){
	var point=this.getMousePosition(e);
	this.humanInterface.handleMouseDoubleClick(point[0],point[1]);
}

Screen.prototype.updateOrigin=function(originX,originY,originXSpeed,originYSpeed,zoomValue,zoomValueSpeed){
	this.originX=originX;
	this.originY=originY;
	this.originXSpeed=originXSpeed;
	this.originYSpeed=originYSpeed;
	this.setZoomValue(zoomValue);
	this.zoomValueSpeed=zoomValueSpeed;
}

Screen.prototype.setZoomValue=function(zoomValue){
	this.zoomValue=zoomValue;
}

Screen.prototype.toggleDebugMode=function(){
	this.debugMode ++;
	if(this.debugMode > CONFIG_DEBUG_REQUEST) {
		this.debugMode = 0;
	}

	//this.debugMode = !this.debugMode;

	this.graphOperator.getDataStore().setDebugMode(this.debugMode);
}

Screen.prototype.clear=function(){
	this.originX=0;
	this.originY=0;
}

Screen.prototype.center=function(x,y){
	this.originXSpeed=x-(this.originX+this.width/2/this.zoomValue);
	this.originYSpeed=y-(this.originY+this.height/2/this.zoomValue);

	var softModifier=0.1;
	this.originXSpeed*=softModifier;
	this.originYSpeed*=softModifier;
}

Screen.prototype.centerOnObject=function(object){
	this.center(object.getX(),object.getY());
}

Screen.prototype.getHumanInterface=function(){
	return this.humanInterface;
}

Screen.prototype.getDebugMode = function(){
	return this.debugMode;
}

Screen.prototype.getPathOperator = function(){
	return this.pathOperator;
}

Screen.prototype.getRenderer = function(){
	return this.renderer;
}

Screen.prototype.getMode = function() {
	return this.mode;
}

Screen.prototype.getListOfSelectedVertices = function(){
	return this.listOfSelectedVertex;
}

Screen.prototype.isInSelectionMode = function() {
	return this.getMode() == MODE_SELECT;
}
