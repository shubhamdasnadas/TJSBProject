'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface CreateMapModalProps {
  onClose: () => void;
  onCreate: (mapData: any) => void;
}

export default function CreateMapModal({ onClose, onCreate }: CreateMapModalProps) {
  const [owner, setOwner] = useState('isd_dev (tsd_dev)');
  const [name, setName] = useState('');
  const [width, setWidth] = useState('800');
  const [height, setHeight] = useState('600');
  const [backgroundImage, setBackgroundImage] = useState('No image');
  const [autoIconMapping, setAutoIconMapping] = useState('<manual>');
  const [iconHighlight, setIconHighlight] = useState(false);
  const [markElements, setMarkElements] = useState(false);
  const [displayProblems, setDisplayProblems] = useState('Expand single problem');
  const [advancedLabels, setAdvancedLabels] = useState(false);
  const [labelType, setLabelType] = useState('Label');
  const [labelLocation, setLabelLocation] = useState('Bottom');
  const [problemDisplay, setProblemDisplay] = useState('All');
  const [minimumSeverity, setMinimumSeverity] = useState('Not classified');
  const [showSuppressed, setShowSuppressed] = useState(false);
  const [urls, setUrls] = useState<Array<{ name: string; url: string; element: string }>>([
    { name: '', url: '', element: 'Host' }
  ]);

  const handleAddUrl = () => {
    setUrls([...urls, { name: '', url: '', element: 'Host' }]);
  };

  const handleRemoveUrl = (index: number) => {
    setUrls(urls.filter((_, i) => i !== index));
  };

  const handleUrlChange = (index: number, field: string, value: string) => {
    const updatedUrls = [...urls];
    updatedUrls[index] = { ...updatedUrls[index], [field]: value };
    setUrls(updatedUrls);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert('Please enter a map name');
      return;
    }

    onCreate({
      owner,
      name,
      width: parseInt(width),
      height: parseInt(height),
      backgroundImage,
      autoIconMapping,
      iconHighlight,
      markElements,
      displayProblems,
      advancedLabels,
      labelType,
      labelLocation,
      problemDisplay,
      minimumSeverity,
      showSuppressed,
      urls: urls.filter(u => u.name || u.url),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">Create Map</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 pt-4">
          <button className="px-4 py-2 text-blue-600 border-b-2 border-blue-600 font-medium">
            Map
          </button>
          <button className="px-4 py-2 text-gray-700 hover:text-blue-600">
            Sharing
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Owner */}
            <div className="flex items-center gap-4">
              <label className="w-40 font-medium text-right">
                <span className="text-red-500">*</span> Owner
              </label>
              <div className="flex gap-2 flex-1">
                <div className="bg-gray-200 px-3 py-2 rounded text-sm text-gray-700 flex-1">
                  {owner}
                </div>
                <button
                  type="button"
                  className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-50"
                >
                  Select
                </button>
              </div>
            </div>

            {/* Name */}
            <div className="flex items-center gap-4">
              <label className="w-40 font-medium text-right">
                <span className="text-red-500">*</span> Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 flex-1"
                placeholder="Enter map name"
              />
            </div>

            {/* Width */}
            <div className="flex items-center gap-4">
              <label className="w-40 font-medium text-right">
                <span className="text-red-500">*</span> Width
              </label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 w-40"
              />
            </div>

            {/* Height */}
            <div className="flex items-center gap-4">
              <label className="w-40 font-medium text-right">
                <span className="text-red-500">*</span> Height
              </label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 w-40"
              />
            </div>

            {/* Background Image */}
            <div className="flex items-center gap-4">
              <label className="w-40 font-medium text-right">Background image</label>
              <select
                value={backgroundImage}
                onChange={(e) => setBackgroundImage(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 flex-1"
              >
                <option>No image</option>
                <option>Option 1</option>
              </select>
            </div>

            {/* Automatic Icon Mapping */}
            <div className="flex items-center gap-4">
              <label className="w-40 font-medium text-right">Automatic icon mapping</label>
              <div className="flex gap-2 flex-1">
                <select
                  value={autoIconMapping}
                  onChange={(e) => setAutoIconMapping(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2"
                >
                  <option>&lt;manual&gt;</option>
                </select>
                <a href="#" className="text-blue-600 hover:underline text-sm">
                  show icon mappings
                </a>
              </div>
            </div>

            {/* Icon Highlight */}
            <div className="flex items-center gap-4">
              <label className="w-40 text-right"></label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={iconHighlight}
                  onChange={(e) => setIconHighlight(e.target.checked)}
                  className="rounded"
                />
                <span>Icon highlight</span>
              </label>
            </div>

            {/* Mark Elements */}
            <div className="flex items-center gap-4">
              <label className="w-40 text-right"></label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={markElements}
                  onChange={(e) => setMarkElements(e.target.checked)}
                  className="rounded"
                />
                <span>Mark elements on trigger status change</span>
              </label>
            </div>

            {/* Display Problems */}
            <div className="flex items-center gap-4">
              <label className="w-40 font-medium text-right">Display problems</label>
              <div className="flex gap-2 flex-1">
                {['Expand single problem', 'Number of problems', 'Number of problems and expand most critical one'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDisplayProblems(option)}
                    className={`px-3 py-1 rounded text-sm whitespace-nowrap ${
                      displayProblems === option
                        ? 'bg-gray-500 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Labels */}
            <div className="flex items-center gap-4">
              <label className="w-40 text-right"></label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={advancedLabels}
                  onChange={(e) => setAdvancedLabels(e.target.checked)}
                  className="rounded"
                />
                <span>Advanced labels</span>
              </label>
            </div>

            {/* Map Element Label Type */}
            <div className="flex items-center gap-4">
              <label className="w-40 font-medium text-right">Map element label type</label>
              <select
                value={labelType}
                onChange={(e) => setLabelType(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 flex-1"
              >
                <option>Label</option>
              </select>
            </div>

            {/* Map Element Label Location */}
            <div className="flex items-center gap-4">
              <label className="w-40 font-medium text-right">Map element label location</label>
              <select
                value={labelLocation}
                onChange={(e) => setLabelLocation(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 flex-1"
              >
                <option>Bottom</option>
                <option>Top</option>
                <option>Left</option>
                <option>Right</option>
              </select>
            </div>

            {/* Problem Display */}
            <div className="flex items-center gap-4">
              <label className="w-40 font-medium text-right">Problem display</label>
              <select
                value={problemDisplay}
                onChange={(e) => setProblemDisplay(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 flex-1"
              >
                <option>All</option>
              </select>
            </div>

            {/* Minimum Severity */}
            <div className="flex items-center gap-4">
              <label className="w-40 font-medium text-right">Minimum severity</label>
              <div className="flex gap-2 flex-1">
                {['Not classified', 'Information', 'Warning', 'Average', 'High', 'Disaster'].map((severity) => (
                  <button
                    key={severity}
                    type="button"
                    onClick={() => setMinimumSeverity(severity)}
                    className={`px-3 py-1 rounded text-sm whitespace-nowrap ${
                      minimumSeverity === severity
                        ? severity === 'Not classified' ? 'bg-gray-500 text-white' : 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {severity}
                  </button>
                ))}
              </div>
            </div>

            {/* Show Suppressed Problems */}
            <div className="flex items-center gap-4">
              <label className="w-40 text-right"></label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showSuppressed}
                  onChange={(e) => setShowSuppressed(e.target.checked)}
                  className="rounded"
                />
                <span>Show suppressed problems</span>
              </label>
            </div>

            {/* URLs Section */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="mb-4">
                <h3 className="font-medium mb-4">URLs</h3>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left font-medium text-sm text-gray-700 pb-2">Name</th>
                      <th className="text-left font-medium text-sm text-gray-700 pb-2">URL</th>
                      <th className="text-left font-medium text-sm text-gray-700 pb-2">Element</th>
                      <th className="text-left font-medium text-sm text-gray-700 pb-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {urls.map((url, index) => (
                      <tr key={index}>
                        <td className="pb-2">
                          <input
                            type="text"
                            value={url.name}
                            onChange={(e) => handleUrlChange(index, 'name', e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                          />
                        </td>
                        <td className="pb-2 px-2">
                          <input
                            type="text"
                            value={url.url}
                            onChange={(e) => handleUrlChange(index, 'url', e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                          />
                        </td>
                        <td className="pb-2 px-2">
                          <select
                            value={url.element}
                            onChange={(e) => handleUrlChange(index, 'element', e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                          >
                            <option>Host</option>
                            <option>Link</option>
                          </select>
                        </td>
                        <td className="pb-2 px-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveUrl(index)}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  type="button"
                  onClick={handleAddUrl}
                  className="text-blue-600 hover:underline text-sm mt-2"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="border border-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
