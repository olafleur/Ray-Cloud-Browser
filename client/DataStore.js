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
 * The data store is the backend for data
 * retrieval.
 *
 * This is the only class allowed to send HTTP GET requests.
 *
 * \author Sébastien Boisvert
 */
function DataStore(){

	this.firstKmerReceived=false;
	this.pendingRequests=0;

	this.clear();

	this.defaultDepthFirst=32;
	this.defaultDepth=512;
	this.maximumParallelQueries=8;
	this.httpRequests=0;

	this.pullData();

	this.messageQueue=new MessageQueue();
}

DataStore.prototype.clear=function(){

	this.store=new Object();
}

/**
 *
 * This send a message on the web.
 * The source is obviously this.
 * This is the only place that uses JSON and XMLHttpRequest.
 *
 * \param messageTag message tag
 * \param source local source
 * \param destination local destination
 * \param content array of arguments
 * \param replyTag reply tag to the message tag
 *
 */
DataStore.prototype.sendMessageOnTheWeb=function(message){

	var messageTag=message.getTag();
	var source=message.getSource();
	var destination=message.getDestination();
	var content=message.getContent();
	var replyTag=messageReplies[messageTag];

	var xmlHttp=null;

	var cgiProgram=CONFIG_WEB_SERVER;

	var processed=new Object();

	var queryString="action="+messageActions[messageTag];
	processed["tag"]=true;

	for(var key in content){

		if(key in processed)
			continue;

		queryString+="&"+key+"="+content[key];

		processed[key]=true;
	}

	var method="GET";

	var address=cgiProgram+"?"+queryString;
/*
 * This won't work with older browser, things before IE7.
 */
	if(window.XMLHttpRequest){
		xmlHttp=new XMLHttpRequest();
	}

	xmlHttp.open(method,address,true);
	xmlHttp.send();

	var debug=this.debugMode;
	var query=this.httpRequests;

	if(debug == CONFIG_DEBUG_REQUEST){
		console.log("HTTP Request # "+query+" "+address);
	}

	xmlHttp.onreadystatechange=function(){
		if(xmlHttp.readyState==4){

			var content=JSON.parse(xmlHttp.responseText);

			var message=new Message(replyTag,
						source,
						destination,
						content);

			source.pendingRequests--;

			if(debug == CONFIG_DEBUG_REQUEST){
				console.log("HTTP Response # "+query+" "+address);
			}

			destination.receiveAndProcessMessage(message);
		}
	}

	this.pendingRequests++;

	this.httpRequests++;
}

DataStore.prototype.setDebugMode=function(value){
	this.debugMode=value;
}

DataStore.prototype.pullData=function(){

	var body=new Object();
	body["depth"]=this.defaultDepthFirst;

	var tag=RAY_MESSAGE_TAG_GET_FIRST_KMER_FROM_STORE_REPLY;

	var theMessage=new Message(tag,this,this,body);
	this.processMessage(theMessage);
}

DataStore.prototype.finishConstruction=function(){

	for(key in this.store){
		this.firstKmer=key;
		break;
	}

/*
 * Pick up a starting key.
 */
	for(key in this.store){
		var entry=this.store[key];

		if(entry["parents"].length>=1 && entry["children"].length >=1 && entry["coverage"]>=10){
			this.firstKmer=key;
			break;
		}
	}

	//this.kmerLength=this.firstKmer.length;
}

DataStore.prototype.getKmerLength=function(){
	return this.kmerLength;
}

DataStore.prototype.setKmerLength=function(value){
	this.kmerLength=value;
}

DataStore.prototype.receiveMessage=function(message){

	this.messageQueue.push(message);
}

DataStore.prototype.processMessages=function(){
	var message=this.messageQueue.pop();

	while(message!=null){
		this.processMessage(message);
		message=this.messageQueue.pop();
	}
}

DataStore.prototype.processMessage=function(message){
	var tag=message.getTag();

	if(tag==RAY_MESSAGE_TAG_GET_FIRST_KMER_FROM_STORE){

/* message ordering stuff */
		if(!this.firstKmerReceived){
			this.receiveMessage(message);

			this.firstKmerReceived=true;
			return;
		}

		var prefix=this.firstKmer;
		graphOperator=message.getSource();

		graphOperator.receiveFirstKmer(prefix);

	}else if(tag==RAY_MESSAGE_TAG_GET_FIRST_KMER_FROM_STORE_REPLY){

		this.clear();

		this.finishConstruction();
	}else if(tag==RAY_MESSAGE_TAG_GET_KMER_FROM_STORE_REPLY){

		var text=message.getContent();
		this.addDataInStore(text);

		var kmerSequence=text["sequence"];
// do a fancy recursive call !

		this.getKmerInformation(kmerSequence);
		this.graphOperator.receiveSignal();

	}else if(tag==RAY_MESSAGE_TAG_GET_MAPS){

		var parameters=new Object();

		var theMessage=new Message(tag,this,message.getSource(),parameters);
		this.sendMessageOnTheWeb(theMessage);

	}else if(tag==RAY_MESSAGE_TAG_GET_REGIONS){

		var theMessage=new Message(tag,this,message.getSource(),message.getContent());
		this.sendMessageOnTheWeb(theMessage);

	}else if(tag==RAY_MESSAGE_TAG_GET_MAP_INFORMATION){

		var theMessage=new Message(tag,this,message.getSource(),message.getContent());
		this.sendMessageOnTheWeb(theMessage);
	}
}

DataStore.prototype.setMapIndex=function(map){
	this.mapIndex=map;
}

DataStore.prototype.getMapIndex=function(){
	return this.mapIndex;
}

DataStore.prototype.getMapName=function(index){
	return this.mapData[index]["name"];
}

DataStore.prototype.setMapData=function(data){
	this.mapData=data;
}

DataStore.prototype.getSectionName=function(index1,index2){
	return this.mapData[index1]["sections"][index2]["name"];
}

/**
 * This is the method to use if a message must be sent on the web
 * using DataStore as a proxy.
 */
DataStore.prototype.forwardMessageOnTheWeb=function(message){

	var theMessage=new Message(message.getTag(),this,message.getSource(),message.getContent());
	this.sendMessageOnTheWeb(theMessage);
}

DataStore.prototype.setGraphOperator=function(graphOperator){
	this.graphOperator=graphOperator;
}

DataStore.prototype.getKmerInformation=function(kmerSequence){

	if(kmerSequence == undefined){
		return;
	}

/*
 * Send a request to the server.
 * TODO: to some readahead.
 */
	if(!(kmerSequence in this.store)){

/*
 * We don't answer queries when we are waiting.
 */

		var parameters=new Object();
		parameters["map"]=this.mapIndex;
		parameters["sequence"]=kmerSequence;
		parameters["count"]=this.defaultDepth;

		var tag=RAY_MESSAGE_TAG_GET_KMER_FROM_STORE;
		var theMessage=new Message(tag,this,this,parameters);
		this.sendMessageOnTheWeb(theMessage);

		return;
	}

	var coverage=0;
	var parents=new Array();
	var children=new Array();

	if(kmerSequence in this.store){
		coverage=this.store[kmerSequence]["coverage"];

		for(var index in this.store[kmerSequence]["parents"]){
			var symbol=this.store[kmerSequence]["parents"][index];
			var otherSequence=symbol+kmerSequence.substr(0,this.kmerLength-1);
			parents.push(otherSequence);
		}

		for(var index in this.store[kmerSequence]["children"]){
			var symbol=this.store[kmerSequence]["children"][index];
			var otherSequence=kmerSequence.substr(1,this.kmerLength-1)+symbol;
			children.push(otherSequence);
		}
	}

	var kmer=new Kmer(kmerSequence,coverage,parents,children);

	var message=new Message(RAY_MESSAGE_TAG_ADD_KMER,this,graphOperator,kmer);
	graphOperator.receiveMessage(message);
}

DataStore.prototype.getHTTPRequests=function(){
	return this.httpRequests;
}

DataStore.prototype.addDataInStore=function(content){

	var kmerData=content["vertices"];

	var i=0;

	var query=content["sequence"];
	var gotQuery=false;

	while(i<kmerData.length){
		var kmerSequenceIterator=kmerData[i]["sequence"];

		if(kmerSequenceIterator==query)
			gotQuery=true;

		if(!(kmerSequenceIterator in this.store))
			this.store[kmerSequenceIterator]=kmerData[i];

		i++;
	}

	if(!gotQuery){
		var dummy=new Object();
		dummy["coverage"]=0;
		dummy["parents"]=[];
		dummy["children"]=[];

		this.store[query]=dummy;
	}
}

DataStore.prototype.receiveAndProcessMessage=function(message){

	this.receiveMessage(message);
	this.processMessages();
}

DataStore.prototype.hasPendingQueries=function(){
	return this.pendingRequests>0;
}

DataStore.prototype.getDefaultDepth=function(){
	return this.defaultDepth;
}

DataStore.prototype.setMapAttributes=function(value){
	this.mapFileData=value;
}

DataStore.prototype.getNumberOfSequences=function(){
	return this.mapFileData["sequences"];
}
