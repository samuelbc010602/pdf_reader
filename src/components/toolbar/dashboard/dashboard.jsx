
import {
  AuthContext,
  NavigationContext,
} from "@/App";

import { apiFetch } from "@/api";
import { useContext, useEffect, useState } from "react";

import {
  FaTimes,
  FaFileAlt,
  FaClock,
  FaCheckCircle,
  FaFilter,
  FaChevronDown,
  FaChevronUp,
  FaEye,
  FaDownload,
} from "react-icons/fa";

import "./dashboard.css";

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const getSafeFilename = (value) => {
  return String(value || "contract")
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim()
    .replace(/\s+/g, "_");
};

const parseSignitsIds = (pastContracts, currentSignitsId) => {
  let values = [];

  if (Array.isArray(pastContracts)) {
    values = pastContracts;
  } else if (
    typeof pastContracts === "string" &&
    pastContracts.trim() !== ""
  ) {
    const raw = pastContracts.trim();

    if (raw.startsWith("{") && raw.endsWith("}")) {
      const contents = raw.slice(1, -1).trim();
      values = contents ? contents.split(",") : [];
    } else {
      try {
        const parsed = JSON.parse(raw);
        values = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        values = raw.split(",");
      }
    }
  } else if (pastContracts != null) {
    values = [pastContracts];
  }

  const ids = values
    .map((value) => {
      const id =
        typeof value === "object" && value !== null
          ? value.signits_contract_id ?? value.id
          : value;

      if (id == null || String(id).trim() === "") {
        return null;
      }

      const parsed = Number(String(id).trim());

      return Number.isInteger(parsed) ? parsed : null;
    })
    .filter((id) => id !== null);

  if (
    currentSignitsId != null &&
    String(currentSignitsId).trim() !== ""
  ) {
    const currentId = Number(currentSignitsId);

    if (Number.isInteger(currentId)) {
      ids.push(currentId);
    }
  }

  return ids;
};

const getOrderedSigners = (contract) => {
  const signers = Array.isArray(contract.signers)
    ? contract.signers
    : [];

  const signitsIds = parseSignitsIds(
    contract.past_contracts,
    contract.signits_contract_id
  );

  return [...signers]
    .sort((a, b) => {
      const positionA = Number(a.position);
      const positionB = Number(b.position);

      if (!Number.isFinite(positionA)) return 1;
      if (!Number.isFinite(positionB)) return -1;

      return positionA - positionB;
    })
    .map((signer, index) => ({
      ...signer,
      version_id: signitsIds[index] ?? null,
    }));
};

const formatDate = (date) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (date) => {
  if (!date) return null;

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return null;

  return parsedDate.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeStatus = (status) => {
  const normalized = String(status || "unknown").toLowerCase();

  return normalized === "signed" ? "completed" : normalized;
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
// Dashboard
// --------------------------------------------------

export default function Dashboard({ onCancel }) {
  const { user } = useContext(AuthContext);
  const { activePage } = useContext(NavigationContext);

  const [contracts, setContracts] = useState([]);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedContract, setExpandedContract] = useState(null);

  // PDF loading state
  const [pdfLoading, setPdfLoading] = useState(null);

  // AI review state
  const [changeReviews, setChangeReviews] = useState({});
  const [reviewLoading, setReviewLoading] = useState(null);
  const [reviewErrors, setReviewErrors] = useState({});

  // --------------------------------------------------
  // Fetch dashboard data
  // --------------------------------------------------

  useEffect(() => {
    if (activePage !== "dashboard" || !user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchDashboard() {
      try {
        setLoading(true);
        setError("");

        const data = await apiFetch("/api/dashboard/contracts");

        if (cancelled) return;

        setContracts(data.contracts || []);

        setStats(
          data.stats || {
            total: 0,
            pending: 0,
            completed: 0,
          }
        );
      } catch (err) {
        console.error("Could not load dashboard:", err);

        if (!cancelled) {
          setError(
            "Could not load your contracts. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, [user, activePage]);

  // --------------------------------------------------
  // Fetch and validate PDF
  // --------------------------------------------------

  const fetchPdf = async (url) => {
    const response = await fetch(url, {
      method: "GET",
      credentials: "same-origin",
    });

    if (!response.ok) {
      let message = "Could not retrieve the PDF.";

      try {
        const body = await response.json();

        if (body?.error || body?.message) {
          message = body.error || body.message;
        }
      } catch {
        // Response was not JSON.
      }

      throw new Error(message);
    }

    const blob = await response.blob();

    const header = new Uint8Array(
      await blob.slice(0, 5).arrayBuffer()
    );

    const signature = String.fromCharCode(...header);

    if (signature !== "%PDF-") {
      throw new Error("The server did not return a valid PDF.");
    }

    return blob;
  };

  // --------------------------------------------------
  // Download PDF
  // --------------------------------------------------

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 60000);
  };

  // --------------------------------------------------
  // Contract-level PDF actions
  // Used when waitForPdfApproval = false
  // --------------------------------------------------

  const handleDownloadPdf = async (contract) => {
    const loadingKey = `contract-${contract.contract_id}`;

    try {
      setError("");
      setPdfLoading(loadingKey);

      const blob = await fetchPdf(
        `/api/dashboard/contracts/${encodeURIComponent(
          contract.contract_id
        )}/pdf`
      );

      downloadBlob(
        blob,
        `${getSafeFilename(contract.title)}.pdf`
      );
    } catch (err) {
      console.error("PDF download failed:", err);
      setError(err.message || "Could not download the contract.");
    } finally {
      setPdfLoading(null);
    }
  };

  const handleViewPdf = async (contract) => {
    const loadingKey = `contract-${contract.contract_id}`;

    const popup = window.open("", "_blank");

    if (!popup) {
      setError("Please allow popups to view the PDF.");
      return;
    }

    try {
      setError("");
      setPdfLoading(loadingKey);

      popup.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Loading PDF...</title>
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
            Loading PDF...
          </body>
        </html>
      `);

      const blob = await fetchPdf(
        `/api/dashboard/contracts/${encodeURIComponent(
          contract.contract_id
        )}/pdf`
      );

      const url = window.URL.createObjectURL(blob);

      popup.addEventListener(
        "beforeunload",
        () => window.URL.revokeObjectURL(url),
        { once: true }
      );

      popup.location.href = url;
    } catch (err) {
      console.error("PDF preview failed:", err);

      if (!popup.closed) {
        popup.close();
      }

      setError(err.message || "Could not open the contract.");
    } finally {
      setPdfLoading(null);
    }
  };

  // --------------------------------------------------
  // Individual signer PDF actions
  // Used when waitForPdfApproval = true
  // --------------------------------------------------

  const handleDownloadSignerPdf = async (contract, signer) => {
    const loadingKey =
      `signer-${contract.contract_id}-${signer.signer_id}`;

    try {
      setError("");
      setPdfLoading(loadingKey);

      if (!signer.version_id) {
        throw new Error(
          "No Signits contract ID was found for this signer."
        );
      }

      const blob = await fetchPdf(
        `/api/dashboard/contracts/${encodeURIComponent(
          contract.contract_id
        )}/signers/${encodeURIComponent(
          signer.signer_id
        )}/pdf`
      );

      const filename = [
        getSafeFilename(contract.title),
        `signer-${signer.position ?? signer.signer_id}`,
        `signits-${signer.version_id}`,
      ].join("_");

      downloadBlob(blob, `${filename}.pdf`);
    } catch (err) {
      console.error("Signer PDF download failed:", err);
      setError(
        err.message || "Could not download the signer PDF."
      );
    } finally {
      setPdfLoading(null);
    }
  };

  const handleViewSignerPdf = async (contract, signer) => {
    const loadingKey =
      `signer-${contract.contract_id}-${signer.signer_id}`;

    const popup = window.open("", "_blank");

    if (!popup) {
      setError("Please allow popups to view the PDF.");
      return;
    }

    try {
      setError("");
      setPdfLoading(loadingKey);

      if (!signer.version_id) {
        throw new Error(
          "No Signits contract ID was found for this signer."
        );
      }

      popup.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Loading signer PDF...</title>
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
            Loading signed PDF...
          </body>
        </html>
      `);

      const blob = await fetchPdf(
        `/api/dashboard/contracts/${encodeURIComponent(
          contract.contract_id
        )}/signers/${encodeURIComponent(
          signer.signer_id
        )}/pdf`
      );

      const url = window.URL.createObjectURL(blob);

      popup.addEventListener(
        "beforeunload",
        () => window.URL.revokeObjectURL(url),
        { once: true }
      );

      popup.location.href = url;
    } catch (err) {
      console.error("Signer PDF preview failed:", err);

      if (!popup.closed) {
        popup.close();
      }

      setError(
        err.message || "Could not open the signer PDF."
      );
    } finally {
      setPdfLoading(null);
    }
  };

  // --------------------------------------------------
  // AI change review
  // --------------------------------------------------

  const handleReviewChanges = async (
    contract,
    signer,
    previousSigner
  ) => {
    const reviewKey =
      `${contract.contract_id}-${signer.signer_id}`;

    try {
      setReviewLoading(reviewKey);

      setReviewErrors((current) => ({
        ...current,
        [reviewKey]: "",
      }));

      const response = await apiFetch(
        `/api/dashboard/contracts/${encodeURIComponent(
          contract.contract_id
        )}/review-changes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            previous_signer_id: previousSigner.signer_id,
            current_signer_id: signer.signer_id,
            previous_version_id: previousSigner.version_id,
            current_version_id: signer.version_id,
          }),
        }
      );

      setChangeReviews((current) => ({
        ...current,
        [reviewKey]: response,
      }));
    } catch (err) {
      console.error("AI change review failed:", err);

      setReviewErrors((current) => ({
        ...current,
        [reviewKey]:
          err.message || "Could not review contract changes.",
      }));
    } finally {
      setReviewLoading(null);
    }
  };

  // --------------------------------------------------
  // User information
  // --------------------------------------------------

  const name = user?.name || user?.username || "User";
  const email = user?.mail || user?.email || "No email available";

  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // --------------------------------------------------
  // Filter contracts
  // --------------------------------------------------

  const filteredContracts = contracts.filter((contract) => {
    const status = normalizeStatus(contract.status);

    if (activeFilter === "all") return true;

    if (activeFilter === "pending") {
      return (
        status !== "completed" &&
        status !== "failed" &&
        status !== "declined"
      );
    }

    return status === activeFilter;
  });

  // --------------------------------------------------
  // Expand contract details
  // --------------------------------------------------

  const toggleExpand = (id) => {
    setExpandedContract((current) =>
      current === id ? null : id
    );
  };

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  if (!user) return null;

  return (
    <div className="dashboard">

      {/* Top Bar */}
      <div className="dashboard-top-bar">
        <button
          className="dashboard-cancel"
          onClick={onCancel}
          type="button"
        >
          <FaTimes /> Cancel
        </button>
      </div>

      {/* Compact Header */}
      <header className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
        </div>

        <div className="dashboard-user">
          <div className="dashboard-avatar">{initials}</div>

          <div className="dashboard-user-details">
            <span className="dashboard-user-name">{name}</span>
            <span className="dashboard-user-email">{email}</span>
          </div>
        </div>
      </header>

      {/* Statistics */}
      <section className="dashboard-stats">

        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">
            <FaFileAlt />
          </div>

          <div>
            <p>Total contracts</p>
            <h3>{loading ? "—" : stats.total}</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-orange">
            <FaClock />
          </div>

          <div>
            <p>Awaiting signatures</p>
            <h3>{loading ? "—" : stats.pending}</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">
            <FaCheckCircle />
          </div>

          <div>
            <p>Completed contracts</p>
            <h3>{loading ? "—" : stats.completed}</h3>
          </div>
        </div>

      </section>

      {/* Main Content */}
      <div className="dashboard-content">
        <section className="dashboard-panel contracts-panel">

          {/* Panel Header */}
          <div className="panel-header">
            <div>
              <h2>Your contracts</h2>
              <p>View and manage your signing activity.</p>
            </div>

            {/* Filters */}
            <div className="filter-buttons">

              <button
                className={`filter-btn ${
                  activeFilter === "all" ? "active" : ""
                }`}
                onClick={() => setActiveFilter("all")}
                type="button"
              >
                <FaFilter /> All
              </button>

              <button
                className={`filter-btn ${
                  activeFilter === "pending" ? "active" : ""
                }`}
                onClick={() => setActiveFilter("pending")}
                type="button"
              >
                <FaClock /> Pending
              </button>

              <button
                className={`filter-btn ${
                  activeFilter === "completed" ? "active" : ""
                }`}
                onClick={() => setActiveFilter("completed")}
                type="button"
              >
                <FaCheckCircle /> Completed
              </button>

            </div>
          </div>

          {/* Contract List */}
          <div className="contracts-list">

            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}

            {loading && (
              <div className="empty-state">
                Loading contracts...
              </div>
            )}

            {!loading && filteredContracts.length === 0 && (
              <div className="empty-state">
                No contracts found.
              </div>
            )}

            {!loading &&
              filteredContracts.map((contract) => {
                const usesSignerHistory =
                  contract.waitForPdfApproval === true;

                const expanded =
                  expandedContract === contract.contract_id;

                const orderedSigners = usesSignerHistory
                  ? getOrderedSigners(contract)
                  : [];

                const contractLoading =
                  pdfLoading ===
                  `contract-${contract.contract_id}`;

                return (
                  <div
                    className="contract-item"
                    key={contract.contract_id}
                  >

                    {/* Contract Header */}
                    <div className="contract-item-header">

                      <div className="contract-main-info">
                        <div className="contract-file-icon">
                          <FaFileAlt />
                        </div>

                        <div>
                          <strong>
                            {contract.title || "Untitled contract"}
                          </strong>

                          <span className="contract-meta">
                            Contract #{contract.contract_id}
                            {" · "}
                            {formatDate(contract.created_at)}
                            {" · "}
                            Signing Method:{" "}
                            {formatStatus(contract.sign_method)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="contract-actions">

                        <span
                          className={`status-badge ${getStatusClass(
                            contract.status
                          )}`}
                        >
                          {formatStatus(contract.status)}
                        </span>

                        {/* No individual signing history */}
                        {!usesSignerHistory &&
                          normalizeStatus(contract.status) === "completed" && (
                            <>
                              <button
                                className="btn-icon-text"
                                onClick={() =>
                                  handleViewPdf(contract)
                                }
                                disabled={contractLoading}
                                title="View the current contract PDF"
                                type="button"
                              >
                                <FaEye />
                                View PDF
                              </button>

                              <button
                                className="btn-icon-text"
                                onClick={() =>
                                  handleDownloadPdf(contract)
                                }
                                disabled={contractLoading}
                                title="Download the current contract PDF"
                                type="button"
                              >
                                <FaDownload />
                                {contractLoading
                                  ? "Loading..."
                                  : "Download"}
                              </button>
                            </>
                          )}

                        {/* Individual signing history */}
                        {usesSignerHistory && (
                          <button
                            className="btn-icon-text"
                            onClick={() =>
                              toggleExpand(contract.contract_id)
                            }
                            aria-expanded={expanded}
                            type="button"
                          >
                            <FaEye />

                            {expanded
                              ? "Hide History"
                              : "Signing History"}

                            {expanded ? (
                              <FaChevronUp />
                            ) : (
                              <FaChevronDown />
                            )}
                          </button>
                        )}

                      </div>
                    </div>

                    {/* Expanded Signing History */}
                    {expanded && usesSignerHistory && (
                      <div className="contract-details">

                        <div className="contract-signing-history">

                          <div className="signing-history-intro">
                            <strong>Signing history</strong>

                            <p>
                              Each entry represents the exact PDF
                              version associated with that signer's
                              signing step. View or download retrieves
                              that specific version, not necessarily
                              the latest contract.
                            </p>

                            {contract.signSamePdf === true && (
                              <p>
                                The same PDF is passed between signers.
                                You can request an AI review to identify
                                significant changes between signing
                                versions.
                              </p>
                            )}
                          </div>

                          {orderedSigners.length > 0 ? (
                            <div className="signing-timeline">

                              {orderedSigners.map((signer, index) => {
                                const signerLoading =
                                  pdfLoading ===
                                  `signer-${contract.contract_id}-${signer.signer_id}`;

                                const previousSigner =
                                  index > 0
                                    ? orderedSigners[index - 1]
                                    : null;

                                const canReviewChanges =
                                  contract.waitForPdfApproval === true &&
                                  contract.signSamePdf === true &&
                                  previousSigner?.version_id &&
                                  signer.version_id;

                                const reviewKey =
                                  `${contract.contract_id}-${signer.signer_id}`;

                                const reviewLoadingThis =
                                  reviewLoading === reviewKey;

                                const review =
                                  changeReviews[reviewKey];

                                const reviewError =
                                  reviewErrors[reviewKey];

                                return (
                                  <div
                                    className="signing-timeline-item"
                                    key={
                                      signer.signer_id ??
                                      `${contract.contract_id}-signer-${index}`
                                    }
                                  >

                                    {/* Signer information */}
                                    <div className="signer-history-info">

                                      <p>
                                        <strong>
                                          Signer {index + 1}:
                                        </strong>{" "}
                                        {signer.name || "Unknown signer"}
                                      </p>

                                      <p>
                                        <strong>Email:</strong>{" "}
                                        {signer.mail ||
                                          signer.email ||
                                          "No email"}
                                      </p>

                                      <p>
                                        <strong>Status:</strong>{" "}
                                        {formatStatus(signer.status)}
                                      </p>

                                      {(signer.signed_at ||
                                        signer.completed_at) && (
                                        <p>
                                          <strong>Signed:</strong>{" "}
                                          {formatDateTime(
                                            signer.signed_at ||
                                            signer.completed_at
                                          )}
                                        </p>
                                      )}

                                      <p className="signer-version-description">
                                        <strong>Signed document:</strong>{" "}
                                        {signer.version_id
                                          ? `Version ${index + 1} (Signits ID: ${signer.version_id})`
                                          : "PDF version unavailable"}
                                      </p>

                                    </div>

                                    {/* PDF actions */}
                                    <div className="signer-history-actions">

                                      <button
                                        className="btn-icon-text"
                                        type="button"
                                        disabled={
                                          signerLoading ||
                                          !signer.version_id
                                        }
                                        onClick={() =>
                                          handleViewSignerPdf(
                                            contract,
                                            signer
                                          )
                                        }
                                        title={`View the exact PDF signed by signer ${index + 1}`}
                                      >
                                        <FaEye />
                                        View signed version
                                      </button>

                                      <button
                                        className="btn-icon-text"
                                        type="button"
                                        disabled={
                                          signerLoading ||
                                          !signer.version_id
                                        }
                                        onClick={() =>
                                          handleDownloadSignerPdf(
                                            contract,
                                            signer
                                          )
                                        }
                                        title={`Download the exact PDF signed by signer ${index + 1}`}
                                      >
                                        <FaDownload />
                                        Download signed version
                                      </button>

                                      {/* AI change review */}
                                      {canReviewChanges && (
                                        <button
                                          className="btn-icon-text ai-review-button"
                                          type="button"
                                          disabled={reviewLoadingThis}
                                          onClick={() =>
                                            handleReviewChanges(
                                              contract,
                                              signer,
                                              previousSigner
                                            )
                                          }
                                          title={`Compare version ${index} with version ${index + 1}`}
                                        >
                                          {reviewLoadingThis
                                            ? "Reviewing..."
                                            : "AI change review"}
                                        </button>
                                      )}

                                    </div>

                                    {/* AI review error */}
                                    {reviewError && (
                                      <div
                                        className="ai-review-error"
                                        role="alert"
                                      >
                                        {reviewError}
                                      </div>
                                    )}

                                    {/* AI review result */}
                                    {review && (
                                      <div className="ai-review-result">

                                        <h4>
                                          AI review of changes
                                        </h4>

                                        <p className="ai-review-comparison">
                                          Comparing version {index} with
                                          version {index + 1}
                                        </p>

                                        <div className="ai-review-content">
                                          {review.summary ||
                                            review.review ||
                                            review.message ||
                                            "No summary was returned."}
                                        </div>

                                        {Array.isArray(review.changes) &&
                                          review.changes.length > 0 && (
                                            <div className="ai-review-changes">
                                              <strong>
                                                Significant changes
                                              </strong>

                                              <ul>
                                                {review.changes.map(
                                                  (change, changeIndex) => (
                                                    <li key={changeIndex}>
                                                      {typeof change === "string"
                                                        ? change
                                                        : change.description ||
                                                          change.summary ||
                                                          JSON.stringify(change)}
                                                    </li>
                                                  )
                                                )}
                                              </ul>
                                            </div>
                                          )}

                                      </div>
                                    )}

                                  </div>
                                );
                              })}

                            </div>
                          ) : (
                            <p className="no-signing-history">
                              No signing history is available for this contract.
                            </p>
                          )}

                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      </div>
    </div>
  );
}
