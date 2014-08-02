/**
 * 
 * @param request	The initiating request passed into the Service method
 * @param response	The result of the Service Method
 * @returns {module.exports}
 */
var ServiceResult = module.exports = function(request, response, message) {
	this.request = request;
	this.response = response;
	this.message = message;
};