import { useState, useEffect } from 'react';
import axios from 'axios';
import { CreditCard, Calendar, User, DollarSign, Package } from 'lucide-react';
import { parseDate } from '../utils/date';

export function Payments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await axios.get('/api/payments');
      setPayments(res.data);
    } catch (err) {
      setError('Erro ao carregar pagamentos.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string | number | null) => {
    if (!dateString) return '-';
    return parseDate(dateString)?.toLocaleString('pt-BR') || '-';
  };

  const getPaymentMethodName = (method: string) => {
    const methods: Record<string, string> = {
      'pix': 'PIX',
      'credit_card': 'Cartão de Crédito',
      'debit_card': 'Cartão de Débito',
      'ticket': 'Boleto',
      'account_money': 'Saldo Mercado Pago'
    };
    return methods[method] || method || 'N/A';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Pagamentos Processados</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-medium text-slate-600">Usuário/Grupo</th>
                <th className="p-4 font-medium text-slate-600">Pacote</th>
                <th className="p-4 font-medium text-slate-600">Valor</th>
                <th className="p-4 font-medium text-slate-600">Forma de Pagamento</th>
                <th className="p-4 font-medium text-slate-600">Data e Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Carregando pagamentos...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Nenhum pagamento processado encontrado.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-700">{payment.group_name || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">{payment.days} dias</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                        <span className="font-medium text-emerald-600">{formatCurrency(payment.amount)}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600 capitalize">{getPaymentMethodName(payment.payment_method)}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">{formatDate(payment.updated_at)}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
