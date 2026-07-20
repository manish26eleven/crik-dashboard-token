import './Login.css';
import crikLogoImg from '../../assets/crik-logo.svg';
import googleImg from '../../assets/google.svg';

/**
 * Login card component.
 * Props:
 *   onSignIn  — called when user clicks the "Sign in with Google" button.
 *   isLoading — shows a spinner while auth is in progress.
 *   error     — error message to display if auth fails.
 */
export default function Login({ onSignIn, isLoading = false, error = null }) {

  return (
    <div className="login-card">
      <div className="logo-wrapper">
        <div className="logo-circle">
          <img src={crikLogoImg} alt="Crik Logo" />
        </div>
      </div>

      <div className="login-text">
        <h1 className="login-title">Welcome Back!</h1>
        <p className="login-subtext">
          Log in with your Google account to access the Crik.ai admin
          dashboard and manage your settings.
        </p>
      </div>

      {error && (
        <div className="login-error" role="alert">
          {error}
        </div>
      )}

      <button
        id="btn-google-signin"
        className={`google-button ${isLoading ? 'loading' : ''}`}
        onClick={onSignIn}
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="btn-spinner" />
        ) : (
          <img src={googleImg} alt="Google" />
        )}
        {isLoading ? 'Signing in…' : 'Sign in with Google'}
      </button>
    </div>
  );
}
