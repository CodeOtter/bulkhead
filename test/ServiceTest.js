var Service = require('../lib/Service'),
	ServiceResult = require('../lib/ServiceResult'),
	ServiceResultCollection = require('../lib/ServiceResultCollection'),
	assert = require('assert');

describe('ServiceResult', function() {
	describe('Base Class', function() {
		it('should properly assign its values during initialization', function(done) {
			var result = new ServiceResult('request', 'response');
			assert.deepEqual(result.request, 'request');
			assert.deepEqual(result.response, 'response');
			done();
		});
	});
});

describe('ServiceResultCollection', function() {
	describe('Base Class', function() {
		it('should properly operate when populated with ServiceResults', function(done) {
			var record = { id: 3 };
			var collection = new ServiceResultCollection([
			    new ServiceResult(1, 2),
			    new ServiceResult(record, 4),
			    new ServiceResult(5, 6)
	        ]);
			assert.deepEqual(collection.response(0), 2);
			assert.deepEqual(collection.response(1), 4);
			assert.deepEqual(collection.response(2), 6);
			assert.deepEqual(collection.response(3), undefined);
			assert.deepEqual(collection.response(record), 4);
			assert.deepEqual(collection.requests(), [1, record, 5]);
			done();
		});

		it('should properly operate when populated with primitives', function(done) {
			var collection = new ServiceResultCollection([
  			    2,
  			    4,
  			    6
  	        ]);
  			assert.deepEqual(collection.response(0), 2);
  			assert.deepEqual(collection.response(1), 4);
  			assert.deepEqual(collection.response(2), 6);
  			assert.deepEqual(collection.response(3), undefined);
  			assert.deepEqual(collection.requests(), []);
  			done();

		});

		it('should properly operate when populated with mixed data', function(done) {
			var collection = new ServiceResultCollection([
  			    new ServiceResult(1, 2),
  			    4,
  			    new ServiceResult(5, 6)
  	        ]);
  			assert.deepEqual(collection.response(0), 2);
  			assert.deepEqual(collection.response(1), 4);
  			assert.deepEqual(collection.response(2), 6);
  			assert.deepEqual(collection.response(3), undefined);
  			assert.deepEqual(collection.requests(), [1,5]);
  			done();

		});
		
		it('should properly append to the collection via add()', function(done) {
			var collection = new ServiceResultCollection([1,2,3]);
			collection.add(4);
			collection.add([5,6]);
			collection.add(new ServiceResultCollection([7,8,9]));
			assert.deepEqual(collection.responses(), [1,2,3,4,5,6,7,8,9]);
			done();
		});
	});
});

describe('Service', function() {
	describe('Base Class', function() {

		it('should instantiate without problems', function(done) {
			new Service();
			done();
		});

		it('should fail a call to find()', function(done) {
			try {
				new Service().find();
				assert.fail();
			} catch(e) {
				assert.ok(e);
			}
			done();
		});

		it('should return a ServiceResultCollection when result() is invoked', function(done) {
			assert.ok(new Service().result() instanceof ServiceResultCollection);
			done();
		});

		it('should execute a CriteriaMap in the default use-case (using ServiceResult)', function(done) {
			var map = {
				'default': function(criteria, next) {
					assert.deepEqual(criteria, null);
					next(null, new ServiceResult(criteria, 7));
				}
			};

			new Service().criteriaMap(null, map, function(err, results) {
				assert.ok(results instanceof ServiceResultCollection);
				assert.equal(err, null);
				assert.deepEqual(results.response(), 7);
				assert.deepEqual(results.requests(), [null]);
				done();
			});
		});
		
		it('should execute a CriteriaMap in the number use-case (using ServiceResult)', function(done) {
			var index = 1;
			var map = {
				'number': function(criteria, next) {
					assert.deepEqual(criteria, index);
					next(null, new ServiceResult(criteria, criteria));
				}
			};

			new Service().criteriaMap(index, map, function(err, results) {
				assert.ok(results instanceof ServiceResultCollection);
				assert.deepEqual(results.response(), index);
				assert.deepEqual(results.requests(), [index]);
				done();
			});
		});
		
		it('should execute a CriteriaMap in the string use-case (using ServiceResult)', function(done) {
			var index = 'test';
			var map = {
				'string': function(criteria, next) {
					assert.deepEqual(criteria, index);
					next(null, new ServiceResult(criteria, criteria));
				}
			};

			new Service().criteriaMap(index, map, function(err, results) {
				assert.ok(results instanceof ServiceResultCollection);
				assert.deepEqual(results.response(), index);
				assert.deepEqual(results.requests(), [index]);
				done();
			});
		});
		
		it('should execute a CriteriaMap in the object use-case (using ServiceResult)', function(done) {
			var index = { name: 'tester' };
			var map = {
				'object': function(criteria, next) {
					assert.equal(criteria, index);
					next(null, new ServiceResult(criteria, criteria));
				}
			};

			new Service().criteriaMap(index, map, function(err, results) {
				assert.ok(results instanceof ServiceResultCollection);
				assert.deepEqual(results.response(), index);
				assert.deepEqual(results.requests(), [index]);
				done();
			});
		});
		
		it('should execute a CriteriaMap in the array use-case (using ServiceResult)', function(done) {
			var index = [ null, 1, 'tester', { name: 'tester'} ];
			var map = {
				'default': function(criteria, next) {
					assert.deepEqual(criteria, index[0]);
					next(null, new ServiceResult(criteria, criteria));
				},
				'number': function(criteria, next) {
					assert.deepEqual(criteria, index[1]);
					next(null, new ServiceResult(criteria, criteria));
				},
				'string': function(criteria, next) {
					assert.deepEqual(criteria, index[2]);
					next(null, new ServiceResult(criteria, criteria));
				},
				'object': function(criteria, next) {
					assert.deepEqual(criteria, index[3]);
					next(null, new ServiceResult(criteria, criteria));
				}
			};

			var service = new Service();
			service.find = function(criteria, done) {
				this.criteriaMap(criteria, map, done);
			};

			service.find(index, function(err, results) {
				assert.ok(results instanceof ServiceResultCollection);
				assert.deepEqual(results.response(0), index[0]);
				assert.deepEqual(results.response(1), index[1]);
				assert.deepEqual(results.response(2), index[2]);
				assert.deepEqual(results.response(3), index[3]);
				assert.deepEqual(results.requests(), index);
				done();
			});
		});
		
		it('should execute a CriteriaMap in the array use-case (using primitives)', function(done) {
			var index = [ null, 1, 'tester', { name: 'tester'} ];
			var map = {
				'default': function(criteria, next) {
					assert.deepEqual(criteria, index[0]);
					next(null, 10);
				},
				'number': function(criteria, next) {
					assert.deepEqual(criteria, index[1]);
					next(null, 11);
				},
				'string': function(criteria, next) {
					assert.deepEqual(criteria, index[2]);
					next(null, 12);
				},
				'object': function(criteria, next) {
					assert.deepEqual(criteria, index[3]);
					next(null, 13);
				}
			};

			var service = new Service();
			service.find = function(criteria, done) {
				this.criteriaMap(criteria, map, done);
			};

			service.find(index, function(err, results) {
				assert.ok(results instanceof ServiceResultCollection);
				assert.deepEqual(results.response(0), 10);
				assert.deepEqual(results.response(1), 11);
				assert.deepEqual(results.response(2), 12);
				assert.deepEqual(results.response(3), 13);
				done();
			});
		});
	});
});