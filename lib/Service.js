var async = require('async'),
	ServiceResultCollection = require('./ServiceResultCollection'),
	ServiceResult = require('./ServiceResult'),
	Bootstrap = require('./Bootstrap'),
	_ = require('underscore'),
	Promise = require('bluebird');

module.exports = function(modelName, criteriaMapping) {
	
	var self = this;

	// Registers the package to have its conts boostrapped into hte sails JS globals
	Bootstrap.add();
	
	/**
	 * 
	 */
	this.asPromise = function() {
		Promise.promisifyAll(self, { suffix: 'Promise' });
		return self;
	};
	
	/**
	 * 
	 */
	this.getModel = function() {
		if(!this.model) {
			this.model = sails.models[modelName.toLowerCase()];
		}
		return this.model;
	};
	
	/**
	 * 
	 * @param	Object		
	 * @param	Function	
	 */
	this.find = function(criteria, done) {
		this.criteriaMap(criteria, criteriaMapping, done);
	};

	/**
	 * 
	 * @param	Object		
	 * @param	Function	
	 * @param	Function		
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
	 * 
	 * @param	Mixed
	 * @param	Function
	 * @param	Function
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
	 * 
	 * @param	Mixed
	 * @param	Function
	 * @param	Function
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
	 * 
	 * @param	Object
	 * @param	Function
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
					next(err, new ServiceResult(record, true));	
				});
			}, function(err, results) {
				// Package the result
				return done(err, self.result(results));
			});
		});
	};

	/**
	 * 
	 * @param	Mixed
	 * @param	Function
	 * @param	Mixed
	 * @param	String
	 * @param
	 */
	this.result = function(response, done, request, message, error) {
		if(done) {
			// A callback has been specified
			if(request || message || error) {
				// Autogenerate a full collection result and execute the callback
				return done(error, new ServiceResultCollection(new ServiceResult(request, response, message)));
			} else {
				// Autogenerate a general collection result and execute the callback
				return done(error, new ServiceResultCollection(response));	
			}
		} else {
			// Return just the collection
			return new ServiceResultCollection(response);
		}
	};
	
	/**
	 * Default criteria mapping
	 */
	criteriaMapping = _.extend({
		'default': function(criteria, next) {
			// Get the account from the logged in session
			next(null, null);
		},
		'number': function(criteria, next) {
			self.getModel().findById(criteria, next);
		},
		'string': function(criteria, next) {
			self.getModel().findOneByName(criteria, next);
		},
		'object': function(criteria, next) {
			if(criteria.id === undefined || Object.keys(criteria).length == 1) {
				// Use a standard object as a Waterline query
				self.getModel().find().where(criteria).exec(next);
			} else {
				// Use the Model instance directly
				self.getModel().findById(criteria.id, next);
			}
		}
	}, criteriaMapping || {});

	/**
	 * Reduces complex criteria into a collection of models.
	 * @param	Mixed		Criteria to parse (Number, string, object, array)
	 * @param	Object		Type map
	 * @param	Function	Callback to fire when the mapping is finished
	 */
	this.criteriaMap = function(criteria, map, done) {
		if(criteria instanceof Array) {
			// Perform a recursive search against the service's find method.
			async.concat(criteria, function(element, callback) {
				self.find(element, function(err, results) {
					if(results instanceof ServiceResultCollection) {
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
			if(results instanceof ServiceResultCollection) {
				done(err, results);
			} else {
				done(err, self.result(results));
			}
		});
	};
};
