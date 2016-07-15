const nock = require('nock')

const availableModule = {
  'dist-tags': {
    latest: '1.33.7',
    foo: '0.8.15'
  },
  versions: {
    '0.8.15': {
      gitHead: 'bar'
    },
    '1.33.7': {
      gitHead: 'HEAD'
    }
  },
  time: {
    'modified': '2016-07-13T22:49:38.007Z',
    'created': '2016-07-07T03:03:29.358Z',
    '0.8.15': '2016-07-13T01:36:31.145Z',
    '1.33.7': '2016-07-13T03:34:34.168Z'
  }
}

module.exports = nock('http://registry.npmjs.org')
  .get('/available')
  .reply(200, availableModule)
  .get('/unpublished')
  .reply(200, () => {
    let response = availableModule
    response.time['1.33.8'] = '2016-07-13T03:36:36.168Z'

    return response
  })
  .get('/tagged')
  .times(2)
  .reply(200, availableModule)
  .get('/untagged')
  .reply(200, availableModule)
  .get('/@scoped%2Favailable')
  .reply(200, availableModule)
  .get('/unavailable')
  .reply(404, {})
  .get('/unavailable-no-body')
  .reply(404)
  .get('/unavailable-no-404')
  .times(2)
  .replyWithError({message: 'not found', statusCode: 500, code: 'E500'})
