import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { T } from '../theme';
import { calcAll } from '../utils/calc';
import { fmt$ } from '../utils/golf';

const Profile = ({ session, profile, courses, players, rounds, tournamentHistory, onLogout, onUpdateProfile, go }) => {
  const [view, setView] = useState("profile");
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [handicap, setHandicap] = useState(profile?.handicap_index || '');
  const [ghin, setGhin] = useState(profile?.ghin_number || '');
  const [preferredCourse, setPreferredCourse] = useState(profile?.preferred_course_id || '');
  const [linkedPlayer, setLinkedPlayer] = useState(profile?.linked_player_id || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
  
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    if (session?.user?.email) {
      setEmail(session.user.email);
    }
  }, [session]);

  // Sync profile data when it loads
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setHandicap(profile.handicap_index || '');
      setGhin(profile.ghin_number || '');
      setPreferredCourse(profile.preferred_course_id || '');
      setLinkedPlayer(profile.linked_player_id || '');
      setPhoneNumber(profile.phone_number || '');
    }
  }, [profile]);

  // Get initials for avatar
  const getInitials = () => {
    if (displayName) {
      return displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return '?';
  };

  // Find linked player info
  const linkedPlayerInfo = players.find(p => p.id === linkedPlayer);

  const handleSaveProfile = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const updates = {
        display_name: displayName,
        handicap_index: handicap ? parseFloat(handicap) : null,
        ghin_number: ghin || null,
        preferred_course_id: preferredCourse || null,
        linked_player_id: linkedPlayer || null,
        phone_number: phoneNumber || null
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      setMessage('Profile saved!');
      if (onUpdateProfile) onUpdateProfile(updates);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!newEmail || !newEmail.includes('@')) {
      setError('Please enter a valid email');
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (updateError) throw updateError;

      setMessage('Email change requested! Check your inbox to confirm.');
      setNewEmail('');
      setShowEmailForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      setMessage('Password updated successfully!');
      setPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    setError(null);

    try {
      // Delete profile first
      await supabase.from('profiles').delete().eq('id', session.user.id);
      
      // Then sign out
      await supabase.auth.signOut();
      
      if (onLogout) onLogout();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Calculate earnings data
  const calculateEarnings = () => {
    if (!linkedPlayer) return { total: 0, byPlayer: [] };

    const allRounds = [...rounds, ...tournamentHistory];
    const playerEarnings = {};
    let totalEarnings = 0;

    for (const round of allRounds) {
      try {
        // Handle tournament rounds (they have groups structure)
        if (round.groups) {
          for (const group of round.groups) {
            const playerIdx = group.players.findIndex(p => p.id === linkedPlayer);
            if (playerIdx !== -1 && group.games && group.players && group.players.length >= 2) {
              const { balances, settlements } = calcAll(group.games, group.players);
              if (balances && balances.length === group.players.length) {
                totalEarnings += -balances[playerIdx];

                for (const s of settlements) {
                  if (s.from === playerIdx) {
                    const opp = group.players[s.to];
                    if (!playerEarnings[opp.id]) playerEarnings[opp.id] = { name: opp.name, net: 0 };
                    playerEarnings[opp.id].net -= s.amount;
                  } else if (s.to === playerIdx) {
                    const opp = group.players[s.from];
                    if (!playerEarnings[opp.id]) playerEarnings[opp.id] = { name: opp.name, net: 0 };
                    playerEarnings[opp.id].net += s.amount;
                  }
                }
              }
            }
          }
        } else {
          const playerIdx = round.players.findIndex(p => p.id === linkedPlayer);
          if (playerIdx !== -1 && round.games && round.players && round.players.length >= 2) {
            const { balances, settlements } = calcAll(round.games, round.players);
            if (balances && balances.length === round.players.length) {
              totalEarnings += -balances[playerIdx];

              for (const s of settlements) {
                if (s.from === playerIdx) {
                  const opp = round.players[s.to];
                  if (!playerEarnings[opp.id]) playerEarnings[opp.id] = { name: opp.name, net: 0 };
                  playerEarnings[opp.id].net -= s.amount;
                } else if (s.to === playerIdx) {
                  const opp = round.players[s.from];
                  if (!playerEarnings[opp.id]) playerEarnings[opp.id] = { name: opp.name, net: 0 };
                  playerEarnings[opp.id].net += s.amount;
                }
              }
            }
          }
        }
      } catch (error) {
        // Skip rounds with calculation errors (malformed data)
        console.warn('Skipping round with calculation error:', error);
        continue;
      }
    }

    const byPlayer = Object.values(playerEarnings).sort((a, b) => b.net - a.net);
    return { total: totalEarnings, byPlayer };
  };

  const earnings = calculateEarnings();

  return (
    <div className="pg">
      {/* Avatar Section */}
      <div className="cd" style={{ textAlign: 'center', padding: '24px' }}>
        <div className="profile-avatar">
          {getInitials()}
        </div>
        <div className="pg-title" style={{ marginTop: 12 }}>
          {displayName || 'Your Profile'}
        </div>
        <div style={{ color: T.dim, fontSize: 14, marginTop: 4 }}>
          {email}
        </div>
        {linkedPlayerInfo && (
          <div style={{ color: T.acc, fontSize: 13, marginTop: 8 }}>
            Linked to: {linkedPlayerInfo.name}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${view === "profile" ? "on" : ""}`} onClick={() => setView("profile")}>Profile</button>
        <button className={`tab ${view === "earnings" ? "on" : ""}`} onClick={() => setView("earnings")}>Earnings</button>
      </div>

      {view === "profile" && (
        <>
          {/* Personal Info Card */}
      <div className="cd">
        <div className="ct">Personal Info</div>
        
        <div className="mb10">
          <div className="il">Display Name</div>
          <input
            className="inp"
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="How you want to be called"
          />
        </div>

        <div className="mb10">
          <div className="il">GHIN Number</div>
          <input
            className="inp"
            type="text"
            value={ghin}
            onChange={e => setGhin(e.target.value)}
            placeholder="Your GHIN (USGA Handicap)"
          />
          <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>
            GHIN lookup coming soon
          </div>
        </div>

        <div className="mb10">
          <div className="il">Handicap Index</div>
          <input
            className="inp"
            type="number"
            step="0.1"
            value={handicap}
            onChange={e => setHandicap(e.target.value)}
            placeholder="e.g., 12.5"
          />
        </div>

        <div className="mb12">
          <div className="il">Preferred Home Course</div>
          <select
            className="inp"
            value={preferredCourse}
            onChange={e => setPreferredCourse(e.target.value)}
          >
            <option value="">Select a course</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.name} - {c.city}</option>
            ))}
          </select>
        </div>

        <div className="mb12">
          <div className="il">Phone Number</div>
          <input
            className="inp"
            type="tel"
            value={phoneNumber}
            onChange={e => setPhoneNumber(e.target.value)}
            placeholder="+1 (555) 123-4567"
          />
          <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>
            Your number is private and only used to auto-populate group texts when sharing results
          </div>
        </div>

        <button 
          className="btn bp" 
          onClick={handleSaveProfile}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      {/* Link to Player Card */}
      <div className="cd">
        <div className="ct">Link to Player</div>
        <div style={{ fontSize: 13, color: T.dim, marginBottom: 12 }}>
          Link your account to a player on the roster
        </div>
        
        <select
          className="inp"
          value={linkedPlayer}
          onChange={e => setLinkedPlayer(e.target.value)}
        >
          <option value="">Not linked</option>
          {players.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} {p.index ? `(${p.index})` : ''}
            </option>
          ))}
        </select>

        {linkedPlayer && (
          <button 
            className="btn bs"
            style={{ marginTop: 12 }}
            onClick={() => setLinkedPlayer('')}
          >
            Unlink Player
          </button>
        )}
      </div>

      {/* Account Security Card */}
      <div className="cd">
        <div className="ct">Account Security</div>

        {/* Change Email */}
        {!showEmailForm ? (
          <button 
            className="btn bs"
            onClick={() => setShowEmailForm(true)}
          >
            Change Email
          </button>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <div className="mb10">
              <div className="il">New Email</div>
              <input
                className="inp"
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="new@email.com"
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                className="btn bp" 
                onClick={handleChangeEmail}
                disabled={loading}
                style={{ flex: 1 }}
              >
                {loading ? '...' : 'Confirm'}
              </button>
              <button 
                className="btn bs" 
                onClick={() => { setShowEmailForm(false); setNewEmail(''); }}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Change Password */}
        {!showPasswordForm ? (
          <button 
            className="btn bs"
            style={{ marginTop: 12 }}
            onClick={() => setShowPasswordForm(true)}
          >
            Change Password
          </button>
        ) : (
          <div style={{ marginTop: 12 }}>
            <div className="mb10">
              <div className="il">New Password</div>
              <input
                className="inp"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="6+ characters"
              />
            </div>
            <div className="mb10">
              <div className="il">Confirm Password</div>
              <input
                className="inp"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                className="btn bp" 
                onClick={handleChangePassword}
                disabled={loading}
                style={{ flex: 1 }}
              >
                {loading ? '...' : 'Update Password'}
              </button>
              <button 
                className="btn bs" 
                onClick={() => { setShowPasswordForm(false); setPassword(''); setConfirmPassword(''); }}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      {error && <div className="auth-err">{error}</div>}
      {message && <div className="auth-msg">{message}</div>}

      {/* Contact Developer */}
      <div className="cd">
        <div className="ct">Contact Developer</div>
        <div style={{ fontSize: 14, color: T.dim }}>
          Found a bug or have a feature request?
        </div>
        <a 
          href="mailto:alfonzumab@gmail.com" 
          className="btn bs"
          style={{ marginTop: 12, textDecoration: 'none', display: 'inline-block' }}
        >
          Email: alfonzumab@gmail.com
        </a>
      </div>

      {/* Danger Zone */}
      <div className="cd" style={{ borderColor: T.red + '44' }}>
        <div className="ct" style={{ color: T.red }}>Danger Zone</div>
        
        {!showDeleteConfirm ? (
          <button 
            className="btn bd"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete Account
          </button>
        ) : (
          <div>
            <div style={{ color: T.red, fontSize: 14, marginBottom: 12 }}>
              Are you sure? This will permanently delete your account and all data.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                className="btn bd" 
                onClick={handleDeleteAccount}
                disabled={loading}
                style={{ flex: 1 }}
              >
                {loading ? '...' : 'Yes, Delete'}
              </button>
              <button 
                className="btn bs" 
                onClick={() => setShowDeleteConfirm(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Logout */}
      <button
        className="btn"
        onClick={onLogout}
        style={{ marginTop: 24, marginBottom: 40, background: T.card, border: `1px solid ${T.bdr}`, color: T.txt }}
      >
        Log Out
      </button>
        </>
      )}

      {view === "earnings" && (
        <>
          {/* Lifetime Earnings Card */}
          <div className="cd">
            <div className="ct">Lifetime Earnings</div>
            {!linkedPlayer ? (
              <div style={{ textAlign: 'center', padding: '20px', color: T.dim }}>
                Link a player in your profile to see earnings
              </div>
            ) : (
              <div style={{ textAlign: 'center', fontSize: 24, fontWeight: 'bold', margin: '20px 0' }}>
                <span style={{ color: earnings.total >= 0 ? T.green : T.red }}>
                  {fmt$(earnings.total)}
                </span>
              </div>
            )}
          </div>

          {/* Net Earnings by Player */}
          {linkedPlayer && earnings.byPlayer.length > 0 && (
            <div className="cd">
              <div className="ct">Net Earnings by Player</div>
              {earnings.byPlayer.map((player, idx) => (
                <div key={player.name} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: idx < earnings.byPlayer.length - 1 ? `1px solid ${T.bdr}` : 'none'
                }}>
                  <span style={{ fontWeight: '500' }}>{player.name}</span>
                  <span style={{
                    fontWeight: 'bold',
                    color: player.net >= 0 ? T.green : T.red
                  }}>
                    {fmt$(player.net)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* No Rounds Message */}
          {linkedPlayer && earnings.byPlayer.length === 0 && (
            <div className="cd">
              <div style={{ textAlign: 'center', padding: '20px', color: T.dim }}>
                No completed rounds found
              </div>
            </div>
          )}

          {/* Premium Stats CTA */}
          <div className="cd" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
              Want deeper insights?
            </div>
            <div style={{ fontSize: 13, color: T.dim, marginBottom: 16 }}>
              Scoring averages, skins breakdown, head-to-head records, game profitability, and more
            </div>
            <button className="btn bp" onClick={() => go && go('stats')}>
              View Full Stats
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Profile;
