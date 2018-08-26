// Global variables
var graph;
var paper;
var stencil;
var mode;

// Mode specific variables
var graphObject = new graphObject();		// Stores all variables between modes

var linkInspector = new LinkInspector();
var elementInspector = new ElementInspector();
var currentHalo;
var currentAnalysis;

// Analysis variables
var historyObject = new historyObject();
var queryObject = new queryObject();

var loader;
var reader;

//Properties for both core and simulator.
// var satvalues = {satisfied: 2, partiallysatisfied: 1, partiallydenied: -1, denied: -2, unknown: 0, conflict: 3, none: 4};
var satValueDict = {
	"unknown": 5,
	"satisfied": 3,
	"partiallysatisfied": 2,
	"partiallydenied": 1,
	"denied": 0,
	"conflict": 4,
	"none": 6
};
var weightedContDict = {
	"makes": 0,
	"helps": 1,
	"hurts": 2,
	"breaks": 3
};
const D = satValueDict['denied'];
const PD = satValueDict['partiallydenied'];
const PS = satValueDict['partiallysatisfied'];
const S = satValueDict['satisfied'];
const C = satValueDict['conflict'];
const U = satValueDict['unknown'];
const N = satValueDict['none'];
const weightedContributionFunction = [
	// makes, helps, hurts, breaks
	[ D, PD, PS, PS ], // D		// Last column PS for i* and S for GRL.
	[ PD, PD, PS, PS ], // PD
	[ PS, PS, PD, PD ], // PS
	[  S, PS, PD,  D ], // S
	[  U,  U,  U,  U ], // C
	[  U,  U,  U,  U ], // U
	[  N,  N,  N,  N ], // N
];
const combineContributionsFunction = [ 
	// D, PD, PS,  S,  C,  U,  N  
	[  D,  D, PD,  C,  C,  U,  D ], // D
	[  D, PD,  U, PS,  C,  U, PD ], // PD		PD + PS -> U was originally N. Changed for controlled experiment.
	[ PD,  U, PS,  S,  C,  U, PS ], // PS
	[  C, PS,  S,  S,  C,  U,  S ], // S
	[  C,  C,  C,  C,  C,  C,  C ], // C
	[  U,  U,  U,  U,  C,  U,  U ], // U
	[  D, PD, PS,  S,  C,  U,  N ], // N
];
const combinePreconditionFunction = [ //row = previous-value col = min-precondition
	// D, PD, PS,  S,  C,  U,  N  
	[  D,  D,  D,  D,  C,  U,  D ], // D	
	[  D,  D,  D, PD,  C,  U, PD ], // PD
	[  D,  D,  D, PS,  C,  U, PS ], // PS
	[  D,  D,  S,  S,  C,  U,  S ], // S
	[  C,  C,  C,  C,  C,  C,  C ], // C
	[  D,  D,  D,  U,  C,  U,  U ], // U
	[  D,  D,  D,  S,  C,  U,  N ], // N
];

// ----------------------------------------------------------------- //
// Page setup

// Mode used specify layout and functionality of toolbars
mode = "Modelling";		// 'Analysis' or 'Modelling'
linkMode = "Relationships";	// 'Relationships' or 'Constraints'

graph = new joint.dia.Graph();

// Create a paper and wrap it in a PaperScroller.
paper = new joint.dia.Paper({
    width: 1000,
    height: 1000,
    gridSize: 10,
    perpendicularLinks: false,
    model: graph,
    defaultLink: new joint.dia.Link({
		'attrs': {
			'.connection': {stroke: '#000000', 'stroke-dasharray': '0 0'},
			'.marker-source': {'d': 'M 0 0'},
			'.marker-target': {stroke: '#000000', "d": 'M 10 0 L 0 5 L 10 10 z'}
			},
		'labels': [{position: 0.5, attrs: {text: {text: "this is default link. You shouldnt be able to see it"}}}]
	})
});

var paperScroller = new joint.ui.PaperScroller({
	autoResizePaper: true,
	paper: paper
});

$('#paper').append(paperScroller.render().el);
paperScroller.center();


// Create and populate stencil.
stencil = new joint.ui.Stencil({
	graph: graph,
	paper: paper,
	width: 200,
	height: 600
});

$('#stencil').append(stencil.render().el);

var goal = new joint.shapes.basic.Goal({ position: {x: 50, y: 20} });
var task = new joint.shapes.basic.Task({ position: {x: 50, y: 100} });
var quality = new joint.shapes.basic.Quality({ position: {x: 50, y: 170} });
var res = new joint.shapes.basic.Resource({ position: {x: 50, y: 250} });
// This is actor without boundary
var act2 = new joint.shapes.basic.Actor2({ position: {x: 60, y: 330} });
var act = new joint.shapes.basic.Actor({ position: {x: 40, y: 430} });

stencil.load([goal, task, quality, res, act2, act]);

//Setup LinkInspector
$('.inspector').append(linkInspector.el);

//Interface set up for modelling mode on startup
$('#dropdown-model').css("display","none");
$('#history').css("display","none");

//If a cookie exists, process it as a previously created graph and load it.
if (document.cookie){
	var cookies = document.cookie.split(";");
	var prevgraph = "";

	//Loop through the cookies to find the one representing the graph, if it exists
	for (var i = 0; i < cookies.length; i++){
		if (cookies[i].indexOf("graph=") >= 0){
			prevgraph = cookies[i].substr(6);
		}
	}

	if (prevgraph){
		graph.fromJSON(JSON.parse(prevgraph));
	}


}

// ----------------------------------------------------------------- //
// Rappid setup

var element_counter = 0;
var max_font = 20;
var min_font = 6;
var current_font = 10;

//Whenever an element is added to the graph
graph.on("add", function(cell){
	if (cell instanceof joint.dia.Link){
		if (graph.getCell(cell.get("source").id) instanceof joint.shapes.basic.Actor){

			cell.attr({
				'.connection': {stroke: '#000000', 'stroke-dasharray': '0 0'},
				'.marker-source': {'d': '0'},
				'.marker-target': {stroke: '#000000', "d": 'M 10 0 L 0 5 L 10 10 L 0 5 L 10 10 L 0 5 L 10 5 L 0 5'}
			});
			cell.prop("linktype", "actorlink");

			// Unable to model constraints for actors
			if(linkMode == "Relationships"){
				cell.label(0, {attrs: {text: {text: "is-a"}}});
			}
		}
	}	//Don't do anything for links

	//Give element a unique default
	cell.attr(".name/text", cell.attr(".name/text") + "_" + element_counter);
	element_counter++;

	//Add Functions and sat values to added types
	if (cell instanceof joint.shapes.basic.Intention){
		cell.attr('.funcvalue/text', ' ');
	}

	//Send actors to background so elements are placed on top
	if (cell instanceof joint.shapes.basic.Actor){
		cell.toBack();
	}

	paper.trigger("cell:pointerup", cell.findView(paper));
});

//Auto-save the cookie whenever the graph is changed.
graph.on("change", function(){
	saveCookie();
});
function saveCookie(){
	var graphtext = JSON.stringify(graph.toJSON());
	document.cookie = "graph=" + graphtext;
}

var selection = new Backbone.Collection();

var selectionView = new joint.ui.SelectionView({
	paper: paper,
	graph: graph,
	model: selection
});


// Initiate selecting when the user grabs the blank area of the paper while the Shift key is pressed.
// Otherwise, initiate paper pan.
paper.on('blank:pointerdown', function(evt, x, y) {
    if (_.contains(KeyboardJS.activeKeys(), 'shift')) {
    	if(mode == "Analysis")
			return

        selectionView.startSelecting(evt, x, y);
    } else {
        paperScroller.startPanning(evt, x, y);
    }
});

paper.on('cell:pointerdown', function(cellView, evt, x, y){
	if(mode == "Analysis"){
		queryObject.addCell(cellView);
		return
	}

	var cell = cellView.model;
	if (cell instanceof joint.dia.Link){
		cell.reparent();
	}

	//Unembed cell so you can move it out of actor
	if (cell.get('parent') && !(cell instanceof joint.dia.Link)) {
		graph.getCell(cell.get('parent')).unembed(cell);
	}
});

// Unhighlight everything when blank is being clicked
paper.on('blank:pointerclick', function(){
	var elements = graph.getElements();
	for (var i = 0; i < elements.length; i++){
		var cellView  = elements[i].findView(paper);
		var cell = cellView.model;
		cellView.unhighlight();
		cell.attr('.outer/stroke', 'black');
		cell.attr('.outer/stroke-width', '1');
		if (cell instanceof joint.shapes.basic.Actor){
			cell.attr('.outer/stroke-dasharray', '5 2');
		}

	}
	linkInspector.clear();
	elementInspector.clear();
});



// Disable context menu inside the paper.
paper.el.oncontextmenu = function(evt) { evt.preventDefault(); };


// A simple element editor.
// --------------------------------------
$('.inspector').append(elementInspector.el);

//Link equivalent of the element editor
paper.on("link:options", function(evt, cell){
	if(mode == "Analysis")
		return
	var link = cell.model;
	setLinkType(link);
	var linktype = link.attr(".link-type");
	linkInspector.clear();
	elementInspector.clear();
	if (linkMode == "Relationships"){
		linkInspector.render(cell, linktype);

	}
});
// Identify link-type: Refinement, Contribution, Qualification or NeededBy
// And store the linktype into the link
function setLinkType(link){
	if (!link.getTargetElement() || !link.getSourceElement()){
		link.attr(".link-type", "Error");
		return;
	}
	var sourceCell = link.getSourceElement().attributes.type;
	var targetCell = link.getTargetElement().attributes.type;
	var sourceCellInActor = link.getSourceElement().get('parent');
	var targetCellInActor = link.getTargetElement().get('parent');

	switch(true){
		// Links of actors must be paired with other actors
		case ((sourceCell == "basic.Actor" || sourceCell == "basic.Actor2") && (targetCell == "basic.Actor" || targetCell == "basic.Actor2")):
			link.attr(".link-type", "Actor");
			break;
		case ((sourceCell == "basic.Actor") && (!targetCellInActor)):
			link.attr(".link-type", "Error");
			break;
		case ((targetCell == "basic.Actor") && (!sourceCellInActor)):
			link.attr(".link-type", "Error");
			break;

		case ((sourceCell == "basic.Actor2") && (!targetCellInActor)):
			link.attr(".link-type", "Dependency");
			break;
		case ((targetCell == "basic.Actor2") && (!sourceCellInActor)):
			link.attr(".link-type", "Dependency");
			break;

		case ((!!sourceCellInActor) && (!targetCellInActor && (targetCell == "basic.Actor" || targetCell == "basic.Actor2"))):
			// link.attr(".link-type", "Dependency");
			link.attr(".link-type", "Error");
			break;
		case ((!!targetCellInActor) && (!sourceCellInActor && (sourceCell == "basic.Actor" || sourceCell == "basic.Actor2"))):
			// link.attr(".link-type", "Dependency");
			link.attr(".link-type", "Error");
			break;
		case ((!!sourceCellInActor) && (!targetCellInActor)):
			link.attr(".link-type", "Dependency");
			break;
		case ((!!targetCellInActor) && (!sourceCellInActor)):
			link.attr(".link-type", "Dependency");
			break;


		case ((sourceCell == "basic.Goal") && (targetCell == "basic.Goal")):
			link.attr(".link-type", "Refinement");
			break;
		case ((sourceCell == "basic.Goal") && (targetCell == "basic.Quality")):
			link.attr(".link-type", "Contribution");
			break;
		case ((sourceCell == "basic.Goal") && (targetCell == "basic.Task")):
			link.attr(".link-type", "Refinement");
			break;
		case ((sourceCell == "basic.Goal") && (targetCell == "basic.Resource")):
			link.attr(".link-type", "Error");
			break;
		case ((sourceCell == "basic.Quality") && (targetCell == "basic.Goal")):
			link.attr(".link-type", "Qualification");
			break;
		case ((sourceCell == "basic.Quality") && (targetCell == "basic.Quality")):
			link.attr(".link-type", "Contribution");
			break;
		case ((sourceCell == "basic.Quality") && (targetCell == "basic.Task")):
			link.attr(".link-type", "Qualification");
			break;
		case ((sourceCell == "basic.Quality") && (targetCell == "basic.Resource")):
			link.attr(".link-type", "Qualification");
			break;
		case ((sourceCell == "basic.Task") && (targetCell == "basic.Goal")):
			link.attr(".link-type", "Refinement");
			break;
		case ((sourceCell == "basic.Task") && (targetCell == "basic.Quality")):
			link.attr(".link-type", "Contribution");
			break;
		case ((sourceCell == "basic.Task") && (targetCell == "basic.Task")):
			link.attr(".link-type", "Refinement");
			break;
		case ((sourceCell == "basic.Task") && (targetCell == "basic.Resource")):
			link.attr(".link-type", "Error");
			break;
		case ((sourceCell == "basic.Resource") && (targetCell == "basic.Goal")):
			link.attr(".link-type", "Error");
			break;
		case ((sourceCell == "basic.Resource") && (targetCell == "basic.Quality")):
			link.attr(".link-type", "Contribution");
			break;
		case ((sourceCell == "basic.Resource") && (targetCell == "basic.Task")):
			link.attr(".link-type", "NeededBy");
			break;
		case ((sourceCell == "basic.Resource") && (targetCell == "basic.Resource")):
			link.attr(".link-type", "Error");
			break;

		default:
			console.log('Default');
	}
	return;
}
// Need to draw a link upon user creating link between 2 nodes
// Given a link and linktype, draw the deafult link
function drawDefaultLink(link, linktype){
	switch(linktype){
		case "Refinement":
			link.attr({
			  '.connection': {stroke: '#000000', 'stroke-dasharray': '0 0'},
			  '.marker-source': {'d': 'M 0 0'},
			  '.marker-target': {stroke: '#000000', 'stroke-width': 1, "d": 'M 10 0 L 10 10 M 10 5 L 0 5' }
			});
			link.label(0 ,{position: 0.5, attrs: {text: {text: 'and'}}});
			break;
		case "Qualification":
			link.attr({
			  '.connection': {stroke: '#000000', 'stroke-dasharray': '5 2'},
			  '.marker-source': {'d': 'M 0 0'},
			  '.marker-target': {'d': 'M 0 0'}
			});
			link.label(0 ,{position: 0.5, attrs: {text: {text: ""}}});
			break;
		case "Contribution":
			link.attr({
			  '.marker-target': {'d': 'M 12 -3 L 5 5 L 12 13 M 5 5 L 30 5', 'fill': 'transparent'}
			})
			link.label(0 ,{position: 0.5, attrs: {text: {text: "makes"}}});
			break;
		case "NeededBy":
			link.attr({
			  '.marker-target': {'d': 'M-4,0a4,4 0 1,0 8,0a4,4 0 1,0 -8,0'}
			})
			link.label(0 ,{position: 0.5, attrs: {text: {text: ""}}});
			break;
		case "Dependency":
			link.attr({
				'.marker-source': {'d': 'M 0 0'},
				//'.marker-target': {'d': 'M 100 0 C 85 -5, 85 20, 100 15 L 100 0 M -100 0' ,'fill': 'transparent'}, //Old
        '.marker-target': {'d': 'M 100 0 C 85 -5, 85 20, 100 15 L 100 0','fill': 'transparent'},
			})
      link.label(0 ,{position: 0.5, attrs: {text: {text: "depends"}}});
			break;
		case "Actor":
			link.label(0 ,{position: 0.5, attrs: {text: {text: 'is-a'}}});
			break;
		case "Error":
			link.label(0 ,{position: 0.5, attrs: {text: {text: "Error"}}});
			break;
		default:
			break;
	}
}

//When a cell is clicked, create the Halo
function isLinkInvalid(link){
	return (!link.prop('source/id') || !link.prop('target/id'));
}

//Single click on cell
paper.on('cell:pointerup', function(cellView, evt) {
	if(mode == "Analysis")
		return

	// Link
	if (cellView.model instanceof joint.dia.Link){
		var link = cellView.model;
		var sourceCell = link.getSourceElement().attributes.type;
		setLinkType(link);
		var linktype = link.attr(".link-type");
		drawDefaultLink(link, linktype);

		// Check if link is valid or not
		if (link.getTargetElement()){
			var targetCell = link.getTargetElement().attributes.type;

		}
		return

	// element is selected
	}else{
		selection.reset();
		selection.add(cellView.model);
		var cell = cellView.model;
		// Unhighlight everything
		var elements = graph.getElements();
		for (var i = 0; i < elements.length; i++){
			var cellview  = elements[i].findView(paper);
			cellview.unhighlight();
			cellview.model.attr('.outer/stroke', 'black');
			cellview.model.attr('.outer/stroke-width', '1');
			if (cellview.model instanceof joint.shapes.basic.Actor){
				cellview.model.attr('.outer/stroke-dasharray', '5 2');
			}
		}
		// Highlight when cell is clicked
		cellView.highlight();
		searchRoot(cell, null);
		searchLeaf(cell, null);

		currentHalo = new joint.ui.Halo({
			graph: graph,
			paper: paper,
			cellView: cellView,
			type: 'toolbar'
		});

		currentHalo.removeHandle('unlink');
		currentHalo.removeHandle('clone');
		currentHalo.removeHandle('fork');
		currentHalo.removeHandle('rotate');
		currentHalo.render();

		//Embed an element into an actor boundary, if necessary
		if (!(cellView.model instanceof joint.shapes.basic.Actor) && !(cellView.model instanceof joint.shapes.basic.Actor2)){
			var ActorsBelow = paper.findViewsFromPoint(cell.getBBox().center());

			if (ActorsBelow.length){
				for (var a = 0; a < ActorsBelow.length; a++){
					if (ActorsBelow[a].model instanceof joint.shapes.basic.Actor){

						ActorsBelow[a].model.embed(cell);
					}
				}
			}
		}

		linkInspector.clear();
		elementInspector.render(cellView);
	}
});

// ===================Search for root and leaf =====================


// Given a cell, search and highlight its root
// It ultilizes recursion
// When first time calling it, originalCell is null
// After that it is set to the cell that is being clicked on
// This is to prevent searching in an cyclic graph
function searchRoot(cell, originalCell){
	// If cellView = originalCell, we have a cycle
	if (cell == originalCell){
		return
	}
	// If first time calling it, set originalCell to cell
	if (originalCell == null){
		originalCell = cell;
	}

	// Highlight it when it is a root
	if (isRoot(cell)){
		cell.attr('.outer/stroke', '#996633');
		cell.attr('.outer/stroke-width', '5');
		cell.attr('.outer/stroke-dasharray', '');

		return;
	}
	// A list of nodes to find next
	var queue = enQueue1(cell);
	// If no more node to search for, we are done
	if (queue.length == 0){
		return;
	}
	// Call searchRoot for all nodes in queue
	for (var i = queue.length - 1; i >= 0; i--) {
		searchRoot(queue[i], originalCell);
	}

	return;
}
// Definition of root:
// No outgoing refinement, contribution, neededby link
// No incoming dependency , Actor link
// No error link at all
function isRoot(cell){
	var outboundLinks = graph.getConnectedLinks(cell, {outbound: true});
	var inboundLinks = graph.getConnectedLinks(cell, {inbound: true});
	var inboundQualificationCount = 0;
	var outboundQualificationCount = 0;

	for (var i = inboundLinks.length - 1; i >= 0; i--) {
		var linkType = inboundLinks[i].attr('.link-type')
		if (linkType == 'Error' || linkType == 'Dependency' || linkType == 'Actor' ){
			return false;
		}
		if (linkType == 'Qualification'){
			inboundQualificationCount = inboundQualificationCount + 1;
		}
	}

	for (var i = outboundLinks.length - 1; i >= 0; i--) {
		var linkType = outboundLinks[i].attr('.link-type')
		if (linkType == 'Error' || (linkType != 'Dependency' && linkType != 'Actor' && linkType != 'Qualification')){
			return false;
		}

		if (linkType == 'Qualification'){
			outboundQualificationCount = outboundQualificationCount + 1;
		}
	}

	// If no outbound and inbound link, do not highlight anything
	// If all outbound links are qualification, and all inbound links are qualification, do not highlight anything
	if (outboundLinks.length == outboundQualificationCount && inboundLinks.length == inboundQualificationCount){
		return false;
	}

	return true;
}
// This is for searchRoot function
// Given a cell, find a list of all "parent" cells for searchRoot to search next
// We define a parent P as:
// A dependency/actor link going from P to current node
// Or
// A refinement, contribution, neededby link from current node to P
function enQueue1(cell){
	var queue = [];
	var outboundLinks = graph.getConnectedLinks(cell, {outbound: true});
	var inboundLinks = graph.getConnectedLinks(cell, {inbound: true});
	for (var i = inboundLinks.length - 1; i >= 0; i--) {
		var linkType = inboundLinks[i].attr('.link-type')
		if (linkType == 'Dependency' || linkType == 'Actor'){
			var sourceCell = inboundLinks[i].getSourceElement();
			queue.push(sourceCell);
		}
	}

	for (var i = outboundLinks.length - 1; i >= 0; i--) {
		var linkType = outboundLinks[i].attr('.link-type')
		if (linkType != 'Error' && linkType != 'Dependency' && linkType != 'Actor' && linkType != 'Qualification'){
			var targetCell = outboundLinks[i].getTargetElement();
			queue.push(targetCell);
		}
	}
	return queue;

}


// Given a cell, search and highlight its leaf
// This is a modified BFS alg ultilizing recursion
// When first time calling it, originalCell is null
// After that it is set to the cell that is being clicked on
// This is to prevent searching in an cyclic graph
function searchLeaf(cell, originalCell){
	// If cellView = originalCell, we have a cycle
	if (cell == originalCell){
		return
	}
	// If first time calling it, set originalCell to cell
	if (originalCell == null){
		originalCell = cell;
	}

	// Highlight it when it is a leaf
	if (isLeaf(cell)){
		cell.attr('.outer/stroke', '#339933');
		cell.attr('.outer/stroke-width', '5');
		cell.attr('.outer/stroke-dasharray', '');

		return;
	}
	// A list of nodes to find next
	var queue = enQueue2(cell);
	// If no more node to search for, we are done
	if (queue.length == 0){
		return;
	}
	// Call searchLeaf for all nodes in queue
	for (var i = queue.length - 1; i >= 0; i--) {
		searchLeaf(queue[i], originalCell);
	}

	return;
}
// Definition of leaf:
// No incoming refinement, contribution, neededby link
// No outgoing dependency , Actor link
// No error link at all
function isLeaf(cell){
	var outboundLinks = graph.getConnectedLinks(cell, {outbound: true});
	var inboundLinks = graph.getConnectedLinks(cell, {inbound: true});
	var inboundQualificationCount = 0;
	var outboundQualificationCount = 0;


	for (var i = outboundLinks.length - 1; i >= 0; i--) {
		var linkType = outboundLinks[i].attr('.link-type')
		if (linkType == 'Error' || linkType == 'Dependency' || linkType == 'Actor' ){
			return false;
		}
		if (linkType == 'Qualification'){
			outboundQualificationCount = outboundQualificationCount + 1;
		}
	}

	for (var i = inboundLinks.length - 1; i >= 0; i--) {
		var linkType = inboundLinks[i].attr('.link-type')
		if (linkType == 'Error' || (linkType != 'Dependency' && linkType != 'Actor' && linkType != 'Qualification')){
			return false;
		}
		if (linkType == 'Qualification'){
			inboundQualificationCount = inboundQualificationCount + 1;
		}
	}

	// If no outbound and inbound link, do not highlight anything
	// If all outbound links are qualification, and all inbound links are qualification, do not highlight anything
	if (outboundLinks.length == outboundQualificationCount && inboundLinks.length == inboundQualificationCount){
		return false;
	}

	return true;
}
// This is for searchLeaf function
// Given a cell, find a list of all "parent" cells for searchLeaf to search next
// We define a children C as:
// A dependency/actor link going from current node to C
// Or
// A refinement, contribution, qualification, neededby link from C to current node
function enQueue2(cell){
	var queue = [];
	var outboundLinks = graph.getConnectedLinks(cell, {outbound: true});
	var inboundLinks = graph.getConnectedLinks(cell, {inbound: true});
	for (var i = outboundLinks.length - 1; i >= 0; i--) {
		var linkType = outboundLinks[i].attr('.link-type')
		if (linkType == 'Dependency' || linkType == 'Actor'){
			var targetCell = outboundLinks[i].getTargetElement();
			queue.push(targetCell);
		}
	}

	for (var i = inboundLinks.length - 1; i >= 0; i--) {
		var linkType = inboundLinks[i].attr('.link-type')
		if (linkType != 'Error' && linkType != 'Dependency' && linkType != 'Actor' && linkType != 'Qualification'){
			var sourceCell = inboundLinks[i].getSourceElement();
			queue.push(sourceCell);
		}
	}
	return queue;

}



// ====================================================================
graph.on('change:size', function(cell, size){
	cell.attr(".label/cx", 0.25 * size.width);

	//Calculate point on actor boundary for label (to always remain on boundary)
	var b = size.height;
	var c = -(size.height/2 + (size.height/2) * (size.height/2) * (1 - (-0.75 * size.width/2) * (-0.75 * size.width/2)  / ((size.width/2) * (size.width/2)) ));
	var y_cord = (-b + Math.sqrt(b*b - 4*c)) / 2;

	cell.attr(".label/cy", y_cord);
});


// ----------------------------------------------------------------- //
// Keyboard shortcuts


var clipboard = new joint.ui.Clipboard();
KeyboardJS.on('ctrl + c', function() {
	// Copy all selected elements and their associatedf links.
	clipboard.copyElements(selection, graph, { translate: { dx: 20, dy: 20 }, useLocalStorage: true });
});
KeyboardJS.on('ctrl + v', function() {
	clipboard.pasteCells(graph);

	selectionView.cancelSelection();

	clipboard.pasteCells(graph, { link: { z: -1 }, useLocalStorage: true });

	// Make sure pasted elements get selected immediately. This makes the UX better as
	// the user can immediately manipulate the pasted elements.
	clipboard.each(function(cell) {
		if (cell.get('type') === 'link') return;

		// Push to the selection not to the model from the clipboard but put the model into the graph.
		// Note that they are different models. There is no views associated with the models
		// in clipboard.
		selection.add(graph.get('cells').get(cell.id));
	});

	selection.each(function(cell) {
	selectionView.createSelectionBox(paper.findViewByModel(cell));
	});
});

//Delete selected nodes when the delete key is pressed.

KeyboardJS.on('del', function(){
// 	while (selection.length > 0){
// 		selection.pop();
// //		console.log(paper.findViewByModel(current));
// //		selectionView.destroySelectionBox(paper.findViewByModel(current));
// //		current.remove();
// 	}
});
// Override browser's default action when backspace is pressed
KeyboardJS.on('backspace', function(){

});
// ----------------------------------------------------------------- //
// Toolbar

var commandManager = new joint.dia.CommandManager({ graph: graph });

$('#btn-undo').on('click', _.bind(commandManager.undo, commandManager));
$('#btn-redo').on('click', _.bind(commandManager.redo, commandManager));
$('#btn-clear-all').on('click', function(){
	graph.clear();
	//Delete cookie by setting expiry to past date
	document.cookie='graph={}; expires=Thu, 18 Dec 2013 12:00:00 UTC;';
});

$('#btn-clear-elabel').on('click', function(){
	var elements = graph.getElements();
	for (var i = 0; i < elements.length; i++){
		elements[i].removeAttr(".satvalue/d");
		elements[i].attr(".constraints/lastval", "none");
		elements[i].attr(".funcvalue/text", " ");
		var cellView  = elements[i].findView(paper);
		elementInspector.render(cellView);
		elementInspector.$('#init-sat-value').val("none");
		elementInspector.updateHTML(null);
	}

});

$('#btn-svg').on('click', function() {
	paper.openAsSVG();
});

$('#btn-zoom-in').on('click', function() {
	paperScroller.zoom(0.2, { max: 3 });
});
$('#btn-zoom-out').on('click', function() {
	paperScroller.zoom(-0.2, { min: 0.2 });
});

$('#btn-save').on('click', function() {
	// Always initalize files on modelling links for code simplicity
	if (linkMode == "Constraints")
		$('#symbolic-btn').trigger( "click" );

	var name = window.prompt("Please enter a name for your file. \nIt will be saved in your Downloads folder. \n.json will be added as the file extension.", "<file name>");
	if (name){
		var fileName = name + ".json";
		download(fileName, JSON.stringify(graph.toJSON()));
	}
});

//Workaround for load, activates a hidden input element
$('#btn-load').on('click', function(){
	if (linkMode == "Constraints")
		$('#symbolic-btn').trigger( "click" );
	$('#loader').click();
});

//Universally increase or decrease font size
$('#btn-fnt-up').on('click', function(){
	var elements = graph.getElements();
	for (var i = 0; i < elements.length; i++){
		if (elements[i].attr(".name/font-size") < max_font){
			elements[i].attr(".name/font-size", elements[i].attr(".name/font-size") + 1);
		}
	}
});

$('#btn-fnt-down').on('click', function(){
	var elements = graph.getElements();
	for (var i = 0; i < elements.length; i++){
		if (elements[i].attr(".name/font-size") > min_font){
			elements[i].attr(".name/font-size", elements[i].attr(".name/font-size") - 1);
		}
	}
});

//Default font size
$('#btn-fnt').on('click', function(){
	var elements = graph.getElements();
	for (var i = 0; i < elements.length; i++){
		elements[i].attr(".name/font-size", 10);
	}
});

//Save in .leaf format
$('#btn-save-leaf').on('click', saveLeaf);



//Simulator
loader = document.getElementById("loader");
reader = new FileReader();

//Whenever the input is changed, read the file.
loader.onchange = function(){
	reader.readAsText(loader.files.item(0));
};

//When read is performed, if successful, load that file.
reader.onload = function(){
	if (reader.result){
		if (mode == "Modelling"){
			graph.fromJSON(JSON.parse(reader.result));

			// Load different links and intension constraints
			var allLinks = graph.getLinks();
			graphObject.links = [];
			graphObject.intensionConstraints = [];
			allLinks.forEach(function(link){
				if(link.attr('./display') == "none"){
					graphObject.intensionConstraints.push(link);
				}else{
					graphObject.links.push(link);
				}
			});
		}else{
			analysisResults = reader.result.split("\n");
			loadAnalysis(analysisResults, null, -1);
		}
	}
};


//Save in a .leaf format
function saveLeaf(){
	var datastring = generateLeafFile();
	var name = window.prompt("Please enter a name for your file. \nIt will be saved in your Downloads folder. \n.leaf will be added as the file extension.", "<file name>");
	if (name){
		var fileName = name + ".leaf";
		download(fileName, datastring);
	}
}

//Helper function to download saved graph in JSON format
function download(filename, text) {
	var dl = document.createElement('a');
	dl.setAttribute('href', 'data:application/force-download;charset=utf-8,' + encodeURIComponent(text));
	dl.setAttribute('download', filename);

	dl.style.display = 'none';
	document.body.appendChild(dl);

	dl.click();
	document.body.removeChild(dl);
}

// ----------------------------------------------------------------- //
// forward analysis
$('#frd-analysis-btn').on('click', function(){
	// propogation
	// analysis
	// Question: how do you update the drawing and also the elementInspector value together
	// TODO: Check to make sure there are not nodes that have more than one type of Decomposition (AND/OR/XOR) connected to them.
	// TODO: This doesn't work in the growingleaf tool
	var all_elements = graph.getElements();
	// Filter out Actors
	var elements = [];
	for (var e1 = 0; e1 < all_elements.length; e1++){
		if (!(all_elements[e1] instanceof joint.shapes.basic.Actor)){
			elements.push(all_elements[e1]);
		}
	}

	// loop through all elements and build a dictionary of {id:LinkCalc}
	// with LinkCalc represents the number of imcoming links to the element
	var LinkCalc = {};
	// step 1: get a list of all elements and put leaves to the elementsReady, other elements to elementsWaiting
	var elementsReady = [];
	var elementsWaiting = [];
	for (var e = 0; e < elements.length; e++){
		// initialize all nodes with 0
		LinkCalc[elements[e].id] = 0;
		// set up elementID
		var elementID = e.toString();
		while (elementID.length < 4){ elementID = "0" + elementID;}
		elements[e].prop("elementid", elementID);
		// check if it is leaf node or not, assign to elementsReady if yes; assign to elementsWaiting if no
		if (isLeaf(elements[e])){
			elementsReady.push(elements[e]);
		}
		else {
			elementsWaiting.push(elements[e]);
		}
	}

	// update all links
	var savedLinks = [];
	if (linkMode == "Relationships"){
		var links = graph.getLinks();
	    links.forEach(function(link){
	        if(!isLinkInvalid(link)){
				if (link.attr('./display') != "none")
					savedLinks.push(link);
					// add 1 to the node for each incoming link
					LinkCalc[link.get("target").id] ++;
	        }
	        else{link.remove();}
		});
	}

	// evaluate model
	// when the list is not empty
	while (elementsReady.length > 0){
		// Get and remove the first element in the elementsReady to evaluate
		var element = elementsReady.shift();
		// Calculate New Evaluation by calling calculateEvaluation function
		var satisfactionValue = calculateEvaluation(elements, savedLinks, element);
		
		


		// TODO: update the satisfactionValue of the element and udpate the graph



		// bookkeeping:
		// loop through all links in the graph and find the one with the element
		// find the eleDest aka target of the element
		for (var l = 0; l < savedLinks.length; l++){
			var current = savedLinks[l]; // current is each link
			if (current.get("source").id && current.get("source").id == element.id && current.get("target").id && inElementsWaiting(elementsWaiting, current.get("target"))){
				var targetID = savedLinks[l].get("target").id; 
				// check whether the children of the source have all been examed
				// if we examined a node, we decrement the LinkCalc of its parent by 1
				LinkCalc[targetID] --;
				// when the target becomes a new "leaf", add it to the elementsReady and remove it from elementsWaiting
				if (LinkCalc[targetID] == 0){
					// udpate elementsWaiting
					var newLeaf = null;
					for (var p = 0; p < elementsWaiting.length; p++){
						if (elementsWaiting[p].id == targetID){
							newLeaf = elementsWaiting[p];
							var temp_i = elementsWaiting.indexOf(elementsWaiting[p]);
							elementsWaiting.splice(temp_i, 1);
						}
					}
					// udpate elementsReady
					elementsReady.push(newLeaf);
				}
			}
		}
		
			// only remove the eleDest from the elementsWaiting array iff we have evaluated all elements whose parents is eleDest
	}

		// IMPORTANT - useful stuff
		// console.log(elements[e].attr(".satvalue/value")); // how you get the satisfaction value of the element
		// elements[e].attr(".name/text").replace(/\n/g, " ") // how you get the name of each element
		// ways to tell the intention type of each element
		// if (elements[e] instanceof joint.shapes.basic.Goal)
		// 	  console.log("G\t");	  
		// else if (elements[e] instanceof joint.shapes.basic.Task)
		// 	console.log("T\t");
		// else if (elements[e] instanceof joint.shapes.basic.Quality)
		// 	console.log("Q\t"); // NOTE this is different in other tools, in other tools, we use S to represent soft goals
		// else if (elements[e] instanceof joint.shapes.basic.Resource)
		// 	console.log("R\t");
		// else
		// 	console.log("I\t");
	// }
	// print out all the relationship links
	// for (var l = 0; l < savedLinks.length; l++){
	// 	var current = savedLinks[l];
	// 	var relationship = current.label(0).attrs.text.text.toUpperCase()
	// 	var source = "-";
	// 	var target = "-";
	// 	// distinguish the source and target
	// 	if (current.get("source").id)
	// 		source = graph.getCell(current.get("source").id).prop("elementid");
	// 	if (current.get("target").id)
	// 		target = graph.getCell(current.get("target").id).prop("elementid");
	// 	// console.log('relationship: ' + relationship);
	// 	if (relationship.indexOf("|") > -1){
	// 		evolvRelationships = relationship.replace(/\s/g, '').split("|");
	// 		console.log('L\t' + evolvRelationships[0] + '\t' + source + '\t' + target + '\t' + evolvRelationships[1] + "\n");
	// 	}else{
	// 		console.log('L\t' + relationship + '\t' + source + '\t' + target + "\n");
	// 	}
	// }

	// Initialise values
});

// calculate evaluation
// return an int representing the new evaluation
// elements is a list of all elements in the graph
// element is the one that we are currently exploring
function calculateEvaluation(elements, savedLinks, element) {
	// setup variables for bookkeeping
	var hasDecomposition = false;
	var decomSums = [];
	for (var i = 0; i < 7; i++) {
		decomSums[i] = 0;
	}

	var numContributions = 0;
	var sums = [];
	for (var i = 0; i < 7; i++) {
		sums[i] = 0;
	}
	
	var hasDependencies = false;
	var dependSums = [];
	for (var i = 0; i < 7; i++) {
		dependSums[i] = 0;
	}
	
	var hasPreconditions = false;
	var preSums = [];
	for (var i = 0; i < 7; i++) {
		preSums[i] = 0;
	}
	
	//Go through all links that the current node is the source of
	var linksWanted = [];
	for (var l = 0; l < savedLinks.length; l++){
		var current = savedLinks[l]; // current is each link
		if (current.get("source").id && current.get("source").id == element.id && current.get("target").id){
			linksWanted.push(current);
		}
	}
	// get the current evaluation value of the source and target along with the link label
	for (var l = 0; l < linksWanted.length; l++){
		var eachLink = linksWanted[l];
		var targetNode = getTarget(elements, eachLink.get("target").id);
		var tVal = satValueDict[targetNode.attr(".satvalue/value")]; // satisfaction value of the target node
		var sVal = satValueDict[element.attr(".satvalue/value")]; // satisfaction value of the source node
		// four cases that we are consiedering here
		// decomposition (and, or)
		if (eachLink.label(0).attrs.text.text == "and" || eachLink.label(0).attrs.text.text == "or"){
			hasDecomposition = true;
			decomSums[sVal]++;
		} else if (eachLink.label(0).attrs.text.text == "helps" || eachLink.label(0).attrs.text.text == "hurts" || eachLink.label(0).attrs.text.text == "makes" || eachLink.label(0).attrs.text.text == "breaks") {
			// contributions
			var contValue = eachLink.label(0).attrs.text.text;
			console.log(contValue);
			var ci = weightedContributionFunction[sVal][contValue];
			console.log(ci);
			return
		}
			
			// if (hasDecomposition || numContributions > 0) // Since result will be none we shouldn't need this condition, just the next statement.
			
			// dependency
			// precondition
	
	
	
	}




















}

function getDecomposition(decomSums, type){
	/**
	 * return the satisfaction value of the node which has decomposition links
	 * its arguments are:
	 * `decomSums`: A array with a list of integers with each integer representing the numeber
	 * of occurance of each satisfaction value associated with the ndoe
	 * `type`: indicates types of decomposition. Either AND or OR
	 */
	// rules
	var result = N;
	var dns = decomSums[S];
	var dnws = decomSums[PS];
	var dnn = decomSums[N];
	var dnwd = decomSums[PD];
	var dnd = decomSums[D];
	var dnc = decomSums[C];
	var dnu = decomSums[U];
	if (type == DecompositionType.AND) {
		if (dnd > 0) {
			result = D;
		} else if ((dnc > 0) || (dnu > 0)) {
			result = U;
		} else if (dnwd > 0) {
			result = PD;
		} else if (dnn > 0) {
			result = N;
		} else if (dnws > 0) {
			result = PS;
		} else if (dns > 0) {
			result = S;
		} else {
			result = N;
		}
	} else if (type == DecompositionType.OR || type == DecompositionType.XOR) {
		if (dns > 0) {
			result = S;
		} else if (dnws > 0) {		// CHANGED over AMYOT ET. Al. was after U conditions.
			result = PS;				
		} else if ((dnc > 0) || (dnu > 0)) {
			result = U;
		} else if (dnn > 0) {
			result = N;
		} else if (dnwd > 0) {
			result = PD;
		} else if (dnd > 0) {
			result = D;
		}
	}
}

// check whether the element is in the elementsWaiting
function inElementsWaiting(elementsWaiting, target) {
	for (var l = 0; l < elementsWaiting.length; l++){
		if (elementsWaiting[l].id == target.id ){
			return true
		}
	}
	return false
	
}

function getTarget(elements, targetID){
	for (var l = 0; l < elements.length; l++){
		if (elements[l].id == targetID){
			return elements[l];
		}
	}
}