var Result = require('./Result');

/**
 * The Response is a standardized object that all Bulkhead services must
 * return if they wish to easily integrate into distributed computing
 * solutions.  It is designed to be decoupled from the lexical scope,
 * allowing initial states to preserved during message queues and
 * client transmission. 
 * @param	Mixed	The result the response contains.
 */

module.exports = function Response(results) {
	this.results = [];
	
	/**
	 * Return the Result's response based on an index.  If no index is
	 * provided, returns the response found at the zero index.
	 * @param	Mixed	Numerical index or model
	 * @returns	Boolean		
	 */
	this.response = function(index) {
		if(index === undefined || index === null) {
			// No index was provided, return the first result
			index = 0;
		} else {
			if(typeof index == 'object') {
				// A model was passed up as the index
				for(var i in this.results) {
					if(this.results[i] instanceof Result && this.results[i].request == index) {
						// The model was found in the results
						index = i;
						break;
					}
				}

				if(typeof index == 'object') {
					// The model was not found in the results
					return false;
				}
			}
		}

		if(this.results[index] instanceof Result) {
			// Unwrap a Result
			return this.results[index].response;	
		} else {
			return this.results[index];
		}
	};

	/**
	 * Checks if a Response is empty
	 * @return	Boolean
	 */
	this.isEmpty = function() {
		return this.results.length == 0 || (this.results.length == 1 && this.results[0].response === null);
	};

	/**
	 * Return the Result's message based on an index.  If no index is
	 * provided, returns the message found at the zero index.
	 * @param	Mixed	Numerical index or model
	 * @returns	Boolean		
	 */

	this.message = function(index) {
		if(index === undefined || index === null) {
			// No index was provided, return the first result
			index = 0;
		} else {
			if(typeof index == 'object') {
				// A model was passed up as the index
				for(var i in this.results) {
					if(this.results[i] instanceof Result && this.results[i].request == index) {
						// The model was found in the results
						index = i;
						break;
					}
				}

				if(typeof index == 'object') {
					// The model was not found in the results
					return false;
				}
			}
		}
		
		if(this.results[index] instanceof Result) {
			return this.results[index].message;	
		} else {
			return undefined;
		}
	};
	
	/**
	 * Get a flattened list of requests for this collection
	 * @returns	Array
	 */
	this.requests = function() {
		var result = [];
		for(var i in this.results) {
			if(this.results[i] instanceof Result) {
				result.push(this.results[i].request);
			}
		}
		return result;
	};

	/**
	 * Returns a flattened list of responses
	 * @returns	Array
	 */
	this.responses = function() {
		var result = [];
		for(var i in this.results) {
			if(this.results[i] instanceof Result) {
				result.push(this.results[i].response);
			} else {
				result.push(this.results[i]);
			}
		}
		return result;
	};
	
	/**
	 * If adding another Response or an array, it will merge it into this
	 * response.  Otherwise, it will append the Response results.
	 * @param	Mixed	Response, Array, Result, or data to add to the Response. 
	 */
	this.add = function(data) {
		if(data instanceof Response) {
			this.results = this.results.concat(data.results);
		} else if(data instanceof Array) {
			this.results = this.results.concat(data);
		} else {
			this.results.push(data);
		}
	};

	// Add the result
	this.add(results);
};