/*
  cycle.js - https://raw.github.com/douglascrockford/JSON-js/master/cycle.js
  2013-02-19

  Public Domain.

  NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

  This code should be minified before deployment.
  See http://javascript.crockford.com/jsmin.html

  USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
  NOT CONTROL.
*/

/*jslint evil: true, regexp: true */

/*members $ref, apply, call, decycle, hasOwnProperty, length, prototype, push,
  retrocycle, stringify, test, toString
*/

if (typeof JSON.decycle !== 'function') {
  JSON.decycle = function decycle(object) {
    'use strict';

    // Make a deep copy of an object or array, assuring that there is at most
    // one instance of each object or array in the resulting structure. The
    // duplicate references (which might be forming cycles) are replaced with
    // an object of the form
    //      {$ref: PATH}
    // where the PATH is a JSONPath string that locates the first occurance.
    // So,
    //      var a = [];
    //      a[0] = a;
    //      return JSON.stringify(JSON.decycle(a));
    // produces the string '[{"$ref":"$"}]'.

    // JSONPath is used to locate the unique object. $ indicates the top level of
    // the object or array. [NUMBER] or [STRING] indicates a child member or
    // property.

    var objects = [], // Keep a reference to each unique object or array
      paths = [];     // Keep the path to each unique object or array

    return (function derez(value, path) {
      var i,          // The loop counter
        name,         // Property name
        nu;           // The new object or array

      if (typeof value === 'object' && value !== null &&
          !(value instanceof Boolean) &&
          !(value instanceof Date)    &&
          !(value instanceof Number)  &&
          !(value instanceof RegExp)  &&
          !(value instanceof String)) {
        for (i = 0; i < objects.length; i += 1) {
          if (objects[i] === value) {
            return {$ref: paths[i]};
          }
        }

        objects.push(value);
        paths.push(path);

        if (Object.prototype.toString.apply(value) === '[object Array]') {
          nu = [];
          for (i = 0; i < value.length; i += 1) {
            nu[i] = derez(value[i], path + '[' + i + ']');
          }
        } else {
          nu = {};
          for (name in value) {
            if (Object.prototype.hasOwnProperty.call(value, name)) {
              nu[name] = derez(value[name],
                path + '[' + JSON.stringify(name) + ']');
            }
          }
        }
        return nu;
      }
      return value;
    }(object, '$'));
  };
}


if (typeof JSON.retrocycle !== 'function') {
  JSON.retrocycle = function retrocycle($) {
    'use strict';

    var px =
      /^\$(?:\[(?:\d+|\"(?:[^\\\"\u0000-\u001f]|\\([\\\"\/bfnrt]|u[0-9a-zA-Z]{4}))*\")\])*$/;

    (function rez(value) {
      var i, item, name, path;

      if (value && typeof value === 'object') {
        if (Object.prototype.toString.apply(value) === '[object Array]') {
          for (i = 0; i < value.length; i += 1) {
            item = value[i];
            if (item && typeof item === 'object') {
              path = item.$ref;
              if (typeof path === 'string' && px.test(path)) {
                value[i] = eval(path);
              } else {
                rez(item);
              }
            }
          }
        } else {
          for (name in value) {
            if (typeof value[name] === 'object') {
              item = value[name];
              if (item) {
                path = item.$ref;
                if (typeof path === 'string' && px.test(path)) {
                  value[name] = eval(path);
                } else {
                  rez(item);
                }
              }
            }
          }
        }
      }
    }($));
    return $;
  };
}
