import { useContext, useState } from "react";
import { DocSpecsContext } from "@/App";
import { AuthContext, NavigationContext} from "@/App";

export default function MakeSignature() {
  const [isOpen, setIsOpen] = useState(false);
  const [signMethod, setSignMethod] = useState("eid");
  const [waitForPDF,setWaitForPDF] = useState(true);
  const [signers, setSigners] = useState([
    { id: crypto.randomUUID(), name: "", email: "" },
  ]);
  const [orderingMatters, setOrderingMatters] = useState(false);
  const [error, setError] = useState("");

  const { getCurrentFile, 
          fileName,
          uploadedFile} = useContext(DocSpecsContext);
  const { user, setUser } = useContext(AuthContext);
  const {activePage, previousPage, navigateTo, requestLogin} = useContext(NavigationContext);

  function addSigner() {
    if (signers.length >= 20) return;

    setSigners((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: "",
        email: "",
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
        signer.id === id
          ? { ...signer, [field]: value }
          : signer
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

  function handleStartSigning() {
    setError("");

    if (!uploadedFile) {
      setError("No document has been selected.");
      return;
    }
    if (!requestLogin()) {
      return;
    }
    
    if (
      signers.some(
        (signer) =>
          !signer.name.trim() ||
          !signer.email.trim()
      )
    ) {
      setError("Please enter a name and email for every signer.");
      return;
    }

    const invalidEmail = signers.some(
      (signer) =>
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signer.email.trim())
    );

    if (invalidEmail) {
      setError("Please enter valid email addresses.");
      return;
    }

    console.log("Document:", uploadedFile);

    const combineDocumentWithSigners = async () => {
      const actualFile = await getCurrentFile(); // Assuming this returns a File or Blob
    
      if (!actualFile) {
        console.error("No file selected for signing.");
        setError("No file selected for signing.");
        return;
      }
    
      const formData = new FormData();
      formData.append("pdf", actualFile, actualFile.name); // Ensure the file has a name
      formData.append("sign_method", signMethod);
      formData.append("username",user.username);
      formData.append("mail",user.email);
      formData.append("ordering_matters", orderingMatters);
      formData.append("signers", JSON.stringify(signers)); // Send signers as stringified JSON inside form data
      formData.append("title",fileName);
      formData.append("waitForPDF",waitForPDF);
      try {
        const response = await fetch("/api/send_contract", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
    
        if (!response.ok) {
          console.error("send contract responded with error");
          setError("Failed to send contract. Please try again.");
        } else {
          const result = await response.json();
          console.log("Contract sent successfully:", result);
        }
      } catch (error) {
        console.error("Error sending contract:", error);
        setError("An error occurred while sending the contract.");
      }
    };
    combineDocumentWithSigners(); 
  }

  return (
    <>
        <button className={"toolbar_button"} onClick={() => setIsOpen(true)}>
          Signature
        </button>
        {isOpen && (
        <div style={styles.overlay}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="signature-title"
            style={styles.modal}
          >
            <div style={styles.header}>
              <h2 id="signature-title">Sign document</h2>
              <button onClick={() => setIsOpen(false)}>
                Close
              </button>
            </div>

            <p>
              Choose how you want the document to be signed.
            </p>

            <div style={styles.methodContainer}>
          <label style={styles.methodOption}>
              <input
                  type="radio"
                  name="signMethod"
                  value="eid"
                  checked={signMethod === "eid"}
                  onChange={() => setSignMethod("eid")}
              />
              eID
          </label>

          <label style={styles.methodOption}>
              <input
                  type="radio"
                  name="signMethod"
                  value="email"
                  checked={signMethod === "email"}
                  onChange={() => setSignMethod("email")}
              />
              Email signing
          </label>
      </div>

      <br />

      <div style={styles.methodContainer}>
          <label style={styles.methodOption}>
              <input
                  type="checkbox"
                  checked={waitForPDF}
                  onChange={(e) => setWaitForPDF(e.target.checked)}
              />
              Wait for PDF to be signed before eID/Email approval
          </label>
      </div>

            <div style={styles.divider} />

            <div style={styles.signerHeading}>
              <h3>Signers</h3>
              <span>{signers.length}/20</span>
            </div>

            {signers.map((signer, index) => (
              <div key={signer.id} style={styles.signerCard}>
                <div style={styles.signerHeader}>
                  <strong>Signer {index + 1}</strong>

                  <div style={styles.controls}>
                    <button
                      disabled={index === 0}
                      onClick={() => moveSigner(index, -1)}
                    >
                      ↑
                    </button>

                    <button
                      disabled={index === signers.length - 1}
                      onClick={() => moveSigner(index, 1)}
                    >
                      ↓
                    </button>

                    {signers.length > 1 && (
                      <button
                        onClick={() => removeSigner(signer.id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <label style={styles.fieldLabel}>
                  Name
                  <input
                    style={styles.input}
                    type="text"
                    value={signer.name}
                    onChange={(event) =>
                      updateSigner(
                        signer.id,
                        "name",
                        event.target.value
                      )
                    }
                    placeholder="Full name"
                  />
                </label>

                <label style={styles.fieldLabel}>
                  Email
                  <input
                    style={styles.input}
                    type="email"
                    value={signer.email}
                    onChange={(event) =>
                      updateSigner(
                        signer.id,
                        "email",
                        event.target.value
                      )
                    }
                    placeholder="Email address"
                  />
                </label>
              </div>
            ))}

            <button
              style={styles.addButton}
              disabled={signers.length >= 20}
              onClick={addSigner}
            >
              + Add signer
            </button>

            <div style={styles.divider} />

            <label style={styles.orderingOption}>
              <input
                type="checkbox"
                checked={orderingMatters}
                onChange={(event) =>
                  setOrderingMatters(event.target.checked)
                }
              />
              Ordering matters
            </label>

            <p style={styles.hint}>
              {orderingMatters
                ? "Signers must sign sequentially in the order shown above."
                : "Signers can sign in any order."}
            </p>

            {error && (
              <p role="alert" style={styles.error}>
                {error}
              </p>
            )}

            <div style={styles.footer}>
              <button onClick={() => setIsOpen(false)}>
                Cancel
              </button>

              <button onClick={handleStartSigning}>
                Continue
              </button>
            </div>
          </div>
        </div>
        )}
    </>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },

  modal: {
    background: "white",
    color: "#222",
    borderRadius: 12,
    padding: 24,
    width: "min(720px, 100%)",
    maxHeight: "90vh",
    overflowY: "auto",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },

  methodContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: 24,
    marginTop: 16,
  },

  methodOption: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
  },

  divider: {
    borderTop: "1px solid #ddd",
    margin: "20px 0",
  },

  signerHeading: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  signerCard: {
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
  },

  signerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },

  controls: {
    display: "flex",
    gap: 6,
  },

  fieldLabel: {
    display: "block",
    marginTop: 12,
  },

  input: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "9px 10px",
    marginTop: 5,
    border: "1px solid #ccc",
    borderRadius: 6,
  },

  addButton: {
    display: "inline-block",
    cursor: "pointer",
    padding: "10px 14px",
    border: "1px solid #ccc",
    borderRadius: 6,
    marginTop: 12,
  },

  orderingOption: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
  },

  hint: {
    color: "#666",
    fontSize: 13,
    marginTop: 8,
  },

  footer: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 24,
  },

  error: {
    color: "#b00020",
    marginTop: 12,
  },
};
