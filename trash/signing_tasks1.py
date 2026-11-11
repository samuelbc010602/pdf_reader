from datetime import datetime, timedelta, timezone
from contextlib import closing
from celery_app import celery

from backend.database2 import (
    get_connection,
    create_contract_in_db,
    get_signer,
    update_signer,
    refresh_contract_status,
    get_next_ordered_signer,
    claim_due_signers,
    get_userid,
    complete_all_signers
)

from services.gmail_signer import (
    send_pdf_for_signing,
    check_for_signed_pdf,
    send_to_signits,
    check_signits_status,
    download_signits_pdf
)

from tasks.utils import (
    claim_signer,
    get_contract_options,
    get_id_from_signer,
    update_signits_contract_id
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

def schedule_contract_signits_check(contract_id, delay_seconds=EID_POLL_INTERVAL):
    with closing(get_connection()) as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE contracts
                SET signits_next_check_at = %s
                WHERE contract_id = %s
            """, (
                utc_now() + timedelta(seconds=delay_seconds),
                contract_id
            ))

        conn.commit()

def claim_due_signits_contracts(
    limit=100,
    lease_seconds=120
):
    with closing(get_connection()) as conn:
        with conn.cursor() as cursor:

            cursor.execute("""
                WITH due_contracts AS (
                    SELECT contract_id
                    FROM contracts
                    WHERE signits_contract_id IS NOT NULL
                      AND signits_next_check_at IS NOT NULL
                      AND signits_next_check_at <= NOW()
                      AND waitForPdfApproval = FALSE
                    ORDER BY signits_next_check_at ASC
                    LIMIT %s
                    FOR UPDATE SKIP LOCKED
                )
                UPDATE contracts c
                SET signits_next_check_at =
                    NOW() + (%s * INTERVAL '1 second')
                FROM due_contracts d
                WHERE c.contract_id = d.contract_id
                RETURNING c.contract_id
            """, (limit, lease_seconds))

            contract_ids = [
                row[0] for row in cursor.fetchall()
            ]

        conn.commit()

    return contract_ids



# --------------------------------------------------
# START NEXT ORDERED SIGNER
# --------------------------------------------------

def start_next_ordered_signer(contract_id, previous_pdf, waitForPdfApproval=True):

    signer_id = get_next_ordered_signer(contract_id)

    if signer_id is not None:

        request_signer.delay(
            signer_id
        )

        print(
            f"Started next signer: {signer_id}",
            flush=True
        )

# --------------------------------------------------
# CREATE CONTRACT
# --------------------------------------------------

#Called from /send_contract route
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
    signSamePdf, #if ordering matters and this is true it means we use pdf signed by the previous signer in the list and sign op top, otherwise just use the same new contract each time
    waitForPdfApproval #dont wait for pdf to be signed go directly to signits eid approval
):
    signSamePdf = str(signSamePdf).lower() == "true"
    waitForPdfApproval = str(waitForPdfApproval).lower() == "true"
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
    contract_id, signer_ids = create_contract_in_db(
        user_id=user_id,
        title=title,
        username=username,
        mail=mail,
        sign_method=sign_method,
        ordering_matters=ordering_matters,
        pdf_path=pdf_path,
        signers=signers,
        signSamePdf=signSamePdf,
        waitForPdfApproval=waitForPdfApproval
    )
    if waitForPdfApproval:
        if ordering_matters:
            request_signer.delay(signer_ids[0])
        else:
            for signer_id in signer_ids:
                request_signer.delay(signer_id)
    else:
        signer_name = [x["name"] for x in signers]
        signer_mail = [x["email"] for x in signers]

        signits_contract_id = send_to_signits(
            sign_method,
            signer_name,
            signer_mail,
            pdf_path,
            title
        )
        
        print("adding signits_contract_id",signits_contract_id,"to contract_id",contract_id)

        update_signits_contract_id(
            contract_id,
            signits_contract_id,
            add_to_past_contracts=True
        )

        # Schedule the first contract-level status check.
        schedule_contract_signits_check(
            contract_id,
            delay_seconds=EID_POLL_INTERVAL
        )
        
    return {
        "contract_id": contract_id,
        "status": "pending",
        "total_signers": len(signer_ids)
    }


# --------------------------------------------------
# SEND EMAIL TO ONE SIGNER
# --------------------------------------------------

@celery.task(
    name="signing.request_signer"
)
def request_signer(signer_id):
    
    contract_id = get_id_from_signer(int(signer_id))
    signSamePdf,waitForPdfApproval = get_contract_options(contract_id)
    signits_contract_id = get_id_from_signer(int(signer_id),signits=True)
    
    signer = get_signer(signer_id)

    if not signer:
        return {"status": "signer_not_found"}

    # Atomically claim the signer.
    # This prevents two workers from sending the same email
    # simultaneously.  
    claimed = claim_signer(signer_id)

    if not claimed:
        return {"status": "already_started"}

    try:
        print("waitForPdfApproval",waitForPdfApproval,"signSamePdf",signSamePdf,"signits_contract_id",signits_contract_id)
        if waitForPdfApproval and signSamePdf and signits_contract_id != "NO_ID":
            signer["pdf_path"] = download_signits_pdf(int(signits_contract_id),contract_id)
        if waitForPdfApproval:
            send_pdf_for_signing(
                signer["pdf_path"],
                signer["title"],
                signer["sender_name"],
                signer["sender_mail"],
                signer["sign_method"],
                signer["signer_name"],
                signer["signer_mail"],
                signer["email_reference"]
            )
            status = "awaiting_email"
            poll_interval = EMAIL_POLL_INTERVAL
        else:
            # Skip email signing and submit the original/previous PDF directly to SIGNITS.
            print("sending to sigints in request_signer")
            signits_contract_id = send_to_signits(
                signer["sign_method"],
                signer["signer_name"],
                signer["signer_mail"],
                signer["pdf_path"],
                signer["email_reference"]
            )
            status = "awaiting_eid_approval"
            if signSamePdf:
                update_signits_contract_id(contract_id,signits_contract_id)
            poll_interval = EID_POLL_INTERVAL

        update_signer(
            signer_id,
            status=status,
            signits_contract_id=signits_contract_id,
            email_sent_at=utc_now(),
            next_check_at=utc_now() + timedelta(seconds=poll_interval),
            last_checked_at=None,
            error=None
        )

        refresh_contract_status(signer["contract_id"])

        return {
            "status": status,
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

    contract_id = get_id_from_signer(int(signer_id))
    signSamePdf,waitForPdfApproval = get_contract_options(contract_id)
    signits_contract_id = get_id_from_signer(int(signer_id),signits=True)
    
    print("waitForPdfApproval in check_signer",waitForPdfApproval)
        
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
                signer["signer_mail"],
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
            signer["pdf_path"] = received_pdf

            signits_contract_id = send_to_signits(
                signer["sign_method"],
                signer["signer_name"],
                signer["signer_mail"],
                signer["pdf_path"],
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

    elif "awaiting_eid_approval" in current_status:

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
            
            update_signits_contract_id(contract_id,signer["signits_contract_id"])

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
                print("doing start_next_ordered_signer with signed_pdf",signed_pdf)
                start_next_ordered_signer(
                    signer["contract_id"],
                    signed_pdf,
                    waitForPdfApproval=waitForPdfApproval
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


@celery.task(
    name="signing.check_contract_signits"
)
def check_contract_signits(contract_id):

    try:
        with closing(get_connection()) as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        signits_contract_id,
                        status
                    FROM contracts
                    WHERE contract_id = %s
                """, (contract_id,))

                contract = cursor.fetchone()

        if not contract:
            return {"status": "contract_not_found"}

        signits_contract_id = contract[0]

        if not signits_contract_id:
            return {"status": "missing_signits_contract_id"}

        # Check the status with SIGNITS.
        signits_response = check_signits_status(
            signits_contract_id
        )

        # The API returns a dictionary.
        signits_status = signits_response.get("status")

        print(
            f"Contract {contract_id}: "
            f"SIGNITS status = {signits_status}",
            flush=True
        )

        # ------------------------------------------
        # SIGNED
        # ------------------------------------------

        if (
            signits_status == "signed"
            and signits_response.get("signed_pdf_ready")
        ):

            complete_all_signers(contract_id)

            print(
                f"Contract {contract_id} successfully signed!",
                flush=True
            )

            return {
                "status": "completed",
                "contract_id": contract_id
            }

        # ------------------------------------------
        # DECLINED / CANCELLED
        # ------------------------------------------

        if signits_status in ("declined", "cancelled"):

            with closing(get_connection()) as conn:
                with conn.cursor() as cursor:

                    cursor.execute("""
                        UPDATE contract_signers
                        SET status = 'declined'
                        WHERE contract_id = %s
                          AND status NOT IN (
                              'completed',
                              'failed',
                              'declined'
                          )
                    """, (contract_id,))

                    cursor.execute("""
                        UPDATE contracts
                        SET signits_next_check_at = NULL,
                            signits_last_checked_at = NOW(),
                            signits_error = %s
                        WHERE contract_id = %s
                    """, (
                        f"SIGNITS status: {signits_status}",
                        contract_id
                    ))

                conn.commit()

            refresh_contract_status(contract_id)

            return {
                "status": "declined",
                "contract_id": contract_id
            }

        # ------------------------------------------
        # STILL WAITING
        # ------------------------------------------

        schedule_contract_signits_check(
            contract_id,
            delay_seconds=EID_POLL_INTERVAL
        )

        with closing(get_connection()) as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    UPDATE contracts
                    SET signits_last_checked_at = NOW(),
                        signits_error = NULL
                    WHERE contract_id = %s
                """, (contract_id,))

            conn.commit()

        return {
            "status": "pending",
            "signits_status": signits_status
        }

    except Exception as exc:

        print(
            f"Error checking SIGNITS contract {contract_id}: {exc}",
            flush=True
        )

        # Retry later instead of permanently failing.
        with closing(get_connection()) as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    UPDATE contracts
                    SET signits_next_check_at = %s,
                        signits_last_checked_at = NOW(),
                        signits_error = %s
                    WHERE contract_id = %s
                """, (
                    utc_now() + timedelta(seconds=60),
                    str(exc),
                    contract_id
                ))

            conn.commit()

        return {
            "status": "check_failed",
            "error": str(exc)
        }
        
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

@celery.task(
    name="signing.dispatch_due_signits_contracts"
)
def dispatch_due_signits_contracts():

    contract_ids = claim_due_signits_contracts(
        limit=DISPATCH_BATCH_SIZE,
        lease_seconds=TASK_LEASE_SECONDS
    )

    for contract_id in contract_ids:
        check_contract_signits.delay(contract_id)

    print(
        f"Dispatched {len(contract_ids)} SIGNITS contract checks.",
        flush=True
    )

    return {
        "dispatched": len(contract_ids)
    }


# --------------------------------------------------
# CELERY BEAT SCHEDULE
# --------------------------------------------------

celery.conf.beat_schedule = {
    **(celery.conf.beat_schedule or {}),

    "dispatch-due-signers-every-10-seconds": {
        "task": "signing.dispatch_due_signers",
        "schedule": 10.0
    },

    "dispatch-due-signits-contracts-every-10-seconds": {
        "task": "signing.dispatch_due_signits_contracts",
        "schedule": 10.0
    }
}