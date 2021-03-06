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
 * A selection widget.
 *
 * \author Sébastien Boisvert
 */
function SelectionWidget(x,y,width,height,title,choices) {

	this.searchBox = null;
	this.query = "";

	this.minBlink = 160;
	this.maxBlink = 255;
	this.colorIndex = this.minBlink;
	this.increment = true;
	this.blink = false;
	this.theColor = "#FFF8F9";

	this.x=x;
	this.y=y;
	this.title=title;

	this.allChoices = choices;
	this.choices=choices;
	this.mapping = null;
	this.gotFinalChoice=false;

	this.colors=[];
	var i=0;
	while(i<this.choices.length){
		this.colors.push("#FFFFFF");
		i++;
	}

	this.fontSize=12;
	this.width=width;

	var theLength=choices.length;

	this.choicesToDisplay=10;

	if(theLength>=this.choicesToDisplay)
		theLength=this.choicesToDisplay;

	this.buttonHeight=20;
	this.height=85+(this.buttonHeight+2)*theLength;

	var buttonDimension=25;

	var stepping=7;

	this.previousButton=new Button(this.x+this.width/2-buttonDimension/2-2,
		this.y+this.height-buttonDimension/2-stepping,
		buttonDimension,buttonDimension,"<<",false);

	this.nextButton=new Button(this.x+this.width/2+buttonDimension/2+2,
		this.y+this.height-buttonDimension/2-stepping,
		buttonDimension,buttonDimension,">>",false);

	this.okButton=new Button(this.x+this.width-buttonDimension/2-stepping,
		this.y+this.height-buttonDimension/2-stepping,
		buttonDimension,buttonDimension,"OK",false);

	this.searchButton=new Button(this.x + this.width / 5,
		this.y+this.height-buttonDimension/2-stepping,
		buttonDimension * 4, buttonDimension*1, "Keyword search",false);

	this.finished=false;

	this.createButtons(0);
}

SelectionWidget.prototype.createButtons=function(offset){
	this.offset=offset;
	this.displayed=this.choicesToDisplay;

	var i=offset;

	this.buttons=new Array();
	this.choiceButtons=new Array();

	var processed=0;
	while(i < this.choices.length && processed < this.displayed){

		var multiplier=i-this.offset;

		var fancyButton=new Button(this.x+10+this.width/2,this.y+50+multiplier*1.1*this.buttonHeight,
			this.width-40,this.buttonHeight,this.choices[i++],false);

		fancyButton.putOnLeft();
		this.choiceButtons.push(fancyButton);

		processed++;
	}

	if(this.offset!=0)
		this.buttons.push(this.previousButton);

	var lastDisplayed=this.offset+this.displayed-1;

	if(lastDisplayed>this.choices.length-1)
		lastDisplayed=this.choices.length-1;

	if(lastDisplayed!=this.choices.length-1)
		this.buttons.push(this.nextButton);

	this.buttons.push(this.okButton);
	this.buttons.push(this.searchButton);
}

SelectionWidget.prototype.setColors=function(colors){
	if(this.colors.length==colors.length)
		this.colors=colors;
}

SelectionWidget.prototype.enableBlink = function() {
	this.blink = true;
	this.colorIndex = this.minBlink;
	this.increment = true;
}

SelectionWidget.prototype.disableBlink = function() {
	this.blink = false;
	this.theColor = "#FFF8F9";
}

SelectionWidget.prototype.getBlink = function() {
	return this.blink;
}

SelectionWidget.prototype.blinkBox = function(){
	if(this.increment) {
		this.colorIndex += 3;
		if(this.colorIndex >= this.maxBlink) {
			this.increment = false;
		}
	} else {
		this.colorIndex -= 3;
		if(this.colorIndex <= this.minBlink) {
			this.increment = true;
		}
	}
	this.theColor = "rgb(" + (this.colorIndex - 100) + ", " + (this.colorIndex - 50) + ", " + this.colorIndex + ")";
}

SelectionWidget.prototype.draw = function(context) {

	context.beginPath();
	context.fillStyle = this.theColor;
	context.rect(this.x, this.y, this.width, this.height );
	context.fill();
	context.lineWidth = 1;
	context.strokeStyle = 'black';
	context.stroke();
	context.closePath();

	context.fillStyle    = '#000000';
	context.textAlign="left";
	context.font         = 'bold '+this.fontSize+'px Arial';
	context.fillText(this.title+" ("+this.getNumberOfChoices()+")", this.x+this.width/20,this.y+20);

// show choices
	var i=0;

	context.fillStyle    = '#000000';
	context.font         = ''+this.fontSize+'px Arial';

	if(this.finished){

		context.fillText(this.choices[this.finalChoice], this.x+this.width/9,this.y+40);

		return;
	}

	var i=0;
	while(i<this.choiceButtons.length){

		var button=this.choiceButtons[i];

		var colorIndex=this.offset+i;

		if(colorIndex<this.colors.length && this.colors[colorIndex]!="#FFFFFF"){
			var plusValue=20;
			var width=button.getWidth()+plusValue
			var height=button.getHeight()+plusValue/5;

			context.beginPath();
			context.rect(button.getX()-width/2-(plusValue/2-plusValue/5),
				button.getY()-height/2,width,height);
			context.fillStyle =this.colors[colorIndex];
			context.fill();
			context.closePath();
		}

		button.draw(context,null);
		i++;
	}

	i=0;
	while(i<this.buttons.length){

		var button=this.buttons[i];
		button.draw(context,null);
		i++;
	}

	if(this.searchBox != null)
		this.searchBox.draw(context);
}

SelectionWidget.prototype.move=function(x,y){
	this.x+=x;
	this.y+=y;

	var i=0;
	while(i<this.buttons.length){
		this.buttons[i++].move(x,y);
	}

	i=0;
	while(i<this.choiceButtons.length){
		this.choiceButtons[i++].move(x,y);
	}
}

SelectionWidget.prototype.handleMouseDoubleClick = function(x,y) {
	var selected = -1;
	for(var i = 0; i < this.choiceButtons.length; i++) {
		this.choiceButtons[i].handleMouseDoubleClick(x, y);

	}
	for(var i = 0; i < this.choiceButtons.length; i++) {
		if(this.choiceButtons[i].getState()) {
			selected = i;
			this.gotFinalChoice = true;
			break;
		}
	}
	if(selected == -1) {
		return false;
	}
	this.finalChoice = selected;
	return true;
}

SelectionWidget.prototype.handleMouseDown=function(x,y){
	var result = false;

	var selected = -1;

	if(this.searchBox != null) {

		if(this.searchBox.handleMouseDown(x, y)) {
			if(this.searchBox.getHasChoice()) {
				this.query = this.searchBox.getContent();

				this.searchBox.kill();
				// garbage collect the widget
				this.searchBox = null;

				//console.log("query= " + this.query);

				this.choices = new Array();
				this.mapping = new Array();

				for(var i = 0 ; i < this.allChoices.length ; i ++) {
					var choice = this.allChoices[i];
					if(choice.indexOf(this.query) >= 0) {
						this.choices.push(choice);
						this.mapping.push(i);
					}
				}

				this.createButtons(0);
			}
		}
	}

// check if a choice button is down already
	var i=0;
	while(i<this.choiceButtons.length){
		if(this.choiceButtons[i].getState()){
			selected = i;
			break;
		}
		i++;
	}

	for(var i in this.choiceButtons){
		if(this.choiceButtons[i].handleMouseDown(x,y)){
			result = true;
			break;
		}
	}

	for(var i in this.buttons){
		if(result)
			break;
		if(this.buttons[i].handleMouseDown(x,y)){
			result = true;
			break;
		}
	}

// reset the other button if a new one is active
	var i=0;
	while(i<this.choiceButtons.length){
		if(selected==-1)
			break;
		if(this.choiceButtons[i].getState() && i!=selected){
			this.choiceButtons[selected].resetState();
			break;
		}
		i++;
	}

	if(this.okButton.getState()){

		var i=0;
		var selected=0;

		while(i < this.choiceButtons.length){


			if(this.choiceButtons[i].getState()){
				this.finalChoice=this.offset+i;

				selected++;
				this.gotFinalChoice=true;
			}

			i++;
		}


		if(!this.gotFinalChoice){
			this.okButton.resetState();
		}
	}else if(this.nextButton.getState()){

		this.createButtons(this.offset+this.displayed);

		this.nextButton.resetState();

	}else if(this.previousButton.getState()){

		this.createButtons(this.offset-this.displayed);

		this.previousButton.resetState();

	} else if(this.searchButton.getState()) {

		this.searchButton.resetState();
		this.searchBox = new TextWidget(70, 50, 512, 100, "Search", false);
	}

	return result;
}

SelectionWidget.prototype.hasChoice=function(){
	return this.gotFinalChoice;
}

SelectionWidget.prototype.getChoice=function() {

	if(this.mapping != null) {
		return this.mapping[this.finalChoice];
	}
	return this.finalChoice;
}

SelectionWidget.prototype.resetState=function(){
	this.gotFinalChoice=false;
	this.finished=true;

	this.height=45;
}

SelectionWidget.prototype.setHeight=function(height){
	this.height=height;
}

SelectionWidget.prototype.setChoice=function(choice){
	this.finalChoice=choice;
}

SelectionWidget.prototype.getNumberOfChoices=function(){
	return this.choices.length;
}
