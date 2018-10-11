"use strict";

var fs = require('fs');

function sanitizeTags(value, telegraf) {
  var blacklist = telegraf ? /:|\|/g : /:|\||@|,/g;
  // Replace reserved chars with underscores.
  return (value + "").replace(blacklist, "_");
}

function formatTags(tags, telegraf) {
  if (Array.isArray(tags)) {
    return tags;

  } else {
    return Object.keys(tags).map(function (key) {
      return sanitizeTags(key, telegraf) + ":" + sanitizeTags(tags[key], telegraf);
    });
  }
}

/**
 * Overrides tags in parent with tags from child with the same name (case sensitive) and return the result as new
 * array. parent and child are not mutated.
 */
function overrideTags (parent, child, telegraf) {
  var childCopy = {};
  var toAppend = [];
  var duplicateKeys = [];

  formatTags(child, telegraf).forEach(function (tag) {
    var idx = typeof tag === 'string' ? tag.indexOf(':') : -1;
    if (idx < 1) { // Not found or first character
      toAppend.push(tag);
    } else {
      if(childCopy[tag.substring(0, idx)]) {
        childCopy[tag.substring(0, idx)].push(tag.substring(idx + 1));
      } else {
        childCopy[tag.substring(0, idx)] = [tag.substring(idx + 1)];
      }
    }
  });

  var result = parent.map(function (tag) {
    var idx = typeof tag === 'string' ? tag.indexOf(':') : -1;
    if (idx < 1) { // Not found or first character
      return tag;
    }
    var key = tag.substring(0, idx);
    if (childCopy.hasOwnProperty(key)) {
      var value = childCopy[key];
      // Handle duplicate keys
      if(value.length > 1){
        duplicateKeys = duplicateKeys.concat(getDuplicateKeys(key, value));
        delete childCopy[key];
        // Return the original parent key if it doesn't exist in duplicateKeys
        if(duplicateKeys.indexOf(tag) === -1){
          return tag;
        }
        return;
      }
      delete childCopy[key];
      return key + ':' + value[0];
    }
    return tag;
  });

  Object.keys(childCopy).forEach(function (key) {
    var value = childCopy[key];

    // Handle duplicate keys.
    if(value.length > 1){
      // Filter keys that already exist in the parent.
      var childKeys = getDuplicateKeys(key, value).filter(function(pair) {
        return parent.indexOf(pair) === -1;
      });

      duplicateKeys = duplicateKeys.concat(childKeys);
      return;
    }

    result.push(key + ':' + value[0]);
  });

  var finalResult = result.concat(toAppend).concat(duplicateKeys);
  var uniqueValues = finalResult.filter(function(value, index) {
    return finalResult.indexOf(value) === index;
  });

  return uniqueValues;
}

function getDuplicateKeys(key, values){
  return values.map(function (value) {
    return key + ':' + value;
  });
}

// Formats a date for use with DataDog
function formatDate(date) {
  var timestamp;
  if (date instanceof Date) {
    // Datadog expects seconds.
    timestamp = Math.round(date.getTime() / 1000);
  } else if (date instanceof Number) {
    // Make sure it is an integer, not a float.
    timestamp = Math.round(date);
  }
  return timestamp;
}

// Converts int to a string IP
function intToIP(int) {
  var part1 = int & 255;
  var part2 = ((int >> 8) & 255);
  var part3 = ((int >> 16) & 255);
  var part4 = ((int >> 24) & 255);

  return part4 + "." + part3 + "." + part2 + "." + part1;
}

// Returns the system default interface on Linux
function getDefaultRoute() {
  try {
    var fileContents = fs.readFileSync('/proc/net/route', 'utf8');
    var routes = fileContents.split('\n');
    for (var routeIdx in routes) {
      var fields = routes[routeIdx].trim().split('\t');
      if (fields[1] === '00000000') {
        var address = fields[2];
        // Convert to little endian by splitting every 2 digits and reversing that list
        var littleEndianAddress = address.match(/.{2}/g).reverse().join("");
        return intToIP(parseInt(littleEndianAddress, 16));
      }
    }
  } catch (e) {
    console.error('Could not get default route from /proc/net/route');
  }
  return null;
}

module.exports = {
  formatTags: formatTags,
  overrideTags: overrideTags,
  formatDate: formatDate,
  getDefaultRoute: getDefaultRoute
};
