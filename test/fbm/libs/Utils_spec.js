var nlogger = require('nlogger').logger(module);
var fbm = require('../../../app/');
var async = require('async');
var _ = require('underscore');

var Utils = fbm.libs.Utils;

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

describe('cleanUserObj', function() {

  it('should clean the emails object', function(done) {

    var tempEmail = util.randStr(6) + "@" + util.randStr(8) + ".com";
    var user = {
      "firstName" : util.randStr(10),
      "lastName" : util.randStr(8),
      "emails" : [ {
        email : tempEmail
      } ],
      "password" : util.randStr(8),
    };

    var newUserObj = Utils.cleanUserObj(user);

    var emailObjs = _.where(newUserObj.emails, {
      email : tempEmail
    });

    expect(emailObjs.length).toBeGreaterThan(0);

    expect(emailObjs[0].email).toBe(tempEmail);
    expect(emailObjs[0].verified).not.toBe(undefined);
    expect(emailObjs[0].verified).toBe(false);

    done();
  });

  it('should remove the email key-value pair and append it to key:emails',
      function(done) {
        var user = {
          "firstName" : util.randStr(10),
          "lastName" : util.randStr(8),
          "email" : util.randStr(6) + "@" + util.randStr(8) + ".com",
          "password" : util.randStr(8),
        };

        var newUserObj = Utils.cleanUserObj(user);

        expect(newUserObj.email).toBe(undefined);
        expect(newUserObj.emails).not.toBe(undefined);
        expect(newUserObj.emails.length).toBeGreaterThan(0);

        var emailObjs = _.where(newUserObj.emails, {
          email : user.email
        });

        expect(emailObjs.length).toBeGreaterThan(0);
        expect(emailObjs[0].email).toBe(user.email);
        expect(emailObjs[0].verified).toBe(false);

        done();
      });

  // TODO a lot of tests needed for this utility function

});
