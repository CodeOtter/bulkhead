var Service = require('../lib/Service'),
	Result = require('../lib/Result'),
	Response = require('../lib/Response'),
	DI = require('../lib/DependencyInjection'),
	assert = require('assert');

describe('Dependency Injection', function() {
	describe.only('Base Class', function() {
		it('should construct and instantiate', function(done) {
			DI(new Service())();
			done();
		});
		
		it('should inject constructor', function(done) {
			var service = function(a, b) {
				assert.ok(a === 7);
				assert.ok(b === 8);
				done();
			};
			DI(service)(7,8);
		});
		
		it('should inject dynamically', function(done) {
			var service = function(a, b, container) {
				assert.ok(a === 7);
				assert.ok(b === 8);
				assert.ok(container.get('bob') === 9);
				done();
			};
			DI(service, {
				'bob': 9
			})(7, 8);
		});
	});
});

