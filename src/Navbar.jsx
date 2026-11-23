import { useEffect, useState } from "react";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { LogOut } from "lucide-react";
import { auth } from "./firebase";
import "./styles.css";

function Navbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <nav className="navbar">
      <h2>CareBridge AI</h2>

      <div className="user-section">
        <div className="user-info">
          <strong>
            Welcome, {user?.displayName || "Customer"}!
          </strong>
          <span>Welcome to CareBridge AI</span>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={17} />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
