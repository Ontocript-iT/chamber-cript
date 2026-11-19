import nodemailer from 'nodemailer';

// Nodemailer Transporter එක සෑදීම
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // Port 587 සඳහා false විය යුතුය
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

export const sendStaffInviteEmail = async (email: string, tempPass: string, role: string) => {
    try {
        const mailOptions = {
            from: '"Chambercript Admin" <ontocriptit@gmail.com>',
            to: email,
            subject: "Your Law Firm Account Access",
            html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">Welcome to the Law Firm Management System</h2>
          <p>You have been added to the system as a <b>${role}</b>.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><b>Login Email:</b> ${email}</p>
            <p style="margin: 5px 0;"><b>Temporary Password:</b> <span style="color: #d97706; font-size: 18px;">${tempPass}</span></p>
          </div>
          <p>Please log in and change your password immediately. After that, you will be prompted to set up your 6-digit security PIN.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
          <p style="font-size: 12px; color: #9ca3af;">This is an automated message. Please do not reply.</p>
        </div>
      `,
        };

        // Email එක යැවීම
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent: " + info.messageId);
        return true;

    } catch (error) {
        console.error("Error sending email: ", error);
        throw new Error("Failed to send invitation email.");
    }
};