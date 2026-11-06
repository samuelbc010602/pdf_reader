import { AuthContext, DocSpecsContext, NavigationContext } from "@/App";
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
  FaEye 
} from "react-icons/fa";
import "./dashboard.css";

export default function Dashboard({ onCancel }) {
  const { user } = useContext(AuthContext);
  const { activePage, navigateTo } = useContext(NavigationContext);

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

  useEffect(() => {
    console.log("in useEffect with activePage",activePage);
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

    return contract.status === activeFilter;
  });

  const toggleExpand = (id) => {
    setExpandedContract(expandedContract === id ? null : id);
  };

  return (
    <div className="dashboard">
      {/* Top Bar with Cancel Button */}
      <div className="dashboard-top-bar">
        <button className="dashboard-cancel" onClick={onCancel}>
          <FaTimes /> Cancel
        </button>
      </div>

      {/* Header */}
      <header className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">YOUR WORKSPACE</p>
          <h1>Dashboard</h1>
          <p className="dashboard-subtitle">
            Manage your documents and signatures in one place.
          </p>
        </div>

        <div className="dashboard-user">
          <div className="dashboard-avatar">{initials}</div>
          <div className="dashboard-user-details">
            <span className="dashboard-user-name">{name}</span>
            <span className="dashboard-user-email">{email}</span>
          </div>
        </div>
      </header>

      {/* Welcome */}
      <section className="dashboard-welcome">
        <div>
          <span className="welcome-label">WELCOME BACK</span>
          <h2>Hello, {name.split(" ")[0]}!</h2>
          <p>Here's an overview of your document activity.</p>
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
          <div className="panel-header">
            <div>
              <h2>Your contracts</h2>
              <p>View and manage your signing activity.</p>
            </div>
            {/* Filter buttons with icons */}
            <div className="filter-buttons">
              <button 
                className={`filter-btn ${activeFilter === "all" ? "active" : ""}`}
                onClick={() => setActiveFilter("all")}
              >
                <FaFilter /> All
              </button>
              <button 
                className={`filter-btn ${activeFilter === "pending" ? "active" : ""}`}
                onClick={() => setActiveFilter("pending")}
              >
                <FaClock /> Pending
              </button>
              <button 
                className={`filter-btn ${activeFilter === "completed" ? "active" : ""}`}
                onClick={() => setActiveFilter("completed")}
              >
                <FaCheckCircle /> Completed
              </button>
            </div>
          </div>

          {/* Contract list */}
          <div className="contracts-list">
            {error && <div className="error-message">{error}</div>}
            
            {!loading && filteredContracts.length === 0 && (
              <div className="empty-state">No contracts found.</div>
            )}

            {filteredContracts.map((contract) => (
              <div className="contract-item" key={contract.contract_id}>
                <div className="contract-item-header">
                  <div className="contract-main-info">
                    <div className="contract-file-icon">
                      <FaFileAlt />
                    </div>
                    <div>
                      <strong>{contract.title}</strong>
                      <span className="contract-meta">
                        Contract #{contract.contract_id} ·{" "}
                        {formatDate(contract.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="contract-actions">
                    <span className={`status-badge ${getStatusClass(contract.status)}`}>
                      {formatStatus(contract.status)}
                    </span>
                    <button 
                      className="btn-icon-text" 
                      onClick={() => toggleExpand(contract.contract_id)}
                    >
                      <FaEye /> {expandedContract === contract.contract_id ? "Hide Details" : "View"}
                      {expandedContract === contract.contract_id ? <FaChevronUp /> : <FaChevronDown />}
                    </button>
                  </div>
                </div>

                {expandedContract === contract.contract_id && (
                  <div className="contract-details">
                    <p><strong>Status:</strong> {formatStatus(contract.status)}</p>
                    <p><strong>Created:</strong> {formatDate(contract.created_at)}</p>
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