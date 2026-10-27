import { useState } from "react";
import App from "@/App.jsx";
import pdfLogo from "@/assets/pdf_logo.png";
import "./landing.css";

export default function Landing() {
  const [editorStarted, setEditorStarted] = useState(false);

  if (editorStarted) {
    return <App />;
  }

  return (
    <div className="landing-page">
      <header className="landing-navbar">
        <div className="landing-brand">
          <img src={pdfLogo} alt="PDF Editor logo" />
          <span>PDF Editor</span>
        </div>

        <button
          className="landing-nav-button"
          onClick={() => setEditorStarted(true)}
        >
          Open editor
        </button>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-content">

            <h1>
              Everything you need to work with PDFs.
            </h1>

            <p className="landing-subtitle">
              Open, annotate, and sign documents with MitId in one simple workspace.
              No complicated setup. Just open your file and get to work.
            </p>

            <button
              className="landing-primary-button"
              onClick={() => setEditorStarted(true)}
            >
              Open PDF Editor
              <span aria-hidden="true">→</span>
            </button>

            <p className="landing-note">
              Get started by opening a document from your computer.
            </p>
          </div>

          <div className="landing-preview">
            <div className="preview-window">
              <div className="preview-toolbar">
                <div className="preview-dots">
                  <span />
                  <span />
                  <span />
                </div>
                <span className="preview-filename">my-document.pdf</span>
              </div>

              <div className="preview-workspace">
                <aside className="preview-sidebar">
                  <span className="preview-tool active">↖</span>
                  <span className="preview-tool">T</span>
                  <span className="preview-tool">✎</span>
                  <span className="preview-tool">✓</span>
                </aside>

                <div className="preview-paper">
                  <div className="paper-label">DOCUMENT PREVIEW</div>
                  <div className="paper-title" />
                  <div className="paper-line long" />
                  <div className="paper-line" />
                  <div className="paper-line medium" />

                  <div className="paper-section-title" />
                  <div className="paper-line long" />
                  <div className="paper-line medium" />
                  <div className="paper-line" />

                  <div className="paper-signature">
                    <span>Sample signature</span>
                    <div />
                  </div>
                </div>
              </div>
            </div>

            <div className="preview-floating-card">
              <span className="preview-check">✓</span>
              <div>
                <strong>One simple workspace</strong>
                <p>Everything in one place.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-features">
          <div className="landing-section-heading">
            <span className="landing-eyebrow">MADE FOR EVERYDAY WORK</span>
            <h2>Less time managing files. More time getting things done.</h2>
          </div>

          <div className="feature-grid">
            <article className="feature-card">
              <div className="feature-icon blue">↗</div>
              <h3>Open your documents</h3>
              <p>
                Select a PDF from your computer and bring it directly into
                your workspace.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon purple">✎</div>
              <h3>Annotate and review</h3>
              <p>
                Work with your documents using the available editing,
                annotation, and review tools.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon green">✓</div>
              <h3>Sign and finish</h3>
              <p>
                Access the tools you need to prepare and sign documents,
                then save your work.
              </p>
            </article>
          </div>
        </section>

        <section className="landing-bottom-cta">
          <h2>Ready to open your next document?</h2>
          <p>Your workspace is just one click away.</p>
          <button
            className="landing-primary-button"
            onClick={() => setEditorStarted(true)}
          >
            Get started <span aria-hidden="true">→</span>
          </button>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-brand">
          <img src={pdfLogo} alt="" />
          <span>PDF Editor</span>
        </div>
        <span>Simple tools for working with documents.</span>
      </footer>
    </div>
  );
}