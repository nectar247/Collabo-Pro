import nodemailer from 'nodemailer';


export async function POST(request: Request) {
  const { name, email, subject, message } = await request.json();

  if (!name || !email || !subject || !message) {
      return Response.json({ status: false, message: 'Missing required fields', data: null });
  }

  try {
      const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || '',
          port: Number(process.env.SMTP_PORT) || 465,
          secure: true, // true for port 465, false for other ports
          auth: {
              user: process.env.SMTP_USER || '',
              pass: process.env.SMTP_PASSWORD || '',
          },
      });

      let sendMessage = `
        From: ${name} ${email}
        Message: ${message}
      `;

      // send mail with defined transport object
      const info = await transporter.sendMail({
          from: `"Website" <hello@shop4vouchers.co.uk>`, // sender address
          to: "hello@shop4vouchers.co.uk", // recipient
          subject: subject, // Subject line
          text: sendMessage, // plain text body
          html: `<p>${sendMessage}</p>`, // HTML body
      });

      console.log("Message sent: %s", info.messageId);

      return Response.json({ status:true, message: 'Email sent successfully!', data: null });
  } catch (error) {
      console.error("Error sending email:", error);
      return Response.json({ status: false, message: 'Internal Server Error', data: null });
  }

}