import React from 'react';
import './Splash.css';
import crikLogoImg from '../../assets/crik-logo.svg';

export default function Splash() {
  return (
    <div className="splash-container">
      <div className="splash-logo-ring">
        <img src={crikLogoImg} alt="Crik.ai" className="splash-logo" />
      </div>
      <p className="splash-brand">Crik.ai</p>
    </div>
  );
}
