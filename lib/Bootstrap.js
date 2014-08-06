var _ = require('underscore'),
	async = require('async'),
	path = require('path'),
	buildDictionary = require('sails-build-dictionary'),
	callsite = require('callsite');

if(global.bulkheads === undefined) {
	global.bulkheads = [];
}

/**
 * 
 * @param sails
 * @param package
 * @param section
 * @param options
 * @param done
 */
function loadPackage(sails, location, section, options, done) {
	options.dirname = path.resolve(location + '/api/' + section);
	buildDictionary.optional(options, function(err, modules) {
		if(err) return done(err);
		sails[section] = _.extend(sails[section] || {}, modules);
		return done();
	});
}

module.exports = {
	
	/**
	 * 
	 * @param sails
	 * @param done
	 */
	load: function(sails, done) {
		var packages = [], services = [], models = [];
		for(var i in global.bulkheads) {
			var pkg = global.bulkheads[i];
			if(pkg != sails.config.appPath) {
				packages.push(function(next) {
					loadPackage(sails, pkg, 'config', {
			            filter    : /local\.(js|json|coffee|litcoffee)$/,
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
			console.log(sails.models.accounttoken);
			done();
		});
	},
	
	/**
	 * 
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