import React, { useState, useEffect } from 'react';
import { SearchIcon, FilterIcon, PlusIcon, EditIcon, SaveIcon, XIcon, TrashIcon } from 'lucide-react';
import { Draggable, Droppable } from 'react-beautiful-dnd';
import { Song, songService } from '../services/dataService';

interface EditableCell {
  songId: string;
  field: keyof Song;
}

export const SongBank: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [editingCell, setEditingCell] = useState<EditableCell | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSong, setNewSong] = useState<Omit<Song, 'id'>>({
    name: '',
    currentKey: 'C',
    keyHistory: [],
    originalSinger: '',
    youtubeLink: '',
    lyrics: '',
    verses: '',
    duration: 0,
    category: 'worship'
  });

  useEffect(() => {
    const loadSongs = async () => {
      const loadedSongs = await songService.getAll();
      setSongs(loadedSongs);
    };
    loadSongs();
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const filteredSongs = songs.filter(song => {
    const matchesSearch = song.name.toLowerCase().includes(searchTerm.toLowerCase()) || song.originalSinger.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? song.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const startEditing = (songId: string, field: keyof Song) => {
    const song = songs.find(s => s.id === songId);
    if (song) {
      setEditingCell({ songId, field });
      let value = song[field];
      if (Array.isArray(value)) {
        value = value.join(', ');
      }
      setEditValue(value?.toString() || '');
    }
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    
    const { songId, field } = editingCell;
    let processedValue: any = editValue;
    
    // Process different field types
    if (field === 'keyHistory') {
      processedValue = editValue.split(',').map(k => k.trim()).filter(k => k);
    } else if (field === 'duration') {
      processedValue = parseInt(editValue) || 0;
    }
    
    const updatedSong = await songService.update(songId, { [field]: processedValue });
    if (updatedSong) {
      const updatedSongs = await songService.getAll();
      setSongs(updatedSongs);
      if (selectedSong?.id === songId) {
        setSelectedSong(updatedSong);
      }
    }
    
    setEditingCell(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const createSong = async () => {
    const createdSong = await songService.create(newSong);
    if (createdSong) {
      const updatedSongs = await songService.getAll();
      setSongs(updatedSongs);
    }
    setShowCreateModal(false);
    setNewSong({
      name: '',
      currentKey: 'C',
      keyHistory: [],
      originalSinger: '',
      youtubeLink: '',
      lyrics: '',
      verses: '',
      duration: 0,
      category: 'worship'
    });
  };

  const deleteSong = async (songId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta canción?')) {
      try {
        await songService.delete(songId);
        const updatedSongs = await songService.getAll();
        setSongs(updatedSongs);
        if (selectedSong?.id === songId) {
          setSelectedSong(null);
        }
      } catch (error) {
        console.error('Error deleting song:', error);
      }
    }
  };

  const renderEditableCell = (song: Song, field: keyof Song, value: any) => {
    const isEditing = editingCell?.songId === song.id && editingCell?.field === field;
    
    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <input
            type={field === 'duration' ? 'number' : 'text'}
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
        onClick={() => startEditing(song.id, field)}
      >
        <span className="flex-1">
          {field === 'duration' ? `${Math.floor(Number(value) / 60)}:${(Number(value) % 60).toString().padStart(2, '0')}` : 
           Array.isArray(value) ? value.join(', ') : value}
        </span>
        <EditIcon size={12} className="opacity-0 group-hover:opacity-100 text-gray-400" />
      </div>
    );
  };
  return <div className="w-full">
      <h2 className="text-xl font-bold mb-4">Banco de Canciones</h2>
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1">
          <div className="relative">
            <input type="text" placeholder="Buscar canciones..." className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <SearchIcon className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
        </div>
        <div className="flex items-center">
          <FilterIcon className="mr-2 text-gray-400" size={18} />
          <select className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
            <option value="">Todas las Categorías</option>
            <option value="worship">Adoración</option>
            <option value="praise">Alabanza</option>
            <option value="hymn">Himno</option>
            <option value="special">Especial</option>
          </select>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <PlusIcon size={16} className="mr-2" />
          Agregar Canción
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="max-h-[500px] overflow-y-auto">
            <Droppable droppableId="songs-list" isDropDisabled={true}>
              {(provided) => (
                <table className="w-full" {...provided.droppableProps} ref={provided.innerRef}>
                  <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                    <tr>
                      <th className="p-3 text-left">Nombre</th>
                      <th className="p-3 text-left">Tono</th>
                      <th className="p-3 text-left">Categoría</th>
                      <th className="p-3 text-left">Duración</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSongs.map((song, index) => (
                      <Draggable key={song.id} draggableId={`song-${song.id}`} index={index}>
                        {(provided, snapshot) => (
                          <tr 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 
                              ${selectedSong?.id === song.id ? 'bg-gray-100 dark:bg-gray-700' : ''}
                              ${snapshot.isDragging ? 'bg-blue-50 dark:bg-blue-900 shadow-lg' : ''}`}
                            onClick={() => setSelectedSong(song)}
                          >
                            <td className="p-3">{song.name}</td>
                            <td className="p-3">{song.currentKey}</td>
                            <td className="p-3 capitalize">{song.category}</td>
                            <td className="p-3">
                              {Math.floor(song.duration / 60)}:
                              {(song.duration % 60).toString().padStart(2, '0')}
                            </td>
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
          {selectedSong ? <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{selectedSong.name}</h3>
                <button
                  onClick={() => deleteSong(selectedSong.id)}
                  className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                  title="Eliminar canción"
                >
                  <TrashIcon size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Tono Actual
                  </p>
                  {renderEditableCell(selectedSong, 'currentKey', selectedSong.currentKey)}
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Categoría
                  </p>
                  {renderEditableCell(selectedSong, 'category', selectedSong.category)}
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Intérprete Original
                  </p>
                  {renderEditableCell(selectedSong, 'originalSinger', selectedSong.originalSinger)}
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Duración
                  </p>
                  {renderEditableCell(selectedSong, 'duration', selectedSong.duration)}
                </div>
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Historial de Tonos (separados por coma)
                </p>
                {renderEditableCell(selectedSong, 'keyHistory', selectedSong.keyHistory)}
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Enlace de YouTube
                </p>
                {renderEditableCell(selectedSong, 'youtubeLink', selectedSong.youtubeLink)}
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Letra
                </p>
                <div className="mt-1">
                  {renderEditableCell(selectedSong, 'lyrics', selectedSong.lyrics)}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Versículos Bíblicos
                </p>
                <div className="mt-1">
                  {renderEditableCell(selectedSong, 'verses', selectedSong.verses)}
                </div>
              </div>
            </div> : <div className="flex items-center justify-center h-full text-gray-400">
              Selecciona una canción para ver detalles
            </div>}
        </div>
      </div>

      {/* Create Song Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full m-4">
            <h3 className="text-lg font-semibold mb-4">Agregar Nueva Canción</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input
                  type="text"
                  value={newSong.name}
                  onChange={(e) => setNewSong({...newSong, name: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tono Actual</label>
                <input
                  type="text"
                  value={newSong.currentKey}
                  onChange={(e) => setNewSong({...newSong, currentKey: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Intérprete Original</label>
                <input
                  type="text"
                  value={newSong.originalSinger}
                  onChange={(e) => setNewSong({...newSong, originalSinger: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Categoría</label>
                <select
                  value={newSong.category}
                  onChange={(e) => setNewSong({...newSong, category: e.target.value as Song['category']})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700"
                >
                  <option value="worship">Adoración</option>
                  <option value="praise">Alabanza</option>
                  <option value="hymn">Himno</option>
                  <option value="special">Especial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Duración (segundos)</label>
                <input
                  type="number"
                  value={newSong.duration}
                  onChange={(e) => setNewSong({...newSong, duration: parseInt(e.target.value) || 0})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Enlace de YouTube</label>
                <input
                  type="text"
                  value={newSong.youtubeLink}
                  onChange={(e) => setNewSong({...newSong, youtubeLink: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Letra</label>
                <textarea
                  value={newSong.lyrics}
                  onChange={(e) => setNewSong({...newSong, lyrics: e.target.value})}
                  rows={4}
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Versículos Bíblicos</label>
                <input
                  type="text"
                  value={newSong.verses}
                  onChange={(e) => setNewSong({...newSong, verses: e.target.value})}
                  placeholder="Ej: Salmos 23:1-6, Juan 3:16"
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
                onClick={createSong}
                disabled={!newSong.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Agregar Canción
              </button>
            </div>
          </div>
        </div>
      )}
    </div>;
};