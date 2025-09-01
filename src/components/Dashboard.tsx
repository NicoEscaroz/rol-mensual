import React, { useState } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { ScheduleTable } from './ScheduleTable';
import { SongBank } from './SongBank';
import { BandMembers } from './BandMembers';

import { MenuIcon, XIcon, CalendarIcon, MusicIcon, UsersIcon } from 'lucide-react';
import { songService, memberService, scheduleService } from '../services/dataService';
type Tab = 'schedule' | 'songs' | 'members';
export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('schedule');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  const selectTab = (tab: Tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    
    if (!destination) return;

    // Handle song drops to schedule
    if (draggableId.startsWith('song-') && destination.droppableId.includes('schedule-') && destination.droppableId.includes('-songs')) {
      const songId = draggableId.replace('song-', '');
      const scheduleId = destination.droppableId.replace('schedule-', '').replace('-songs', '');
      
      try {
        const [songs, schedules] = await Promise.all([
          songService.getAll(),
          scheduleService.getAll()
        ]);
        
        const song = songs.find(s => s.id === songId);
        const schedule = schedules.find(s => s.id === scheduleId);
        
        if (song && schedule) {
          const newSong = {
            id: song.id,
            name: song.name,
            key: song.currentKey,
            singer: song.originalSinger
          };
          
          await scheduleService.update(scheduleId, {
            songs: [...schedule.songs, newSong]
          });
        }
      } catch (error) {
        console.error('Error handling song drop:', error);
      }
    }
    
    // Handle member drops to schedule
    if (draggableId.startsWith('member-') && destination.droppableId.includes('schedule-') && destination.droppableId.includes('-band')) {
      const memberId = draggableId.replace('member-', '');
      const scheduleId = destination.droppableId.replace('schedule-', '').replace('-band', '');
      
      try {
        const [members, schedules] = await Promise.all([
          memberService.getAll(),
          scheduleService.getAll()
        ]);
        
        const member = members.find(m => m.id === memberId);
        const schedule = schedules.find(s => s.id === scheduleId);
        
        if (member && schedule && member.instruments.length > 0) {
          // For now, use the first instrument. In a more advanced version, show modal
          const newBandMember = {
            id: member.id,
            name: `${member.firstName} ${member.lastName}`,
            instrument: member.instruments[0]
          };
          
          await scheduleService.update(scheduleId, {
            band: [...schedule.band, newBandMember]
          });
        }
      } catch (error) {
        console.error('Error handling member drop:', error);
      }
    }
  };
  return <div className="w-full">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          {activeTab === 'schedule' && 'Programa'}
          {activeTab === 'songs' && 'Canciones'}
          {activeTab === 'members' && 'Miembros'}
        </h2>
        <button onClick={toggleMobileMenu} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800">
          {mobileMenuOpen ? <XIcon size={24} /> : <MenuIcon size={24} />}
        </button>
      </div>
      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && <div className="md:hidden fixed inset-0 z-50 bg-white dark:bg-gray-900">
          <div className="p-4 flex justify-end">
            <button onClick={toggleMobileMenu} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800">
              <XIcon size={24} />
            </button>
          </div>
          <nav className="p-4">
            <ul className="space-y-4">
              <li>
                <button onClick={() => selectTab('schedule')} className={`flex items-center w-full p-3 rounded-md ${activeTab === 'schedule' ? 'bg-gray-200 dark:bg-gray-800' : ''}`}>
                  <CalendarIcon className="mr-3" size={20} />
                  Programa
                </button>
              </li>
              <li>
                <button onClick={() => selectTab('songs')} className={`flex items-center w-full p-3 rounded-md ${activeTab === 'songs' ? 'bg-gray-200 dark:bg-gray-800' : ''}`}>
                  <MusicIcon className="mr-3" size={20} />
                  Canciones
                </button>
              </li>
              <li>
                <button onClick={() => selectTab('members')} className={`flex items-center w-full p-3 rounded-md ${activeTab === 'members' ? 'bg-gray-200 dark:bg-gray-800' : ''}`}>
                  <UsersIcon className="mr-3" size={20} />
                  Miembros
                </button>
              </li>

            </ul>
          </nav>
        </div>}
      {/* Desktop Layout */}
      <div className="hidden md:flex space-x-4 mb-6">
        <button onClick={() => setActiveTab('schedule')} className={`px-4 py-2 rounded-md flex items-center ${activeTab === 'schedule' ? 'bg-gray-200 dark:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
          <CalendarIcon className="mr-2" size={16} />
          Programa
        </button>
        <button onClick={() => setActiveTab('songs')} className={`px-4 py-2 rounded-md flex items-center ${activeTab === 'songs' ? 'bg-gray-200 dark:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
          <MusicIcon className="mr-2" size={16} />
          Canciones
        </button>
        <button onClick={() => setActiveTab('members')} className={`px-4 py-2 rounded-md flex items-center ${activeTab === 'members' ? 'bg-gray-200 dark:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
          <UsersIcon className="mr-2" size={16} />
          Miembros
        </button>

      </div>
      {/* Content */}
      <div className="mt-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          {activeTab === 'schedule' && <ScheduleTable />}
          {activeTab === 'songs' && <SongBank />}
          {activeTab === 'members' && <BandMembers />}
        </DragDropContext>
      </div>
    </div>;
};