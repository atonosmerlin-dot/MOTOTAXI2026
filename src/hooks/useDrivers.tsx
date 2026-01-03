import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Driver {
  id: string;
  user_id: string;
  is_online: boolean;
  status: 'idle' | 'busy';
  current_point_id: string | null;
  created_at: string;
  profile?: {
    name: string;
    photo_url: string | null;
  };
}

export const useDrivers = () => {
  const queryClient = useQueryClient();

  // Subscribe to realtime changes - moved inside useQuery to avoid extra hook
  return useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      // Subscribe to realtime updates
      const channel = supabase
        .channel('drivers-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'drivers'
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['drivers'] });
          }
        )
        .subscribe();

      // Fetch drivers
      const { data: driversData, error: driversError } = await supabase
        .from('drivers')
        .select('*');

      if (driversError) throw driversError;

      const userIds = driversData?.map((d: any) => d.user_id).filter(Boolean) || [];

      // Fetch profiles for those userIds in batch
      let profilesMap: Record<string, { name: string; photo_url: string | null }> = {};
      if (userIds.length) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, photo_url')
          .in('id', userIds as string[]);

        if (profilesError) {
          console.warn('Error fetching profiles for drivers', profilesError);
        } else if (profilesData) {
          profilesMap = Object.fromEntries(profilesData.map((p: any) => [p.id, { name: p.name, photo_url: p.photo_url }]));
        }
      }

      return (driversData || []).map((d: any) => ({
        ...d,
        profile: profilesMap[d.user_id] || { name: 'Motorista', photo_url: null }
      })) as Driver[];
    }
  });
};

export const useOnlineDrivers = () => {
  const queryClient = useQueryClient();

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel('online-drivers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drivers'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['online_drivers'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['online_drivers'],
    queryFn: async () => {
      try {
        console.log('=== FETCHING DRIVERS ===');
        
        // Check current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('Current session:', session ? 'authenticated' : 'anonymous', 'Error:', sessionError);

        // First, fetch all drivers to see the status
        const { data: allDrivers, error: allDriversError } = await supabase
          .from('drivers')
          .select('*');

        console.log('All drivers in DB:', allDrivers, 'Error:', allDriversError);

        const { data: driversData, error: driversError } = await supabase
          .from('drivers')
          .select('*')
          .eq('is_online', true)
          .eq('status', 'idle');

        console.log('Filtered drivers (is_online=true, status=idle):', driversData, 'Error:', driversError);
        if (driversError) {
          console.error('Error fetching online drivers:', driversError);
          throw driversError;
        }

        const userIds = driversData?.map((d: any) => d.user_id).filter(Boolean) || [];
        console.log('User IDs to fetch profiles for:', userIds);

        let profilesMap: Record<string, { name: string; photo_url: string | null }> = {};
        if (userIds.length) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, name, photo_url')
            .in('id', userIds as string[]);

          console.log('Profiles fetched:', profilesData, 'Error:', profilesError);
          if (profilesError) {
            console.warn('Error fetching profiles for online drivers', profilesError);
          } else if (profilesData) {
            profilesMap = Object.fromEntries(profilesData.map((p: any) => [p.id, { name: p.name, photo_url: p.photo_url }]));
          }
        } else {
          console.warn('No user IDs found to fetch profiles for!');
        }

        const result = (driversData || []).map((d: any) => ({
          ...d,
          profile: profilesMap[d.user_id] || { name: 'Motorista', photo_url: null }
        })) as Driver[];

        console.log('Final online drivers with profiles:', result);
        return result;
      } catch (error) {
        console.error('=== CRITICAL ERROR IN useOnlineDrivers ===', error);
        throw error;
      }
    }
  });
};

export const useMyDriver = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['my_driver', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      return data as Driver | null;
    },
    enabled: !!userId
  });
};

export const useToggleDriverStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ driverId, isOnline }: { driverId: string; isOnline: boolean }) => {
      const updateData: any = { is_online: isOnline };
      // When setting driver online, ensure status is 'idle' so clients see them
      if (isOnline) updateData.status = 'idle';

      const { error } = await supabase
        .from('drivers')
        .update(updateData)
        .eq('id', driverId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['online_drivers'] });
      queryClient.invalidateQueries({ queryKey: ['my_driver'] });
    }
  });
};

export const useRegisterAsDriver = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase
        .from('drivers')
        .insert({ user_id: userId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['my_driver'] });
    }
  });
};
