import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // Game State Simulation
  // Threat Actor Profiles
  const threatActors = [
    {
      id: "shadow_nexus",
      name: "Shadow Nexus",
      type: "APT Group",
      motivation: "Espionage",
      methods: ["Spear Phishing", "Zero-day Exploits", "Living off the Land"],
      pastTargets: ["Government Agencies", "Defense Contractors"],
      description: "A highly sophisticated state-sponsored group known for long-term persistence in high-value networks."
    },
    {
      id: "crimson_void",
      name: "Crimson Void",
      type: "Cybercriminal Syndicate",
      motivation: "Financial Gain",
      methods: ["Ransomware-as-a-Service", "Double Extortion", "Credential Stuffing"],
      pastTargets: ["Healthcare Systems", "Financial Institutions"],
      description: "An aggressive group focused on high-pressure ransomware attacks and data theft for ransom."
    },
    {
      id: "neon_ghost",
      name: "Neon Ghost",
      type: "Hacktivist Collective",
      motivation: "Ideological",
      methods: ["DDoS", "Defacement", "Data Leaks"],
      pastTargets: ["Energy Companies", "Social Media Platforms"],
      description: "A decentralized group that targets organizations they perceive as environmentally or socially irresponsible."
    },
    {
      id: "silent_bit",
      name: "Silent Bit",
      type: "Insider Threat Specialist",
      motivation: "Revenge / Financial",
      methods: ["Privilege Escalation", "Logic Bombs", "Data Siphoning"],
      pastTargets: ["Tech Startups", "E-commerce Platforms"],
      description: "Specializes in recruiting or compromising internal employees to bypass perimeter defenses."
    }
  ];

  let nodes = [
    { id: "finance_corp", name: "Global Finance Corp", health: 100, status: "stable", type: "finance", devices: [
      { id: "fin_ceo_01", name: "CEO Laptop", status: "online", health: 100 },
      { id: "fin_srv_01", name: "Transaction Server", status: "online", health: 100 },
      { id: "fin_hr_01", name: "HR Workstation", status: "online", health: 100 }
    ]},
    { id: "technova", name: "TechNova Solutions", health: 100, status: "stable", type: "technology", devices: [
      { id: "tn_dev_01", name: "Lead Dev PC", status: "online", health: 100 },
      { id: "tn_git_01", name: "Internal Repo", status: "online", health: 100 },
      { id: "tn_qa_01", name: "QA Test Bench", status: "online", health: 100 }
    ]},
    { id: "healthbridge", name: "HealthBridge Group", health: 100, status: "stable", type: "healthcare", devices: [
      { id: "hb_rec_01", name: "Patient Records", status: "online", health: 100 },
      { id: "hb_lab_01", name: "R&D Terminal", status: "online", health: 100 }
    ]},
    { id: "aerodynamics", name: "AeroDynamics Inc", health: 100, status: "stable", type: "aerospace", devices: [
      { id: "ad_eng_01", name: "Engineering CAD", status: "online", health: 100 },
      { id: "ad_sim_01", name: "Flight Simulator", status: "online", health: 100 }
    ]},
    { id: "greenenergy", name: "GreenEnergy Ltd", health: 100, status: "stable", type: "energy", devices: [
      { id: "ge_grid_01", name: "Grid Controller", status: "online", health: 100 },
      { id: "ge_mkt_01", name: "Marketing Laptop", status: "online", health: 100 }
    ]},
  ];

  let activeAttacks: any[] = [];

  // Simulate Traffic
  setInterval(() => {
    const traffic = {
      timestamp: Date.now(),
      packets: Array.from({ length: 15 }).map(() => ({
        id: Math.random().toString(36).substr(2, 9),
        source: nodes[Math.floor(Math.random() * nodes.length)].id,
        target: nodes[Math.floor(Math.random() * nodes.length)].id,
        type: Math.random() > 0.92 ? (Math.random() > 0.5 ? "attack" : "suspicious") : "normal",
        protocol: ["TCP", "UDP", "HTTPS", "SSH", "RDP", "SMB"][Math.floor(Math.random() * 6)],
        size: Math.floor(Math.random() * 2000),
        sourceIP: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      })),
    };
    io.emit("traffic_update", traffic);
  }, 800);

  // Simulate Attacks
  setInterval(() => {
    if (activeAttacks.length < 3 && Math.random() > 0.75) {
      const target = nodes[Math.floor(Math.random() * nodes.length)];
      const targetDevice = target.devices[Math.floor(Math.random() * target.devices.length)];
      const actor = threatActors[Math.floor(Math.random() * threatActors.length)];
      const attackType = actor.methods[Math.floor(Math.random() * actor.methods.length)];
      
      const isInsider = actor.id === "silent_bit";
      const sourceDevice = isInsider ? target.devices.find(d => d.id !== targetDevice.id) || targetDevice : null;

      const newAttack = {
        id: Math.random().toString(36).substr(2, 9),
        targetId: target.id,
        targetDeviceId: targetDevice.id,
        actorId: actor.id,
        type: attackType,
        severity: Math.random() > 0.7 ? "critical" : "high",
        startTime: Date.now(),
        source: isInsider ? `INTERNAL: ${sourceDevice?.name}` : `REMOTE_USER_${Math.floor(Math.random() * 999)}`,
        payload: `MALICIOUS_EXEC_${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        isInsider
      };
      
      activeAttacks.push(newAttack);
      io.emit("attack_detected", newAttack);
    }
  }, 8000);

  io.on("connection", (socket) => {
    console.log("Operator connected");
    socket.emit("init_state", { nodes, activeAttacks, threatActors });

    socket.on("execute_command", (data) => {
      const { command, args } = data;
      console.log(`Executing: ${command}`, args);
      
      // Simple command logic
      if (command === "isolate" && args.node) {
        const node = nodes.find(n => n.id === args.node);
        if (node) {
          node.status = "isolated";
          io.emit("node_updated", node);
          socket.emit("command_result", { success: true, message: `Node ${args.node} isolated.` });
        }
      } else if (command === "honeypot" && args.target) {
        activeAttacks = activeAttacks.filter(a => a.targetId !== args.target);
        io.emit("attack_resolved", { targetId: args.target, method: "honeypot" });
        socket.emit("command_result", { success: true, message: `Attack on ${args.target} diverted to sandbox.` });
      } else if (command === "revoke_access" && args.target) {
        const attack = activeAttacks.find(a => a.targetId === args.target && a.isInsider);
        if (attack) {
          activeAttacks = activeAttacks.filter(a => a.id !== attack.id);
          io.emit("attack_resolved", { targetId: args.target, method: "access_revocation" });
          socket.emit("command_result", { success: true, message: `Internal credentials revoked for ${args.target}. Insider threat neutralized.` });
        } else {
          socket.emit("command_result", { success: false, message: "No active insider threat found for this target." });
        }
      } else if (command === "deep_scan" && args.node) {
        const node = nodes.find(n => n.id === args.node);
        if (node) {
          node.health = Math.min(100, node.health + 5);
          io.emit("node_updated", node);
          socket.emit("command_result", { success: true, message: `Deep scan completed for ${args.node}. Minor vulnerabilities patched.` });
        }
      } else if (command === "patch_system" && args.node) {
        const node = nodes.find(n => n.id === args.node);
        if (node) {
          const attack = activeAttacks.find(a => a.targetId === args.node);
          if (attack) {
            activeAttacks = activeAttacks.filter(a => a.id !== attack.id);
            io.emit("attack_resolved", { targetId: args.node, method: "patching" });
          }
          node.health = 100;
          io.emit("node_updated", node);
          socket.emit("command_result", { success: true, message: `System patches applied to ${args.node}. Health restored.` });
        }
      } else if (command === "backup_data" && args.node) {
        socket.emit("command_result", { success: true, message: `Encrypted backup initiated for ${args.node}. Data integrity secured.` });
      } else if (command === "firewall_rule" && args.node) {
        socket.emit("command_result", { success: true, message: `Custom firewall rule applied to ${args.node}. Incoming traffic filtered.` });
      } else if (command === "traffic_reroute" && args.node) {
        socket.emit("command_result", { success: true, message: `Traffic rerouted for ${args.node} through secure gateway.` });
      } else if (command === "credential_reset" && args.node) {
        socket.emit("command_result", { success: true, message: `System-wide credential reset initiated for ${args.node}.` });
      } else {
        socket.emit("command_result", { success: false, message: "Unknown command or invalid parameters." });
      }
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Holding Sentinel server running on http://localhost:${PORT}`);
  });
}

startServer();
