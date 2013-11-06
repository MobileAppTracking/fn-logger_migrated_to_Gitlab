(function() {
  'use strict';
  var log, alert;

  describe('$log enhancements', function() {
    beforeEach(module('fn.logger'));

    beforeEach(inject(function($log) {
      log = $log;
    }));

    describe('is configured with defaults', function() {
      it('should be an object', function() {
        log.should.be.an('object');
      });

      it('has consoleEnabled defaults', function() {
        log.consoleEnabled.should.be.an('array');
        log.consoleEnabled.length.should.equal(4);
      });

      it('has dbEnabled defaults', function() {
        log.dbEnabled.should.be.an('array');
        log.dbEnabled.length.should.equal(4);
      });

      it('allows overriding consoleEnabled', function() {
        log.consoleEnabled = ['info', 'warn'];
        log.consoleEnabled.length.should.equal(2);
      });

      it('allows overriding dbEnabled', function() {
        log.dbEnabled = ['info', 'warn'];
        log.dbEnabled.length.should.equal(2);
      });
    });

    describe('logs to DB', function() {
      it('returns correct logs', function() {
        log.log('bar', '123');
        log.log('foo', 'abc');
        log.log('foo', 'def');
        log.info('foo', 'ghi');
        log.getLogs('foo').length.should.be.equal(3);
        log.getLogs('foo', 'info').length.should.be.equal(1);
        log.getLogs('foo', 'log').length.should.be.equal(2);
        log.getLogs('foo', ['info', 'log']).length.should.be.equal(3);
        log.getLogs(['foo', 'bar'], 'log').length.should.be.equal(3);
      });
    });

    describe('has namespaces', function() {
      it('creates console namespace', function() {
        log.getNamespaces().should.not.contain('console');
        console.log('test');
        log.getNamespaces().should.contain('console');
      });

      it('logs non-namespaced calls to default', function() {
        log.getNamespaces().should.not.contain('default');
        log.log('test');
        log.getNamespaces().should.contain('default');
      });

      it('logs namespaced calls', function() {
        log.getNamespaces().should.not.contain('foobar');
        log.log('foobar', 'test');
        log.getNamespaces().should.contain('foobar');
      });
    });

    describe('getLogger', function() {
      it('logs to namespace', function() {
        var logger = log.getLogger('my_namespace');
        logger.log('test');
        logger.log('more', 'testing');
        logger.info('ok', 'data');
        log.getLogs('my_namespace').length.should.be.equal(3);
        log.getLogs('my_namespace', 'log').length.should.be.equal(2);
        log.getLogs('my_namespace', 'info').length.should.be.equal(1);
        log.getLogs('my_namespace', 'error').length.should.be.equal(0);
      });
    });
  });
}());
