"use client";

import { useState } from "react";
import { Plus, Save, Trash2, Settings, Zap, Download, Upload } from "lucide-react";

/* =====================
   TYPES & NODE DEFINITIONS
===================== */
const NODE_TYPES = {
  router: { 
    label: "Router", 
    color: "#3b82f6", 
    bgColor: "#dbeafe",
    icon: "🔀"
  },
  firewall: { 
    label: "Firewall", 
    color: "#ef4444", 
    bgColor: "#fee2e2",
    icon: "🔥"
  },
  switch: { 
    label: "Switch", 
    color: "#8b5cf6", 
    bgColor: "#ede9fe",
    icon: "⚡"
  },
  cloud: { 
    label: "Cloud", 
    color: "#06b6d4", 
    bgColor: "#cffafe",
    icon: "☁️"
  },
  server: { 
    label: "Server", 
    color: "#10b981", 
    bgColor: "#d1fae5",
    icon: "🖥️"
  },
  pc: { 
    label: "PC", 
    color: "#f59e0b", 
    bgColor: "#fef3c7",
    icon: "💻"
  },
  proxy: { 
    label: "Proxy", 
    color: "#14b8a6", 
    bgColor: "#ccfbf1",
    icon: "🔒"
  },
  dmz: { 
    label: "DMZ", 
    color: "#ec4899", 
    bgColor: "#fce7f3",
    icon: "🛡️"
  },
};

type NodeType = {
  id: string;
  label: string;
  type: keyof typeof NODE_TYPES;
  x: number;
  y: number;
  metadata?: {
    model?: string;
    ip?: string;
    vlan?: string;
  };
};

type LinkType = {
  id: string;
  from: string;
  to: string;
  type: "solid" | "dashed";
  color?: string;
  label?: string;
};

/* =====================
   INITIAL TOPOLOGY (Based on Image)
===================== */
const initialNodes: NodeType[] = [
  // Top Layer - MPLS Clouds
  { id: "mpls1", label: "MPLS", type: "cloud", x: 150, y: 80 },
  { id: "mpls2", label: "MPLS", type: "cloud", x: 750, y: 80 },
  
  // SDWAN Branch Routers
  { id: "sdwan-branch", label: "SDWAN Branch RTR\nISR 1121X-8P", type: "router", x: 450, y: 120 },
  
  // WAN Aggregation Switches
  { id: "wan-agg-sw1", label: "WAN Agg. L2 SW1\nCat.2960-24P", type: "switch", x: 220, y: 300 },
  { id: "wan-agg-sw2", label: "WAN Agg. L2 SW2\nCat.2960-24P", type: "switch", x: 680, y: 300 },
  
  // MPLS Routers
  { id: "mpls-r1", label: "MPLS R1\nCat.3945", type: "router", x: 80, y: 320 },
  { id: "mpls-r2", label: "MPLS R2\nCat.3945", type: "router", x: 820, y: 320 },
  
  // SDWAN Routers
  { id: "sdwan-r1", label: "SDWAN R1\nCat.8200", type: "router", x: 80, y: 400 },
  { id: "sdwan-r2", label: "SDWAN R2\nCat.8200", type: "router", x: 820, y: 400 },
  
  // P2P Routers
  { id: "p2p-r1", label: "P2P R1", type: "router", x: 80, y: 480 },
  { id: "p2p-r2", label: "P2P R2", type: "router", x: 820, y: 480 },
  
  // DMZ Switches
  { id: "dmz-sw1", label: "DMZ L2 SW1\nCat.2960-16P", type: "switch", x: 120, y: 600 },
  { id: "dmz-sw2", label: "DMZ L2 SW2\nCat.2960-16P", type: "switch", x: 780, y: 600 },
  
  // Internet Routers
  { id: "tcl-internet", label: "TCL Internet RTR\nISR 1111X-4P", type: "router", x: 80, y: 720 },
  { id: "sify-internet", label: "Sify Internet RTR\nISR 1111X-4P", type: "router", x: 820, y: 720 },
  
  // Internet Clouds
  { id: "internet1", label: "Internet", type: "cloud", x: 80, y: 820 },
  { id: "internet2", label: "Internet", type: "cloud", x: 820, y: 820 },
  
  // SDWAN Branch Bottom
  { id: "sdwan-branch-bottom", label: "SDWAN Branch RTR", type: "router", x: 280, y: 820 },
  
  // Central Firewalls
  { id: "checkpoint-fw1", label: "FW1", type: "firewall", x: 380, y: 580 },
  { id: "checkpoint-fw2", label: "FW2", type: "firewall", x: 470, y: 580 },
  
  { id: "fortinet-fw1", label: "FW1", type: "firewall", x: 380, y: 740 },
  { id: "fortinet-fw2", label: "FW2", type: "firewall", x: 470, y: 740 },
  
  // Proxy
  { id: "proxy", label: "Proxy", type: "proxy", x: 560, y: 660 },
  
  // DC Application
  { id: "dc-app", label: "DC APP/DB", type: "server", x: 630, y: 550 },
];

const initialLinks: LinkType[] = [
  // MPLS to WAN Agg
  { id: "l1", from: "mpls1", to: "wan-agg-sw1", type: "solid", color: "#ef4444" },
  { id: "l2", from: "mpls2", to: "wan-agg-sw2", type: "solid", color: "#ef4444" },
  
  // SDWAN to WAN Agg
  { id: "l3", from: "sdwan-branch", to: "wan-agg-sw1", type: "dashed", color: "#ef4444" },
  { id: "l4", from: "sdwan-branch", to: "wan-agg-sw2", type: "dashed", color: "#ef4444" },
  
  // WAN Agg to MPLS Routers
  { id: "l5", from: "wan-agg-sw1", to: "mpls-r1", type: "solid" },
  { id: "l6", from: "wan-agg-sw2", to: "mpls-r2", type: "solid" },
  
  // WAN Agg to SDWAN Routers
  { id: "l7", from: "wan-agg-sw1", to: "sdwan-r1", type: "solid" },
  { id: "l8", from: "wan-agg-sw2", to: "sdwan-r2", type: "solid" },
  
  // Routers to P2P
  { id: "l9", from: "sdwan-r1", to: "p2p-r1", type: "solid" },
  { id: "l10", from: "sdwan-r2", to: "p2p-r2", type: "solid" },
  
  // P2P to DMZ
  { id: "l11", from: "p2p-r1", to: "dmz-sw1", type: "solid" },
  { id: "l12", from: "p2p-r2", to: "dmz-sw2", type: "solid" },
  
  // DMZ to Internet Routers
  { id: "l13", from: "dmz-sw1", to: "tcl-internet", type: "solid" },
  { id: "l14", from: "dmz-sw2", to: "sify-internet", type: "solid" },
  
  // Internet Routers to Internet
  { id: "l15", from: "tcl-internet", to: "internet1", type: "solid" },
  { id: "l16", from: "sify-internet", to: "internet2", type: "solid" },
  
  // Firewall connections
  { id: "l17", from: "wan-agg-sw1", to: "checkpoint-fw1", type: "dashed", color: "#ef4444" },
  { id: "l18", from: "wan-agg-sw2", to: "checkpoint-fw2", type: "dashed", color: "#ef4444" },
  { id: "l19", from: "checkpoint-fw1", to: "dc-app", type: "dashed", color: "#10b981" },
  { id: "l20", from: "checkpoint-fw2", to: "dc-app", type: "dashed", color: "#10b981" },
  
  { id: "l21", from: "dmz-sw1", to: "fortinet-fw1", type: "solid" },
  { id: "l22", from: "dmz-sw2", to: "fortinet-fw2", type: "solid" },
  
  // Proxy connections
  { id: "l23", from: "fortinet-fw1", to: "proxy", type: "solid" },
  { id: "l24", from: "fortinet-fw2", to: "proxy", type: "solid" },
];

/* =====================
   COMPONENT
===================== */
export default function TopologyMap() {
  const [nodes, setNodes] = useState<NodeType[]>(initialNodes);
  const [links, setLinks] = useState<LinkType[]>(initialLinks);
  const [dragging, setDragging] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showAddNodePanel, setShowAddNodePanel] = useState(false);
  const [newNodeType, setNewNodeType] = useState<keyof typeof NODE_TYPES>("router");
  const [linkMode, setLinkMode] = useState(false);
  const [linkStart, setLinkStart] = useState<string | null>(null);
  const [customNodeTypes, setCustomNodeTypes] = useState<typeof NODE_TYPES>(NODE_TYPES);

  /* =====================
     DRAG HANDLERS
  ===================== */
  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setNodes((prev) =>
      prev.map((n) =>
        n.id === dragging
          ? {
              ...n,
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
            }
          : n
      )
    );
  };

  const onMouseUp = () => setDragging(null);

  /* =====================
     NODE OPERATIONS
  ===================== */
  const addNode = () => {
    const id = `node-${Date.now()}`;
    const type = customNodeTypes[newNodeType];
    setNodes([
      ...nodes,
      { 
        id, 
        label: `${type.label} ${nodes.filter(n => n.type === newNodeType).length + 1}`, 
        type: newNodeType,
        x: 450, 
        y: 400 
      },
    ]);
    setShowAddNodePanel(false);
  };

  const deleteNode = (id: string) => {
    setNodes(nodes.filter((n) => n.id !== id));
    setLinks(links.filter((l) => l.from !== id && l.to !== id));
    if (selectedNode === id) setSelectedNode(null);
  };

  const updateNodeLabel = (id: string, label: string) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, label } : n));
  };

  /* =====================
     LINK OPERATIONS
  ===================== */
  const startLink = (nodeId: string) => {
    setLinkMode(true);
    setLinkStart(nodeId);
  };

  const completeLink = (nodeId: string) => {
    if (linkStart && linkStart !== nodeId) {
      const id = `link-${Date.now()}`;
      setLinks([...links, { id, from: linkStart, to: nodeId, type: "solid" }]);
    }
    setLinkMode(false);
    setLinkStart(null);
  };

  const deleteLink = (id: string) => {
    setLinks(links.filter(l => l.id !== id));
  };

  const toggleLinkType = (id: string) => {
    setLinks(links.map(l => 
      l.id === id ? { ...l, type: l.type === "solid" ? "dashed" : "solid" } : l
    ));
  };

  /* =====================
     CUSTOM NODE TYPE MANAGEMENT
  ===================== */
  const addCustomNodeType = (key: string, config: typeof NODE_TYPES[keyof typeof NODE_TYPES]) => {
    setCustomNodeTypes({ ...customNodeTypes, [key]: config });
  };

  const removeNodeType = (key: keyof typeof NODE_TYPES) => {
    const { [key]: removed, ...rest } = customNodeTypes;
    setCustomNodeTypes(rest as typeof NODE_TYPES);
    // Remove all nodes of this type
    setNodes(nodes.filter(n => n.type !== key));
  };

  /* =====================
     SAVE/LOAD
  ===================== */
  const saveTopology = () => {
    const data = { nodes, links, customNodeTypes };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "topology.json";
    a.click();
  };

  const loadTopology = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        setNodes(data.nodes || []);
        setLinks(data.links || []);
        setCustomNodeTypes(data.customNodeTypes || NODE_TYPES);
      } catch (error) {
        alert("Error loading topology file");
      }
    };
    reader.readAsText(file);
  };

  /* =====================
     RENDER
  ===================== */
  const selectedNodeData = selectedNode ? nodes.find(n => n.id === selectedNode) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Network Topology Designer
              </h1>
              <p className="text-sm text-slate-400 mt-1">Design and visualize your network infrastructure</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddNodePanel(!showAddNodePanel)}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-lg font-medium transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
              >
                <Plus size={18} /> Add Node
              </button>
              
              <button
                onClick={saveTopology}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-all flex items-center gap-2"
              >
                <Download size={18} /> Export
              </button>
              
              <label className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-all flex items-center gap-2 cursor-pointer">
                <Upload size={18} /> Import
                <input type="file" accept=".json" onChange={loadTopology} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-88px)]">
        {/* Sidebar - Node Types */}
        <aside className="w-64 border-r border-slate-700 bg-slate-900/30 p-4 overflow-y-auto">
          <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
            <Zap size={16} className="text-cyan-400" /> Node Types
          </h3>
          
          <div className="space-y-2">
            {Object.entries(customNodeTypes).map(([key, config]) => (
              <div
                key={key}
                className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded flex items-center justify-center text-lg"
                      style={{ backgroundColor: config.bgColor }}
                    >
                      {config.icon}
                    </div>
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>
                  
                  <button
                    onClick={() => removeNodeType(key as keyof typeof NODE_TYPES)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                    title="Remove this node type"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                
                <div className="mt-2 text-xs text-slate-500">
                  {nodes.filter(n => n.type === key).length} in use
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
            <p className="text-xs text-slate-400">
              💡 Click nodes to edit, drag to reposition, and use link mode to connect devices.
            </p>
          </div>
        </aside>

        {/* Main Canvas */}
        <main className="flex-1 relative overflow-hidden">
          {/* Add Node Panel */}
          {showAddNodePanel && (
            <div className="absolute top-4 left-4 z-10 bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-2xl w-80">
              <h3 className="text-lg font-bold mb-3">Add New Node</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Node Type</label>
                  <select
                    value={newNodeType}
                    onChange={(e) => setNewNodeType(e.target.value as keyof typeof NODE_TYPES)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  >
                    {Object.entries(customNodeTypes).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.icon} {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={addNode}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-lg font-medium transition-all"
                  >
                    Create Node
                  </button>
                  <button
                    onClick={() => setShowAddNodePanel(false)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Selected Node Panel */}
          {selectedNodeData && (
            <div className="absolute top-4 right-4 z-10 bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-2xl w-80">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold">Node Details</h3>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Label</label>
                  <input
                    type="text"
                    value={selectedNodeData.label}
                    onChange={(e) => updateNodeLabel(selectedNode, e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Type</label>
                  <div className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg flex items-center gap-2">
                    <span className="text-lg">{customNodeTypes[selectedNodeData.type].icon}</span>
                    <span>{customNodeTypes[selectedNodeData.type].label}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="px-3 py-2 bg-slate-900 rounded-lg">
                    <div className="text-slate-500">Position X</div>
                    <div className="font-mono">{Math.round(selectedNodeData.x)}</div>
                  </div>
                  <div className="px-3 py-2 bg-slate-900 rounded-lg">
                    <div className="text-slate-500">Position Y</div>
                    <div className="font-mono">{Math.round(selectedNodeData.y)}</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => startLink(selectedNode)}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-all"
                  >
                    Create Link
                  </button>
                  <button
                    onClick={() => deleteNode(selectedNode)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SVG Canvas */}
          <svg
            width="100%"
            height="100%"
            className="bg-slate-900"
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            style={{ cursor: linkMode ? "crosshair" : "default" }}
          >
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="#334155" opacity="0.3" />
              </pattern>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* LINKS */}
            {links.map((link) => {
              const from = nodes.find((n) => n.id === link.from);
              const to = nodes.find((n) => n.id === link.to);
              if (!from || !to) return null;

              return (
                <g key={link.id}>
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={link.color || "#64748b"}
                    strokeWidth={2}
                    strokeDasharray={link.type === "dashed" ? "5,5" : "none"}
                    className="hover:stroke-cyan-400 transition-colors cursor-pointer"
                    onClick={() => toggleLinkType(link.id)}
                  />
                  {link.label && (
                    <text
                      x={(from.x + to.x) / 2}
                      y={(from.y + to.y) / 2}
                      textAnchor="middle"
                      fontSize={10}
                      fill="#94a3b8"
                      className="pointer-events-none"
                    >
                      {link.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* NODES */}
            {nodes.map((node) => {
              const typeConfig = customNodeTypes[node.type];
              const isSelected = selectedNode === node.id;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (linkMode) {
                      completeLink(node.id);
                    } else {
                      setDragging(node.id);
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!linkMode) {
                      setSelectedNode(node.id);
                    }
                  }}
                  style={{ cursor: linkMode ? "crosshair" : "move" }}
                  className="transition-all"
                >
                  {isSelected && (
                    <circle
                      r={45}
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      strokeDasharray="4,4"
                      className="animate-pulse"
                    />
                  )}

                  <rect
                    x={-35}
                    y={-25}
                    width={70}
                    height={50}
                    rx={8}
                    fill={typeConfig.bgColor}
                    stroke={typeConfig.color}
                    strokeWidth={2}
                    filter={isSelected ? "url(#glow)" : "none"}
                    className="transition-all hover:stroke-cyan-400"
                  />

                  <text
                    y={5}
                    textAnchor="middle"
                    fontSize={20}
                    className="pointer-events-none"
                  >
                    {typeConfig.icon}
                  </text>

                  <text
                    y={40}
                    textAnchor="middle"
                    fontSize={10}
                    fill="#1e293b"
                    fontWeight="600"
                    className="pointer-events-none"
                  >
                    {node.label.split('\n').map((line, i) => (
                      <tspan key={i} x="0" dy={i === 0 ? 0 : 12}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Link Mode Indicator */}
          {linkMode && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-cyan-500 text-white rounded-full font-medium shadow-lg animate-pulse">
              Click a node to complete the link
            </div>
          )}
        </main>
      </div>
    </div>
  );
}