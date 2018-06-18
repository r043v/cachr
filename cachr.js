/* * *
 * * cach'r
  *   alpha one
 *   (c) 2k14 / 2k18 noferi mickaël ; r043v/dph
 * * under creative commons by-nc-sa 3.0
 * * * */

const _ = require('lodash');
const watch = require('watch');
const fs = require('fs');
const path = require('path');

const jsregex = /.\.js$/;

function srequire(f){
	this.log("require",f,"js ?",jsregex.exec(f) !== null ? "js" : "text");
	try {
		if( jsregex.exec(f) !== null ){
		  //console.log(f, require(f) );
		  return require('../'+f);
		}
		return fs.readFileSync('./'+f,{ encoding:'utf8' });
	}
	catch(e){
		if(e.code === 'MODULE_NOT_FOUND' || e.code === 'ENOENT'){
			this.log('error on load',f);
			this.log( e );
			return null;
		}

		console.log("error in",__dirname,process.cwd(),f);
		console.log( e );

		//this.log('error on load',f);

		return { error:e };
	}
}

var commons = {
	options : {
		folder:"cachr",
		//debug:true,
		require:srequire,
		search:function(env,f){
			var e = {
				site : env.site === undefined ? 'default' : env.site,
				page : env.page === undefined ? 'default' : env.page
			};
			return [

			];
		}
	}
};

function getFirst(f){
	var a = _.isArray(f) ? f : arguments, t = this;
	let out = null;
	for( let n=0;n<a.length;n++){
		var d = t.get( a[n] );
		if(d !== undefined && d !== null ) return d;
	}	return null;
}

function get(f){

	var t = this;

/*	if( _.isArray(f) ){
		t.log("multiple cache get",f);
		var out = [];
		_.each(f,function(file){
			var d = t.get(file);
			if(d !== undefined && d !== false) out.push(d);
		});	return out;
	}*/

	f = t.folder+"/"+f;

	f = path.normalize(f);

	if( t.cache[f] !== undefined ){
		var c = t.cache[f];
		t.log( "take",f,"from cache,",typeof(c));
		if( c !== true && c !== false ) return t.cache[f];
	}

	const out = t.require(f);

	if( out === null ){
		t.cache[f] = null;
		return null;
	}

	t.cache[f] = out;

	t.log( "put",f,"in cache",typeof(t.cache[f]));//,t.cache[f]);
	//t.log( t.cache[f] );
	return t.cache[f];
}

var cache = function(options){
	var opts = _.extend( commons.options, _.isObject(options) ? options : {});
	var t = {
		folder : path.normalize( opts.folder ),
		cache : {},
		log : opts.debug ? console.log : function(){},
		require:opts.require,
		get : get,
		getFirst : getFirst,
		opts:opts
	};

	t.log("cach'r started, watching '"+t.folder+"'");

	watch.createMonitor( path.normalize("./"+t.folder), function(monitor){
		monitor.files[ path.normalize(t.folder+'/.stat') ] // Stat object for my zshrc.

		monitor.on("created", function(f, stat){
			t.log("* create",f); var c = t.cache[f];
			if( c === false || c === undefined ) t.cache[f] = true; // true, exist
			if( _.isFunction(opts.created) ) opts.create.call(t,f);
		});

		monitor.on("changed", function(f, curr, prev){
			var c = t.cache[f];
			t.log("* file",f,"change, in cache ?", c === undefined ? "no" : "yes, "+typeof(c));

			if( c !== undefined && c !== true && c !== false ){
				t.log("* reload",f);

				if( jsregex.exec(f) !== null ){
					t.log("reload js, delete require cache ..");
					var i = require.resolve( path.normalize('../'+f) );
					delete require.cache[i];
				}

				t.cache[f] = t.require(f);
				if( _.isFunction(opts.reloaded) ) opts.reloaded.call(t,f,t.cache[f]);
			} else t.cache[f] = true; // true, file exist

			if( _.isFunction(opts.changed) )
				opts.changed.call(t,f,t.cache[f]);
		});

		monitor.on("removed", function (f, stat) {
			var c = t.cache[f];

			if( c !== undefined && c !== true && c !== false )
				t.cache[f] = false; // false, file not exist

			//t.log("* delete",f);

			if( _.isFunction(opts.removed) )
				opts.removed.call(t,f);
		});
	});

	return t;
};

module.exports = cache;
