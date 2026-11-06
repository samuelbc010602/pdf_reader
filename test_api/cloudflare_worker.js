
// Cloudflare Email Worker.
// Receives incoming emails and forwards the complete
// raw MIME message to your Python application.

export default {
    async email(message, env, ctx) {
      if (!env.PYTHON_WEBHOOK_URL || !env.WEBHOOK_SECRET) {
        message.setReject("Email processing is not configured.");
        return;
      }
  
      try {
        // Read the complete email, including PDF attachments.
        const rawEmail = await message.raw.arrayBuffer();
  
        const response = await fetch(env.PYTHON_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "message/rfc822",
            "X-Webhook-Secret": env.WEBHOOK_SECRET,
            "X-Envelope-From": message.from,
            "X-Envelope-To": message.to,
          },
          body: rawEmail,
        });
  
        if (!response.ok) {
          const body = await response.text();
          console.error(
            "Python email webhook failed:",
            response.status,
            body
          );
  
          message.setReject(
            "Could not process this email. Please try again later."
          );
          return;
        }
  
        console.log("Inbound email delivered successfully", {
          from: message.from,
          to: message.to,
          rawSize: message.rawSize,
          status: response.status,
        });
  
      } catch (error) {
        console.error("Email forwarding failed:", error);
  
        message.setReject(
          "Email processing failed. Please try again later."
        );
      }
    },
  };
  