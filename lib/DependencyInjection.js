// AngularJS Aautoinjection functionality (https://github.com/angular/angular.js/blob/5e15b11509888f42b5929086cfc45ac0246d1fdf/src/auto/injector.js)

var intravenous = require('intravenous'),
	_ = require('underscore');

var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
var FN_ARG_SPLIT = /,/;
var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

function anonFn(fn) {
  // For anonymous functions, showing at the very least the function signature can help in
  // debugging.
  var fnText = fn.toString().replace(STRIP_COMMENTS, ''),
      args = fnText.match(FN_ARGS);
  if (args) {
    return 'function(' + (args[1] || '').replace(/[\s\r\n]+/, ' ') + ')';
  }
  return 'fn';
}

function annotate(fn/*, strictDi, name*/) {
  var $inject = [],
      fnText,
      argDecl,
      last;

  if (typeof fn === 'function') {
    if (!($inject = fn.$inject)) {
      $inject = [];
      if (fn.length) {
    	/*
        if (strictDi) {
          if (!isString(name) || !name) {
            name = fn.name || anonFn(fn);
          }
          throw $injectorMinErr('strictdi',
            '{0} is not using explicit annotation and cannot be invoked in strict mode', name);
        }
        */
        fnText = fn.toString().replace(STRIP_COMMENTS, '');
        argDecl = fnText.match(FN_ARGS);
        _.each(argDecl[1].split(FN_ARG_SPLIT), function(arg) {
          arg.replace(FN_ARG, function(all, underscore, name) {
            $inject.push(name);
          });
        });
      }
      fn.$inject = $inject;
    }
  }/* else if (isArray(fn)) {
    last = fn.length - 1;
    assertArgFn(fn[last], 'fn');
    $inject = fn.slice(0, last);
  } else {
    assertArgFn(fn, 'fn', true);
  }*/
  return $inject;
};

/**
 * A wrapper for Intravenous to simplify Dependency Injection wiring
 * @param	Function	A Service definition
 * @param	Object		A key/pair of dependencies the service uses
 * @param	Function	A disposal function
 */
module.exports = function(service, deps, dispose) {
	if(dispose !== undefined) {
		// Attach a disposal process
		service.prototype.dispose = dispose;
	}

	// Attach constructor arguments to the injector
	service.$inject = annotate(service);
	service.$inject.push('container');

	// Create the DIC
	var container = intravenous.create({
		onDispose: function(instance, key) {
			if (instance.dispose) instance.dispose();
		}
	});

	if(deps !== undefined) {
		// Define dependencies 
		for(var i in deps) {
			container.register(i, deps[i]);
		}
	}

	// Register the root parent
	container.register('_bulkheadService', service);

	return function() {
		var args = Array.prototype.slice.call(arguments, 0);

		if(args.length == service.length + 1) {
			// Found a injection object, overwrite container registrations
			var injection = args.pop();
			for(var i in injection) {
				container.register(i, injection[i]);
			}
		}

		for(var i = 0; i < args.length; i++) {
			// Overwrite container registration with constructor arguments
			container.register(service.$inject[i], args[i]);
		}

		return container.get('_bulkheadService');
	};
};