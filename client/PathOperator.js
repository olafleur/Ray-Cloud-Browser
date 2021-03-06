/*
 *  Ray Cloud Browser: interactively skim processed genomics data with energy
 *  Copyright (C) 2012, 2013 Sébastien Boisvert
 *  Copyright (C) 2013 Jean-François Erdelyi
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
 * Operate on paths
 *
 * \author Sébastien Boisvert
 */
function PathOperator(dataStore,graphOperator){
	this.dataStore=dataStore;
	this.graphOperator=graphOperator;

	this.reset();

	this.selectedRegionIndex=0;
	this.selectedRegion=false;
	this.defineColors();

	this.readaheadConfiguration=4096;

	this.availableColorsOfSections = new Array();
}

PathOperator.prototype.getSelectedRegion=function(){
	if(this.hasSelectedRegion())
		return this.getRegion(this.selectedRegionIndex);

	return null;
}

PathOperator.prototype.getRegions=function(){
	return this.regions;
}

PathOperator.prototype.getDistributionGraph = function() {
	if(this.hasSelectedRegion()) {
		return this.regions[this.selectedRegionIndex].getDistributionGraph();
	}
}

PathOperator.prototype.getCoverageByPositionGraph = function() {
	if(this.hasSelectedRegion()) {
		return this.regions[this.selectedRegionIndex].getCoverageByPositionGraph();
	}
}

PathOperator.prototype.getPositionInSelectedRegion = function() {
	if(this.hasSelectedRegion()) {
		return this.regions[this.selectedRegionIndex].getLocation();
	}
	return -1;
}

PathOperator.prototype.getRegion=function(index){
	if(!(index<this.regions.length))
		return null;

	return this.regions[index];
}

PathOperator.prototype.defineColors=function(){

	this.availableColors=[];

	var colors=new Object();

	var zoneWidth=32;
	var zoneStart=0;
	var zoneFinalWidth=255;

	var count=32;

	while(count){

		var red=Math.round(zoneStart+Math.random()*zoneFinalWidth);
		var green=Math.round(zoneStart+Math.random()*zoneFinalWidth);
		var blue=Math.round(zoneStart+Math.random()*zoneFinalWidth);

		var key=Math.round(red/zoneWidth)+"-"+Math.round(green/zoneWidth)+"-"+Math.round(blue/zoneWidth);

		if(key in colors)
			continue;

		colors[key]=true;

		//console.log("key= "+key);

		var color="rgb("+red+","+green+","+blue+")";

		count--;
		//console.log("Add color "+color);

		this.availableColors.push(color);
	}

	//console.log("Colors: "+this.availableColors.length);

	this.colorIndex=0;
}

PathOperator.prototype.allocateColor=function(){

	var color=this.availableColors[this.colorIndex++];

	this.colorIndex %= this.availableColors.length;

	return color;
}

PathOperator.prototype.allocateColorOfRegion = function(index){
	if(!this.availableColorsOfSections[index]) {
		if(!this.availableColors[index]) {
			this.availableColorsOfSections[index] = this.allocateColor();
		} else {
			this.availableColorsOfSections[index] = this.availableColors[index];
		}
	}
	return this.availableColorsOfSections[index];
}

PathOperator.prototype.hasSelectedRegion=function(){
	return this.selectedRegion;
}

PathOperator.prototype.getKey=function(mapIndex,sectionIndex,regionIndex){

	return "map"+mapIndex+"section"+sectionIndex+"region"+regionIndex;
}

PathOperator.prototype.startOnPath=function(mapIndex,mapName,
			sectionIndex,sectionName,
			regionIndex,regionName,
			locationIndex,locationName,
			regionLength,
			isANewStart
){
	var key=this.getKey(mapIndex,sectionIndex,regionIndex);

	var color=this.allocateColor();
	var colorOfRegion = this.allocateColorOfRegion(sectionIndex);

	var region=new Region(mapIndex,mapName,
			sectionIndex,sectionName,
			regionIndex,regionName,
			locationIndex,locationName,
			regionLength,
			color,
			colorOfRegion);

	if(isANewStart){
		this.reset();

		this.selectedRegion=true;
		this.selectedRegionIndex=this.regions.length;
		this.dataStore.clear();
		this.graphOperator.clear();
	}

	this.index[key]=region;

	this.regions.push(region);

	this.hasLocation=true;

	var parameters=new Object();
	parameters["map"]=mapIndex;
	parameters["section"]=sectionIndex;
	parameters["region"]=regionIndex;
	parameters["location"]=locationIndex;
	parameters["count"]=512;
	parameters["depth"] = true;

	var message=new Message(RAY_MESSAGE_TAG_GET_REGION_KMER_AT_LOCATION,
				this,this.dataStore,parameters);

	this.dataStore.forwardMessageOnTheWeb(message);

	this.active=true;
}

PathOperator.prototype.getParametersForRegion=function(region){
	var parameters=new Object();
	parameters["map"]=region.getMap();
	parameters["section"]=region.getSection();
	parameters["region"]=region.getRegion();
	parameters["location"]=region.getLocation();
	parameters["count"]=this.readaheadConfiguration;
	parameters["depth"] = true;

	return parameters;
}

PathOperator.prototype.receiveAndProcessMessage=function(message){
	var tag=message.getTag();

	if(tag==RAY_MESSAGE_TAG_GET_REGION_KMER_AT_LOCATION_REPLY){

		this.call_RAY_MESSAGE_TAG_GET_REGION_KMER_AT_LOCATION_REPLY(message);

	}else if(tag==RAY_MESSAGE_TAG_GET_REGIONS_REPLY){

		this.call_RAY_MESSAGE_TAG_GET_REGIONS_REPLY(message);
	}
}

PathOperator.prototype.call_RAY_MESSAGE_TAG_GET_REGIONS_REPLY=function(message){

	var content=message.getContent();

	var mapIndex=content["map"];
	var mapName=this.dataStore.getMapName(mapIndex);
	var sectionIndex=content["section"];
	var sectionName=this.dataStore.getSectionName(mapIndex,sectionIndex);
	var regionIndex=content["start"];
	var regionName=content["regions"][0]["name"];

	var key=this.getKey(mapIndex,sectionIndex,regionIndex);

// fetch location from cache memory
	var locationIndex=this.index[key][3];

	var locationName=locationIndex+1;

	var regionLength=content["regions"][0]["nucleotides"]-this.dataStore.getKmerLength()+1;

/* call start in stuff */

	this.startOnPath(mapIndex,mapName,sectionIndex,sectionName,regionIndex,regionName,
		locationIndex,locationName,regionLength,false);
}

PathOperator.prototype.call_RAY_MESSAGE_TAG_GET_REGION_KMER_AT_LOCATION_REPLY=function(message){
	this.active=false;

	var content=message.getContent();

	var mapIndex=content["map"];
	var sectionIndex=content["section"];
	var regionIndex=content["region"];

	var key = this.getKey(mapIndex, sectionIndex, regionIndex);

/*
	if(!(key in this.index)){
		console.log("Error: key "+key+" was not found.");
	}
*/

	this.regionEntry = this.index[key];

	var vertices=content["vertices"];

	var i=0;
	while(i<vertices.length){

		var sequence = vertices[i]["sequence"];
		var position = vertices[i]["position"];

		this.regionEntry.addVertexAtPosition(position, sequence, vertices[i]["coverage"]);

		if(vertices[i]["coverage"]) {
			this.regionEntry.addInformationsForGraphs(vertices[i]["coverage"], position);
		}

		if(!this.regionEntry.hasLeftPosition() || position<this.regionEntry.getLeftPosition()){
			this.regionEntry.setLeftPosition(position);
		}

		var pathPositions=this.regionEntry.getPathPositions();

		if(!(sequence in pathPositions)){
			pathPositions[sequence]=new Array();
		}

		var found=false;
		var iterator=0;
		while(iterator<pathPositions[sequence].length){
			if(pathPositions[sequence][iterator++]==position){
				found=true;
				break;
			}
		}

		if(!found){
			pathPositions[sequence].push(position);

			this.graphOperator.addPositionForVertex(sequence,position);
		}

		if(!this.regionEntry.hasRightPosition() || position>this.regionEntry.getRightPosition()){
			this.regionEntry.setRightPosition(position);
		}

		i++;
	}

// need to bootstrap the beast once.
// the code below this line is only used once to kickstart the whole
// thing.

	if(this.started){
		return;
	}

	this.started=true;

	var locationInRegion=this.getSelectedRegion().getLocation();

// pick up a middle position
	var kmerSequence=vertices[Math.floor(vertices.length/2)]["sequence"];

	var i=0;
	while(i<vertices.length){
		var sequence=vertices[i]["sequence"];
		var position=vertices[i]["position"];

		if(position==locationInRegion){
			kmerSequence=sequence;

			break;
		}

		i++;
	}

	var parameters = new Object();
	parameters["map"]=this.dataStore.getMapIndex();
	parameters["sequence"]=kmerSequence;
	parameters["count"]=this.dataStore.getDefaultDepth();

	var theMessage=new Message(RAY_MESSAGE_TAG_GET_KMER_FROM_STORE,this.dataStore,this.dataStore,parameters);
	this.dataStore.sendMessageOnTheWeb(theMessage);
}

PathOperator.prototype.iterate=function(){
	this.doReadahead();
}

PathOperator.prototype.doReadahead=function(){

	if(this.active){
		return;
	}

	if(this.regions.length==0)
		return;

	var region=this.regions[this.selector];

/*
	if(region === undefined)
		console.log("Is undefined at @ "+this.selector+", has "+this.regions.length+" entries");
*/

	this.pull(region);

	this.selector++;
	this.selector%=this.regions.length;
}

PathOperator.prototype.pull=function(region) {
	if(!(region.hasLeftPosition() && region.hasRightPosition()))
		return;

	var position=region.getLocation();

	var buffer=1024;

/*
 * We can not pull before 0.
 */
	if(position<region.getLeftPosition()+buffer && region.getLeftPosition()!=0) {

		this.active=true;
		var parameters=this.getParametersForRegion(region);
		parameters["location"]=region.getLeftPosition()-this.readaheadConfiguration;
		if(parameters["location"]<0) {
			parameters["location"]=0;
		}
		var message=new Message(RAY_MESSAGE_TAG_GET_REGION_KMER_AT_LOCATION,
				this,this.dataStore,parameters);
		this.dataStore.forwardMessageOnTheWeb(message);

/*
 * It is impossible to pull after LENGTH-1
 */
	}else if(position > region.getRightPosition()-buffer
		&& region.getRightPosition() !=region.getRegionLength()-1){

		this.active=true;
		var parameters=this.getParametersForRegion(region);
		parameters["location"]=region.getRightPosition();
		var message=new Message(RAY_MESSAGE_TAG_GET_REGION_KMER_AT_LOCATION,
				this,this.dataStore,parameters);
		this.dataStore.forwardMessageOnTheWeb(message);
	}
}

PathOperator.prototype.isVertexInPath=function(vertex){

	return this.getSelectedRegion().isVertexInPath(vertex);
}

PathOperator.prototype.reset=function() {

	this.centered=false;
	this.active=false;
	this.started=false;
	this.hasLocation=false;
	this.index=new Object();
	this.regions=[];

	this.selector=0;
}

PathOperator.prototype.getVertexPosition=function(sequence){

	return this.getSelectedRegion().getVertexPosition(sequence);
}

PathOperator.prototype.hasVertex=function(){

	if(!this.hasSelectedRegion())
		return false;

	return this.getSelectedRegion().hasVertex()
}

PathOperator.prototype.getVertex=function(){
	if(!this.hasVertex())
		return null;

	return this.getSelectedRegion().getVertex();
}

PathOperator.prototype.next=function(){
	this.getSelectedRegion().next();
}

PathOperator.prototype.previous=function(){
	this.getSelectedRegion().previous();
}

PathOperator.prototype.getVertexPositions=function(sequence){

	return this.getSelectedRegion().getVertexPositions(sequence);
}

PathOperator.prototype.hasCurrentLocation=function(){
	return this.hasLocation;
}

PathOperator.prototype.getCurrentLocation=function(){

	return this.getSelectedRegion().getLocation();
}

PathOperator.prototype.isCentered=function(){
	return this.centered;
}

PathOperator.prototype.setCenteredState=function(){
	this.centered=true;
}

PathOperator.prototype.selectRegion=function(index){
	if(!(index<this.regions.length))
		return;

	this.selectedRegionIndex=index;

	this.centered=false;
}

/**
 * Send a message to obtain information for this
 * region.
 *
 * The name can be obtained with this query:
 *
 * http://localhost/server/?action=getRegions&map=0&section=0&start=5&count=1
 */
PathOperator.prototype.addRegion=function(mapIndex,sectionIndex,regionIndex,locationIndex){

	var parameters=new Object();
	parameters["map"]=mapIndex;
	parameters["section"]=sectionIndex;
	parameters["start"]=regionIndex;
	parameters["count"]=1;

	var key=this.getKey(mapIndex,sectionIndex,regionIndex);

	if(key in this.index)
		return;

	var message=new Message(RAY_MESSAGE_TAG_GET_REGIONS,
				this,this.dataStore,parameters);

	this.dataStore.forwardMessageOnTheWeb(message);

	this.index[key]=[mapIndex,sectionIndex,regionIndex,locationIndex];
}

/**
 * TODO: perform caching for this.
 */
PathOperator.prototype.getColors=function(vertex, section){
	var regions=this.getRegions();

	var i=0;
	var sequence=vertex.getSequence();
	var reverse=this.graphOperator.getReverseComplement(sequence);

	var colors=new Array();
	if(section) {
		for(var i = 0; i < this.availableColorsOfSections.length; i++) {
			var skip = true;
			var j = 0;
			while(j < regions.length){
				var region = regions[j++];
				if(this.relationExist(region, sequence, reverse)) {
					skip = false;
				}
			}
			if(skip) {
				continue;
			}
			var pathColor = this.availableColorsOfSections[i];
			colors.push(pathColor);
		}
	} else {
		while(i<regions.length){
			var region=regions[i++];
			if(!region.isVertexInPath(sequence) && !region.isVertexInPath(reverse))
				continue;

			var pathColor=region.getColor();
			colors.push(pathColor);
		}
	}
/*
 * The ordering must always be the same.
 */
	//colors.sort();

	return colors;
}

PathOperator.prototype.getColorsForPair=function(vertex, vertex2, section){
	var regions=this.getRegions();

	var i=0;
	var sequence=vertex.getSequence();
	var reverse=this.graphOperator.getReverseComplement(sequence);

	var sequence2=vertex2.getSequence();
	var reverse2=this.graphOperator.getReverseComplement(sequence2);

	var colors=new Array();

	if(section) {
		for(var i = 0; i < this.availableColorsOfSections.length; i++) {
			var skip = true;
			var j = 0;
			while(j < regions.length){
				var region = regions[j++];
				if(this.relationExist(region, sequence, reverse) && this.relationExist(region, sequence2, reverse2)) {
					skip = false;
				}
			}
			if(skip) {
				continue;
			}
			var pathColor = this.availableColorsOfSections[i];
			colors.push(pathColor);
		}
	} else {
		while(i<regions.length){
			var region=regions[i++];
			if(!this.relationExist(region, sequence, reverse)) {
				continue;
			}
			if(!this.relationExist(region, sequence2, reverse2)) {
				continue;
			}
			var pathColor=region.getColor();
			colors.push(pathColor);
		}
	}

/*
 * The ordering must be consistent for the renderer to work properly.
 */
	//colors.sort();

	return colors;
}

PathOperator.prototype.relationExist = function(region, sequence, reverse){
	if(!region.isVertexInPath(sequence) && !region.isVertexInPath(reverse)) {
		return false;
	}
	return true;
}

PathOperator.prototype.setCurrentVertex=function(sequence){
	this.setCurrentVertexWithSecondCall(sequence,true);
}

PathOperator.prototype.setCurrentVertexWithSecondCall=function(sequence,doSecondCall){

	if(this.hasSelectedRegion()){
		if(this.getSelectedRegion().setCurrentVertex(sequence))
			return;
	}

	var i=0;
	while(i<this.regions.length){
		if(this.regions[i].setCurrentVertex(sequence)){
			this.selectRegion(i);
			return;
		}
		i++;
	}

/**
 * Also try to match it against a reverse complement hit.
 */
	if(doSecondCall){
		var reverse=this.graphOperator.getReverseComplement(sequence);

		this.setCurrentVertexWithSecondCall(reverse,!doSecondCall);
	}
}
