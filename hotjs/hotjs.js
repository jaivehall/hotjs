// name space
var hotjs = hotjs || {};

// default view size
var WIDTH = 480, HEIGHT = 270;

(function(){
	
// app -> view -> scene -> layer -> entity

// event: mouse, touch, keyboard, userdefined

// resource: audio, image, sprite, video

// animation: move, rotate, scale, fade

// math: point, vector, matrix,

// physics: collision, gravity, momentum,

// tool: UT, benchmark, debug, profiling,

// AI: pathfinding

// lang:

// addon:

// -------------------------------------

hotjs.require = function(file) {
};

// tool for inherit
// See 
// "tests/test_oo.html" for example & use case
hotjs.inherit = function(childCtor, parentCtor, newMethods) {
	function F() {};
	F.prototype = parentCtor.prototype;
	
	childCtor.prototype = new F();
	childCtor.prototype.constructor = childCtor;
	
	childCtor.supClass = parentCtor.prototype;
	childCtor.supClass.constructor = parentCtor;
	
	for ( var p in newMethods) {
		if (newMethods.hasOwnProperty(p) && p !== "prototype") {
			childCtor.prototype[p] = newMethods[p];
		}
	}
};

hotjs.base = function(me, opt_methodName, var_args) {
	var caller = arguments.callee.caller;
	if (caller.supClass) {
		// This is a constructor. Call the superclass constructor.
		var args = Array.prototype.slice.call(arguments, 1);
		var f = caller.supClass.constructor;
		return f.apply(me, args);
	}

	var args = Array.prototype.slice.call(arguments, 2);
	var foundCaller = false;
	for ( var ctor = me.constructor; ctor; ctor = ctor.supClass && ctor.supClass.constructor) {
		if (ctor.prototype[opt_methodName] === caller) {
			foundCaller = true;
		} else if (foundCaller) {
			return ctor.prototype[opt_methodName].apply(me, args);
		}
	}

	// If we did not find the caller in the prototype chain,
	// then one of two things happened:
	// 1) The caller is an instance method.
	// 2) This method was not called by the right caller.
	if (me[opt_methodName] === caller) {
		return me.constructor.prototype[opt_methodName].apply(me, args);
	} else {
		throw Error('goog.base called from a method of one name '
				+ 'to a method of a different name');
	}
};
		
// tool to print variable value in console
hotjs.log = function(o, n) {
	if (typeof n == 'undefined' ) n = 0;
	
	var prefix = "";
	for ( var i = 0; i < n; i++) prefix += "  ";
	
	if( typeof o == "object" ) {
		console.log(prefix + typeof o + ' {');
		for ( var p in o) {
			if (typeof o[p] == 'object') {
				console.log( prefix + "  " + p + ' (' + typeof o[p]+ ') = ' );
				hotjs.log(o[p], n + 1);
			} else {
				console.log(prefix + "  " + p + ' (' + typeof o[p]+ ') = ' + o[p]);
			}
		}
		console.log(prefix + '}');
	} else {
		console.log( o );
	}
};

//[].indexOf(value)
if (!Array.prototype.indexOf) {
	Array.prototype.indexOf = function(obj, fromIndex) {
		if (fromIndex == null || fromIndex == undefined) {
			fromIndex = 0;
		} else if (fromIndex < 0) {
			fromIndex = Math.max(0, this.length + fromIndex);
		}
		for ( var i = fromIndex, j = this.length; i < j; i++) {
			if (this[i] === obj)
				return i;
		}
		return -1;
	};
}

// A cross-browser requestAnimationFrame
// See
// https://hacks.mozilla.org/2011/08/animating-with-javascript-from-setinterval-to-requestanimationframe/
var requestAnimFrame = (function() {
	return window.requestAnimationFrame || window.webkitRequestAnimationFrame
			|| window.mozRequestAnimationFrame || window.oRequestAnimationFrame
			|| window.msRequestAnimationFrame || function(callback) {
				window.setTimeout(callback, 1000 / 60);
			};
})();



// ----------- hotjs.App ----------------------
var hotjs_app = undefined;
var hotjs_lastTime;

// The main game loop
hotjs_main = function(){
	var now = Date.now();
	var dt = (now - hotjs_lastTime) / 1000.0;

	if(hotjs_app != null) {
		hotjs_app.update(dt);
		hotjs_app.render();
	}

	hotjs_lastTime = now;
	requestAnimFrame(hotjs_main);
};

var App = function(){
	hotjs_app = this;
	this.upTime = 0;
	
	this.views = [];
};

App.prototype = {
	addView : function(v) {
		this.views.push(v);
		return this;
	},
	start : function() {
		hotjs_app = this;
		
		this.reset();
		
		hotjs_lastTime = Date.now();
		hotjs_main();

		return this;
	},
	reset : function() {
		return this;
	},
	update : function(dt) {
		this.upTime += dt;
		
		for(var i=0; i<this.views.length; i++) {
			this.views[i].update(dt);
		}
		return this;
	},
	render : function() {
		for(var i=0; i<this.views.length; i++) {
			this.views[i].render();
		}
		return this;
	}
};

//--------- hotjs.View ----------------

var View = function(){
	this.canvas = document.createElement("canvas");
	this.ctx = this.canvas.getContext("2d");
	this.canvas.width = 480;
	this.canvas.height = 320;

	this.container = undefined;

	this.curScene = undefined;
	this.scenes = [];
	this.sceneIndex = {};
	this.sceneStack = [];
	
	this.fpsInfo = false;
	this.dtSum = 0;
	this.frames = 0;
	this.fps = 60;
	
	this.upTime = 0;
	this.upTimeShow = ""; // h:m:s
};

View.prototype = {
	setContainer : function(id){
		this.container = document.getElementById(id);
		if(this.container == undefined) {
			this.container = document.body;
		}
		this.container.appendChild(this.canvas);
		return this;
	},
	setSize : function(w,h) {
		this.canvas.width = w;
		this.canvas.height = h;
		return this;
	},
	width : function() {
		return this.canvas.width;
	},
	height : function() {
		return this.canvas.height;
	},
	addScene : function(s, id) {
		this.scenes.push( s );
		if(typeof id != 'undefined') {
			this.sceneIndex[id] = s;
		}
		s.setContainer(this);
		
		this.curScene = s;
		return this;
	}, 
	switchScene : function(s) {
		if( s != undefined ) {
			if( this.curScene != undefined ) {
				//this.curScene.stop();
			}
			this.curScene = s;
			//s.play();
		}
		return this;
	},
	switchSceneById : function(id) {
		var s = this.sceneIndex[id];
		if(typeof s != 'undefined') {
			this.switchScene(s);
		}
		return this;
	},
	pushSceneById : function(id) {
		this.sceneStack.push( this.curScene );
		this.switchSceneById(id);
		return this;
	}, 
	popScene : function() {
		var s = this.sceneStack.pop();
		this.switchScene(s);
		return this;
	},
	showFPS : function(f) {
		this.fpsInfo = f;
		return this;
	},
	update : function(dt) {
		for(var i=0; i<this.scenes.length; i++) {
			this.scenes[i].update(dt);
		}

		if( this.fpsInfo ) {
			this.frames ++;
			this.dtSum += dt;
			if( this.dtSum > 1 ) {
				this.upTime += this.dtSum;
				
				var s = Math.floor(this.upTime);
				var m = Math.floor( s / 60 );
				s %= 60;
				if(s<10) s="0"+s;
				h = Math.floor( m / 60 );
				m %= 60;
				if(m<10) m="0"+m;
				this.upTimeShow = h + " : " + m + " : " + s;
				
				this.fps = Math.floor( this.frames / this.dtSum + 0.5 );
				this.dtSum = 0;
				this.frames = 0;
			}
		}
		return this;
	},
	render : function() {
		for(var i=0; i<this.scenes.length; i++) {
			this.scenes[i].render(this.ctx);
		}
		
		if( this.fpsInfo ) {
			var c = this.ctx;
			c.save();
			c.strokeStyle = "#000000";
			c.fillText( this.upTimeShow, 10, 20 );
			c.fillText( this.fps + ' fps', 10, 40 );
			c.fillText( this.frames, 10, 60 );
			c.restore();
		}
		return this;
	}
	
	// TODO: listen input events & forward
	
};

// ------------- hotjs.Node -----------
var hotjs_node_id = 0;

var Node = function() {
	this.container = undefined;
	this.name = "node_" + (hotjs_node_id ++);
	this.subnodes = [];
	this.index = {};
	
	this.size = [40,40];
	this.bgcolor = undefined; // default: "white"
	this.color = undefined; // default: "black"
	this.img = undefined;
	this.sprite = undefined;

	// geometry, 2D only
	this.pos = [0,0];
	this.velocity = undefined; // default [0,0]

	this.rotation = undefined; // default: 0
	this.spin = undefined; // default: 0

	this.scale = undefined; // default: [1,1]
	this.shrink = undefined; // default: 1

	this.alpha = undefined; // default: 1, range: [0,1]
	this.fade = undefined; // default: 0
	
	// physical
	this.accel = undefined; // default: [0,0]
	this.mass = 1600; // default: 1600
	this.density = 1;

};

Node.prototype = {
	setContainer : function(c) {
		this.container = c;
		return this;
	},
	setName : function(n) {
		this.name = n;
		return this;
	},
	setPos : function(x,y) {
		this.pos = [x,y];
		return this;
	},
	setSize : function(w,h) {
		this.size = [w,h];
		return this;
	},
	width : function() {
		return this.size[0];
	},
	height : function() {
		return this.size[1];
	},
	setRotation : function(r) {
		this.rotation = r;
		return this;
	},
	setScale : function(sx,sy) {
		this.scale = [sx,sy];
		return this;
	},
	setVelocity : function(vx,vy) {
		this.velocity = [vx,vy];
		return this;
	},
	setSpin : function(s) {
		if(this.rotation == undefined) {
			this.rotation = 0;
		}
		this.spin = s;
		return this;
	},
	setShrink : function(sx,sy) {
		if(this.scale == undefined) {
			this.scale = [1,1];
		}
		this.shrink = [sx,sy];
		return this;
	},
	setMass : function(m) {
		this.mass = m;
		return this;
	},
	setDensity : function(d) {
		this.density = d;
		this.mass = this.size[0] * this.size[1] * d;
		return this;
	},
	setAccel : function(ax,ay) {
		if(this.velocity == undefined) {
			this.velocity = [0,0];
		}
		this.accel = [ax,ay];
		return this;
	},
	setColor : function(c) {
		this.color = c;
		return this;
	},
	setBgColor : function(c) {
		this.bgcolor = c;
		return this;
	},
	// alpha, range [0,1]
	setAlpha : function(a) {
		this.alpha = a;
		return this;
	},
	// f can be a small like, like 1.0/60; or function: alpha = f(alpha)
	setFade : function(f) {
		if(this.alpha == undefined) this.alpha=1;
		this.fade = f;
		return this;
	},
	setImage : function(img) {
		this.img = img;
		if(this.size == undefined) this.size = [img.width, img.height];
		return this;
	},
	addNode : function(n, id) {
		if(this.subnodes == undefined) this.subnodes=[];
		if(this.index == undefined) this.index={};
		
		this.subnodes.push(n);
		if(typeof id == 'string') {
			this.index[id] = n;
		}
		n.setContainer(this);
		
		return this;
	},
	removeNode : function(n) {
		var i = this.subnodes.indexOf(n);
		if( i>=0 ) this.subnodes.splice(i, 1);
		n.setContainer(undefined);
		
		return this;
	},
	update : function(dt) {
		// update pos / rotation / scale, according to velocity / spin / shrink
		if(this.velocity !== undefined) {
			this.pos[0] += this.velocity[0];
			this.pos[1] += this.velocity[1];
		}
		if(this.spin !== undefined) {
			this.rotation += this.spin;
		}
		if(this.shrink !== undefined) {
			this.scale[0] *= this.shrink[0];
			this.scale[1] *= this.shrink[1];
		}
		
		// update velocity / alpha, according to accel / fade
		if(this.accel !== undefined) {
			this.velocity[0] += this.accel[0];
			this.velocity[1] += this.accel[1];
		}
		if(this.fade !== undefined) {
			if(typeof this.fade == 'number') {
				this.alpha += this.fade;
				if(this.alpha<0 || this.alpha>1) this.fade=undefined;
			} else if (typeof this.fade == 'function') {
				this.alpha = this.fade( this.alpha, dt );
			}
		}

		for(var i=0; i<this.subnodes.length; i++) {
			this.subnodes[i].update(dt);
		}
		
		return this;
	},
	render : function(c) {
		c.save();
		
		// apply pos / scale / rotation
		c.translate(this.pos[0], this.pos[1]);
		if(this.scale !== undefined) c.scale(this.scale[0],this.scale[1]);
		if(this.rotation !== undefined) c.rotate(this.rotation * Math.PI / 180);
		if(this.alpha !== undefined) c.globalAlpha = this.alpha;
		//if(this.composite !== undefined) c.globalCompositeOperation = this.compositeOperation;
		
		this.draw(c);
		
		for(var i=0; i<this.subnodes.length; i++) {
			this.subnodes[i].render(c);
		}
		
		c.restore();
		return this;
	},
	draw : function(c) {
		if(this.img !== undefined) {
			//c.translate( - this.img.width/2, -this.img.height/2 );
			c.translate( - this.size[0]/2, -this.size[1]/2 );
			c.scale( this.size[0]/this.img.width, this.size[1]/this.img.height);
			c.drawImage( this.img, 0, 0 );
		}
		
		return this;
	}
};

//------------- hotjs.Scene -----------

var Scene = function(){
	hotjs.base(this);
	
	this.grid = false;
	this.color = "black";
	this.bgcolor = "white";

	this.playing = false;
};

hotjs.inherit( Scene, Node, {
	showGrid : function(g) {
		this.grid = g;
		return this;
	},
	play : function() {
		this.playing = true;
		return this;
	},
	stop : function() {
		this.playing = false;
		return this;
	},
	update : function(dt) {
		Scene.supClass.update.call(this, dt);
		
		// TODO: do what? 
	},
	draw : function(c) {
		c.save();
		c.fillStyle = this.bgcolor;
		c.fillRect(0, 0, this.size[0], this.size[1]);
		
		if( this.grid ) {
			c.strokeStyle = this.color;			
			c.lineWidth = 0.1;
			var m = 40, n = 40;
			for( var i=0; i<this.size[0]; i+=m ) {
				for( var j=0; j<this.size[1]; j+=n) {
					c.save();
					c.translate(i, j);
	
					c.strokeRect(0,0, m, n);
					c.restore();
				}
			}		
		}
		
		c.lineWidth = 2;
		c.strokeRect(0,0, this.size[0], this.size[1]);
		c.restore();
		return this;
	}
});

hotjs.Node = Node;
hotjs.Scene = Scene;
hotjs.View = View;
hotjs.App = App;

})(); 

// ----------------------------------
function init() {
	terrainPattern = ctx.createPattern(resources.get('img/terrain.png'),
			'repeat');

	document.getElementById('play-again').addEventListener('click', function() {
		reset();
	});

	reset();
	lastTime = Date.now();
	main();
}

// Game state
var player = {
	pos : [ 0, 0 ],
	sprite : new Sprite('img/sprites.png', [ 0, 0 ], [ 39, 39 ], 16, [ 0, 1 ])
};

var bullets = [];
var enemies = [];
var explosions = [];

var lastFire = Date.now();
var gameTime = 0;
var isGameOver;
var terrainPattern;

var score = 0;
//var scoreEl = document.getElementById('score');

// Speed in pixels per second
var playerSpeed = 200;
var bulletSpeed = 500;
var enemySpeed = 100;

// Update game objects
function update(dt) {
	gameTime += dt;

	handleInput(dt);
	updateEntities(dt);

	// It gets harder over time by adding enemies using this
	// equation: 1-.993^gameTime
	if (Math.random() < 1 - Math.pow(.993, gameTime)) {
		enemies.push({
			pos : [ canvas.width, Math.random() * (canvas.height - 39) ],
			sprite : new Sprite('img/sprites.png', [ 0, 78 ], [ 80, 39 ], 6, [
					0, 1, 2, 3, 2, 1 ])
		});
	}

	checkCollisions();

	//scoreEl.innerHTML = score;
};

function handleInput(dt) {
	if (input.isDown('DOWN') || input.isDown('s')) {
		player.pos[1] += playerSpeed * dt;
	}

	if (input.isDown('UP') || input.isDown('w')) {
		player.pos[1] -= playerSpeed * dt;
	}

	if (input.isDown('LEFT') || input.isDown('a')) {
		player.pos[0] -= playerSpeed * dt;
	}

	if (input.isDown('RIGHT') || input.isDown('d')) {
		player.pos[0] += playerSpeed * dt;
	}

	if (input.isDown('SPACE') && !isGameOver && Date.now() - lastFire > 100) {
		var x = player.pos[0] + player.sprite.size[0] / 2;
		var y = player.pos[1] + player.sprite.size[1] / 2;

		bullets.push({
			pos : [ x, y ],
			dir : 'forward',
			sprite : new Sprite('img/sprites.png', [ 0, 39 ], [ 18, 8 ])
		});
		bullets.push({
			pos : [ x, y ],
			dir : 'up',
			sprite : new Sprite('img/sprites.png', [ 0, 50 ], [ 9, 5 ])
		});
		bullets.push({
			pos : [ x, y ],
			dir : 'down',
			sprite : new Sprite('img/sprites.png', [ 0, 60 ], [ 9, 5 ])
		});

		lastFire = Date.now();
	}
}

function updateEntities(dt) {
	// Update the player sprite animation
	player.sprite.update(dt);

	// Update all the bullets
	for ( var i = 0; i < bullets.length; i++) {
		var bullet = bullets[i];

		switch (bullet.dir) {
		case 'up':
			bullet.pos[1] -= bulletSpeed * dt;
			break;
		case 'down':
			bullet.pos[1] += bulletSpeed * dt;
			break;
		default:
			bullet.pos[0] += bulletSpeed * dt;
		}

		// Remove the bullet if it goes offscreen
		if (bullet.pos[1] < 0 || bullet.pos[1] > canvas.height
				|| bullet.pos[0] > canvas.width) {
			bullets.splice(i, 1);
			i--;
		}
	}

	// Update all the enemies
	for ( var i = 0; i < enemies.length; i++) {
		enemies[i].pos[0] -= enemySpeed * dt;
		enemies[i].sprite.update(dt);

		// Remove if offscreen
		if (enemies[i].pos[0] + enemies[i].sprite.size[0] < 0) {
			enemies.splice(i, 1);
			i--;
		}
	}

	// Update all the explosions
	for ( var i = 0; i < explosions.length; i++) {
		explosions[i].sprite.update(dt);

		// Remove if animation is done
		if (explosions[i].sprite.done) {
			explosions.splice(i, 1);
			i--;
		}
	}
}

// Collisions

function collides(x, y, r, b, x2, y2, r2, b2) {
	return !(r <= x2 || x > r2 || b <= y2 || y > b2);
}

function boxCollides(pos, size, pos2, size2) {
	return collides(pos[0], pos[1], pos[0] + size[0], pos[1] + size[1],
			pos2[0], pos2[1], pos2[0] + size2[0], pos2[1] + size2[1]);
}

function checkCollisions() {
	checkPlayerBounds();

	// Run collision detection for all enemies and bullets
	for ( var i = 0; i < enemies.length; i++) {
		var pos = enemies[i].pos;
		var size = enemies[i].sprite.size;

		for ( var j = 0; j < bullets.length; j++) {
			var pos2 = bullets[j].pos;
			var size2 = bullets[j].sprite.size;

			if (boxCollides(pos, size, pos2, size2)) {
				// Remove the enemy
				enemies.splice(i, 1);
				i--;

				// Add score
				score += 100;

				// Add an explosion
				explosions.push({
					pos : pos,
					sprite : new Sprite('img/sprites.png', [ 0, 117 ],
							[ 39, 39 ], 16, [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
									11, 12 ], null, true)
				});

				// Remove the bullet and stop this iteration
				bullets.splice(j, 1);
				break;
			}
		}

		if (boxCollides(pos, size, player.pos, player.sprite.size)) {
			gameOver();
		}
	}
}

function checkPlayerBounds() {
	// Check bounds
	if (player.pos[0] < 0) {
		player.pos[0] = 0;
	} else if (player.pos[0] > canvas.width - player.sprite.size[0]) {
		player.pos[0] = canvas.width - player.sprite.size[0];
	}

	if (player.pos[1] < 0) {
		player.pos[1] = 0;
	} else if (player.pos[1] > canvas.height - player.sprite.size[1]) {
		player.pos[1] = canvas.height - player.sprite.size[1];
	}
}

// Draw everything
function render() {
	ctx.fillStyle = terrainPattern;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Render the player if the game isn't over
	if (!isGameOver) {
		renderEntity(player);
	}

	renderEntities(bullets);
	renderEntities(enemies);
	renderEntities(explosions);
};

function renderEntities(list) {
	for ( var i = 0; i < list.length; i++) {
		renderEntity(list[i]);
	}
}

function renderEntity(entity) {
	ctx.save();
	ctx.translate(entity.pos[0], entity.pos[1]);
	entity.sprite.render(ctx);
	ctx.restore();
}

// Game over
function gameOver() {
	document.getElementById('game-over').style.display = 'block';
	document.getElementById('game-over-overlay').style.display = 'block';
	isGameOver = true;
}

// Reset game to original state
function reset() {
	document.getElementById('game-over').style.display = 'none';
	document.getElementById('game-over-overlay').style.display = 'none';
	isGameOver = false;
	gameTime = 0;
	score = 0;

	enemies = [];
	bullets = [];

	player.pos = [ 50, canvas.height / 2 ];
};

