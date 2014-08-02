/**
 * 
 * @param record
 * @param result
 * @returns {module.exports}
 */
var ServiceResult = require('./ServiceResult');

module.exports = function ServiceResultCollection(results) {
	this.results = [];
	
	/**
	 * Get the result of a Service call based on a numerical index or on a model
	 * @param	Mixed	Numerical index or model
	 * @result	Boolean
	 */
	this.response = function(index) {
		if(index === undefined || index === null) {
			// No index was provided, return the first result
			index = 0;
		} else {
			if(typeof index == 'object') {
				// A model was passed up as the index
				for(var i in this.results) {
					if(this.results[i] instanceof ServiceResult && this.results[i].request == index) {
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

		if(this.results[index] instanceof ServiceResult) {
			return this.results[index].response;	
		} else {
			return this.results[index];
		}
	};

	/**
	 * Checks if a result is empty
	 * @return	Boolean
	 */
	this.isEmpty = function() {
		return this.results.length == 0 || (this.results.length == 1 && this.results[0].response === null);
	};

	/**
	 * Get the message of a Service call based on a numerical index or on a model
	 * @param	Mixed	Numerical index or model
	 * @result	Boolean
	 */
	this.message = function(index) {
		if(index === undefined || index === null) {
			// No index was provided, return the first result
			index = 0;
		} else {
			if(typeof index == 'object') {
				// A model was passed up as the index
				for(var i in this.results) {
					if(this.results[i] instanceof ServiceResult && this.results[i].request == index) {
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
		
		if(this.results[index] instanceof ServiceResult) {
			return this.results[index].message;	
		} else {
			return undefined;
		}
	};
	
	/**
	 * Get a flattened list of requests for this collection
	 */
	this.requests = function() {
		var result = [];
		for(var i in this.results) {
			if(this.results[i] instanceof ServiceResult) {
				result.push(this.results[i].request);
			}
		}
		return result;
	};

	/**
	 * 
	 * @returns {Array}
	 */
	this.responses = function() {
		var result = [];
		for(var i in this.results) {
			if(this.results[i] instanceof ServiceResult) {
				result.push(this.results[i].response);
			} else {
				result.push(this.results[i]);
			}
		}
		return result;
	};
	
	/**
	 * 
	 */
	this.add = function(data) {
		if(data instanceof ServiceResultCollection) {
			this.results = this.results.concat(data.results);
		} else if(data instanceof Array) {
			this.results = this.results.concat(data);
		} else {
			this.results.push(data);
		}
	};
	
	this.add(results);
};