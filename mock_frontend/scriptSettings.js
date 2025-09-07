import { palette } from './palettes.js';

document.addEventListener('DOMContentLoaded', () => {
    const paletteSelect = document.getElementById('palette-select');
    
    // Set the selected option based on saved palette
    const savedPalette = localStorage.getItem('palette') || 'Minimalist 1';
    paletteSelect.value = savedPalette;
    
    // Apply the saved palette on load
    const selectedPalette = palette[savedPalette] || palette['Minimalist 1'];
    document.documentElement.style.setProperty('--bg-color', `#${selectedPalette[0]}`);
    document.documentElement.style.setProperty('--text-color', `#${selectedPalette[1]}`);
    document.documentElement.style.setProperty('--button-color', `#${selectedPalette[2]}`);
    document.documentElement.style.setProperty('--highlight-color', `#${selectedPalette[3]}`);
    document.documentElement.style.setProperty('--secondary-text-color', `#${selectedPalette[4]}`);
    
    // Update palette on selection change
    paletteSelect.addEventListener('change', (event) => {
        const selectedValue = event.target.value;
        localStorage.setItem('palette', selectedValue);
        const newPalette = palette[selectedValue];
        document.documentElement.style.setProperty('--bg-color', `#${newPalette[0]}`);
        document.documentElement.style.setProperty('--text-color', `#${newPalette[1]}`);
        document.documentElement.style.setProperty('--button-color', `#${newPalette[2]}`);
        document.documentElement.style.setProperty('--highlight-color', `#${newPalette[3]}`);
        document.documentElement.style.setProperty('--secondary-text-color', `#${newPalette[4]}`);
    });
});