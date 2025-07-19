import React from 'react';

class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div className="text-center py-4 text-red-600">Something went wrong in the chat. Please try again later.</div>;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;