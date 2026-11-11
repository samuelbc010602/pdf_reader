from datetime import datetime, timedelta, timezone
from contextlib import closing
from celery_app import celery

from database import *
from services.gmail_signer import *
from services.signits_service import *
from tasks.utils import *

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
    name,
    mail,
    sign_method,
    signers,
    ordering_matters,
    signSamePdf, 
    waitForPdfApproval
):
    signSamePdf = str(signSamePdf).lower() == "true"
    waitForPdfApproval = str(waitForPdfApproval).lower() == "true"
    user_id = get_userid(name,mail)

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
        name=name,
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
            # Start with the first signer, subsequent signers will be triggered sequentially
            request_signer.delay(signer_ids[0])
        else:
            # Send requests to all signers simultaneously
            for signer_id in signer_ids:
                request_signer.delay(signer_id)
    else:
        signer_names = [x.get("name") for x in signers]
        signer_mails = [x.get("mail") for x in signers]

        signits_contract_id = send_to_signits(sign_method, signer_names, signer_mails, pdf_path, title)
        update_contract_with_signits_id(contract_id, signits_contract_id)
    
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
def request_signer(signer_id, input_pdf_path=None):
    
    contract_id = get_id_from_signer(int(signer_id))
    signits_contract_id = get_id_from_signer(int(signer_id),signits=True)
    
    signer = get_signer(signer_id)

    if not signer:
        return {"status": "signer_not_found"}
    claimed = claim_signer(signer_id)

    if not claimed:
        return {"status": "already_started"}

    try:
        if input_pdf_path:
            # Use the PDF signed by the previous signer.
            pdf_path = input_pdf_path

        elif signits_contract_id != "NO_ID":
            pdf_path = download_signits_pdf(
                int(signits_contract_id),
                contract_id
            )
        else:
            # First signer: use the original uploaded PDF.
            pdf_path = signer["pdf_path"]
            
        send_pdf_for_signing(
            pdf_path,
            signer["title"],
            signer["sender_name"],
            signer["sender_mail"],
            signer["sign_method"],
            signer["signer_name"],
            signer["signer_mail"],
            signer["mail_reference"]
        )
        update_signer(
            signer_id,
            status="awaiting_email",
            signits_contract_id=signits_contract_id,
            mail_sent_at=utc_now(),
            next_check_at=utc_now() + timedelta(seconds=EMAIL_POLL_INTERVAL),
            last_checked_at=None,
            error=None
        )

        refresh_contract_status(signer["contract_id"])

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

    print("\n" + "=" * 90, flush=True)
    print(f"[CHECK_SIGNER] STARTING TASK FOR SIGNER {signer_id}", flush=True)
    print("=" * 90, flush=True)

    contract_id = get_id_from_signer(int(signer_id))
    signits_contract_id = get_id_from_signer(int(signer_id), signits=True)
    signer = get_signer(signer_id)
    
    print(f"this is the signer for signer_id = {signer_id}",signer)

    print(f"[INIT] Contract ID: {contract_id}", flush=True)
    print(f"[INIT] SIGNITS Contract ID: {signits_contract_id}", flush=True)

    if not signer:
        print(
            f"[ERROR] Signer {signer_id} NOT FOUND. Aborting task.",
            flush=True
        )
        return {"status": "signer_not_found"}

    # ==============================================
    # INITIAL SIGNER INFORMATION
    # ==============================================

    all_signers = get_all_signers_for_contract(contract_id)
    current_signer_position = signer["position"]

    print("\n[INITIAL STATE] Current signer information:", flush=True)
    print(f"  Signer ID: {signer_id}", flush=True)
    print(f"  Position: {current_signer_position}", flush=True)
    print(f"  Status: {signer['status']}", flush=True)
    print(f"  Name: {signer.get('signer_name')}", flush=True)
    print(f"  Email: {signer.get('signer_mail')}", flush=True)
    print(f"  Ordering matters: {signer.get('ordering_matters')}", flush=True)
    print(f"  Sign same PDF: {signer.get('signSamePdf')}", flush=True)
    print(f"  SIGNITS ID: {signer.get('signits_contract_id')}", flush=True)

    print("\n[INITIAL STATE] ALL SIGNERS FOR CONTRACT:", flush=True)

    for s in all_signers:
        marker = " <-- CURRENT SIGNER" if str(s["signer_id"]) == str(signer_id) else ""

        print(
            f"  ID={s['signer_id']} | "
            f"Position={s['position']} | "
            f"Status={s['status']}"
            f"{marker}",
            flush=True
        )

    current_status = signer["status"]

    print(
        f"\n[BRANCH] Evaluating current status: '{current_status}'",
        flush=True
    )

    # ==============================================
    # STAGE 1: WAITING FOR EMAIL SIGNATURE
    # ==============================================

    if current_status == "awaiting_email":

        print(
            "\n[BRANCH SELECTED] STAGE 1: AWAITING EMAIL SIGNATURE",
            flush=True
        )

        print(
            f"[EMAIL] Checking inbox for signer {signer_id}",
            flush=True
        )

        print(
            f"[EMAIL] Mail: {signer.get('signer_mail')} | "
            f"Reference: {signer.get('mail_reference')}",
            flush=True
        )

        try:
            received_pdf, message_id = check_for_signed_pdf(
                signer["signer_mail"],
                signer["mail_reference"]
            )

        except Exception as exc:

            print(
                f"[EMAIL ERROR] Gmail check failed: {exc}",
                flush=True
            )
            print(
                "[EMAIL] Scheduling another check in 60 seconds.",
                flush=True
            )

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

            print(
                "[EMAIL RESULT] No signed PDF received yet.",
                flush=True
            )
            print(
                f"[EMAIL] Rescheduling in {EMAIL_POLL_INTERVAL} seconds.",
                flush=True
            )

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
            f"[EMAIL SUCCESS] Received signed PDF: {received_pdf}",
            flush=True
        )
        print(
            f"[EMAIL SUCCESS] Message ID: {message_id}",
            flush=True
        )

        print(
            "[EMAIL] Updating signer status to submitting_eid.",
            flush=True
        )

        update_signer(
            signer_id,
            status="submitting_eid",
            received_pdf_path=received_pdf,
            mail_message_id=message_id,
            next_check_at=None,
            last_checked_at=utc_now(),
            error=None
        )

        # ==========================================
        # STAGE 2: SUBMIT PDF TO SIGNITS
        # ==========================================

        print(
            "\n[BRANCH SELECTED] STAGE 2: SUBMITTING PDF TO SIGNITS",
            flush=True
        )

        try:
            signer["pdf_path"] = received_pdf

            print(
                f"[SIGNITS SUBMISSION] Signer: {signer_id}",
                flush=True
            )
            print(
                f"[SIGNITS SUBMISSION] PDF: {received_pdf}",
                flush=True
            )
            print(
                f"[SIGNITS SUBMISSION] Method: {signer['sign_method']}",
                flush=True
            )

            signits_contract_id = send_to_signits(
                signer["sign_method"],
                signer["signer_name"],
                signer["signer_mail"],
                signer["pdf_path"],
                signer["mail_reference"]
            )
            
            update_contract_with_signits_id(contract_id,signits_contract_id)

            print(
                f"[SIGNITS SUBMISSION SUCCESS] "
                f"New SIGNITS contract ID: {signits_contract_id}",
                flush=True
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

            print(
                "[SIGNITS] Signer status updated to awaiting_eid_approval.",
                flush=True
            )

            refresh_contract_status(
                signer["contract_id"]
            )

            print(
                "[SIGNITS] Contract status refreshed.",
                flush=True
            )

            return {
                "status": "awaiting_eid_approval",
                "signits_contract_id": signits_contract_id
            }

        except Exception as exc:

            print(
                f"[SIGNITS SUBMISSION ERROR] {exc}",
                flush=True
            )
            print(
                "[SIGNITS] Marking signer as failed.",
                flush=True
            )

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

        print(
            "\n[BRANCH SELECTED] STAGE 3: AWAITING EID APPROVAL",
            flush=True
        )

        print(
            f"[SIGNITS CHECK] Checking SIGNITS contract: "
            f"{signer['signits_contract_id']}",
            flush=True
        )
        
        print("this is signer before try statement",signer)

        try:
            contract = check_signits_status(
                signer["signits_contract_id"]
            )

        except Exception as exc:

            print(
                f"[SIGNITS CHECK ERROR] {exc}",
                flush=True
            )
            print(
                "[SIGNITS] Retrying status check in 60 seconds.",
                flush=True
            )

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

        print(
            f"[SIGNITS RESULT] Signer {signer_id}: "
            f"SIGNITS status = {contract.get("status")}",
            f"SIGNITS signed_pdf_ready = {contract.get('signed_pdf_ready')}",
            flush=True
        )

        # ------------------------------------------
        # DECLINED OR CANCELLED
        # ------------------------------------------

        if contract.get("status") in ("declined", "cancelled"):

            print(
                "\n[BRANCH SELECTED] SIGNATURE DECLINED OR CANCELLED",
                flush=True
            )
            print(
                f"[DECLINED] SIGNITS status: {contract.get("status")}",
                flush=True
            )

            update_signer(
                signer_id,
                status="declined",
                next_check_at=None,
                last_checked_at=utc_now(),
                error=f"SIGNITS status: {contract.get("status")}"
            )

            refresh_contract_status(
                signer["contract_id"]
            )

            print(
                "[DECLINED] Contract status refreshed. "
                "No next signer will be started.",
                flush=True
            )

            return {"status": "declined"}

        # ------------------------------------------
        # SIGNED
        # ------------------------------------------

        if (
            contract.get("status") == "signed"
            and contract.get("signed_pdf_ready")
        ):

            print(
                "\n[BRANCH SELECTED] SIGNATURE COMPLETED AND PDF READY",
                flush=True
            )

            print(
                f"[DOWNLOAD] Downloading signed PDF for signer {signer_id}",
                flush=True
            )

            signed_pdf = download_signits_pdf(
                signer["signits_contract_id"],
                signer["mail_reference"]
            )

            print(
                f"[DOWNLOAD SUCCESS] Signed PDF saved at: {signed_pdf}",
                flush=True
            )

            print(
                "[DATABASE] Updating past SIGNITS contracts.",
                flush=True
            )

            update_past_contracts(
                contract_id,
                signer["signits_contract_id"]
            )

            print(
                "[DATABASE] Updating signer status to completed.",
                flush=True
            )

            update_signer(
                signer_id,
                status="completed",
                signed_pdf_path=signed_pdf,
                next_check_at=None,
                last_checked_at=utc_now(),
                error=None
            )

            print(
                "[DATABASE] Signer successfully marked as completed.",
                flush=True
            )

            refresh_contract_status(
                signer["contract_id"]
            )

            print(
                "[CONTRACT] Contract status refreshed.",
                flush=True
            )

            print(
                f"\n[SIGNER COMPLETED] Signer {signer_id} "
                f"(Position {current_signer_position})",
                flush=True
            )

            # ======================================
            # START NEXT SIGNER
            # ======================================

            print(
                "\n[NEXT SIGNER] Evaluating sequential signing logic.",
                flush=True
            )
            print("this is the signer for signSamePdf",signer)
            ordering_matters = signer["ordering_matters"]
            sign_same_pdf = signer["signsamepdf"]

            print(
                f"[NEXT SIGNER] ordering_matters = {ordering_matters}",
                flush=True
            )
            print(
                f"[NEXT SIGNER] signSamePdf = {sign_same_pdf}",
                flush=True
            )

            if ordering_matters:

                print(
                    "[NEXT SIGNER] Sequential signing ENABLED.",
                    flush=True
                )

                print(
                    f"[NEXT SIGNER] Looking for signer after position "
                    f"{current_signer_position}.",
                    flush=True
                )

                next_signer_id = get_next_ordered_signer(contract_id)

                print(
                    f"[NEXT SIGNER] get_next_ordered_signer returned: "
                    f"{next_signer_id}",
                    flush=True
                )

                if next_signer_id is not None:

                    print(
                        f"[NEXT SIGNER] Found next signer: "
                        f"{next_signer_id}",
                        flush=True
                    )

                    if sign_same_pdf:

                        print(
                            "[NEXT SIGNER BRANCH] signSamePdf=True",
                            flush=True
                        )
                        print(
                            "[NEXT SIGNER] Passing the previous signer's "
                            "signed PDF to the next signer.",
                            flush=True
                        )
                        print(
                            f"[NEXT SIGNER] PDF path: {signed_pdf}",
                            flush=True
                        )

                        request_signer.delay(
                            next_signer_id,
                            signed_pdf
                        )

                        print(
                            "[NEXT SIGNER] request_signer.delay called "
                            "with next_signer_id AND signed_pdf.",
                            flush=True
                        )

                    else:

                        print(
                            "[NEXT SIGNER BRANCH] signSamePdf=False",
                            flush=True
                        )
                        print(
                            "[NEXT SIGNER] NOT passing the previous signed "
                            "PDF. Next signer will use its own PDF.",
                            flush=True
                        )

                        request_signer.delay(next_signer_id)

                        print(
                            "[NEXT SIGNER] request_signer.delay called "
                            "with next_signer_id ONLY.",
                            flush=True
                        )

                else:

                    print(
                        "[NEXT SIGNER] No next signer found. "
                        "This is the final signer in the sequence.",
                        flush=True
                    )

            else:

                print(
                    "[NEXT SIGNER] Sequential signing DISABLED "
                    "(ordering_matters=False).",
                    flush=True
                )
                print(
                    "[NEXT SIGNER] No subsequent signer will be "
                    "automatically started.",
                    flush=True
                )

            print(
                "\n[CHECK_SIGNER] COMPLETED SUCCESSFULLY.",
                flush=True
            )
            print("=" * 90 + "\n", flush=True)

            return {
                "status": "completed",
                "signed_pdf_path": signed_pdf
            }

        # ------------------------------------------
        # STILL WAITING FOR EID
        # ------------------------------------------

        print(
            "\n[BRANCH SELECTED] SIGNATURE NOT YET COMPLETED",
            flush=True
        )

        print(
            f"[EID WAITING] Current SIGNITS status: {contract.get('status')}",
            flush=True
        )

        print(
            f"[EID WAITING] Scheduling another check in "
            f"{EID_POLL_INTERVAL} seconds.",
            flush=True
        )

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

    # ==============================================
    # UNKNOWN OR UNHANDLED STATUS
    # ==============================================

    print(
        f"\n[UNHANDLED STATUS] Signer {signer_id} has status: "
        f"'{current_status}'",
        flush=True
    )

    print(
        "[UNHANDLED STATUS] No branch was executed.",
        flush=True
    )

    print("=" * 90 + "\n", flush=True)

    return {
        "status": current_status
    }


@celery.task(
    name="signing.check_contract"
)
def check_contract(check_id):
    
    signits_contract_id = get_id_from_contract(check_id)
    status = check_signits_status(signits_contract_id)["status"]
    update_contract(
       check_id,status=status
    )
    return {
        "status":"completed" if status == "signed" else status
    }

@celery.task(
    name="signing.dispatch_due_signers"
)
def dispatch_due_signers():

    # Claim up to 100 signers that need checking.
    # Database locking prevents duplicate claims.
    ids_to_check = claim_due_signers(
        limit=DISPATCH_BATCH_SIZE,
        lease_seconds=TASK_LEASE_SECONDS
    )

    for pair in ids_to_check:
        check_type, check_id = pair
        if check_type == "contract":
            check_contract.delay(check_id)
        else:
            check_signer.delay(check_id)

    print(
        f"Dispatching these ids {ids_to_check}",
        flush=True
    )

    return {
        "dispatched": len(ids_to_check)
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
}