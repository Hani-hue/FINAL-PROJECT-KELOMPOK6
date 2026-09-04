import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';

function Navbar() {
  const { user, profile, isAdmin, logout } = useAuth();
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    showAlert('Berhasil logout', 'success');
    navigate('/login');
  };

  return (
    <header className="bg-leather-900 border-b border-leather-700">
      <nav className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" className="font-serif font-bold text-lg text-leather-50 shrink-0">
          📚 Perpustakaan Digital
        </Link>

        <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:gap-4">
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <li>
              <Link to="/" className="text-leather-200 hover:text-leather-50">
                Katalog
              </Link>
            </li>

            {user && !isAdmin && (
              <>
                <li>
                  <Link to="/peminjaman-saya" className="text-leather-200 hover:text-leather-50">
                    Peminjaman Saya
                  </Link>
                </li>
                <li>
                  <Link to="/chatbot" className="text-leather-200 hover:text-leather-50">
                    Chatbot
                  </Link>
                </li>
              </>
            )}

            {isAdmin && (
              <>
                <li>
                  <Link to="/admin" className="text-leather-200 hover:text-leather-50">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/admin/buku" className="text-leather-200 hover:text-leather-50">
                    Kelola Buku
                  </Link>
                </li>
                <li>
                  <Link to="/admin/transaksi" className="text-leather-200 hover:text-leather-50">
                    Transaksi
                  </Link>
                </li>
                <li>
                  <Link to="/admin/user" className="text-leather-200 hover:text-leather-50">
                    Kelola User
                  </Link>
                </li>
              </>
            )}
          </ul>

          {user ? (
            <div ref={menuRef} className="relative border-t border-leather-700 pt-3 sm:border-t-0 sm:pt-0">
              <button
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-haspopup="true"
                className="flex w-full items-center justify-between gap-3 bg-leather-800 border-2 border-leather-50 rounded-lg px-3 py-1.5 text-leather-50 sm:w-auto"
              >
                <span className="truncate">{profile?.nama ?? user.email}</span>
                <span className={`text-xs transition-transform ${menuOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 z-10 mt-2 w-full min-w-[10rem] rounded-lg border-2 border-leather-50 bg-leather-800 py-1 shadow-lg sm:w-auto">
                  <button
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-leather-50 hover:bg-leather-700"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="text-leather-200 hover:text-leather-50">
                Login
              </Link>
              <Link
                to="/register"
                className="bg-leather-700 hover:bg-leather-800 text-leather-50 border-2 border-leather-50 px-3 py-1.5 rounded-lg"
              >
                Daftar
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
