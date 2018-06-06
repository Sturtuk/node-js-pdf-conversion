/* eslint-disable */
const _ = require('lodash');
const ex = require('../util/express');
const pdfCore = require('../core/pdf-core');

var AWS = require('aws-sdk');
var uuid = require('node-uuid');
var BucketName = 'mondovo-pdf';
var PublicURL = "https://s3.ap-south-1.amazonaws.com/"+BucketName+"/"
AWS.config.loadFromPath('config.json');

const getRender = ex.createRoute((req, res) => {
  const opts = getOptsFromQuery(req.query);
  return pdfCore.render(opts)
    .then((data) => {

        var filename = uuid.v4() + ".pdf";
        var result = {
            'data'  : 'success'
        }

        var file = data;
        var s3bucket = new AWS.S3({params: {Bucket: BucketName}});
        s3bucket.createBucket(function() {
                var params = {
                    Key: filename,
                    Body: file,
                    ACL: 'public-read',
                    ContentType: 'application/pdf'
                };
            s3bucket.upload(params, function(err, data) {
                if (err) {
                    logger.info('Aws Error DEBUG:' + err);
                } else {
                    result = {
                        'status'  : '200',
                        'pdf_location' : PublicURL+filename
                    }
                    res.set('content-type', 'application/json');
                    res.send(result);
                }
            });
        });




    });
});

const postRender = ex.createRoute((req, res) => {
  const isBodyJson = req.headers['content-type'] === 'application/json';
  if (isBodyJson) {
    const hasContent = _.isString(_.get(req.body, 'url')) || _.isString(_.get(req.body, 'html'));
    if (!hasContent) {
      ex.throwStatus(400, 'Body must contain url or html');
    }
  } else if (_.isString(req.query.url)) {
    ex.throwStatus(400, 'url query parameter is not allowed when body is HTML');
  }

  let opts;
  if (isBodyJson) {
    opts = _.cloneDeep(req.body);
  } else {
    opts = getOptsFromQuery(req.query);
    opts.html = req.body;
  }

  return pdfCore.render(opts)
    .then((data) => {

      var result = {
        'data'  : 'success'
      }
      res.set('content-type', 'application/json');
      res.send(result);




    });
});

function getOptsFromQuery(query) {
  const opts = {
    url: query.url,
    attachmentName: 0,
    scrollPage: 0,
    emulateScreenMedia: 1,
    ignoreHttpsErrors: query.ignoreHttpsErrors,
    waitFor: parseInt(query.waitFor),
    logo_url: query.logo_url,
    width: parseInt(query.width),
    height: parseInt(query.height),
    deviceScaleFactor: 1,
    isMobile: query['viewport.isMobile'],
    hasTouch: query['viewport.hasTouch'],
    isLandscape: 1,
    pageType: query.pageType

  };
  return opts;
}

module.exports = {
  getRender,
  postRender,
};
