import { 
  Drawer, 
  Box, 
  Typography, 
  Divider, 
  FormGroup, 
  FormControlLabel, 
  Checkbox,
  Chip,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { VEHICLE_COLORS } from './Map';
import { GeoData } from '../graphql/subscriptions';

const SIDEBAR_WIDTH = 300;

// All available vehicle identifiers
const ALL_IDENTIFIERS = [
  { id: 'VEHICLE-001', name: 'Truck Alpha' },
  { id: 'VEHICLE-002', name: 'Van Beta' },
  { id: 'VEHICLE-003', name: 'Car Gamma' },
  { id: 'VEHICLE-004', name: 'Bike Delta' },
  { id: 'VEHICLE-005', name: 'Drone Echo' },
];

interface SidebarProps {
  filteredIdentifiers: Set<string>;
  onFilterChange: (identifiers: Set<string>) => void;
  recentData: GeoData[];
}

export function Sidebar({ filteredIdentifiers, onFilterChange, recentData }: SidebarProps) {
  const handleCheckboxChange = (identifier: string, checked: boolean) => {
    const newFiltered = new Set(filteredIdentifiers);
    if (checked) {
      newFiltered.add(identifier);
    } else {
      newFiltered.delete(identifier);
    }
    onFilterChange(newFiltered);
  };

  const handleSelectAll = () => {
    onFilterChange(new Set(ALL_IDENTIFIERS.map((v) => v.id)));
  };

  const handleClearAll = () => {
    onFilterChange(new Set());
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" component="h1" gutterBottom>
          Live Tracking
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Real-time vehicle positions
        </Typography>
      </Box>
      
      <Divider />
      
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2">
            Filter by Vehicle
          </Typography>
          <Box>
            <Chip 
              label="All" 
              size="small" 
              onClick={handleSelectAll} 
              sx={{ mr: 0.5 }}
              variant={filteredIdentifiers.size === ALL_IDENTIFIERS.length ? 'filled' : 'outlined'}
            />
            <Chip 
              label="None" 
              size="small" 
              onClick={handleClearAll}
              variant={filteredIdentifiers.size === 0 ? 'filled' : 'outlined'}
            />
          </Box>
        </Box>
        
        <FormGroup>
          {ALL_IDENTIFIERS.map((vehicle) => (
            <FormControlLabel
              key={vehicle.id}
              control={
                <Checkbox
                  checked={filteredIdentifiers.size === 0 || filteredIdentifiers.has(vehicle.id)}
                  onChange={(e) => handleCheckboxChange(vehicle.id, e.target.checked)}
                  sx={{
                    color: VEHICLE_COLORS[vehicle.id],
                    '&.Mui-checked': {
                      color: VEHICLE_COLORS[vehicle.id],
                    },
                  }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: VEHICLE_COLORS[vehicle.id],
                    }}
                  />
                  <Typography variant="body2">{vehicle.name}</Typography>
                </Box>
              }
            />
          ))}
        </FormGroup>
      </Box>
      
      <Divider />
      
      <Box sx={{ p: 2, flexGrow: 1, overflow: 'auto' }}>
        <Typography variant="subtitle2" gutterBottom>
          Recent Updates
        </Typography>
        <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
          {recentData.slice(-10).reverse().map((data) => (
            <ListItem 
              key={data.id} 
              sx={{ 
                py: 0.5,
                borderLeft: `3px solid ${VEHICLE_COLORS[data.identifier] || '#666'}`,
                mb: 0.5,
                backgroundColor: 'rgba(0,0,0,0.02)',
              }}
            >
              <ListItemText
                primary={
                  <Typography variant="body2" fontWeight="medium">
                    {data.name}
                  </Typography>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {data.lat.toFixed(4)}, {data.lon.toFixed(4)}
                    <br />
                    {new Date(data.timestamp).toLocaleTimeString()}
                  </Typography>
                }
              />
            </ListItem>
          ))}
          {recentData.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Waiting for data...
            </Typography>
          )}
        </List>
      </Box>
    </Drawer>
  );
}

export { SIDEBAR_WIDTH };
