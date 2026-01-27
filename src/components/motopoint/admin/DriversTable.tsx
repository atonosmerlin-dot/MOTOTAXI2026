import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Plus, Filter, MoreHorizontal, ShieldCheck, ShieldAlert } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface DriversTableProps {
    drivers: any[];
    onToggleStatus: (id: string, current: string) => void;
    onEdit: (driver: any) => void;
    onDelete: (id: string, userId: string) => void;
    onCreate: () => void;
}

const DriversTable: React.FC<DriversTableProps> = ({ drivers, onToggleStatus, onEdit, onDelete, onCreate }) => {
    const [search, setSearch] = useState('');

    const filteredDrivers = drivers.filter(d =>
        d.profile?.name?.toLowerCase().includes(search.toLowerCase()) ||
        d.moto_plate?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Buscar por nome ou placa..."
                        className="pl-9 bg-white"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2 text-slate-600">
                        <Filter size={16} /> Filtros
                    </Button>
                    <Button onClick={onCreate} className="gap-2 bg-slate-900 text-white hover:bg-slate-800">
                        <Plus size={16} /> Novo Motorista
                    </Button>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[80px]">Foto</TableHead>
                            <TableHead>Nome / ID</TableHead>
                            <TableHead>Moto</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Online</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredDrivers.map((driver) => (
                            <TableRow key={driver.id} className="hover:bg-slate-50/50">
                                <TableCell>
                                    <Avatar className="h-10 w-10 border border-slate-100">
                                        <AvatarImage src={driver.profile?.photo_url || ''} />
                                        <AvatarFallback className="bg-slate-100 text-slate-500 font-bold">
                                            {driver.profile?.name?.charAt(0) || 'M'}
                                        </AvatarFallback>
                                    </Avatar>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-slate-900">{driver.profile?.name || 'Sem nome'}</span>
                                        <span className="text-xs text-slate-400 font-mono">ID: {driver.id.slice(0, 8)}...</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm text-slate-600">
                                        {driver.moto_brand} {driver.moto_model}
                                        <div className="text-xs text-slate-400">{driver.moto_plate}</div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={driver.status === 'blocked' ? 'destructive' : 'secondary'} className={driver.status !== 'blocked' ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200' : ''}>
                                        {driver.status === 'blocked' ? 'Bloqueado' : 'Aprovado'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${driver.is_online ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        <span className={`w-2 h-2 mr-1.5 rounded-full ${driver.is_online ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                                        {driver.is_online ? 'Online' : 'Offline'}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => onEdit(driver)}>
                                                Editar Cadastro
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onToggleStatus(driver.id, driver.status)}>
                                                {driver.status === 'blocked' ?
                                                    <span className="flex items-center text-green-600"><ShieldCheck className="mr-2 h-4 w-4" /> Desbloquear</span> :
                                                    <span className="flex items-center text-destructive"><ShieldAlert className="mr-2 h-4 w-4" /> Bloquear</span>
                                                }
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(driver.id, driver.user_id)}>
                                                Excluir Motorista
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredDrivers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                    Nenhum motorista encontrado
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default DriversTable;
