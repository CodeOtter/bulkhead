var _ = require('underscore'),
	async = require('async'),
	path = require('path'),
	buildDictionary = require('sails-build-dictionary'),
	callsite = require('callsite'),
	bulkheads = [];

/**
 * 
 * @param sails
 * @param package
 * @param section
 * @param options
 * @param done
 */
function loadPackage(sails, package, section, options, done) {
	options.dirname = path.resolve(sails.config.appPath, 'node_modules/' + package + '/api/' + section);
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
		var packages = [];
		for(var i in bulkheads) {
			packages.push(function(next) {
				loadPackage(sails, i, 'config', {
		            filter    : /local\.(js|json|coffee|litcoffee)$/,
		            identity  : false
		          }, next);
			});
			packages.push(function(next) {
				loadPackage(sails, i, 'controllers', {
			        filter: /(.+)Controller\.(js|coffee|litcoffee)$/,
			        flattenDirectories: true,
			        keepDirectoryPath: true,
			        replaceExpr: /Controller/
			      }, next);
			});
			packages.push(function(next) {
				loadPackage(sails, i, 'policies', {
			        filter: /(.+)\.(js|coffee|litcoffee)$/,
			        replaceExpr: null,
			        flattenDirectories: true,
			        keepDirectoryPath: true
			      }, next);
			});
			packages.push(function(next) {
				loadPackage(sails, i, 'services', {
			        filter      : /(.+)\.(js|coffee|litcoffee)$/,
			        depth     : 1,
			        caseSensitive : true
			      }, next);
			});
			packages.push(function(next) {
				loadPackage(sails, i, 'adapters', {
			        filter    : /(.+Adapter)\.(js|coffee|litcoffee)$/,
			        replaceExpr : /Adapter/,
			        flattenDirectories: true
			      }, next);
			});
			packages.push(function(next) {
				loadPackage(sails, i, 'models', {
			        filter    : /^([^.]+)\.(js|coffee|litcoffee)$/,
			        replaceExpr : /^.*\//,
			        flattenDirectories: true
			      }, next);
			});
			packages.push(function(next) {
				loadPackage(sails, i, 'hooks', {
			        filter: /^(.+)\.(js|coffee|litcoffee)$/,

			        // Hooks should be defined as either single files as a function
			        // OR (better yet) a subfolder with an index.js file
			        // (like a standard node module)
			        depth: 2
			      }, next);
			});
			packages.push(function(next) {
				loadPackage(sails, i, 'blueprints', {
			        filter: /(.+)\.(js|coffee|litcoffee)$/,
			        useGlobalIdForKeyName: true
			      }, next);
			});
			packages.push(function(next) {
				loadPackage(sails, i, 'responses', {
			        filter: /(.+)\.(js|coffee|litcoffee)$/,
			        useGlobalIdForKeyName: true
			      }, next);
			});
		}
		async.parallel(packages, done);
	},
	
	/**
	 * 
	 */
	add: function() {
		var path = callsite()[2].getFileName(),
			pos = path.indexOf('/api/services/');
		
		if(pos > -1) {
			var name = require(path.substr(0, pos) + '/package').name;
			if(bulkheads.indexOf(name) == -1) {
				bulkheads.push(name);
			}
			console.log(bulkheads);
		}
	}
};