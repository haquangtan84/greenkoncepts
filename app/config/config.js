var config = {
  "listening_port" : 8124,
  "local_url" : "http://88.179.53.123:8124",
  "mongoUri" : process.env.MONGOLAB_URI || process.env.MONGOHQ_URL
      || 'mongodb://localhost:27017/fbm?auto_reconnect',
  linkedin: {
  	"consumerKey": "h714z1b25amg",
  	"consumerSecret": "qk1lVmjtqr24zvZB",
  	"scope": ["r_basicprofile", "r_emailaddress", "r_network", "w_messages"]
  }    
};

module.exports = config;
