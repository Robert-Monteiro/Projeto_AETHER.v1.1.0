const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const OAuth2Strategy = require('passport-oauth2');
const { pool } = require('../database/connection');

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || 'secret',
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      const user = await pool.query('SELECT * FROM users WHERE id = $1', [payload.id]);
      if (user.rows.length > 0) {
        return done(null, user.rows[0]);
      } else {
        return done(null, false);
      }
    } catch (error) {
      return done(error, false);
    }
  })
);

// Google OAuth2 Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    'google',
    new OAuth2Strategy(
      {
        authorizationURL: 'https://accounts.google.com/o/oauth2/auth',
        tokenURL: 'https://accounts.google.com/o/oauth2/token',
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/users/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists
          let user = await pool.query('SELECT * FROM users WHERE email = $1', [profile.emails[0].value]);

          if (user.rows.length === 0) {
            // Create new user
            user = await pool.query(
              'INSERT INTO users (email, first_name, last_name, role, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
              [profile.emails[0].value, profile.name.givenName, profile.name.familyName, 'user']
            );
          }

          return done(null, user.rows[0]);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );
}

module.exports = passport;