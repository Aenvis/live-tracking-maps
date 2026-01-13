# Live Notification Maps

A proof-of-concept for real-time geo data tracking with live notifications using GraphQL subscriptions.

## Features

- **Real-time tracking** - Live updates via GraphQL subscriptions over WebSocket
- **5 simulated vehicles** - Each with unique color and starting location (Berlin, Paris, London, Rome, Amsterdam)
- **Route visualization** - Dashed lines showing historical movement paths
- **Interactive map** - OpenLayers with OpenStreetMap tiles, tooltips on hover
- **Filtering** - Toggle visibility of individual vehicles via sidebar checkboxes
- **Notifications** - Bell icon with badge count, click to focus on specific points
- **Recent updates feed** - Sidebar showing latest position updates

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           Server                                │
│  ┌──────────────┐    ┌─────────┐    ┌────────────────────────┐  │
│  │ GeoSimulator │───▶│ PubSub  │───▶│ GraphQL Subscription   │  │
│  │ (5s interval)│    └─────────┘    └───────────┬────────────┘  │
│  └──────────────┘                               │               │
└─────────────────────────────────────────────────┼───────────────┘
                                                  │ WebSocket
┌─────────────────────────────────────────────────┼───────────────┐
│                           UI                    ▼               │
│  ┌──────────────┐    ┌─────────────────────────────────────┐   │
│  │ Apollo Client│───▶│ React Components                    │   │
│  │ (ws + http)  │    │  • Map (OpenLayers)                 │   │
│  └──────────────┘    │  • Sidebar (filters, recent)        │   │
│                      │  • NotificationBell                  │   │
│                      └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Server
- Node.js + TypeScript
- Apollo Server 4
- GraphQL with `graphql-ws` for subscriptions
- Express

### UI
- React 19
- TypeScript
- Vite
- Apollo Client
- Material-UI 6
- OpenLayers 10

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Install server dependencies
cd server
npm install

# Install UI dependencies
cd ../ui
npm install
```

### Running the Application

**Terminal 1 - Start the server:**
```bash
cd server
npm run dev
```
Server runs at `http://localhost:4000/graphql`

**Terminal 2 - Start the UI:**
```bash
cd ui
npm run dev
```
UI runs at `http://localhost:5173`

## Project Structure

```
live-notif-maps/
├── server/
│   ├── src/
│   │   ├── index.ts          # Server entry point
│   │   ├── schema.ts         # GraphQL type definitions
│   │   ├── resolvers.ts      # Query/Subscription resolvers
│   │   └── geo-simulator.ts  # Random geo data generator
│   ├── package.json
│   └── tsconfig.json
│
├── ui/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Map.tsx           # OpenLayers map
│   │   │   ├── Sidebar.tsx       # Filter & recent updates
│   │   │   ├── Layout.tsx        # Main layout
│   │   │   └── NotificationBell.tsx
│   │   ├── graphql/
│   │   │   └── subscriptions.ts  # GraphQL operations
│   │   ├── apollo-client.ts      # Apollo Client config
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
└── README.md
```

## GraphQL Schema

```graphql
type GeoData {
  id: ID!
  name: String!
  lat: Float!
  lon: Float!
  identifier: String!
  timestamp: String!
}

type Query {
  geoDataList: [GeoData!]!
}

type Subscription {
  newGeoData: GeoData!
}
```

## Simulated Vehicles

| ID | Name | Color | Start Location |
|----|------|-------|----------------|
| VEHICLE-001 | Truck Alpha | Red | Berlin |
| VEHICLE-002 | Van Beta | Blue | Paris |
| VEHICLE-003 | Car Gamma | Green | London |
| VEHICLE-004 | Bike Delta | Orange | Rome |
| VEHICLE-005 | Drone Echo | Purple | Amsterdam |

## License

MIT

