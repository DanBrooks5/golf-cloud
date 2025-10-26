'use client';

import React, { useState } from 'react';

type LeaderboardUser = {
  username: string;
  uploads: number;
};

export default function HomePage() {
  const [leaderboard] = useState<LeaderboardUser[]>([
    { username: 'DanBrooks', uploads: 47 },
    { username: 'GolfGuru21', uploads: 39 },
    { username: 'LeftyPro', uploads: 33 },
    { username: 'CoachMark', uploads: 27 },
    { username: 'SmoothSwing', uploads: 19 },
  ]);

  return (
    <div
      style={{
        backgroundColor: '#0d0d0d',
        color: '#fff',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1rem',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '720px',
          width: '100%',
          backgroundColor: '#111',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 8px 30px rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <h1
          style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '1rem',
            background: 'linear-gradient(90deg, #fff, #888)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Golf Cloud Leaderboard
        </h1>

        <p
          style={{
            textAlign: 'center',
            color: '#aaa',
            marginBottom: '2rem',
          }}
        >
          Track who’s uploading the most swings this week
        </p>

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            borderSpacing: 0,
          }}
        >
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={thStyle}>Rank</th>
              <th style={thStyle}>Player</th>
              <th style={thStyle}>Uploads</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((user, i) => (
              <tr
                key={user.username}
                style={{
                  backgroundColor: i % 2 === 0 ? '#111' : '#1a1a1a',
                  transition: 'background 0.2s ease',
                }}
              >
                <td style={tdStyle}>{i + 1}</td>
                <td style={tdStyle}>{user.username}</td>
                <td style={tdStyle}>{user.uploads}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p
          style={{
            textAlign: 'center',
            color: '#666',
            fontSize: '0.9rem',
            marginTop: '2rem',
          }}
        >
          Leaderboard updated manually by admin
        </p>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 16px',
  color: '#ccc',
  textTransform: 'uppercase',
  fontSize: '0.9rem',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '14px 16px',
  color: '#eee',
  fontWeight: 500,
};
