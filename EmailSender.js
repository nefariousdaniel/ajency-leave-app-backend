var nodemailer = require('nodemailer');



exports.SendEmail = async (event) => {


    var transporter = nodemailer.createTransport({
        host: "smtp-mail.outlook.com", // hostname
        secureConnection: false, // TLS requires secureConnection to be false
        port: 587, // port for secure SMTP
        tls: {
            ciphers: 'SSLv3'
        },
        auth: {
            user: 'leavemanagementapp@outlook.com',
            pass: 'qwertyuiop1234567890'
        }
    });

    var mailOptions = {
        from: 'leavemanagementapp@outlook.com', // sender address (who sends)
        to: event.to, // list of receivers (who receives)
        subject: event.subject, // Subject line
        html: event.emailbody // html body
    };

    await transporter.sendMail(mailOptions);
    return { "status": "OK", "message": "Successful" };
};
