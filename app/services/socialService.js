var config = require("../../app/config");
var Models = require('../models');
var UserProvider = Models.users.UserProvider;
var http = require("http");
var _ = require('underscore');
var nlogger = require('nlogger').logger(module);

var everyauth = require('everyauth');
var Promise = everyauth.Promise;

// var accessToken = "";
// var accessTokenSecret = "";

var authLinkedIn;

module.exports = function(app, express) {

  console.log("----------- Social Service Constructor -------------");

  var social = this;
  var userProvider = new UserProvider(app.get('mongoDbInstance'));

  everyauth.everymodule
    .logoutPath('/fbm/rest/user/logout')
    .handleLogout(function (req, res) {
      authLinkedIn = null;
      req.logout();

      if ('user' in req.session) {
        delete req.session.user;
      }
      
      this.redirect(res, this.logoutRedirectPath());
    })
    .findUserById(function(req, id, callback) {
      var linkedInUser = req.session.auth.linkedin.user;
      userProvider.findByUserId(linkedInUser.emailAddress, function(err, foundUser) {

        // accessToken = req.session.auth.linkedin.accessToken;
        // accessTokenSecret = req.session.auth.linkedin.accessTokenSecret;
        authLinkedIn = req.session.auth.linkedin;

        var updatedProfile = {};
        if (foundUser == null) { 
          // non registered user sign in with LinkedInAccount
          // check is there shadow user with LI id
          var shadowLinkedInUser = userProvider.findByLinkedInId(linkedInUser.linkedInId, 
            function(error, foundShadowLinkedInUser) {
              var user = {};
              if (foundShadowLinkedInUser && foundShadowLinkedInUser.isShadowUser) {
                user = fillUsersProfile(foundShadowLinkedInUser, linkedInUser);
                user.isShadowUser = false;
              } else {
                user = fillUsersProfile(foundUser, linkedInUser);  
              }
              userProvider.save(user, function(err, result) {
                if (result && result.length > 0) req.session.user = result[0];
                callback(null, req.session.user);
              });     
            });
        } else { // registered user sign in with LinkedInAccount
          if (foundUser.linkedInId == undefined || foundUser.linkedInId === "") {
            updatedProfile = fillUsersProfile(foundUser, linkedInUser);
            updatedProfile._id = foundUser._id;
            userProvider.update(updatedProfile, function(err, res) {
              if (err == null) {
                updatedProfile._id = foundUser._id; // this is strange, after
                // updating _id field
                // disappear from object
                req.session.user = updatedProfile;
                callback(null, req.session.user);
              }
            });
          } else { // user sign in with LinkedInAccount, already has updated
            // account
            if (foundUser.avatar == undefined || foundUser.avatar == "") {
              foundUser.avatar = linkedInUser.pictureUrl;
              userProvider.update(foundUser, function(err, res) {
                if (err == null) {
                  updatedProfile._id = foundUser._id; // this is strange, after
                  // updating _id field
                  // disappear from object
                  req.session.user = foundUser;
                  callback(null, req.session.user);
                }
              });
            } else {
              foundUser._id = foundUser._id.toString(); 
              req.session.user = foundUser;
              callback(null, req.session.user);
            }
          }
        }
      });
    });

  everyauth.linkedin
      .entryPath('/auth/linkedin')
      .requestTokenPath(
          '/uas/oauth/requestToken' + "?scope="
              + config.linkedin.scope.join("+"))
      .consumerKey(config.linkedin.consumerKey)
      .consumerSecret(config.linkedin.consumerSecret)
      .fetchOAuthUser(
          function(accessToken, accessTokenSecret, params) {
            var promise = this.Promise();
            this.oauth
                .get(
                    this.apiHost()
                        + '/people/~:(id,email-address,first-name,last-name,headline,location:(name,country:(code)),industry,num-connections,num-connections-capped,summary,specialties,proposal-comments,associations,honors,interests,positions,publications,patents,languages,skills,certifications,educations,three-current-positions,three-past-positions,num-recommenders,recommendations-received,phone-numbers,im-accounts,twitter-accounts,date-of-birth,main-address,member-url-resources,picture-url,site-standard-profile-request:(url),api-standard-profile-request:(url,headers),public-profile-url)',
                    accessToken, accessTokenSecret, function(err, data, res) {
                      if (err) {
                        err.extra = {
                          data : data,
                          res : res
                        }
                        return promise.fail(err);
                      }
                      var oauthUser = JSON.parse(data);
                      promise.fulfill(oauthUser);
                    });
            return promise;
          }).findOrCreateUser(
          function(session, accessToken, accessSecret, linkedinUserMetadata) {
            return linkedinUserMetadata;
          }).redirectPath("/#home");

  app.use(everyauth.middleware());

  return social;
};

module.exports.isLoggedIn = function(req) {
  var flag = req.loggedIn;
  var user = req.user;

  return flag;
  // if (!authLinkedIn)
  //   return false;
  // else 
  //   return (authLinkedIn && authLinkedIn.accessToken != "" && authLinkedIn.accessTokenSecret != "");
}

module.exports.sendLinkedInMemberMessage = function(linkedInUserId, subject, body, callback) {
  var BODY = {
    "recipients" : {
      "values" : [ {
        "person" : {
          "_path" : "/people/" + linkedInUserId,
        }
      } ]
    },
    "subject" : subject,
    "body" : body
  };

  everyauth.linkedin.oauth.post("http://api.linkedin.com/v1/people/~/mailbox",
      authLinkedIn.accessToken, authLinkedIn.accessTokenSecret, JSON.stringify(BODY),
      "application/jsonx-li-format=json", 
      function(error, data, response) {
        if (callback != null) {
          callback(data, error);
        }
      });
};

module.exports.findLinkedInUser = function(linkedInId, callback) {
	var result = {};
	module.exports.getUsersConnections(function(error, users) {
		users.forEach(function(user) {
			if (user.linkedInId == linkedInId)
				result = user;
		});	

		if (callback)
			callback(result);
	});
}

module.exports.getUsersConnections = function(callback) {
  var connections = [];
  everyauth.linkedin.oauth.getProtectedResource(
      "http://api.linkedin.com/v1/people/~/connections", "GET", authLinkedIn.accessToken,
      authLinkedIn.accessTokenSecret, function(error, data, response) {
        if (error == null) {
          var _data = JSON.parse(data);
          if (_data != null && _data.values.length > 0) {
            _data.values.forEach(function(item) {
              var connect = {}
              if (item.id != "private") {
                connect = {
                  firstName : item.firstName,
                  lastName : item.lastName,
                  linkedInId : item.id,
                  proHeadline : item.headline,
                  industry : item.industry
                };
                if (item.location != null) {
                  connect.country = item.location.name;
                }
                connections.push(connect);
              }
            });
          }
        }

        if (callback) callback(null, connections);

        console.log(connections);
      });
};

var fillUsersProfile = function(user, linkedInUser) {

  var updatedUser = {};

  if (user) {
    user.emails = user.emails || [];
    if (user.email) {
      user.emails.push({
        email : user.email,
        verified : false,
        primary : true
      });
      delete user.email;
    }
    _.each(user.emails, function(elem, index) {
      if (elem.email == linkedInUser.emailAddress) {
        user.emails[index].verified = true;
      }
    });

    updatedUser.firstName = user.firstName || linkedInUser.firstName;
    updatedUser.lastName = user.lastName || linkedInUser.lastName;
    updatedUser.country = user.country || linkedInUser.location.name;
    updatedUser.proHeadline = user.proHeadline || linkedInUser.headline;
    updatedUser.industry = user.industry || linkedInUser.industry;

  } else {
    user = {};
    updatedUser.firstName = linkedInUser.firstName;
    updatedUser.lastName = linkedInUser.lastName;
    updatedUser.country = linkedInUser.location.name;
    updatedUser.proHeadline = linkedInUser.headline;
    updatedUser.industry = linkedInUser.industry;
    updatedUser.emails = [ {
      email : linkedInUser.emailAddress,
      verified : true,
      primary : true
    } ];
  }
  updatedUser.linkedInId = linkedInUser.id;
  _.extend(user, updatedUser);
  return user;
};
