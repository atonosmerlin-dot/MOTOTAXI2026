import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface DriverEditModalProps {
    open: boolean;
    onClose: () => void;
    driver: any;
    onSuccess: () => void;
}

const DriverEditModal: React.FC<DriverEditModalProps> = ({ open, onClose, driver, onSuccess }) => {
    const [loading, setLoading] = useState(false);

    // Form States
    const [name, setName] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [motoBrand, setMotoBrand] = useState('');
    const [motoModel, setMotoModel] = useState('');
    const [motoPlate, setMotoPlate] = useState('');
    const [pixKey, setPixKey] = useState('');
    const [pixKeyType, setPixKeyType] = useState('cpf');
    const [isUploading, setIsUploading] = useState(false);

    // Load data when driver changes
    useEffect(() => {
        if (driver) {
            setName(driver.profile?.name || '');
            setPhotoUrl(driver.profile?.photo_url || '');
            setMotoBrand(driver.moto_brand || '');
            setMotoModel(driver.moto_model || '');
            setMotoPlate(driver.moto_plate || '');
            setPixKey(driver.pix_key || '');
            setPixKeyType(driver.pix_key_type || 'cpf');
        }
    }, [driver]);

    const handleUpload = async (file: File) => {
        try {
            setIsUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `avatar_${driver.user_id}_${Math.random()}.${fileExt}`;

            // Upload to 'avatars' bucket first, fallback to 'app-assets' if strict RLS/bucket issues
            const { data, error } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true });

            if (error) {
                // Fallback to app-assets if avatars fails
                console.warn('Avatars bucket upload failed, trying app-assets', error);
                const { data: fallbackData, error: fallbackError } = await supabase.storage
                    .from('app-assets')
                    .upload(`avatars/${fileName}`, file, { upsert: true });

                if (fallbackError) throw fallbackError;

                const { data: { publicUrl } } = supabase.storage
                    .from('app-assets')
                    .getPublicUrl(`avatars/${fileName}`);

                setPhotoUrl(publicUrl);
            } else {
                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(fileName);
                setPhotoUrl(publicUrl);
            }

            toast.success('Upload concluído!');
        } catch (e) {
            console.error(e);
            toast.error('Erro no upload da imagem');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        if (!driver) return;
        setLoading(true);
        try {
            // 1. Update Driver details
            const { error: driverError } = await supabase
                .from('drivers')
                .update({
                    moto_brand: motoBrand,
                    moto_model: motoModel,
                    moto_plate: motoPlate,
                    pix_key: pixKey,
                    pix_key_type: pixKeyType
                } as any)
                .eq('id', driver.id);

            if (driverError) throw driverError;

            // 2. Update Profile name and photo if changed
            if (driver.user_id) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ name, photo_url: photoUrl })
                    .eq('id', driver.user_id);

                if (profileError) throw profileError;
            }

            toast.success('Motorista atualizado com sucesso!');
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Erro ao atualizar motorista');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-white text-slate-900">
                <DialogHeader>
                    <DialogTitle>Editar Motorista</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">

                    <div className="flex flex-col items-center gap-4 mb-2">
                        <div className="relative w-24 h-24 rounded-full bg-slate-100 border-2 border-slate-200 overflow-hidden flex items-center justify-center group">
                            {photoUrl ? (
                                <img src={photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl font-bold text-slate-300">{name?.charAt(0) || 'M'}</span>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                <Button variant="ghost" size="sm" className="text-white hover:text-white h-full w-full relative">
                                    <span className="text-xs">Alterar</span>
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} disabled={isUploading} />
                                </Button>
                            </div>
                        </div>
                        {isUploading && <span className="text-xs text-blue-500 animate-pulse">Enviando imagem...</span>}
                        <div className="w-full">
                            <Label className="text-xs mb-1 block text-center text-slate-500">Ou cole a URL da imagem</Label>
                            <Input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="https://..." className="h-8 text-xs" />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="name">Nome Completo</Label>
                        <Input id="name" value={name} onChange={e => setName(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="brand">Marca da Moto</Label>
                            <Input id="brand" placeholder="Ex: Honda" value={motoBrand} onChange={e => setMotoBrand(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="model">Modelo</Label>
                            <Input id="model" placeholder="Ex: CG 160" value={motoModel} onChange={e => setMotoModel(e.target.value)} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="plate">Placa</Label>
                        <Input id="plate" placeholder="ABC-1234" value={motoPlate} onChange={e => setMotoPlate(e.target.value.toUpperCase())} maxLength={8} />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2 col-span-1">
                            <Label htmlFor="pixtype">Tipo Chave</Label>
                            <select
                                id="pixtype"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={pixKeyType}
                                onChange={e => setPixKeyType(e.target.value)}
                            >
                                <option value="cpf">CPF</option>
                                <option value="phone">Celular</option>
                                <option value="email">E-mail</option>
                                <option value="random">Aleatória</option>
                            </select>
                        </div>
                        <div className="grid gap-2 col-span-2">
                            <Label htmlFor="pix">Chave Pix</Label>
                            <Input id="pix" value={pixKey} onChange={e => setPixKey(e.target.value)} />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-slate-900 text-white">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Alterações
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default DriverEditModal;
