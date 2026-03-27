import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, Save, AlertTriangle, X } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export default function DatabaseConfig() {
  const { token } = useAuth();
  const [dbType, setDbType] = useState<'sqlite' | 'mysql'>('sqlite');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; from: 'sqlite' | 'mysql'; to: 'sqlite' | 'mysql' } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await axios.get('/api/db-config', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDbType(res.data.type);
    } catch (err) {
      console.error('Failed to fetch DB config', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await axios.post('/api/db-config', { type: dbType }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ text: 'Configuração salva com sucesso. Reinicie o servidor para aplicar.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.response?.data?.error || 'Erro ao salvar configuração.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const confirmMigrate = (from: 'sqlite' | 'mysql', to: 'sqlite' | 'mysql') => {
    setConfirmModal({ isOpen: true, from, to });
  };

  const handleMigrate = async () => {
    if (!confirmModal) return;
    const { from, to } = confirmModal;
    setConfirmModal(null);
    
    setMigrating(true);
    setMessage(null);
    try {
      await axios.post('/api/db-migrate', { from, to }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ text: 'Migração concluída com sucesso.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.response?.data?.error || 'Erro na migração.', type: 'error' });
    } finally {
      setMigrating(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Database className="text-blue-600" />
          Configuração de Banco de Dados
        </h1>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Atenção:</strong> A alteração do banco de dados requer a reinicialização do servidor para entrar em vigor. 
                  As configurações do MySQL são fixas (bdIndisponibilidade, usuario, @Cartorio18441@@, localhost).
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Banco de Dados Ativo
            </label>
            <div className="flex items-center space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-blue-600 focus:ring-blue-500 h-4 w-4"
                  name="dbType"
                  value="sqlite"
                  checked={dbType === 'sqlite'}
                  onChange={(e) => setDbType(e.target.value as any)}
                />
                <span className="ml-2 text-gray-700">SQLite (Local)</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-blue-600 focus:ring-blue-500 h-4 w-4"
                  name="dbType"
                  value="mysql"
                  checked={dbType === 'mysql'}
                  onChange={(e) => setDbType(e.target.value as any)}
                />
                <span className="ml-2 text-gray-700">MySQL</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Salvando...' : 'Salvar Configuração'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <RefreshCw className="text-blue-600" size={20} />
            Migração de Dados
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Você pode migrar os dados entre os bancos de dados. Isso apagará todos os dados do banco de destino antes de copiar.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => confirmMigrate('sqlite', 'mysql')}
              disabled={migrating}
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              <span className="font-medium text-gray-800 mb-2">SQLite ➔ MySQL</span>
              <span className="text-xs text-gray-500 text-center">Copia todos os dados do SQLite para o MySQL</span>
            </button>

            <button
              onClick={() => confirmMigrate('mysql', 'sqlite')}
              disabled={migrating}
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              <span className="font-medium text-gray-800 mb-2">MySQL ➔ SQLite</span>
              <span className="text-xs text-gray-500 text-center">Copia todos os dados do MySQL para o SQLite</span>
            </button>
          </div>
        </div>
      </div>

      {confirmModal?.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Confirmar Migração</h3>
              <button onClick={() => setConfirmModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 text-amber-600 mb-4">
                <AlertTriangle size={24} />
                <p className="font-medium">Atenção: Risco de perda de dados</p>
              </div>
              <p className="text-gray-600 mb-4">
                Tem certeza que deseja migrar os dados de <strong>{confirmModal.from.toUpperCase()}</strong> para <strong>{confirmModal.to.toUpperCase()}</strong>?
              </p>
              <p className="text-sm text-gray-500">
                Isso apagará todos os dados atuais do banco de destino antes de iniciar a cópia. Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleMigrate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Confirmar Migração
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
