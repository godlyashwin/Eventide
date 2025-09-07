import { palette } from './palettes.js';

document.addEventListener('DOMContentLoaded', () => {
    const savedPalette = localStorage.getItem('palette') || 'Minimalist 1';
    const selectedPalette = palette[savedPalette] || palette['Minimalist 1'];
    document.documentElement.style.setProperty('--bg-color', `${selectedPalette[0]}`);
    document.documentElement.style.setProperty('--text-color', `${selectedPalette[1]}`);
    document.documentElement.style.setProperty('--button-color', `${selectedPalette[2]}`);
    document.documentElement.style.setProperty('--highlight-color', `${selectedPalette[3]}`);
    document.documentElement.style.setProperty('--secondary-text-color', `${selectedPalette[4]}`);
});