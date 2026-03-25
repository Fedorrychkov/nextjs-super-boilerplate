export const en = {
  common: {
    ok: 'OK',
    cancel: 'Cancel',
    close: 'Close',
    save: 'Save',
  },
  auth: {
    messages: {
      loggedOutSuccessfully: 'Logged out successfully',
    },
    errors: {
      invalidPassword: 'Invalid password',
      invalidToken: 'Invalid or expired token',
      refreshTokenNotFound: 'Refresh token not found',
      accessTokenRequired: 'Access token is required',
      invalidOrExpiredAccessToken: 'Invalid or expired access token',
    },
  },
  totp: {
    errors: {
      challengeIdAndCodeAreRequired: 'challengeId and code are required',
      loginChallengeHasExpiredOrIsInvalid: 'Login challenge has expired or is invalid',
      mfaNotEnabledForThisUser: 'MFA is not enabled for this user',
      invalidRemainingBackupCode: 'Invalid remaining backup code',
      mfaIsRequired: 'MFA code is required',
      passwordIsRequiredToDisableMfa: 'Password is required to disable MFA',
      mfaIsNotInitializedForThisUser: 'MFA is not initialized for this user',
      invalidCode: 'Invalid code',
      invalidMfaCode: 'Invalid MFA code',
    },
  },
  user: {
    messages: {
      userRegisteredSuccessfully: 'User registered successfully',
      registeredSuccessfully: 'Registered successfully',
    },
    errors: {
      notFound: 'User not found',
      notFoundOrInactive: 'User not found or inactive',
    },
  },
  article: {
    errors: {
      idRequired: 'Article ID is required',
      notFound: 'Article not found',
      slugRequired: 'Article slug is required',
      canonicalUrlMustUseHttpOrHttps: 'Canonical URL must use http or https',
      siteUrlIsNotConfigured: 'Site URL is not configured',
      articleRevisionIdRequired: 'Article revision ID is required',
      articleRevisionNotFound: 'Article revision not found',
      articleRevisionIsInUse: 'Article revision is in use',
      canonicalUrlMustUseSameHostAsSite: 'Canonical URL must use the same host as the site',
      canonicalUrlMustBeValidAbsoluteUrl: 'Canonical URL must be a valid absolute URL',
    },
  },
  media: {
    errors: {
      mediaAssetIdRequired: 'Media asset ID is required',
      mediaAssetNotFound: 'Media asset not found',
      fileRequired: 'File is required',
    },
  },
  push: {
    messages: {
      newMessage: 'New message',
      exampleBody: 'Example body for {type} request',
    },
    errors: {
      invalidSubscription: 'Invalid subscription',
      invalidParams: 'Invalid params',
    },
  },
  rum: {
    errors: {
      invalidJson: 'Invalid JSON',
      invalidBody: 'Invalid body',
      invalidMetricName: 'Invalid metric name',
      invalidValue: 'Invalid value',
      invalidPathname: 'Invalid pathname',
      failedToPersist: 'Failed to persist',
    },
  },
  seo: {
    googleIndexing: {
      messages: {
        googleIndexingApiAcceptsOnlyJobPostingBroadcastEvent:
          'Google Indexing API accepts only JobPosting/BroadcastEvent; general pages are indexed via sitemap.',
      },
    },
  },
  errors: {
    unknown: 'Something went wrong',
    insufficientPermissions: 'Insufficient permissions',
    authenticationRequired: 'Authentication required',
    tooManyRequests: 'Too many requests. Please try again later.',
    urlsArrayRequired: 'URLs array is required',
    indexNowBingYandexChatGPTAndGoogleIndexingApiNotified: 'IndexNow (Bing/Yandex/ChatGPT) and optionally Google Indexing API notified',
  },
} as const
