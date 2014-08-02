Bulkhead
========

Bulkhead is a library that helps programmers compartmentalize their SailsJS project into "units of work".

MVC frameworks are inherently incomplete in their approach separation of concern.  Important business logic tends to get distributed randomly between controllers and models.  This makes unit testing, future scaling, and job distribution much more difficult to implement.  To help mitigate this, many MVC frameworks incorporate services as agnostic containers of logic, but these tend to play second fiddle to the more common practice of having the controller wear multiple hats.

Bulkhead makes service-oriented programming much easier to embrace in SailsJS with a Service mixin that:

- Contains common CRUD activities.
- Performs searches with recursive datatype-driven criteria.
- Standardizing responses in a distributed message queue-friendly format.
- A Testing Harness for Mocha that makes it easier to write tests.

Getting started
---------------

```
npm install bulkhead
```

An example of a service that handles basic CRUD functionality for Account models:

```javascript
// AccountService.js

var bulkhead = require('bulkhead');

module.exports = new function() {

	var self = this;
	bulkhead.service.call(this, 'Account');
};
```

Search Functionality
--------------------

The power of Bulkhead is in the ```.find()``` method.  For example, this will find an account with an ID of 1.  Assuming we've done this:

```javascript
var accountService = require('./accountService');

// A handler that will display the results of a service action
var done = function(err, result) {
	console.log(result.response());
};
```

We can search for accounts by their ID.

```javascript
accountService.find(1, done);
```

This will find an account by its name.

```javascript
accountService.find('bob', done);
```

This will perform a query on the Account model:

```javascript
accountService.find({ email: 'test@test', password: 'secret' }, done);
```

And... you can do all of these searches at the same time via criteria batching. :D

```javascript
accountService.find([ 1, 'bob', { email: 'test@test', password: 'secret' }], done);
```

This is incredibly useful in a stateless environment as it reduces the complexity of having to guess what contexts and data you'll have in unpredictable use cases.

This criteria batching also works in the ```.update()``` and ```.remove()```, allowing you to mass edit and delete multiple records easily.

Advanced Search Functionality
-----------------------------

Let's assume that when we search by a string, we want to search email addresses and not names.  Now lets say when we search by number, we wish to search by age instead of ID.

To override this default functionality, we define our criteria map at mixin time:

```javascript
	Service.call(this, 'Account', {
	    'number': function(criteria, next) {
	    	self.getModel.findByAge(criteria, next);
	    },
		'string': function(criteria, next) {
			self.getModel().findOneByEmail(criteria, next);
		}
	});
```

Now when we search by a number, it will search by age and when we search with a string, it will search by email.

CRUD Functionality
------------------

For the ease of demonstration, lets create some common handlers ahead of time:

```javascript
// This will generate a standard reponse
var package = function(err, result) {
	// Post-save result packaging
	if(err)
		return self.result(false, done, null, null, err);

	return self.result(result, done);
};

// This validation will be called every time a change is persisted to the Account model
var validation = function(data, next) {
	// Pre-save validation
	var errors = [];

	if(data.email == '') {
		errors.push('Email is required');
	}
	
	if(data.password == '') {
		errors.push('Password is required');
	}

	next(errors.length > 0 ? errors : null, data);
};
```

This will allow us to validate a new account, save it to your database, and prepare a result package:

```javascript
accountService.create({
	email: 'test@test.com',
	password: 'secret'
}, validation, package);
```

This performs an update

```javascript
accountService.update(1, { 
	email: 'stillATest@test.com'
}, validation, package);
```

This will perform a mass update:

```javascript
accountService.update([1, 2, 3, 4, 'test@test.com', 'contact@codeotter.com'] { 
	email: 'stillATest@test.com'
}, validation, package);
```

This will delete an account

```javascript
accountService.remove(1, package);
```

This will delete multiple accounts

```javascript
accountService.remove([1, 2, 3, 4, 'test@test.com', 'contact@codeotter.com'], package);
```

This will return the SailsJS ORM Model the service is controlling

```javascript
accountService.getModel();
```

Response Package
---------------

To ease in preserving statefulness between stateless services, (For example, passing jobs AND their arguments into a queue) 
Bulkhead services should return a Result package.  The ```.result()``` helper assists with this process.  The argument list is as followed:

```javascript
accountService.result(
	'The result you want to package',
	function(err, result) {
		// The callback to fire once the Result package is created.
		if(err) throw err;
		console.log(result.response());
	}, 
	'Criteria you used to get the result',
	'Custom message or warning associated with this result',
	'Errors get added here'
);
```

Generally, your methods will return a positive result, which would look like:

```javascript
accountService.result(
	'2',
	done, 
	'1+1=?'
);
```

Occasionally messages or additional metadata needs to be attached to the response:

```javascript
accountService.result(
	'2',
	done, 
	'1+1=?',
	'Metadata note: I love doing math :)'
);
```

And regarding errors, pass them into the fifth argument:

```javascript
// An example of a response package with an error
accountService.result(
	'3',
	done, 
	'1+1=?',
	null,
	'Invalid mathing'
);
```

Promisification
---------------

Utilizing Bluebird, all services can be turned into promise generators by doing:

```javascript
accountService.asPromise()
```

This only needs to be executed one and the service will create new methods that return promises based on the same name of existing methods 
(But with a suffix of 'Promise').  So, for example, after running ```accountService.asPromise()```, you'll have access to:

- ```findPromise()```
- ```createPromise()```
- ```updatePromise()```
- ```removePromise()```