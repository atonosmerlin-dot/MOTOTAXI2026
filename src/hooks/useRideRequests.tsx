import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { getServerOrigin } from '@/lib/utils';

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
  updated_at: string;
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

const fetchApi = async (path: string, init: RequestInit) => {
  const origin = getServerOrigin();
  const isDev = import.meta.env.DEV;
  
  // Build candidates based on environment
  const candidates: string[] = [];
  
  if (isDev) {
    // Dev: try server endpoints
    candidates.push(`${origin}/${path}`);
    candidates.push(`${origin}/api/${path}`);
    candidates.push(`${origin}/_/functions/api/${path}`);
  } else {
    // Production: prefer Pages Functions route first, then Cloudflare mount,
    // fallback to simple relative route last.
    candidates.push(`/api/${path}`);
    candidates.push(`/_/functions/api/${path}`);
    candidates.push(`/${path}`);
  }

  let lastErr: any = null;
  for (const url of candidates) {
    try {
      const res = await fetch(url, init);
      if (!res.ok) {
        lastErr = new Error(`${url}: ${res.status}`);
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error(`Could not fetch ${path}`);
};

// Optimized: Single query for all pending rides
export const usePendingRequests = (driverId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!driverId) return;

    const channel = supabase
      .channel('pending-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_requests',
          filter: 'status=eq.pending'
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
      const { data, error } = await supabase
        .from('ride_requests')
        .select(`
          *,
          point:fixed_points(name, address, latitude, longitude, is_active)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data as any[]) as RideRequest[];
    },
    enabled: !!driverId,
    refetchInterval: 3000,
    staleTime: 2000,
  });
};

// Optimized: Single query for active client request
export const useClientActiveRequest = (clientId: string, pointId: string) => {
  return useQuery({
    queryKey: ['my_active_request', clientId, pointId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ride_requests')
        .select(`
          *,
          point:fixed_points(name, address, latitude, longitude),
          proposals:ride_proposals(*),
          driver:drivers(id, moto_brand, moto_model, moto_color, moto_plate, profile:profiles(name, photo_url))
        `)
        .eq('client_id', clientId)
        .eq('point_id', pointId)
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return (data as any) as RideRequest | null;
    },
    enabled: !!clientId && !!pointId,
    refetchInterval: 3000,
    staleTime: 2000,
  });
};

// Optimized: Single query for driver active request
export const useMyActiveRequest = (driverId: string) => {
  return useQuery({
    queryKey: ['my_active_request', driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ride_requests')
        .select(`
          *,
          point:fixed_points(name, address, latitude, longitude)
        `)
        .eq('driver_id', driverId)
        .in('status', ['accepted', 'completed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return (data as any) as RideRequest | null;
    },
    enabled: !!driverId,
    refetchInterval: 3000,
    staleTime: 2000,
  });
};

export const useCreateRideRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { pointId: string; clientId: string; clientName?: string; destinationAddress?: string; clientWhatsapp?: string }) => {
      const { data, error } = await supabase
        .from('ride_requests')
        .insert({
          point_id: vars.pointId,
          client_id: vars.clientId,
          client_name: vars.clientName,
          destination_address: vars.destinationAddress,
          client_whatsapp: vars.clientWhatsapp,
          status: 'pending'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending_requests'] });
    }
  });
};

export const useProposePrice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (vars: { requestId: string; driverId: string; price: number }) => {
      const resp = await fetchApi('propose-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars)
      });
      
      if (!resp.ok) throw new Error('Failed to propose price');
      return resp.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending_requests', variables.driverId] });
    }
  });
};

export const useRespondProposal = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (vars: { proposalId: string; response: 'accepted' | 'rejected' }) => {
      const resp = await fetchApi('respond-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars)
      });
      
      if (!resp.ok) throw new Error('Failed to respond to proposal');
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_active_request'] });
    }
  });
};

export const useAcceptRideRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (vars: { requestId: string; driverId: string }) => {
      const resp = await fetchApi('accept-ride', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars)
      });
      
      if (!resp.ok) throw new Error('Failed to accept ride');
      return resp.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending_requests', variables.driverId] });
      queryClient.invalidateQueries({ queryKey: ['driver_active_request'] });
    }
  });
};

export const useRejectRideRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (vars: { requestId: string; driverId: string }) => {
      const resp = await fetchApi('reject-ride', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars)
      });
      
      if (!resp.ok) throw new Error('Failed to reject ride');
      return resp.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending_requests', variables.driverId] });
    }
  });
};

export const useCompleteRideRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (vars: { requestId: string; driverId: string }) => {
      const { error } = await supabase
        .from('ride_requests')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', vars.requestId);
      
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my_active_request', variables.driverId] });
      queryClient.invalidateQueries({ queryKey: ['pending_requests', variables.driverId] });
    }
  });
};
