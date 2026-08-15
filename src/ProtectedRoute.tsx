import { useState } from 'react';

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? 'admin123';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem('admin_auth') === 'true'
  );
  const [input, setInput]   = useState('');
  const [error, setError]   = useState(false);

  if (authed) return <>{children}</>;

  const handleLogin = () => {
    if (input === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_auth', 'true');
      setAuthed(true);
    } else {
      setError(true);
      setInput('');
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0f172a'
    }}>
      <div style={{
        background: '#1e293b', borderRadius: 16, padding: '2.5rem 2rem',
        display: 'flex', flexDirection: 'column', gap: 16,
        boxShadow: '0 8px 32px #0008', minWidth: 320
      }}>
        <h2 style={{ color: '#06b6d4', margin: 0, textAlign: 'center', fontSize: 22 }}>
          🔒 Acceso Administrador
        </h2>
        <p style={{ color: '#94a3b8', margin: 0, textAlign: 'center', fontSize: 14 }}>
          D´Uñas — Panel de control
        </p>
        <input
          type="password"
          placeholder="Contraseña"
          value={input}
          onChange={e => { setInput(e.target.value); setError(false); }}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          autoFocus
          style={{
            padding: '10px 14px', borderRadius: 8, border: error ? '1.5px solid #f87171' : '1.5px solid #334155',
            background: '#0f172a', color: '#e2e8f0', fontSize: 15, outline: 'none'
          }}
        />
        {error && (
          <p style={{ color: '#f87171', margin: 0, fontSize: 13, textAlign: 'center' }}>
            Contraseña incorrecta
          </p>
        )}
        <button
          onClick={handleLogin}
          style={{
            padding: '10px', borderRadius: 8, border: 'none',
            background: '#06b6d4', color: '#fff', fontSize: 15,
            fontWeight: 700, cursor: 'pointer'
          }}
        >
          Entrar
        </button>
      </div>
    </div>
  );
}
