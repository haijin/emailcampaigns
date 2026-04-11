"""
TES Email Campaign Service - Python FastAPI
Handles bulk email delivery with rate limiting and status callbacks.
"""

import asyncio
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

import aiohttp
import aiosmtplib
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

app = FastAPI(title="TES Email Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", os.getenv("NEXTJS_APP_URL", "")],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Config ────────────────────────────────────────────────────────────────────

SMTP_HOST     = os.getenv("SMTP_HOST",     "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER     = os.getenv("SMTP_USER",     "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_USE_TLS  = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
SEND_RATE     = float(os.getenv("SEND_RATE", "2"))   # emails per second
NEXTJS_APP_URL = os.getenv("NEXTJS_APP_URL", "http://localhost:3000")

# ── Models ────────────────────────────────────────────────────────────────────

class Recipient(BaseModel):
    id: str
    email: str
    name: Optional[str] = ""


class SendRequest(BaseModel):
    campaign_id: str
    from_name: str
    from_email: str
    reply_to: Optional[str] = None
    subject: str
    html_content: str
    text_content: Optional[str] = None
    recipients: list[Recipient]
    callback_url: Optional[str] = None


class StatusUpdate(BaseModel):
    id: str
    status: str
    sent_at: Optional[str] = None
    error_message: Optional[str] = None
    message_id: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def personalise(template: str, name: str) -> str:
    """Replace {{name}} placeholders."""
    return re.sub(r"\{\{\s*name\s*\}\}", name or "Agent", template)


async def send_single_email(
    smtp: aiosmtplib.SMTP,
    from_name: str,
    from_email: str,
    reply_to: Optional[str],
    subject: str,
    html_content: str,
    text_content: Optional[str],
    recipient: Recipient,
) -> tuple[bool, Optional[str], Optional[str]]:
    """Send one email. Returns (success, message_id, error)."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"]  = subject
        msg["From"]     = f"{from_name} <{from_email}>"
        msg["To"]       = recipient.email
        msg["Message-ID"] = f"<{uuid.uuid4()}@tes-campaigns>"
        if reply_to:
            msg["Reply-To"] = reply_to

        if text_content:
            text_body = personalise(text_content, recipient.name or "")
            msg.attach(MIMEText(text_body, "plain", "utf-8"))

        html_body = personalise(html_content, recipient.name or "")
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        await smtp.send_message(msg)
        return True, msg["Message-ID"], None

    except Exception as exc:
        return False, None, str(exc)


async def post_status_update(
    session: aiohttp.ClientSession,
    callback_url: str,
    updates: list[dict],
) -> None:
    """POST batch status updates back to Next.js."""
    try:
        async with session.post(callback_url, json=updates, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            if resp.status >= 400:
                text = await resp.text()
                log.warning("Callback %s returned %d: %s", callback_url, resp.status, text[:200])
    except Exception as exc:
        log.error("Callback failed: %s", exc)


async def send_campaign_batch(request: SendRequest) -> None:
    """Background task: connect SMTP once, iterate recipients, callback every 10."""
    log.info(
        "Starting campaign %s – %d recipients",
        request.campaign_id,
        len(request.recipients),
    )

    callback_url = request.callback_url or (
        f"{NEXTJS_APP_URL}/api/campaigns/{request.campaign_id}/recipients"
    )

    smtp = aiosmtplib.SMTP(hostname=SMTP_HOST, port=SMTP_PORT, use_tls=False)
    try:
        await smtp.connect()
        if SMTP_USE_TLS:
            await smtp.starttls()
        if SMTP_USER and SMTP_PASSWORD:
            await smtp.login(SMTP_USER, SMTP_PASSWORD)
    except Exception as exc:
        log.error("SMTP connection failed: %s", exc)
        # Mark all recipients as failed
        now = datetime.now(timezone.utc).isoformat()
        async with aiohttp.ClientSession() as session:
            updates = [
                StatusUpdate(
                    id=r.id,
                    status="failed",
                    sent_at=now,
                    error_message=f"SMTP connection failed: {exc}",
                ).model_dump()
                for r in request.recipients
            ]
            await post_status_update(session, callback_url, updates)
        return

    delay = 1.0 / SEND_RATE  # seconds between each email

    async with aiohttp.ClientSession() as http_session:
        batch: list[dict] = []

        for recipient in request.recipients:
            success, message_id, error = await send_single_email(
                smtp,
                request.from_name,
                request.from_email,
                request.reply_to,
                request.subject,
                request.html_content,
                request.text_content,
                recipient,
            )

            now = datetime.now(timezone.utc).isoformat()
            status_update = StatusUpdate(
                id=recipient.id,
                status="sent" if success else "failed",
                sent_at=now,
                error_message=error,
                message_id=message_id,
            )
            batch.append(status_update.model_dump())
            log.info("%-6s  %s", "OK" if success else "FAIL", recipient.email)

            # Flush every 10 updates
            if len(batch) >= 10:
                await post_status_update(http_session, callback_url, batch)
                batch = []

            await asyncio.sleep(delay)

        # Flush remainder
        if batch:
            await post_status_update(http_session, callback_url, batch)

    try:
        await smtp.quit()
    except Exception:
        pass

    log.info("Campaign %s complete", request.campaign_id)


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "TES Email Service"}


@app.post("/send")
async def send_campaign(request: SendRequest, background_tasks: BackgroundTasks):
    """Kick off a campaign send in the background."""
    if not request.recipients:
        raise HTTPException(status_code=400, detail="No recipients provided")

    background_tasks.add_task(send_campaign_batch, request)

    return {
        "accepted": True,
        "campaign_id": request.campaign_id,
        "recipient_count": len(request.recipients),
    }


@app.post("/send/test")
async def send_test_email(
    to_email: str,
    from_name: str = "TES Campaigns",
    from_email: str = "",
    subject: str = "Test email from TES Campaigns",
    html_content: str = "<p>This is a test email.</p>",
):
    """Send a single test email to verify SMTP settings."""
    from_email = from_email or SMTP_USER

    class FakeRecipient:
        id = "test"
        email = to_email
        name = "Test User"

    smtp = aiosmtplib.SMTP(hostname=SMTP_HOST, port=SMTP_PORT, use_tls=False)
    await smtp.connect()
    if SMTP_USE_TLS:
        await smtp.starttls()
    if SMTP_USER and SMTP_PASSWORD:
        await smtp.login(SMTP_USER, SMTP_PASSWORD)

    success, msg_id, error = await send_single_email(
        smtp, from_name, from_email, None, subject, html_content, None, FakeRecipient()  # type: ignore
    )
    await smtp.quit()

    if success:
        return {"success": True, "message_id": msg_id}
    raise HTTPException(status_code=500, detail=error)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
