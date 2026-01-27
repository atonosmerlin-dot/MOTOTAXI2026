import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Users, DollarSign, Activity, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const AdminDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalDrivers: 0,
        onlineDrivers: 0,
        totalRides: 0,
        totalRevenue: 0
    });
    const [drivers, setDrivers] = useState<any[]>([]);
    const [recentRides, setRecentRides] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch Drivers
            const { data: driversData, error: driversError } = await supabase
                .from('drivers')
                .select('*, profiles(name, email, phone_number, photo_url)');
            if (driversError) throw driversError;

            // Fetch Rides
            const { data: ridesData, error: ridesError } = await supabase
                .from('ride_requests')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
            if (ridesError) throw ridesError;

            // Calculate Stats
            const totalDrivers = driversData?.length || 0;
            const onlineDrivers = driversData?.filter((d: any) => d.is_online).length || 0;
            const totalRides = ridesData?.length || 0;
            const totalRevenue = 1250.00; // Mock for now

            setStats({ totalDrivers, onlineDrivers, totalRides, totalRevenue });
            setDrivers(driversData || []);
            setRecentRides(ridesData || []);

        } catch (error) {
            console.error('Error fetching admin data:', error);
            toast.error('Erro ao carregar dados do painel');
        } finally {
            setLoading(false);
        }
    };

    const toggleDriverStatus = async (driverId: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'approved' ? 'blocked' : 'approved';
            // @ts-ignore
            const { error } = await supabase
                .from('drivers')
                .update({ status: newStatus } as any)
                .eq('id', driverId);

            if (error) throw error;
            toast.success(`Status do motorista atualizado para: ${newStatus}`);
            fetchData();
        } catch (error) {
            toast.error('Erro ao atualizar status');
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-slate-50/50 p-8 space-y-8 font-sans">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900">Painel Administrativo</h1>
                    <p className="text-slate-500">Visão geral e gestão do MotoPoint</p>
                </div>
                <Button onClick={fetchData} variant="outline" className="gap-2">
                    <Activity size={16} /> Atualizar
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-lg bg-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Motoristas Totais</CardTitle>
                        <Users className="text-blue-500 w-4 h-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalDrivers}</div>
                        <p className="text-xs text-green-500 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            {stats.onlineDrivers} Online agora
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Corridas (Hoje)</CardTitle>
                        <TrendingUp className="text-green-500 w-4 h-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">24</div>
                        <p className="text-xs text-slate-400">+12% vs ontem</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Receita Estimada</CardTitle>
                        <DollarSign className="text-yellow-500 w-4 h-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">R$ {stats.totalRevenue.toFixed(2)}</div>
                        <p className="text-xs text-slate-400">Total transacionado</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Alertas</CardTitle>
                        <AlertCircle className="text-red-500 w-4 h-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-slate-400">Reclamações pendentes</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Drivers List */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-bold text-slate-800">Motoristas Recentes</h2>
                    <Card className="border-0 shadow-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Online</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {drivers.map((driver) => (
                                    <TableRow key={driver.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">
                                                    {driver.profiles?.name?.charAt(0) || 'M'}
                                                </div>
                                                {driver.profiles?.name || 'Motorista'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={driver.status === 'blocked' ? 'destructive' : 'outline'}>
                                                {driver.status || 'Pendente'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className={cn("inline-block w-2 h-2 rounded-full", driver.is_online ? "bg-green-500" : "bg-slate-300")}></span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => toggleDriverStatus(driver.id, driver.status)}>
                                                {driver.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </div>

                {/* Recent Activity */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-800">Últimas Corridas</h2>
                    <div className="space-y-3">
                        {recentRides.slice(0, 5).map(ride => (
                            <Card key={ride.id} className="p-4 flex flex-col gap-2 border-l-4 border-l-primary">
                                <div className="flex justify-between items-start">
                                    <span className="font-bold text-sm">{ride.point_name || 'Chamada Direta'}</span>
                                    <span className="text-xs text-slate-400">{new Date(ride.created_at).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-xs text-slate-500 truncate">{ride.destination_address}</p>
                                <div className="flex justify-between items-center mt-2">
                                    <Badge variant={ride.status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
                                        {ride.status}
                                    </Badge>
                                    {ride.estimated_price && <span className="text-xs font-bold text-green-600">R$ {ride.estimated_price}</span>}
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
