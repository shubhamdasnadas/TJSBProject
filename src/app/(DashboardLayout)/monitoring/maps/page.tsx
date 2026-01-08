'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Filter, Upload, Plus, Loader2 } from 'lucide-react';
import CreateMapModal from './CreateMapModal';

interface MapItem {
  sysmapid: string;
  name: string;
  width: string;
  height: string;
}

export default function MapsPage() {
  const [maps, setMaps] = useState<MapItem[]>([]);
  const [filteredMaps, setFilteredMaps] = useState<MapItem[]>([]);
  const [searchName, setSearchName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch maps from Zabbix API
  useEffect(() => {
    fetchMaps();
  }, []);

  const fetchMaps = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/zabbix/maps');
      const data = await response.json();
      
      if (data.result) {
        setMaps(data.result);
        setFilteredMaps(data.result);
      }
    } catch (error) {
      console.error('Error fetching maps:', error);
      alert('Error loading maps. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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

    if (!file.name.endsWith('.yml') && !file.name.endsWith('.yaml')) {
      alert('Please select a valid YAML file (.yml or .yaml)');
      return;
    }

    setIsImporting(true);
    try {
      const fileContent = await file.text();
      // TODO: Parse YAML and send to API
      alert('Import functionality coming soon!');
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

  const handleCreateMap = async (mapData: any) => {
    try {
      const response = await fetch('/api/zabbix/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: mapData.name,
          width: mapData.width,
          height: mapData.height,
          // Add other properties from mapData
        }),
      });

      const data = await response.json();
      
      if (data.result) {
        alert(`Map "${mapData.name}" created successfully!`);
        setShowCreateModal(false);
        fetchMaps(); // Refresh the list
      } else {
        alert('Error creating map: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating map:', error);
      alert('Error creating map. Please try again.');
    }
  };

  const handleDeleteMap = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete map "${name}"?`)) return;

    try {
      const response = await fetch(`/api/zabbix/maps?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.result) {
        alert('Map deleted successfully!');
        fetchMaps(); // Refresh the list
      } else {
        alert('Error deleting map: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting map:', error);
      alert('Error deleting map. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Maps</h1>
          <span className="text-sm text-gray-500">({maps.length} total)</span>
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
      <div className="bg-white rounded-lg overflow-hidden shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input type="checkbox" className="rounded" />
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Name
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
                  <tr key={map.sysmapid} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <Link 
                        href={`/monitoring/maps/${map.sysmapid}`} 
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {map.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{map.width}</td>
                    <td className="px-4 py-3">{map.height}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <Link
                          href={`/monitoring/maps/${map.sysmapid}`}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          View
                        </Link>
                        <Link
                          href={`/monitoring/maps/${map.sysmapid}/edit`}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeleteMap(map.sysmapid, map.name)}
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
            <button className="text-red-600 hover:underline">Delete selected</button>
          </div>
          <span>Displaying {filteredMaps.length} of {maps.length} maps</span>
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
