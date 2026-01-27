import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DriverStats {
    todayEarnings: number;
    todayRides: number;
    averageRating: number;
}

export function useDriverStats(driverId?: string) {
    return useQuery({
        queryKey: ['driver-stats', driverId],
        queryFn: async (): Promise<DriverStats> => {
            if (!driverId) return { todayEarnings: 0, todayRides: 0, averageRating: 5.0 };

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayIso = today.toISOString();

            // Fetch rides completed today
            const { data: rides, error } = await supabase
                .from('ride_requests')
                .select('id, price')
                .eq('driver_id', driverId)
                .eq('status', 'completed')
                .gte('created_at', todayIso);

            if (error) throw error;

            const ridesData = rides as any[];

            const todayEarnings = ridesData?.reduce((acc: number, ride: any) => acc + (Number(ride.price) || 0), 0) || 0;
            const todayRides = ridesData?.length || 0;

            // Mock rating for now
            return {
                todayEarnings,
                todayRides,
                averageRating: 4.9
            };
        },
        enabled: !!driverId,
        refetchInterval: 60000, // Update every minute
    });
}
