from datetime import datetime, timedelta, timezone
from contextlib import closing
from celery_app import celery

from database import (
    get_connection,
    create_contract,
    get_signer,
    update_signer,
    refresh_contract_status,
    get_next_ordered_signer,
    claim_due_signers,
    get_userid
)

from services.gmail_signer import (
    send_pdf_for_signing,
    check_for_signed_pdf,
    send_to_signits,
    check_signits_status,
    download_signits_pdf
)


# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

EMAIL_POLL_INTERVAL = 15
EID_POLL_INTERVAL = 15

# If a worker crashes, the signer becomes eligible
# for another check after this lease expires.
TASK_LEASE_SECONDS = 120

# How many signers the dispatcher schedules per run.
DISPATCH_BATCH_SIZE = 100


def utc_now():
    return datetime.now(timezone.utc)


# --------------------------------------------------
# START NEXT ORDERED SIGNER
# --------------------------------------------------

def start_next_ordered_signer(contract_id):

    signer_id = get_next_ordered_signer(contract_id)

    if signer_id is not None:

        start_signer_email.delay(signer_id)

        print(
            f"Started next signer: {signer_id}",
            flush=True
        )


# --------------------------------------------------
# CREATE CONTRACT
# --------------------------------------------------

@celery.task(
    bind=True,
    name="signing.send_contract"
)
def send_contract_task(
    self,
    pdf_path,
    title,
    username,
    mail,
    sign_method,
    signers,
    ordering_matters,
    waitForPDF
):
    user_id = get_userid(username,mail)
    if not signers:
        raise ValueError("At least one signer is required.")

    self.update_state(
        state="PROGRESS",
        meta={
            "message": "Creating contract"
        }
    )

    # Create contract and all signer records in PostgreSQL.
    contract_id, signer_ids = create_contract(
        user_id=user_id,
        title=title,
        username=username,
        mail=mail,
        sign_method=sign_method,
        ordering_matters=ordering_matters,
        pdf_path=pdf_path,
        signers=signers
    )

    print(
        f"Created contract {contract_id} "
        f"with {len(signer_ids)} signers.",
        flush=True
    )

    # ORDERED SIGNING:
    # Only start the first signer.
    if ordering_matters:

        start_signer_email.delay(signer_ids[0],waitForPDF)

    # UNORDERED SIGNING:
    # Start all signers independently.
    else:

        for signer_id in signer_ids:
            start_signer_email.delay(signer_id,waitForPDF)
    print("finished calling start_signer_email for signer_ids:",signer_ids)
    return {
        "contract_id": contract_id,
        "status": "pending",
        "total_signers": len(signer_ids)
    }


# --------------------------------------------------
# SEND EMAIL TO ONE SIGNER
# --------------------------------------------------

@celery.task(
    name="signing.start_signer_email"
)
def start_signer_email(signer_id,waitForPDF):
    print("start_signer_email",signer_id)
    print("this is waitForPDF",waitForPDF)
    signer = get_signer(signer_id)

    if not signer:
        return {"status": "signer_not_found"}

    # Atomically claim the signer.
    # This prevents two workers from sending the same email
    # simultaneously.
    with closing(get_connection()) as conn:
        with conn:
            with conn.cursor() as cursor:

                cursor.execute("""
                    UPDATE contract_signers

                    SET status = 'sending_email',
                        updated_at = NOW()

                    WHERE signer_id = %s
                    AND status = 'queued'

                    RETURNING signer_id;
                """, (signer_id,))

                claimed = cursor.fetchone()

    if not claimed:
        return {"status": "already_started"}

    try:
        if waitForPDF:
            send_pdf_for_signing( #sending contract specific signer (signer_id)
                signer["pdf_path"],
                signer["title"],
                signer["username"],
                signer["mail"],
                signer["sign_method"],
                signer["name"],
                signer["email"],
                signer["email_reference"]
            )
        else:
            send_to_signits(
                signer["sign_method"],
                signer["name"],
                signer["email"],
                signer["username"],
                signer["mail"],
                signer["pdf_path"],
                signer["title"])
            
        #TODO: fix this, this should accurately switch to awaiting_eid_approval
        print("updating signer with waitForPDF",waitForPDF,"awaiting_email" if waitForPDF == True else "awaiting_eid_approval")
        update_signer(
            signer_id,

            status="awaiting_email" if waitForPDF else "awaiting_eid_approval",

            email_sent_at=utc_now(),

            next_check_at=(
                utc_now()
                + timedelta(seconds=EMAIL_POLL_INTERVAL)
            ),

            last_checked_at=None,
            error=None
        )

        refresh_contract_status(
            signer["contract_id"]
        )

        return {
            "status": "awaiting_email",
            "signer_id": signer_id
        }

    except Exception as exc:

        update_signer(
            signer_id,
            status="failed",
            next_check_at=None,
            error=str(exc)
        )

        refresh_contract_status(
            signer["contract_id"]
        )

        raise


# --------------------------------------------------
# CHECK ONE SIGNER
# --------------------------------------------------

@celery.task(
    name="signing.check_signer"
)
def check_signer(signer_id):

    signer = get_signer(signer_id)

    if not signer:
        return {"status": "signer_not_found"}

    current_status = signer["status"]

    # ==============================================
    # STAGE 1: WAITING FOR EMAIL SIGNATURE
    # ==============================================

    if current_status == "awaiting_email":

        try:

            received_pdf, message_id = check_for_signed_pdf(
                signer["email"],
                signer["email_reference"]
            )

        except Exception as exc:

            # Gmail may temporarily be unavailable.
            # Keep the signer in the same stage and try again.
            update_signer(
                signer_id,
                next_check_at=(
                    utc_now() + timedelta(seconds=60)
                ),
                last_checked_at=utc_now(),
                error=str(exc)
            )

            return {
                "status": "gmail_check_failed",
                "error": str(exc)
            }

        # No signed PDF received yet.
        if not received_pdf:

            update_signer(
                signer_id,

                next_check_at=(
                    utc_now()
                    + timedelta(seconds=EMAIL_POLL_INTERVAL)
                ),

                last_checked_at=utc_now()
            )

            return {
                "status": "still_awaiting_email"
            }

        print(
            f"Received signed PDF for signer {signer_id}",
            flush=True
        )

        # Save the PDF before submitting to SIGNITS.
        update_signer(
            signer_id,

            status="submitting_eid",

            received_pdf_path=received_pdf,

            gmail_message_id=message_id,

            next_check_at=None,

            last_checked_at=utc_now(),

            error=None
        )

        # ==========================================
        # STAGE 2: SUBMIT PDF TO SIGNITS
        # ==========================================

        try:

            signits_contract_id = send_to_signits(
                signer["sign_method"],
                signer["name"],
                signer["email"],
                signer["username"],
                signer["mail"],
                received_pdf,
                signer["email_reference"]
            )

            update_signer(
                signer_id,

                status="awaiting_eid_approval",

                signits_contract_id=signits_contract_id,

                next_check_at=(
                    utc_now()
                    + timedelta(seconds=EID_POLL_INTERVAL)
                ),

                error=None
            )

            refresh_contract_status(
                signer["contract_id"]
            )

            return {
                "status": "awaiting_eid_approval",
                "signits_contract_id": signits_contract_id
            }

        except Exception as exc:

            # An uncertain SIGNITS submission must not be
            # blindly repeated, since it might have succeeded
            # remotely even if the response was lost.
            update_signer(
                signer_id,
                status="failed",
                next_check_at=None,
                error=f"SIGNITS submission error: {exc}"
            )

            refresh_contract_status(
                signer["contract_id"]
            )

            raise

    # ==============================================
    # STAGE 3: WAITING FOR EID APPROVAL
    # ==============================================

    elif current_status == "awaiting_eid_approval":

        try:

            contract = check_signits_status(
                signer["signits_contract_id"]
            )

        except Exception as exc:

            # Temporary API/network error.
            # Keep the signer in the eID stage.
            update_signer(
                signer_id,

                next_check_at=(
                    utc_now() + timedelta(seconds=60)
                ),

                last_checked_at=utc_now(),

                error=str(exc)
            )

            return {
                "status": "signits_check_failed",
                "error": str(exc)
            }

        signits_status = contract.get("status")

        print(
            f"Signer {signer_id}: SIGNITS status = {signits_status}",
            flush=True
        )

        # ------------------------------------------
        # DECLINED OR CANCELLED
        # ------------------------------------------

        if signits_status in ("declined", "cancelled"):

            update_signer(
                signer_id,

                status="declined",

                next_check_at=None,

                last_checked_at=utc_now(),

                error=f"SIGNITS status: {signits_status}"
            )

            refresh_contract_status(
                signer["contract_id"]
            )

            return {"status": "declined"}

        # ------------------------------------------
        # SIGNED
        # ------------------------------------------

        if (
            signits_status == "signed"
            and contract.get("signed_pdf_ready")
        ):

            signed_pdf = download_signits_pdf(
                signer["signits_contract_id"],
                signer["email_reference"]
            )

            update_signer(
                signer_id,

                status="completed",

                signed_pdf_path=signed_pdf,

                next_check_at=None,

                last_checked_at=utc_now(),

                error=None
            )

            refresh_contract_status(
                signer["contract_id"]
            )

            print(
                f"Signer {signer_id} completed!",
                flush=True
            )

            # If signing order matters, start the next signer.
            if signer["ordering_matters"]:

                start_next_ordered_signer(
                    signer["contract_id"]
                )

            return {
                "status": "completed",
                "signed_pdf_path": signed_pdf
            }

        # ------------------------------------------
        # STILL WAITING FOR EID
        # ------------------------------------------

        update_signer(
            signer_id,

            next_check_at=(
                utc_now()
                + timedelta(seconds=EID_POLL_INTERVAL)
            ),

            last_checked_at=utc_now(),

            error=None
        )

        return {
            "status": "still_awaiting_eid"
        }

    return {
        "status": current_status
    }


# --------------------------------------------------
# DISPATCH DUE SIGNERS
# --------------------------------------------------

@celery.task(
    name="signing.dispatch_due_signers"
)
def dispatch_due_signers():

    # Claim up to 100 signers that need checking.
    # Database locking prevents duplicate claims.
    signer_ids = claim_due_signers(
        limit=DISPATCH_BATCH_SIZE,
        lease_seconds=TASK_LEASE_SECONDS
    )

    for signer_id in signer_ids:

        check_signer.delay(signer_id)

    print(
        f"Dispatched {len(signer_ids)} signer checks.",
        flush=True
    )

    return {
        "dispatched": len(signer_ids)
    }


# --------------------------------------------------
# CELERY BEAT SCHEDULE
# --------------------------------------------------

celery.conf.beat_schedule = {
    **(celery.conf.beat_schedule or {}),

    "dispatch-due-signers-every-10-seconds": {
        "task": "signing.dispatch_due_signers",
        "schedule": 10.0
    }
}