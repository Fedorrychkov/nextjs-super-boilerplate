export const routes = {
  home: {
    path: '/',
    name: 'Home',
    needAuth: false,
  },
  uiKit: {
    path: '/ui-kit',
    name: 'UI Kit',
    needAuth: false,
  },
  profile: {
    path: '/profile',
    name: 'Profile',
    needAuth: true,
  },
  login: {
    path: '/login',
    name: 'Login',
    needAuth: false,
  },
  logout: {
    path: '/logout',
    name: 'Logout',
    needAuth: false,
  },
  refresh: {
    path: '/refresh',
    name: 'Refresh',
    needAuth: false,
  },
}
