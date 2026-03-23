import { useState } from 'react';
import axios from 'axios';
import { Search, AlertCircle, CheckCircle } from 'lucide-react';

export function Dashboard() {
  const [documentos, setDocumentos] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Consultas ONR</h1>
      </div>

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
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Exemplo:&#10;12345678900&#10;98765432100"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !documentos.trim()}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Consultando...' : 'Consultar'}
          </button>
        </form>
      </div>

      {/* Results Area */}
      {(results.length > 0 || errors.length > 0) && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-800">Resultados da Consulta</h2>
          
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
                                {d.protocolos.map((p: string, i: number) => (
                                  <span key={i} className="inline-block bg-slate-100 px-2 py-1 rounded text-xs text-slate-700">
                                    {p}
                                  </span>
                                ))}
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
        </div>
      )}
    </div>
  );
}
