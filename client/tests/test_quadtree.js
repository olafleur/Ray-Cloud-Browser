/*
 *  Ray Cloud Browser: interactively skim processed genomics data with energy
 *  Copyright (C) 2012, 2013 Jean-François ERDELYI
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


var tests = new Assert();

function testsInsert(tests) {
	var center = new Point(10, 10);
	var quadTree = new QuadTree(4, center, 40, 40, 0);

	var centerObject = new Point(2, 2);
	var object = new QuadTree(4, center, 20, 20, 0);

	tests.assertTrue("Remove empty", !quadTree.remove(centerObject, object));
	quadTree.insert(centerObject, object);
	tests.assertTrue("Remove", quadTree.remove(centerObject, object));
	tests.assertTrue("Remove empty", !quadTree.remove(centerObject, object));
}
function testOverlap(tests) {
	quadTree = new QuadTree(5, new Point(1000, 1000), 2000, 2000, 0);
	tests.assertTrue("Overlap in", quadTree.checkOverlap(new Point(500, 500), 100, 100));
	tests.assertTrue("Overlap out", !quadTree.checkOverlap(new Point(10000, 10000), 100, 100));
}

function testUpdate(tests) {
	var tabResult = new Array();
	var quadTree = new QuadTree(4, new Point(1000, 1000), 2000, 2000, 0);

	tests.assertTrue("Not true, tab of result is not empty", tabResult.length == 0);
	tests.assertTrue("Not true, quad tree is not empty", quadTree.getSize() == 0);

	quadTree.insert(new Point(0, 0), 0);
	quadTree.insert(new Point(5, 5), 5);

	quadTree.update(new Point(5, 5), new Point(25, 25), 5, false);
	var resultOldPoint = quadTree.query(new Point(5, 5), 0, 0);
	var resultNewPoint = quadTree.query(new Point(25, 25), 0, 0);
	tests.assertEquals("Not equals, old point is not undefined case 1", undefined, resultOldPoint[0]);
	tests.assertEquals("Not equals, new point is not defined", 5, resultNewPoint[0]);

	quadTree.insert(new Point(10, 10), 10);
	quadTree.insert(new Point(15, 15), 15);
	quadTree.insert(new Point(20, 20), 20);
	quadTree.insert(new Point(25, 25), 25);

	tabResult = new Array();
	tabResult = quadTree.queryAll();
	tests.assertEquals("Not equals, tab of result size is not 6: " + tabResult, 6, tabResult.length);
	tests.assertEquals("Not equals, quad tree size is not 6: " + tabResult, 6, quadTree.getSize());

	quadTree.update(new Point(0, 0), new Point(1500, 1500), 0, false);
	var resultOldPoint = quadTree.query(new Point(0, 0), 0, 0);
	var resultNewPoint = quadTree.query(new Point(1500, 1500), 0, 0);
	tests.assertEquals("Not equals, old point is not undefined", undefined, resultOldPoint[0]);
	tests.assertEquals("Not equals, new point is not defined", 0, resultNewPoint[0]);
}

function testSmallTree(tests) {
	var width = 200;
	var height = 200;
	var stepping = 100;
	var elementsPerCell = 2;

	var center2 = new Point(width / 2, height / 2);
	var smallQuadTree = new QuadTree(elementsPerCell, center2, width, height, 0);

	for(var i = 0; i < width; i += stepping) {
		for(var j = 0; j < height; j += stepping) {
			smallQuadTree.insert(new Point(i, j), i + j);
		}
	}

	var result = smallQuadTree.queryAll();
	tests.assertTrue("Tree with elements", result.length > 0);

	var result2 = smallQuadTree.query(new Point(width / 2, height / 2), width, height);
	tests.assertTrue("Tree with elements", result2.length > 0);
	tests.assertEquals("Size of tree", 4, smallQuadTree.getSize());
	tests.assertEquals("Size of tree", 4, result2.length);
}

function testBigTree(tests) {
	var width = 20000;
	var height = 20000;
	var stepping = 100;
	var tabResult = new Array();
	var k = 0;
	var center2 = new Point(width / 2, height / 2);
	var bigQuadTree = new QuadTree(5, center2, 20000, 20000, 0);

	for(var i = 0; i < width; i += stepping) {
		for(var j = 0; j < height; j += stepping) {
			bigQuadTree.insert(new Point(i, j), i + j);
		}
	}


	var listOfQuadTrees = bigQuadTree.queryAllLeaves(new Point(0, 0), 800, 600);
	for(var i = 0; i < listOfQuadTrees.length; i ++) {
		tests.assertTrue("301 : Test if the number of elements is not too big, actual number is = " + listOfQuadTrees[i].getNumberOfElementsInLeaf(), listOfQuadTrees[i].getNumberOfElementsInLeaf() < 17);
	}

	tests.assertTrue("Not true, tab of result is not empty", tabResult.length == 0);
	tabResult = bigQuadTree.query(new Point(500, 500), 500, 500);
	tests.assertTrue("Not true, tab of result empty", tabResult.length != 0);

	tabResult = new Array();
	tests.assertTrue("Not true, tab of result is not empty", tabResult.length == 0);
	tabResult = bigQuadTree.query(center2, width, height);
	tests.assertEquals("Not equals, 40000 with size of tab of result", 40000, tabResult.length);

	tabResult = new Array();
	tests.assertTrue("Not true, tab of result is not empty", tabResult.length == 0);
	tabResult = bigQuadTree.queryAll();
	tests.assertEquals("Not equals, 40000 with size of tab of result", 40000, tabResult.length);

	tabResult = new Array();
	tests.assertTrue("Not true, tab of result is not empty", tabResult.length == 0);
	tabResult = bigQuadTree.query(new Point(1, 1), 0, 0);
	tests.assertEquals("Not equals, 0 with size of big tree", 0, tabResult.length);

	tabResult = new Array();
	tests.assertTrue("Not true, tab of result is not empty", tabResult.length == 0);
	tabResult = bigQuadTree.query(new Point(0, 0), 0, 0);
	tests.assertEquals("Not equals, 1 with size of big tree", 1, tabResult.length);

	tabResult = new Array();
	tests.assertTrue("Not true, tab of result is not empty", tabResult.length == 0);
	tabResult = bigQuadTree.queryCircle(new Point(1, 1), 0);
	tests.assertEquals("Not equals, queryCircle", 0, tabResult.length);

	tabResult = new Array();
	tests.assertTrue("Not true, tab of result is not empty", tabResult.length == 0);
	tabResult = bigQuadTree.queryCircle(new Point(0, 0), 500000);
	tests.assertEquals("Not equals, queryCircle", 40000, tabResult.length);

	tabResult = new Array();
	tests.assertTrue("Not true, tab of result is not empty", tabResult.length == 0);
	tabResult = bigQuadTree.queryCircle(new Point(0, 0), 200);
	tests.assertTrue("Not true tab length = " + tabResult.length, tabResult.length > 0);

	var result = bigQuadTree.insert(new Point(-10, -10), 999999);
	tests.assertEquals("testBigTree 401", false, result);
	tests.assertEquals("testBigTree 404", 40000, bigQuadTree.getSize());

	for(var i = 0; i < width; i += stepping) {
		for(var j = 0; j < height; j += stepping) {
			tests.assertTrue("Remove empty i: " + i + " j: " + j, bigQuadTree.remove(new Point(i, j), i + j));
		}
	}
}

function testOnVeryLargeStructure(tests) {

	var treeCenter = new Point(0, 0);
	var halfWidth = 1000000000;
	var maximumNumberOfObjectsPerCell = 32;
	var tree = new QuadTree(maximumNumberOfObjectsPerCell, treeCenter, 2*halfWidth, 2*halfWidth, 0)

	tests.assertEquals("testOnVeryLargeStructure 001", 0, tree.getSize());

	var n = 10000;

	var points = new Array();

	for(var i = 0; i < n; i++) {
		var x = Math.random() * 2 * halfWidth;
		x -= halfWidth;
		var y = Math.random() * 2 * halfWidth;
		y -= halfWidth;

		var point = new Point(x, y);
		tree.insert(point, i);

		var elements = tree.queryCircle(point, 0);
		tests.assertEquals("testOnVeryLargeStructure 002", 1, elements.length);
		tests.assertEquals("testOnVeryLargeStructure 003", i, elements[0]);
		tests.assertEquals("testOnVeryLargeStructure 088", i + 1, tree.getSize());

		points.push(point);
	}

	tests.assertEquals("testOnVeryLargeStructure 128", n, tree.getSize());

	for(var i = 0; i < n; i++) {
		var oldPoint = points[i];
		var newPoint = new Point(oldPoint.getX() / 2, oldPoint.getY() / 2);
		tree.update(oldPoint, newPoint, i, false);

		var elements = tree.queryCircle(oldPoint, 0);
		tests.assertEquals("testOnVeryLargeStructure 302", 0, elements.length);
		elements = tree.queryCircle(newPoint, 0);
		tests.assertEquals("testOnVeryLargeStructure 342", 1, elements.length);
		tests.assertEquals("testOnVeryLargeStructure 388", n, tree.getSize());
	}

	tests.assertEquals("testOnVeryLargeStructure 488", n, tree.getSize());
}

function testObjectsThatAreOutside(tests) {
	var treeCenter = new Point(0, 0);
	var halfWidth = 1000000000;
	var maximumNumberOfObjectsPerCell = 32;
	var tree = new QuadTree(maximumNumberOfObjectsPerCell, treeCenter, 2*halfWidth, 2*halfWidth, 0);

	tests.assertEquals("testObjectsThatAreOutside 001", 0, tree.getSize());

	var i = 91;
	var x = -2000000000;
	var y = -2000000000;
	var point = new Point(x, y);
	var result = tree.insert(point, i);

	tests.assertEquals("testObjectsThatAreOutside 050", false, result);
	tests.assertEquals("testObjectsThatAreOutside 101", 0, tree.getSize());

	var elements = tree.queryAll();

	tests.assertEquals("testObjectsThatAreOutside 201", 0, elements.length);
}

function testNumberOfElements(tests) {
	var width = 2000;
	var treeCenter = new Point(width / 2, width / 2);
	var maximumNumberOfObjectsPerCell = 4;
	var tree = new QuadTree(maximumNumberOfObjectsPerCell, treeCenter, width, width, 0);

	for(var i = 0; i < 5; i++) {
		var x = i;
		var y = i;
		var point = new Point(x, y);
		tree.insert(point, i);
	}
	tree.update(new Point(1, 1), new Point(50, 50), 1, true);
	tests.assertEquals("Test number of elements into the QuadTree 001", 0, tree.getNumberOfElementsInLeaf());
}



function testAddAndDividePoints(tests) {
	var pointA = new Point(50, 60);
	var pointB = new Point(100, 100);
	var divider = 10;

	pointA.add(pointB);
	tests.assertEquals("801 : Test if pointB is added in pointA (x)", 150, pointA.getX());
	tests.assertEquals("802 : Test if pointB is added in pointA (y)", 160, pointA.getY());

	pointB.divideBy(divider);
	tests.assertEquals("801 : Test if pointB is substracted by the divider (x)", 10, pointB.getX());
	tests.assertEquals("802 : Test if pointB is substracted by the divider (y)", 10, pointB.getY());
}


function testBarnesHutAlgorithm(tests) {
	var width = 2000;
	var height = 2000;
	var treeCenter = new Point(width / 2, height / 2);
	var maximumNumberOfObjectsPerCell = 2;
	var tree = new QuadTree(maximumNumberOfObjectsPerCell, treeCenter, width, height, 0);
	var barnesHut = new BarnesHutAlgorithm(0);

	var point = new Point(1950, 1950);
	tree.insert(point, 0);

	point = new Point(1900, 1900);
	tree.insert(point, 1);

	point = new Point(50, 50);
	tree.insert(point, 11);

	point = new Point(100, 100);
	tree.insert(point, 10667788);

	var force = null;

	force = barnesHut.approximateForce(10, point, 150, tree);

	//console.log(force.toString());

	tests.assertEquals("901 : Test if the gravity center is correct", new Point(1000, 1000).toString(), tree.getGravityCenter().toString());
	tests.assertEquals("902 : Test if the sum of masses is correct", 4, tree.getSize());

	point = new Point(1000, 100);
	tree.insert(point, 100);

	var theObject = 10;
	var mass = 20;
	var testPoint = new Point(0, 0);
	force = barnesHut.approximateForce(theObject, testPoint, mass, tree);

	//console.log(force.toString());

	tests.assertEquals("903 : Test if the gravity center is correct", new Point(1000, 820).toString(), tree.getGravityCenter().toString());
	tests.assertEquals("904 : Test if the sum of masses is correct", 5, tree.getSize());
}

function testGravityCenters(tests) {
	var width = 20000;
	var height = 20000;
	var stepping = 100;
	var center = new Point(width / 2, height/ 2);
	var maximumNumberOfObjectsPerCell = 5;
	var depth = 0;
	var bigQuadTree = new QuadTree(maximumNumberOfObjectsPerCell, center, width, height, depth);

	var expectedNumberOfObjects = 0;
	for(var i = 0; i < width; i += stepping) {
		for(var j = 0; j < height; j += stepping) {
			if(bigQuadTree.insert(new Point(i, j), i + j))
				expectedNumberOfObjects ++;
		}
	}

	tests.assertEquals("testGravityCenters 0001", expectedNumberOfObjects, bigQuadTree.getSize());
	tests.assertEquals("testGravityCenters 0010", expectedNumberOfObjects, bigQuadTree.queryAll().length);

	bigQuadTree.testRecursivelyGravityCenters(tests);

	for(var i = 0; i < width; i += stepping) {
		for(var j = 0; j < height; j += stepping) {
			var updated = bigQuadTree.update(new Point(i, j), new Point(i / 2, j / 2), i + j);

			tests.assertEquals("testGravityCenters 0021", true, updated);
		}
	}

	tests.assertEquals("testGravityCenters 0001", expectedNumberOfObjects, bigQuadTree.getSize());
	tests.assertEquals("testGravityCenters 0010", expectedNumberOfObjects, bigQuadTree.queryAll().length);

	bigQuadTree.testRecursivelyGravityCenters(tests);
}

function testBarnesHutAlgorithmWithMorePoints(tests) {
	var width = 200000000;
	var height = 200000000;
	var treeCenter = new Point(0, 0);
	var maximumNumberOfObjectsPerCell = 16;
	var depth = 0;
	var tree = new QuadTree(maximumNumberOfObjectsPerCell, treeCenter, width, height, depth);

	var barnesHut = new BarnesHutAlgorithm(0.5);

	var x = 0;
	var y = 0;

	for(var i = 0; i < 10000; i++) {
		var point = new Point(x, y);
		tree.insert(point, 0);
		x+=31;
	}

	var testPoint = new Point(50, 0);
	var theObject = 10;
	var mass = 20;
	var force = barnesHut.approximateForce(theObject, testPoint, mass, tree);

	//console.log(force.toString());
}

testsInsert(tests);
testOverlap(tests);
testSmallTree(tests);
testBigTree(tests);
testUpdate(tests);
testOnVeryLargeStructure(tests);
testObjectsThatAreOutside(tests);
testNumberOfElements(tests);
testAddAndDividePoints(tests);

testBarnesHutAlgorithm(tests);
testGravityCenters(tests);

testBarnesHutAlgorithmWithMorePoints(tests);

tests.showResults();

