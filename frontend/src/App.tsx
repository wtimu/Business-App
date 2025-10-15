import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/Home';
import AdminPage from './pages/Admin';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}
