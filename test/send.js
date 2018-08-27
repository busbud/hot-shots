'use strict';

var assert = require('assert');

var createStatsdClient = require('./helpers').createStatsdClient;
var createTCPServer = require('./helpers').createTCPServer;
var createUDPServer = require('./helpers').createUDPServer;
var closeAll = require('./helpers').closeAll;

module.exports = function runSendAllMethodTestSuite() {
  describe('#send', function () {
    var server;
    var statsd;

    afterEach(function () {
      closeAll(server, statsd);
    });

    ['main client', 'child client', 'child of child client'].forEach(function (description, index) {
      describe(description, function () {
        describe('UDP', function () {
          it('should use errorHandler', function (done) {
            server = createUDPServer(function () {
              var err = new Error('Boom!');
              statsd = createStatsdClient({
                errorHandler: function (e) {
                  assert.equal(e, err);
                  done();
                }
              }, index);
              statsd.dnsError = err;
              statsd.send('test title');
            });
          });

          it('should record buffers when mocked', function (done) {
            var statsd = createStatsdClient({ mock: true });
            statsd.send('test', {}, function() {
              assert.deepEqual(statsd.mockBuffer, ['test']);
              done();
            });
          });
        });

        describe('TCP', function () {
          it('should use errorHandler', function (done) {
            server = createTCPServer(function (address) {
              var err = new Error('Boom!');
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                protocol: 'tcp',
                errorHandler: function (e) {
                  assert.equal(e, err);
                  done();
                }
              }, index);
              statsd.dnsError = err;
              statsd.send('test title');
            });
          });

          it('should record buffers when mocked', function (done) {
            server = createTCPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                protocol: 'tcp',
                mock: true
              }, index);
              statsd.send('test', {}, function() {
                assert.deepEqual(statsd.mockBuffer, ['test']);
                done();
              });
            });
          });
        });
      });
    });
  });
};
