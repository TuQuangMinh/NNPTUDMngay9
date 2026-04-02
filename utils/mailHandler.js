const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 25,
    secure: false, // Use true for port 465, false for port 587
    auth: {
        user: "e30d15859c496f",

        pass: "be8b4985b87cb8",
    },
});
module.exports = {
    sendMail: async function (to, url) {
        const info = await transporter.sendMail({
            from: 'hehehe@gmail.com',
            to: to,
            subject: "reset password URL",
            text: "click vao day de doi pass", // Plain-text version of the message
            html: "click vao <a href=" + url + ">day</a> de doi pass", // HTML version of the message
        });

        console.log("Message sent:", info.messageId);
    },
    sendUserPassword: async function (to, password) {
        const info = await transporter.sendMail({
            from: 'hehehe@gmail.com',
            to: to,
            subject: "Tài khoản mới của bạn",
            text: `Chào bạn,\n\nTài khoản của bạn đã được tạo.\nUsername: ${to}\nPassword: ${password}\n\nVui lòng đổi mật khẩu sau khi đăng nhập.`,
            html: `<p>Chào bạn,</p><p>Tài khoản của bạn đã được tạo.</p><p><strong>Password:</strong> ${password}</p><p>Vui lòng đổi mật khẩu sau khi đăng nhập.</p>`,
        });
        console.log("User password email sent:", info.messageId);
    }
}
