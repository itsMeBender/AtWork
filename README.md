# Worktime Web Application

To monitor time spend on work. Just a **start** and **stop** button to track **8 hour** of working time.  
Midnight 0h00 will close the day and calculate overtime for the 8 hour workday.
Weekends are treated differently, using a 0 hour workday (alsways overtime).

Overtime can be corrected by clicking on overtime. In case you forgot to start or stop the timer.

The display presents the following information;
* How much time you spend on work today, top right.
* Overtime (or undertime), cummulated over previous workdays.
* A message at what time you can stop working.
* Start working at time.

sss
## Technical aspects

* There's a timer which updates the information on display every minute.
* Information is stored in local-storage. Which is deletect when you instruct your browser to clear, reset data (cookies).
* Using MicroSoft TypeScript and VSC-editor (config files).
* A notification is pushed, when 8 hours worktime is reached.


### Nice features to have

* Mark a day as a holiday (stops the timer on a workday, active as if it was a weekend)
* Create projects, to manage time spend on projects
* Store data on a server (it's now local storage wich can de deleted)
* activation and using service workers (store data on serevr).


## Install the Polymer-CLI

First, make sure you have the [Polymer CLI](https://www.npmjs.com/package/polymer-cli) installed. Then run `polymer serve` to serve your application locally.

## Viewing Your Application

```
$ polymer serve
```

## Building Your Application

```
$ polymer build
```

This will create a `build/` folder with `bundled/` and `unbundled/` sub-folders
containing a bundled (Vulcanized) and unbundled builds, both run through HTML,
CSS, and JS optimizers.

You can serve the built versions by giving `polymer serve` a folder to serve
from:

```
$ polymer serve build/bundled
```

## Running Tests

```
$ polymer test
```

Your application is already set up to be tested via [web-component-tester](https://github.com/Polymer/web-component-tester). Run `polymer test` to run your application's test suite locally.

On windows machines this can be problematic. Use manual test procedure;
* Start your local server as described above.
* Visit test page http://localhost:8080/test/worktimer-app/worktimer-app_test.html
* Look at the browser console for details on test results.
