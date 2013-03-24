var nlogger = logger = require('nlogger').logger(module);
var bcrypt = require("bcrypt");
var fbm = require('../../../app/');
var async = require('async');
var _ = require('underscore');

/**
 * util function
 */
var util = {
  randStr : function(length) {
    var text = "";
    var possible = "abcdefghijklmnopqrstuvwxyz0123456789";
    for ( var i = 0; i < length; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
  }
};

var mongoDbInstance = new fbm.libs.MongoDbLib({
  "mongoUri" : fbm.config.mongoUri
});

var UserProvider = fbm.models.users.UserProvider;
var FeedbackProvider = fbm.models.feedbacks.FeedbackProvider;
var mailService = fbm.services.mailService;

describe("FeedbackProvider", function() {

  var user = {
    "firstName" : util.randStr(10),
    "lastName" : util.randStr(8),
    "email" : util.randStr(6) + "@" + util.randStr(8) + ".com",
    "password" : util.randStr(8),
  };

  var existingUser = {
    "firstName" : util.randStr(10),
    "lastName" : util.randStr(8),
    "email" : util.randStr(6) + "@" + util.randStr(8) + ".com",
    "password" : util.randStr(8),
  };

  var feedback = {
    "f_to" : 0,
    "feedback" : "some feedback here"
  };

  var userProvider = null;
  var feedbackProvider = null;

  it('should first get the mongoDbInstance running', function(done) {
    mongoDbInstance.conn(function(err, db) {
      if (err) {
        nlogger.error('MongoDb is Screwed');
      } else {
        userProvider = new UserProvider(mongoDbInstance);
        feedbackProvider = new FeedbackProvider(mongoDbInstance);
      }
      done();
    });
  });

  it("should check user's email in DB before send him feedback",
      function(done) {
        userProvider.findByUserId(user.email, function(err, result) {
          expect(result).toEqual(null);
          done();
        });
      });

  // it("should check user's LinkedIn ID in DB before send him feedback",
  // function(done) {
  // //findByLinkedInId is not implemented in UserProvider
  // userProvider.findByLinkedInId(user.email, function(err, result) {
  // expect(result).toEqual(null);
  // done();
  // });
  // });

  it("should create shadow user", function(done) {
    user.salt = bcrypt.genSaltSync(10);
    user.hash = bcrypt.hashSync(user.password, user.salt);
    delete user.password;

    // console.log("Shadow user before save: ", user);

    async.series([ function createShowUser(s_callback) {
      // console.log(">>> Create Shadow User");
      userProvider.createShadowUser({
        email : user.email
      }, function(err, res) {
        expect(err).toEqual(null);
        expect(res.emails[0].email).toEqual(user.email);
        user = res;
        s_callback(err);
      });
    },

    function retrieveShadowUser(s_callback) {
      // console.log(">>> Retrieve Shadow User");

      var email = user.emails[0].email;
      userProvider.findByUserId(email, function(err, result) {
        // console.log("Error on find: ", err);
        expect(err).toEqual(null);
        user = result;

        // console.log("Shadow user after saving: ", user);
        expect(user.isShadowUser).toEqual(true);

        s_callback(err);
      });
    } ], function s_result(err) {
      expect(err).toBe(null);
      done();
    }); // end async
  });

  it('should record feedback for shadow user', function(done) {
    feedback.f_to = user._id;
    feedbackProvider.saveFeedback(feedback, function(err, result) {
      expect(err).toEqual(null);
      done();
    });
  });

  it('should retreive feedbacks for a user', function(done) {
    feedbackProvider.getUserReceivedFeedbackList(user, {},
        function(err, result) {
          expect(result.length).toBeGreaterThan(0);
          var f = result[0];
          expect(f.f_to).toEqual(user._id);
          done();
        });
  });

  xit('should send email to shadow user with feedback', function(done) {
    // console.log(">>> Sending email...");

    var mailResponse;

    var email = user.emails[0].email;

    mailService.send(email, 'Farbetter.me : someone sent you feedback',
        feedback.feedback, function(response, err) {
          expect(err).toBe(null);
          mailResponse = response;
          // console.log(">>> Result from send email: ", response);
        });

    waitsFor(function() {
      done();
      return mailResponse !== undefined;
    }, "should return result after sending email", 10000);

  });

  it('should end the mongoDbInstance', function(done) {
    mongoDbInstance.close(function(err) {
      done();
    });
  });

});
