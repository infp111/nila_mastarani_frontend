import { Routes, Route, Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Home from './pages/Home.jsx';
import CoursePage from './pages/CoursePage.jsx';
import Tutor from './pages/Tutor.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Profile from './pages/Profile.jsx';
import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import AdminCourses from './pages/admin/Courses.jsx';
import CourseEditor from './pages/admin/CourseEditor.jsx';
import Engines from './pages/admin/Engines.jsx';
import MailSettings from './pages/admin/MailSettings.jsx';
import TutorSettings from './pages/admin/TutorSettings.jsx';
import Users from './pages/admin/Users.jsx';
import Lesson from './pages/Lesson.jsx';
import Review from './pages/Review.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Onboarding from './pages/Onboarding.jsx';
import { useEffect } from 'react';
import { useEngage, startWebReminderWatch } from './engage.jsx';
import { StatPills, BottomNav } from './components/Engage.jsx';

function TopBar() {
  const { user } = useAuth();
  return (
    <header className="topbar">
      <Link to="/" className="brand"><img src="/icon.svg" alt="" /> Kathai <span className="odia">କଥାଇ</span></Link>
      <nav>
        <span className="desk-only row gap">
          <NavLink to="/" end>Learn</NavLink>
          <NavLink to="/review">Review</NavLink>
          <NavLink to="/practice">Free talk</NavLink>
          <NavLink to="/leaderboard">League</NavLink>
        </span>
        <StatPills compact />
        {user ? <NavLink to="/me" className="desk-only">{user.name.split(' ')[0]}</NavLink> : <NavLink to="/signin" className="btn btn-sm">Sign up</NavLink>}
      </nav>
    </header>
  );
}

function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center muted">Loading…</div>;
  if (!user || user.role !== 'admin') return <Navigate to="/admin/login" replace />;
  return children;
}

export default function App() {
  const loc = useLocation();
  const isAdmin = loc.pathname.startsWith('/admin');
  const isTutor = loc.pathname.startsWith('/learn') || loc.pathname.startsWith('/practice');
  const engage = useEngage();
  useEffect(() => startWebReminderWatch(() => engage?.stats), [engage?.stats]);
  const focus = isTutor || loc.pathname.startsWith('/lesson') || loc.pathname.startsWith('/welcome');
  return (
    <>
      {!isAdmin && !focus && <TopBar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/course/:slug" element={<CoursePage />} />
        <Route path="/learn/:lessonId" element={<Tutor />} />
        <Route path="/lesson/:lessonId" element={<Lesson />} />
        <Route path="/review" element={<Review />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/welcome" element={<Onboarding />} />
        <Route path="/practice" element={<Tutor />} />
        <Route path="/signin" element={<AuthPage />} />
        <Route path="/me" element={<Profile />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<Dashboard />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="courses/:id" element={<CourseEditor />} />
          <Route path="engines" element={<Engines />} />
          <Route path="tutor" element={<TutorSettings />} />
          <Route path="mail" element={<MailSettings />} />
          <Route path="users" element={<Users />} />
        </Route>
        <Route path="*" element={<div className="center"><h2>Page not found</h2><Link to="/">Go home</Link></div>} />
      </Routes>
      {!isAdmin && !focus && <BottomNav />}
    </>
  );
}
