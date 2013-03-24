var nodemailer = require('nodemailer');
// TODO : ugly basic impl, to be widely reviewed...

var smtpTransport = nodemailer.createTransport("SMTP", {
  // TODO : conf !
  host : 'in.mailjet.com',
  secureConnection : true,
  port : 465, // port for secure SMTP
  auth : {
    user : "5e6fed5d1b5fc0e88de85c914382f91f",
    pass : "1dc2a4932bf2f1146513063b11d4dd23"
  }
});

var buildEmail = function(recipients, subject, content) {
  return {
    from : 'Farbetter.me <nini@farbetter.me>', // TODO : conf !
    to : recipients,
    subject : subject, // Subject line
    text : content, // TODO !!!!!!
    html : content
  }
};

exports.send = function(recipients, subject, content, callback) {
  var email = buildEmail(recipients, subject, content);

  if (process.env.NODE_ENV == "test") {
    app.set("emails", []);

    smtpTransport.sendMail = function(m_email, m_callback) {
      app.get("emails").push(m_email); // store email in app's viriable
      m_callback();
    };
  }

  smtpTransport.sendMail(email, function(error, response) {
    if (error) {
      callback(null, error);
    } else {
      callback(response, null);
    }

    smtpTransport.close(); // TODO to be reviewed...
  });
};