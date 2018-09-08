'use strict';

var dgram = require('dgram');
var net = require('net');

var StatsD = require('../../lib/statsd.js');

const CLIENT = 'client';
const CHILD_CLIENT = 'child client';
const CHILD_CHILD_CLIENT = 'child child client';
const TCP = 'tcp';
const UDP = 'udp';

//Since sampling uses random, we need to patch Math.random() to always give
// a consistent result
Math.random = function () {
  return 0.42;
};

/**
 * Close the server and stats client, waiting until both are really closed
 */
function closeAll(server, statsd, done) {
  try {
    statsd.close(function() {
      server.close(done);
    });
  }
  catch(err) {
    // ignoring on purpose, given tests may put server/statsd in an odd state
  }
}

/**
 * Returns all permutations of test types to run through
 */
function testTypes() {
  return [[UDP + ' ' + CLIENT, UDP, CLIENT],
    [UDP + ' ' + CHILD_CLIENT, UDP, CHILD_CLIENT],
    [UDP + ' ' + CHILD_CHILD_CLIENT, UDP, CHILD_CHILD_CLIENT],
    [TCP + ' ' + CLIENT, TCP, CLIENT],
    [TCP + ' ' + CHILD_CLIENT, TCP, CHILD_CLIENT],
    [TCP + ' ' + CHILD_CHILD_CLIENT, TCP, CHILD_CHILD_CLIENT]];
}

function createServer(serverType, onListening){
  var server;
  if (serverType === UDP) {
    server = dgram.createSocket("udp4");
    server.on('message', function (message) {
      var metrics = message.toString();
      server.emit('metrics', metrics);
    });
    server.on('listening', function(){
      onListening(server.address());
    });

    server.bind(0, '127.0.0.1');
  }
  else if (serverType === TCP) {
    server = net.createServer(function (socket) {
      socket.setEncoding('ascii');
      socket.on('data', function (data) {
        if (data) {
          server.emit('metrics', data);
        }
      });
    });
    server.on('listening', function(){
      onListening(server.address());
    });

    server.listen(0, '127.0.0.1');
  }
  else {
    throw new Error('Unknown server type: ' + serverType);
  }

  return server;
}

function createStatsdClient(args, clientType) {
  function construct(ctor, args) {
    function F() {
      return ctor.apply(this, args);
    }
    F.prototype = ctor.prototype;
    return new F();
  }
  var client = Array.isArray(args) ? construct(StatsD, args) : new StatsD(args);

  if (clientType === CLIENT) {
    return client;
  }
  else if (clientType === CHILD_CLIENT) {
    return client.childClient({});
  }
  else if (clientType === CHILD_CHILD_CLIENT) {
    return client.childClient({}).childClient({});
  }
  else {
    throw new Error('Unknown client type: ' + clientType);
  }
}

module.exports = {
  closeAll: closeAll,
  testTypes: testTypes,
  createServer: createServer,
  createStatsdClient: createStatsdClient,
};
