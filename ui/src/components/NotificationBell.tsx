import { useState } from 'react';
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { GeoData } from '../graphql/subscriptions';
import { VEHICLE_COLORS } from './Map';

interface NotificationBellProps {
  notifications: GeoData[];
  onNotificationClick: (data: GeoData) => void;
  onClearAll: () => void;
}

export function NotificationBell({ notifications, onNotificationClick, onClearAll }: NotificationBellProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (data: GeoData) => {
    onNotificationClick(data);
    handleClose();
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton
        onClick={handleClick}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 1000,
          backgroundColor: 'white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          '&:hover': {
            backgroundColor: '#f5f5f5',
          },
        }}
      >
        <Badge 
          badgeContent={notifications.length} 
          color="error"
          max={99}
        >
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            sx: {
              width: 320,
              maxHeight: 400,
              mt: 1,
            },
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight="bold">
            New Points ({notifications.length})
          </Typography>
          {notifications.length > 0 && (
            <Button size="small" onClick={onClearAll}>
              Clear All
            </Button>
          )}
        </Box>
        
        <Divider />
        
        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No new notifications
            </Typography>
          </Box>
        ) : (
          <List sx={{ maxHeight: 300, overflow: 'auto', py: 0 }}>
            {notifications.slice().reverse().map((data) => (
              <ListItemButton
                key={data.id}
                onClick={() => handleNotificationClick(data)}
                sx={{
                  borderLeft: `4px solid ${VEHICLE_COLORS[data.identifier] || '#666'}`,
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.04)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <LocationOnIcon 
                    sx={{ color: VEHICLE_COLORS[data.identifier] || '#666' }} 
                  />
                </ListItemIcon>
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
              </ListItemButton>
            ))}
          </List>
        )}
      </Popover>
    </>
  );
}

