var nlogger = require('nlogger').logger(module);

var _ = require('underscore');

/**
 * @param user
 *          Object
 * @param overrideFlg
 *          Boolean
 */
module.exports.cleanUserObj = function cleanUserObj(user, overrideFlg) {
  var _user = _.clone(user);

  _user.emails = _user.emails || [];

  // clean emails
  _.each(_user.emails, function(emailObj, index) {
    emailObj.verified = _.isBoolean(emailObj.verified) ? emailObj.verified
        : false;
  });

  // removing email
  if (_user.email) {
    if (_.where(_user.emails, {
      email : user.email
    }).length == 0) {
      _user.emails.push({
        email : _user.email,
        verified : false
      });
    }

    delete _user.email;
  }

  if (_user._id && !_.isString(_user._id)) {
    _user.id = String(_user._id.valueOf());
  }

  if (_user.password && (user.hash && user.salt)) {
    delete _user.password;
  }

  if (overrideFlg) {
    return user = _user;
  } else {
    return _user;
  }

};
