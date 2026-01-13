export const typeDefs = `#graphql
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
`;

export interface GeoData {
  id: string;
  name: string;
  lat: number;
  lon: number;
  identifier: string;
  timestamp: string;
}

