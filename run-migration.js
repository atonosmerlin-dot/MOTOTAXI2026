import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fcwkghkduyyufhqcfqjf.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseKey) {
  console.error('❌ SUPABASE_KEY environment variable not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🔄 Executando migração: adicionar coluna client_location_address...');
    
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.ride_requests
        ADD COLUMN IF NOT EXISTS client_location_address TEXT;
        
        COMMENT ON COLUMN public.ride_requests.client_location_address IS 'Endereço reverso obtido da localização do cliente via Nominatim';
      `
    });

    if (error) {
      // Se a função RPC não existe, try using the admin API
      console.warn('⚠️  RPC method not available, trying direct query...');
      console.log('❌ Não é possível executar SQL direto via cliente. Use o Supabase Dashboard.');
      console.log('📝 SQL para executar no Supabase Studio:');
      console.log(`
        ALTER TABLE public.ride_requests
        ADD COLUMN IF NOT EXISTS client_location_address TEXT;
        
        COMMENT ON COLUMN public.ride_requests.client_location_address IS 'Endereço reverso obtido da localização do cliente via Nominatim';
      `);
      process.exit(1);
    }
    
    console.log('✅ Migração executada com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao executar migração:', err);
    process.exit(1);
  }
}

runMigration();
