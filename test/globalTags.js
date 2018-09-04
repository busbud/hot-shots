'use strict';

var assert = require('assert');

var createStatsdClient = require('./helpers').createStatsdClient;
var createTCPServer = require('./helpers').createTCPServer;
var createUDPServer = require('./helpers').createUDPServer;
var closeAll = require('./helpers').closeAll;

module.exports = function runGlobalTagsTestSuite() {
  describe('#globalTags', function () {
    var server;
    var statsd;

    afterEach(function () {
      closeAll(server, statsd);
    });

    ['main client', 'child client', 'child of child client'].forEach(function (description, index) {
      describe(description, function () {
        describe('TCP', function () {
          it('should not add global tags if they are not specified', function (done) {
            server = createTCPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                protocol: 'tcp'
              }, index);
              statsd.increment('test');
            });
            server.on('metrics', function (metrics) {
              assert.equal(metrics, 'test:1|c\n');
              done();
            });
          });

          it('should add global tags if they are specified', function (done) {
            server = createTCPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                global_tags: ['gtag'],
                protocol: 'tcp'
              }, index);
              statsd.increment('test');
            });
            server.on('metrics', function (metrics) {
              assert.equal(metrics, 'test:1|c|#gtag\n');
              done();
            });
          });

          it('should combine global tags and metric tags', function (done) {
            server = createTCPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                global_tags: ['gtag'],
                protocol: 'tcp'
              }, index);
              statsd.increment('test', 1337, ['foo']);
            });
            server.on('metrics', function (metrics) {
              assert.equal(metrics, 'test:1337|c|#gtag,foo\n');
              done();
            });
          });

          it('should override global tags with metric tags', function (done) {
            server = createTCPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                global_tags: ['foo', 'gtag:123'],
                protocol: 'tcp'
              }, index);
              statsd.increment('test', 1337, ['gtag:234', 'bar']);
            });
            server.on('metrics', function (metrics) {
              assert.equal(metrics, 'test:1337|c|#foo,gtag:234,bar\n');
              done();
            });
          });

          it('should format global tags', function (done) {
            server = createTCPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                globalTags: { gtag: "123", foo: "bar"},
                protocol: 'tcp'
              }, index);
              statsd.increment('test', 1337, { gtag: "234"});
            });
            server.on('metrics', function (metrics) {
              assert.equal(metrics, 'test:1337|c|#gtag:234,foo:bar\n');
              done();
            });
          });

          it('should replace reserved characters with underscores in tags', function (done) {
            server = createTCPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                globalTags: { foo: "b,a,r"},
                protocol: 'tcp'
              }, index);
              statsd.increment('test', 1337, { "reserved:character": "is@replaced@"});
            });
            server.on('metrics', function (metrics) {
              assert.equal(metrics, 'test:1337|c|#foo:b_a_r,reserved_character:is_replaced_\n');
              done();
            });
          });

          it('should add global tags using telegraf format when enabled', function (done) {
            server = createTCPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                globalTags: ['gtag:gvalue', 'gtag2:gvalue2'],
                telegraf: true,
                protocol: 'tcp'
              }, index);
              statsd.increment('test');
            });
            server.on('metrics', function (metrics) {
              assert.equal(metrics, 'test,gtag=gvalue,gtag2=gvalue2:1|c\n');
              done();
            });
          });

          it('should combine global tags and metric tags using telegraf format when enabled', function (done) {
            server = createTCPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                globalTags: ['gtag=gvalue'],
                telegraf: true,
                protocol: 'tcp'
              }, index);
              statsd.increment('test', 1337, ['foo:bar']);
            });
            server.on('metrics', function (metrics) {
              assert.equal(metrics, 'test,gtag=gvalue,foo=bar:1337|c\n');
              done();
            });
          });

          it('should format global key-value tags using telegraf format when enabled', function (done) {
            server = createTCPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                globalTags: { gtag: "gvalue"},
                telegraf: true,
                protocol: 'tcp'
              }, index);
              statsd.increment('test', 1337, { foo: "bar" });
            });
            server.on('metrics', function (metrics) {
              assert.equal(metrics, 'test,gtag=gvalue,foo=bar:1337|c\n');
              done();
            });
          });
        });

        describe('UDP', function () {
          it('should not add global tags if they are not specified', function (done) {
            server = createUDPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port
              }, index);
              statsd.increment('test');
            });
            server.on('metrics', function (metrics) {
              assert.equal(metrics, 'test:1|c');
              done();
            });
          });

          it('should add global tags if they are specified', function (done) {
            server = createUDPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                global_tags: ['gtag']
              }, index);
              statsd.increment('test');
            });
            server.on('metrics', function (metrics) {
              assert.equal(metrics, 'test:1|c|#gtag');
              done();
            });
          });

          it('should combine global tags and metric tags', function (done) {
            server = createUDPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                global_tags: ['gtag']
              }, index);
              statsd.increment('test', 1337, ['foo']);
            });
            server.on('metrics', function (metrics) {
              assert.equal(metrics, 'test:1337|c|#gtag,foo');
              done();
            });
          });

          it('should override global tags with metric tags', function (done) {
            server = createUDPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                global_tags: ['foo', 'gtag:123']
              }, index);
              statsd.increment('test', 1337, ['gtag:234', 'bar']);
            });
            server.on('metrics', function (metrics) {
              assert.equal(metrics, 'test:1337|c|#foo,gtag:234,bar');
              done();
            });
          });

          it('should format global tags', function (done) {
            server = createUDPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                globalTags: { gtag: "123", foo: "bar"}
              }, index);
              statsd.increment('test', 1337, { gtag: "234"});
            });
            server.on('metrics', function (metrics) {
              assert.equal(metrics, 'test:1337|c|#gtag:234,foo:bar');
              done();
            });
          });

          it('should replace reserved characters with underscores in tags', function (done) {
            server = createUDPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                globalTags: { foo: "b,a,r"}
              }, index);
              statsd.increment('test', 1337, { "reserved:character": "is@replaced@"});
            });
            server.on('metrics', function (metrics) {
              assert.equal(metrics, 'test:1337|c|#foo:b_a_r,reserved_character:is_replaced_');
              done();
            });
          });

          it('should add global tags using telegraf format when enabled', function (done) {
            server = createUDPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                globalTags: ['gtag:gvalue', 'gtag2:gvalue2'],
                telegraf: true
              }, index);
              statsd.increment('test');
            });
            server.on('metrics', function (metrics) {
              assert.equal(metrics, 'test,gtag=gvalue,gtag2=gvalue2:1|c');
              done();
            });
          });

          it('should combine global tags and metric tags using telegraf format when enabled', function (done) {
            server = createUDPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                globalTags: ['gtag=gvalue'],
                telegraf: true
              }, index);
              statsd.increment('test', 1337, ['foo:bar']);
            });
            server.on('metrics', function (metrics) {
              assert.equal(metrics, 'test,gtag=gvalue,foo=bar:1337|c');
              done();
            });
          });

          it('should format global key-value tags using telegraf format when enabled', function (done) {
            server = createUDPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                globalTags: { gtag: "gvalue"},
                telegraf: true
              }, index);
              statsd.increment('test', 1337, { foo: "bar" });
            });
            server.on('metrics', function (metrics) {
              assert.equal(metrics, 'test,gtag=gvalue,foo=bar:1337|c');
              done();
            });
          });
        });
      });
    });
  });
};
