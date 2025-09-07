import { useNavigate } from 'react-router-dom';
import { usePalette } from './PaletteContext.jsx';

function Settings() {
  const { selectedPalette, setSelectedPalette } = usePalette();
  const navigate = useNavigate();

  const handlePaletteChange = (e) => {
    const newPalette = e.target.value;
    setSelectedPalette(newPalette);
    localStorage.setItem('palette', newPalette);
  };

  return (
    <div className="relative flex size-full min-h-screen flex-col bg-bg-color group/design-root overflow-x-hidden" style={{ fontFamily: '"Plus Jakarta Sans", "Noto Sans", sans-serif' }}>
      <div className="layout-container flex h-full grow flex-col">
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#e7edf4] px-10 py-3">
          <div className="flex items-center gap-4 text-text-color">
            <div className="size-4">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z" fill="currentColor"></path>
              </svg>
            </div>
            <h2 className="text-text-color text-lg font-bold leading-tight tracking-[-0.015em]">Eventide</h2>
          </div>
          <div className="flex flex-1 justify-end gap-8">
            <div className="flex items-center gap-9">
              <a className="text-text-color text-sm font-medium leading-normal" href="#" onClick={() => navigate('/')}>Calendar</a>
              <a className="text-text-color text-sm font-medium leading-normal" href="#">Tasks</a>
              <a className="text-text-color text-sm font-medium leading-normal" href="#">Contacts</a>
            </div>
            <button
              className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 bg-button-color text-text-color gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-2.5"
            >
              <div className="text-text-color" data-icon="Question" data-size="20px" data-weight="regular">
                <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" fill="currentColor" viewBox="0 0 256 256">
                  <path
                    d="M140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180ZM128,72c-22.06,0-40,16.15-40,36v4a8,8,0,0,0,16,0v-4c0-11,10.77-20,24-20s24,9,24,20-10.77,20-24,20a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-.72c18.24-3.35,32-17.9,32-35.28C168,88.15,150.06,72,128,72Zm104,56A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"
                  ></path>
                </svg>
              </div>
            </button>
            <div
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10"
              style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCACpGMxaKhyW5GgSIGxZ2Kj1fKEVtRiOPO5UHpcVL-EPKYoprC3Jg34-FvlHPbz8JwgLZPG_LNW8pe4GdZ8FU_cBKAXlzOYXfJdzl0Nco9u-6aS5INljtutRd8aeHMHD2Oh25iQWtt7iplp6Vz0E1KCrHLjGs_rYrrMhgeStseoCC2IFwcL_p3PJQzKCoRfvc2pEiq_JZ84a_UXvku1v-OZeP46kExdUjJpppxc6LcxRopBPhJcEWNVor0MRwD-gP8UQQK8IIcVYk")' }}
            ></div>
          </div>
        </header>
        <div className="px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            <div className="flex flex-wrap justify-between gap-3 p-4">
              <p className="text-text-color tracking-light text-[32px] font-bold leading-tight min-w-72">Settings</p>
            </div>
            <h3 className="text-text-color text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">General</h3>
            <div className="flex items-center gap-4 bg-bg-color px-4 min-h-[72px] py-2 justify-between">
              <div className="flex flex-col justify-center">
                <p className="text-text-color text-base font-medium leading-normal line-clamp-1">Calendar Palette</p>
                <p className="text-secondary-text-color text-sm font-normal leading-normal line-clamp-2">Choose a color palette for your calendar</p>
              </div>
              <select
                id="palette-select"
                className="border border-color rounded-lg p-2 w-32 text-text-color text-sm"
                value={selectedPalette}
                onChange={handlePaletteChange}
              >
                <option value="Default">Default</option>
                <option value="Minimalist 1">Minimalist 1</option>
                <option value="Minimalist 2">Minimalist 2</option>
                <option value="Radiant">Radiant</option>
                <option value="Calm">Calm</option>
              </select>
            </div>
            <div className="flex items-center gap-4 bg-bg-color px-4 min-h-[72px] py-2 justify-between">
              <div className="flex flex-col justify-center">
                <p className="text-text-color text-base font-medium leading-normal line-clamp-1">Reminders</p>
                <p className="text-secondary-text-color text-sm font-normal leading-normal line-clamp-2">Set default reminders for events</p>
              </div>
              <div className="shrink-0">
                <button
                  className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 bg-button-color text-text-color text-sm font-medium leading-normal w-fit"
                >
                  <span className="truncate">Set</span>
                </button>
              </div>
            </div>
            <h3 className="text-text-color text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Account</h3>
            <div className="flex items-center gap-4 bg-bg-color px-4 min-h-[72px] py-2 justify-between">
              <div className="flex flex-col justify-center">
                <p className="text-text-color text-base font-medium leading-normal line-clamp-1">Account Preferences</p>
                <p className="text-secondary-text-color text-sm font-normal leading-normal line-clamp-2">Manage your account preferences</p>
              </div>
              <div className="shrink-0">
                <button
                  className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 bg-button-color text-text-color text-sm font-medium leading-normal w-fit"
                >
                  <span className="truncate">Manage</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-bg-color px-4 min-h-[72px] py-2 justify-between">
              <div className="flex flex-col justify-center">
                <p className="text-text-color text-base font-medium leading-normal line-clamp-1">Log Out</p>
                <p className="text-secondary-text-color text-sm font-normal leading-normal line-clamp-2">Log out of your account</p>
              </div>
              <div className="shrink-0">
                <button
                  className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 bg-button-color text-text-color text-sm font-medium leading-normal w-fit"
                >
                  <span className="truncate">Log Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;