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

#include "Configuration.h"

#include <fstream>
#include <iostream>
using namespace std;

Configuration::Configuration(){
	m_root=NULL;
}

void Configuration::open(const char*file){

	ifstream test2(file);
	bool exists=false;
	if(test2)
		exists=true;
	test2.close();

	if(!exists){
		m_root=NULL;
		return;
	}

	m_parser.parse(file);

	m_root=m_parser.getNode();
}

void Configuration::close(){
	if(m_root == NULL)
		return;

	m_parser.destroy();
	m_root->destroy();

	m_root=NULL;
}

const char*Configuration::getMapFile(int map)const{

	return getMapAttribute(map,"file");
}

const char*Configuration::getMapAttribute(int map,const char*key)const{
	const JSONNode*mapObject=getMap(map);

	if(mapObject==NULL)
		return NULL;

	const JSONNode*keyObject=mapObject->getObjectValueForKey(key);

	if(keyObject==NULL)
		return NULL;

	return keyObject->getString();
}

const JSONNode*Configuration::getMap(int map)const{

	const JSONNode*maps=getMaps();

	if(maps==NULL)
		return NULL;

	if(!(map<maps->getArraySize()))
		return NULL;

	return maps->getArrayElement(map);
}

const JSONNode*Configuration::getSections(int map)const{
	const JSONNode*mapObject=getMap(map);

	if(mapObject==NULL)
		return NULL;

	const JSONNode*sections=mapObject->getObjectValueForKey("sections");

	if(sections==NULL)
		return NULL;

	if(sections->getType()!=JSONNode_TYPE_ARRAY)
		return NULL;

	return sections;
}

const char*Configuration::getSectionFile(int map,int section)const{

	return getSectionAttribute(map,section,"file");
}

const JSONNode*Configuration::getMaps()const{
	if(m_root==NULL)
		return NULL;

	if(m_root->getType()!=JSONNode_TYPE_OBJECT)
		return NULL;

	const JSONNode*maps=m_root->getObjectValueForKey("maps");

	if(maps==NULL)
		return NULL;

	if(maps->getType()!=JSONNode_TYPE_ARRAY)
		return NULL;

	return maps;
}

int Configuration::getNumberOfMaps()const{

	const JSONNode*maps=getMaps();

	if(maps==NULL)
		return 0;

	return maps->getArraySize();
}

int Configuration::getNumberOfSections(int map)const{

	const JSONNode*sections=getSections(map);

	if(sections==NULL)
		return 0;

	return sections->getArraySize();
}

const char*Configuration::getMapName(int map)const{

	return getMapAttribute(map,"name");
}

const char*Configuration::getSectionName(int map,int section)const{

	return getSectionAttribute(map,section,"name");
}

const char*Configuration::getSectionAttribute(int map,int section,const char*key)const{

	const JSONNode*sections=getSections(map);

	if(!(section<sections->getArraySize()))
		return NULL;

	const JSONNode*sectionObject=sections->getArrayElement(section);

	if(sectionObject==NULL)
		return NULL;

	const JSONNode*nameObject=sectionObject->getObjectValueForKey(key);

	if(nameObject==NULL)
		return NULL;

	return nameObject->getString();
}

void Configuration::addMap(const char*name,const char*file){

	JSONNode*maps=getMutableMaps();

	if(maps==NULL)
		return;

	JSONNode mapEntry;
	mapEntry.setType(JSONNode_TYPE_OBJECT);

	JSONNode nameKey;
	nameKey.setType(JSONNode_TYPE_STRING);
	nameKey.setString("name");

	JSONNode nameValue;
	nameValue.setType(JSONNode_TYPE_STRING);
	nameValue.setString(name);

	mapEntry.addObjectKeyAndValue(&nameKey,&nameValue);

	JSONNode fileKey;
	fileKey.setType(JSONNode_TYPE_STRING);
	fileKey.setString("file");

	JSONNode fileValue;
	fileValue.setType(JSONNode_TYPE_STRING);
	fileValue.setString(file);

	mapEntry.addObjectKeyAndValue(&fileKey,&fileValue);

	JSONNode keyForSections;
	keyForSections.setType(JSONNode_TYPE_STRING);
	keyForSections.setString("sections");

	JSONNode valueForSections;
	valueForSections.setType(JSONNode_TYPE_ARRAY);

#if 0
	JSONNode nullObject;
	nullObject.setType(JSONNode_TYPE_NULL);

	valueForSections.addArrayElement(&nullObject);
#endif

	mapEntry.addObjectKeyAndValue(&keyForSections,&valueForSections);

	maps->addArrayElement(&mapEntry);

	ofstream output(m_parser.getFileName());
	m_root->write(&output);
	output.close();
}

void Configuration::printXML()const{

	int maps=getNumberOfMaps();

	cout<<"<?xml version=\"1.0\" encoding=\"UTF-8\"?>"<<endl;
	cout<<"<object>";
	cout<<"<configurationFile>"<<m_parser.getFileName()<<"</configurationFile>"<<endl;
	cout<<"<maps>"<<endl;
	for(int i=0;i<maps;i++){
		cout<<"	<map index=\""<<i<<"\" name=\""<<getMapName(i)<<"\" file=\""<<getMapFile(i)<<"\">"<<endl;
		cout<<"		<sections>"<<endl;

		int sections=getNumberOfSections(i);

		for(int j=0;j<sections;j++){

			cout<<"			";
			cout<<"<section index=\""<<j<<"\" name=\""<<getSectionName(i,j)<<"\" file=\""<<getSectionFile(i,j)<<"\" />"<<endl;
		}

		cout<<"		</sections>"<<endl;
		cout<<"	</map>"<<endl;
	}

	cout<<"</maps>"<<endl;
	cout<<"</object>"<<endl;
}

void Configuration::addSection(int mapIndex,const char*name,const char*file){

	JSONNode*sections=getMutableSections(mapIndex);

	JSONNode sectionEntry;
	sectionEntry.setType(JSONNode_TYPE_OBJECT);

	JSONNode nameKey;
	nameKey.setType(JSONNode_TYPE_STRING);
	nameKey.setString("name");

	JSONNode nameValue;
	nameValue.setType(JSONNode_TYPE_STRING);
	nameValue.setString(name);

	sectionEntry.addObjectKeyAndValue(&nameKey,&nameValue);

	JSONNode fileKey;
	fileKey.setType(JSONNode_TYPE_STRING);
	fileKey.setString("file");

	JSONNode fileValue;
	fileValue.setType(JSONNode_TYPE_STRING);
	fileValue.setString(file);

	sectionEntry.addObjectKeyAndValue(&fileKey,&fileValue);

	sections->addArrayElement(&sectionEntry);

	ofstream output(m_parser.getFileName());
	m_root->write(&output);
	output.close();
}

JSONNode*Configuration::getMutableSections(int map){
	JSONNode*mapObject=getMutableMap(map);

	if(mapObject==NULL)
		return NULL;

	JSONNode*sections=mapObject->getObjectMutableValueForKey("sections");

	if(sections==NULL)
		return NULL;

	if(sections->getType()!=JSONNode_TYPE_ARRAY)
		return NULL;

	return sections;
}

JSONNode*Configuration::getMutableMap(int map){

	JSONNode*maps=getMutableMaps();

	if(maps==NULL)
		return NULL;

	if(!(map<maps->getArraySize()))
		return NULL;

	return maps->getArrayMutableElement(map);
}

JSONNode*Configuration::getMutableMaps(){
	if(m_root==NULL)
		return NULL;

	if(m_root->getType()!=JSONNode_TYPE_OBJECT)
		return NULL;

	JSONNode*maps=m_root->getObjectMutableValueForKey("maps");

	if(maps==NULL)
		return NULL;

	if(maps->getType()!=JSONNode_TYPE_ARRAY)
		return NULL;

	return maps;
}
