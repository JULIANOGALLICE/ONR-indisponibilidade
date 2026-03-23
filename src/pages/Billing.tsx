import { useState, useEffect } from 'react';
import axios from 'axios';
import { CreditCard, Calendar, CheckCircle, AlertCircle, Clock, X, Copy } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export function Billing() {
  const [plans, setPlans] = useState<any>({});
  const [expirationDate, setExpirationDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  
  const [pixData, setPixData] = useState<{ id: string, qr_code: string, qr_code_base64: string } | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const status = queryParams.get('status');

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (pixData && !paymentSuccess) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`/api/billing/payment-status/${pixData.id}`);
          if (res.data.status === 'approved') {
            setPaymentSuccess(true);
            setPixData(null);
            fetchPlans(); // Refresh expiration date
          }
        } catch (err) {
          console.error('Erro ao verificar status do pagamento', err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [pixData, paymentSuccess]);

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

  const handleBuy = async (days: number) => {
    setProcessing(true);
    setError('');
    setPaymentSuccess(false);
    try {
      const res = await axios.post('/api/billing/create-pix', { 
        days,
        appUrl: window.location.origin
      });
      if (res.data.qr_code) {
        setPixData(res.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao iniciar pagamento.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckout = async (days: number) => {
    setProcessing(true);
    setError('');
    try {
      const res = await axios.post('/api/billing/create-preference', { 
        days,
        appUrl: window.location.origin
      });
      if (res.data.init_point) {
        window.location.href = res.data.init_point;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao iniciar pagamento.');
    } finally {
      setProcessing(false);
    }
  };

  const copyPixCode = () => {
    if (pixData?.qr_code) {
      navigator.clipboard.writeText(pixData.qr_code);
      alert('Código PIX copiado!');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando planos...</div>;

  const isExpired = expirationDate && new Date(expirationDate) < new Date();
  const hasUnlimited = !expirationDate;

  return (
    <div className="max-w-5xl mx-auto space-y-8 relative">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Assinatura e Licenças</h1>
      </div>

      {(status === 'success' || paymentSuccess) && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg">
          <div className="flex items-center gap-2 text-emerald-800 font-medium">
            <CheckCircle className="w-5 h-5" />
            Pagamento processado com sucesso! Sua licença foi atualizada.
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
                  onClick={() => handleBuy(plan.days)}
                  disabled={processing}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  {processing ? 'Processando...' : 'Pagar com PIX'}
                </button>
                <button
                  onClick={() => handleCheckout(plan.days)}
                  disabled={processing}
                  className="w-full flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 py-2 px-4 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  Cartão / Outros
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {pixData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
            <button 
              onClick={() => setPixData(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">Pagamento PIX</h3>
              <p className="text-gray-600">
                Escaneie o QR Code abaixo com o aplicativo do seu banco para realizar o pagamento.
              </p>
              
              <div className="flex justify-center p-4 bg-white border-2 border-dashed border-gray-200 rounded-xl">
                <img 
                  src={`data:image/png;base64,${pixData.qr_code_base64}`} 
                  alt="QR Code PIX" 
                  className="w-64 h-64 object-contain"
                />
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-gray-500 font-medium">Ou copie o código PIX Copia e Cola:</p>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={pixData.qr_code}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 font-mono truncate"
                  />
                  <button 
                    onClick={copyPixCode}
                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                    title="Copiar código"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                <Clock className="w-4 h-4 animate-pulse" />
                Aguardando confirmação do pagamento...
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
