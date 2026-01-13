import { PubSub } from 'graphql-subscriptions';
import type { GeoData } from './schema.js';

export const pubsub = new PubSub();
export const NEW_GEO_DATA = 'NEW_GEO_DATA';

// In-memory store for geo data
const geoDataStore: GeoData[] = [];

export const addGeoData = (geoData: GeoData) => {
  geoDataStore.push(geoData);
  pubsub.publish(NEW_GEO_DATA, { newGeoData: geoData });
};

export const resolvers = {
  Query: {
    geoDataList: (): GeoData[] => geoDataStore,
  },
  Subscription: {
    newGeoData: {
      subscribe: () => pubsub.asyncIterator([NEW_GEO_DATA]),
    },
  },
};

