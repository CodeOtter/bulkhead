var _ = require('underscore'),
	async = require('async'),
	path = require('path'),
	buildDictionary = require('sails-build-dictionary'),
	callsite = require('callsite');

if(global.bulkheads === undefined) {
	// Define a global collection of known Bulkhead packages.
	global.bulkheads = [];
}

/**
 * This function will merge a Bulkhead package into a SailJS app like a plugin.
 * @todo What happens when a package calls up v0.1 of a Bulkhead package and another package called v0.2 of that same Bulkhead package? :o 
 * @private
 * @param	Object		The sails instance
 * @param	String		The location of the package
 * @param	String		The name of the sails global property to merge
 * @param	Object		Sails-build-directory configuration override
 * @param 	Function	The callback to fire when the package is loaded
 */
function loadPackage(sails, location, section, options, done) {
	if(section == 'config') {
		options.dirname = path.resolve(location + '/' + section);
	} else {
		options.dirname = path.resolve(location + '/api/' + section);
	}

	buildDictionary.optional(options, function(err, modules) {
		if(err) return done(err);
		if(section == 'config') {
			for(var i in modules) {
				sails.config = _.extend(sails.config || {}, modules[i]);	
			}
		} else {
			sails[section] = _.extend(sails[section] || {}, modules);	
		}
		
		return done();
	});
}

/**
 * The Bootstrap merges an NPM package into a SailsJS project like it was a
 * plugin.  This is only possible if:
 * 1.) An NPM Package service is require()d by a SailsJS application
 * 2.) That service is mixed in with a Bulkhead Service
 * 3.) The NPM Package follows SailsJS folder hierarchy ("api/*")
 * 4.) The Bootstrap.load() method is called in the config/bootstrap.js of a
 * 	   SailJS project.
 */
module.exports = {
	
	/**
	 * Crawls through the registered Bulkhead packages and plugins them into the SailsJS app.
	 * @param	Object		A sails instance
	 * @param	Function	The callback to fire when the load is done.
	 */
	load: function(sails, done) {
		var packages = [], services = [], models = [];
		for(var i in global.bulkheads) {
			var pkg = global.bulkheads[i];
			if(pkg != sails.config.appPath) {
				packages.push(function(next) {
					loadPackage(sails, pkg, 'config', {
			            filter    : /(.+)\.(js|json|coffee|litcoffee)$/,
			            identity  : false
			          }, next);
				});
				packages.push(function(next) {
					loadPackage(sails, pkg, 'controllers', {
				        filter: /(.+)Controller\.(js|coffee|litcoffee)$/,
				        flattenDirectories: true,
				        keepDirectoryPath: true,
				        replaceExpr: /Controller/
				      }, next);
				});
				packages.push(function(next) {
					loadPackage(sails, pkg, 'policies', {
				        filter: /(.+)\.(js|coffee|litcoffee)$/,
				        replaceExpr: null,
				        flattenDirectories: true,
				        keepDirectoryPath: true
				      }, next);
				});
				packages.push(function(next) {
					loadPackage(sails, pkg, 'services', {
				        filter      : /(.+)\.(js|coffee|litcoffee)$/,
				        depth     : 1,
				        caseSensitive : true
				      }, next);
				});
				packages.push(function(next) {
					loadPackage(sails, pkg, 'adapters', {
				        filter    : /(.+Adapter)\.(js|coffee|litcoffee)$/,
				        replaceExpr : /Adapter/,
				        flattenDirectories: true
				      }, next);
				});
				packages.push(function(next) {
					loadPackage(sails, pkg, 'models', {
				        filter    : /^([^.]+)\.(js|coffee|litcoffee)$/,
				        replaceExpr : /^.*\//,
				        flattenDirectories: true
				      }, next);
				});
				packages.push(function(next) {
					loadPackage(sails, pkg, 'hooks', {
				        filter: /^(.+)\.(js|coffee|litcoffee)$/,
	
				        // Hooks should be defined as either single files as a function
				        // OR (better yet) a subfolder with an index.js file
				        // (like a standard node module)
				        depth: 2
				      }, next);
				});
				packages.push(function(next) {
					loadPackage(sails, pkg, 'blueprints', {
				        filter: /(.+)\.(js|coffee|litcoffee)$/,
				        useGlobalIdForKeyName: true
				      }, next);
				});
				packages.push(function(next) {
					loadPackage(sails, pkg, 'responses', {
				        filter: /(.+)\.(js|coffee|litcoffee)$/,
				        useGlobalIdForKeyName: true
				      }, next);
				});
			}
		}

		async.parallel(packages, function() {
			// We register globals
			if (sails.config.globals.services) {
				_.each(sails.services,function (service,identity) {
					global[service.globalId || service.identity] = service;
				});
			}
			
			if (sails.config.globals && sails.config.globals.models) {
				_.each(sails.models,function (model,identity) {
					global[model.globalId || model.identity] = model;
				});
			}
			done();
		});
	},
	
	/**
	 * Registers a Bulkhead package with the Bulkhead bootstrap. 
	 * Automatically fired when a Bulkhead service is require()d.
	 */
	add: function() {
		var path = callsite()[2].getFileName(),
			pos = path.indexOf('/api/services/');

		if(pos > -1) {
			var name = path.substr(0, pos);
			if(bulkheads.indexOf(name) == -1) {
				bulkheads.push(name);
			}
		}
	}
};