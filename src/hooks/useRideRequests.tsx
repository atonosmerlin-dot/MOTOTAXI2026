import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface RideRequest {
  id: string;
  point_id: string;
  client_id: string | null;
  client_name?: string;
  destination_address?: string;
  client_whatsapp?: string;
  driver_id: string | null;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  created_at: string;
  point?: {
    name: string;
    address: string;
    latitude?: number | null;
    longitude?: number | null;
    is_active?: boolean;
  };
  driver?: {
    id: string;
    profile?: {
      name: string;
      photo_url: string | null;
    };
  };
}

export const useRideRequests = () => {
  const queryClient = useQueryClient();

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel('ride-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_requests'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ride_requests'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['ride_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ride_requests')
        .select(`
          *,
          point:fixed_points(name, address, latitude, longitude, is_active)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as RideRequest[];
    }
  });
};

// Determine server origin dynamically
// On Cloudflare Pages, APIs are at same origin
// On localhost dev, tries port 3000
const getServerOrigin = () => {
  const envOrigin = import.meta.env.VITE_SERVER_ORIGIN;
  if (envOrigin) return envOrigin;
  if (typeof window !== 'undefined') {
    // If on Cloudflare Pages (.pages.dev), use same origin for Functions
    if (window.location.hostname.includes('pages.dev') || window.location.hostname.includes('cloudflare')) {
      return window.location.origin;
    }
    // Dev: try port 3000 first
    const port = import.meta.env.VITE_SERVER_PORT || '3000';
    return `${window.location.protocol}//${window.location.hostname}:${port}`;
  }
  return 'http://localhost:3000';
};

export const usePendingRequests = (driverId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('pending-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_requests'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pending_requests', driverId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, driverId]);

  return useQuery({
    queryKey: ['pending_requests', driverId],
    queryFn: async () => {
      const { data: pendingData, error: pendingError } = await supabase
        .from('ride_requests')
        .select(`
          *,
          point:fixed_points(name, address, latitude, longitude, is_active)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (pendingError) throw pendingError;

      // Se driver_id fornecido, filtrar rejeitadas por esse driver
      // Fetch online drivers count
      const { data: onlineDrivers, error: onlineError } = await supabase
        .from('drivers')
        .select('id')
        .eq('is_online', true);
      if (onlineError) throw onlineError;
      const onlineCount = (onlineDrivers || []).length;

      // Fetch all rejections for the pending rides
      const rideIds = (pendingData || []).map((r: any) => r.id);
      let rejections: any[] = [];
      if (rideIds.length > 0) {
        const { data: rejData, error: rejError } = await supabase
          .from('ride_rejections')
          .select('ride_id, driver_id')
          .in('ride_id', rideIds);
        if (rejError) throw rejError;
        rejections = rejData || [];
      }

      // Build rejection counts per ride and set of rejections by this driver
      const rejectionCountMap: Record<string, number> = {};
      const rejectedByThisDriver = new Set<string>();
      rejections.forEach(r => {
        rejectionCountMap[r.ride_id] = (rejectionCountMap[r.ride_id] || 0) + 1;
        if (driverId && r.driver_id === driverId) rejectedByThisDriver.add(r.ride_id);
      });

      // Filter out rides that this driver already rejected, and also
      // remove rides that were rejected by all online drivers
      return (pendingData as RideRequest[]).filter(ride => {
        if (driverId && rejectedByThisDriver.has(ride.id)) return false;
        const rejCount = rejectionCountMap[ride.id] || 0;
        if (onlineCount > 0 && rejCount >= onlineCount) return false;
        return true;
      });
    },
    enabled: true
  });
};

export const useMyActiveRequest = (driverId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('my-active-request-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_requests'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['my_active_request', driverId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, driverId]);

  return useQuery({
    queryKey: ['my_active_request', driverId],
    queryFn: async () => {
      if (!driverId) return null;
      
      const { data, error } = await supabase
        .from('ride_requests')
        .select(`
          *,
          point:fixed_points(name, address, latitude, longitude, is_active)
        `)
        .eq('driver_id', driverId)
        .eq('status', 'accepted')
        .maybeSingle();
      
      if (error) throw error;
      return data as RideRequest | null;
    },
    enabled: !!driverId
  });
};

export const useClientActiveRequest = (clientId: string | undefined, pointId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('client-request-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_requests'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['client_request', clientId, pointId] });
        }
      )
      .subscribe();

    // Also listen for changes on ride_proposals so clients get proposals updates
    const proposalsChannel = supabase
      .channel('client-proposals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_proposals'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['client_request', clientId, pointId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(proposalsChannel);
    };
  }, [queryClient, clientId, pointId]);

  return useQuery({
    queryKey: ['client_request', clientId, pointId],
    queryFn: async () => {
      if (!clientId || !pointId) return null;
      
      const { data, error } = await supabase
        .from('ride_requests')
        .select(`
          *,
          point:fixed_points(name, address)
        `)
        .eq('client_id', clientId)
        .eq('point_id', pointId)
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      
      // also fetch proposals for this ride (if any)
      let proposals: any[] = [];
      try {
        if (data?.id) {
          const { data: propsData, error: propsErr } = await supabase
            .from('ride_proposals')
            .select('id,ride_id,driver_id,price,status,created_at,drivers(id,user_id)')
            .eq('ride_id', data.id)
            .order('created_at', { ascending: false });
          if (propsErr) throw propsErr;
          proposals = propsData || [];
        }
      } catch (e) {
        console.warn('Could not fetch proposals for ride', e);
        proposals = [];
      }

      // If have driver, fetch profile
      if (data?.driver_id) {
        const { data: driverData } = await supabase
          .from('drivers')
          .select('id, user_id')
          .eq('id', data.driver_id)
          .maybeSingle();
        
        if (driverData) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name, photo_url')
            .eq('id', driverData.user_id)
            .maybeSingle();
          
          return {
            ...data,
            proposals,
            driver: {
              id: driverData.id,
              profile: profileData || { name: 'Motorista', photo_url: null }
            }
          } as any;
        }
      }

      return ({ ...data, proposals } as any) || null;
    },
    enabled: !!clientId && !!pointId
  });
};

export const useCreateRideRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ pointId, clientId, driver_id, clientName, destinationAddress, clientWhatsapp }: {
      pointId: string;
      clientId: string;
      driver_id?: string;
      clientName: string;
      destinationAddress: string;
      clientWhatsapp?: string | null;
    }) => {
      const insertData: any = {
        point_id: pointId,
        client_id: clientId,
        client_name: clientName,
        destination_address: destinationAddress,
        client_whatsapp: clientWhatsapp,
        status: 'pending'
      };
      
      if (driver_id) {
        insertData.driver_id = driver_id;
      }
      // zone/price fields removed
      
      const { data, error } = await supabase
        .from('ride_requests')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ride_requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending_requests'] });
      queryClient.invalidateQueries({ queryKey: ['my_active_request'] });
      queryClient.invalidateQueries({ queryKey: ['client_request'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['online_drivers'] });
    }
  });
};

export const useAcceptRideRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ requestId, driverId }: { requestId: string; driverId: string }) => {
      // Call backend accept endpoint which performs atomic accept using service role
      const resp = await fetch(getServerOrigin() + '/api/accept-ride', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, driverId })
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.error || `Accept failed: ${resp.status}`);
      }
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ride_requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending_requests'] });
      queryClient.invalidateQueries({ queryKey: ['my_active_request'] });
      queryClient.invalidateQueries({ queryKey: ['client_request'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['online_drivers'] });
    }
  });
};

export const useProposePrice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, driverId, price }: { requestId: string; driverId: string; price: number }) => {
      const resp = await fetch(getServerOrigin() + '/api/propose-price', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, driverId, price })
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.error || `Propose failed: ${resp.status}`);
      }
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending_requests'] });
      queryClient.invalidateQueries({ queryKey: ['client_request'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['ride_requests'] });
    }
  });
};

export const useRespondProposal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ proposalId, accept }: { proposalId: string; accept: boolean }) => {
      const resp = await fetch(getServerOrigin() + '/api/respond-proposal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId, accept })
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.error || `Respond failed: ${resp.status}`);
      }
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_request'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['pending_requests'] });
      queryClient.invalidateQueries({ queryKey: ['ride_requests'] });
      queryClient.invalidateQueries({ queryKey: ['my_active_request'] });
    }
  });
};

export const useCompleteRideRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ requestId, driverId }: { requestId: string; driverId: string }) => {
      // Update request
      const { error: requestError } = await supabase
        .from('ride_requests')
        .update({ status: 'completed' })
        .eq('id', requestId);
      
      if (requestError) throw requestError;

      // Update driver status
      const { error: driverError } = await supabase
        .from('drivers')
        .update({ status: 'idle' })
        .eq('id', driverId);
      
      if (driverError) throw driverError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ride_requests'] });
      queryClient.invalidateQueries({ queryKey: ['my_active_request'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['online_drivers'] });
    }
  });
};

export const useRejectRideRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ requestId, driverId }: { requestId: string; driverId: string }) => {
      const resp = await fetch(getServerOrigin() + '/api/reject-ride', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, driverId })
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.error || `Reject failed: ${resp.status}`);
      }
      return resp.json();
    },
    onSuccess: (_data, variables) => {
      const driverId = (variables as any)?.driverId;
      // Invalidate both the driver-specific and global pending lists
      if (driverId) {
        queryClient.invalidateQueries({ queryKey: ['pending_requests', driverId] });
      }
      queryClient.invalidateQueries({ queryKey: ['pending_requests'] });
      queryClient.invalidateQueries({ queryKey: ['my_active_request'] });
      queryClient.invalidateQueries({ queryKey: ['online_drivers'] });
    }
  });
};
