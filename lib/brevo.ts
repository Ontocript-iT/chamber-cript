import nodemailer from 'nodemailer';

export const sendStaffInviteEmail = async (email: string, tempPass: string, role: string) => {
    try {
        const host = process.env.SMTP_HOST;
        const port = Number(process.env.SMTP_PORT) || 587;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASSWORD;

        if (!host || !user || !pass) {
            throw new Error(
                `Missing SMTP env vars on server -> SMTP_HOST: ${!!host}, SMTP_USER: ${!!user}, SMTP_PASSWORD: ${!!pass}`
            );
        }

        // Request එක එන අවස්ථාවේදීම Live Environment Variables සමඟ Transporter සෑදීම
        const transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465, // Port 587 සඳහා false වේ
            auth: {
                user,
                pass,
            },
        });

        const mailOptions = {
            from: '"Chambercript Admin" <ontocriptit@gmail.com>',
            to: email,
            subject: 'Your Law Firm Account Access',
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

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.messageId);
        return true;
    } catch (error: any) {
        console.error('Error sending email: ', error);
        throw new Error(error?.message || 'Failed to send invitation email.');
    }
};