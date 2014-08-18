// Plugin.js

var callsite = require('callsite');

if(global.Bulkhead === undefined) {
	global.Bulkhead = {};
}

global.Bulkhead.plugins = {};

/**
 * 
 * @param name
 * @param version
 */
function register(name, version) {
	if(Bulkhead.plugins[name] === undefined) {
		Bulkhead.plugins[name] = {};
	}

	if(Bulkhead.plugins[version] === undefined) {
		Bulkhead.plugins[name][version] = {};
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
		return require('./' + path + '/package');
	} else {
		throw location + ' does not contain package.json';
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
				throw parts[0] + ' plugin has not been registered.';
			}
			
			if(parts[1] === undefined) {
				throw parts[1] + ' plugin requires a version identifier.';
			}
			
			var packageName = parts[0],
				version = parts[1];
		}
	}

	return Bulkhead.plugins[packageName][version];
};