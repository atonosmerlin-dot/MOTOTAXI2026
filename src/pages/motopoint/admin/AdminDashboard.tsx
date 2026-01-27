import React, { useState, useEffect } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import AdminLayout from '@/components/motopoint/admin/AdminLayout';
import DashboardOverview from '@/components/motopoint/admin/DashboardOverview';
import DriversTable from '@/components/motopoint/admin/DriversTable';
import RidesTable from '@/components/motopoint/admin/RidesTable';
import BannersManager from '@/components/motopoint/admin/BannersManager';
import SettingsManager from '@/components/motopoint/admin/SettingsManager';
import { useFixedPoints } from '@/hooks/useFixedPoints';
import { useDrivers } from '@/hooks/useDrivers';
import Button from '@/components/motopoint/Button';
import { Plus } from 'lucide-react';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';
import DriverEditModal from '@/components/motopoint/admin/DriverEditModal';
import DriverCreateModal from '@/components/motopoint/admin/DriverCreateModal';
import { supabase } from '@/integrations/supabase/client';

const AdminDashboard: React.FC = () => {
  // Analytics State
  const [recentRides, setRecentRides] = useState<any[]>([]);
  const [ridesToday, setRidesToday] = useState(0);
  const [revenueStats, setRevenueStats] = useState({ today: 0, total: 0 });

  // Modal State
  const [editingDriver, setEditingDriver] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Data Hooks
  const { data: drivers = [], refetch: refetchDrivers } = useDrivers();
  const { data: points = [], isLoading: pointsLoading } = useFixedPoints();

  // Fetch Analytics
  const fetchAnalytics = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: rides, error } = await supabase
        .from('ride_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (rides) {
        setRecentRides(rides);
        const todayRides = rides.filter((r: any) => new Date(r.created_at) >= today);
        setRidesToday(todayRides.length);

        const totalRev = rides.reduce((acc: number, r: any) => acc + (r.status === 'completed' ? (r.estimated_price || 15) : 0), 0);
        const todayRev = todayRides.reduce((acc: number, r: any) => acc + (r.status === 'completed' ? (r.estimated_price || 15) : 0), 0);

        setRevenueStats({ total: totalRev, today: todayRev });
      }
    } catch (e) {
      console.error('Error fetching analytics', e);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // ----------------------------------------------------------------------
  // Driver Actions (Simplified for brevity, reusing original logic structure)
  // ----------------------------------------------------------------------
  const toggleDriverStatus = async (driverId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'blocked' ? 'approved' : 'blocked';
      // @ts-ignore
      const { error } = await supabase.from('drivers').update({ status: newStatus } as any).eq('id', driverId);
      if (error) throw error;
      toast.success(`Motorista ${newStatus === 'blocked' ? 'bloqueado' : 'aprovado'}`);
      refetchDrivers();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDeleteDriver = async (driverId: string, userId: string) => {
    if (!confirm('Tem certeza? Isso apagará o motorista.')) return;
    try {
      // @ts-ignore
      const { error } = await supabase.from('drivers').delete().eq('id', driverId);
      if (error) throw error;
      toast.success('Motorista excluído');
      refetchDrivers();
    } catch (error) {
      toast.error('Erro ao excluir motorista');
    }
  };

  // ----------------------------------------------------------------------
  // Sub-Page Components (Inline for this file to work with Routes)
  // ----------------------------------------------------------------------

  const OverviewPage = () => (
    <DashboardOverview
      stats={{
        totalDrivers: drivers.length,
        onlineDrivers: drivers.filter(d => d.is_online).length,
        totalRides: recentRides.length, // approximation
        ridesToday: ridesToday,
        revenueTotal: revenueStats.total,
        revenueToday: revenueStats.today
      }}
    />
  );

  const DriversPage = () => (
    <>
      <DriversTable
        drivers={drivers}
        onToggleStatus={toggleDriverStatus}
        onEdit={(d) => {
          setEditingDriver(d);
          setShowEditModal(true);
        }}
        onDelete={handleDeleteDriver}
        onCreate={() => setShowCreateModal(true)}
      />

      {/* Driver Edit Modal */}
      {editingDriver && (
        <DriverEditModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          driver={editingDriver}
          onSuccess={() => {
            refetchDrivers();
          }}
        />
      )}

      {/* Driver Create Modal */}
      <DriverCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          refetchDrivers();
        }}
      />
    </>
  );

  const RidesPage = () => (
    <RidesTable
      rides={recentRides}
      onRefresh={fetchAnalytics}
    />
  );

  const PointsPage = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Simple Point Card Mapping for now */}
      {points.map(point => (
        <div key={point.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <h3 className="font-bold text-lg mb-1">{point.name}</h3>
          <p className="text-sm text-slate-500 mb-4">{point.address}</p>
          <div className="p-2 bg-white border-2 border-slate-100 rounded-lg mb-4">
            <QRCode value={`${window.location.origin}/point/${point.id}`} size={100} />
          </div>
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1 text-xs">Baixar QR</Button>
            <Button variant="outline" className="flex-1 text-xs text-red-600 hover:bg-red-50 border-red-100">Excluir</Button>
          </div>
        </div>
      ))}
      <button className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors bg-slate-50 min-h-[300px]">
        <Plus size={32} className="mb-2" />
        <span className="font-medium">Novo Ponto</span>
      </button>
    </div>
  );

  const BannersPage = () => <BannersManager />;

  const SettingsPage = () => <SettingsManager />;

  return (
    <Routes>
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="drivers" element={<DriversPage />} />
        <Route path="rides" element={<RidesPage />} />
        <Route path="points" element={<PointsPage />} />
        <Route path="banners" element={<BannersPage />} />
        <Route path="settings" element={<SettingsPage />} />
        {/* Fallback for banners or other routes */}
        <Route path="*" element={<Navigate to="" replace />} />
      </Route>
    </Routes>
  );
};

export default AdminDashboard;
