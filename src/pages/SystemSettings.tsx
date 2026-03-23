import { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, CheckCircle, Settings, CreditCard, Mail } from 'lucide-react';

export function SystemSettings() {
  const [settings, setSettings] = useState({
    mp_access_token: '',
    mp_public_key: '',
    price_30: 0,
    price_90: 0,
    price_180: 0,
    price_365: 0,
    trial_days: 0,
    smtp_host: '',
    smtp_port: '',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/system-settings');
      if (res.data) {
        setSettings(res.data);
      }
    } catch (err) {
      setError('Erro ao carregar configurações do sistema.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      await axios.post('/api/system-settings', settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Configurações do Sistema</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
          <Settings className="w-6 h-6 text-indigo-600" />
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Integração Mercado Pago</h2>
            <p className="text-sm text-slate-500 mt-1">
              Configure as credenciais e os valores dos planos de assinatura.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Configurações salvas com sucesso!
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-md font-medium text-slate-800 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-slate-500" /> Credenciais Mercado Pago
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Access Token</label>
              <input
                type="password"
                value={settings.mp_access_token || ''}
                onChange={(e) => setSettings({ ...settings, mp_access_token: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                placeholder="APP_USR-..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Public Key</label>
              <input
                type="text"
                value={settings.mp_public_key || ''}
                onChange={(e) => setSettings({ ...settings, mp_public_key: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                placeholder="APP_USR-..."
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6 space-y-4">
            <h3 className="text-md font-medium text-slate-800">Valores dos Planos (R$)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Plano Mensal (30 dias)</label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.price_30 || 0}
                  onChange={(e) => setSettings({ ...settings, price_30: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Plano Trimestral (90 dias)</label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.price_90 || 0}
                  onChange={(e) => setSettings({ ...settings, price_90: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Plano Semestral (180 dias)</label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.price_180 || 0}
                  onChange={(e) => setSettings({ ...settings, price_180: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Plano Anual (365 dias)</label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.price_365 || 0}
                  onChange={(e) => setSettings({ ...settings, price_365: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6 mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-800">Configurações de E-mail (SMTP)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Servidor SMTP (Host)</label>
                <input
                  type="text"
                  value={settings.smtp_host || ''}
                  onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="ex: smtp.gmail.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Porta SMTP</label>
                <input
                  type="text"
                  value={settings.smtp_port || ''}
                  onChange={(e) => setSettings({ ...settings, smtp_port: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="ex: 587 ou 465"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Usuário SMTP</label>
                <input
                  type="text"
                  value={settings.smtp_user || ''}
                  onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="ex: seu-email@gmail.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha SMTP</label>
                <input
                  type="password"
                  value={settings.smtp_pass || ''}
                  onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail de Remetente (From)</label>
                <input
                  type="text"
                  value={settings.smtp_from || ''}
                  onChange={(e) => setSettings({ ...settings, smtp_from: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder='ex: "Sistema ONR" <noreply@onr.com>'
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6 mt-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Configurações de Teste (Trial)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dias de Teste Grátis</label>
                <input
                  type="number"
                  value={settings.trial_days || 0}
                  onChange={(e) => setSettings({ ...settings, trial_days: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  min="0"
                />
                <p className="text-xs text-slate-500 mt-1">Quantidade de dias que o cliente ganha ao confirmar o e-mail.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
