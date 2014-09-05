var Response = require('./Response'),
	Result = require('./Result'),
	Promise = require('bluebird'),
	_ = require('underscore'),
	async = require('async');
	
/**
 * The Service is a mixin used to add powerful functionality to SailsJS
 * services.  Bulkhead Services provide CRUD functionality, 
 * criteria-based searching, promisification, and the ability to
 * register NPM packages as SailsJS plugins.
 * @param		String			The proper name of the SailsJS model the service will be using for CRUD functionality.
 * @param		Object			Configuration of the type-based search handling.	
 */
module.exports = function(modelName, criteriaMapping) {

	var self = this;

	/**
	 * Converts the service into a promise chain via Bluebird
	 * (https://github.com/petkaantonov/bluebird)
	 * @returns	Object		The service itself for fluent chaining.
	 */
	this.asPromise = function() {
		Promise.promisifyAll(self, { suffix: 'Promise' });
		return self;
	};

	/**
	 * Returns the model that the service is using for its CRUD functionality.
	 * @returns	Object		The SailsJS model
	 */
	this.getModel = function() {
		if(!this.model) {
			var name = modelName.toLowerCase();
			if(self.bulkhead.models[name]) {
				this.model = self.bulkhead.models[name];
			}
		}

		return this.model;
	};

	/**
	 * Searches for a record using criteria mapping.
	 * @param	Mixed		A Number, String, Object, or Array of criteria to search by.  (A criteria map) 			
	 * @param	Function	The callback to fire when the search is finished.
	 */
	this.find = function(criteria, done) {
		this.criteriaMap(criteria, criteriaMapping, done);
	};

	/**
	 * Searches for a record using criteria mapping.  Provides a callback that
	 * is fired per result to manually control how the Response is created.
	 * @param	Object		A Number, String, Object, or Array of criteria to search by.  (A criteria map)
	 * @param	Function	The callback to fire per result control how the Response is created.
	 * @param	Function	The callback to fire when the search is finished.
	 */
	this.findAndDo = function(criteria, iterate, done) {
		var self = this;
		this.find(criteria, function(err, results) {
			// Get accounts
			if(err)
				return self.result(false, done, criteria, 'database failure', err);
			if(results.isEmpty())
				return self.result(false, done, criteria, 'no results found');

			async.concat(results.responses(), iterate, function(err, results) {
				// Package the result
				return done(err, self.result(results));
			});
		});
	};

	/**
	 * Persists a model to the database.
	 * @todo	Allow for the creation of an array of objects
	 * @param	Object		A model object
	 * @param	Function	The callback to fire to verify if the model has the correct data.
	 * @param	Function	The callback to fire when the creation is finished.
	 */
	this.create = function(data, validation, done) {
		var self = this;
		if(!validation) {
			validation = function(data, next) {
				next(null, data);
			};
		}
		validation(data, function(err, record) {
			if(err)
				return done(err, 'validation failed');

			self.getModel().create(record, function(err, result) {
				if(err)
					return done(err, 'database failure');
				done(null, result);
			});

		});
	};

	/**
	 * Updates model(s) to the database.
	 * @todo	Allow for the 'changes' parameter to be an array as well, doing an index map with criteria matches.  (Issue denial when criteria results count and the changes count mismatch)
	 * @param	Mixin		A model object (containing a valid ID) or a criteira map of records.
	 * @param	Object		Fields to be changed of matched records.
	 * @param	Function	The callback to fire to verify if the model has the correct data.
	 * @param	Function	The callback to fire when the updating is finished.
	 */
	this.update = function(criteria, changes, validation, done) {
		var self = this;
		if(!validation) {
			validation = function(changes, record, next) {
				next(null, changes);
			};
		}

		this.find(criteria, function(err, results) {
			if(err)
				return self.result(false, done, criteria, 'database failure', err);
			if(results.isEmpty())
				return self.result(false, done, criteria, 'no records found');
			
			var record = results.response();

			validation(changes, record, function(err, changes) {
				if(err)
					return done(err, 'validation failed');

				self.getModel().update({
					id: record.id
				}, changes, function(err, result) {

					if(err)
						return done(err, 'database failure');
					done(null, result);
				});	
			});			
		});
	};

	/**
	 * Removes model(s) from the database.
	 * @param	Mixin		A model object (containing a valid ID) or a criteira map of records.
	 * @param	Function	The callback to fire when the removal is finished.
	 */
	this.remove = function(criteria, done) {
		var self = this;
		this.find(criteria, function(err, results) {
			// Get accounts
			if(err)
				return self.result(false, done, criteria, 'database failure', err);
			if(results.isEmpty())
				return self.result(false, done, criteria, 'no records found');

			async.concat(results.responses(), function(record, next) {
				// Destroy each account
				record.destroy(function(err) {
					next(err, new Result(record, true));	
				});
			}, function(err, results) {
				// Package the result
				return done(err, self.result(results));
			});
		});
	};

	/**
	 * A helper function that allows custom service methods to easily create
	 * and return Response objects.
	 * @param	Mixed		An array of data (usually Bulkhead Results) for the Responses's .response() call.
	 * @param	Function	The callback to fire after the Response object is created.
	 * @param	Mixed		The query/data used to create the Response.  Useful for when lexical scoping is lost in message queues.
	 * @param	String		An array of messages for the Responses's .message() call.
	 * @param	Mixed		Any error to pass to the done() callback.
	 */
	this.result = function(response, done, request, message, error) {
		if(done) {
			// A callback has been specified
			if(request || message || error) {
				// Autogenerate a full collection result and execute the callback
				return done(error, new Response(new Result(request, response, message)));
			} else {
				// Autogenerate a general collection result and execute the callback
				return done(error, new Response(response));	
			}
		} else {
			// Return just the collection
			return new Response(response);
		}
	};

	/**
	 * Default datatype criteria mapping callbacks.
	 */
	criteriaMapping = _.extend({
		'default': function(criteria, next) {
			// For data types that aren't specified, search by nothing.
			next(null, null);
		},
		'number': function(criteria, next) {
			// For number, search by the ID of the model.
			self.getModel().findById(criteria, next);
		},
		'string': function(criteria, next) {
			var model = self.getModel();
			if(model.findOneByName) {
				// For strings, search by the Name of the model.
				self.getModel().findOneByName(criteria, next);
			} else {
				next('findOnByName does not exist for ' + modelName, null);
			}
		},
		'object': function(criteria, next) {
			if(criteria.id === undefined || Object.keys(criteria).length == 1) {
				// For objects that have no ID, search using a Waterline query
				self.getModel().find().where(criteria).exec(next);
			} else {
				// For objecst that have an ID, search by the ID of the model.
				self.getModel().findById(criteria.id, next);
			}
		}
	}, criteriaMapping || {});

	/**
	 * Reduces complex criteria into a Bulkhead Response.
	 * @param	Mixed		A criteria map
	 * @param	Object		A configuration of datatype criteria mapping callbacks
	 * @param	Function	Callback to fire when the mapping is finished
	 */
	this.criteriaMap = function(criteria, map, done) {
		if(criteria instanceof Array) {
			// Perform a recursive search against the service's find method.
			async.concat(criteria, function(element, callback) {
				self.find(element, function(err, results) {
					if(results instanceof Response) {
						results = results.results;
					}
					callback(err, results);
				});
			}, function(err, results) {
				done(err, self.result(results));
			});
			return;
		}

		var type = typeof criteria;
		if(criteria === null || map[type] === undefined) {
			type = 'default';
		}

		map[type](criteria, function(err, results) {
			if(results instanceof Response) {
				done(err, results);
			} else {
				done(err, self.result(results));
			}
		});
	};
};