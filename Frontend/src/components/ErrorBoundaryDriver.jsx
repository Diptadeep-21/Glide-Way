import React from 'react';

class ErrorBoundaryDriver extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so fallback UI is shown
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught in ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center p-4 text-red-600 bg-red-50 rounded-md">
          Something went wrong in the chat. Please try refreshing the page.
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundaryDriver;
