import SemanticReleaseError from '@semantic-release/error'
import RegClient from 'npm-registry-client'
import npmlog from 'npmlog'
import semver from 'semver'

module.exports = function (pluginConfig, {pkg, npm, plugins, options}, cb) {
  npmlog.level = npm.loglevel || 'warn'
  let clientConfig = {log: npmlog}
  // disable retries for tests
  if (pluginConfig && pluginConfig.retry) clientConfig.retry = pluginConfig.retry
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

    let version = data['dist-tags'][npm.tag]
    let unpublishedVersionsExist = false
    let latestUnpublishedVersion

    if (!version &&
      options &&
      options.fallbackTags &&
      options.fallbackTags[npm.tag] &&
      data['dist-tags'][options.fallbackTags[npm.tag]]) {
      version = data['dist-tags'][options.fallbackTags[npm.tag]]
    } else {
      let publishedLog = Object.keys(data.time).filter(semver.valid)
      let publishedVersions = Object.keys(data.versions).filter(semver.valid)
      let unpublishedVersions = publishedLog.filter(x => publishedVersions.indexOf(x) < 0).concat(publishedVersions.filter(x => publishedLog.indexOf(x) < 0))

      if (unpublishedVersions.length > 0) {
        unpublishedVersionsExist = true

        if (unpublishedVersions.length === 1) {
          latestUnpublishedVersion = unpublishedVersions[0]
        } else {
          latestUnpublishedVersion = unpublishedVersions.reduce((prev, current) => {
            return (semver.gt(prev, current) ? prev : current)
          })
        }
      }
    }

    if (!version) {
      return cb(new SemanticReleaseError(
`There is no release with the dist-tag "${npm.tag}" yet.
Tag a version manually or define "fallbackTags".`, 'ENODISTTAG'))
    }

    cb(null, {
      version: (unpublishedVersionsExist ? latestUnpublishedVersion : version),
      gitHead: data.versions[version].gitHead,
      get tag () {
        npmlog.warn('deprecated', 'tag will be removed with the next major release')
        return npm.tag
      }
    })
  })
}
