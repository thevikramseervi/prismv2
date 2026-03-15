import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Chip,
  Container,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  CalendarMonth,
  ListAlt,
  BeachAccess,
  Receipt,
  Campaign,
  People,
  EventNote,
  Settings,
  Lock,
  Logout,
  Notifications,
  AssignmentTurnedIn,
  Assessment,
  Brightness4,
  Brightness7,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeModeContext';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../api/notifications';
import { QUERY_KEYS } from '../queryKeys';
import ChangePasswordDialog from '../components/ChangePasswordDialog';
import { Role } from '../types';

const drawerWidthExpanded = 260;
const drawerWidthCollapsed = 88;

interface NavItem {
  title: string;
  path: string;
  icon: React.ReactElement;
  roles?: Role[];
}

const navItems: NavItem[] = [
  { title: 'Dashboard', path: '/', icon: <Dashboard /> },
  { title: 'Attendance', path: '/attendance', icon: <CalendarMonth /> },
  { title: 'Activity Report', path: '/activity', icon: <ListAlt /> },
  { title: 'Leave', path: '/leave', icon: <BeachAccess /> },
  { title: 'Salary Slips', path: '/salary-slips', icon: <Receipt /> },
  { title: 'Announcements', path: '/announcements', icon: <Campaign /> },
  { title: 'Holidays', path: '/holidays', icon: <EventNote /> },
  {
    title: 'Leave Approval',
    path: '/leave-approval',
    icon: <AssignmentTurnedIn />,
    roles: [Role.LAB_ADMIN, Role.SUPER_ADMIN],
  },
  {
    title: 'Reports',
    path: '/reports',
    icon: <Assessment />,
    roles: [Role.LAB_ADMIN, Role.SUPER_ADMIN],
  },
  {
    title: 'Users',
    path: '/users',
    icon: <People />,
    roles: [Role.LAB_ADMIN, Role.SUPER_ADMIN],
  },
  {
    title: 'Admin',
    path: '/admin',
    icon: <Settings />,
    roles: [Role.LAB_ADMIN, Role.SUPER_ADMIN],
  },
];

const DashboardLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: unreadData } = useQuery({
    queryKey: QUERY_KEYS.notificationsUnreadCount,
    queryFn: notificationsApi.getUnreadCount,
    staleTime: 60_000,
  });

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleDesktopSidebarToggle = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    if (!user) return false;
    return item.roles.includes(user.role as Role);
  });

  const isPathActive = (itemPath: string) => {
    if (itemPath === '/') {
      return location.pathname === '/';
    }
    return location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);
  };

  useEffect(() => {
    const activeTitle =
      navItems.find((item) => isPathActive(item.path))?.title ?? 'Dashboard';
    document.title = `Attend Ease – ${activeTitle}`;
  }, [location.pathname]);

  const effectiveDrawerWidth = sidebarCollapsed ? drawerWidthCollapsed : drawerWidthExpanded;

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar
        sx={{
          background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)',
          color: 'white',
          minHeight: { xs: 56, sm: 64 },
          px: 2,
        }}
      >
        <Typography variant="h6" noWrap component="div" fontWeight={800} sx={{ flexGrow: 1 }}>
          Attend Ease
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1.5, py: 2, flex: 1 }}>
        {filteredNavItems.map((item) => {
          const isActive = isPathActive(item.path);
          return (
            <ListItem key={item.title} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                selected={isActive}
                sx={{
                  borderRadius: 2,
                  py: 1.25,
                  px: { xs: 2, sm: sidebarCollapsed ? 1.25 : 2 },
                  justifyContent: { xs: 'flex-start', sm: sidebarCollapsed ? 'center' : 'flex-start' },
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'white',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? 'white' : 'text.secondary',
                    minWidth: { xs: 40, sm: sidebarCollapsed ? 0 : 40 },
                    mr: { xs: 1.5, sm: sidebarCollapsed ? 0 : 1.5 },
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.title}
                  primaryTypographyProps={{ fontWeight: isActive ? 600 : 500 }}
                  sx={{
                    display: { xs: 'block', sm: sidebarCollapsed ? 'none' : 'block' },
                    transition: 'opacity 0.2s',
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${effectiveDrawerWidth}px)` },
          ml: { sm: `${effectiveDrawerWidth}px` },
          transition: (theme) => theme.transitions.create(['margin', 'width']),
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          <Tooltip title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDesktopSidebarToggle}
              sx={{ mr: 2, display: { xs: 'none', sm: 'inline-flex' } }}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Open menu">
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { xs: 'inline-flex', sm: 'none' } }}
              aria-label="Open menu"
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {navItems.find((item) => isPathActive(item.path))?.title || 'Dashboard'}
          </Typography>

          <Tooltip title="Notifications">
            <IconButton
              color="inherit"
              sx={{ mr: 1 }}
              onClick={() => navigate('/notifications')}
              aria-label="Notifications"
            >
              <Badge badgeContent={unreadData?.unreadCount ?? 0} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton
              color="inherit"
              onClick={toggleMode}
              sx={{ mr: 1 }}
              aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Account menu">
            <IconButton onClick={handleMenuOpen} sx={{ p: 0 }} aria-label="Account menu">
              <Avatar
              sx={{
                bgcolor: 'primary.main',
                width: 40,
                height: 40,
              }}
            >
              {user?.name.charAt(0).toUpperCase()}
            </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ px: 2, py: 1, minWidth: 200 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {user?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
              <Chip
                label={user?.role.replace('_', ' ')}
                size="small"
                color="primary"
                sx={{ mt: 1 }}
              />
            </Box>
            <Divider />
            <MenuItem
              onClick={() => {
                navigate('/profile');
                handleMenuClose();
              }}
            >
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              My profile
            </MenuItem>
            <MenuItem
              onClick={() => {
                setChangePasswordOpen(true);
                handleMenuClose();
              }}
            >
              <ListItemIcon>
                <Lock fontSize="small" />
              </ListItemIcon>
              Change password
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
          <ChangePasswordDialog
            open={changePasswordOpen}
            onClose={() => setChangePasswordOpen(false)}
          />
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: { sm: effectiveDrawerWidth },
          flexShrink: { sm: 0 },
          overflow: 'hidden',
          transition: (theme) => theme.transitions.create('width'),
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 260 },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: effectiveDrawerWidth,
              transition: (theme) => theme.transitions.create('width'),
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${effectiveDrawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
          minWidth: 0,
          overflowX: 'hidden',
          transition: (theme) => theme.transitions.create('width'),
        }}
      >
        <Toolbar />
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
};

export default DashboardLayout;
