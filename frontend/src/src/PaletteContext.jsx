import { createContext, useContext, useState, useEffect } from 'react';
import { palette } from './palettes.js';

const PaletteContext = createContext();

export const PaletteProvider = ({ children }) => {
  const [selectedPalette, setSelectedPalette] = useState(localStorage.getItem('palette') || 'Default');

  const applyPalette = (paletteName) => {
    const selected = palette[paletteName] || palette['Minimalist 1'];
    document.documentElement.style.setProperty('--bg-color', selected[0]);
    document.documentElement.style.setProperty('--text-color', selected[1]);
    document.documentElement.style.setProperty('--button-color', selected[2]);
    document.documentElement.style.setProperty('--highlight-color', selected[3]);
    document.documentElement.style.setProperty('--secondary-text-color', selected[4]);
    document.documentElement.style.setProperty('--event-block-color', selected[3]);
    const darkenColor = (hex) => {
      let color = hex.replace('#', '');
      if (color.length === 3) color = color.split('').map(c => c + c).join('');
      const r = Math.max(0, parseInt(color.slice(0, 2), 16) - 50);
      const g = Math.max(0, parseInt(color.slice(2, 4), 16) - 50);
      const b = Math.max(0, parseInt(color.slice(4, 6), 16) - 50);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };
    document.documentElement.style.setProperty('--hover-highlight-color', darkenColor(selected[3]));
    document.documentElement.style.setProperty('--hover-color', darkenColor(selected[4]));
  };

  useEffect(() => {
    applyPalette(selectedPalette);
  }, [selectedPalette]);

  return (
    <PaletteContext.Provider value={{ selectedPalette, setSelectedPalette }}>
      {children}
    </PaletteContext.Provider>
  );
};

export const usePalette = () => useContext(PaletteContext);