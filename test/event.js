'use strict';

var assert = require('assert');
var dgram = require('dgram');
var net = require('net');

var createStatsdClient = require('./helpers').createStatsdClient;
var createTCPServer = require('./helpers').createTCPServer;
var createUDPServer = require('./helpers').createUDPServer;
var closeAll = require('./helpers').closeAll;

module.exports = function runEventTestSuite() {
  describe('#event', function () {
    var server;
    var statsd;

    afterEach(function () {
      closeAll(server, statsd);
    });

    ['main client', 'child client', 'child of child client'].forEach(function (description, index) {
      describe(description, function () {
        describe('UDP', function () {
          it('should send proper event format for title and text', function (done) {
            server = createUDPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port
              }, index);
              statsd.event('test', 'description');
            });
            server.on('metrics', function (event) {
              assert.equal(event, '_e{4,11}:test|description');
              done();
            });
          });

          it('should reuse the title when when text is missing', function (done) {
            server = createUDPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port
              }, index);
              statsd.event('test');
            });
            server.on('metrics', function (event) {
              assert.equal(event, '_e{4,4}:test|test');
              done();
            });
          });

          it('should send proper event format for title, text, and options', function (done) {
            var date = new Date();
            server = createUDPServer(function (address) {
              var options;
              statsd = createStatsdClient({
                host: address.address,
                port: address.port
              }, index);
              options = {
                date_happened: date,
                hostname: 'host',
                aggregation_key: 'ag_key',
                priority: 'low',
                source_type_name: 'source_type',
                alert_type: 'warning'
              };
              statsd.event('test title', 'another\nmultiline\ndescription', options);
            });
            server.on('metrics', function (event) {
              assert.equal(event, '_e{10,31}:test title|another\\nmultiline\\ndescription|d:' +
                Math.round(date.getTime() / 1000) + '|h:host|k:ag_key|p:low|s:source_type|t:warning'
              );
              done();
            });
          });

          it('should send proper event format for title, text, some options, and tags', function (done) {
            server = createUDPServer(function (address) {
              var options;
              statsd = createStatsdClient({
                host: address.address,
                port: address.port
              }, index);
              options = {
                hostname: 'host'
              };
              statsd.event('test title', 'another desc', options, ['foo', 'bar']);
            });
            server.on('metrics', function (event) {
              assert.equal(event, '_e{10,12}:test title|another desc|h:host|#foo,bar');
              done();
            });
          });

          it('should send proper event format for title, text, tags, and a callback', function (done) {
            var called = false;
            server = createUDPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port
              }, index);
              statsd.event('test title', 'another desc', null, ['foo', 'bar'], function () {
                called = true;
              });
            });
            server.on('metrics', function (event) {
              assert.equal(event, '_e{10,12}:test title|another desc|#foo,bar');
              assert.equal(called, true);
              done();
            });
          });

          it('should send no event stat when a mock Client is used', function (done) {
            var TEST_FINISHED_MESSAGE = 'TEST_FINISHED';
            server = createUDPServer(function (address) {
              statsd = createStatsdClient([
                address.address, address.port, 'prefix', 'suffix', false, false, true
              ], index);

              // Regression test for "undefined is not a function" with missing
              // callback on mock instance
              statsd.event('test', 1);

              statsd.event('test', 1, null, function (error, bytes) {
                var socket = dgram.createSocket("udp4");
                var buf = new Buffer(TEST_FINISHED_MESSAGE);

                assert.ok(!error);
                assert.equal(bytes, 0);
                socket.send(buf, 0, buf.length, address.port, address.address);
              });
            });
            server.on('metrics', function (message) {
              // We only expect to get our own test finished message, no stats
              assert.equal(message, TEST_FINISHED_MESSAGE);
              done();
            });
          });

          it('should throw an exception when using telegraf format', function (done) {
            server = createUDPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                telegraf: true
              }, index);
              assert.throws(function () {
                statsd.event('test title', 'another desc', null, ['foo', 'bar']);
              }, function (err) {
                done();
              });
            });
          });

          it('should use errorHandler', function (done) {
            server = createUDPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                telegraf: true,
                errorHandler: function () {
                  done();
                }
              }, index);
              statsd.event('test title', 'another desc');
            });
          });
        });

        describe('TCP', function () {
          it('should send proper event format for title and text', function (done) {
            server = createTCPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                protocol: 'tcp'
              }, index);
              statsd.event('test', 'description');
            });
            server.on('metrics', function (event) {
              assert.equal(event, '_e{4,11}:test|description\n');
              done();
            });
          });

          it('should reuse the title when when text is missing', function (done) {
            server = createTCPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                protocol: 'tcp'
              }, index);
              statsd.event('test');
            });
            server.on('metrics', function (event) {
              assert.equal(event, '_e{4,4}:test|test\n');
              done();
            });
          });

          it('should send proper event format for title, text, and options', function (done) {
            var date = new Date();
            server = createTCPServer(function (address) {
              var options;
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                protocol: 'tcp'
              }, index);
              options = {
                date_happened: date,
                hostname: 'host',
                aggregation_key: 'ag_key',
                priority: 'low',
                source_type_name: 'source_type',
                alert_type: 'warning'
              };
              statsd.event('test title', 'another\nmultiline\ndescription', options);
            });
            server.on('metrics', function (event) {
              assert.equal(event, '_e{10,31}:test title|another\\nmultiline\\ndescription|d:' +
                Math.round(date.getTime() / 1000) + '|h:host|k:ag_key|p:low|s:source_type|t:warning\n'
              );
              done();
            });
          });

          it('should send proper event format for title, text, some options, and tags', function (done) {
            server = createTCPServer(function (address) {
              var options;
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                protocol: 'tcp'
              }, index);
              options = {
                hostname: 'host'
              };
              statsd.event('test title', 'another desc', options, ['foo', 'bar']);
            });
            server.on('metrics', function (event) {
              assert.equal(event, '_e{10,12}:test title|another desc|h:host|#foo,bar\n');
              done();
            });
          });

          it('should send proper event format for title, text, tags, and a callback', function (done) {
            var called = false;
            server = createTCPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                protocol: 'tcp'
              }, index);
              statsd.event('test title', 'another desc', null, ['foo', 'bar'], function () {
                called = true;
              });
            });
            server.on('metrics', function (event) {
              assert.equal(event, '_e{10,12}:test title|another desc|#foo,bar\n');
              assert.equal(called, true);
              done();
            });
          });

          it('should send no event stat when a mock Client is used', function (done) {
            var TEST_FINISHED_MESSAGE = 'TEST_FINISHED';
            server = createTCPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                prefix: 'prefix',
                suffix: 'suffix',
                mock: true,
                protocol: 'tcp'
              }, index);

              // Regression test for "undefined is not a function" with missing
              // callback on mock instance
              statsd.event('test', 1);

              statsd.event('test', 1, null, function (error, bytes) {
                var socket = net.connect(address.port, address.address);
                var buf = new Buffer(TEST_FINISHED_MESSAGE);

                assert.ok(!error);
                assert.equal(bytes, 0);
                socket.write(buf, 0, 'ascii');
              });
            });
            server.on('metrics', function (message) {
              // We only expect to get our own test finished message, no stats
              assert.equal(message, TEST_FINISHED_MESSAGE);
              done();
            });
          });

          it('should throw an exception when using telegraf format', function (done) {
            server = createTCPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                telegraf: true,
                protocol: 'tcp'
              }, index);
              assert.throws(function () {
                statsd.event('test title', 'another desc', null, ['foo', 'bar']);
              }, function (err) {
                done();
              });
            });
          });

          it('should use errorHandler', function (done) {
            server = createTCPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                telegraf: true,
                protocol: 'tcp',
                errorHandler: function () {
                  done();
                }
              }, index);
              statsd.event('test title', 'another desc');
            });
          });
        });
      });
    });
  });
};
