import SemanticReleaseError from '@semantic-release/error'
import RegClient from 'npm-registry-client'
import npmlog from 'npmlog'

module.exports = function (pluginConfig, {pkg, npm, plugins, options}, cb) {
  npmlog.level = npm.loglevel || 'warn'
  let clientConfig = {log: npmlog}
  // disable retries for tests
  if (pluginConfig && pluginConfig.retry) clientConfig.retry = pluginConfig.retry
  const client = new RegClient(clientConfig)

  client.get(`${npm.registry}${pkg.name.replace('/', '%2F')}`, {
    auth: npm.auth
  }, (err, data) => {
    const isNotFound = err && (err.statusCode === 404 || /not found/i.test(err.message))
    const isCompletelyUnpublished = data && !data['dist-tags']

    if (isNotFound || isCompletelyUnpublished) {
      return cb(null, {})
    }

    if (err) return cb(err)

    const distTags = data['dist-tags']
    let version = distTags[npm.tag]

    if (!version &&
      options &&
      options.fallbackTags &&
      options.fallbackTags[npm.tag] &&
      distTags[options.fallbackTags[npm.tag]]) {
      version = distTags[options.fallbackTags[npm.tag]]
    }

    if (!version) {
      return cb(new SemanticReleaseError(
        `There is no release with the dist-tag "${npm.tag}" yet.
Tag a version manually or define "fallbackTags".`, 'ENODISTTAG'))
    }

    cb(null, {
      version,
      gitHead: data.versions[version].gitHead,
      get tag () {
        npmlog.warn('deprecated', 'tag will be removed with the next major release')
        return npm.tag
      }
    })
  })
}
