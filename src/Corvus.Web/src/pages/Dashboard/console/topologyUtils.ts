import type { Service, DockerContainer, ContainerStats } from '../../../types';
import type { TopologyNode, TopologyEdge } from '../types';

export function computeTopology(
  services: Service[],
  containers: DockerContainer[],
  containerStats: Record<string, ContainerStats>
): { nodes: TopologyNode[]; edges: TopologyEdge[] } {
  const nodes: TopologyNode[] = [];
  const edges: TopologyEdge[] = [];
  const nodeMap = new Map<string, TopologyNode>();

  // Yardımcı haritalar: containerId -> container, name -> container
  const containerById = new Map<string, DockerContainer>();
  const containerByName = new Map<string, DockerContainer>();

  containers.forEach((c) => {
    containerById.set(c.Id, c);
    const cleanName = c.Names?.[0]?.replace(/^\//, '').toLowerCase();
    if (cleanName) {
      containerByName.set(cleanName, c);
    }
  });

  // 1. Önce Servisleri ekle (ContainerId eşleşmesini birebir yap)
  const matchedContainerIds = new Set<string>();

  services.forEach((s) => {
    const isDown = s.status === 'down';
    const isDegraded = s.status === 'degraded' || (typeof s.sslExpiryDays === 'number' && s.sslExpiryDays <= 14);
    const status: 'ok' | 'warn' | 'err' = isDown ? 'err' : isDegraded ? 'warn' : 'ok';

    // Gerçek bağlı container bul: Önce containerId ile, yoksa isimle
    let linkedContainer: DockerContainer | undefined;
    if (s.containerId && containerById.has(s.containerId)) {
      linkedContainer = containerById.get(s.containerId);
    } else {
      linkedContainer = containerByName.get(s.name.toLowerCase());
    }

    if (linkedContainer) {
      matchedContainerIds.add(linkedContainer.Id);
    }

    const labels = linkedContainer?.Labels || {};
    const stackName = labels['com.docker.compose.project'] || s.category || undefined;

    const isDb = /postgres|mysql|mariadb|mongo|redis/i.test(s.name) || (linkedContainer?.Image && /postgres|mysql|mariadb|mongo|redis/i.test(linkedContainer.Image));
    const isProxy = /traefik|nginx|caddy|gateway/i.test(s.name) || (linkedContainer?.Image && /traefik|nginx|caddy/i.test(linkedContainer.Image));
    const kind = isProxy ? 'proxy' : isDb ? 'database' : 'service';

    const node: TopologyNode = {
      id: `svc-${s.id}`,
      name: s.name,
      kind,
      status,
      stackName,
      subLabel: s.url ? s.url.replace(/^https?:\/\//, '') : linkedContainer?.Image || s.status.toUpperCase(),
      port: s.port ? String(s.port) : linkedContainer?.Ports?.[0]?.PublicPort ? String(linkedContainer.Ports[0].PublicPort) : undefined,
      x: 0,
      y: 0,
      refService: s,
      refContainer: linkedContainer,
      stats: linkedContainer ? containerStats[linkedContainer.Id] : undefined,
    };

    nodeMap.set(node.id, node);
    nodes.push(node);
  });

  // 2. Servis olarak eklenmemiş bağımsız Docker konteynerlerini ekle
  containers.forEach((c) => {
    if (matchedContainerIds.has(c.Id)) return;

    const cleanName = c.Names?.[0]?.replace(/^\//, '') || c.Id.slice(0, 8);
    const isRunning = c.State.toLowerCase() === 'running';
    const isDead = ['exited', 'dead'].includes(c.State.toLowerCase());
    const status: 'ok' | 'warn' | 'err' = isDead ? 'err' : isRunning ? 'ok' : 'warn';

    const labels = c.Labels || {};
    const stackName = labels['com.docker.compose.project'] || undefined;

    const isDb = /postgres|mysql|mariadb|mongo|redis/i.test(cleanName) || /postgres|mysql|mariadb|mongo|redis/i.test(c.Image);
    const isProxy = /traefik|nginx|caddy|proxy/i.test(cleanName) || /traefik|nginx|caddy/i.test(c.Image);
    const kind = isProxy ? 'proxy' : isDb ? 'database' : 'container';

    const node: TopologyNode = {
      id: `cnt-${c.Id}`,
      name: cleanName,
      kind,
      status,
      stackName,
      subLabel: c.Image || c.Status,
      port: c.Ports && c.Ports.length > 0 ? String(c.Ports[0].PublicPort || c.Ports[0].PrivatePort) : undefined,
      x: 0,
      y: 0,
      refContainer: c,
      stats: containerStats[c.Id],
    };

    nodeMap.set(node.id, node);
    nodes.push(node);
  });

  // 3. GERÇEK DOCKER AĞLARI & COMPOSE İLİŞKİLERİNE GÖRE KENARLAR (EDGES)
  // Docker ağ haritası oluştur: networkName -> nodeIds
  const networkToNodes = new Map<string, string[]>();
  const stackToNodes = new Map<string, string[]>();

  nodes.forEach((node) => {
    // A. Compose Stack Haritası
    if (node.stackName) {
      const list = stackToNodes.get(node.stackName) || [];
      list.push(node.id);
      stackToNodes.set(node.stackName, list);
    }

    // B. Docker Network Haritası
    const networks = node.refContainer?.NetworkSettings?.Networks;
    if (networks) {
      Object.keys(networks).forEach((netName) => {
        // Varsayılan 'bridge' veya 'host' ağları gürültü yapmasın (özel ağlar kıymetlidir)
        if (netName === 'bridge' || netName === 'host' || netName === 'none') return;
        const list = networkToNodes.get(netName) || [];
        list.push(node.id);
        networkToNodes.set(netName, list);
      });
    }
  });

  const edgeSet = new Set<string>();

  const addEdge = (fromId: string, toId: string, label?: string) => {
    if (fromId === toId) return;
    const key = `${fromId}->${toId}`;
    const reverseKey = `${toId}->${fromId}`;
    if (edgeSet.has(key) || edgeSet.has(reverseKey)) return;
    edgeSet.add(key);

    const fromNode = nodeMap.get(fromId);
    const toNode = nodeMap.get(toId);
    const isBroken = fromNode?.status === 'err' || toNode?.status === 'err';

    edges.push({
      fromId,
      toId,
      status: isBroken ? 'broken' : 'active',
      label,
    });
  };

  // Kural 1: Ortak Docker Ağlarını (Network) paylaşan servisleri bağla
  networkToNodes.forEach((nodeIds, netName) => {
    // Ağdaki bir proxy/gateway varsa, diğer tüm üyelere bağlansın
    const proxyInNet = nodeIds.filter((id) => nodeMap.get(id)?.kind === 'proxy');
    const othersInNet = nodeIds.filter((id) => nodeMap.get(id)?.kind !== 'proxy');

    if (proxyInNet.length > 0) {
      proxyInNet.forEach((pId) => {
        othersInNet.forEach((oId) => addEdge(pId, oId, netName));
      });
    } else {
      // Proxy yoksa, aynı ağdaki veritabanları ile uygulama servislerini bağla
      const dbs = nodeIds.filter((id) => nodeMap.get(id)?.kind === 'database');
      const apps = nodeIds.filter((id) => nodeMap.get(id)?.kind !== 'database');
      if (dbs.length > 0) {
        dbs.forEach((dbId) => {
          apps.forEach((appId) => addEdge(appId, dbId, netName));
        });
      } else if (nodeIds.length <= 4) {
        // Küçük özel ağlarda ardışık bağla
        for (let i = 0; i < nodeIds.length - 1; i++) {
          addEdge(nodeIds[i], nodeIds[i + 1], netName);
        }
      }
    }
  });

  // Kural 2: Aynı Docker Compose projesindeki (Stack) servisleri birbirine bağla
  stackToNodes.forEach((nodeIds, stack) => {
    const dbs = nodeIds.filter((id) => nodeMap.get(id)?.kind === 'database');
    const apps = nodeIds.filter((id) => nodeMap.get(id)?.kind !== 'database');
    if (dbs.length > 0 && apps.length > 0) {
      dbs.forEach((dbId) => {
        apps.forEach((appId) => addEdge(appId, dbId, stack));
      });
    } else if (nodeIds.length > 1 && nodeIds.length <= 5) {
      for (let i = 0; i < nodeIds.length - 1; i++) {
        addEdge(nodeIds[i], nodeIds[i + 1], stack);
      }
    }
  });

  // Kural 3: Traefik / Reverse Proxy etiketlerini incele
  const proxies = nodes.filter((n) => n.kind === 'proxy');
  if (proxies.length > 0) {
    nodes.forEach((n) => {
      if (n.kind === 'proxy') return;
      const labels = n.refContainer?.Labels || {};
      const hasTraefik = Object.keys(labels).some((k) => k.startsWith('traefik.'));
      if (hasTraefik) {
        proxies.forEach((p) => addEdge(p.id, n.id, 'traefik'));
      }
    });
  }

  // 4. EĞER HİÇBİR AĞ VERİSİ YOKSA VEYA BAĞLANTISIZ KALMIŞSA
  // Geriye dönük zarif düşüş (Fallback):
  // Eğer hiç kenar oluşmadıysa ve proxy varsa, genel proxy köprüsü oluştur
  if (edges.length === 0 && proxies.length > 0) {
    const apps = nodes.filter((n) => n.kind !== 'proxy');
    proxies.forEach((p) => {
      apps.forEach((a) => addEdge(p.id, a.id));
    });
  }

  // 5. STACK / MİMARİ GRUPLANDIRMAYA GÖRE KOORDİNAT HESAPLAMASI (Ferah & Geniş Yerleşim)
  const proxyNodes = nodes.filter((n) => n.kind === 'proxy');
  const dbNodes = nodes.filter((n) => n.kind === 'database');
  const appNodes = nodes.filter((n) => n.kind !== 'proxy' && n.kind !== 'database');

  const colSpacing = 210;
  const rowSpacing = 95;

  // Proxy'leri yerleştir (Üst Katman)
  proxyNodes.forEach((n, idx) => {
    n.x = 60 + idx * colSpacing;
    n.y = 45;
  });

  // Uygulamaları yerleştir (Orta Katman) - Aynı stack'te olanları yan yana grupla
  appNodes.sort((a, b) => (a.stackName || '').localeCompare(b.stackName || ''));
  const startY = proxyNodes.length > 0 ? 150 : 50;
  appNodes.forEach((n, idx) => {
    const itemsPerRow = Math.min(4, Math.max(1, appNodes.length));
    const col = idx % itemsPerRow;
    const row = Math.floor(idx / itemsPerRow);
    n.x = 60 + col * colSpacing;
    n.y = startY + row * rowSpacing;
  });

  // Veritabanlarını yerleştir (Alt Katman)
  const maxYApp = appNodes.reduce((max, n) => Math.max(max, n.y), startY);
  dbNodes.forEach((n, idx) => {
    n.x = 60 + idx * colSpacing;
    n.y = maxYApp + 110;
  });

  return { nodes, edges };
}
