import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { setUser, setSession, logout } from "./store/authSlice";
import { verifySession, signOut } from "./services/authService";
import Onboarding from "./Pages/Onboarding/Onboarding";
import Dashboard from "./Pages/Dashboard/Dashboard";

function App() {
  const dispatch = useDispatch();
  const hasRunBoot = useRef(false);

  useEffect(() => {
    if (hasRunBoot.current) return;
    hasRunBoot.current = true;

    const runBootCheck = async () => {
      const token = localStorage.getItem("session-token");
      if (!token) return;

      console.log("🔄 [App Boot] Verifying existing session…");
      const result = await verifySession(token);

      if (result.success && result.user) {
        console.log("✅ [App Boot] Auto-login SUCCESS");
        localStorage.setItem("userData", JSON.stringify(result.user));
        dispatch(setUser({
          name: result.user.name || result.user.first_name || "User",
          email: result.user.email || "",
          avatar: result.user.picture || "/avatar-placeholder.svg",
        }));
        dispatch(setSession(token));
      } else {
        console.warn("❌ [App Boot] Session invalid — clearing");
        localStorage.removeItem("session-token");
        localStorage.removeItem("userData");
        await signOut(token);
        dispatch(logout());
      }
    };

    runBootCheck();
  }, [dispatch]);

  return (
    <Routes>
      <Route path="/" element={<Onboarding />} />
      <Route path="/dashboard" element={<Dashboard />} />
      {/* Add more routes here as the dashboard grows */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
