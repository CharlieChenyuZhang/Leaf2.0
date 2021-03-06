/* *** Code Inconsistent with Rappid Distribution ***
 * J.Fear - Aug. 2015
 * The following functions differs from the Rappid release. These functions did not exist in the Rappid Library.
 * 		joint.shapes.basic.Intention: Is the superclass for all added nodes (goals, subgoals, tasks, resources).
 * 		joint.shapes.basic.Goal: Goal node.
 * 		joint.shapes.basic.Task: Task node.
 * 		joint.shapes.basic.Quality: Quality node.
 * 		joint.shapes.basic.Resource: Resource node.
 * 		joint.dia.Actorlink: Link between actors.
 * 		joint.shapes.basic.Actor: Actor node.
 *
 */
joint.shapes.basic.Intention = joint.shapes.basic.Generic.extend({
	markup: '<g class="rotatable"><g class="scalable"><rect class="outer"/></g><path class="satvalue"/><text class="funcvalue"/><text class="name"/></g>',
	defaults: joint.util.deepSupplement({
        type: "basic.Intention",
        size: {
            width: 100,
            height: 60
        },
        attrs: {
            ".outer": {
                width: 100,
                height: 60
            },
            ".satvalue": {
              	'stroke': '#FFFF00',
            	'stroke-width': 4,
            	'value': 'none'
            },
            ".funcvalue": {
            	'text': "",
            	'ref-y': '0.75',
            	'ref-x': '0.08',
            	'fill': 'black',
            	'font-size': 16
            },
            ".name": {
            	'fill': 'black',
            	'ref-y': '0.5',
            	'ref-x': '0.5',
            	'font-size': 10,
            	'x-alignment': 'middle',
            	'y-alignment': 'middle'
            }
        }
    }, joint.dia.Element.prototype.defaults)
});

joint.shapes.basic.Goal = joint.shapes.basic.Intention.extend({
    defaults: joint.util.deepSupplement({
        type: "basic.Goal",
        attrs: {
            ".outer": {
            	rx: 20,
            	ry: 20,
                stroke: 'black',
                fill: '#FFCC66',
            },
            ".satvalue": {
            	'ref-x': '0.8',
            	'ref-y': '0.75'
            },
            ".name": {
            	'text': 'Goal',
            }
        }
    }, joint.shapes.basic.Intention.prototype.defaults)
});

joint.shapes.basic.Task = joint.shapes.basic.Intention.extend({
    markup: '<g class="rotatable"><g class="scalable"><path class="outer"/></g><path class="satvalue"/><text class="funcvalue"/><text class="name"/></g>',
    defaults: joint.util.deepSupplement({
        type: "basic.Task",
        attrs: {
            ".outer": {

            	d: 'M 0 30 L 20 0 L 80 0 L 100 30 L 80 60 L 20 60 z',
            	fill: '#92E3B1',
            	stroke: 'black',
            	'stroke-width': 1
            },
            ".satvalue": {
            	'ref-y': '0.75',
            	'ref-x': '0.75'
            },
            ".funcvalue": {
            	'ref-y': '0.75',
            	'ref-x': '0.2',
            },
            ".name": {
            	'text': 'Task',
            }
        }
    }, joint.shapes.basic.Intention.prototype.defaults)
});

joint.shapes.basic.Quality = joint.shapes.basic.Intention.extend({
    markup: '<g class="rotatable"><g class="scalable"><path class="outer"/></g><path class="satvalue"/><text class="funcvalue"/><text class="name"/></g>',
    defaults: joint.util.deepSupplement({
        type: "basic.Quality",
        attrs: {
            ".outer": {
            	d: 'M 0 20 Q 5 0 45 5 Q 55 10 65 5 Q 95 0 100 15 L 100 30 Q 100 50 80 50 L 75, 50 Q 66 50 55 47 Q 45 45 35 47 Q 25 50 15 50 L 10 50 Q 0 45 0 25 z',
                stroke: 'black',
                fill: '#FF984F',
            },
            ".satvalue": {
            	'ref-y': '0.7',
            	'ref-x': '0.75'
            },
            ".funcvalue": {
            	'ref-y': '0.75',
            	'ref-x': '0.2',
            },
            ".name": {
            	'text': 'Quality',
            }
        }
    }, joint.shapes.basic.Intention.prototype.defaults)
});

joint.shapes.basic.Resource = joint.shapes.basic.Intention.extend({
	defaults: joint.util.deepSupplement({
		type: "basic.Resource",
		attrs: {
            ".outer": {
                stroke: 'black',
                fill: '#92C2FE',
            },
            ".satvalue": {
            	transform: "translate(80, 40)",
            },
            ".name": {
            	'text': 'Resource',
            }
        }
	}, joint.shapes.basic.Intention.prototype.defaults)
});

joint.dia.Actorlink = joint.dia.Link.extend({
	defaults: joint.util.deepSupplement({
		type: 'Actorlink',
	})
})

joint.shapes.basic.Actor = joint.shapes.basic.Generic.extend({
    markup: '<g class="scalable"><circle class = "outer"/></g><circle class="label"/><path class="line"/><text class = "name"/>',
    defaults: joint.util.deepSupplement({
        type: "basic.Actor",
        size: {
            width: 120,
            height: 120
        },
        attrs: {
            ".label": {
            	r: 30,
            	cx: 30,
            	cy: 30,
            	fill: '#FFFFA4',
            	stroke: '#000000'
            },
            ".outer": {
            	r: 60,
            	cx: 60,
            	cy: 60,
            	fill: '#CCFFCC',
            	stroke: '#000000',
            	'stroke-dasharray': '5 2'
            },

            ".name": {
            	'text': 'Actor',
            	'fill': 'black',
            	'ref-y': '0.5',
            	'ref-x': '0.5',
            	'ref': '.label',
            	'font-size': 10,
            	'x-alignment': 'middle',
            	'y-alignment': 'middle'
            },
            ".line": {
            }
        }
    }, joint.dia.Element.prototype.defaults)
});
// This is an actor without boundary
joint.shapes.basic.Actor2 = joint.shapes.basic.Generic.extend({
    markup: '<g class="scalable"><circle class = "outer"/></g><path class="line"/><text class = "name"/>',
    defaults: joint.util.deepSupplement({
        type: "basic.Actor2",
        size: {
            width: 80,
            height: 80
        },
        attrs: {
            ".outer": {
                r: 60,
                cx: 60,
                cy: 60,
                fill: '#FFFFA4',
                stroke: '#000000'
            },
            ".name": {
                'text': 'Actor',
                'fill': 'black',
                'ref-y': '0.5',
                'ref-x': '0.5',
                'font-size': 10,
                'x-alignment': 'middle',
                'y-alignment': 'middle'
            },
            ".line": {
            }
        }
    }, joint.dia.Element.prototype.defaults)
});
