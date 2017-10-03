import test from 'ava';
import nock from 'nock';
import {promisify} from 'util';
import {defaults} from 'lodash';
import SemanticReleaseError from '@semantic-release/error';
import lastRelease from '../index';
import {npm, mock, available, unpublished} from './helpers/mock-registry';

test.afterEach.always(t => {
  nock.cleanAll();
});

test.serial('Get release from package name', async t => {
  const name = 'available';
  const registry = available(name);
  const release = await promisify(lastRelease)({}, {pkg: {name}, npm});

  t.is(release.version, '1.33.7');
  t.is(release.gitHead, 'HEAD');
  t.is(release.tag, 'latest');
  t.true(registry.isDone());
});

test.serial("Get release from a tagged package's name", async t => {
  const name = 'tagged';
  const registry = available(name);
  const release = await promisify(lastRelease)({}, {pkg: {name}, npm: defaults({tag: 'foo'}, npm)});

  t.is(release.version, '0.8.15');
  t.is(release.gitHead, 'bar');
  t.is(release.tag, 'foo');
  t.true(registry.isDone());
});

test.serial('Get release from a fallbackTag', async t => {
  const name = 'tagged';
  const registry = available(name);
  const release = await promisify(lastRelease)(
    {},
    {pkg: {name}, options: {fallbackTags: {bar: 'latest'}}, npm: defaults({tag: 'bar'}, npm)}
  );

  t.is(release.version, '1.33.7');
  t.is(release.gitHead, 'HEAD');
  t.is(release.tag, 'bar');
  t.true(registry.isDone());
});

test.serial("Get error from an untagged package's name", async t => {
  const name = 'untagged';
  const registry = available(name);
  const error = await t.throws(
    promisify(lastRelease)({}, {pkg: {name}, npm: defaults({tag: 'bar'}, npm)}),
    /There is no release with the dist-tag "bar" yet/
  );

  t.true(error instanceof SemanticReleaseError);
  t.is(error.code, 'ENODISTTAG');
  t.true(registry.isDone());
});

test.serial('Get release from scoped package name', async t => {
  const name = '@scoped/available';
  const registry = available(name);

  const release = await promisify(lastRelease)({}, {pkg: {name}, npm});
  t.is(release.version, '1.33.7');
  t.is(release.gitHead, 'HEAD');
  t.is(release.tag, 'latest');
  t.true(registry.isDone());
});

test.serial('Get nothing from completely unpublished package name', async t => {
  const name = 'completely-unpublished';
  const registry = unpublished(name);
  const release = await promisify(lastRelease)({}, {pkg: {name}, npm});

  t.is(release.version, undefined);
  t.true(registry.isDone());
});

test.serial('Get nothing from not yet published package name (unavailable)', async t => {
  const name = 'unavailable';
  const registry = mock(name).reply(404, {});
  const release = await promisify(lastRelease)({}, {pkg: {name}, npm});

  t.is(release.version, undefined);
  t.true(registry.isDone());
});

test.serial('Get nothing from not yet published package name (unavailable w/o response body)', async t => {
  const name = 'unavailable-no-body';
  const registry = mock(name).reply(404);
  const release = await promisify(lastRelease)({}, {pkg: {name}, npm});

  t.is(release.version, undefined);
  t.true(registry.isDone());
});

test.serial('Get nothing from not yet published package name (unavailable w/o status code)', async t => {
  const name = 'unavailable-no-404';
  const registry = mock(name)
    .times(3)
    .replyWithError({message: 'not found', statusCode: 500, code: 'E500'});
  const release = await promisify(lastRelease)(
    {retry: {count: 1, factor: 1, minTimeout: 1, maxTimeout: 2}},
    {pkg: {name}, npm}
  );

  t.is(release.version, undefined);
  t.true(registry.isDone());
});

test.serial('Throws error on server error', async t => {
  const name = 'server-error';
  const registry = mock(name)
    .times(3)
    .reply(500);
  await t.throws(
    promisify(lastRelease)({retry: {count: 1, factor: 1, minTimeout: 1, maxTimeout: 2}}, {pkg: {name}, npm}),
    /500 Internal Server Error/
  );

  t.true(registry.isDone());
});

test.serial('Accept an undefined "pluginConfig"', async t => {
  const name = 'available';
  const registry = available(name);
  const release = await promisify(lastRelease)(undefined, {pkg: {name}, npm});

  t.is(release.version, '1.33.7');
  t.is(release.gitHead, 'HEAD');
  t.is(release.tag, 'latest');
  t.true(registry.isDone());
});

test.serial('Handle missing trailing slash on registry URL', async t => {
  const name = 'available';
  const registry = available(name);
  const release = await promisify(lastRelease)(
    {},
    {pkg: {name}, npm: defaults({registry: 'http://registry.npmjs.org'}, npm)}
  );

  t.is(release.version, '1.33.7');
  t.is(release.gitHead, 'HEAD');
  t.is(release.tag, 'latest');
  t.true(registry.isDone());
});
