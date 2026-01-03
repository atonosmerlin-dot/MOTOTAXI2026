import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/motopoint/Layout';
import Button from '@/components/motopoint/Button';
import { toast } from 'sonner';
import { getServerOrigin } from '@/lib/utils';
const serverOrigin = getServerOrigin();

const AdminZones: React.FC = () => {
  const [zones, setZones] = useState<any[]>([]);
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');

  const [pontoId, setPontoId] = useState('');
  const [points, setPoints] = useState<any[]>([]);
  const [pointQuery, setPointQuery] = useState('');
  const [zonaId, setZonaId] = useState('');
  const [valor, setValor] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    try {
      // fetch fixed points for autocomplete
      try {
        const { data: pts } = await supabase.from('fixed_points').select('id,name,address').order('name', { ascending: true }).limit(200);
        setPoints(pts || []);
      } catch (pe) {
        console.warn('cannot fetch fixed_points for autocomplete', pe);
      }
      const [zResp, pResp] = await Promise.all([
        fetch(serverOrigin + '/admin/zones'),
        fetch(serverOrigin + '/admin/zone-prices')
      ]);
      const zJson = await (async () => {
        try { return await zResp.json(); } catch (e) { return await zResp.text(); }
      })();
      const pJson = await (async () => {
        try { return await pResp.json(); } catch (e) { return await pResp.text(); }
      })();
      setZones(Array.isArray(zJson) ? zJson : []);
      setPrices(Array.isArray(pJson) ? pJson : []);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao buscar zonas/valores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const createZone = async () => {
    if (!nome.trim()) return toast.error('Nome obrigatório');
    try {
      const resp = await fetch(serverOrigin + '/admin/zones', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, descricao })
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(text || 'Create failed');
      }
      toast.success('Zona criada');
      setNome(''); setDescricao('');
      fetchAll();
    } catch (e) {
      console.error(e); toast.error('Erro ao criar zona');
    }
  };

  const upsertPrice = async () => {
    if (!pontoId || !zonaId || !valor) return toast.error('Preencha ponto, zona e valor');
    try {
      const resp = await fetch(serverOrigin + '/admin/zone-prices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ponto_id: pontoId, zona_id: zonaId, valor: Number(valor) })
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(text || 'Create failed');
      }
      toast.success('Valor salvo');
      setPontoId(''); setZonaId(''); setValor('');
      fetchAll();
    } catch (e) {
      console.error(e); toast.error('Erro ao salvar valor');
    }
  };

  const deleteZone = async (id: string) => {
    if (!confirm('Excluir zona? Essa ação não pode ser desfeita')) return;
    try {
      const resp = await fetch(serverOrigin + `/admin/zones/${id}`, { method: 'DELETE' });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(text || 'Delete failed');
      }
      toast.success('Zona excluída');
      fetchAll();
    } catch (e) {
      console.error(e); toast.error('Erro ao excluir zona');
    }
  };

  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editingZoneNome, setEditingZoneNome] = useState('');
  const [editingZoneDescricao, setEditingZoneDescricao] = useState('');
  const [editingZoneAtivo, setEditingZoneAtivo] = useState(true);

  const startEditZone = (z: any) => {
    setEditingZoneId(z.id);
    setEditingZoneNome(z.nome || '');
    setEditingZoneDescricao(z.descricao || '');
    setEditingZoneAtivo(!!z.ativo);
  };

  const saveEditZone = async () => {
    if (!editingZoneId) return;
    try {
      const resp = await fetch(serverOrigin + `/admin/zones/${editingZoneId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: editingZoneNome, descricao: editingZoneDescricao, ativo: editingZoneAtivo })
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(text || 'Update failed');
      }
      toast.success('Zona atualizada');
      setEditingZoneId(null);
      fetchAll();
    } catch (e) {
      console.error(e); toast.error('Erro ao atualizar zona');
    }
  };

  const cancelEditZone = () => {
    setEditingZoneId(null);
  };

  const deletePrice = async (id: string) => {
    if (!confirm('Excluir este preço?')) return;
    try {
      const resp = await fetch(serverOrigin + `/admin/zone-prices/${id}`, { method: 'DELETE' });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(text || 'Delete failed');
      }
      toast.success('Preço excluído');
      fetchAll();
    } catch (e) {
      console.error(e); toast.error('Erro ao excluir preço');
    }
  };

  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValor, setEditingPriceValor] = useState('');

  const startEditPrice = (p: any) => {
    setEditingPriceId(p.id);
    setEditingPriceValor(String(p.valor));
  };

  const saveEditPrice = async () => {
    if (!editingPriceId) return;
    try {
      // upsert endpoint will update based on unique (ponto_id,zona_id)
      const price = prices.find(pr => pr.id === editingPriceId);
      if (!price) throw new Error('Preço não encontrado');
      const resp = await fetch(serverOrigin + '/admin/zone-prices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ponto_id: price.ponto_id, zona_id: price.zona_id, valor: Number(editingPriceValor) })
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(text || 'Update failed');
      }
      toast.success('Preço atualizado');
      setEditingPriceId(null);
      fetchAll();
    } catch (e) {
      console.error(e); toast.error('Erro ao atualizar preço');
    }
  };

  return (
    <Layout title="Zonas / Destinos">
      <div className="space-y-6">
        <div className="bg-card p-6 rounded-lg">
          <h3 className="text-lg font-bold mb-3">Cadastrar Nova Zona</h3>
          <div className="grid grid-cols-1 gap-3">
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome da zona" className="px-3 py-2 border rounded" />
            <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição (opcional)" className="px-3 py-2 border rounded" />
            <div className="flex justify-end">
              <Button onClick={createZone}>Criar Zona</Button>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg">
          <h3 className="text-lg font-bold mb-3">Associar preço Ponto → Zona</h3>
          <div className="grid grid-cols-1 gap-3">
            <div className="relative">
              <input value={pontoId} onChange={e => { setPontoId(e.target.value); setPointQuery(e.target.value); }} placeholder="Ponto ID (ou pesquise por nome)" className="px-3 py-2 border rounded w-full" />
              {pointQuery !== '' && (
                <div className="absolute z-50 bg-white border rounded mt-1 w-full max-h-48 overflow-auto">
                  {points.filter(p => (p.name || '').toLowerCase().includes(pointQuery.toLowerCase()) || p.id.startsWith(pointQuery)).slice(0,50).map(p => (
                    <div key={p.id} onClick={() => { setPontoId(p.id); setPointQuery(''); }} className="px-3 py-2 hover:bg-muted cursor-pointer">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.address} — {p.id}</div>
                    </div>
                  ))}
                  {points.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum ponto disponível</div>}
                </div>
              )}
            </div>
            <select value={zonaId} onChange={e => setZonaId(e.target.value)} className="px-3 py-2 border rounded">
              <option value="">Selecione a zona</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.nome}</option>)}
            </select>
            <input value={valor} onChange={e => setValor(e.target.value)} placeholder="Valor (ex: 12.50)" className="px-3 py-2 border rounded" />
            <div className="flex justify-end">
              <Button onClick={upsertPrice}>Salvar Valor</Button>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg">
          <h3 className="text-lg font-bold mb-3">Zonas cadastradas</h3>
          {loading ? <div>Carregando...</div> : (
            <div className="space-y-2">
              {zones.map(z => (
                <div key={z.id} className="flex justify-between items-center border p-3 rounded">
                  {editingZoneId === z.id ? (
                    <div className="flex-1 space-y-2">
                      <input value={editingZoneNome} onChange={e => setEditingZoneNome(e.target.value)} className="w-full px-3 py-2 border rounded" />
                      <input value={editingZoneDescricao} onChange={e => setEditingZoneDescricao(e.target.value)} className="w-full px-3 py-2 border rounded" />
                      <div className="flex items-center gap-3">
                        <label className="text-sm"><input type="checkbox" checked={editingZoneAtivo} onChange={e => setEditingZoneAtivo(e.target.checked)} /> Ativo</label>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium">{z.nome}</div>
                      <div className="text-sm text-muted-foreground">{z.descricao}</div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <div className="text-sm mr-4">{z.ativo ? 'Ativa' : 'Inativa'}</div>
                    {editingZoneId === z.id ? (
                      <>
                        <Button onClick={saveEditZone}>Salvar</Button>
                        <Button variant="outline" onClick={cancelEditZone}>Cancelar</Button>
                      </>
                    ) : (
                      <>
                        <Button onClick={() => startEditZone(z)}>Editar</Button>
                        <Button variant="outline" onClick={() => deleteZone(z.id)}>Excluir</Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card p-6 rounded-lg">
          <h3 className="text-lg font-bold mb-3">Valores cadastrados</h3>
          {prices.map(p => (
            <div key={p.id} className="flex justify-between items-center border p-3 rounded mb-2">
              <div>
                <div className="font-medium">Ponto: {p.fixed_points?.name || p.ponto_id}</div>
                <div className="text-sm">Zona: {p.zones_destino?.nome || p.zona_id}</div>
              </div>
              <div className="flex items-center gap-3">
                {editingPriceId === p.id ? (
                  <>
                    <input value={editingPriceValor} onChange={e => setEditingPriceValor(e.target.value)} className="px-3 py-2 border rounded w-28" />
                    <Button onClick={saveEditPrice}>Salvar</Button>
                    <Button variant="outline" onClick={() => setEditingPriceId(null)}>Cancelar</Button>
                  </>
                ) : (
                  <>
                    <div className="font-semibold">R$ {Number(p.valor).toFixed(2)}</div>
                    <Button onClick={() => startEditPrice(p)}>Editar</Button>
                    <Button variant="outline" onClick={() => deletePrice(p.id)}>Excluir</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default AdminZones;
