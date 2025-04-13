export function createThemeSwitcher(themes, onSelect) {
    const select = document.createElement('select');
  
    themes.forEach(theme => {
      const option = document.createElement('option');
      option.value = theme;
      option.textContent = theme;
      select.appendChild(option);
    });
  
    Object.assign(select.style, {
      position: 'absolute',
      top: '10px',
      right: '10px',
      padding: '6px',
      fontSize: '14px',
    });
  
    select.addEventListener('change', () => {
      onSelect(select.value);
    });
  
    document.body.appendChild(select);
  }
  