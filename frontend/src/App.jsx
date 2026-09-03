import { BrowserRouter } from 'react-router-dom';
import { AlertProvider } from './context/AlertContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import AppRoutes from './routes';

function App() {
  return (
    <BrowserRouter>
      <AlertProvider>
        <AuthProvider>
          <div className="flex flex-col min-h-screen bg-gradient-to-br from-leather-100 via-leather-50 to-leather-200">
            <Navbar />
            <main className="flex-1">
              <AppRoutes />
            </main>
          </div>
        </AuthProvider>
      </AlertProvider>
    </BrowserRouter>
  );
}

export default App;
