import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Terminal as TerminalIcon, Shield, Activity, Zap, AlertTriangle, Cpu, Globe, Lock, ChevronLeft, Search, Eye, FileText, Send, Wifi, ShieldCheck, RefreshCw, Database, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { createHoldingScene } from './lib/holdingScene';
import { cn } from './lib/utils';
import * as THREE from 'three';

interface Node {
  id: string;
  name: string;
  health: number;
  status: string;
  type: string;
  devices: { id: string, name: string, status: string, health: number }[];
}

interface Attack {
  id: string;
  targetId: string;
  targetDeviceId?: string;
  actorId?: string;
  type: string;
  severity: string;
  startTime: number;
  source?: string;
  payload?: string;
  isInsider?: boolean;
}

interface ThreatActor {
  id: string;
  name: string;
  type: string;
  motivation: string;
  methods: string[];
  pastTargets: string[];
  description: string;
}

interface Packet {
  id: string;
  source: string;
  target: string;
  type: 'normal' | 'suspicious' | 'attack';
  protocol: string;
  size: number;
  sourceIP?: string;
}

interface AutoResponseRule {
  id: string;
  threatType: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | 'any';
  action: string;
  enabled: boolean;
}

const DARK_WEB_NEWS = [
  "NEW RANSOMWARE VARIANT 'SENTINEL-X' SPOTTED IN THE WILD",
  "DATA LEAK: 500GB OF CORPORATE EMAILS FROM FORTUNE 500 COMPANY POSTED ON ONION FORUMS",
  "ZERO-DAY EXPLOIT FOR POPULAR FIREWALL SOFTWARE SELLING FOR 50 BTC",
  "FINANCIAL SUBSIDIARY 'TECHNOVA' TARGETED BY STATE-SPONSORED ACTORS",
  "INSIDER THREAT ALERT: EMPLOYEE CREDENTIALS FOR SALE ON DARK MARKET 'SILK ROAD 4.0'",
  "DDoS-AS-A-SERVICE PROVIDER 'STRESSER-PRO' ADDS NEW ATTACK VECTORS",
  "CRYPTO-JACKING BOTNET 'MINER-BOT' INFECTS OVER 10,000 SERVERS GLOBALLY",
  "PHISHING CAMPAIGN TARGETING CORPORATE EXECUTIVES USING AI-GENERATED DEEPFAKES",
  "NEW VULNERABILITY IN CLOUD STORAGE PROVIDER EXPOSES SENSITIVE CUSTOMER DATA",
  "HACKER GROUP 'NEON-GHOST' CLAIMS RESPONSIBILITY FOR RECENT BANKING HEIST"
];

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [threatActors, setThreatActors] = useState<ThreatActor[]>([]);
  const [activeAttacks, setActiveAttacks] = useState<Attack[]>([]);
  const [terminalOutput, setTerminalOutput] = useState<string[]>(['SENTINEL OS v2.0.26 - INITIALIZING...', 'ESTABLISHING SECURE CONNECTION TO HOLDING NETWORK...']);
  const [command, setCommand] = useState('');
  const [stats, setStats] = useState({ packetsProcessed: 0, threatsNeutralized: 0, uptime: '00:00:00' });
  const [viewMode, setViewMode] = useState<'holding' | 'node'>('holding');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const [resolvedAttacks, setResolvedAttacks] = useState<any[]>([]);
  const [autoResponseRules, setAutoResponseRules] = useState<AutoResponseRule[]>([
    { id: '1', threatType: 'ransomware', severity: 'critical', action: 'isolate', enabled: false },
    { id: '2', threatType: 'insider', severity: 'any', action: 'revoke_access', enabled: false }
  ]);
  const rulesRef = useRef<AutoResponseRule[]>(autoResponseRules);
  
  useEffect(() => {
    rulesRef.current = autoResponseRules;
  }, [autoResponseRules]);

  const [recentPackets, setRecentPackets] = useState<Packet[]>([]);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('init_state', (state) => {
      setNodes(state.nodes);
      setThreatActors(state.threatActors);
      setActiveAttacks(state.activeAttacks);
      setTerminalOutput(prev => [...prev, 'CONNECTION ESTABLISHED. SYSTEM ONLINE.']);
    });

    newSocket.on('traffic_update', (data: { packets: Packet[] }) => {
      setStats(prev => ({ ...prev, packetsProcessed: prev.packetsProcessed + data.packets.length }));
      setRecentPackets(prev => [...data.packets, ...prev].slice(0, 20));
      
      if (sceneRef.current && viewMode === 'holding') {
        data.packets.forEach(p => {
          sceneRef.current.addTrafficLine(p.source, p.target, p.type, p.size);
        });
      }
    });

    newSocket.on('attack_detected', (attack: Attack) => {
      setActiveAttacks(prev => [...prev, attack]);
      const actor = threatActors.find(a => a.id === attack.actorId);
      setTerminalOutput(prev => [...prev, `[CRITICAL] ${attack.type.toUpperCase()} DETECTED FROM ${attack.source} ON ${attack.targetId}${actor ? ` (LINKED TO: ${actor.name})` : ''}`]);
      
      // Auto-Response Logic
      const matchingRule = rulesRef.current.find(rule => 
        rule.enabled && 
        (rule.threatType === 'any' || rule.threatType.toLowerCase() === attack.type.toLowerCase()) &&
        (rule.severity === 'any' || rule.severity.toLowerCase() === attack.severity.toLowerCase())
      );

      if (matchingRule) {
        setTerminalOutput(prev => [...prev, `[AUTO-RESPONSE] TRIGGERED: ${matchingRule.action.toUpperCase()} ON ${attack.targetId}`]);
        newSocket.emit('execute_command', { 
          command: matchingRule.action, 
          args: { node: attack.targetId, target: attack.targetId } 
        });
      }
    });

    newSocket.on('attack_resolved', (data: { targetId: string, method: string }) => {
      setActiveAttacks(prev => {
        const resolved = prev.find(a => a.targetId === data.targetId);
        if (resolved) {
          setResolvedAttacks(r => [...r, { ...resolved, resolvedAt: Date.now(), method: data.method }]);
        }
        return prev.filter(a => a.targetId !== data.targetId);
      });
      setStats(prev => ({ ...prev, threatsNeutralized: prev.threatsNeutralized + 1 }));
      setTerminalOutput(prev => [...prev, `[SUCCESS] THREAT NEUTRALIZED ON ${data.targetId} USING ${data.method.toUpperCase()}.`]);
    });

    newSocket.on('node_updated', (updatedNode: Node) => {
      setNodes(prev => prev.map(n => n.id === updatedNode.id ? updatedNode : n));
    });

    newSocket.on('command_result', (res) => {
      setTerminalOutput(prev => [...prev, `> ${res.message}`]);
    });

    return () => {
      newSocket.close();
    };
  }, [viewMode]);

  useEffect(() => {
    if (canvasRef.current && !sceneRef.current) {
      sceneRef.current = createHoldingScene(canvasRef.current);
    }
    return () => {
      if (sceneRef.current) {
        sceneRef.current.cleanup();
        sceneRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalOutput]);

  const handleSendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || !socket) return;

    const parts = command.trim().split(' ');
    const cmd = parts[0];
    const args: any = {};
    
    parts.slice(1).forEach(arg => {
      if (arg.startsWith('--')) {
        const [key, val] = arg.replace('--', '').split('=');
        args[key] = val;
      }
    });

    socket.emit('execute_command', { command: cmd, args });
    setTerminalOutput(prev => [...prev, `$ ${command}`]);
    setCommand('');
  };

  const handleAlertClick = (attack: Attack) => {
    setSelectedNodeId(attack.targetId);
    setViewMode('node');
    if (sceneRef.current) {
      sceneRef.current.setViewMode('node', attack.targetId, attack.targetDeviceId);
    }
    setTerminalOutput(prev => [...prev, `[SYSTEM] INVESTIGATING BREACH AT ${attack.targetId} (DEVICE: ${attack.targetDeviceId})...`]);
  };

  const handleBackToHolding = () => {
    setViewMode('holding');
    setSelectedNodeId(null);
    if (sceneRef.current) {
      sceneRef.current.setViewMode('holding');
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const nodeAttack = activeAttacks.find(a => a.targetId === selectedNodeId);

  return (
    <div className="flex h-screen w-screen bg-[#050505] text-[#00ffff] font-mono overflow-hidden selection:bg-[#00ffff] selection:text-black">
      {/* Left Sidebar: Stats & Nodes */}
      <div className="w-80 border-r border-[#00ffff]/20 flex flex-col bg-[#0a0a0a] z-10">
        <div className="p-6 border-b border-[#00ffff]/20">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-6 h-6" />
            <h1 
              className="text-xl font-bold tracking-tighter uppercase glitch-text"
              data-text="Holding Sentinel"
            >
              Holding Sentinel
            </h1>
          </div>
          <div className="space-y-4">
            <div className="bg-[#111] p-3 border border-[#00ffff]/10 rounded">
              <div className="text-[10px] uppercase opacity-50 mb-1">Packets Processed</div>
              <div className="text-2xl font-light">{stats.packetsProcessed.toLocaleString()}</div>
            </div>
            <div className="bg-[#111] p-3 border border-[#00ffff]/10 rounded">
              <div className="text-[10px] uppercase opacity-50 mb-1">Threats Neutralized</div>
              <div className="text-2xl font-light">{stats.threatsNeutralized}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="text-[10px] uppercase opacity-50 px-2">Subsidiary Companies</div>
          {nodes.map(node => {
            const isUnderAttack = activeAttacks.some(a => a.targetId === node.id);
            return (
              <div 
                key={node.id} 
                onClick={() => {
                  setSelectedNodeId(node.id);
                  if (sceneRef.current) sceneRef.current.focusOnNode(node.id);
                }}
                className={cn(
                  "p-3 border rounded transition-all cursor-pointer group",
                  isUnderAttack ? "border-red-500 bg-red-500/10 animate-pulse" : 
                  node.status === 'isolated' ? "border-yellow-500/50 bg-yellow-500/5" : "border-[#00ffff]/10 bg-[#111] hover:border-[#00ffff]/30",
                  selectedNodeId === node.id && !isUnderAttack && "border-[#00ffff] bg-[#00ffff]/5"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs font-bold">{node.name}</div>
                  <div className="flex gap-1">
                    {node.status === 'isolated' && <Lock className="w-3 h-3 text-yellow-500" />}
                    <Eye 
                      className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNodeId(node.id);
                        setViewMode('node');
                        if (sceneRef.current) sceneRef.current.setViewMode('node', node.id);
                      }}
                    />
                  </div>
                </div>
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all duration-500", isUnderAttack ? "bg-red-500" : "bg-[#00ffff]")}
                    style={{ width: `${node.health}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-[9px] uppercase opacity-50">
                  <span>{node.type}</span>
                  <span>{node.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content: 3D Visualization */}
      <div className="flex-1 relative">
        <div ref={canvasRef} className="absolute inset-0" />
        
        {/* HUD Overlays */}
        <div className="absolute top-6 left-6 right-6 flex flex-col gap-4 pointer-events-none">
          {/* Dark Web News Ticker */}
          {selectedActorId && (
            <div className="pointer-events-auto bg-red-900/20 backdrop-blur-md border-y border-red-500/30 py-1 overflow-hidden">
              <div className="marquee">
                <div className="marquee-content gap-12 items-center">
                  {[...DARK_WEB_NEWS, ...DARK_WEB_NEWS].map((news, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-red-500 whitespace-nowrap">
                      <AlertTriangle className="w-3 h-3" />
                      <span>[INTEL] {news}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between w-full">
            <div className="flex flex-col gap-2 items-start">
            <div className="flex gap-4 items-start">
              {viewMode === 'node' && (
                <button 
                  onClick={handleBackToHolding}
                  className="pointer-events-auto bg-black/60 backdrop-blur-md border border-[#00ffff]/20 p-4 rounded hover:bg-[#00ffff]/10 transition-colors flex items-center gap-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="text-xs uppercase font-bold">Back to Holding View</span>
                </button>
              )}
              <div className="bg-black/60 backdrop-blur-md border border-[#00ffff]/20 p-4 rounded flex items-center gap-4">
                <Activity className="w-5 h-5 animate-pulse" />
                <div>
                  <div className="text-[10px] uppercase opacity-50">View Mode</div>
                  <div className="text-lg uppercase">{viewMode}</div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedActorId(selectedActorId ? null : 'all')}
                className={cn(
                  "pointer-events-auto bg-black/60 backdrop-blur-md border border-[#00ffff]/20 p-4 rounded hover:bg-[#00ffff]/10 transition-colors flex items-center gap-2",
                  selectedActorId && "border-[#00ffff] bg-[#00ffff]/10"
                )}
              >
                <Lock className="w-5 h-5" />
                <span className="text-xs uppercase font-bold">Threat Intelligence</span>
              </button>
              <button 
                onClick={() => setShowReport(true)}
                className="pointer-events-auto bg-black/60 backdrop-blur-md border border-[#00ffff]/20 p-4 rounded hover:bg-[#00ffff]/10 transition-colors flex items-center gap-2"
              >
                <FileText className="w-5 h-5" />
                <span className="text-xs uppercase font-bold">Incident Report</span>
              </button>
              <button 
                onClick={() => setShowAutomation(true)}
                className={cn(
                  "pointer-events-auto bg-black/60 backdrop-blur-md border border-[#00ffff]/20 p-4 rounded hover:bg-[#00ffff]/10 transition-colors flex items-center gap-2",
                  autoResponseRules.some(r => r.enabled) && "border-yellow-500/50 text-yellow-500"
                )}
              >
                <Zap className="w-5 h-5" />
                <span className="text-xs uppercase font-bold">Automation Rules</span>
              </button>
            </div>

            {/* Alerts moved to left side below HUD */}
            <div className="flex flex-col gap-2 mt-4">
              {activeAttacks.map(attack => (
                <div 
                  key={attack.id}
                  onClick={() => handleAlertClick(attack)}
                  className={cn(
                    "pointer-events-auto cursor-pointer backdrop-blur-md border p-4 rounded flex items-center gap-4 animate-pulse hover:scale-105 transition-all w-64",
                    attack.severity === 'critical' ? "bg-red-600/30 border-red-500" : "bg-red-500/20 border-red-500/50"
                  )}
                >
                  <AlertTriangle className={cn("w-6 h-6", attack.severity === 'critical' ? "text-red-600" : "text-red-500")} />
                  <div>
                    <div className="text-[10px] uppercase font-bold">BREACH: {attack.type}</div>
                    <div className="text-xs opacity-80">Target: {attack.targetId}</div>
                    <div className="text-[8px] opacity-50 mt-1 text-ellipsis overflow-hidden whitespace-nowrap">SOURCE: {attack.source}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 items-end">
            {/* Right side is now reserved for Investigation Panel */}
          </div>
        </div>
      </div>

        {/* Investigation Panel (repositioned to the right) */}
        {viewMode === 'node' && selectedNode && (
          <div className="absolute top-24 right-6 w-96 bg-black/80 backdrop-blur-xl border border-[#00ffff]/20 p-6 rounded space-y-6 overflow-y-auto max-h-[calc(100vh-380px)] shadow-[0_0_30px_rgba(0,0,0,0.5)] z-20">
            <div className="border-b border-[#00ffff]/20 pb-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold uppercase tracking-tighter">{selectedNode.name}</h2>
                <span className="text-[10px] px-2 py-0.5 border border-[#00ffff]/30 rounded">{selectedNode.status}</span>
              </div>
              <p className="text-[10px] opacity-50 mt-1">COMPANY NETWORK & WORKSTATION MAP</p>
            </div>

            {nodeAttack && (
              <div className="bg-red-500/10 border border-red-500/30 p-4 rounded space-y-2">
                <div className="text-[10px] font-bold text-red-500 uppercase">Active Threat Intelligence</div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div><span className="opacity-50">TYPE:</span> {nodeAttack.type}</div>
                  <div><span className="opacity-50">SEVERITY:</span> {nodeAttack.severity}</div>
                  <div className={cn(nodeAttack.isInsider && "text-yellow-500 font-bold")}>
                    <span className="opacity-50">SOURCE:</span> {nodeAttack.source}
                  </div>
                  <div><span className="opacity-50">TARGET:</span> {nodeAttack.targetDeviceId}</div>
                </div>
                {nodeAttack.actorId && (
                  <div 
                    onClick={() => setSelectedActorId(nodeAttack.actorId!)}
                    className="text-[10px] mt-2 p-2 bg-red-500/20 rounded border border-red-500/40 cursor-pointer hover:bg-red-500/30 transition-colors"
                  >
                    <span className="opacity-50">ACTOR:</span> {threatActors.find(a => a.id === nodeAttack.actorId)?.name} (View Profile)
                  </div>
                )}
                <div className="text-[10px] mt-2 p-2 bg-black/40 rounded border border-red-500/20">
                  <span className="opacity-50">PAYLOAD:</span> {nodeAttack.payload}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="text-[10px] uppercase opacity-50">Employee Workstations</div>
              {selectedNode.devices.map(dev => (
                <div key={dev.id} className={cn(
                  "p-3 border rounded flex justify-between items-center",
                  nodeAttack?.targetDeviceId === dev.id ? "border-red-500 bg-red-500/10" : "border-[#00ffff]/10 bg-white/5"
                )}>
                  <div>
                    <div className="text-xs font-bold">{dev.name}</div>
                    <div className="text-[8px] opacity-50">{dev.id}</div>
                  </div>
                  <div className="text-right">
                    <div className={cn("text-[10px]", dev.status === 'online' ? "text-green-500" : "text-red-500")}>
                      {dev.status.toUpperCase()}
                    </div>
                    <div className="text-[8px] opacity-50">{dev.health}% HEALTH</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {nodeAttack?.isInsider ? (
                <button 
                  onClick={() => socket?.emit('execute_command', { command: 'revoke_access', args: { target: selectedNode.id } })}
                  className="py-3 bg-red-500/20 border border-red-500/50 rounded text-[10px] uppercase text-red-500 hover:bg-red-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <Lock className="w-3 h-3" />
                  Revoke Access
                </button>
              ) : (
                <button 
                  onClick={() => socket?.emit('execute_command', { command: 'honeypot', args: { target: selectedNode.id } })}
                  className="py-3 bg-[#00ffff]/10 border border-[#00ffff]/30 rounded text-[10px] uppercase hover:bg-[#00ffff]/20 transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-3 h-3" />
                  Deploy Honeypot
                </button>
              )}
              <button 
                onClick={() => socket?.emit('execute_command', { command: 'isolate', args: { node: selectedNode.id } })}
                className="py-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-[10px] uppercase text-yellow-500 hover:bg-yellow-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Shield className="w-3 h-3" />
                Isolate Node
              </button>
              <button 
                onClick={() => socket?.emit('execute_command', { command: 'firewall_rule', args: { node: selectedNode.id } })}
                className="py-3 bg-orange-500/10 border border-orange-500/30 rounded text-[10px] uppercase text-orange-400 hover:bg-orange-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Wifi className="w-3 h-3" />
                Firewall Rule
              </button>
              <button 
                onClick={() => socket?.emit('execute_command', { command: 'traffic_reroute', args: { node: selectedNode.id } })}
                className="py-3 bg-cyan-500/10 border border-cyan-500/30 rounded text-[10px] uppercase text-cyan-400 hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3 h-3" />
                Reroute Traffic
              </button>
              <button 
                onClick={() => socket?.emit('execute_command', { command: 'deep_scan', args: { node: selectedNode.id } })}
                className="py-3 bg-blue-500/10 border border-blue-500/30 rounded text-[10px] uppercase text-blue-400 hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Search className="w-3 h-3" />
                Deep Scan
              </button>
              <button 
                onClick={() => socket?.emit('execute_command', { command: 'patch_system', args: { node: selectedNode.id } })}
                className="py-3 bg-green-500/10 border border-green-500/30 rounded text-[10px] uppercase text-green-400 hover:bg-green-500/20 transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-3 h-3" />
                Patch System
              </button>
              <button 
                onClick={() => socket?.emit('execute_command', { command: 'credential_reset', args: { node: selectedNode.id } })}
                className="py-3 bg-pink-500/10 border border-pink-500/30 rounded text-[10px] uppercase text-pink-400 hover:bg-pink-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Lock className="w-3 h-3" />
                Reset Credentials
              </button>
              <button 
                onClick={() => socket?.emit('execute_command', { command: 'backup_data', args: { node: selectedNode.id } })}
                className="py-3 bg-purple-500/10 border border-purple-500/30 rounded text-[10px] uppercase text-purple-400 hover:bg-purple-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Database className="w-3 h-3" />
                Backup Data
              </button>
            </div>

            <div className="mt-6 p-4 border border-[#00ffff]/20 bg-black/40 rounded">
              <div className="text-[10px] uppercase opacity-50 mb-2 flex items-center gap-2">
                <TerminalIcon className="w-3 h-3" />
                Manual Command Entry
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (command.trim()) {
                    socket?.emit('execute_command', { command: command.trim(), args: { node: selectedNode.id } });
                    setCommand('');
                  }
                }}
                className="flex gap-2"
              >
                <input 
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="Enter custom protocol..."
                  className="flex-1 bg-black/60 border border-[#00ffff]/30 rounded px-3 py-2 text-xs focus:outline-none focus:border-[#00ffff] transition-colors"
                />
                <button 
                  type="submit"
                  className="px-4 bg-[#00ffff]/20 border border-[#00ffff]/50 rounded text-[#00ffff] hover:bg-[#00ffff]/30 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Automation Rules Modal */}
        {showAutomation && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-12 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-[#0a0a0a] border border-[#00ffff]/30 rounded-lg flex flex-col max-h-full overflow-hidden shadow-[0_0_50px_rgba(0,255,255,0.1)]">
              <div className="p-6 border-b border-[#00ffff]/20 flex justify-between items-center bg-[#00ffff]/5">
                <div className="flex items-center gap-3">
                  <Zap className="w-6 h-6 text-[#00ffff]" />
                  <h2 className="text-2xl font-bold uppercase tracking-tighter">Auto-Response Protocols</h2>
                </div>
                <button 
                  onClick={() => setShowAutomation(false)}
                  className="p-2 hover:bg-white/5 rounded transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 rotate-180" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-200 leading-relaxed">
                  <div className="font-bold mb-1 flex items-center gap-2">
                    <Shield className="w-3 h-3" />
                    OPERATIONAL ADVISORY
                  </div>
                  Automated responses execute immediately upon threat detection. Ensure protocols are correctly scoped to avoid unintended network disruption.
                </div>

                <div className="space-y-4">
                  {autoResponseRules.map(rule => (
                    <div key={rule.id} className={cn(
                      "p-4 border rounded transition-all",
                      rule.enabled ? "border-[#00ffff]/40 bg-[#00ffff]/5" : "border-white/10 bg-white/5 opacity-60"
                    )}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-4">
                            <select 
                              value={rule.threatType}
                              onChange={(e) => setAutoResponseRules(prev => prev.map(r => r.id === rule.id ? { ...r, threatType: e.target.value } : r))}
                              className="bg-black border border-white/10 rounded px-2 py-1 text-[10px] uppercase text-[#00ffff] focus:outline-none focus:border-[#00ffff]/50"
                            >
                              <option value="any">Any Threat</option>
                              <option value="ransomware">Ransomware</option>
                              <option value="malware">Malware</option>
                              <option value="ddos">DDoS</option>
                              <option value="insider">Insider Threat</option>
                              <option value="brute_force">Brute Force</option>
                            </select>

                            <select 
                              value={rule.severity}
                              onChange={(e) => setAutoResponseRules(prev => prev.map(r => r.id === rule.id ? { ...r, severity: e.target.value as any } : r))}
                              className="bg-black border border-white/10 rounded px-2 py-1 text-[10px] uppercase text-yellow-500 focus:outline-none focus:border-yellow-500/50"
                            >
                              <option value="any">Any Severity</option>
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="critical">Critical</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] uppercase opacity-70">
                            <span>Execute Protocol:</span>
                            <select 
                              value={rule.action}
                              onChange={(e) => setAutoResponseRules(prev => prev.map(r => r.id === rule.id ? { ...r, action: e.target.value } : r))}
                              className="bg-black border border-white/10 rounded px-2 py-1 text-[10px] uppercase text-[#00ffff] focus:outline-none focus:border-[#00ffff]/50"
                            >
                              <option value="isolate">Isolate Node</option>
                              <option value="honeypot">Deploy Honeypot</option>
                              <option value="revoke_access">Revoke Access</option>
                              <option value="firewall_rule">Apply Firewall</option>
                              <option value="traffic_reroute">Reroute Traffic</option>
                              <option value="patch_system">Auto Patch</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <button 
                            onClick={() => setAutoResponseRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r))}
                            className={cn(
                              "px-4 py-1.5 rounded text-[10px] font-bold uppercase transition-all min-w-[80px]",
                              rule.enabled ? "bg-[#00ffff] text-black" : "bg-white/10 text-white hover:bg-white/20"
                            )}
                          >
                            {rule.enabled ? 'Active' : 'Disabled'}
                          </button>
                          <button 
                            onClick={() => setAutoResponseRules(prev => prev.filter(r => r.id !== rule.id))}
                            className="p-1.5 text-red-500/50 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  className="w-full py-4 border border-dashed border-white/20 rounded text-[10px] uppercase opacity-50 hover:opacity-100 hover:border-[#00ffff]/50 transition-all"
                  onClick={() => {
                    const newRule: AutoResponseRule = {
                      id: Math.random().toString(36).substr(2, 9),
                      threatType: 'malware',
                      severity: 'high',
                      action: 'isolate',
                      enabled: false
                    };
                    setAutoResponseRules(prev => [...prev, newRule]);
                  }}
                >
                  + Define New Protocol
                </button>
              </div>
            </div>
          </div>
        )}
        {showReport && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-12 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-4xl bg-[#0a0a0a] border border-[#00ffff]/30 rounded-lg flex flex-col max-h-full overflow-hidden shadow-[0_0_50px_rgba(0,255,255,0.1)]">
              <div className="p-6 border-b border-[#00ffff]/20 flex justify-between items-center bg-[#00ffff]/5">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-[#00ffff]" />
                  <h2 className="text-2xl font-bold uppercase tracking-tighter">Incident Summary Report</h2>
                </div>
                <button 
                  onClick={() => setShowReport(false)}
                  className="p-2 hover:bg-white/5 rounded transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 rotate-180" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-12">
                {/* Executive Summary */}
                <div className="grid grid-cols-3 gap-6">
                  <div className="p-6 border border-[#00ffff]/10 bg-white/5 rounded text-center">
                    <div className="text-3xl font-bold text-[#00ffff]">{stats.threatsNeutralized}</div>
                    <div className="text-[10px] uppercase opacity-50 mt-2">Threats Neutralized</div>
                  </div>
                  <div className="p-6 border border-[#00ffff]/10 bg-white/5 rounded text-center">
                    <div className="text-3xl font-bold text-[#00ffff]">{resolvedAttacks.filter(a => a.isInsider).length}</div>
                    <div className="text-[10px] uppercase opacity-50 mt-2">Insider Threats Stopped</div>
                  </div>
                  <div className="p-6 border border-[#00ffff]/10 bg-white/5 rounded text-center">
                    <div className="text-3xl font-bold text-[#00ffff]">{nodes.filter(n => n.health < 100).length}</div>
                    <div className="text-[10px] uppercase opacity-50 mt-2">Compromised Assets</div>
                  </div>
                </div>

                {/* Threat Distribution Chart */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest border-b border-[#00ffff]/20 pb-2">Threat Distribution</h3>
                    <div className="h-64 w-full bg-white/5 border border-[#00ffff]/10 rounded p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={Object.entries(
                          resolvedAttacks.reduce((acc: any, curr) => {
                            acc[curr.type] = (acc[curr.type] || 0) + 1;
                            return acc;
                          }, {})
                        ).map(([name, value]) => ({ name: name.toUpperCase(), value }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                          <XAxis dataKey="name" stroke="#00ffff" fontSize={8} />
                          <YAxis stroke="#00ffff" fontSize={8} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #00ffff30', fontSize: '10px' }}
                            itemStyle={{ color: '#00ffff' }}
                          />
                          <Bar dataKey="value" fill="#00ffff" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest border-b border-[#00ffff]/20 pb-2">Asset Health Status</h3>
                    <div className="h-64 w-full bg-white/5 border border-[#00ffff]/10 rounded p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Healthy', value: nodes.filter(n => n.health >= 90).length },
                              { name: 'Degraded', value: nodes.filter(n => n.health < 90 && n.health >= 50).length },
                              { name: 'Critical', value: nodes.filter(n => n.health < 50).length },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            <Cell fill="#22c55e" />
                            <Cell fill="#eab308" />
                            <Cell fill="#ef4444" />
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #00ffff30', fontSize: '10px' }}
                            itemStyle={{ color: '#00ffff' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex justify-center gap-4 text-[8px] uppercase opacity-70">
                        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full" /> Healthy</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-500 rounded-full" /> Degraded</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full" /> Critical</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Incident Log */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold uppercase tracking-widest border-b border-[#00ffff]/20 pb-2">Resolved Incidents</h3>
                  <div className="space-y-2">
                    {resolvedAttacks.length > 0 ? (
                      resolvedAttacks.map((incident, i) => (
                        <div key={i} className="p-4 border border-white/10 bg-white/5 rounded flex justify-between items-center group hover:border-[#00ffff]/30 transition-all">
                          <div>
                            <div className="text-sm font-bold">{incident.type} on {incident.targetId}</div>
                            <div className="text-[10px] uppercase opacity-50">
                              Actor: {threatActors.find(a => a.id === incident.actorId)?.name || 'Unknown'} • Method: {incident.method}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] uppercase text-green-500 font-bold">Resolved</div>
                            <div className="text-[10px] opacity-30">{new Date(incident.resolvedAt).toLocaleTimeString()}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm opacity-30 italic p-8 text-center border border-dashed border-white/10 rounded">
                        No incidents resolved in current session.
                      </div>
                    )}
                  </div>
                </div>

                {/* Risk Assessment */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold uppercase tracking-widest border-b border-[#00ffff]/20 pb-2">Subsidiary Risk Status</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {nodes.map(node => (
                      <div key={node.id} className="p-4 border border-white/10 bg-white/5 rounded flex justify-between items-center">
                        <div className="text-sm">{node.name}</div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full transition-all duration-500",
                                node.health > 80 ? "bg-green-500" : node.health > 40 ? "bg-yellow-500" : "bg-red-500"
                              )}
                              style={{ width: `${node.health}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono">{node.health}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-[#00ffff]/20 flex justify-end">
                <button 
                  onClick={() => window.print()}
                  className="px-6 py-2 bg-[#00ffff]/10 border border-[#00ffff]/30 rounded text-xs uppercase hover:bg-[#00ffff]/20 transition-all"
                >
                  Export PDF Report
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Threat Actor Profiles Modal */}
        {selectedActorId && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-12 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-4xl bg-[#0a0a0a] border border-[#00ffff]/30 rounded-lg flex flex-col max-h-full overflow-hidden shadow-[0_0_50px_rgba(0,255,255,0.1)]">
              <div className="p-6 border-b border-[#00ffff]/20 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Lock className="w-6 h-6" />
                  <h2 className="text-2xl font-bold uppercase tracking-tighter">Threat Actor Intelligence</h2>
                </div>
                <button 
                  onClick={() => setSelectedActorId(null)}
                  className="p-2 hover:bg-white/5 rounded transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 rotate-180" />
                </button>
              </div>
              
              <div className="flex-1 overflow-hidden flex">
                {/* Actor List */}
                <div className="w-64 border-r border-[#00ffff]/10 overflow-y-auto p-4 space-y-2">
                  <div 
                    onClick={() => setSelectedActorId('all')}
                    className={cn(
                      "p-3 text-xs uppercase cursor-pointer rounded border transition-all",
                      selectedActorId === 'all' ? "border-[#00ffff] bg-[#00ffff]/10" : "border-transparent hover:bg-white/5"
                    )}
                  >
                    All Profiles
                  </div>
                  {threatActors.map(actor => (
                    <div 
                      key={actor.id}
                      onClick={() => setSelectedActorId(actor.id)}
                      className={cn(
                        "p-3 text-xs uppercase cursor-pointer rounded border transition-all",
                        selectedActorId === actor.id ? "border-[#00ffff] bg-[#00ffff]/10" : "border-transparent hover:bg-white/5"
                      )}
                    >
                      {actor.name}
                    </div>
                  ))}
                </div>

                {/* Actor Detail */}
                <div className="flex-1 overflow-y-auto p-8">
                  {selectedActorId === 'all' ? (
                    <div className="grid grid-cols-2 gap-4">
                      {threatActors.map(actor => (
                        <div 
                          key={actor.id}
                          onClick={() => setSelectedActorId(actor.id)}
                          className="p-4 border border-[#00ffff]/10 rounded bg-white/5 hover:border-[#00ffff]/30 cursor-pointer transition-all"
                        >
                          <div className="text-lg font-bold mb-1">{actor.name}</div>
                          <div className="text-[10px] uppercase opacity-50 mb-2">{actor.type}</div>
                          <p className="text-xs opacity-70 line-clamp-2">{actor.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    (() => {
                      const actor = threatActors.find(a => a.id === selectedActorId);
                      if (!actor) return null;
                      return (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <div>
                            <div className="text-4xl font-bold mb-2">{actor.name}</div>
                            <div className="text-sm uppercase text-[#00ffff] opacity-70">{actor.type}</div>
                          </div>

                          <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-6">
                              <div>
                                <div className="text-[10px] uppercase opacity-50 mb-2">Motivation</div>
                                <div className="text-lg">{actor.motivation}</div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase opacity-50 mb-2">Methods</div>
                                <div className="flex flex-wrap gap-2">
                                  {actor.methods.map(m => (
                                    <span key={m} className="px-2 py-1 bg-[#00ffff]/10 border border-[#00ffff]/20 rounded text-[10px] uppercase">
                                      {m}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="space-y-6">
                              <div>
                                <div className="text-[10px] uppercase opacity-50 mb-2">Past Targets</div>
                                <div className="space-y-1">
                                  {actor.pastTargets.map(t => (
                                    <div key={t} className="text-sm">• {t}</div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="pt-8 border-t border-[#00ffff]/10">
                            <div className="text-[10px] uppercase opacity-50 mb-4">Intelligence Brief</div>
                            <p className="text-sm leading-relaxed opacity-80">{actor.description}</p>
                          </div>

                          <div className="pt-8">
                            <div className="text-[10px] uppercase opacity-50 mb-4">Active Threats</div>
                            <div className="space-y-2">
                              {activeAttacks.filter(a => a.actorId === actor.id).length > 0 ? (
                                activeAttacks.filter(a => a.actorId === actor.id).map(attack => (
                                  <div key={attack.id} className="p-3 border border-red-500/30 bg-red-500/10 rounded flex justify-between items-center">
                                    <div className="text-xs font-bold">{attack.type} on {attack.targetId}</div>
                                    <div className="text-[10px] uppercase px-2 py-0.5 bg-red-500/20 rounded">Active</div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-xs opacity-30 italic">No active threats detected from this actor.</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Panel: Terminal */}
        <div className="absolute bottom-6 left-6 right-6 h-64 bg-black/80 backdrop-blur-lg border border-[#00ffff]/20 rounded flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[#00ffff]/10 bg-white/5">
            <TerminalIcon className="w-4 h-4" />
            <span className="text-[10px] uppercase tracking-widest">Sentinel Terminal v2.0</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 text-sm space-y-1 scrollbar-hide">
            {terminalOutput.map((line, i) => (
              <div key={i} className={cn(
                line.startsWith('[CRITICAL]') || line.startsWith('[ALERT]') ? "text-red-500" : 
                line.startsWith('[SUCCESS]') ? "text-green-500" : 
                line.startsWith('[SYSTEM]') ? "text-yellow-500" :
                line.startsWith('$') ? "text-white/50" : ""
              )}>
                {line}
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>
          <form onSubmit={handleSendCommand} className="p-4 border-t border-[#00ffff]/10 flex gap-2">
            <span className="opacity-50">$</span>
            <input 
              type="text" 
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Enter command (e.g., isolate --node=finance_corp, honeypot --target=technova)..."
              className="flex-1 bg-transparent border-none outline-none text-[#00ffff] placeholder:text-[#00ffff]/20"
              autoFocus
            />
          </form>
        </div>
      </div>

      {/* Right Sidebar: Quick Actions & Info */}
      <div className="w-64 border-l border-[#00ffff]/20 bg-[#0a0a0a] flex flex-col z-10">
        <div className="p-4 border-b border-[#00ffff]/10 bg-[#00ffff]/5 flex items-center justify-between">
          <div className="text-[10px] uppercase font-bold tracking-widest flex items-center gap-2">
            <Activity className="w-3 h-3 text-[#00ffff]" /> Live Traffic
          </div>
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-[#00ffff] rounded-full animate-ping" />
            <div className="w-1 h-1 bg-[#00ffff] rounded-full" />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="p-4 space-y-4">
            <div className="space-y-1">
              {recentPackets.map(p => (
                <div key={p.id} className="text-[9px] flex justify-between items-center border-b border-white/5 pb-1 hover:bg-white/5 transition-colors px-1">
                  <span className={cn(
                    "font-bold",
                    p.type === 'attack' ? "text-red-500" : p.type === 'suspicious' ? "text-yellow-500" : "text-[#00ffff]/70"
                  )}>
                    {p.protocol}
                  </span>
                  <span className="opacity-40 tabular-nums">{p.sourceIP}</span>
                  <span className="opacity-60 tabular-nums">{p.size}b</span>
                </div>
              ))}
              {recentPackets.length === 0 && (
                <div className="text-[10px] opacity-30 italic text-center py-4">Waiting for traffic...</div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-white/5 space-y-6">
            <div>
              <div className="text-[10px] uppercase opacity-50 mb-3 flex items-center gap-2">
                <Cpu className="w-3 h-3" /> System Resources
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-[9px] flex justify-between uppercase">
                    <span>CPU Load</span>
                    <span className="text-[#00ffff]">42%</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#00ffff] w-[42%] shadow-[0_0_10px_#00ffff]" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[9px] flex justify-between uppercase">
                    <span>Memory</span>
                    <span className="text-[#00ffff]">12.4GB</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#00ffff] w-[20%] shadow-[0_0_10px_#00ffff]" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase opacity-50 mb-3 flex items-center gap-2">
                <Globe className="w-3 h-3" /> Global Status
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/5 p-2 border border-white/10 rounded text-center group hover:border-[#00ffff]/30 transition-colors">
                  <div className="text-[8px] opacity-50 uppercase">Latency</div>
                  <div className="text-xs font-bold text-[#00ffff]">14ms</div>
                </div>
                <div className="bg-white/5 p-2 border border-white/10 rounded text-center group hover:border-[#00ffff]/30 transition-colors">
                  <div className="text-[8px] opacity-50 uppercase">Packets/s</div>
                  <div className="text-xs font-bold text-[#00ffff]">1.2k</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[#00ffff]/10 bg-black">
          <button className="w-full py-2.5 bg-red-500/10 border border-red-500/30 rounded text-[9px] uppercase font-bold tracking-[0.2em] text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300">
            Emergency Shutdown
          </button>
        </div>
      </div>
    </div>
  );
}
