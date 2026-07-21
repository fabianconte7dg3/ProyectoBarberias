'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProfileSelector } from '@/components/admin/ProfileSelector';
import { NumpadLogin } from '@/components/admin/NumpadLogin';
import { fetchApi } from '@/lib/api';
import { useAdminStore, AdminUser } from '@/lib/adminStore';
import { Lock, Mail, Key, Shield, ArrowLeft } from 'lucide-react';

export default function AdminLoginPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;

  const login = useAdminStore((state) => state.login);
  const logout = useAdminStore((state) => state.logout);
  const currentUser = useAdminStore((state) => state.user);

  const [staffList, setStaffList] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  
  const [pin, setPin] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // 1. Validar sesión existente y cargar perfiles
  useEffect(() => {
    async function loadData() {
      try {
        if (currentUser) {
          try {
            await fetchApi('/auth/me');
          } catch (e) {
            console.warn('La sesión expiró o es inválida, limpiando store local');
            logout();
          }
        }
        
        const data = await fetchApi<AdminUser[]>(`/auth/staff/${tenantSlug}`);
        setStaffList(data);
      } catch (err) {
        console.error('Error cargando data inicial', err);
      } finally {
        setPageLoading(false);
      }
    }
    loadData();
  }, [tenantSlug, currentUser, logout]);

  // 2. Manejar envío del PIN de Staff
  const handleSubmitPin = async (pinToSubmit?: string) => {
    const pinFinal = pinToSubmit || pin;
    if (!selectedUser || pinFinal.length !== 4) return;
    
    setIsLoading(true);
    setIsError(false);
    setErrorMessage('');

    try {
      const response = await fetchApi<{ message: string, usuario: AdminUser }>('/auth/login/staff', {
        method: 'POST',
        body: JSON.stringify({
          slug: tenantSlug,
          userId: selectedUser.id,
          pin: pinFinal
        }),
      });

      login(response.usuario, tenantSlug);
      router.push(`/${tenantSlug}/admin/agenda`);
    } catch (err: any) {
      console.error('Login error', err);
      setIsError(true);
      setErrorMessage(err.message || 'PIN incorrecto');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Manejar Login de Admin (Email / Password)
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail || !adminPassword || isLoading) return;

    setIsLoading(true);
    setIsError(false);
    setErrorMessage('');

    try {
      const response = await fetchApi<{ message: string, usuario: AdminUser }>('/auth/login/admin', {
        method: 'POST',
        body: JSON.stringify({
          email: adminEmail.trim(),
          password: adminPassword
        }),
      });

      login(response.usuario, tenantSlug);
      router.push(`/${tenantSlug}/admin/agenda`);
    } catch (err: any) {
      console.error('Admin login error', err);
      setIsError(true);
      setErrorMessage(err.message || 'Credenciales inválidas de administrador');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      logout();
      setSelectedUser(null);
    }
  };

  if (pageLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm font-semibold">Cargando perfiles...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-background transition-all duration-300">
      
      {/* Estado 0: Ya hay una sesión activa */}
      {currentUser && (
        <div className="animate-in fade-in zoom-in-95 duration-500 w-full max-w-sm mx-auto text-center">
          <h2 className="text-2xl font-semibold mb-2">Sesión activa</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Estás logueado como <strong className="text-foreground font-bold">{currentUser.nombreCompleto}</strong> ({currentUser.rol})
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => router.push(`/${tenantSlug}/admin/agenda`)}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm shadow-md"
            >
              Ir a la Agenda Operativa
            </button>
            {currentUser.rol === 'admin' && (
              <button 
                onClick={() => router.push(`/${tenantSlug}/admin/dashboard`)}
                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold text-sm shadow-md"
              >
                Ir a Métricas Ejecutivas
              </button>
            )}
            <button 
              onClick={handleLogout}
              className="w-full bg-secondary text-secondary-foreground py-3 rounded-xl font-semibold text-sm hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}

      {/* Estado 1: Modo Login de Administrador (Email / Password) */}
      {!currentUser && isAdminMode && (
        <div className="animate-in fade-in zoom-in-95 duration-300 w-full max-w-md mx-auto bg-card border border-border p-6 rounded-2xl shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2 font-bold text-lg">
              <Shield size={20} className="text-emerald-500" />
              <span>Acceso Administrador (Dueño)</span>
            </div>
            <button
              type="button"
              onClick={() => { setIsAdminMode(false); setIsError(false); }}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-xs flex items-center gap-1"
            >
              <ArrowLeft size={16} />
              <span>PIN Staff</span>
            </button>
          </div>

          {isError && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs font-semibold">
              {errorMessage || 'Credenciales inválidas'}
            </div>
          )}

          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
                <Mail size={14} />
                <span>Correo Electrónico del Administrador</span>
              </label>
              <input
                type="email"
                required
                placeholder="carlos@barberia.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm font-medium focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
                <Key size={14} />
                <span>Contraseña</span>
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm font-medium focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Iniciando Sesión...' : 'Ingresar como Administrador'}
            </button>
          </form>
        </div>
      )}

      {/* Estado 2: Seleccionar Perfil (Staff PIN) */}
      {!currentUser && !selectedUser && !isAdminMode && (
        <div className="animate-in fade-in zoom-in-95 duration-500 w-full flex flex-col items-center gap-6">
          <ProfileSelector 
            staff={staffList} 
            onSelect={(user) => setSelectedUser(user)} 
          />

          <button
            onClick={() => setIsAdminMode(true)}
            className="flex items-center gap-2 px-4 py-2 bg-secondary/60 hover:bg-secondary border border-border text-xs font-semibold rounded-xl transition-all hover:scale-105 text-muted-foreground hover:text-foreground shadow-xs"
          >
            <Lock size={14} className="text-emerald-500" />
            <span>Iniciar Sesión como Administrador (Email / Contraseña)</span>
          </button>
        </div>
      )}

      {/* Estado 3: Ingresar PIN (Staff) */}
      {!currentUser && selectedUser && !isAdminMode && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300 w-full">
          <NumpadLogin
            userName={selectedUser.nombreCompleto}
            pin={pin}
            setPin={(newPin) => {
              setPin(newPin);
              setIsError(false);
            }}
            onSubmit={handleSubmitPin}
            error={isError}
            isLoading={isLoading}
            onBack={() => {
              setSelectedUser(null);
              setPin('');
              setIsError(false);
            }}
          />
        </div>
      )}

    </div>
  );
}
