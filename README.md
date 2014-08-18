Bulkhead
========

Bulkhead is a library that helps programmers compartmentalize their SailsJS project into "units of work".  Bulkhead makes service-oriented programming much easier to embrace in SailsJS with a Service mixin that:

- Provides common CRUD activities for a SailsJS model.
- Provides the ability to update, delete, and search models with recursive datatype-driven criteria.
- Standardizing responses to allow SailsJS to easily leverage stateless job distribution via message queues.
- Converts a service into a promise chain via [Bluebird](https://github.com/petkaantonov/bluebird).
- Treat a NPM package like a SailsJS plug-in.

## Installation

```
npm install bulkhead
```

## Getting Started

Bulkhead is service-oriented, so we must create a service to properly use it.  In your ```api/services``` folder, create a new service called ```TestService.js``` and populate it with:

```javascript
// api/services/TestService.js

var Bulkhead = require('bulkhead');

module.exports = new function() {
    // In this example, we are assuming you have a model called Person, but you can
    // replace it with any model in your project.
	Bulkhead.service.call(this, 'Person');
};
```

## Philosophy

MVC frameworks are inherently incomplete in their ways of dealing with separations of concern.  Important business logic tends to get distributed randomly between controllers and models.  This makes unit testing, future scaling, and job distribution much more difficult to implement.  To help mitigate this, many MVC frameworks incorporate services as agnostic containers of logic, but these tend to play second fiddle to the more common practice of having the controller wear multiple hats.

To incentivize service-oriented programming for SailsJS projects, Bulkhead comes with a variety of extremely helpful tools to let people make the switch and quickly reap the rewards.

### Bulkhead Service
Now, to demonstrate the usefulness of a Bulkhead service, we create two callbacks:

```javascript
// A handler that will display the results of a service action
var done = function(err, result) {
    if(err) throw err;
	console.log(result.response());
};

// This validation will be called every time a change is persisted to the Account model
var validation = function(data, next) {
	// Pre-save validation
	var errors = [];

	if(data.firstName == '') {
		errors.push('First Name is required');
	}
	
	if(data.lastName == '') {
		errors.push('Last Name is required');
	}

	next(errors.length > 0 ? errors : null, data);
};
```

And below is a list of what methods your service has access to:

```javascript
// Finds a Person with an ID of 1
TestSevice.find(1, done);

// Finds a Person with a first name of 'bob'
TestSevice.find('bob', done);

// Finds a Person with a first name of 'bob' and a last name of 'smith'
TestSevice.find({ firstName: 'bob', lastName: 'smith' }, done);

// Allows for criteria batching by finding a Person with a first name of 'bob', a last name of 'smith', and an ID of 1.
TestSevice.find([ 1, 'bob', { lastName: 'smith' }], done);

// Creates a person with a first name of 'bob' and a last name of 'smith'
TestService.create({ firstName: 'bob', lastName: 'smith' }, validation, done);

// Changes the first name to 'john' of the Person with an ID of 1
TestService.update(1, { firstName: 'john' }, validation, done);

// Changes the first name to 'john' of all Persons with an ID of 1, the first name of 'bob', and the last name of 'smith' (Criteria batching)
TestService.update([ 1, 'bob', { lastName: 'smith' }], { firstName: 'john' }, validation, done);

// Removes a Person with an ID of 1
TestService.remove(1, done);

// Removes all Persons with an ID of 1, the first name of 'bob', and the last name of 'smith' (Criteria batching)
TestService.remove([ 1, 'bob', { lastName: 'smith' }], done);

// Creates CRUD methods as promises.
TestService.asPromise();

// Creates a person with a first name of 'bob' and a last name of 'smith'. (Criteria batching also possible)
TestService.createPromise({ firstName: 'bob', lastName: 'smith' }).then(done);

// Changes the first name to 'john' of the Person with an ID of 1 (Criteria batching also possible)
TestService.updatePromise(1, { firstName: 'john' }, validation).then(done);

// Removes a Person with an ID of 1 (Criteria batching also possible)
TestService.removePromise(1).then(done);

// Finds a Person with an ID of 1 (Criteria batching also possible)
TestService.findPromise(1).then(done);

// Generates a Bulkhead Response with a result of 1.  (See below)
TestService.result([1]);

// Returns the Person model
TestService.getModel();
```

## Advanced Bulkhead Usage
--------------------------
### Datatype Criteria Mapping

Let's assume that when we search by a string, we want to search by last name and not first names.  Now lets say when we search by number, we wish to search by age instead of ID.

To override this default functionality, we define our criteria map at mixin time:

```javascript
var Bulkhead = require('bulkhead');

module.exports = new function() {
    // In this example, we are assuming you have a model called Person, but you can
    // replace it with any model in your project.
    var self = this;
	Bulkhead.service.call(this, 'Account', {
	    'number': function(criteria, next) {
	    	self.getModel.findByAge(criteria, next);
	    },
		'string': function(criteria, next) {
			self.getModel().findByLastName(criteria, next);
		}
	});
};
```

Now when we search by a number, it will search by age and when we search with a string, it will search by last name.

### Service Responses

To ease in preserving statefulness between stateless services, (For example, passing jobs, their immediate scope AND their arguments into a message queue) the methods of a Bulkhead service should always return a Response.  The ```.result()``` helper assists with this process.  The argument list is as followed:

```javascript
TestService.result(
	'The array of results you want to package.',
	function(err, result) {
		// The callback to fire once the Result package is created.
		if(err) throw err;
		console.log(result.response());
	}, 
	'Criteria you used to get this result',
	'An array of custom messages or warnings associated with this result',
	'Errors get added to this parameters'
);
```

Generally, your methods will return a positive result, which would look like:

```javascript
TestService.result(
	'2',
	done, 
	'1+1=?'
);
```

Occasionally messages or additional metadata needs to be attached to the response:

```javascript
TestService.result(
	'2',
	done, 
	'1+1=?',
	['Metadata note: I love doing math :)']
);
```

And regarding errors, pass them into the fifth argument:

```javascript
// An example of a response package with an error
TestService.result(
	'3',
	done, 
	'1+1=?',
	null,
	'Invalid mathing'
);
```

### NPM Packages as SailsJS Plugins
___(This section is currently experimental)___

Treating NPM packages like SailsJS plugins make development more modular, scalable, and easier to deploy in SOA environments.

#### Getting started

In your ```config/bootstrap.js```, replace the default ```cb()``` with:

```
require('bulkhead').bootstrap.load(sails, cb)
```

This will load any properly configured Bulkhead package as a SailsJS plugin.

#### Configuration

To have an NPM package load as a SailsJS plugin, the following rules must be followed:

- Your ```config/bootstrap.js``` must be modified.  (See above)
- Your NPM package must contain an ```api``` folder like a SailJS project.  This folder should contain subfolders of ```models```, ```services```, ```policies```, ```adapters```, ```controllers```, ```hooks```, ```blueprints```, and ```responses```, each containing the various JavaScript files you want merged into the cooresponding property of the ```sails``` global object.  These JavaScript files should export objects the same way a SailsJS project handles these subfolders.
- To plugin an NPM package's configuration, your NPM package must contain a ```config``` folder like a SailsJS project containing the various JavaScript files you want merged into the cooresponding property of the ```sails``` global object.  These JavaScript files should export objects the same way a SailsJS project handles its own configuration.
- The NPM package must contain at least one service in its ```api/services``` folder that mixes in with a Bulkhead service via ```Bulkhead.service.call(this);```  (See above)
- This service must be ```require()```d in the SailsJS app for the rest of its NPM package to be plugged in.  For ease, the ```main``` property in the ```package.json``` of your NPM package should be the path of the service file.

#### Create a boilerplate package

Bulkhead comes with a simple script that will quickly create your Bulkhead package for you.

```
./createPackage
```

This will do the following:

- Create a new Github repository for your Bulkhead package.
- Create a ```master``` and ```develop``` branch in the repository.
- Create a ```LICENSE``` file.
- Create a ```README.md``` stub with installation instructions.
- Create a ```.gitignore``` file.
- Create a stub test.
- Create a stub service for you.
- Populate the ```package.json``` for NPM including mapping the package to your stub service.
- Install the ```bulkhead```, ```bulkhead-test```, and ```async``` packages for you.
- Provide you with instructions on how to move forward when you are ready to release.
- Configure testing for the package to be ran via ```npm test```