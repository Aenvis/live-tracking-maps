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

export const GEO_DATA_LIST_QUERY = gql`
  query GeoDataList {
    geoDataList {
      id
      name
      lat
      lon
      identifier
      timestamp
    }
  }
`;

