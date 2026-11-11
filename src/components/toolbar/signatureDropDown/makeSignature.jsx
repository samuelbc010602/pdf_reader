
import { useContext, useState, useEffect } from "react";
import { DocSpecsContext, AuthContext } from "@/App";
import { DEV_MODE, DEV_INITIAL_STATE } from "@/config/devConfig";
import "./MakeSignature.css";

export default function MakeSignature() {
  const [isOpen, setIsOpen] = useState(false);

  const [signMethod, setSignMethod] = useState(
    DEV_MODE ? DEV_INITIAL_STATE.signMethod : "eid"
  );

  const [signSamePdf, setSignSamePdf] = useState(
    DEV_MODE ? DEV_INITIAL_STATE.signSamePdf : false
  );

  const [waitForPdfApproval, setWaitForPdfApproval] = useState(
    DEV_MODE ? DEV_INITIAL_STATE.waitForPdfApproval : false
  );

  const [signers, setSigners] = useState(() =>
    DEV_MODE
      ? DEV_INITIAL_STATE.signers.map((signer) => ({
          ...signer,
          id: crypto.randomUUID(),
        }))
      : [{ id: crypto.randomUUID(), name: "", mail: "" }]
  );

  const [orderingMatters, setOrderingMatters] = useState(
    DEV_MODE ? DEV_INITIAL_STATE.orderingMatters : false
  );

  const [senderEmail, setSenderEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { getCurrentFile, fileName, uploadedFile } =
    useContext(DocSpecsContext);

  const { user } = useContext(AuthContext);

  // --------------------------------------------------
  // User state
  // --------------------------------------------------

  const isLoggedIn = Boolean(user);

  const accountEmail = user?.mail || user?.email || "";

  const effectiveSenderEmail = isLoggedIn
    ? accountEmail
    : senderEmail;

  const senderName =
    user?.name || user?.username || effectiveSenderEmail;

  // --------------------------------------------------
  // Effects
  // --------------------------------------------------

  useEffect(() => {
    if (DEV_MODE) {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (accountEmail) {
      setSenderEmail(accountEmail);
    }
  }, [accountEmail]);

  // --------------------------------------------------
  // Signer management
  // --------------------------------------------------

  function addSigner() {
    if (signers.length >= 20) return;

    setSigners((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: "",
        mail: "",
      },
    ]);
  }

  function removeSigner(id) {
    setSigners((current) =>
      current.filter((signer) => signer.id !== id)
    );
  }

  function updateSigner(id, field, value) {
    setSigners((current) =>
      current.map((signer) =>
        signer.id === id ? { ...signer, [field]: value } : signer
      )
    );
  }

  function moveSigner(index, direction) {
    setSigners((current) => {
      const next = [...current];
      const target = index + direction;

      if (target < 0 || target >= next.length) return current;

      [next[index], next[target]] = [next[target], next[index]];

      return next;
    });
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email.trim()
    );
  }

  // --------------------------------------------------
  // Registration / login
  // --------------------------------------------------

  function openRegistration() {
    setIsOpen(false);

    // Uses the existing login modal event in your application.
    // The login modal can offer registration as an alternative.
    window.dispatchEvent(new CustomEvent("open-login"));
  }

  // --------------------------------------------------
  // Start signing
  // --------------------------------------------------

  async function handleStartSigning() {
    setError("");

    if (!uploadedFile) {
      setError("No document has been selected.");
      return;
    }

    if (
      !effectiveSenderEmail.trim() ||
      !isValidEmail(effectiveSenderEmail)
    ) {
      setError("Please provide a valid email address.");
      return;
    }

    if (
      signers.some(
        (signer) =>
          !signer.name.trim() || !signer.mail.trim()
      )
    ) {
      setError("Please enter a name and email for every signer.");
      return;
    }

    if (
      signers.some((signer) => !isValidEmail(signer.mail))
    ) {
      setError("Please enter valid email addresses for all signers.");
      return;
    }

    const signerSummary = signers
      .map(
        (signer, index) =>
          `${index + 1}. ${signer.name} (${signer.mail})`
      )
      .join("\n");

    const accessDescription = isLoggedIn
      ? "The contract will be saved to your account and available in your dashboard."
      : `A private, one-time access link will be sent to ${effectiveSenderEmail}. You can use it to view the contract and track the signing process.`;

    const confirmation = [
      "Please confirm the contract settings:",
      "",
      `Document: ${fileName || "Untitled document"}`,
      `Sender: ${senderName}`,
      `Sender email: ${effectiveSenderEmail}`,
      `Access: ${isLoggedIn ? "Account dashboard" : "One-time email link"}`,
      `Signing method: ${signMethod === "eid" ? "eID" : "Email"}`,
      `Number of signers: ${signers.length}`,
      `Signing order: ${orderingMatters ? "Sequential" : "Any order"}`,
      `Wait for PDF approval: ${waitForPdfApproval ? "Yes" : "No"}`,
      `Sign same PDF: ${
        orderingMatters && waitForPdfApproval && signSamePdf
          ? "Yes"
          : "No"
      }`,
      "",
      "Signers:",
      signerSummary,
      "",
      accessDescription,
      "",
      "Do you want to send this contract?",
    ].join("\n");

    if (!window.confirm(confirmation)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const actualFile = await getCurrentFile();

      if (!actualFile) {
        throw new Error("Could not retrieve the current PDF.");
      }

      const formData = new FormData();

      formData.append(
        "pdf",
        actualFile,
        actualFile.name || "document.pdf"
      );

      formData.append("sign_method", signMethod);

      formData.append("name", senderName);
      formData.append("mail", effectiveSenderEmail);

      // Only guests need a one-time access link.
      formData.append(
        "guest_access",
        String(!isLoggedIn)
      );

      if (!isLoggedIn) {
        formData.append("sender_email", effectiveSenderEmail);
      }

      formData.append(
        "ordering_matters",
        String(orderingMatters)
      );

      formData.append("signers", JSON.stringify(signers));

      formData.append(
        "title",
        fileName || "Untitled document"
      );

      formData.append(
        "signSamePdf",
        String(
          orderingMatters &&
            waitForPdfApproval &&
            signSamePdf
        )
      );

      formData.append(
        "waitForPdfApproval",
        String(waitForPdfApproval)
      );

      const response = await fetch("/api/send_contract", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const responseText = await response.text();

      let result;

      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Server returned an invalid response: ${responseText}`
        );
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            `Request failed (${response.status})`
        );
      }

      console.log("Contract accepted:", result);

      setIsOpen(false);
      setError("");

    } catch (err) {
      console.error(
        "Error starting signature process:",
        err
      );

      setError(
        err.message ||
          "An error occurred while sending the contract."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <>
      <button
        className="toolbar_button"
        onClick={() => setIsOpen(true)}
      >
        Signature
      </button>

      {isOpen && (
        <div
          className="signature-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div
            className="signature-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="signature-title"
          >
            {/* Header */}
            <div className="signature-header">
              <div>
                <div className="signature-eyebrow">
                  DOCUMENT WORKFLOW
                </div>

                <h2 id="signature-title">
                  Send for signature
                </h2>

                <p>
                  Configure your signing process and invite the
                  required signers.
                </p>
              </div>

              <button
                className="signature-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Sender / account access */}
            <section className="signature-section">
              <div className="section-heading">
                <div>
                  <h3>Contract access</h3>
                  <p>
                    Choose how you want to access and manage
                    this contract.
                  </p>
                </div>
              </div>

              {isLoggedIn ? (
                <div className="account-access-card">
                  <div className="account-access-icon">
                    ✓
                  </div>

                  <div className="account-access-content">
                    <strong>Contract saved to your account</strong>

                    <p>
                      This contract will be associated with your
                      account and available in your dashboard.
                    </p>

                    <span>
                      {accountEmail || "Logged-in account"}
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="guest-access-card">
                    <div className="guest-access-icon">
                      ✉
                    </div>

                    <div className="guest-access-content">
                      <strong>Access your contract by email</strong>

                      <p>
                        After sending, we'll email you a private
                        one-time link. From that page you can view
                        your contract, see all signers, and follow
                        the signing progress.
                      </p>

                      <label className="signature-field">
                        <span>Your email address</span>

                        <input
                          type="email"
                          value={senderEmail}
                          onChange={(e) =>
                            setSenderEmail(e.target.value)
                          }
                          placeholder="you@example.com"
                          autoComplete="email"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="registration-promo">
                    <div>
                      <strong>
                        Want to keep track of all your contracts?
                      </strong>

                      <p>
                        Create a free account to get your own
                        dashboard, revisit previous contracts,
                        track signing activity and manage your
                        documents in one place.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={openRegistration}
                    >
                      Register / Log in →
                    </button>
                  </div>
                </>
              )}
            </section>

            <div className="signature-divider" />

            {/* Signing method */}
            <section className="signature-section">
              <div className="section-heading">
                <div>
                  <h3>Signing method</h3>
                  <p>
                    Choose how recipients will sign the document.
                  </p>
                </div>
              </div>

              <div className="sign-method-options">
                <label
                  className={`sign-method-card ${
                    signMethod === "eid" ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="signMethod"
                    value="eid"
                    checked={signMethod === "eid"}
                    onChange={() => setSignMethod("eid")}
                  />

                  <span className="method-card-content">
                    <strong>eID</strong>
                    <small>Electronic identification</small>
                  </span>
                </label>

                <label
                  className={`sign-method-card ${
                    signMethod === "mail" ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="signMethod"
                    value="mail"
                    checked={signMethod === "mail"}
                    onChange={() => setSignMethod("mail")}
                  />

                  <span className="method-card-content">
                    <strong>Email signing</strong>
                    <small>Sign through an email invitation</small>
                  </span>
                </label>
              </div>
            </section>

            <div className="signature-divider" />

            {/* Signing settings */}
            <section className="signature-section">
              <div className="section-heading">
                <div>
                  <h3>Signing settings</h3>
                  <p>
                    Control how the signing process works.
                  </p>
                </div>
              </div>

              <div className="signature-settings">
                <label className="setting-row">
                  <input
                    type="checkbox"
                    checked={orderingMatters}
                    onChange={(e) =>
                      setOrderingMatters(e.target.checked)
                    }
                  />

                  <span className="setting-content">
                    <strong>Signing order matters</strong>
                    <small>
                      Signers must sign in the order listed below.
                    </small>
                  </span>
                </label>

                <label className="setting-row">
                  <input
                    type="checkbox"
                    checked={waitForPdfApproval}
                    onChange={(e) =>
                      setWaitForPdfApproval(e.target.checked)
                    }
                  />

                  <span className="setting-content">
                    <strong>Wait for PDF approval</strong>
                    <small>
                      Wait for the PDF to be approved before
                      proceeding with the next signing step.
                    </small>
                  </span>
                </label>

                <label
                  className={`setting-row ${
                    orderingMatters && waitForPdfApproval
                      ? ""
                      : "setting-disabled"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={signSamePdf}
                    disabled={
                      !(orderingMatters && waitForPdfApproval)
                    }
                    onChange={(e) =>
                      setSignSamePdf(e.target.checked)
                    }
                  />

                  <span className="setting-content">
                    <strong>Sign the same PDF</strong>
                    <small>
                      Use the previously signed PDF for the next
                      signer.
                    </small>
                  </span>
                </label>
              </div>
            </section>

            <div className="signature-divider" />

            {/* Signers */}
            <section className="signature-section">
              <div className="signers-heading">
                <div>
                  <h3>Signers</h3>
                  <p>
                    Add the people who need to sign this document.
                  </p>
                </div>

                <span className="signer-count">
                  {signers.length} / 20
                </span>
              </div>

              <div className="signer-list">
                {signers.map((signer, index) => (
                  <div
                    className="signer-card"
                    key={signer.id}
                  >
                    <div className="signer-number">
                      {index + 1}
                    </div>

                    <div className="signer-fields">
                      <label className="signer-field">
                        <span>Name</span>

                        <input
                          type="text"
                          value={signer.name}
                          onChange={(e) =>
                            updateSigner(
                              signer.id,
                              "name",
                              e.target.value
                            )
                          }
                          placeholder="Full name"
                        />
                      </label>

                      <label className="signer-field">
                        <span>Email address</span>

                        <input
                          type="email"
                          value={signer.mail}
                          onChange={(e) =>
                            updateSigner(
                              signer.id,
                              "mail",
                              e.target.value
                            )
                          }
                          placeholder="name@example.com"
                        />
                      </label>
                    </div>

                    <div className="signer-controls">
                      <button
                        type="button"
                        className="icon-button"
                        title="Move up"
                        aria-label={`Move signer ${index + 1} up`}
                        disabled={index === 0}
                        onClick={() =>
                          moveSigner(index, -1)
                        }
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        className="icon-button"
                        title="Move down"
                        aria-label={`Move signer ${index + 1} down`}
                        disabled={index === signers.length - 1}
                        onClick={() =>
                          moveSigner(index, 1)
                        }
                      >
                        ↓
                      </button>

                      {signers.length > 1 && (
                        <button
                          type="button"
                          className="icon-button remove-signer"
                          title="Remove signer"
                          aria-label={`Remove signer ${index + 1}`}
                          onClick={() =>
                            removeSigner(signer.id)
                          }
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="add-signer-row">
                <span>
                  {signers.length >= 20
                    ? "Maximum number of signers reached"
                    : "Need another signer?"}
                </span>

                <button
                  type="button"
                  className="add-signer-button"
                  disabled={signers.length >= 20}
                  onClick={addSigner}
                >
                  + Add signer
                </button>
              </div>

              {orderingMatters && (
                <div className="signing-order-hint">
                  <span>ⓘ</span>
                  Signers will be invited sequentially,
                  starting with signer 1.
                </div>
              )}
            </section>

            {/* Error */}
            {error && (
              <div className="signature-error" role="alert">
                <span>!</span>
                {error}
              </div>
            )}

            {/* Footer */}
            <div className="signature-footer">
              <button
                className="signature-cancel-button"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>

              <button
                className="signature-submit-button"
                onClick={handleStartSigning}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Review & send"}

                {!isSubmitting && <span>→</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
