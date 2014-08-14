/**
 * The Result is a standard element used to populate Responses.  This is
 * useful for making sure your Service methods are able to be decoupled
 * from their lexical scope.
 * @param	Mixed	The request responsible for generating the response
 * @param	Mixed	The response of a servie method
 * @param	String	Any messages associated with this result.
 */
var Result = module.exports = function(request, response, message) {
	this.request = request;
	this.response = response;
	this.message = message;
};