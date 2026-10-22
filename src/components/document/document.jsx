import { useState } from "react";
import "./document.css";

function Document() {
  const [title, setTitle] = useState("Untitled document");

  function formatText(command) {
    document.execCommand(command, false, null);
  }

  return (
    <div className="document-app">
      <header className="document-header">
        <input
          className="document-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-label="Document title"
        />
        <span className="document-status">Editing</span>
      </header>

      <div className="document-toolbar">
        <button onClick={() => formatText("bold")} title="Bold">
          <b>B</b>
        </button>
        <button onClick={() => formatText("italic")} title="Italic">
          <i>I</i>
        </button>
        <button onClick={() => formatText("underline")} title="Underline">
          <u>U</u>
        </button>

        <span className="toolbar-divider" />

        <button
          onClick={() => formatText("insertUnorderedList")}
          title="Bullet list"
        >
          • List
        </button>
        <button
          onClick={() => formatText("insertOrderedList")}
          title="Numbered list"
        >
          1. List
        </button>
      </div>

      <main className="document-workspace">
        <article
          className="document-page"
          contentEditable
          suppressContentEditableWarning
          spellCheck
          role="textbox"
          aria-label="Document content"
          aria-multiline="true"
        >
          <h1>Untitled document</h1>
          <p>Start writing here...</p>
        </article>
      </main>
    </div>
  );
}

export default Document;