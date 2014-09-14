# Bulkhead

Bulkhead is a library for SailJS that allows a developer to compartmentalize the functionality of their web application into individual service-oriented components.

Traditionally, MVC patterns tend to make developers stuff as much business logic into the controller...

![](https://cloud.githubusercontent.com/assets/2237846/4219802/b1fd05b2-38fc-11e4-9df5-d0b2a6988120.png)

However, this significantly reduces the extendability and scalability of a web application as business logic frequently needs to be accessed in an agnostic fashion.  (Web API, CLI, unit testing, reporting/mapReducing, cron, application components, etc.)

![](https://cloud.githubusercontent.com/assets/2237846/4219819/e0ef23dc-38fc-11e4-883b-45a79d859186.png)

But with Bulkhead, developers can modularize services and NPM packages to perform a specific task and easily install it into a SailsJS project.

![](https://cloud.githubusercontent.com/assets/2237846/4219874/317e7802-38fd-11e4-905d-e8b1c62a0fc7.png)

So, how would you like to get started? :D

* [Put all of my code into reusable services](https://github.com/CodeOtter/bulkhead-docs/blob/master/docs/quickstart.md#services)
* [Utilize dependency injection for plugins and services](https://github.com/CodeOtter/bulkhead-docs/blob/master/docs/quickstart.md#dependency-injection)
* [Setup a unit testing harness with database access, fixtures, and REST testing](https://github.com/CodeOtter/bulkhead-docs/blob/master/docs/quickstart.md#testing)
* [Create a brand new SailsJS application with Bulkhead and Bulkhead-Test already integrated](https://github.com/CodeOtter/bulkhead-docs/blob/master/docs/quickstart.md#create-project)
* [Create a brand new SailsJS plugin](https://github.com/CodeOtter/bulkhead-docs/blob/master/docs/quickstart.md#create-plugin)
* [Convert an NPM package into a SailsJS plugin](https://github.com/CodeOtter/bulkhead-docs/blob/master/docs/quickstart.md#convert-plugin)
* [Learn more about Bulkhead](https://github.com/CodeOtter/bulkhead-docs/blob/master/docs/README.md)
