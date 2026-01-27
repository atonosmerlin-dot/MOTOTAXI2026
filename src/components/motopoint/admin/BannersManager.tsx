import React, { useState } from 'react';
import { useAllBanners, useCreateBanner, useUpdateBanner, useDeleteBanner, useToggleBannerStatus } from '@/hooks/useBanners';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Edit2, Plus, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const BannersManager: React.FC = () => {
    const { data: banners = [], refetch, isLoading } = useAllBanners();
    const createBanner = useCreateBanner();
    const updateBanner = useUpdateBanner();
    const deleteBanner = useDeleteBanner();
    const toggleStatus = useToggleBannerStatus();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [title, setTitle] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [linkDestination, setLinkDestination] = useState('');


    const handleOpenCreate = () => {
        setEditingId(null);
        setTitle('');
        setImageUrl('');
        setLinkDestination('');
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (banner: any) => {
        setEditingId(banner.id);
        setTitle(banner.title);
        setImageUrl(banner.image_url);
        setLinkDestination(banner.link_destination || '');
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingId) {
                // @ts-ignore
                await updateBanner.mutateAsync({
                    id: editingId,
                    title,
                    image_url: imageUrl,
                    link_destination: linkDestination || null,
                });
                toast.success('Banner atualizado!');
            } else {
                await createBanner.mutateAsync({
                    title,
                    image_url: imageUrl,
                    link_destination: linkDestination || null,
                    is_active: true,
                    is_auto: true,
                    transition_speed: 5000,
                    display_order: 0
                });
                toast.success('Banner criado!');
            }
            setIsDialogOpen(false);
            refetch();
        } catch (error) {
            toast.error('Erro ao salvar banner');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir este banner permanentemente?')) return;
        try {
            await deleteBanner.mutateAsync(id);
            toast.success('Banner removido');
            refetch();
        } catch (error) {
            toast.error('Erro ao remover banner');
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await toggleStatus.mutateAsync({ bannerId: id, isActive: !currentStatus });
            toast.success(`Banner ${!currentStatus ? 'ativado' : 'desativado'}`);
            refetch();
        } catch (error) {
            toast.error('Erro ao alterar status');
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Banners Promocionais</h2>
                    <p className="text-sm text-slate-500">Gerencie os banners exibidos no app dos clientes</p>
                </div>
                <Button onClick={handleOpenCreate} className="gap-2">
                    <Plus size={16} /> Novo Banner
                </Button>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Editar Banner' : 'Novo Banner'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label>Título (Interno)</Label>
                            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Promoção de Natal" required />
                        </div>
                        <div className="space-y-2">
                            <Label>URL da Imagem</Label>
                            <div className="flex gap-2">
                                <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." required />
                            </div>
                            {imageUrl && (
                                <div className="mt-2 relative rounded-md overflow-hidden aspect-video bg-slate-100 border border-slate-200">
                                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Link de Destino (Opcional)</Label>
                            <Input value={linkDestination} onChange={e => setLinkDestination(e.target.value)} placeholder="https://... ou /app/page" />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit">Salvar</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {banners.map((banner: any) => (
                    <Card key={banner.id} className="overflow-hidden group">
                        <div className="aspect-video relative bg-slate-100">
                            {banner.image_url ? (
                                <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-300">
                                    <ImageIcon size={48} />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Button size="icon" variant="secondary" onClick={() => handleOpenEdit(banner)}>
                                    <Edit2 size={16} />
                                </Button>
                                <Button size="icon" variant="destructive" onClick={() => handleDelete(banner.id)}>
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                            <div className="absolute top-2 right-2">
                                <Badge variant={banner.is_active ? 'default' : 'secondary'} className={banner.is_active ? 'bg-green-500 hover:bg-green-600' : ''}>
                                    {banner.is_active ? 'Ativo' : 'Inativo'}
                                </Badge>
                            </div>
                        </div>
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-semibold text-slate-900 line-clamp-1">{banner.title}</h3>
                                    {banner.link_destination && (
                                        <div className="flex items-center text-xs text-blue-600 mt-1">
                                            <ExternalLink size={10} className="mr-1" />
                                            Link configurado
                                        </div>
                                    )}
                                </div>
                                <Switch
                                    checked={banner.is_active}
                                    onCheckedChange={(checked) => handleToggleStatus(banner.id, banner.is_active)}
                                />
                            </div>
                            <p className="text-xs text-slate-400">
                                Criado em {new Date(banner.created_at).toLocaleDateString()}
                            </p>
                        </CardContent>
                    </Card>
                ))}

                {/* Empty State / Add New Card */}
                <button
                    onClick={handleOpenCreate}
                    className="flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors bg-slate-50"
                >
                    <Plus size={32} className="mb-2" />
                    <span className="font-medium">Adicionar Banner</span>
                </button>
            </div>
        </div>
    );
};

export default BannersManager;
