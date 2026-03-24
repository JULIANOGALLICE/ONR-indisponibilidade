import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Calendar, FileText, User, Building, Copy } from 'lucide-react';
import { generateCustomText } from '../utils/template';

export function History() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [templates, setTemplates] = useState({ template_positive: '', template_negative: '' });

  const fetchTemplates = async () => {
    try {
      const res = await axios.get('/api/config/templates');
      if (res.data) {
        setTemplates({
          template_positive: res.data.template_positive || '',
          template_negative: res.data.template_negative || ''
        });
      }
    } catch (err) {
      console.error('Erro ao carregar modelos de texto', err);
    }
  };

  const fetchHistory = async (searchQuery = '') => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/history${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`);
      setHistory(res.data);
    } catch (err) {
      console.error('Erro ao buscar histórico', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchHistory();
  }, []);

  const handleCopyText = (item: any, protocolos: string[]) => {
    const isIndisponivel = item.indisponivel;
    const template = isIndisponivel ? templates.template_positive : templates.template_negative;
    
    const text = generateCustomText(template, {
      Documento: item.documento || '',
      Nome: item.nome_razao || item.nome || '',
      Hash: item.hash || '',
      DataHora: item.data || new Date(item.created_at).toLocaleString('pt-BR'),
      QtdOrdens: item.qtd_ordens || 0,
      Protocolos: protocolos.length > 0 ? protocolos.join(', ') : ''
    });

    if (text) {
      navigator.clipboard.writeText(text);
      alert('Texto copiado para a área de transferência!');
    } else {
      alert('Modelo de texto não configurado ou dados incompletos.');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory(search);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Histórico de Consultas</h1>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por CPF/CNPJ ou Nome..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Buscar
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando histórico...</div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhum registro encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-sm font-semibold text-gray-600">Data</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Documento Consultado</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Nome/Razão</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Usuário</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Qtd. Ordens</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Hash</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Protocolos</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((item) => {
                  let protocolos: string[] = [];
                  try {
                    protocolos = JSON.parse(item.protocolos || '[]');
                  } catch (e) {}

                  return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {item.data || new Date(item.created_at).toLocaleString('pt-BR')}
                      </div>
                    </td>
                    <td className="p-4 text-sm font-medium text-gray-900">
                      {item.documento}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {item.nome_razao || '-'}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{item.nome || '-'}</span>
                        <span className="text-xs text-gray-500">{item.documento_usuario}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {item.qtd_ordens}
                    </td>
                    <td className="p-4 text-sm">
                      {item.indisponivel ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Indisponível
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Disponível
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-600 font-mono text-xs">
                      {item.hash || '-'}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {item.indisponivel && protocolos.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {protocolos.slice(0, 3).map((p, i) => (
                            <span key={i} className="inline-block bg-gray-100 px-2 py-1 rounded text-xs">
                              {p}
                            </span>
                          ))}
                          {protocolos.length > 3 && (
                            <span className="inline-block bg-gray-200 px-2 py-1 rounded text-xs text-gray-500 font-medium text-center" title={`${protocolos.length - 3} mais protocolos ocultos`}>
                              +{protocolos.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      <button
                        onClick={() => handleCopyText(item, protocolos)}
                        className="flex items-center justify-center p-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                        title="Gerar e copiar texto personalizado"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
