/**
 * 
 */
var nlogger = require('nlogger').logger(module);
var bcrypt = require("bcrypt");
var fbm = require('../../../app/');
var async = require('async');
var _ = require('underscore');

var mongoDbInstance = new fbm.libs.MongoDbLib({
  "mongoUri" : fbm.config.mongoUri
});

var TokenProvider = fbm.models.tokens.TokenProvider;

describe('TokenProvider', function() {
  var tokenProvider = null;

  it('should first get the mongoDbInstance running', function(done) {
    mongoDbInstance.conn(function(err, db) {
      if (err) {
        nlogger.error('MongoDb is Screwed');
      } else {
        tokenProvider = new TokenProvider(mongoDbInstance);
      }
      done();
    });
  });

  it('createTokenData should create a token data', function(done) {
    var type = 'fpToken';
    var data = {
      "userId" : "50f3c4ac03ae45a20a000001"
    };
    var token = tokenProvider.createTokenData(type, data);

    expect(token.type).toEqual('fpToken');
    expect(token.data).toEqual(data);

    done();
  });

  it('saveToken should save the token data', function(done) {
    var type = 'fpToken';
    var data = {
      "userId" : "50f3c4ac03ae45a20a000001"
    };

    var valid = true;
    var token = tokenProvider.createTokenData(type, data, true);

    tokenProvider.saveToken(token, function(err, result) {
      expect(err).toBe(null);
      done();
    });

  });

  it('findTokenById should be able to retrieve the saved token data', function(
      done) {
    var type = 'fpToken';
    var data = {
      "userId" : "50f3c4ac03ae45a20a000001"
    };

    var valid = true;
    var token = tokenProvider.createTokenData(type, data, true);

    tokenProvider.saveToken(token, function(err, result) {
      expect(err).toBe(null);
      result = result[0];
      var tokenId = String(result._id.valueOf());
      tokenProvider.findTokenById(tokenId, function(err2, resultToken) {
        expect(err2).toBe(null);
        expect(resultToken.type).toBe(token.type);
        expect(resultToken.data).toEqual(token.data);
        done();
      });
    });
  });

  it('update should be able to update a saved token data', function(done) {
    var type = 'fpToken';
    var data = {
      "userId" : "50f3c4ac03ae45a20a000001"
    };

    var token = tokenProvider.createTokenData(type, data);

    var tokenId = null;
    var tokenResult = null;
    async.series([

    function saveToken(s_callback) {
      tokenProvider.saveToken(token, function(err, result) {
        expect(err).toBe(null);
        tokenResult = result[0];
        tokenId = String(tokenResult._id.valueOf());
        s_callback();
      });
    },

    function update(s_callback) {
      setTimeout(function() {

        tokenResult.valid = false;
        tokenProvider.update(tokenResult, function(err) {
          expect(err).toBe(null);
          s_callback();
        });

      }, 1000);
    },

    function confirmUpdate(s_callback) {
      tokenProvider.findTokenById(tokenId, function(err, _token) {
        expect(err).toBe(null);
        expect(_token.type).toBe(tokenResult.type);
        expect(_token.data).toEqual(tokenResult.data);
        expect(_token.valid).toEqual(tokenResult.valid);
        expect(_token.created_at).toEqual(tokenResult.created_at);
        expect(_token.updated_at).toBeGreaterThan(tokenResult.updated_at);
        s_callback();
      });
    } ],

    function s_result() {
      done();
    });

  });

  it('should end the mongoDbInstance', function(done) {
    mongoDbInstance.close(function(err) {
      done();
    });
  });

});
