import React, { useEffect, useState } from 'react';
import { DownloadIcon, PlusIcon, TrashIcon, SearchIcon, FilterIcon, XIcon, MinusIcon } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { generateSundays, groupSchedulesByMonth } from '../utils/dateUtils';
import { SundaySchedule, scheduleService, Song, BandMember, songService, memberService } from '../services/dataService';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { useTheme } from '../context/ThemeContext';

interface InstrumentSelectionModal {
  show: boolean;
  member: BandMember | null;
  scheduleId: string;
}

interface AddItemModal {
  show: boolean;
  type: 'song' | 'member' | null;
  scheduleId: string;
}

export const ScheduleTable: React.FC = () => {
  const { theme } = useTheme();
  const [schedules, setSchedules] = useState<SundaySchedule[]>([]);
  const [instrumentModal, setInstrumentModal] = useState<InstrumentSelectionModal>({
    show: false,
    member: null,
    scheduleId: ''
  });
  const [addItemModal, setAddItemModal] = useState<AddItemModal>({
    show: false,
    type: null,
    scheduleId: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedInstrument, setSelectedInstrument] = useState<string>('');
  const [availableSongs, setAvailableSongs] = useState<Song[]>([]);
  const [availableMembers, setAvailableMembers] = useState<BandMember[]>([]);
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    schedule: SundaySchedule | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    schedule: null,
    isLoading: false
  });
  useEffect(() => {
    const loadData = async () => {
      try {
        let loadedSchedules = await scheduleService.getAll();
        
        // If no schedules exist, create initial ones
        if (loadedSchedules.length === 0) {
    const sundays = generateSundays();
    const initialSchedules = sundays.map(date => ({
      id: date.toISOString(),
      date,
      songs: [],
      band: [],
      leaders: {
        talkback: '',
        dm1: '',
        dm2: ''
      }
    }));
          
          for (const schedule of initialSchedules) {
            await scheduleService.create(schedule);
          }
          loadedSchedules = await scheduleService.getAll();
        }
        
        setSchedules(loadedSchedules);
        
        // Load available songs and members for modals
        const [songs, members] = await Promise.all([
          songService.getAll(),
          memberService.getAll()
        ]);
        setAvailableSongs(songs);
        setAvailableMembers(members);
      } catch (error) {
        console.error('Error loading data:', error);
        // Set empty arrays as fallback
        setAvailableSongs([]);
        setAvailableMembers([]);
        setSchedules([]);
      }
    };

    loadData();
  }, []);

  // Filter songs based on search and category
  const filteredSongs = availableSongs.filter(song => {
    const matchesSearch = song.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         song.originalSinger.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? song.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  // Filter members based on search, instrument, and availability for the specific schedule date
  const getFilteredMembersForSchedule = (scheduleId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return [];
    
    return availableMembers.filter(member => {
      const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
      const matchesSearch = fullName.includes(searchTerm.toLowerCase());
      const matchesInstrument = selectedInstrument ? 
        member.instruments.some(inst => inst.toLowerCase().includes(selectedInstrument.toLowerCase())) : true;
      
      // Check if member is available for this specific date
      const scheduleDate = new Date(schedule.date);
      const memberAvailability = member.availability.find(avail => {
        const availDate = new Date(avail.date).toISOString().split('T')[0];
        const targetDate = scheduleDate.toISOString().split('T')[0];
        return availDate === targetDate;
      });
      
      // If no availability record exists, default to NOT available (false)
      // Only show members who have explicitly set their availability to true
      const isAvailable = memberAvailability ? memberAvailability.available === true : false;
      
      return matchesSearch && matchesInstrument && isAvailable;
    });
  };

  // Filter members based on search and instrument (for general use)
  const filteredMembers = availableMembers.filter(member => {
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase());
    const matchesInstrument = selectedInstrument ? 
      member.instruments.some(inst => inst.toLowerCase().includes(selectedInstrument.toLowerCase())) : true;
    return matchesSearch && matchesInstrument;
  });

  const handleDrop = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    
    if (!destination) return;

    // Handle reordering within schedule lists
    if (draggableId.startsWith('schedule-song-') || draggableId.startsWith('schedule-member-')) {
      const sourceScheduleId = source.droppableId.replace('schedule-', '').replace('-songs', '').replace('-band', '');
      const destScheduleId = destination.droppableId.replace('schedule-', '').replace('-songs', '').replace('-band', '');
      
      // Only handle reordering within the same schedule for now
      if (sourceScheduleId !== destScheduleId) return;
      
      const schedule = schedules.find(s => s.id === sourceScheduleId);
      if (!schedule) return;

      if (draggableId.startsWith('schedule-song-')) {
        // Reorder songs within schedule
        const newSongs = Array.from(schedule.songs);
        const [reorderedSong] = newSongs.splice(source.index, 1);
        newSongs.splice(destination.index, 0, reorderedSong);
        
        // Update order numbers
        const updatedSongs = newSongs.map((song, index) => ({
          ...song,
          order: index + 1
        }));

        try {
          await scheduleService.update(sourceScheduleId, {
            songs: updatedSongs
          });
          
          const updatedSchedules = await scheduleService.getAll();
          setSchedules(updatedSchedules);
        } catch (error) {
          console.error('Error reordering songs:', error);
        }
      } else if (draggableId.startsWith('schedule-member-')) {
        // Reorder band members within schedule
        const newBand = Array.from(schedule.band);
        const [reorderedMember] = newBand.splice(source.index, 1);
        newBand.splice(destination.index, 0, reorderedMember);
        
        // Update order numbers
        const updatedBand = newBand.map((member, index) => ({
          ...member,
          order: index + 1
        }));

        try {
          await scheduleService.update(sourceScheduleId, {
            band: updatedBand
          });
          
          const updatedSchedules = await scheduleService.getAll();
          setSchedules(updatedSchedules);
        } catch (error) {
          console.error('Error reordering band members:', error);
        }
      }
      return;
    }
    
    // Handle adding new items to schedule
    const scheduleId = destination.droppableId.replace('schedule-', '').replace('-songs', '').replace('-band', '');
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    if (draggableId.startsWith('song-')) {
      // Handle song drop
      const songId = draggableId.replace('song-', '');
      const song = availableSongs.find(s => s.id === songId);
      if (!song) return;

      const newSong = {
        id: songId,
        scheduleItemId: Date.now().toString(),
        name: song.name,
        key: song.currentKey,
        singer: '',
        order: schedule.songs.length + 1
      };
      
      try {
        await scheduleService.update(scheduleId, {
          songs: [...schedule.songs, newSong]
        });
        
        const updatedSchedules = await scheduleService.getAll();
        setSchedules(updatedSchedules);
      } catch (error) {
        console.error('Error updating schedule:', error);
      }
    } else if (draggableId.startsWith('member-')) {
      // Handle member drop - check availability first, then show instrument selection modal
      const memberId = draggableId.replace('member-', '');
      const member = availableMembers.find(m => m.id === memberId);
      
      if (member) {
        // Check if member is available for this specific date
        const schedule = schedules.find(s => s.id === scheduleId);
        if (schedule) {
          const scheduleDate = new Date(schedule.date);
          const memberAvailability = member.availability.find(avail => {
            const availDate = new Date(avail.date).toISOString().split('T')[0];
            const targetDate = scheduleDate.toISOString().split('T')[0];
            return availDate === targetDate;
          });
          
          // If no availability record exists, default to NOT available (false)
          const isAvailable = memberAvailability ? memberAvailability.available === true : false;
          
          if (!isAvailable) {
            alert(`${member.firstName} ${member.lastName} no está disponible para esta fecha`);
            return;
          }
        }
      }
      
      setInstrumentModal({
        show: true,
        member: member || null,
        scheduleId
      });
    }
  };

  const addMemberToSchedule = async (scheduleId: string, member: BandMember, instrument: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    const newBandMember = {
      id: member.id,
      scheduleItemId: Date.now().toString(),
      name: member.firstName, // Solo el nombre, sin apellido en el programa dominical
      instrument,
      order: schedule.band.length + 1
    };

    try {
      await scheduleService.update(scheduleId, {
        band: [...schedule.band, newBandMember]
      });

      const updatedSchedules = await scheduleService.getAll();
      setSchedules(updatedSchedules);
    } catch (error) {
      console.error('Error updating schedule:', error);
    }

    setInstrumentModal({ show: false, member: null, scheduleId: '' });
  };

  const updateLeaders = async (scheduleId: string, field: keyof SundaySchedule['leaders'], value: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    try {
      await scheduleService.update(scheduleId, {
        leaders: {
          ...schedule.leaders,
          [field]: value
        }
      });

      const updatedSchedules = await scheduleService.getAll();
      setSchedules(updatedSchedules);
    } catch (error) {
      console.error('Error updating schedule:', error);
    }
  };

  const updateSongSinger = async (scheduleId: string, songScheduleItemId: string, singer: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    const updatedSongs = schedule.songs.map(song => 
      song.scheduleItemId === songScheduleItemId 
        ? { ...song, singer }
        : song
    );

    try {
      await scheduleService.update(scheduleId, {
        songs: updatedSongs
      });

      const updatedSchedules = await scheduleService.getAll();
      setSchedules(updatedSchedules);
    } catch (error) {
      console.error('Error updating song singer:', error);
    }
  };

  const removeSongFromSchedule = async (scheduleId: string, songScheduleItemId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    const updatedSongs = schedule.songs
      .filter(song => song.scheduleItemId !== songScheduleItemId)
      .map((song, index) => ({ ...song, order: index + 1 })); // Reorder songs

    try {
      await scheduleService.update(scheduleId, {
        songs: updatedSongs
      });

      const updatedSchedules = await scheduleService.getAll();
      setSchedules(updatedSchedules);
    } catch (error) {
      console.error('Error removing song from schedule:', error);
    }
  };

  const removeMemberFromSchedule = async (scheduleId: string, memberScheduleItemId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    const updatedBand = schedule.band
      .filter(member => member.scheduleItemId !== memberScheduleItemId)
      .map((member, index) => ({ ...member, order: index + 1 })); // Reorder members

    try {
      await scheduleService.update(scheduleId, {
        band: updatedBand
      });

      const updatedSchedules = await scheduleService.getAll();
      setSchedules(updatedSchedules);
    } catch (error) {
      console.error('Error removing member from schedule:', error);
    }
  };

  const openDeleteModal = (schedule: SundaySchedule) => {
    setDeleteModal({ isOpen: true, schedule, isLoading: false });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, schedule: null, isLoading: false });
  };

  const confirmDeleteSchedule = async () => {
    if (!deleteModal.schedule) return;

    setDeleteModal(prev => ({ ...prev, isLoading: true }));

    try {
      await scheduleService.delete(deleteModal.schedule.id);
      const updatedSchedules = await scheduleService.getAll();
      setSchedules(updatedSchedules);
      closeDeleteModal();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      setDeleteModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const addNewSunday = async () => {
    const lastSchedule = schedules[schedules.length - 1];
    const newDate = new Date(lastSchedule?.date || new Date());
    newDate.setDate(newDate.getDate() + 7); // Add 7 days
    
    const newSchedule = {
      date: newDate,
      songs: [],
      band: [],
      leaders: {
        talkback: '',
        dm1: '',
        dm2: ''
      }
    };
    
    try {
      await scheduleService.create(newSchedule);
      const updatedSchedules = await scheduleService.getAll();
      setSchedules(updatedSchedules);
    } catch (error) {
      console.error('Error creating schedule:', error);
    }
  };

  const openAddModal = (type: 'song' | 'member', scheduleId: string) => {
    setAddItemModal({ show: true, type, scheduleId });
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedInstrument('');
  };

  const closeAddModal = () => {
    setAddItemModal({ show: false, type: null, scheduleId: '' });
  };

  const addSongToSchedule = async (song: Song) => {
    const schedule = schedules.find(s => s.id === addItemModal.scheduleId);
    if (!schedule) return;

    // Check if song is already in the schedule
    const songExists = schedule.songs.some(s => s.id === song.id);
    if (songExists) {
      alert('Esta canción ya está en el programa');
      return;
    }

    const newSong = {
      id: song.id,
      scheduleItemId: Date.now().toString(),
      name: song.name,
      key: song.currentKey,
      singer: '', // Will be assigned to a band member
      order: schedule.songs.length + 1
    };

    try {
      await scheduleService.update(addItemModal.scheduleId, {
        songs: [...schedule.songs, newSong]
      });

      const updatedSchedules = await scheduleService.getAll();
      setSchedules(updatedSchedules);
    } catch (error) {
      console.error('Error adding song to schedule:', error);
    }

    // Don't close modal - allow adding multiple songs
  };

  const addMemberWithInstrument = async (member: BandMember, instrument: string) => {
    const schedule = schedules.find(s => s.id === addItemModal.scheduleId);
    if (!schedule) return;

    // Check if member with same instrument is already in the schedule
    const memberExists = schedule.band.some(b => b.id === member.id && b.instrument === instrument);
    if (memberExists) {
      alert(`${member.firstName} ${member.lastName} ya está asignado con ${instrument}`);
      return;
    }

    const newBandMember = {
      id: member.id,
      scheduleItemId: Date.now().toString(),
      name: member.firstName, // Solo el nombre, sin apellido en el programa dominical
      instrument,
      order: schedule.band.length + 1
    };

    try {
      await scheduleService.update(addItemModal.scheduleId, {
        band: [...schedule.band, newBandMember]
      });

      const updatedSchedules = await scheduleService.getAll();
      setSchedules(updatedSchedules);
    } catch (error) {
      console.error('Error adding member to schedule:', error);
    }

    // Don't close modal - allow adding multiple members
  };

  const exportToPDF = () => {
    // PDF export functionality would be implemented here
    alert('Exporting to PDF...');
  };

  const toggleMonthCollapse = (monthKey: string) => {
    setCollapsedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(monthKey)) {
        newSet.delete(monthKey);
      } else {
        newSet.add(monthKey);
      }
      return newSet;
    });
  };
  return <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Programa Dominical</h2>
        <button onClick={exportToPDF} className="flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <DownloadIcon size={16} className="mr-2" />
          Exportar PDF
        </button>
      </div>
      <DragDropContext onDragEnd={handleDrop}>
      <div className="space-y-4">
        {Object.entries(groupSchedulesByMonth(schedules)).map(([monthKey, monthSchedules]) => {
          const isCollapsed = collapsedMonths.has(monthKey);
          const monthName = monthSchedules[0]?.monthName;
          
          return (
            <div key={monthKey} className="border border-gray-200 dark:border-gray-700 rounded-lg">
              <button
                onClick={() => toggleMonthCollapse(monthKey)}
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-t-lg border-b border-gray-200 dark:border-gray-700 text-left"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold capitalize">{monthName}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{monthSchedules.length} programas</span>
                    <span className={`transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`}>
                      ↓
                    </span>
                  </div>
                </div>
              </button>
              
              {!isCollapsed && (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
                        <th className="p-3 text-left">Fecha</th>
                        <th className="p-3 text-left">
                          <div className="flex items-center justify-between">
                            <span>Canciones</span>
                          </div>
                        </th>
                        <th className="p-3 text-left">
                          <div className="flex items-center justify-between">
                            <span>Banda</span>
                          </div>
                        </th>
                        <th className="p-3 text-left">Líderes</th>
                        <th className="p-3 text-center w-10">Acciones</th>
            </tr>
          </thead>
          <tbody>
                      {monthSchedules.map(schedule => <tr key={schedule.id} className="border-b border-gray-200 dark:border-gray-700">
                <td className="p-3">
                  {new Date(schedule.date).toLocaleDateString('es-ES', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
                </td>
                <td className="p-3">
                  <Droppable droppableId={`schedule-${schedule.id}-songs`}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[40px] ${snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900' : ''}`}
                      >
                        {schedule.songs.length > 0 ? (
                          <div className="space-y-1">
                            <button
                              onClick={() => openAddModal('song', schedule.id)}
                              className="w-full flex items-center justify-center p-1 text-xs bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
                            >
                              <PlusIcon size={12} className="mr-1" />
                              Agregar
                            </button>
                            <ul className="space-y-1">
                              {schedule.songs.map((song, index) => (
                              <Draggable key={song.scheduleItemId} draggableId={`schedule-song-${song.scheduleItemId}`} index={index}>
                                {(provided, snapshot) => (
                                  <li 
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`bg-gray-50 dark:bg-gray-800 p-2 rounded cursor-move ${theme === 'light' ? 'border border-black' : ''} ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                                  >
                                    <div className="flex justify-between items-center">
                                      <span>
                                        {song.order}. {song.name} ({song.key})
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <select
                                          value={song.singer}
                                          onChange={(e) => updateSongSinger(schedule.id, song.scheduleItemId, e.target.value)}
                                          className="text-xs bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <option value="">Seleccionar cantante</option>
                                          {schedule.band.filter(member => 
                                            member.instrument.includes('VOX') || 
                                            member.instrument === 'VOX1' || 
                                            member.instrument === 'VOX2' || 
                                            member.instrument === 'VOX3' || 
                                            member.instrument === 'VOX4'
                                          ).map(member => (
                                            <option key={member.scheduleItemId} value={member.name.split(' ')[0]}>
                                              {member.name.split(' ')[0]} ({member.instrument})
                                            </option>
                                          ))}
                                        </select>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeSongFromSchedule(schedule.id, song.scheduleItemId);
                                          }}
                                          className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                                          title="Eliminar canción"
                                        >
                                          <MinusIcon size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  </li>
                                )}
                              </Draggable>
                              ))}
                              {provided.placeholder}
                            </ul>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-center h-10 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
                        <span className="text-gray-400 text-sm">
                                Arrastra canciones aquí
                        </span>
                            </div>
                            <button
                              onClick={() => openAddModal('song', schedule.id)}
                              className="w-full flex items-center justify-center p-2 text-sm bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
                            >
                              <PlusIcon size={14} className="mr-1" />
                              Agregar Canción
                            </button>
                            {provided.placeholder}
                          </div>
                        )}
                  </div>
                    )}
                  </Droppable>
                </td>
                <td className="p-3">
                  <Droppable droppableId={`schedule-${schedule.id}-band`}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[40px] ${snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900' : ''}`}
                      >
                        {schedule.band.length > 0 ? (
                          <div className="space-y-1">
                            <button
                              onClick={() => openAddModal('member', schedule.id)}
                              className="w-full flex items-center justify-center p-1 text-xs bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-300 rounded hover:bg-green-100 dark:hover:bg-green-800 transition-colors"
                            >
                              <PlusIcon size={12} className="mr-1" />
                              Agregar
                            </button>
                            <ul className="space-y-1">
                              {schedule.band.map((member, index) => (
                              <Draggable key={member.scheduleItemId} draggableId={`schedule-member-${member.scheduleItemId}`} index={index}>
                                {(provided, snapshot) => (
                                  <li 
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`bg-gray-50 dark:bg-gray-800 p-2 rounded cursor-move ${theme === 'light' ? 'border border-black' : ''} ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                                  >
                                    <div className="flex justify-between items-center">
                                      <span>
                            {member.name.split(' ')[0]} ({member.instrument})
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeMemberFromSchedule(schedule.id, member.scheduleItemId);
                                        }}
                                        className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                                        title="Eliminar miembro"
                                      >
                                        <MinusIcon size={12} />
                                      </button>
                                    </div>
                                  </li>
                                )}
                              </Draggable>
                              ))}
                              {provided.placeholder}
                            </ul>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-center h-10 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
                        <span className="text-gray-400 text-sm">
                                Arrastra miembros aquí
                        </span>
                            </div>
                            <button
                              onClick={() => openAddModal('member', schedule.id)}
                              className="w-full flex items-center justify-center p-2 text-sm bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-300 rounded-md hover:bg-green-100 dark:hover:bg-green-800 transition-colors"
                            >
                              <PlusIcon size={14} className="mr-1" />
                              Agregar Miembro
                            </button>
                            {provided.placeholder}
                          </div>
                        )}
                  </div>
                    )}
                  </Droppable>
                </td>
                <td className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="w-20 text-sm">Talkback:</span>
                      <input 
                        type="text" 
                        className="flex-1 p-1 bg-transparent border border-gray-300 dark:border-gray-700 rounded" 
                        placeholder="Nombre" 
                        value={schedule.leaders.talkback} 
                        onChange={(e) => updateLeaders(schedule.id, 'talkback', e.target.value)} 
                      />
                    </div>
                    <div className="flex items-center">
                      <span className="w-20 text-sm">DM1:</span>
                      <input 
                        type="text" 
                        className="flex-1 p-1 bg-transparent border border-gray-300 dark:border-gray-700 rounded" 
                        placeholder="Nombre" 
                        value={schedule.leaders.dm1} 
                        onChange={(e) => updateLeaders(schedule.id, 'dm1', e.target.value)} 
                      />
                    </div>
                    <div className="flex items-center">
                      <span className="w-20 text-sm">DM2:</span>
                      <input 
                        type="text" 
                        className="flex-1 p-1 bg-transparent border border-gray-300 dark:border-gray-700 rounded" 
                        placeholder="Nombre" 
                        value={schedule.leaders.dm2} 
                        onChange={(e) => updateLeaders(schedule.id, 'dm2', e.target.value)} 
                      />
                    </div>
                  </div>
                </td>
                <td className="p-3 text-center">
                  <button onClick={() => openDeleteModal(schedule)} className="p-1 text-gray-500 hover:text-red-500 transition-colors" aria-label="Remove date">
                    <TrashIcon size={16} />
                  </button>
                </td>
              </tr>)}
          </tbody>
        </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4">
        <button 
          onClick={addNewSunday}
          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <PlusIcon size={16} className="mr-2" />
          Agregar Domingo
        </button>
      </div>

      {/* Add Item Modal */}
      {addItemModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg max-w-2xl w-full m-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Agregar {addItemModal.type === 'song' ? 'Canción' : 'Miembro de la Banda'}
              </h3>
              <button
                onClick={closeAddModal}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md"
              >
                <XIcon size={20} />
              </button>
            </div>

            {/* Search and Filter */}
            <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={`Buscar ${addItemModal.type === 'song' ? 'canciones' : 'miembros'}...`}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <SearchIcon className="absolute left-3 top-2.5 text-gray-400" size={18} />
                </div>
              </div>
              
              {addItemModal.type === 'song' && (
                <div className="flex items-center">
                  <FilterIcon className="mr-2 text-gray-400" size={18} />
                  <select
                    className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="">Todas las Categorías</option>
                    <option value="worship">Adoración</option>
                    <option value="praise">Alabanza</option>
                    <option value="hymn">Himno</option>
                    <option value="special">Especial</option>
                  </select>
                </div>
              )}
              
              {addItemModal.type === 'member' && (
                <div className="flex items-center">
                  <FilterIcon className="mr-2 text-gray-400" size={18} />
                  <select
                    className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2"
                    value={selectedInstrument}
                    onChange={(e) => setSelectedInstrument(e.target.value)}
                  >
                    <option value="">Todos los Instrumentos</option>
                    <option value="guitar">Guitarra</option>
                    <option value="piano">Piano</option>
                    <option value="drums">Batería</option>
                    <option value="vocals">Voz</option>
                    <option value="bass">Bajo</option>
                  </select>
                </div>
              )}
            </div>

            {/* Items List */}
            <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
              {addItemModal.type === 'song' ? (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredSongs.map((song) => (
                    <div
                      key={song.id}
                      className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex justify-between items-center"
                      onClick={() => addSongToSchedule(song)}
                    >
                      <div>
                        <h4 className="font-medium">{song.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {song.originalSinger} • Tono: {song.currentKey} • {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                        </p>
                        <span className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 rounded-full capitalize mt-1">
                          {song.category === 'worship' ? 'Adoración' : 
                           song.category === 'praise' ? 'Alabanza' : 
                           song.category === 'hymn' ? 'Himno' : 'Especial'}
                        </span>
                      </div>
                      <PlusIcon size={20} className="text-blue-600" />
                    </div>
                  ))}
                  {filteredSongs.length === 0 && (
                    <div className="p-6 text-center text-gray-500">
                      No se encontraron canciones que coincidan con tus criterios
                    </div>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {getFilteredMembersForSchedule(addItemModal.scheduleId).map((member) => (
                    <div key={member.id} className="p-3">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">{member.firstName} {member.lastName}</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {member.instruments.map((instrument) => (
                          <button
                            key={instrument}
                            onClick={() => addMemberWithInstrument(member, instrument)}
                            className="px-3 py-1 text-sm bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 rounded-full hover:bg-green-200 dark:hover:bg-green-700 transition-colors"
                          >
                            {instrument}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {getFilteredMembersForSchedule(addItemModal.scheduleId).length === 0 && (
                    <div className="p-6 text-center text-gray-500">
                      No se encontraron miembros disponibles que coincidan con tus criterios para esta fecha
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instrument Selection Modal */}
      {instrumentModal.show && instrumentModal.member && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full m-4">
            <h3 className="text-lg font-semibold mb-4">
              Seleccionar Instrumento para {instrumentModal.member.firstName} {instrumentModal.member.lastName}
            </h3>
            <div className="space-y-2">
              {instrumentModal.member.instruments.map((instrument) => (
                <button
                  key={instrument}
                  onClick={() => addMemberToSchedule(instrumentModal.scheduleId, instrumentModal.member!, instrument)}
                  className="w-full p-3 text-left bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
                >
                  {instrument}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setInstrumentModal({ show: false, member: null, scheduleId: '' })}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      </DragDropContext>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        title="Eliminar Programa Dominical"
        message="Esta acción eliminará permanentemente el programa dominical y toda la información asociada (canciones, miembros, etc.)."
        itemName={deleteModal.schedule ? deleteModal.schedule.date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : undefined}
        onConfirm={confirmDeleteSchedule}
        onCancel={closeDeleteModal}
        isLoading={deleteModal.isLoading}
      />
    </div>
};