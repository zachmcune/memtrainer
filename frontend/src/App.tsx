import { NavLink, Route, Routes } from 'react-router-dom';
import { HomePage } from './features/home/HomePage';
import { TrainingPage } from './features/training/TrainingPage';
import { DeckPage } from './features/deck/DeckPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { StatsPage } from './features/stats/StatsPage';

function NavItem({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
    >
      <span className="nav-icon" aria-hidden>
        {icon}
      </span>
      <span className="nav-label">{label}</span>
    </NavLink>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/train" element={<TrainingPage />} />
          <Route path="/stack" element={<DeckPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
      </main>
      <nav className="app-nav">
        <NavItem to="/" label="Home" icon={'\u2660'} />
        <NavItem to="/train" label="Train" icon={'\u25B6'} />
        <NavItem to="/stack" label="Stack" icon={'\u2663'} />
        <NavItem to="/stats" label="Stats" icon={'\u25A6'} />
        <NavItem to="/settings" label="Settings" icon={'\u2699'} />
      </nav>
    </div>
  );
}
