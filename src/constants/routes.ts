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
  articles: {
    path: '/admin/articles',
    name: 'Articles',
    needAuth: true,
  },
  articlesCreate: {
    path: '/admin/articles/create',
    name: 'Create Article',
    needAuth: true,
  },
  articlePublic: {
    path: '/article/:slug',
    name: 'Article',
    needAuth: false,
  },
  articlesPublic: {
    path: '/articles',
    name: 'Articles',
    needAuth: false,
  },
  articlePreview: {
    path: '/preview/:slug',
    name: 'Article Preview',
    needAuth: true,
  },
  articlePrivate: {
    path: '/private-article/:slug',
    name: 'Article Private',
    needAuth: true,
  },
}
