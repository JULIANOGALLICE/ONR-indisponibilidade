import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, AlertCircle, CheckCircle, Copy } from 'lucide-react';
import { generateCustomText } from '../utils/template';
import { useAuth } from '../contexts/AuthContext';

export function Dashboard() {
  const [documentos, setDocumentos] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [templates, setTemplates] = useState({ template_positive: '', template_negative: '' });
  const [expirationDate, setExpirationDate] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await axios.get('/api/config/templates');
      if (res.data) {
        setTemplates({
          template_positive: res.data.template_positive || '',
          template_negative: res.data.template_negative || ''
        });
        setExpirationDate(res.data.expiration_date);
      }
    } catch (err) {
      console.error('Erro ao carregar modelos de texto', err);
    }
  };

  const generateTextForResult = (res: any) => {
    const d = res.data?.data;
    if (!d) return '';
    
    const isIndisponivel = d.indisponivel;
    const template = isIndisponivel ? templates.template_positive : templates.template_negative;
    
    const u = d.dados_usuario || {};
    return generateCustomText(template, {
      Documento: d.documento || res.documento,
      Nome: d.nomeRazao || u.nome || '',
      Hash: u.hash || '',
      DataHora: u.data || '',
      QtdOrdens: d.qtdOrdens || 0,
      Protocolos: d.protocolos ? d.protocolos.join(', ') : ''
    });
  };

  const handleCopyText = (res: any) => {
    const text = generateTextForResult(res);
    if (text) {
      navigator.clipboard.writeText(text);
      alert('Texto copiado para a área de transferência!');
    } else {
      alert('Modelo de texto não configurado ou dados incompletos.');
    }
  };

  const handleCopyAllText = () => {
    const texts = results.map(res => generateTextForResult(res)).filter(t => t);
    if (texts.length > 0) {
      navigator.clipboard.writeText(texts.join('\n\n'));
      alert('Textos copiados para a área de transferência!');
    } else {
      alert('Nenhum texto gerado.');
    }
  };

  const handleConsultar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);
    setResults([]);

    const docs = documentos
      .split(/[\n,;]+/)
      .map(d => d.replace(/\D/g, ''))
      .filter(d => d.length > 0);

    if (docs.length === 0) {
      setLoading(false);
      return;
    }

    const promises = docs.map(async (doc) => {
      try {
        const payload: any = { 
          cpf_usuario: '00000000000', // This will be overridden by backend config
          documento: doc
        };

        const res = await axios.post('/api/onr/consultar', payload);
        return { success: true, documento: doc, data: res.data };
      } catch (err: any) {
        const errorData = err.response?.data;
        let errorMsg = 'Erro ao consultar API';
        if (errorData) {
          if (typeof errorData === 'string') errorMsg = errorData;
          else if (errorData.message) errorMsg = errorData.message;
          else if (errorData.error) errorMsg = errorData.error;
          else errorMsg = JSON.stringify(errorData);
        } else if (err.message) {
          errorMsg = err.message;
        }
        return { success: false, documento: doc, error: errorMsg };
      }
    });

    const responses = await Promise.all(promises);
    
    setResults(responses.filter(r => r.success));
    setErrors(responses.filter(r => !r.success));
    setLoading(false);
  };

  const isExpired = user?.role !== 'superadmin' && expirationDate && new Date(expirationDate) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Consultas ONR</h1>
      </div>

      {isExpired && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <div className="flex items-center gap-2 text-red-800 font-medium">
            <AlertCircle className="w-5 h-5" />
            Sua licença expirou. Por favor, renove sua assinatura para continuar utilizando o sistema.
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-indigo-500" />
          Consultar por CPF/CNPJ (Múltiplos)
        </h2>
        <form onSubmit={handleConsultar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Lista de CPFs ou CNPJs (um por linha ou separados por vírgula)
            </label>
            <textarea
              value={documentos}
              onChange={(e) => setDocumentos(e.target.value)}
              rows={5}
              disabled={loading || isExpired}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Exemplo:&#10;12345678900&#10;98765432100"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !documentos.trim() || isExpired}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Consultando...' : 'Consultar'}
          </button>
        </form>
      </div>

      {/* Results Area */}
      {(results.length > 0 || errors.length > 0) && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-slate-800">Resultados da Consulta</h2>
            {results.length > 0 && (
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-slate-100 text-slate-700 py-2 px-4 rounded-lg font-medium hover:bg-slate-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Imprimir Resultados
              </button>
            )}
          </div>
          
          {errors.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
              <h3 className="text-red-800 font-medium mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Erros ({errors.length})
              </h3>
              <ul className="space-y-2">
                {errors.map((err, idx) => (
                  <li key={idx} className="text-sm text-red-700">
                    <strong>{err.documento}:</strong> {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-4">
              {results.map((res, idx) => {
                const d = res.data?.data;
                const isIndisponivel = d?.indisponivel;
                
                return (
                  <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                        <h3 className="font-semibold text-slate-800">Documento: {res.documento}</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleCopyText(res)}
                          className="flex items-center gap-1 px-3 py-1 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                          title="Gerar e copiar texto personalizado"
                        >
                          <Copy className="w-4 h-4" />
                          Gerar Texto
                        </button>
                        {isIndisponivel ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Indisponível
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Disponível
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-4">
                      {d ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500">Nome/Razão</p>
                            <p className="font-medium text-slate-900">{d.nomeRazao || '-'}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Qtd. Ordens</p>
                            <p className="font-medium text-slate-900">{d.qtdOrdens}</p>
                          </div>
                          {isIndisponivel && d.protocolos && d.protocolos.length > 0 && (
                            <div className="col-span-1 md:col-span-2">
                              <p className="text-slate-500 mb-1">Protocolos</p>
                              <div className="flex flex-wrap gap-2">
                                {d.protocolos.slice(0, 5).map((p: string, i: number) => (
                                  <span key={i} className="inline-block bg-slate-100 px-2 py-1 rounded text-xs text-slate-700">
                                    {p}
                                  </span>
                                ))}
                                {d.protocolos.length > 5 && (
                                  <span className="inline-block bg-slate-200 px-2 py-1 rounded text-xs text-slate-600 font-medium" title={`${d.protocolos.length - 5} mais protocolos ocultos`}>
                                    +{d.protocolos.length - 5} mais
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <pre className="text-xs overflow-x-auto p-4 bg-slate-50 rounded-lg border border-slate-200">
                          {JSON.stringify(res.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {results.length > 1 && (
            <div className="pt-4 flex justify-end">
              <button
                onClick={handleCopyAllText}
                className="flex items-center gap-2 bg-slate-800 text-white py-2 px-6 rounded-lg font-medium hover:bg-slate-900 transition-colors"
              >
                <Copy className="w-4 h-4" />
                Gerar Texto de Todos
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
