import { useState, useCallback } from 'react';
import { Layout } from './components/Layout';
import { MapView } from './components/Map';
import { NotificationBell } from './components/NotificationBell';
import { GeoData } from './graphql/subscriptions';
import { Box } from '@mui/material';

function App() {
  const [filteredIdentifiers, setFilteredIdentifiers] = useState<Set<string>>(new Set());
  const [recentData, setRecentData] = useState<GeoData[]>([]);
  const [notifications, setNotifications] = useState<GeoData[]>([]);
  const [focusPoint, setFocusPoint] = useState<GeoData | null>(null);

  const handleNewGeoData = useCallback((data: GeoData) => {
    setRecentData((prev) => [...prev.slice(-50), data]);
    setNotifications((prev) => [...prev.slice(-99), data]); // Keep max 100 notifications
  }, []);

  const handleNotificationClick = useCallback((data: GeoData) => {
    // Remove this notification from the list
    setNotifications((prev) => prev.filter((n) => n.id !== data.id));
    // Focus on the point
    setFocusPoint(data);
  }, []);

  const handleClearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <Layout 
      filteredIdentifiers={filteredIdentifiers}
      onFilterChange={setFilteredIdentifiers}
      recentData={recentData}
    >
      <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
        <MapView 
          filteredIdentifiers={filteredIdentifiers}
          onNewGeoData={handleNewGeoData}
          focusPoint={focusPoint}
        />
        <NotificationBell
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onClearAll={handleClearAllNotifications}
        />
      </Box>
    </Layout>
  );
}

export default App;
