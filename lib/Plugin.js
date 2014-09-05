// Plugin.js
var callsite = require('callsite'),
	path = require('path'),
	_ = require('underscore'),
	async = require('async'),
	buildDictionary = require('sails-build-dictionary');

//I'll never go CoffeeScript!!! YARRRRRR
var Bulkhead = global.__Bulkhead = global.__Bulkhead || {};

/**
* This function will merge Sails-like components into an NPM package, forming a Bulkhead package.
* @private
* @param	Object		The NPM module instance
* @param	String		The location of the package
* @param	String		The category name of Sails-like components
* @param	Object		Sails-build-directory configuration override
* @param 	Function	The callback to fire when the package is loaded
*/
function loadPackage(target, location, section, options, done) {
	if(section == 'config') {
		options.dirname = path.resolve(location + '/' + section);
	} else {
		options.dirname = path.resolve(location + '/api/' + section);
	}

	buildDictionary.optional(options, function(err, modules) {
		if(err) return done(err);
		if(section == 'config') {
			for(var i in modules) {
				target.config = _.extend(target.config || {}, modules[i]);	
			}
		} else {
			target[section] = _.extend(target[section] || {}, modules);
		}

		return done();
	});
}

/**
* Bootstrap merges Sails-like components into an NPM package, forming a
* Bulkhead package.  To reduce namespace (and potentially, versioning)
* collisions in the global scope and in the database, the NPM name acts
* as the namespace. This is only possible if:
* 1.) The Bulkhead package is require()d by a SailsJS application
* 2.) The Bulkhead package follows SailsJS folder hierarchy ("api/*")
* 3.) The index.js of the Bulkhead package looks like:
* module.exports = require('bulkhead').plugin();
*/
module.exports = {

	/**
	 * Initializes all registered Bulkhead packages, grafts them to the Sails object, then moves them to their individual packages.
	 * @param	Object		Sails instance
	 * @param	Function	Callback to fire when initialization is finished
	 */
	initialize: function(sails, done) {
		// Detach models from the Sails instance
		var bulkheads = Object.keys(Bulkhead),
			i = 0,
			detachedGlobals = {},
			detachedModels = sails.models;
			sails.models = {};
			
		// Detach registered globalized models from the Sails instance.
		_.each(detachedModels, function(model) {
			// Clear out all globals and models
			var index = model.identity;
			detachedGlobals[index] = sails[index];
			delete sails[index];
			delete global[index];
		});

		// Detach registered globalized services from the Sails instance.
		_.each(sails.services, function(service) {
			// Clear out all globals and models
			var index = service.identity;
			detachedGlobals[index] = sails[index];
			delete sails[index];
			delete global[index];
		});

		sails.on('hook:orm:reloaded', function() {
			var bulkhead = Bulkhead[bulkheads[i]];
			if(bulkhead) {
				// A registered Bulkhead package needs to be initiated, bound to the Sails instance, detached, and merged back into the Bulkhead
				_.each(bulkhead.models, function(model, index) {
					var identity = model.globalId || model.identity;
					bulkhead.models[index] = sails.models[index];
					bulkhead[identity] = bulkhead.models[index];
					delete sails.models[index];
					delete sails[identity];
					delete global[identity];
				});

				_.each(bulkhead.services, function(service, index) {
					var identity = service.globalId || service.identity;
					bulkhead.services[index].bulkhead = bulkhead;
					bulkhead[identity] = bulkhead.services[index];
					delete sails[identity];
					delete global[identity];
				});

				// Iterate to the next Bulkhead package
				i++;
				sails.hooks.orm.reload();
			} else {
				// All Bulkhead packages have been initiated, reattach the detached models and globals, then finish up
				sails.models = detachedModels;

				_.each(detachedGlobals, function(element, index) {
					global[index] = sails[index] = element;
				});

				done();
			}
		});

		// Reload the ORM
		sails.hooks.orm.reload();
	},
	
	/**
	 * Crawls through an NPM package to find Sails-like components and create an uninitiated Bulkhead package.
	 * @param	String	The relative path of the default service.
	 * @returns	Object	An uninitiated Bulkhead package
	 */
	register: function(defaultModule) {
		var packages = [],
			dir = path.dirname(callsite()[1].getFileName()) + '/',
			target = require(dir + defaultModule || 'api/services/Service');

		// Analyze the package for Sails-like components
		packages.push(function(next) {
			loadPackage(target, dir, 'config', {
	            filter    : /(.+)\.(js|json|coffee|litcoffee)$/,
	            identity  : false
	          }, next);
		});
		packages.push(function(next) {
			loadPackage(target, dir, 'controllers', {
		        filter: /(.+)Controller\.(js|coffee|litcoffee)$/,
		        flattenDirectories: true,
		        keepDirectoryPath: true,
		        replaceExpr: /Controller/
		      }, next);
		});
		packages.push(function(next) {
			loadPackage(target, dir, 'policies', {
		        filter: /(.+)\.(js|coffee|litcoffee)$/,
		        replaceExpr: null,
		        flattenDirectories: true,
		        keepDirectoryPath: true
		      }, next);
		});
		packages.push(function(next) {
			loadPackage(target, dir, 'services', {
		        filter      : /(.+)\.(js|coffee|litcoffee)$/,
		        depth     : 1,
		        caseSensitive : true
		      }, next);
		});
		packages.push(function(next) {
			loadPackage(target, dir, 'adapters', {
		        filter    : /(.+Adapter)\.(js|coffee|litcoffee)$/,
		        replaceExpr : /Adapter/,
		        flattenDirectories: true
		      }, next);
		});
		packages.push(function(next) {
			loadPackage(target, dir, 'models', {
		        filter    : /^([^.]+)\.(js|coffee|litcoffee)$/,
		        replaceExpr : /^.*\//,
		        flattenDirectories: true
		      }, next);
		});
		packages.push(function(next) {
			loadPackage(target, dir, 'hooks', {
		        filter: /^(.+)\.(js|coffee|litcoffee)$/,
	
		        // Hooks should be defined as either single files as a function
		        // OR (better yet) a subfolder with an index.js file
		        // (like a standard node module)
		        depth: 2
		      }, next);
		});
		packages.push(function(next) {
			loadPackage(target, dir, 'blueprints', {
		        filter: /(.+)\.(js|coffee|litcoffee)$/,
		        useGlobalIdForKeyName: true
		      }, next);
		});
		packages.push(function(next) {
			loadPackage(target, dir, 'responses', {
		        filter: /(.+)\.(js|coffee|litcoffee)$/,
		        useGlobalIdForKeyName: true
		      }, next);
		});
	
		// Attach Sails-like components to the NPM package via buildDirectory
		async.series(packages);

		// Modify the table name of the model to be namespace-friendly
		_.each(target.models, function(model, index) {
			// @TODO: Reduce versioning collision by analyzing the package.json as well?
			target.models[index].tableName = path.basename(dir) + '_' + model.identity;
		});
	
		// Register the package as loaded
		Bulkhead[dir] = target;

		return Bulkhead[dir];
	}	
};