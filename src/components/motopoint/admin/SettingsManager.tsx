import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Save, Smartphone, LayoutTemplate, Palette, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import siteConfig from '@/lib/siteConfig';
import { supabase } from '@/integrations/supabase/client';

const SettingsManager: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // General
    const [appName, setAppName] = useState('MotoPoint');
    const [appSlogan, setAppSlogan] = useState('Mototáxi rápido e seguro');
    const [footerText, setFooterText] = useState('MotoPoint © 2026');
    const [mainButtonText, setMainButtonText] = useState('Escanear QR Code');
    const [descriptionText, setDescriptionText] = useState('Escaneie o QR Code...');

    // Appearance
    const [logoUrl, setLogoUrl] = useState('');
    const [logoSize, setLogoSize] = useState('48');
    const [homeBg, setHomeBg] = useState('#071029');
    const [cardColor, setCardColor] = useState('#0f1724');
    const [buttonColor, setButtonColor] = useState('#111827');
    const [textColor, setTextColor] = useState('#ffffff');

    // Hero
    const [heroImageUrl, setHeroImageUrl] = useState('');
    const [heroHeight, setHeroHeight] = useState('320');
    const [heroAlignment, setHeroAlignment] = useState('center');
    const [heroObjectFit, setHeroObjectFit] = useState('contain');

    // Features
    const [enablePwa, setEnablePwa] = useState(true);
    const [enableNotifications, setEnableNotifications] = useState(true);

    // Initial Load
    useEffect(() => {
        const load = async () => {
            try {
                const cfg = await siteConfig.getSiteConfigs();
                if (cfg.app_name) setAppName(cfg.app_name);
                if (cfg.app_slogan) setAppSlogan(cfg.app_slogan);
                if (cfg.footer_text) setFooterText(cfg.footer_text);
                if (cfg.main_button_text) setMainButtonText(cfg.main_button_text);
                if (cfg.description_text) setDescriptionText(cfg.description_text);

                if (cfg.logo_url) setLogoUrl(cfg.logo_url);
                if (cfg.logo_size) setLogoSize(cfg.logo_size);
                if (cfg.home_bg) setHomeBg(cfg.home_bg);
                if (cfg.card_color) setCardColor(cfg.card_color);
                if (cfg.button_color) setButtonColor(cfg.button_color);
                if (cfg.text_color) setTextColor(cfg.text_color);

                if (cfg.hero_image_url) setHeroImageUrl(cfg.hero_image_url);
                if (cfg.hero_height_px) setHeroHeight(cfg.hero_height_px);
                if (cfg.hero_alignment) setHeroAlignment(cfg.hero_alignment);
                if (cfg.hero_object_fit) setHeroObjectFit(cfg.hero_object_fit);

                if (cfg.enable_pwa) setEnablePwa(cfg.enable_pwa === 'true');
                if (cfg.enable_push_notifications) setEnableNotifications(cfg.enable_push_notifications === 'true');

            } catch (e) {
                console.error(e);
                toast.error('Erro ao carregar configurações');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await siteConfig.upsertManySiteConfigs({
                app_name: appName,
                app_slogan: appSlogan,
                footer_text: footerText,
                main_button_text: mainButtonText,
                description_text: descriptionText,

                logo_url: logoUrl,
                logo_size: logoSize,
                home_bg: homeBg,
                card_color: cardColor,
                button_color: buttonColor,
                text_color: textColor,

                hero_image_url: heroImageUrl,
                hero_height_px: heroHeight,
                hero_alignment: heroAlignment,
                hero_object_fit: heroObjectFit,

                enable_pwa: String(enablePwa),
                enable_push_notifications: String(enableNotifications)
            });
            toast.success('Configurações salvas com sucesso!');
        } catch (e) {
            toast.error('Erro ao salvar configurações');
        } finally {
            setSaving(false);
        }
    };

    const handleUpload = async (file: File, type: 'logo' | 'hero') => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${type}_${Math.random()}.${fileExt}`;
            const { data, error } = await supabase.storage
                .from('app-assets')
                .upload(fileName, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('app-assets')
                .getPublicUrl(fileName);

            if (type === 'logo') setLogoUrl(publicUrl);
            else setHeroImageUrl(publicUrl);

            toast.success('Imagem enviada! Clique em Salvar para persistir.');
        } catch (e) {
            toast.error('Erro no upload. Verifique se o bucket "app-assets" existe e é público.');
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Carregando configurações...</div>;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Personalização do App</h2>
                    <p className="text-slate-500">Controle total sobre a aparência e textos do aplicativo do cliente.</p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                    <Save size={18} />
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
                    <TabsTrigger value="general" className="gap-2"><LayoutTemplate size={16} /> Geral</TabsTrigger>
                    <TabsTrigger value="appearance" className="gap-2"><Palette size={16} /> Aparência</TabsTrigger>
                    <TabsTrigger value="hero" className="gap-2"><ImageIcon size={16} /> Hero</TabsTrigger>
                    <TabsTrigger value="features" className="gap-2"><Smartphone size={16} /> Funcionalidades</TabsTrigger>
                </TabsList>

                {/* GENERAL TAB */}
                <TabsContent value="general" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Identidade Básica</CardTitle>
                            <CardDescription>Nome do aplicativo e textos principais.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nome do Aplicativo</Label>
                                    <Input value={appName} onChange={e => setAppName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Slogan</Label>
                                    <Input value={appSlogan} onChange={e => setAppSlogan(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Texto de Descrição (Abaixo do Hero)</Label>
                                <Textarea value={descriptionText} onChange={e => setDescriptionText(e.target.value)} />
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Texto do Botão Principal</Label>
                                    <Input value={mainButtonText} onChange={e => setMainButtonText(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Texto do Rodapé</Label>
                                    <Input value={footerText} onChange={e => setFooterText(e.target.value)} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* APPEARANCE TAB */}
                <TabsContent value="appearance" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cores e Logo</CardTitle>
                            <CardDescription>Defina a paleta de cores do app cliente.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col md:flex-row gap-6 items-start">
                                <div className="space-y-2">
                                    <Label>Logo do App</Label>
                                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center gap-2 w-40 h-40 bg-slate-50">
                                        {logoUrl ? <img src={logoUrl} className="w-20 h-20 object-contain" /> : <ImageIcon className="text-slate-300 w-10 h-10" />}
                                        <div className="relative">
                                            <Button variant="secondary" size="sm" className="w-full text-xs h-6">Alterar</Button>
                                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'logo')} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Label>Tamanho (px)</Label>
                                        <Input type="number" className="w-20" value={logoSize} onChange={e => setLogoSize(e.target.value)} />
                                    </div>
                                </div>

                                <div className="flex-1 grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Fundo da Página</Label>
                                        <div className="flex gap-2">
                                            <input type="color" className="h-10 w-10 rounded border" value={homeBg} onChange={e => setHomeBg(e.target.value)} />
                                            <Input value={homeBg} onChange={e => setHomeBg(e.target.value)} className="font-mono" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Cor dos Cards</Label>
                                        <div className="flex gap-2">
                                            <input type="color" className="h-10 w-10 rounded border" value={cardColor} onChange={e => setCardColor(e.target.value)} />
                                            <Input value={cardColor} onChange={e => setCardColor(e.target.value)} className="font-mono" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Cor de Texto</Label>
                                        <div className="flex gap-2">
                                            <input type="color" className="h-10 w-10 rounded border" value={textColor} onChange={e => setTextColor(e.target.value)} />
                                            <Input value={textColor} onChange={e => setTextColor(e.target.value)} className="font-mono" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Botões Primários</Label>
                                        <div className="flex gap-2">
                                            <input type="color" className="h-10 w-10 rounded border" value={buttonColor} onChange={e => setButtonColor(e.target.value)} />
                                            <Input value={buttonColor} onChange={e => setButtonColor(e.target.value)} className="font-mono" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* HERO TAB */}
                <TabsContent value="hero" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Imagem de Destaque (Hero)</CardTitle>
                            <CardDescription>A imagem principal exibida no topo do app.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Upload da Imagem</Label>
                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center gap-4 bg-slate-50 hover:bg-slate-100 transition-colors relative">
                                    {heroImageUrl ? (
                                        <img src={heroImageUrl} className="h-48 object-contain rounded shadow-sm" />
                                    ) : (
                                        <div className="text-center text-slate-400">
                                            <ImageIcon size={48} className="mx-auto mb-2" />
                                            <p>Nenhuma imagem definida</p>
                                        </div>
                                    )}
                                    <Button variant="outline" className="relative">
                                        <Upload size={16} className="mr-2" /> Selecionar Arquivo
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'hero')} />
                                    </Button>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Altura (px)</Label>
                                    <Input type="number" value={heroHeight} onChange={e => setHeroHeight(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Ajuste de Imagem</Label>
                                    <Select value={heroObjectFit} onValueChange={setHeroObjectFit}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cover">Preencher (Cover)</SelectItem>
                                            <SelectItem value="contain">Conter (Contain)</SelectItem>
                                            <SelectItem value="fill">Esticar (Fill)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Alinhamento Horizontal</Label>
                                    <Select value={heroAlignment} onValueChange={setHeroAlignment}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="left">Esquerda</SelectItem>
                                            <SelectItem value="center">Centro</SelectItem>
                                            <SelectItem value="right">Direita</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* FEATURES TAB */}
                <TabsContent value="features" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Funcionalidades</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">PWA (Instalável)</Label>
                                    <p className="text-sm text-slate-500">Permite que o usuário instale o app no celular.</p>
                                </div>
                                <Switch checked={enablePwa} onCheckedChange={setEnablePwa} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Notificações Push</Label>
                                    <p className="text-sm text-slate-500">Habilita o sistema de alertas para passageiros.</p>
                                </div>
                                <Switch checked={enableNotifications} onCheckedChange={setEnableNotifications} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default SettingsManager;
