// Plugin.js

var callsite = require('callsite');

if(global._Bulkhead === undefined) {
	global._Bulkhead = {};
}

global._Bulkhead.plugins = {};

/**
 * 
 * @param name
 * @param version
 */
function register(name, version) {
	if(global._Bulkhead.plugins[name] === undefined) {
		global._Bulkhead.plugins[name] = {};
	}

	if(global._Bulkhead.plugins[name][version] === undefined) {
		global._Bulkhead.plugins[name][version] = {};
	}
}

/**
 * 
 * @param location
 * @returns
 */
function getPackageDetails(location) {
	var pos = location.indexOf('/api/services/');

	if(pos > -1) {
		path = location.substr(0, pos);
		return require(path + '/package.json');
	} else {
		throw new Error('The path "' + location + '" is an invalid path format.');
	}
}

/**
 * 
 */
module.exports = function(location) {	
	if(location === undefined) {
		// Register a plugin automatically
		var details = getPackageDetails(callsite()[2].getFileName()),
			packageName = details.name,
			version = details.version;
			register(packageName, version);
	} else {
		var pos = location.indexOf('@');
		if(pos === -1) {
			// Register a plugin manually
			var details = getPackageDetails(location),
				packageName = details.name,
				version = details.version;
			register(packageName, version);
		} else {
			// Get a plugin
			var parts = location.split('@');
			
			if(parts[0] === undefined) {
				throw new Error(parts[0] + ' plugin has not been registered.');
			}
			
			if(parts[1] === undefined) {
				throw new Error(parts[1] + ' plugin requires a version identifier.');
			}
			
			var packageName = parts[0],
				version = parts[1];
		}
	}
	return global._Bulkhead.plugins[packageName][version];
};