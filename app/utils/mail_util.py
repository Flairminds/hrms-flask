import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app

class MailUtil:
    """Utility class for sending SMTP emails using Python's smtplib."""

    @staticmethod
    def send_email(to_email, subject, body, is_html=False):
        """
        Sends an email using the SMTP configuration defined in current_app.config.
        Supports both plain text and HTML formats.
        """
        try:
            # Create a multipart message or plain message depending on need
            msg = MIMEMultipart()
            msg['From'] = current_app.config['MAIL_DEFAULT_SENDER']
            msg['To'] = to_email
            msg['Subject'] = subject

            # Attach the email body
            msg.attach(MIMEText(body, 'html' if is_html else 'plain'))

            # Setup SMTP server connection
            server = smtplib.SMTP(current_app.config['MAIL_SERVER'], current_app.config['MAIL_PORT'])
            server.starttls() # Enable security
            server.login(current_app.config['MAIL_USERNAME'], current_app.config['MAIL_PASSWORD'])
            
            # Send the email
            server.send_message(msg)
            server.quit()
            return True
        except Exception as e:
            # Use app logger if available or simple print for migration phase
            print(f"Failed to send email to {to_email}: {e}")
            return False
