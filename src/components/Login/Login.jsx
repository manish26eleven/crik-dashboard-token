import './Login.css';
import crikLogoImg from '../../assets/crik-logo.svg';
import googleImg from '../../assets/google.svg';

/**
 * Login card component.
 * Props:
 *   selectedApp  — 'crik' | 'association'
 *   onAppChange  — called with the new app key when toggle is clicked
 *   onSignIn     — called when user clicks "Sign in with Google"
 *   isLoading    — shows a spinner while auth is in progress
 *   error        — error message to display if auth fails
 */
export default function Login({ selectedApp = 'crik', onAppChange, onSignIn, isLoading = false, error = null }) {
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
          Select your app and sign in with Google to access the admin dashboard.
        </p>
      </div>

      {/* App selector */}
      <div className="app-selector">
        <button
          className={`app-selector-btn ${selectedApp === 'crik' ? 'active' : ''}`}
          onClick={() => onAppChange?.('crik')}
          disabled={isLoading}
          type="button"
        >
          Crik
        </button>
        <button
          className={`app-selector-btn ${selectedApp === 'association' ? 'active' : ''}`}
          onClick={() => onAppChange?.('association')}
          disabled={isLoading}
          type="button"
        >
          Association
        </button>
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
