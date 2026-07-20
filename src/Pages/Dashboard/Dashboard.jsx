import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../store/authSlice";
import { signOut, getBroadcasters, createDashboardOrder } from "../../services/authService";
import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.sessionToken);

  const [tokenCount, setTokenCount] = useState("");
  const [price, setPrice] = useState("");
  const [emailQuery, setEmailQuery] = useState("");
  const [broadcasters, setBroadcasters] = useState([]);
  const [selectedBroadcaster, setSelectedBroadcaster] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successInfo, setSuccessInfo] = useState(null); // { name, tokenCount }

  // Hard lock — not subject to React state batching delays
  const isSubmittingRef = useRef(false);

  const handleLogout = async () => {
    await signOut(token);
    localStorage.removeItem("session-token");
    localStorage.removeItem("userData");
    dispatch(logout());
    navigate("/");
  };

  useEffect(() => {
    const fetchBroadcasters = async () => {
      try {
        const data = await getBroadcasters();
        setBroadcasters(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch broadcasters:", err);
      }
    };
    fetchBroadcasters();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredBroadcasters =
    emailQuery.trim() === ""
      ? []
      : broadcasters.filter((b) => {
          const q = emailQuery.toLowerCase();
          return (
            b.name?.toLowerCase().includes(q) ||
            b.email?.toLowerCase().includes(q)
          );
        });

  const handleSelectBroadcaster = (broadcaster) => {
    setSelectedBroadcaster(broadcaster);
    setEmailQuery(`${broadcaster.name} (${broadcaster.email})`);
    setShowDropdown(false);
  };

  const handleEmailChange = (e) => {
    setEmailQuery(e.target.value);
    setSelectedBroadcaster(null);
    setShowDropdown(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Synchronous guard — blocks a second click fired before React re-renders
    if (isSubmittingRef.current) return;

    setSubmitError("");

    if (!selectedBroadcaster) {
      setSubmitError("Please select a broadcaster.");
      return;
    }
    if (tokenCount === "" || price === "") {
      setSubmitError("Please enter both token count and amount.");
      return;
    }

    const payload = {
      userId: selectedBroadcaster.id,
      amount: Number(price),
      tokenCount: Number(tokenCount),
    };

    isSubmittingRef.current = true;
    setSubmitting(true);

    try {
      const result = await createDashboardOrder(token, payload);
      console.log("Order created:", result);

      setSuccessInfo({
        name: selectedBroadcaster.name,
        tokenCount: result.tokenCount ?? payload.tokenCount,
      });

      setTokenCount("");
      setPrice("");
      setEmailQuery("");
      setSelectedBroadcaster(null);
    } catch (err) {
      console.error("Failed to create order:", err);
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-welcome">Welcome back,</p>
          <h1 className="dashboard-title">{user?.name || "Admin User"}</h1>
          <p className="dashboard-subtitle">
            Use the form below to manage token pricing in a clean single-page layout.
          </p>
        </div>
        <button className="dashboard-logout" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <main className="dashboard-content">
        <section className="dashboard-form-card">
          <div className="dashboard-form-row">
            <label htmlFor="tokenCount">Token count</label>
            <input
              id="tokenCount"
              type="number"
              min="0"
              value={tokenCount}
              onChange={(e) => setTokenCount(e.target.value)}
              placeholder="Enter number of tokens"
              disabled={submitting}
            />
          </div>

          <div className="dashboard-form-row">
            <label htmlFor="price">Amount</label>
            <input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter amount"
              disabled={submitting}
            />
          </div>

          <div className="dashboard-form-row broadcaster-search-wrapper" ref={wrapperRef}>
            <label htmlFor="broadcasterSearch">Broadcaster</label>
            <input
              id="broadcasterSearch"
              name="broadcasterSearch"
              type="text"
              autoComplete="new-password"
              value={emailQuery}
              onChange={handleEmailChange}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search by name or email"
              disabled={submitting}
            />

            {showDropdown && filteredBroadcasters.length > 0 && (
              <ul className="broadcaster-dropdown">
                {filteredBroadcasters.map((b) => (
                  <li
                    key={b.id}
                    className="broadcaster-dropdown-item"
                    onClick={() => handleSelectBroadcaster(b)}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {b.name} <span className="broadcaster-email">({b.email})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="dashboard-form-row dashboard-submit-row">
            {submitError && <p className="dashboard-error-text">{submitError}</p>}
            <button
              className="dashboard-submit-button"
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </section>
      </main>

      {successInfo && (
        <div className="dashboard-modal-overlay" onClick={() => setSuccessInfo(null)}>
          <div className="dashboard-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dashboard-modal-icon">✓</div>
            <h2>Tokens Assigned</h2>
            <p>
              <strong>{successInfo.tokenCount}</strong> token
              {successInfo.tokenCount === 1 ? "" : "s"} assigned successfully to{" "}
              <strong>{successInfo.name}</strong>.
            </p>
            <button
              className="dashboard-modal-close"
              onClick={() => setSuccessInfo(null)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}