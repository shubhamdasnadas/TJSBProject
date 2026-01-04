'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Filter, Upload, Plus } from 'lucide-react';
import CreateMapModal from './CreateMapModal'; // Ensure this file exists

interface MapItem {
  id: string;
  name: string;
  width: number;
  height: number;
}

export default function MapsPage() {
  const [maps, setMaps] = useState<MapItem[]>([
    {
      id: '1',
      name: 'automap',
      width: 800,
      height: 1000,
    },
  ]);

  const [filteredMaps, setFilteredMaps] = useState<MapItem[]>(maps);
  const [searchName, setSearchName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = (value: string) => {
    setSearchName(value);
    if (value.trim() === '') {
      setFilteredMaps(maps);
    } else {
      setFilteredMaps(maps.filter(map => 
        map.name.toLowerCase().includes(value.toLowerCase())
      ));
    }
  };

  const handleReset = () => {
    setSearchName('');
    setFilteredMaps(maps);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is YAML
    if (!file.name.endsWith('.yml') && !file.name.endsWith('.yaml')) {
      alert('Please select a valid YAML file (.yml or .yaml)');
      return;
    }

    setIsImporting(true);
    try {
      const fileContent = await file.text();
      // Parse YAML content here - you may need to add a YAML parser library
      console.log('File content:', fileContent);
      
      // For now, create a basic map entry from the imported file
      const newMap: MapItem = {
        id: Date.now().toString(),
        name: file.name.replace(/\.(yml|yaml)$/, ''),
        width: 800,
        height: 600,
      };
      
      const updatedMaps = [...maps, newMap];
      setMaps(updatedMaps);
      setFilteredMaps(updatedMaps);
      alert(`Map "${newMap.name}" imported successfully!`);
    } catch (error) {
      console.error('Error importing file:', error);
      alert('Error importing map file. Please try again.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCreateMap = (mapData: any) => {
    const newMap: MapItem = {
      id: Date.now().toString(),
      name: mapData.name,
      width: mapData.width,
      height: mapData.height,
    };
    
    const updatedMaps = [...maps, newMap];
    setMaps(updatedMaps);
    setFilteredMaps(updatedMaps);
    setShowCreateModal(false);
  };

  const handleDeleteMap = (id: string) => {
    if (confirm('Are you sure you want to delete this map?')) {
      const updatedMaps = maps.filter(map => map.id !== id);
      setMaps(updatedMaps);
      setFilteredMaps(updatedMaps);
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Maps</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <Plus size={18} />
            Create map
          </button>
          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
          >
            <Upload size={18} />
            {isImporting ? 'Importing...' : 'Import'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".yml,.yaml"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-600" />
            <label className="font-medium">Name</label>
            <input
              type="text"
              value={searchName}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name..."
              className="border border-gray-300 rounded px-3 py-2 w-64"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleSearch(searchName)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
            >
              Apply
            </button>
            <button
              onClick={handleReset}
              className="border border-gray-300 hover:bg-gray-100 text-gray-700 px-6 py-2 rounded"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input type="checkbox" className="rounded" />
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  <button className="flex items-center gap-1 hover:text-blue-600">
                    Name <span className="text-xs">▲</span>
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Width</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Height</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No maps found
                  </td>
                </tr>
              ) : (
                filteredMaps.map((map) => (
                  <tr key={map.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/monitoring/maps/${map.id}`} className="text-blue-600 hover:underline">
                        {map.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{map.width}</td>
                    <td className="px-4 py-3">{map.height}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <Link
                          href={`/monitoring/maps/${map.id}/properties`}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Properties
                        </Link>
                        <Link
                          href={`/monitoring/maps/${map.id}/edit`}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeleteMap(map.id)}
                          className="text-red-600 hover:underline text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span>0 selected</span>
            <select className="border border-gray-300 rounded px-2 py-1 text-gray-700">
              <option>Export</option>
            </select>
            <button className="text-red-600 hover:underline">Delete</button>
          </div>
          <span>Displaying {filteredMaps.length} of {maps.length} found</span>
        </div>
      </div>

      {/* Create Map Modal */}
      {showCreateModal && (
        <CreateMapModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateMap}
        />
      )}
    </div>
  );
}
