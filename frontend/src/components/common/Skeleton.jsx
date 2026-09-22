import React from 'react';

export const SkeletonText = ({ width = '100%', height = '16px', style = {} }) => {
  return (
    <div 
      className="skeleton" 
      style={{ width, height, marginBottom: '8px', ...style }} 
    />
  );
};

export const SkeletonMetric = () => {
  return (
    <div className="stat-card" style={{ gap: '8px' }}>
      <div className="skeleton" style={{ width: '40%', height: '12px' }} />
      <div className="skeleton" style={{ width: '60%', height: '32px' }} />
      <div className="skeleton" style={{ width: '50%', height: '14px' }} />
    </div>
  );
};

export const SkeletonCard = ({ rows = 3 }) => {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div className="skeleton" style={{ width: '35%', height: '20px' }} />
        <div className="skeleton" style={{ width: '15%', height: '20px' }} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ width: `${95 - (i * 10)}%`, height: '16px', marginBottom: '10px' }} />
      ))}
    </div>
  );
};

export const SkeletonTable = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i}>
                <div className="skeleton" style={{ width: '70%', height: '14px' }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rIdx) => (
            <tr key={rIdx}>
              {Array.from({ length: columns }).map((_, cIdx) => (
                <td key={cIdx}>
                  <div className="skeleton" style={{ width: `${60 + ((rIdx + cIdx) % 3) * 15}%`, height: '14px' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
