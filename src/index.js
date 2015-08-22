const SemanticReleaseError = require('@semantic-release/error')

const npmlog = require('npmlog')
const RegClient = require('npm-registry-client')

module.exports = function (pluginConfig, {pkg, npm, plugins}, cb) {
  npmlog.level = npm.loglevel || 'warn'
  let clientConfig = {log: npmlog}
  // disable retries for tests
  if (pluginConfig.retry) clientConfig.retry = pluginConfig.retry
  const client = new RegClient(clientConfig)

  client.get(`${npm.registry}${pkg.name.replace('/', '%2F')}`, {
    auth: npm.auth
  }, (err, data) => {
    if (err && (
      err.statusCode === 404 ||
      /not found/i.test(err.message)
    )) {
      return cb(null, {})
    }

    if (err) return cb(err)

    const version = data['dist-tags'][npm.tag]

    if (!version) return cb(new SemanticReleaseError(`There is no release with the dist-tag "${npm.tag}" yet. Tag a version first.`, 'ENODISTTAG'))

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
