import { useState, useEffect } from 'react';
import axios from 'axios';
import { CreditCard, Calendar, CheckCircle, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export function Billing() {
  const [plans, setPlans] = useState<any>({});
  const [expirationDate, setExpirationDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const status = queryParams.get('status');
  const paymentId = queryParams.get('payment_id') || queryParams.get('collection_id');
  const externalReference = queryParams.get('external_reference');

  useEffect(() => {
    const init = async () => {
      if (status === 'success' && paymentId && externalReference) {
        setVerifying(true);
        await verifyPayment(paymentId, externalReference);
        setVerifying(false);
      }
      await fetchPlans();
    };
    init();
  }, [status, paymentId, externalReference]);

  const verifyPayment = async (payment_id: string, external_reference: string) => {
    try {
      await axios.post('/api/billing/verify-payment', {
        payment_id,
        external_reference
      });
    } catch (err) {
      console.error('Erro ao verificar pagamento:', err);
    }
  };

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

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando planos...</div>;

  const isExpired = expirationDate && new Date(expirationDate.replace(' ', 'T')) < new Date();
  const hasUnlimited = !expirationDate;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Assinatura e Licenças</h1>
      </div>

      {verifying && (
        <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg">
          <div className="flex items-center gap-2 text-indigo-800 font-medium">
            <Loader2 className="w-5 h-5 animate-spin" />
            Verificando pagamento...
          </div>
        </div>
      )}

      {status === 'success' && !verifying && (
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
                  {new Date(expirationDate.replace(' ', 'T')).toLocaleDateString('pt-BR')}
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
              <div className="p-6 bg-slate-50 border-t border-slate-100">
                <button
                  onClick={() => handleBuy(plan.days)}
                  disabled={processing}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  {processing ? 'Processando...' : 'Comprar Agora'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
