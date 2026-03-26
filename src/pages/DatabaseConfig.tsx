import { useState, useEffect } from 'react';
import axios from 'axios';
import { Database, ArrowRightLeft, Save, AlertTriangle } from 'lucide-react';

export function DatabaseConfig() {
  const [dbType, setDbType] = useState<'sqlite' | 'mysql'>('sqlite');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchDbConfig();
  }, []);

  const fetchDbConfig = async () => {
    try {
      const res = await axios.get('/api/db-config');
      setDbType(res.data.type);
    } catch (err) {
      console.error('Erro ao buscar configuração do BD', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchDb = async (newType: 'sqlite' | 'mysql') => {
    if (newType === dbType) return;
    
    if (!window.confirm(`Tem certeza que deseja mudar o banco de dados ativo para ${newType.toUpperCase()}?`)) {
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await axios.post('/api/db-config/switch', { type: newType });
      if (res.data.success) {
        setDbType(res.data.type);
        setMessage({ type: 'success', text: `Banco de dados alterado para ${newType.toUpperCase()} com sucesso!` });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erro ao trocar banco de dados.' });
    } finally {
      setSaving(false);
    }
  };

  const handleMigrate = async (from: 'sqlite' | 'mysql', to: 'sqlite' | 'mysql') => {
    if (!window.confirm(`ATENÇÃO: Isso apagará os dados do banco ${to.toUpperCase()} e copiará tudo do banco ${from.toUpperCase()}. Deseja continuar?`)) {
      return;
    }

    setMigrating(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await axios.post('/api/db-config/migrate', { from, to });
      if (res.data.success) {
        setMessage({ type: 'success', text: res.data.message });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erro ao migrar dados.' });
    } finally {
      setMigrating(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Carregando configurações...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Database className="w-6 h-6 text-indigo-600" />
          Configuração de Banco de Dados
        </h1>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Banco de Dados Ativo</h2>
          <div className="flex gap-4">
            <button
              onClick={() => handleSwitchDb('sqlite')}
              disabled={saving}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                dbType === 'sqlite' 
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                  : 'border-gray-200 hover:border-indigo-300 text-gray-600'
              }`}
            >
              <div className="font-bold text-lg mb-1">SQLite</div>
              <div className="text-sm opacity-80">Banco de dados local em arquivo</div>
              {dbType === 'sqlite' && <div className="mt-2 text-xs font-semibold uppercase tracking-wider">Ativo Atualmente</div>}
            </button>

            <button
              onClick={() => handleSwitchDb('mysql')}
              disabled={saving}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                dbType === 'mysql' 
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                  : 'border-gray-200 hover:border-indigo-300 text-gray-600'
              }`}
            >
              <div className="font-bold text-lg mb-1">MySQL</div>
              <div className="text-sm opacity-80">Banco de dados relacional (localhost)</div>
              {dbType === 'mysql' && <div className="mt-2 text-xs font-semibold uppercase tracking-wider">Ativo Atualmente</div>}
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Migração e Sincronização</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="font-medium text-gray-900 mb-2">SQLite para MySQL</h3>
              <p className="text-sm text-gray-600 mb-4">Copia todos os dados do SQLite local para o banco MySQL. Os dados atuais no MySQL serão sobrescritos.</p>
              <button
                onClick={() => handleMigrate('sqlite', 'mysql')}
                disabled={migrating}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <ArrowRightLeft className="w-4 h-4" />
                Migrar para MySQL
              </button>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="font-medium text-gray-900 mb-2">MySQL para SQLite</h3>
              <p className="text-sm text-gray-600 mb-4">Copia todos os dados do banco MySQL para o SQLite local. Os dados atuais no SQLite serão sobrescritos.</p>
              <button
                onClick={() => handleMigrate('mysql', 'sqlite')}
                disabled={migrating}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <ArrowRightLeft className="w-4 h-4" />
                Migrar para SQLite
              </button>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Configurações Fixas do MySQL</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded border border-gray-100">
              <span className="text-gray-500 block mb-1">Host</span>
              <span className="font-mono text-gray-900">localhost</span>
            </div>
            <div className="p-3 bg-gray-50 rounded border border-gray-100">
              <span className="text-gray-500 block mb-1">Database</span>
              <span className="font-mono text-gray-900">bdIndisponibilidade</span>
            </div>
            <div className="p-3 bg-gray-50 rounded border border-gray-100">
              <span className="text-gray-500 block mb-1">Usuário</span>
              <span className="font-mono text-gray-900">usuario</span>
            </div>
            <div className="p-3 bg-gray-50 rounded border border-gray-100">
              <span className="text-gray-500 block mb-1">Senha</span>
              <span className="font-mono text-gray-900">@Cartorio18441@@</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
