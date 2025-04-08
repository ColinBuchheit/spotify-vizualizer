// frontend/src/ui/ErrorOverlay.js
export function createErrorOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'error-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML = `
      <div class="error-container">
        <h2>Something went wrong</h2>
        <p id="error-message"></p>
        <button id="error-retry">Retry</button>
        <button id="error-disconnect">Disconnect</button>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    document.getElementById('error-retry').addEventListener('click', () => {
      window.location.reload();
    });
    
    document.getElementById('error-disconnect').addEventListener('click', () => {
      window.location.href = '/';
    });
    
    return {
      show: (message) => {
        document.getElementById('error-message').textContent = message;
        overlay.style.display = 'flex';
      },
      hide: () => {
        overlay.style.display = 'none';
      }
    };
  }