import 'dotenv/config';
import { supabase } from './src/lib/supabase';

async function run() {
  const { data, error } = await supabase.from('raw_ingredients').insert({
    name: 'Test', 
    price_per_kg: 10, 
    unit: 'kg', 
    category: 'Epicerie', 
    emoji: '🍎'
  });
  console.log('Result:', { data, error });
}

run();
