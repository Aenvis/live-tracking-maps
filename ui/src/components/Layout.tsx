import { Box } from '@mui/material';
import { ReactNode } from 'react';
import { Sidebar, SIDEBAR_WIDTH } from './Sidebar';
import { GeoData } from '../graphql/subscriptions';

interface LayoutProps {
  children: ReactNode;
  filteredIdentifiers: Set<string>;
  onFilterChange: (identifiers: Set<string>) => void;
  recentData: GeoData[];
}

export function Layout({ children, filteredIdentifiers, onFilterChange, recentData }: LayoutProps) {
  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar 
        filteredIdentifiers={filteredIdentifiers}
        onFilterChange={onFilterChange}
        recentData={recentData}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: '100%',
          width: `calc(100vw - ${SIDEBAR_WIDTH}px)`,
          position: 'relative',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
