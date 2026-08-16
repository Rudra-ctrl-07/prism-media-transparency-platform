import { Link } from 'react-router-dom';

export const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-surface/80 backdrop-blur-md border-b border-silver-grey h-20 flex items-center">
      <div className="flex justify-between items-center w-full px-4 mx-auto max-w-[1280px]">
        <div className="flex items-center gap-4">
          <img
            alt="PRISM Logo"
            className="h-8 w-auto"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAwycrjJPMSNu6gzl_ZrjGx8LgGqQEaN-BoyQtIM_uDHESN2KzeZ-PLIWwaOchma3KiTc0wIHo6PthQ68ikwbDS0pPw2lEyYLTZz_EobTseMjBMiNbDxe-9fTt6hCUES2bknqUK8vFk8G8XE973bPyeYmnkN5nuWHai9rpRhTQWtseeEcJc8WUM6bUin6FVGUo4cetrCw4d2HlkdwkExnwfiw2ByBNlE9F-_dINO25YPg7egAgluGl8Ku3mvBbFkMQ3P4WDPIWk1K4"
          />
          <span className="font-headline-md text-headline-md font-medium tracking-tighter text-primary">PRISM</span>
        </div>
        <div className="hidden md:flex gap-8 items-center font-label-md text-label-md">
          <Link to="/feed" className="text-on-surface-variant hover:text-primary transition-colors">Transparency Feed</Link>
          <Link to="/methodology" className="text-on-surface-variant hover:text-primary transition-colors">How it Works</Link>
          <Link to="/pricing" className="text-on-surface-variant hover:text-primary transition-colors">Pricing</Link>
          <button className="bg-primary text-on-primary px-6 py-2 transition-transform active:scale-95">Verify Link</button>
        </div>
        <button className="md:hidden">
          <span className="material-symbols-outlined">menu</span>
        </button>
      </div>
    </nav>
  );
};