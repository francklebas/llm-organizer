import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { getSupabaseClient } from '../supabase/client'
import { createSupabaseAuthClient } from '../supabase/supabaseAuthClient'
import { useAuthStore } from '../stores/authStore'

const supabase = getSupabaseClient()
void useAuthStore.getState().initialize(supabase ? createSupabaseAuthClient(supabase) : null)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
