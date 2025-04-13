// Parse the access token from URL hash after redirect
export function extractAccessTokenFromUrl() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return params.get('access_token');
  }
  
  // Store token in localStorage
  export function saveAccessToken(token) {
    localStorage.setItem('spotify_access_token', token);
  }
  
  export function getStoredAccessToken() {
    return localStorage.getItem('spotify_access_token');
  }
  
  export function clearToken() {
    localStorage.removeItem('spotify_access_token');
  }
  