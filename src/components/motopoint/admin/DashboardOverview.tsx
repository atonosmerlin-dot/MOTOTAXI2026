import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, TrendingUp, AlertCircle, Car, Activity } from 'lucide-react';

interface OverviewProps {
    stats: {
        totalDrivers: number;
        onlineDrivers: number;
        totalRides: number;
        ridesToday: number;
        revenueTotal: number;
        revenueToday: number;
    };
}

const DashboardOverview: React.FC<OverviewProps> = ({ stats }) => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Revenue Card */}
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Receita Total</CardTitle>
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">R$ {stats.revenueTotal.toFixed(2)}</div>
                        <p className="text-xs text-emerald-600 font-medium flex items-center mt-1">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            +R$ {stats.revenueToday.toFixed(2)} hoje
                        </p>
                    </CardContent>
                </Card>

                {/* Rides Card */}
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Corridas</CardTitle>
                        <Car className="w-4 h-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{stats.totalRides}</div>
                        <p className="text-xs text-blue-600 font-medium flex items-center mt-1">
                            <Activity className="w-3 h-3 mr-1" />
                            {stats.ridesToday} novas hoje
                        </p>
                    </CardContent>
                </Card>

                {/* Drivers Card */}
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Motoristas</CardTitle>
                        <Users className="w-4 h-4 text-violet-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{stats.totalDrivers}</div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <p className="text-xs text-slate-500 font-medium">{stats.onlineDrivers} online agora</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Alerts Card */}
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Alertas</CardTitle>
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">0</div>
                        <p className="text-xs text-slate-400 mt-1">Nenhuma pendência crítica</p>
                    </CardContent>
                </Card>
            </div>

            {/* Add Charts here later */}
        </div>
    );
};

export default DashboardOverview;
