
import { useEffect, useState } from "react";
import {
  FaFileAlt,
  FaClock,
  FaCheckCircle,
  FaEye,
  FaDownload,
  FaLock,
} from "react-icons/fa";
import "./ContractAccess.css";

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const formatDate = (date) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (date) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeStatus = (status) => {
  const value = String(status || "unknown").toLowerCase();

  return value === "signed" ? "completed" : value;
};

const formatStatus = (status) => {
  return normalizeStatus(status)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getStatusClass = (status) => {
  return normalizeStatus(status).replaceAll("_", "-");
};

// --------------------------------------------------
// Component
// --------------------------------------------------

export default function ContractAccess() {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  // URL: /contract-access/<token>
  const token = decodeURIComponent(
    window.location.pathname
      .split("/")
      .filter(Boolean)
      .pop() || ""
  );

  // --------------------------------------------------
  // Fetch contract
  // --------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function fetchContract() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/contract-access/${encodeURIComponent(token)}`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              data.message ||
              "This contract link is invalid or has expired."
          );
        }

        if (!cancelled) {
          setContract(data.contract || data);
        }
      } catch (err) {
        console.error("Could not retrieve contract:", err);

        if (!cancelled) {
          setError(
            err.message ||
              "Could not retrieve this contract."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (token) {
      fetchContract();
    } else {
      setError("Invalid contract access link.");
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [token]);

  // --------------------------------------------------
  // PDF actions
  // --------------------------------------------------

  const fetchPdf = async () => {
    const response = await fetch(
      `/api/contract-access/${encodeURIComponent(token)}/pdf`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    if (!response.ok) {
      let message = "Could not retrieve the PDF.";

      try {
        const data = await response.json();
        message = data.error || data.message || message;
      } catch {
        // Ignore invalid JSON.
      }

      throw new Error(message);
    }

    const blob = await response.blob();

    const header = new Uint8Array(
      await blob.slice(0, 5).arrayBuffer()
    );

    if (String.fromCharCode(...header) !== "%PDF-") {
      throw new Error("The server did not return a valid PDF.");
    }

    return blob;
  };

  const handleViewPdf = async () => {
    const popup = window.open("", "_blank");

    if (!popup) {
      setError("Please allow popups to view the PDF.");
      return;
    }

    try {
      setError("");
      setPdfLoading(true);

      popup.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Loading contract...</title>
          </head>
          <body style="
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: Arial, sans-serif;
            color: #334155;
          ">
            Loading contract...
          </body>
        </html>
      `);

      const blob = await fetchPdf();
      const url = URL.createObjectURL(blob);

      popup.addEventListener(
        "beforeunload",
        () => URL.revokeObjectURL(url),
        { once: true }
      );

      popup.location.href = url;
    } catch (err) {
      if (!popup.closed) popup.close();

      setError(err.message || "Could not open the PDF.");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setError("");
      setPdfLoading(true);

      const blob = await fetchPdf();
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${contract?.title || "contract"}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setError(err.message || "Could not download the PDF.");
    } finally {
      setPdfLoading(false);
    }
  };

  // --------------------------------------------------
  // Loading / error states
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="contract-access-page">
        <div className="contract-access-loading">
          <div className="contract-access-spinner" />
          <h2>Loading your contract</h2>
          <p>Please wait while we retrieve your document.</p>
        </div>
      </div>
    );
  }

  if (error && !contract) {
    return (
      <div className="contract-access-page">
        <div className="contract-access-error">
          <div className="contract-access-error-icon">
            !
          </div>

          <h2>Unable to access contract</h2>

          <p>{error}</p>

          <span>
            If you believe this is a mistake, please request a
            new access link.
          </span>
        </div>
      </div>
    );
  }

  if (!contract) return null;

  // --------------------------------------------------
  // Contract information
  // --------------------------------------------------

  const signers = Array.isArray(contract.signers)
    ? [...contract.signers].sort(
        (a, b) =>
          Number(a.position || 0) -
          Number(b.position || 0)
      )
    : [];

  const completedSigners = signers.filter(
    (signer) =>
      normalizeStatus(signer.status) === "completed"
  ).length;

  const totalSigners = signers.length;

  const progress =
    totalSigners > 0
      ? (completedSigners / totalSigners) * 100
      : 0;

  const contractStatus = normalizeStatus(contract.status);

  return (
    <div className="contract-access-page">

      {/* Navigation */}
      <nav className="contract-access-nav">
        <div className="contract-access-logo">
          <FaFileAlt />
          <span>PDF Editor</span>
        </div>

        <div className="contract-access-secure">
          <FaLock />
          Secure contract access
        </div>
      </nav>

      <main className="contract-access-main">

        {/* Header */}
        <header className="contract-access-header">
          <div>
            <span className="contract-access-eyebrow">
              CONTRACT OVERVIEW
            </span>

            <h1>
              {contract.title || "Untitled contract"}
            </h1>

            <p>
              View your document and follow the signing
              process below.
            </p>
          </div>

          <span
            className={`contract-access-status ${getStatusClass(
              contractStatus
            )}`}
          >
            {formatStatus(contract.status)}
          </span>
        </header>

        {/* Error */}
        {error && (
          <div className="contract-access-inline-error">
            {error}
          </div>
        )}

        {/* Contract information */}
        <section className="contract-access-card">
          <div className="contract-access-card-heading">
            <h2>Contract information</h2>
          </div>

          <div className="contract-access-info-grid">

            <div>
              <span>Contract ID</span>
              <strong>#{contract.contract_id}</strong>
            </div>

            <div>
              <span>Created</span>
              <strong>{formatDate(contract.created_at)}</strong>
            </div>

            <div>
              <span>Signing method</span>
              <strong>
                {formatStatus(contract.sign_method)}
              </strong>
            </div>

            <div>
              <span>Sender</span>
              <strong>
                {contract.sender_name ||
                  contract.sender_mail ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>Signing order</span>
              <strong>
                {contract.ordering_matters === true ||
                contract.ordering_matters === "true"
                  ? "Sequential"
                  : "Any order"}
              </strong>
            </div>

            <div>
              <span>PDF approval</span>
              <strong>
                {contract.waitForPdfApproval === true ||
                contract.waitforpdfapproval === true
                  ? "Required"
                  : "Not required"}
              </strong>
            </div>
          </div>

          <div className="contract-access-pdf-actions">
            <button
              type="button"
              onClick={handleViewPdf}
              disabled={pdfLoading}
            >
              <FaEye />
              {pdfLoading ? "Loading..." : "View PDF"}
            </button>

            <button
              type="button"
              className="secondary"
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
            >
              <FaDownload />
              Download PDF
            </button>
          </div>
        </section>

        {/* Signing progress */}
        <section className="contract-access-card">
          <div className="contract-access-card-heading">
            <div>
              <h2>Signing progress</h2>
              <p>
                Follow the progress of everyone involved.
              </p>
            </div>

            <strong className="contract-access-progress-count">
              {completedSigners} / {totalSigners}
            </strong>
          </div>

          <div className="contract-access-progress-track">
            <div
              className="contract-access-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="contract-access-progress-label">
            <span>{Math.round(progress)}% completed</span>
            <span>
              {totalSigners - completedSigners} remaining
            </span>
          </div>

          {/* Signers */}
          <div className="contract-access-signers">

            {signers.map((signer, index) => {
              const status = normalizeStatus(signer.status);

              const completed = status === "completed";

              return (
                <div
                  className="contract-access-signer"
                  key={signer.signer_id || index}
                >
                  <div className="contract-access-signer-number">
                    {completed ? (
                      <FaCheckCircle />
                    ) : (
                      index + 1
                    )}
                  </div>

                  <div className="contract-access-signer-info">
                    <strong>
                      {signer.signer_name ||
                        signer.name ||
                        `Signer ${index + 1}`}
                    </strong>

                    <span>
                      {signer.signer_mail ||
                        signer.mail ||
                        signer.email ||
                        "—"}
                    </span>

                    {(signer.signed_at ||
                      signer.completed_at) && (
                      <small>
                        Completed:{" "}
                        {formatDateTime(
                          signer.signed_at ||
                            signer.completed_at
                        )}
                      </small>
                    )}
                  </div>

                  <span
                    className={`contract-access-signer-status ${getStatusClass(
                      status
                    )}`}
                  >
                    {formatStatus(status)}
                  </span>
                </div>
              );
            })}

            {signers.length === 0 && (
              <p className="contract-access-empty">
                No signer information is available.
              </p>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="contract-access-footer">
          <FaLock />

          <span>
            This is a private contract page. Keep your access
            link secure and do not share it with others.
          </span>
        </footer>

      </main>
    </div>
  );
}
