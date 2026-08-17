"""
Custom Django email backend that sends via Brevo's transactional email API
instead of SMTP. Used in production; development uses the console backend
for fast iteration without hitting the network.
"""
import requests
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend


class BrevoAPIBackend(BaseEmailBackend):
    API_URL = "https://api.brevo.com/v3/smtp/email"

    def send_messages(self, email_messages):
        if not email_messages:
            return 0

        api_key = getattr(settings, "BREVO_API_KEY", "")
        if not api_key:
            if not self.fail_silently:
                raise ValueError("BREVO_API_KEY is not set.")
            return 0

        sent_count = 0
        headers = {
            "accept": "application/json",
            "api-key": api_key,
            "content-type": "application/json",
        }

        for message in email_messages:
            payload = {
                "sender": {"email": message.from_email},
                "to": [{"email": addr} for addr in message.to],
                "subject": message.subject,
                "textContent": message.body,
            }
            try:
                response = requests.post(self.API_URL, json=payload, headers=headers, timeout=10)
                if response.status_code in (200, 201):
                    sent_count += 1
                elif not self.fail_silently:
                    response.raise_for_status()
            except requests.RequestException:
                if not self.fail_silently:
                    raise

        return sent_count