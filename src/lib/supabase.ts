import { createClient } from '@supabase/supabase-js'

// These will be your environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database types based on our schema
export interface DatabaseSong {
  id: string
  name: string
  current_key: string
  key_history: string[]
  original_singer: string | null
  youtube_link: string | null
  lyrics: string | null
  verses: string | null
  duration: number
  category: 'worship' | 'praise' | 'hymn' | 'special'
  created_at: string
  updated_at: string
}

export interface DatabaseBandMember {
  id: string
  first_name: string
  last_name: string
  instruments: string[]
  created_at: string
  updated_at: string
}

export interface DatabaseMemberAvailability {
  id: string
  member_id: string
  date: string
  available: boolean
  created_at: string
  updated_at: string
}

export interface DatabaseSundaySchedule {
  id: string
  date: string
  talkback_leader: string | null
  dm1_leader: string | null
  dm2_leader: string | null
  created_at: string
  updated_at: string
}

export interface DatabaseScheduleSong {
  id: string
  schedule_id: string
  song_id: string
  schedule_item_id: string
  assigned_key: string
  singer: string | null
  order_index: number
  created_at: string
  updated_at: string
}

export interface DatabaseScheduleBand {
  id: string
  schedule_id: string
  member_id: string
  schedule_item_id: string
  instrument: string
  order_index: number
  created_at: string
  updated_at: string
}
