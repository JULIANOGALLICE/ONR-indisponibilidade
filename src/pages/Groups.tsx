import { useState, useEffect } from 'react';
import axios from 'axios';
import { Building, Calendar, Edit2, Check, X } from 'lucide-react';

export function Groups() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState('');

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await axios.get('/api/groups');
      setGroups(res.data);
    } catch (err) {
      setError('Erro ao carregar agrupamentos.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (group: any) => {
    setEditingId(group.id);
    setEditDate(group.expiration_date ? new Date(group.expiration_date).toISOString().split('T')[0] : '');
  };

  const handleSave = async (id: number) => {
    try {
      await axios.put(`/api/groups/${id}/expiration`, {
        expiration_date: editDate ? new Date(editDate).toISOString() : null
      });
      setEditingId(null);
      fetchGroups();
    } catch (err) {
      alert('Erro ao atualizar data de expiração.');
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Agrupamentos (Clientes)</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4 text-sm font-semibold text-slate-600">ID</th>
              <th className="p-4 text-sm font-semibold text-slate-600">Nome</th>
              <th className="p-4 text-sm font-semibold text-slate-600">Admin (Email)</th>
              <th className="p-4 text-sm font-semibold text-slate-600">Expiração</th>
              <th className="p-4 text-sm font-semibold text-slate-600">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groups.map((group) => (
              <tr key={group.id} className="hover:bg-slate-50">
                <td className="p-4 text-sm text-slate-600">{group.id}</td>
                <td className="p-4 text-sm font-medium text-slate-900 flex items-center gap-2">
                  <Building className="w-4 h-4 text-slate-400" />
                  {group.name}
                </td>
                <td className="p-4 text-sm text-slate-600">{group.admin_email || 'Sem admin'}</td>
                <td className="p-4 text-sm text-slate-600">
                  {editingId === group.id ? (
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="px-2 py-1 border border-slate-300 rounded text-sm"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {group.expiration_date ? new Date(group.expiration_date).toLocaleDateString('pt-BR') : 'Ilimitado'}
                    </div>
                  )}
                </td>
                <td className="p-4 text-sm">
                  {editingId === group.id ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleSave(group.id)} className="text-emerald-600 hover:text-emerald-700">
                        <Check className="w-5 h-5" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-red-600 hover:text-red-700">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => handleEdit(group)} className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                      <Edit2 className="w-4 h-4" /> Editar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
