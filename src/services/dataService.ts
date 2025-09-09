// Data service layer for managing songs, band members, and schedules
// This layer provides a consistent API that can use either localStorage or Supabase

import { databaseSongService, databaseMemberService, databaseScheduleService } from './databaseService'

// Environment configuration
const isDatabaseMode = import.meta.env.VITE_DATABASE_TYPE === 'supabase'

export interface Song {
  id: string;
  name: string;
  currentKey: string;
  keyHistory: string[];
  originalSinger: string;
  youtubeLink: string;
  lyrics: string;
  verses: string; // Biblical verses the song talks about
  duration: number;
  category: 'worship' | 'praise' | 'hymn' | 'special';
  order?: number; // Custom order for drag and drop
}

export interface BandMember {
  id: string;
  firstName: string;
  lastName: string;
  instruments: string[];
  availability: {
    date: Date;
    available: boolean;
  }[];
  order?: number; // Custom order for drag and drop
}

export interface SundaySchedule {
  id: string;
  date: Date;
  songs: {
    id: string;
    scheduleItemId: string; // Unique ID for this item in the schedule
    name: string;
    key: string;
    singer: string; // Band member who will sing this song
    order: number;
  }[];
  band: {
    id: string;
    scheduleItemId: string; // Unique ID for this item in the schedule
    name: string;
    instrument: string;
    order: number;
  }[];
  leaders: {
    talkback: string;
    dm1: string;
    dm2: string;
  };
}

// Local storage keys
const SONGS_STORAGE_KEY = 'church_songs';
const MEMBERS_STORAGE_KEY = 'church_members';
const SCHEDULES_STORAGE_KEY = 'church_schedules';

// Default data
const defaultSongs: Song[] = [
  {
    id: '1',
    name: 'Sublime Gracia',
    currentKey: 'G',
    keyHistory: ['G', 'A', 'F'],
    originalSinger: 'John Newton',
    youtubeLink: 'https://www.youtube.com/watch?v=X6Mtpk4jeVA',
    lyrics: 'Sublime gracia del Señor, que a un infeliz salvó...',
    verses: '',
    duration: 240,
    category: 'hymn'
  },
  {
    id: '2',
    name: 'Cuán Grande es Nuestro Dios',
    currentKey: 'C',
    keyHistory: ['C', 'D'],
    originalSinger: 'Chris Tomlin',
    youtubeLink: 'https://www.youtube.com/watch?v=KBD18rsVJHk',
    lyrics: 'El esplendor del Rey, vestido en majestad...',
    verses: '',
    duration: 270,
    category: 'worship'
  },
  {
    id: '3',
    name: 'Hosanna',
    currentKey: 'E',
    keyHistory: ['E', 'D'],
    originalSinger: 'Hillsong',
    youtubeLink: 'https://www.youtube.com/watch?v=NoM0AT8fBvs',
    lyrics: 'Veo al Rey de gloria viniendo en las nubes con fuego...',
    verses: '',
    duration: 330,
    category: 'praise'
  }
];

const defaultMembers: BandMember[] = [
  {
    id: '1',
    firstName: 'Juan',
    lastName: 'Pérez',
    instruments: ['VOX1', 'EG1'],
    availability: []
  },
  {
    id: '2',
    firstName: 'María',
    lastName: 'González',
    instruments: ['VOX2', 'KEYS'],
    availability: []
  },
  {
    id: '3',
    firstName: 'Carlos',
    lastName: 'López',
    instruments: ['DRUMS'],
    availability: []
  },
  {
    id: '4',
    firstName: 'Ana',
    lastName: 'Martínez',
    instruments: ['VOX3', 'AG'],
    availability: []
  },
  {
    id: '5',
    firstName: 'Luis',
    lastName: 'Rodríguez',
    instruments: ['BASS'],
    availability: []
  }
];

// Local storage implementation
const localSongService = {
  getAll(): Song[] {
    const stored = localStorage.getItem(SONGS_STORAGE_KEY);
    const songs = stored ? JSON.parse(stored) : defaultSongs;
    // Sort by order if available, otherwise by name
    return songs.sort((a: Song, b: Song) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return a.name.localeCompare(b.name);
    });
  },

  save(songs: Song[]): void {
    localStorage.setItem(SONGS_STORAGE_KEY, JSON.stringify(songs));
  },

  create(song: Omit<Song, 'id'>): Song {
    const songs = this.getAll();
    const newSong: Song = {
      ...song,
      id: Date.now().toString()
    };
    songs.push(newSong);
    this.save(songs);
    return newSong;
  },

  update(id: string, updates: Partial<Song>): Song | null {
    const songs = this.getAll();
    const index = songs.findIndex(s => s.id === id);
    if (index === -1) return null;
    
    songs[index] = { ...songs[index], ...updates };
    this.save(songs);
    return songs[index];
  },

  delete(id: string): boolean {
    const songs = this.getAll();
    const filtered = songs.filter(s => s.id !== id);
    if (filtered.length === songs.length) return false;
    
    this.save(filtered);
    return true;
  },

  reorder(songIds: string[]): Song[] {
    const songs = this.getAll();
    const reorderedSongs: Song[] = [];
    
    songIds.forEach((id, index) => {
      const song = songs.find(s => s.id === id);
      if (song) {
        reorderedSongs.push({ ...song, order: index });
      }
    });
    
    // Add any songs that weren't in the reorder list at the end
    const reorderedIds = new Set(songIds);
    const remainingSongs = songs.filter(s => !reorderedIds.has(s.id))
      .map((song, index) => ({ ...song, order: reorderedSongs.length + index }));
    
    const allSongs = [...reorderedSongs, ...remainingSongs];
    this.save(allSongs);
    return allSongs;
  }
};

// Song service that switches between localStorage and database
export const songService = {
  async getAll(): Promise<Song[]> {
    if (isDatabaseMode) {
      return await databaseSongService.getAll();
    }
    return localSongService.getAll();
  },

  async create(song: Omit<Song, 'id'>): Promise<Song | null> {
    if (isDatabaseMode) {
      return await databaseSongService.create(song);
    }
    return localSongService.create(song);
  },

  async update(id: string, updates: Partial<Song>): Promise<Song | null> {
    if (isDatabaseMode) {
      return await databaseSongService.update(id, updates);
    }
    return localSongService.update(id, updates);
  },

  async delete(id: string): Promise<boolean> {
    if (isDatabaseMode) {
      await databaseSongService.delete(id);
      return true;
    }
    return localSongService.delete(id);
  },

  async reorder(songIds: string[]): Promise<Song[]> {
    if (isDatabaseMode) {
      return await databaseSongService.reorder(songIds);
    }
    return localSongService.reorder(songIds);
  }
};

// Local member service implementation
const localMemberService = {
  getAll(): BandMember[] {
    const stored = localStorage.getItem(MEMBERS_STORAGE_KEY);
    let members = defaultMembers;
    if (stored) {
      const parsedMembers = JSON.parse(stored);
      // Convert date strings back to Date objects
      members = parsedMembers.map((member: BandMember & { availability: Array<{ date: string; available: boolean }> }) => ({
        ...member,
        availability: member.availability.map((a: { date: string; available: boolean }) => ({
          ...a,
          date: new Date(a.date)
        }))
      }));
    }
    // Sort by order if available, otherwise by name
    return members.sort((a: BandMember, b: BandMember) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return a.firstName.localeCompare(b.firstName);
    });
  },

  save(members: BandMember[]): void {
    localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(members));
  },

  create(member: Omit<BandMember, 'id'>): BandMember {
    const members = this.getAll();
    const newMember: BandMember = {
      ...member,
      id: Date.now().toString()
    };
    members.push(newMember);
    this.save(members);
    return newMember;
  },

  update(id: string, updates: Partial<BandMember>): BandMember | null {
    const members = this.getAll();
    const index = members.findIndex(m => m.id === id);
    if (index === -1) return null;
    
    members[index] = { ...members[index], ...updates };
    this.save(members);
    return members[index];
  },

  delete(id: string): boolean {
    const members = this.getAll();
    const filtered = members.filter(m => m.id !== id);
    if (filtered.length === members.length) return false;
    
    this.save(filtered);
    return true;
  },

  reorder(memberIds: string[]): BandMember[] {
    const members = this.getAll();
    const reorderedMembers: BandMember[] = [];
    
    memberIds.forEach((id, index) => {
      const member = members.find(m => m.id === id);
      if (member) {
        reorderedMembers.push({ ...member, order: index });
      }
    });
    
    // Add any members that weren't in the reorder list at the end
    const reorderedIds = new Set(memberIds);
    const remainingMembers = members.filter(m => !reorderedIds.has(m.id))
      .map((member, index) => ({ ...member, order: reorderedMembers.length + index }));
    
    const allMembers = [...reorderedMembers, ...remainingMembers];
    this.save(allMembers);
    return allMembers;
  }
};

// Band member service that switches between localStorage and database
export const memberService = {
  async getAll(): Promise<BandMember[]> {
    if (isDatabaseMode) {
      return await databaseMemberService.getAll();
    }
    return localMemberService.getAll();
  },

  async create(member: Omit<BandMember, 'id'>): Promise<BandMember | null> {
    if (isDatabaseMode) {
      return await databaseMemberService.create(member);
    }
    return localMemberService.create(member);
  },

  async update(id: string, updates: Partial<BandMember>): Promise<BandMember | null> {
    if (isDatabaseMode) {
      return await databaseMemberService.update(id, updates);
    }
    return localMemberService.update(id, updates);
  },

  async delete(id: string): Promise<boolean> {
    if (isDatabaseMode) {
      await databaseMemberService.delete(id);
      return true;
    }
    return localMemberService.delete(id);
  },

  async updateAvailability(memberId: string, date: Date, available: boolean): Promise<void> {
    if (isDatabaseMode) {
      await databaseMemberService.updateAvailability(memberId, date, available);
    } else {
      // For local storage, we need to update the whole member
      const member = localMemberService.getAll().find(m => m.id === memberId);
      if (member) {
        const existingIndex = member.availability.findIndex(avail => 
          avail.date.toDateString() === date.toDateString()
        );

        const newAvailability = [...member.availability];
        
        if (existingIndex >= 0) {
          newAvailability[existingIndex] = { date, available };
        } else {
          newAvailability.push({ date, available });
        }

        localMemberService.update(memberId, { availability: newAvailability });
      }
    }
  },

  async reorder(memberIds: string[]): Promise<BandMember[]> {
    if (isDatabaseMode) {
      return await databaseMemberService.reorder(memberIds);
    }
    return localMemberService.reorder(memberIds);
  }
};

// Local schedule service implementation
const localScheduleService = {
  getAll(): SundaySchedule[] {
    const stored = localStorage.getItem(SCHEDULES_STORAGE_KEY);
    if (stored) {
      const schedules = JSON.parse(stored);
      // Convert date strings back to Date objects
      return schedules.map((schedule: SundaySchedule & { date: string }) => ({
        ...schedule,
        date: new Date(schedule.date)
      }));
    }
    return [];
  },

  save(schedules: SundaySchedule[]): void {
    localStorage.setItem(SCHEDULES_STORAGE_KEY, JSON.stringify(schedules));
  },

  create(schedule: Omit<SundaySchedule, 'id'>): SundaySchedule {
    const schedules = this.getAll();
    const newSchedule: SundaySchedule = {
      ...schedule,
      id: Date.now().toString()
    };
    schedules.push(newSchedule);
    this.save(schedules);
    return newSchedule;
  },

  update(id: string, updates: Partial<SundaySchedule>): SundaySchedule | null {
    const schedules = this.getAll();
    const index = schedules.findIndex(s => s.id === id);
    if (index === -1) return null;
    
    schedules[index] = { ...schedules[index], ...updates };
    this.save(schedules);
    return schedules[index];
  },

  delete(id: string): boolean {
    const schedules = this.getAll();
    const filtered = schedules.filter(s => s.id !== id);
    if (filtered.length === schedules.length) return false;
    
    this.save(filtered);
    return true;
  }
};

// Schedule service that switches between localStorage and database
export const scheduleService = {
  async getAll(): Promise<SundaySchedule[]> {
    if (isDatabaseMode) {
      return await databaseScheduleService.getAll();
    }
    return localScheduleService.getAll();
  },

  async create(schedule: Omit<SundaySchedule, 'id'>): Promise<SundaySchedule | null> {
    if (isDatabaseMode) {
      return await databaseScheduleService.create(schedule);
    }
    return localScheduleService.create(schedule);
  },

  async update(id: string, updates: Partial<SundaySchedule>): Promise<SundaySchedule | null> {
    if (isDatabaseMode) {
      return await databaseScheduleService.update(id, updates);
    }
    return localScheduleService.update(id, updates);
  },

  async delete(id: string): Promise<boolean> {
    if (isDatabaseMode) {
      await databaseScheduleService.delete(id);
      return true;
    }
    return localScheduleService.delete(id);
  }
};
