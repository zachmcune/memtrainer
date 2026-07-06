import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { UpdateBanner } from './components/UpdateBanner';
import { HomePage } from './features/home/HomePage';
import { TrainingPage } from './features/training/TrainingPage';
import { TrainingResumeBanner } from './features/training/TrainingRunner';
import { DeckPage } from './features/deck/DeckPage';
import { OrderPage } from './features/order/OrderPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { StatsPage } from './features/stats/StatsPage';
import { TrainingSessionProvider } from './state/TrainingSessionContext';
import { useSound } from './audio/useSound';

function NavItem({ to, label, icon }: { to: string; label: string; icon: string }) {
  const play = useSound();
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
      onClick={() => play('nav')}
    >
      <span className="nav-icon" aria-hidden>
        {icon}
      </span>
      <span className="nav-label">{label}</span>
    </NavLink>
  );
}

export default function App() {
  const location = useLocation();
  return (
    <TrainingSessionProvider>
      <div className="app-shell">
        <main className="app-main">
          <UpdateBanner />
          <TrainingResumeBanner />
          <div className="view" key={location.pathname}>
            <Routes location={location}>
              <Route path="/" element={<HomePage />} />
              <Route path="/train" element={<TrainingPage />} />
              <Route path="/order" element={<OrderPage />} />
              <Route path="/stack" element={<DeckPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/stats" element={<StatsPage />} />
            </Routes>
          </div>
        </main>
        <nav className="app-nav">
          <NavItem to="/" label="Home" icon={'\u2660'} />
          <NavItem to="/train" label="Train" icon={'\u25B6'} />
          <NavItem to="/order" label="Order" icon={'\u21C5'} />
          <NavItem to="/stack" label="Stack" icon={'\u2663'} />
          <NavItem to="/stats" label="Stats" icon={'\u25A6'} />
          <NavItem to="/settings" label="Settings" icon={'\u2699'} />
        </nav>
      </div>
    </TrainingSessionProvider>
  );
}
