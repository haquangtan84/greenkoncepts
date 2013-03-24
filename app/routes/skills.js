var Models = require('../models');
var UserProvider = Models.users.UserProvider;
var FeedbackProvider = Models.feedbacks.FeedbackProvider;
var ConnectionProvider = Models.connections.ConnectionProvider;
var StreamProvider = Models.streams.StreamProvider;
var TagsProvider = Models.tags.TagsProvider;
var mailService = require('../services/mailService');
var socialService = require('../services/socialService');

var async = require('async');
var _ = require('underscore');
var nlogger = require('nlogger').logger(module);

// Helper function
function createInvitationEmailContent(user) {
  var mailContent = '<br><br> HERE GOES INVITATION PART <br><br>';
  return mailContent;
}

function createFeedbackEmailContent(from, to, link, tags, content) {
  var tagsList = "";
  if(tags.length > 0) {
    tags.forEach(function(tag, index) {
	  tagsList += tag.name + ', ';
    });
	tagsList = tagsList.substring(0, tagsList.length-2);

  }
  var mailContent = 'Hi ' + (to.firstName ? ' ' + to.firstName : '') + ',';
  mailContent += '<br><br>';
  mailContent += from.firstName + ' ' + from.lastName;
  if(tags.length > 0) {
	if(tagsList.split(",").length > 1)
      mailContent += ' shared a feedback with you on Far Better Me, with the following tags: ' + tagsList +'. Curious?';
	else
      mailContent += ' shared a feedback with you on Far Better Me, with the following tag: ' + tagsList +'. Curious?';
  }
  else 
	mailContent += ' shared a feedback with you on Far Better Me. Curious?';
   
  // TODO : should direct user in the right view
  mailContent += ' <a href=\'' + link + '\'> Click here</a>.';
  if (to.isShadowUser) {
    mailContent += '<br><br>The Far Better Me team.'
        + '<br>Far Better Me is the social platform for self-improvement.';
  }

  return mailContent;
}

function createLinkedInFeedbackEmailContent(user, link, from) {
  var mailContent = 'Hi,';
  mailContent += '\n\n';
  mailContent += 'I would really appreciate if you could share a quick feedback about me on Far Better Me (will only take a minute). I just shared one about you.';
  mailContent += '\n\n';
  mailContent += 'This will help us exchange personal feedback with our trusted connections.';
  mailContent += '\n\n';

  // TODO : should direct user in the right view
  // mailContent += ' <a href=\'' + link + '\'> Click here</a>.';
  mailContent += link;
  mailContent += '\n\n';

  mailContent += 'Sincerely,\n';
  mailContent += from;

  return mailContent;
}

var route_skills = {};
route_skills.list = function(req, res) {
  if (!('user' in req.session)) { return req.app.get('responseHandler')(
      [ "User not logged" ], null, res); }

  var userProvider = new UserProvider(req.app.get('mongoDbInstance'));

  async.waterfall([
  // get user by email
  function(w_callback) {
    userProvider.findById(req.session.user._id, w_callback);
  },
  // get tags list
  function(user, w_callback) {
    var tags = ('tags' in user) ? user.tags : [];
    w_callback(null, tags);
  }

  ], function(err, result) {
    req.app.get('responseHandler')(err, result, res);
  });

};

route_skills.insert = function(req, res) {

  if (!('user' in req.session)) { return req.app.get('responseHandler')(
      [ "User not logged" ], null, res); }

  if (req.params.tagName === undefined) { return res.json({
    status : false,
    errors : [ "No tag found" ]
  }); }

  var userProvider = new UserProvider(req.app.get('mongoDbInstance'));

  async.waterfall([

      // add new tag
      function(w_callback) {
        userProvider.addTagToUser(req.session.user._id, req.params.tagName, w_callback);
      },

      // get new tag name
      function(result, w_callback) {
        var tagName = req.params.tagName;
        w_callback(null, tagName);
      }

  ], function(err, result) {
    req.app.get('responseHandler')(err, result, res);
  });
};

route_skills.sendFeedback = function(req, res) {
  if (!('user' in req.session)) { return req.app.get('responseHandler')(
      [ "User not logged" ], null, res); }

  var feedbackProvider = new FeedbackProvider(req.app.get('mongoDbInstance'));
  var userProvider = new UserProvider(req.app.get('mongoDbInstance'));
  var connectionProvider = new ConnectionProvider(req.app.get('mongoDbInstance'));
  var tagsProvider = new TagsProvider(req.app.get('mongoDbInstance'));

  var userSendingFeedback = req.session.user;
  var userReceivingFeedback = req.body.userReceivingFeedback;
  var postFeedback = req.body.postFeedback;
  var isLinkedInUser = req.body.isLinkedInUser;

  var newConnectionStreamFlg = false;
  var _now = new Date();

  async
      .series(
          [
              // check if userReceivingFeedback is a registered user or not
              // if its an non-registered user, create a shadow user and send
              // him invite
              function checkIfUserReceivingFeedbackIsRegistered(s_callback) {
                if (isLinkedInUser) {
                  if (!_.isUndefined(userReceivingFeedback.linkedInId)) {
                    // create shadow user with linkedInId
                    userProvider.createShadowUserWithLinkedInId(
                        userReceivingFeedback.linkedInId,
                        function(err, result) {
                          if (err) return s_callback(err);
                          result._id = String(result._id.valueOf());
                          userReceivingFeedback = result;

                          return s_callback(null);
                        });
                  }
                } else {
                  if (_.isUndefined(userReceivingFeedback._id)) {
                    userProvider.createShadowUser({
                      email : userReceivingFeedback.email
                    }, function(err, result) {
                      if (err) return s_callback(err);
					  if(result) {
                        result._id = String(result._id.valueOf());
                        userReceivingFeedback = result;
                      }
                      return s_callback(null);
                    });
                  } else {
                    return s_callback(null);
                  }
                }

              },

              // insert feedback
              function insertFeedback(s_callback) {
                  postFeedback['f_from'] = userSendingFeedback._id;
                  postFeedback['f_to'] = userReceivingFeedback._id;
                  postFeedback['f_created_at'] = new Date();

                  var f_tags = postFeedback.tags;
                  var count = 0;
                  //Here we are going to save new tags
                  async.whilst(
                    function () {
                      return count < f_tags.length;
                    },
                    function (callback) {
                      count++;
                      var tag = f_tags[count - 1];
                      if (_.isUndefined(tag._id)) {
                        tagsProvider.saveTag(tag.name, function(err, records) {
                          f_tags[count - 1] = records[0]; //update tag with _id
                          callback();
                        });
                      } else {
                        tagsProvider.getTagById(tag._id, function(err, tag) {
                          f_tags[count - 1] = tag; //update tag with _id
                          callback(); 
                        })
                      }
                    },
                    function (err) {
                      feedbackProvider.saveFeedback(postFeedback, s_callback);
                    }
                  );
              },

              function checkConnectionStatusAndAddNotification(s_callback) {
                connectionProvider.findConnectionStatus(userReceivingFeedback, userSendingFeedback,
                  function(err, result) {
                    if (err) return s_callback(err);

                    if (result && !_.isUndefined(result._id)) {
                      connectionProvider.findConnectionStatus(userSendingFeedback, userReceivingFeedback,
                        function(err, result) {

                          if (result && !_.isUndefined(result._id)) {
                            nlogger.debug('already friends!');
                            return s_callback(err);
                          } else {
                            // set newConnectionStreamFlg to true
                            nlogger.debug('newConnectionStreamFlg has been set to true');
                            newConnectionStreamFlg = true;
                            return s_callback(err);
                          }
                        });
                    } else {
                      nlogger.debug('Cannot be friends yet!');
                      return s_callback(err);
                    }
                  });
              },

              // check user's connections and add if not already there
              function updateConnections(s_callback) {
                connectionProvider.addConnection(userSendingFeedback, userReceivingFeedback, s_callback);
              },

              function sendJustNowFriendsEmail(s_callback) { //send notification email to just connected friends
                if (newConnectionStreamFlg) {
                  async.waterfall([
                    function sendEmail1(w_callback) { // from sending feedback
                      var subject = userReceivingFeedback.firstName + ' is now your connection.';
                      var mailContent = "Good news, "+ userSendingFeedback.firstName +"! You are now connected to "+ userReceivingFeedback.firstName +" on Far Better Me.";
                      // p_callback(null);  
                      mailService.send(userSendingFeedback.emails[0].email, subject, mailContent, 
                        function(error, response) {
                          w_callback(null, "done");
                        });
                    },
                    function sendEmail2(result, w_callback) { //from receiving feedback
                      var subject = userSendingFeedback.firstName + ' is now your connection.';
                      var mailContent = "Good news, "+ userReceivingFeedback.firstName +"! You are now connected to "+ userSendingFeedback.firstName +" on Far Better Me.";
                      // p_callback(null);
                      mailService.send(userReceivingFeedback.emails[0].email, subject, mailContent, 
                        function(error, response) {
                          w_callback(null, "done");
                        });
                    }      
                  ], function p_result(err, result) {
                    if (err) nlogger.error(err);
                    s_callback(null);
                  });
                } else {
                  s_callback(null);  
                }
              },

              // this is where all the streams are added in the connections
              // stream
              // Objects
              function addStreams(s_callback) {
                // background process, continue to run ahead
                s_callback(null);

                var streamProvider = new StreamProvider(req.app.get('mongoDbInstance'));
                var connUSF = [];
                var connURF = [];

                async.waterfall([
                    function getAllConnectionDetails(w_callback) {
                      async.parallel([
                          function getConnOfUserSendingFeedback(p_callback) {
                            getAllConnectionsForUser(userSendingFeedback, connectionProvider, p_callback);
                          },
                          function getConnOfUserReceivingFeedback(p_callback) {
                            getAllConnectionsForUser(userReceivingFeedback, connectionProvider, p_callback);
                          } ], w_callback);
                    },

                    function insertNewConnectionStream(connectionDetails, w_callback) {
                      // conn of userSendingFeedback
                      connUSF = connectionDetails[0];

                      // conn of userReceivingFeedback
                      connURF = connectionDetails[1];

                      if (newConnectionStreamFlg) {
                        nlogger.debug('friend stream will be added!');
                        async.parallel([
                            function forUSF(p_callback) {
                              var streamObjUSF = streamProvider.createStreamData(userSendingFeedback._id,
                                      userReceivingFeedback._id,
                                      'newConnection', _now,
                                      userSendingFeedback._id);

                              if (connUSF.indexOf(userReceivingFeedback._id) == -1)
                                connUSF.push(userReceivingFeedback._id);    
                              // streamProvider.insertActivity([ userReceivingFeedback._id ], streamObjUSF, p_callback);
                              streamProvider.insertActivity(connUSF, streamObjUSF, p_callback);
                            },

                            function forURF(p_callback) {
                              var streamObjURF = streamProvider.createStreamData(userReceivingFeedback._id,
                                      userSendingFeedback._id, 'newConnection',
                                      _now, userReceivingFeedback._id);

                              if (connURF.indexOf(userSendingFeedback._id) == -1)
                                connURF.push(userSendingFeedback._id);  
                              // streamProvider.insertActivity([ userSendingFeedback._id ], streamObjURF, p_callback);
                              streamProvider.insertActivity(connURF, streamObjURF, p_callback);
                            } ],

                        function p_result(err) {
                          w_callback(err);
                        });
                      } else {
                        nlogger.debug('friend stream will not be added!');
                        w_callback(null);
                      }
                    },

                    // function getAllConnectionDetails(w_callback) {
                    //   async.parallel([
                    //       function getConnOfUserSendingFeedback(p_callback) {
                    //         getAllConnectionsForUser(userSendingFeedback, connectionProvider, p_callback);
                    //       },
                    //       function getConnOfUserReceivingFeedback(p_callback) {
                    //         getAllConnectionsForUser(userReceivingFeedback, connectionProvider, p_callback);
                    //       } ], w_callback);
                    // },

                    function insertStreams(w_callback) {

                      // if (userReceivingFeedback.isShadowUser)
                        // return w_callback(null);

                      async.forEach([postFeedback], function(feedback, fe_callback) {
                        // inserting feedback related information into the
                        // streams of connections
                        async.parallel([
                            function forConnUSF(p_callback) {
                              var streamObjUSF = streamProvider.createStreamData(userSendingFeedback._id,
                                      userReceivingFeedback._id,
                                      'feedbackSent', feedback.f_created_at,
                                      feedback._id);

                              // This is hack, ask Rishab to verify: 
                              // solve the issue when two user (not connected) cannot see updates on activity stream       
                              if (connUSF.indexOf(userReceivingFeedback._id) == -1)
                                connUSF.push(userReceivingFeedback._id);    

                              streamProvider.insertActivity(connUSF, streamObjUSF, p_callback);
                            },

                            function forConnURF(p_callback) {
                              var streamObjURF = streamProvider.createStreamData(userReceivingFeedback._id,
                                      userSendingFeedback._id,
                                      'feedbackReceived',
                                      feedback.f_created_at, feedback._id);

                              // This is hack, ask Rishab to verify: 
                              // solve the issue when two user (not connected) cannot see updates on activity stream     
                              if (connURF.indexOf(userSendingFeedback._id) == -1)
                                connURF.push(userSendingFeedback._id);  

                              streamProvider.insertActivity(connURF, streamObjURF, p_callback);
                            } ],

                        function p_result(err) {
                          fe_callback(err);
                        });
                      },

                      function fe_result(err) {
                        w_callback(err);
                      });

                    } ],

                function w_result(err, results) {
                  if (err) nlogger.error(err);
                });

              },

              // send email
              function sendFeedbackEmail(s_callback) {

                // background process, continue to run ahead
                s_callback();

                var mailContent = "";
                var subject = "";

                if (isLinkedInUser) {
                  subject = "I shared a feedback with you";
                  mailContent = createLinkedInFeedbackEmailContent(
                      userReceivingFeedback, req.headers.referer,
                      userSendingFeedback.firstName);
                  socialService.sendLinkedInMemberMessage(
                      userReceivingFeedback.linkedInId, subject, mailContent,
                      function(data, error) {
                        s_callback(error);
                      });
                } else {
                  subject = userSendingFeedback.firstName
                      + ' sent you feedback, curious?';
                  mailContent = createFeedbackEmailContent(userSendingFeedback, userReceivingFeedback, req.headers.referer, postFeedback.tags, postFeedback.comment);

                  nlogger.debug(userReceivingFeedback.emails);

                  var userReceivingFeedbackEmailObj = _.find(
                      userReceivingFeedback.emails, function(emailObj) {
                        return emailObj.primary;
                      });

                  userReceivingFeedbackEmail = null;

                  if (!_.isUndefined(userReceivingFeedbackEmailObj)) {
                    userReceivingFeedbackEmail = userReceivingFeedbackEmailObj.email;
                  }

                  if (!_.isString(userReceivingFeedbackEmail) && !_.isUndefined(userReceivingFeedback.emails))
                    userReceivingFeedbackEmail = userReceivingFeedback.emails[0].email;
                  
                  if (_.isUndefined(userReceivingFeedbackEmail)) {
                    s_callback("Unable to retrieve user's e-mail.")
                    return;
                  }

                  // Temporary stopped sending emails
                  mailService.send(userReceivingFeedbackEmail, subject,
                      mailContent, function(response, err) {
                        if (err) {
                          s_callback(err);
                        }
                      });
                }

              } ], function s_result(err, results) {
            if (err) {
		      nlogger.error(err);
			  return null;
			}
            res.json({
              status : err == null,
              errors : Array.isArray(err) ? err : [ err ],
              result : {}
            });
          });
};

route_skills.sendReminder = function(req, res) {

  if (!('user' in req.session)) { return req.app.get('responseHandler')(
      [ "User not logged" ], null, res); }

  var userSendingReminder = req.session.user;

  var userProvider = new UserProvider(req.app.get('mongoDbInstance'));

  async
      .waterfall(
          [

              function getUserInfo(w_callback) {
                userProvider.findById(req.body.userReceivingReminder._id,
                    w_callback);
              },
              function sendReminderMail(userReceivingReminder, w_callback) {
                var link = req.headers.origin;
                userReceivingReminder.firstName = userReceivingReminder.firstName ? userReceivingReminder.firstName
                    : '';
                var mailContent = 'Hi '
                    + userReceivingReminder.firstName
                    + ',<br><br>'
                    + userSendingReminder.firstName
                    + ' '
                    + userSendingReminder.lastName
                    + ' would like to remind you that they are waiting for your feedback on Far Better Me.<br><br>'
                    + '<a href="' + link + '#/feedbacks/sendFeedback/'
                    + userSendingReminder._id
                    + '">Click here to help them.</a>';

                mailService.send(userReceivingReminder.email,
                    'Farbetter.me : someone is waiting for your feedback',
                    mailContent, function(response, err) {
                      w_callback(err, true);
                    });

              } ], function w_result(err, result) {
            req.app.get('responseHandler')(err, result, res);
          });
};

route_skills.feedback = function(req, res) {
  if (req.params.feedbackId === undefined) { return req.app.get(
      'responseHandler')([ "No FeedbackId found" ], null, res); }

  if (!('user' in req.session)) { return req.app.get('responseHandler')(
      [ "User not logged" ], null, res); }

  var feedbackProvider = new FeedbackProvider(req.app.get('mongoDbInstance'));

  feedbackProvider.getFeedback(req.params.feedbackId, function(err, result) {
    req.app.get('responseHandler')(err, result, res);
  });

};

route_skills.feedbacks = function(req, res) {
  if (!('user' in req.session)) { return req.app.get('responseHandler')(
      [ "User not logged" ], null, res); }

  var feedbackProvider = new FeedbackProvider(req.app.get('mongoDbInstance'));
  // var connectionProvider = new ConnectionProvider(req.app.get('mongoDbInstance'));
  var userProvider = new UserProvider(req.app.get('mongoDbInstance'));

  async.waterfall([
    function getReceivedFeedbacks(w_callback) {
      feedbackProvider.getUserReceivedFeedbackList(req.session.user, {}, w_callback);
    },
    function makeList(feedbacks, w_callback) {
      var feedbacksWithUsers = [];
      async.forEach(feedbacks, function(feedback, fe_callback) {
        userProvider.findById(feedback.f_from, function(err, result) {
          feedbacksWithUsers.push({
            from: result,
            feedback: feedback
          });
          fe_callback(err);
        });  
      }, function fe_result(err) {
        function customSortByDate(a,b) {
          if (a.feedback.f_created_at > b.feedback.f_created_at)
             return -1;
          if (a.feedback.f_created_at < b.feedback.f_created_at)
            return 1;
          return 0;
        }

        feedbacksWithUsers.sort(customSortByDate);
        w_callback(feedbacksWithUsers);  
      });
      
    } //end of make list
  ], 
  function w_result(feedbacks) {
      req.app.get('responseHandler')(null, {
        generalFeedbacks: feedbacks
      }, res);  
  });
};

route_skills.tags = function(req, res) {
  if (!('user' in req.session)) { return req.app.get('responseHandler')(
    [ "User not logged" ], null, res); }

  var tagsProvider = new TagsProvider(req.app.get('mongoDbInstance'));
  
  tagsProvider.list(function(err, result) {
    req.app.get('responseHandler')(null, {
        tags: result
      }, res);  
  });
}

route_skills.getIndustryList = function(req, res) {

  var industries = [ "Accounting", "Airlines/Aviation",
      "Alternative Dispute Resolution", "Alternative Medicine", "Animation",
      "Apparel & Fashion", "Architecture & Planning", "Arts and Crafts",
      "Automotive", "Aviation & Aerospace", "Banking", "Biotechnology",
      "Broadcast Media", "Building Materials",
      "Business Supplies and Equipment", "Capital Markets", "Chemicals",
      "Civic & Social Organization", "Civil Engineering",
      "Commercial Real Estate", "Computer & Network Security",
      "Computer Games", "Computer Hardware", "Computer Networking",
      "Computer Software", "Construction", "Consumer Electronics",
      "Consumer Goods", "Consumer Services", "Cosmetics", "Dairy",
      "Defense & Space", "Design", "Education Management", "E-Learning",
      "Electrical/Electronic Manufacturing", "Entertainment",
      "Environmental Services", "Events Services", "Executive Office",
      "Facilities Services", "Farming", "Financial Services", "Fine Art",
      "Fishery", "Food & Beverages", "Food Production", "Fund-Raising",
      "Furniture", "Gambling & Casinos", "Glass, Ceramics & Concrete",
      "Government Administration", "Government Relations", "Graphic Design",
      "Health, Wellness and Fitness", "Higher Education",
      "Hospital & Health Care", "Hospitality", "Human Resources",
      "Import and Export", "Individual & Family Services",
      "Industrial Automation", "Information Services",
      "Information Technology and Services", "Insurance",
      "International Affairs", "International Trade and Development",
      "Internet", "Investment Banking", "Investment Management", "Judiciary",
      "Law Enforcement", "Law Practice", "Legal Services",
      "Legislative Office", "Leisure, Travel & Tourism", "Libraries",
      "Logistics and Supply Chain", "Luxury Goods & Jewelry", "Machinery",
      "Management Consulting", "Maritime", "Marketing and Advertising",
      "Market Research", "Mechanical or Industrial Engineering",
      "Media Production", "Medical Devices", "Medical Practice",
      "Mental Health Care", "Military", "Mining & Metals",
      "Motion Pictures and Film", "Museums and Institutions", "Music",
      "Nanotechnology", "Newspapers", "Nonprofit Organization Management",
      "Oil & Energy", "Online Media", "Outsourcing/Offshoring",
      "Package/Freight Delivery", "Packaging and Containers",
      "Paper & Forest Products", "Performing Arts", "Pharmaceuticals",
      "Philanthropy", "Photography", "Plastics", "Political Organization",
      "Primary/Secondary Education", "Printing",
      "Professional Training & Coaching", "Program Development",
      "Public Policy", "Public Relations and Communications", "Public Safety",
      "Publishing", "Railroad Manufacture", "Ranching", "Real Estate",
      "Recreational Facilities and Services", "Religious Institutions",
      "Renewables & Environment", "Research", "Restaurants", "Retail",
      "Security and Investigations", "Semiconductors", "Shipbuilding",
      "Sporting Goods", "Sports", "Staffing and Recruiting", "Supermarkets",
      "Telecommunications", "Textiles", "Think Tanks", "Tobacco",
      "Translation and Localization", "Transportation/Trucking/Railroad",
      "Utilities", "Venture Capital & Private Equity", "Veterinary",
      "Warehousing", "Wholesale", "Wine and Spirits", "Wireless",
      "Writing and Editing" ];

  return req.app.get('responseHandler')(null, industries, res);
};

// very poor implementation, needs serious refactor
var getAllConnectionsForUser = function(user, connectionProvider, callback) {

  async.waterfall([
      function getAllConnectionIds(w_callback) {

        connectionProvider.getConnectionsForUser(user, function(err, result) {

          if (err) {
            w_callback(err);
          } else {
            var connArr = [];
            result.forEach(function(connObj) {
              connArr.push(connObj.conn_to);
            });
            w_callback(null, connArr);
          }
        });
      },
      function checkReverseConnectionStatus(users, w_callback) {

        var connArr = [];
        async.forEach(users, function(user_id, fe_callback) {
          var connFrom = {
            _id : user_id
          };
          var connTo = {
            _id : user._id
          };
          connectionProvider.findConnectionStatus(connFrom, connTo, function(
              err, result) {
            if (!err && result && !_.isUndefined(result._id)) {
              connArr.push(user_id);
            }
            fe_callback(err);
          });
        }, function map_result(err) {
          w_callback(err, connArr);
        });
      }

  ], function w_result(err, connArr) {
    callback(err, connArr);
  });
};

module.exports = route_skills;
