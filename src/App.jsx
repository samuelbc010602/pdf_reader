import {
  useState,
  createContext,
  useEffect,
  useRef,
  useCallback,
} from "react";

import Toolbar from "./components/toolbar/toolbar";
import CustomDocument from "./components/document/document";
import Login from "./components/auth/Login";
import Dashboard from "./components/toolbar/dashboard/dashboard";
import ContractAccess from "./components/toolbar/dashboard/ContractAccess";

import {
  DEV_MODE,
  DEV_USER,
} from "@/config/devConfig";

import "./App.css";

// --------------------------------------------------
// Contexts
// --------------------------------------------------

export const DocSpecsContext = createContext(null);
export const AuthContext = createContext(null);
export const NavigationContext = createContext(null);

// --------------------------------------------------
// App
// --------------------------------------------------

function App() {
  // --------------------------------------------------
  // Guest contract access
  // --------------------------------------------------

  const pathname = window.location.pathname;

  const isContractAccessPage =
    /^\/contract-access\/[^/]+\/?$/.test(pathname);

  // Guest contract access does not need the editor,
  // dashboard or authentication modal.
  if (isContractAccessPage) {
    return <ContractAccess />;
  }

  // --------------------------------------------------
  // Document state
  // --------------------------------------------------

  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileName, setFileName] = useState();
  const [fileType, setFileType] = useState();

  const [signature, setSignature] = useState(false);

  const [toClose, setToClose] = useState(0);
  const [toPrint, setToPrint] = useState(0);
  const [toExport, setToExport] = useState(0);
  const [toFullscreen, setToFullscreen] = useState(0);
  const [toProtect, setToProtect] = useState(0);
  const [toCapture, setToCapture] = useState(0);

  const [newPdf, setNewPdf] = useState(DEV_MODE);

  // --------------------------------------------------
  // Navigation state
  // --------------------------------------------------

  const [activePage, setActivePage] = useState("editor");
  const [showLogin, setShowLogin] = useState(false);

  // --------------------------------------------------
  // Authentication state
  // --------------------------------------------------

  const [user, setUser] = useState(
    DEV_MODE ? DEV_USER : null
  );

  // --------------------------------------------------
  // Navigation helpers
  // --------------------------------------------------

  const navigateTo = useCallback(
    (page, options = {}) => {
      setActivePage(page);

      if (options.requiresAuth && !user) {
        setShowLogin(true);
      }
    },
    [user]
  );

  const requestLogin = useCallback(() => {
    if (!user) {
      setShowLogin(true);
      return false;
    }

    return true;
  }, [user]);

  // --------------------------------------------------
  // Current PDF getter
  // --------------------------------------------------

  const currentFileGetter = useRef(null);

  const registerCurrentFileGetter = useCallback((getter) => {
    currentFileGetter.current = getter;

    return () => {
      if (currentFileGetter.current === getter) {
        currentFileGetter.current = null;
      }
    };
  }, []);

  const getCurrentFile = useCallback(async () => {
    if (!currentFileGetter.current) {
      throw new Error("PDF viewer is not available");
    }

    return await currentFileGetter.current();
  }, []);

  // --------------------------------------------------
  // Login event listener
  // --------------------------------------------------

  useEffect(() => {
    const openLogin = () => {
      setShowLogin(true);
    };

    window.addEventListener("open-login", openLogin);

    return () => {
      window.removeEventListener("open-login", openLogin);
    };
  }, []);

  // --------------------------------------------------
  // Context providers
  // --------------------------------------------------

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <NavigationContext.Provider
        value={{
          activePage,
          navigateTo,
          showLogin,
          setShowLogin,
          requestLogin,
        }}
      >
        <DocSpecsContext.Provider
          value={{
            uploadedFile,
            setUploadedFile,

            fileName,
            setFileName,

            fileType,
            setFileType,

            signature,
            setSignature,

            toClose,
            setToClose,

            toPrint,
            setToPrint,

            toExport,
            setToExport,

            toFullscreen,
            setToFullscreen,

            toProtect,
            setToProtect,

            toCapture,
            setToCapture,

            newPdf,
            setNewPdf,

            registerCurrentFileGetter,
            getCurrentFile,
          }}
        >
          {/* ------------------------------------------ */}
          {/* Editor */}
          {/* ------------------------------------------ */}

          <div
            style={{
              display: activePage === "editor" ? "block" : "none",
            }}
          >
            <div className="app-container">
              <div className="toolbar-container">
                <Toolbar />
              </div>

              <div className="content-container">
                <CustomDocument />
              </div>
            </div>
          </div>

          {/* ------------------------------------------ */}
          {/* Dashboard */}
          {/* ------------------------------------------ */}

          <div
            style={{
              display: activePage === "dashboard" ? "block" : "none",
            }}
          >
            <Dashboard
              onCancel={() => navigateTo("editor")}
            />
          </div>

          {/* ------------------------------------------ */}
          {/* Login modal */}
          {/* ------------------------------------------ */}

          {showLogin && (
            <div className="login-overlay">
              <Login
                onLogin={(loggedInUser) => {
                  setUser(loggedInUser);
                  setShowLogin(false);
                }}
                onCancel={() => setShowLogin(false)} // Pass onCancel to close the modal
              />
            </div>
          )}

        </DocSpecsContext.Provider>
      </NavigationContext.Provider>
    </AuthContext.Provider>
  );
}

export default App;
/*
/*  
  useEffect(() => {
    let active = true;

    apiFetch("/api/me")
      .then((user) => {
        if (active) setUser(user);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (authLoading) {
    return <p>Checking login...</p>;
  }
  if (!user) {
    return (
      <AuthContext.Provider value={{ user, setUser }}>
        <Login onLogin = {setOnLogin}/>
      </AuthContext.Provider>
    );
  }

    function getPage() {
    switch (activePage) {
      case "dashboard":
        return <Dashboard />;
  
      default:
        return (
          <div className="app-container">
            <div className="toolbar-container">
              <Toolbar />
            </div>
  
            <div className="content-container">
              <CustomDocument />
            </div>
          </div>
        );
    }
  }
  */
