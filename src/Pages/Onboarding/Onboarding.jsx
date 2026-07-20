import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setUser, setSession, logout } from "../../store/authSlice";
import { googleSignIn, verifySession, signOut } from "../../services/authService";
import Splash from "../../components/Splash/Splash";
import Login from "../../components/Login/Login";
import "./Onboarding.css";

/**
 * Onboarding page — orchestrates the full sign-in flow:
 *
 *   splash → login → (Google OAuth popup) → /dashboard
 *
 * On boot it checks localStorage for an existing session token and
 * auto-logs the user in if valid, mirroring the Electron app's behavior.
 */
export default function Onboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const isAuthenticated = useSelector((state) => !!state.auth.sessionToken);

  // Stage machine: 'splash' → 'login' → 'done'
  const initialStage = location.state?.stage || "splash";
  const [stage, setStage] = useState(initialStage);

  // Splash animation flags
  const [fade, setFade] = useState(false);
  const [hideSplash, setHideSplash] = useState(initialStage !== "splash");
  const [isSplashFinished, setIsSplashFinished] = useState(initialStage !== "splash");

  // Login state
  const [loginFading, setLoginFading] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Boot verification ref guard
  const hasRunBoot = useRef(false);

  /* ─── Splash timer ─────────────────────────────────── */
  useEffect(() => {
    if (initialStage !== "splash") return;

    const fadeTimer = setTimeout(() => setFade(true), 2500);
    const removeTimer = setTimeout(() => {
      setHideSplash(true);
      setIsSplashFinished(true);
    }, 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  /* ─── Auto-login on boot ────────────────────────────── */
  useEffect(() => {
    if (hasRunBoot.current) return;
    hasRunBoot.current = true;

    const runBootCheck = async () => {
      const token = localStorage.getItem("session-token");
      if (!token) return; // no token → stay on login

      console.log("🔄 [Boot] Found session-token, verifying…");
      const result = await verifySession(token);

      if (result.success && result.user) {
        console.log("✅ [Boot] Auto-login SUCCESS");
        localStorage.setItem("userData", JSON.stringify(result.user));

        dispatch(setUser({
          name: result.user.name || result.user.first_name || "User",
          email: result.user.email || "",
          avatar: result.user.picture || "/avatar-placeholder.svg",
        }));
        dispatch(setSession(token));

        navigate("/dashboard");
      } else {
        console.warn("❌ [Boot] Session invalid — cleaning up");
        localStorage.removeItem("session-token");
        localStorage.removeItem("userData");
        await signOut(token);
        dispatch(logout());
      }
    };

    runBootCheck();
  }, [dispatch, navigate]);

  /* ─── Stage transition after splash ────────────────── */
  useEffect(() => {
    if (!isSplashFinished) return;

    if (location.state?.stage && location.state.stage !== "splash") {
      setStage(location.state.stage);
    } else if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      setStage("login");
    }
  }, [isSplashFinished, location.state?.stage, isAuthenticated, navigate]);

  /* ─── Google sign-in handler ────────────────────────── */
  const handleSignIn = async () => {
    setAuthError(null);
    setIsSigningIn(true);

    try {
      // 'ADMIN' role — the admin dashboard doesn't need role selection
      const result = await googleSignIn("ADMIN");
      console.log("Google Auth result:", result);

      if (result.success && result.sessionToken) {
        // Persist token
        localStorage.setItem("session-token", result.sessionToken);
        if (result.user) {
          localStorage.setItem("userData", JSON.stringify(result.user));
          dispatch(setUser({
            name: result.user.name || result.user.first_name || "User",
            email: result.user.email || "",
            avatar: result.user.picture || "/avatar-placeholder.svg",
          }));
        }
        dispatch(setSession(result.sessionToken));

        // Fade out login card then navigate
        setLoginFading(true);
        setTimeout(() => {
          navigate("/dashboard");
        }, 500);
      } else {
        setAuthError(result.error || "Sign-in was cancelled or failed. Please try again.");
        setIsSigningIn(false);
      }
    } catch (e) {
      console.error("Auth error:", e);
      setAuthError("An unexpected error occurred. Please try again.");
      setIsSigningIn(false);
    }
  };

  return (
    <>
      {/* Full-screen dark gradient background */}
      <div className="onboarding-bg">
        <div className="onboarding-bg-orb orb-1" />
        <div className="onboarding-bg-orb orb-2" />
        <div className="onboarding-bg-orb orb-3" />
      </div>

      <div className="onboarding-container">
        {/* Splash layer */}
        {!hideSplash && (
          <div className={`splash-layer ${fade ? "fade-out" : ""}`}>
            <Splash />
          </div>
        )}

        {/* Login layer */}
        {stage === "login" && (
          <div className={`login-layer fade-in ${loginFading ? "fade-out" : ""}`}>
            <Login
              onSignIn={handleSignIn}
              isLoading={isSigningIn}
              error={authError}
            />
          </div>
        )}
      </div>
    </>
  );
}
