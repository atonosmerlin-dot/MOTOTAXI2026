import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TrendingUp, Clock, CheckCircle2, XCircle, MapPin } from 'lucide-react';

interface RidesTableProps {
    rides: any[];
    onRefresh: () => void;
}

const RidesTable: React.FC<RidesTableProps> = ({ rides, onRefresh }) => {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1"><CheckCircle2 size={12} /> Concluída</Badge>;
            case 'pending': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1"><Clock size={12} /> Pendente</Badge>;
            case 'accepted': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1"><TrendingUp size={12} /> Em andamento</Badge>;
            case 'cancelled': return <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 gap-1"><XCircle size={12} /> Cancelada</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-slate-800">Últimas 100 Corridas</h3>
                <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
                    <TrendingUp size={14} /> Atualizar Lista
                </Button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead>Data/Hora</TableHead>
                            <TableHead>Passageiro</TableHead>
                            <TableHead>Destino</TableHead>
                            <TableHead>Valor (Est.)</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rides.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                                    Nenhuma corrida registrada ainda
                                </TableCell>
                            </TableRow>
                        ) : (
                            rides.map((ride) => (
                                <TableRow key={ride.id} className="hover:bg-slate-50/50">
                                    <TableCell className="text-slate-600 whitespace-nowrap">
                                        {new Date(ride.created_at).toLocaleString('pt-BR', {
                                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </TableCell>
                                    <TableCell className="font-medium text-slate-900">
                                        {ride.client_name || 'Anônimo'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-slate-600 max-w-[200px] md:max-w-xs truncate">
                                            <MapPin size={14} className="text-slate-400 shrink-0" />
                                            {ride.destination_address || 'Não informado'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-bold text-emerald-600">
                                        {ride.estimated_price ? `R$ ${ride.estimated_price.toFixed(2)}` : '-'}
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(ride.status)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default RidesTable;
