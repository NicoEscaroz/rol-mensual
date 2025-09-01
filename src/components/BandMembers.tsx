import React, { useState, useEffect } from 'react';
import { SearchIcon, PlusIcon, EditIcon, SaveIcon, XIcon, ChevronLeftIcon, ChevronRightIcon, TrashIcon } from 'lucide-react';
import { Draggable, Droppable } from 'react-beautiful-dnd';
import { generateSundaysForCurrentAndNext, generateSundaysForMonth, getAdjacentMonths, getMonthInfo } from '../utils/dateUtils';
import { BandMember, memberService } from '../services/dataService';

interface EditableCell {
  memberId: string;
  field: keyof BandMember;
}

export const BandMembers: React.FC = () => {
  const [members, setMembers] = useState<BandMember[]>([]);
  const [editingCell, setEditingCell] = useState<EditableCell | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMember, setNewMember] = useState<Omit<BandMember, 'id'>>({
    firstName: '',
    lastName: '',
    instruments: [],
    availability: []
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const loadedMembers = await memberService.getAll();
        setMembers(loadedMembers);
      } catch (error) {
        console.error('Error loading members:', error);
        setMembers([]);
      }
    };

    loadData();
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<BandMember | null>(null);
  const [currentAvailabilityMonth, setCurrentAvailabilityMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const filteredMembers = members.filter(member => {
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || member.instruments.some(instrument => instrument.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const startEditing = (memberId: string, field: keyof BandMember) => {
    const member = members.find(m => m.id === memberId);
    if (member) {
      setEditingCell({ memberId, field });
      let value = member[field];
      if (Array.isArray(value)) {
        value = value.join(', ');
      }
      setEditValue(value?.toString() || '');
    }
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    
    const { memberId, field } = editingCell;
    let processedValue: any = editValue;
    
    // Process different field types
    if (field === 'instruments') {
      processedValue = editValue.split(',').map(i => i.trim()).filter(i => i);
    }
    
    try {
      const updatedMember = await memberService.update(memberId, { [field]: processedValue });
      if (updatedMember) {
        const updatedMembers = await memberService.getAll();
        setMembers(updatedMembers);
        if (selectedMember?.id === memberId) {
          setSelectedMember(updatedMember);
        }
      }
    } catch (error) {
      console.error('Error updating member:', error);
    }
    
    setEditingCell(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const createMember = async () => {
    try {
      await memberService.create(newMember);
      const updatedMembers = await memberService.getAll();
      setMembers(updatedMembers);
      setShowCreateModal(false);
      setNewMember({
        firstName: '',
        lastName: '',
        instruments: [],
        availability: []
      });
    } catch (error) {
      console.error('Error creating member:', error);
    }
  };

  const deleteMember = async (memberId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este miembro?')) {
      try {
        await memberService.delete(memberId);
        const updatedMembers = await memberService.getAll();
        setMembers(updatedMembers);
        if (selectedMember?.id === memberId) {
          setSelectedMember(null);
        }
      } catch (error) {
        console.error('Error deleting member:', error);
      }
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentAvailabilityMonth(prev => {
      if (direction === 'prev') {
        const newMonth = prev.month === 0 ? 11 : prev.month - 1;
        const newYear = prev.month === 0 ? prev.year - 1 : prev.year;
        return { year: newYear, month: newMonth };
      } else {
        const newMonth = prev.month === 11 ? 0 : prev.month + 1;
        const newYear = prev.month === 11 ? prev.year + 1 : prev.year;
        return { year: newYear, month: newMonth };
      }
    });
  };

  const getCurrentMonthSundays = () => {
    return generateSundaysForMonth(currentAvailabilityMonth.year, currentAvailabilityMonth.month);
  };

  const getMemberAvailabilityForCurrentMonth = (member: BandMember) => {
    const currentMonthSundays = getCurrentMonthSundays();
    return currentMonthSundays.map(sunday => {
      const existingAvailability = member.availability.find(avail => {
        const availDate = new Date(avail.date).toISOString().split('T')[0];
        const sundayDate = new Date(sunday).toISOString().split('T')[0];
        return availDate === sundayDate;
      });
      // If no availability record exists, default to true (available)
      // This ensures consistency with how we initialize new members
      return existingAvailability || { date: sunday, available: true };
    });
  };

  const toggleAvailability = async (memberId: string, date: Date) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    // Find existing availability or determine new state
    const existingAvailability = member.availability.find(avail => {
      // More robust date comparison using ISO date strings
      const availDate = new Date(avail.date).toISOString().split('T')[0];
      const targetDate = new Date(date).toISOString().split('T')[0];
      return availDate === targetDate;
    });

    // If no availability record exists, we assume it was true (default state)
    // So we toggle from true to false
    const currentAvailable = existingAvailability ? existingAvailability.available : true;
    const newAvailable = !currentAvailable;



    // Optimistic update - update UI immediately
    const optimisticUpdateMembers = members.map(m => {
      if (m.id === memberId) {
        const updatedAvailability = [...m.availability];
        const existingIndex = updatedAvailability.findIndex(avail => {
          const availDate = new Date(avail.date).toISOString().split('T')[0];
          const targetDate = new Date(date).toISOString().split('T')[0];
          return availDate === targetDate;
        });

        if (existingIndex >= 0) {
          updatedAvailability[existingIndex] = { date, available: newAvailable };
        } else {
          updatedAvailability.push({ date, available: newAvailable });
        }

        return { ...m, availability: updatedAvailability };
      }
      return m;
    });

    setMembers(optimisticUpdateMembers);

    // Update selected member optimistically too
    if (selectedMember?.id === memberId) {
      const optimisticSelectedMember = optimisticUpdateMembers.find(m => m.id === memberId);
      if (optimisticSelectedMember) {
        setSelectedMember(optimisticSelectedMember);
      }
    }

    try {
      // Update only this specific availability record
      await memberService.updateAvailability(memberId, date, newAvailable);
      
      // Refresh the members list to get updated data from server
      const updatedMembers = await memberService.getAll();
      setMembers(updatedMembers);
      
      // Update selected member if it's the one being modified
      if (selectedMember?.id === memberId) {
        const updatedMember = updatedMembers.find(m => m.id === memberId);
        if (updatedMember) {
          setSelectedMember(updatedMember);
        }
      }
    } catch (error) {
      console.error('Error updating member availability:', error);
      // Revert optimistic update on error
      const revertedMembers = await memberService.getAll();
      setMembers(revertedMembers);
      if (selectedMember?.id === memberId) {
        const revertedMember = revertedMembers.find(m => m.id === memberId);
        if (revertedMember) {
          setSelectedMember(revertedMember);
        }
      }
    }
  };

  const renderEditableCell = (member: BandMember, field: keyof BandMember, value: any) => {
    const isEditing = editingCell?.memberId === member.id && editingCell?.field === field;
    
    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1 px-1 py-0.5 text-sm bg-white dark:bg-gray-700 border border-blue-500 rounded"
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            autoFocus
          />
          <button onClick={saveEdit} className="p-0.5 text-green-600 hover:bg-green-100 rounded">
            <SaveIcon size={12} />
          </button>
          <button onClick={cancelEdit} className="p-0.5 text-red-600 hover:bg-red-100 rounded">
            <XIcon size={12} />
          </button>
        </div>
      );
    }
    
    return (
      <div 
        className="flex items-center justify-between group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 px-1 py-0.5 rounded"
        onClick={() => startEditing(member.id, field)}
      >
        <span className="flex-1">
          {Array.isArray(value) ? value.join(', ') : value}
        </span>
        <EditIcon size={12} className="opacity-0 group-hover:opacity-100 text-gray-400" />
      </div>
    );
  };
  return <div className="w-full">
      <h2 className="text-xl font-bold mb-4">Miembros de la Banda</h2>
      <div className="flex items-center mb-4">
        <div className="relative flex-1">
          <input type="text" placeholder="Buscar miembros..." className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <SearchIcon className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="ml-4 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
        >
          <PlusIcon size={16} className="mr-2" />
          Agregar Miembro
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="max-h-[500px] overflow-y-auto">
            <Droppable droppableId="members-list" isDropDisabled={true}>
              {(provided) => (
                <table className="w-full" {...provided.droppableProps} ref={provided.innerRef}>
                  <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                    <tr>
                      <th className="p-3 text-left">Nombre</th>
                      <th className="p-3 text-left">Instrumentos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member, index) => (
                      <Draggable key={member.id} draggableId={`member-${member.id}`} index={index}>
                        {(provided, snapshot) => (
                          <tr 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 
                              ${selectedMember?.id === member.id ? 'bg-gray-100 dark:bg-gray-700' : ''}
                              ${snapshot.isDragging ? 'bg-blue-50 dark:bg-blue-900 shadow-lg' : ''}`}
                            onClick={() => setSelectedMember(member)}
                          >
                            <td className="p-3">
                              {member.firstName} {member.lastName}
                            </td>
                            <td className="p-3">{member.instruments.join(', ')}</td>
                          </tr>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </tbody>
                </table>
              )}
            </Droppable>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          {selectedMember ? <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {renderEditableCell(selectedMember, 'firstName', selectedMember.firstName)} {renderEditableCell(selectedMember, 'lastName', selectedMember.lastName)}
                </h3>
                <button
                  onClick={() => deleteMember(selectedMember.id)}
                  className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                  title="Eliminar miembro"
                >
                  <TrashIcon size={16} />
                </button>
              </div>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Instrumentos
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {renderEditableCell(selectedMember, 'instruments', selectedMember.instruments)}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Disponibilidad
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigateMonth('prev')}
                      className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded"
                    >
                      <ChevronLeftIcon size={16} />
                    </button>
                    <span className="text-sm font-medium capitalize">
                      {getMonthInfo(currentAvailabilityMonth.year, currentAvailabilityMonth.month).name}
                    </span>
                    <button
                      onClick={() => navigateMonth('next')}
                      className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded"
                    >
                      <ChevronRightIcon size={16} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {getMemberAvailabilityForCurrentMonth(selectedMember).map((item, index) => (
                    <label key={index} className="flex items-center p-2 border border-gray-200 dark:border-gray-700 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900">
                      <input 
                        type="checkbox" 
                        className="mr-2" 
                        checked={item.available} 
                        onChange={() => toggleAvailability(selectedMember.id, item.date)} 
                      />
                      <span>
                        {item.date.toLocaleDateString('es-ES', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </label>
                  ))}
                  {getCurrentMonthSundays().length === 0 && (
                    <div className="col-span-2 text-center text-gray-500 py-4">
                      No hay domingos en este mes
                    </div>
                  )}
                </div>
              </div>
            </div> : <div className="flex items-center justify-center h-full text-gray-400">
              Selecciona un miembro para ver detalles
            </div>}
        </div>
      </div>

      {/* Create Member Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full m-4">
            <h3 className="text-lg font-semibold mb-4">Agregar Nuevo Miembro</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input
                  type="text"
                  value={newMember.firstName}
                  onChange={(e) => setNewMember({...newMember, firstName: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Apellido</label>
                <input
                  type="text"
                  value={newMember.lastName}
                  onChange={(e) => setNewMember({...newMember, lastName: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Instrumentos</label>
                <div className="mb-2">
                  <p className="text-xs text-gray-500 mb-2">Instrumentos estándar:</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {['VOX1', 'VOX2', 'VOX3', 'VOX4', 'BASS', 'DRUMS', 'EG1', 'EG2', 'AG', 'KEYS'].map(instrument => (
                      <button
                        key={instrument}
                        type="button"
                        onClick={() => {
                          const instruments = newMember.instruments.includes(instrument) 
                            ? newMember.instruments.filter(i => i !== instrument)
                            : [...newMember.instruments, instrument];
                          setNewMember({...newMember, instruments});
                        }}
                        className={`px-2 py-1 text-xs rounded ${
                          newMember.instruments.includes(instrument)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                        }`}
                      >
                        {instrument}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  value={newMember.instruments.join(', ')}
                  onChange={(e) => setNewMember({...newMember, instruments: e.target.value.split(',').map(i => i.trim()).filter(i => i)})}
                  placeholder="O escribe instrumentos personalizados separados por coma"
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={createMember}
                disabled={!newMember.firstName.trim() || !newMember.lastName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Agregar Miembro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>;
};