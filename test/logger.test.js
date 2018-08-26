'use strict';

const os = require('os');
const assert = require('assert');
const mock = require('egg-mock');
const sleep = require('mz-modules/sleep');

const hostname = os.hostname();

describe('test/logger.test.js', () => {
  afterEach(mock.restore);

  describe('sls client', () => {
    let app;
    before(() => {
      app = mock.app({
        baseDir: 'apps/client',
      });
      return app.ready();
    });
    after(() => app.close());

    it('should upload success', async () => {
      let logs = [];
      mock(app.sls, 'postLogstoreLogs', async (g, l, group) => {
        assert(group.source === hostname);
        logs = group.logs.concat(logs);
      });
      await app.httpRequest()
        .get('/')
        .expect('done')
        .expect(200);

      await sleep(2000);

      let myLoggerInfo;
      let defaultLoggerInfo;
      let errorLoggerInfo;

      for (const log of logs) {
        assert(typeof log.time === 'number');
        assert(String(log.time).length === 10);

        const keys = [];
        for (const { key, value } of log.contents) {
          keys.push(key);

          // check custom logger name
          if (value === 'my logger') {
            myLoggerInfo = log;
          }
          if (value === 'info') {
            defaultLoggerInfo = log;
          }
          if (value === 'error') {
            errorLoggerInfo = log;
          }
        }
        assert.deepEqual(keys, [
          'level',
          'content',
          'ip',
          'hostname',
          'env',
          'appName',
          'loggerName',
          'loggerFileName',
        ]);
      }

      let result = myLoggerInfo.contents.filter(c => c.key === 'loggerName');
      assert(result[0].value === 'myLogger');

      result = defaultLoggerInfo.contents.filter(c => c.key === 'loggerName');
      assert(result[0].value === 'logger');

      result = errorLoggerInfo.contents.filter(c => c.key === 'loggerName');
      assert(result[0].value === 'errorLogger');
    });


    it('should not upload when disable', async () => {
      let logs = [];
      mock(app.sls, 'postLogstoreLogs', async (g, l, group) => {
        assert(group.source === hostname);
        logs = group.logs.concat(logs);
      });
      await app.httpRequest()
        .get('/disable')
        .expect('done')
        .expect(200);

      await sleep(2000);

      for (const log of logs) {
        for (const { value } of log.contents) {
          assert(value !== 'disabledLogger');
        }
      }
    });
  });

  describe('sls clients', () => {
    let app;
    before(() => {
      app = mock.app({
        baseDir: 'apps/clients',
      });
      return app.ready();
    });
    after(() => app.close());

    it('should upload success', async () => {
      let logs = [];
      mock(app.sls, 'postLogstoreLogs', async (g, l, group) => {
        assert(group.source === hostname);
        logs = group.logs.concat(logs);
      });
      await app.httpRequest()
        .get('/')
        .expect('done')
        .expect(200);

      await sleep(2000);

      for (const log of logs) {
        assert(typeof log.time === 'number');
        assert(String(log.time).length === 10);

        const keys = [];
        for (const { key } of log.contents) {
          keys.push(key);
        }
        assert.deepEqual(keys, [
          'level',
          'content',
          'ip',
          'hostname',
          'appName',
          'loggerName',
          'loggerFileName',
        ]);
      }
    });
  });

  it('should check sls client', async () => {
    try {
      const app = mock.app({
        baseDir: 'apps/check-client',
      });
      await app.ready();
      throw new Error('should not run');
    } catch (err) {
      assert(err.message === 'app.sls is required');
    }

    try {
      const app = mock.app({
        baseDir: 'apps/check-clients',
      });
      await app.ready();
      throw new Error('should not run');
    } catch (err) {
      assert(err.message === 'app.sls.get(\'unknown\') is required');
    }
  });
});
