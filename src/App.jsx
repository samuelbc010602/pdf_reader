import { useState } from "react";
import Toolbar from './components/toolbar/toolbar'
import Search from './components/search/search'
import Share from './components/share/share'
import Document from './components/document/document'
function App() {
  return (
    <div className="toolbar">
      <Toolbar/>
      <div className="toolbar-right">
        <Search/>
        <Share/>
      </div>
      <Document></Document>
    </div>
  );
}

export default App;