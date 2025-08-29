// Database service layer for Supabase integration
// This service maintains the same interface as dataService but connects to Supabase

import { supabase } from '../lib/supabase'
import { Song, BandMember, SundaySchedule } from './dataService'

// ========================================
// SONG SERVICE
// ========================================
export const databaseSongService = {
  async getAll(): Promise<Song[]> {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching songs:', error)
      throw error
    }

    return (data || []).map(song => ({
      id: song.id,
      name: song.name,
      currentKey: song.current_key,
      keyHistory: song.key_history || [],
      originalSinger: song.original_singer || '',
      youtubeLink: song.youtube_link || '',
      lyrics: song.lyrics || '',
      verses: song.verses || '',
      duration: song.duration,
      category: song.category
    }))
  },

  async create(song: Omit<Song, 'id'>): Promise<Song> {
    const { data, error } = await supabase
      .from('songs')
      .insert({
        name: song.name,
        current_key: song.currentKey,
        key_history: song.keyHistory,
        original_singer: song.originalSinger,
        youtube_link: song.youtubeLink,
        lyrics: song.lyrics,
        verses: song.verses,
        duration: song.duration,
        category: song.category
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating song:', error)
      throw error
    }

    return {
      id: data.id,
      name: data.name,
      currentKey: data.current_key,
      keyHistory: data.key_history || [],
      originalSinger: data.original_singer || '',
      youtubeLink: data.youtube_link || '',
      lyrics: data.lyrics || '',
      verses: data.verses || '',
      duration: data.duration,
      category: data.category
    }
  },

  async update(id: string, updates: Partial<Song>): Promise<Song | null> {
    const updateData: any = {}
    
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.currentKey !== undefined) updateData.current_key = updates.currentKey
    if (updates.keyHistory !== undefined) updateData.key_history = updates.keyHistory
    if (updates.originalSinger !== undefined) updateData.original_singer = updates.originalSinger
    if (updates.youtubeLink !== undefined) updateData.youtube_link = updates.youtubeLink
    if (updates.lyrics !== undefined) updateData.lyrics = updates.lyrics
    if (updates.verses !== undefined) updateData.verses = updates.verses
    if (updates.duration !== undefined) updateData.duration = updates.duration
    if (updates.category !== undefined) updateData.category = updates.category

    const { data, error } = await supabase
      .from('songs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating song:', error)
      throw error
    }

    return {
      id: data.id,
      name: data.name,
      currentKey: data.current_key,
      keyHistory: data.key_history || [],
      originalSinger: data.original_singer || '',
      youtubeLink: data.youtube_link || '',
      lyrics: data.lyrics || '',
      verses: data.verses || '',
      duration: data.duration,
      category: data.category
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('songs')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting song:', error)
      throw error
    }
  }
}

// ========================================
// BAND MEMBER SERVICE
// ========================================
export const databaseMemberService = {
  async getAll(): Promise<BandMember[]> {
    // Get members with their availability
    const { data: members, error: memberError } = await supabase
      .from('band_members')
      .select(`
        *,
        member_availability (
          date,
          available
        )
      `)
      .order('first_name')

    if (memberError) {
      console.error('Error fetching members:', memberError)
      throw memberError
    }

    return (members || []).map(member => ({
      id: member.id,
      firstName: member.first_name,
      lastName: member.last_name,
      instruments: member.instruments || [],
      availability: (member.member_availability || []).map((avail: any) => ({
        date: new Date(avail.date),
        available: avail.available
      }))
    }))
  },

  async create(member: Omit<BandMember, 'id'>): Promise<BandMember> {
    const { data, error } = await supabase
      .from('band_members')
      .insert({
        first_name: member.firstName,
        last_name: member.lastName,
        instruments: member.instruments
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating member:', error)
      throw error
    }

    // Create availability records if provided
    if (member.availability && member.availability.length > 0) {
      const availabilityData = member.availability.map(avail => ({
        member_id: data.id,
        date: avail.date.toISOString().split('T')[0],
        available: avail.available
      }))

      const { error: availError } = await supabase
        .from('member_availability')
        .insert(availabilityData)

      if (availError) {
        console.error('Error creating member availability:', availError)
      }
    }

    return {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      instruments: data.instruments || [],
      availability: member.availability || []
    }
  },

  async update(id: string, updates: Partial<BandMember>): Promise<BandMember | null> {
    const updateData: any = {}
    
    if (updates.firstName !== undefined) updateData.first_name = updates.firstName
    if (updates.lastName !== undefined) updateData.last_name = updates.lastName
    if (updates.instruments !== undefined) updateData.instruments = updates.instruments

    const { data, error } = await supabase
      .from('band_members')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating member:', error)
      throw error
    }

    // Update availability if provided
    if (updates.availability) {
      // Delete existing availability
      await supabase
        .from('member_availability')
        .delete()
        .eq('member_id', id)

      // Insert new availability
      if (updates.availability.length > 0) {
        const availabilityData = updates.availability.map(avail => ({
          member_id: id,
          date: avail.date.toISOString().split('T')[0],
          available: avail.available
        }))

        await supabase
          .from('member_availability')
          .insert(availabilityData)
      }
    }

    return {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      instruments: data.instruments || [],
      availability: updates.availability || []
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('band_members')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting member:', error)
      throw error
    }
  }
}

// ========================================
// SCHEDULE SERVICE
// ========================================
export const databaseScheduleService = {
  async getAll(): Promise<SundaySchedule[]> {
    // Get schedules with their songs and band members
    const { data: schedules, error: scheduleError } = await supabase
      .from('sunday_schedules')
      .select(`
        *,
        schedule_songs (
          *,
          songs (*)
        ),
        schedule_band (
          *,
          band_members (*)
        )
      `)
      .order('date')

    if (scheduleError) {
      console.error('Error fetching schedules:', scheduleError)
      throw scheduleError
    }

    return (schedules || []).map(schedule => ({
      id: schedule.id,
      date: new Date(schedule.date),
      songs: (schedule.schedule_songs || [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((scheduleSong: any) => ({
          id: scheduleSong.songs.id,
          scheduleItemId: scheduleSong.schedule_item_id,
          name: scheduleSong.songs.name,
          key: scheduleSong.assigned_key,
          singer: scheduleSong.singer || '',
          order: scheduleSong.order_index
        })),
      band: (schedule.schedule_band || [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((scheduleBand: any) => ({
          id: scheduleBand.band_members.id,
          scheduleItemId: scheduleBand.schedule_item_id,
          name: `${scheduleBand.band_members.first_name} ${scheduleBand.band_members.last_name}`,
          instrument: scheduleBand.instrument,
          order: scheduleBand.order_index
        })),
      leaders: {
        talkback: schedule.talkback_leader || '',
        dm1: schedule.dm1_leader || '',
        dm2: schedule.dm2_leader || ''
      }
    }))
  },

  async create(schedule: Omit<SundaySchedule, 'id'>): Promise<SundaySchedule> {
    const { data, error } = await supabase
      .from('sunday_schedules')
      .insert({
        date: schedule.date.toISOString().split('T')[0],
        talkback_leader: schedule.leaders.talkback,
        dm1_leader: schedule.leaders.dm1,
        dm2_leader: schedule.leaders.dm2
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating schedule:', error)
      throw error
    }

    return {
      id: data.id,
      date: new Date(data.date),
      songs: [],
      band: [],
      leaders: {
        talkback: data.talkback_leader || '',
        dm1: data.dm1_leader || '',
        dm2: data.dm2_leader || ''
      }
    }
  },

  async update(id: string, updates: Partial<SundaySchedule>): Promise<SundaySchedule | null> {
    // Update basic schedule info
    const updateData: any = {}
    
    if (updates.date !== undefined) {
      updateData.date = updates.date.toISOString().split('T')[0]
    }
    if (updates.leaders !== undefined) {
      if (updates.leaders.talkback !== undefined) updateData.talkback_leader = updates.leaders.talkback
      if (updates.leaders.dm1 !== undefined) updateData.dm1_leader = updates.leaders.dm1
      if (updates.leaders.dm2 !== undefined) updateData.dm2_leader = updates.leaders.dm2
    }

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from('sunday_schedules')
        .update(updateData)
        .eq('id', id)

      if (error) {
        console.error('Error updating schedule:', error)
        throw error
      }
    }

    // Update songs if provided
    if (updates.songs !== undefined) {
      // Delete existing songs
      await supabase
        .from('schedule_songs')
        .delete()
        .eq('schedule_id', id)

      // Insert new songs
      if (updates.songs.length > 0) {
        const songsData = updates.songs.map(song => ({
          schedule_id: id,
          song_id: song.id,
          schedule_item_id: song.scheduleItemId,
          assigned_key: song.key,
          singer: song.singer,
          order_index: song.order
        }))

        const { error: songsError } = await supabase
          .from('schedule_songs')
          .insert(songsData)

        if (songsError) {
          console.error('Error updating schedule songs:', songsError)
          throw songsError
        }
      }
    }

    // Update band if provided
    if (updates.band !== undefined) {
      // Delete existing band
      await supabase
        .from('schedule_band')
        .delete()
        .eq('schedule_id', id)

      // Insert new band
      if (updates.band.length > 0) {
        const bandData = updates.band.map(member => ({
          schedule_id: id,
          member_id: member.id,
          schedule_item_id: member.scheduleItemId,
          instrument: member.instrument,
          order_index: member.order
        }))

        const { error: bandError } = await supabase
          .from('schedule_band')
          .insert(bandData)

        if (bandError) {
          console.error('Error updating schedule band:', bandError)
          throw bandError
        }
      }
    }

    // Return updated schedule
    return await this.getById(id)
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('sunday_schedules')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting schedule:', error)
      throw error
    }
  },

  async getById(id: string): Promise<SundaySchedule | null> {
    const schedules = await this.getAll()
    return schedules.find(s => s.id === id) || null
  }
}