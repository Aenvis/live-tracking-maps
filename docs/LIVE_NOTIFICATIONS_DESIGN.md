# Live Notifications Design Document

A comprehensive guide for implementing real-time geo data notifications in map applications using GraphQL subscriptions.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Server Implementation](#server-implementation)
4. [Client Implementation](#client-implementation)
5. [Map Integration](#map-integration)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Overview

### What This Document Covers

This guide explains how to implement a real-time notification system for geo data updates on a map. The system allows:

- **Push-based updates**: Server pushes new data to clients immediately
- **No polling required**: WebSocket connection maintains persistent link
- **Scalable**: Supports multiple concurrent clients
- **Efficient**: Only transmits changes, not full state

### When to Use This Pattern

| Use Case | Recommended |
|----------|-------------|
| Vehicle/asset tracking | ✅ Yes |
| Live delivery tracking | ✅ Yes |
| Real-time fleet management | ✅ Yes |
| Static map with occasional updates | ❌ Use polling instead |
| Infrequent updates (< 1/minute) | ❌ Use polling instead |

---

## Architecture

### High-Level Flow

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Data Source   │      │     Server      │      │     Client      │
│  (GPS, Sensors) │      │                 │      │                 │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         │                        │                        │
         │  1. New geo data       │                        │
         │───────────────────────▶│                        │
         │                        │                        │
         │                        │  2. Publish to PubSub  │
         │                        │─────────┐              │
         │                        │         │              │
         │                        │◀────────┘              │
         │                        │                        │
         │                        │  3. WebSocket push     │
         │                        │───────────────────────▶│
         │                        │                        │
         │                        │                        │  4. Update map
         │                        │                        │─────────┐
         │                        │                        │         │
         │                        │                        │◀────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Transport | WebSocket | Bi-directional persistent connection |
| Protocol | GraphQL Subscriptions | Typed, schema-driven real-time API |
| Server | Apollo Server + graphql-ws | GraphQL server with subscription support |
| Client | Apollo Client + graphql-ws | React GraphQL client |
| Map | OpenLayers / Mapbox / Leaflet | Map rendering |

---

## Server Implementation

### Step 1: Define GraphQL Schema

Create a schema that includes your geo data type and a subscription:

```graphql
# schema.graphql

type GeoData {
  id: ID!
  name: String!
  lat: Float!
  lon: Float!
  identifier: String!    # Unique ID for the tracked entity
  timestamp: String!
}

type Query {
  # Initial data load
  geoDataList: [GeoData!]!
}

type Subscription {
  # Real-time updates
  newGeoData: GeoData!
}
```

**Tips:**
- Include `identifier` to group updates by entity (vehicle, device, etc.)
- Include `timestamp` for ordering and debugging
- Keep the payload minimal - only essential fields

### Step 2: Set Up PubSub

PubSub is the message broker that connects data producers to GraphQL subscriptions.

```typescript
// resolvers.ts
import { PubSub } from 'graphql-subscriptions';

// Create a single PubSub instance (singleton)
export const pubsub = new PubSub();

// Event name constant
export const NEW_GEO_DATA = 'NEW_GEO_DATA';

// Function to publish new data
export function publishGeoData(geoData: GeoData): void {
  pubsub.publish(NEW_GEO_DATA, { newGeoData: geoData });
}
```

**Important:** For production, replace `PubSub` with a distributed solution:
- `graphql-redis-subscriptions` - Redis-backed PubSub
- `graphql-kafka-subscriptions` - Kafka-backed PubSub

### Step 3: Implement Resolvers

```typescript
// resolvers.ts
export const resolvers = {
  Query: {
    geoDataList: (): GeoData[] => {
      // Return current/historical data
      return geoDataStore;
    },
  },
  
  Subscription: {
    newGeoData: {
      // asyncIterator listens for published events
      subscribe: () => pubsub.asyncIterator([NEW_GEO_DATA]),
    },
  },
};
```

### Step 4: Configure WebSocket Server

Apollo Server 4 requires explicit WebSocket setup:

```typescript
// index.ts
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { createServer } from 'http';
import express from 'express';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  
  // Create executable schema
  const schema = makeExecutableSchema({ typeDefs, resolvers });
  
  // WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',  // Same path as HTTP endpoint
  });
  
  // Connect graphql-ws to WebSocket server
  const serverCleanup = useServer({ schema }, wsServer);
  
  // Apollo Server with drain plugins
  const server = new ApolloServer({
    schema,
    plugins: [
      // Proper shutdown for HTTP server
      ApolloServerPluginDrainHttpServer({ httpServer }),
      // Proper shutdown for WebSocket server
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });
  
  await server.start();
  
  // HTTP middleware with CORS
  app.use(
    '/graphql',
    cors({
      origin: ['http://localhost:5173'],  // Your frontend URL
      credentials: true,
    }),
    express.json(),
    expressMiddleware(server)
  );
  
  httpServer.listen(4000, () => {
    console.log('🚀 Server ready at http://localhost:4000/graphql');
    console.log('🔌 WebSocket ready at ws://localhost:4000/graphql');
  });
}
```

**Key Points:**
- WebSocket and HTTP share the same `/graphql` path
- Include drain plugins for graceful shutdown
- Configure CORS for your frontend origin

---

## Client Implementation

### Step 1: Configure Apollo Client with Split Link

The client needs to route subscriptions through WebSocket and queries through HTTP:

```typescript
// apollo-client.ts
import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

// HTTP link for queries and mutations
const httpLink = new HttpLink({
  uri: 'http://localhost:4000/graphql',
});

// WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: 'ws://localhost:4000/graphql',
    // Optional: connection lifecycle hooks
    on: {
      connected: () => console.log('✅ WebSocket connected'),
      closed: () => console.log('❌ WebSocket closed'),
      error: (err) => console.error('❌ WebSocket error:', err),
    },
    // Reconnection settings
    retryAttempts: 5,
    shouldRetry: () => true,
  })
);

// Split link: route by operation type
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,   // Subscriptions go here
  httpLink  // Queries/mutations go here
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
```

### Step 2: Define Subscription Query

```typescript
// graphql/subscriptions.ts
import { gql } from '@apollo/client';

export interface GeoData {
  id: string;
  name: string;
  lat: number;
  lon: number;
  identifier: string;
  timestamp: string;
}

export const NEW_GEO_DATA_SUBSCRIPTION = gql`
  subscription NewGeoData {
    newGeoData {
      id
      name
      lat
      lon
      identifier
      timestamp
    }
  }
`;
```

### Step 3: Use Subscription in React Component

```tsx
// components/MapContainer.tsx
import { useSubscription } from '@apollo/client';
import { NEW_GEO_DATA_SUBSCRIPTION, GeoData } from '../graphql/subscriptions';

function MapContainer() {
  // Subscribe to real-time updates
  const { data, loading, error } = useSubscription<{ newGeoData: GeoData }>(
    NEW_GEO_DATA_SUBSCRIPTION
  );
  
  // Handle new data when it arrives
  useEffect(() => {
    if (data?.newGeoData) {
      const geoData = data.newGeoData;
      console.log('New data received:', geoData);
      
      // Update your map here
      addMarkerToMap(geoData);
      updateRouteLine(geoData);
    }
  }, [data]);
  
  // Handle connection states
  if (loading) {
    return <div>Connecting to live feed...</div>;
  }
  
  if (error) {
    return <div>Connection error: {error.message}</div>;
  }
  
  return <Map />;
}
```

---

## Map Integration

### Pattern: Maintaining Historical Data

Store historical data by identifier to draw routes:

```typescript
// Store geo data grouped by identifier
const geoDataByIdentifier = useRef<Map<string, GeoData[]>>(new Map());

useEffect(() => {
  if (!data?.newGeoData) return;
  
  const geoData = data.newGeoData;
  
  // Get or create array for this identifier
  const history = geoDataByIdentifier.current.get(geoData.identifier) || [];
  history.push(geoData);
  geoDataByIdentifier.current.set(geoData.identifier, history);
  
  // Now you have full history to draw route
  drawRoute(history);
}, [data]);
```

### Pattern: Latest vs Historical Points

Differentiate between the current position and historical trail:

```typescript
// When adding new point, mark previous as historical
pointsOnMap.forEach((point) => {
  if (point.identifier === newData.identifier && point.isLatest) {
    point.isLatest = false;
    point.updateStyle();  // Make it smaller/dimmer
  }
});

// Add new point as latest
addPoint({
  ...newData,
  isLatest: true,  // Render with prominent style
});
```

### OpenLayers Example

```typescript
// Style function that differentiates latest vs historical
const pointStyle = (feature: Feature) => {
  const isLatest = feature.get('isLatest');
  const color = getColorForIdentifier(feature.get('identifier'));
  
  return new Style({
    image: new CircleStyle({
      radius: isLatest ? 12 : 6,
      fill: new Fill({ 
        color: isLatest ? color : color + '80'  // 50% opacity for historical
      }),
      stroke: new Stroke({ 
        color: '#ffffff', 
        width: isLatest ? 3 : 1 
      }),
    }),
    // Only show label for latest position
    text: isLatest ? new Text({
      text: feature.get('name'),
      offsetY: -20,
    }) : undefined,
  });
};
```

---

## Best Practices

### 1. Connection Management

```typescript
// Always handle disconnection gracefully
const wsClient = createClient({
  url: 'ws://localhost:4000/graphql',
  retryAttempts: Infinity,  // Keep trying to reconnect
  retryWait: async (retries) => {
    // Exponential backoff: 1s, 2s, 4s, 8s... max 30s
    await new Promise(r => 
      setTimeout(r, Math.min(1000 * Math.pow(2, retries), 30000))
    );
  },
});
```

### 2. Throttling High-Frequency Updates

If data arrives faster than the UI can render:

```typescript
// Server-side: Batch updates
let pendingUpdates: GeoData[] = [];
setInterval(() => {
  if (pendingUpdates.length > 0) {
    pubsub.publish(NEW_GEO_DATA_BATCH, { batch: pendingUpdates });
    pendingUpdates = [];
  }
}, 100);  // Publish at most 10 times/second

// Client-side: Debounce rendering
const debouncedRender = useMemo(
  () => debounce((data: GeoData) => updateMap(data), 50),
  []
);
```

### 3. Memory Management

Clean up old data to prevent memory leaks:

```typescript
// Limit history per identifier
const MAX_HISTORY_PER_ENTITY = 100;

function addToHistory(identifier: string, data: GeoData) {
  const history = geoDataByIdentifier.get(identifier) || [];
  history.push(data);
  
  // Remove oldest if over limit
  if (history.length > MAX_HISTORY_PER_ENTITY) {
    const removed = history.shift();
    removePointFromMap(removed.id);
  }
  
  geoDataByIdentifier.set(identifier, history);
}
```

### 4. Error Boundaries

Wrap subscription components in error boundaries:

```tsx
<ErrorBoundary fallback={<OfflineMapView />}>
  <LiveMapView />
</ErrorBoundary>
```

### 5. Offline Support

Cache last known positions:

```typescript
// Save to localStorage on each update
useEffect(() => {
  if (data?.newGeoData) {
    const cached = JSON.parse(localStorage.getItem('lastPositions') || '{}');
    cached[data.newGeoData.identifier] = data.newGeoData;
    localStorage.setItem('lastPositions', JSON.stringify(cached));
  }
}, [data]);

// Restore on mount
useEffect(() => {
  const cached = JSON.parse(localStorage.getItem('lastPositions') || '{}');
  Object.values(cached).forEach(addMarkerToMap);
}, []);
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "WebSocket closed" immediately | CORS misconfiguration | Add frontend origin to server CORS |
| "asyncIterator is not a function" | Wrong graphql-subscriptions version | Use `pubsub.asyncIterator()` not `asyncIterableIterator()` |
| No data received | Split link not configured | Ensure subscription operations route to wsLink |
| Data arrives but map doesn't update | React re-render issue | Use refs for map instance, not state |
| Memory grows indefinitely | No cleanup of historical data | Implement max history limits |

### Debugging Checklist

1. **Server logs**: Is the server receiving and publishing data?
2. **Network tab**: Is WebSocket connection established? (Status 101)
3. **Console logs**: Is data arriving at the subscription hook?
4. **React DevTools**: Is the component re-rendering?

### Testing Subscriptions

```typescript
// Manual test: Publish from server console
import { publishGeoData } from './resolvers';

publishGeoData({
  id: 'test-1',
  name: 'Test Point',
  lat: 51.5074,
  lon: -0.1278,
  identifier: 'TEST-001',
  timestamp: new Date().toISOString(),
});
```

---

## Dependencies

### Server
```json
{
  "@apollo/server": "^4.x",
  "@graphql-tools/schema": "^10.x",
  "graphql": "^16.x",
  "graphql-subscriptions": "^2.x",
  "graphql-ws": "^5.x",
  "ws": "^8.x",
  "express": "^4.x",
  "cors": "^2.x"
}
```

### Client
```json
{
  "@apollo/client": "^3.x",
  "graphql": "^16.x",
  "graphql-ws": "^5.x"
}
```

---

## Summary

Implementing live notifications for map applications requires:

1. **Server**: GraphQL schema with Subscription type, PubSub for event distribution, WebSocket server configuration
2. **Client**: Apollo Client with split link (HTTP + WebSocket), subscription hook in React
3. **Map**: Historical data management, visual differentiation of latest vs historical points

The key insight is that GraphQL subscriptions provide a clean, typed API for real-time data while WebSocket handles the transport layer efficiently.

For production deployments, consider:
- Redis/Kafka-backed PubSub for horizontal scaling
- Connection authentication via `connectionParams`
- Rate limiting and throttling for high-frequency updates
- Graceful degradation to polling when WebSocket fails

