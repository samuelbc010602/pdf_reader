
import {
  AuthContext,
  DocSpecsContext,
  NavigationContext
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
  FaDownload
} from "react-icons/fa";

import "./dashboard.css";

export default function Dashboard({ onCancel }) {
  const { user } = useContext(AuthContext);
  const { activePage } = useContext(NavigationContext);

  const [contracts, setContracts] = useState([]);

  //contracts.past_contracts list of text values, each text values should be converted to integer
  //
  /*

  we can call the following using the contract_id to download from the remote database
  is it possible to not download locally but call in case the users tries to download or just store the url if the user wants to view in browser
  
  def download_signits_pdf(contract_id, reference):

    if not SIGNITS_API_KEY:
        raise RuntimeError("SIGNITS_API_KEY is not set.")

    url = (
        f"{SIGNITS_BASE_URL}/api/v1/contracts/"
        f"{contract_id}/pdf"
    )

    response = requests.get(
        url,
        headers={
            "Authorization": f"Bearer {SIGNITS_API_KEY}"
        },
        timeout=60
    )

    response.raise_for_status()

    pdf_bytes = response.content

    if not pdf_bytes.startswith(b"%PDF-"):
        raise ValueError(
            "SIGNITS did not return a valid PDF."
        )

    output_path = (
        SIGNED_DIR /
        f"eid_signed_{safe_filename(reference)}.pdf"
    )

    with open(output_path, "wb") as f:
        f.write(pdf_bytes)

    print(
        f"Final eID-signed PDF downloaded: {output_path}",
        flush=True
    )

    return str(output_path)

  */

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedContract, setExpandedContract] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(null);

  // --------------------------------------------------
  // Fetch dashboard data
  // --------------------------------------------------

  useEffect(() => {
    if (activePage !== "dashboard" || !user) {
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
          setError("Could not load your contracts. Please try again.");
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
  // Fetch signed contract PDF
  // --------------------------------------------------

  const fetchContractPdf = async (contractId) => {
    const response = await fetch(
      `/api/dashboard/contracts/${contractId}/pdf`,
      {
        method: "GET",
        credentials: "same-origin",
      }
    );

    if (!response.ok) {
      throw new Error("Could not retrieve the signed contract.");
    }

    return await response.blob();
  };


  // --------------------------------------------------
  // Download signed contract
  // --------------------------------------------------

  const handleDownloadPdf = async (contract) => {
    try {
      setError("");
      setPdfLoading(contract.contract_id);

      const blob = await fetchContractPdf(contract.contract_id);

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = `${contract.title || "contract"}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 60000);

    } catch (err) {
      console.error("PDF download failed:", err);

      setError("Could not download the signed contract.");

    } finally {
      setPdfLoading(null);
    }
  };


  // --------------------------------------------------
  // View signed contract in browser popup
  // --------------------------------------------------

  const handleViewPdf = async (contract) => {
    // Open synchronously to avoid browser popup blockers.
    const popup = window.open("", "_blank");

    if (!popup) {
      setError("Please allow popups to view the signed contract.");
      return;
    }

    try {
      setError("");
      setPdfLoading(contract.contract_id);

      popup.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Loading signed contract...</title>
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
            Loading signed contract...
          </body>
        </html>
      `);

      const blob = await fetchContractPdf(contract.contract_id);

      const url = window.URL.createObjectURL(blob);

      // Keep the URL alive while the PDF is open.
      popup.addEventListener("beforeunload", () => {
        window.URL.revokeObjectURL(url);
      }, { once: true });

      popup.location.href = url;

    } catch (err) {
      console.error("PDF preview failed:", err);

      popup.close();

      setError("Could not open the signed contract.");

    } finally {
      setPdfLoading(null);
    }
  };


  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------

  if (!user) return null;

  const name = user.name || user.username || "User";
  const email = user.mail || user.email || "No email available";

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatStatus = (status) => {
    if (!status) return "Unknown";

    return status
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const getStatusClass = (status) => {
    return (status || "unknown").toLowerCase().replaceAll("_", "-");
  };

  const filteredContracts = contracts.filter((contract) => {
    if (activeFilter === "all") return true;

    if (activeFilter === "pending") {
      return contract.status !== "completed" &&
        contract.status !== "failed" &&
        contract.status !== "declined";
    }

    return contract.status === activeFilter;
  });

  const toggleExpand = (id) => {
    setExpandedContract(
      expandedContract === id ? null : id
    );
  };


  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <div className="dashboard">

      {/* Top Bar */}
      <div className="dashboard-top-bar">
        <button
          className="dashboard-cancel"
          onClick={onCancel}
        >
          <FaTimes /> Cancel
        </button>
      </div>


      {/* Header */}
      <header className="dashboard-header">

        <div>
          <p className="dashboard-eyebrow">
            YOUR WORKSPACE
          </p>

          <h1>Dashboard</h1>

          <p className="dashboard-subtitle">
            Manage your documents and signatures in one place.
          </p>
        </div>

        <div className="dashboard-user">

          <div className="dashboard-avatar">
            {initials}
          </div>

          <div className="dashboard-user-details">
            <span className="dashboard-user-name">
              {name}
            </span>

            <span className="dashboard-user-email">
              {email}
            </span>
          </div>

        </div>

      </header>


      {/* Welcome */}
      <section className="dashboard-welcome">

        <div>
          <span className="welcome-label">
            WELCOME BACK
          </span>

          <h2>
            Hello, {name.split(" ")[0]}!
          </h2>

          <p>
            Here's an overview of your document activity.
          </p>
        </div>

        <div className="welcome-decoration">
          <span>✦</span>
        </div>

      </section>


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

          <div className="stat-icon stat-icon-green">
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

              <p>
                View and manage your signing activity.
              </p>
            </div>


            {/* Filters */}
            <div className="filter-buttons">

              <button
                className={`filter-btn ${
                  activeFilter === "all" ? "active" : ""
                }`}
                onClick={() => setActiveFilter("all")}
              >
                <FaFilter /> All
              </button>


              <button
                className={`filter-btn ${
                  activeFilter === "pending" ? "active" : ""
                }`}
                onClick={() => setActiveFilter("pending")}
              >
                <FaClock /> Pending
              </button>


              <button
                className={`filter-btn ${
                  activeFilter === "completed" ? "active" : ""
                }`}
                onClick={() => setActiveFilter("completed")}
              >
                <FaCheckCircle /> Completed
              </button>

            </div>

          </div>


          {/* Contract List */}
          <div className="contracts-list">

            {error && (
              <div className="error-message">
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


            {!loading && filteredContracts.map((contract) => (

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
                        {contract.title}
                      </strong>

                      <span className="contract-meta">
                        Contract #{contract.contract_id}
                        {" · "}
                        {formatDate(contract.created_at)}
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


                    {/* Completed contract actions */}
                    {contract.status === "completed" && (
                      <>

                        <button
                          className="btn-icon-text"
                          onClick={() => handleViewPdf(contract)}
                          disabled={pdfLoading === contract.contract_id}
                          title="View signed contract"
                        >
                          <FaEye />
                          View PDF
                        </button>


                        <button
                          className="btn-icon-text"
                          onClick={() => handleDownloadPdf(contract)}
                          disabled={pdfLoading === contract.contract_id}
                          title="Download signed contract"
                        >
                          <FaDownload />
                          {pdfLoading === contract.contract_id
                            ? "Loading..."
                            : "Download"}
                        </button>

                      </>
                    )}


                    {/* Contract details */}
                    <button
                      className="btn-icon-text"
                      onClick={() => toggleExpand(contract.contract_id)}
                    >
                      <FaEye />

                      {expandedContract === contract.contract_id
                        ? "Hide Details"
                        : "Details"}

                      {expandedContract === contract.contract_id
                        ? <FaChevronUp />
                        : <FaChevronDown />}
                    </button>

                  </div>

                </div>


                {/* Expanded Contract Details */}
                {expandedContract === contract.contract_id && (

                  <div className="contract-details">

                    <p>
                      <strong>Status:</strong>{" "}
                      {formatStatus(contract.status)}
                    </p>

                    <p>
                      <strong>Created:</strong>{" "}
                      {formatDate(contract.created_at)}
                    </p>

                    <p>
                      <strong>Signing method:</strong>{" "}
                      {formatStatus(contract.sign_method)}
                    </p>


                    {/* Signers */}
                    {contract.signers?.length > 0 && (

                      <div className="contract-signers">

                        <strong>Signers:</strong>

                        {contract.signers.map((signer) => (

                          <div
                            className="contract-signer"
                            key={signer.signer_id}
                          >

                            <div>
                              <p><strong>{signer.name}</strong> - {signer.email}</p>
                            </div>

                            <span
                              className={`status-badge ${getStatusClass(
                                signer.status
                              )}`}
                            >
                              {formatStatus(signer.status)}
                            </span>

                          </div>

                        ))}

                      </div>

                    )}

                  </div>

                )}

              </div>

            ))}

          </div>

        </section>

      </div>

    </div>
  );
}
