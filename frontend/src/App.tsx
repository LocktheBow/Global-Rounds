import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import CommandCenter from './pages/CommandCenter';

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/CommandCenter" replace />} />
      <Route path="/CommandCenter" element={<CommandCenter />} />
    </Routes>
  </BrowserRouter>
);

export default App;
