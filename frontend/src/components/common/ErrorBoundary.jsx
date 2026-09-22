import React from 'react';
import { AlertTriangle, RefreshCw, LogIn, ChevronDown, ChevronUp } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('EquipFixAI ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (e) {}
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#070c18',
          color: '#f8fafc',
          fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
          padding: '24px'
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '16px',
            padding: '32px 28px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(239, 68, 68, 0.15)',
            textAlign: 'center'
          }}>
            {/* Warning Icon Badge */}
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
              color: '#ef4444'
            }}>
              <AlertTriangle size={30} />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', margin: '0 0 8px' }}>
              System Render Interrupted
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.5, margin: '0 0 24px' }}>
              A client-side render exception occurred. You can reload the workstation view or return to the login portal.
            </p>

            {/* Error Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  backgroundColor: '#0ea5e9',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)'
                }}
              >
                <RefreshCw size={15} />
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid #334155',
                  color: '#e2e8f0',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                <LogIn size={15} />
                <span>Return to Login</span>
              </button>
            </div>

            {/* Collapsible Error Details */}
            <div style={{ textAlign: 'left', borderTop: '1px solid #1e293b', paddingTop: '14px' }}>
              <button
                type="button"
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: 0
                }}
              >
                {this.state.showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                <span>{this.state.showDetails ? 'Hide technical details' : 'Show technical details'}</span>
              </button>

              {this.state.showDetails && (
                <pre style={{
                  marginTop: '10px',
                  padding: '12px',
                  backgroundColor: '#070c18',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  fontSize: '0.725rem',
                  color: '#f87171',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '180px'
                }}>
                  {this.state.error?.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
