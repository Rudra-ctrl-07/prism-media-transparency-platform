import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="border-t border-silver-grey bg-surface">
      <div className="w-full py-8 px-4 mx-auto max-w-[1280px] flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <img
            alt="PRISM Logo"
            className="h-6 opacity-80"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAwycrjJPMSNu6gzl_ZrjGx8LgGqQEaN-BoyQtIM_uDHESN2KzeZ-PLIWwaOchma3KiTc0wIHo6PthQ68ikwbDS0pPw2lEyYLTZz_EobTseMjBMiNbDxe-9fTt6hCUES2bknqUK8vFk8G8XE973bPyeYmnkN5nuWHai9rpRhTQWtseeEcJc8WUM6bUin6FVGUo4cetrCw4d2HlkdwkExnwfiw2ByBNlE9F-_dINO25YPg7egAgluGl8Ku3mvBbFkMQ3P4WDPIWk1K4"
          />
          <span className="font-headline-md text-headline-md text-primary opacity-80">PRISM</span>
        </div>
        <div className="flex gap-8 font-label-sm text-label-sm text-on-surface-variant">
          <a href="#" className="hover:text-secondary transition-colors">About</a>
          <a href="#" className="hover:text-secondary transition-colors">Methodology</a>
          <a href="#" className="hover:text-secondary transition-colors">Privacy</a>
          <a href="#" className="hover:text-secondary transition-colors">Terms</a>
          <a href="#" className="hover:text-secondary transition-colors">Contact</a>
          <Link to="/upgrade" className="hover:text-secondary transition-colors ml-4">
            Login / Upgrade
          </Link>
        </div>
      </div>
      <p className="font-label-sm text-label-sm text-on-surface-variant opacity-60 text-center mt-4">
        © 2024 PRISM Media Transparency. All rights reserved.
      </p>
    </footer>
  );
};