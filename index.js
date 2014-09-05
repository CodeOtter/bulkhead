module.exports = {
		
	// Used to extend/mixin a service.  Required to automatically attach an NPM package into the sails global.
	service: require('./lib/Service.js'),
	
	// The standard Response object for all Bulkhead services.
	response: require('./lib/Response.js'),
	
	// Individual elements of a Response.  Used most commonly in a findAndDo. 
	result: require('./lib/Result.js'),
	
	// The Plugin object controls the registration and loading of NPM packages.
	plugins: require('./lib/Plugin.js')
};