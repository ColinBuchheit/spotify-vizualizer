// src/auth/handleAuth.js
export function getAccessTokenFromUrl() {
    const hash = window.location.href.split('?')[1];
    if (!hash) return null;
  
    const params = new URLSearchParams(hash);
    return params.get('access_token');
  }
  