Bulkhead
========

Bulkhead is a library that helps programmers compartmentalize their SailsJS project into "units of work".

MVC frameworks are inherently incomplete in their approach separation of concern.  Important business logic tends to get distributed randomly between controllers and models.  This makes unit testing, future scaling, and job distribution much more difficult to implement.  To help mitigate this, many MVC frameworks incorporate services as agnostic containers of logic, but these tend to play second fiddle to the more common practice of having the controller wear multiple hats.

Bulkhead makes service-oriented programming much easier to embrace in SailsJS with a Service mixin that:

- Contains common CRUD activities.
- Performs searches with recursive datatype-driven criteria.
- Standardizing responses in a distributed message queue-friendly format.
- A Testing Harness for Mocha that makes it easier to write tests.
