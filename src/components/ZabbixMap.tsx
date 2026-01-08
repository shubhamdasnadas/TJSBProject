'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Spin, Modal, Select } from 'antd';
import { Link } from 'lucide-react';

/* ================= TYPES ================= */
export type MapNodeProblem = {
  eventid: string;
  name: string;
  severity: string;
  lastchange?: string;
};

export type MapNodeProps = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  icon: string;
  label: string;
  problems?: MapNodeProblem[];
  size: IconSize;
  onMove?: (id: string, pos: { x: number; y: number }) => void;
  onDragEnd?: (id: string, pos: { x: number; y: number }) => void;
  onDelete?: (id: string) => void;
};

/* ================= SEVERITY ================= */
const SEVERITY_LABEL: Record<string, string> = {
  '0': 'Info',
  '1': 'Info',
  '2': 'Warning',
  '3': 'Average',
  '4': 'High',
  '5': 'Disaster',
};

const SEVERITY_COLOR: Record<string, string> = {
  '0': 'text-slate-400',
  '1': 'text-blue-400',
  '2': 'text-yellow-400',
  '3': 'text-orange-400',
  '4': 'text-red-400',
  '5': 'text-red-600',
};

const SEVERITY_BG: Record<string, string> = {
  '0': 'bg-slate-500/20',
  '1': 'bg-blue-500/20',
  '2': 'bg-yellow-500/20',
  '3': 'bg-orange-500/20',
  '4': 'bg-red-500/20',
  '5': 'bg-red-600/30',
};

const worstSeverity = (p: MapNodeProblem[]) =>
  p.reduce((m, x) => Math.max(m, Number(x.severity)), -1);

/* ================= COMPONENT ================= */
function MapNode({
  id,
  x,
  y,
  width,
  height,
  icon,
  label,
  problems = [],
  size,
  onMove,
  onDragEnd,
  onDelete,
}: MapNodeProps) {
  const [hover, setHover] = useState(false);
  const hasProblems = problems.length > 0;
  const worst = hasProblems ? worstSeverity(problems) : -1;
  const [dragging, setDragging] = useState(false);
  const offsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    offsetRef.current = { dx: e.clientX - x, dy: e.clientY - y };
    setHover(false);
    setDragging(true);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!dragging) return;
      const nx = e.clientX - offsetRef.current.dx;
      const ny = e.clientY - offsetRef.current.dy;
      onMove?.(id, { x: nx, y: ny });
    };
    const handleUp = () => {
      if (!dragging) return;
      setDragging(false);
      onDragEnd?.(id, { x, y });
    };
    window.addEventListener('mousemove', handleMove, true);
    window.addEventListener('mouseup', handleUp, true);
    return () => {
      window.removeEventListener('mousemove', handleMove, true);
      window.removeEventListener('mouseup', handleUp, true);
    };
  }, [dragging, id, onMove, onDragEnd, x, y]);

  return (
    <div
      style={{
        left: x,
        top: y,
        width,
        height,
        cursor: dragging ? 'grabbing' : 'grab',
        zIndex: hover ? 100 : 10,
      }}
      className="absolute select-none"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onMouseDown={handleMouseDown}
    >
      {/* ICON CONTAINER */}
      <div
        className={`
          relative w-full h-full rounded-xl
          flex items-center justify-center
          transition-all duration-300
          bg-slate-800
          border-2
          ${
            hasProblems
              ? hover
                ? 'border-red-500 shadow-lg shadow-red-500/50'
                : 'border-red-500/50'
              : hover
                ? 'border-emerald-500 shadow-lg shadow-emerald-500/30'
                : 'border-slate-600'
          }
        `}
        style={{ transform: 'scale(0.62)', transformOrigin: 'center' }}
      >
        {/* Problem indicator badge */}
        {hasProblems && (
          <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
            {problems.length}
          </div>
        )}

        {/* Delete button */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(id);
            }}
            className="absolute -top-3 -left-3 bg-red-700 hover:bg-red-800 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-lg text-xs font-bold transition-colors"
            title="Delete device"
          >
            ✕
          </button>
        )}

        <img
          src={icon}
          alt=""
          className={`${ICON_SIZE_CLASS[size]} object-contain select-none drop-shadow-lg`}
          draggable={false}
          style={{ marginTop: icon.includes('server.svg') ? 8 : 0 }}
        />
      </div>

      {/* LABEL */}
      {!dragging && (
        <div
          className={`
            mt-2 px-3 py-1.5
            text-xs font-semibold text-center
            rounded-lg border-2
            transition-all duration-200
            ${
              hasProblems
                ? 'bg-red-950 border-red-600/50 text-red-100'
                : 'bg-slate-800 border-slate-600 text-slate-100'
            }
            truncate shadow-lg
          `}
          style={{ width: Math.max(width, 140) }}
          aria-hidden={dragging}
        >
          {label}
        </div>
      )}

      {/* LATEST PROBLEM - ALWAYS VISIBLE */}
      <div
        className="mt-1 px-3 py-1 text-xs rounded-md truncate"
        style={{ width: Math.max(width, 180) }}
      >
        {hasProblems ? (
          (() => {
            const latest = problems.reduce((a, b) =>
              Number(b.lastchange ?? 0) > Number(a.lastchange ?? 0) ? b : a
            );
            return (
              <span
                className={`${SEVERITY_COLOR[latest.severity] || 'text-red-400'} font-medium`}
              >
                {latest.name}
              </span>
            );
          })()
        ) : (
          <span className="text-emerald-400 font-semibold">● OK</span>
        )}
      </div>

      {/* HOVER PANEL - ALL PROBLEMS */}
      {hover && hasProblems && (
        <div
          className="
            absolute top-full left-1/2 -translate-x-1/2 mt-3 transform
            w-[360px]
            rounded-xl border-2 border-red-500/60
            bg-slate-900
            shadow-2xl shadow-red-500/20
            z-[200]
          "
          style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
          <div className="px-4 py-3 text-sm font-bold border-b-2 border-slate-700 flex justify-between items-center">
            <span className="text-red-400">🔥 Active Problems</span>
            <span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-xs">
              {problems.length}
            </span>
          </div>
          <div className="max-h-72 overflow-y-auto p-3 space-y-2">
            {problems.map((p) => (
              <div
                key={p.eventid}
                className={`
                  rounded-lg p-3 text-xs
                  border-l-4 transition-all duration-200 hover:scale-[1.02]
                  ${SEVERITY_BG[p.severity] || 'bg-slate-800'}
                `}
                style={{
                  borderColor:
                    p.severity === '5'
                      ? '#dc2626'
                      : p.severity === '4'
                        ? '#ef4444'
                        : p.severity === '3'
                          ? '#f97316'
                          : '#eab308',
                }}
              >
                <div className={`font-bold mb-1 ${SEVERITY_COLOR[p.severity]}`}>
                  {SEVERITY_LABEL[p.severity]}
                </div>
                <div className="text-slate-200 leading-relaxed">{p.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= MAP TYPES ================= */

type MapSelement = {
  selementid: string;
  elementtype: string;
  x: string;
  y: string;
  width?: string;
  height?: string;
  iconid_off?: string;
  elements?: { hostid: string }[];
  size?: IconSize;
};

type MapLink = {
  linkid: string;
  selementid1: string;
  selementid2: string;
};

type ZabbixMap = {
  name: string;
  width: string;
  height: string;
  selements: MapSelement[];
  links: MapLink[];
};

type ZabbixHost = {
  hostid: string;
  name: string;
};

/* ================= ICON MAP ================= */

const ICON_MAP: Record<string, string> = {
  '181': '/zabbix/icons/pc.svg',
  '26': '/zabbix/icons/firewall.svg',
  '152': '/zabbix/icons/switch.svg',
  '96': '/zabbix/icons/nas.svg',
};

const DEFAULT_ICON = '/zabbix/icons/server.svg';

/* ================= ICON OPTIONS ================= */
const ICON_OPTIONS = [
  '/zabbix/icons/server.svg',
  '/zabbix/icons/pc.svg',
  '/zabbix/icons/firewall.svg',
  '/zabbix/icons/switch.svg',
  '/zabbix/icons/nas.svg',
];

/* ================= ICON SIZING ================= */
type IconSize = 'small' | 'medium' | 'large';

const ICON_SIZE_CLASS: Record<IconSize, string> = {
  small: 'w-1/2 h-1/2',
  medium: 'w-2/3 h-2/3',
  large: 'w-full h-full',
};

const NODE_SIZE: Record<IconSize, { width: number; height: number }> = {
  small: { width: 48, height: 48 },
  medium: { width: 200, height: 200 },
  large: { width: 96, height: 96 },
};

/* ================= IMPROVED LAYOUT WITH BETTER SPACING ================= */

type LayoutNode = {
  id: string;
  width: number;
  height: number;
  type: string;
};

type LayoutOptions = {
  startX?: number;
  startY?: number;
  laneGap?: number;
  itemGap?: number;
};

const LANES: Record<string, number> = {
  core: 0,
  security: 1,
  network: 2,
  server: 3,
  storage: 4,
  client: 5,
  unknown: 6,
};

const DEFAULT_LAYOUT_OPTS: LayoutOptions = {
  startX: 150,
  startY: 150,
  laneGap: 400,
  itemGap: 650,
};

function computeLayout(
  nodes: LayoutNode[],
  opts: LayoutOptions = {},
  connectionCount: Record<string, number> = {}
) {
  const {
    startX = DEFAULT_LAYOUT_OPTS.startX!,
    startY = DEFAULT_LAYOUT_OPTS.startY!,
    laneGap = DEFAULT_LAYOUT_OPTS.laneGap!,
    itemGap = DEFAULT_LAYOUT_OPTS.itemGap!,
  } = opts;

  const lanes: Record<number, LayoutNode[]> = {};

  // Group by lane
  for (const n of nodes) {
    const lane = LANES[n.type] ?? LANES.unknown;
    if (!lanes[lane]) lanes[lane] = [];
    lanes[lane].push(n);
  }

  const positions: Record<string, { x: number; y: number }> = {};

  Object.entries(lanes).forEach(([laneIndex, laneNodes]) => {
    const maxLaneHeight = Math.max(...laneNodes.map((n) => n.height));
    const y = startY + Number(laneIndex) * (laneGap + maxLaneHeight * 0.5);
    let x = startX;

    laneNodes.forEach((n) => {
      positions[n.id] = { x, y };

      const degree = connectionCount[n.id] || 0;
      const dynamicGap = itemGap + degree * 300;

      x += n.width + dynamicGap;
    });
  });

  return positions;
}

const inferLane = (hostName?: string, iconId?: string) => {
  const name = (hostName || '').toLowerCase();

  if (name.includes('tally')) return 'server';
  if (name.includes('r250') || name.includes('poweredge')) return 'server';
  if (name.includes('pcplnas') || name.includes('pcpl nas')) return 'storage';

  if (name.includes('firewall') || name.includes('fw') || name.includes('pcpl_firewall'))
    return 'security';
  if (name.includes('switch') || name.includes('fortiswitch')) return 'network';
  if (name.includes('router')) return 'network';
  if (name.includes('server') || name.includes('srv')) return 'server';
  if (name.includes('nas') || name.includes('storage')) return 'storage';
  if (name.includes('desktop') || name.includes('pc') || name.includes('ltpc')) return 'client';

  if (iconId === '26') return 'security';
  if (iconId === '152') return 'network';
  if (iconId === '96') return 'storage';
  if (iconId === '181') return 'client';

  return 'unknown';
};

/* ================= PAGE COMPONENT ================= */

interface ZabbixMapProps {
  mapId: string;
}

export default function ZabbixMap({ mapId }: ZabbixMapProps) {
  const [map, setMap] = useState<ZabbixMap | null>(null);
  const [hostsById, setHostsById] = useState<Record<string, ZabbixHost>>({});
  const [problemsByHost, setProblemsByHost] = useState<Record<string, MapNodeProblem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const originalPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const layoutAppliedRef = useRef(false);

  /* ================= ADD DEVICE MODAL ================= */
  const [addOpen, setAddOpen] = useState(false);
  const [deviceType, setDeviceType] = useState<string>();
  const [selectedHost, setSelectedHost] = useState<string>();
  const [selectedIcon, setSelectedIcon] = useState<string>();
  const [selectedSize, setSelectedSize] = useState<IconSize>('large');

  /* ================= WIRING & POSITIONS ================= */
  const [wireOpen, setWireOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState<{ from?: string; to?: string }>({});
  const [links, setLinks] = useState<MapLink[]>([]);

  const connectionCount = useMemo(() => {
    const map: Record<string, number> = {};
    links.forEach((l) => {
      map[l.selementid1] = (map[l.selementid1] || 0) + 1;
      map[l.selementid2] = (map[l.selementid2] || 0) + 1;
    });
    return map;
  }, [links]);

  /* ================= FETCH MAP (via proxy) ================= */

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('zabbix_auth') : null;
    if (!token) {
      setError('No auth token found. Please login first.');
      setLoading(false);
      return;
    }

    const payload = {
      jsonrpc: '2.0',
      method: 'map.get',
      params: {
        output: ['mapid', 'name', 'width', 'height', 'grid', 'show_unack'],
        selectSelements: ['selementid', 'elementtype', 'x', 'y', 'width', 'height', 'iconid_off', 'elements'],
        selectLinks: ['linkid', 'selementid1', 'selementid2'],
        sysmapids: [mapId],
        limit: 1,
      },
      auth: token,
      id: 1,
    };

    fetch('/api/zabbix-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(r => r.json())
      .then(json => {
        if (!json?.result?.length) {
          setError('No maps returned from Zabbix');
          return;
        }
        const mapData = json.result[0];
        setMap(mapData);
        setLinks(mapData.links || []);

        // Snapshot original positions once for reset
        const basePositions: Record<string, { x: number; y: number }> = {};
        mapData.selements.forEach((s: any) => {
          basePositions[s.selementid] = {
            x: Number(s.x),
            y: Number(s.y),
          };
        });
        originalPositionsRef.current = basePositions;
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [mapId]);

  /* ================= HOST IDS ================= */

  const hostIds = useMemo(() => {
    if (!map) return [];
    return map.selements.flatMap((s) => s.elements ?? []).map((e) => e.hostid);
  }, [map]);

  /* ================= FETCH HOSTS (via proxy) ================= */

  useEffect(() => {
    if (!hostIds.length) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('zabbix_auth') : null;
    if (!token) return;

    const uniqueIds = Array.from(new Set(hostIds));
    const payload = {
      jsonrpc: '2.0',
      method: 'host.get',
      params: {
        output: ['hostid', 'name', 'status'],
        hostids: uniqueIds,
        selectInterfaces: ['type', 'ip'],
      },
      auth: token,
      id: 2,
    };

    fetch('/api/zabbix-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((json) => {
        const map: Record<string, ZabbixHost> = {};
        const items = Array.isArray(json?.result) ? json.result : [];
        items.forEach((h: any) => {
          map[String(h.hostid)] = { hostid: String(h.hostid), name: h.name };
        });
        setHostsById(map);
      })
      .catch(() => setHostsById({}));
  }, [hostIds]);

  /* ================= FETCH ACTIVE PROBLEMS (via proxy) ================= */

  useEffect(() => {
    if (!hostIds.length) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('zabbix_auth') : null;
    if (!token) return;

    const uniqueIds = Array.from(new Set(hostIds));
    const payload = {
      jsonrpc: '2.0',
      method: 'trigger.get',
      params: {
        output: ['triggerid', 'description', 'priority', 'status', 'lastchange', 'value'],
        hostids: uniqueIds,
        filter: { value: 1, state: 0 },
        expandDescription: true,
        selectHosts: ['hostid', 'name'],
        search: { status: 0 },
        searchWildcardsEnabled: true,
        sortfield: ['priority'],
        limit: 100,
      },
      auth: token,
      id: 3,
    };

    fetch('/api/zabbix-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((json) => {
        const grouped: Record<string, MapNodeProblem[]> = {};
        const items: any[] = Array.isArray(json?.result) ? json.result : [];
        items.forEach((t: any) => {
          const hid = t?.hosts?.[0]?.hostid ? String(t.hosts[0].hostid) : undefined;
          if (!hid) return;
          const entry: MapNodeProblem = {
            eventid: String(t.triggerid),
            name: t.description,
            severity: String(t.priority ?? '0'),
            lastchange: String(t.lastchange ?? '0'),
          };
          if (!grouped[hid]) grouped[hid] = [];
          grouped[hid].push(entry);
        });
        setProblemsByHost(grouped);
      })
      .catch(() => setProblemsByHost({}));
  }, [hostIds]);

  /* ================= HANDLERS ================= */

  const handleAddDevice = () => {
    if (!selectedHost || !selectedIcon || !deviceType || !map) {
      return;
    }

    const newSelementId = `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const hostName = hostsById[selectedHost]?.name || 'New Device';

    let newX = 300;
    let newY = 300;
    if (map.selements.length > 0) {
      const lastElement = map.selements[map.selements.length - 1];
      newX = Number(lastElement.x) + 150;
      newY = Number(lastElement.y) + 100;
    }

    const size = NODE_SIZE[selectedSize];

    const newSelement: MapSelement = {
      selementid: newSelementId,
      elementtype: '2',
      x: String(newX),
      y: String(newY),
      width: String(size.width),
      height: String(size.height),
      size: selectedSize,
      iconid_off: Object.keys(ICON_MAP).find((k) => ICON_MAP[k] === selectedIcon) || '1',
      elements: [{ hostid: selectedHost }],
    };

    setMap((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        selements: [...prev.selements, newSelement],
      };
    });

    originalPositionsRef.current[newSelementId] = { x: newX, y: newY };

    setDeviceType(undefined);
    setSelectedHost(undefined);
    setSelectedIcon(undefined);
    setSelectedSize('large');
    setAddOpen(false);

    console.log('✅ Device added:', { hostName, deviceType, newSelementId });
  };

  const handleDeleteDevice = (selementId: string) => {
    if (!map) return;

    const deviceToDelete = map.selements.find((s) => s.selementid === selementId);
    const hostName = deviceToDelete?.elements?.[0]?.hostid
      ? hostsById[deviceToDelete.elements[0].hostid]?.name
      : 'Unknown';

    setMap((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        selements: prev.selements.filter((s) => s.selementid !== selementId),
      };
    });

    setLinks((prev) =>
      prev.filter((l) => l.selementid1 !== selementId && l.selementid2 !== selementId)
    );

    const op = { ...originalPositionsRef.current };
    delete op[selementId];
    originalPositionsRef.current = op;

    console.log('🗑️ Device deleted:', { hostName, selementId });
  };

  const handleWireDevices = () => {
    if (!linkDraft.from || !linkDraft.to) return;

    const newLink: MapLink = {
      linkid: `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      selementid1: linkDraft.from,
      selementid2: linkDraft.to,
    };

    setLinks((prev) => [...prev, newLink]);
    setWireOpen(false);
    setLinkDraft({});

    console.log('🔗 Link created:', newLink);
  };

  const handleResetPositions = () => {
    if (!map) return;
    const originals = originalPositionsRef.current;
    setMap((prev) => {
      if (!prev) return prev;
      const next = { ...prev } as ZabbixMap;
      next.selements = prev.selements.map((s) => {
        const orig = originals[s.selementid];
        if (!orig) return s;
        return {
          ...s,
          x: String(Math.round(orig.x)),
          y: String(Math.round(orig.y)),
        };
      });
      return next;
    });
  };

  const resolveIcon = (s: MapSelement, hostName?: string) => {
    const name = (hostName || '').toLowerCase();
    if (name.includes('pcpl nas') || name.includes('pcplnas')) {
      return '/zabbix/icons/nas.svg';
    }
    return ICON_MAP[s.iconid_off ?? ''] ?? DEFAULT_ICON;
  };

  const center = (s: MapSelement) => {
    const w = Number(s.width ?? 96);
    const h = Number(s.height ?? 96);
    const x = Number(s.x);
    const y = Number(s.y);

    const wireOffset = 60;

    return {
      x,
      y,
      cx: x + w / 2,
      cy: y + h + wireOffset,
      w,
      h,
    };
  };

  const computePosition = (s: MapSelement, hostName?: string) => {
    const base = center(s);
    let { x, y, w, h } = base;
    const name = (hostName || '').toLowerCase();

    if (name.includes('tally')) {
      y = base.y - 180;
      x = base.x + 200;
    } else if (
      name.includes('nas') ||
      name.includes('pcpl nas') ||
      name.includes('pcplnas') ||
      name.includes('pcpal nas')
    ) {
      y = base.y + 220;
      x = base.x + 180;
    } else if (name.includes('poweredge') || name.includes('r250')) {
      y = base.y + 1;
      x = base.x + 180;
    }

    return { x, y, w, h, cx: x + w / 2, cy: y + h + 60 };
  };

  const moveSelement = (selementId: string, pos: { x: number; y: number }) => {
    setMap((prev) => {
      if (!prev) return prev;
      const next = { ...prev } as ZabbixMap;
      next.selements = prev.selements.map((s) =>
        s.selementid === selementId
          ? { ...s, x: String(Math.round(pos.x)), y: String(Math.round(pos.y)) }
          : s
      );
      return next;
    });
  };

  useEffect(() => {
    if (!map || layoutAppliedRef.current) return;
    if (!map.selements.length) return;

    const allZero = map.selements.every((s) => Number(s.x) === 0 && Number(s.y) === 0);
    if (!allZero) return;

    const layoutNodes: LayoutNode[] = map.selements.map((s) => {
      const hostId = s.elements?.[0]?.hostid;
      const hostName = hostId ? hostsById[hostId]?.name : undefined;
      return {
        id: s.selementid,
        width: Number(s.width ?? NODE_SIZE.large.width),
        height: Number(s.height ?? NODE_SIZE.large.height),
        type: inferLane(hostName, s.iconid_off),
      };
    });

    const positions = computeLayout(layoutNodes, DEFAULT_LAYOUT_OPTS, connectionCount);

    setMap((prev) => {
      if (!prev) return prev;
      const next = { ...prev } as ZabbixMap;
      next.selements = prev.selements.map((s) => {
        const pos = positions[s.selementid];
        return pos ? { ...s, x: String(pos.x), y: String(pos.y) } : s;
      });
      return next;
    });

    const nextOriginals: Record<string, { x: number; y: number }> = {};
    map.selements.forEach((s) => {
      const pos = positions[s.selementid];
      const x = pos ? pos.x : Number(s.x);
      const y = pos ? pos.y : Number(s.y);
      nextOriginals[s.selementid] = { x, y };
    });
    originalPositionsRef.current = nextOriginals;
    layoutAppliedRef.current = true;
  }, [map, hostsById, connectionCount]);

  /* ================= RENDER ================= */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <Spin size="large" />
          <p className="mt-4 text-slate-400">Loading Zabbix Map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="bg-red-950/50 border-2 border-red-600 rounded-xl p-6 max-w-md">
          <h2 className="text-red-400 font-bold text-lg mb-2">Error</h2>
          <p className="text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  if (!map) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <p className="text-slate-400">No map available</p>
      </div>
    );
  }

  const baseWidth = Number(map.width);
  const baseHeight = Number(map.height);
  const width = Math.max(baseWidth, 3500);
  const height = Math.max(baseHeight, 2500);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>



      <Card
        title={
          <div className="flex items-center justify-between w-full">
            <div>
              <span className="text-xl font-bold text-slate-100">📊 {map.name}</span>
              <div className="text-sm text-slate-400">
                {map.selements.length} devices • {links.length} connections
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleResetPositions}
                className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-700 text-white text-sm font-semibold shadow transition-colors"
              >
                🔄 Reset Layout
              </button>
              <button
                onClick={() => setWireOpen(true)}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow transition-colors"
              >
                🔗 Wire Devices
              </button>
              <button
                onClick={() => setAddOpen(true)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow transition-colors"
              >
                ➕ Add Device
              </button>
            </div>
          </div>
        }
        className="shadow-2xl border-2 border-slate-700 bg-slate-900"
        styles={{
          header: {
            background: 'linear-gradient(135deg, rgb(30 41 59) 0%, rgb(15 23 42) 100%)',
            borderBottom: '2px solid rgb(51 65 85)',
          },
          body: { padding: '24px' },
        }}
      >
        <div
          className="overflow-auto relative bg-slate-950/70 rounded-lg border-2 border-slate-800"
          style={{
            height: Math.min(height, 800), // Ensure it does not exceed viewport too much
            minHeight: 400,
          }}
        >
          {/* Inner scrollable canvas */}
          <div
            className="relative"
            style={{
              width,
              height,
              minWidth: width,
              minHeight: height,
            }}
          >
            {/* Grid pattern overlay */}
            <div
              className="absolute inset-0 opacity-5 pointer-events-none"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(148, 163, 184, 0.3) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(148, 163, 184, 0.3) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px',
              }}
            />

            {/* LINKS */}
            <svg
              className="absolute inset-0"
              width={width}
              height={height}
              style={{ pointerEvents: 'none' }}
            >
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="wireGradientOk" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#22c55e" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0.3" />
                </linearGradient>
                <linearGradient id="wireGradientError" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#ef4444" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              {links.map((l, idx) => {
                const a = map.selements.find((s) => s.selementid === l.selementid1);
                const b = map.selements.find((s) => s.selementid === l.selementid2);
                if (!a || !b) return null;

                const aHostId = a.elements?.[0]?.hostid;
                const bHostId = b.elements?.[0]?.hostid;

                const pa = computePosition(a, aHostId ? hostsById[aHostId]?.name : undefined);
                const pb = computePosition(b, bHostId ? hostsById[bHostId]?.name : undefined);

                const connectionKey = [l.selementid1, l.selementid2].sort().join('-');
                const sameConnectionLinks = links.filter((link) => {
                  const key = [link.selementid1, link.selementid2].sort().join('-');
                  return key === connectionKey;
                });
                const linkIndex = sameConnectionLinks.findIndex((link) => link.linkid === l.linkid);
                const totalSameConnections = sameConnectionLinks.length;

                const fanOffset = totalSameConnections > 1 ? (linkIndex - (totalSameConnections - 1) / 2) * 50 : 0;

                const aProblems = aHostId ? problemsByHost[aHostId] ?? [] : [];
                const bProblems = bHostId ? problemsByHost[bHostId] ?? [] : [];
                const hasProblems = aProblems.length > 0 || bProblems.length > 0;

                const midX = (pa.cx + pb.cx) / 2;
                const midY = (pa.cy + pb.cy) / 2;
                const controlY = midY - 50;

                const pathD = `M ${pa.cx + fanOffset} ${pa.cy} Q ${midX} ${controlY} ${pb.cx - fanOffset} ${pb.cy}`;

                return (
                  <g key={l.linkid}>
                    <path
                      d={pathD}
                      stroke={hasProblems ? 'url(#wireGradientError)' : 'url(#wireGradientOk)'}
                      strokeWidth={4}
                      fill="none"
                      opacity={0.5}
                      filter="url(#glow)"
                    />
                    <path
                      d={pathD}
                      stroke={hasProblems ? '#ef4444' : '#22c55e'}
                      strokeWidth={2}
                      fill="none"
                      opacity={0.9}
                    />
                  </g>
                );
              })}
            </svg>

            {/* NODES */}
            {map.selements.map((s) => {
              const hostId = s.elements?.[0]?.hostid;
              const host = hostId ? hostsById[hostId] : undefined;
              const problems = hostId ? problemsByHost[hostId] ?? [] : [];

              const baseSize = computePosition(s, host?.name);
              return (
                <MapNode
                  key={s.selementid}
                  id={s.selementid}
                  x={baseSize.x}
                  y={baseSize.y}
                  width={baseSize.w}
                  height={baseSize.h}
                  icon={resolveIcon(s, host?.name)}
                  label={host?.name ?? 'Unknown'}
                  problems={problems}
                  size={s.size ?? 'large'}
                  onMove={moveSelement}
                  onDelete={handleDeleteDevice}
                />
              );
            })}
          </div>
        </div>
      </Card>

      {/* ADD DEVICE MODAL */}
      <Modal
        open={addOpen}
        onCancel={() => {
          setDeviceType(undefined);
          setSelectedHost(undefined);
          setSelectedIcon(undefined);
          setSelectedSize('large');
          setAddOpen(false);
        }}
        title="Add Device to Map"
        onOk={handleAddDevice}
        okText="Add Device"
        okButtonProps={{
          disabled: !selectedHost || !selectedIcon || !deviceType,
        }}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Device Type</label>
            <Select
              className="w-full"
              placeholder="Select device type"
              value={deviceType}
              onChange={setDeviceType}
              options={[
                { value: 'server', label: 'Server' },
                { value: 'pc', label: 'PC / Desktop' },
                { value: 'network', label: 'Network Device' },
                { value: 'storage', label: 'Storage / NAS' },
              ]}
            />
          </div>

          <div>
            <label className="text-sm text-slate-300 mb-1 block">Map to Host</label>
            <Select
              className="w-full"
              placeholder="Select host"
              value={selectedHost}
              onChange={setSelectedHost}
              showSearch
              optionFilterProp="label"
              options={Object.values(hostsById).map((h) => ({
                value: h.hostid,
                label: h.name,
              }))}
            />
          </div>

          <div>
            <label className="text-sm text-slate-300 mb-1 block">Device Icon</label>
            <Select
              className="w-full"
              placeholder="Select icon"
              value={selectedIcon}
              onChange={setSelectedIcon}
              options={ICON_OPTIONS.map((i) => ({
                value: i,
                label: i.split('/').pop(),
              }))}
              optionRender={(option) => (
                <div className="flex items-center gap-3">
                  <img src={String(option.value)} className="w-6 h-6" />
                  <span>{option.label}</span>
                </div>
              )}
            />
          </div>

          <div>
            <label className="text-sm text-slate-300 mb-1 block">Icon Size</label>
            <Select
              className="w-full"
              placeholder="Select size"
              value={selectedSize}
              onChange={setSelectedSize}
              options={[
                { value: 'small', label: 'Small (48x48)' },
                { value: 'medium', label: 'Medium (64x64)' },
                { value: 'large', label: 'Large (80x80)' },
              ]}
            />
          </div>
        </div>
      </Modal>

      {/* WIRING MODAL */}
      <Modal
        open={wireOpen}
        onCancel={() => {
          setLinkDraft({});
          setWireOpen(false);
        }}
        title="Connect Devices"
        onOk={handleWireDevices}
        okText="Apply Connection"
        okButtonProps={{
          disabled: !linkDraft.from || !linkDraft.to || linkDraft.from === linkDraft.to,
        }}
      >
        <div className="space-y-4">
          <div className="text-sm text-slate-400 mb-4">Create a visual connection between two devices</div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-300 mb-1 block">From Device</label>
              <Select
                className="w-full"
                placeholder="Select source"
                value={linkDraft.from}
                onChange={(v) => setLinkDraft((d) => ({ ...d, from: v }))}
                showSearch
                optionFilterProp="label"
                options={
                  map?.selements.map((s) => {
                    const hostId = s.elements?.[0]?.hostid;
                    const hostName = hostId ? hostsById[hostId]?.name : undefined;
                    return {
                      value: s.selementid,
                      label: hostName || 'Unknown',
                    };
                  }) || []
                }
              />
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-1 block">To Device</label>

              <Select
                className="w-full"
                placeholder="Select target"
                value={linkDraft.to}
                onChange={(v) => setLinkDraft((d) => ({ ...d, to: v }))}
                showSearch
                optionFilterProp="label"
                options={
                  map?.selements.map((s) => {
                    const hostId = s.elements?.[0]?.hostid;
                    const hostName = hostId ? hostsById[hostId]?.name : undefined;
                    return {
                      value: s.selementid,
                      label: hostName || 'Unknown',
                    };
                  }) || []
                }
              />
            </div>
          </div>

          {linkDraft.from === linkDraft.to && linkDraft.from && (
            <div className="text-xs text-red-400 mt-2">⚠️ Cannot connect a device to itself</div>
          )}
        </div>
      </Modal>
    </div>
  );
}
