import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';

interface DriverCreateModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const DriverCreateModal: React.FC<DriverCreateModalProps> = ({ open, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);

    // Account
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // Moto
    const [motoBrand, setMotoBrand] = useState('');
    const [motoModel, setMotoModel] = useState('');
    const [motoPlate, setMotoPlate] = useState('');

    // Pix
    const [pixKey, setPixKey] = useState('');
    const [pixKeyType, setPixKeyType] = useState('cpf');

    const handleUpload = async (file: File) => {
        try {
            setIsUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `avatar_new_${Math.random()}.${fileExt}`;

            // Upload to 'avatars' bucket first, fallback to 'app-assets'
            const { data, error } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true });

            if (error) {
                console.warn('Avatars upload failed, trying app-assets', error);
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

    const handleCreate = async () => {
        if (!name || !email || !password) {
            return toast.error('Nome, Email e Senha são obrigatórios');
        }

        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/create-driver`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    photo_url: photoUrl,
                    moto_brand: motoBrand,
                    moto_model: motoModel,
                    moto_plate: motoPlate,
                    pix_key: pixKey,
                    pix_key_type: pixKeyType
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao criar motorista');
            }

            toast.success('Motorista criado com sucesso!');
            onSuccess();
            onClose();

            // Reset form
            setName('');
            setEmail('');
            setPassword('');
            setPhotoUrl('');
            setMotoBrand('');
            setMotoModel('');
            setMotoPlate('');
            setPixKey('');
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Erro ao criar motorista');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-white text-slate-900 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Novo Motorista</DialogTitle>
                    <DialogDescription>
                        Cria uma conta de acesso e perfil de motorista. O motorista poderá logar com o email e senha definidos abaixo.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">

                    <div className="flex flex-col items-center gap-4 mb-2">
                        <div className="relative w-20 h-20 rounded-full bg-slate-100 border-2 border-slate-200 overflow-hidden flex items-center justify-center group">
                            {photoUrl ? (
                                <img src={photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xl font-bold text-slate-300">{name?.charAt(0) || '+'}</span>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                <Button variant="ghost" size="sm" className="text-white hover:text-white h-full w-full relative p-0">
                                    <span className="text-[10px]">FOTO</span>
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} disabled={isUploading} />
                                </Button>
                            </div>
                        </div>
                        {isUploading && <span className="text-xs text-blue-500 animate-pulse">Enviando imagem...</span>}
                    </div>

                    <div className="space-y-4 border-b border-slate-100 pb-4">
                        <h4 className="font-semibold text-sm text-slate-500 uppercase tracking-wider">Conta de Acesso</h4>
                        <div className="grid gap-2">
                            <Label htmlFor="c_name">Nome Completo *</Label>
                            <Input id="c_name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: João da Silva" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="c_email">Email (Login) *</Label>
                                <Input id="c_email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="motorista@email.com" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="c_pass">Senha *</Label>
                                <Input id="c_pass" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 border-b border-slate-100 pb-4">
                        <h4 className="font-semibold text-sm text-slate-500 uppercase tracking-wider">Veículo</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="c_brand">Marca</Label>
                                <Input id="c_brand" placeholder="Ex: Honda" value={motoBrand} onChange={e => setMotoBrand(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="c_model">Modelo</Label>
                                <Input id="c_model" placeholder="Ex: CG 160" value={motoModel} onChange={e => setMotoModel(e.target.value)} />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="c_plate">Placa</Label>
                            <Input id="c_plate" placeholder="ABC-1234" value={motoPlate} onChange={e => setMotoPlate(e.target.value.toUpperCase())} maxLength={8} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-semibold text-sm text-slate-500 uppercase tracking-wider">Financeiro</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="grid gap-2 col-span-1">
                                <Label htmlFor="c_pixtype">Tipo Chave</Label>
                                <select
                                    id="c_pixtype"
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
                                <Label htmlFor="c_pix">Chave Pix</Label>
                                <Input id="c_pix" value={pixKey} onChange={e => setPixKey(e.target.value)} />
                            </div>
                        </div>
                    </div>

                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button onClick={handleCreate} disabled={loading} className="bg-slate-900 text-white">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Criar Motorista
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default DriverCreateModal;
