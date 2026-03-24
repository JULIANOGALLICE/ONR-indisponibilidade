import { useState, useEffect } from 'react';
import axios from 'axios';
import { CreditCard, Calendar, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export function Billing() {
  const [plans, setPlans] = useState<any>({});
  const [expirationDate, setExpirationDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [pixData, setPixData] = useState<any>(null);
  const [pollingInterval, setPollingInterval] = useState<any>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const status = queryParams.get('status');

  useEffect(() => {
    fetchPlans();
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

  const fetchPlans = async () => {
    try {
      const res = await axios.get('/api/billing/plans');
      setPlans(res.data.plans);
      setExpirationDate(res.data.expiration_date);
    } catch (err) {
      setError('Erro ao carregar planos.');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyCreditCard = async (days: number) => {
    setProcessing(true);
    setError('');
    try {
      const res = await axios.post('/api/billing/create-preference', { days });
      if (res.data.init_point) {
        window.location.href = res.data.init_point;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao iniciar pagamento.');
      setProcessing(false);
    }
  };

  const handleBuyPix = async (days: number) => {
    setProcessing(true);
    setError('');
    try {
      const res = await axios.post('/api/billing/create-pix', { days });
      setPixData(res.data);
      
      // Start polling
      const interval = setInterval(async () => {
        try {
          const statusRes = await axios.get(`/api/billing/payment-status/${res.data.external_reference}`);
          if (statusRes.data.status === 'approved') {
            clearInterval(interval);
            setPixData(null);
            setPaymentSuccess(true);
            fetchPlans(); // Refresh expiration date
          }
        } catch (e) {}
      }, 5000);
      setPollingInterval(interval);
      
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao gerar Pix.');
    } finally {
      setProcessing(false);
    }
  };

  const closePixModal = () => {
    if (pollingInterval) clearInterval(pollingInterval);
    setPixData(null);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando planos...</div>;

  const isExpired = expirationDate && new Date(expirationDate) < new Date();
  const hasUnlimited = !expirationDate;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Assinatura e Licenças</h1>
      </div>

      {paymentSuccess && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg">
          <div className="flex items-center gap-2 text-emerald-800 font-medium">
            <CheckCircle className="w-5 h-5" />
            Pagamento processado com sucesso! Sua licença foi atualizada.
          </div>
        </div>
      )}

      {status === 'success' && !paymentSuccess && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg">
          <div className="flex items-center gap-2 text-emerald-800 font-medium">
            <CheckCircle className="w-5 h-5" />
            Pagamento aprovado! Sua licença foi atualizada.
          </div>
        </div>
      )}

      {status === 'pending' && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
          <div className="flex items-center gap-2 text-amber-800 font-medium">
            <Clock className="w-5 h-5" />
            Pagamento pendente. Assim que for confirmado, sua licença será atualizada.
          </div>
        </div>
      )}

      {status === 'failure' && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <div className="flex items-center gap-2 text-red-800 font-medium">
            <AlertCircle className="w-5 h-5" />
            Ocorreu um erro no pagamento. Tente novamente.
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            Status da Licença
          </h2>
          <p className="text-slate-600 mt-1">
            {hasUnlimited ? (
              <span className="font-medium text-emerald-600">Acesso Ilimitado</span>
            ) : (
              <>
                Válido até: <strong className={isExpired ? 'text-red-600' : 'text-emerald-600'}>
                  {new Date(expirationDate).toLocaleDateString('pt-BR')}
                </strong>
                {isExpired && <span className="ml-2 text-red-600 text-sm font-medium">(Expirado)</span>}
              </>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { days: 30, title: 'Mensal', desc: '30 dias de acesso' },
          { days: 90, title: 'Trimestral', desc: '90 dias de acesso' },
          { days: 180, title: 'Semestral', desc: '180 dias de acesso' },
          { days: 365, title: 'Anual', desc: '1 ano de acesso' }
        ].map((plan) => {
          const price = plans[plan.days];
          if (!price || price <= 0) return null;

          return (
            <div key={plan.days} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-6 flex-1">
                <h3 className="text-xl font-bold text-slate-900">{plan.title}</h3>
                <p className="text-slate-500 text-sm mt-1">{plan.desc}</p>
                <div className="mt-4 flex items-baseline text-3xl font-extrabold text-indigo-600">
                  R$ {price.toFixed(2).replace('.', ',')}
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-3">
                <button
                  onClick={() => handleBuyCreditCard(plan.days)}
                  disabled={processing}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  Pagar com Cartão
                </button>
                <button
                  onClick={() => handleBuyPix(plan.days)}
                  disabled={processing}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  Pagar com Pix
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {pixData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Pagamento via Pix</h2>
            <p className="text-slate-600 mb-6">Escaneie o QR Code abaixo com o aplicativo do seu banco para pagar.</p>
            
            <div className="bg-slate-50 p-4 rounded-lg inline-block mb-6">
              <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Code Pix" className="w-48 h-48 mx-auto" />
            </div>

            <div className="mb-6">
              <p className="text-sm font-medium text-slate-700 mb-2">Ou copie o código Pix (Copia e Cola):</p>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={pixData.qr_code} 
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50"
                />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(pixData.qr_code);
                    alert('Código Pix copiado!');
                  }}
                  className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-medium hover:bg-indigo-200"
                >
                  Copiar
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-amber-600 mb-6">
              <Clock className="w-5 h-5 animate-spin" />
              <span className="font-medium">Aguardando pagamento...</span>
            </div>

            <button
              onClick={closePixModal}
              className="w-full py-2 px-4 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
