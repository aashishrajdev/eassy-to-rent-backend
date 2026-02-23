const isProduction = process.env.NODE_ENV === 'production';

const makeLogger = (level) => (message, meta = {}) => {
  if (isProduction && level !== 'error') {
    return;
  }

  // Centralized place for console usage
  // eslint-disable-next-line no-console
  console[level](
    `[${level.toUpperCase()}] ${message}`,
    Object.keys(meta).length ? meta : ''
  );
};

module.exports = {
  info: makeLogger('log'),
  error: makeLogger('error'),
  warn: makeLogger('warn'),
  http: makeLogger('log'),
};

