// Plugin.js
var callsite = require('callsite'),
	path = require('path'),
	_ = require('underscore'),
	async = require('async'),
	buildDictionary = require('sails-build-dictionary');

//I'll never go CoffeeScript!!! YARRRRRR
var Bulkhead = global.__Bulkhead = global.__Bulkhead || {};

// Flag to check if bulkheads have loaded
var loaded = false;

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
	 * Resets the Bulkhead initialization
	 */
	teardown: function() {
		sails.log.silly('Tearing down registered Bulkhead packages...');
		loaded = false;
		global.__Bulkhead = {};
	},
	
	/**
	 * Initializes all registered Bulkhead packages, grafts them to the Sails object, then moves them to their individual packages.
	 * @param	Object		Sails instance
	 * @param	Function	Callback to fire when initialization is finished
	 */
	initialize: function(sails, done) {
		sails.log.silly('Initializing Bulkhead packages...');
		// Detach models from the Sails instance
		var bulkheads = Object.keys(Bulkhead),
			i = 0,
			detachedLoadModels = sails.modules.loadModels;

		/**
		 * Reload event that loads each Bulkhead package's models
		 */
		var reloadedEvent = function() {
			_.each(Bulkhead, function(bulkhead, bulkheadName) {
				// A registered Bulkhead package needs to be initiated, bound to the Sails instance, detached, and merged back into the Bulkhead
				_.each(bulkhead.models, function(model, index) {
					bulkhead.models[model.originalIdentity] = sails.models[model.identity];
					bulkhead[model.originalGlobalId] = bulkhead.models[model.originalIdentity];
					delete model.originalIdentity;
					delete model.originalGlobalId;
				});
	
				_.each(bulkhead.services, function(service, index) {
					service.plugin = bulkhead;
					bulkhead[service.originalIdentity] = bulkhead.services[index];
					delete service.originalIdentity;
				});
				
				sails.log.silly(Object.keys(bulkhead.models).length + ' loaded from the ' + path.basename(bulkheadName) + ' package...');
			});
			
			sails.removeListener('hook:orm:reloaded', reloadedEvent);
			sails.modules.loadModels = detachedLoadModels;
			loaded = true;
			sails.log.silly('Bulkhead packages are active.');
			done();
		};

		// Attach a custom reload event
		sails.on('hook:orm:reloaded', reloadedEvent);

		// Attaches and reloads the ORM
		if(!loaded && Bulkhead[bulkheads[i]]) {

			// We detach the model path to make sure that the loadModels module never refreshes and overrides
			sails.modules.loadModels = function(cb) {
				// Load all models into the global scope with namespacing
				sails.log.silly('Loading Bulkhead models...');
				async.series([
				    detachedLoadModels,
				    function(next) {
				    	var models = {};
				    	_.each(Bulkhead, function(bulkhead) {
							_.each(bulkhead.models, function(model) {
								models[model.identity] = model;
							});
						});
				    	next(null, models);
				    }
				], function(err, results) {
					cb(null, _.extend(results[0], results[1]));
				});
			};
			sails.hooks.orm.reload();
		} else {
			// No Bulkheads were detected
			if(loaded) {
				sails.log.silly('Bulkhead already loaded.');
			} else {
				sails.log.silly('No Bulkhead packages found!');	
			}

			done();
		}
	},

	/**
	 * Crawls through an NPM package to find Sails-like components and create an uninitiated Bulkhead package.
	 * @param	String	The relative path of the default service.
	 * @returns	Object	An uninitiated Bulkhead package
	 */
	register: function(defaultModule) {
		var packages = [],
			dir = path.dirname(callsite()[1].getFileName()) + '/',
			namespace = path.basename(dir),
			target = require(dir + defaultModule || 'api/services/Service');
		
		loaded = false;

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

			model.originalIdentity = model.identity;
			model.originalGlobalId = model.globalId;
			model.identity = namespace + '_' + model.identity;
			model.globalId = namespace + '_' + model.globalId;

			_.each(model.attributes, function(attribute) {
				if(attribute instanceof Object) {
					_.each(attribute, function(value, property) {
						if(property == 'collection' || property == 'model') {
							attribute[property] = namespace + '_' + attribute[property];
						}
					});
				}
			});
		});

		// Modify the services to be namespace-friendly
		_.each(target.services, function(service, index) {
			service.originalIdentity = service.globalId;
			service.identity = namespace + '_' + service.identity;
			service.globalId = namespace + '_' + service.globalId;
		});

		// Register the package as loaded
		Bulkhead[dir] = target;
		Bulkhead[dir].plugin = Bulkhead[dir]; 

		return Bulkhead[dir];
	}	
};