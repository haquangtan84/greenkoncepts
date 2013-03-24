var OAuth       = require('oauth').OAuth         ,
    globalConf  = require('fbm/conf/conf.json')  ,
    querystring = require('querystring')         ;

// LinkedIn details
var api_key     = 'shdg4tesca91';
var secret_key  = 'flpYqguFYfDDgN6U';

// LinkedIn URLs
var requestTokenUrl    = "https://www.linkedin.com/uas/oauth/requestToken";
var accessTokenUrl     = "https://www.linkedin.com/uas/oauth/accessToken";
var authenticateUrl    = "https://www.linkedin.com/uas/oauth/authenticate";
var linkedInScope      = "r_basicprofile+r_emailaddress+r_network";

// -------------------------------------------------------------------------

var cache = {}; // TODO !!!
console.log("Loading fbm/linkedin/api.js...");

get_oauth_from_request = function (req) {
  return new OAuth(req.session.oa._requestUrl,
                   req.session.oa._accessUrl,
                   req.session.oa._consumerKey,
                   req.session.oa._consumerSecret,
                   req.session.oa._version,
                   req.session.oa._authorize_callback,
                   req.session.oa._signatureMethod);
};

// Callback for the authorization page
exports.authenticationCallback = function(req, res) {
  // get the OAuth access token with the 'oauth_verifier' that we received
  var oa = get_oauth_from_request(req);

  /* console.log(oa);
  console.log(req.session.oauth_token);
  console.log(req.session.oauth_token_secret); */

  oa.getOAuthAccessToken(
    req.session.oauth_token, 
    req.session.oauth_token_secret, 
    req.param('oauth_verifier'), 
    function(error, oauth_access_token, oauth_access_token_secret, results2) {
      if(error) {
         console.log('Error while verifying the token :');
         console.log(error);
      } else {
         // store the access token in the session
         req.session.oauth_access_token = oauth_access_token;
         req.session.oauth_access_token_secret = oauth_access_token_secret;
         res.redirect(req.param('action') ? req.param('action') : "");
      }
  });
};

// Request an OAuth Request Token, and redirects the user to authorize it
exports.login = function(req, res) {
  var action = req.param('action') && req.param('action') != ""? 
                   "?action="+querystring.escape(req.param('action')) : "";

  var oa = new OAuth(requestTokenUrl    + "?scope=" + linkedInScope  ,
                     accessTokenUrl                                  ,
                     api_key                                         ,
                     secret_key                                      ,
                     "1.0"                                           ,
                     globalConf.local_url + "/auth_cb"+ action       ,
                     "HMAC-SHA1"                                      );

  oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results) {
    if(error) {
      console.log('Error while authenticating with token :');
      console.log(error);
    } else { 
      // store the tokens in the session
      req.session.oa = oa;
      req.session.oauth_token = oauth_token;
      req.session.oauth_token_secret = oauth_token_secret;
      // redirect the user to authorize the token
      res.redirect(authenticateUrl + "?oauth_token=" + oauth_token);
    }
  })
};




// -------------------------
exports.get_cache = function(token) {
  if (!cache.hasOwnProperty(token)) {
    cache[token] = {}
  }
  return cache[token]
}

exports.get_connections = function(req, res, callback) {
  if (exports.get_cache(req.session.oauth_access_token).hasOwnProperty('connections')) {
    callback(null, exports.get_cache(req.session.oauth_access_token)['connections'], null);
    return;
  }

  // Not in the cache...
  var oa = get_oauth_from_request(req);

  oa.getProtectedResource(
    "http://www.linkedin.com/v1/people/~/connections:(id,first-name,last-name,headline,picture-url)?format=json", 
    "GET", 
    req.session.oauth_access_token, 
    req.session.oauth_access_token_secret,
    function (error, data, response) {
      var feed = JSON.parse(data);
      exports.get_cache(req.session.oauth_access_token)['connections'] = feed; 
      callback(error, feed, response);
    }
  );
};

exports.get_linkedin_profile = function(req, res) {
  if (exports.get_cache(req.session.oauth_access_token).hasOwnProperty('profile')) {
    res.send(exports.get_cache(req.session.oauth_access_token)['profile']);
    return;
  }

  var oa = get_oauth_from_request(req);

  oa.getProtectedResource(
    "http://www.linkedin.com/v1/people/~?format=json", 
    "GET", 
    req.session.oauth_access_token, 
    req.session.oauth_access_token_secret,
    function (error, data, response) {
      var feed = JSON.parse(data);
      exports.get_cache(req.session.oauth_access_token)['profile'] = feed;
      res.send(feed);
  });
}
