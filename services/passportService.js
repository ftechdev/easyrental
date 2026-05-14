const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const { OAuth2Client } = require('google-auth-library');
const pool = require('../config/DB');



// Initialize Google client for token verification
const googleClient = new OAuth2Client();

// =======================
// SERIALIZATION (MySQL profiles)
// =======================
passport.serializeUser((user, done) => {
  console.log(' Serializing user:', user.id);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  console.log(' Deserializing user with ID:', id);
  try {
    const [rows] = await pool.query(
      'SELECT * FROM profiles WHERE id = ? LIMIT 1',
      [id]
    );
    const user = rows[0] || null;
    console.log(' User deserialized:', user ? user.email : 'Not found');
    done(null, user);
  } catch (err) {
    console.error(' Error deserializing user:', err);
    done(err, null);
  }
});


// =======================
// GOOGLE STRATEGIES
// =======================

if (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL
) {
  // Strategy for Web OAuth flow
  passport.use('google-web', new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['email', 'profile'],
      passReqToCallback: false
    },
    async (accessToken, refreshToken, profile, done) => {
      console.log(' Web Google OAuth Profile:', profile.id);
      await handleGoogleAuth(profile, done);
    }
  ));
} else {
  console.warn(' Google Web strategy not initialized: missing GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL');
}

// Unified Mobile Strategy for Android and iOS
if (
  process.env.GOOGLE_ANDROID_CLIENT_ID &&
  process.env.GOOGLE_IOS_CLIENT_ID
) {
  passport.use('google-mobile', new class extends passport.Strategy {
    constructor() {
      super();
      this.name = 'google-mobile';
    }

    async authenticate(req) {
      try {
        const { idToken, platform } = req.body;
        
        if (!idToken) {
          return this.fail({ message: 'Missing ID token' }, 400);
        }

        // Determine the correct audience based on platform
        let audience;
        switch (platform?.toLowerCase()) {
          case 'android':
            audience = process.env.GOOGLE_ANDROID_CLIENT_ID;
            break;
          case 'ios':
            audience = process.env.GOOGLE_IOS_CLIENT_ID;
            break;
          default:
            return this.fail({ message: 'Invalid or missing platform' }, 400);
        }

        // Verify the ID token
        const ticket = await googleClient.verifyIdToken({
          idToken,
          audience
        });

        const payload = ticket.getPayload();
        
        if (!payload.email_verified) {
          return this.fail({ message: 'Google email not verified' }, 403);
        }

        // Create normalized profile object
        const profile = {
          id: payload.sub,
          displayName: payload.name || 'Google User',
          emails: [{ value: payload.email }],
          name: {
            givenName: payload.given_name,
            familyName: payload.family_name
          },
          provider: 'google'
        };

        console.log(` Authenticating ${platform} user:`, payload.email);
        await handleGoogleAuth(profile, this.success.bind(this), this.fail.bind(this));
      } catch (error) {
        console.error(` ${platform} Google auth failed:`, error.message);
        this.fail({ message: 'Authentication failed' }, 401);
      }
    }
  });
} else {
  console.warn(' Google Mobile strategy not initialized: missing GOOGLE_ANDROID_CLIENT_ID/GOOGLE_IOS_CLIENT_ID');
}

// =======================
// FACEBOOK STRATEGY
// =======================
if (
  process.env.FACEBOOK_APP_ID &&
  process.env.FACEBOOK_APP_SECRET &&
  process.env.FACEBOOK_CALLBACK_URL
) {
  passport.use(new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ['id', 'emails', 'name', 'displayName', 'picture.type(large)'],
      passReqToCallback: false
    },
    async (accessToken, refreshToken, profile, done) => {
      console.log(' Facebook OAuth Profile:', profile.id);
      try {
        const email = profile.emails?.[0]?.value || `${profile.id}@facebook.com`;
        
        let user = await pool.query(
          'SELECT * FROM profiles WHERE facebook_id = ? OR email = ? LIMIT 1',
          [profile.id, email.toLowerCase()]
        );

        if (!user[0]) {
          // Create new user
          const firstName = profile.name?.givenName || 'Facebook';
          const lastName = profile.name?.familyName || 'User';

          const [insertResult] = await pool.query(
            `INSERT INTO profiles (
              id,
              email,
              first_name,
              last_name,
              phone,
              role,
              is_verified,
              facebook_id
            ) VALUES (UUID(), ?, ?, ?, NULL, 'user', 1, ?)` ,
            [email.toLowerCase(), firstName, lastName, profile.id]
          );

          const [createdRows] = await pool.query(
            'SELECT * FROM profiles WHERE email = ? LIMIT 1',
            [email.toLowerCase()]
          );
          user = createdRows[0];
          console.log(' Created new Facebook user:', user.email);
        } else if (!user[0].facebook_id) {
          // Link existing account
          await pool.query(
            'UPDATE profiles SET facebook_id = ? WHERE id = ?',
            [profile.id, user[0].id]
          );
          user[0].facebook_id = profile.id;
          console.log(' Linked existing user to Facebook ID');
        }

        console.log(' Facebook auth successful:', user[0].email);
        const resultUser = {
          id: user[0].id,
          userId: user[0].id,
          firstName: user[0].first_name,
          lastName: user[0].last_name,
          email: user[0].email,
          role: user[0].role,
          isVerified: user[0].is_verified === 1 || user[0].is_verified === true,
        };

        return done(null, resultUser);
      } catch (err) {
        console.error(' Facebook auth failed:', err);
        return done(err, null);
      }
    }
  ));
} else {
  console.warn(' Facebook strategy not initialized: missing FACEBOOK_APP_ID/SECRET/CALLBACK_URL');
}


// =======================
// SHARED AUTH HANDLER
// =======================
async function handleGoogleAuth(profile, done, fail) {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) throw new Error('No email provided by Google');

    const normalizedEmail = email.toLowerCase();

    const [rows] = await pool.query(
      'SELECT * FROM profiles WHERE google_id = ? OR email = ? LIMIT 1',
      [profile.id, normalizedEmail]
    );

    let user = rows[0] || null;

    if (!user) {
      // Create new profile
      const firstName = profile.name?.givenName || 'Google';
      const lastName = profile.name?.familyName || 'User';

      const [insertResult] = await pool.query(
        `INSERT INTO profiles (
          id,
          email,
          first_name,
          last_name,
          phone,
          role,
          is_verified,
          google_id
        ) VALUES (UUID(), ?, ?, ?, NULL, 'user', 1, ?)` ,
        [normalizedEmail, firstName, lastName, profile.id]
      );

      const [createdRows] = await pool.query(
        'SELECT * FROM profiles WHERE email = ? LIMIT 1',
        [normalizedEmail]
      );
      user = createdRows[0];
      console.log(' Created new Google user:', user.email);
    } else if (!user.google_id) {
      // Link existing profile
      await pool.query(
        'UPDATE profiles SET google_id = ? WHERE id = ?',
        [profile.id, user.id]
      );
      user.google_id = profile.id;
      console.log(' Linked existing user to Google ID');
    }

    console.log(' Google auth successful:', user.email);
    const resultUser = {
      id: user.id,
      userId: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      isVerified: user.is_verified === 1 || user.is_verified === true,
    };

    return done(null, resultUser);
  } catch (err) {
    console.error(' Google auth failed:', err);
    if (typeof fail === 'function') {
      return fail({ message: err.message || 'Google auth failed' }, 401);
    }
    return done(err, null);
  }
}

module.exports = passport;